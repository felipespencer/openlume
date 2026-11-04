// Modo Atalhos de teclado, copiado do "Edit Keyboard" do Resolume 7.28 (capturas em referencia-resolume/, maquete aprovada em
// atalhos-mockup.html). Ligado o modo (menu Atalhos → Editar teclado, Ctrl+Shift+K), tudo o que dá para mapear fica azul; clicar
// num elemento o seleciona, apertar uma tecla o mapeia (a letra aparece no canto), Delete ou Backspace tira, Esc sai. A aba
// "Atalhos" passa à frente das abas da direita com o preset, a lista, o inspetor (Alvo e Modo) e a ajuda do elemento.
// Etapa 1: clipes, colunas, botões X/B/S e seleção das camadas, transporte do clipe selecionado e os botões da barra (BPM,
// crossfader, Laser, REC, Saída). Os controles de valor (sliders), MIDI e OSC ficam para a etapa 2.
import { el } from './panel.js';

const $ = (id) => document.getElementById(id);
const MOD_ONLY = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);
const KEY_NAME = { ' ': 'Espaço', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
// a tecla como texto: "Q", "Ctrl+Shift+K", "F5", "Espaço"
export const comboOf = (e) => {
  if (MOD_ONLY.has(e.key)) return null;
  const k = KEY_NAME[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  return (e.ctrlKey ? 'Ctrl+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.altKey ? 'Alt+' : '') + k;
};
const isTextField = (t) => t && ((t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'color'].includes(t.type)) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
const shortTitle = (t) => (t || '').split(/[:.(]/)[0].trim();
const TR_NAMES = { '◀': 'Direção para trás', '‖': 'Pausar', '▶': 'Direção para a frente', '|◀': 'Ir para a entrada', '▶|': 'Ir para a saída', '−1q': 'Um quadro para trás', '+1q': 'Um quadro para a frente' };
const LAYER_OPS = { X: ['Tirar do ar', 'Tira a camada do ar.'], B: ['Bypass', 'Desliga ou liga a camada sem perder o clipe.'], S: ['Solo', 'Só esta camada aparece.'] };
const CANDIDATES = '#grid .cell, #grid button.gh.col, #grid .lh button[data-op], #grid .sceneBtn, #clipPan .tbtns button[data-k], #bpmBar button, #xfade button, #btnLaser, #btnRec, #btnOut';

export class KeyMap {
  // c: { state, trigger(li, col), eject(li), triggerColumn(col), selectedClip(), selectLayer(li), C, layerSpeed(L), render(), toast, browser, textBox(título, rótulo, valor), editorOpen() }
  constructor(c) {
    this.c = c; this.on = false; this.cur = null; this.held = new Map(); this.styled = new Set(); this.timer = 0;
    addEventListener('keydown', (e) => this.keydown(e), true);
    addEventListener('keyup', (e) => this.keyup(e), true);
    for (const t of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'dragstart']) addEventListener(t, (e) => this.swallow(e), true);
  }
  // ---------- dados: state.keymap = { active, presets: { nome: [mapeamento] } } (vai junto com a composição) ----------
  ensure() { const S = this.c.state; if (!S.keymap || !S.keymap.presets || !S.keymap.presets[S.keymap.active]) S.keymap = { active: 'Padrão', presets: { 'Padrão': [] } }; return S.keymap; }
  list() { const k = this.ensure(); return k.presets[k.active]; }
  refresh() { if (this.on) { this.scan(); this.renderPanel(); } }
  // ---------- o elemento da tela → o que ele é ----------
  describe(e) {
    const S = this.c.state, N = S.layers.length;
    if (e.matches('#grid .cell')) {
      const li = +e.dataset.layer, col = +e.dataset.col, L = S.layers[li], clip = L && L.clips[col];
      return { kind: 'clip', a: N - li, b: col, uid: clip ? clip.id : null, name: clip ? clip.name : '', title: 'Clipe', help: 'Aperte uma tecla para tocar este clipe (casa vazia: tira a camada do ar).' };
    }
    if (e.matches('#grid button.gh.col')) { const col = +e.dataset.col; return { kind: 'col', a: col, b: null, title: 'Coluna', help: 'Aperte uma tecla para disparar a coluna inteira.' }; }
    if (e.matches('#grid .lh button[data-op]')) {
      const lh = e.closest('.lh'), li = +lh.dataset.layer, L = S.layers[li], op = e.dataset.op;
      if (!L || !LAYER_OPS[op]) return null;
      return { kind: 'layer', a: N - li, b: op, uid: L.id, name: L.name, title: LAYER_OPS[op][0], help: LAYER_OPS[op][1] };
    }
    if (e.matches('#grid .sceneBtn')) { const n = +e.textContent.trim(); if (!n) return null; const L = S.layers[N - n]; return { kind: 'layersel', a: n, b: null, uid: L ? L.id : null, name: L ? L.name : '', title: 'Selecionar a camada', help: 'Seleciona a camada (botão de cena da APC40).' }; }
    if (e.matches('#clipPan .tbtns button[data-k]')) { const k = e.dataset.k; return { kind: 'tr', a: k, b: null, title: TR_NAMES[k] || k, help: (e.dataset.help || '').split('|').slice(1).join('|') || 'Transporte do clipe selecionado.' }; }
    if (e.matches('#bpmBar button')) { const i = [...$('bpmBar').querySelectorAll('button')].indexOf(e); return { kind: 'ui', a: 'bpm:' + i, b: null, title: shortTitle(e.title) || e.textContent.trim(), help: e.title || '' }; }
    if (e.matches('#xfade button')) return { kind: 'ui', a: 'xf:' + e.textContent.trim(), b: null, title: 'Crossfader ' + e.textContent.trim(), help: e.title || '' };
    if (e.id === 'btnLaser' || e.id === 'btnRec' || e.id === 'btnOut') return { kind: 'ui', a: e.id, b: null, title: { btnLaser: 'Laser', btnRec: 'REC', btnOut: 'Saída' }[e.id], help: e.title || '' };
    return null;
  }
  targetsOf(b) {
    if (b.kind === 'clip') return [['pos', 'Por posição'], ['this', 'Este clipe']];
    if (b.kind === 'layer' || b.kind === 'layersel') return [['pos', 'Por posição'], ['this', 'Esta camada'], ['sel', 'Camada selecionada']];
    if (b.kind === 'tr') return [['sel', 'Clipe selecionado']];
    return null;
  }
  canPiano(m) { return m.kind === 'clip' || (m.kind === 'layer' && (m.b === 'B' || m.b === 'S')); }
  // o mapeamento m pertence ao elemento descrito por b?
  sameRec(m, b) {
    if (m.kind !== b.kind) return false;
    if (m.target === 'this') return m.uid != null && m.uid === b.uid;
    return m.a === b.a && m.b === b.b;
  }
  mapFor(b) { return this.list().find(m => this.sameRec(m, b)); }
  // texto do caminho, como no Resolume ("Composição · Camada 5 · Clipe 1 · Tocar")
  labelOf(m) {
    const C = 'Composição · ';
    if (m.kind === 'clip') return m.target === 'this' ? C + 'Clipe "' + (m.name || '?') + '" · Tocar' : C + 'Camada ' + m.a + ' · Clipe ' + (m.b + 1) + ' · Tocar';
    if (m.kind === 'col') return C + 'Coluna ' + (m.a + 1) + ' · Tocar a coluna';
    if (m.kind === 'layer' || m.kind === 'layersel') {
      const op = m.kind === 'layersel' ? 'Selecionar' : LAYER_OPS[m.b][0], who = m.target === 'sel' ? 'Camada selecionada' : m.target === 'this' ? 'Camada "' + (m.name || '?') + '"' : 'Camada ' + m.a;
      return C + who + ' · ' + op;
    }
    if (m.kind === 'tr') return C + 'Clipe selecionado · Transporte · ' + (TR_NAMES[m.a] || m.a);
    return 'Barra · ' + (m.title || m.a);
  }
  // ---------- ligar e desligar o modo ----------
  toggle() { this.on ? this.stop() : this.start(); }
  start() {
    if (this.on) return; this.on = true; this.cur = null; this.ensure();
    document.body.classList.add('mapmode');
    this.pill(true); this.addTab(); this.scan(); this.renderPanel();
    this.timer = setInterval(() => { this.scan(); const p = $('browserPan'); if (this.tabEl && this.tabEl.classList.contains('on') && !p.classList.contains('keys')) this.renderPanel(); }, 300);
  }
  stop() {
    if (!this.on) return; this.on = false; this.cur = null; clearInterval(this.timer);
    document.body.classList.remove('mapmode'); this.pill(false);
    for (const e of document.querySelectorAll('.mappable')) { e.classList.remove('mappable', 'mapsel'); delete e.dataset.mapkey; e.__map = null; }
    for (const e of this.styled) e.style.position = ''; this.styled.clear();
    if (this.tabEl) { this.tabEl.remove(); this.tabEl = null; }
    this.c.browser.render();
  }
  pill(show) {
    let p = $('mapPill');
    if (!p) { p = el('div', '', ''); p.id = 'mapPill'; p.innerHTML = 'Modo <b>Teclado</b> · clique num elemento azul e aperte a tecla · <b>Delete</b> tira · <b>Esc</b> sai'; document.body.appendChild(p); }
    p.hidden = !show;
  }
  addTab() {
    const tabs = $('browserTabs'); this.tabEl = el('span', 'on', 'Atalhos'); this.tabEl.dataset.tab = 'keys';
    this.tabEl.onclick = (e) => { e.stopPropagation(); this.activate(); };
    tabs.prepend(this.tabEl); this.activate();
  }
  activate() { for (const t of $('browserTabs').querySelectorAll('[data-tab]')) t.classList.toggle('on', t === this.tabEl); this.renderPanel(); }
  // ---------- tingir o que é mapeável, com a letra no canto ----------
  scan() {
    if (!this.on) return;
    for (const e of document.querySelectorAll(CANDIDATES)) {
      let b = null; try { b = this.describe(e); } catch { }
      if (!b) { if (e.classList.contains('mappable')) { e.classList.remove('mappable', 'mapsel'); delete e.dataset.mapkey; e.__map = null; } continue; }
      e.classList.add('mappable'); e.__map = b;
      if (!this.styled.has(e) && getComputedStyle(e).position === 'static') { e.style.position = 'relative'; this.styled.add(e); }
      const m = this.mapFor(b); if (m) e.dataset.mapkey = m.key; else delete e.dataset.mapkey;
      e.classList.toggle('mapsel', !!(this.cur && this.sameBase(this.cur, b)));
    }
  }
  sameBase(x, y) { return x.kind === y.kind && x.a === y.a && x.b === y.b; }
  // ---------- cliques no modo: selecionam o elemento em vez de agir ----------
  swallow(e) {
    if (!this.on || !e.target.closest) return;
    const t = e.target.closest('.mappable'); if (!t || !t.__map) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (e.type === 'pointerdown' && e.button === 0) this.select(t.__map);
  }
  select(b) { this.cur = b; this.scan(); this.renderPanel(); }
  // ---------- teclas ----------
  keydown(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); e.stopImmediatePropagation(); this.toggle(); return; }
    if (isTextField(e.target) || document.querySelector('.dlgOver')) return;
    if (this.on) { this.inMode(e); return; }
    if (this.c.editorOpen()) return;   // a Saída avançada e o Laser ficam com as teclas
    const combo = comboOf(e); if (!combo) return;
    const ms = this.list().filter(m => m.key === combo); if (!ms.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    this.held.set(e.code, ms);
    for (const m of ms) this.fire(m, 'down');
  }
  keyup(e) {
    const ms = this.held.get(e.code); if (!ms) return; this.held.delete(e.code);
    for (const m of ms) if (m.piano) this.fire(m, 'up');
  }
  inMode(e) {
    e.preventDefault(); e.stopImmediatePropagation();   // com o modo ligado nenhuma tecla faz o que fazia
    if (e.key === 'Escape') { this.stop(); return; }
    if (!this.cur || e.repeat) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { this.list().splice(0, this.list().length, ...this.list().filter(m => !this.sameRec(m, this.cur))); }
    else {
      const combo = comboOf(e); if (!combo) return;
      const L = this.list(), b = this.cur, old = L.find(m => this.sameRec(m, b)), tg = this.targetsOf(b);
      const m = old || { kind: b.kind, a: b.a, b: b.b, uid: b.uid ?? null, name: b.name || '', title: b.title, key: combo, target: tg ? tg[0][0] : null, piano: false };
      m.key = combo; if (!old) L.push(m);
    }
    this.scan(); this.renderPanel();
  }
  // ---------- executar ----------
  layerIndex(m) {
    const S = this.c.state, N = S.layers.length;
    if (m.target === 'this') return S.layers.findIndex(L => L.id === m.uid);
    if (m.target === 'sel') return S.selLayer;
    const li = N - m.a; return li >= 0 && li < N ? li : -1;
  }
  clipSpot(m) {   // [li, col] do clipe a tocar, ou null
    const S = this.c.state;
    if (m.target === 'this') { for (let li = 0; li < S.layers.length; li++) { const col = S.layers[li].clips.findIndex(c => c && c.id === m.uid); if (col >= 0) return [li, col]; } return null; }
    const li = S.layers.length - m.a; return li >= 0 && li < S.layers.length && m.b < S.layers[li].clips.length ? [li, m.b] : null;
  }
  findUi(a) { for (const e of document.querySelectorAll('#bpmBar button, #xfade button, #btnLaser, #btnRec, #btnOut')) { const b = this.describe(e); if (b && b.a === a) return e; } return null; }
  available(m) {
    const S = this.c.state;
    if (m.kind === 'clip') return !!this.clipSpot(m);
    if (m.kind === 'col') return m.a < document.querySelectorAll('#grid button.gh.col').length;
    if (m.kind === 'layer' || m.kind === 'layersel') return this.layerIndex(m) >= 0;
    if (m.kind === 'tr') return true;
    return !!this.findUi(m.a);
  }
  fire(m, phase) {
    const S = this.c.state, down = phase === 'down';
    if (m.kind === 'clip') {
      const r = this.clipSpot(m); if (!r) return;
      if (down) this.c.trigger(r[0], r[1]); else { const L = S.layers[r[0]]; if (L && L.on === r[1]) this.c.eject(r[0]); }
    } else if (m.kind === 'col') { if (down) this.c.triggerColumn(m.a); }
    else if (m.kind === 'layer') {
      const li = this.layerIndex(m), L = S.layers[li]; if (!L) return;
      if (m.b === 'X') { if (down) this.c.eject(li); }
      else if (m.b === 'B') { L.bypass = !L.bypass; this.c.render(); }
      else if (m.b === 'S') { L.solo = !L.solo; this.c.render(); }
    } else if (m.kind === 'layersel') { const li = this.layerIndex(m); if (down && li >= 0) this.c.selectLayer(li); }
    else if (m.kind === 'tr') { if (down) this.transport(m.a); }
    else if (down) { const e = this.findUi(m.a); if (e) e.click(); }
  }
  transport(k) {
    const clip = this.c.selectedClip(), C = this.c.C; if (!clip || clip.kind !== 'video') return;
    const t = clip.tr, v = C.mediaOf(clip), dur = clip.dur || 0, sp = this.c.state.speed;
    if (k === '◀') C.playClip(clip, -1, sp); else if (k === '▶') C.playClip(clip, 1, sp); else if (k === '‖') C.pauseClip(clip);
    else if (k === '|◀') C.seekClip(clip, t.in); else if (k === '▶|') C.seekClip(clip, (t.out || dur) - 0.05);
    else if (k === '−1q') { C.pauseClip(clip); C.seekClip(clip, v.currentTime - 1 / 30); } else if (k === '+1q') { C.pauseClip(clip); C.seekClip(clip, v.currentTime + 1 / 30); }
  }
  // ---------- a aba Atalhos ----------
  renderPanel() {
    if (!this.on || !this.tabEl || !this.tabEl.classList.contains('on')) return;
    const P = $('browserPan'), K = this.ensure(); P.textContent = ''; P.className = 'pbody browser keys';
    // preset: escolher, novo, duplicar, apagar
    const pre = el('div', 'kpre'), sel = el('select'); for (const n of Object.keys(K.presets)) { const o = el('option', '', n); o.value = n; sel.appendChild(o); } sel.value = K.active;
    sel.onchange = () => { K.active = sel.value; this.cur = null; this.scan(); this.renderPanel(); };
    const mini = (txt, title, fn) => { const b = el('button', 'kmini', txt); b.type = 'button'; b.title = title; b.onclick = fn; return b; };
    pre.append(sel,
      mini('＋', 'Preset novo (vazio)', async () => { const n = await this.c.textBox('Preset novo', 'Nome', 'Preset ' + (Object.keys(K.presets).length + 1)); if (!n || K.presets[n]) return; K.presets[n] = []; K.active = n; this.cur = null; this.scan(); this.renderPanel(); }),
      mini('⧉', 'Duplicar este preset', async () => { const n = await this.c.textBox('Duplicar preset', 'Nome', K.active + ' cópia'); if (!n || K.presets[n]) return; K.presets[n] = JSON.parse(JSON.stringify(K.presets[K.active])); K.active = n; this.scan(); this.renderPanel(); }),
      mini('✕', 'Apagar este preset', () => { if (Object.keys(K.presets).length < 2) { this.c.toast('É o único preset: não dá para apagar'); return; } delete K.presets[K.active]; K.active = Object.keys(K.presets)[0]; this.cur = null; this.scan(); this.renderPanel(); }));
    P.appendChild(pre);
    // lista: caminho à esquerda, tecla à direita; repetida em vermelho; indisponível em cinza
    const list = el('div', 'klist'), count = {}; for (const m of this.list()) count[m.key] = (count[m.key] || 0) + 1;
    if (!this.list().length) list.appendChild(el('div', 'kempty', 'Nenhum atalho neste preset. Clique num elemento azul e aperte uma tecla.'));
    for (const m of this.list()) {
      const row = el('div', 'krow' + (this.cur && this.sameRec(m, this.cur) ? ' cur' : '') + (count[m.key] > 1 ? ' dup' : '') + (this.available(m) ? '' : ' off'));
      row.append(el('span', '', this.labelOf(m)), el('b', '', m.key)); row.title = count[m.key] > 1 ? 'Esta tecla está em mais de um atalho' : this.available(m) ? '' : 'Indisponível agora: o elemento não existe';
      row.onclick = () => { const e = [...document.querySelectorAll('.mappable')].find(x => x.__map && this.sameRec(m, x.__map)); this.cur = e ? e.__map : { kind: m.kind, a: m.a, b: m.b, uid: m.uid, name: m.name, title: m.title, help: '' }; if (e) e.scrollIntoView({ block: 'nearest' }); this.scan(); this.renderPanel(); };
      list.appendChild(row);
    }
    P.appendChild(list);
    // inspetor: Alvo e Modo (ou o convite a clicar num elemento)
    const insp = el('div', 'kinsp'); P.appendChild(insp);
    const m = this.cur && this.mapFor(this.cur);
    if (!this.cur) insp.appendChild(el('div', 'khint', 'Clique num elemento azul da interface.'));
    else if (!m) insp.appendChild(el('div', 'khint', 'Aperte a tecla para mapear: ' + this.labelOf({ ...this.cur, target: (this.targetsOf(this.cur) || [[null]])[0][0] }) + '.'));
    else {
      const tg = this.targetsOf(m);
      if (tg) {
        insp.appendChild(el('label', '', 'Alvo'));
        const s = el('select'); for (const [v, t] of tg) { const o = el('option', '', t); o.value = v; if (v === 'this' && m.uid == null) o.disabled = true; s.appendChild(o); } s.value = m.target; s.disabled = tg.length < 2;
        s.onchange = () => { m.target = s.value; this.scan(); this.renderPanel(); }; insp.appendChild(s);
      }
      insp.appendChild(el('label', '', 'Modo'));
      const md = el('div', 'kmode'), s2 = el('select'); const o = el('option', '', '>'); s2.appendChild(o); s2.disabled = true; md.appendChild(s2);
      const ck = el('label', 'kpiano'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!m.piano; cb.disabled = !this.canPiano(m); cb.onchange = () => { m.piano = cb.checked; };
      ck.title = 'Piano: faz ao apertar e desfaz ao soltar (clipe: toca enquanto segura; B e S: ligam enquanto segura)'; ck.append(cb, document.createTextNode('Piano')); md.appendChild(ck); insp.appendChild(md);
    }
    // ajuda do elemento
    const help = el('div', 'khelp'); const b = this.cur;
    help.append(el('h4', '', b ? b.title : 'Atalhos de teclado'), el('p', '', b ? (b.help || '') + ' Delete ou Backspace tira o atalho.' : 'Cada elemento azul pode ter uma tecla. Clique nele e aperte a tecla. Esc sai do modo.'));
    P.appendChild(help);
  }
}
