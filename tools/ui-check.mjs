// Verifica, com eventos REAIS pelo CDP: botão direito numa casa abre o menu do clipe (e "Colar" numa casa vazia);
// Test Card vai para a saída sem virar clipe; "Mostrar saídas" traz as janelas para a frente; o X do programa
// pergunta "Salvar e fechar / Fechar sem salvar / Cancelar". Programa aberto com --remote-debugging-port=9333.
// Uso: node tools/ui-check.mjs
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
if (!page) { console.error('janela do OpenLume não achada', pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.bringToFront');   // sem foco de teclado (outra janela na frente), o Chromium descarta as teclas enviadas pelo CDP
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const rightClick = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'right', buttons: 2, clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'right', buttons: 0, clickCount: 1 }); };
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const esc = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const rectOf = async (sel) => JSON.parse(await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'null'; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,t:r.top,w:r.width,h:r.height})})()`));
const centerOf = async (expr) => JSON.parse(await ev(`(() => { const b = (${expr}); if (!b) return 'null'; const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`));
const P = 'window.projecionista';
const menuRows = async () => JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.menuLayer .menu .mi .lb')].map(e => e.textContent))`));
const menus = () => ev(`document.querySelectorAll('.menuLayer').length`);
const clipName = (li, c) => ev(`(${P}.state.layers[${li}].clips[${c}] || {}).name || ''`);

