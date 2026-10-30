// Verifica que a Saída avançada NÃO derruba a saída no ar e que as SETAS movem o item ou o ponto (1 px; Shift: 10 px): com uma tela aberta em janela, abre a Saída avançada,
// muda algo, Ctrl+Z (evento de teclado REAL pelo CDP), Ctrl+Y, Esc (cancelar) e Salvar; a janela de saída tem de
// continuar aberta em todos os passos. Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP).
// Uso: node tools/ao-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume') || pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
// a primeira tecla depois de uso pesado às vezes se perde: um Shift de aquecimento antes de qualquer tecla que importa
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });   // sem foco de teclado (outra janela na frente), o Chromium descarta as teclas do CDP; a emulação de foco não depende do Windows
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });   // mover com botão solto, como um mouse de verdade
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const arrow = (name, shift = false) => key(name, name, { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[name], shift ? 8 : 0);
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const noAr = async () => +await ev(`${P}.outWins().length`);
const janelasSaida = async () => (await (await fetch(base + '/json')).json()).filter(p => p.type === 'page' && p.url.includes('output.html')).length;

// preparo: fecha diálogos, põe a tela 1 em janela e abre a saída
// diálogos abertos (ex.: Projetores no arranque) fecham com Esc DE VERDADE: arrancar o .dlgOver do DOM deixa o keydown de captura do diálogo vivo, que engole o próximo Esc
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await key('Escape', 'Escape', 27); await wait(200); }
await ev(`(() => { const p = ${P}; if (p.automape && p.automape.dlg) p.automape.close(); p.ao.hide(false); if (p.laser.open) p.laser.hide(); document.querySelectorAll('.dlgOver').forEach(d => d.remove()); return 1; })()`);
await ev(`(() => { const p = ${P}; const sc = p.screens()[0]; sc.device = 'window'; sc.enabled = true; p.openOutputs(); return 1; })()`);
await wait(900);
check('saída aberta em janela antes do teste', await noAr() === 1 && await janelasSaida() === 1, `outWins=${await noAr()} janelas=${await janelasSaida()}`);
const nomeAntes = await ev(`${P}.screens()[0].items[0].name`);

// abre a Saída avançada: a saída continua
await ev(`${P}.ao.show(); 1`); await wait(300);
check('abrir a Saída avançada mantém a saída', await noAr() === 1, `outWins=${await noAr()}`);

// muda algo (renomeia o slice com registro de desfazer) e desfaz com Ctrl+Z real
await ev(`(() => { const p = ${P}; p.ao.pushUndo(); p.screens()[0].items[0].name = 'teste-ao'; p.ao.refresh(); return 1; })()`);
await ev(`document.activeElement && document.activeElement.blur(); 1`);
await key('z', 'KeyZ', 90, 2); await wait(400);
check('Ctrl+Z na Saída avançada desfaz', await ev(`${P}.screens()[0].items[0].name`) === nomeAntes, `nome=${await ev(`${P}.screens()[0].items[0].name`)}`);
check('Ctrl+Z mantém a saída no ar', await noAr() === 1 && await janelasSaida() === 1, `outWins=${await noAr()} janelas=${await janelasSaida()}`);

// refaz com Ctrl+Y e a saída continua
await key('y', 'KeyY', 89, 2); await wait(400);
check('Ctrl+Y refaz', await ev(`${P}.screens()[0].items[0].name`) === 'teste-ao');
check('Ctrl+Y mantém a saída no ar', await noAr() === 1, `outWins=${await noAr()}`);

