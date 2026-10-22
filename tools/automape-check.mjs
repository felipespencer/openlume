// Verifica o Automape no programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP), com eventos de entrada REAIS
// pelo CDP (Input.dispatchMouseEvent / dispatchKeyEvent): menu, assistente, malha, foto de exemplo, edição ponto a ponto,
// bezier com Ctrl, nova forma, desfazer e a criação na Saída avançada. Uso: node tools/automape-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume') || pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const drag = async (x0, y0, x1, y1, mods = 0) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0, { modifiers: mods }); for (let i = 1; i <= 10; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10, { modifiers: mods }); await mouse('mouseReleased', x1, y1, { modifiers: mods }); };
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const dbl = async (x, y) => { await click(x, y); await mouse('mousePressed', x, y, { clickCount: 2 }); await mouse('mouseReleased', x, y, { clickCount: 2 }); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const D = '.dlg.automape ';
const rectOf = async (sel) => JSON.parse(await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'null'; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,t:r.top,w:r.width,h:r.height})})()`));
const A = 'window.projecionista.automape';
const svgPt = async (p) => { const r = await rectOf(D + '#wSvg'); const pw = await ev(A + '.S.pw'), ph = await ev(A + '.S.ph'); return [r.l + p[0] / pw * r.w, r.t + p[1] / ph * r.h]; };

// 1. menu Saída › Automape…
await ev("(() => { const P = window.projecionista; if (P.automape.dlg) P.automape.close(); return 1; })()"); await wait(200);
let r = await rectOf('#menubar .mb:nth-child(8)'); await mouse('mouseMoved', r.x, r.y, { buttons: 0 }); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y); await wait(150);
let miRect = JSON.parse(await ev("(()=>{ const it=[...document.querySelectorAll('.menu .mi')].find(e=>e.textContent.includes('Automape')); if(!it) return 'null'; const r=it.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()"));
const abriuPeloClique = !!miRect;
if (!miRect) { await ev("window.projecionista.menubar.show(7); 1"); await wait(150); miRect = JSON.parse(await ev("(()=>{ const it=[...document.querySelectorAll('.menu .mi')].find(e=>e.textContent.includes('Automape')); if(!it) return 'null'; const r=it.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()")); }
check('o menu Saída tem o item Automape…' + (abriuPeloClique ? '' : ' (menu aberto por JS: o clique real não abriu)'), !!miRect);
if (miRect) { await click(miRect.x, miRect.y); await wait(250); }
check('clicar nele abre o assistente no passo 1', await ev(`!!document.querySelector('${D}#wStep') && document.querySelector('${D}#wStep').textContent === 'Passo 1 de 7'`));
const next = async () => { r = await rectOf(D + '.dfoot button:nth-child(3)'); await click(r.x, r.y); await wait(150); };
await next(); check('"Começar" vai ao passo 2 com o botão da malha pulsando', await ev(`${A}.step === 1 && document.querySelector('${D}#wGridBtn').classList.contains('neon')`));
r = await rectOf(D + '#wGridBtn'); await click(r.x, r.y); await wait(300);
const malha = JSON.parse(await ev("(()=>{ const P=window.projecionista; const px=P.probe([[0.52,0.52],[0.0078,0.5]]); return JSON.stringify({on:P.automapeGridOn(), camada:P.state.layers[0].automapeGrid===true, centro:px[0], borda:px[1]}); })()"));
check('o botão liga a camada da malha e a saída mostra campo cinza com borda branca', malha.on && malha.camada && malha.centro[0] > 100 && malha.centro[0] < 170 && malha.borda[0] > 240, JSON.stringify(malha));
await next(); check('passo 3: tire a foto (certo/errado + animação)', await ev(`${A}.step === 2 && document.querySelectorAll('${D}.wok svg').length === 2 && document.querySelectorAll('${D}.an.anbig svg animateTransform').length >= 1`));
await next(); check('passo 4: mande a foto com três exemplos', await ev(`${A}.step === 3 && document.querySelectorAll('${D}.wsamples button').length === 3`));
r = await rectOf(D + '#wSampleSala'); await click(r.x, r.y); await wait(1200);
check('escolher a sala pula para o passo 5 com a foto marcada e o popup de ajuda', await ev(`${A}.step === 4 && ${A}.S.sample === 'sala' && document.querySelectorAll('${D}#wSvg .sf').length >= 8 && !!document.querySelector('${D}.miniTip')`));
check('o resumo diz o que a IA encontrou, em português', await ev(`/sofá/.test(document.querySelector('${D}#wSummary').textContent) && /lareira/.test(document.querySelector('${D}#wSummary').textContent)`), await ev(`document.querySelector('${D}#wSummary').textContent.slice(0, 90)`));
r = await rectOf(D + '.miniTip .tipOk'); await click(r.x, r.y); await wait(100);
check('"Entendi" fecha o popup', await ev(`!document.querySelector('${D}.miniTip')`));

// 2. edição ponto a ponto
const sofa = JSON.parse(await ev(`(() => { const s = ${A}.S.items.find(i => i.cls === 'sofá'); const c = window.projecionista.automape.S.items && ${A}.AMc ? null : null; const cen = ${A}.S.items.length && (() => { let x=0,y=0; for (const p of s.poly) { x+=p[0]; y+=p[1]; } return [x/s.poly.length, y/s.poly.length]; })(); return JSON.stringify({ id: s.id, n: s.poly.length, p: s.poly[0], c: cen }); })()`));
let [sx, sy] = await svgPt(sofa.c); await click(sx, sy); await wait(200);
check('clicar no sofá seleciona e mostra só os pontos dele', await ev(`${A}.S.editId === ${sofa.id} && document.querySelectorAll('${D}#wSvg circle.pt').length === ${sofa.n}`));
let [px, py] = await svgPt(sofa.p); await drag(px, py, px + 25, py + 15); await wait(300);
const p1 = JSON.parse(await ev(`JSON.stringify(${A}.S.items.find(i => i.id === ${sofa.id}).poly[0])`));
check('arrastar um ponto move o ponto', Math.abs(p1[0] - sofa.p[0]) > 10, sofa.p.map(Math.round) + ' → ' + p1.map(Math.round));
await key('z', 'KeyZ', 90, 2); await wait(200);
const pz = JSON.parse(await ev(`JSON.stringify(${A}.S.items.find(i => i.id === ${sofa.id}).poly[0])`));
check('Ctrl+Z desfaz', Math.hypot(pz[0] - sofa.p[0], pz[1] - sofa.p[1]) < 0.5);
const tap = JSON.parse(await ev(`(() => { const s = ${A}.S.items.find(i => i.cls === 'tapete'); let x=0,y=0; for (const p of s.poly) { x+=p[0]; y+=p[1]; } return JSON.stringify({ id: s.id, c: [x/s.poly.length, y/s.poly.length], curved: s.curved }); })()`));
check('o tapete já nasce curvo (a IA viu redondo)', tap.curved === true);
[sx, sy] = await svgPt(tap.c); await click(sx, sy); await wait(200);
check('clicar no tapete mostra os losangos das alças', await ev(`${A}.S.editId === ${tap.id} && document.querySelectorAll('${D}#wSvg .bh').length >= 6`));
const c1 = JSON.parse(await ev(`JSON.stringify(${A}.S.items.find(i => i.id === ${tap.id}).ctrl[1])`));
let [hx, hy] = await svgPt(c1.out); await drag(hx, hy, hx + 16, hy - 20, 2); await wait(300);
const c2 = JSON.parse(await ev(`JSON.stringify(${A}.S.items.find(i => i.id === ${tap.id}).ctrl[1])`));
check('Ctrl ao arrastar a alça: ela mexe sozinha e a do outro lado fica', Math.hypot(c2.out[0] - c1.out[0], c2.out[1] - c1.out[1]) > 8 && Math.hypot(c2.in[0] - c1.in[0], c2.in[1] - c1.in[1]) < 0.5 && c2.linked === false);
const [q0x, q0y] = await svgPt(JSON.parse(await ev(`JSON.stringify(${A}.S.items.find(i => i.id === ${tap.id}).poly[0])`))); await click(q0x, q0y); await wait(150);
r = await rectOf(D + '#wZbar [data-pm="corner"]'); const nb = await ev(`document.querySelectorAll('${D}#wSvg .bh').length`); await click(r.x, r.y); await wait(200);
check('"Reto" num ponto tira só as duas alças dele', await ev(`document.querySelectorAll('${D}#wSvg .bh').length`) === nb - 2);
// nova forma
const bx = await rectOf(D + '#wPhotoBox'); const n0 = await ev(`${A}.S.items.length`);
r = await rectOf(D + '#wZbar [data-z="new"]'); await click(r.x, r.y); await wait(100);
for (const [fx, fy] of [[0.80, 0.05], [0.97, 0.05], [0.97, 0.25], [0.80, 0.25]]) { await click(bx.l + bx.w * fx, bx.t + bx.h * fy); await wait(80); }
await dbl(bx.l + bx.w * 0.80, bx.t + bx.h * 0.25); await wait(250);
check('＋ Nova forma: quatro cliques e duplo clique criam "Forma 1"', await ev(`${A}.S.items.length`) === n0 + 1 && await ev(`${A}.S.items[${A}.S.items.length - 1].name`) === 'Forma 1');
// zoom
await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: bx.x, y: bx.y, deltaX: 0, deltaY: -240 }); await wait(200);
check('roda do mouse dá zoom na foto', await ev(`document.querySelector('${D}#wPhotoBox')._z.k`) > 1.3);
r = await rectOf(D + '#wZbar [data-z="0"]'); await click(r.x, r.y); await wait(100);

// 3. passos 6 e 7 e a criação na Saída avançada
await next(); check('passo 6: uma linha por tipo de coisa', await ev(`${A}.step === 5 && document.querySelectorAll('${D}#wRows .wrow').length >= 5`));
r = await rectOf(D + '#wRows .wrow:first-child [data-wact="ignore"]'); const sel0 = await ev(`${A}.S.sel.size`); await click(r.x, r.y); await wait(150);
check('"Deixar quieto" tira as peças daquele tipo', await ev(`${A}.S.sel.size`) < sel0);
r = await rectOf(D + '#wRows .wrow:first-child [data-wact="slice"]'); await click(r.x, r.y); await wait(150);
await next(); check('passo 7: prévia do projetor', await ev(`${A}.step === 6 && document.querySelectorAll('${D}#wPrev polygon').length >= 8 && /Vai criar/.test(document.querySelector('${D}#wResTxt').textContent)`), await ev(`document.querySelector('${D}#wResTxt').textContent`));
const antes = JSON.parse(await ev(`(() => { const sc = window.projecionista.screens()[0]; return JSON.stringify({ n: sc.items.length, nM: ${A}.S.result.filter(r => r.type === 'mask').length, nS: ${A}.S.result.filter(r => !r.type).length }); })()`));
await next(); await wait(500);
const depois = JSON.parse(await ev("(() => { const P = window.projecionista, sc = P.screens()[0]; return JSON.stringify({ n: sc.items.length, masks: sc.items.filter(i => i.type === 'mask').length, comContorno: sc.items.filter(i => i.type === 'slice' && i.inMask && i.inMask.pts.length > 4).length, ao: !document.getElementById('ao').hidden, dlg: !!document.querySelector('.dlg.automape'), malha: P.automapeGridOn() }); })()"));
check('"Criar na Saída avançada" cria as máscaras e os slices com contorno e abre a Saída avançada', depois.n === antes.n + antes.nM + antes.nS && depois.masks >= antes.nM && depois.comContorno >= 1 && depois.ao && !depois.dlg && !depois.malha, JSON.stringify({ antes, depois }));
await ev("window.projecionista.ao.hide(false); 1");

const bad = results.filter(x => !x.ok).length; console.log(`\n${results.length - bad}/${results.length} verificações passaram`);
ws.close(); process.exit(bad ? 1 : 0);
