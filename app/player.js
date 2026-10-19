// Reprodutor próprio de vídeo: lê o MP4/MOV (mp4box.js), decodifica os
// quadros com WebCodecs (placa de vídeo) e guarda os últimos num cache. Tocar para a frente,
// para trás, pular, esfregar e mudar a velocidade viram só "qual quadro mostrar agora".
// Usado nos arquivos preparados (.proj.mp4: H.264 todo intra, cada quadro é chave). Em
// arquivos comuns também funciona, mas a ré precisa decodificar o grupo de quadros inteiro.
//
// Imita a interface do <video> (currentTime, paused, play, pause, playbackRate, ended) para
// o transporte em clips.js não precisar saber qual dos dois está por baixo.
//
// Híbrido (2026-10-14): tocando para a frente a 1x, quem mostra o quadro é o <video> escondido
// (a decodificação de vídeo do Windows, a mesma dos clipes comuns; `live`). O WebCodecs só entra
// em pausa, pulo, esfregar, ré e velocidade diferente de 1x. Três decodificadores WebCodecs o
// tempo todo derrubavam o processo de GPU (na placa) ou ficavam para trás (por software).
import * as MP4Box from './vendor/mp4box.all.mjs';

const CACHE = 45;        // quadros decodificados guardados (1,5 s a 30 fps); cada um é um quadro inteiro na placa
const DATA_CACHE = 240;  // amostras comprimidas guardadas (8 s a 30 fps); o resto fica no disco
const PREFETCH = 24;     // amostras lidas adiantado na direção em que toca

export class FramePlayer {
  constructor(path, desktop, url) {
    this.path = path; this.desktop = desktop; this.url = url;
    this.samples = []; this.allIntra = false; this.w = 0; this.h = 0; this.fps = 30; this.duration = 0; this.codec = '';
    this.time = 0; this.paused = true; this.playbackRate = 1; this.ended = false; this.ready = false;
    this.cache = new Map(); this.order = []; this.frame = null; this.frameIndex = -1; this.frameId = 0;
    this.decoder = null; this.decodedUpTo = -1; this.pending = null; this.audio = null;
    this.data = new Map(); this.dataOrder = [];   // amostra → bytes comprimidos, só uma janela em volta do que toca
    this.inflight = new Set(); this.lastOutAt = 0; this.pendingAt = 0;   // o que já foi mandado decodificar e ainda não voltou
    this.live = false;   // true = o <video> escondido está mostrando (frente, 1x)
  }
  // lê um trecho do arquivo: pelo processo principal (instalado) ou por Range na URL app://media
  async read(off, len) {
    if (this.desktop && this.path) { const r = await this.desktop.media.readRange(this.path, off, len); return r.data; }
    const r = await fetch(this.url, { headers: { Range: 'bytes=' + off + '-' + (off + len - 1) } }); return r.arrayBuffer();
  }
  get currentTime() { return this.time; }
  set currentTime(t) { this.time = Math.max(0, Math.min(this.duration, t)); this.ended = false; if (this.live && this.audio) { try { this.audio.currentTime = this.time; } catch { } } else this.want(); }   // tocando pelo <video>, o pulo vai para ele
  play() { this.paused = false; this.ended = false; this.want(); return Promise.resolve(); }
  pause() { this.paused = true; if (this.audio) this.audio.pause(); }

