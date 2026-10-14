// Projecionista — janela de controle.
// Estado: uma composição com camadas; cada camada tem uma casa por coluna e mostra um clipe
// por vez. Regras de uso (definidas pelo usuário em 2026-10-13):
//   - clicar na miniatura dispara o clipe; clicar no nome (rodapé) só seleciona e mostra a prévia;
//   - clicar numa casa vazia não abre nada: a camada fica preta;
//   - coluna dispara todas as camadas; a que não tem clipe naquela coluna fica preta;
//   - arquivo solto numa casa vira clipe guardado, sem ir para o ar;
//   - abrir o programa começa sempre do zero.
import { Engine, IDENT_TR } from './engine.js';
import * as M from './screens.js';
import * as C from './clips.js';
import { AdvancedOutput } from './ao.js';
import { LaserModule } from './laser.js';
import { Panels } from './panels.js';
import { Browser } from './browser.js';
import { Recorder } from './record.js';
import { mkFx } from './effects.js';
import { AUTOPILOT, serializeComposition, deserializeComposition, SETTINGS } from './composition.js';
import { Menubar, openDialog, askText, confirmBox, installShortcuts, shortcutsDialog } from './menus.js';
import { initSplitters } from './splitters.js';
import { paintScan } from './laser-model.js';

let COLS = 8; const COMP_W = 1920, COMP_H = 1080;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const D = window.projDesktop || null;

let seq = 1;
const mkLayer = (n) => ({ id: seq++, name: typeof n === 'string' ? n : 'Camada ' + n, opacity: 1, blend: 'normal', bypass: false, on: -1, clips: Array(COLS).fill(null), autopilot: AUTOPILOT(), fx: [], transform: IDENT_TR(), transition: 0, prev: null });
const state = { name: '', layers: [mkLayer(3), mkLayer(2), mkLayer(1)], selLayer: 0, sel: null, master: 1, opacity: 1, speed: 1, compAutopilot: AUTOPILOT(), settings: SETTINGS(), colNames: {} };   // layers[0] = a de cima
let drag = null;

// o motor desenha num canvas escondido; o monitor da composição é um canvas 2D que recebe a cópia
const engine = new Engine(COMP_W, COMP_H);
engine.compTransform = IDENT_TR();
const monCanvas = document.createElement('canvas'); monCanvas.width = COMP_W; monCanvas.height = COMP_H;
$('outScr').appendChild(monCanvas);
const monCtx = monCanvas.getContext('2d');
$('compInfo').textContent = COMP_W + '×' + COMP_H;

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }

