// Projecionista — janela de controle.
// Estado: uma composição com camadas; cada camada tem uma casa por coluna e mostra um clipe
// por vez. Regras de uso (definidas pelo usuário em 2026-10-13):
//   - clicar na miniatura dispara o clipe; clicar no nome (rodapé) só seleciona e mostra a prévia;
//   - clicar numa casa vazia não abre nada: a camada fica preta;
//   - coluna dispara todas as camadas; a que não tem clipe naquela coluna fica preta;
//   - arquivo solto numa casa vira clipe guardado, sem ir para o ar;
//   - abrir o programa começa sempre do zero.
import { Engine, BLENDS, FITS } from './engine.js';
import * as M from './screens.js';
import { AdvancedOutput } from './ao.js';

const COLS = 8, COMP_W = 1920, COMP_H = 1080;
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

let seq = 1;
const mkLayer = (n) => ({ id: seq++, name: 'Camada ' + n, opacity: 1, blend: 'normal', bypass: false, on: -1, clips: Array(COLS).fill(null) });
const state = { layers: [mkLayer(3), mkLayer(2), mkLayer(1)], selLayer: 0, sel: null, files: [] };   // layers[0] = a de cima
let drag = null;

// o motor desenha num canvas escondido; o monitor da composição é um canvas 2D que recebe a cópia
const engine = new Engine(COMP_W, COMP_H);
const monCanvas = document.createElement('canvas'); monCanvas.width = COMP_W; monCanvas.height = COMP_H;
$('outScr').appendChild(monCanvas);
const monCtx = monCanvas.getContext('2d');
$('compInfo').textContent = COMP_W + '×' + COMP_H;

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }

// ---------- clipes ----------
// Lê o arquivo, mede o tamanho real e tira a miniatura na proporção do próprio arquivo.
function clipFromFile(file) {
  return new Promise((resolve, reject) => {
    const isVid = /^video\//.test(file.type) || /\.(mp4|webm|mov|m4v|mkv|ogv)$/i.test(file.name);
    const isImg = /^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(file.name);
    if (!isVid && !isImg) return reject(new Error('Solte vídeo ou imagem'));
    const url = URL.createObjectURL(file);
    const clip = { id: seq++, name: file.name, kind: isVid ? 'video' : 'image', url, file, w: 0, h: 0, dur: 0, fit: 'contain', speed: 1, thumb: '', el: null };
    if (isImg) {
      const im = new Image();
      im.onload = () => { clip.w = im.naturalWidth; clip.h = im.naturalHeight; clip.el = im; clip.thumb = url; resolve(clip); };
      im.onerror = () => reject(new Error('Não consegui abrir ' + file.name));
      im.src = url;
      return;
    }
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    let done = false;
    const fail = () => { if (!done) { done = true; reject(new Error('Não consegui abrir ' + file.name)); } };
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
    v.src = url;
  });
}
// cópia para outra casa: mesma mídia, elemento de vídeo próprio (cada casa toca por conta)
function cloneClip(c) {
  const n = { ...c, id: seq++ };
  if (c.kind === 'video') { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = c.url; v.playbackRate = c.speed; n.el = v; }
  return n;
}
function stopClip(c) { if (c && c.kind === 'video' && c.el) c.el.pause(); }
function startClip(c) { if (c && c.kind === 'video' && c.el) { try { c.el.currentTime = 0; } catch { } c.el.playbackRate = c.speed; c.el.play().catch(() => { }); } }

