// Clipes: o que cabe numa casa da grade. Arquivo (vídeo ou imagem, por caminho do disco ou
// arquivo solto), fonte gerada (shader), texto, câmera e quadro do laser.
import { IDENT_TR } from './engine.js';
import { sourceById } from './sources.js';
import { FramePlayer, GifPlayer, isPrepared, isAnimName } from './player.js';
// o motor de áudio (audio.js) é ligado por app.js; sem ele, volume e mudo vão direto no elemento
let audioEngine = null;
export const setAudioEngine = (a) => { audioEngine = a; };
import { cloneFx } from './effects.js';

let seq = 1;
export const nextId = () => seq++;
// ap: para onde o clipe manda quando acaba — 'layer' segue o autopilot da camada; 'next', 'prev', 'random', 'stop' ou 'cell' (camada l, coluna c)
// tr: transporte — in/out em segundos, modo loop|bounce|once|random, dir 1|-1, playing; audio: volume, pan, mudo;
// blend: mistura do clipe ('' = a da camada); opacity; trig: normal|piano|toggle; ignoreColumn
const base = (kind, name) => ({ id: seq++, name, kind, url: '', path: '', w: 0, h: 0, dur: 0, fit: 'contain', speed: 1, thumb: '', el: null, fx: [], transform: IDENT_TR(),
  ap: { mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5, beats: 4 }, tr: { in: 0, out: 0, mode: 'loop', dir: 1, playing: true, sync: 'timeline', beats: 8, away: 'restart' }, audio: { vol: 1, pan: 0, mute: false }, panim: {},
  blend: '', opacity: 1, trig: 'normal', ignoreColumn: false, rev: 1, afx: [] });
