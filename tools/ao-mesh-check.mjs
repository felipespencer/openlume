// Verifica os PONTOS da Saída avançada com mouse e clique de verdade (CDP): a forma montada não pode voltar a ser retângulo
// ao acrescentar divisões, o modo começa Reto, arrastar um ponto não envergar lados retos e o desfazer volta o que foi feito.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/ao-mesh-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y, clickCount = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount });
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
let falhas = 0; const check = (name, ok, info = '') => { if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape', 'Escape', 27); await wait(200); }

// preparo: um slice em perspectiva (quatro cantos), Saída avançada aberta na aba Transformação, modo Editar pontos
await ev(`(async () => { const p = ${P}; p.ao.hide(false); const M = await import('./screens.js'); window.__M = M;
  const sc = p.screens()[0]; const s = sc.items.find(i => i.type === 'slice'); s.warp.mode = 'corners'; s.warp.divX = 2; s.warp.divY = 2; s.warp.curve = false;
  s.warp.pts = [[220, 140], [1500, 90], [1620, 900], [160, 820]]; M.touch(s); p.ao.show(); p.ao.setTab('out'); p.ao.select(sc, s); p.ao.setMode('pts'); return 1; })()`);
await wait(500);
const slice = `${P}.screens()[0].items.find(i => i.type === 'slice')`;
const cantos = () => ev(`(() => { const w = ${slice}.warp, c = w.mode === 'mesh' ? 3 * w.divX + 1 : 0, n = w.pts.length; const r = w.mode === 'mesh' ? [w.pts[0], w.pts[c - 1], w.pts[n - 1], w.pts[n - c]] : w.pts; return r.map(p => p.map(Math.round)); })()`);
const quad = JSON.stringify([[220, 140], [1500, 90], [1620, 900], [160, 820]]);
const rowBtn = (label, which) => ev(`(() => { const r = [...document.querySelectorAll('.prow')].find(x => x.querySelector('.pl') && x.querySelector('.pl').textContent === ${JSON.stringify(label)}); if (!r) return null; const b = r.querySelectorAll('button.pm')[${which}]; const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; })()`);
const plus = async (label) => { const q = await rowBtn(label, 1); if (!q) throw new Error('botão + de ' + label + ' não achado'); await click(q[0], q[1]); await wait(150); };
const info = () => ev(`(() => { const w = ${slice}.warp; return { mode: w.mode, dx: w.divX, dy: w.divY, curve: w.curve }; })()`);
const total = () => ev(`(() => { const w = ${slice}.warp; return w.divX * (w.divY + 1) + w.divY * (w.divX + 1); })()`);
const retos = () => ev(`(async () => { const W = await import('./warp.js'); const w = ${slice}.warp; return W.straightSegs(w.pts, w.divX, w.divY).size; })()`);

check('o modo de ponto começa em Reta', (await info()).curve === false);
await plus('Divisões X');
let i = await info(); check('+ em Divisões X: vira malha sem mudar a forma', i.mode === 'mesh' && JSON.stringify(await cantos()) === quad, JSON.stringify(i) + ' ' + JSON.stringify(await cantos()));
await plus('Divisões X'); await plus('Divisões Y'); await plus('Divisões Y');
i = await info(); check('mais divisões: os quatro cantos continuam onde estavam', i.dx === 2 && i.dy === 3 && JSON.stringify(await cantos()) === quad, JSON.stringify(i) + ' ' + JSON.stringify(await cantos()));
check('todos os lados nascem retos', (await retos()) === (await total()), (await retos()) + '/' + (await total()));

// arrasta uma âncora interna com o mouse de verdade, em Reta e em Curva
const anchorXY = (idx) => ev(`(() => { const m = ${P}.ao.svg.getScreenCTM(), p = ${slice}.warp.pts[${idx}]; return [m.a * p[0] + m.e, m.d * p[1] + m.f]; })()`);
const drag = async (idx, dx, dy) => { const [x, y] = await anchorXY(idx); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); for (let k = 1; k <= 6; k++) await mouse('mouseMoved', x + dx * k / 6, y + dy * k / 6); await mouse('mouseReleased', x + dx, y + dy); await wait(100); };
const anc = 3 * 7 + 3;   // linha 1, coluna 1 de âncoras (malha 2x3 tem 7 colunas de controle)
const antes = await ev(`${slice}.warp.pts[${anc}].map(Math.round)`);
await drag(anc, 60, 40);
const depois = await ev(`${slice}.warp.pts[${anc}].map(Math.round)`);
check('arrastar uma âncora a move', Math.hypot(depois[0] - antes[0], depois[1] - antes[1]) > 20, JSON.stringify(antes) + ' → ' + JSON.stringify(depois));
check('em Reta os lados seguem retos depois de arrastar', (await retos()) === (await total()), (await retos()) + '/' + (await total()));

await ev(`(() => { ${slice}.warp.curve = true; ${P}.ao.refresh(); })()`); await wait(200);
await drag(anc, -30, 25);
check('em Curva, arrastar uma âncora não envergar lados retos', (await retos()) === (await total()), (await retos()) + '/' + (await total()));
// o usuário curva um lado de propósito: esse lado fica curvo, os outros continuam retos
await ev(`(() => { window.__M.moveHandle(${slice}, 1, 0, -70); ${P}.ao.refresh(); })()`);
const apos = await retos();
await drag(anc, 20, 20);
check('lado curvado de propósito continua curvo e o resto, reto', (await retos()) === apos && apos === (await total()) - 1, apos + ' → ' + (await retos()) + ' de ' + (await total()));

