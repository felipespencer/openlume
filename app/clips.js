// Clipes: o que cabe numa casa da grade. Arquivo (vídeo ou imagem, por caminho do disco ou
// arquivo solto), fonte gerada (shader), texto, câmera e quadro do laser.
import { IDENT_TR } from './engine.js';
import { sourceById } from './sources.js';

let seq = 1;
export const nextId = () => seq++;
// ap: para onde o clipe manda quando acaba — 'layer' segue o autopilot da camada; 'next', 'prev', 'random', 'stop' ou 'cell' (camada l, coluna c)
const base = (kind, name) => ({ id: seq++, name, kind, url: '', path: '', w: 0, h: 0, dur: 0, fit: 'contain', speed: 1, thumb: '', el: null, fx: [], transform: IDENT_TR(), ap: { mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5 }, rev: 1 });
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
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    let done = false;
    const fail = () => { if (!done) { done = true; reject(new Error('Não consegui abrir ' + clip.name)); } };
    v.addEventListener('error', fail);
    v.addEventListener('loadeddata', () => {
      clip.w = v.videoWidth; clip.h = v.videoHeight; clip.dur = isFinite(v.duration) ? v.duration : 0; clip.el = v;
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
  return probeMedia(clip);
}
export function clipFromPath(path, name) {
  name = name || path.split(/[\\/]/).pop();
  if (!isVideoName(name) && !isImageName(name)) return Promise.reject(new Error('Não é vídeo nem imagem: ' + name));
  const clip = base(isVideoName(name) ? 'video' : 'image', name);
  clip.path = path; clip.url = mediaUrl(path);
  return probeMedia(clip);
}
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
  if (c.kind === 'video') { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = c.url; v.playbackRate = c.speed; n.el = v; }
  if (c.kind === 'source') { n.params = { ...c.params }; n.seed = Math.random() * 100; }
  if (c.kind === 'text') { n.text = { ...c.text }; n.el = document.createElement('canvas'); n.el.width = 1920; n.el.height = 1080; renderText(n); }
  if (c.kind === 'camera') { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = c.stream; v.play().catch(() => { }); n.el = v; }
  if (c.kind === 'lasermirror') { n.el = document.createElement('canvas'); n.el.width = n.el.height = 1080; }
  n.ap = { ...c.ap };
  return n;
}
export function stopClip(c) { if (c && c.kind === 'video' && c.el) c.el.pause(); }
export function startClip(c, speedMul = 1) { if (c && c.kind === 'video' && c.el) { try { c.el.currentTime = 0; } catch { } c.el.playbackRate = c.speed * speedMul; c.el.play().catch(() => { }); } if (c) c.startedAt = performance.now() / 1000; }
export function releaseClip(c) { if (!c) return; stopClip(c); if (c.kind === 'camera' && c.stream) { /* o stream é compartilhado pelas cópias; fica aberto */ } }
// o que vai para o arquivo da composição
export function serializeClip(c) {
  if (!c) return null;
  const o = { kind: c.kind, name: c.name, fit: c.fit, speed: c.speed, fx: c.fx, transform: c.transform, ap: c.ap };
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
  return c;
}
