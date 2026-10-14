// Motor de mistura e de saída, em WebGL2, num único canvas mestre escondido.
//
// 1. render(): as camadas são desenhadas, de baixo para cima, numa textura (a composição).
//    Uma camada usada como fonte direta de algum slice também ganha uma textura só sua.
// 2. renderScreen(): para cada tela, os slices recortam a composição (ou a camada) e a
//    desenham deformados numa textura do tamanho da tela; um passe final aplica cor,
//    opacidade e as máscaras de saída.
// 3. blit(): copia o resultado para um canvas 2D, que a janela de saída recebe por stream.
//
// A cor sai do shader já multiplicada pela opacidade (premultiplicada), o que deixa os
// modos de mistura corretos só com blendFunc.
import { tessellate } from './warp.js';
import { softWidths, allSlices } from './screens.js';

const VS_LAYER = `#version 300 es
in vec2 a; uniform vec2 uScale; out vec2 v;
void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a * uScale, 0.0, 1.0); }`;
const FS_LAYER = `#version 300 es
precision highp float; in vec2 v; uniform sampler2D uTex; uniform float uOp; out vec4 o;
void main(){ vec4 c = texture(uTex, v); o = vec4(c.rgb * c.a * uOp, c.a * uOp); }`;

// slice: posição em px da tela; luv é a coordenada local (0..1) dentro do recorte
const VS_SLICE = `#version 300 es
in vec2 aPos; in vec2 aLuv;
uniform vec2 uScreen; uniform vec4 uIn; uniform float uRot; uniform vec2 uFlip; uniform vec2 uSrc;
out vec2 vUv; out vec2 vLuv;
void main(){
  vec2 l = mix(aLuv, 1.0 - aLuv, uFlip);
  vec2 d = (l - 0.5) * uIn.zw;
  float c = cos(uRot), s = sin(uRot);
  vec2 p = uIn.xy + uIn.zw * 0.5 + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  vUv = vec2(p.x / uSrc.x, 1.0 - p.y / uSrc.y);
  vLuv = aLuv;
  gl_Position = vec4(aPos.x / uScreen.x * 2.0 - 1.0, 1.0 - aPos.y / uScreen.y * 2.0, 0.0, 1.0);
}`;
const FS_SLICE = `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vLuv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uBC; uniform vec3 uRGB;
uniform int uUseSoft; uniform vec4 uSoft; uniform vec3 uSoftP; uniform vec3 uGamma;
uniform int uUseMask; uniform sampler2D uMask;
float ramp(float x){
  float s = step(0.5, x);
  return uSoftP.y * pow(2.0 * x, uSoftP.x) * (1.0 - s) + (1.0 - (1.0 - uSoftP.y) * pow(2.0 * (1.0 - x), uSoftP.x)) * s;
}
void main(){
  float inside = (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) ? 0.0 : 1.0;
  vec4 c = texture(uTex, clamp(vUv, 0.0, 1.0)) * inside;
  c.rgb = mix(vec3(0.5) * c.a, c.rgb * uBC.x, uBC.y) + uRGB * c.a;
  if (uUseSoft != 0) {
    float f = 1.0;
    if (uSoft.x > 0.0) f *= ramp(clamp(vLuv.x / uSoft.x, 0.0, 1.0));
    if (uSoft.y > 0.0) f *= ramp(clamp((1.0 - vLuv.x) / uSoft.y, 0.0, 1.0));
    if (uSoft.z > 0.0) f *= ramp(clamp(vLuv.y / uSoft.z, 0.0, 1.0));
    if (uSoft.w > 0.0) f *= ramp(clamp((1.0 - vLuv.y) / uSoft.w, 0.0, 1.0));
    // o nível de preto só sobe fora da faixa de emenda, para casar o preto dos dois projetores
    c.rgb = max(c.rgb, vec3(uSoftP.z) * step(0.99, f) * c.a);
    c.rgb *= pow(vec3(f), 1.0 / uGamma);
  }
  if (uUseMask != 0) c *= texture(uMask, vec2(vLuv.x, 1.0 - vLuv.y)).r;
  o = c;
}`;
// passe final da tela: cor, opacidade e máscaras de saída
const VS_QUAD = `#version 300 es
in vec2 a; out vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
const FS_SCREEN = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D uTex; uniform sampler2D uMask; uniform int uUseMask; uniform vec2 uBC; uniform vec3 uRGB; uniform float uOp;
void main(){
  vec4 c = texture(uTex, v);
  c.rgb = mix(vec3(0.5), c.rgb * uBC.x, uBC.y) + uRGB;
  if (uUseMask != 0) c.rgb *= texture(uMask, v).r;
  o = vec4(clamp(c.rgb, 0.0, 1.0) * uOp, 1.0);
}`;
const FS_COPY = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex;
void main(){ o = vec4(texture(uTex, v).rgb, 1.0); }`;

export const BLENDS = { normal: 'Normal', add: 'Somar', screen: 'Tela' };
export const FITS = { contain: 'Encaixar', cover: 'Preencher', stretch: 'Esticar' };

export class Engine {
  constructor(width, height) {
    this.W = width; this.H = height;
    const canvas = this.canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const gl = this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 indisponível');
    this.progLayer = this.program(VS_LAYER, FS_LAYER, ['uScale', 'uOp']);
    this.progSlice = this.program(VS_SLICE, FS_SLICE, ['uScreen', 'uIn', 'uRot', 'uFlip', 'uSrc', 'uTex', 'uBC', 'uRGB', 'uUseSoft', 'uSoft', 'uSoftP', 'uGamma', 'uUseMask', 'uMask']);
    this.progScreen = this.program(VS_QUAD, FS_SCREEN, ['uTex', 'uMask', 'uUseMask', 'uBC', 'uRGB', 'uOp']);
    this.progCopy = this.program(VS_QUAD, FS_COPY, ['uTex']);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.quadVao = gl.createVertexArray(); gl.bindVertexArray(this.quadVao);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.BLEND);
    this.tex = new Map();          // clip.id → { t, done }
    // textura branca de 1 px para a unidade da máscara quando não há máscara: um sampler
    // apontando para a textura da própria tela faria o WebGL descartar o desenho (realimentação)
    this.white = this.newTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.comp = this.fbo(width, height);
    this.layerFbo = new Map();     // layer.id → fbo
    this.screenFbo = new Map();    // screen.id → fbo
    this.geom = new Map();         // slice.id → { rev, vao, n, ... }
    this.maskTex = new Map();      // 'o'+screen.id / 'i'+slice.id → { t, rev, canvas }
  }

  program(vs, fs, uniforms) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, vs.includes('aPos') ? 'aPos' : 'a');
    if (vs.includes('aLuv')) gl.bindAttribLocation(p, 1, 'aLuv');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programa: ' + gl.getProgramInfoLog(p));
    const u = {}; for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
    return { p, u };
  }
  newTex() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  fbo(w, h) {
    const gl = this.gl, t = this.newTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, t, w, h };
  }
  ensureSize(w, h) {
    const c = this.canvas;
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  }

  // ---------- fontes ----------
  texFor(clip) {
    const gl = this.gl;
    let e = this.tex.get(clip.id);
    if (!e) {
      const t = this.newTex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      e = { t, done: false };
      this.tex.set(clip.id, e);
    }
    gl.bindTexture(gl.TEXTURE_2D, e.t);
    const el = clip.el;
    if (clip.kind === 'video') {
      if (el.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    } else if (!e.done && el.complete && el.naturalWidth) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
      e.done = true;
    }
    return e.t;
  }
  drop(clipId) {
    const e = this.tex.get(clipId);
    if (e) { this.gl.deleteTexture(e.t); this.tex.delete(clipId); }
  }

  drawLayer(L, W, H) {
    const gl = this.gl;
    const clip = L.on >= 0 ? L.clips[L.on] : null;
    if (!clip || L.bypass || L.opacity <= 0 || !clip.w || !clip.h) return;
    gl.bindTexture(gl.TEXTURE_2D, this.texFor(clip));
    const ar = clip.w / clip.h, car = W / H;
    let sx = 1, sy = 1;
    if (clip.fit === 'contain') { if (ar > car) sy = car / ar; else sx = ar / car; }
    else if (clip.fit === 'cover') { if (ar > car) sx = ar / car; else sy = car / ar; }
    gl.uniform2f(this.progLayer.u.uScale, sx, sy);
    gl.uniform1f(this.progLayer.u.uOp, L.opacity);
    if (L.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
    else if (L.blend === 'screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // layers: de cima para baixo (como na grade). Desenha de baixo para cima na composição.
  // layerIds: camadas que algum slice usa como fonte direta; cada uma ganha a sua textura.
  render(layers, layerIds = new Set()) {
    const gl = this.gl, W = this.W, H = this.H;
    gl.useProgram(this.progLayer.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0);          // as camadas sempre leem a unidade 0
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.comp.fb);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = layers.length - 1; i >= 0; i--) this.drawLayer(layers[i], W, H);
    for (const L of layers) {
      if (!layerIds.has(L.id)) continue;
      let f = this.layerFbo.get(L.id);
      if (!f) { f = this.fbo(W, H); this.layerFbo.set(L.id, f); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawLayer(L, W, H);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // a composição vai para o canvas mestre, para o monitor e para as sondas
    this.copyTo(this.comp.t, W, H);
  }
  copyTo(tex, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h); gl.disable(gl.BLEND);
    gl.useProgram(this.progCopy.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(this.progCopy.u.uTex, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
  }
  // copia o que está no canvas mestre (canto inferior esquerdo, w×h) para um canvas 2D
  blit(ctx, w = this.W, h = this.H) {
    ctx.drawImage(this.canvas, 0, this.canvas.height - h, w, h, 0, 0, w, h);
  }

  // ---------- telas ----------
  sourceTex(slice, layers) {
    if (slice.source === 'comp') return this.comp.t;
    const f = this.layerFbo.get(slice.source);
    return f ? f.t : null;
  }
  geomFor(slice) {
    const gl = this.gl;
    let g = this.geom.get(slice.id);
    if (g && g.rev === slice.rev) return g;
    if (!g) {
      g = { vao: gl.createVertexArray(), pos: gl.createBuffer(), luv: gl.createBuffer(), idx: gl.createBuffer(), n: 0, rev: -1 };
      gl.bindVertexArray(g.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.luv); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
      gl.bindVertexArray(null);
      this.geom.set(slice.id, g);
    }
    const t = tessellate(slice);
    // o buffer de índices pertence ao VAO que estiver ligado: liga o deste slice antes de
    // enviar, senão o índice novo vai parar no VAO do slice desenhado por último
    gl.bindVertexArray(g.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.bufferData(gl.ARRAY_BUFFER, t.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.luv); gl.bufferData(gl.ARRAY_BUFFER, t.luv, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, t.idx, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    g.n = t.idx.length; g.rev = slice.rev;
    return g;
  }
  // máscaras são polígonos desenhados num canvas 2D e enviados como textura
  maskTexFor(key, rev, w, h, draw) {
    const gl = this.gl;
    let m = this.maskTex.get(key);
    if (m && m.rev === rev && m.w === w && m.h === h) return m.t;
    if (!m) { m = { t: this.newTex(), canvas: document.createElement('canvas'), rev: -1, w: 0, h: 0 }; this.maskTex.set(key, m); }
    m.canvas.width = w; m.canvas.height = h; m.w = w; m.h = h; m.rev = rev;
    const ctx = m.canvas.getContext('2d');
    draw(ctx);
    gl.bindTexture(gl.TEXTURE_2D, m.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.canvas);
    return m.t;
  }
  static polyPath(ctx, pts, sx, sy) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0] * sx, p[1] * sy) : ctx.moveTo(p[0] * sx, p[1] * sy));
    ctx.closePath();
  }

  renderScreen(screen, layers, screens) {
    const gl = this.gl, w = screen.w, h = screen.h;
    this.ensureSize(w, h);
    let f = this.screenFbo.get(screen.id);
    if (!f || f.w !== w || f.h !== h) {
      if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); }
      f = this.fbo(w, h); this.screenFbo.set(screen.id, f);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const P = this.progSlice; gl.useProgram(P.p);
    const all = allSlices(screens);
    for (const s of screen.items) {
      if (s.type !== 'slice' || !s.enabled) continue;
      const tex = this.sourceTex(s, layers);
      if (!tex) continue;
      const g = this.geomFor(s);
      gl.bindVertexArray(g.vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.uTex, 0);
      gl.uniform2f(P.u.uScreen, w, h);
      gl.uniform4f(P.u.uIn, s.in.x, s.in.y, s.in.w, s.in.h);
      gl.uniform1f(P.u.uRot, s.in.rot * Math.PI / 180);
      gl.uniform2f(P.u.uFlip, s.flip.x ? 1 : 0, s.flip.y ? 1 : 0);
      gl.uniform2f(P.u.uSrc, this.W, this.H);
      gl.uniform2f(P.u.uBC, s.color.bright, s.color.contrast);
      gl.uniform3f(P.u.uRGB, s.color.r, s.color.g, s.color.b);
      const sw = softWidths(s, all);
      gl.uniform1i(P.u.uUseSoft, s.soft.on ? 1 : 0);
      gl.uniform4f(P.u.uSoft, sw.l, sw.r, sw.t, sw.b);
      gl.uniform3f(P.u.uSoftP, s.soft.power, s.soft.lum, s.soft.black / 255);
      gl.uniform3f(P.u.uGamma, s.soft.gamma[0], s.soft.gamma[1], s.soft.gamma[2]);
      if (s.inMask) {
        const m = s.inMask;
        gl.activeTexture(gl.TEXTURE1);       // a máscara vive na unidade 1; o envio acontece nela
        const mt = this.maskTexFor('i' + s.id, m.rev, 512, 512, (ctx) => {
          ctx.fillStyle = m.invert ? '#fff' : '#000'; ctx.fillRect(0, 0, 512, 512);
          Engine.polyPath(ctx, m.pts, 512, 512); ctx.fillStyle = m.invert ? '#000' : '#fff'; ctx.fill();
        });
        gl.bindTexture(gl.TEXTURE_2D, mt); gl.uniform1i(P.u.uMask, 1);
        gl.uniform1i(P.u.uUseMask, 1);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.white); gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(P.u.uMask, 1); gl.uniform1i(P.u.uUseMask, 0);
      }
      gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_INT, 0);
    }
    // passe final: cor da tela, opacidade e máscaras de saída
    const masks = screen.items.filter(i => i.type === 'mask' && i.enabled);
    let mt = null;
    if (masks.length) {
      const rev = masks.map(m => m.id + ':' + m.rev).join(',');
      gl.activeTexture(gl.TEXTURE1);
      mt = this.maskTexFor('o' + screen.id, rev, w, h, (ctx) => {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        for (const m of masks) {
          if (m.invert) {
            // preserva só o que está dentro: pinta de preto tudo fora do polígono
            ctx.save(); Engine.polyPath(ctx, m.pts, 1, 1); ctx.rect(w, 0, -w, h); ctx.fillStyle = '#000'; ctx.fill('evenodd'); ctx.restore();
          } else { Engine.polyPath(ctx, m.pts, 1, 1); ctx.fillStyle = '#000'; ctx.fill(); }
        }
      });
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h); gl.disable(gl.BLEND);
    const S = this.progScreen; gl.useProgram(S.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mt || this.white); gl.uniform1i(S.u.uMask, 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, f.t); gl.uniform1i(S.u.uTex, 0);
    gl.uniform1i(S.u.uUseMask, mt ? 1 : 0);
    gl.uniform2f(S.u.uBC, screen.color.bright, screen.color.contrast);
    gl.uniform3f(S.u.uRGB, screen.color.r, screen.color.g, screen.color.b);
    gl.uniform1f(S.u.uOp, screen.opacity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
  }

  // ---------- sondas (testes) ----------
  // lê pixels do canvas mestre logo depois de desenhar (x, y de 0 a 1, origem em cima à esquerda)
  readPts(pts, w, h) {
    const gl = this.gl, px = new Uint8Array(4);
    return pts.map(([x, y]) => {
      gl.readPixels(Math.floor(x * (w - 1)), Math.floor((1 - y) * (h - 1)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2]];
    });
  }
  probe(layers, pts) { this.render(layers); return this.readPts(pts, this.W, this.H); }
  probeScreen(screen, layers, screens, pts) { this.render(layers, this.neededLayers(screens)); this.renderScreen(screen, layers, screens); return this.readPts(pts, screen.w, screen.h); }
  neededLayers(screens) { const s = new Set(); for (const sl of allSlices(screens)) if (sl.source !== 'comp') s.add(sl.source); return s; }
}
