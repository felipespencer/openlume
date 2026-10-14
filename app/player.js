// Reprodutor próprio de vídeo, como o do Resolume: lê o MP4/MOV (mp4box.js), decodifica os
// quadros com WebCodecs (placa de vídeo) e guarda os últimos num cache. Tocar para a frente,
// para trás, pular, esfregar e mudar a velocidade viram só "qual quadro mostrar agora".
// Usado nos arquivos preparados (.proj.mp4: H.264 todo intra, cada quadro é chave). Em
// arquivos comuns também funciona, mas a ré precisa decodificar o grupo de quadros inteiro.
//
// Imita a interface do <video> (currentTime, paused, play, pause, playbackRate, ended) para
// o transporte em clips.js não precisar saber qual dos dois está por baixo.
import * as MP4Box from './vendor/mp4box.all.mjs';

const CACHE = 90;   // quadros decodificados guardados (3 s a 30 fps)

export class FramePlayer {
  constructor(path, desktop, url) {
    this.path = path; this.desktop = desktop; this.url = url;
    this.samples = []; this.allIntra = false; this.w = 0; this.h = 0; this.fps = 30; this.duration = 0; this.codec = '';
    this.time = 0; this.paused = true; this.playbackRate = 1; this.ended = false; this.ready = false;
    this.cache = new Map(); this.order = []; this.frame = null; this.frameIndex = -1; this.frameId = 0;
    this.decoder = null; this.decodedUpTo = -1; this.pending = null; this.audio = null;
  }
  get currentTime() { return this.time; }
  set currentTime(t) { this.time = Math.max(0, Math.min(this.duration, t)); this.ended = false; this.want(); }
  play() { this.paused = false; this.ended = false; this.want(); return Promise.resolve(); }
  pause() { this.paused = true; if (this.audio) this.audio.pause(); }