async function putFiles(li, col, files) {
  const L = state.layers[li]; let ok = 0;
  for (let i = 0; i < files.length && col + i < COLS; i++) {
    try {
      const clip = await clipFromFile(files[i]);
      const old = L.clips[col + i];
      if (old) { if (L.on === col + i) { stopClip(old); L.on = -1; } engine.drop(old.id); }
      L.clips[col + i] = clip; ok++;
      state.sel = { l: li, c: col + i };
    } catch (e) { toast(e.message); }
  }
  if (ok) render();
  return ok;
}
function trigger(li, col) {
  const L = state.layers[li], clip = L.clips[col];
  state.selLayer = li; state.sel = { l: li, c: col };
  if (!clip) return eject(li);                 // casa vazia: a camada fica preta
  if (L.on !== col) { stopClip(L.clips[L.on]); L.on = col; startClip(clip); }
  else if (clip.kind === 'video' && clip.el.paused) clip.el.play().catch(() => { });
  L.bypass = false;                            // disparar põe a camada no ar
  render();
}
function eject(li) { const L = state.layers[li]; stopClip(L.clips[L.on]); L.on = -1; render(); }
function triggerColumn(col) {
  state.layers.forEach((L, li) => {
    if (L.clips[col]) { if (L.on !== col) { stopClip(L.clips[L.on]); L.on = col; startClip(L.clips[col]); } L.bypass = false; }
    else { stopClip(L.clips[L.on]); L.on = -1; }
  });
  render();
}
function clearCell(li, col) {
  const L = state.layers[li], c = L.clips[col];
  if (!c) return;
  if (L.on === col) { stopClip(c); L.on = -1; }
  engine.drop(c.id); L.clips[col] = null;
  if (state.sel && state.sel.l === li && state.sel.c === col) state.sel = null;
  render();
}
function moveClip(fl, fc, tl, tc, copy) {
  if (fl === tl && fc === tc) return;
  const A = state.layers[fl], B = state.layers[tl], src = A.clips[fc], dst = B.clips[tc];
  if (!src) return;
  if (copy) {
    if (dst) { if (B.on === tc) { stopClip(dst); B.on = -1; } engine.drop(dst.id); }
    B.clips[tc] = cloneClip(src);
  } else {
    const aOn = A.on === fc, bOn = B.on === tc;
    B.clips[tc] = src; A.clips[fc] = dst || null;
    if (A === B) { if (aOn) A.on = tc; else if (bOn) A.on = dst ? fc : -1; }
    else {                                     // o que estava no ar numa camada não toca na outra
      if (aOn) { stopClip(src); A.on = -1; }
      if (bOn) { stopClip(dst); B.on = -1; }
    }
  }
  state.sel = { l: tl, c: tc };
  render();
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
    op.oninput = () => { L.opacity = op.value / 100; if (li === state.selLayer) renderPanels(); };
    lh.append(bb, el('div', 'nm', L.name), op);
    lh.onclick = () => { state.selLayer = li; render(); };
    g.appendChild(lh);
    for (let c = 0; c < COLS; c++) {
      const clip = L.clips[c], sel = state.sel && state.sel.l === li && state.sel.c === c;
      const cell = el('div', 'cell ' + (clip ? 'full' : 'empty') + (clip && L.on === c ? ' on' : '') + (sel ? ' sel' : ''));
      cell.dataset.layer = li; cell.dataset.col = c;
      if (clip) {
        const th = el('div', 'th'); if (clip.thumb) th.style.backgroundImage = 'url("' + clip.thumb + '")';
        const nm = el('div', 'nm', clip.name);
        cell.append(th, nm);
        cell.title = clip.name + ' · ' + clip.w + '×' + clip.h;
        cell.draggable = true;
        cell.ondragstart = (e) => { drag = { l: li, c }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', 'clip'); };
        cell.ondragend = () => { drag = null; };
        cell.oncontextmenu = (e) => { e.preventDefault(); clearCell(li, c); };
      } else cell.append(el('div', 'th'), el('div', 'nm', ' '));
      cell.onclick = (e) => {
        if (clip && e.target.classList.contains('nm')) { state.selLayer = li; state.sel = { l: li, c }; render(); return; }   // rodapé: só prévia
        trigger(li, c);
      };
      g.appendChild(cell);
    }
  });
  wrap.scrollTop = st; wrap.scrollLeft = sl;
  renderPanels();
}

