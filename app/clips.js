// Clipes: o que cabe numa casa da grade. Arquivo (vídeo ou imagem, por caminho do disco ou
// arquivo solto), fonte gerada (shader), texto, câmera e quadro do laser.
import { IDENT_TR } from './engine.js';
import { sourceById } from './sources.js';
import { FramePlayer, GifPlayer, isPrepared, isAnimName } from './player.js';

let seq = 1;
export const nextId = () => seq++;
// ap: para onde o clipe manda quando acaba — 'layer' segue o autopilot da camada; 'next', 'prev', 'random', 'stop' ou 'cell' (camada l, coluna c)
// tr: transporte — in/out em segundos, modo loop|bounce|once|random, dir 1|-1, playing; audio: volume, pan, mudo;
// blend: mistura do clipe ('' = a da camada); opacity; trig: normal|piano|toggle; ignoreColumn
const base = (kind, name) => ({ id: seq++, name, kind, url: '', path: '', w: 0, h: 0, dur: 0, fit: 'contain', speed: 1, thumb: '', el: null, fx: [], transform: IDENT_TR(),
  ap: { mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5 }, tr: { in: 0, out: 0, mode: 'loop', dir: 1, playing: true }, audio: { vol: 1, pan: 0, mute: false },
  blend: '', opacity: 1, trig: 'normal', ignoreColumn: false, rev: 1 });
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
  const n = { ...c, id: seq++, fx: (c.fx || []).map(f => ({ ...f, params: { ...f.params } })), transform: { ...c.transform } };
  if (c.kind === 'video' && c.anim) n.player = c.player.clone();
  else if (c.kind === 'video') { const v = document.createElement('video'); v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto'; v.src = c.url; v.playbackRate = c.speed; n.el = v; if (c.player) { n.player = new FramePlayer(c.path, null, c.url); n.player.config = c.player.config; n.player.samples = c.player.samples; n.player.allIntra = c.player.allIntra; Object.assign(n.player, { w: c.player.w, h: c.player.h, duration: c.player.duration, fps: c.player.fps, codec: c.player.codec }); n.player.newDecoder(); n.player.ready = true; n.player.audio = v; n.player.want(); } }
  n.tr = { ...c.tr }; n.audio = { ...c.audio };
  if (c.kind === 'source') { n.params = { ...c.params }; n.seed = Math.random() * 100; }
  if (c.kind === 'text') { n.text = { ...c.text }; n.el = document.createElement('canvas'); n.el.width = 1920; n.el.height = 1080; renderText(n); }
  if (c.kind === 'camera') { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = c.stream; v.play().catch(() => { }); n.el = v; }
  if (c.kind === 'lasermirror') { n.el = document.createElement('canvas'); n.el.width = n.el.height = 1080; }
  n.ap = { ...c.ap };
  return n;
}
export function stopClip(c) { if (c && c.kind === 'video') { if (c.player) c.player.pause(); if (c.el) c.el.pause(); } }
export function startClip(c, speedMul = 1) {
  if (c && c.kind === 'video' && mediaOf(c)) {
    const t = c.tr, v = mediaOf(c); t.playing = true;
    try { v.currentTime = t.dir < 0 ? (t.out || c.dur) : t.in; } catch { }
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
  el.muted = !!a.mute; el.volume = Math.max(0, Math.min(1, a.vol));
  if (a.pan !== 0 || c.panNode) {
    try {
      if (!actx) actx = new AudioContext();
      if (!c.panNode) { c.srcNode = actx.createMediaElementSource(el); c.panNode = actx.createStereoPanner(); c.srcNode.connect(c.panNode); c.panNode.connect(actx.destination); }
      c.panNode.pan.value = Math.max(-1, Math.min(1, a.pan));
      if (actx.state === 'suspended') actx.resume().catch(() => { });
    } catch { }
  }
}
// laço: aplica entrada/saída, modo e direção a um clipe de vídeo no ar
export function tickTransport(c, dt, speedMul = 1) {
  const el = mediaOf(c), t = c.tr; if (!el || c.kind !== 'video' || !c.dur) return false;
  if (c.player) c.player.advance(dt, t.playing && t.dir < 0);
  const inP = Math.max(0, Math.min(t.in, c.dur)), outP = Math.max(inP + 0.05, Math.min(t.out || c.dur, c.dur));
  if (!t.playing) return false;
  let pos = el.currentTime, ended = false;
  if (t.dir < 0) { pos -= dt * c.speed * speedMul; try { el.currentTime = Math.max(inP, pos); } catch { } }
  if (t.dir > 0 && (pos >= outP - 0.02 || el.ended)) {
    if (t.mode === 'loop') seekClip(c, inP);
    else if (t.mode === 'bounce') { t.dir = -1; el.pause(); seekClip(c, outP - 0.02); }
    else if (t.mode === 'random') seekClip(c, inP + Math.random() * (outP - inP) * 0.9);
    else { t.playing = false; el.pause(); seekClip(c, outP - 0.02); ended = true; }
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
  const o = { kind: c.kind, name: c.name, fit: c.fit, speed: c.speed, fx: c.fx, transform: c.transform, ap: c.ap, tr: { in: c.tr.in, out: c.tr.out, mode: c.tr.mode, dir: c.tr.dir }, audio: c.audio, blend: c.blend, opacity: c.opacity, trig: c.trig, ignoreColumn: c.ignoreColumn };
  if (c.kind === 'video' || c.kind === 'image') { if (!c.path) return { ...o, missing: true }; o.path = c.path; }
  if (c.kind === 'source') { o.source = c.source; o.params = c.params; }
  if (c.kind === 'text') o.text = c.text;
  if (c.kind === 'camera') { o.deviceId = c.deviceId; }
  if (c.kind === 'laser') o.laserId = c.laserId;
  return o;
}
export async function deserializeClip(o, ctx) {
  if (!o) return null;
  let c = null;
  try {
    if (o.kind === 'video' || o.kind === 'image') { if (!o.path) return null; c = await clipFromPath(o.path, o.name); }
    else if (o.kind === 'source') { c = sourceClip(o.source); if (c) Object.assign(c.params, o.params || {}); }
    else if (o.kind === 'text') { c = textClip(o.text && o.text.content); Object.assign(c.text, o.text || {}); renderText(c); }
    else if (o.kind === 'camera') { c = await cameraClip(o.deviceId, o.name); }
    else if (o.kind === 'laser' && ctx && ctx.laserClip) { c = ctx.laserClip(o.laserId); }
    else if (o.kind === 'lasermirror') c = laserMirrorClip();
  } catch (e) { if (ctx && ctx.toast) ctx.toast('Não abriu ' + o.name + ': ' + e.message); return null; }
  if (!c) return null;
  c.name = o.name || c.name; c.fit = o.fit || c.fit; c.speed = o.speed || 1; c.fx = (o.fx || []).map(f => ({ ...f, params: { ...f.params } })); c.transform = Object.assign(IDENT_TR(), o.transform || {}); c.ap = Object.assign({ mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5 }, o.ap || {});
  if (o.tr) Object.assign(c.tr, o.tr, { playing: true }); if (!c.tr.out) c.tr.out = c.dur; Object.assign(c.audio, o.audio || {}); c.blend = o.blend || ''; c.opacity = o.opacity ?? 1; c.trig = o.trig || 'normal'; c.ignoreColumn = !!o.ignoreColumn;
  return c;
}
