// Editor da Saída avançada. Segue a maquete advanced-output-mockup.html: telas à esquerda,
// o palco no meio (aba Entrada: a composição com os recortes; aba Saída: a tela do projetor
// com as formas deformadas e as máscaras) e as propriedades do item selecionado à direita.
import * as M from './screens.js';
import { outlinePath, meshLinesPath, bbox } from './warp.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const COLORS = ['#6EC1FF', '#FF7B9C', '#7BD88F', '#C792EA', '#FFB02E', '#F5D742'];
const fmt1 = (x) => x.toFixed(1).replace('.', ',');
const fmt2 = (x) => x.toFixed(2).replace('.', ',');

export class AdvancedOutput {
  // ctx: { compW, compH, compCanvas, screens(), setScreens(list), layers(), screenCanvas(sc), onChange(), openOutputs(), helpers }
  constructor(ctx) {
    this.c = ctx;
    this.open = false; this.tab = 'in'; this.mode = 'move'; this.snap = false; this.grid = true; this.zoom = 'fit';
    this.sel = null;          // { screen, item } — item pode ser null (tela selecionada)
    this.selPt = -1;          // ponto da malha selecionado
    this.drawing = null;      // { kind:'mask'|'inmask', pts:[] }
    this.closed = new Set(); // grupos recolhidos
    this.cursor = null; this.drag = null; this.scale = 1;
    this.snapshot = '';
    this.presetName = '';
    this.build();
  }

