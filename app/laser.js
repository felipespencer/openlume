// Módulo do laser (LaserCube). Segue a maquete laser-mockup.html: aparelho e botão de saída em
// cima; quadros à esquerda com a caixa de ajuda; palco quadrado no meio com as ferramentas de
// desenho e a zona segura; propriedades à direita (texto, cor, distorção, posição, laser).
import * as L from './laser-model.js';
import { paintScan, contourPaths } from './laser-model.js';
import {  FONT_NAMES as HERSHEY_NAMES  } from './hershey.js';
import { EMS_FONT_NAMES } from './vendor/fontes-laser/fontes.js';
const FONT_NAMES = { ...EMS_FONT_NAMES, ...HERSHEY_NAMES };
import { el, fmtN, ICON, propsKit } from './panel.js';

const $ = (id) => document.getElementById(id);
const ib = (id, icon, help, txt) => `<button type="button" id="${id}" class="ib${txt ? ' txt' : ''}" data-help="${help}">${ICON[icon] || icon}${txt ? '<span>' + txt + '</span>' : ''}</button>`;

export class LaserModule {
  // ctx: { onChange(), toast(), laser (ponte projLaser ou null), files (projDesktop ou null) }
  constructor(ctx) {
    this.c = ctx;
    this.frames = []; this.settings = L.LASER_DEFAULTS(); this.active = null; this.sel = null;
    this.open = false; this.tab = 'frames'; this.tool = 'select'; this.grid = true; this.showSafe = true; this.zoom = 'fit';
    this.hist = []; this.redoHist = []; this.drag = null; this.poly = null; this.scale = 1;
    this.status = { connected: false, outputOn: false, bufFree: 0, bufSize: 0, info: null };
    this.lastScan = null; this.audio = 0; this.devices = [];
    Object.assign(this, propsKit(this));
    this.build();
    // três quadros de exemplo para a pessoa ver o que dá para fazer
    const t = L.mkFrame('Texto', 'text'); t.text.content = 'PROJECIONISTA'; t.text.size = 0.11;
    const c = L.mkFrame('Círculo', 'shape'); c.paths = L.shapePaths('circle'); c.color.mode = 'cycle'; c.distort.pulse = 0.5;
    const w = L.mkFrame('Onda', 'shape'); w.paths = L.shapePaths('wave'); w.color.mode = 'two'; w.distort.mirror = 'y';
    this.frames.push(t, c, w); this.sel = t;
    if (ctx.laser) ctx.laser.onStatus((s) => { this.status = s; this.syncTop(); if (this.open) this.renderFoot(); });
    this.loop();
  }

