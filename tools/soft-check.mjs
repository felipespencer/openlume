// Verifica os degradês de emenda (soft edge) da Saída avançada: o automático põe um degradê por vizinho só no trecho
// da sobreposição; as alças (bolinha, quadrado, losangos, linha) são arrastadas com mouse REAL pelo CDP e o degradê
// vira "ajustado"; Ctrl+Z, "Voltar ao automático", setas, "+ Adicionar degradê", Delete e o salvar/abrir do preset.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/soft-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume') || pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y, mods = 0) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, modifiers: mods });
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, 0); await mouse('mousePressed', x0, y0, mods); for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6, mods); await wait(20); } await mouse('mouseReleased', x1, y1, mods); await wait(120); };
const click = async (x, y) => { await mouse('mouseMoved', x, y, 0); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(120); };
const arrow = (name, shift = false, alt = false) => key(name, name, { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[name], (shift ? 8 : 0) | (alt ? 1 : 0));
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const rect = async (sel) => JSON.parse(await ev(`(() => { const e = document.querySelector('${sel}'); if (!e) return 'null'; if (e.closest('#aoProps')) e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }); })()`));
const grads = async () => JSON.parse(await ev(`JSON.stringify(${P}.ao.grads(${P}.screens()[1].items[0]).map(g => ({ auto: !!g.auto, on: g.on !== false, edge: g.edge, a: g.a.map(Math.round), b: g.b.map(Math.round), n1: Math.round(g.n1), n2: Math.round(g.n2) })))`));
const manual = async () => +await ev(`${P}.screens()[1].items[0].soft.grads.length`);

// preparo: diálogos fechados com Esc de verdade; composição 2880×1920 com cor sólida; deitado 1920×1080 + em pé 1080×1920 lado a lado, soft edge nos dois
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape', 'Escape', 27); await wait(200); }
await ev(`(() => { const p = ${P}; if (p.automape && p.automape.dlg) p.automape.close(); p.ao.hide(false); if (p.laser.open) p.laser.hide(); document.querySelectorAll('.dlgOver').forEach(d => d.remove()); return 1; })()`);
const antes = await ev(`${P}.M.serialize(${P}.screens())`);
await ev(`(() => { const p = ${P}, M = p.M; p.putSource(1, 0, 'solidcolor'); p.state.layers[1].clips[0].fx = []; p.trigger(1, 0);
  p.applySettings(Object.assign({}, p.state.settings, { w: 2880, h: 1920 }));
  const mk = (name, w, h, inr) => { const S = M.mkScreen(name, { device: 'window', w, h }); S.enabled = true; const sl = M.mkSlice('Slice 1', inr, { x: 0, y: 0, w, h }); sl.soft.on = true; S.items.push(sl); return S; };
  p.setScreens([mk('Deitado', 1920, 1080, { x: 0, y: 0, w: 1920, h: 1080 }), mk('Em pé', 1080, 1920, { x: 1700, y: 0, w: 1080, h: 1920 })]); p.render(); return 1; })()`);
const lum = async (si, x, y) => { const q = JSON.parse(await ev(`JSON.stringify(${P}.probeScreen(${P}.screens()[${si}], [[${x}, ${y}]])[0])`)); return q[0] + q[1] + q[2]; };

// 1. automático: um degradê por vizinho, só no trecho
let g = await grads();
check('quatro emendas por slice: a esquerda do em pé ligada pelo automático no trecho do deitado, as outras três desligadas', g.length === 4 && g[0].auto && g[0].on && g[0].edge === 'l' && g[0].a[0] === 220 && g[0].b[0] === 0 && g[0].a[1] === 540 && g[0].n1 === 540 && g[1].edge === 'r' && !g[1].on && !g[2].on && !g[3].on, JSON.stringify(g));
check('a saída do em pé escurece na borda dentro do trecho e fica inteira fora dele', await lum(1, 0.03, 0.25) < 90 && await lum(1, 0.03, 0.9) === 255 && await lum(1, 0.5, 0.5) === 255, `dentro=${await lum(1, 0.03, 0.25)} fora=${await lum(1, 0.03, 0.9)}`);
check('a saída do deitado escurece na borda direita', await lum(0, 0.985, 0.5) < 90 && await lum(0, 0.5, 0.5) === 255, `borda=${await lum(0, 0.985, 0.5)}`);

// 2. abre a Saída avançada na aba Entrada com o em pé selecionado: as alças aparecem
await ev(`(() => { const p = ${P}; p.ao.show(); p.ao.setTab('in'); const sc = p.screens()[1]; p.ao.select(sc, sc.items[0]); return 1; })()`); await wait(400);
const n = async (k) => +await ev(`document.querySelectorAll('#aoView svg [data-k=${k}]').length`);
check('alças das quatro emendas na aba Entrada: bolinha, quadrado, dois losangos e a linha de cada uma', await n('gA') === 4 && await n('gB') === 4 && await n('gN1') === 4 && await n('gN2') === 4 && await n('gM') === 4, `gA=${await n('gA')} gB=${await n('gB')} gN1=${await n('gN1')} gM=${await n('gM')}`);
check('painel lista as quatro: esquerda automática, as outras desligadas', await ev(`document.querySelectorAll('#aoProps .grow').length`) === 4 && await ev(`[...document.querySelectorAll('#aoProps .grow .tag')].map(t => t.textContent).join(',')`) === 'automático,desligado,desligado,desligado');

// 3. arrasta a bolinha (A) para a direita com mouse real: vira ajustado, A anda, o automático some
const A = await rect('#aoView svg [data-k=gA]'); const esc = await ev(`${P}.ao.scale`);
await drag(A.x, A.y, A.x + 40, A.y);
g = await grads();
check('arrastar a bolinha vira a emenda esquerda em ajustada (soft.grads); continuam quatro', await manual() === 1 && g.length === 4 && !g[0].auto && g[0].on && g[0].edge === 'l', JSON.stringify(g[0]));
check('a bolinha andou em pixels do recorte (40 px de tela ÷ escala)', Math.abs(g[0].a[0] - (220 + 40 / esc)) <= 2 && g[0].b[0] === 0, `a.x=${g[0].a[0]} esperado≈${(220 + 40 / esc).toFixed(0)}`);
check('painel marca ajustado e oferece Voltar ao automático', await ev(`document.querySelector('#aoProps .grow .tag').textContent`) === 'ajustado' && await ev(`[...document.querySelectorAll('#aoProps button')].some(b => b.textContent === 'Voltar ao automático')`));
check('a saída acompanha: a emenda ficou mais larga (mais escuro a 3% da largura)', await lum(1, 0.03, 0.25) < 61, `lum=${await lum(1, 0.03, 0.25)}`);

// 4. Ctrl+Z real desfaz (volta a automático); Ctrl+Y refaz
await ev(`document.activeElement && document.activeElement.blur(); 1`);
await key('z', 'KeyZ', 90, 2); await wait(300);
check('Ctrl+Z desfaz o ajuste: volta a automático', await manual() === 0 && (await grads())[0].auto, `manual=${await manual()}`);
await key('y', 'KeyY', 89, 2); await wait(300);
check('Ctrl+Y refaz o ajuste', await manual() === 1, `manual=${await manual()}`);

// 5. losango estica o trecho; linha move o degradê inteiro
const N1 = await rect('#aoView svg [data-k=gN1]');
await drag(N1.x, N1.y, N1.x, N1.y - 30);   // o losango n1 fica do lado de cima nesta emenda (A→B aponta para a esquerda); puxar para fora estica
g = await grads();
check('arrastar o losango para fora estica o trecho (n1) e só ele', Math.abs(g[0].n1 - (540 + 30 / esc)) <= 2 && g[0].n2 === 540, `n1=${g[0].n1} n2=${g[0].n2} esperado≈${(540 + 30 / esc).toFixed(0)}`);
const M0 = await rect('#aoView svg [data-k=gM]'); const a0 = g[0].a, b0 = g[0].b;
await drag(M0.x, M0.y, M0.x, M0.y + 20);
g = await grads();
check('arrastar a linha move A e B juntos', Math.abs(g[0].a[1] - (a0[1] + 20 / esc)) <= 2 && Math.abs(g[0].b[1] - (b0[1] + 20 / esc)) <= 2 && g[0].a[0] === a0[0] && g[0].b[0] === b0[0], JSON.stringify(g[0]));

// 5b. ligar a emenda direita (sem vizinho) pela caixinha da lista: vira ajustada e a saída escurece na borda direita; desligar volta
{ const r = JSON.parse(await ev(`(() => { const c = document.querySelectorAll('#aoProps .grow .ck')[1]; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`)); await click(r.x, r.y); }
g = await grads();
check('ligar a emenda direita na lista: ajustada, ligada, 10% de largura, e a saída escurece na borda direita', g[1].edge === 'r' && g[1].on && !g[1].auto && g[1].a[0] === 972 && g[1].b[0] === 1080 && await manual() === 2 && await lum(1, 0.985, 0.5) < 90, `g=${JSON.stringify(g[1])} lum=${await lum(1, 0.985, 0.5)}`);
{ const r = JSON.parse(await ev(`(() => { const c = document.querySelectorAll('#aoProps .grow .ck')[1]; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`)); await click(r.x, r.y); }
g = await grads();
check('desligar de novo: a borda direita volta a ficar inteira', !g[1].on && await lum(1, 0.985, 0.5) === 255, `lum=${await lum(1, 0.985, 0.5)}`);
await ev(`(() => { const p = ${P}, s = p.screens()[1].items[0]; s.soft.grads = s.soft.grads.filter(x => x.edge !== 'r'); p.M.touch(s); p.ao.selG = 0; p.ao.refresh(); return 1; })()`);

// 6. setas: movem o fim (B) 1 px, Shift 10 px, Alt leva A junto
const bx = g[0].b[0], ax = g[0].a[0];
await arrow('ArrowRight'); await wait(100); await arrow('ArrowRight', true); await wait(100);
g = await grads();
check('setas movem o fim do degradê (1 px e 10 px com Shift) sem mexer no começo', g[0].b[0] === bx + 11 && g[0].a[0] === ax, `b.x=${g[0].b[0]} esperado ${bx + 11}`);
await arrow('ArrowLeft', false, true); await wait(100);
g = await grads();
check('Alt+seta move começo e fim juntos', g[0].b[0] === bx + 10 && g[0].a[0] === ax - 1, `a.x=${g[0].a[0]} b.x=${g[0].b[0]}`);

// 7. Voltar ao automático
const vb = await rect('#aoProps button:nth-last-of-type(1)');
const vbOk = await ev(`[...document.querySelectorAll('#aoProps button')].find(b => b.textContent === 'Voltar ao automático') ? 1 : 0`);
if (vbOk) { const r = JSON.parse(await ev(`(() => { const b = [...document.querySelectorAll('#aoProps button')].find(b => b.textContent === 'Voltar ao automático'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`)); await click(r.x, r.y); }
check('Voltar ao automático apaga o ajuste e o automático volta', await manual() === 0 && (await grads())[0].auto && (await grads())[0].a[0] === 220, `manual=${await manual()} a=${JSON.stringify((await grads())[0].a)}`);
await ev(`${P}.ao.selG = -1; ${P}.ao.refresh(); 1`);

// 8. + Adicionar degradê cria um livre; Delete apaga o selecionado
{ const r = JSON.parse(await ev(`(() => { const b = [...document.querySelectorAll('#aoProps button')].find(b => b.textContent === '+ Adicionar degradê'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`)); await click(r.x, r.y); }
g = await grads();
check('+ Adicionar degradê cria um degradê livre (sem borda) depois das quatro bordas', g.length === 5 && g[4].edge === null && !g[4].auto && g[4].on && await ev(`${P}.ao.selG`) === 4, JSON.stringify(g[4]));
await ev(`document.activeElement && document.activeElement.blur(); 1`);
await key('Delete', 'Delete', 46); await wait(200);
g = await grads();
check('Delete apaga o degradê livre selecionado e não o slice', g.length === 4 && g[0].auto && await ev(`${P}.screens()[1].items.length`) === 1, `n=${g.length}`);

// 8b. seleção na sobreposição: o selecionado fica por cima; clique sem arrastar alterna para o que está embaixo; arrastar move o selecionado
const stagePt = async (x, y) => JSON.parse(await ev(`(() => { const r = document.querySelector('#aoView svg').getBoundingClientRect(), k = ${P}.ao.scale; return JSON.stringify({ x: r.left + ${x} * k, y: r.top + ${y} * k }); })()`));
const selName = async () => await ev(`(() => { const a = ${P}.ao; return a.sel && a.sel.item ? a.sel.screen.name : 'nenhum'; })()`);
await ev(`(() => { const p = ${P}; p.ao.selG = -1; const sc = p.screens()[1]; p.ao.select(sc, sc.items[0]); return 1; })()`);
{ const q = await stagePt(1810, 300); await click(q.x, q.y); }   // longe da linha do degradê (y 540), dentro dos dois recortes
check('clique na sobreposição com o em pé selecionado passa a seleção para o deitado (que está atrás)', await selName() === 'Deitado', `sel=${await selName()}`);
{ const q = await stagePt(1810, 300); await click(q.x, q.y); }
check('outro clique no mesmo lugar volta para o em pé', await selName() === 'Em pé', `sel=${await selName()}`);
{ const q = await stagePt(1810, 300); const x0 = +await ev(`${P}.screens()[1].items[0].in.x`); await drag(q.x, q.y, q.x + 40, q.y); const x1 = +await ev(`${P}.screens()[1].items[0].in.x`); const esc2 = await ev(`${P}.ao.scale`);
  check('arrastar na sobreposição move o selecionado (em pé) e ele continua selecionado', await selName() === 'Em pé' && Math.abs(x1 - x0 - 40 / esc2) <= 2, `sel=${await selName()} dx=${x1 - x0} esperado≈${(40 / esc2).toFixed(0)}`);
  await ev(`document.activeElement && document.activeElement.blur(); 1`); await key('z', 'KeyZ', 90, 2); await wait(300);
  check('Ctrl+Z desfaz o arrasto (e os cliques de seleção não entraram no desfazer)', +await ev(`${P}.screens()[1].items[0].in.x`) === x0, `x=${await ev(`${P}.screens()[1].items[0].in.x`)}`); }
await ev(`(() => { const p = ${P}; const sc = p.screens()[1]; p.ao.select(sc, sc.items[0]); p.ao.selG = -1; p.ao.refresh(); return 1; })()`);

// 8c. aba Saída (07-01): as alças aparecem sobre o slice deformado e arrastar lá muda o degradê em pixels do recorte
{
  await ev(`(() => { const p = ${P}, M = p.M; const sb = p.screens()[1].items[0]; sb.warp.pts = [[100, 50], [980, 120], [1000, 1850], [80, 1900]]; M.touch(sb); p.ao.setTab('out'); p.ao.select(p.screens()[1], sb); p.ao.selG = 0; p.ao.refresh(); return 1; })()`); await wait(400);
  const esperado = JSON.parse(await ev(`(async () => { const p = ${P}; const { localToOut } = await import('./warp.js'); const sb = p.screens()[1].items[0], g = p.ao.grads(sb)[0]; return JSON.stringify(localToOut(sb, g.a[0] / sb.in.w, g.a[1] / sb.in.h).map(Math.round)); })()`));
  const desenhado = JSON.parse(await ev(`(() => { const e = document.querySelector('#aoView svg [data-k=gA]'); return JSON.stringify([Math.round(+e.getAttribute('cx')), Math.round(+e.getAttribute('cy'))]); })()`));
  check('aba Saída: a bolinha é desenhada onde a deformação leva o começo do degradê (trapézio)', Math.abs(esperado[0] - desenhado[0]) <= 1 && Math.abs(esperado[1] - desenhado[1]) <= 1 && await n('gA') === 4 && await n('gM') === 4, `esperado ${esperado} desenhado ${desenhado}`);
  check('aba Saída: o painel lista os degradês em modo Transformar', await ev(`document.querySelectorAll('#aoProps .grow').length`) === 4);
  // arrasta a bolinha 40 px de tela para a direita: A anda em pixels do recorte o tanto que outToLocal diz, e a alça fica sob o mouse
  const A2 = await rect('#aoView svg [data-k=gA]');
  await drag(A2.x, A2.y, A2.x + 40, A2.y);
  const r = JSON.parse(await ev(`(async () => { const p = ${P}; const { localToOut, outToLocal } = await import('./warp.js'); const sb = p.screens()[1].items[0], g = p.ao.grads(sb)[0]; const e = document.querySelector('#aoView svg [data-k=gA]'); const rr = e.getBoundingClientRect(); return JSON.stringify({ auto: !!g.auto, a: g.a.map(Math.round), alca: [rr.left + rr.width / 2, rr.top + rr.height / 2], manual: sb.soft.grads.length }); })()`));
  check('aba Saída: arrastar a bolinha vira ajustado e a alça fica debaixo do mouse (≤ 2 px de tela)', !r.auto && r.manual === 1 && Math.abs(r.alca[0] - (A2.x + 40)) <= 2 && Math.abs(r.alca[1] - A2.y) <= 2, `alça=${r.alca.map(Math.round)} mouse=${[Math.round(A2.x + 40), Math.round(A2.y)]} a=${r.a}`);
  check('aba Saída: a saída de verdade acompanha o degradê ajustado', await lum(1, 0.03, 0.25) < 61, `lum=${await lum(1, 0.03, 0.25)}`);
  await ev(`(() => { const p = ${P}; p.ao.setTab('in'); p.ao.select(p.screens()[1], p.screens()[1].items[0]); p.ao.selG = 0; p.ao.refresh(); return 1; })()`); await wait(300);
  const gi = await grads();
  check('aba Entrada mostra a mesma emenda ajustada (um modelo só)', !gi[0].auto && gi[0].edge === 'l' && gi[0].a[0] === r.a[0], `a=${gi[0].a}`);
  await ev(`document.activeElement && document.activeElement.blur(); 1`); await key('z', 'KeyZ', 90, 2); await wait(300);
  check('Ctrl+Z desfaz o arrasto feito na aba Saída', await manual() === 0, `manual=${await manual()}`);
  // malha 2×2 com um ponto puxado: a alça segue a curva
  await ev(`(() => { const p = ${P}, M = p.M; const sb = p.screens()[1].items[0]; M.setWarpMode(sb, 'mesh'); M.setDivisions(sb, 2, 2); const i = Math.floor(sb.warp.pts.length / 2); sb.warp.pts[i][0] += 150; M.touch(sb); p.ao.setTab('out'); p.ao.select(p.screens()[1], sb); p.ao.selG = 0; p.ao.refresh(); return 1; })()`); await wait(400);
  const em = JSON.parse(await ev(`(async () => { const p = ${P}; const { localToOut, outToLocal } = await import('./warp.js'); const sb = p.screens()[1].items[0], g = p.ao.grads(sb)[0]; const e = document.querySelector('#aoView svg [data-k=gA]'); const exp = localToOut(sb, g.a[0] / sb.in.w, g.a[1] / sb.in.h); const back = outToLocal(sb, exp[0], exp[1]); return JSON.stringify({ exp: exp.map(Math.round), got: [Math.round(+e.getAttribute('cx')), Math.round(+e.getAttribute('cy'))], volta: back.map(v => +v.toFixed(3)), uv: [+(g.a[0] / sb.in.w).toFixed(3), +(g.a[1] / sb.in.h).toFixed(3)] }); })()`));
  check('malha 2×2 com ponto puxado: a bolinha segue a curva e o caminho de volta (Newton) acerta o (u, v)', Math.abs(em.exp[0] - em.got[0]) <= 1 && Math.abs(em.exp[1] - em.got[1]) <= 1 && Math.abs(em.volta[0] - em.uv[0]) < 0.002 && Math.abs(em.volta[1] - em.uv[1]) < 0.002, JSON.stringify(em));
  await ev(`(() => { const p = ${P}, M = p.M; const sb = p.screens()[1].items[0]; M.setWarpMode(sb, 'corners'); p.ao.setTab('in'); p.ao.select(p.screens()[1], sb); p.ao.selG = -1; p.ao.refresh(); return 1; })()`); await wait(200);
}

// 9. salvar/abrir preserva os ajustes
await ev(`(() => { const p = ${P}, s = p.screens()[1].items[0]; s.soft.grads.push({ id: 999, edge: 'l', a: [300, 500], b: [0, 500], n1: 400, n2: 450, roundOn: false, round: 0.3 }); p.M.touch(s); return 1; })()`);
const rt = JSON.parse(await ev(`(() => { const p = ${P}, M = p.M; const s2 = M.deserialize(M.serialize(p.screens())); const g = s2[1].items[0].soft.grads[0]; return JSON.stringify({ n: s2[1].items[0].soft.grads.length, g, round: s2[1].items[0].soft.round }); })()`));
check('serialize/deserialize preserva o degradê ajustado e o arredondado padrão', rt.n === 1 && rt.g.edge === 'l' && rt.g.a[0] === 300 && rt.g.n2 === 450 && rt.g.roundOn === false && rt.g.round === 0.3 && rt.round.on === true, JSON.stringify(rt));

// 10. Esc cancela a Saída avançada e restaura o que havia ao abrir (sem o degradê de teste)
// a primeira tecla depois de muito Runtime.evaluate às vezes se perde (flake conhecido do CDP): até três Esc, conferindo entre eles
for (let i = 0; i < 3 && await ev(`${P}.ao.open`); i++) { await key('Escape', 'Escape', 27); await wait(300); }
check('Esc fecha a Saída avançada cancelando', !await ev(`${P}.ao.open`) && await manual() === 0, `open=${await ev(`${P}.ao.open`)} manual=${await manual()}`);

// volta ao estado de antes (fechando as janelas de saída que as telas de teste abriram, para a próxima suíte começar limpa)
await ev(`(() => { const p = ${P}; for (const w of p.outWins()) w.close(); p.setScreens(p.M.deserialize(${JSON.stringify(antes)})); p.applySettings(Object.assign({}, p.state.settings, { w: 1920, h: 1080 })); return 1; })()`);
const falhas = results.filter(r => !r.ok).length;
console.log(`\n${results.length} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
