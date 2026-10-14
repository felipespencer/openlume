// Motor de mistura: todas as camadas são desenhadas, de baixo para cima, numa imagem só
// (a composição). A janela de saída mostra essa mesma imagem; não existe um segundo motor.
//
// Cada fonte (vídeo ou imagem) vira uma textura. A cor sai do shader já multiplicada pela
// opacidade (premultiplicada), o que deixa os três modos de mistura corretos só com blendFunc.

const VS = `#version 300 es
in vec2 a;
uniform vec2 uScale;
out vec2 v;
void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a * uScale, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v;
uniform sampler2D uTex;
uniform float uOp;
out vec4 o;
void main(){ vec4 c = texture(uTex, v); o = vec4(c.rgb * c.a * uOp, c.a * uOp); }`;

export const BLENDS = { normal: 'Normal', add: 'Somar', screen: 'Tela' };
export const FITS = { contain: 'Encaixar', cover: 'Preencher', stretch: 'Esticar' };

export class Engine {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    canvas.width = width; canvas.height = height;
    const gl = this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL2 indisponível');
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = this.prog = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programa: ' + gl.getProgramInfoLog(p));
    this.uScale = gl.getUniformLocation(p, 'uScale');
    this.uOp = gl.getUniformLocation(p, 'uOp');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.BLEND);
    this.tex = new Map();          // clip.id → { t, static }
  }

  texFor(clip) {
    const gl = this.gl;
    let e = this.tex.get(clip.id);
    if (!e) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

  // layers: de cima para baixo (como na grade). Desenha de baixo para cima.
  render(layers) {
    const gl = this.gl, W = this.canvas.width, H = this.canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      const clip = L.on >= 0 ? L.clips[L.on] : null;
      if (!clip || L.bypass || L.opacity <= 0 || !clip.w || !clip.h) continue;
      gl.bindTexture(gl.TEXTURE_2D, this.texFor(clip));
      const ar = clip.w / clip.h, car = W / H;
      let sx = 1, sy = 1;
      if (clip.fit === 'contain') { if (ar > car) sy = car / ar; else sx = ar / car; }
      else if (clip.fit === 'cover') { if (ar > car) sx = ar / car; else sy = car / ar; }
      gl.uniform2f(this.uScale, sx, sy);
      gl.uniform1f(this.uOp, L.opacity);
      if (L.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
      else if (L.blend === 'screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  // lê um pixel logo depois de desenhar (x, y de 0 a 1, origem embaixo à esquerda). Para testes.
  probe(layers, pts) {
    this.render(layers);
    const gl = this.gl, px = new Uint8Array(4);
    return pts.map(([x, y]) => {
      gl.readPixels(Math.floor(x * (this.canvas.width - 1)), Math.floor(y * (this.canvas.height - 1)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2]];
    });
  }
}