// ---------- clipes na grade ----------
function putClip(li, col, clip) {
  if (clip && clip.trig === 'normal' && state.settings.trig !== 'normal') clip.trig = state.settings.trig;
  const L = state.layers[li], old = L.clips[col];
  if (old) { if (L.on === col) { C.stopClip(old); L.on = -1; } dropClip(old); }
  L.clips[col] = clip; state.sel = { l: li, c: col }; render();
}
async function putFiles(li, col, files) {
  const L = state.layers[li]; let ok = 0;
  for (let i = 0; i < files.length && col + i < COLS; i++) {
    try { putClip(li, col + i, await C.clipFromFile(files[i], D ? D.pathOf : null)); ok++; } catch (e) { toast(e.message); }
  }
  return ok;
}
async function putPath(li, col, path, name) { try { putClip(li, col, await C.clipFromPath(path, name, D)); return true; } catch (e) { toast(e.message); return false; } }
// preparar: converte o arquivo (H.264 todo intra ou DXV) e troca o clipe no lugar, mantendo os ajustes
const preparingNow = new Map();
if (D) D.media.onProgress(({ src, f }) => { preparingNow.set(src, f); if (panels) panels.render(); if (browser && browser.tab === 'files') browser.render(); });
async function prepareFile(path, fmt = 'h264') {
  if (!D || preparingNow.has(path)) return;
  preparingNow.set(path, 0); browser.render();
  try { const r = await D.media.prepare(path, fmt); toast('Preparado: ' + r.path.split(/[\\/]/).pop() + ' (' + (r.size / 1e6).toFixed(0) + ' MB)'); browser.listing = null; }
  catch (e) { toast('Não consegui preparar: ' + e.message); }
  preparingNow.delete(path); browser.render();
}
async function prepareClip(li, col, fmt) {
  const L = state.layers[li], c = L.clips[col]; if (!c || !c.path || !D) return;
  preparingNow.set(c.path, 0); panels.render();
  try {
    const r = await D.media.prepare(c.path, fmt);
    const n = await C.clipFromPath(r.path, undefined, D);
    n.fx = c.fx; n.transform = c.transform; n.ap = c.ap; n.audio = c.audio; n.blend = c.blend; n.opacity = c.opacity; n.trig = c.trig; n.ignoreColumn = c.ignoreColumn; n.fit = c.fit; n.speed = c.speed; n.tr = { ...c.tr, out: Math.min(c.tr.out || n.dur, n.dur) }; n.name = c.name.replace(/\.[^.]+$/, '') + (fmt === 'dxv' ? '.proj.mov' : '.proj.mp4');
    const wasOn = L.on === col; if (wasOn) { C.stopClip(c); L.on = -1; }
    dropClip(c); L.clips[col] = n; if (wasOn) { L.on = col; C.startClip(n, state.speed); }
    toast('Preparado: ' + n.name + ' (' + (r.size / 1e6).toFixed(0) + ' MB)');
  } catch (e) { toast('Não consegui preparar: ' + e.message); }
  preparingNow.delete(c.path); render();
}
function putSource(li, col, id) { const c = C.sourceClip(id); if (c) putClip(li, col, c); return c; }
function putText(li, col, text) { const c = C.textClip(text); putClip(li, col, c); return c; }
async function putCamera(li, col, cam) { try { putClip(li, col, await C.cameraClip(cam.id, cam.label)); } catch (e) { toast('Câmera: ' + e.message); } }
const dropClip = (c) => { engine.drop(c.id); if (c.player) { c.player.close(); c.player = null; } };
function putLaserClip(li, col, frame) { putClip(li, col, C.laserClip(frame, laser.thumbSvg(frame))); }
// soltar qualquer coisa numa casa
function dropInto(li, col, d, files, ctrl) {
  if (files && files.length) return putFiles(li, col, files);
  if (!d) return;
  if (d.path) return putPath(li, col, d.path, d.name);
  if (d.source) return putSource(li, col, d.source);
  if (d.text) return putText(li, col, 'TEXTO');
  if (d.lasermirror) return putClip(li, col, C.laserMirrorClip());
  if (d.camera) return putCamera(li, col, d.camera);
  if (d.laser) return putLaserClip(li, col, d.laser);
  if (d.effect) { const c = state.layers[li].clips[col]; if (c) { c.fx.push(mkFx(d.effect)); render(); } return; }
  if (d.l != null) return moveClip(d.l, d.c, li, col, ctrl);
}
// o quadro do laser segue a grade: o clipe de laser no ar (o mais de cima) é o que vai para o LaserCube
function syncLaser() {
  const on = state.layers.find(L => L.on >= 0 && L.clips[L.on] && L.clips[L.on].kind === 'laser' && !L.bypass);
  const frame = on ? laser.byId(on.clips[on.on].laserId) : null;
  if (frame) { if (laser.active !== frame) laser.setActive(frame); laser.activeFromGrid = true; }
  else if (laser.activeFromGrid) { laser.activeFromGrid = false; laser.setActive(null); }
}
function trigger(li, col) {
  const L = state.layers[li], clip = L.clips[col];
  state.selLayer = li; state.sel = { l: li, c: col };
  if (!clip) return eject(li);                 // casa vazia: a camada fica preta
  if (L.on !== col) {
    const old = L.on >= 0 ? L.clips[L.on] : null;
    if (old && L.transition > 0 && old.kind !== 'laser') L.prev = { clip: old, t0: engine.time, dur: L.transition }; else C.stopClip(old);
    L.on = col; C.startClip(clip, state.speed);
  }
  else if (clip.kind === 'video' && clip.el.paused) clip.el.play().catch(() => { });
  L.bypass = false;                            // disparar põe a camada no ar
  recorder.onTrigger();
  render();
}
function eject(li) { const L = state.layers[li]; C.stopClip(L.clips[L.on]); L.on = -1; L.prev = null; render(); }
function triggerColumn(col) {
  state.layers.forEach((L, li) => {
    if (L.ignoreColumn || (L.clips[col] && L.clips[col].ignoreColumn)) return;   // a camada ou a casa ignora o disparo de coluna
    if (L.clips[col]) { if (L.on !== col) { const old = L.on >= 0 ? L.clips[L.on] : null; if (old && L.transition > 0) L.prev = { clip: old, t0: engine.time, dur: L.transition }; else C.stopClip(old); L.on = col; C.startClip(L.clips[col], state.speed); } L.bypass = false; }
    else { C.stopClip(L.clips[L.on]); L.on = -1; L.prev = null; }
  });
  recorder.onTrigger();
  render();
}
function clearCell(li, col) {
  const L = state.layers[li], c = L.clips[col];
  if (!c) return;
  if (L.on === col) { C.stopClip(c); L.on = -1; }
  dropClip(c); L.clips[col] = null;
  if (state.sel && state.sel.l === li && state.sel.c === col) state.sel = null;
  render();
}
function moveClip(fl, fc, tl, tc, copy) {
  if (fl === tl && fc === tc) return;
  const A = state.layers[fl], B = state.layers[tl], src = A.clips[fc], dst = B.clips[tc];
  if (!src) return;
  if (copy) {
    if (dst) { if (B.on === tc) { C.stopClip(dst); B.on = -1; } dropClip(dst); }
    B.clips[tc] = C.cloneClip(src);
  } else {
    const aOn = A.on === fc, bOn = B.on === tc;
    B.clips[tc] = src; A.clips[fc] = dst || null;
    if (A === B) { if (aOn) A.on = tc; else if (bOn) A.on = dst ? fc : -1; }
    else {                                     // o que estava no ar numa camada não toca na outra
      if (aOn) { C.stopClip(src); A.on = -1; }
      if (bOn) { C.stopClip(dst); B.on = -1; }
    }
  }
  state.sel = { l: tl, c: tc };
  render();
}
// ---------- menus: camadas, colunas, área de transferência ----------
function insertLayer(at, name) { state.layers.splice(at, 0, mkLayer(name || state.layers.length + 1)); if (state.sel && state.sel.l >= at) state.sel.l++; state.selLayer = at; render(); }
function duplicateLayer(li) {
  const L = state.layers[li], n = mkLayer(L.name + ' cópia');
  n.opacity = L.opacity; n.blend = L.blend; n.autopilot = { ...L.autopilot }; n.fx = L.fx.map(f => ({ ...f, params: { ...f.params } })); n.transform = { ...L.transform }; n.transition = L.transition; n.ignoreColumn = L.ignoreColumn;
  n.clips = L.clips.map(c => c ? C.cloneClip(c) : null);
  state.layers.splice(li, 0, n); if (state.sel && state.sel.l >= li) state.sel.l++; state.selLayer = li; render();
}
function clearLayer(li) { state.layers[li].clips.forEach((c, i) => { if (c) clearCell(li, i); }); }
function setCols(n) {
  n = Math.max(1, Math.min(64, n | 0));
  for (const L of state.layers) { while (L.clips.length < n) L.clips.push(null); while (L.clips.length > n) { const c = L.clips.pop(); if (c) { if (L.on === L.clips.length) { C.stopClip(c); L.on = -1; } dropClip(c); } } if (L.on >= n) L.on = -1; }
  COLS = n; if (state.sel && state.sel.c >= n) state.sel = null; render();
}
const shiftNames = (fn) => { const o = {}; for (const k in state.colNames) { const i = fn(+k); if (i >= 0) o[i] = state.colNames[k]; } state.colNames = o; };
function insertColumn(at) {
  for (const L of state.layers) { L.clips.splice(at, 0, null); if (L.on >= at) L.on++; }
  shiftNames(i => i >= at ? i + 1 : i); COLS++; if (state.sel && state.sel.c >= at) state.sel.c++; render();
}
function removeColumn(at) {
  if (COLS <= 1) return;
  for (const L of state.layers) { const c = L.clips[at]; if (c) { if (L.on === at) { C.stopClip(c); L.on = -1; } dropClip(c); } L.clips.splice(at, 1); if (L.on > at) L.on--; }
  shiftNames(i => i === at ? -1 : i > at ? i - 1 : i); COLS--;
  if (state.sel) { if (state.sel.c === at) state.sel = null; else if (state.sel.c > at) state.sel.c--; }
  render();
}
function clearColumn(at) { state.layers.forEach((L, li) => clearCell(li, at)); }
function duplicateColumn(at) { insertColumn(at + 1); for (const L of state.layers) if (L.clips[at]) L.clips[at + 1] = C.cloneClip(L.clips[at]); if (state.colNames[at]) state.colNames[at + 1] = state.colNames[at] + ' cópia'; render(); }
let clipboard = null, fxClipboard = null;
const fxCopy = (list) => list.map(f => ({ ...f, params: { ...f.params } }));
function copyClip(cut) { const s = selectedCell(); if (!s) { toast('Selecione um clipe'); return; } clipboard = C.cloneClip(s.clip); if (cut) clearCell(state.layers.indexOf(s.L), s.idx); toast(cut ? 'Clipe recortado' : 'Clipe copiado'); }
function pasteClip() {
  if (!clipboard) { toast('Nada copiado'); return; }
  const l = state.sel ? state.sel.l : state.selLayer, c = state.sel ? state.sel.c : state.layers[l].clips.findIndex(x => !x);
  putClip(l, c < 0 ? 0 : c, C.cloneClip(clipboard)); state.sel = { l, c: c < 0 ? 0 : c }; render();
}
function playAll(dir) { for (const L of state.layers) { const c = L.on >= 0 ? L.clips[L.on] : null; if (c && c.kind === 'video') { if (dir === 0) C.pauseClip(c); else C.playClip(c, dir, state.speed); } } render(); }
function stopAll() { state.layers.forEach((_, li) => eject(li)); }
// instantâneo: PNG da composição (ou do clipe selecionado) na pasta das gravações
async function snapshot(what) {
  const cv = what === 'clip' ? prevCanvas : monCanvas; if (what === 'clip' && !selectedCell()) { toast('Selecione um clipe'); return; }
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const bytes = new Uint8Array(await blob.arrayBuffer());
  const name = (what === 'clip' ? 'clipe' : 'composicao') + '-' + new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/(\d{8})/, '$1-') + '.png';
  if (!D) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); return; }
  try { const r = await D.rec.save(name, bytes, recorder.c.dir); toast('Instantâneo salvo: ' + r.path); recorder.refresh && recorder.refresh(); } catch (e) { toast('Não consegui salvar: ' + e.message); }
}
// Test Card: uma camada por cima com a fonte Test Card; o menu liga e desliga
function toggleTestCard() {
  const i = state.layers.findIndex(L => L.testCard);
  if (i >= 0) { removeLayer(i); return; }
  const L = mkLayer('Test Card'); L.testCard = true; state.layers.unshift(L); if (state.sel) state.sel.l++;
  const c = C.sourceClip('testcard'); L.clips[0] = c; L.on = 0; render();
}
function removeLayer(li) {
  const L = state.layers[li]; if (state.layers.length <= 1) return;
  L.clips.forEach(c => { if (c) { C.stopClip(c); dropClip(c); } });
  state.layers.splice(li, 1); if (state.sel) { if (state.sel.l === li) state.sel = null; else if (state.sel.l > li) state.sel.l--; } state.selLayer = Math.min(state.selLayer, state.layers.length - 1); render();
}
function applySpeed() { for (const L of state.layers) for (const c of L.clips) if (c && c.kind === 'video' && c.el) C.setRate(c, state.speed); }
// a casa selecionada (clique no nome) ou, sem seleção, o que está no ar na camada selecionada
function selectedCell() {
  let L = state.sel ? state.layers[state.sel.l] : null, idx = L ? state.sel.c : -1;
  if (!L || !L.clips[idx]) { L = state.layers[state.selLayer]; idx = L ? L.on : -1; }
  return L && idx >= 0 && L.clips[idx] ? { L, idx, clip: L.clips[idx] } : null;
}
function selectedClip() { const c = selectedCell(); return c ? c.clip : null; }
// autopilot: quando o clipe acaba, a camada passa para o próximo, o anterior ou um ao acaso
function tickAutopilot(now) {
  let anyOn = false, allEnded = true;
  for (let li = 0; li < state.layers.length; li++) {
    const L = state.layers[li]; if (L.on < 0) continue; anyOn = true;
    const clip = L.clips[L.on]; if (!clip) continue;
    // o clipe pode ter o seu próprio destino; senão vale o autopilot da camada
    const cap = clip.ap && clip.ap.mode !== 'layer' ? clip.ap : null;
    const ap = cap ? { dir: cap.mode, dur: cap.dur, secs: cap.secs, loop: true } : L.autopilot;
    const dur = ap.dur === 'fixed' ? ap.secs : (clip.kind === 'video' && clip.dur ? Math.max(0.05, ((clip.tr.out || clip.dur) - clip.tr.in)) / (clip.speed * state.speed) : ap.secs);
    const elapsed = now - (clip.startedAt || now);
    if (elapsed < dur && !(clip.kind === 'video' && clip.tr.mode === 'once' && !clip.tr.playing)) { allEnded = false; continue; }
    if (ap.dir === 'off') { if (clip.kind === 'video') allEnded = allEnded && clip.el.ended; continue; }
    if (ap.dir === 'stop') { eject(li); continue; }
    if (ap.dir === 'cell') { const tl = Math.min(cap.l, state.layers.length - 1); if (state.layers[tl].clips[cap.c]) { if (tl !== li) clip.startedAt = now; trigger(tl, cap.c); } else clip.startedAt = now; continue; }
    const idx = L.clips.map((c, i) => c ? i : -1).filter(i => i >= 0);
    if (idx.length < 2) { clip.startedAt = now; continue; }
    let next = -1;
    if (ap.dir === 'next') { next = idx.find(i => i > L.on); if (next == null) next = ap.loop ? idx[0] : -1; }
    else if (ap.dir === 'prev') { const b = idx.filter(i => i < L.on); next = b.length ? b[b.length - 1] : ap.loop ? idx[idx.length - 1] : -1; }
    else { const others = idx.filter(i => i !== L.on); next = others[Math.floor(Math.random() * others.length)]; }
    if (next >= 0) trigger(li, next); else clip.startedAt = now;
  }
  if (anyOn && allEnded) recorder.onAllEnded();
}

