// Motor de mistura e de saída, em WebGL2, num único canvas mestre escondido.
//
// 1. render(): as camadas são desenhadas, de baixo para cima, numa textura (a composição).
//    Cada camada passa pelos efeitos do clipe e da camada; a composição passa pelos seus.
//    Uma camada usada como fonte direta de algum slice também ganha uma textura só sua.
// 2. renderScreen(): para cada tela, os slices recortam a composição (ou a camada) e a
//    desenham deformados numa textura do tamanho da tela; um passe final aplica cor,
//    opacidade e as máscaras de saída.
// 3. blit(): copia o resultado para um canvas 2D, que a janela de saída recebe por stream.
//
// A cor sai do shader já multiplicada pela opacidade (premultiplicada), o que deixa os
// modos de mistura corretos só com blendFunc.
import { tessellate } from './warp.js';
import { softWidths, softGradsOn, gradRadius, allSlices } from './screens.js';
import { effectById, EFFECT_HELPERS } from './effects.js';
import { sourceById } from './sources.js';
import { FS_MIX, mixerCode, normMixer, hexRgb, hexRgba, MIXER_OPT, mixerColor } from './mixers.js';
import { animValue } from './beat.js';

// camada/clipe: quad com ajuste, posição, escala e giro
const VS_LAYER = `#version 300 es
in vec2 a; uniform vec2 uScale; uniform vec2 uPos; uniform float uRot; uniform float uAspect; out vec2 v;
void main(){ v = a * 0.5 + 0.5; vec2 p = a * uScale; p.x *= uAspect; float c = cos(uRot), s = sin(uRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y); p.x /= uAspect; gl_Position = vec4(p + uPos, 0.0, 1.0); }`;
// uPre = 0: a textura é de um elemento (vídeo, imagem, texto), com alfa reto, e é premultiplicada aqui;
// uPre = 1: já vem premultiplicada (resultado de efeito, de fonte ou de mistura) e entra como está — multiplicar de novo
// escurecia duas vezes tudo que é meio transparente e passa por efeito (visto na bancada do Threshold, 2026-10-25)
const FS_LAYER = `#version 300 es
precision highp float; in vec2 v; uniform sampler2D uTex; uniform float uOp; uniform float uPre; out vec4 o;
void main(){ vec4 c = texture(uTex, v); if (uPre < 0.5) c.rgb *= c.a; o = c * uOp; }`;

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
uniform int uUseSoft; uniform vec3 uSoftP; uniform vec3 uGamma;
#define NG 8
uniform int uNG; uniform vec4 uGA[NG]; uniform vec4 uGB[NG]; uniform vec2 uInSize;   // degradês de emenda: A→B em px do recorte e (n1, n2, raio, 0)
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
    // cada degradê: faixa em volta da reta A→B (t ao longo, s para os lados); dentro dela a rampa vai de inteiro em A a zero em B;
    // os cantos do lado de A podem ser redondos; fora da faixa a imagem fica inteira. Vários degradês se multiplicam.
    vec2 p = vLuv * uInSize;
    for (int i = 0; i < NG; i++) {
      if (i >= uNG) break;
      vec2 a = uGA[i].xy, d = uGA[i].zw - a; float L = max(length(d), 1e-3); vec2 u = d / L, n = vec2(-u.y, u.x);
      vec2 q = p - a; float t = dot(q, u), s = dot(q, n), n1 = uGB[i].x, n2 = uGB[i].y, r = uGB[i].z;
      bool dentro = t >= 0.0 && t <= L && s <= n1 && s >= -n2;
      if (dentro && r > 0.0 && t < r) {
        if (s > n1 - r) dentro = length(vec2(t - r, s - (n1 - r))) <= r;
        else if (s < -n2 + r) dentro = length(vec2(t - r, s - (-n2 + r))) <= r;
      }
      if (dentro) f *= ramp(clamp(1.0 - t / L, 0.0, 1.0));
    }
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
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform int uOpaque;
void main(){ vec4 c = texture(uTex, v); o = uOpaque != 0 ? vec4(c.rgb, 1.0) : c; }`;
const FX_HEAD = `#version 300 es
precision highp float; in vec2 v; out vec4 o; uniform sampler2D uTex; uniform sampler2D uPrev; uniform vec2 uRes; uniform float uTime;
`;
// Delay RGB: quantos quadros renderizados valem 1,0 de atraso. Medido no Resolume (bancada de 2026-10-25): 0,5 deu 20 quadros
// com ele rendendo a 30 fps (a 0,5× de velocidade do clipe o atraso em pixels cai pela metade, então é fila de quadros, não de tempo).
const RING_FRAMES = 40;
// controle de cor ({ color: true }, valor "#rrggbb") vira vec3 no shader (com { alpha: true }, "#rrggbbaa" vira vec4);
// número, lista (índice da opção) e liga/desliga viram float
const uDecl = (p) => (p.color ? (p.alpha ? 'uniform vec4 ' : 'uniform vec3 ') : 'uniform float ') + p.key + ';';

export const FITS = { contain: 'Encaixar', cover: 'Preencher', stretch: 'Esticar' };
export const IDENT_TR = () => ({ x: 0, y: 0, scale: 1, sx: 1, sy: 1, rot: 0 });   // tamanho final: largura = scale*sx, altura = scale*sy
const trIdent = (t) => !t || !(t.x || t.y || t.scale !== 1 || t.rot || (t.sx ?? 1) !== 1 || (t.sy ?? 1) !== 1);

export class Engine {
  constructor(width, height) {
    this.W = width; this.H = height; this.time = 0; this.master = 1;
    const canvas = this.canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const gl = this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 indisponível');
    this.progLayer = this.program(VS_LAYER, FS_LAYER, ['uScale', 'uPos', 'uRot', 'uAspect', 'uOp', 'uPre', 'uTex']);
    this.progSlice = this.program(VS_SLICE, FS_SLICE, ['uScreen', 'uIn', 'uRot', 'uFlip', 'uSrc', 'uTex', 'uBC', 'uRGB', 'uUseSoft', 'uSoftP', 'uGamma', 'uNG', 'uGA', 'uGB', 'uInSize', 'uUseMask', 'uMask']);
    this.progScreen = this.program(VS_QUAD, FS_SCREEN, ['uTex', 'uMask', 'uUseMask', 'uBC', 'uRGB', 'uOp']);
    this.progCopy = this.program(VS_QUAD, FS_COPY, ['uTex', 'uOpaque']);
    this.progMix = this.program(VS_QUAD, FS_MIX, ['uA', 'uB', 'uK', 'uTrans', 'uMode', 'uColor', 'uSmooth', 'uTime', 'uRes', 'uSeed']);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.quadVao = gl.createVertexArray(); gl.bindVertexArray(this.quadVao);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.BLEND);
    this.tex = new Map();          // clip.id → { t, done }
    this.white = this.newTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.comp = this.fbo(width, height);
    this.layerFbo = new Map();     // layer.id → fbo (fonte direta para slices)
    this.screenFbo = new Map();    // screen.id → fbo
    this.geom = new Map();         // slice.id → { rev, vao, n, ... }
    this.maskTex = new Map();      // 'o'+screen.id / 'i'+slice.id → { t, rev, canvas }
    this.fxProg = new Map();       // effect id → programa
    this.srcProg = new Map();      // source id → programa
    this.srcFbo = new Map();       // clip.id → fbo da fonte gerada
    this.testCard = false;         // Test Card ligado: as telas recebem o test card no lugar da composição
    this.scratch = [this.fbo(width, height), this.fbo(width, height), this.fbo(width, height)];   // efeitos: entrada e pingue-pongue
    this.mixFbo = [this.fbo(width, height), this.fbo(width, height), this.fbo(width, height), this.fbo(width, height)];   // mistura: clipe antigo, clipe novo, camada pronta, cópia do alvo
    this.compFx = []; this.bg = [0, 0, 0];
    this.groupFbo = new Map();    // group.id → fbo (as camadas do grupo juntas)
    this.groups = []; this.xfade = null; this.soloL = false; this.beat = null;   // beat: o relógio de BPM (app.js)
    this.fxMem = new WeakMap();   // instância de efeito com feedback → { a, b, i, w, h }: a saída do quadro anterior
  }
  // Configurações da composição: tamanho novo refaz as texturas que dependem dele
  setSize(w, h) {
    const gl = this.gl, del = (f) => { if (f && f.fb) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); } };
    this.W = w; this.H = h; this.canvas.width = w; this.canvas.height = h;
    del(this.comp); this.comp = this.fbo(w, h);
    this.scratch.forEach(del); this.scratch = [this.fbo(w, h), this.fbo(w, h), this.fbo(w, h)];
    this.mixFbo.forEach(del); this.mixFbo = [this.fbo(w, h), this.fbo(w, h), this.fbo(w, h), this.fbo(w, h)];
    for (const f of this.groupFbo.values()) del(f); this.groupFbo.clear();
    for (const f of this.srcFbo.values()) del(f); this.srcFbo.clear();
    for (const f of this.layerFbo.values()) del(f); this.layerFbo.clear();
    for (const f of this.screenFbo.values()) del(f); this.screenFbo.clear();
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
    if (clip.kind === 'source') return this.renderSource(clip);
    let e = this.tex.get(clip.id);
    if (!e) {
      const t = this.newTex();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      e = { t, done: false, rev: -1 };
      this.tex.set(clip.id, e);
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, e.t);
    const el = clip.el; if (!el && !clip.player) return e.t;
    if (clip.player) {   // reprodutor próprio: tocando a 1x é o <video> escondido; parado, esfregando ou na ré é o quadro do WebCodecs
      const p = clip.player;
      if (p.live && p.audio && p.audio.readyState >= 2) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.audio); e.rev = -1; } catch { } }
      else if (p.frame && e.rev !== p.frameId) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.frame); e.rev = p.frameId; } catch { } }
    } else if (clip.kind === 'video' || clip.kind === 'camera' || clip.kind === 'capture') {
      if (el.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    } else if (clip.kind === 'text' || clip.kind === 'lasermirror') {
      if (e.rev !== clip.rev) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el); e.rev = clip.rev; }
    } else if (!e.done && el.complete && el.naturalWidth) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
      e.done = true;
    }
    return e.t;
  }
  drop(clipId) {
    const e = this.tex.get(clipId);
    if (e) { this.gl.deleteTexture(e.t); this.tex.delete(clipId); }
    const f = this.srcFbo.get(clipId);
    if (f) { this.gl.deleteFramebuffer(f.fb); this.gl.deleteTexture(f.t); this.srcFbo.delete(clipId); }
  }
  // fonte gerada: um shader desenhado numa textura do tamanho da composição
  renderSource(clip) {
    const gl = this.gl, def = sourceById(clip.source);
    if (!def) return this.white;
    let f = this.srcFbo.get(clip.id);
    if (!f) { f = this.fbo(this.W, this.H); this.srcFbo.set(clip.id, f); }
    let pr = this.srcProg.get(def.id);
    if (!pr) {
      const fs = FX_HEAD + def.params.map(uDecl).join('\n') + '\n' + EFFECT_HELPERS + def.glsl + '\nvoid main(){ vec4 c = src(v); o = vec4(c.rgb * c.a, c.a); }';
      pr = this.program(VS_QUAD, fs, ['uRes', 'uTime', ...def.params.map(p => p.key)]); this.srcProg.set(def.id, pr);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, f.w, f.h); gl.disable(gl.BLEND);
    gl.useProgram(pr.p); gl.bindVertexArray(this.quadVao);
    gl.uniform2f(pr.u.uRes, f.w, f.h); gl.uniform1f(pr.u.uTime, this.time + (clip.seed || 0));
    for (const p of def.params) this.setParam(pr, p, this.paramValue(clip, p));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f.t;
  }
  setParam(pr, p, v) {
    if (p.color && p.alpha) { const [r, g, b, a] = hexRgba(v); this.gl.uniform4f(pr.u[p.key], r, g, b, a); }
    else if (p.color) { const [r, g, b] = hexRgb(v); this.gl.uniform3f(pr.u[p.key], r, g, b); } else this.gl.uniform1f(pr.u[p.key], +v);
  }

  // o valor de um parâmetro de efeito ou de fonte agora: o guardado, ou o animado na batida
  paramValue(holder, p) {
    const a = holder.panim && holder.panim[p.key];
    if (a && a.shape && this.beat && !p.color) return animValue(a, this.beat);
    return holder.params[p.key] ?? p.def;
  }
  // ---------- efeitos ----------
  fxProgram(def) {
    let pr = this.fxProg.get(def.id);
    if (!pr) {
      // Opacidade do efeito (como no Resolume, todo efeito tem): mistura o resultado com o que entrou
      // efeito com { ring: true } (Delay RGB): recebe três quadros mais antigos da própria entrada, um por canal
      const fs = FX_HEAD + 'uniform float uFxOp;\n' + (def.ring ? 'uniform sampler2D uDelR; uniform sampler2D uDelG; uniform sampler2D uDelB;\n' : '') + def.params.map(uDecl).join('\n') + '\n' + EFFECT_HELPERS + def.glsl + '\nvoid main(){ vec4 r = fx(v); o = uFxOp >= 1.0 ? r : mix(texture(uTex, v), r, uFxOp); }';
      pr = this.program(VS_QUAD, fs, ['uTex', 'uPrev', 'uRes', 'uTime', 'uFxOp', ...(def.ring ? ['uDelR', 'uDelG', 'uDelB'] : []), ...def.params.map(p => p.key)]); this.fxProg.set(def.id, pr);
    }
    return pr;
  }
  // aplica uma cadeia de efeitos a uma textura w×h; devolve a textura resultante (ou a própria).
  // key: identidade do clipe de onde vem a textura (a fila do Delay RGB recomeça quando o clipe troca)
  applyChain(tex, w, h, chain, key) {
    const gl = this.gl, live = (chain || []).filter(f => !f.bypass && effectById(f.id));
    if (!live.length) return tex;
    gl.disable(gl.BLEND); gl.bindVertexArray(this.quadVao);
    let src = tex, i = 0;
    for (const f of live) {
      const def = effectById(f.id), pr = this.fxProgram(def);
      let dst, prev = this.white, ring = null;
      if (def.feedback) {   // a saída anterior entra em uPrev; desenha na outra textura do par
        let m = this.fxMem.get(f);
        if (!m || m.w !== w || m.h !== h) { if (m) { for (const q of [m.a, m.b]) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); } } m = { a: this.fbo(w, h), b: this.fbo(w, h), i: 0, w, h }; this.fxMem.set(f, m); }
        dst = m.i ? m.b : m.a; prev = (m.i ? m.a : m.b).t; m.i ^= 1;
      } else {
        if (def.ring) {   // Delay RGB: fila dos últimos quadros renderizados desta entrada; cada canal lê um quadro mais antigo
          const del = def.params.map(p => Math.round(Math.max(0, Math.min(1, +this.paramValue(f, p))) * RING_FRAMES)), L = Math.max(...del) + 1;
          let m = this.fxMem.get(f);
          if (!m || m.w !== w || m.h !== h || m.ring.length < L) { if (m) for (const q of m.ring) { gl.deleteFramebuffer(q.fb); gl.deleteTexture(q.t); } m = { w, h, ring: Array.from({ length: L }, () => this.fbo(w, h)), i: -1, n: 0, key }; this.fxMem.set(f, m); }
          if (m.key !== key) { m.key = key; m.n = 0; }   // trocou o clipe: os três canais mostram o clipe novo de uma vez, como no Resolume
          const R = m.ring.length; m.i = (m.i + 1) % R; m.n = Math.min(m.n + 1, R);
          gl.bindFramebuffer(gl.FRAMEBUFFER, m.ring[m.i].fb); this.copyInto(src, w, h, false); gl.disable(gl.BLEND);
          const pick = d => m.ring[((m.i - Math.min(d, m.n - 1)) % R + R) % R].t;   // sem quadro tão antigo ainda, vale o mais antigo que há
          ring = del.map(pick);
        }
        if (def.mask && f._maskTex) prev = f._maskTex;   // Background Removal: a máscara da segmentação
        dst = this.scratch[1 + (i & 1)];
        if (dst.w !== w || dst.h !== h) { gl.deleteFramebuffer(dst.fb); gl.deleteTexture(dst.t); dst = this.scratch[1 + (i & 1)] = this.fbo(w, h); }
        if (dst.t === src) { dst = this.scratch[1 + ((i + 1) & 1)]; }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, w, h);
      gl.useProgram(pr.p);
      if (ring) for (let k = 0; k < 3; k++) { gl.activeTexture(gl.TEXTURE2 + k); gl.bindTexture(gl.TEXTURE_2D, ring[k]); gl.uniform1i(pr.u[['uDelR', 'uDelG', 'uDelB'][k]], 2 + k); }
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, prev); gl.uniform1i(pr.u.uPrev, 1);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(pr.u.uTex, 0);
      gl.uniform2f(pr.u.uRes, w, h); gl.uniform1f(pr.u.uTime, this.time);
      gl.uniform1f(pr.u.uFxOp, f.opacity ?? 1);
      for (const p of def.params) this.setParam(pr, p, this.paramValue(f, p));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      src = dst.t; i++;
    }
    gl.enable(gl.BLEND); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return src;
  }

  // ---------- camadas ----------
  fitScale(clip, W, H) {
    const ar = clip.w / clip.h, car = W / H;
    let sx = 1, sy = 1;
    if (clip.fit === 'contain') { if (ar > car) sy = car / ar; else sx = ar / car; }
    else if (clip.fit === 'cover') { if (ar > car) sx = ar / car; else sy = car / ar; }
    return [sx, sy];
  }
  // desenha um clipe com ajuste e transformação no alvo atual (quad com a textura fornecida)
  drawClipQuad(tex, clip, tr, opacity, W, H, blend) {
    const gl = this.gl, P = this.progLayer;
    gl.useProgram(P.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.uTex, 0);
    const [sx, sy] = clip ? this.fitScale(clip, W, H) : [1, 1];
    const t = tr || IDENT_TR();
    gl.uniform2f(P.u.uScale, sx * t.scale * (t.sx ?? 1), sy * t.scale * (t.sy ?? 1));
    gl.uniform2f(P.u.uPos, t.x, t.y); gl.uniform1f(P.u.uRot, -t.rot * Math.PI / 180); gl.uniform1f(P.u.uAspect, W / H);
    gl.uniform1f(P.u.uOp, opacity);
    gl.uniform1f(P.u.uPre, clip && clip.kind !== 'source' ? 0 : 1);   // só a textura de um elemento (vídeo, imagem, texto) ainda tem alfa reto
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  clipReady(clip) { return clip && clip.w > 0 && clip.h > 0 && (clip.kind === 'source' || clip.el || clip.player); }
  // o clipe pronto para a camada, numa textura do tamanho da composição: ajuste e transformação
  // do clipe, efeitos do clipe e da camada, transformação da camada, opacidade do clipe
  clipTexInto(fbo, c, L, W, H) {
    const gl = this.gl, chain = [...(c.fx || []), ...(L.fx || [])], s = this.scratch[0];
    const tex = this.texFor(c);
    gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawClipQuad(tex, c, c.transform, c.opacity ?? 1, W, H, 'normal');
    const out = this.applyChain(s.t, W, H, chain, c.id);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawClipQuad(out, null, L.transform || IDENT_TR(), 1, W, H, 'normal');
    return fbo.t;
  }
  // mistura A (embaixo / clipe antigo) com B (camada / clipe novo) no modo pedido, com o fader k, dentro de dst
  mixInto(dst, texA, texB, k, mode, trans, opt, W, H, seed = 0) {
    const gl = this.gl, P = this.progMix, o = opt || MIXER_OPT();
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, W, H); gl.disable(gl.BLEND);
    gl.useProgram(P.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(P.u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(P.u.uB, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(P.u.uK, k); gl.uniform1i(P.u.uTrans, trans ? 1 : 0); gl.uniform1i(P.u.uMode, mixerCode(mode));
    const [r, g, b] = hexRgb(mixerColor(mode, o)); gl.uniform3f(P.u.uColor, r, g, b); gl.uniform1f(P.u.uSmooth, o.smooth ?? 0.1);
    gl.uniform1f(P.u.uTime, this.time); gl.uniform2f(P.u.uRes, W, H); gl.uniform1f(P.u.uSeed, seed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
    return dst.t;
  }
  // crossfader: quanto cada bus (A ou B) aparece, pela posição (0 = A, 1 = B) e pela curva
  busFactor(bus) {
    const x = this.xfade; if (!bus || !x) return 1;
    const p = Math.max(0, Math.min(1, x.pos));
    if (x.curve === 'cut') return bus === 'A' ? (p <= 0.5 ? 1 : 0) : (p >= 0.5 ? 1 : 0);
    if (x.curve === 'power') return bus === 'A' ? Math.cos(p * Math.PI / 2) : Math.sin(p * Math.PI / 2);
    return bus === 'A' ? 1 - p : p;
  }
  // uma textura pronta (um grupo) entra no alvo com efeitos, transformação, opacidade e modo de mistura
  compositeInto(target, tex, fx, transform, op, blend, opt, W, H, seed) {
    const gl = this.gl, F = this.mixFbo, tr = transform || IDENT_TR();
    let src = this.applyChain(tex, W, H, fx);
    if (src !== tex || !trIdent(tr)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, F[2].fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawClipQuad(src, null, tr, 1, W, H, 'normal'); src = F[2].t;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
    if (blend === 'alpha') { this.drawClipQuad(src, null, null, op, W, H, 'normal'); return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, F[3].fb); this.copyInto(target.t, W, H, false);
    this.mixInto(target, F[3].t, src, op, blend, 0, opt, W, H, seed);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // uma camada = o clipe no ar (e, na transição, o anterior saindo pelo modo escolhido) com os
  // efeitos do clipe e da camada, misturada no alvo pelo modo de mistura da camada. target é um fbo {fb, t}.
  drawLayer(L, W, H, target) {
    const gl = this.gl;
    const op = L.opacity * this.busFactor(L.bus);
    if (L.bypass || op <= 0 || (this.soloL && !L.solo)) return;
    const clip = L.on >= 0 ? L.clips[L.on] : (L.ghost || null);   // ghost: o clipe de outro deck que continua no ar
    let k = 1;
    if (L.prev && L.prev.clip && this.clipReady(L.prev.clip)) {
      k = Math.min(1, (this.time - L.prev.t0) / Math.max(0.01, L.prev.dur));
      if (k >= 1) L.prev = null;
    } else L.prev = null;
    const transitioning = !!L.prev;
    const blend = normMixer((clip && clip.blend) || L.blend);
    if (!transitioning) {
      if (!this.clipReady(clip)) return;
      if (blend === 'alpha') {   // caminho direto: o clipe desenhado por cima do alvo
        const c = clip, chain = [...(c.fx || []), ...(L.fx || [])];
        let tex = this.texFor(c), tr = L.transform || IDENT_TR();
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
        if (chain.length || !trIdent(c.transform)) {
          const s = this.scratch[0];
          gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          this.drawClipQuad(tex, c, c.transform, 1, W, H, 'normal');
          tex = this.applyChain(s.t, W, H, chain, c.id);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
          this.drawClipQuad(tex, null, tr, op * (c.opacity ?? 1), W, H, 'normal');
        } else this.drawClipQuad(tex, c, { ...tr }, op * (c.opacity ?? 1), W, H, 'normal');
        return;
      }
    }
    // a textura da camada: o clipe pronto ou, na transição, antigo e novo misturados no modo da transição
    const F = this.mixFbo;
    let layerTex;
    if (transitioning) {
      const a = this.clipTexInto(F[0], L.prev.clip, L, W, H);
      let b;
      if (this.clipReady(clip)) b = this.clipTexInto(F[1], clip, L, W, H);
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, F[1].fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); b = F[1].t; }
      layerTex = this.mixInto(F[2], a, b, k, L.prev.mode || 'alpha', 1, L.prev.opt, W, H, L.prev.seed || 0);
    } else layerTex = this.clipTexInto(F[2], clip, L, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, W, H);
    if (blend === 'alpha') { this.drawClipQuad(layerTex, null, null, op, W, H, 'normal'); return; }
    // modo de mistura: copia o alvo e mistura a camada por cima, com o fader da camada
    gl.bindFramebuffer(gl.FRAMEBUFFER, F[3].fb); this.copyInto(target.t, W, H, false);
    this.mixInto(target, F[3].t, layerTex, op, blend, 0, L.blendOpt, W, H, L.id);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // layers: de cima para baixo (como na grade). Desenha de baixo para cima na composição.
  // layerIds: camadas que algum slice usa como fonte direta; cada uma ganha a sua textura.
  render(layers, layerIds = new Set(), time = performance.now() / 1000) {
    const gl = this.gl, W = this.W, H = this.H; this.time = time;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.comp.fb);
    gl.viewport(0, 0, W, H);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const groups = this.groups || [], gById = (id) => groups.find(g => g.id === id);
    this.soloL = layers.some(L => L.solo && !L.bypass);
    const soloG = groups.some(g => g.solo && !g.bypass);
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i], g = L.group != null ? gById(L.group) : null;
      if (!g) { if (!soloG) this.drawLayer(L, W, H, this.comp); continue; }
      // o trecho contíguo do grupo, de baixo para cima, numa textura só
      let j = i; while (j - 1 >= 0 && layers[j - 1].group === L.group) j--;
      const members = []; for (let k = i; k >= j; k--) members.push(layers[k]);
      i = j;
      const gop = g.opacity * this.busFactor(g.bus);
      if (g.bypass || gop <= 0 || (soloG && !g.solo)) continue;
      let f = this.groupFbo.get(g.id);
      if (!f) { f = this.fbo(W, H); this.groupFbo.set(g.id, f); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const m of members) this.drawLayer(m, W, H, f);
      this.compositeInto(this.comp, f.t, g.fx, g.transform, gop, normMixer(g.blend), g.blendOpt, W, H, 1000 + g.id);
    }
    for (const L of layers) {
      if (!layerIds.has(L.id)) continue;
      let f = this.layerFbo.get(L.id);
      if (!f) { f = this.fbo(W, H); this.layerFbo.set(L.id, f); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawLayer(L, W, H, f);
    }
    // efeitos da composição e o master
    const out = this.applyChain(this.comp.t, W, H, this.compFx);
    const ct = this.compTransform;   // posição, escala e giro da composição inteira (painel Composição)
    if (out !== this.comp.t || this.master < 1 || !trIdent(ct)) {
      const s = this.scratch[0];
      gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawClipQuad(out, null, ct, this.master, W, H, 'normal');
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.comp.fb);
      this.copyInto(s.t, W, H, true);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // a composição vai para o canvas mestre, para o monitor e para as sondas
    this.copyTo(this.comp.t, W, H);
  }
  // prévia: um clipe da camada (mesmo fora do ar) renderizado como sairia, com os efeitos do
  // clipe e da camada; fica no canvas mestre para o blit
  previewLayer(L, clipIdx) {
    const gl = this.gl, W = this.W, H = this.H;
    if (!this.prevFbo) this.prevFbo = this.fbo(W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.prevFbo.fb); gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawLayer({ ...L, on: clipIdx, prev: null, ghost: null, bypass: false, opacity: 1, solo: true, bus: null }, W, H, this.prevFbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.copyTo(this.prevFbo.t, W, H);
  }
  // Quadro de um clipe reduzido a w×h, lido da placa (para o recorte de pessoa): a textura do clipe já está na placa para o
  // render, então um passe de cópia + readPixels custa ~2 ms, contra ~24 ms do createImageBitmap do <video> na thread principal
  // (que ainda derrubava a composição de 30 para 24 qps). Linhas saem de cima para baixo, como o getImageData.
  // A leitura é ASSÍNCRONA (readPixels num buffer PIXEL_PACK + fence): o readPixels direto esperava a placa terminar tudo o que
  // estava na fila (9 a 17 ms parado, mais quanto mais máscaras por segundo). beginReadClipFrame enfileira; pollReadClipFrame
  // devolve os pixels quando a placa acabou, ou null se ainda não.
  beginReadClipFrame(c, w, h) {
    const gl = this.gl, e = this.tex.get(c.id), tex = e ? e.t : this.texFor(c);   // usa o quadro que o render já subiu; só sobe de novo se nunca subiu
    let f = this.readFbo; if (!f || f.w !== w || f.h !== h) { if (f) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); } f = this.readFbo = this.fbo(w, h); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); this.copyInto(tex, w, h, true);
    const pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4, gl.STREAM_READ);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    return { sync, pbo, w, h, t0: performance.now() };
  }
  pollReadClipFrame(r) {
    const gl = this.gl; if (!r || !r.sync) return null;
    const st = gl.clientWaitSync(r.sync, 0, 0);
    if (st === gl.TIMEOUT_EXPIRED) return null;
    gl.deleteSync(r.sync); r.sync = null;
    const buf = new Uint8Array(r.w * r.h * 4);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, r.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, buf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.deleteBuffer(r.pbo);
    return buf;
  }
  cancelReadClipFrame(r) { const gl = this.gl; if (!r) return; if (r.sync) gl.deleteSync(r.sync); if (r.pbo) gl.deleteBuffer(r.pbo); r.sync = null; r.pbo = null; }
  copyInto(tex, w, h, opaque) {
    const gl = this.gl;
    gl.viewport(0, 0, w, h); gl.disable(gl.BLEND);
    gl.useProgram(this.progCopy.p); gl.bindVertexArray(this.quadVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(this.progCopy.u.uTex, 0); gl.uniform1i(this.progCopy.u.uOpaque, opaque ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
  }
  copyTo(tex, w, h) { this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); this.copyInto(tex, w, h, true); }
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
    // Test Card: a fonte "testcard" no tamanho da composição entra em todos os slices no lugar da composição ou da camada
    const card = this.testCard ? this.renderSource(this.testCardClip || (this.testCardClip = { id: '__testcard', kind: 'source', source: 'testcard', params: {} })) : null;
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
      const tex = card || this.sourceTex(s, layers);
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
      // degradês de emenda (até 8): A→B em pixels do recorte; o uv local cresce para baixo, como a composição
      const gs = s.soft.on ? softGradsOn(s, all) : [];
      gl.uniform1i(P.u.uUseSoft, s.soft.on ? 1 : 0); gl.uniform1i(P.u.uNG, gs.length); gl.uniform2f(P.u.uInSize, s.in.w, s.in.h);
      if (gs.length) {
        const GA = new Float32Array(32), GB = new Float32Array(32);
        gs.forEach((g, i) => { GA.set([g.a[0], g.a[1], g.b[0], g.b[1]], i * 4); GB.set([g.n1, g.n2, gradRadius(g), 0], i * 4); });
        gl.uniform4fv(P.u.uGA, GA); gl.uniform4fv(P.u.uGB, GB);
      }
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