  async load() {
    const buf = this.desktop ? await this.desktop.media.read(this.path) : await (await fetch(this.url)).arrayBuffer();
    const file = MP4Box.createFile();
    // a extração tem de ser pedida dentro do onReady, antes de o mp4box seguir lendo o arquivo
    const samples = []; let track = null;
    await new Promise((resolve, reject) => {
      file.onError = (e) => reject(new Error('MP4: ' + e));
      file.onReady = (info) => {
        track = info.videoTracks && info.videoTracks[0];
        if (!track) return reject(new Error('o arquivo não tem vídeo'));
        file.setExtractionOptions(track.id, null, { nbSamples: 1000 }); file.start();
      };
      file.onSamples = (id, user, list) => { for (const s of list) samples.push({ i: samples.length, t: s.cts / s.timescale, dur: s.duration / s.timescale, key: !!s.is_sync, data: s.data }); if (samples.length >= track.nb_samples) resolve(); };
      let mb = buf; try { mb = MP4Box.MP4BoxBuffer.fromArrayBuffer(buf, 0); } catch { buf.fileStart = 0; }
      file.appendBuffer(mb); file.flush();
      setTimeout(() => track ? resolve() : reject(new Error('não consegui ler o MP4')), 15000);
    });
    file.stop();
    this.w = track.video.width; this.h = track.video.height; this.codec = track.codec; this.timescale = track.timescale;
    this.duration = track.duration / track.timescale; this.fps = track.nb_samples / Math.max(0.001, this.duration);
    this.samples = samples.sort((a, b) => a.t - b.t); this.samples.forEach((s, i) => s.i = i);
    this.allIntra = this.samples.length > 0 && this.samples.every(s => s.key);
    // descrição do codec (avcC/hvcC/vpcC/av1C) para o VideoDecoder
    const trak = file.getTrackById(track.id), entry = trak.mdia.minf.stbl.stsd.entries[0];
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    let description;
    if (box) { const ds = new MP4Box.DataStream(undefined, 0, (MP4Box.Endianness && MP4Box.Endianness.BIG_ENDIAN) ?? false); box.write(ds); description = new Uint8Array(ds.buffer, 8); }
    this.config = { codec: this.codec, codedWidth: this.w, codedHeight: this.h, hardwareAcceleration: 'prefer-hardware', optimizeForLatency: true };
    if (description) this.config.description = description;
    if (!(await VideoDecoder.isConfigSupported(this.config)).supported) { this.config.hardwareAcceleration = 'no-preference'; if (!(await VideoDecoder.isConfigSupported(this.config)).supported) throw new Error('codec não suportado: ' + this.codec); }
    this.newDecoder();
    this.ready = true; this.want();
    await new Promise(r => { const t0 = Date.now(); const chk = () => (this.frame || Date.now() - t0 > 4000) ? r() : setTimeout(chk, 20); chk(); });
    return this;
  }
  newDecoder() {
    if (this.decoder) { try { this.decoder.close(); } catch { } }
    this.decoder = new VideoDecoder({
      output: (vf) => this.onFrame(vf),
      error: (e) => { console.warn('VideoDecoder', e); this.decodedUpTo = -1; this.pending = null; },
    });
    this.decoder.configure(this.config); this.decodedUpTo = -1;
  }
  indexAt(t) {   // amostra cujo tempo contém t
    const s = this.samples; let lo = 0, hi = s.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].t <= t) lo = m; else hi = m - 1; }
    return lo;
  }
  onFrame(vf) {
    const idx = Math.round(vf.timestamp / 1e6 * 1000);   // o timestamp carrega o índice (ver want)
    if (this.cache.has(idx)) { this.cache.get(idx).close(); this.order = this.order.filter(i => i !== idx); }
    this.cache.set(idx, vf); this.order.push(idx);
    while (this.order.length > CACHE) { const old = this.order.shift(); if (old !== this.frameIndex) { const f = this.cache.get(old); if (f) f.close(); this.cache.delete(old); } else this.order.push(old); }
    if (this.pending != null && idx === this.pending) this.pending = null;
    this.show();
  }
  show() {
    const idx = this.indexAt(this.time);
    // mostra o quadro pedido; se ainda não chegou, o mais perto já decodificado (ré: o anterior)
    let best = this.cache.has(idx) ? idx : -1;
    if (best < 0) { let bd = Infinity; for (const k of this.cache.keys()) { const d = Math.abs(k - idx); if (d < bd) { bd = d; best = k; } } if (bd > 6) best = -1; }
    if (best >= 0 && best !== this.frameIndex) { this.frame = this.cache.get(best); this.frameIndex = best; this.frameId++; }
  }
  // pede ao decodificador o quadro do tempo atual
  want() {
    if (!this.ready || !this.samples.length) return;
    const idx = this.indexAt(this.time);
    if (this.cache.has(idx)) { this.show(); return; }
    if (this.pending === idx) return;
    this.pending = idx;
    const S = this.samples, feed = (s) => this.decoder.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: Math.round(s.i * 1e3), duration: Math.round(s.dur * 1e6), data: s.data }));
    try {
      if (this.decodedUpTo === idx - 1 && this.decoder.state === 'configured') { feed(S[idx]); this.decodedUpTo = idx; }
      else {
        let k = idx; while (k > 0 && !S[k].key) k--;
        if (this.decoder.state !== 'configured' || this.decodedUpTo >= 0) this.newDecoder();
        // na ré em arquivo comum decodifica o grupo inteiro de uma vez e guarda no cache
        const end = this.allIntra ? idx : Math.min(S.length - 1, Math.max(idx, k + (this.playbackRate < 0 || this.reverse ? 60 : 0)));
        for (let i = k; i <= end; i++) feed(S[i]);
        this.decodedUpTo = end;
      }
      this.decoder.flush().catch(() => { });   // sem o flush a placa segura o quadro esperando os próximos
    } catch (e) { console.warn('decode', e.message); this.newDecoder(); this.pending = null; }
  }
  // chamado a cada quadro do laço com o tempo passado; o transporte (clips.js) cuida de entrada/saída/modo
  advance(dt, reverse) {
    this.reverse = reverse;
    if (!this.paused && !reverse) { this.time = Math.min(this.duration, this.time + dt * this.playbackRate); if (this.time >= this.duration - 1e-3) this.ended = true; }
    this.want();
    // som: um <video> escondido acompanha quando toca para a frente perto de 1x
    const a = this.audio;
    if (a) {
      const ok = !this.paused && !reverse && Math.abs(this.playbackRate - 1) < 0.02;
      if (ok) { if (a.paused) a.play().catch(() => { }); if (Math.abs(a.currentTime - this.time) > 0.15) { try { a.currentTime = this.time; } catch { } } }
      else if (!a.paused) a.pause();
    }
  }
  thumb(size = 240) {
    const f = this.frame; if (!f) return '';
    const k = Math.min(size / this.w, size / this.h), c = document.createElement('canvas'); c.width = Math.max(2, Math.round(this.w * k)); c.height = Math.max(2, Math.round(this.h * k));
    try { c.getContext('2d').drawImage(f, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.75); } catch { return ''; }
  }
  close() { for (const f of this.cache.values()) f.close(); this.cache.clear(); this.frame = null; if (this.decoder) { try { this.decoder.close(); } catch { } } if (this.audio) { this.audio.pause(); this.audio.src = ''; } }
}
export const isPrepared = (name) => /\.proj\.(mp4|mov)$/i.test(name || '');