// duplo clique num ponto não zera a forma
const forma = await ev(`JSON.stringify(${slice}.warp.pts.map(p => p.map(Math.round)))`);
const [ax, ay] = await anchorXY(anc);
await mouse('mouseMoved', ax, ay); await mouse('mousePressed', ax, ay, 1); await mouse('mouseReleased', ax, ay, 1); await mouse('mousePressed', ax, ay, 2); await mouse('mouseReleased', ax, ay, 2); await wait(150);
check('duplo clique num ponto não zera a forma', (await ev(`JSON.stringify(${slice}.warp.pts.map(p => p.map(Math.round)))`)) === forma);

// dobrar as divisões de uma malha curvada não muda a superfície
const dif = await ev(`(async () => { const W = await import('./warp.js'); const w = ${slice}.warp; const a = w.pts.map(p => [...p]), dx = w.divX, dy = w.divY; const b = W.resampleMesh(a, dx, dy, dx * 2, dy * 2); let m = 0; for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) { const p = W.meshPoint(a, dx, dy, i / 16, j / 16), q = W.meshPoint(b, dx * 2, dy * 2, i / 16, j / 16); m = Math.max(m, Math.hypot(p[0] - q[0], p[1] - q[1])); } return m; })()`);
check('dobrar as divisões de uma malha curvada não muda a superfície', dif < 0.01, dif.toFixed(4) + ' px');
// o + numa malha curvada: a curva puxada continua lá (o ponto do meio do lado curvo não pode voltar para a reta)
const meio = () => ev(`(async () => { const W = await import('./warp.js'); const w = ${slice}.warp; return W.meshPoint(w.pts, w.divX, w.divY, 0.5, 0).map(Math.round); })()`);
const m0 = await meio(); await plus('Divisões X'); const m1 = await meio();
check('+ numa malha curvada mantém a curva', Math.hypot(m0[0] - m1[0], m0[1] - m1[1]) < 8, JSON.stringify(m0) + ' → ' + JSON.stringify(m1) + ' (2→3 divisões não é múltiplo: a grade nova não consegue repetir a curva exatamente; o dobro é exato, conferido acima)');
// desfazer volta o que o + fez
const nAntes = (await info()).dx; await plus('Divisões X'); const nMais = (await info()).dx;
await key('z', 'KeyZ', 90, 2); await wait(200);
check('Ctrl+Z desfaz o +', nMais === nAntes + 1 && (await info()).dx === nAntes, `${nAntes} → ${nMais} → ${(await info()).dx}`);
// zerar pelo botão
await ev(`(() => { const b = [...document.querySelectorAll('button.wide')].find(x => x.textContent === 'Zerar os pontos'); b.click(); })()`); await wait(150);
check('o botão Zerar devolve a malha a um retângulo', await ev(`(() => { const w = ${slice}.warp; return w.pts.slice(0, 3 * w.divX + 1).every(p => Math.abs(p[1] - w.pts[0][1]) < 0.01); })()`));

// máscara de saída: duplo clique na linha acrescenta um ponto; duplo clique num ponto o apaga (sobram 3, no mínimo)
await ev(`(() => { const p = ${P}, M = window.__M, sc = p.screens()[0]; const m = M.mkMask('Máscara do teste', M.maskShape('rect', 400, 300, 600, 400)); sc.items.push(m); p.ao.setTab('out'); p.ao.setMode('pts'); p.ao.select(sc, m); return 1; })()`); await wait(300);
const mask = `${P}.screens()[0].items.find(i => i.type === 'mask')`;
const toClient = (x, y) => ev(`(() => { const m = ${P}.ao.svg.getScreenCTM(); return [m.a * ${x} + m.e, m.d * ${y} + m.f]; })()`);
const dbl = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, 1); await mouse('mouseReleased', x, y, 1); await mouse('mousePressed', x, y, 2); await mouse('mouseReleased', x, y, 2); await wait(150); };
const n0 = await ev(`${mask}.pts.length`);
const [ex, ey] = await toClient(700, 300);   // meio do lado de cima do retângulo
await dbl(ex, ey);
check('duplo clique na linha da máscara acrescenta um ponto', (await ev(`${mask}.pts.length`)) === n0 + 1, n0 + ' → ' + (await ev(`${mask}.pts.length`)));
const [px, py] = await toClient(...(await ev(`${mask}.pts[1]`)));
await dbl(px, py);
check('duplo clique num ponto da máscara o apaga', (await ev(`${mask}.pts.length`)) === n0, (await ev(`${mask}.pts.length`)) + ' pontos');
await ev(`(() => { ${mask}.pts.splice(3); ${P}.ao.refresh(); })()`);   // deixa 3 pontos
const [qx, qy] = await toClient(...(await ev(`${mask}.pts[0]`)));
await dbl(qx, qy);
check('uma máscara não fica com menos de 3 pontos', (await ev(`${mask}.pts.length`)) === 3);
await ev(`(() => { const sc = ${P}.screens()[0]; sc.items = sc.items.filter(i => i.type !== 'mask'); ${P}.ao.select(sc, sc.items[0]); return 1; })()`);
await ev(`${P}.ao.setMode('move'); ${P}.ao.setTab('in'); ${P}.ao.hide(true); 1`);   // devolve o editor ao estado de partida (os outros testes contam com o modo Transformar)
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo'); ws.close(); process.exit(falhas ? 1 : 0);
