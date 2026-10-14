// Barra de menus no formato do Resolume (Arena · Composition · Layer · Column · Clip · Output ·
// Shortcuts · View), janelas de diálogo no estilo dos painéis e os atalhos de teclado.
// Cada item chama uma ação de verdade em app.js; o que ainda não existe (Deck, Grupo, MIDI)
// não entra na barra.
import { el, propsKit } from './panel.js';

export class Menubar {
  // root: elemento da barra; defs: () => [{ label, items: () => Item[] }]
  // Item: '-' | { label, key, fn, sub: () => Item[], check, disabled }
  constructor(root, defs) {
    this.root = root; this.defs = defs; this.open = -1; this.layer = null;
    this.render();
    // clicar fora fecha (a camada transparente que cobre a tela é "fora"; só os menus em si são "dentro")
    addEventListener('pointerdown', (e) => { if (this.open >= 0 && !this.root.contains(e.target) && !(this.layer && e.target !== this.layer && this.layer.contains(e.target))) this.close(); });
    addEventListener('wheel', () => { if (this.open >= 0) this.close(); }, { passive: true });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open >= 0) { this.close(); e.stopPropagation(); } });
    addEventListener('blur', () => this.close());
  }
  render() {
    this.root.textContent = '';
    this.defs().forEach((m, i) => {
      const b = el('button', 'mb' + (i === this.open ? ' on' : ''), m.label); b.type = 'button'; b.dataset.i = i;
      b.onpointerdown = (e) => { e.preventDefault(); if (this.open === i) this.close(); else this.show(i); };
      b.onpointerenter = () => { if (this.open >= 0 && this.open !== i) this.show(i); };
      this.root.appendChild(b);
    });
  }
  // os botões não são recriados ao abrir: o pointerdown que abriu ainda está em curso neles
  syncButtons() { [...this.root.children].forEach((b, j) => b.classList.toggle('on', j === this.open)); }
  show(i) {
    this.close(); this.open = i; this.syncButtons();
    const b = this.root.children[i], r = b.getBoundingClientRect();
    this.layer = el('div', 'menuLayer'); document.body.appendChild(this.layer);
    this.layer.onpointerdown = (e) => { if (e.target === this.layer) this.close(); };
    this.popup(this.defs()[i].items(), r.left, r.bottom, null);
  }
  close() { if (this.layer) this.layer.remove(); this.layer = null; if (this.open >= 0) { this.open = -1; this.syncButtons(); } }
  popup(items, x, y, parent) {
    const m = el('div', 'menu'); m.style.left = x + 'px'; m.style.top = y + 'px';
    for (const it of items) {
      if (it === '-') { m.appendChild(el('div', 'sep')); continue; }
      const row = el('div', 'mi' + (it.disabled ? ' dis' : '') + (it.sub ? ' sub' : ''));
      row.append(el('span', 'ck', it.check ? '✓' : ''), el('span', 'lb', it.label), el('span', 'key', it.sub ? '▸' : (it.key || '')));
      if (it.sub && !it.disabled) row.onpointerenter = () => { this.closeFrom(m); const r = row.getBoundingClientRect(); this.popup(it.sub(), r.right - 2, r.top - 4, m); };
      else row.onpointerenter = () => this.closeFrom(m);
      if (!it.disabled && !it.sub) row.onclick = () => { this.close(); it.fn && it.fn(); };
      m.appendChild(row);
    }
    m.dataset.parent = parent ? parent.dataset.id : ''; m.dataset.id = String(Math.random());
    this.layer.appendChild(m);
    // não sair da tela
    const r = m.getBoundingClientRect();
    if (r.right > innerWidth) m.style.left = Math.max(0, innerWidth - r.width - 4) + 'px';
    if (r.bottom > innerHeight) m.style.top = Math.max(0, innerHeight - r.height - 4) + 'px';
    return m;
  }
  closeFrom(m) { for (const o of [...this.layer.children]) if (o !== m && this.isDescendant(o, m)) o.remove(); }
  isDescendant(o, m) { let p = o.dataset.parent; while (p) { if (p === m.dataset.id) return true; const q = [...this.layer.children].find(z => z.dataset.id === p); p = q ? q.dataset.parent : ''; } return false; }
}

