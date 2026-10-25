// Peças de interface no formato do Resolume, compartilhadas pela Saída avançada e pelo Laser:
// ícones em SVG e o kit de linhas de propriedade ("rótulo | valor − + barra").
export const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export const fmtN = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

export const ICON = {
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
  // ferramentas do laser
  select: '<svg viewBox="0 0 16 16"><path d="M3 2l10 6-4.5 1L6 14z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  pencil: '<svg viewBox="0 0 16 16"><path d="m2 14 1-4 8-8 3 3-8 8zM11 2l3 3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  line: '<svg viewBox="0 0 16 16"><path d="M3 13 13 3" stroke="currentColor" stroke-width="1.6"/></svg>',
  poly: '<svg viewBox="0 0 16 16"><path d="M8 2 14 6.5 11.5 14h-7L2 6.5z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  text: '<svg viewBox="0 0 16 16"><path d="M3 3h10M8 3v10M6 13h4" stroke="currentColor" stroke-width="1.6"/></svg>',
  erase: '<svg viewBox="0 0 16 16"><path d="m3 10 6-6 4 4-6 6H5zM7 14h7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  dots: '<svg viewBox="0 0 16 16"><circle cx="4" cy="12" r="1.3" fill="currentColor"/><circle cx="8" cy="7" r="1.3" fill="currentColor"/><circle cx="12" cy="4" r="1.3" fill="currentColor"/></svg>',
  safe: '<svg viewBox="0 0 16 16"><rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.5"/></svg>',
  copy: '<svg viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M11 5V2H2v9h3" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  x: '<svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="1.6"/></svg>',
};