// soltar na grade: arquivos do Windows, item do painel Arquivos ou clipe de outra casa
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
    const files = [...(e.dataTransfer.files || [])];
    if (files.length) putFiles(li, col, files);
    else if (d && d.file) putFiles(li, col, [d.file]);
    else if (d && d.l != null) moveClip(d.l, d.c, li, col, e.ctrlKey);
  });
  // soltar fora da grade não pode fazer a janela navegar para o arquivo
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => e.preventDefault());
})();

// ---------- painéis ----------
let prevKey = '';
const fmtT = (s) => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
function row(label, ...kids) { const r = el('div', 'row'); r.append(el('span', '', label), ...kids); return r; }
function renderPanels() {
  // prévia e painel do clipe: o selecionado; sem seleção, o que está no ar na camada selecionada
  let L = state.sel ? state.layers[state.sel.l] : null, clip = L ? L.clips[state.sel.c] : null;
  if (!clip) { L = state.layers[state.selLayer]; clip = L && L.on >= 0 ? L.clips[L.on] : null; }
  const key = clip ? clip.id : '';
  if (key !== prevKey) {
    prevKey = key;
    const p = $('prevScr'); p.textContent = '';
    if (clip && clip.kind === 'video') { const v = el('video'); v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.src = clip.url; p.appendChild(v); }
    else if (clip) { const im = el('img'); im.draggable = false; im.src = clip.url; p.appendChild(im); }
  }
  $('prevName').textContent = clip ? clip.w + '×' + clip.h + ' · ' + clip.name : '—';

  const cp = $('clipPan'); cp.textContent = '';
  if (!clip) cp.appendChild(el('div', 'vazio', 'Nenhum clipe selecionado. Clique no nome de um clipe para ver a prévia, ou na miniatura para pôr no ar.'));
  else {
    cp.appendChild(el('div', 'tit', clip.name));
    if (clip.kind === 'video') {
      const tr = el('div', 'tr');
      const b0 = el('button', '', '|◀'); b0.title = 'Voltar ao começo'; b0.onclick = () => { try { clip.el.currentTime = 0; } catch { } };
      const b1 = el('button', clip.el.paused ? '' : 'on', clip.el.paused ? '▶' : '‖'); b1.title = 'Tocar ou pausar';
      b1.onclick = () => { if (clip.el.paused) clip.el.play().catch(() => { }); else clip.el.pause(); setTimeout(renderPanels, 60); };
      tr.append(b0, b1); cp.appendChild(tr);
      const sp = el('input'); sp.type = 'range'; sp.min = 10; sp.max = 400; sp.value = Math.round(clip.speed * 100);
      const so = el('output', '', clip.speed.toFixed(1) + 'x');
      sp.oninput = () => { clip.speed = sp.value / 100; clip.el.playbackRate = clip.speed; so.textContent = clip.speed.toFixed(1) + 'x'; };
      sp.oncontextmenu = (e) => { e.preventDefault(); sp.value = 100; sp.oninput(); };
      cp.appendChild(row('Velocidade', sp, so));
    }
    const fit = el('select'); for (const k in FITS) { const o = el('option', '', FITS[k]); o.value = k; fit.appendChild(o); }
    fit.value = clip.fit; fit.onchange = () => { clip.fit = fit.value; };
    cp.appendChild(row('Ajuste na tela', fit));
    cp.appendChild(row('Tamanho', el('span', 'info', clip.w + ' × ' + clip.h + (clip.kind === 'video' && clip.dur ? '   ·   ' + fmtT(clip.dur) : ''))));
  }

  const lp = $('layerPan'); lp.textContent = '';
  const S = state.layers[state.selLayer];
  if (!S) return;
  lp.appendChild(el('div', 'tit', S.name));
  const op = el('input'); op.type = 'range'; op.min = 0; op.max = 100; op.value = Math.round(S.opacity * 100);
  const oo = el('output', '', Math.round(S.opacity * 100) + '%');
  op.oninput = () => { S.opacity = op.value / 100; oo.textContent = op.value + '%'; const r = document.querySelector('.lh[data-layer="' + state.selLayer + '"] input'); if (r) r.value = op.value; };
  lp.appendChild(row('Opacidade', op, oo));
  const bl = el('select'); for (const k in BLENDS) { const o = el('option', '', BLENDS[k]); o.value = k; bl.appendChild(o); }
  bl.value = S.blend; bl.onchange = () => { S.blend = bl.value; };
  lp.appendChild(row('Mistura', bl));
  if (state.layers.length > 1) {
    const rm = el('button', 'wide', 'Remover esta camada'); rm.type = 'button';
    rm.onclick = () => {
      S.clips.forEach(c => { if (c) { stopClip(c); engine.drop(c.id); } });
      state.layers.splice(state.selLayer, 1); state.sel = null; state.selLayer = Math.min(state.selLayer, state.layers.length - 1); render();
    };
    lp.appendChild(rm);
  }
}