export const mediaUrl = (path) => 'app://projecionista/media/' + btoa(unescape(encodeURIComponent(path))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const isVideoName = (n) => /\.(mp4|webm|mov|m4v|mkv|ogv|avi)$/i.test(n);
export const isImageName = (n) => /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(n);

// mede a mídia e tira a miniatura na proporção do próprio arquivo
function probeMedia(clip) {
  return new Promise((resolve, reject) => {
    if (clip.kind === 'image') {
      const im = new Image();
      im.onload = () => { clip.w = im.naturalWidth; clip.h = im.naturalHeight; clip.el = im; clip.thumb = clip.url; resolve(clip); };
      im.onerror = () => reject(new Error('Não consegui abrir ' + clip.name));
      im.src = clip.url;
      return;
    }
    const v = document.createElement('video');
    v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto';
    let done = false;
    const fail = () => { if (!done) { done = true; reject(new Error('Não consegui abrir ' + clip.name)); } };
    v.addEventListener('error', fail);
    v.addEventListener('loadeddata', () => {
      clip.w = v.videoWidth; clip.h = v.videoHeight; clip.dur = isFinite(v.duration) ? v.duration : 0; clip.el = v; clip.tr.out = clip.dur;
      try { v.currentTime = Math.min(0.5, (clip.dur || 1) / 2); } catch { }
    });
    v.addEventListener('seeked', () => {
      if (done) return; done = true;
      try {
        const k = Math.min(240 / clip.w, 240 / clip.h), c = document.createElement('canvas');
        c.width = Math.max(2, Math.round(clip.w * k)); c.height = Math.max(2, Math.round(clip.h * k));
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        clip.thumb = c.toDataURL('image/jpeg', 0.75);
      } catch { }
      v.pause(); resolve(clip);
    });
    setTimeout(fail, 8000);
    v.src = clip.url;
  });
}
// arquivo solto: com o caminho do disco (ponte do Electron) o clipe pode ser salvo na composição
export function clipFromFile(file, pathOf) {
  const isVid = /^video\//.test(file.type) || isVideoName(file.name), isImg = /^image\//.test(file.type) || isImageName(file.name);
  if (!isVid && !isImg) return Promise.reject(new Error('Solte vídeo ou imagem'));
  const path = pathOf ? (pathOf(file) || '') : '';
  const clip = base(isVid ? 'video' : 'image', file.name);
  clip.path = path; clip.url = path ? mediaUrl(path) : URL.createObjectURL(file);
  if (isAnimName(file.name)) return withGif(clip);
  return probeMedia(clip);
}
export function clipFromPath(path, name, desktop) {
  name = name || path.split(/[\\/]/).pop();
  if (!isVideoName(name) && !isImageName(name)) return Promise.reject(new Error('Não é vídeo nem imagem: ' + name));
  const clip = base(isVideoName(name) ? 'video' : 'image', name);
  clip.path = path; clip.url = mediaUrl(path);
  if (clip.kind === 'video' && isPrepared(name) && typeof VideoDecoder !== 'undefined') return withPlayer(clip, desktop);
  if (isAnimName(name)) return withGif(clip);
  return probeMedia(clip);
}
// GIF (WebP, AVIF) animado: toca como vídeo pelo ImageDecoder; com um quadro só fica imagem
async function withGif(clip) {
  let pl;
  try { pl = await new GifPlayer(clip.url).load(); } catch { return probeMedia(clip); }
  if (pl.frames <= 1) { pl.close(); return probeMedia(clip); }
  clip.kind = 'video'; clip.player = pl; clip.w = pl.w; clip.h = pl.h; clip.dur = pl.duration; clip.tr.out = clip.dur; clip.thumb = pl.thumb(); clip.anim = true; clip.el = null;
  return clip;
}
async function withPlayer(clip, desktop) {
  const pl = new FramePlayer(clip.path, desktop, clip.url);
  await pl.load();
  clip.player = pl; clip.w = pl.w; clip.h = pl.h; clip.dur = pl.duration; clip.tr.out = clip.dur; clip.thumb = pl.thumb(); clip.prepared = true;
  const a = document.createElement('video'); a.muted = true; a.playsInline = true; a.preload = 'auto'; a.src = clip.url; a.style.display = 'none'; pl.audio = a; clip.el = a;
  return clip;
}
// o que toca de verdade: o reprodutor próprio, se houver, senão o <video>
export const mediaOf = (c) => c.player || c.el;
// modos de reprodução e "ao voltar" (playmode e playmodeaway do Resolume)
export const PLAY_MODES = [['loop', 'Loop'], ['bounce', 'Vai e volta'], ['random', 'Aleatório'], ['onceclear', 'Uma vez e limpa'], ['once', 'Uma vez e segura']];
export const AWAY_MODES = [['restart', 'Recomeça'], ['continue', 'Continua'], ['relative', 'Relativo']];
export function sourceClip(id) {
  const def = sourceById(id); if (!def) return null;
  const c = base('source', def.name); c.source = id; c.params = {}; for (const p of def.params) c.params[p.key] = p.def;
  c.w = 1920; c.h = 1080; c.fit = 'stretch'; c.seed = Math.random() * 100; c.thumb = ''; return c;
}
// texto: desenhado num canvas 2D que vira textura
export function textClip(text) {
  const c = base('text', text || 'Texto'); c.text = { content: text || 'TEXTO', font: 'Segoe UI', size: 160, bold: true, hue: 0, sat: 0, val: 1, align: 'center', x: 0, y: 0 };
  c.w = 1920; c.h = 1080; c.fit = 'stretch'; c.el = document.createElement('canvas'); c.el.width = 1920; c.el.height = 1080; renderText(c); return c;
}
export function renderText(c) {
  const t = c.text, cv = c.el, ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.font = (t.bold ? 'bold ' : '') + t.size + 'px "' + t.font + '", sans-serif'; ctx.textAlign = t.align; ctx.textBaseline = 'middle';
  ctx.fillStyle = hsvCss(t.hue, t.sat, t.val);
  const lines = String(t.content).split('\n'), lh = t.size * 1.15, x = t.align === 'left' ? 80 : t.align === 'right' ? cv.width - 80 : cv.width / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, x + t.x * cv.width / 2, cv.height / 2 - t.y * cv.height / 2 + (i - (lines.length - 1) / 2) * lh));
  c.rev = (c.rev || 0) + 1; c.name = (t.content || 'Texto').split('\n')[0].slice(0, 24);
  c.thumb = cv.toDataURL('image/png');
}
export function hsvCss(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return `rgb(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0})`;
}
// câmera: um elemento de vídeo ligado ao dispositivo
export async function cameraClip(deviceId, label) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false });
  const c = base('camera', label || 'Câmera'); c.deviceId = deviceId || ''; c.stream = stream;
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = stream; await v.play().catch(() => { });
  await new Promise(r => { if (v.videoWidth) r(); else v.onloadedmetadata = r; });
  c.el = v; c.w = v.videoWidth || 1280; c.h = v.videoHeight || 720;
  try { const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * c.h / c.w); cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); c.thumb = cv.toDataURL('image/jpeg', 0.7); } catch { }
  return c;
}
// captura de tela, janela ou página web: um vídeo ligado ao stream de captura do Chromium (como a câmera).
// spec: { srcId, name } (tela ou janela da lista) ou { url, w, h } (página renderizada numa janela escondida do programa)
const webUse = new Map();   // chave da página -> quantos clipes a usam (cópias compartilham a janela)
let webSeq = 0;
const pageName = (url) => 'Página: ' + url.replace(/^https?:\/\//, '').slice(0, 40);
export async function captureClip(spec) {
  const D = window.projDesktop;
  if (!D || !D.capture) throw new Error('captura só na versão de computador');
  const cap = { srcId: spec.srcId || '', srcName: spec.name || '', url: spec.url || '', w: spec.w || 1920, h: spec.h || 1080, key: spec.key || '', youtube: spec.youtube || '' };
  let id = cap.srcId;
  if (cap.url) { cap.key = cap.key || ('web' + (++webSeq) + '-' + Date.now()); id = await D.capture.webOpen(cap.key, cap.url, cap.w, cap.h); webUse.set(cap.key, (webUse.get(cap.key) || 0) + 1); }
  else if (!id) {   // tela/janela guardada numa composição: o id muda a cada sessão, acha pelo nome
    const list = await D.capture.sources(); const s = list.find(x => x.name === cap.srcName) || list.find(x => x.kind === 'screen');
    if (!s) throw new Error('não achei a tela ou janela "' + cap.srcName + '"'); id = cap.srcId = s.id;
  }
  // o processo principal entrega a fonte escolhida ao getDisplayMedia (setDisplayMediaRequestHandler)
  await D.capture.pick(cap.url ? { key: cap.key } : { srcId: id });
  const stream = await navigator.mediaDevices.getDisplayMedia({ audio: false, video: { frameRate: { ideal: 60 }, width: { max: 3840 }, height: { max: 2160 } } });
  const c = base('capture', cap.url ? pageName(cap.url) : cap.srcName || 'Captura'); c.cap = cap; c.stream = stream;
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = stream; await v.play().catch(() => { });
  await new Promise((r, j) => { if (v.videoWidth) return r(); v.onloadedmetadata = r; setTimeout(() => j(new Error('a captura não mandou imagem em 10 s')), 10000); });
  c.el = v; c.w = v.videoWidth || cap.w; c.h = v.videoHeight || cap.h;
  try { const cv = document.createElement('canvas'); cv.width = 160; cv.height = Math.round(160 * c.h / c.w); cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height); c.thumb = cv.toDataURL('image/jpeg', 0.7); } catch { }
  return c;
}
// troca o endereço de uma página capturada (a janela escondida é a mesma; o stream segue)
export function captureNavigate(c, url) { const D = window.projDesktop; if (c.kind !== 'capture' || !c.cap.url || !D) return; c.cap.url = url; c.name = pageName(url); D.capture.webOpen(c.cap.key, url, c.cap.w, c.cap.h); }
// o clipe saiu da grade: a última cópia de uma página fecha a janela escondida
export function freeClip(c) { const D = window.projDesktop; if (!c || c.kind !== 'capture' || !c.cap.key || !D) return; const n = (webUse.get(c.cap.key) || 1) - 1; if (n <= 0) { webUse.delete(c.cap.key); D.capture.webClose(c.cap.key); } else webUse.set(c.cap.key, n); }
// espelho do laser: o que o LaserCube desenha aparece na projeção, num quadrado do tamanho do palco do laser
export function laserMirrorClip() {
  const c = base('lasermirror', 'Laser (espelho)'); c.el = document.createElement('canvas'); c.el.width = c.el.height = 1080; c.w = c.h = 1080; c.fit = 'contain';
  c.thumb = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 26"><circle cx="17" cy="13" r="9" fill="none" stroke="#6fe6c6" stroke-width="1.5"/><path d="M8 13h18" stroke="#ff4dd2" stroke-width="1.5"/></svg>');
  return c;
}
export function laserClip(frame, thumbSvg) {
  const c = base('laser', frame.name); c.laserId = frame.id; c.thumb = 'data:image/svg+xml;utf8,' + encodeURIComponent(thumbSvg); return c;
}
// cópia para outra casa: mesma mídia, elemento de vídeo próprio (cada casa toca por conta)
export function cloneClip(c) {
  const n = { ...c, id: seq++, fx: (c.fx || []).map(f => cloneFx(f)), transform: { ...c.transform } };
  if (c.kind === 'video' && c.anim) n.player = c.player.clone();
  else if (c.kind === 'video') { const v = document.createElement('video'); v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto'; v.src = c.url; v.playbackRate = c.speed; n.el = v; if (c.player) { n.player = new FramePlayer(c.path, c.player.desktop, c.url); n.player.config = c.player.config; n.player.samples = c.player.samples; n.player.allIntra = c.player.allIntra; Object.assign(n.player, { w: c.player.w, h: c.player.h, duration: c.player.duration, fps: c.player.fps, codec: c.player.codec }); n.player.newDecoder(); n.player.ready = true; n.player.audio = v; n.player.want(); } }
  n.tr = { ...c.tr }; n.audio = { ...c.audio };
  if (c.kind === 'source') { n.params = { ...c.params }; n.seed = Math.random() * 100; }
  if (c.kind === 'text') { n.text = { ...c.text }; n.el = document.createElement('canvas'); n.el.width = 1920; n.el.height = 1080; renderText(n); }
  if (c.kind === 'camera' || c.kind === 'capture') { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = c.stream; v.play().catch(() => { }); n.el = v; if (c.cap) { n.cap = { ...c.cap }; if (c.cap.key) webUse.set(c.cap.key, (webUse.get(c.cap.key) || 0) + 1); } }
  if (c.kind === 'lasermirror') { n.el = document.createElement('canvas'); n.el.width = n.el.height = 1080; }
  n.ap = { ...c.ap }; n.panim = JSON.parse(JSON.stringify(c.panim || {})); n.afx = (c.afx || []).map(f => ({ ...f, params: { ...f.params } })); n.srcNode = n.gainNode = n.panNode = null; n.afxNodes = [];
  return n;
}
// guarda onde parou: "Continue" (ao voltar) retoma daí
export function stopClip(c) { if (c && c.kind === 'video') { const v = mediaOf(c); if (v) c.tr.last = v.currentTime; if (c.player) c.player.pause(); if (c.el) c.el.pause(); } }
// at: segundo de onde começar (o "ao voltar" Continue/Relative); sem ele, começa da entrada (ou da saída, tocando para trás)
export function startClip(c, speedMul = 1, at = null) {
  if (c && c.kind === 'video' && mediaOf(c)) {
    const t = c.tr, v = mediaOf(c); t.playing = true;
    try { v.currentTime = at != null ? Math.max(t.in, Math.min(t.out || c.dur, at)) : t.dir < 0 ? (t.out || c.dur) : t.in; } catch { }
    applyAudio(c); setRate(c, speedMul);
    if (t.dir > 0) v.play().catch(() => { }); else v.pause();   // para trás: o laço anda o tempo na mão
  }
  if (c) c.startedAt = performance.now() / 1000;
}
export function setRate(c, speedMul = 1) { const v = mediaOf(c); if (v && c.kind === 'video') { try { v.playbackRate = Math.max(0.0625, Math.min(16, c.speed * speedMul)); } catch { } if (c.player && c.el) { try { c.el.playbackRate = Math.max(0.0625, Math.min(16, c.speed * speedMul)); } catch { } } } }
// tocar/pausar/direção pelo painel
export function playClip(c, dir, speedMul = 1) {
  const t = c.tr, v = mediaOf(c); t.dir = dir; t.playing = true;
  if (dir > 0) { setRate(c, speedMul); v.play().catch(() => { }); } else v.pause();
}
export function pauseClip(c) { c.tr.playing = false; mediaOf(c).pause(); }
export function seekClip(c, s) { try { mediaOf(c).currentTime = Math.max(0, Math.min(c.dur || 0, s)); } catch { } }
// áudio: volume, pan e mudo (pan por WebAudio, ligado só quando sai do centro)
let actx = null;
export function applyAudio(c) {
  const el = c.el, a = c.audio; if (!el || c.kind !== 'video') return;
  if (audioEngine) { audioEngine.attach(c); if (c.gainNode) { audioEngine.apply(c); return; } }
  el.muted = !!a.mute; el.volume = Math.max(0, Math.min(1, a.vol));
}
export function rebuildAudioFx(c) { if (audioEngine && c.srcNode) audioEngine.rebuild(c); }
export function updateAudioFx(c, f) { if (audioEngine && c.srcNode) audioEngine.updateFx(c, f); }
// o relógio de BPM (app.js) para o modo BPM Sync
let clock = null;
export const setBeatClock = (b) => { clock = b; };
// laço: aplica entrada/saída, modo e direção a um clipe de vídeo no ar
export function tickTransport(c, dt, speedMul = 1) {
  const el = mediaOf(c), t = c.tr; if (!el || c.kind !== 'video' || !c.dur) return false;
  if (c.player) c.player.advance(dt, t.playing && t.dir < 0);
  const inP = Math.max(0, Math.min(t.in, c.dur)), outP = Math.max(inP + 0.05, Math.min(t.out || c.dur, c.dur));
  if (!t.playing) return false;
  if (t.sync === 'bpm' && clock && t.dir > 0) {
    // BPM Sync: a faixa entre entrada e saída dura N batidas, presa à batida geral (o "hard sync" do Resolume)
    if (!clock.running) { if (!el.paused) el.pause(); return false; }
    const beats = t.beats || 8, cycle = beats * 60 / (clock.bpm * (1 + (clock.nudge || 0) / 100)), range = outP - inP;
    const rate = Math.max(0.0625, Math.min(16, range / cycle));
    try { if (Math.abs(el.playbackRate - rate) > 0.001) el.playbackRate = rate; if (c.player && c.el && c.el !== el) c.el.playbackRate = rate; } catch { }
    const target = inP + ((clock.beat / beats) % 1) * range;
    if (Math.abs(el.currentTime - target) > 0.12) seekClip(c, target);
    if (el.paused) el.play().catch(() => { });
    return false;
  }
  let pos = el.currentTime, ended = false;
  if (t.dir < 0) { pos -= dt * c.speed * speedMul; try { el.currentTime = Math.max(inP, pos); } catch { } }
  if (t.dir > 0 && (pos >= outP - 0.02 || el.ended)) {
    if (t.mode === 'loop') seekClip(c, inP);
    else if (t.mode === 'bounce') { t.dir = -1; el.pause(); seekClip(c, outP - 0.02); }
    else if (t.mode === 'random') seekClip(c, inP + Math.random() * (outP - inP) * 0.9);
    else { t.playing = false; el.pause(); seekClip(c, outP - 0.02); ended = true; }   // Play Once & Hold segura o último quadro; & Clear: quem chama tira a camada do ar
    if (t.dir > 0 && t.playing && el.paused) el.play().catch(() => { });
  } else if (t.dir < 0 && pos <= inP + 0.02) {
    if (t.mode === 'loop') seekClip(c, outP - 0.02);
    else if (t.mode === 'bounce') { t.dir = 1; seekClip(c, inP); el.play().catch(() => { }); }
    else if (t.mode === 'random') seekClip(c, inP + Math.random() * (outP - inP) * 0.9);
    else { t.playing = false; seekClip(c, inP); ended = true; }
  }
  return ended;
}
export function releaseClip(c) { if (!c) return; stopClip(c); if (c.kind === 'camera' && c.stream) { /* o stream é compartilhado pelas cópias; fica aberto */ } }
// o que vai para o arquivo da composição
export function serializeClip(c) {
  if (!c) return null;
  const o = { kind: c.kind, name: c.name, fit: c.fit, speed: c.speed, fx: c.fx, transform: c.transform, ap: c.ap, tr: { in: c.tr.in, out: c.tr.out, mode: c.tr.mode, dir: c.tr.dir, sync: c.tr.sync, beats: c.tr.beats, away: c.tr.away }, audio: c.audio, panim: c.panim || {}, afx: c.afx || [], blend: c.blend, opacity: c.opacity, trig: c.trig, ignoreColumn: c.ignoreColumn };
  if (c.kind === 'video' || c.kind === 'image') { if (!c.path) return { ...o, missing: true }; o.path = c.path; }
  if (c.kind === 'source') { o.source = c.source; o.params = c.params; }
  if (c.kind === 'text') o.text = c.text;
  if (c.kind === 'camera') { o.deviceId = c.deviceId; }
  if (c.kind === 'capture') o.cap = { srcName: c.cap.srcName, url: c.cap.url, w: c.cap.w, h: c.cap.h, youtube: c.cap.youtube || undefined };
  if (c.kind === 'laser') o.laserId = c.laserId;
  return o;
}
export async function deserializeClip(o, ctx) {
  if (!o) return null;
  let c = null;
  try {
    if (o.kind === 'video' || o.kind === 'image') { if (!o.path) return null; c = await clipFromPath(o.path, o.name); }
    else if (o.kind === 'source') c = sourceClip(o.source);
    else if (o.kind === 'text') c = textClip(o.text && o.text.content);
    else if (o.kind === 'camera') { c = await cameraClip(o.deviceId, o.name); }
    else if (o.kind === 'capture') {
      let url = o.cap && o.cap.url, yt = o.cap && o.cap.youtube;
      if (yt) { const D = window.projDesktop; const port = D && D.localPort ? await D.localPort() : 0; url = 'http://127.0.0.1:' + port + '/yt.html?v=' + yt; }   // a porta do servidor local muda a cada abertura
      c = await captureClip({ name: o.cap && o.cap.srcName, url, w: o.cap && o.cap.w, h: o.cap && o.cap.h, youtube: yt }); if (yt) c.name = 'YouTube ' + yt;
    }
    else if (o.kind === 'laser' && ctx && ctx.laserClip) { c = ctx.laserClip(o.laserId); }
    else if (o.kind === 'lasermirror') c = laserMirrorClip();
  } catch (e) { if (ctx && ctx.toast) ctx.toast('Não abriu ' + o.name + ': ' + e.message); return null; }
  if (!c) return null;
  return applyClipProps(c, o);
}
// põe num clipe vivo o que foi salvo dele (nome, ajuste, efeitos, transporte, parâmetros…): ao abrir a composição e ao desfazer
export function applyClipProps(c, o) {
  if (o.kind === 'source' && c.params) Object.assign(c.params, o.params || {});
  if (o.kind === 'text' && c.text) { Object.assign(c.text, o.text || {}); renderText(c); }
  c.name = o.name || c.name; c.fit = o.fit || c.fit; c.speed = o.speed || 1; c.panim = JSON.parse(JSON.stringify(o.panim || {})); c.afx = (o.afx || []).map(f => ({ ...f, params: { ...f.params } })); c.fx = (o.fx || []).map(f => cloneFx(f)); c.transform = Object.assign(IDENT_TR(), o.transform || {}); c.ap = Object.assign({ mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5 }, o.ap || {});
  if (o.tr) Object.assign(c.tr, o.tr, { playing: true }); if (!c.tr.out) c.tr.out = c.dur; Object.assign(c.audio, o.audio || {}); c.blend = o.blend || ''; c.opacity = o.opacity ?? 1; c.trig = o.trig || 'normal'; c.ignoreColumn = !!o.ignoreColumn;
  return c;
}