// preparo: fecha o que estiver aberto (diálogos com Esc de verdade: arrancar o .dlgOver do DOM deixaria o keydown de captura
// do diálogo vivo, engolindo o Esc dos passos seguintes); garante um clipe na casa 0 da camada 1
await ev(`(() => { const p = ${P}; if (p.automape && p.automape.dlg) p.automape.close(); p.ao.hide(false); if (p.laser.open) p.laser.hide(); p.menubar.close(); return 1; })()`);
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await esc(); await wait(200); }
await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove()); 1`);
const prep = JSON.parse(await ev(`(() => { const p = ${P}, st = p.state; const li = 1; if (!st.layers[li].clips[0]) p.putSource(li, 0, 'sinewave'); const vazia = st.layers[li].clips.findIndex(c => !c); p.render(); return JSON.stringify({ li, vazia }); })()`));
await wait(200);
{ const t = await rectOf('#menubar'); await click(t.l + 40, t.y); await wait(150); await ev(`${P}.menubar.close(); 1`); }   // primeiro clique só acorda a janela

// 1. botão direito numa casa com clipe abre o menu do clipe; o clipe não é apagado
{
  const antes = await clipName(prep.li, 0);
  const cell = await rectOf(`.cell[data-layer="${prep.li}"][data-col="0"]`);
  await rightClick(cell.x, cell.y); await wait(250);
  const rows = await menuRows();
  check('botão direito no clipe abre o menu do clipe', rows.includes('Renomear…') && rows.includes('Copiar') && rows.includes('Limpar'), rows.join(' | '));
  check('botão direito não apaga o clipe', await clipName(prep.li, 0) === antes && antes !== '');
  check('a casa clicada fica selecionada', await ev(`JSON.stringify(${P}.state.sel)`) === JSON.stringify({ l: prep.li, c: 0 }));
  const copiar = await centerOf(`[...document.querySelectorAll('.menuLayer .menu .mi')].find(x => x.querySelector('.lb').textContent === 'Copiar')`);
  await click(copiar.x, copiar.y); await wait(200);
  check('clicar num item do menu executa e fecha o menu', await menus() === 0 && await ev(`${P}.menubar.open`) === -1);
  await rightClick(cell.x, cell.y); await wait(300);
  const abriu = await menus();
  await ev(`document.activeElement && document.activeElement.blur(); 1`); await esc(); await wait(200);
  check('Esc fecha o menu do botão direito', abriu === 1 && await menus() === 0, `abriu=${abriu} depois=${await menus()} open=${await ev(`${P}.menubar.open`)}`);
  await ev(`${P}.menubar.close(); 1`);
}
// 2. botão direito numa casa vazia: só "Colar"
if (prep.vazia >= 0) {
  const cell = await rectOf(`.cell[data-layer="${prep.li}"][data-col="${prep.vazia}"]`);
  await rightClick(cell.x, cell.y); await wait(250);
  const rows = await menuRows();
  check('botão direito numa casa vazia oferece Colar', rows.length === 1 && rows[0] === 'Colar', rows.join(' | '));
  await ev(`${P}.menubar.close(); 1`);
}
// 3. Test Card: não é clipe, vai para a saída, nome da tela por cima, desliga limpo
{
  // telas padrão (um slice cheio): outro teste pode ter deixado a tela 1 cheia de slices e máscaras do Automape
  await ev(`(() => { const p = ${P}; p.setScreens(p.M.defaultScreens(p.state.settings.w, p.state.settings.h)); return 1; })()`); await wait(200);
  const camadas = await ev(`${P}.state.layers.length`);
  await ev(`${P}.toggleTestCard(); 1`); await wait(150);
  // fora da cruz do centro (a linha y=0,5 é branca): barras 1 (amarela), 3 (verde) e 6 (azul)
  const px = JSON.parse(await ev(`JSON.stringify(${P}.probeScreen(${P}.screens()[0], [[0.2, 0.6], [0.5, 0.6], [0.92, 0.6]]))`));
  check('Test Card liga sem criar camada nem clipe', await ev(`${P}.state.testCard === true && ${P}.state.layers.length === ${camadas} && !${P}.state.layers.some(L => L.testCard)`));
  check('Test Card aparece na tela 1 (barras de cor)', px.every(p => p.join() !== '0,0,0') && new Set(px.map(p => p.join())).size === 3, JSON.stringify(px));
  const sc = await ev(`JSON.stringify((() => { const s = ${P}.screens()[0]; const h = window.__projHelpers[s.id]; return h && h.card ? [h.card.name === s.name, h.card.w === s.w, h.card.h === s.h] : null; })())`);
  check('nome e tamanho da tela por cima do Test Card', sc === '[true,true,true]', sc);
  await ev(`${P}.toggleTestCard(); 1`); await wait(150);
  const px2 = JSON.parse(await ev(`JSON.stringify(${P}.probeScreen(${P}.screens()[0], [[0.2, 0.6], [0.92, 0.6]]))`));
  check('Test Card desliga e some da saída', await ev(`${P}.state.testCard === false && !window.__projHelpers[${P}.screens()[0].id]`) && px2[0].join() === px2[1].join(), JSON.stringify(px2));
}
// 4. Mostrar saídas: com a saída aberta, o botão traz a janela para a frente (o processo principal diz quantas mexeu)
{
  await ev(`(() => { const p = ${P}; const sc = p.screens()[0]; sc.device = 'window'; sc.enabled = true; p.openOutputs(); return 1; })()`); await wait(900);
  const n = await ev(`window.projDesktop.showOutputs()`);
  check('"Mostrar saídas" alcança a janela de saída', n >= 1, 'janelas=' + n);
  const bt = await rectOf('#btnOut');
  const rotulo = await ev(`document.getElementById('btnOut').textContent`);
  await click(bt.x, bt.y); await wait(500);
  check('botão "Mostrar saídas" mantém a saída aberta', await ev(`${P}.outWins().length`) === 1 && rotulo === 'Mostrar saídas', 'rótulo=' + rotulo);
  await ev(`(() => { for (const w of ${P}.outWins()) w.close(); return 1; })()`); await wait(300);
}
// 5. fechar o programa: pergunta com três botões; Cancelar só fecha a pergunta
{
  await ev(`${P}.askClose(); 1`); await wait(150);
  const bts = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.dlgOver .dfoot button')].map(b => b.textContent))`));
  check('X do programa pergunta Salvar e fechar / Fechar sem salvar / Cancelar', bts.join('|') === 'Cancelar|Fechar sem salvar|Salvar e fechar', bts.join('|'));
  const c = await centerOf(`[...document.querySelectorAll('.dlgOver .dfoot button')].find(x => x.textContent === 'Cancelar')`);
  await click(c.x, c.y); await wait(200);
  check('Cancelar fecha só a pergunta; o programa continua', await ev(`document.querySelectorAll('.dlgOver').length`) === 0 && (await (await fetch(base + '/json')).json()).some(p => p.title === 'OpenLume'));
}
const falhas = results.filter(r => !r.ok).length;
console.log(`\n${results.length} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`);
process.exit(falhas ? 1 : 0);
