// Editor da Saída avançada, no visual do Advanced Output do Resolume Arena 7 (capturas reais
// de 2026-10-14): Presets e a árvore de telas à esquerda, com a caixa de ajuda embaixo; abas
// "Seleção de entrada" e "Transformação de saída" no meio, com a barra de ferramentas (zoom,
// desfazer, refazer, mão, ímã, grade; Editar pontos / Transformar); propriedades à direita em
// linhas "rótulo | valor − + barra"; Cancelar e Salvar e fechar embaixo à direita.
import * as M from './screens.js';
import { outlinePath, meshLinesPath, bbox } from './warp.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const TEAL = '#6fe6c6', MASKC = '#f5d742';
const fmtN = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const ICON = {
  undo: '<svg viewBox="0 0 16 16"><path d="M6 4 2 8l4 4M2 8h7a4 4 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  redo: '<svg viewBox="0 0 16 16"><path d="m10 4 4 4-4 4M14 8H7a4 4 0 0 0 0 8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  hand: '<svg viewBox="0 0 16 16"><path d="M5 9V3.5a1 1 0 0 1 2 0V8m0-5.5a1 1 0 0 1 2 0V8m0-4a1 1 0 0 1 2 0v4m0-2a1 1 0 0 1 2 0v4c0 3-2 5-5 5s-4-1-5-3L2 9.5a1 1 0 0 1 1.5-1L5 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  snap: '<svg viewBox="0 0 16 16"><path d="M4 2v6a4 4 0 0 0 8 0V2M4 2h3v6a1 1 0 0 0 2 0V2h3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 2h3M9 2h3" stroke="currentColor" stroke-width="3"/></svg>',
  grid: '<svg viewBox="0 0 16 16"><path d="M2 2h12v12H2zM2 6h12M2 10h12M6 2v12M10 2v12" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  plus: '<svg viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2"/></svg>',
  pts: '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6"/></svg>',
  move: '<svg viewBox="0 0 16 16"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="6" y="6" width="4" height="4" fill="currentColor"/></svg>',
  caret: '<svg viewBox="0 0 8 8"><path d="M1 2.5h6L4 6z" fill="currentColor"/></svg>',
  flipN: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="currentColor"/></svg>',
  flipX: '<svg viewBox="0 0 16 16"><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/><path d="M8 2a6 6 0 0 0 0 12" fill="none" stroke="currentColor"/></svg>',
  flipY: '<svg viewBox="0 0 16 16"><path d="M2 8a6 6 0 0 1 12 0z" fill="currentColor"/><path d="M2 8a6 6 0 0 0 12 0" fill="none" stroke="currentColor"/></svg>',
  flipXY: '<svg viewBox="0 0 16 16"><path d="M8 8V2a6 6 0 0 1 6 6zM8 8H2a6 6 0 0 0 6 6z" fill="currentColor"/><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 16 16"><path d="M8 14 2.5 8.5a3 3 0 0 1 4.3-4.3L8 5.4l1.2-1.2a3 3 0 0 1 4.3 4.3z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  rect: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  circle: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  tri: '<svg viewBox="0 0 16 16"><path d="M8 2.5 14 13.5H2z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  hex: '<svg viewBox="0 0 16 16"><path d="M8 2 13.2 5v6L8 14 2.8 11V5z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  pen: '<svg viewBox="0 0 16 16"><path d="m3 13 1-4 7-7 3 3-7 7zM10 3l3 3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  item: '<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="4" y="4" width="4" height="4" fill="currentColor"/></svg>',
  itemOff: '<svg viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
};
const ibtn = (id, icon, help, txt) => `<button type="button" id="${id}" class="ib${txt ? ' txt' : ''}" data-help="${help}">${ICON[icon]}${txt ? '<span>' + txt + '</span>' : ''}</button>`;

export class AdvancedOutput {
  // ctx: { compW, compH, compCanvas, screens(), setScreens(list), layers(), screenCanvas(sc), onChange(), helpers, toast, displays(), displayLabel(id), presets }
  constructor(ctx) {
    this.c = ctx;
    this.open = false; this.tab = 'in'; this.mode = 'move'; this.snap = false; this.grid = true; this.led = false; this.pan = false; this.zoom = 'fit';
    this.sel = null; this.selPt = -1; this.drawing = null; this.cursor = null; this.drag = null; this.scale = 1;
    this.snapshot = ''; this.presetName = ''; this.hist = []; this.redoHist = []; this.space = false;
    this.build();
  }