  // ---------- estrutura ----------
  build() {
    $('lz').innerHTML = `
      <div id="lzTop">
        <div class="dev" id="lzDev"><span class="dot"></span><b>Sem LaserCube</b><span id="lzDevInfo">clique em Procurar, na aba Laser</span></div>
        <div class="tabs"><button type="button" id="lzTabFrames" data-help="Quadros|Edite cada quadro: texto, desenho, SVG ou forma, com cor e distorção.">Quadros</button><button type="button" id="lzTabLive" data-help="Ao vivo|Mostra exatamente os pontos que estão indo para o laser.">Ao vivo</button><button type="button" id="lzTabLaser" data-help="Laser|Procurar o LaserCube na rede, ligar e ajustar o aparelho.">Laser</button></div>
        <div class="out"><span class="pps">Pontos/s <b id="lzPps"></b></span><span class="pps">Brilho <b id="lzBright"></b></span><button type="button" class="big" id="lzOut" data-help="Saída|Liga e desliga o feixe. Começa sempre desligada. Nunca aponte o laser para pessoas.">■ SAÍDA DESLIGADA</button><button type="button" id="lzClose" data-help="Fechar|Volta para a grade. O laser continua como estiver.">Fechar</button></div>
      </div>
      <div id="lzMain">
        <div id="lzLeft">
          <div class="tb"><button type="button" id="lzAdd" class="ib" data-help="Adicionar quadro|Texto, desenho à mão, SVG ou uma forma pronta.">${ICON.plus}${ICON.caret}</button>
            <div id="lzAddMenu" class="menu" hidden>
              <button type="button" data-add="text">Texto</button><button type="button" data-add="draw">Desenho à mão</button><button type="button" data-add="svg">Importar SVG…</button><button type="button" data-add="contour">Contorno da projeção</button>
              <div class="mrow"><span>Forma</span><i data-add="circle" title="Círculo">${ICON.circle}</i><i data-add="square" title="Quadrado">${ICON.rect}</i><i data-add="triangle" title="Triângulo">${ICON.tri}</i><i data-add="star" title="Estrela">★</i><i data-add="wave" title="Onda">∿</i><i data-add="heart" title="Coração">${ICON.heart}</i><i data-add="line" title="Linha">${ICON.line}</i></div>
            </div>
            <span class="sp"></span>${ib('lzDup', 'copy', 'Duplicar|Faz uma cópia do quadro selecionado.')}${ib('lzDel', 'x', 'Apagar|Apaga o quadro selecionado.')}</div>
          <div id="lzList"></div>
          <div id="lzHelp"><div class="hh" id="lzHelpT">Ajuda</div><div class="hb" id="lzHelpB">Clique num quadro para editar; a bolinha verde mostra qual está indo para o laser. Arraste um quadro para uma casa da grade para dispará-lo junto com um clipe.</div></div>
        </div>
        <div id="lzCenter">
          <div class="tb">
            <select id="lzZoom" data-help="Zoom|Tamanho do palco na tela."><option value="fit">Ajustar</option><option value="0.5">50%</option><option value="1">100%</option></select>
            ${ib('lzUndo', 'undo', 'Desfazer|Desfaz a última mudança (Ctrl+Z).')}${ib('lzRedo', 'redo', 'Refazer|Refaz (Ctrl+Y).')}
            ${ib('lzGrid', 'grid', 'Grade|Mostra a grade do palco.')}${ib('lzSafe', 'safe', 'Zona segura|Mostra o retângulo fora do qual o feixe é cortado.')}${ib('lzDots', 'dots', 'Pontos|Mostra os pontos que o laser recebe, inclusive os apagados.')}
            <span class="sp"></span>
            <button type="button" id="lzImport" data-help="Importar SVG|Abre um SVG e transforma as linhas dele em caminhos do quadro.">Importar SVG…</button>
            <button type="button" id="lzExport" data-help="Exportar SVG|Salva os caminhos do quadro como SVG.">Exportar SVG</button>
            <button type="button" id="lzSave" data-help="Salvar quadros|Grava todos os quadros e os ajustes do laser num arquivo.">Salvar…</button>
            <button type="button" id="lzLoad" data-help="Abrir quadros|Abre um arquivo de quadros salvo.">Abrir…</button>
          </div>
          <div id="lzStage">
            <div id="lzTools">
              ${ib('tool-select', 'select', 'Selecionar|Arraste o quadro para mover; os cantos redimensionam.')}${ib('tool-pencil', 'pencil', 'Lápis|Desenhe à mão. O traço é simplificado para o laser.')}${ib('tool-line', 'line', 'Linha|Arraste do começo ao fim.')}${ib('tool-rect', 'rect', 'Retângulo|Arraste de um canto ao outro.')}${ib('tool-circle', 'circle', 'Círculo|Arraste do centro para fora.')}${ib('tool-poly', 'poly', 'Polígono|Clique em cada vértice; duplo clique ou Enter fecha, Esc cancela.')}${ib('tool-text', 'text', 'Texto|Escreve no quadro; o conteúdo fica nas propriedades.')}${ib('tool-erase', 'erase', 'Borracha|Clique num traço para apagá-lo.')}
            </div>
            <div id="lzView"><canvas id="lzCv"></canvas><svg id="lzSvg"></svg></div>
          </div>
          <div id="lzFoot"></div>
        </div>
        <div id="lzRight"><div class="ptitle" id="lzPropT"></div><div id="lzProps"></div></div>
      </div>
      <input type="file" id="lzFile" accept=".svg,image/svg+xml" hidden><input type="file" id="lzJson" accept=".json,application/json" hidden>`;
    this.cv = $('lzCv'); this.cx = this.cv.getContext('2d'); this.svg = $('lzSvg');
    $('lzTabFrames').onclick = () => this.setTab('frames'); $('lzTabLive').onclick = () => this.setTab('live'); $('lzTabLaser').onclick = () => this.setTab('laser');
    $('lzClose').onclick = () => this.hide();
    $('lzOut').onclick = () => this.toggleOutput();
    $('lzUndo').onclick = () => this.undo(); $('lzRedo').onclick = () => this.redo();
    $('lzGrid').onclick = () => { this.grid = !this.grid; this.syncTools(); this.draw(); };
    $('lzSafe').onclick = () => { this.showSafe = !this.showSafe; this.syncTools(); this.draw(); };
    $('lzDots').onclick = () => { this.settings.showPoints = !this.settings.showPoints; this.syncTools(); };
    $('lzZoom').onchange = () => { this.zoom = $('lzZoom').value; this.layout(); };
    $('lzDup').onclick = () => this.duplicate(); $('lzDel').onclick = () => this.remove();
    $('lzAdd').onclick = (e) => { e.stopPropagation(); $('lzAddMenu').hidden = !$('lzAddMenu').hidden; };
    $('lzAddMenu').onclick = (e) => { const b = e.target.closest('[data-add]'); if (b) { $('lzAddMenu').hidden = true; this.add(b.dataset.add); } };
    addEventListener('click', () => { $('lzAddMenu').hidden = true; });
    for (const t of ['select', 'pencil', 'line', 'rect', 'circle', 'poly', 'text', 'erase']) $('tool-' + t).onclick = () => this.setTool(t);
    $('lzImport').onclick = () => { $('lzFile').value = ''; $('lzFile').click(); };
    $('lzFile').onchange = () => { const f = $('lzFile').files[0]; if (f) this.importSvg(f); };
    $('lzExport').onclick = () => this.exportSvg();
    $('lzSave').onclick = () => this.saveAll(); $('lzLoad').onclick = () => { $('lzJson').value = ''; $('lzJson').click(); };
    $('lzJson').onchange = () => { const f = $('lzJson').files[0]; if (f) f.text().then(t => this.loadAll(t)); };
    this.svg.addEventListener('pointerdown', (e) => this.down(e)); this.svg.addEventListener('pointermove', (e) => this.move(e));
    addEventListener('pointerup', (e) => this.up(e)); this.svg.addEventListener('dblclick', () => this.finishPoly());
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => this.key(e));
    addEventListener('resize', () => { if (this.open) this.layout(); });
    $('lz').addEventListener('mouseover', (e) => { const h = e.target.closest('[data-help]'); if (!h) return; const [t, b] = h.dataset.help.split('|'); $('lzHelpT').textContent = t; $('lzHelpB').textContent = b || ''; });
    this.syncTools(); this.syncTop();
  }

  // ---------- abrir e fechar ----------
  show() { this.open = true; $('lz').hidden = false; if (!this.sel) this.sel = this.frames[0] || null; this.setTab('frames'); this.layout(); this.refresh(); }
  hide() { this.open = false; $('lz').hidden = true; this.c.onChange(); }
  setTab(t) { this.tab = t; this.syncTools(); this.layout(); this.refresh(); }
  setTool(t) { this.tool = t; this.poly = null; this.syncTools(); this.draw(); if (t === 'text' && this.sel && !this.sel.text.content) { this.pushUndo(); this.sel.text.content = 'TEXTO'; L.touch(this.sel); this.refresh(); } }
  syncTools() {
    $('lzTabFrames').classList.toggle('on', this.tab === 'frames'); $('lzTabLive').classList.toggle('on', this.tab === 'live'); $('lzTabLaser').classList.toggle('on', this.tab === 'laser');
    for (const t of ['select', 'pencil', 'line', 'rect', 'circle', 'poly', 'text', 'erase']) $('tool-' + t).classList.toggle('on', this.tool === t);
    $('lzGrid').classList.toggle('on', this.grid); $('lzSafe').classList.toggle('on', this.showSafe); $('lzDots').classList.toggle('on', !!this.settings.showPoints);
    $('lzUndo').disabled = !this.hist.length; $('lzRedo').disabled = !this.redoHist.length;
    $('lzTools').hidden = this.tab !== 'frames';
    $('lzZoom').value = this.zoom;
  }
  syncTop() {
    const s = this.status, i = s.info;
    const dev = $('lzDev'); dev.classList.toggle('on', s.connected); dev.classList.toggle('warn', !!(i && (i.interlock || i.overTemp)));
    dev.querySelector('b').textContent = s.connected ? (i ? i.name : 'LaserCube') : 'Sem LaserCube';
    $('lzDevInfo').textContent = s.connected ? [s.ip, i && i.battery != null ? i.battery + '%' : '', i && i.temp != null ? i.temp + '°' : '', i && i.interlock ? 'INTERLOCK' : '', i && i.overTemp ? 'QUENTE' : ''].filter(Boolean).join(' · ') : 'clique em Procurar, na aba Laser';
    $('lzPps').textContent = fmtN(this.settings.pps).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); $('lzBright').textContent = Math.round(this.settings.bright * 100) + '%';
    const o = $('lzOut'); o.classList.toggle('on', s.outputOn); o.textContent = s.outputOn ? '● SAÍDA LIGADA' : '■ SAÍDA DESLIGADA'; o.disabled = !s.connected;
  }
  toggleOutput() { if (!this.c.laser || !this.status.connected) { this.c.toast('Conecte o LaserCube primeiro (aba Laser)'); return; } this.c.laser.output(!this.status.outputOn); }
  key(e) {
    if (!this.open || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') { if (this.poly) { this.poly = null; this.draw(); } else this.hide(); }
    else if (e.key === 'Enter' && this.poly) this.finishPoly();
    else if (e.key === 'Delete' && this.sel) this.remove();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? this.redo() : this.undo(); e.preventDefault(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { this.redo(); e.preventDefault(); }
    else if (e.key === ' ') { if (this.sel) this.setActive(this.active === this.sel ? null : this.sel); e.preventDefault(); }
  }

  // ---------- desfazer ----------
  snapState() { return { json: L.serializeLaser(this.frames, this.settings, this.frames.indexOf(this.active)), si: this.frames.indexOf(this.sel) }; }
  pushUndo() { this.hist.push(this.snapState()); if (this.hist.length > 60) this.hist.shift(); this.redoHist = []; this.syncTools(); }
  restore(st) { const d = L.deserializeLaser(st.json); this.frames = d.frames; this.settings = d.settings; this.active = d.active; this.sel = this.frames[st.si] || this.frames[0] || null; this.c.onChange(); this.refresh(); }
  undo() { if (!this.hist.length) return; this.redoHist.push(this.snapState()); this.restore(this.hist.pop()); }
  redo() { if (!this.redoHist.length) return; this.hist.push(this.snapState()); this.restore(this.redoHist.pop()); }

  // ---------- quadros ----------
  add(kind) {
    this.pushUndo();
    let f;
    if (kind === 'text') f = L.mkFrame('Texto ' + (this.frames.length + 1), 'text');
    else if (kind === 'draw') { f = L.mkFrame('Desenho ' + (this.frames.length + 1), 'draw'); this.setTool('pencil'); }
    else if (kind === 'svg') { $('lzFile').value = ''; $('lzFile').click(); this.hist.pop(); return; }
    else if (kind === 'contour') { f = L.mkFrame('Contorno da projeção', 'contour'); f.contour = { level: 0.4, detail: 1 }; f.color.mode = 'solid'; f.color.c1 = '#ffffff'; }
    else { f = L.mkFrame(({ circle: 'Círculo', square: 'Quadrado', triangle: 'Triângulo', star: 'Estrela', wave: 'Onda', heart: 'Coração', line: 'Linha' })[kind] || 'Forma', 'shape'); f.paths = L.shapePaths(kind); }
    this.frames.push(f); this.sel = f; this.c.onChange(); this.refresh();
  }
  duplicate() { if (!this.sel) return; this.pushUndo(); const d = L.deserializeLaser(L.serializeLaser([this.sel], this.settings, -1)).frames[0]; d.name = this.sel.name + ' cópia'; this.frames.splice(this.frames.indexOf(this.sel) + 1, 0, d); this.sel = d; this.c.onChange(); this.refresh(); }
  remove() { if (!this.sel) return; this.pushUndo(); const i = this.frames.indexOf(this.sel); this.frames.splice(i, 1); if (this.active === this.sel) this.active = null; this.sel = this.frames[Math.min(i, this.frames.length - 1)] || null; this.c.onChange(); this.refresh(); }
  setActive(f) { this.active = f; this.c.onChange(); this.renderList(); this.renderFoot(); }
  byId(id) { return this.frames.find(f => f.id === id) || null; }
  rename(span, f) {
    const i = el('input'); i.type = 'text'; i.value = f.name; i.className = 'rename';
    const done = () => { const v = i.value.trim(); if (v && v !== f.name) { this.pushUndo(); f.name = v; this.c.onChange(); } this.refresh(); };
    i.onblur = done; i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); if (e.key === 'Escape') { i.value = f.name; i.blur(); } e.stopPropagation(); };
    span.replaceWith(i); i.focus(); i.select();
  }
  async importSvg(file) {
    try {
      const paths = L.svgToPaths(await file.text());
      this.pushUndo();
      const f = L.mkFrame(file.name.replace(/\.svg$/i, ''), 'svg'); f.paths = paths; f.color.mode = 'solid'; f.color.c1 = '#ffffff';
      this.frames.push(f); this.sel = f; this.c.onChange(); this.refresh(); this.c.toast(paths.length + (paths.length === 1 ? ' caminho importado' : ' caminhos importados'));
    } catch (e) { this.c.toast('Não consegui importar: ' + e.message); }
  }
  exportSvg() {
    if (!this.sel) return;
    const paths = L.framePaths(this.sel, 0, 0); const blob = new Blob([L.pathsToSvg(paths)], { type: 'image/svg+xml' });
    const a = el('a'); a.href = URL.createObjectURL(blob); a.download = this.sel.name.replace(/[\\/:*?"<>|]/g, '') + '.svg'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  saveAll() {
    const blob = new Blob([L.serializeLaser(this.frames, this.settings, this.frames.indexOf(this.active))], { type: 'application/json' });
    const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'quadros-laser.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  loadAll(text) {
    try { this.pushUndo(); const d = L.deserializeLaser(text); this.frames = d.frames; this.settings = d.settings; this.active = d.active; this.sel = this.frames[0] || null; this.c.onChange(); this.refresh(); this.c.toast(this.frames.length + ' quadros abertos'); }
    catch (e) { this.c.toast('Não consegui abrir: ' + e.message); }
  }

  // ---------- lista ----------
  refresh() { this.renderList(); this.renderProps(); this.syncTools(); this.syncTop(); this.draw(); this.renderFoot(); }
  thumbSvg(f) {
    const paths = L.framePaths(f, 0, 0);
    const d = paths.map(p => 'M' + p.map(([x, y]) => ((x + 1) * 17).toFixed(1) + ',' + ((1 - y) * 13).toFixed(1)).join('L')).join(' ');
    return `<svg viewBox="0 0 34 26"><path d="${d}" fill="none" stroke="${f.color.mode === 'solid' ? f.color.c1 : '#6fe6c6'}" stroke-width="0.8"/></svg>`;
  }
  renderList() {
    const list = $('lzList'); list.textContent = '';
    for (const f of this.frames) {
      const row = el('div', 'row' + (f === this.sel ? ' sel' : '')); row.draggable = true;
      row.dataset.help = 'Quadro|Clique para editar, duplo clique no nome para renomear, barra de espaço manda para o laser. Arraste para uma casa da grade.';
      const th = el('div', 'th'); th.innerHTML = this.thumbSvg(f);
      const nm = el('div', 'nm'); const n = el('span', '', f.name); n.ondblclick = (e) => { e.stopPropagation(); this.rename(n, f); }; nm.append(n, el('small', '', L.describe(f)));
      const live = el('i', 'live' + (f === this.active ? ' on' : '')); live.title = f === this.active ? 'Indo para o laser (clique para tirar)' : 'Mandar para o laser';
      live.onclick = (e) => { e.stopPropagation(); this.setActive(f === this.active ? null : f); };
      row.append(th, nm, live);
      row.onclick = () => { this.sel = f; this.refresh(); };
      row.ondragstart = (e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', 'laser'); this.c.dragStart && this.c.dragStart(f); };
      row.ondragend = () => { this.c.dragEnd && this.c.dragEnd(); };
      list.appendChild(row);
    }
  }
  renderFoot() {
    if (!this.open) return;
    const s = this.status, sc = this.lastScan;
    const lit = sc ? sc.lit.reduce((a, b) => a + b, 0) : 0;
    $('lzFoot').innerHTML = `<span>Pontos no quadro <b>${sc ? sc.n : 0}</b> (${lit} acesos)</span><span>Taxa <b>${this.settings.fps} fps</b></span><span title="Quantas vezes por segundo o feixe repassa o desenho: pontos por segundo ÷ pontos no quadro. Abaixo de uns 40 o olho vê piscar.">Repassa <b>${sc && sc.n ? Math.round(this.settings.pps / sc.n) : 0} Hz</b></span><span>Buffer do laser</span><span class="bar"><i style="width:${s.bufSize ? Math.round((1 - s.bufFree / s.bufSize) * 100) : 0}%"></i></span><span title="Quantas vezes o buffer do cubo chegou perto de esvaziar: cada uma é uma piscada">Esvaziou <b>${s.stats ? s.stats.underruns : 0}</b>×</span><span class="sp"></span><span>${this.active ? 'no laser: ' + this.active.name : 'nada indo para o laser'} · zona segura ${Math.round(this.settings.safe.w * 100)}% × ${Math.round(this.settings.safe.h * 100)}%</span>`;
  }

  // ---------- palco ----------
  layout() {
    const st = $('lzStage'), v = $('lzView');
    let k = this.zoom === 'fit' ? Math.min(st.clientWidth - 110, st.clientHeight - 40) / 1000 : +this.zoom; if (!(k > 0)) k = 0.5;
    this.scale = k; const px = Math.round(1000 * k);
    v.style.width = v.style.height = px + 'px';
    this.cv.width = this.cv.height = Math.max(200, px); this.cv.style.width = this.cv.style.height = px + 'px';
    this.svg.setAttribute('viewBox', '0 0 1000 1000'); this.svg.style.width = this.svg.style.height = px + 'px';
    this.draw();
  }
  // -1..1 ↔ 0..1000 do SVG (y para cima no laser, para baixo na tela)
  toS = (p) => [(p[0] + 1) * 500, (1 - p[1]) * 500];
  fromS = (e) => { const r = this.svg.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2]; };
  draw() {
    if (!this.open) return;
    const svg = this.svg; svg.textContent = ''; const S = (tag, a) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in a) n.setAttribute(k, a[k]); svg.appendChild(n); return n; };
    if (this.grid) { S('path', { d: 'M500 0V1000M0 500H1000', class: 'g1' }); S('path', { d: 'M250 0V1000M750 0V1000M0 250H1000M0 750H1000', class: 'g2' }); }
    if (this.showSafe) { const w = this.settings.safe.w * 500, h = this.settings.safe.h * 500; S('rect', { x: 500 - w, y: 500 - h, width: 2 * w, height: 2 * h, class: 'safe' }); }
    const f = this.tab === 'live' ? this.active : this.sel;
    if (f && this.tab === 'frames' && this.tool === 'select') {
      const paths = L.framePaths(f, 0, 0);
      if (paths.length) {
        let x0 = 1, y0 = 1, x1 = -1, y1 = -1; for (const p of paths) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const a = this.toS([x0, y1]), b = this.toS([x1, y0]);
        S('rect', { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1], class: 'selbox', 'data-k': 'body' });
        for (const [hx, hy, i] of [[a[0], a[1], 0], [b[0], a[1], 1], [a[0], b[1], 2], [b[0], b[1], 3]]) S('rect', { x: hx - 6, y: hy - 6, width: 12, height: 12, class: 'hd', 'data-k': 'resize', 'data-i': i });
      }
    }
    // mapeamento: contorno do quadrado mapeado e âncoras arrastáveis (aba Laser)
    const M = this.settings.map;
    if (this.tab === 'laser' && M && M.mode !== 'off') {
      const fn = L.mapFn(M), edge = (a, b) => { const o = []; for (let i = 0; i <= 16; i++) { const q = fn(a[0] + (b[0] - a[0]) * i / 16, a[1] + (b[1] - a[1]) * i / 16); o.push(this.toS(q).join(',')); } return o.join(' '); };
      if (fn) { S('polyline', { points: [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]].map(([a, b]) => edge(a, b)).join(' '), class: 'mapline' }); }
      if (M.mode === 'corners') M.corners.forEach((p, i) => { const s = this.toS(p); S('circle', { cx: s[0], cy: s[1], r: 7, class: 'hd anc', 'data-k': 'mapc', 'data-i': i }); });
      else {
        const cols = 3 * M.divX + 1, rows = 3 * M.divY + 1;
        for (let r = 0; r < rows; r += 3) for (let c = 0; c + 3 < cols; c += 3) { const d = []; for (let i = 0; i <= 12; i++) d.push(this.toS(L.mapFn(M)((c / (cols - 1) + (3 / (cols - 1)) * i / 12) * 2 - 1, (r / (rows - 1)) * 2 - 1)).join(',')); S('polyline', { points: d.join(' '), class: 'mapgrid' }); }
        for (let c = 0; c < cols; c += 3) for (let r = 0; r + 3 < rows; r += 3) { const d = []; for (let i = 0; i <= 12; i++) d.push(this.toS(L.mapFn(M)((c / (cols - 1)) * 2 - 1, (r / (rows - 1) + (3 / (rows - 1)) * i / 12) * 2 - 1)).join(',')); S('polyline', { points: d.join(' '), class: 'mapgrid' }); }
        M.mesh.forEach((p, i) => { const r = Math.floor(i / cols), c = i % cols; if (r % 3 || c % 3) return; const s = this.toS(p); S('circle', { cx: s[0], cy: s[1], r: 6, class: 'hd anc', 'data-k': 'mapm', 'data-i': i }); });
      }
    }
    if (this.poly) S('polyline', { points: this.poly.map(p => this.toS(p).join(',')).join(' '), class: 'drawing' });
    if (this.drag && this.drag.preview) S('polyline', { points: this.drag.preview.map(p => this.toS(p).join(',')).join(' '), class: 'drawing' });
  }
  // contorno: as bordas da composição viram os caminhos do quadro, a cada quadro
  updateContour(f) {
    const src = this.c.compCanvas; if (!f || f.kind !== 'contour' || !src || !src.width) return;
    const det = (f.contour && f.contour.detail) || 1, w = Math.round(96 * det), h = Math.round(w * src.height / src.width);
    if (!this.ctrCv) { this.ctrCv = document.createElement('canvas'); this.ctrCx = this.ctrCv.getContext('2d', { willReadFrequently: true }); }
    if (this.ctrCv.width !== w || this.ctrCv.height !== h) { this.ctrCv.width = w; this.ctrCv.height = h; }
    this.ctrCx.drawImage(src, 0, 0, w, h);
    f.paths = contourPaths(this.ctrCx.getImageData(0, 0, w, h).data, w, h, (f.contour && f.contour.level) || 0.4, 0.012);
  }
  // os pontos do quadro ativo agora (para o laser e para o espelho na projeção), um cálculo por tique
  scanNow(now) {
    if (this.scanAt === now) return this.scanCache;
    this.updateContour(this.active);
    this.scanAt = now; this.scanCache = L.renderPoints(this.active, this.settings, now, this.audio); return this.scanCache;
  }
  // a imagem do laser: linhas acesas com brilho, caminhos apagados tracejados quando "pontos" está ligado
  paint(scan) { paintScan(this.cx, this.cv.width, this.cv.height, scan, this.settings.showPoints); }
  paintOld(scan) {
    const cx = this.cx, W = this.cv.width, k = W / 2; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, W);
    if (!scan || !scan.n) return;
    cx.lineCap = 'round'; cx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      cx.lineWidth = pass ? 1.6 : 6; cx.globalAlpha = pass ? 1 : 0.35;
      for (let i = 1; i < scan.n; i++) {
        const on = scan.lit[i] && scan.lit[i - 1]; if (!on) continue;
        const r = scan.rgb[i * 3], g = scan.rgb[i * 3 + 1], b = scan.rgb[i * 3 + 2];
        cx.strokeStyle = `rgb(${r * 255 | 0},${g * 255 | 0},${b * 255 | 0})`;
        cx.beginPath(); cx.moveTo((scan.xy[(i - 1) * 2] + 1) * k, (1 - scan.xy[(i - 1) * 2 + 1]) * k); cx.lineTo((scan.xy[i * 2] + 1) * k, (1 - scan.xy[i * 2 + 1]) * k); cx.stroke();
      }
    }
    cx.globalAlpha = 1;
    if (this.settings.showPoints) {
      cx.setLineDash([2, 4]); cx.strokeStyle = '#666'; cx.lineWidth = 1; cx.beginPath();
      for (let i = 1; i < scan.n; i++) { if (scan.lit[i] && scan.lit[i - 1]) continue; cx.moveTo((scan.xy[(i - 1) * 2] + 1) * k, (1 - scan.xy[(i - 1) * 2 + 1]) * k); cx.lineTo((scan.xy[i * 2] + 1) * k, (1 - scan.xy[i * 2 + 1]) * k); }
      cx.stroke(); cx.setLineDash([]);
      for (let i = 0; i < scan.n; i++) { cx.fillStyle = scan.lit[i] ? '#fff' : '#555'; cx.fillRect((scan.xy[i * 2] + 1) * k - 1, (1 - scan.xy[i * 2 + 1]) * k - 1, 2, 2); }
    }
  }
  // laço: calcula o quadro ativo e manda para o laser; o palco mostra o quadro em edição
  loop() {
    const tick = () => {
      const now = performance.now() / 1000;
      if (this.c.laser && this.status.connected && this.status.outputOn) {
        const scan = this.scanNow(now);
        this.c.laser.frame(L.toU16(scan, this.settings));
        if (this.open && this.tab === 'live') { this.lastScan = scan; this.paint(scan); }
      } else if (this.open && this.tab === 'live') { this.lastScan = this.scanNow(now); this.paint(this.lastScan); }
      if (this.open && this.tab === 'frames') { if (this.sel !== this.active) this.updateContour(this.sel); this.lastScan = this.sel === this.active ? this.scanNow(now) : L.renderPoints(this.sel, this.settings, now, this.audio); this.paint(this.lastScan); }
      if (this.open && this.tab === 'laser') { const sc = this.scanNow(now); this.lastScan = sc; this.paint(L.mapScan(sc, this.settings)); }
      if (this.open && (now * 2 | 0) !== this.lastFoot) { this.lastFoot = now * 2 | 0; this.renderFoot(); }
      setTimeout(tick, 1000 / this.settings.fps);
    };
    tick();
  }

  // ---------- ferramentas ----------
  down(e) {
    if (e.button !== 0) return;
    if (this.tab === 'laser') {   // arrastar uma âncora do mapeamento
      const t = e.target.closest('[data-k]'); if (!t) return;
      this.svg.setPointerCapture(e.pointerId); this.drag = { k: t.dataset.k, i: +t.dataset.i }; return;
    }
    if (this.tab !== 'frames') return;
    const p = this.fromS(e), f = this.sel;
    if (this.tool === 'poly') { if (!this.poly) this.poly = []; this.poly.push(p); this.draw(); return; }
    if (!f && this.tool !== 'select') { this.add('draw'); }
    const fr = this.sel; if (!fr) return;
    this.svg.setPointerCapture(e.pointerId);
    if (this.tool === 'select') {
      const t = e.target.closest('[data-k]'); if (!t) return;
      this.pushUndo();
      this.drag = { k: t.dataset.k, i: +t.dataset.i, start: p, pos: { ...fr.pos }, f: fr };
    } else if (this.tool === 'erase') {
      const hit = this.hitPath(fr, p); if (hit >= 0) { this.pushUndo(); fr.paths.splice(hit, 1); L.touch(fr); this.c.onChange(); this.refresh(); }
      else if (fr.text.content && this.hitText(fr, p)) { this.pushUndo(); fr.text.content = ''; L.touch(fr); this.c.onChange(); this.refresh(); }
    } else if (this.tool === 'text') { this.pushUndo(); fr.pos.x = p[0]; fr.pos.y = p[1]; if (!fr.text.content) fr.text.content = 'TEXTO'; L.touch(fr); this.c.onChange(); this.refresh(); }
    else { this.drag = { k: this.tool, start: p, pts: [p], f: fr, preview: null }; }
  }
  move(e) {
    const d = this.drag; if (!d) return;
    const p = this.fromS(e), f = d.f;
    if (d.k === 'mapc' || d.k === 'mapm') {
      const M = this.settings.map, q = [Math.max(-1, Math.min(1, p[0])), Math.max(-1, Math.min(1, p[1]))];
      if (d.k === 'mapc') M.corners[d.i] = q;
      else { const cols = 3 * M.divX + 1, old = M.mesh[d.i], dx = q[0] - old[0], dy = q[1] - old[1]; M.mesh[d.i] = q; const r = Math.floor(d.i / cols), c = d.i % cols;   // as alças vizinhas acompanham a âncora
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= 3 * M.divY + 1 || cc >= cols) continue; const h = M.mesh[rr * cols + cc]; h[0] += dx; h[1] += dy; } }
      this.draw(); return;
    }
    if (d.k === 'body') { f.pos.x = d.pos.x + (p[0] - d.start[0]); f.pos.y = d.pos.y + (p[1] - d.start[1]); L.touch(f); this.draw(); this.renderProps(); }
    else if (d.k === 'resize') { const k = Math.max(0.05, d.pos.scale * (1 + (Math.hypot(p[0] - f.pos.x, p[1] - f.pos.y) - Math.hypot(d.start[0] - f.pos.x, d.start[1] - f.pos.y)) / Math.max(0.1, Math.hypot(d.start[0] - f.pos.x, d.start[1] - f.pos.y)))); f.pos.scale = Math.min(3, k); L.touch(f); this.draw(); this.renderProps(); }
    else if (d.k === 'pencil') { d.pts.push(p); d.preview = d.pts; this.draw(); }
    else if (d.k === 'line') { d.preview = [d.start, p]; this.draw(); }
    else if (d.k === 'rect') { d.preview = [d.start, [p[0], d.start[1]], p, [d.start[0], p[1]], d.start]; this.draw(); }
    else if (d.k === 'circle') { const r = Math.hypot(p[0] - d.start[0], p[1] - d.start[1]), c = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; c.push([d.start[0] + Math.cos(a) * r, d.start[1] + Math.sin(a) * r]); } d.preview = c; this.draw(); }
  }
  up(e) {
    const d = this.drag; if (!d) return; this.drag = null; try { this.svg.releasePointerCapture(e.pointerId); } catch { }
    if (d.k === 'body' || d.k === 'resize' || d.k === 'mapc' || d.k === 'mapm') { this.c.onChange(); this.refresh(); return; }
    if (!d.preview || d.preview.length < 2) { this.draw(); return; }
    this.pushUndo();
    const pts = d.k === 'pencil' ? L.simplify(d.preview, 0.006) : d.preview;
    this.addPath(d.f, pts);
  }
  // o caminho novo entra no espaço local do quadro (desfaz posição, escala e giro)
  addPath(f, pts) {
    const a = -f.pos.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), s = f.pos.scale || 1;
    f.paths.push(pts.map(([x, y]) => { const dx = x - f.pos.x, dy = y - f.pos.y; return [(dx * cs - dy * sn) / s, (dx * sn + dy * cs) / s]; }));
    L.touch(f); this.c.onChange(); this.refresh();
  }
  finishPoly() { const p = this.poly; this.poly = null; if (p && p.length >= 2 && this.sel) { this.pushUndo(); this.addPath(this.sel, p.length >= 3 ? [...p, p[0]] : p); } else this.draw(); }
  hitPath(f, p) {
    const paths = L.framePaths({ ...f, text: { ...f.text, content: '' } }, 0, 0); let best = -1, bd = 0.03;
    paths.forEach((path, i) => { for (let j = 1; j < path.length; j++) { const d = segDist(p, path[j - 1], path[j]); if (d < bd) { bd = d; best = i; } } });
    return best < f.paths.length ? best : -1;   // espelhos duplicam caminhos; só os originais contam
  }
  hitText(f, p) { const paths = L.framePaths({ ...f, paths: [] }, 0, 0); return paths.some(path => path.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 0.05)); }

  // ---------- propriedades ----------
  renderProps() {
    const P = $('lzProps'); P.textContent = '';
    if (this.tab === 'laser') { this.renderLaserProps(P); $('lzPropT').textContent = 'Laser'; return; }
    const f = this.tab === 'live' ? this.active : this.sel;
    $('lzPropT').textContent = f ? f.name : (this.tab === 'live' ? 'Nada no laser' : 'Nenhum quadro');
    if (!f) return;
    const T = f.text, C = f.color, D = f.distort, Po = f.pos, tc = () => L.touch(f);
    if (f.kind === 'contour') {
      const ct = f.contour || (f.contour = { level: 0.4, detail: 1 });
      P.appendChild(this.phead('Contorno da projeção', 'Contorno|O laser traça, ao vivo, as bordas do que está na composição.'));
      P.appendChild(this.pnum('Limiar', 'Limiar|Brilho a partir do qual a imagem conta como "aceso". Baixo pega mais bordas.', Math.round(ct.level * 100), { min: 5, max: 95, step: 1, unit: ' %', bar: true, reset: 40 }, v => { ct.level = v / 100; }));
      P.appendChild(this.pnum('Detalhe', 'Detalhe|Resolução da análise. Mais detalhe = mais pontos, mais lento.', ct.detail, { min: 0.5, max: 3, step: 0.25, dec: 2, bar: true, reset: 1 }, v => { ct.detail = v; }));
    }
    P.appendChild(this.phead('Texto', 'Texto|Escrito com fonte de traço único, feita para laser. Linhas separadas com Enter não: use a direção Pilha.'));
    P.appendChild(this.ptext('Conteúdo', 'Conteúdo|O texto. Vazio = sem texto neste quadro.', T.content, v => { T.content = v; tc(); }));
    P.appendChild(this.pselect('Fonte', 'Fonte|Fontes de traço único: EMS (suaves, derivadas de fontes do Google) e Hershey.', Object.entries(FONT_NAMES), T.font, v => { T.font = v; tc(); }));
    P.appendChild(this.pseg('Direção', 'Direção|Horizontal, vertical (deitado de lado) ou pilha (uma letra embaixo da outra).', [['h', 'Horizontal'], ['v', 'Vertical'], ['stack', 'Pilha']], T.dir, v => { T.dir = v; tc(); }));
    P.appendChild(this.pnum('Tamanho', 'Tamanho|Altura das maiúsculas, em % da altura do palco.', Math.round(T.size * 100), { min: 2, max: 100, step: 1, unit: ' %', bar: true, reset: 22 }, v => { T.size = v / 100; tc(); }));
    P.appendChild(this.pnum('Espaçamento', 'Espaçamento|Distância entre as letras.', Math.round(T.spacing * 100), { min: 50, max: 250, step: 5, unit: ' %', bar: true, reset: 100 }, v => { T.spacing = v / 100; tc(); }));
    P.appendChild(this.pseg('Rolagem', 'Rolagem|O texto passa como letreiro.', [['none', 'Parado'], ['left', '←'], ['right', '→'], ['up', '↑']], T.scroll, v => { T.scroll = v; tc(); }));
    P.appendChild(this.phead('Cor', 'Cor|Como o traço é colorido.'));
    P.appendChild(this.pselect('Modo', 'Modo de cor|Arco-íris ao longo do traço, cor fixa, ciclo de matiz no tempo, duas cores alternando ou estrobo.', [['rainbow', 'Arco-íris ao longo do traço'], ['solid', 'Cor fixa'], ['cycle', 'Ciclo de matiz'], ['two', 'Duas cores'], ['strobe', 'Estrobo']], C.mode, v => { C.mode = v; tc(); }));
    if (C.mode === 'solid' || C.mode === 'two' || C.mode === 'strobe') P.appendChild(this.pcolor('Cor', 'Cor|A cor principal.', C.c1, v => { C.c1 = v; tc(); }));
    if (C.mode === 'two') P.appendChild(this.pcolor('Cor 2', 'Cor 2|A segunda cor.', C.c2, v => { C.c2 = v; tc(); }));
    if (C.mode !== 'solid') P.appendChild(this.pnum('Velocidade', 'Velocidade|Quão rápido a cor muda.', C.speed, { min: 0, max: 5, step: 0.1, dec: 1, bar: true, reset: 1 }, v => { C.speed = v; tc(); }));
    P.appendChild(this.phead('Distorção', 'Distorção|Movimentos aplicados ao quadro inteiro.'));
    P.appendChild(this.pnum('Onda', 'Onda|Ondula o desenho na vertical, andando com o tempo.', Math.round(D.wave * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 0 }, v => { D.wave = v / 100; tc(); }));
    P.appendChild(this.pnum('Giro', 'Giro|Gira continuamente, em graus por segundo.', D.spin, { min: -360, max: 360, step: 5, unit: ' °/s', bar: true, reset: 0 }, v => { D.spin = v; tc(); }));
    P.appendChild(this.pnum('Pulso', 'Pulso|Cresce e encolhe no ritmo.', Math.round(D.pulse * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 0 }, v => { D.pulse = v / 100; tc(); }));
    P.appendChild(this.pnum('Tremor', 'Tremor|Sacode os pontos ao acaso.', Math.round(D.jitter * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 0 }, v => { D.jitter = v / 100; tc(); }));
    P.appendChild(this.pseg('Espelho', 'Espelho|Repete o desenho espelhado.', [['none', 'Não'], ['x', '↔'], ['y', '↕'], ['4', '4×']], D.mirror, v => { D.mirror = v; tc(); }));
    P.appendChild(this.pcheck('Ao som', 'Ao som|O pulso e o tremor seguem o microfone do computador.', D.audio, v => { D.audio = v; tc(); if (v) this.startAudio(); }, 'reage ao microfone'));
    P.appendChild(this.phead('Posição', 'Posição|Onde o quadro fica no palco do laser.'));
    P.appendChild(this.pnum('X', 'Posição X|-100 é a esquerda, 100 a direita.', Math.round(Po.x * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { Po.x = v / 100; tc(); }));
    P.appendChild(this.pnum('Y', 'Posição Y|-100 é embaixo, 100 em cima.', Math.round(Po.y * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { Po.y = v / 100; tc(); }));
    P.appendChild(this.pnum('Escala', 'Escala|Tamanho do quadro.', Math.round(Po.scale * 100), { min: 5, max: 300, step: 1, unit: ' %', bar: true, reset: 80 }, v => { Po.scale = v / 100; tc(); }));
    P.appendChild(this.pnum('Giro', 'Giro|Ângulo fixo do quadro.', Po.rot, { min: -180, max: 180, step: 1, unit: ' °', bar: true, reset: 0 }, v => { Po.rot = v; tc(); }));
    P.appendChild(this.pbutton(f === this.active ? 'Tirar do laser' : 'Mandar para o laser', 'Mandar para o laser|Este quadro passa a ser o que o laser desenha (barra de espaço faz o mesmo).', () => this.setActive(f === this.active ? null : f)));
  }
  renderLaserProps(P) {
    const S = this.settings, st = this.status, i = st.info;
    P.appendChild(this.phead('Aparelho', 'Aparelho|O LaserCube ligado por Wi-Fi. O computador precisa estar na rede do LaserCube (ou o LaserCube na sua rede).'));
    P.appendChild(this.prow('Estado', 'Estado|Ligação com o aparelho.', el('span', 'pinfo', st.connected ? 'conectado em ' + st.ip : 'desconectado')));
    if (i) {
      P.appendChild(this.prow('Modelo', '', el('span', 'pinfo', i.name + ' · firmware ' + i.fw)));
      P.appendChild(this.prow('Bateria', '', el('span', 'pinfo', i.battery + '% · ' + i.temp + ' °C' + (i.overTemp ? ' · QUENTE DEMAIS' : i.tempWarn ? ' · esquentando' : ''))));
      P.appendChild(this.prow('Interlock', 'Interlock|A chave de segurança do aparelho. Com ela aberta o laser não acende.', el('span', 'pinfo', i.interlock ? 'ABERTO — o laser não acende' : 'fechado')));
      P.appendChild(this.prow('Taxa máx.', '', el('span', 'pinfo', fmtN(i.maxRate) + ' pontos/s · buffer ' + i.bufSize)));
    }
    const dev = $('lzDevList') || el('div'); dev.id = 'lzDevList';
    P.appendChild(this.pbutton(this.searching ? 'Procurando…' : 'Procurar LaserCube na rede', 'Procurar|Manda um aviso em broadcast e lista quem responder (1,5 s).', () => this.search()));
    for (const d of this.devices) P.appendChild(this.pbutton((st.ip === d.ip ? '● ' : '') + d.name + ' · ' + d.ip + ' · ' + d.battery + '%', 'Conectar|Conecta a este LaserCube. A saída continua desligada.', () => this.connect(d.ip)));
    const ipRow = el('div', 'pv'); const ipIn = el('input'); ipIn.type = 'text'; ipIn.placeholder = 'ou digite o IP (ex.: 192.168.4.1)'; ipIn.className = 'txt';
    ipIn.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && ipIn.value.trim()) this.connect(ipIn.value.trim()); }; ipRow.appendChild(ipIn);
    P.appendChild(this.prow('IP', 'IP|Se a busca não achar, digite o IP do LaserCube e aperte Enter.', ipRow));
    if (st.connected) P.appendChild(this.pbutton('Desconectar', 'Desconectar|Desliga a saída e solta o aparelho.', () => this.c.laser.disconnect()));
    P.appendChild(this.phead('Saída', 'Saída|Vale para todos os quadros.'));
    P.appendChild(this.pnum('Pontos/s', 'Pontos por segundo|Velocidade do galvanômetro. Mais pontos = traço mais parado, mas o laser pode não acompanhar.', S.pps, { min: 5000, max: 60000, step: 1000, bar: true, reset: 30000 }, v => { S.pps = v; if (this.c.laser) this.c.laser.rate(v); }));
    P.appendChild(this.pnum('Brilho', 'Brilho|Potência do feixe.', Math.round(S.bright * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 60 }, v => { S.bright = v / 100; }));
    P.appendChild(this.pnum('Atualização', 'Atualização do feixe|Quantas vezes por segundo o laser repassa o desenho inteiro. Mais alto deixa o desenho firme, mas com menos pontos para o traço (pontos por segundo ÷ este valor). O LaserOS usa 45 fixos.', S.scanHz || 45, { min: 30, max: 120, step: 5, unit: ' Hz', bar: true, reset: 45 }, v => { S.scanHz = v; }));
    P.appendChild(this.pnum('Atraso da cor', 'Atraso da cor|Quantas amostras a cor sai depois da posição. O galvanômetro atrasa em relação ao comando e a cor espera por ele; sem isso o traço acende antes de o espelho chegar e apaga antes de ele terminar (ponta borrada, canto comido). O LaserOS usa 4.', S.colorShift ?? 4, { min: 0, max: 12, step: 1, unit: ' amostras', bar: true, reset: 4 }, v => { S.colorShift = v; }));
    P.appendChild(this.pnum('Colchão', 'Colchão do buffer|Quanto do buffer do cubo o programa tenta manter cheio. Se o desenho pisca em instantes, suba (60 a 80 %): aguenta mais falha do Wi-Fi, mas a imagem chega um pouco atrasada. Para reação rápida ao som, desça.', S.fill || 50, { min: 20, max: 90, step: 5, unit: ' %', bar: true, reset: 50 }, v => { S.fill = v; if (this.c.laser && this.c.laser.fill) this.c.laser.fill(v / 100); }));
    P.appendChild(this.pnum('Taxa', 'Taxa|Quadros por segundo gerados pelo controle.', S.fps, { min: 10, max: 60, step: 5, unit: ' fps', bar: true, reset: 30 }, v => { S.fps = v; }));
    P.appendChild(this.pseg('Traço', 'Estilo do traço|LaserOS: o mesmo método do LaserOS (velocidade constante e pontos de espera nos cantos, no começo e no fim de cada traço): firme e fiel, mas gasta mais pontos. Adaptativo: espalha os pontos para caber no orçamento, mais leve e menos fiel nos cantos.', [['ol', 'LaserOS'], ['adaptive', 'Adaptativo']], S.style || 'ol', v => { S.style = v; }));
    if ((S.style || 'ol') === 'ol') {
      P.appendChild(this.pseg('Predefinição', 'Predefinição|Os três conjuntos de parâmetros do LaserOS. Padrão: o que o LaserOS usa normalmente. Qualidade: mais pontos por traço (desenho mais fiel, quadro mais pesado). Velocidade: menos esperas (mais leve, cantos mais redondos). Mudar qualquer valor abaixo vira "Personalizado".', [['standard', 'Padrão'], ['quality', 'Qualidade'], ['speed', 'Velocidade'], ['custom', 'Personalizado']], S.preset || 'custom', v => { if (v !== 'custom') L.applyOlPreset(S, v); else S.preset = 'custom'; }));
      P.appendChild(this.pnum('Velocidade do traço', 'Velocidade do traço|Quanto o feixe anda entre dois pontos acesos, em fração do meio palco. Menor = mais pontos, traço mais preciso e quadro mais pesado; maior = menos pontos, mais leve e mais grosseiro. O LaserOS usa 6,25 %.', Math.round((S.onSpeed ?? 0.0625) * 1000) / 10, { min: 1, max: 20, step: 0.5, dec: 1, unit: ' %', bar: true, reset: 6.25 }, v => { S.onSpeed = v / 100; S.preset = 'custom'; }));
      P.appendChild(this.pnum('Viagem apagada', 'Velocidade da viagem apagada|Quanto o feixe anda entre dois pontos apagados, ao pular de uma letra ou traço para outro. Menor = viagem mais lenta e sem rastro; maior = mais leve.', Math.round((S.offSpeed ?? 0.0625) * 1000) / 10, { min: 1, max: 20, step: 0.5, dec: 1, unit: ' %', bar: true, reset: 6.25 }, v => { S.offSpeed = v / 100; S.preset = 'custom'; }));
      P.appendChild(this.pnum('Espera no início', 'Espera no início|Pontos apagados parados no começo de cada traço, para o galvanômetro chegar e assentar antes de acender. Se aparecem riscos ligando as letras, suba. O LaserOS usa 8.', S.startWait ?? 8, { min: 0, max: 20, step: 1, unit: ' pontos', bar: true, reset: 8 }, v => { S.startWait = v; S.preset = 'custom'; }));
      P.appendChild(this.pnum('Espera no fim', 'Espera no fim|Pontos acesos parados no fim do traço (o canto final da letra fica nítido). O LaserOS usa 2.', S.endDwell ?? 2, { min: 0, max: 10, step: 1, unit: ' pontos', bar: true, reset: 2 }, v => { S.endDwell = v; S.preset = 'custom'; }));
    }
    P.appendChild(this.pnum('Cantos', 'Pontos de canto|Quantos pontos o laser demora em cada canto e ponta. Mais = cantos mais nítidos, menos pontos sobrando para o traço.', S.corner, { min: 0, max: 10, step: 1, unit: ' pontos', bar: true, reset: 3 }, v => { S.corner = v; S.preset = 'custom'; }));
    // mapeamento: pontos de ancoragem como na Saída avançada
    const M = S.map;
    P.appendChild(this.phead('Mapeamento', 'Mapeamento|Leva o desenho do laser para a superfície: arraste as âncoras no palco (bolinhas) até o contorno casar com a parede, a tela ou o objeto.'));
    P.appendChild(this.pseg('Modo', 'Modo|Não: sai como está. 4 cantos: perspectiva pelos quatro cantos. Malha: rede de curvas com mais âncoras, para superfícies tortas.', [['off', 'Não'], ['corners', 'Cantos'], ['mesh', 'Malha']], M.mode, v => { M.mode = v; this.renderProps(); this.draw(); }));
    if (M.mode === 'mesh') {
      P.appendChild(this.pnum('Divisões ↔', 'Divisões|Quantos retalhos na horizontal.', M.divX, { min: 1, max: 6, step: 1, bar: true, reset: 2 }, v => { L.setMapDivisions(M, v, M.divY); this.draw(); }));
      P.appendChild(this.pnum('Divisões ↕', 'Divisões|Quantos retalhos na vertical.', M.divY, { min: 1, max: 6, step: 1, bar: true, reset: 2 }, v => { L.setMapDivisions(M, M.divX, v); this.draw(); }));
    }
    if (M.mode !== 'off') P.appendChild(this.pbutton('Zerar mapeamento', 'Zerar|Volta as âncoras para os cantos do palco.', () => { L.resetMap(M); this.renderProps(); this.draw(); }));
    P.appendChild(this.phead('Zona segura', 'Zona segura|O feixe é cortado fora deste retângulo. Use para não varrer o público nem o teto.'));
    P.appendChild(this.pnum('Largura', '', Math.round(S.safe.w * 100), { min: 10, max: 100, step: 1, unit: ' %', bar: true, reset: 84 }, v => { S.safe.w = v / 100; }));
    P.appendChild(this.pnum('Altura', '', Math.round(S.safe.h * 100), { min: 10, max: 100, step: 1, unit: ' %', bar: true, reset: 76 }, v => { S.safe.h = v / 100; }));
    const fl = S.flipX && S.flipY ? 'xy' : S.flipX ? 'x' : S.flipY ? 'y' : 'no';
    P.appendChild(this.picons('Espelhar saída', 'Espelhar saída|Se o desenho sair invertido no laser, espelhe aqui.', [['no', 'flipN', 'Não'], ['x', 'flipX', 'Horizontal'], ['y', 'flipY', 'Vertical'], ['xy', 'flipXY', 'Ambos']], fl, v => { S.flipX = v === 'x' || v === 'xy'; S.flipY = v === 'y' || v === 'xy'; }));
    const w = el('div', 'warn'); w.textContent = 'Laser de 7,5 W: nunca aponte para pessoas nem para superfícies que refletem. A zona segura corta o feixe fora do retângulo vermelho; a saída começa sempre desligada e desliga ao fechar o programa.'; P.appendChild(w);
  }
  async search() {
    if (!this.c.laser) { this.c.toast('Sem ponte com o processo principal'); return; }
    this.searching = true; this.renderProps();
    try { this.devices = await this.c.laser.discover(); if (!this.devices.length) this.c.toast('Nenhum LaserCube respondeu. O computador está na rede dele?'); }
    catch (e) { this.c.toast('Busca falhou: ' + e.message); }
    this.searching = false; this.renderProps();
  }
  async connect(ip) {
    try { await this.c.laser.connect(ip); this.c.laser.rate(this.settings.pps); if (this.c.laser.fill) this.c.laser.fill((this.settings.fill || 50) / 100); this.c.toast('LaserCube conectado em ' + ip + '. A saída está desligada.'); }
    catch (e) { this.c.toast(e.message); }
    this.renderProps();
  }
  async startAudio() {
    if (this.audioCtx) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = this.audioCtx = new AudioContext(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 256; src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const read = () => { an.getByteFrequencyData(buf); let s = 0; for (let i = 0; i < 24; i++) s += buf[i]; this.audio = Math.min(1, s / 24 / 160); requestAnimationFrame(read); }; read();
    } catch (e) { this.c.toast('Sem microfone: ' + e.message); }
  }
}
function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