// GIF animado (e WebP/AVIF animados): o ImageDecoder do navegador dá cada quadro por índice,
// então o clipe vira um "vídeo" com a mesma interface do FramePlayer: transporte, ré, pulo e
// velocidade. GIF parado (um quadro só) continua sendo imagem (ver clips.js).
export class GifPlayer {
  constructor(url) {
    this.url = url; this.w = 0; this.h = 0; this.duration = 0; this.fps = 0; this.codec = 'gif'; this.allIntra = true;
    this.samples = []; this.time = 0; this.paused = true; this.playbackRate = 1; this.ended = false; this.ready = false;
    this.cache = new Map(); this.order = []; this.frame = null; this.frameIndex = -1; this.frameId = 0; this.pending = null; this.audio = null;
  }
  get currentTime() { return this.time; }
  set currentTime(t) { this.time = Math.max(0, Math.min(this.duration, t)); this.ended = false; this.want(); }
  play() { this.paused = false; this.ended = false; this.want(); return Promise.resolve(); }
  pause() { this.paused = true; }
  async load() {
    const r = await fetch(this.url); const type = (r.headers.get('content-type') || 'image/gif').split(';')[0];
    const buf = await r.arrayBuffer();
    if (typeof ImageDecoder === 'undefined') throw new Error('este navegador não decodifica GIF por quadro');
    this.decoder = new ImageDecoder({ data: buf, type, preferAnimation: true });
    await this.decoder.tracks.ready; await this.decoder.completed;
    const track = this.decoder.tracks.selectedTrack; this.frames = track ? track.frameCount : 1;
    // uma passada para medir cada quadro (o navegador guarda os decodificados)
    let t = 0;
    for (let i = 0; i < this.frames; i++) {
      const { image } = await this.decoder.decode({ frameIndex: i, completeFramesOnly: true });
      if (!i) { this.w = image.displayWidth; this.h = image.displayHeight; }
      const dur = Math.max(0.02, (image.duration || 100000) / 1e6);   // GIF sem atraso: 20 ms, como os navegadores
      this.samples.push({ i, t, dur, key: true }); t += dur;
      if (i < this.frames - 1 || this.frames === 1) image.close(); else this.onFrame(image, i);
    }
    this.duration = t; this.fps = this.frames / Math.max(0.001, t);
    this.ready = true; this.time = 0; this.want();
    await new Promise(r => { const t0 = Date.now(); const chk = () => (this.frameIndex === 0 || Date.now() - t0 > 3000) ? r() : setTimeout(chk, 10); chk(); });
    return this;
  }
  indexAt(t) { const s = this.samples; let lo = 0, hi = s.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].t <= t) lo = m; else hi = m - 1; } return lo; }
  onFrame(vf, idx) {
    if (this.cache.has(idx)) { this.cache.get(idx).close(); this.order = this.order.filter(i => i !== idx); }
    this.cache.set(idx, vf); this.order.push(idx);
    while (this.order.length > CACHE) { const old = this.order.shift(); if (old !== this.frameIndex) { const f = this.cache.get(old); if (f) f.close(); this.cache.delete(old); } else this.order.push(old); }
    this.show();
  }
  show() {
    const idx = this.indexAt(this.time);
    let best = this.cache.has(idx) ? idx : -1;
    if (best < 0) { let bd = Infinity; for (const k of this.cache.keys()) { const d = Math.abs(k - idx); if (d < bd) { bd = d; best = k; } } if (bd > 6) best = -1; }
    if (best >= 0 && best !== this.frameIndex) { this.frame = this.cache.get(best); this.frameIndex = best; this.frameId++; }
  }
  want() {
    if (!this.ready) return;
    const idx = this.indexAt(this.time);
    if (this.cache.has(idx)) { this.show(); return; }
    if (this.pending === idx) return;
    this.pending = idx;
    this.decoder.decode({ frameIndex: idx, completeFramesOnly: true }).then(({ image }) => { if (this.pending === idx) this.pending = null; this.onFrame(image, idx); }).catch(() => { if (this.pending === idx) this.pending = null; });
  }
  advance(dt, reverse) {
    if (!this.paused && !reverse) { this.time = Math.min(this.duration, this.time + dt * this.playbackRate); if (this.time >= this.duration - 1e-3) this.ended = true; }
    this.want();
  }
  thumb(size = 240) {
    const f = this.frame; if (!f) return '';
    const k = Math.min(size / this.w, size / this.h), c = document.createElement('canvas'); c.width = Math.max(2, Math.round(this.w * k)); c.height = Math.max(2, Math.round(this.h * k));
    try { c.getContext('2d').drawImage(f, 0, 0, c.width, c.height); return c.toDataURL('image/png'); } catch { return ''; }
  }
  clone() { const g = new GifPlayer(this.url); g.decoder = this.decoder; g.frames = this.frames; g.samples = this.samples; Object.assign(g, { w: this.w, h: this.h, duration: this.duration, fps: this.fps }); g.ready = true; g.want(); return g; }
  close() { for (const f of this.cache.values()) f.close(); this.cache.clear(); this.frame = null; /* o decodificador é compartilhado pelas cópias; fica aberto */ }
}
export const isAnimName = (n) => /\.(gif|webp|avif)$/i.test(n || '');