// ---------- diálogos ----------
// build(body, K, redo) monta o conteúdo com o kit de propriedades; buttons: [{ label, fn, primary }]
export function openDialog({ title, build, buttons, width = 460, cls = '' }) {
  const ov = el('div', 'dlgOver'), dlg = el('div', 'dlg ' + cls); dlg.style.width = width + 'px';
  const head = el('div', 'dhead', title), body = el('div', 'dbody rprops'), foot = el('div', 'dfoot');
  const close = () => { ov.remove(); removeEventListener('keydown', onKey, true); };
  const host = { pushUndo() { }, c: { onChange() { } }, draw() { }, renderProps: () => redo(), refresh: () => redo() };
  const K = propsKit(host);
  const redo = () => { body.textContent = ''; build(body, K, redo); };
  redo();
  for (const b of buttons) { const bt = el('button', b.primary ? 'primary' : '', b.label); bt.type = 'button'; bt.onclick = () => { if (!b.fn || b.fn() !== false) close(); }; foot.appendChild(bt); }
  const onKey = (e) => { if (e.key === 'Escape') { close(); e.stopPropagation(); } if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) { const p = buttons.find(b => b.primary); if (p) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); if (!p.fn || p.fn() !== false) close(); } } };
  addEventListener('keydown', onKey, true);
  dlg.append(head, body, foot); ov.appendChild(dlg); document.body.appendChild(ov);
  ov.onpointerdown = (e) => { if (e.target === ov) close(); };
  return { close, body, redo };
}
// pergunta um texto (renomear, salvar como…)
export function askText(title, label, value = '') {
  return new Promise((resolve) => {
    let v = value, done = false;
    const d = openDialog({
      title, width: 380,
      build: (body, K) => { const r = K.ptext(label, '', v, (x) => { v = x; }); body.appendChild(r); setTimeout(() => { const i = r.querySelector('input'); if (i) { i.focus(); i.select(); } }, 0); },
      buttons: [{ label: 'Cancelar', fn: () => { done = true; resolve(null); } }, { label: 'OK', primary: true, fn: () => { done = true; resolve(v.trim() || null); } }],
    });
    const ob = new MutationObserver(() => { if (!document.body.contains(d.body)) { ob.disconnect(); if (!done) resolve(null); } });
    ob.observe(document.body, { childList: true });
  });
}
export function confirmBox(title, text) {
  return new Promise((resolve) => {
    let done = false;
    const d = openDialog({ title, width: 400, build: (body) => body.appendChild(el('p', 'dtext', text)), buttons: [{ label: 'Cancelar', fn: () => { done = true; resolve(false); } }, { label: 'OK', primary: true, fn: () => { done = true; resolve(true); } }] });
    const ob = new MutationObserver(() => { if (!document.body.contains(d.body)) { ob.disconnect(); if (!done) resolve(false); } });
    ob.observe(document.body, { childList: true });
  });
}

// ---------- atalhos de teclado ----------
// lista: [{ keys, what, fn }]; o diálogo "Atalhos → Teclado…" mostra a mesma lista que funciona
export function installShortcuts(list) {
  addEventListener('keydown', (e) => {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (document.querySelector('.dlgOver')) return;
    const combo = (e.ctrlKey ? 'Ctrl+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.altKey ? 'Alt+' : '') + (e.key.length === 1 ? e.key.toUpperCase() : e.key);
    const s = list.find(x => x.combo === combo && (!x.when || x.when()));
    if (s) { e.preventDefault(); s.fn(); }
  });
}
export function shortcutsDialog(list) {
  openDialog({
    title: 'Atalhos de teclado', width: 520,
    build: (body) => { for (const s of list) { const r = el('div', 'prow'); r.append(el('span', 'pl', s.keys), el('span', 'pinfo', s.what)); body.appendChild(r); } body.appendChild(el('p', 'dtext', 'Os atalhos valem na janela principal, fora de campos de texto. MIDI e OSC entram com a APC40 mkII (ver o rumo do projeto).')); },
    buttons: [{ label: 'Fechar', primary: true }],
  });
}
