// Verifica que a Saída avançada NÃO derruba a saída no ar: com uma tela aberta em janela, abre a Saída avançada,
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
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
const noAr = async () => +await ev(`${P}.outWins().length`);
const janelasSaida = async () => (await (await fetch(base + '/json')).json()).filter(p => p.type === 'page' && p.url.includes('output.html')).length;

// preparo: fecha diálogos, põe a tela 1 em janela e abre a saída
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
