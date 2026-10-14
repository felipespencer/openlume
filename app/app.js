// Projecionista — janela de controle.
// Estado: uma composição com camadas; cada camada tem uma casa por coluna e mostra um clipe
// por vez. Regras de uso (definidas pelo usuário em 2026-10-13):
//   - clicar na miniatura dispara o clipe; clicar no nome (rodapé) só seleciona e mostra a prévia;
//   - clicar numa casa vazia não abre nada: a camada fica preta;
//   - coluna dispara todas as camadas; a que não tem clipe naquela coluna fica preta;
//   - arquivo solto numa casa vira clipe guardado, sem ir para o ar;
//   - abrir o programa começa sempre do zero.
import { Engine, IDENT_TR } from './engine.js';
import { MIXER_OPT, randomMixer } from './mixers.js';
import * as M from './screens.js';
import * as C from './clips.js';
import { AdvancedOutput } from './ao.js';
import { LaserModule } from './laser.js';
import { Panels } from './panels.js';
import { Browser } from './browser.js';
import { Recorder } from './record.js';
import { mkFx } from './effects.js';
import { AUTOPILOT, GROUP, XFADE, serializeComposition, deserializeComposition, SETTINGS } from './composition.js';
import { Menubar, openDialog, askText, confirmBox, installShortcuts, shortcutsDialog } from './menus.js';
import { initSplitters } from './splitters.js';
import { paintScan } from './laser-model.js';

let COLS = 8; const COMP_W = 1920, COMP_H = 1080;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const D = window.projDesktop || null;

let seq = 1;
const mkLayer = (n) => ({ id: seq++, name: typeof n === 'string' ? n : 'Camada ' + n, opacity: 1, blend: 'normal', bypass: false, on: -1, clips: Array(COLS).fill(null), autopilot: AUTOPILOT(), fx: [], transform: IDENT_TR(), transition: 0, transMode: 'alpha', transOpt: MIXER_OPT(), blendOpt: MIXER_OPT(), prev: null, group: null, solo: false, bus: null, ghost: null });
// deck: guarda uma linha de clipes por camada (cells[layer.id]); a camada mostra a linha do deck atual em L.clips
let dseq = 1, gseq = 1;
const mkDeck = (name) => ({ id: dseq++, name: name || 'Deck ' + dseq, color: '', closed: false, cells: {} });
const mkGroup = (name) => Object.assign(GROUP(name || 'Grupo ' + gseq), { id: gseq++ });
const state = { name: '', layers: [mkLayer(3), mkLayer(2), mkLayer(1)], selLayer: 0, sel: null, master: 1, opacity: 1, speed: 1, compAutopilot: AUTOPILOT(), settings: SETTINGS(), colNames: {}, groups: [], decks: [mkDeck('Deck 1')], deck: 0, xfade: XFADE(), selGroup: null };   // layers[0] = a de cima
let drag = null;
// o clipe no ar da camada: o da casa ligada ou, depois de trocar de deck, o que continua tocando (ghost)
const liveClip = (L) => L.on >= 0 ? L.clips[L.on] : (L.ghost || null);
const groupOf = (L) => L && L.group != null ? state.groups.find(g => g.id === L.group) || null : null;
const groupLayers = (g) => state.layers.map((L, i) => L.group === g.id ? i : -1).filter(i => i >= 0);
const layerSpeed = (L) => state.speed * ((groupOf(L) || {}).speed ?? 1);
const lockedLayer = (li) => !!(groupOf(state.layers[li]) || {}).lock;
// as linhas de clipes de uma camada em todos os decks (a atual primeiro)
const rowsOf = (L) => [L.clips, ...state.decks.filter((d, i) => i !== state.deck).map(d => d.cells[L.id]).filter(Boolean)];

// o motor desenha num canvas escondido; o monitor da composição é um canvas 2D que recebe a cópia
const engine = new Engine(COMP_W, COMP_H);
engine.compTransform = IDENT_TR();
engine.groups = state.groups; engine.xfade = state.xfade;
const monCanvas = document.createElement('canvas'); monCanvas.width = COMP_W; monCanvas.height = COMP_H;
$('outScr').appendChild(monCanvas);
const monCtx = monCanvas.getContext('2d');
$('compInfo').textContent = COMP_W + '×' + COMP_H;

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }

