// Gravação da composição (ou de uma tela) em WebM, com o MediaRecorder do navegador, no
// formato do painel Gravar do Resolume: fonte, mídia, preset, início e parada.
export class Recorder {
  // ctx: { compCanvas, screens(), screenCanvas(sc), desktop, toast, onChange(), dir (pasta de destino opcional) }
  constructor(ctx) {
    this.c = ctx; this.state = 'idle'; this.files = []; this.rec = null; this.chunks = []; this.t0 = 0; this.timer = null;
    // after: 'clip' = a gravação vira um clipe na grade (como o Resolume), 'show' = abre a pasta, 'nothing'
    this.opts = { source: 'comp', after: 'clip', media: 'video', preset: 'normal', start: 'now', startSecs: 3, stop: 'manual', stopSecs: 10 };
    if (ctx.desktop) ctx.desktop.rec.list(ctx.dir).then(l => { this.files = l; ctx.onChange(); }).catch(() => { });
  }
  screens() { return this.c.screens(); }
  elapsed() { const s = Math.floor((performance.now() - this.t0) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  // Record: começa já, no próximo disparo ou depois de N segundos
  start() {
    if (this.state !== 'idle') return;
    const o = this.opts;
    if (o.start === 'now') this.begin();
    else { this.state = 'armed'; if (o.start === 'after') this.timer = setTimeout(() => this.begin(), o.startSecs * 1000); this.c.onChange(); }
  }
  // chamado pela grade a cada disparo de clipe
  onTrigger() { if (this.state === 'armed' && this.opts.start === 'trigger') this.begin(); }
  async begin() {
    if (this.state === 'recording') return;
    clearTimeout(this.timer);
    const o = this.opts;
    let canvas = this.c.compCanvas;
    if (o.source.startsWith('screen:')) { const sc = this.screens().find(s => String(s.id) === o.source.slice(7)); if (sc) canvas = this.c.screenCanvas(sc); }
    const stream = canvas.captureStream(30);
    if (o.media === 'video+mic') { try { const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); for (const t of mic.getAudioTracks()) stream.addTrack(t); } catch (e) { this.c.toast('Sem microfone: ' + e.message); } }
    const bps = { high: 20e6, normal: 8e6, low: 3e6 }[o.preset] || 8e6;
    // VP8 primeiro: codifica mais leve que o VP9 e não rouba quadros da composição enquanto grava
    const mime = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    this.chunks = [];
    try { this.rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: bps }); } catch (e) { this.c.toast('Não consegui gravar: ' + e.message); this.state = 'idle'; this.c.onChange(); return; }
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => this.finish();
    this.rec.start(1000); this.t0 = performance.now(); this.state = 'recording';
    if (o.stop === 'after') this.timer = setTimeout(() => this.stop(), o.stopSecs * 1000);
    this.tick = setInterval(() => this.c.onChange(), 1000);
    this.c.onChange();
  }
  stop() {
    clearTimeout(this.timer); clearInterval(this.tick);
    if (this.state === 'armed') { this.state = 'idle'; this.c.onChange(); return; }
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
  }
  // chamado pela grade quando o último clipe no ar acaba
  onAllEnded() { if (this.state === 'recording' && this.opts.stop === 'ended') this.stop(); }
  async finish() {
    this.state = 'idle';
    const blob = new Blob(this.chunks, { type: 'video/webm' }); this.chunks = [];
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = `gravacao-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.webm`;
    this.lastBlob = blob;
    if (this.c.desktop) {
      try {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const info = await this.c.desktop.rec.save(name, bytes, this.c.dir);
        this.files.push(info); this.c.toast('Gravado: ' + info.name + ' (' + (info.size / 1e6).toFixed(1) + ' MB)');
        if (this.opts.after === 'show') this.c.desktop.rec.show(info.path);
        if (this.opts.after === 'clip' && this.c.toClip) await this.c.toClip(info.path, info.name, null);
      } catch (e) { this.c.toast('Não consegui salvar: ' + e.message); }
    } else if (this.opts.after === 'clip' && this.c.toClip) {
      await this.c.toClip('', name, new File([blob], name, { type: 'video/webm' }));
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    }
    this.c.onChange();
  }
}
