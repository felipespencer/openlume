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
import { AUTOPILOT, serializeComposition, deserializeComposition } from './composition.js';
import { initSplitters } from './splitters.js';
import { paintScan } from './laser-model.js';

const COLS = 8, COMP_W = 1920, COMP_H = 1080;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const D = window.projDesktop || null;

let seq = 1;
const mkLayer = (n) => ({ id: seq++, name: typeof n === 'string' ? n : 'Camada ' + n, opacity: 1, blend: 'normal', bypass: false, on: -1, clips: Array(COLS).fill(null), autopilot: AUTOPILOT(), fx: [], transform: IDENT_TR(), transition: 0, prev: null });
const state = { name: '', layers: [mkLayer(3), mkLayer(2), mkLayer(1)], selLayer: 0, sel: null, master: 1, opacity: 1, speed: 1, compAutopilot: AUTOPILOT() };   // layers[0] = a de cima
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
  const L = state.layers[li], old = L.clips[col];
  if (old) { if (L.on === col) { C.stopClip(old); L.on = -1; } engine.drop(old.id); }
  L.clips[col] = clip; state.sel = { l: li, c: col }; render();
}
async function putFiles(li, col, files) {
  const L = state.layers[li]; let ok = 0;
  for (let i = 0; i < files.length && col + i < COLS; i++) {
    try { putClip(li, col + i, await C.clipFromFile(files[i], D ? D.pathOf : null)); ok++; } catch (e) { toast(e.message); }
  }
  return ok;
}
async function putPath(li, col, path, name) { try { putClip(li, col, await C.clipFromPath(path, name)); return true; } catch (e) { toast(e.message); return false; } }
function putSource(li, col, id) { const c = C.sourceClip(id); if (c) putClip(li, col, c); return c; }
function putText(li, col, text) { const c = C.textClip(text); putClip(li, col, c); return c; }
async function putCamera(li, col, cam) { try { putClip(li, col, await C.cameraClip(cam.id, cam.label)); } catch (e) { toast('Câmera: ' + e.message); } }
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
    if (L.clips[col] && L.clips[col].ignoreColumn) return;   // a casa ignora o disparo de coluna
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
  engine.drop(c.id); L.clips[col] = null;
  if (state.sel && state.sel.l === li && state.sel.c === col) state.sel = null;
  render();
}
function moveClip(fl, fc, tl, tc, copy) {
  if (fl === tl && fc === tc) return;
  const A = state.layers[fl], B = state.layers[tl], src = A.clips[fc], dst = B.clips[tc];
  if (!src) return;
  if (copy) {
    if (dst) { if (B.on === tc) { C.stopClip(dst); B.on = -1; } engine.drop(dst.id); }
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
function removeLayer(li) {
  const L = state.layers[li]; if (state.layers.length <= 1) return;
  L.clips.forEach(c => { if (c) { C.stopClip(c); engine.drop(c.id); } });
  state.layers.splice(li, 1); state.sel = null; state.selLayer = Math.min(state.selLayer, state.layers.length - 1); render();
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
    const b = el('button', 'gh col', 'Coluna ' + (c + 1)); b.type = 'button'; b.dataset.col = c;
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
  compW: COMP_W, compH: COMP_H, compCanvas: monCanvas,
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
  for (const L of state.layers) for (const c of L.clips) if (c) { C.stopClip(c); engine.drop(c.id); }
  state.layers = [mkLayer(3), mkLayer(2), mkLayer(1)]; state.name = ''; state.sel = null; state.selLayer = 0; state.master = state.opacity = state.speed = 1; engine.master = 1;
  engine.compFx = []; engine.compTransform = IDENT_TR(); state.compAutopilot = AUTOPILOT(); render(); renderScreens();
}
async function loadComposition(json, name) {
  const d = await deserializeComposition(json, { mkLayer, toast, laserClip: (f) => C.laserClip(f, laser.thumbSvg(f)) });
  for (const L of state.layers) for (const c of L.clips) if (c) { C.stopClip(c); engine.drop(c.id); }
  state.layers = d.layers.length ? d.layers : [mkLayer(1)]; state.name = name || d.name || ''; state.sel = null; state.selLayer = 0;
  state.master = d.master; state.opacity = 1; state.speed = d.speed; engine.master = state.master; engine.compFx = d.compFx; state.compAutopilot = d.compAutopilot;
  for (const L of state.layers) if (L.on >= 0 && L.clips[L.on]) C.startClip(L.clips[L.on], state.speed); else L.on = -1;
  if (d.screens && d.screens.length) setScreens(d.screens);
  if (d.laser) { laser.frames = d.laser.frames; laser.settings = d.laser.settings; laser.active = d.laser.active; laser.sel = laser.frames[0] || null; if (laser.open) laser.refresh(); }
  if (d.missing) toast(d.missing + (d.missing === 1 ? ' clipe não abriu' : ' clipes não abriram') + ' (arquivo faltando)');
  render(); renderScreens();
}

// ---------- painéis e navegador ----------
const panels = new Panels({
  state, engine, laser, toast, renderGrid: render, selectedClip, drag: () => drag, trigger, removeLayer, applySpeed,
  openLaser: (f) => { laser.sel = f; laser.show(); },
});
const recorder = new Recorder({ compCanvas: monCanvas, screens: () => state.screens, screenCanvas, desktop: D, toast, onChange: () => { if (browser.tab === 'rec') browser.render(); }, dir: window.__recDir || '' });
const browser = new Browser({
  desktop: D, toast, setDrag: (d) => { drag = d; }, preview: previewFile, recorder, comps,
  putInSelection: (d) => { const s = state.sel || { l: state.selLayer, c: 0 }; const col = state.sel ? s.c : state.layers[s.l].clips.findIndex(c => !c); dropInto(s.l, col < 0 ? 0 : col, d, null, false); },
  addEffectToSelection: (id) => { const c = selectedClip(); if (!c) { toast('Selecione um clipe primeiro'); return; } c.fx.push(mkFx(id)); render(); },
});

// ---------- divisórias ----------
(async () => {
  let prefs = {}; if (D) { try { prefs = await D.prefs.get(); } catch { } }
  initSplitters(prefs).onSave((sizes) => { if (D) D.prefs.get().then(p => D.prefs.set({ ...p, sizes })).catch(() => { }); });
})();

// ---------- laço de desenho ----------
function loop() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (loop.last || now)); loop.last = now;
  for (const L of state.layers) if (L.prev && now - L.prev.t0 >= L.prev.dur) { C.stopClip(L.prev.clip); L.prev = null; }
  // transporte dos vídeos no ar: entrada/saída, modo e direção
  for (const L of state.layers) { const c = L.on >= 0 ? L.clips[L.on] : null; if (c && c.kind === 'video') { if (C.tickTransport(c, dt, state.speed)) c.endedAt = now; } }
  panels.tick();
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
window.projecionista = { state, engine, putFiles, putSource, putText, putPath, trigger, eject, triggerColumn, moveClip, clearCell, render, ao, M, C, laser, putLaserClip, panels, browser, recorder, comps,
  probe: (pts) => engine.probe(state.layers, pts),
  probeScreen: (sc, pts) => engine.probeScreen(sc, state.layers, state.screens, pts),
  serialize: () => serializeComposition(state, laser, COLS), load: loadComposition, reset: resetComposition,
  screens: () => state.screens, setScreens, openOutputs, outWins: () => state.screens.map(sc => sc.win).filter(w => w && !w.closed) };