// ---------- grade ----------
function render() {
  const g = $('grid'); g.style.setProperty('--cols', COLS);
  const wrap = $('gridWrap'), st = wrap.scrollTop, sl = wrap.scrollLeft;
  g.textContent = '';
  const corner = el('div', 'gh corner'); corner.appendChild(el('span', '', 'Composição'));
  const add = el('button', '', '+ camada'); add.type = 'button'; add.title = 'Nova camada, por cima das outras';
  add.onclick = () => { state.layers.unshift(mkLayer(state.layers.length + 1)); state.selLayer = 0; if (state.sel) state.sel.l++; render(); };
  corner.appendChild(add); g.appendChild(corner);
  for (let c = 0; c < COLS; c++) {
    const b = el('button', 'gh col', state.colNames[c] || 'Coluna ' + (c + 1)); b.type = 'button'; b.dataset.col = c;
    const tem = state.layers.filter(L => L.clips[c]);
    if (tem.length && tem.every(L => L.on === c) && state.layers.every(L => L.clips[c] || L.on < 0)) b.classList.add('on');
    b.title = 'Dispara a coluna: camada sem clipe nela fica preta';
    b.onclick = () => triggerColumn(c);
    g.appendChild(b);
  }
  state.layers.forEach((L, li) => {
    const lh = el('div', 'lh' + (li === state.selLayer ? ' sel' : '') + (L.bypass ? ' off' : ''));
    lh.dataset.layer = li;
    const bb = el('div', 'b');
    const bx = el('button', '', 'X'); bx.type = 'button'; bx.title = 'Tirar a camada do ar';
    const bo = el('button', L.bypass ? 'act' : '', 'B'); bo.type = 'button'; bo.title = 'Desligar ou ligar a camada sem perder o clipe';
    bx.onclick = (e) => { e.stopPropagation(); eject(li); };
    bo.onclick = (e) => { e.stopPropagation(); L.bypass = !L.bypass; render(); };
    bb.append(bx, bo);
    const op = el('input'); op.type = 'range'; op.min = 0; op.max = 100; op.value = Math.round(L.opacity * 100); op.title = 'Opacidade da camada';
    op.onclick = (e) => e.stopPropagation();
    op.oninput = () => { L.opacity = op.value / 100; if (li === state.selLayer) panels.render(); };
    lh.append(bb, el('div', 'nm', L.name), op);
    lh.onclick = () => { state.selLayer = li; panels.tab = 'layer'; render(); };
    g.appendChild(lh);
    for (let c = 0; c < COLS; c++) {
      const clip = L.clips[c], sel = state.sel && state.sel.l === li && state.sel.c === c;
      const cell = el('div', 'cell ' + (clip ? 'full' : 'empty') + (clip && L.on === c ? ' on' : '') + (sel ? ' sel' : '') + (clip && clip.kind === 'laser' ? ' laser' : ''));
      cell.dataset.layer = li; cell.dataset.col = c;
      if (clip) {
        const th = el('div', 'th'); if (clip.thumb) th.style.backgroundImage = 'url("' + clip.thumb + '")'; else if (clip.kind === 'source') th.textContent = '∿';
        const nm = el('div', 'nm', clip.name);
        cell.append(th, nm);
        cell.title = clip.kind === 'laser' ? clip.name + ' · laser' : clip.name + ' · ' + clip.w + '×' + clip.h;
        cell.draggable = true;
        cell.ondragstart = (e) => { drag = { l: li, c }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', 'clip'); };
        cell.ondragend = () => { drag = null; };
        cell.oncontextmenu = (e) => { e.preventDefault(); clearCell(li, c); };
      } else cell.append(el('div', 'th'), el('div', 'nm', ' '));
      // estilo de disparo: normal dispara; alternar tira do ar se já estiver; piano fica no ar só enquanto segura
      cell.onclick = (e) => {
        if (clip && e.target.classList.contains('nm')) { state.selLayer = li; state.sel = { l: li, c }; render(); return; }   // rodapé: só prévia
        if (clip && clip.trig === 'piano') return;
        if (clip && clip.trig === 'toggle' && L.on === c) { eject(li); return; }
        trigger(li, c);
      };
      if (clip && clip.trig === 'piano') { cell.onpointerdown = (e) => { if (e.button === 0 && !e.target.classList.contains('nm')) { trigger(li, c); const up = () => { eject(li); removeEventListener('pointerup', up); }; addEventListener('pointerup', up); } }; }
      g.appendChild(cell);
    }
  });
  wrap.scrollTop = st; wrap.scrollLeft = sl;
  renderPreview(); panels.render();
  syncLaser();
}

// soltar na grade: arquivos do Windows, item do navegador (arquivo, fonte, efeito, laser) ou clipe de outra casa
(function () {
  const g = $('grid'); let over = null;
  const cellOf = (e) => e.target.closest ? e.target.closest('.cell') : null;
  const mark = (c) => { if (over === c) return; if (over) over.classList.remove('over'); over = c; if (c) c.classList.add('over'); };
  g.addEventListener('dragover', (e) => { const c = cellOf(e); if (!c) return mark(null); e.preventDefault(); e.dataTransfer.dropEffect = (drag && drag.l != null && !e.ctrlKey) ? 'move' : 'copy'; mark(c); });
  g.addEventListener('dragleave', (e) => { if (!g.contains(e.relatedTarget)) mark(null); });
  g.addEventListener('drop', (e) => {
    const c = cellOf(e); mark(null);
    if (!c) return;
    e.preventDefault();
    const li = +c.dataset.layer, col = +c.dataset.col, d = drag; drag = null;
    dropInto(li, col, d, [...(e.dataTransfer.files || [])], e.ctrlKey);
  });
  // soltar fora da grade não pode fazer a janela navegar para o arquivo
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => e.preventDefault());
})();