  async load() {
    // lê o começo do arquivo em pedaços de 2 MB até o mp4box ter o cabeçalho (moov); os arquivos
    // preparados têm o moov na frente (+faststart). A tabela de amostras diz onde cada quadro
    // está no disco; os bytes só são lidos quando o quadro vai ser decodificado.
    const file = MP4Box.createFile(); let track = null, trak = null, err = null;
    file.onError = (e) => { err = new Error('MP4: ' + e); };
    file.onReady = (info) => { track = info.videoTracks && info.videoTracks[0]; if (track) trak = file.getTrackById(track.id); else err = new Error('o arquivo não tem vídeo'); };
    let pos = 0; const CH = 2 * 1024 * 1024, LIMIT = 512 * 1024 * 1024;
    while (!track && !err && pos < LIMIT) {
      const ab = await this.read(pos, CH); if (!ab || !ab.byteLength) break;
      let mb = ab; try { mb = MP4Box.MP4BoxBuffer.fromArrayBuffer(ab, pos); } catch { ab.fileStart = pos; }
      const next = file.appendBuffer(mb); pos = typeof next === 'number' && next > pos ? next : pos + ab.byteLength;
    }
    if (err) throw err; if (!track || !trak || !trak.samples || !trak.samples.length) throw new Error('não consegui ler o MP4');
    this.w = track.video.width; this.h = track.video.height; this.codec = track.codec; this.timescale = track.timescale;
    this.duration = track.duration / track.timescale; this.fps = track.nb_samples / Math.max(0.001, this.duration);
    this.samples = trak.samples.map(s => ({ t: s.cts / s.timescale, dur: s.duration / s.timescale, key: !!s.is_sync, off: s.offset, size: s.size })).sort((a, b) => a.t - b.t);
    this.samples.forEach((s, i) => s.i = i);
    this.allIntra = this.samples.every(s => s.key);
    // descrição do codec (avcC/hvcC/vpcC/av1C) para o VideoDecoder
    const entry = trak.mdia.minf.stbl.stsd.entries[0];
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    let description;
    if (box) { const ds = new MP4Box.DataStream(undefined, 0, (MP4Box.Endianness && MP4Box.Endianness.BIG_ENDIAN) ?? false); box.write(ds); description = new Uint8Array(ds.buffer, 8); }
    this.config = { codec: this.codec, codedWidth: this.w, codedHeight: this.h, hardwareAcceleration: window.__projSoftDecode ? 'prefer-software' : 'prefer-hardware', optimizeForLatency: true };   // por software é o padrão: com 3 decodificadores na placa, abrir as saídas derrubava o processo de GPU (RTX 2070, 2026-10-14)
    if (description) this.config.description = description;
    if (!(await VideoDecoder.isConfigSupported(this.config)).supported) { this.config.hardwareAcceleration = 'no-preference'; if (!(await VideoDecoder.isConfigSupported(this.config)).supported) throw new Error('codec não suportado: ' + this.codec); }
    this.newDecoder();
    this.ready = true; this.want();
    await new Promise(r => { const t0 = Date.now(); const chk = () => (this.frame || Date.now() - t0 > 4000) ? r() : setTimeout(chk, 20); chk(); });
    return this;
  }
  // garante os bytes das amostras a..b (uma leitura só quando estão em sequência no arquivo)
  async ensure(a, b) {
    const S = this.samples, miss = [];
    for (let i = Math.max(0, a); i <= Math.min(S.length - 1, b); i++) if (!this.data.has(i)) miss.push(i);
    if (!miss.length) return;
    let lo = Infinity, hi = -1; for (const i of miss) { lo = Math.min(lo, S[i].off); hi = Math.max(hi, S[i].off + S[i].size); }
    if (hi - lo <= 48 * 1024 * 1024) { const ab = await this.read(lo, hi - lo); for (const i of miss) this.data.set(i, new Uint8Array(ab, S[i].off - lo, S[i].size)); }
    else for (const i of miss) this.data.set(i, new Uint8Array(await this.read(S[i].off, S[i].size)));
    for (const i of miss) this.dataOrder.push(i);
    while (this.dataOrder.length > DATA_CACHE) this.data.delete(this.dataOrder.shift());
  }
  newDecoder() {
    if (this.decoder) { try { this.decoder.close(); } catch { } }
    this.decoder = new VideoDecoder({
      output: (vf) => this.onFrame(vf),
      error: (e) => { console.warn('VideoDecoder', e); this.decodedUpTo = -1; this.pending = null; },
    });
    this.decoder.configure(this.config); this.decodedUpTo = -1; this.inflight.clear(); this.lastOutAt = performance.now();
  }
  indexAt(t) {   // amostra cujo tempo contém t
    const s = this.samples; let lo = 0, hi = s.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].t <= t) lo = m; else hi = m - 1; }
    return lo;
  }
  onFrame(vf) {
    const idx = Math.round(vf.timestamp / 1e6 * 1000);   // o timestamp carrega o índice (ver want)
    this.inflight.delete(idx); this.lastOutAt = performance.now();
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
    const now = performance.now();
    if (this.pending === idx && now - this.pendingAt < 400) return;   // já pedido há pouco; se não voltar em 400 ms, pede de novo
    this.pending = idx; this.pendingAt = now;
    this.decodeAt(idx).catch((e) => { console.warn('decode', e.message || e); if (this.pending === idx) this.pending = null; });
  }
  feed(s) { this.decoder.decode(new EncodedVideoChunk({ type: s.key ? 'key' : 'delta', timestamp: Math.round(s.i * 1e3), duration: Math.round(s.dur * 1e6), data: this.data.get(s.i) })); this.inflight.add(s.i); }
  async decodeAt(idx) {
    const S = this.samples, back = this.playbackRate < 0 || this.reverse;
    // vigia: decodificador que ficou mudo com fila cheia é recriado (acontece no modo por software sob carga)
    if (this.decoder.state !== 'configured' || (this.decoder.decodeQueueSize > 0 && performance.now() - this.lastOutAt > 1500)) this.newDecoder();
    if (this.allIntra) {
      // cada quadro é chave: pede o quadro de agora e, tocando, um ou dois adiante; nunca deixa a fila crescer.
      // Se o decodificador está atrasado, este quadro é solto e o próximo pedido pega o quadro atual.
      const ahead = this.paused ? 0 : 2, list = [];
      for (let k = 0; k <= ahead; k++) { const i = back ? idx - k : idx + k; if (i >= 0 && i < S.length && !this.cache.has(i) && !this.inflight.has(i)) list.push(i); }
      if (!list.length) return;
      const pre = back ? Math.max(0, idx - PREFETCH) : Math.min(S.length - 1, idx + PREFETCH);
      await this.ensure(Math.min(idx, pre), Math.max(idx, pre));
      if (this.pending !== idx || !this.ready || this.decoder.state !== 'configured') return;
      if (this.decoder.decodeQueueSize > 6) return;
      try { for (const i of list) if (!this.cache.has(i) && !this.inflight.has(i)) this.feed(S[i]); this.decoder.flush().catch(() => { }); }   // o flush faz a placa soltar o quadro em vez de segurá-lo
      catch (e) { console.warn('decode', e.message); this.newDecoder(); this.pending = null; }
      return;
    }
    // arquivo comum: decodifica do quadro chave anterior até o pedido (e, na ré, o grupo inteiro)
    let k = idx; while (k > 0 && !S[k].key) k--;
    const seq = this.decodedUpTo === idx - 1;
    const a = seq ? idx : k, b = Math.min(S.length - 1, Math.max(idx, k + (back ? 60 : 0)));
    const pre = back ? Math.max(0, a - PREFETCH) : Math.min(S.length - 1, b + PREFETCH);
    await this.ensure(Math.min(a, pre), Math.max(b, pre));
    if (this.pending !== idx || !this.ready) return;
    try {
      if (seq && this.decoder.state === 'configured') { feedOne(this, S[idx]); this.decodedUpTo = idx; }
      else { if (this.decoder.state !== 'configured' || this.decodedUpTo >= 0) this.newDecoder(); for (let i = a; i <= b; i++) feedOne(this, S[i]); this.decodedUpTo = b; }
      this.decoder.flush().catch(() => { });
    } catch (e) { console.warn('decode', e.message); this.newDecoder(); this.pending = null; }
  }
  // chamado a cada quadro do laço com o tempo passado; o transporte (clips.js) cuida de entrada/saída/modo
  advance(dt, reverse) {
    this.reverse = reverse;
    const a = this.audio;
    const live = !!a && a.readyState >= 2 && !this.paused && !reverse && Math.abs(this.playbackRate - 1) < 0.02;
    if (live) {
      // o <video> toca sozinho e dita o tempo; o WebCodecs descansa
      if (!this.live) { try { if (Math.abs(a.currentTime - this.time) > 0.05) a.currentTime = this.time; } catch { } }
      this.live = true;
      if (a.paused) a.play().catch(() => { });
      this.time = Math.min(this.duration, a.currentTime);
      if (a.ended || this.time >= this.duration - 1e-3) this.ended = true;
      this.frameIndex = this.indexAt(this.time);
      return;
    }
    if (this.live) { this.live = false; this.frameIndex = -1; }
    if (a && !a.paused) a.pause();
    if (!this.paused && !reverse) { this.time = Math.min(this.duration, this.time + dt * this.playbackRate); if (this.time >= this.duration - 1e-3) this.ended = true; }
    this.want();
  }
  thumb(size = 240) {
    const f = this.frame; if (!f) return '';
    const k = Math.min(size / this.w, size / this.h), c = document.createElement('canvas'); c.width = Math.max(2, Math.round(this.w * k)); c.height = Math.max(2, Math.round(this.h * k));
    try { c.getContext('2d').drawImage(f, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.75); } catch { return ''; }
  }
  close() { for (const f of this.cache.values()) f.close(); this.cache.clear(); this.data.clear(); this.dataOrder = []; this.ready = false; this.frame = null; if (this.decoder) { try { this.decoder.close(); } catch { } } if (this.audio) { this.audio.pause(); this.audio.src = ''; } }
}
const feedOne = (p, s) => p.feed(s);
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