// setas: no modo Transformar movem o slice inteiro 1 px (Shift: 10 px); no modo Editar pontos movem o ponto selecionado
{
  await ev(`(() => { const p = ${P}; const sc = p.screens()[0]; p.ao.setTab('out'); p.ao.select(sc, sc.items[0]); p.ao.setMode('move'); return 1; })()`);
  await ev(`document.activeElement && document.activeElement.blur(); 1`); await wait(900);
  const rect = () => ev(`JSON.stringify(${P}.M.outRect(${P}.screens()[0].items[0]))`).then(JSON.parse);
  const r0 = await rect();
  await arrow('ArrowRight'); await wait(100); const r1 = await rect();
  check('seta → move o slice 1 px', r1.x === r0.x + 1 && r1.y === r0.y && r1.w === r0.w, `x ${r0.x}→${r1.x}`);
  await arrow('ArrowDown', true); await wait(100); const r2 = await rect();
  check('Shift+seta ↓ move o slice 10 px', r2.y === r0.y + 10 && r2.x === r1.x, `y ${r0.y}→${r2.y}`);
  // ponto: clique real na âncora 0 (canto superior esquerdo) no modo Editar pontos, depois setas
  await ev(`${P}.ao.setMode('pts'); 1`); await wait(100);
  const a = JSON.parse(await ev(`(() => { const p = ${P}; const s = p.screens()[0]; const it = s.items[0]; const r = document.getElementById('aoSvg').getBoundingClientRect(); const q = it.warp.pts[0]; return JSON.stringify({ x: r.left + q[0] / s.w * r.width, y: r.top + q[1] / s.h * r.height, px: q[0], py: q[1] }); })()`));
  await click(a.x, a.y); await wait(150);
  check('clique real seleciona a âncora', await ev(`${P}.ao.selPt`) === 0 && await ev(`${P}.ao.selPtK`) === 'anchor', `selPt=${await ev(`${P}.ao.selPt`)}`);
  await arrow('ArrowLeft'); await arrow('ArrowUp', true); await wait(100);
  const q = JSON.parse(await ev(`JSON.stringify(${P}.screens()[0].items[0].warp.pts[0])`));
  check('setas movem só o ponto selecionado (← 1 px, Shift+↑ 10 px)', q[0] === a.px - 1 && q[1] === a.py - 10, `${a.px},${a.py} → ${q[0]},${q[1]}`);
  const r3 = await rect();
  check('os outros cantos ficam onde estavam', r3.x + r3.w === r2.x + r2.w && r3.y + r3.h === r2.y + r2.h);
  // toques seguidos viram um só desfazer
  await wait(900); const before = JSON.parse(await ev(`JSON.stringify(${P}.screens()[0].items[0].warp.pts[0])`));
  await arrow('ArrowRight'); await arrow('ArrowRight'); await arrow('ArrowRight'); await wait(100);
  await key('z', 'KeyZ', 90, 2); await wait(300);
  const after = JSON.parse(await ev(`JSON.stringify(${P}.screens()[0].items[0].warp.pts[0])`));
  check('Ctrl+Z desfaz a sequência de setas de uma vez', after[0] === before[0] && after[1] === before[1], `${before} → ${after}`);
  check('setas mantêm a saída no ar', await noAr() === 1, `outWins=${await noAr()}`);
}

// Esc cancela (volta ao retrato de quando abriu) e a saída continua
const focoAntesEsc = await ev(`document.activeElement ? document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : '') : 'nenhum'`);
await key('Escape', 'Escape', 27); await wait(400);
check('Esc fecha a Saída avançada cancelando', await ev(`!${P}.ao.open`) && await ev(`${P}.screens()[0].items[0].name`) === nomeAntes, `open=${await ev(`${P}.ao.open`)} nome=${await ev(`${P}.screens()[0].items[0].name`)} foco antes do Esc=${focoAntesEsc}`);
if (await ev(`${P}.ao.open`)) await ev(`${P}.ao.hide(true); 1`);
check('Esc mantém a saída no ar', await noAr() === 1 && await janelasSaida() === 1, `outWins=${await noAr()} janelas=${await janelasSaida()}`);

// abre de novo, muda e Salvar e fechar: a mudança fica e a saída continua
await ev(`${P}.ao.show(); 1`); await wait(200);
await ev(`(() => { const p = ${P}; p.ao.pushUndo(); p.screens()[0].items[0].name = 'teste-ao-2'; p.ao.refresh(); return 1; })()`);
await ev(`${P}.ao.hide(false); 1`); await wait(400);
check('Salvar e fechar guarda a mudança', await ev(`${P}.screens()[0].items[0].name`) === 'teste-ao-2');
check('Salvar e fechar mantém a saída no ar', await noAr() === 1, `outWins=${await noAr()}`);

// uma tela que estava FECHADA não abre sozinha ao desfazer
await ev(`(() => { const p = ${P}; for (const w of p.outWins()) w.close(); return 1; })()`); await wait(300);
await ev(`${P}.ao.show(); 1`); await wait(200);
await ev(`(() => { const p = ${P}; p.ao.pushUndo(); p.screens()[0].items[0].name = 'x'; p.ao.refresh(); p.ao.undo(); return 1; })()`); await wait(400);
check('desfazer com a saída fechada não abre a saída', await noAr() === 0 && await janelasSaida() === 0, `outWins=${await noAr()} janelas=${await janelasSaida()}`);
await ev(`${P}.ao.hide(true); 1`);

// limpeza: nome original, saída fechada
await ev(`(() => { const p = ${P}; p.screens()[0].items[0].name = ${JSON.stringify(nomeAntes)}; p.render(); return 1; })()`);
const falhas = results.filter(r => !r.ok).length;
console.log(`\n${results.length} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
