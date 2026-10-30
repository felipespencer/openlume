// Tirar o fundo da webcam (ou de qualquer clipe): segmentação de pessoa com modelos públicos em ONNX rodando
// no onnxruntime-web. O efeito "Background Removal" tem os controles do Resolume 7.28; "Qualidade do modelo":
//   Baixa — PP-HumanSeg (PaddleSeg, Apache 2.0, vendor/pphumanseg), o mesmo do Resolume: quadro em 192×192,
//           devolve fundo/pessoa.
//   Média / Alta — RVM, Robust Video Matting (GPL-3.0, vendor/rvm): quadro em 640×384 ou 896×512, devolve
//           transparência de verdade (cabelo, borda fina) e carrega memória entre quadros (r1..r4), que fica na GPU.
// Com WebGPU os modelos rodam na placa de vídeo, fora da thread do desenho; sem WebGPU só a Baixa existe, em
// WebAssembly num worker com várias threads. Depois do modelo, num worker (segment-post.js), na ordem do Resolume:
// máscara dura, suavidade no tempo, fechar buracos, filtrar pontinhos, borda suave, refinar borda. A máscara vai para
// o efeito como textura (slot uPrev) e é esticada no shader com refino guiado pela própria imagem.
export class Segmenter {
  constructor(gl) {
    this.gl = gl; this.sess = {}; this.loading = {}; this.busy = false; this.err = ''; this.runs = 0; this.ms = 0;
    this.gpu = !!navigator.gpu; this.noPrecise = false; this.avisou = false; this.envSet = false; this.loadFailed = false;
    this.size = 192; this.fps = 30;                                          // Baixa
    this.rvm = { 1: { W: 640, H: 384 }, 2: { W: 896, H: 512 }, ratio: 0.5, fps: 15 };   // Média, Alta (largura e altura múltiplas de 32: o grafo remendado exige)
    this.canvas = document.createElement('canvas'); this.c2d = this.canvas.getContext('2d', { willReadFrequently: true });
  }
  quality(f) { return f.params ? Math.round(f.params.quality ?? 1) : 1; }
  kindOf(f) { return this.quality(f) >= 1 && this.gpu && !this.noPrecise ? 'precise' : 'fast'; }
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
        if (kind === 'precise') { this.noPrecise = true; this.err = 'Modelo de qualidade Média/Alta não abriu (' + (e.message || e) + '); usando a Baixa'; }
        else { this.loadFailed = true; this.err = 'Tirar o fundo: ' + (e.message || e); }
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
      const t0 = performance.now(); let prob, W, H;
      if (kind === 'precise') {
        const ort = window.ort, q = Math.max(1, Math.min(2, this.quality(f))); ({ W, H } = this.rvm[q]);
        let st = f._rvm;
        if (!st || st.src !== c || st.q !== q) {   // começo, clipe trocado ou tamanho trocado: memória zerada
          if (st) this.dropRvm(st);
          st = f._rvm = { src: c, q, rec: {} };
          for (const k of ['r1i', 'r2i', 'r3i', 'r4i']) st.rec[k] = new ort.Tensor('float32', new Float32Array([0]), [1, 1, 1, 1]);
        }
        const out = await sess.run({ src: this.tensor(src, W, H, 1 / 255, 0), downsample_ratio: new ort.Tensor('float32', new Float32Array([this.rvm.ratio]), [1]), ...st.rec });
        for (const k of ['r1i', 'r2i', 'r3i', 'r4i']) if (st.rec[k].dispose) st.rec[k].dispose();
        st.rec = { r1i: out.r1o, r2i: out.r2o, r3i: out.r3o, r4i: out.r4o }; if (out.fgr.dispose) out.fgr.dispose();
        prob = Float32Array.from(out.pha.data);
      } else {
        W = H = this.size; const n = W * H;
        const feeds = {}; feeds[sess.inputNames[0]] = this.tensor(src, W, H, 1 / 127.5, -1);
        const out = await sess.run(feeds); const o = out[sess.outputNames[0]], data = o.data;
        prob = new Float32Array(n);
        if (o.dims.length === 4 && o.dims[1] === 2) for (let i = 0; i < n; i++) prob[i] = 1 / (1 + Math.exp(data[i] - data[n + i]));   // (fundo, pessoa) como logits → probabilidade de pessoa
        else for (let i = 0; i < n; i++) prob[i] = Math.min(1, Math.max(0, data[i]));
      }
      // o worker limpa a máscara enquanto o modelo já roda o próximo quadro; se ainda não devolveu a anterior, este quadro é pulado
      if (!f._postBusy) { f._postBusy = true; this.post(f, c, prob.buffer.byteLength === prob.length * 4 && prob.byteOffset === 0 ? prob : Float32Array.from(prob), W, H).then((mask) => { f._postBusy = false; if (mask) this.upload(f, mask, W, H); }); }
      this.ms += (performance.now() - t0 - this.ms) * 0.2; this.runs++; this.err = '';
      return true;
    } catch (e) { this.err = 'Tirar o fundo: ' + (e.message || e); return false; }
    finally { this.busy = false; }
  }
  // depois do modelo, no worker (segment-post.js): suavidade no tempo, fechar buracos, filtrar pontinhos → máscara 0..255
  post(f, c, prob, W, H) {
    if (!this.worker) {
      this.worker = new Worker(new URL('./segment-post.js', import.meta.url), { type: 'module' }); this.waits = new Map(); this.nextId = 1;
      this.worker.onmessage = (ev) => { const w = this.waits.get(ev.data.id); if (w) { this.waits.delete(ev.data.id); w(ev.data.mask); } };
      this.worker.onerror = (e) => { this.err = 'Tirar o fundo (worker): ' + (e.message || e); for (const w of this.waits.values()) w(null); this.waits.clear(); };
      this.worker.onmessageerror = () => { for (const w of this.waits.values()) w(null); this.waits.clear(); };
    }
    if (!f._segId) f._segId = this.nextId++;
    const reset = f._maskSrc !== c; f._maskSrc = c;
    const p = f.params || {};
    return new Promise((resolve) => {
      this.waits.set(f._segId, resolve);
      this.worker.postMessage({ id: f._segId, prob, W, H, tsmooth: Math.min(0.98, Math.max(0, p.tsmooth ?? 0)), fill: p.fill >= 0.5, specks: Math.max(0, p.specks || 0), hard: p.hard >= 0.5, soft: Math.max(0, p.soft || 0), refine: Math.max(0, p.refine || 0), reset }, [prob.buffer]);
    });
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
        if (this.quality(f) >= 1 && !this.gpu && !this.avisou) { this.avisou = true; this.err = 'Qualidade Média/Alta precisa de WebGPU; usando a Baixa'; }
        if (!this.sess[kind]) { if (!this.loading[kind] && !this.loadFailed) this.load(kind); continue; }
        const fps = kind === 'precise' ? this.rvm.fps : this.fps;
        if (now - (f._maskAt || 0) < 1 / fps || this.busy) continue;
        f._maskAt = now; this.run(c, f, kind);
      }
    }
  }
}
