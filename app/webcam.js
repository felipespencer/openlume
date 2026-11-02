// Webcam virtual: leva a composição, encaixada em 1920×1080, para o processo que escreve na câmera virtual do OBS (app/webcam-native.js).
// Sem custo com a webcam desligada. A leitura da placa é assíncrona; se a anterior não acabou ou o processo ainda não engoliu o quadro, este é pulado (não acumula atraso).
export const CAM_W = 1920, CAM_H = 1080;
export class WebcamOut {
  constructor(engine, desktop) { this.engine = engine; this.D = desktop; this.on = false; this.port = null; this.rd = null; this.ocupado = false; this.ult = 0; this.enviados = 0; this.pulados = 0; this.buf = null; }
  get disponivel() { return !!(this.D && this.D.webcamPort); }
  // devolve { ok } ou { ok: false, motivo: 'sem-obs' | 'ocupada' | 'nativo', erro }
  async ligar() {
    if (this.on) return { ok: true };
    if (!this.disponivel) return { ok: false, motivo: 'nativo', erro: 'só na versão instalada' };
    if (!this.port) await this.abrirPorta();
    const r = await new Promise((res) => { this.esperaStatus = res; this.port.postMessage({ type: 'ligar', W: CAM_W, H: CAM_H }); });
    this.on = !!r.ok; this.enviados = 0; this.pulados = 0; this.ocupado = false; this.ult = 0;
    return r;
  }
  async desligar() {
    if (!this.on) return;
    this.on = false; if (this.rd) { this.engine.cancelReadClipFrame(this.rd); this.rd = null; }
    await new Promise((res) => { this.esperaStatus = res; this.port.postMessage({ type: 'desligar' }); });
  }
  abrirPorta() {
    return new Promise((res) => {
      const onMsg = (e) => {
        if (e.source !== window || !e.data || e.data.type !== 'webcam:port' || !e.ports || !e.ports[0]) return;
        window.removeEventListener('message', onMsg); this.port = e.ports[0];
        this.port.onmessage = (ev) => { const m = ev.data; if (m.type === 'feito') this.ocupado = false; else if (m.type === 'status' && this.esperaStatus) { const f = this.esperaStatus; this.esperaStatus = null; f(m); } };
        res();
      };
      window.addEventListener('message', onMsg); this.D.webcamPort();
    });
  }
  // chamada no fim de cada quadro do programa, depois de engine.render
  tick() {
    if (!this.on) return;
    const now = performance.now();
    if (this.rd) {
      if (!this.buf) this.buf = new Uint8Array(CAM_W * CAM_H * 3 / 2);
      const px = this.engine.pollWebcam(this.rd, this.buf);
      if (px) { this.rd = null; if (!this.ocupado) { this.ocupado = true; this.port.postMessage({ type: 'quadro', buf: this.buf }); this.enviados++; } else this.pulados++; }
      else if (now - this.rd.t0 > 1000) { this.engine.cancelReadClipFrame(this.rd); this.rd = null; }
    }
    if (!this.rd && now - this.ult >= 31) { this.ult = now; this.rd = this.engine.beginWebcam(CAM_W, CAM_H); }
  }
}