  // ---------- estrutura ----------
  build() {
    $('ao').innerHTML = `
      <div id="aoTop">
        <div class="presets"><button type="button" id="aoPresetBtn" data-help="Presets|Salvar, abrir e apagar configurações de saída."><span id="aoPresetName">Presets</span>${ICON.caret}</button>
          <div id="aoPresetMenu" class="menu" hidden></div></div>
        <div class="tabs"><button type="button" id="aoTabIn" data-help="Seleção de entrada|Aqui você define qual parte da composição cada slice usa como entrada.">Seleção de entrada</button><button type="button" id="aoTabOut" data-help="Transformação de saída|Mude a forma ou a posição de cada slice no projetor. Cada slice pode ser movido e deformado para casar com a superfície.">Transformação de saída</button></div>
        <span class="info" id="aoInfo"></span>
      </div>
      <div id="aoMain">
        <div id="aoLeft">
          <div class="tb"><button type="button" id="aoAdd" class="ib" data-help="Adicionar itens|Acrescenta telas, slices e máscaras à sua configuração de saída.">${ICON.plus}${ICON.caret}</button>
            <div id="aoAddMenu" class="menu" hidden>
              <button type="button" data-add="screen">Tela</button><button type="button" data-add="slice">Slice</button>
              <div class="mrow"><span>Máscara de saída</span><i data-add="maskRect">${ICON.rect}</i><i data-add="maskCircle">${ICON.circle}</i><i data-add="maskTri">${ICON.tri}</i><i data-add="maskHex">${ICON.hex}</i><i data-add="maskDraw">${ICON.pen}</i></div>
            </div></div>
          <div id="aoList"></div>
          <div id="aoHelp"><div class="hh" id="aoHelpT">Ajuda</div><div class="hb" id="aoHelpB">Passe o mouse sobre um controle para saber o que ele faz.</div></div>
        </div>
        <div id="aoCenter">
          <div class="tb">
            <select id="aoZoom" data-help="Zoom|Aproxima ou afasta a vista, ou ajusta à composição."><option value="fit">Ajustar</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="1">100%</option><option value="2">200%</option></select>
            ${ibtn('aoUndo', 'undo', 'Desfazer|Desfaz a última mudança.')}${ibtn('aoRedo', 'redo', 'Refazer|Refaz o que você acabou de desfazer.')}
            ${ibtn('aoPan', 'hand', 'Mão|Arrasta a vista. Segurar a barra de espaço faz o mesmo.')}${ibtn('aoSnap', 'snap', 'Ímã|Gruda as bordas do slice nas bordas dos outros slices e da tela.')}
            <span class="gridWrap"><button type="button" id="aoGridBtn" class="ib" data-help="Grade|Mostra o nome e a borda do slice no projetor, com o cursor; ou uma grade de 8×8 px para alinhar.">${ICON.grid}${ICON.caret}</button>
              <div id="aoGridMenu" class="menu" hidden><button type="button" data-g="grid">Mostrar grade do slice</button><button type="button" data-g="led">Grade LED 8×8</button><button type="button" data-g="ident">Identificar slices</button></div></span>
            <span class="sp"></span>
            ${ibtn('aoPts', 'pts', 'Modo Editar pontos|Muda a posição ou a curva de cada ponto do slice. Tecla T alterna entre Editar pontos e Transformar.', 'Editar pontos')}
            ${ibtn('aoMove', 'move', 'Modo Transformar|Muda a posição, o giro ou o tamanho do slice inteiro. Tecla T alterna entre Editar pontos e Transformar.', 'Transformar')}
          </div>
          <div id="aoStage"><div id="aoView"><canvas id="aoCv"></canvas><svg id="aoSvg"></svg></div></div>
          <div id="aoFoot"><button type="button" id="aoCancel" data-help="Cancelar|Fecha a Saída avançada e devolve tudo como estava antes.">Cancelar</button><button type="button" id="aoOk" data-help="Salvar e fechar|Fecha a Saída avançada aplicando todas as mudanças.">Salvar e fechar</button></div>
        </div>
        <div id="aoRight"><div class="ptitle" id="aoPropT"></div><div id="aoProps"></div></div>
      </div>`;
    this.cv = $('aoCv'); this.cx = this.cv.getContext('2d'); this.svg = $('aoSvg'); this.view = $('aoView');
    $('aoTabIn').onclick = () => this.setTab('in'); $('aoTabOut').onclick = () => this.setTab('out');
    $('aoMove').onclick = () => this.setMode('move'); $('aoPts').onclick = () => this.setMode('pts');
    $('aoSnap').onclick = () => { this.snap = !this.snap; this.syncTools(); };
    $('aoPan').onclick = () => { this.pan = !this.pan; this.syncTools(); };
    $('aoUndo').onclick = () => this.undo(); $('aoRedo').onclick = () => this.redo();
    $('aoZoom').onchange = () => { this.zoom = $('aoZoom').value; this.layout(); };
    $('aoCancel').onclick = () => this.hide(true); $('aoOk').onclick = () => this.hide(false);
    const menu = (btn, box) => { $(btn).onclick = (e) => { e.stopPropagation(); const h = $(box).hidden; this.closeMenus(); $(box).hidden = !h; }; };
    menu('aoAdd', 'aoAddMenu'); menu('aoGridBtn', 'aoGridMenu'); menu('aoPresetBtn', 'aoPresetMenu');
    $('aoAddMenu').onclick = (e) => { const b = e.target.closest('[data-add]'); if (b) { this.closeMenus(); this.add(b.dataset.add); } };
    $('aoGridMenu').onclick = (e) => { const b = e.target.closest('[data-g]'); if (!b) return; this.closeMenus(); if (b.dataset.g === 'grid') this.grid = !this.grid; else if (b.dataset.g === 'led') this.led = !this.led; else this.identify(); this.syncTools(); this.draw(); };
    addEventListener('click', () => this.closeMenus());
    this.svg.addEventListener('pointerdown', (e) => this.down(e));
    this.svg.addEventListener('pointermove', (e) => this.move(e));
    addEventListener('pointerup', (e) => this.up(e));
    this.svg.addEventListener('dblclick', (e) => this.dbl(e));
    this.svg.addEventListener('pointerleave', () => { this.cursor = null; });
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    $('aoStage').addEventListener('pointerdown', (e) => this.panDown(e));
    addEventListener('keydown', (e) => this.key(e));
    addEventListener('keyup', (e) => { if (e.key === ' ') this.space = false; });
    addEventListener('resize', () => { if (this.open) this.layout(); });
    // caixa de ajuda: todo controle com data-help="Título|Texto" explica-se ao passar o mouse
    $('ao').addEventListener('mouseover', (e) => { const h = e.target.closest('[data-help]'); if (!h) return; const [t, b] = h.dataset.help.split('|'); $('aoHelpT').textContent = t; $('aoHelpB').textContent = b || ''; });
    this.syncTools();
  }
  closeMenus() { for (const id of ['aoAddMenu', 'aoGridMenu', 'aoPresetMenu']) $(id).hidden = true; }

  // ---------- abrir e fechar ----------
  show() {
    this.open = true; $('ao').hidden = false;
    this.snapshot = M.serialize(this.c.screens()); this.hist = []; this.redoHist = [];
    const sc = this.c.screens()[0], sl = sc && sc.items.find(i => i.type === 'slice');
    this.sel = sc ? { screen: sc, item: sl || null } : null;
    this.refreshPresets();
    this.setTab('in'); this.layout(); this.refresh();
  }
  hide(cancel) {
    if (cancel) this.c.setScreens(M.deserialize(this.snapshot));
    this.open = false; $('ao').hidden = true; this.drawing = null; this.cursor = null; this.closeMenus();
    this.c.helpers.clear(); this.c.onChange();
  }
  screens() { return this.c.screens(); }
  curScreen() { return this.sel ? this.sel.screen : this.screens()[0]; }

  // ---------- desfazer ----------
  pushUndo() { this.hist.push(this.snapState()); if (this.hist.length > 60) this.hist.shift(); this.redoHist = []; this.syncTools(); }
  snapState() { const s = this.screens(); return { json: M.serialize(s), si: s.indexOf(this.sel && this.sel.screen), ii: this.sel && this.sel.screen ? this.sel.screen.items.indexOf(this.sel.item) : -1 }; }
  restore(st) {
    this.c.setScreens(M.deserialize(st.json));
    const s = this.screens(), sc = s[Math.max(0, st.si)] || s[0];
    this.sel = sc ? { screen: sc, item: sc.items[st.ii] || null } : null; this.selPt = -1;
    this.c.onChange(); this.layout(); this.refresh();
  }
  undo() { if (!this.hist.length) return; this.redoHist.push(this.snapState()); this.restore(this.hist.pop()); }
  redo() { if (!this.redoHist.length) return; this.hist.push(this.snapState()); this.restore(this.redoHist.pop()); }