// ---------- prévia ----------
// o clipe selecionado como ele sai: renderizado pelo motor a cada quadro, com efeitos e tudo
let prevKey = '';
const prevCanvas = document.createElement('canvas'); prevCanvas.width = COMP_W; prevCanvas.height = COMP_H;
const prevCtx = prevCanvas.getContext('2d');
function renderPreview() {
  const clip = selectedClip(), key = clip ? 'c' + clip.id : previewPath ? 'p' + previewPath : '';
  if (key !== prevKey) {
    prevKey = key;
    const p = $('prevScr'); p.textContent = '';
    const src = previewPath ? C.mediaUrl(previewPath) : '';
    if (clip && clip.kind === 'laser') { const im = el('img'); im.draggable = false; im.src = clip.thumb; p.appendChild(im); }
    else if (clip) p.appendChild(prevCanvas);
    else if (src && C.isVideoName(previewName)) { const v = el('video'); v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.src = src; p.appendChild(v); }
    else if (src) { const im = el('img'); im.draggable = false; im.src = src; p.appendChild(im); }
  }
  $('prevName').textContent = clip ? (clip.kind === 'laser' ? 'laser · ' : clip.kind === 'source' ? 'fonte · ' : clip.w + '×' + clip.h + ' · ') + clip.name : previewPath ? 'arquivo · ' + previewName : '—';
}
let previewPath = '', previewName = '';
function previewFile(path, name) { previewPath = path; previewName = name; state.sel = null; render(); }

// ---------- telas e saídas ----------
// Cada tela (ver screens.js) tem o seu canvas 2D; a janela de saída dela recebe o stream
// desse canvas. O motor só desenha as telas que estão abertas ou abertas no editor.
state.screens = M.defaultScreens(COMP_W, COMP_H);
let displays = [];
if (D) D.displays().then(d => { displays = d; renderScreens(); }).catch(() => { });

function screenCanvas(sc) {
  if (!sc) return null;
  if (!sc.cv) { sc.cv = document.createElement('canvas'); sc.ctx = sc.cv.getContext('2d'); }
  if (sc.cv.width !== sc.w || sc.cv.height !== sc.h) { sc.cv.width = sc.w; sc.cv.height = sc.h; }
  return sc.cv;
}
window.__projStreams = {};
window.__projHelpers = {};
// a janela de saída avisa o tamanho real que ganhou (o monitor manda no tamanho da tela)
window.__projOutSize = (sid, w, h, cheia) => {
  const sc = state.screens.find(s => String(s.id) === String(sid));
  if (sc && cheia && sc.device !== 'window' && w > 0 && h > 0 && (sc.w !== w || sc.h !== h)) { M.resizeScreen(sc, w, h); renderScreens(); if (ao.open) ao.layout(); }
};
const helpers = {
  set: (sc, h) => { if (h) window.__projHelpers[sc.id] = { ...h, w: sc.w, h: sc.h }; else delete window.__projHelpers[sc.id]; },
  clear: () => { window.__projHelpers = {}; },
};
function setScreens(list) {
  for (const sc of state.screens) if (sc.win && !sc.win.closed) sc.win.close();
  state.screens = list; window.__projStreams = {}; renderScreens();
}
function openOutputs() {
  let n = 0;
  for (const sc of state.screens) {
    if (!sc.enabled) continue;
    if (sc.win && !sc.win.closed) { sc.win.focus(); n++; continue; }
    const cv = screenCanvas(sc);
    if (!window.__projStreams[sc.id]) window.__projStreams[sc.id] = cv.captureStream(60);
    sc.win = window.open('output.html?screen=' + sc.id + '&display=' + encodeURIComponent(sc.device), 'proj_out_' + sc.id, 'width=960,height=540');
    n++;
  }
  if (!n) toast('Nenhuma tela ligada. Abra a Saída avançada para ligar uma.');
  renderScreens();
}
$('btnOut').onclick = openOutputs;
function renderScreens() {
  const list = $('scrList'); list.textContent = '';
  let on = 0;
  for (const sc of state.screens) {
    const row = el('div', 's'); const open = !!(sc.win && !sc.win.closed); if (open) on++;
    const dev = sc.device === 'auto' ? 'automático' : sc.device === 'window' ? 'janela' : ((displays.find(d => d.id === sc.device) || {}).label || 'monitor');
    const st = el('i', open ? 'on' : '', open ? 'no ar' : sc.enabled ? dev : 'desligada');
    row.append(el('b', '', sc.name + ' · ' + sc.w + '×' + sc.h), st); list.appendChild(row);
  }
  $('scrCount').textContent = state.screens.length + (state.screens.length === 1 ? ' tela' : ' telas');
  $('outState').textContent = on ? (on === 1 ? 'saída no ar' : on + ' saídas no ar') : 'saída fechada'; $('outState').classList.toggle('on', on > 0);
  $('btnOut').textContent = on ? 'Mostrar saídas' : 'Abrir saída';
  $('compName').textContent = state.name || 'sem nome';
}
setInterval(renderScreens, 1000);