// host precisa ter: pushUndo(), c.onChange(), draw(), renderProps(), refresh()
export function propsKit(host) {
  const K = {};
  K.prow = (label, help, ...kids) => { const r = el('div', 'prow'); if (help) r.dataset.help = help; r.append(el('span', 'pl', label), ...kids); return r; };
  K.phead = (text, help, extra) => { const h = el('div', 'phead'); if (help) h.dataset.help = help; h.append(el('span', '', text)); if (extra) h.appendChild(extra); return h; };
  // valor editável + − + barra. o: {min,max,step,dec,unit,bar,reset}
  K.pnum = (label, help, v, o, set) => {
    const box = el('div', 'pv');
    const val = el('span', 'val', fmtN(v, o.dec || 0) + (o.unit || ''));
    const commit = (n) => { if (isNaN(n)) return; n = Math.min(o.max, Math.max(o.min, n)); host.pushUndo(); set(n); host.c.onChange(); host.draw(); host.renderProps(); };
    val.onclick = () => {
      const i = el('input'); i.type = 'text'; i.value = fmtN(v, o.dec || 0); i.className = 'edit';
      i.onblur = () => commit(parseFloat(i.value.replace(',', '.'))); i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); if (e.key === 'Escape') { i.onblur = null; host.renderProps(); } e.stopPropagation(); };
      val.replaceWith(i); i.focus(); i.select();
    };
    const minus = el('button', 'pm', '−'); minus.type = 'button'; minus.onclick = () => commit(v - (o.step || 1));
    const plus = el('button', 'pm', '+'); plus.type = 'button'; plus.onclick = () => commit(v + (o.step || 1));
    box.append(val, minus, plus);
    if (o.bar) {
      const bar = el('div', 'bar'), fill = el('div', 'fill'); bar.appendChild(fill);
      // barra com zero no meio (posição, giro…) enche a partir do centro; as outras, da esquerda
      const paint = (n) => { const f = (n - o.min) / (o.max - o.min); if (o.min < 0 && o.max > 0) { const z = -o.min / (o.max - o.min); fill.style.left = Math.min(f, z) * 100 + '%'; fill.style.width = Math.abs(f - z) * 100 + '%'; } else { fill.style.left = '0'; fill.style.width = f * 100 + '%'; } };
      paint(v);
      bar.onpointerdown = (e) => {
        host.pushUndo(); bar.setPointerCapture(e.pointerId);
        const at = (ev) => { const r = bar.getBoundingClientRect(); const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); let n = o.min + f * (o.max - o.min); n = Math.round(n / (o.step || 1)) * (o.step || 1); set(n); paint(n); val.textContent = fmtN(n, o.dec || 0) + (o.unit || ''); host.c.onChange(); };
        at(e); bar.onpointermove = (ev) => { if (bar.hasPointerCapture(ev.pointerId)) at(ev); }; bar.onpointerup = () => { bar.onpointermove = null; host.draw(); host.renderProps(); };
      };
      bar.oncontextmenu = (e) => { e.preventDefault(); commit(o.reset ?? o.min); };
      box.appendChild(bar);
    }
    return K.prow(label, help, box);
  };
  K.pcheck = (label, help, v, set, txt) => {
    const box = el('div', 'pv'); const c = el('label', 'ck' + (v ? ' on' : '')); c.innerHTML = v ? ICON.item : ICON.itemOff;
    c.onclick = () => { host.pushUndo(); set(!v); host.c.onChange(); host.refresh(); }; box.appendChild(c); if (txt) box.appendChild(el('span', 'cktxt', txt)); return K.prow(label, help, box);
  };
  K.pselect = (label, help, opts, cur, set) => {
    // opção com 3º item = nome do grupo: as opções do mesmo grupo vão juntas num <optgroup>, na ordem em que aparecem
    const box = el('div', 'pv'); const s = el('select'); const groups = new Map();
    for (const [v, t, g] of opts) {
      const o = el('option', '', t); o.value = v;
      if (!g) { s.appendChild(o); continue; }
      if (!groups.has(g)) { const og = el('optgroup'); og.label = g; groups.set(g, og); s.appendChild(og); }
      groups.get(g).appendChild(o);
    }
    s.value = cur;
    s.onchange = () => { host.pushUndo(); set(s.value); host.c.onChange(); host.refresh(); }; box.appendChild(s); return K.prow(label, help, box);
  };
  K.ptext = (label, help, v, set) => {
    const box = el('div', 'pv'); const i = el('input'); i.type = 'text'; i.value = v; i.className = 'txt';
    i.onchange = () => { host.pushUndo(); set(i.value); host.c.onChange(); host.draw(); };
    i.oninput = () => { set(i.value); host.c.onChange(); host.draw(); };
    i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') i.blur(); };
    box.appendChild(i); return K.prow(label, help, box);
  };
  K.picons = (label, help, items, cur, set) => {
    const box = el('div', 'pv icons');
    for (const [v, icon, tip] of items) { const b = el('button', 'ib' + (v === cur ? ' on' : '')); b.type = 'button'; b.innerHTML = ICON[icon] || ('<span>' + icon + '</span>'); b.title = tip || ''; b.onclick = () => { host.pushUndo(); set(v); host.c.onChange(); host.refresh(); }; box.appendChild(b); }
    return K.prow(label, help, box);
  };
  K.pseg = (label, help, opts, cur, set) => {
    const box = el('div', 'pv'); const s = el('div', 'seg');
    for (const [v, t] of opts) { const b = el('button', v === cur ? 'on' : '', t); b.type = 'button'; b.onclick = () => { host.pushUndo(); set(v); host.c.onChange(); host.refresh(); }; s.appendChild(b); }
    box.appendChild(s); return K.prow(label, help, box);
  };
  // cor "#rrggbb"; com alpha, "#rrggbbaa" e um controle de alfa ao lado (as cores do Resolume têm alfa)
  K.pcolor = (label, help, v, set, alpha = false) => {
    const box = el('div', 'pv'); const i = el('input'); i.type = 'color'; i.value = String(v || '#000000').slice(0, 7); i.className = 'sw';
    let a = alpha ? Math.round(parseInt(String(v || '').slice(7, 9) || 'ff', 16) / 2.55) : 100;
    const val = () => alpha ? i.value + Math.round(a * 2.55).toString(16).padStart(2, '0') : i.value;
    const txt = el('span', 'cktxt', alpha ? i.value + ' · ' + a + ' %' : i.value);
    const upd = (push) => { if (push) host.pushUndo(); set(val()); host.c.onChange(); txt.textContent = alpha ? i.value + ' · ' + a + ' %' : i.value; if (push) host.refresh(); else host.draw(); };
    i.oninput = () => upd(false); i.onchange = () => upd(true);
    box.appendChild(i);
    if (alpha) { const r = el('input'); r.type = 'range'; r.min = 0; r.max = 100; r.step = 1; r.value = a; r.className = 'sa'; r.title = 'Alfa da cor (0 % = transparente)'; r.oninput = () => { a = +r.value; upd(false); }; r.onchange = () => { a = +r.value; upd(true); }; box.appendChild(r); }
    box.appendChild(txt); return K.prow(label, help, box);
  };
  K.pbutton = (text, help, fn) => { const b = el('button', 'wide', text); b.type = 'button'; if (help) b.dataset.help = help; b.onclick = fn; return b; };
  return K;
}