  // ---------- ferramentas ----------
  setTab(t) { this.tab = t; this.selPt = -1; this.drawing = null; this.syncTools(); this.layout(); this.refresh(); }
  setMode(m) { this.mode = m; this.selPt = -1; this.syncTools(); this.draw(); this.renderProps(); }
  syncTools() {
    $('aoTabIn').classList.toggle('on', this.tab === 'in'); $('aoTabOut').classList.toggle('on', this.tab === 'out');
    $('aoMove').classList.toggle('on', this.mode === 'move'); $('aoPts').classList.toggle('on', this.mode === 'pts');
    $('aoMove').hidden = $('aoPts').hidden = this.tab !== 'out';
    $('aoSnap').classList.toggle('on', this.snap); $('aoPan').classList.toggle('on', this.pan); $('aoGridBtn').classList.toggle('on', this.grid || this.led);
    $('aoUndo').disabled = !this.hist.length; $('aoRedo').disabled = !this.redoHist.length;
    $('aoZoom').value = this.zoom;
    $('aoGridMenu').querySelector('[data-g=grid]').classList.toggle('on', this.grid); $('aoGridMenu').querySelector('[data-g=led]').classList.toggle('on', this.led);
    $('aoInfo').textContent = `Composição ${this.c.compW}×${this.c.compH}`;
    $('aoStage').classList.toggle('panning', this.pan);
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
    if (e.key === ' ') { this.space = true; e.preventDefault(); }
    else if (e.key === 'Escape') { if (this.drawing) { this.drawing = null; this.draw(); } else this.hide(true); }
    else if (e.key === 't' || e.key === 'T') { if (this.tab === 'out') this.setMode(this.mode === 'move' ? 'pts' : 'move'); }
    else if (e.key === 'Enter' && this.drawing) this.finishDrawing();
    else if (e.key === 'Delete' && this.sel && this.sel.item) this.removeItem(this.sel.item);
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? this.redo() : this.undo(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { this.redo(); e.preventDefault(); }
  }

  // ---------- palco ----------
  stageSize() { const sc = this.curScreen(); return this.tab === 'in' ? [this.c.compW, this.c.compH] : sc ? [sc.w, sc.h] : [1920, 1080]; }
  layout() {
    const [W, H] = this.stageSize(), st = $('aoStage');
    let k = this.zoom === 'fit' ? Math.min((st.clientWidth - 60) / W, (st.clientHeight - 60) / H) : +this.zoom;
    if (!(k > 0)) k = 1;
    this.scale = k;
    this.view.style.width = W * k + 'px'; this.view.style.height = H * k + 'px';
    this.cv.width = W; this.cv.height = H; this.cv.style.width = W * k + 'px'; this.cv.style.height = H * k + 'px';
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`); this.svg.style.width = W * k + 'px'; this.svg.style.height = H * k + 'px';
    this.draw();
  }
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
  panDown(e) {
    if (!(this.pan || this.space) || e.button !== 0) return;
    const st = $('aoStage'), x0 = e.clientX, y0 = e.clientY, sl = st.scrollLeft, stp = st.scrollTop;
    const mv = (ev) => { st.scrollLeft = sl - (ev.clientX - x0); st.scrollTop = stp - (ev.clientY - y0); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); e.preventDefault(); e.stopPropagation();
  }

  // ---------- coordenadas e alvos ----------
  pt(e) { const r = this.svg.getBoundingClientRect(); const [W, H] = this.stageSize(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  itemsOnStage() {
    if (this.tab === 'in') return this.screens().flatMap(sc => sc.enabled ? sc.items.filter(i => i.type === 'slice' && i.enabled).map(i => ({ screen: sc, item: i })) : []);
    const sc = this.curScreen(); return sc ? sc.items.filter(i => i.enabled).map(i => ({ screen: sc, item: i })) : [];
  }
  select(screen, item) { this.sel = { screen, item }; this.selPt = -1; this.syncTools(); if (this.tab === 'out') this.layout(); this.refresh(); }

  // ---------- desenho do palco ----------
  draw() {
    const svg = this.svg; svg.textContent = '';
    const [W, H] = this.stageSize(), it = this.sel && this.sel.item, on = this.itemsOnStage(), k = 1 / this.scale;
    if (this.led) { // grade de 8 px
      const d = []; for (let x = 0; x <= W; x += 8) d.push(`M${x},0V${H}`); for (let y = 0; y <= H; y += 8) d.push(`M0,${y}H${W}`);
      svg.appendChild(svgEl('path', { d: d.join(''), class: 'ledgrid' }));
    }
    if (this.tab === 'in') { // emendas entre slices com soft edge
      const sl = on.map(o => o.item);
      for (let i = 0; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) {
        const A = sl[i], B = sl[j]; if (!A.soft.on || !B.soft.on || A.source !== B.source) continue;
        const x0 = Math.max(A.in.x, B.in.x), x1 = Math.min(A.in.x + A.in.w, B.in.x + B.in.w), y0 = Math.max(A.in.y, B.in.y), y1 = Math.min(A.in.y + A.in.h, B.in.y + B.in.h);
        if (x1 <= x0 || y1 <= y0) continue;
        svg.appendChild(svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: 'blend' }));
      }
    }
    for (const { item } of on) {
      const sel = item === it;
      if (this.tab === 'in') {
        const r = item.in, g = svgEl('g', { transform: `rotate(${r.rot} ${r.x + r.w / 2} ${r.y + r.h / 2})` });
        g.appendChild(svgEl('rect', { x: r.x, y: r.y, width: r.w, height: r.h, class: 'slice' + (sel ? ' sel' : ''), 'data-k': 'body', 'data-id': item.id }));
        const t = svgEl('text', { x: r.x + r.w / 2, y: r.y + r.h / 2, class: 'sname', 'text-anchor': 'middle' }); t.textContent = item.name; g.appendChild(t);
        svg.appendChild(g);
        if (sel && item.inMask) this.drawPoly(item.inMask.pts.map(p => localToIn(item, p)), 'inmask', true, item);
        if (sel && !item.inMask) this.drawHandles(r, item);
      } else if (item.type === 'slice') {
        if (item.warp.mode === 'mesh') svg.appendChild(svgEl('path', { d: meshLinesPath(item), class: 'mesh' }));
        svg.appendChild(svgEl('path', { d: outlinePath(item), class: 'slice' + (sel ? ' sel' : ''), 'data-k': 'body', 'data-id': item.id }));
        const b = M.outRect(item), t = svgEl('text', { x: b.x + b.w / 2, y: b.y + b.h / 2, class: 'sname', 'text-anchor': 'middle' }); t.textContent = item.name; svg.appendChild(t);
        if (sel && this.mode === 'move') this.drawHandles(b, item);
        if (sel && this.mode === 'pts') this.drawMeshPoints(item);
      } else {
        this.drawPoly(item.pts, 'mask', sel && this.mode === 'pts', item);
        const b = bbox(item.pts), t = svgEl('text', { x: b.x + b.w / 2, y: b.y + b.h / 2, class: 'mname', 'text-anchor': 'middle' }); t.textContent = item.name; svg.appendChild(t);
        if (sel && this.mode === 'move') this.drawHandles(b, item);
      }
    }
    if (this.drawing) {
      const pts = this.drawing.kind === 'inmask' ? this.drawing.pts.map(p => localToIn(it, p)) : this.drawing.pts;
      if (pts.length) svg.appendChild(svgEl('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'drawing' }));
      pts.forEach(p => svg.appendChild(svgEl('rect', { x: p[0] - 4 * k, y: p[1] - 4 * k, width: 8 * k, height: 8 * k, class: 'hd' })));
    }
    if (this.grid && this.tab === 'out' && this.cursor) {
      svg.appendChild(svgEl('line', { x1: 0, y1: this.cursor[1], x2: W, y2: this.cursor[1], class: 'cursor' }));
      svg.appendChild(svgEl('line', { x1: this.cursor[0], y1: 0, x2: this.cursor[0], y2: H, class: 'cursor' }));
    }
    svg.querySelectorAll('text').forEach(t => t.setAttribute('font-size', 13 * k));
  }
  // alças do Transformar, como no Resolume: círculo com quadrado nos cantos, quadrado no meio dos lados
  drawHandles(r, item) {
    const k = 1 / this.scale, H = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]];
    H.forEach(([fx, fy], i) => {
      const x = r.x + r.w * fx, y = r.y + r.h * fy, corner = fx !== 0.5 && fy !== 0.5;
      const g = svgEl('g', { class: 'hdg', 'data-k': 'resize', 'data-i': i, 'data-id': item.id });
      if (corner) g.appendChild(svgEl('circle', { cx: x, cy: y, r: 14 * k, class: 'hdc' }));
      g.appendChild(svgEl('rect', { x: x - 5 * k, y: y - 5 * k, width: 10 * k, height: 10 * k, class: 'hd' }));
      this.svg.appendChild(g);
    });
  }
  drawMeshPoints(item) {
    const w = item.warp, svg = this.svg, k = 1 / this.scale;
    if (w.mode === 'mesh' && w.curve && this.selPt >= 0) {
      const a = w.pts[this.selPt];
      for (const h of M.handlesOf(item, this.selPt)) {
        const p = w.pts[h];
        svg.appendChild(svgEl('line', { x1: a[0], y1: a[1], x2: p[0], y2: p[1], class: 'handle' }));
        svg.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 5 * k, class: 'hd', 'data-k': 'handle', 'data-i': h, 'data-id': item.id }));
      }
    }
    w.pts.forEach((p, i) => {
      if (!M.isAnchor(item, i)) return;
      const g = svgEl('g', { class: 'hdg', 'data-k': 'anchor', 'data-i': i, 'data-id': item.id });
      g.appendChild(svgEl('rect', { x: p[0] - 11 * k, y: p[1] - 11 * k, width: 22 * k, height: 22 * k, class: 'hdc' }));
      g.appendChild(svgEl('rect', { x: p[0] - 5 * k, y: p[1] - 5 * k, width: 10 * k, height: 10 * k, class: 'hd anc' + (i === this.selPt ? ' cur' : '') }));
      svg.appendChild(g);
    });
  }
  drawPoly(pts, kind, points, item) {
    const k = 1 / this.scale, attrs = { points: pts.map(p => p.join(',')).join(' '), class: kind };
    if (item) { attrs['data-k'] = 'body'; attrs['data-id'] = item.id; }
    this.svg.appendChild(svgEl('polygon', attrs));
    if (points) pts.forEach((p, i) => this.svg.appendChild(svgEl('rect', { x: p[0] - 5 * k, y: p[1] - 5 * k, width: 10 * k, height: 10 * k, class: 'hd', 'data-k': kind + 'pt', 'data-i': i, 'data-id': item ? item.id : '' })));
  }

  // ---------- interação ----------
  findItem(id) { for (const sc of this.screens()) for (const it of sc.items) if (it.id == id) return { screen: sc, item: it }; return null; }
  down(e) {
    if (e.button !== 0 || this.pan || this.space) return;
    const p = this.pt(e);
    if (this.drawing) { this.drawing.pts.push(this.drawing.kind === 'inmask' ? inToLocal(this.sel.item, p) : this.ledSnap(p)); this.draw(); return; }
    const t = e.target.closest('[data-k]'), k = t && t.dataset.k;
    if (!k) { if (this.sel) { this.sel = { screen: this.sel.screen, item: null }; this.selPt = -1; this.refresh(); } return; }
    const found = this.findItem(t.dataset.id) || this.sel;
    if (found.item !== (this.sel && this.sel.item)) this.select(found.screen, found.item);
    const it = found.item;
    this.svg.setPointerCapture(e.pointerId);
    this.pushUndo();
    const d = this.drag = { k, i: +t.dataset.i, it, last: p, start: p };
    if (k === 'anchor') { this.selPt = d.i; this.draw(); this.renderProps(); }
    if (k === 'resize' || k === 'body') d.rect = this.tab === 'in' ? { ...it.in } : it.type === 'slice' ? M.outRect(it) : bbox(it.pts);
  }
  move(e) {
    const p = this.pt(e);
    this.cursor = this.tab === 'out' ? p : null;
    if (this.drawing) { this.draw(); return; }
    const d = this.drag; if (!d) { if (this.grid && this.tab === 'out') this.draw(); return; }
    const it = d.it, dx = p[0] - d.last[0], dy = p[1] - d.last[1];
    if (d.k === 'body') {
      let r = { x: d.rect.x + p[0] - d.start[0], y: d.rect.y + p[1] - d.start[1], w: d.rect.w, h: d.rect.h };
      r = this.snapRect(r, it);
      if (it.type === 'mask') { const b = bbox(it.pts); M.touch(it); it.pts.forEach(q => { q[0] += r.x - b.x; q[1] += r.y - b.y; }); }
      else if (this.tab === 'in') { it.in.x = r.x; it.in.y = r.y; M.touch(it); }
      else M.fitOutRect(it, r);
    } else if (d.k === 'resize') {
      const H = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]][d.i];
      const r0 = d.rect, tx = p[0] - d.start[0], ty = p[1] - d.start[1];
      let x0 = r0.x, y0 = r0.y, x1 = r0.x + r0.w, y1 = r0.y + r0.h;
      if (H[0] === 0) x0 += tx; if (H[0] === 1) x1 += tx; if (H[1] === 0) y0 += ty; if (H[1] === 1) y1 += ty;
      let r = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(8, Math.abs(x1 - x0)), h: Math.max(8, Math.abs(y1 - y0)) };
      r = this.snapRect(r, it, true);
      if (it.type === 'mask') { const b = bbox(it.pts); M.touch(it); it.pts.forEach(q => { q[0] = r.x + (q[0] - b.x) * (r.w / (b.w || 1)); q[1] = r.y + (q[1] - b.y) * (r.h / (b.h || 1)); }); }
      else if (this.tab === 'in') { Object.assign(it.in, r); M.touch(it); } else M.fitOutRect(it, r);
    } else if (d.k === 'anchor') { const q = this.ledSnap(p); const a = it.warp.pts[d.i]; M.moveAnchor(it, d.i, q[0] - a[0], q[1] - a[1]); }
    else if (d.k === 'handle') M.moveHandle(it, d.i, dx, dy);
    else if (d.k === 'maskpt') { const q = this.ledSnap(p); it.pts[d.i] = q; M.touch(it); }
    else if (d.k === 'inmaskpt') { it.inMask.pts[d.i] = inToLocal(it, p); it.inMask.rev++; M.touch(it); }
    d.last = p;
    this.draw(); this.renderProps(); this.c.onChange();
  }
  up(e) { if (this.drag) { this.drag = null; try { this.svg.releasePointerCapture(e.pointerId); } catch { } } }
  dbl(e) {
    if (this.drawing) { this.finishDrawing(); return; }
    const t = e.target.closest('[data-k]');
    if (t && t.dataset.k === 'anchor') { const it = this.sel.item; this.pushUndo(); const r = M.outRect(it); M.resetWarp(it); M.fitOutRect(it, r); this.draw(); this.c.onChange(); }
  }
  ledSnap(p) { return this.led ? [Math.round(p[0] / 8) * 8, Math.round(p[1] / 8) * 8] : p; }
  // Ímã: borda do retângulo gruda nas bordas dos outros itens e da tela; grade LED gruda nos 8 px
  snapRect(r, it, resizing) {
    if (this.led) { r.x = Math.round(r.x / 8) * 8; r.y = Math.round(r.y / 8) * 8; if (resizing) { r.w = Math.max(8, Math.round(r.w / 8) * 8); r.h = Math.max(8, Math.round(r.h / 8) * 8); } }
    if (!this.snap) return r;
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
      this.pushUndo();
      if (d.kind === 'inmask') { this.sel.item.inMask = { pts: d.pts, invert: false, rev: 1 }; M.touch(this.sel.item); }
      else { const sc = this.curScreen(); const m = M.mkMask('Máscara ' + (sc.items.filter(i => i.type === 'mask').length + 1), d.pts); sc.items.push(m); this.sel = { screen: sc, item: m }; }
    }
    this.c.onChange(); this.refresh();
  }

  // ---------- adicionar e remover ----------
  add(kind) {
    const sc = this.curScreen(), W = this.c.compW, H = this.c.compH;
    this.pushUndo();
    if (kind === 'screen') {
      const n = M.mkScreen('Tela ' + (this.screens().length + 1), { w: W, h: H });
      n.items.push(M.mkSlice('Slice', { x: 0, y: 0, w: W, h: H }, { x: 0, y: 0, w: W, h: H }));
      this.screens().push(n); this.sel = { screen: n, item: n.items[0] };
    } else if (!sc) return;
    else if (kind === 'slice') {
      const k = sc.items.filter(i => i.type === 'slice').length + 1;
      const s = M.mkSlice('Slice ' + k, { x: W / 4, y: H / 4, w: W / 2, h: H / 2 }, { x: sc.w / 4, y: sc.h / 4, w: sc.w / 2, h: sc.h / 2 });
      sc.items.push(s); this.sel = { screen: sc, item: s };
    } else if (kind === 'maskDraw') { this.setTab('out'); this.drawing = { kind: 'mask', pts: [] }; }
    else {
      const shape = { maskRect: 'rect', maskCircle: 'circle', maskTri: 'triangle', maskHex: 'hexagon' }[kind] || 'rect';
      const m = M.mkMask('Máscara ' + (sc.items.filter(i => i.type === 'mask').length + 1), M.maskShape(shape, sc.w * 0.35, sc.h * 0.3, sc.w * 0.3, sc.h * 0.4));
      sc.items.push(m); this.sel = { screen: sc, item: m }; this.setTab('out');
    }
    this.c.onChange(); this.refresh();
  }
  removeItem(it) {
    this.pushUndo();
    const sc = this.sel.screen; sc.items = sc.items.filter(i => i !== it); this.sel = { screen: sc, item: null }; this.c.onChange(); this.refresh();
  }
  removeScreen(sc) {
    const list = this.screens(); if (list.length <= 1) { this.c.toast('A última tela não pode ser apagada'); return; }
    this.pushUndo();
    list.splice(list.indexOf(sc), 1); const n = list[0]; this.sel = { screen: n, item: n.items[0] || null }; this.c.onChange(); this.layout(); this.refresh();
  }

  // ---------- árvore de telas ----------
  refresh() { this.renderTree(); this.renderProps(); this.syncTools(); this.draw(); }
  devLabel(sc) { return sc.device === 'auto' ? 'Automático' : sc.device === 'window' ? 'Janela' : (this.c.displayLabel(sc.device) || 'Monitor'); }
  renderTree() {
    const list = $('aoList'); list.textContent = '';
    for (const sc of this.screens()) {
      const box = el('div', 'scr');
      const row = el('div', 'row screen' + (this.sel && this.sel.screen === sc && !this.sel.item ? ' sel' : '') + (sc.enabled ? '' : ' off'));
      row.dataset.help = 'Tela|Selecione a tela para editar. Clique duas vezes no nome para renomear; o quadradinho liga e desliga tudo que está nela.';
      const ck = el('i', 'ck'); ck.innerHTML = sc.enabled ? ICON.item : ICON.itemOff; ck.onclick = (e) => { e.stopPropagation(); this.pushUndo(); sc.enabled = !sc.enabled; this.c.onChange(); this.refresh(); };
      const nm = el('span', 'nm', sc.name); nm.ondblclick = (e) => { e.stopPropagation(); this.rename(nm, sc); };
      const x = el('span', 'x', '✕'); x.title = 'Apagar a tela e tudo dentro dela'; x.onclick = (e) => { e.stopPropagation(); this.removeScreen(sc); };
      row.append(ck, nm, x); row.onclick = () => this.select(sc, null);
      const sub = el('div', 'sub'); sub.innerHTML = `<i>${ICON.caret}</i><span>${this.devLabel(sc)} (${sc.w}×${sc.h})</span>`; sub.onclick = () => this.select(sc, null);
      box.append(row, sub);
      for (const it of sc.items) {
        const r = el('div', 'row item' + (this.sel && this.sel.item === it ? ' sel' : '') + (it.enabled ? '' : ' off'));
        r.dataset.help = it.type === 'slice' ? 'Slice|Selecione o slice para editar. Clique duas vezes no nome para renomear.' : 'Máscara|Selecione a máscara para editar. Clique duas vezes no nome para renomear.';
        const c = el('i', 'ck' + (it.type === 'mask' ? ' mask' : '')); c.innerHTML = it.enabled ? ICON.item : ICON.itemOff; c.onclick = (e) => { e.stopPropagation(); this.pushUndo(); it.enabled = !it.enabled; M.touch(it); this.c.onChange(); this.refresh(); };
        const nm = el('span', 'nm', it.name); nm.ondblclick = (e) => { e.stopPropagation(); this.rename(nm, it); };
        const xx = el('span', 'x', '✕'); xx.title = 'Apagar'; xx.onclick = (e) => { e.stopPropagation(); this.sel = { screen: sc, item: it }; this.removeItem(it); };
        r.append(c, nm, xx); r.onclick = () => { this.select(sc, it); if (it.type === 'mask' && this.tab !== 'out') this.setTab('out'); };
        box.appendChild(r);
      }
      list.appendChild(box);
    }
  }
  rename(span, obj) {
    const i = el('input'); i.type = 'text'; i.value = obj.name; i.className = 'rename';
    const done = () => { const v = i.value.trim(); if (v && v !== obj.name) { this.pushUndo(); obj.name = v; this.c.onChange(); } this.refresh(); };
    i.onblur = done; i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); if (e.key === 'Escape') { i.value = obj.name; i.blur(); } e.stopPropagation(); };
    span.replaceWith(i); i.focus(); i.select();
  }

  // ---------- propriedades (linhas no formato do Resolume) ----------
  prow(label, help, ...kids) { const r = el('div', 'prow'); if (help) r.dataset.help = help; r.append(el('span', 'pl', label), ...kids); return r; }
  phead(text, help, extra) { const h = el('div', 'phead'); if (help) h.dataset.help = help; h.append(el('span', '', text)); if (extra) h.appendChild(extra); return h; }
  // valor editável + − + barra. opts: {min,max,step,dec,unit,bar}
  pnum(label, help, v, o, set) {
    const box = el('div', 'pv');
    const val = el('span', 'val', fmtN(v, o.dec || 0) + (o.unit || ''));
    const commit = (n) => { if (isNaN(n)) return; n = Math.min(o.max, Math.max(o.min, n)); this.pushUndo(); set(n); this.c.onChange(); this.draw(); this.renderProps(); };
    val.onclick = () => {
      const i = el('input'); i.type = 'text'; i.value = fmtN(v, o.dec || 0); i.className = 'edit';
      i.onblur = () => commit(parseFloat(i.value.replace(',', '.'))); i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); if (e.key === 'Escape') { i.onblur = null; this.renderProps(); } e.stopPropagation(); };
      val.replaceWith(i); i.focus(); i.select();
    };
    const minus = el('button', 'pm', '−'); minus.type = 'button'; minus.onclick = () => commit(v - (o.step || 1));
    const plus = el('button', 'pm', '+'); plus.type = 'button'; plus.onclick = () => commit(v + (o.step || 1));
    box.append(val, minus, plus);
    if (o.bar) {
      const bar = el('div', 'bar'), fill = el('div', 'fill'); fill.style.width = ((v - o.min) / (o.max - o.min) * 100) + '%'; bar.appendChild(fill);
      bar.onpointerdown = (e) => {
        this.pushUndo(); bar.setPointerCapture(e.pointerId);
        const at = (ev) => { const r = bar.getBoundingClientRect(); let f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); let n = o.min + f * (o.max - o.min); n = Math.round(n / (o.step || 1)) * (o.step || 1); set(n); fill.style.width = f * 100 + '%'; val.textContent = fmtN(n, o.dec || 0) + (o.unit || ''); this.c.onChange(); };
        at(e); bar.onpointermove = (ev) => { if (bar.hasPointerCapture(ev.pointerId)) at(ev); }; bar.onpointerup = () => { bar.onpointermove = null; this.draw(); this.renderProps(); };
      };
      bar.oncontextmenu = (e) => { e.preventDefault(); commit(o.reset ?? o.min); };
      box.appendChild(bar);
    }
    return this.prow(label, help, box);
  }
  pcheck(label, help, v, set) {
    const box = el('div', 'pv'); const c = el('label', 'ck' + (v ? ' on' : '')); c.innerHTML = v ? ICON.item : ICON.itemOff;
    c.onclick = () => { this.pushUndo(); set(!v); this.c.onChange(); this.refresh(); }; box.appendChild(c); return this.prow(label, help, box);
  }
  pselect(label, help, opts, cur, set) {
    const box = el('div', 'pv'); const s = el('select'); for (const [v, t] of opts) { const o = el('option', '', t); o.value = v; s.appendChild(o); } s.value = cur;
    s.onchange = () => { this.pushUndo(); set(s.value); this.c.onChange(); this.refresh(); }; box.appendChild(s); return this.prow(label, help, box);
  }
  picons(label, help, items, cur, set) {
    const box = el('div', 'pv icons');
    for (const [v, icon, tip] of items) { const b = el('button', 'ib' + (v === cur ? ' on' : '')); b.type = 'button'; b.innerHTML = ICON[icon]; b.title = tip || ''; b.onclick = () => { this.pushUndo(); set(v); this.c.onChange(); this.refresh(); }; box.appendChild(b); }
    return this.prow(label, help, box);
  }
  colorRows(P, c) {
    P.appendChild(this.pnum('Brilho', 'Brilho|Compensa projetores diferentes entre si.', Math.round((c.bright - 1) * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { c.bright = 1 + v / 100; }));
    P.appendChild(this.pnum('Contraste', 'Contraste|Compensa projetores diferentes entre si.', Math.round((c.contrast - 1) * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { c.contrast = 1 + v / 100; }));
    P.appendChild(this.pnum('Vermelho', 'Vermelho|Soma ou tira vermelho.', Math.round(c.r * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { c.r = v / 100; }));
    P.appendChild(this.pnum('Verde', 'Verde|Soma ou tira verde.', Math.round(c.g * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { c.g = v / 100; }));
    P.appendChild(this.pnum('Azul', 'Azul|Soma ou tira azul.', Math.round(c.b * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { c.b = v / 100; }));
  }
  rectRows(P, r, apply, help) {
    // X e Y são o centro; Esquerda e Topo as bordas, como no Resolume
    P.appendChild(this.pnum('X', help + ' X|Posição do centro na horizontal, em pixels.', r.x + r.w / 2, { min: -99999, max: 99999, step: 1 }, v => apply({ ...r, x: v - r.w / 2 })));
    P.appendChild(this.pnum('Y', help + ' Y|Posição do centro na vertical, em pixels.', r.y + r.h / 2, { min: -99999, max: 99999, step: 1 }, v => apply({ ...r, y: v - r.h / 2 })));
    P.appendChild(this.pnum('Esquerda', help + ' esquerda|Posição da borda esquerda, em pixels.', r.x, { min: -99999, max: 99999, step: 1 }, v => apply({ ...r, x: v })));
    P.appendChild(this.pnum('Topo', help + ' topo|Posição da borda de cima, em pixels.', r.y, { min: -99999, max: 99999, step: 1 }, v => apply({ ...r, y: v })));
    P.appendChild(this.pnum('Largura', help + ' largura|Largura em pixels.', r.w, { min: 1, max: 99999, step: 1 }, v => apply({ ...r, w: v })));
    P.appendChild(this.pnum('Altura', help + ' altura|Altura em pixels.', r.h, { min: 1, max: 99999, step: 1 }, v => apply({ ...r, h: v })));
  }
  renderProps() {
    const P = $('aoProps'); P.textContent = '';
    const sel = this.sel; if (!sel) { $('aoPropT').textContent = ''; return; }
    const sc = sel.screen, it = sel.item;
    $('aoPropT').textContent = it ? it.name : sc.name;
    if (!it) {
      const devs = [['auto', 'Automático (projetor, se houver)'], ['window', 'Janela'], ...this.c.displays().map(d => [d.id, d.label + ' (' + d.w + '×' + d.h + ')' + (d.primary ? ' principal' : '')])];
      P.appendChild(this.pselect('Dispositivo', 'Dispositivo|Escolha para qual monitor ou janela esta tela vai.', devs, sc.device, v => { sc.device = v; const d = this.c.displays().find(x => x.id === v); if (d) { sc.w = d.w; sc.h = d.h; } this.layout(); }));
      P.appendChild(this.pnum('Largura', 'Largura da tela|Largura da tela em pixels. Num monitor, é o monitor que manda.', sc.w, { min: 16, max: 16384, step: 1 }, v => { sc.w = v | 0; this.layout(); }));
      P.appendChild(this.pnum('Altura', 'Altura da tela|Altura da tela em pixels. Num monitor, é o monitor que manda.', sc.h, { min: 16, max: 16384, step: 1 }, v => { sc.h = v | 0; this.layout(); }));
      P.appendChild(this.pnum('Opacidade', 'Opacidade|Escurece ou acende a tela inteira.', Math.round(sc.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { sc.opacity = v / 100; }));
      this.colorRows(P, sc.color);
      if (this.screens().length > 1) { const rm = el('button', 'wide', 'Apagar esta tela'); rm.type = 'button'; rm.onclick = () => this.removeScreen(sc); P.appendChild(rm); }
    } else if (it.type === 'mask') {
      P.appendChild(this.pcheck('Inverter', 'Inverter máscara|Troca entre apagar o que está dentro ou o que está fora da forma.', it.invert, v => { it.invert = v; M.touch(it); }));
      P.appendChild(this.prow('Pontos', 'Pontos|Quantos pontos tem a forma. Arraste-os no modo Editar pontos.', el('span', 'pinfo', String(it.pts.length))));
      const rm = el('button', 'wide', 'Apagar máscara'); rm.type = 'button'; rm.onclick = () => this.removeItem(it); P.appendChild(rm);
    } else {
      const s = it;
      const srcs = [['comp', 'Composição'], ...this.c.layers().map(L => [String(L.id), L.name])];
      P.appendChild(this.pselect('Fonte', 'Fonte|De onde o slice tira a imagem: a composição inteira ou uma camada direto.', srcs, String(s.source), v => { s.source = v === 'comp' ? 'comp' : +v; M.touch(s); }));
      if (this.tab === 'in') {
        this.rectRows(P, s.in, (r) => { Object.assign(s.in, r); M.touch(s); }, 'Entrada');
        P.appendChild(this.pnum('Giro', 'Giro da entrada|Gira o recorte da composição.', s.in.rot, { min: -180, max: 180, step: 1, unit: '°', bar: true, reset: 0 }, v => { s.in.rot = v; M.touch(s); }));
      } else if (this.mode === 'move') {
        this.rectRows(P, M.outRect(s), (r) => M.fitOutRect(s, r), 'Saída');
        P.appendChild(this.pnum('Giro', 'Giro da saída|Gira o slice em volta do centro, no projetor.', s.warp.rot, { min: -180, max: 180, step: 1, unit: '°', bar: true, reset: 0 }, v => M.rotateOut(s, v)));
      }
      if (this.tab === 'out') {
        const f = s.flip.x && s.flip.y ? 'xy' : s.flip.x ? 'x' : s.flip.y ? 'y' : 'no';
        P.appendChild(this.picons('Espelhar', 'Espelhar|Espelha a saída do slice na horizontal, na vertical ou nas duas.', [['no', 'flipN', 'Sem espelhar'], ['x', 'flipX', 'Horizontal'], ['y', 'flipY', 'Vertical'], ['xy', 'flipXY', 'Ambos']], f, v => { s.flip.x = v === 'x' || v === 'xy'; s.flip.y = v === 'y' || v === 'xy'; M.touch(s); }));
        this.colorRows(P, s.color);
      }
      // soft edge: cabeçalho com a caixa, parâmetros quando ligado
      const ck = el('label', 'ck' + (s.soft.on ? ' on' : '')); ck.innerHTML = s.soft.on ? ICON.item : ICON.itemOff;
      ck.onclick = () => { this.pushUndo(); s.soft.on = !s.soft.on; M.touch(s); this.c.onChange(); this.refresh(); };
      P.appendChild(this.phead('Soft Edge', 'Soft Edge|Liga a emenda onde dois projetores se sobrepõem. A largura vem da sobreposição dos recortes na composição.', ck));
      if (s.soft.on) {
        P.appendChild(this.pnum('Potência', 'Potência|Inclinação da curva da emenda.', s.soft.power, { min: 0.5, max: 5, step: 0.1, dec: 1, bar: true, reset: 2 }, v => { s.soft.power = v; }));
        P.appendChild(this.pnum('Luminância', 'Luminância|Brilho do meio da curva da emenda.', s.soft.lum, { min: 0, max: 1, step: 0.01, dec: 2, bar: true, reset: 0.5 }, v => { s.soft.lum = v; }));
        P.appendChild(this.pnum('Gama', 'Gama|Brilho geral da emenda.', s.soft.gamma[0], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma = [v, v, v]; }));
        P.appendChild(this.pnum('Gama vermelho', 'Gama por cor|Corrige a emenda numa cor só.', s.soft.gamma[0], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma[0] = v; }));
        P.appendChild(this.pnum('Gama verde', 'Gama por cor|Corrige a emenda numa cor só.', s.soft.gamma[1], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma[1] = v; }));
        P.appendChild(this.pnum('Gama azul', 'Gama por cor|Corrige a emenda numa cor só.', s.soft.gamma[2], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma[2] = v; }));
        P.appendChild(this.phead('Compensação de preto', 'Compensação de preto|Levanta o preto do slice fora da emenda, para casar com o preto da área sobreposta.'));
        P.appendChild(this.pnum('Nível', 'Nível de preto|Quanto o preto sobe fora da emenda.', s.soft.black, { min: 0, max: 60, step: 1, bar: true, reset: 0 }, v => { s.soft.black = v; }));
      }
      if (this.tab === 'in') {
        const icons = el('div', 'pv icons');
        for (const [k, icon, tip] of [['heart', 'heart', 'Coração'], ['rect', 'rect', 'Retângulo'], ['circle', 'circle', 'Círculo'], ['triangle', 'tri', 'Triângulo'], ['hexagon', 'hex', 'Hexágono'], ['draw', 'pen', 'Desenhar']]) {
          const b = el('button', 'ib'); b.type = 'button'; b.innerHTML = ICON[icon]; b.title = tip;
          b.onclick = () => { if (k === 'draw') { this.drawing = { kind: 'inmask', pts: [] }; this.draw(); } else { this.pushUndo(); M.setInMask(s, k); this.c.onChange(); this.refresh(); } };
          icons.appendChild(b);
        }
        P.appendChild(this.phead('Máscara de entrada', 'Máscara de entrada|Põe uma máscara na entrada deste slice, para criar transparência.'));
        P.appendChild(this.prow('', '', icons));
        if (s.inMask) {
          P.appendChild(this.pcheck('Inverter', 'Inverter máscara|Mostra só o que está fora da forma.', s.inMask.invert, v => { s.inMask.invert = v; s.inMask.rev++; M.touch(s); }));
          const rm = el('button', 'wide', 'Remover máscara de entrada'); rm.type = 'button'; rm.onclick = () => { this.pushUndo(); M.setInMask(s, null); this.c.onChange(); this.refresh(); }; P.appendChild(rm);
        }
      }
      if (this.tab === 'out' && this.mode === 'pts') {
        const mesh = s.warp.mode === 'mesh', dx = mesh ? s.warp.divX : 0, dy = mesh ? s.warp.divY : 0;
        const setDiv = (nx, ny) => { nx = Math.max(0, Math.min(10, nx | 0)); ny = Math.max(0, Math.min(10, ny | 0)); if (!nx && !ny) M.setWarpMode(s, 'corners'); else { M.setWarpMode(s, 'mesh'); M.setDivisions(s, Math.max(1, nx), Math.max(1, ny)); } this.selPt = -1; };
        P.appendChild(this.phead('Deformação', 'Deformação|Divisões criam uma malha de pontos para encaixar a imagem em superfícies curvas. Com zero divisões, só os quatro cantos.'));
        P.appendChild(this.pselect('Modo de ponto', 'Modo de ponto|Reta ou curva (bezier) entre os pontos da malha.', [['line', 'Reta'], ['curve', 'Curva']], s.warp.curve ? 'curve' : 'line', v => M.setCurve(s, v === 'curve')));
        P.appendChild(this.pnum('Divisões X', 'Divisões X|Quantos pontos de deformação na horizontal.', dx, { min: 0, max: 10, step: 1 }, v => setDiv(v, dy)));
        P.appendChild(this.pnum('Divisões Y', 'Divisões Y|Quantos pontos de deformação na vertical.', dy, { min: 0, max: 10, step: 1 }, v => setDiv(dx, v)));
        if (this.selPt >= 0 && s.warp.pts[this.selPt]) {
          const p = s.warp.pts[this.selPt];
          P.appendChild(this.phead('Ponto', 'Ponto|Posição do ponto selecionado.'));
          P.appendChild(this.pnum('X', 'Ponto X|Posição do ponto na horizontal, em pixels.', p[0], { min: -99999, max: 99999, step: 1 }, v => M.moveAnchor(s, this.selPt, v - p[0], 0)));
          P.appendChild(this.pnum('Y', 'Ponto Y|Posição do ponto na vertical, em pixels.', p[1], { min: -99999, max: 99999, step: 1 }, v => M.moveAnchor(s, this.selPt, 0, v - p[1])));
        }
        const z = el('button', 'wide', 'Zerar os pontos'); z.type = 'button'; z.dataset.help = 'Zerar os pontos|Devolve a malha ao retângulo. Duplo clique num ponto faz o mesmo.';
        z.onclick = () => { this.pushUndo(); const r = M.outRect(s); M.resetWarp(s); M.fitOutRect(s, r); this.c.onChange(); this.refresh(); }; P.appendChild(z);
      }
      const rm = el('button', 'wide', 'Apagar este slice'); rm.type = 'button'; rm.onclick = () => this.removeItem(it); P.appendChild(rm);
    }
  }

  // ---------- presets ----------
  async refreshPresets() {
    const m = $('aoPresetMenu'); m.textContent = '';
    const names = this.c.presets ? await this.c.presets.list() : [];
    $('aoPresetName').textContent = this.presetName || 'Presets';
    for (const n of names) { const b = el('button', n === this.presetName ? 'on' : '', n); b.type = 'button'; b.onclick = () => this.loadPreset(n); m.appendChild(b); }
    if (names.length) m.appendChild(el('div', 'sep'));
    const row = el('div', 'mrow save'); const i = el('input'); i.placeholder = 'nome do preset'; i.value = this.presetName;
    i.onclick = (e) => e.stopPropagation(); i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') this.savePreset(i.value); };
    const b = el('button', '', 'Salvar'); b.type = 'button'; b.onclick = (e) => { e.stopPropagation(); this.savePreset(i.value); };
    row.append(i, b); m.appendChild(row);
    if (this.presetName) { const d = el('button', '', 'Apagar "' + this.presetName + '"'); d.type = 'button'; d.onclick = () => this.deletePreset(); m.appendChild(d); }
  }
  async loadPreset(name) {
    this.closeMenus(); if (!name || !this.c.presets) return;
    try {
      const json = await this.c.presets.load(name);
      this.pushUndo(); this.c.setScreens(M.deserialize(json)); this.presetName = name;
      const sc = this.screens()[0]; this.sel = { screen: sc, item: sc.items[0] || null };
      this.c.onChange(); this.layout(); this.refresh(); this.refreshPresets(); this.c.toast('Preset "' + name + '" carregado');
    } catch (e) { this.c.toast('Não consegui abrir o preset: ' + e.message); }
  }
  async savePreset(name) {
    name = (name || '').trim();
    if (!name) { this.c.toast('Dê um nome ao preset'); return; }
    if (!this.c.presets) return;
    try { await this.c.presets.save(name, M.serialize(this.screens())); this.presetName = name; this.closeMenus(); await this.refreshPresets(); this.c.toast('Preset "' + name + '" salvo'); }
    catch (e) { this.c.toast('Não consegui salvar: ' + e.message); }
  }
  async deletePreset() {
    const name = this.presetName; this.closeMenus(); if (!name || !this.c.presets) return;
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
