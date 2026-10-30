// Tirar o fundo da webcam (ou de qualquer clipe): segmentação de pessoa com modelos públicos em ONNX rodando
// no onnxruntime-web. Dois modelos, escolhidos no efeito "Background Removal":
//   rápido  — PP-HumanSeg (PaddleSeg, Apache 2.0, vendor/pphumanseg), o mesmo do Resolume: quadro em 192×192,
//             devolve fundo/pessoa; cada máscara é misturada com a anterior para o contorno não tremer.
//   preciso — RVM, Robust Video Matting (GPL-3.0, vendor/rvm): quadro em 640×360, devolve transparência de
//             verdade (cabelo, borda fina) e carrega memória entre quadros (r1..r4), que fica na GPU.
// Com WebGPU os dois rodam na placa de vídeo, fora da thread do desenho; sem WebGPU só o rápido existe, em
// WebAssembly num worker com várias threads. A máscara vai para o efeito como textura (slot uPrev); a borda
// fina é refinada no shader do efeito, guiada pela própria imagem.
export class Segmenter {
  constructor(gl) {
    this.gl = gl; this.sess = {}; this.loading = {}; this.busy = false; this.err = ''; this.runs = 0; this.ms = 0;
    this.gpu = !!navigator.gpu; this.noPrecise = false; this.avisou = false; this.envSet = false;
    this.size = 192; this.fps = 30; this.blend = 0.55;                      // rápido
    this.rvm = { W: 640, H: 360, ratio: 0.5, fps: 15 };                     // preciso
    this.canvas = document.createElement('canvas'); this.c2d = this.canvas.getContext('2d', { willReadFrequently: true });
  }
  kindOf(f) { return f.params && f.params.rvm >= 0.5 && this.gpu && !this.noPrecise ? 'precise' : 'fast'; }
  setupEnv(ort) {
    if (this.envSet) return; this.envSet = true;
    ort.env.wasm.wasmPaths = new URL('vendor/ort/', location.href).href;   // caminho absoluto: o carregador faz import() dele
    if (this.gpu) { ort.env.wasm.proxy = false; ort.env.wasm.numThreads = 1; }   // WebGPU: a conta é na placa, assíncrona
    else {   // sem WebGPU: WebAssembly num worker (senão trava a thread do desenho) com threads, se o isolamento de origem liberou
      ort.env.wasm.proxy = true;
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 2)) : 1;
    }
  }
  load(kind) {
    if (this.sess[kind] || this.loading[kind]) return this.loading[kind];
    this.loading[kind] = (async () => {
      try {
        const ort = window.ort; if (!ort) throw new Error('onnxruntime-web não carregou');
        this.setupEnv(ort);
        if (kind === 'precise') {
          this.sess.precise = await ort.InferenceSession.create('vendor/rvm/rvm_mobilenetv3_fp32.onnx', { executionProviders: ['webgpu'],
            preferredOutputLocation: { fgr: 'gpu-buffer', r1o: 'gpu-buffer', r2o: 'gpu-buffer', r3o: 'gpu-buffer', r4o: 'gpu-buffer' } });   // só o alfa volta para a CPU
        } else {
          this.sess.fast = await ort.InferenceSession.create('vendor/pphumanseg/pphumanseg.onnx', { executionProviders: [this.gpu ? 'webgpu' : 'wasm'] });
        }
        this.err = '';
      } catch (e) {
        if (kind === 'precise') { this.noPrecise = true; this.err = 'Modelo preciso não abriu (' + (e.message || e) + '); usando o rápido'; }
        else this.err = 'Tirar o fundo: ' + (e.message || e);
      }
      finally { this.loading[kind] = null; }
    })();
    return this.loading[kind];
  }
  frameOf(c) {
    if (c.player && c.player.frame) return c.player.frame;
    const el = c.el; if (!el) return null;
    if (el instanceof HTMLVideoElement) return el.readyState >= 2 ? el : null;
    if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth ? el : null;
    return el;   // canvas (texto, espelho do laser)
  }
  // o quadro do clipe em W×H como tensor [1,3,H,W] float32: valor = pixel * k + b
  tensor(src, W, H, k, b) {
    const ort = window.ort, cv = this.canvas, ctx = this.c2d;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    ctx.drawImage(src, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data, n = W * H, t = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { t[i] = d[i * 4] * k + b; t[n + i] = d[i * 4 + 1] * k + b; t[2 * n + i] = d[i * 4 + 2] * k + b; }
    return new ort.Tensor('float32', t, [1, 3, H, W]);
  }
  // roda a segmentação do clipe e deixa a máscara na textura do efeito f
  async run(c, f, kind) {
    const sess = this.sess[kind]; if (!sess || this.busy) return false;
    const src = this.frameOf(c); if (!src) return false;
    this.busy = true;
    try {
      const t0 = performance.now();
      if (kind === 'precise') {
        const ort = window.ort, { W, H, ratio } = this.rvm;
        let st = f._rvm;
        if (!st || st.src !== c) {   // começo (ou clipe trocado): memória zerada
          if (st) this.dropRvm(st);
          st = f._rvm = { src: c, rec: {} };
          for (const k of ['r1i', 'r2i', 'r3i', 'r4i']) st.rec[k] = new ort.Tensor('float32', new Float32Array([0]), [1, 1, 1, 1]);
        }
        const out = await sess.run({ src: this.tensor(src, W, H, 1 / 255, 0), downsample_ratio: new ort.Tensor('float32', new Float32Array([ratio]), [1]), ...st.rec });
        for (const k of ['r1i', 'r2i', 'r3i', 'r4i']) if (st.rec[k].dispose) st.rec[k].dispose();
        st.rec = { r1i: out.r1o, r2i: out.r2o, r3i: out.r3o, r4i: out.r4o }; if (out.fgr.dispose) out.fgr.dispose();
        const pd = out.pha.data, n = W * H, mask = new Uint8Array(n);
        for (let i = 0; i < n; i++) mask[i] = pd[i] * 255 + 0.5;
        this.upload(f, mask, W, H);
      } else {
        const S = this.size, n = S * S;
        const feeds = {}; feeds[sess.inputNames[0]] = this.tensor(src, S, S, 1 / 127.5, -1);
        const out = await sess.run(feeds); const o = out[sess.outputNames[0]], data = o.data;
        const prob = new Float32Array(n);
        if (o.dims.length === 4 && o.dims[1] === 2) for (let i = 0; i < n; i++) prob[i] = 1 / (1 + Math.exp(data[i] - data[n + i]));   // (fundo, pessoa) como logits → probabilidade de pessoa
        else for (let i = 0; i < n; i++) prob[i] = Math.min(1, Math.max(0, data[i]));
        // suavização no tempo: mistura com a máscara anterior do mesmo clipe (zera quando o clipe muda)
        let acc = f._maskAcc; if (!acc || f._maskSrc !== c) { acc = f._maskAcc = prob; f._maskSrc = c; }
        else { const k = this.blend; for (let i = 0; i < n; i++) acc[i] += (prob[i] - acc[i]) * k; }
        const mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = acc[i] * 255 + 0.5;
        this.upload(f, mask, S, S);
      }
      this.ms += (performance.now() - t0 - this.ms) * 0.2; this.runs++; this.err = '';
      return true;
    } catch (e) { this.err = 'Tirar o fundo: ' + (e.message || e); return false; }
    finally { this.busy = false; }
  }
  dropRvm(st) { for (const k in st.rec) if (st.rec[k] && st.rec[k].dispose) st.rec[k].dispose(); st.rec = {}; }
  upload(f, mask, W, H) {
    const gl = this.gl;
    if (!f._maskTex) {
      f._maskTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, f._maskTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, f._maskTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, mask);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  }
  // a cada quadro: para cada clipe no ar com o efeito, roda quando passou 1/fps do modelo escolhido
  tick(layers, liveClip, now) {
    for (const L of layers) {
      const c = liveClip(L); if (!c) continue;
      for (const f of [...(c.fx || []), ...(L.fx || [])]) {
        if (f.id !== 'backgroundremoval' || f.bypass) continue;
        const kind = this.kindOf(f);
        if (f.params && f.params.rvm >= 0.5 && !this.gpu && !this.avisou) { this.avisou = true; this.err = 'Modelo preciso precisa de WebGPU; usando o rápido'; }
        if (!this.sess[kind]) { if (!this.loading[kind] && !this.loadFailed) this.load(kind).then(() => { if (!this.sess[kind] && kind === 'fast') this.loadFailed = true; }); continue; }
        const fps = kind === 'precise' ? this.rvm.fps : this.fps;
        if (now - (f._maskAt || 0) < 1 / fps || this.busy) continue;
        f._maskAt = now; this.run(c, f, kind);
      }
    }
  }
}
