// Tirar o fundo da webcam (ou de qualquer clipe): segmentação de pessoa com modelos públicos em ONNX. O trabalho
// pesado fica todo no worker (segment-worker.js): o modelo (PP-HumanSeg na qualidade Baixa; RVM nas Média e Alta,
// com WebGPU) e a limpeza da máscara, na ordem do efeito do Resolume 7.28. Aqui só: o quadro do clipe vira um
// ImageBitmap já no tamanho do modelo (o redimensionamento é na GPU, assíncrono), vai para o worker, e a máscara
// que volta sobe como textura para o efeito (slot uPrev), que a estica com refino guiado pela própria imagem.
export class Segmenter {
  constructor(gl) {
    this.gl = gl; this.err = ''; this.runs = 0; this.ms = 0; this.gpu = !!navigator.gpu; this.ready = false; this.fatal = false;
    this.size = 192; this.fps = 30;                                                                   // Baixa
    this.rvm = { 1: { W: 960, H: 544 }, 2: { W: 1280, H: 736 }, ratio: 0.5, fps: 15 };               // Média, Alta: base interna 480×272 e 640×368, como o RVM recomenda (largura e altura múltiplas de 32: o grafo remendado exige)
    this.nextId = 1; this.pending = new Map(); this.worker = null;
  }
  quality(f) { return f.params ? Math.round(f.params.quality ?? 1) : 1; }
  kindOf(f) { return this.quality(f) >= 1 && this.gpu && !this.noPrecise ? 'precise' : 'fast'; }
  start() {
    if (this.worker) return;
    this.worker = new Worker(new URL('./segment-worker.js', import.meta.url));
    this.worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'ready') { this.ready = true; this.gpu = this.gpu && m.gpu; this.adapter = m.adapter; return; }
      if (m.type === 'err') { this.err = m.msg; if (m.fatal) this.fatal = true; if (/Média\/Alta/.test(m.msg)) this.noPrecise = true; }
      const f = m.id != null ? this.pending.get(m.id) : null;
      if (f) {
        this.pending.delete(m.id); f._segBusy = false;
        // já passou 1/fps? manda o próximo quadro agora, sem esperar o tick (o clipe ainda estava no ar no último tick)
        const now = performance.now() / 1000, fps = f._segKind === 'precise' ? this.rvm.fps : this.fps;
        if (f._segClip && now - (f._segSeen || 0) < 0.2 && !f.bypass && now - (f._maskAt || 0) >= 1 / fps) { f._maskAt = now; this.run(f._segClip, f, f._segKind); }
      }
      if (m.type === 'mask' && f) { this.etapas = m.etapas; this.upload(f, m.mask, m.W, m.H); this.ms += (m.ms - this.ms) * 0.2; this.runs++; if (m.kind === 'precise' || !this.noPrecise) this.err = ''; }
    };
    this.worker.onerror = (e) => { this.err = 'Tirar o fundo (worker): ' + (e.message || e); for (const f of this.pending.values()) f._segBusy = false; this.pending.clear(); };
    this.worker.postMessage({ type: 'hello' });
  }
  frameOf(c) {
    if (c.player && c.player.frame) return c.player.frame;
    const el = c.el; if (!el) return null;
    if (el instanceof HTMLVideoElement) return el.readyState >= 2 ? el : null;
    if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth ? el : null;
    return el;   // canvas (texto, espelho do laser)
  }
  // manda o quadro do clipe para o worker; a máscara volta pela mensagem
  async run(c, f, kind) {
    const src = this.frameOf(c); if (!src) return false;
    const q = Math.max(1, Math.min(2, this.quality(f)));
    const W = kind === 'precise' ? this.rvm[q].W : this.size, H = kind === 'precise' ? this.rvm[q].H : this.size;
    if (!f._segId) f._segId = this.nextId++;
    const reset = f._maskSrc !== c; f._maskSrc = c; f._segClip = c; f._segKind = kind;
    f._segBusy = true;
    let bitmap; try { bitmap = await createImageBitmap(src, { resizeWidth: W, resizeHeight: H, resizeQuality: 'medium' }); }
    catch (e) { f._segBusy = false; return false; }
    const p = f.params || {};
    this.pending.set(f._segId, f);
    this.worker.postMessage({ type: 'run', id: f._segId, bitmap, W, H, kind, q, ratio: this.rvm.ratio, reset,
      params: { tsmooth: Math.min(0.98, Math.max(0, p.tsmooth ?? 0)), fill: p.fill >= 0.5, specks: Math.max(0, p.specks || 0), hard: p.hard >= 0.5, soft: Math.max(0, p.soft || 0), refine: Math.max(0, p.refine || 0) } }, [bitmap]);
    return true;
  }
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
  // a cada quadro: para cada clipe no ar com o efeito, manda um quadro quando passou 1/fps do modelo escolhido
  tick(layers, liveClip, now) {
    if (this.fatal) return;
    for (const L of layers) {
      const c = liveClip(L); if (!c) continue;
      for (const f of [...(c.fx || []), ...(L.fx || [])]) {
        if (f.id !== 'backgroundremoval' || f.bypass) continue;
        if (!this.worker) this.start();
        if (!this.ready) continue;
        if (this.quality(f) >= 1 && !this.gpu && !this.avisou) { this.avisou = true; this.err = 'Qualidade Média/Alta precisa de WebGPU; usando a Baixa'; }
        const kind = this.kindOf(f); f._segSeen = performance.now() / 1000;
        const fps = kind === 'precise' ? this.rvm.fps : this.fps;
        if (f._segBusy || now - (f._maskAt || 0) < 1 / fps) continue;
        f._maskAt = now; this.run(c, f, kind);
      }
    }
  }
}