// ---------- clipes na grade ----------
function putClip(li, col, clip) {
  if (lockedLayer(li)) { toast('Grupo travado: destrave no menu Grupo'); return; }
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
  const on = state.layers.find(L => { const c = liveClip(L); return c && c.kind === 'laser' && !L.bypass; });
  const frame = on ? laser.byId(liveClip(on).laserId) : null;
  if (frame) { if (laser.active !== frame) laser.setActive(frame); laser.activeFromGrid = true; }
  else if (laser.activeFromGrid) { laser.activeFromGrid = false; laser.setActive(null); }
}
// troca de clipe na camada: com duração, o antigo sai pelo modo de transição da camada (ou um ao acaso)
function swapClip(L, col) {
  const old = liveClip(L), clip = L.clips[col]; L.ghost = null;
  if (L.prev && L.prev.clip !== clip) C.stopClip(L.prev.clip);
  if (old && L.transition > 0 && old.kind !== 'laser' && clip.kind !== 'laser') {
    const mode = L.transMode === 'random' ? randomMixer() : (L.transMode || 'alpha');
    L.prev = { clip: old, t0: engine.time, dur: L.transition, mode, opt: { ...(L.transOpt || MIXER_OPT()) }, seed: Math.random() * 100 };
  } else { C.stopClip(old); L.prev = null; }
  L.on = col; C.startClip(clip, layerSpeed(L));
}
function trigger(li, col) {
  const L = state.layers[li], clip = L.clips[col];
  state.selLayer = li; state.sel = { l: li, c: col };
  if (!clip) return eject(li);                 // casa vazia: a camada fica preta
  if (L.on !== col) swapClip(L, col);
  else if (clip.kind === 'video' && clip.el.paused) clip.el.play().catch(() => { });
  L.bypass = false;                            // disparar põe a camada no ar
  recorder.onTrigger();
  render();
}
function eject(li) { const L = state.layers[li]; C.stopClip(liveClip(L)); L.ghost = null; if (L.prev) C.stopClip(L.prev.clip); L.on = -1; L.prev = null; render(); }
function triggerColumn(col, onlyGroup) {   // onlyGroup: id do grupo, para o disparo de coluna do grupo
  state.layers.forEach((L, li) => {
    if (onlyGroup != null && L.group !== onlyGroup) return;
    if (L.ignoreColumn || (onlyGroup == null && (groupOf(L) || {}).ignoreColumn) || (L.clips[col] && L.clips[col].ignoreColumn)) return;   // a camada, o grupo ou a casa ignora o disparo de coluna
    if (L.clips[col]) { if (L.on !== col) swapClip(L, col); L.bypass = false; }
    else { C.stopClip(liveClip(L)); L.ghost = null; if (L.prev) C.stopClip(L.prev.clip); L.on = -1; L.prev = null; }
  });
  recorder.onTrigger();
  render();
}
function clearCell(li, col) {
  const L = state.layers[li], c = L.clips[col];
  if (!c) return;
  if (lockedLayer(li)) { toast('Grupo travado: destrave no menu Grupo'); return; }
  if (L.on === col) { C.stopClip(c); L.on = -1; }
  dropClip(c); L.clips[col] = null;
  if (state.sel && state.sel.l === li && state.sel.c === col) state.sel = null;
  render();
}
function moveClip(fl, fc, tl, tc, copy) {
  if (fl === tl && fc === tc) return;
  if (lockedLayer(fl) || lockedLayer(tl)) { toast('Grupo travado: destrave no menu Grupo'); return; }
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
function insertLayer(at, name) {
  const n = mkLayer(name || state.layers.length + 1);
  // inserida entre duas camadas do mesmo grupo, a nova entra no grupo
  const below = state.layers[at], above = state.layers[at - 1];
  if (below && above && below.group != null && below.group === above.group) n.group = below.group;
  state.layers.splice(at, 0, n); if (state.sel && state.sel.l >= at) state.sel.l++; state.selLayer = at; render(); return n;
}
function cloneLayer(L, name) {
  const n = mkLayer(name || L.name + ' cópia');
  n.opacity = L.opacity; n.blend = L.blend; n.autopilot = { ...L.autopilot }; n.fx = L.fx.map(f => ({ ...f, params: { ...f.params } })); n.transform = { ...L.transform }; n.transition = L.transition; n.transMode = L.transMode; n.transOpt = { ...(L.transOpt || MIXER_OPT()) }; n.blendOpt = { ...(L.blendOpt || MIXER_OPT()) }; n.ignoreColumn = L.ignoreColumn; n.group = L.group; n.bus = L.bus;
  n.clips = L.clips.map(c => c ? C.cloneClip(c) : null);
  return n;
}
function duplicateLayer(li) {
  const n = cloneLayer(state.layers[li]);
  state.layers.splice(li, 0, n); if (state.sel && state.sel.l >= li) state.sel.l++; state.selLayer = li; render();
}
function clearLayer(li) { state.layers[li].clips.forEach((c, i) => { if (c) clearCell(li, i); }); }
function setCols(n) {
  n = Math.max(1, Math.min(64, n | 0));
  for (const L of state.layers) for (const row of rowsOf(L)) { const cur = row === L.clips; while (row.length < n) row.push(null); while (row.length > n) { const c = row.pop(); if (c) { if (cur && L.on === row.length) { C.stopClip(c); L.on = -1; } dropClip(c); } } if (cur && L.on >= n) L.on = -1; }
  COLS = n; if (state.sel && state.sel.c >= n) state.sel = null; render();
}
const shiftNames = (fn) => { const o = {}; for (const k in state.colNames) { const i = fn(+k); if (i >= 0) o[i] = state.colNames[k]; } state.colNames = o; };
function insertColumn(at) {
  for (const L of state.layers) { for (const row of rowsOf(L)) row.splice(at, 0, null); if (L.on >= at) L.on++; }
  shiftNames(i => i >= at ? i + 1 : i); COLS++; if (state.sel && state.sel.c >= at) state.sel.c++; render();
}
function removeColumn(at) {
  if (COLS <= 1) return;
  for (const L of state.layers) { for (const row of rowsOf(L)) { const c = row[at]; if (c) { if (row === L.clips && L.on === at) { C.stopClip(c); L.on = -1; } dropClip(c); } row.splice(at, 1); } if (L.on > at) L.on--; }
  shiftNames(i => i === at ? -1 : i > at ? i - 1 : i); COLS--;
  if (state.sel) { if (state.sel.c === at) state.sel = null; else if (state.sel.c > at) state.sel.c--; }
  render();
}
function clearColumn(at) { state.layers.forEach((L, li) => clearCell(li, at)); }
function duplicateColumn(at) { insertColumn(at + 1); for (const L of state.layers) if (L.clips[at]) L.clips[at + 1] = C.cloneClip(L.clips[at]); if (state.colNames[at]) state.colNames[at + 1] = state.colNames[at] + ' cópia'; render(); }
// ---------- decks ----------
// trocar de deck: a grade passa a mostrar os clipes do outro deck; o que está no ar continua
// tocando (ghost) até a camada disparar outro clipe ou sair do ar, como no Resolume
function switchDeck(i) {
  if (!state.decks[i] || i === state.deck) return;
  const cur = state.decks[state.deck];
  for (const L of state.layers) {
    cur.cells[L.id] = L.clips;
    if (L.on >= 0 && L.clips[L.on]) L.ghost = L.clips[L.on];
    L.on = -1;
    const row = state.decks[i].cells[L.id] || (state.decks[i].cells[L.id] = Array(COLS).fill(null));
    while (row.length < COLS) row.push(null);
    L.clips = row;
  }
  state.deck = i; state.sel = null; render();
}
function addDeck(at, name) { const d = mkDeck(name); at = Math.max(0, Math.min(state.decks.length, at)); state.decks.splice(at, 0, d); if (at <= state.deck) state.deck++; switchDeck(at); render(); return d; }
function duplicateDeck(i) {
  const s = state.decks[i], d = mkDeck(s.name + ' cópia'); d.color = s.color;
  for (const L of state.layers) { const row = i === state.deck ? L.clips : s.cells[L.id]; if (row) d.cells[L.id] = row.map(c => c ? C.cloneClip(c) : null); }
  state.decks.splice(i + 1, 0, d); if (i + 1 <= state.deck) state.deck++; switchDeck(i + 1); render();
}
function removeDeck(i) {
  if (state.decks.length <= 1 || !state.decks[i]) return;
  const d = state.decks[i];
  if (i === state.deck) switchDeck(i === 0 ? 1 : 0);
  for (const L of state.layers) { const row = d.cells[L.id]; if (row) for (const c of row) if (c) { if (L.ghost === c) { C.stopClip(c); L.ghost = null; } if (L.prev && L.prev.clip === c) { C.stopClip(c); L.prev = null; } dropClip(c); } }
  const idx = state.decks.indexOf(d); state.decks.splice(idx, 1); if (state.deck > idx) state.deck--; render();
}
function clearDeck(i) {
  if (i === state.deck) { state.layers.forEach((L, li) => clearLayer(li)); return; }
  const d = state.decks[i]; for (const L of state.layers) { const row = d.cells[L.id]; if (row) row.forEach((c, k) => { if (c) { dropClip(c); row[k] = null; } }); } render();
}
function renderDecks() {
  const box = $('decks'); box.textContent = '';
  state.decks.forEach((d, i) => {
    if (d.closed) return;
    const b = el('button', i === state.deck ? 'on' : '', d.name); b.type = 'button'; b.title = 'Deck ' + d.name + ': clique para trocar, duplo clique para renomear';
    if (d.color) b.style.setProperty('--gc', d.color);
    b.onclick = () => switchDeck(i);
    b.ondblclick = async () => { const n = await askText('Renomear deck', 'Nome', d.name); if (n) { d.name = n; render(); } };
    box.appendChild(b);
  });
  const add = el('button', 'add', '+'); add.type = 'button'; add.title = 'Deck novo'; add.onclick = () => addDeck(state.decks.length); box.appendChild(add);
  // crossfader
  const x = $('xfade'), X = state.xfade; x.textContent = '';
  const bA = el('button', X.pos <= 0 ? 'act' : '', 'A'); bA.type = 'button'; bA.title = 'Ir para o bus A (corta ou esmaece, conforme o painel Composição)'; bA.onclick = () => fadeTo('A');
  const bB = el('button', X.pos >= 1 ? 'act' : '', 'B'); bB.type = 'button'; bB.title = 'Ir para o bus B'; bB.onclick = () => fadeTo('B');
  const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1000; r.value = Math.round(X.pos * 1000); r.title = 'Crossfader: esquerda mostra o bus A, direita o bus B';
  r.oninput = () => { X.pos = r.value / 1000; X.target = null; if (panels.tab === 'comp') panels.render(); };
  const nA = state.layers.filter(L => L.bus === 'A').length + state.groups.filter(g => g.bus === 'A').length, nB = state.layers.filter(L => L.bus === 'B').length + state.groups.filter(g => g.bus === 'B').length;
  x.append(el('span', 'xl', 'Crossfader'), bA, el('span', 'xl', nA ? nA + ' no A' : 'A vazio'), r, el('span', 'xl', nB ? nB + ' no B' : 'B vazio'), bB);
}
// "ir para A/B": corta ou esmaece no tempo do painel Composição
function fadeTo(bus) { const X = state.xfade, to = bus === 'A' ? 0 : 1; if (X.behaviour === 'fade' && X.secs > 0) { X.target = to; X.from = X.pos; X.t0 = performance.now() / 1000; } else { X.pos = to; X.target = null; } renderDecks(); if (panels.tab === 'comp') panels.render(); }
function tickXfade(now) { const X = state.xfade; if (X.target == null) return; const k = Math.min(1, (now - X.t0) / Math.max(0.01, X.secs)); X.pos = X.from + (X.target - X.from) * k; if (k >= 1) { X.target = null; renderDecks(); } else { const r = $('xfade').querySelector('input'); if (r) r.value = Math.round(X.pos * 1000); } }

// ---------- grupos ----------
// um grupo são camadas vizinhas que entram na composição como uma só (opacidade, mistura, efeitos)
function pruneGroups() {
  const keep = state.groups.filter(g => state.layers.some(L => L.group === g.id));
  state.groups.length = 0; state.groups.push(...keep);
  if (state.selGroup != null && !keep.some(g => g.id === state.selGroup)) { state.selGroup = null; if (panels.tab === 'group') panels.tab = 'layer'; }
}
function newGroup(li, name) {
  const L = state.layers[li]; if (!L || L.group != null) { toast('A camada já está num grupo'); return null; }
  const g = mkGroup(name); state.groups.push(g); L.group = g.id; state.selGroup = g.id; state.selLayer = li; panels.tab = 'group'; render(); return g;
}
// põe a camada no grupo (logo acima dos membros, para o grupo continuar vizinho) ou tira dela
function setLayerGroup(li, gid) {
  const L = state.layers[li]; if (!L) return; const sel = state.sel && state.layers[state.sel.l];
  if (gid == null) { L.group = null; pruneGroups(); render(); return; }
  const g = state.groups.find(x => x.id === gid); if (!g) return;
  const idx = groupLayers(g);
  if (idx.length && (li === idx[0] - 1 || li === idx[idx.length - 1] + 1)) { L.group = gid; pruneGroups(); render(); return; }   // já é vizinha: fica onde está
  state.layers.splice(li, 1); const top = state.layers.findIndex(x => x.group === gid); state.layers.splice(top < 0 ? li : top, 0, L); L.group = gid;
  state.selLayer = state.layers.indexOf(L); if (sel) state.sel.l = state.layers.indexOf(sel); pruneGroups(); render();
}
function addLayerToGroup(g) { const top = Math.max(0, state.layers.findIndex(x => x.group === g.id)); const L = mkLayer(state.layers.length + 1); L.group = g.id; state.layers.splice(top, 0, L); if (state.sel && state.sel.l >= top) state.sel.l++; state.selLayer = top; render(); }
function removeGroup(g, withLayers) {
  if (withLayers) for (const i of groupLayers(g).reverse()) if (state.layers.length > 1) removeLayer(i);
  for (const L of state.layers) if (L.group === g.id) L.group = null;
  pruneGroups(); render();
}
function duplicateGroup(g) {
  const idx = groupLayers(g); if (!idx.length) return;
  const n = mkGroup(g.name + ' cópia'); Object.assign(n, { color: g.color, opacity: g.opacity, blend: g.blend, blendOpt: { ...g.blendOpt }, fx: fxCopy(g.fx), transform: { ...g.transform }, ignoreColumn: g.ignoreColumn, firstCol: g.firstCol, lock: g.lock, speed: g.speed, bus: g.bus });
  state.groups.push(n);
  const copies = idx.map(i => { const c = cloneLayer(state.layers[i]); c.group = n.id; return c; });
  state.layers.splice(idx[0], 0, ...copies); if (state.sel && state.sel.l >= idx[0]) state.sel.l += copies.length; state.selGroup = n.id; state.selLayer = idx[0]; render();
}
function ejectGroup(g) { for (const i of groupLayers(g)) eject(i); }
function clearGroupClips(g) { for (const i of groupLayers(g)) clearLayer(i); }
const selectedGroup = () => (state.selGroup != null && state.groups.find(g => g.id === state.selGroup)) || groupOf(state.layers[state.selLayer]) || null;
// a linha do grupo na grade: recolher, X, B, S, nome, fader e os disparos de coluna só do grupo
function renderGroupRow(grid, g, first) {
  const gh = el('div', 'grp' + (panels.tab === 'group' && state.selGroup === g.id ? ' sel' : '') + (g.bypass ? ' off' : ''));
  gh.style.setProperty('--gc', g.color || '#8b8d95'); gh.dataset.group = g.id;
  const bb = el('div', 'b');
  const mk = (txt, cls, title, fn) => { const b = el('button', cls, txt); b.type = 'button'; b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
  bb.append(
    mk(g.folded ? '▸' : '▾', '', g.folded ? 'Mostrar as camadas do grupo' : 'Recolher o grupo', () => { g.folded = !g.folded; render(); }),
    mk('X', '', 'Tirar o grupo inteiro do ar', () => ejectGroup(g)),
    mk('B', g.bypass ? 'act' : '', 'Desligar ou ligar o grupo inteiro', () => { g.bypass = !g.bypass; render(); }),
    mk('S', g.solo ? 'act' : '', 'Solo: só este grupo aparece', () => { g.solo = !g.solo; render(); }));
  const op = el('input'); op.type = 'range'; op.min = 0; op.max = 100; op.value = Math.round(g.opacity * 100); op.title = 'Opacidade do grupo';
  op.onclick = (e) => e.stopPropagation(); op.oninput = () => { g.opacity = op.value / 100; if (panels.tab === 'group' && state.selGroup === g.id) panels.render(); };
  gh.append(bb, el('div', 'nm', g.name + (g.folded ? ' · ' + groupLayers(g).length + ' camadas' : '')), op);
  gh.onclick = () => { state.selGroup = g.id; state.selLayer = first; panels.tab = 'group'; render(); };
  grid.appendChild(gh);
  const idx = groupLayers(g);
  for (let c = 0; c < COLS; c++) {
    const b = el('button', 'gcol', '▶'); b.type = 'button'; b.title = 'Dispara a coluna só nas camadas deste grupo';
    const tem = idx.filter(i => state.layers[i].clips[c]);
    if (tem.length && tem.every(i => state.layers[i].on === c)) b.classList.add('on');
    b.onclick = () => triggerColumn(c, g.id);
    grid.appendChild(b);
  }
}
const COLORS = [['', 'Nenhuma'], ['#ff3b30', 'Vermelho'], ['#ff9500', 'Laranja'], ['#ffd60a', 'Amarelo'], ['#39ff14', 'Verde'], ['#6ec1ff', 'Azul'], ['#bf5af2', 'Roxo'], ['#ff2d90', 'Rosa']];

let clipboard = null, fxClipboard = null;
const fxCopy = (list) => list.map(f => ({ ...f, params: { ...f.params } }));
function copyClip(cut) { const s = selectedCell(); if (!s) { toast('Selecione um clipe'); return; } clipboard = C.cloneClip(s.clip); if (cut) clearCell(state.layers.indexOf(s.L), s.idx); toast(cut ? 'Clipe recortado' : 'Clipe copiado'); }
function pasteClip() {
  if (!clipboard) { toast('Nada copiado'); return; }
  const l = state.sel ? state.sel.l : state.selLayer, c = state.sel ? state.sel.c : state.layers[l].clips.findIndex(x => !x);
  putClip(l, c < 0 ? 0 : c, C.cloneClip(clipboard)); state.sel = { l, c: c < 0 ? 0 : c }; render();
}
function playAll(dir) { for (const L of state.layers) { const c = liveClip(L); if (c && c.kind === 'video') { if (dir === 0) C.pauseClip(c); else C.playClip(c, dir, layerSpeed(L)); } } render(); }
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
  if (L.ghost) C.stopClip(L.ghost);
  for (const row of rowsOf(L)) row.forEach(c => { if (c) { C.stopClip(c); dropClip(c); } });
  for (const d of state.decks) delete d.cells[L.id];
  state.layers.splice(li, 1); if (state.sel) { if (state.sel.l === li) state.sel = null; else if (state.sel.l > li) state.sel.l--; } state.selLayer = Math.min(state.selLayer, state.layers.length - 1); pruneGroups(); render();
}
function applySpeed() { for (const L of state.layers) for (const c of [...L.clips, L.ghost]) if (c && c.kind === 'video' && c.el) C.setRate(c, layerSpeed(L)); }
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
    const dur = ap.dur === 'fixed' ? ap.secs : (clip.kind === 'video' && clip.dur ? Math.max(0.05, ((clip.tr.out || clip.dur) - clip.tr.in)) / (clip.speed * layerSpeed(L)) : ap.secs);
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
  let lastG = null;
  state.layers.forEach((L, li) => {
    const grp = groupOf(L);
    if (grp && grp !== lastG) renderGroupRow(g, grp, li);
    lastG = grp;
    if (grp && grp.folded) return;
    const lh = el('div', 'lh' + (li === state.selLayer ? ' sel' : '') + (L.bypass ? ' off' : '') + (grp ? ' ing' : ''));
    if (grp) lh.style.setProperty('--gc', grp.color || '#8b8d95');
    lh.dataset.layer = li;
    const bb = el('div', 'b');
    const bx = el('button', '', 'X'); bx.type = 'button'; bx.title = 'Tirar a camada do ar';
    const bo = el('button', L.bypass ? 'act' : '', 'B'); bo.type = 'button'; bo.title = 'Desligar ou ligar a camada sem perder o clipe';
    bx.onclick = (e) => { e.stopPropagation(); eject(li); };
    bo.onclick = (e) => { e.stopPropagation(); L.bypass = !L.bypass; render(); };
    const bs = el('button', L.solo ? 'act' : '', 'S'); bs.type = 'button'; bs.title = 'Solo: só esta camada aparece';
    bs.onclick = (e) => { e.stopPropagation(); L.solo = !L.solo; render(); };
    bb.append(bx, bo, bs);
    const op = el('input'); op.type = 'range'; op.min = 0; op.max = 100; op.value = Math.round(L.opacity * 100); op.title = 'Opacidade da camada';
    op.onclick = (e) => e.stopPropagation();
    op.oninput = () => { L.opacity = op.value / 100; if (li === state.selLayer) panels.render(); };
    lh.append(bb, el('div', 'nm', L.name), op);
    lh.onclick = () => { state.selLayer = li; state.selGroup = L.group; panels.tab = 'layer'; render(); };
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
  renderDecks(); renderPreview(); panels.render();
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
function dropAll() { for (const L of state.layers) { if (L.ghost) C.stopClip(L.ghost); for (const row of rowsOf(L)) for (const c of row) if (c) { C.stopClip(c); dropClip(c); } } }
function resetComposition() {
  dropAll();
  state.groups.length = 0; state.decks = [mkDeck('Deck 1')]; state.deck = 0; state.xfade = XFADE(); engine.xfade = state.xfade; state.selGroup = null; if (panels.tab === 'group') panels.tab = 'comp';
  state.layers = [mkLayer(3), mkLayer(2), mkLayer(1)]; state.name = ''; state.sel = null; state.selLayer = 0; state.master = state.opacity = state.speed = 1; engine.master = 1;
  engine.compFx = []; engine.compTransform = IDENT_TR(); state.compAutopilot = AUTOPILOT(); state.colNames = {}; setCols(8); applySettings(SETTINGS()); render(); renderScreens();
}
async function loadComposition(json, name) {
  const d = await deserializeComposition(json, { mkLayer, toast, setCols, laserClip: (f) => C.laserClip(f, laser.thumbSvg(f)) });
  dropAll();
  state.layers = d.layers.length ? d.layers : [mkLayer(1)]; state.name = name || d.name || ''; state.sel = null; state.selLayer = 0;
  state.groups.length = 0; state.groups.push(...d.groups); for (const g of d.groups) gseq = Math.max(gseq, g.id + 1); state.selGroup = null; if (panels.tab === 'group') panels.tab = 'comp'; pruneGroups();
  state.xfade = d.xfade; engine.xfade = state.xfade;
  state.decks = d.decks.length ? d.decks.map(k => { const dk = mkDeck(k.name); dk.color = k.color; dk.closed = k.closed; if (k.rows) k.rows.forEach((row, i) => { if (state.layers[i]) dk.cells[state.layers[i].id] = row; }); return dk; }) : [mkDeck('Deck 1')];
  state.deck = Math.min(d.deck || 0, state.decks.length - 1); for (const L of state.layers) state.decks[state.deck].cells[L.id] = L.clips;
  state.master = d.master; state.opacity = 1; state.speed = d.speed; engine.master = state.master; engine.compFx = d.compFx; state.compAutopilot = d.compAutopilot; state.colNames = d.colNames; applySettings(d.settings);
  for (const L of state.layers) if (L.on >= 0 && L.clips[L.on]) C.startClip(L.clips[L.on], layerSpeed(L)); else L.on = -1;
  if (d.screens && d.screens.length) setScreens(d.screens);
  if (d.laser) { laser.frames = d.laser.frames; laser.settings = d.laser.settings; laser.active = d.laser.active; laser.sel = laser.frames[0] || null; if (laser.open) laser.refresh(); }
  if (d.missing) toast(d.missing + (d.missing === 1 ? ' clipe não abriu' : ' clipes não abriram') + ' (arquivo faltando)');
  render(); renderScreens();
  if (state.settings.firstCol) triggerColumn(0);
  else for (const g of state.groups) if (g.firstCol) triggerColumn(0, g.id);
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
  selectedGroup, setLayerGroup, newGroup, removeGroup, addLayerToGroup, fadeTo, renderDecks,
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
  { label: 'Deck', items: () => { const di = state.deck, d = state.decks[di]; return [
    { label: 'Novo (no fim)', fn: () => addDeck(state.decks.length) },
    { label: 'Inserir antes', fn: () => addDeck(di) },
    { label: 'Inserir depois', fn: () => addDeck(di + 1) },
    { label: 'Duplicar', fn: () => duplicateDeck(di) },
    { label: 'Renomear…', fn: async () => { const n = await askText('Renomear deck', 'Nome', d.name); if (n) { d.name = n; render(); } } },
    { label: 'Cor', sub: () => COLORS.map(([v, tx]) => ({ label: tx, check: (d.color || '') === v, fn: () => { d.color = v; render(); } })) }, '-',
    { label: 'Fechar (esconder a aba)', disabled: state.decks.filter(x => !x.closed).length <= 1, fn: () => { d.closed = true; switchDeck(state.decks.findIndex(x => !x.closed)); render(); } },
    { label: 'Abrir deck fechado', sub: () => state.decks.some(x => x.closed) ? state.decks.map((x, i) => x.closed ? { label: x.name, fn: () => { x.closed = false; switchDeck(i); render(); } } : null).filter(Boolean) : [{ label: 'nenhum fechado', disabled: true }] }, '-',
    { label: 'Limpar clipes', fn: () => clearDeck(di) },
    { label: 'Remover', disabled: state.decks.length <= 1, fn: () => removeDeck(di) }]; } },
  { label: 'Grupo', items: () => { const li = selL(), L = state.layers[li], g = selectedGroup(), gi = g ? groupLayers(g) : []; return [
    { label: 'Novo (com a camada selecionada)', disabled: L.group != null, fn: () => newGroup(li) },
    { label: 'Inserir acima', fn: () => { const at = g ? gi[0] : li; insertLayer(at); newGroup(at); } },
    { label: 'Inserir abaixo', fn: () => { const at = g ? gi[gi.length - 1] + 1 : li + 1; insertLayer(at); newGroup(at); } },
    { label: 'Duplicar', disabled: !g, fn: () => duplicateGroup(g) },
    { label: 'Renomear…', disabled: !g, fn: async () => { const n = await askText('Renomear grupo', 'Nome', g.name); if (n) { g.name = n; render(); } } },
    { label: 'Cor', disabled: !g, sub: () => COLORS.map(([v, tx]) => ({ label: tx, check: (g.color || '') === v, fn: () => { g.color = v; render(); } })) }, '-',
    { label: 'Copiar efeitos', disabled: !g, fn: () => { fxClipboard = fxCopy(g.fx); toast(fxClipboard.length + ' efeito(s) copiado(s)'); } },
    { label: 'Colar efeitos', disabled: !g || !fxClipboard, fn: () => { g.fx.push(...fxCopy(fxClipboard)); panels.render(); } }, '-',
    { label: 'Recolher', disabled: !g, check: !!(g && g.folded), fn: () => { g.folded = !g.folded; render(); } },
    { label: 'Adicionar camada', disabled: !g, fn: () => addLayerToGroup(g) },
    { label: 'Ignorar disparo de coluna', disabled: !g, check: !!(g && g.ignoreColumn), fn: () => { g.ignoreColumn = !g.ignoreColumn; } },
    { label: 'Disparar primeira coluna ao abrir', disabled: !g, check: !!(g && g.firstCol), fn: () => { g.firstCol = !g.firstCol; } },
    { label: 'Travar conteúdo', disabled: !g, check: !!(g && g.lock), fn: () => { g.lock = !g.lock; } }, '-',
    { label: 'Limpar clipes', disabled: !g, fn: () => clearGroupClips(g) },
    { label: 'Remover grupo, manter camadas', disabled: !g, fn: () => removeGroup(g, false) },
    { label: 'Remover grupo e camadas', disabled: !g, fn: () => removeGroup(g, true) }]; } },
  { label: 'Camada', items: () => { const li = selL(), L = state.layers[li]; return [
    { label: 'Nova (por cima)', fn: () => insertLayer(0) },
    { label: 'Inserir acima', fn: () => insertLayer(li) },
    { label: 'Inserir abaixo', fn: () => insertLayer(li + 1) },
    { label: 'Duplicar', fn: () => duplicateLayer(li) },
    { label: 'Renomear…', fn: async () => { const n = await askText('Renomear camada', 'Nome', L.name); if (n) { L.name = n; render(); } } }, '-',
    { label: 'Copiar efeitos', fn: () => { fxClipboard = fxCopy(L.fx); toast(fxClipboard.length + ' efeito(s) copiado(s)'); } },
    { label: 'Colar efeitos', disabled: !fxClipboard, fn: () => { L.fx.push(...fxCopy(fxClipboard)); panels.render(); } }, '-',
    { label: 'Ignorar disparo de coluna', check: !!L.ignoreColumn, fn: () => { L.ignoreColumn = !L.ignoreColumn; } },
    { label: 'Solo', check: !!L.solo, fn: () => { L.solo = !L.solo; render(); } },
    { label: 'Grupo', sub: () => [{ label: 'Nenhum', check: L.group == null, fn: () => setLayerGroup(li, null) }, ...state.groups.map(g => ({ label: g.name, check: L.group === g.id, fn: () => setLayerGroup(li, g.id) })), '-', { label: 'Novo grupo com esta camada', disabled: L.group != null, fn: () => newGroup(li) }] },
    { label: 'Bus do crossfader', sub: () => [[null, 'Nenhum'], ['A', 'A'], ['B', 'B']].map(([v, tx]) => ({ label: tx, check: (L.bus || null) === v, fn: () => { L.bus = v; render(); } })) }, '-',
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
    { label: 'Crossfader', check: !$('xfade').hidden, fn: () => { $('xfade').hidden = !$('xfade').hidden; } },
    { label: 'Decks', check: !$('decks').hidden, fn: () => { $('decks').hidden = !$('decks').hidden; } }, '-',
    { label: 'Painel Composição', fn: () => { panels.tab = 'comp'; panels.render(); } },
    { label: 'Painel Camada', fn: () => { panels.tab = 'layer'; panels.render(); } },
    { label: 'Painel Grupo', disabled: !state.groups.length, fn: () => { panels.tab = 'group'; panels.render(); } }, '-',
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
  for (const L of state.layers) if (L.prev && now - L.prev.t0 >= L.prev.dur) { if (L.clips[L.on] !== L.prev.clip) C.stopClip(L.prev.clip); L.prev = null; }
  // transporte dos vídeos no ar: entrada/saída, modo e direção
  for (const L of state.layers) { const c = liveClip(L); if (c && c.kind === 'video') { if (C.tickTransport(c, dt, layerSpeed(L))) c.endedAt = now; } }
  tickXfade(now);
  panels.tick();
  // taxa de quadros da composição: desenha só quando passou 1/fps
  if (now - (loop.lastDraw || 0) < 1 / state.settings.fps - 0.0015) { tickAutopilot(now); requestAnimationFrame(loop); return; }
  loop.lastDraw = now; loop.frames = (loop.frames || 0) + 1;
  if (now - (loop.fpsAt || 0) >= 1) { if (!$('fpsBox').hidden) $('fpsBox').textContent = loop.frames + ' fps · ' + state.layers.filter(L => L.on >= 0).length + ' no ar · ' + COLS + ' colunas'; loop.frames = 0; loop.fpsAt = now; }
  // espelho do laser: o desenho do LaserCube vai para a projeção
  { const s = selectedCell(); for (const L of state.layers) { const c = liveClip(L); for (const m of [c, s && s.clip]) if (m && m.kind === 'lasermirror' && m.paintedAt !== now) { m.paintedAt = now; paintScan(m.el.getContext('2d'), 1080, 1080, laser.scanNow(now), false); m.rev++; } } }
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
window.projecionista = { menubar, settingsDialog, applySettings, insertColumn, removeColumn, duplicateColumn, insertLayer, duplicateLayer, copyClip, pasteClip, toggleTestCard, addDeck, switchDeck, removeDeck, duplicateDeck, newGroup, setLayerGroup, removeGroup, duplicateGroup, addLayerToGroup, fadeTo, cols: () => COLS, state, engine, putFiles, putSource, putText, putPath, prepareClip, trigger, eject, triggerColumn, moveClip, clearCell, render, ao, M, C, laser, putLaserClip, panels, browser, recorder, comps,
  probe: (pts) => engine.probe(state.layers, pts),
  probeScreen: (sc, pts) => engine.probeScreen(sc, state.layers, state.screens, pts),
  serialize: () => serializeComposition(state, laser, COLS), load: loadComposition, reset: resetComposition,
  screens: () => state.screens, setScreens, openOutputs, outWins: () => state.screens.map(sc => sc.win).filter(w => w && !w.closed) };
