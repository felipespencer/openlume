// Editor da Saída avançada, no visual do Advanced Output do Resolume Arena 7 (capturas reais
// de 2026-10-14): Presets e a árvore de telas à esquerda, com a caixa de ajuda embaixo; abas
// "Seleção de entrada" e "Transformação de saída" no meio, com a barra de ferramentas (zoom,
// desfazer, refazer, mão, ímã, grade; Editar pontos / Transformar); propriedades à direita em
// linhas "rótulo | valor − + barra"; Cancelar e Salvar e fechar embaixo à direita.
import * as M from './screens.js';
import { outlinePath, meshLinesPath, bbox, localToOut, outToLocal } from './warp.js';
import { el, fmtN, ICON, propsKit } from './panel.js';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const TEAL = '#6fe6c6', MASKC = '#f5d742';
const ibtn = (id, icon, help, txt) => `<button type="button" id="${id}" class="ib${txt ? ' txt' : ''}" data-help="${help}">${ICON[icon]}${txt ? '<span>' + txt + '</span>' : ''}</button>`;

export class AdvancedOutput {
  // ctx: { compW, compH, compCanvas, screens(), setScreens(list), layers(), screenCanvas(sc), onChange(), helpers, toast, displays(), displayLabel(id), presets }
  constructor(ctx) {
    this.c = ctx;
    this.open = false; this.tab = 'in'; this.mode = 'move'; this.snap = false; this.grid = true; this.led = false; this.pan = false; this.zoom = 'fit';
    this.sel = null; this.selPt = -1; this.selPtK = null; this.selG = -1; this.nudgeT = 0; this.drawing = null; this.cursor = null; this.drag = null; this.scale = 1;
    this.snapshot = ''; this.presetName = ''; this.hist = []; this.redoHist = []; this.space = false;
    Object.assign(this, propsKit(this));
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
            ${ibtn('aoPts', 'pts', 'Modo Editar pontos|Muda a posição ou a curva de cada ponto do slice. Setas movem o ponto selecionado 1 px; com Shift, 10 px. Tecla T alterna entre Editar pontos e Transformar.', 'Editar pontos')}
            ${ibtn('aoMove', 'move', 'Modo Transformar|Muda a posição, o giro ou o tamanho do slice inteiro. Setas movem o slice 1 px; com Shift, 10 px. Tecla T alterna entre Editar pontos e Transformar.', 'Transformar')}
            <button type="button" id="aoAutomape" class="txt" data-help="Automape|Mapeia sozinho a partir de uma foto: o projetor mostra uma malha, você fotografa de cima da lente, a IA acha as superfícies e cria slices e máscaras aqui.">Automape</button>
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
    $('aoAutomape').onclick = () => { if (this.c.automape) this.c.automape(); };
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
  setTab(t) { this.tab = t; this.selPt = -1; this.selG = -1; this.drawing = null; this.syncTools(); this.layout(); this.refresh(); }
  setMode(m) { this.mode = m; this.selPt = -1; this.selG = -1; this.syncTools(); this.draw(); this.renderProps(); }
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
  // Identificar telas: por 3 s cada saída mostra o nome e o tamanho da tela no centro e, para cada slice, o contorno com o
  // nome no canto de cima (Felipe, 2026-10-30: o nome do slice caía em cima do nome da tela, no mesmo ponto). Os outros
  // ajudantes (grade, malha, Test Card) ficam como estavam e voltam sozinhos.
  identify() {
    const prev = window.__projHelpers || {};
    for (const sc of this.screens()) {
      const slices = sc.items.filter(i => i.type === 'slice' && i.enabled).map(s => { const r = M.outRect(s); return { name: s.name, x: r.x, y: r.y, w: r.w, h: r.h, outline: outlinePoints(s) }; });
      this.c.helpers.set(sc, { ...(prev[sc.id] || {}), identify: { name: sc.name, size: sc.w + ' × ' + sc.h, slices } });
    }
    clearTimeout(this.identT);
    this.identT = setTimeout(() => { for (const sc of this.screens()) { const h = { ...(window.__projHelpers[sc.id] || {}) }; delete h.identify; delete h.w; delete h.h; this.c.helpers.set(sc, Object.keys(h).length ? h : null); } }, 3000);
  }
  key(e) {
    if (!this.open || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === ' ') { this.space = true; e.preventDefault(); }
    else if (e.key === 'Escape') { if (this.drawing) { this.drawing = null; this.draw(); } else this.hide(true); }
    else if (e.key === 't' || e.key === 'T') { if (this.tab === 'out') this.setMode(this.mode === 'move' ? 'pts' : 'move'); }
    else if (e.key === 'Enter' && this.drawing) this.finishDrawing();
    else if (e.key.startsWith('Arrow') && this.sel && this.sel.item && !this.drawing) { this.nudge(e.key, e.shiftKey ? 10 : 1, e.altKey); e.preventDefault(); }
    else if (e.key === 'Delete' && this.sel && this.sel.item) { if ((this.tab === 'in' || this.mode === 'move') && this.selG >= 0) this.removeGrad(); else this.removeItem(this.sel.item); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? this.redo() : this.undo(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { this.redo(); e.preventDefault(); }
  }
  // Setas: movem o ponto selecionado (ou o item inteiro) 1 px; com Shift, 10 px. Toques seguidos viram um só "desfazer".
  nudge(key, step, alt) {
    const it = this.sel.item, dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0, dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
    if (!dx && !dy) return;
    const k = this.selPt >= 0 ? this.selPtK : null;
    if (this.tab === 'in' && it.type !== 'slice') return;
    const now = Date.now(); if (now - this.nudgeT > 800) this.pushUndo(); this.nudgeT = now;
    if ((this.tab === 'in' || this.mode === 'move') && this.selG >= 0 && it.soft.on) {   // degradê selecionado: as setas movem o fim (quadrado); com Alt, o degradê inteiro
      const g0 = this.grads(it)[this.selG]; if (!g0) return;
      const g = M.adoptGrad(it, g0); this.selG = this.grads(it).indexOf(g);
      g.b = [g.b[0] + dx, g.b[1] + dy]; if (alt) g.a = [g.a[0] + dx, g.a[1] + dy]; M.touch(it);
      this.draw(); this.renderProps(); this.c.onChange(); return;
    }
    if (k === 'anchor' && it.warp && it.warp.pts[this.selPt]) M.moveAnchor(it, this.selPt, dx, dy);
    else if (k === 'maskpt' && it.pts && it.pts[this.selPt]) { const q = it.pts[this.selPt]; q[0] += dx; q[1] += dy; M.touch(it); }
    else if (k === 'inmaskpt' && it.inMask && it.inMask.pts[this.selPt]) { const q = it.inMask.pts[this.selPt]; q[0] += dx / it.in.w; q[1] += dy / it.in.h; it.inMask.rev++; M.touch(it); }
    else if (this.tab === 'in') { it.in.x += dx; it.in.y += dy; M.touch(it); }
    else if (it.type === 'mask') { it.pts.forEach(q => { q[0] += dx; q[1] += dy; }); M.touch(it); }
    else { const r = M.outRect(it); M.fitOutRect(it, { x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }); }
    this.draw(); this.renderProps(); this.c.onChange();
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
  // itens debaixo de um ponto do palco (na ordem do palco): retângulo de entrada com giro, contorno da saída ou polígono da máscara
  hit(it, p) {
    if (this.tab === 'in') { const l = inToLocal(it, p); return l[0] >= 0 && l[0] <= 1 && l[1] >= 0 && l[1] <= 1; }
    const pts = it.type === 'slice' ? outlinePoints(it) : it.pts; let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; }
    return ins;
  }
  itemsAt(p) { return this.itemsOnStage().filter(o => this.hit(o.item, p)); }
  select(screen, item) { this.sel = { screen, item }; this.selPt = -1; this.selG = -1; this.syncTools(); if (this.tab === 'out') this.layout(); this.refresh(); }

  // ---------- desenho do palco ----------
  draw() {
    const svg = this.svg; svg.textContent = '';
    const [W, H] = this.stageSize(), it = this.sel && this.sel.item, k = 1 / this.scale;
    const on0 = this.itemsOnStage(), on = [...on0.filter(o => o.item !== it), ...on0.filter(o => o.item === it)];   // o selecionado por último: fica por cima, com as alças (Felipe, 2026-10-30: "quando pego numa slice seleciona a outra que tá atrás")
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
        if (sel && item.soft.on) this.drawGrads(item);
      } else if (item.type === 'slice') {
        if (item.warp.mode === 'mesh') svg.appendChild(svgEl('path', { d: meshLinesPath(item), class: 'mesh' }));
        svg.appendChild(svgEl('path', { d: outlinePath(item), class: 'slice' + (sel ? ' sel' : ''), 'data-k': 'body', 'data-id': item.id }));
        const b = M.outRect(item), t = svgEl('text', { x: b.x + b.w / 2, y: b.y + b.h / 2, class: 'sname', 'text-anchor': 'middle' }); t.textContent = item.name; svg.appendChild(t);
        if (sel && this.mode === 'move') this.drawHandles(b, item);
        if (sel && this.mode === 'move' && item.soft.on) this.drawGrads(item);   // as alças da emenda sobre a imagem deformada (não no modo Editar pontos)
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
  // degradês de emenda (aba Entrada): faixa tracejada, linha A→B, bolinha em A (inteiro), quadrado em B (zero), losangos no trecho
  grads(item) { return M.softGrads(item, M.allSlices(this.screens())); }
  localPx(item, p) { const l = this.tab === 'in' ? inToLocal(item, p) : outToLocal(item, p[0], p[1]); return [l[0] * item.in.w, l[1] * item.in.h]; }
  drawGrads(item) {
    const k = 1 / this.scale, svg = this.svg, w = item.in.w, h = item.in.h, out = this.tab === 'out';
    const L2 = out ? (p) => localToOut(item, p[0] / w, p[1] / h) : (p) => localToIn(item, [p[0] / w, p[1] / h]);
    const dense = (pts) => { if (!out) return pts; const r = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; for (let t = 0; t < 8; t++) r.push([p[0] + (q[0] - p[0]) * t / 8, p[1] + (q[1] - p[1]) * t / 8]); } return r; };   // lados em 8 pedaços: na malha a faixa curva junto
    this.grads(item).forEach((g, i) => {
      const cls = (i === this.selG ? ' cur' : '') + (g.auto ? '' : ' man') + (g.on === false ? ' off' : ''), at = (kk) => ({ 'data-k': kk, 'data-i': i, 'data-id': item.id });
      const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1], Ln = Math.hypot(dx, dy) || 1, px = -dy / Ln, py = dx / Ln, mx = (g.a[0] + g.b[0]) / 2, my = (g.a[1] + g.b[1]) / 2;
      svg.appendChild(svgEl('polygon', { points: dense(M.gradOutline(g)).map(p => L2(p).join(',')).join(' '), class: 'gband' + cls }));
      const A = L2(g.a), B = L2(g.b), N1 = L2([mx + px * g.n1, my + py * g.n1]), N2 = L2([mx - px * g.n2, my - py * g.n2]);
      svg.appendChild(svgEl('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: 'gline' + cls }));
      svg.appendChild(svgEl('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: 'gmid', ...at('gM') }));
      svg.appendChild(svgEl('circle', { cx: A[0], cy: A[1], r: 6 * k, class: 'hd ga' + cls, ...at('gA') }));
      svg.appendChild(svgEl('rect', { x: B[0] - 5 * k, y: B[1] - 5 * k, width: 10 * k, height: 10 * k, class: 'hd' + cls, ...at('gB') }));
      for (const [kk, m] of [['gN1', N1], ['gN2', N2]]) svg.appendChild(svgEl('polygon', { points: `${m[0]},${m[1] - 7 * k} ${m[0] + 7 * k},${m[1]} ${m[0]},${m[1] + 7 * k} ${m[0] - 7 * k},${m[1]}`, class: 'hd' + cls, ...at(kk) }));
      const t = svgEl('text', { x: A[0] + 9 * k, y: A[1] - 9 * k, class: 'gname' + cls }); t.textContent = g.on === false ? 'desligado' : g.auto ? 'automático' : 'ajustado'; svg.appendChild(t);
    });
  }
  removeGrad() {
    const s = this.sel && this.sel.item; if (!s || s.type !== 'slice') return;
    const g = this.grads(s)[this.selG]; if (!g || g.auto) return;
    this.pushUndo(); s.soft.grads = s.soft.grads.filter(x => x !== g); M.touch(s); if (!g.edge) this.selG = -1; this.c.onChange(); this.draw(); this.renderProps();
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
      g.appendChild(svgEl('rect', { x: p[0] - 5 * k, y: p[1] - 5 * k, width: 10 * k, height: 10 * k, class: 'hd anc' + (i === this.selPt && this.selPtK === 'anchor' ? ' cur' : '') }));
      svg.appendChild(g);
    });
  }
  drawPoly(pts, kind, points, item) {
    const k = 1 / this.scale, attrs = { points: pts.map(p => p.join(',')).join(' '), class: kind };
    if (item) { attrs['data-k'] = 'body'; attrs['data-id'] = item.id; }
    this.svg.appendChild(svgEl('polygon', attrs));
    if (points) pts.forEach((p, i) => this.svg.appendChild(svgEl('rect', { x: p[0] - 5 * k, y: p[1] - 5 * k, width: 10 * k, height: 10 * k, class: 'hd' + (i === this.selPt && this.selPtK === kind + 'pt' ? ' cur' : ''), 'data-k': kind + 'pt', 'data-i': i, 'data-id': item ? item.id : '' })));
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
    const wasSel = found.item === (this.sel && this.sel.item);
    if (!wasSel) this.select(found.screen, found.item);
    const it = found.item;
    this.svg.setPointerCapture(e.pointerId);
    this.pushUndo();
    const d = this.drag = { k, i: +t.dataset.i, it, last: p, start: p, wasSel, moved: false };
    if (k[0] === 'g' && k.length <= 3) {   // alça de degradê: o automático vira ajustado na hora em que é tocado
      const g0 = this.grads(it)[d.i]; if (!g0) { this.drag = null; return; }
      this.selG = d.i; d.src = g0; d.g = null; d.g0 = { a: [...g0.a], b: [...g0.b] }; d.lp = this.localPx(it, p);   // só vira ajustado quando mexer de fato (clique parado só seleciona)
      this.draw(); this.renderProps(); return;
    }
    this.selG = -1;
    if (k === 'anchor' || k === 'maskpt' || k === 'inmaskpt') { this.selPt = d.i; this.selPtK = k; this.draw(); this.renderProps(); }
    if (k === 'resize' || k === 'body') d.rect = this.tab === 'in' ? { ...it.in } : it.type === 'slice' ? M.outRect(it) : bbox(it.pts);
  }
  move(e) {
    const p = this.pt(e);
    this.cursor = this.tab === 'out' ? p : null;
    if (this.drawing) { this.draw(); return; }
    const d = this.drag; if (!d) { if (this.grid && this.tab === 'out') this.draw(); return; }
    const it = d.it, dx = p[0] - d.last[0], dy = p[1] - d.last[1];
    if (Math.hypot(p[0] - d.start[0], p[1] - d.start[1]) * this.scale > 3) d.moved = true;
    if (d.src) {   // degradê: pontas, linha inteira ou comprimento da faixa, em pixels do recorte
      if (!d.g) { d.g = M.adoptGrad(it, d.src); d.g.on = true; this.selG = this.grads(it).indexOf(d.g); }   // puxar uma alça liga a emenda e a torna ajustada
      const g = d.g, lp = this.localPx(it, p), ddx = lp[0] - d.lp[0], ddy = lp[1] - d.lp[1];
      if (d.k === 'gA' || d.k === 'gM') g.a = [d.g0.a[0] + ddx, d.g0.a[1] + ddy];
      if (d.k === 'gB' || d.k === 'gM') g.b = [d.g0.b[0] + ddx, d.g0.b[1] + ddy];
      if (e.shiftKey && (d.k === 'gA' || d.k === 'gB')) {   // Shift: o ângulo gruda de 45 em 45
        const o = d.k === 'gA' ? g.b : g.a, q = d.k === 'gA' ? g.a : g.b, Ln = Math.hypot(q[0] - o[0], q[1] - o[1]), an = Math.round(Math.atan2(q[1] - o[1], q[0] - o[0]) / (Math.PI / 4)) * Math.PI / 4;
        g[d.k === 'gA' ? 'a' : 'b'] = [o[0] + Math.cos(an) * Ln, o[1] + Math.sin(an) * Ln];
      }
      if (d.k === 'gN1' || d.k === 'gN2') {
        const vx = g.b[0] - g.a[0], vy = g.b[1] - g.a[1], Ln = Math.hypot(vx, vy) || 1, px = -vy / Ln, py = vx / Ln, s = (lp[0] - (g.a[0] + g.b[0]) / 2) * px + (lp[1] - (g.a[1] + g.b[1]) / 2) * py;
        if (d.k === 'gN1') g.n1 = Math.max(8, Math.round(s)); else g.n2 = Math.max(8, Math.round(-s));
      }
      g.a = g.a.map(Math.round); g.b = g.b.map(Math.round); M.touch(it);
      this.draw(); this.renderProps(); this.c.onChange(); return;
    }
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
  up(e) {
    const d = this.drag; if (!d) return;
    this.drag = null; try { this.svg.releasePointerCapture(e.pointerId); } catch { }
    if (d.moved || d.k !== 'body' || !d.wasSel) return;
    // clique (sem arrastar) no corpo do item já selecionado, com outros embaixo do cursor: a seleção passa para o próximo,
    // em roda; assim dá para pegar o slice que está atrás clicando na região em que os dois se sobrepõem
    const under = this.itemsAt(d.start), i = under.findIndex(o => o.item === d.it);
    if (under.length < 2 || i < 0) return;
    const top = this.hist[this.hist.length - 1]; if (top && top.json === M.serialize(this.screens())) this.hist.pop();   // o clique não mudou nada: fora do desfazer
    const nx = under[(i + 1) % under.length]; this.select(nx.screen, nx.item);
  }
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
      // a tela nova nasce com um slice que mostra a composição inteira e cobre a tela inteira;
      // o primeiro monitor livre, se houver, dá o tamanho
      const ext = this.c.displays().filter(d => !d.primary), used = new Set(this.screens().map(s => s.device === 'auto' && ext[0] ? ext[0].id : s.device));
      const free = ext.find(d => !used.has(d.id));
      const n = M.mkScreen('Tela ' + (this.screens().length + 1), { w: free ? free.w : W, h: free ? free.h : H, device: free ? free.id : 'window' });
      n.items.push(M.mkSlice('Slice', { x: 0, y: 0, w: W, h: H }, { x: 0, y: 0, w: n.w, h: n.h }));
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

  // ---------- propriedades (linhas no formato do Resolume, kit em panel.js) ----------
  // degradês da emenda: lista, pontos, trecho, arredondado e "Voltar ao automático"
  gradProps(P, s) {
    const gs = this.grads(s), refresh = () => { M.touch(s); this.c.onChange(); this.draw(); this.renderProps(); };
    P.appendChild(this.phead('Degradês da emenda', 'Degradês da emenda|Quatro emendas por slice, uma por borda, mais os degradês livres. Cada uma é um degradê com alça na imagem, como no Illustrator: bolinha = brilho inteiro, quadrado = zero, losangos = trecho da faixa. Com vizinho o automático liga e posiciona; sem vizinho fica desligada, pronta para ligar. Mexeu numa alça, vira ajustado.'));
    const list = el('div', 'glist');
    gs.forEach((g, i) => {
      const row = el('div', 'grow' + (i === this.selG ? ' cur' : '') + (g.on === false ? ' off' : ''));
      const on = g.on !== false, ck = el('label', 'ck' + (on ? ' on' : '')); ck.innerHTML = on ? ICON.item : ICON.itemOff; ck.title = on ? 'Desligar esta emenda' : 'Ligar esta emenda';
      ck.onclick = (ev) => { ev.stopPropagation(); this.pushUndo(); const m = M.adoptGrad(s, g); m.on = !on; this.selG = this.grads(s).indexOf(m); refresh(); };
      row.append(ck, el('span', 'nm', M.gradName(g, i)), el('span', 'tag' + (g.auto ? '' : ' man'), !on ? 'desligado' : g.auto ? 'automático' : 'ajustado'));
      if (!g.auto && !g.edge) { const x = el('span', 'x', '✕'); x.title = 'Apagar'; x.onclick = (ev) => { ev.stopPropagation(); this.selG = i; this.removeGrad(); }; row.appendChild(x); }
      row.onclick = () => { this.selG = i; this.draw(); this.renderProps(); };
      list.appendChild(row);
    });
    const add = el('button', 'wide', '+ Adicionar degradê'); add.type = 'button';
    add.onclick = () => { this.pushUndo(); const w = s.in.w, h = s.in.h, rd = s.soft.round; s.soft.grads.push({ id: M.nextId(), edge: null, on: true, a: [Math.round(w * 0.3), Math.round(h / 2)], b: [0, Math.round(h / 2)], n1: Math.round(h / 4), n2: Math.round(h / 4), roundOn: rd.on, round: rd.r }); this.selG = this.grads(s).length - 1; refresh(); };
    P.appendChild(list); P.appendChild(add);
    const g = gs[this.selG]; if (!g) return;
    const edit = (fn) => (v) => { const m = M.adoptGrad(s, g); fn(m, v); this.selG = this.grads(s).indexOf(m); M.touch(s); };
    P.appendChild(this.pnum('Começo X', 'Começo|Ponto de brilho inteiro (bolinha), em pixels do recorte.', g.a[0], { min: -99999, max: 99999, step: 1 }, edit((m, v) => { m.a[0] = v; })));
    P.appendChild(this.pnum('Começo Y', 'Começo|Ponto de brilho inteiro (bolinha), em pixels do recorte.', g.a[1], { min: -99999, max: 99999, step: 1 }, edit((m, v) => { m.a[1] = v; })));
    P.appendChild(this.pnum('Fim X', 'Fim|Ponto de brilho zero (quadrado), em pixels do recorte.', g.b[0], { min: -99999, max: 99999, step: 1 }, edit((m, v) => { m.b[0] = v; })));
    P.appendChild(this.pnum('Fim Y', 'Fim|Ponto de brilho zero (quadrado), em pixels do recorte.', g.b[1], { min: -99999, max: 99999, step: 1 }, edit((m, v) => { m.b[1] = v; })));
    P.appendChild(this.pnum('Trecho +', 'Trecho|Quanto a faixa se estende para cada lado da linha, em pixels (os losangos).', Math.round(g.n1), { min: 8, max: 99999, step: 1 }, edit((m, v) => { m.n1 = v; })));
    P.appendChild(this.pnum('Trecho −', 'Trecho|Quanto a faixa se estende para cada lado da linha, em pixels (os losangos).', Math.round(g.n2), { min: 8, max: 99999, step: 1 }, edit((m, v) => { m.n2 = v; })));
    // arredondado: no automático é o padrão do slice (vale para todos os automáticos); no ajustado é dele
    P.appendChild(this.pcheck('Arredondar', 'Arredondar|Arredonda os cantos da faixa do lado da projeção; na beirada do projetor fica reto.', g.roundOn, v => { if (g.auto) s.soft.round.on = v; else g.roundOn = v; M.touch(s); }));
    P.appendChild(this.pnum('Raio', 'Raio|Tamanho do arredondado, em % de metade do lado menor da faixa.', Math.round((g.round || 0) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 50 }, v => { if (g.auto) s.soft.round.r = v / 100; else g.round = v / 100; M.touch(s); }));
    if (!g.auto && g.edge) { const back = el('button', 'wide', 'Voltar ao automático'); back.type = 'button'; back.onclick = () => { this.pushUndo(); s.soft.grads = s.soft.grads.filter(x => x !== g); refresh(); }; P.appendChild(back); }
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
      P.appendChild(this.pselect('Dispositivo', 'Dispositivo|Escolha para qual monitor ou janela esta tela vai.', devs, sc.device, v => { if (this.c.setDevice) this.c.setDevice(sc, v); else { sc.device = v; const d = this.c.displays().find(x => x.id === v); if (d) M.resizeScreen(sc, d.w, d.h); } this.layout(); }));
      P.appendChild(this.pnum('Largura', 'Largura da tela|Largura da tela em pixels. Num monitor, é o monitor que manda.', sc.w, { min: 16, max: 16384, step: 1 }, v => { M.resizeScreen(sc, v, sc.h); this.layout(); }));
      P.appendChild(this.pnum('Altura', 'Altura da tela|Altura da tela em pixels. Num monitor, é o monitor que manda.', sc.h, { min: 16, max: 16384, step: 1 }, v => { M.resizeScreen(sc, sc.w, v); this.layout(); }));
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
      P.appendChild(this.phead('Soft Edge', 'Soft Edge|Liga a emenda onde dois projetores se sobrepõem. A largura vem da sobreposição dos recortes na composição, e a rampa fica só no trecho da borda onde o outro projetor está.', ck));
      if (s.soft.on) {
        P.appendChild(this.pnum('Potência', 'Potência|Inclinação da curva da emenda.', s.soft.power, { min: 0.5, max: 5, step: 0.1, dec: 1, bar: true, reset: 2 }, v => { s.soft.power = v; }));
        P.appendChild(this.pnum('Luminância', 'Luminância|Brilho do meio da curva da emenda.', s.soft.lum, { min: 0, max: 1, step: 0.01, dec: 2, bar: true, reset: 0.5 }, v => { s.soft.lum = v; }));
        P.appendChild(this.pnum('Gama', 'Gama|Brilho geral da emenda.', s.soft.gamma[0], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma = [v, v, v]; }));
        P.appendChild(this.pnum('Gama vermelho', 'Gama por cor|Corrige a emenda numa cor só.', s.soft.gamma[0], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma[0] = v; }));
        P.appendChild(this.pnum('Gama verde', 'Gama por cor|Corrige a emenda numa cor só.', s.soft.gamma[1], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma[1] = v; }));
        P.appendChild(this.pnum('Gama azul', 'Gama por cor|Corrige a emenda numa cor só.', s.soft.gamma[2], { min: 1, max: 4, step: 0.05, dec: 2, bar: true, reset: 2.2 }, v => { s.soft.gamma[2] = v; }));
        P.appendChild(this.phead('Compensação de preto', 'Compensação de preto|Levanta o preto do slice fora da emenda, para casar com o preto da área sobreposta.'));
        P.appendChild(this.pnum('Nível', 'Nível de preto|Quanto o preto sobe fora da emenda.', s.soft.black, { min: 0, max: 60, step: 1, bar: true, reset: 0 }, v => { s.soft.black = v; }));
        if (this.tab === 'in' || this.mode === 'move') this.gradProps(P, s);
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