const ao = new AdvancedOutput({
  get compW() { return state.settings.w; }, get compH() { return state.settings.h; }, compCanvas: monCanvas,
  screens: () => state.screens, setScreens, layers: () => state.layers, screenCanvas,
  onChange: renderScreens, helpers, toast,
  displays: () => displays, displayLabel: (id) => (displays.find(d => d.id === id) || {}).label,
  presets: D ? D.presets : null,
});
$('btnAO').onclick = () => ao.show();

const laser = new LaserModule({
  onChange: () => { renderScreens(); },
  toast, laser: window.projLaser || null, compCanvas: monCanvas,
  dragStart: (f) => { drag = { laser: f }; }, dragEnd: () => { drag = null; },
});
if (window.projLaser) window.projLaser.onError((m) => toast('Laser: ' + m));
$('btnLaser').onclick = () => laser.show();

// ---------- composições ----------
const comps = {
  current: () => state.name,
  async save(name) {
    if (!D) { toast('Salvar composição precisa do programa instalado'); return; }
    try { state.name = name; await D.comps.save(name, serializeComposition(state, laser, COLS)); toast('Composição "' + name + '" salva'); renderScreens(); browser.render(); } catch (e) { toast('Não consegui salvar: ' + e.message); }
  },
  async open(name) { if (!D) return; try { await loadComposition(await D.comps.load(name), name); toast('Composição "' + name + '" aberta'); } catch (e) { toast('Não consegui abrir: ' + e.message); } browser.render(); },
  newComp() { resetComposition(); toast('Composição nova'); browser.render(); },
};
function resetComposition() {
  for (const L of state.layers) for (const c of L.clips) if (c) { C.stopClip(c); dropClip(c); }
  state.layers = [mkLayer(3), mkLayer(2), mkLayer(1)]; state.name = ''; state.sel = null; state.selLayer = 0; state.master = state.opacity = state.speed = 1; engine.master = 1;
  engine.compFx = []; engine.compTransform = IDENT_TR(); state.compAutopilot = AUTOPILOT(); state.colNames = {}; setCols(8); applySettings(SETTINGS()); render(); renderScreens();
}
async function loadComposition(json, name) {
  const d = await deserializeComposition(json, { mkLayer, toast, setCols, laserClip: (f) => C.laserClip(f, laser.thumbSvg(f)) });
  for (const L of state.layers) for (const c of L.clips) if (c) { C.stopClip(c); dropClip(c); }
  state.layers = d.layers.length ? d.layers : [mkLayer(1)]; state.name = name || d.name || ''; state.sel = null; state.selLayer = 0;
  state.master = d.master; state.opacity = 1; state.speed = d.speed; engine.master = state.master; engine.compFx = d.compFx; state.compAutopilot = d.compAutopilot; state.colNames = d.colNames; applySettings(d.settings);
  for (const L of state.layers) if (L.on >= 0 && L.clips[L.on]) C.startClip(L.clips[L.on], state.speed); else L.on = -1;
  if (d.screens && d.screens.length) setScreens(d.screens);
  if (d.laser) { laser.frames = d.laser.frames; laser.settings = d.laser.settings; laser.active = d.laser.active; laser.sel = laser.frames[0] || null; if (laser.open) laser.refresh(); }
  if (d.missing) toast(d.missing + (d.missing === 1 ? ' clipe não abriu' : ' clipes não abriram') + ' (arquivo faltando)');
  render(); renderScreens();
  if (state.settings.firstCol) triggerColumn(0);
}
// ---------- Configurações da composição ----------
const SIZES = [[1920, 1080, 'Full HD 1920×1080'], [1280, 720, 'HD 1280×720'], [3840, 2160, '4K UHD 3840×2160'], [1080, 1920, 'Em pé 1080×1920'], [1920, 1200, '1920×1200'], [2560, 1440, '2560×1440'], [1024, 768, '1024×768'], [3840, 1080, 'Dois Full HD lado a lado 3840×1080']];
function applySettings(s) {
  const old = { w: engine.W, h: engine.H };
  state.settings = s = Object.assign(SETTINGS(), s);
  s.w = Math.max(64, Math.min(8192, s.w | 0)); s.h = Math.max(64, Math.min(8192, s.h | 0));
  if (s.w !== old.w || s.h !== old.h) {
    engine.setSize(s.w, s.h); monCanvas.width = prevCanvas.width = s.w; monCanvas.height = prevCanvas.height = s.h;
    // slices que recortavam a composição inteira continuam recortando a inteira
    for (const sc of state.screens) for (const it of sc.items) if (it.in && it.in.x === 0 && it.in.y === 0 && it.in.w === old.w && it.in.h === old.h) { it.in.w = s.w; it.in.h = s.h; M.touch(it); }
    if (ao.open) ao.layout();
  }
  $('compInfo').textContent = s.w + '×' + s.h;
  const c = parseInt(s.bg.slice(1), 16); engine.bg = [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  renderScreens();
}
function settingsDialog() {
  const s = { ...state.settings, name: state.name };
  openDialog({
    title: 'Configurações da composição', width: 520,
    build: (body, K) => {
      body.appendChild(K.phead('Geral'));
      body.appendChild(K.ptext('Nome', 'Nome|Aparece na barra de cima e no arquivo salvo.', s.name, v => { s.name = v; }));
      body.appendChild(K.ptext('Descrição', '', s.desc, v => { s.desc = v; }));
      body.appendChild(K.phead('Tamanho', 'Tamanho|A imagem da composição em pixels. As telas da Saída avançada recortam dela.'));
      const cur = SIZES.find(z => z[0] === s.w && z[1] === s.h);
      body.appendChild(K.pselect('Preset', '', [...SIZES.map(z => [z[0] + 'x' + z[1], z[2]]), ['custom', 'Personalizado']], cur ? cur[0] + 'x' + cur[1] : 'custom', v => { if (v !== 'custom') { const [w, h] = v.split('x').map(Number); s.w = w; s.h = h; } }));
      body.appendChild(K.pnum('Largura', '', s.w, { min: 64, max: 8192, step: 8, unit: ' px' }, v => { s.w = v; }));
      body.appendChild(K.pnum('Altura', '', s.h, { min: 64, max: 8192, step: 8, unit: ' px' }, v => { s.h = v; }));
      body.appendChild(K.phead('Vídeo'));
      body.appendChild(K.pselect('Taxa de quadros', 'Taxa de quadros|Quantas vezes por segundo a composição é desenhada e mandada às saídas.', [['24', '24 fps'], ['25', '25 fps'], ['30', '30 fps'], ['50', '50 fps'], ['60', '60 fps']], String(s.fps), v => { s.fps = +v; }));
      body.appendChild(K.pcolor('Cor de fundo', 'Cor de fundo|O que aparece onde nenhuma camada pinta.', s.bg, v => { s.bg = v; }));
      body.appendChild(K.phead('Clipes'));
      body.appendChild(K.pselect('Disparo padrão', 'Disparo padrão|Como as casas novas disparam: Normal (clique toca), Piano (toca enquanto segura) ou Alternar (clique toca, outro clique para).', [['normal', 'Normal'], ['piano', 'Piano'], ['toggle', 'Alternar']], s.trig, v => { s.trig = v; }));
      body.appendChild(K.pcheck('Ao abrir', 'Disparar primeira coluna ao abrir|Quando a composição é aberta, a coluna 1 já entra no ar.', s.firstCol, v => { s.firstCol = v; }, s.firstCol ? 'dispara a coluna 1' : 'abre parada'));
    },
    buttons: [{ label: 'Cancelar' }, { label: 'OK', primary: true, fn: () => { state.name = s.name; applySettings(s); render(); } }],
  });
}
function preferencesDialog() {
  const p = { recDir: recorder.c.dir || '', showFps: !$('fpsBox').hidden };
  openDialog({
    title: 'Preferências', width: 520,
    build: (body, K) => {
      body.appendChild(K.phead('Gravações e instantâneos'));
      body.appendChild(K.ptext('Pasta', 'Pasta|Onde ficam as gravações e os instantâneos. Vazio = Vídeos\\Projecionista.', p.recDir, v => { p.recDir = v; }));
      body.appendChild(K.phead('Janela'));
      body.appendChild(K.pcheck('FPS', 'FPS e estatísticas|Mostra na barra de cima quantos quadros por segundo o programa está desenhando.', p.showFps, v => { p.showFps = v; }, p.showFps ? 'mostra' : 'esconde'));
      const b = K.pbutton('Voltar as divisórias ao tamanho padrão', '', () => { for (const sp of document.querySelectorAll('.split')) sp.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }); body.appendChild(b);
    },
    buttons: [{ label: 'Cancelar' }, { label: 'OK', primary: true, fn: () => { recorder.c.dir = p.recDir; $('fpsBox').hidden = !p.showFps; if (D) D.prefs.get().then(q => D.prefs.set({ ...q, recDir: p.recDir, showFps: p.showFps })).catch(() => { }); } }],
  });
}
function aboutDialog() {
  const ua = /Chrome\/([\d.]+)/.exec(navigator.userAgent), ev = /Electron\/([\d.]+)/.exec(navigator.userAgent);
  openDialog({ title: 'Sobre o Projecionista', width: 420, build: (body) => { body.appendChild(el('p', 'dtext', 'Projecionista — projeção e laser ao vivo, no jeito de trabalhar do Resolume. Projeto de Felipe Spencer, 2026.')); body.appendChild(el('p', 'dtext', 'Electron ' + (ev ? ev[1] : '?') + ' · Chromium ' + (ua ? ua[1] : '?') + ' · WebGL2 · WebCodecs')); }, buttons: [{ label: 'Fechar', primary: true }] });
}

// ---------- painéis e navegador ----------
const panels = new Panels({
  state, engine, laser, toast, renderGrid: render, selectedClip, drag: () => drag, trigger, removeLayer, applySpeed,
  prepare: (fmt) => { const s = selectedCell(); if (s) prepareClip(state.layers.indexOf(s.L), s.idx, fmt); }, preparing: (c) => preparingNow.has(c.path) ? preparingNow.get(c.path) : null,
  openLaser: (f) => { laser.sel = f; laser.show(); },
});
const recorder = new Recorder({ compCanvas: monCanvas, screens: () => state.screens, screenCanvas, desktop: D, toast, onChange: () => { if (browser.tab === 'rec') browser.render(); }, dir: window.__recDir || '' });
const browser = new Browser({
  desktop: D, toast, setDrag: (d) => { drag = d; }, preview: previewFile, recorder, comps, prepareFile, preparingFile: (p) => preparingNow.has(p) ? preparingNow.get(p) : null,
  putInSelection: (d) => { const s = state.sel || { l: state.selLayer, c: 0 }; const col = state.sel ? s.c : state.layers[s.l].clips.findIndex(c => !c); dropInto(s.l, col < 0 ? 0 : col, d, null, false); },
  addEffectToSelection: (id) => { const c = selectedClip(); if (!c) { toast('Selecione um clipe primeiro'); return; } c.fx.push(mkFx(id)); render(); },
});

// ---------- barra de menus (no formato do Resolume) ----------
const selL = () => state.layers[state.selLayer] ? state.selLayer : 0;
const selC = () => state.sel ? state.sel.c : 0;
const withClip = (fn) => () => { const s = selectedCell(); if (!s) { toast('Selecione um clipe'); return; } fn(s.clip, state.layers.indexOf(s.L), s.idx); };
const menuDefs = () => [
  { label: 'Projecionista', items: () => [
    { label: 'Preferências…', key: 'Ctrl+,', fn: preferencesDialog }, '-',
    { label: 'Sobre', fn: aboutDialog }, '-',
    { label: 'Sair', key: 'Ctrl+Q', fn: () => window.close() }] },
  { label: 'Composição', items: () => [
    { label: 'Nova', key: 'Ctrl+N', fn: () => comps.newComp() },
    { label: 'Abrir…', key: 'Ctrl+O', fn: () => { browser.setTab('comps'); toast('Duplo clique numa composição da lista para abrir'); } },
    { label: 'Abrir recente', sub: () => (browser.compList || []).length ? browser.compList.map(n => ({ label: n, fn: () => comps.open(n) })) : [{ label: 'nenhuma salva', disabled: true }] },
    { label: 'Salvar', key: 'Ctrl+S', fn: () => state.name ? comps.save(state.name) : browser.saveAs() },
    { label: 'Salvar como…', key: 'Ctrl+Shift+S', fn: () => { browser.setTab('comps'); browser.saveAs(); } }, '-',
    { label: 'Copiar efeitos', fn: () => { fxClipboard = fxCopy(engine.compFx); toast(fxClipboard.length + ' efeito(s) copiado(s)'); } },
    { label: 'Colar efeitos', disabled: !fxClipboard, fn: () => { engine.compFx.push(...fxCopy(fxClipboard)); panels.render(); } }, '-',
    { label: 'Transporte global', sub: () => [{ label: 'Tocar', fn: () => playAll(1) }, { label: 'Pausar', fn: () => playAll(0) }, { label: 'Tocar para trás', fn: () => playAll(-1) }, { label: 'Parar (tirar tudo do ar)', fn: stopAll }] },
    { label: 'Disparo de clipe', sub: () => [['normal', 'Normal'], ['piano', 'Piano'], ['toggle', 'Alternar']].map(([v, t]) => ({ label: t, check: state.settings.trig === v, fn: () => { state.settings.trig = v; for (const L of state.layers) for (const c of L.clips) if (c) c.trig = v; panels.render(); } })) },
    { label: 'Disparar primeira coluna ao abrir', check: state.settings.firstCol, fn: () => { state.settings.firstCol = !state.settings.firstCol; } }, '-',
    { label: 'Configurações…', key: 'Ctrl+Shift+C', fn: settingsDialog }] },
  { label: 'Camada', items: () => { const li = selL(), L = state.layers[li]; return [
    { label: 'Nova (por cima)', fn: () => insertLayer(0) },
    { label: 'Inserir acima', fn: () => insertLayer(li) },
    { label: 'Inserir abaixo', fn: () => insertLayer(li + 1) },
    { label: 'Duplicar', fn: () => duplicateLayer(li) },
    { label: 'Renomear…', fn: async () => { const n = await askText('Renomear camada', 'Nome', L.name); if (n) { L.name = n; render(); } } }, '-',
    { label: 'Copiar efeitos', fn: () => { fxClipboard = fxCopy(L.fx); toast(fxClipboard.length + ' efeito(s) copiado(s)'); } },
    { label: 'Colar efeitos', disabled: !fxClipboard, fn: () => { L.fx.push(...fxCopy(fxClipboard)); panels.render(); } }, '-',
    { label: 'Ignorar disparo de coluna', check: !!L.ignoreColumn, fn: () => { L.ignoreColumn = !L.ignoreColumn; } }, '-',
    { label: 'Limpar clipes', fn: () => clearLayer(li) },
    { label: 'Remover', disabled: state.layers.length <= 1, fn: () => removeLayer(li) }]; } },
  { label: 'Coluna', items: () => { const c = selC(); return [
    { label: 'Nova (no fim)', fn: () => insertColumn(COLS) },
    { label: 'Inserir antes', fn: () => insertColumn(c) },
    { label: 'Inserir depois', fn: () => insertColumn(c + 1) },
    { label: 'Duplicar', fn: () => duplicateColumn(c) },
    { label: 'Renomear…', fn: async () => { const n = await askText('Renomear coluna', 'Nome', state.colNames[c] || 'Coluna ' + (c + 1)); if (n) { state.colNames[c] = n; render(); } } }, '-',
    { label: 'Limpar clipes', fn: () => clearColumn(c) },
    { label: 'Remover', disabled: COLS <= 1, fn: () => removeColumn(c) },
    { label: 'Remover todas antes', disabled: c === 0, fn: () => { for (let i = 0; i < c; i++) removeColumn(0); } },
    { label: 'Remover todas depois', disabled: c >= COLS - 1, fn: () => { while (COLS > c + 1) removeColumn(COLS - 1); } }]; } },
  { label: 'Clipe', items: () => { const s = selectedCell(), k = s ? s.clip : null, isV = k && k.kind === 'video'; return [
    { label: 'Transporte', disabled: !isV, sub: () => [['loop', 'Loop'], ['bounce', 'Vai e volta'], ['once', 'Uma vez'], ['random', 'Aleatório']].map(([v, t]) => ({ label: t, check: k.tr.mode === v, fn: () => { k.tr.mode = v; panels.render(); } })) },
    { label: 'Alvo (autopilot)', disabled: !k, sub: () => [['layer', 'Como a camada'], ['next', 'Próximo'], ['prev', 'Anterior'], ['random', 'Ao acaso'], ['stop', 'Parar']].map(([v, t]) => ({ label: t, check: k.ap && k.ap.mode === v, fn: () => { k.ap = { ...(k.ap || {}), mode: v }; panels.render(); } })) },
    { label: 'Estilo de disparo', disabled: !k, sub: () => [['normal', 'Normal'], ['piano', 'Piano'], ['toggle', 'Alternar']].map(([v, t]) => ({ label: t, check: k.trig === v, fn: () => { k.trig = v; panels.render(); } })) },
    { label: 'Ignorar disparo de coluna', disabled: !k, check: !!(k && k.ignoreColumn), fn: () => { k.ignoreColumn = !k.ignoreColumn; panels.render(); } },
    { label: 'Ajuste', disabled: !k, sub: () => [['contain', 'Encaixar'], ['cover', 'Preencher'], ['stretch', 'Esticar']].map(([v, t]) => ({ label: t, check: k.fit === v, fn: () => { k.fit = v; panels.render(); } })) },
    { label: 'Miniatura do quadro atual', disabled: !k || k.kind !== 'video', fn: withClip((c) => { const cv = document.createElement('canvas'); const kk = Math.min(240 / c.w, 240 / c.h); cv.width = Math.round(c.w * kk); cv.height = Math.round(c.h * kk); try { cv.getContext('2d').drawImage(c.player ? c.player.frame : c.el, 0, 0, cv.width, cv.height); c.thumb = cv.toDataURL('image/jpeg', 0.75); render(); } catch { toast('Não consegui tirar a miniatura'); } }) }, '-',
    { label: 'Recortar', key: 'Ctrl+X', disabled: !k, fn: () => copyClip(true) },
    { label: 'Copiar', key: 'Ctrl+C', disabled: !k, fn: () => copyClip(false) },
    { label: 'Colar', key: 'Ctrl+V', disabled: !clipboard, fn: pasteClip },
    { label: 'Copiar efeitos', disabled: !k, fn: withClip((c) => { fxClipboard = fxCopy(c.fx); toast(fxClipboard.length + ' efeito(s) copiado(s)'); }) },
    { label: 'Colar efeitos', disabled: !k || !fxClipboard, fn: withClip((c) => { c.fx.push(...fxCopy(fxClipboard)); panels.render(); }) }, '-',
    { label: 'Renomear…', disabled: !k, fn: withClip(async (c) => { const n = await askText('Renomear clipe', 'Nome', c.name); if (n) { c.name = n; render(); } }) },
    { label: 'Limpar', key: 'Delete', disabled: !k, fn: withClip((c, l, col) => clearCell(l, col)) },
    { label: 'Mostrar no Explorer', disabled: !k || !k.path || !D, fn: withClip((c) => D.rec.show(c.path)) },
    { label: 'Preparar (H.264 todo intra)', disabled: !isV || !k.path || k.prepared || !D, fn: withClip((c, l, col) => prepareClip(l, col, 'h264')) },
    { label: 'Instantâneo do clipe (PNG)', disabled: !k, fn: () => snapshot('clip') }]; } },
  { label: 'Saída', items: () => { const sc = state.screens[0], open = state.screens.some(s => s.win && !s.win.closed); return [
    { label: 'Desligada', check: !open, fn: () => { for (const s of state.screens) if (s.win && !s.win.closed) s.win.close(); renderScreens(); } },
    { label: 'Tela cheia', sub: () => displays.length ? displays.map(d => ({ label: d.label, check: open && sc.device === d.id, fn: () => { sc.device = d.id; sc.enabled = true; if (sc.win && !sc.win.closed) sc.win.close(); openOutputs(); } })) : [{ label: 'nenhum monitor listado', disabled: true }] },
    { label: 'Janela', check: open && sc.device === 'window', fn: () => { sc.device = 'window'; sc.enabled = true; if (sc.win && !sc.win.closed) sc.win.close(); openOutputs(); } },
    { label: 'Automático (projetor ligado)', check: open && sc.device === 'auto', fn: () => { sc.device = 'auto'; sc.enabled = true; if (sc.win && !sc.win.closed) sc.win.close(); openOutputs(); } }, '-',
    { label: 'Avançada…', fn: () => ao.show() }, '-',
    { label: 'Identificar telas', fn: () => { ao.identify(); if (!open) toast('Abra a saída para ver o nome em cada tela'); } },
    { label: 'Mostrar Test Card', check: state.layers.some(L => L.testCard), fn: toggleTestCard },
    { label: 'Instantâneo da composição (PNG)', fn: () => snapshot('comp') }]; } },
  { label: 'Atalhos', items: () => [{ label: 'Teclado…', fn: () => shortcutsDialog(SHORTCUTS) }] },
  { label: 'Ver', items: () => [
    { label: 'Laser', fn: () => laser.show() },
    { label: 'Saída avançada', fn: () => ao.show() }, '-',
    { label: 'FPS e estatísticas', check: !$('fpsBox').hidden, fn: () => { $('fpsBox').hidden = !$('fpsBox').hidden; } }, '-',
    { label: 'Painel Composição', fn: () => { panels.tab = 'comp'; panels.render(); } },
    { label: 'Painel Camada', fn: () => { panels.tab = 'layer'; panels.render(); } }, '-',
    ...[['files', 'Arquivos'], ['comps', 'Composições'], ['fx', 'Efeitos'], ['src', 'Fontes'], ['rec', 'Gravar']].map(([t, n]) => ({ label: n, check: browser.tab === t, fn: () => browser.setTab(t) }))] },
];
const menubar = new Menubar($('menubar'), menuDefs);
const SHORTCUTS = [
  { combo: 'Ctrl+N', keys: 'Ctrl+N', what: 'Composição nova', fn: () => comps.newComp() },
  { combo: 'Ctrl+O', keys: 'Ctrl+O', what: 'Abrir composição (aba Composições)', fn: () => browser.setTab('comps') },
  { combo: 'Ctrl+S', keys: 'Ctrl+S', what: 'Salvar composição', fn: () => state.name ? comps.save(state.name) : (browser.setTab('comps'), browser.saveAs()) },
  { combo: 'Ctrl+Shift+S', keys: 'Ctrl+Shift+S', what: 'Salvar como…', fn: () => { browser.setTab('comps'); browser.saveAs(); } },
  { combo: 'Ctrl+Shift+C', keys: 'Ctrl+Shift+C', what: 'Configurações da composição', fn: settingsDialog },
  { combo: 'Ctrl+,', keys: 'Ctrl+,', what: 'Preferências', fn: preferencesDialog },
  { combo: 'Ctrl+X', keys: 'Ctrl+X', what: 'Recortar o clipe selecionado', fn: () => copyClip(true) },
  { combo: 'Ctrl+C', keys: 'Ctrl+C', what: 'Copiar o clipe selecionado', fn: () => copyClip(false) },
  { combo: 'Ctrl+V', keys: 'Ctrl+V', what: 'Colar na casa selecionada', fn: pasteClip },
  { combo: 'Delete', keys: 'Delete', what: 'Limpar a casa selecionada', fn: () => { const s = selectedCell(); if (s) clearCell(state.layers.indexOf(s.L), s.idx); } },
  { combo: 'Enter', keys: 'Enter', what: 'Disparar a casa selecionada', fn: () => { if (state.sel) trigger(state.sel.l, state.sel.c); } },
  { combo: 'Escape', keys: 'Esc', what: 'Tirar do ar a camada selecionada', when: () => !ao.open && !laser.open, fn: () => eject(selL()) },
  { combo: 'Ctrl+Q', keys: 'Ctrl+Q', what: 'Sair', fn: () => window.close() },
];
installShortcuts(SHORTCUTS);

// ---------- divisórias ----------
(async () => {
  let prefs = {}; if (D) { try { prefs = await D.prefs.get(); } catch { } }
  if (prefs.recDir && !window.__recDir) recorder.c.dir = prefs.recDir; $('fpsBox').hidden = !prefs.showFps;
  initSplitters(prefs).onSave((sizes) => { if (D) D.prefs.get().then(p => D.prefs.set({ ...p, sizes })).catch(() => { }); });
})();

// ---------- laço de desenho ----------
function loop() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (loop.last || now)); loop.last = now;
  for (const L of state.layers) if (L.prev && now - L.prev.t0 >= L.prev.dur) { C.stopClip(L.prev.clip); L.prev = null; }
  // transporte dos vídeos no ar: entrada/saída, modo e direção
  for (const L of state.layers) { const c = L.on >= 0 ? L.clips[L.on] : null; if (c && c.kind === 'video') { if (C.tickTransport(c, dt, state.speed)) c.endedAt = now; } }
  panels.tick();
  // taxa de quadros da composição: desenha só quando passou 1/fps
  if (now - (loop.lastDraw || 0) < 1 / state.settings.fps - 0.0015) { tickAutopilot(now); requestAnimationFrame(loop); return; }
  loop.lastDraw = now; loop.frames = (loop.frames || 0) + 1;
  if (now - (loop.fpsAt || 0) >= 1) { if (!$('fpsBox').hidden) $('fpsBox').textContent = loop.frames + ' fps · ' + state.layers.filter(L => L.on >= 0).length + ' no ar · ' + COLS + ' colunas'; loop.frames = 0; loop.fpsAt = now; }
  // espelho do laser: o desenho do LaserCube vai para a projeção
  { const s = selectedCell(); for (const L of state.layers) { const c = L.on >= 0 ? L.clips[L.on] : null; for (const m of [c, s && s.clip]) if (m && m.kind === 'lasermirror' && m.paintedAt !== now) { m.paintedAt = now; paintScan(m.el.getContext('2d'), 1080, 1080, laser.scanNow(now), false); m.rev++; } } }
  engine.render(state.layers, engine.neededLayers(state.screens), now);
  engine.blit(monCtx);
  const pc = selectedCell();
  if (pc && pc.clip.kind !== 'laser' && prevCanvas.isConnected) { engine.previewLayer(pc.L, pc.idx); engine.blit(prevCtx); }
  for (const sc of state.screens) {
    const open = sc.win && !sc.win.closed;
    if (!open && !(ao.open && ao.curScreen() === sc)) continue;
    screenCanvas(sc);
    engine.renderScreen(sc, state.layers, state.screens);
    engine.blit(sc.ctx, sc.w, sc.h);
  }
  ao.frame();
  tickAutopilot(now);
  requestAnimationFrame(loop);
}
loop();

render();

// usado pelo teste automático (tools/selftest-main.js); não é interface de usuário
window.projecionista = { menubar, settingsDialog, applySettings, insertColumn, removeColumn, duplicateColumn, insertLayer, duplicateLayer, copyClip, pasteClip, toggleTestCard, cols: () => COLS, state, engine, putFiles, putSource, putText, putPath, prepareClip, trigger, eject, triggerColumn, moveClip, clearCell, render, ao, M, C, laser, putLaserClip, panels, browser, recorder, comps,
  probe: (pts) => engine.probe(state.layers, pts),
  probeScreen: (sc, pts) => engine.probeScreen(sc, state.layers, state.screens, pts),
  serialize: () => serializeComposition(state, laser, COLS), load: loadComposition, reset: resetComposition,
  screens: () => state.screens, setScreens, openOutputs, outWins: () => state.screens.map(sc => sc.win).filter(w => w && !w.closed) };