// ---------- arquivos ----------
$('pick').onclick = () => { $('pickFile').value = ''; $('pickFile').click(); };
$('pickFile').onchange = () => {
  for (const f of $('pickFile').files) {
    state.files.push(f);
    const it = el('div', 'item'); it.draggable = true; it.title = f.name;
    const ic = el('i'); if (/^image\//.test(f.type)) ic.style.backgroundImage = 'url("' + URL.createObjectURL(f) + '")';
    it.append(ic, el('span', '', f.name));
    it.ondragstart = (e) => { drag = { file: f }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', 'file'); };
    it.ondragend = () => { drag = null; };
    $('fileList').appendChild(it);
  }
};

// ---------- telas e saídas ----------
// Cada tela (ver screens.js) tem o seu canvas 2D; a janela de saída dela recebe o stream
// desse canvas. O motor só desenha as telas que estão abertas ou abertas no editor.
state.screens = M.defaultScreens(COMP_W, COMP_H);
let displays = [];
if (window.projDesktop) window.projDesktop.displays().then(d => { displays = d; renderScreens(); }).catch(() => { });

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
}
setInterval(renderScreens, 1000);

const ao = new AdvancedOutput({
  compW: COMP_W, compH: COMP_H, compCanvas: monCanvas,
  screens: () => state.screens, setScreens, layers: () => state.layers, screenCanvas,
  onChange: renderScreens, helpers, toast,
  displays: () => displays, displayLabel: (id) => (displays.find(d => d.id === id) || {}).label,
  presets: window.projDesktop ? window.projDesktop.presets : null,
});
$('btnAO').onclick = () => ao.show();

// ---------- laço de desenho ----------
(function loop() {
  engine.render(state.layers, engine.neededLayers(state.screens));
  engine.blit(monCtx);
  for (const sc of state.screens) {
    const open = sc.win && !sc.win.closed;
    if (!open && !(ao.open && ao.curScreen() === sc)) continue;
    screenCanvas(sc);
    engine.renderScreen(sc, state.layers, state.screens);
    engine.blit(sc.ctx, sc.w, sc.h);
  }
  ao.frame();
  requestAnimationFrame(loop);
})();

render();

// usado pelo teste automático (tools/selftest-main.js); não é interface de usuário
window.projecionista = { state, engine, putFiles, trigger, eject, triggerColumn, moveClip, clearCell, render, ao, M,
  probe: (pts) => engine.probe(state.layers, pts),
  probeScreen: (sc, pts) => engine.probeScreen(sc, state.layers, state.screens, pts),
  screens: () => state.screens, setScreens, openOutputs, outWins: () => state.screens.map(sc => sc.win).filter(w => w && !w.closed) };