  // ---------- estrutura ----------
  build() {
    const root = $('ao');
    root.innerHTML = `
      <div id="aoTop"><span class="logo">PROJECIO<b>NISTA</b></span><span class="tit">Saída avançada</span><span class="sp"></span>
        <span class="preset">Preset <select id="aoPresetSel"></select><input id="aoPresetName" placeholder="nome do preset"><button id="aoPresetSave" type="button">Salvar</button><button id="aoPresetDel" type="button" title="Apaga o preset escolhido">✕</button></span></div>
      <div id="aoTools">
        <div class="tabs"><button type="button" id="aoTabIn">Entrada</button><button type="button" id="aoTabOut">Saída</button></div><div class="sep"></div>
        <button type="button" id="aoMove" title="Mover, girar e redimensionar o slice inteiro">Transformar</button>
        <button type="button" id="aoPts" title="Mexer em cada ponto da malha (T alterna)">Pontos</button><div class="sep"></div>
        <button type="button" id="aoSnap" title="Grudar nas bordas de outros slices e da tela">Ímã</button>
        <button type="button" id="aoGrid" title="Mostrar a borda do slice e o cursor na saída">Grade</button>
        <button type="button" id="aoIdent" title="Mostra o nome de cada tela e slice no projetor">Identificar</button><div class="sep"></div>
        <span>Zoom <select id="aoZoom"><option value="fit">Ajustar</option><option value="0.5">50%</option><option value="1">100%</option><option value="2">200%</option></select></span>
        <span class="info" id="aoInfo"></span></div>
      <div id="aoMain">
        <div id="aoTree"><div class="hd"><span>Telas</span><button type="button" id="aoAdd">+ Adicionar ▾</button><div id="aoAddMenu" hidden>
          <button type="button" data-add="screen">Tela</button><button type="button" data-add="slice">Slice na tela</button>
          <button type="button" data-add="maskRect">Máscara retângulo</button><button type="button" data-add="maskCircle">Máscara círculo</button><button type="button" data-add="maskDraw">Desenhar máscara</button></div></div>
          <div id="aoList"></div>
          <div class="dica">Uma tela é um projetor. Cada slice recorta um pedaço da composição (aba Entrada) e o encaixa na superfície (aba Saída).</div></div>
        <div id="aoStage"><div id="aoView"><canvas id="aoCv"></canvas><svg id="aoSvg"></svg></div>
          <div class="legend" id="aoLegend"></div></div>
        <div id="aoProps"></div>
      </div>`;
    this.cv = $('aoCv'); this.cx = this.cv.getContext('2d'); this.svg = $('aoSvg'); this.view = $('aoView');
    $('aoTabIn').onclick = () => this.setTab('in'); $('aoTabOut').onclick = () => this.setTab('out');
    $('aoMove').onclick = () => this.setMode('move'); $('aoPts').onclick = () => this.setMode('pts');
    $('aoSnap').onclick = () => { this.snap = !this.snap; this.syncTools(); };
    $('aoGrid').onclick = () => { this.grid = !this.grid; this.syncTools(); };
    $('aoIdent').onclick = () => this.identify();
    $('aoZoom').onchange = () => { this.zoom = $('aoZoom').value; this.layout(); };
    $('aoAdd').onclick = (e) => { e.stopPropagation(); $('aoAddMenu').hidden = !$('aoAddMenu').hidden; };
    $('aoAddMenu').onclick = (e) => { const b = e.target.closest('button'); if (b) { $('aoAddMenu').hidden = true; this.add(b.dataset.add); } };
    addEventListener('click', () => { $('aoAddMenu').hidden = true; });
    $('aoPresetSel').onchange = () => this.loadPreset($('aoPresetSel').value);
    $('aoPresetSave').onclick = () => this.savePreset();
    $('aoPresetDel').onclick = () => this.deletePreset();
    this.svg.addEventListener('pointerdown', (e) => this.down(e));
    this.svg.addEventListener('pointermove', (e) => this.move(e));
    addEventListener('pointerup', (e) => this.up(e));
    this.svg.addEventListener('dblclick', (e) => this.dbl(e));
    this.svg.addEventListener('pointerleave', () => { this.cursor = null; });
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => this.key(e));
    addEventListener('resize', () => { if (this.open) this.layout(); });
    this.syncTools();
  }

  // ---------- abrir e fechar ----------
  show() {
    this.open = true; $('ao').hidden = false;
    this.snapshot = M.serialize(this.c.screens());
    const sc = this.c.screens()[0];
    const sl = sc && sc.items.find(i => i.type === 'slice');
    this.sel = sc ? { screen: sc, item: sl || null } : null;
    this.refreshPresets();
    this.setTab('in'); this.layout(); this.refresh();
  }
  hide(cancel) {
    if (cancel) { this.c.setScreens(M.deserialize(this.snapshot)); }
    this.open = false; $('ao').hidden = true; this.drawing = null; this.cursor = null;
    this.c.helpers.clear(); this.c.onChange();
  }
  screens() { return this.c.screens(); }
  curScreen() { return this.sel ? this.sel.screen : this.screens()[0]; }

  // ---------- ferramentas ----------
  setTab(t) { this.tab = t; this.selPt = -1; this.drawing = null; this.syncTools(); this.layout(); this.refresh(); }
  setMode(m) { this.mode = m; this.selPt = -1; this.syncTools(); this.draw(); }
  syncTools() {
    $('aoTabIn').classList.toggle('on', this.tab === 'in'); $('aoTabOut').classList.toggle('on', this.tab === 'out');
    $('aoMove').classList.toggle('on', this.mode === 'move'); $('aoPts').classList.toggle('on', this.mode === 'pts');
    $('aoSnap').classList.toggle('on', this.snap); $('aoGrid').classList.toggle('on', this.grid);
    $('aoZoom').value = this.zoom;
    const sc = this.curScreen();
    $('aoInfo').textContent = this.tab === 'in'
      ? `Composição ${this.c.compW}×${this.c.compH} · arraste o slice para escolher qual pedaço da composição ele mostra`
      : sc ? `${sc.name} ${sc.w}×${sc.h} · puxe os pontos até a imagem encaixar na superfície` : '';
  }
  identify() {
    for (const sc of this.screens()) {
      const slices = sc.items.filter(i => i.type === 'slice' && i.enabled).map(s => { const r = M.outRect(s); return { name: s.name, x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
      this.c.helpers.set(sc, { identify: { name: sc.name, slices } });
    }
    clearTimeout(this.identT); this.identT = setTimeout(() => this.c.helpers.clear(), 3000);
  }
  key(e) {
    if (!this.open || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') { if (this.drawing) { this.drawing = null; this.draw(); } else this.hide(true); }
    else if (e.key === 't' || e.key === 'T') this.setMode(this.mode === 'move' ? 'pts' : 'move');
    else if (e.key === 'Enter' && this.drawing) this.finishDrawing();
    else if (e.key === 'Delete' && this.sel && this.sel.item) this.removeItem(this.sel.item);
  }

  // ---------- tamanho do palco ----------
  stageSize() { const sc = this.curScreen(); return this.tab === 'in' ? [this.c.compW, this.c.compH] : sc ? [sc.w, sc.h] : [1920, 1080]; }
  layout() {
    const [W, H] = this.stageSize(), st = $('aoStage');
    let k = this.zoom === 'fit' ? Math.min((st.clientWidth - 80) / W, (st.clientHeight - 80) / H) : +this.zoom;
    if (!(k > 0)) k = 1;
    this.scale = k;
    this.view.style.width = W * k + 'px'; this.view.style.height = H * k + 'px';
    this.cv.width = W; this.cv.height = H; this.cv.style.width = W * k + 'px'; this.cv.style.height = H * k + 'px';
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`); this.svg.style.width = W * k + 'px'; this.svg.style.height = H * k + 'px';
    this.draw();
  }
  // chamado a cada quadro pelo app: copia a imagem viva para o palco
  frame() {
    if (!this.open) return;
    const src = this.tab === 'in' ? this.c.compCanvas : this.c.screenCanvas(this.curScreen());
    if (src && src.width) this.cx.drawImage(src, 0, 0, this.cv.width, this.cv.height);
    this.publishHelpers();
  }
  publishHelpers() {
    const sc = this.curScreen(); if (!sc) return;
    const h = {};
    if (this.grid && this.tab === 'out') {
      const it = this.sel && this.sel.item;
      if (it && it.type === 'slice') h.grid = { name: it.name, outline: outlinePoints(it) };
      if (this.cursor) h.cursor = this.cursor;
    }
    this.c.helpers.set(sc, h.grid || h.cursor ? h : null);
  }

  // ---------- coordenadas e alvos ----------
  pt(e) { const r = this.svg.getBoundingClientRect(); const [W, H] = this.stageSize(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  itemsOnStage() {
    // Entrada: todos os slices de todas as telas ligadas; Saída: só os itens da tela atual
    if (this.tab === 'in') return this.screens().flatMap(sc => sc.enabled ? sc.items.filter(i => i.type === 'slice' && i.enabled).map(i => ({ screen: sc, item: i })) : []);
    const sc = this.curScreen(); return sc ? sc.items.filter(i => i.enabled).map(i => ({ screen: sc, item: i })) : [];
  }
  colorOf(item) {
    const all = this.screens().flatMap(sc => sc.items);
    const k = all.filter(i => i.type === 'slice').indexOf(item);
    return item.type === 'mask' ? '#F5D742' : COLORS[(k < 0 ? 0 : k) % COLORS.length];
  }
  select(screen, item) { this.sel = { screen, item }; this.selPt = -1; this.syncTools(); if (this.tab === 'out') this.layout(); this.refresh(); }

  // ---------- desenho do palco ----------
  draw() {
    const svg = this.svg; svg.textContent = '';
    const [W, H] = this.stageSize();
    const it = this.sel && this.sel.item, on = this.itemsOnStage();
    const legend = [];
    // emendas (Entrada): a região onde dois slices com soft edge se cobrem
    if (this.tab === 'in') {
      const sl = on.map(o => o.item);
      for (let i = 0; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) {
        const A = sl[i], B = sl[j]; if (!A.soft.on || !B.soft.on || A.source !== B.source) continue;
        const x0 = Math.max(A.in.x, B.in.x), x1 = Math.min(A.in.x + A.in.w, B.in.x + B.in.w), y0 = Math.max(A.in.y, B.in.y), y1 = Math.min(A.in.y + A.in.h, B.in.y + B.in.h);
        if (x1 <= x0 || y1 <= y0) continue;
        svg.appendChild(svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: 'blend' }));
        const t = svgEl('text', { x: (x0 + x1) / 2, y: (y0 + y1) / 2, class: 'blendTxt', 'text-anchor': 'middle' });
        t.textContent = 'emenda ' + Math.round(Math.min(x1 - x0, y1 - y0)) + ' px'; svg.appendChild(t);
      }
    }
    for (const { screen, item } of on) {
      const col = this.colorOf(item), sel = item === it;
      legend.push([col, item.name]);
      if (this.tab === 'in') {
        const r = item.in, g = svgEl('g', { transform: `rotate(${r.rot} ${r.x + r.w / 2} ${r.y + r.h / 2})` });
        g.appendChild(svgEl('rect', { x: r.x, y: r.y, width: r.w, height: r.h, class: 'slice' + (sel ? ' sel' : ''), stroke: col, fill: col, 'data-k': 'body', 'data-id': item.id }));
        const t = svgEl('text', { x: r.x + 8, y: r.y + 18, class: 'sname', fill: col }); t.textContent = `${item.name} · ${Math.round(r.w)}×${Math.round(r.h)}`; g.appendChild(t);
        svg.appendChild(g);
        if (sel && item.inMask) this.drawPoly(item.inMask.pts.map(p => localToIn(item, p)), '#F5D742', 'inmask', this.mode === 'pts');
        if (sel && this.mode === 'move') this.drawHandles(r, item);
      } else if (item.type === 'slice') {
        if (item.warp.mode === 'mesh') svg.appendChild(svgEl('path', { d: meshLinesPath(item), class: 'mesh' }));
        svg.appendChild(svgEl('path', { d: outlinePath(item), class: 'slice' + (sel ? ' sel' : ''), stroke: col, fill: col, 'data-k': 'body', 'data-id': item.id }));
        const b = M.outRect(item), t = svgEl('text', { x: b.x + 8, y: b.y - 6, class: 'sname', fill: col }); t.textContent = item.name; svg.appendChild(t);
        if (sel && this.mode === 'move') this.drawHandles(b, item);
        if (sel && this.mode === 'pts') this.drawMeshPoints(item);
      } else {
        this.drawPoly(item.pts, '#F5D742', 'mask', this.mode === 'pts', item);
        const b = bbox(item.pts), t = svgEl('text', { x: b.x + 8, y: b.y + 16, class: 'mname' }); t.textContent = item.name; svg.appendChild(t);
      }
    }
    if (this.drawing) {
      const pts = this.drawing.kind === 'inmask' ? this.drawing.pts.map(p => localToIn(it, p)) : this.drawing.pts;
      if (pts.length) svg.appendChild(svgEl('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'drawing' }));
      pts.forEach(p => svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 5, class: 'hd' })));
    }
    if (this.grid && this.tab === 'out' && this.cursor) {
      svg.appendChild(svgEl('line', { x1: 0, y1: this.cursor[1], x2: W, y2: this.cursor[1], class: 'cursor' }));
      svg.appendChild(svgEl('line', { x1: this.cursor[0], y1: 0, x2: this.cursor[0], y2: H, class: 'cursor' }));
    }
    // o texto é desenhado em pixels da tela; compensa o zoom para ficar sempre legível
    const fs = 13 / this.scale;
    svg.querySelectorAll('text').forEach(t => t.setAttribute('font-size', fs));
    const lg = $('aoLegend'); lg.textContent = '';
    for (const [c, n] of legend) { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, n); lg.appendChild(s); }
    const s = el('span'); const i = el('i'); i.style.background = '#39FF14'; s.append(i, 'Pontos e alças'); lg.appendChild(s);
  }
  drawHandles(r, item) {
    const H = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]];
    H.forEach(([fx, fy], k) => this.svg.appendChild(svgEl('rect', { x: r.x + r.w * fx - 5, y: r.y + r.h * fy - 5, width: 10, height: 10, class: 'hd', 'data-k': 'resize', 'data-i': k, 'data-id': item.id })));
  }
  drawMeshPoints(item) {
    const w = item.warp, svg = this.svg;
    if (w.mode === 'mesh' && w.curve && this.selPt >= 0) {
      const a = w.pts[this.selPt];
      for (const h of M.handlesOf(item, this.selPt)) {
        const p = w.pts[h];
        svg.appendChild(svgEl('line', { x1: a[0], y1: a[1], x2: p[0], y2: p[1], class: 'handle' }));
        svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 5, class: 'hd', 'data-k': 'handle', 'data-i': h, 'data-id': item.id }));
      }
    }
    w.pts.forEach((p, i) => {
      if (!M.isAnchor(item, i)) return;
      svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: i === this.selPt ? 7 : 6, class: 'hd anc' + (i === this.selPt ? ' cur' : ''), 'data-k': 'anchor', 'data-i': i, 'data-id': item.id }));
    });
  }
  drawPoly(pts, col, kind, points, item) {
    const attrs = { points: pts.map(p => p.join(',')).join(' '), class: kind, stroke: col, fill: col };
    if (item) { attrs['data-k'] = 'body'; attrs['data-id'] = item.id; }
    this.svg.appendChild(svgEl('polygon', attrs));
    if (points) pts.forEach((p, i) => this.svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 5, class: 'hd', 'data-k': kind + 'pt', 'data-i': i, 'data-id': item ? item.id : '' })));
  }

  // ---------- interação ----------
  findItem(id) { for (const sc of this.screens()) for (const it of sc.items) if (it.id == id) return { screen: sc, item: it }; return null; }
  down(e) {
    if (e.button !== 0) return;
    const p = this.pt(e);
    if (this.drawing) { this.drawing.pts.push(this.drawing.kind === 'inmask' ? inToLocal(this.sel.item, p) : p); this.draw(); return; }
    const t = e.target, k = t.dataset && t.dataset.k;
    if (!k) { if (this.sel) { this.sel = { screen: this.sel.screen, item: null }; this.selPt = -1; this.refresh(); } return; }
    const found = this.findItem(t.dataset.id) || this.sel;
    if (found.item !== (this.sel && this.sel.item)) this.select(found.screen, found.item);
    const it = found.item;
    this.svg.setPointerCapture(e.pointerId);
    const d = this.drag = { k, i: +t.dataset.i, it, last: p, start: p };
    if (k === 'anchor') { this.selPt = d.i; this.draw(); }
    if (k === 'resize') d.rect = this.tab === 'in' ? { ...it.in } : M.outRect(it);
    if (k === 'body' && this.tab === 'in') d.rect = { ...it.in };
    if (k === 'body' && this.tab === 'out') d.rect = it.type === 'slice' ? M.outRect(it) : bbox(it.pts);
  }
  move(e) {
    const p = this.pt(e);
    this.cursor = this.tab === 'out' ? p : null;
    if (this.drawing) { this.draw(); return; }
    const d = this.drag; if (!d) { if (this.grid && this.tab === 'out') this.draw(); return; }
    const it = d.it, dx = p[0] - d.last[0], dy = p[1] - d.last[1];
    if (d.k === 'body') {
      let tx = p[0] - d.start[0], ty = p[1] - d.start[1];
      let r = { x: d.rect.x + tx, y: d.rect.y + ty, w: d.rect.w, h: d.rect.h };
      if (this.snap) r = this.snapRect(r, it);
      if (it.type === 'mask') { const b = bbox(it.pts); M.touch(it); it.pts.forEach(q => { q[0] += r.x - b.x; q[1] += r.y - b.y; }); }
      else if (this.tab === 'in') { it.in.x = r.x; it.in.y = r.y; M.touch(it); }
      else M.fitOutRect(it, r);
    } else if (d.k === 'resize') {
      const H = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]][d.i];
      const r0 = d.rect, tx = p[0] - d.start[0], ty = p[1] - d.start[1];
      let x0 = r0.x, y0 = r0.y, x1 = r0.x + r0.w, y1 = r0.y + r0.h;
      if (H[0] === 0) x0 += tx; if (H[0] === 1) x1 += tx; if (H[1] === 0) y0 += ty; if (H[1] === 1) y1 += ty;
      let r = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(8, Math.abs(x1 - x0)), h: Math.max(8, Math.abs(y1 - y0)) };
      if (this.snap) r = this.snapRect(r, it, true);
      if (this.tab === 'in') { Object.assign(it.in, r); M.touch(it); } else M.fitOutRect(it, r);
    } else if (d.k === 'anchor') M.moveAnchor(it, d.i, dx, dy);
    else if (d.k === 'handle') M.moveHandle(it, d.i, dx, dy);
    else if (d.k === 'maskpt') { it.pts[d.i][0] += dx; it.pts[d.i][1] += dy; M.touch(it); }
    else if (d.k === 'inmaskpt') { const q = inToLocal(it, p); it.inMask.pts[d.i] = q; it.inMask.rev++; M.touch(it); }
    d.last = p;
    this.draw(); this.renderProps(); this.c.onChange();
  }
  up(e) { if (this.drag) { this.drag = null; try { this.svg.releasePointerCapture(e.pointerId); } catch { } } }
  dbl(e) {
    if (this.drawing) { this.finishDrawing(); return; }
    const t = e.target; if (t.dataset && t.dataset.k === 'anchor') { const it = this.sel.item; const r = M.outRect(it); M.resetWarp(it); M.fitOutRect(it, r); this.draw(); this.c.onChange(); }
  }
  // Ímã: borda do retângulo gruda nas bordas dos outros itens e da tela
  snapRect(r, it, resizing) {
    const [W, H] = this.stageSize(), tol = 8 / this.scale, xs = [0, W], ys = [0, H];
    for (const { item } of this.itemsOnStage()) {
      if (item === it) continue;
      const b = this.tab === 'in' ? item.in : item.type === 'slice' ? M.outRect(item) : bbox(item.pts);
      xs.push(b.x, b.x + b.w); ys.push(b.y, b.y + b.h);
    }
    const near = (v, arr) => { let best = null; for (const a of arr) if (Math.abs(a - v) < tol && (best === null || Math.abs(a - v) < Math.abs(best - v))) best = a; return best; };
    const l = near(r.x, xs), rr = near(r.x + r.w, xs), t = near(r.y, ys), b = near(r.y + r.h, ys);
    if (resizing) { if (l !== null) { r.w += r.x - l; r.x = l; } else if (rr !== null) r.w = rr - r.x; if (t !== null) { r.h += r.y - t; r.y = t; } else if (b !== null) r.h = b - r.y; }
    else { if (l !== null) r.x = l; else if (rr !== null) r.x = rr - r.w; if (t !== null) r.y = t; else if (b !== null) r.y = b - r.h; }
    return r;
  }
  finishDrawing() {
    const d = this.drawing; this.drawing = null;
    if (d && d.pts.length >= 3) {
      if (d.kind === 'inmask') { this.sel.item.inMask = { pts: d.pts, invert: false, rev: 1 }; M.touch(this.sel.item); }
      else { const sc = this.curScreen(); const m = M.mkMask('Máscara ' + (sc.items.filter(i => i.type === 'mask').length + 1), d.pts); sc.items.push(m); this.sel = { screen: sc, item: m }; }
    }
    this.c.onChange(); this.refresh();
  }

  // ---------- adicionar e remover ----------
  add(kind) {
    const sc = this.curScreen(); const W = this.c.compW, H = this.c.compH;
    if (kind === 'screen') {
      const n = M.mkScreen('Tela ' + (this.screens().length + 1), { w: W, h: H });
      n.items.push(M.mkSlice('Slice 1', { x: 0, y: 0, w: W, h: H }, { x: 0, y: 0, w: W, h: H }));
      this.screens().push(n); this.sel = { screen: n, item: n.items[0] };
    } else if (!sc) return;
    else if (kind === 'slice') {
      const k = sc.items.filter(i => i.type === 'slice').length + 1;
      const s = M.mkSlice('Slice ' + k, { x: W / 4, y: H / 4, w: W / 2, h: H / 2 }, { x: sc.w / 4, y: sc.h / 4, w: sc.w / 2, h: sc.h / 2 });
      sc.items.push(s); this.sel = { screen: sc, item: s };
    } else if (kind === 'maskRect' || kind === 'maskCircle') {
      const m = M.mkMask('Máscara ' + (sc.items.filter(i => i.type === 'mask').length + 1), M.maskShape(kind === 'maskRect' ? 'rect' : 'circle', sc.w * 0.35, sc.h * 0.3, sc.w * 0.3, sc.h * 0.4));
      sc.items.push(m); this.sel = { screen: sc, item: m }; this.setTab('out');
    } else if (kind === 'maskDraw') { this.setTab('out'); this.drawing = { kind: 'mask', pts: [] }; }
    this.c.onChange(); this.refresh();
  }
  removeItem(it) {
    const sc = this.sel.screen; sc.items = sc.items.filter(i => i !== it); this.sel = { screen: sc, item: null }; this.c.onChange(); this.refresh();
  }
  removeScreen(sc) {
    const list = this.screens(); if (list.length <= 1) return;
    list.splice(list.indexOf(sc), 1); const n = list[0]; this.sel = { screen: n, item: n.items[0] || null }; this.c.onChange(); this.layout(); this.refresh();
  }

  // ---------- lista de telas ----------
  refresh() { this.renderTree(); this.renderProps(); this.syncTools(); this.draw(); }
  renderTree() {
    const list = $('aoList'); list.textContent = '';
    const dev = (sc) => sc.device === 'auto' ? 'automático' : sc.device === 'window' ? 'janela' : (this.c.displayLabel(sc.device) || 'monitor');
    for (const sc of this.screens()) {
      const box = el('div', 'scr');
      const row = el('div', 'row screen' + (this.sel && this.sel.screen === sc && !this.sel.item ? ' sel' : ''));
      const ck = el('input'); ck.type = 'checkbox'; ck.checked = sc.enabled; ck.onclick = (e) => { e.stopPropagation(); sc.enabled = ck.checked; this.c.onChange(); this.refresh(); };
      const x = el('span', 'x', '✕'); x.title = 'Apagar a tela e tudo dentro dela'; x.onclick = (e) => { e.stopPropagation(); this.removeScreen(sc); };
      row.append(ck, el('span', 'nm', sc.name), el('span', 'dev', dev(sc)), x);
      row.onclick = () => { this.select(sc, null); };
      box.appendChild(row);
      for (const it of sc.items) {
        const r = el('div', 'row item' + (this.sel && this.sel.item === it ? ' sel' : ''));
        const c = el('input'); c.type = 'checkbox'; c.checked = it.enabled; c.onclick = (e) => { e.stopPropagation(); it.enabled = c.checked; M.touch(it); this.c.onChange(); this.refresh(); };
        const dot = el('i', 'dot'); dot.style.background = this.colorOf(it);
        const xx = el('span', 'x', '✕'); xx.title = 'Apagar'; xx.onclick = (e) => { e.stopPropagation(); this.sel = { screen: sc, item: it }; this.removeItem(it); };
        r.append(c, dot, el('span', 'nm', it.name), xx);
        r.onclick = () => { this.select(sc, it); if (it.type === 'mask') this.setTab('out'); };
        box.appendChild(r);
      }
      list.appendChild(box);
    }
  }

  // ---------- propriedades ----------
  group(parent, key, title, sub, fill) {
    const g = el('div', 'grp' + (this.closed.has(key) ? ' off' : '')), h = el('div', 'gh');
    h.append(title); if (sub) h.appendChild(el('b', '', sub));
    h.onclick = () => { if (this.closed.has(key)) this.closed.delete(key); else this.closed.add(key); g.classList.toggle('off'); };
    const b = el('div', 'gb'); fill(b); g.append(h, b); parent.appendChild(g);
  }
  row(label, ...kids) { const r = el('div', 'row'); r.append(el('span', '', label), ...kids); return r; }
  num(label, pairs, onchange) {
    // pairs: [[rótulo, valor, setter]] — caixas de número com um rótulo pequeno dentro
    const box = el('div', 'num');
    for (const [l, v, set] of pairs) {
      const w = el('label'); w.append(el('i', '', l));
      const i = el('input'); i.type = 'number'; i.value = Math.round(v * 10) / 10; i.step = 'any';
      i.onchange = () => { const n = parseFloat(i.value.replace(',', '.')); if (!isNaN(n)) { set(n); onchange && onchange(); } };
      i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); };
      w.appendChild(i); box.appendChild(w);
    }
    return this.row(label, box);
  }
  slider(label, v, min, max, step, show, set) {
    const i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    const o = el('output', '', show(v));
    i.oninput = () => { const n = +i.value; o.textContent = show(n); set(n); this.c.onChange(); this.draw(); };
    i.oncontextmenu = (e) => { e.preventDefault(); };
    return this.row(label, i, o);
  }
  seg(label, opts, cur, set) {
    const s = el('div', 'seg');
    for (const [v, t] of opts) { const b = el('button', v === cur ? 'on' : '', t); b.type = 'button'; b.onclick = () => { set(v); this.c.onChange(); this.refresh(); }; s.appendChild(b); }
    return this.row(label, s);
  }
  check(label, v, txt, set) {
    const w = el('label', 'chk'); const c = el('input'); c.type = 'checkbox'; c.checked = v;
    c.onchange = () => { set(c.checked); this.c.onChange(); this.refresh(); }; w.append(c, txt); return this.row(label, w);
  }
  sel_(label, opts, cur, set) {
    const s = el('select'); for (const [v, t] of opts) { const o = el('option', '', t); o.value = v; s.appendChild(o); } s.value = cur;
    s.onchange = () => { set(s.value); this.c.onChange(); this.refresh(); }; return this.row(label, s);
  }
  nameRow(obj) {
    const i = el('input'); i.type = 'text'; i.value = obj.name; i.className = 'name';
    i.onchange = () => { obj.name = i.value.trim() || obj.name; this.c.onChange(); this.refresh(); };
    i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); };
    return this.row('Nome', i);
  }
  renderProps() {
    const P = $('aoProps'); P.textContent = '';
    const sel = this.sel; if (!sel) return;
    const sc = sel.screen, it = sel.item, ch = () => { this.c.onChange(); this.draw(); };
    const tit = el('div', 'tit'); tit.append(el('span', '', it ? it.name : sc.name), el('small', '', it ? sc.name : (sc.w + '×' + sc.h))); P.appendChild(tit);
    if (!it) {
      this.group(P, 'scr', 'Tela', '', (b) => {
        b.appendChild(this.nameRow(sc));
        const devs = [['auto', 'Automático (projetor, se houver)'], ['window', 'Janela comum'], ...this.c.displays().map(d => [d.id, d.label + ' · ' + d.w + '×' + d.h + (d.primary ? ' (principal)' : '')])];
        b.appendChild(this.sel_('Destino', devs, sc.device, (v) => { sc.device = v; const d = this.c.displays().find(x => x.id === v); if (d) { sc.w = d.w; sc.h = d.h; } this.layout(); }));
        b.appendChild(this.num('Tamanho', [['L', sc.w, v => { sc.w = Math.max(16, v | 0); }], ['A', sc.h, v => { sc.h = Math.max(16, v | 0); }]], () => { this.layout(); ch(); this.refresh(); }));
        b.appendChild(this.slider('Opacidade', Math.round(sc.opacity * 100), 0, 100, 1, v => v + '%', v => { sc.opacity = v / 100; }));
      });
      this.group(P, 'scol', 'Cor', 'brilho, contraste, RGB', (b) => this.colorRows(b, sc.color));
      const foot = el('div', 'gb'); const rm = el('button', 'wide', 'Apagar esta tela'); rm.type = 'button'; rm.onclick = () => this.removeScreen(sc); if (this.screens().length > 1) foot.appendChild(rm); P.appendChild(foot);
    } else if (it.type === 'mask') {
      this.group(P, 'mask', 'Máscara', 'da tela', (b) => {
        b.appendChild(this.nameRow(it));
        b.appendChild(this.check('Inverter', it.invert, 'preserva só o que está dentro', v => { it.invert = v; M.touch(it); }));
        b.appendChild(this.row('Pontos', el('span', 'info', it.pts.length + ' · arraste no modo Pontos')));
        const rm = el('button', 'wide', 'Apagar máscara'); rm.type = 'button'; rm.onclick = () => this.removeItem(it); b.appendChild(rm);
      });
    } else {
      const s = it;
      this.group(P, 'in', 'Entrada', 'da composição', (b) => {
        b.appendChild(this.nameRow(s));
        const srcs = [['comp', 'Composição'], ...this.c.layers().map(L => [String(L.id), L.name])];
        b.appendChild(this.sel_('Fonte', srcs, String(s.source), v => { s.source = v === 'comp' ? 'comp' : +v; M.touch(s); }));
        b.appendChild(this.num('Posição', [['X', s.in.x, v => { s.in.x = v; }], ['Y', s.in.y, v => { s.in.y = v; }]], () => { M.touch(s); ch(); }));
        b.appendChild(this.num('Tamanho', [['L', s.in.w, v => { s.in.w = Math.max(1, v); }], ['A', s.in.h, v => { s.in.h = Math.max(1, v); }]], () => { M.touch(s); ch(); }));
        b.appendChild(this.slider('Giro', s.in.rot, -180, 180, 1, v => v + '°', v => { s.in.rot = v; M.touch(s); }));
      });
      this.group(P, 'out', 'Saída', 'no projetor', (b) => {
        const r = M.outRect(s);
        b.appendChild(this.num('Posição', [['X', r.x, v => { M.fitOutRect(s, { ...M.outRect(s), x: v }); }], ['Y', r.y, v => { M.fitOutRect(s, { ...M.outRect(s), y: v }); }]], () => { ch(); this.renderProps(); }));
        b.appendChild(this.num('Tamanho', [['L', r.w, v => { M.fitOutRect(s, { ...M.outRect(s), w: Math.max(8, v) }); }], ['A', r.h, v => { M.fitOutRect(s, { ...M.outRect(s), h: Math.max(8, v) }); }]], () => { ch(); this.renderProps(); }));
        b.appendChild(this.slider('Giro', s.warp.rot, -180, 180, 1, v => v + '°', v => M.rotateOut(s, v)));
        const f = s.flip.x && s.flip.y ? 'xy' : s.flip.x ? 'x' : s.flip.y ? 'y' : 'no';
        b.appendChild(this.seg('Espelhar', [['no', 'Não'], ['x', '↔'], ['y', '↕'], ['xy', 'Ambos']], f, v => { s.flip.x = v === 'x' || v === 'xy'; s.flip.y = v === 'y' || v === 'xy'; M.touch(s); }));
      });
      this.group(P, 'warp', 'Deformação', '', (b) => {
        b.appendChild(this.seg('Modo', [['corners', '4 cantos'], ['mesh', 'Malha']], s.warp.mode, v => { M.setWarpMode(s, v); this.selPt = -1; }));
        if (s.warp.mode === 'mesh') {
          b.appendChild(this.seg('Pontos', [['line', 'Reta'], ['curve', 'Curva']], s.warp.curve ? 'curve' : 'line', v => M.setCurve(s, v === 'curve')));
          b.appendChild(this.num('Divisões', [['↔', s.warp.divX, v => { M.setDivisions(s, v, s.warp.divY); }], ['↕', s.warp.divY, v => { M.setDivisions(s, s.warp.divX, v); }]], () => { this.selPt = -1; ch(); this.refresh(); }));
        }
        if (this.selPt >= 0 && s.warp.pts[this.selPt]) {
          const p = s.warp.pts[this.selPt];
          b.appendChild(this.num('Ponto', [['X', p[0], v => M.moveAnchor(s, this.selPt, v - p[0], 0)], ['Y', p[1], v => M.moveAnchor(s, this.selPt, 0, v - p[1])]], ch));
        }
        const z = el('button', 'wide', s.warp.mode === 'mesh' ? 'Zerar a malha' : 'Zerar os cantos'); z.type = 'button';
        z.onclick = () => { const r = M.outRect(s); M.resetWarp(s); M.fitOutRect(s, r); ch(); this.refresh(); }; b.appendChild(z);
      });
      this.group(P, 'soft', 'Soft edge', 'emenda', (b) => {
        b.appendChild(this.check('Ligado', s.soft.on, 'suaviza onde outro slice sobrepõe', v => { s.soft.on = v; M.touch(s); }));
        if (s.soft.on) {
          b.appendChild(this.slider('Potência', s.soft.power, 0.5, 5, 0.1, fmt1, v => { s.soft.power = v; }));
          b.appendChild(this.slider('Luminância', s.soft.lum, 0, 1, 0.01, fmt2, v => { s.soft.lum = v; }));
          b.appendChild(this.slider('Gama', s.soft.gamma[0], 1, 4, 0.05, fmt2, v => { s.soft.gamma = [v, v, v]; this.renderProps(); }));
          b.appendChild(this.num('Gama RGB', [['R', s.soft.gamma[0], v => { s.soft.gamma[0] = v; }], ['G', s.soft.gamma[1], v => { s.soft.gamma[1] = v; }], ['B', s.soft.gamma[2], v => { s.soft.gamma[2] = v; }]], ch));
          b.appendChild(this.slider('Nível de preto', s.soft.black, 0, 60, 1, v => String(v), v => { s.soft.black = v; }));
        }
      });
      this.group(P, 'col', 'Cor', 'brilho, contraste, RGB', (b) => this.colorRows(b, s.color));
      this.group(P, 'imask', 'Máscara de entrada', s.inMask ? (s.inMask.invert ? 'invertida' : 'polígono') : 'nenhuma', (b) => {
        const r = el('div', 'seg');
        for (const [k, t] of [['rect', 'Retângulo'], ['circle', 'Círculo'], ['draw', 'Desenhar']]) {
          const bt = el('button', '', t); bt.type = 'button';
          bt.onclick = () => { if (k === 'draw') { this.setTab('in'); this.setMode('pts'); this.drawing = { kind: 'inmask', pts: [] }; this.draw(); } else { M.setInMask(s, k); ch(); this.refresh(); } };
          r.appendChild(bt);
        }
        b.appendChild(this.row('Forma', r));
        if (s.inMask) {
          b.appendChild(this.check('Inverter', s.inMask.invert, 'mostra só fora do polígono', v => { s.inMask.invert = v; s.inMask.rev++; M.touch(s); }));
          const rm = el('button', 'wide', 'Remover máscara de entrada'); rm.type = 'button'; rm.onclick = () => { M.setInMask(s, null); ch(); this.refresh(); }; b.appendChild(rm);
        }
      });
      const foot = el('div', 'gb'); const rm = el('button', 'wide', 'Apagar este slice'); rm.type = 'button'; rm.onclick = () => this.removeItem(it); foot.appendChild(rm); P.appendChild(foot);
    }
    const f = el('div', 'foot'); const c = el('button', '', 'Cancelar'); c.type = 'button'; c.onclick = () => this.hide(true);
    const ok = el('button', 'ok', 'Salvar e fechar'); ok.type = 'button'; ok.onclick = () => this.hide(false); f.append(c, ok); P.appendChild(f);
  }
  colorRows(b, c) {
    b.appendChild(this.slider('Brilho', c.bright, 0, 2, 0.01, fmt2, v => { c.bright = v; }));
    b.appendChild(this.slider('Contraste', c.contrast, 0, 2, 0.01, fmt2, v => { c.contrast = v; }));
    b.appendChild(this.slider('Vermelho', c.r, -1, 1, 0.01, fmt2, v => { c.r = v; }));
    b.appendChild(this.slider('Verde', c.g, -1, 1, 0.01, fmt2, v => { c.g = v; }));
    b.appendChild(this.slider('Azul', c.b, -1, 1, 0.01, fmt2, v => { c.b = v; }));
  }

  // ---------- presets ----------
  async refreshPresets() {
    const s = $('aoPresetSel'); s.textContent = '';
    const names = this.c.presets ? await this.c.presets.list() : [];
    const o0 = el('option', '', '— novo —'); o0.value = ''; s.appendChild(o0);
    for (const n of names) { const o = el('option', '', n); o.value = n; s.appendChild(o); }
    s.value = names.includes(this.presetName) ? this.presetName : '';
    $('aoPresetName').value = this.presetName;
  }
  async loadPreset(name) {
    this.presetName = name; $('aoPresetName').value = name;
    if (!name || !this.c.presets) return;
    try {
      const json = await this.c.presets.load(name);
      this.c.setScreens(M.deserialize(json));
      const sc = this.screens()[0]; this.sel = { screen: sc, item: sc.items[0] || null };
      this.c.onChange(); this.layout(); this.refresh(); this.c.toast('Preset "' + name + '" carregado');
    } catch (e) { this.c.toast('Não consegui abrir o preset: ' + e.message); }
  }
  async savePreset() {
    const name = $('aoPresetName').value.trim();
    if (!name) { this.c.toast('Dê um nome ao preset'); $('aoPresetName').focus(); return; }
    if (!this.c.presets) return;
    try { await this.c.presets.save(name, M.serialize(this.screens())); this.presetName = name; await this.refreshPresets(); this.c.toast('Preset "' + name + '" salvo'); }
    catch (e) { this.c.toast('Não consegui salvar: ' + e.message); }
  }
  async deletePreset() {
    const name = $('aoPresetSel').value; if (!name || !this.c.presets) return;
    await this.c.presets.remove(name); this.presetName = ''; await this.refreshPresets(); this.c.toast('Preset "' + name + '" apagado');
  }
}

// máscara de entrada: coordenadas locais (0..1 do recorte) ↔ pixels da composição
function localToIn(s, p) {
  const r = s.in, a = r.rot * Math.PI / 180, c = Math.cos(a), si = Math.sin(a), dx = (p[0] - 0.5) * r.w, dy = (p[1] - 0.5) * r.h;
  return [r.x + r.w / 2 + dx * c - dy * si, r.y + r.h / 2 + dx * si + dy * c];
}
function inToLocal(s, q) {
  const r = s.in, a = -r.rot * Math.PI / 180, c = Math.cos(a), si = Math.sin(a), dx = q[0] - r.x - r.w / 2, dy = q[1] - r.y - r.h / 2;
  return [(dx * c - dy * si) / r.w + 0.5, (dx * si + dy * c) / r.h + 0.5];
}
function outlinePoints(s) {
  const d = outlinePath(s, 8);
  return d.slice(1, -2).split(' L').map(t => t.split(',').map(Number));
}
