// Tirar o fundo da webcam (ou de qualquer clipe): segmentação de pessoa com um modelo público em
// ONNX, o PP-HumanSeg (PaddleSeg, Apache 2.0, em vendor/pphumanseg), rodando no onnxruntime-web
// por WebAssembly. O quadro do clipe vai para
// 192×192, o modelo devolve fundo/pessoa, e a máscara entra no efeito "Background Removal"
// como textura (no slot uPrev). Roda em paralelo ao desenho, a até ~15 vezes por segundo.
export class Segmenter {
  constructor(gl) {
    this.gl = gl; this.session = null; this.loading = null; this.busy = false; this.err = ''; this.size = 192; this.fps = 15; this.runs = 0;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = this.size;
    this.c2d = this.canvas.getContext('2d', { willReadFrequently: true });
  }
  load() {
    if (this.session || this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const ort = window.ort; if (!ort) throw new Error('onnxruntime-web não carregou');
        ort.env.wasm.numThreads = 1; ort.env.wasm.wasmPaths = new URL('vendor/ort/', location.href).href;   // caminho absoluto: o carregador faz import() dele
        this.session = await ort.InferenceSession.create('vendor/pphumanseg/pphumanseg.onnx', { executionProviders: ['wasm'] });
      } catch (e) { this.err = 'Tirar o fundo: ' + (e.message || e); }
    })();
    return this.loading;
  }
  frameOf(c) {
    if (c.player && c.player.frame) return c.player.frame;
    const el = c.el; if (!el) return null;
    if (el instanceof HTMLVideoElement) return el.readyState >= 2 ? el : null;
    if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth ? el : null;
    return el;   // canvas (texto, espelho do laser)
  }
  // roda a segmentação do clipe e deixa a máscara na textura do efeito f
  async run(c, f) {
    if (!this.session || this.busy) return false;
    const src = this.frameOf(c); if (!src) return false;
    this.busy = true;
    try {
      const S = this.size, ctx = this.c2d; ctx.drawImage(src, 0, 0, S, S);
      const d = ctx.getImageData(0, 0, S, S).data, n = S * S, t = new Float32Array(3 * n);
      for (let i = 0; i < n; i++) { t[i] = d[i * 4] / 127.5 - 1; t[n + i] = d[i * 4 + 1] / 127.5 - 1; t[2 * n + i] = d[i * 4 + 2] / 127.5 - 1; }
      const ort = window.ort, feeds = {}; feeds[this.session.inputNames[0]] = new ort.Tensor('float32', t, [1, 3, S, S]);
      const out = await this.session.run(feeds); const o = out[this.session.outputNames[0]], data = o.data;
      const mask = new Uint8Array(n);
      if (o.dims.length === 4 && o.dims[1] === 2) for (let i = 0; i < n; i++) mask[i] = Math.round(255 / (1 + Math.exp(data[i] - data[n + i])));   // (fundo, pessoa) como logits → probabilidade de pessoa
      else for (let i = 0; i < n; i++) mask[i] = Math.round(Math.min(1, Math.max(0, data[i])) * 255);
      this.upload(f, mask); this.runs++; this.err = '';
      return true;
    } catch (e) { this.err = 'Tirar o fundo: ' + (e.message || e); return false; }
    finally { this.busy = false; }
  }
  upload(f, mask) {
    const gl = this.gl, S = this.size;
    if (!f._maskTex) {
      f._maskTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, f._maskTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, f._maskTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, S, S, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, mask);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  }
  // a cada quadro: para cada clipe no ar com o efeito, roda quando passou 1/fps
  tick(layers, liveClip, now) {
    if (this.err && !this.session) return;
    for (const L of layers) {
      const c = liveClip(L); if (!c) continue;
      for (const f of [...(c.fx || []), ...(L.fx || [])]) {
        if (f.id !== 'backgroundremoval' || f.bypass) continue;
        if (!this.session) { this.load(); return; }
        if (now - (f._maskAt || 0) < 1 / this.fps || this.busy) continue;
        f._maskAt = now; this.run(c, f);
      }
    }
  }
}
