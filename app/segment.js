// Tirar o fundo da webcam (ou de qualquer clipe): segmentação de pessoa com modelos públicos em ONNX. O trabalho
// pesado fica todo no worker (segment-worker.js): o modelo (PP-HumanSeg na qualidade Baixa; RVM nas Média e Alta,
// com WebGPU) e a limpeza da máscara, na ordem do efeito do Resolume 7.28. Aqui só: o quadro do clipe vira um
// ImageBitmap já no tamanho do modelo (o redimensionamento é na GPU, assíncrono), vai para o worker, e a máscara
// que volta sobe como textura para o efeito (slot uPrev), que a estica com refino guiado pela própria imagem.
export class Segmenter {
  constructor(gl) {
    this.gl = gl; this.err = ''; this.runs = 0; this.ms = 0; this.gpu = !!navigator.gpu; this.ready = false; this.fatal = false;
    this.native = false;   // vira true quando o processo nativo (onnxruntime-node + DirectML, pela porta do preload) responde
    this.size = 192; this.fps = 30;                                                                   // Baixa
    this.rvm = { 1: { W: 640, H: 384 }, 2: { W: 960, H: 544 }, ratio: 0.5, fps: 15 };                // WebGPU (reserva): Média, Alta (largura e altura múltiplas de 32: o grafo remendado exige)
    this.nat = { modnet_hrnet: { 1: { W: 480, H: 480 }, 2: { W: 640, H: 640 } }, fps: 30 };           // nativo: Média = MODNet-HRNet 480², Alta = MODNet-HRNet 640² (na bancada foi o que mais bateu com o Medium e o High do Resolume 7.28)
    this.nextId = 1; this.pending = new Map(); this.worker = null;
  }
  quality(f) { return f.params ? Math.round(f.params.quality ?? 1) : 1; }
  // que modelo roda para este efeito: nativo → fast / modnet / rvm; WebGPU → fast / precise (RVM)
  kindOf(f) { const q = this.quality(f); if (this.native) return q <= 0 ? 'fast' : 'modnet_hrnet'; return q >= 1 && this.gpu && !this.noPrecise ? 'precise' : 'fast'; }
  dims(kind, q) { if (kind === 'fast') return [this.size, this.size]; const qq = Math.max(1, Math.min(2, q)); if (kind === 'precise') { const d = this.rvm[qq]; return [d.W, d.H]; } const d = this.nat[kind][qq]; return [d.W, d.H]; }
  fpsOf(kind) { return this.native ? this.nat.fps : kind === 'precise' ? this.rvm.fps : this.fps; }
  start() {
    if (this.worker) return;
    this.worker = new Worker(new URL('./segment-worker.js', import.meta.url));
    this.worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === 'ready') { this.ready = true; this.gpu = this.gpu && m.gpu; this.adapter = m.adapter; return; }
      if (m.type === 'native') { this.native = !!m.ok; this.ep = m.ep; if (!m.ok && m.err) this.err = 'Modelo nativo indisponível (' + m.err + '); usando WebGPU'; return; }
      if (m.type === 'err') { this.err = m.msg; if (m.fatal) this.fatal = true; if (/Média\/Alta/.test(m.msg)) this.noPrecise = true; }
      const f = m.id != null ? this.pending.get(m.id) : null;
      if (f) {
        this.pending.delete(m.id); f._segBusy = false;
        // já passou 1/fps? manda o próximo quadro agora, sem esperar o tick (o clipe ainda estava no ar no último tick)
        const now = performance.now() / 1000, fps = this.fpsOf(f._segKind);
        if (f._segClip && now - (f._segSeen || 0) < 0.2 && !f.bypass && now - (f._maskAt || 0) >= 1 / fps) { f._maskAt = now; this.run(f._segClip, f, this.kindOf(f)); }   // o modelo pode ter mudado (nativo ligou, qualidade trocou)
      }
      if (m.type === 'mask' && f) { this.natFails = 0; this.etapas = m.etapas; this.upload(f, m.mask, m.W, m.H); this.ms += (m.ms - this.ms) * 0.2; this.runs++; if (m.kind === 'precise' || !this.noPrecise) this.err = ''; }
    };
    this.worker.onerror = (e) => { this.err = 'Tirar o fundo (worker): ' + (e.message || e); for (const f of this.pending.values()) f._segBusy = false; this.pending.clear(); };
    this.worker.postMessage({ type: 'hello' });
    // porta para o processo nativo (só no programa instalado/Electron): chega por window.postMessage e vai inteira para o worker
    const D = window.projDesktop;
    if (D && D.segPort) {
      const onMsg = (e) => { if (e.source === window && e.data && e.data.type === 'seg:port' && e.ports && e.ports[0]) { window.removeEventListener('message', onMsg); this.worker.postMessage({ type: 'port' }, [e.ports[0]]); } };
      window.addEventListener('message', onMsg); D.segPort();
    }
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
    const [W, H] = this.dims(kind, q);
    if (!f._segId) f._segId = this.nextId++;
    const reset = f._maskSrc !== c; f._maskSrc = c; f._segClip = c; f._segKind = kind;
    f._segBusy = true;
    let bitmap; try { bitmap = await createImageBitmap(src, { resizeWidth: W, resizeHeight: H, resizeQuality: 'medium' }); }
    catch (e) { f._segBusy = false; return false; }
    const p = f.params || {};
    this.pending.set(f._segId, f); f._segSent = performance.now();
    this.worker.postMessage({ type: 'run', id: f._segId, bitmap, W, H, kind, q, ratio: this.rvm.ratio, reset, native: this.native,
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
    // pedido que não volta em 3 s: libera o efeito; se o nativo falhar três vezes seguidas, cai para a WebGPU
    for (const [id, f] of this.pending) if (performance.now() - f._segSent > 3000) { this.pending.delete(id); f._segBusy = false; if (this.native && ++this.natFails >= 3) { this.native = false; this.err = 'Modelo nativo parou de responder; usando WebGPU'; } }
    for (const L of layers) {
      const c = liveClip(L); if (!c) continue;
      for (const f of [...(c.fx || []), ...(L.fx || [])]) {
        if (f.id !== 'backgroundremoval' || f.bypass) continue;
        if (!this.worker) this.start();
        if (!this.ready) continue;
        if (this.quality(f) >= 1 && !this.gpu && !this.avisou) { this.avisou = true; this.err = 'Qualidade Média/Alta precisa de WebGPU; usando a Baixa'; }
        const kind = this.kindOf(f); f._segSeen = performance.now() / 1000;
        const fps = this.fpsOf(kind);
        if (f._segBusy || now - (f._maskAt || 0) < 1 / fps) continue;
        f._maskAt = now; this.run(c, f, kind);
      }
    }
  }
}
