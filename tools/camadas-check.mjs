// Camadas e decks como no Resolume (plano 02-04): cliques e arrastos de mouse REAIS pelo CDP (Input.dispatchMouseEvent)
// no painel da camada, na linha da composição, no crossfader e nos decks, conferindo o estado depois de cada um.
// Pré-requisito: `npx electron . --remote-debugging-port=9333`.
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const S = ms => new Promise(r => setTimeout(r, ms));
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const rect = async (sel) => {
  const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2,t:b.y,h:b.height,l:b.x,w:b.width};})()`);
  if (!r) throw new Error('não achei ' + sel); return r;
};
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const click = async (sel) => { const r = await rect(sel); await mouse('mouseMoved', r.x, r.y, { buttons: 0 }); await mouse('mousePressed', r.x, r.y); await mouse('mouseReleased', r.x, r.y); await S(300); };
const drag = async (x0, y0, x1, y1) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); for (let i = 1; i <= 10; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); await mouse('mouseReleased', x1, y1); await S(250); };
const results = []; const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';

// o diálogo "Projetores" abre junto com o programa: fecha com Esc de verdade (até três vezes) antes de clicar em qualquer coisa
for (let i = 0; i < 3 && await ev(`document.querySelectorAll('.dlgOver').length`); i++) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await S(300); }
// preparo: telas e diálogos fechados; camada 2 (de baixo para cima) com dois clipes, o primeiro no ar
await ev(`(() => { const p = ${P}; if (p.automape && p.automape.dlg) p.automape.close(); p.ao.hide(false); if (p.laser.open) p.laser.hide(); return 1; })()`);
await ev(`(async () => { const p = ${P}, n = p.state.layers.length; p.state.layers.forEach((L, i) => { for (let c = 0; c < 8; c++) if (L.clips[c]) p.clearCell(i, c); p.eject(i); L.bus = null; L.opacity = 1; L.bypass = false; L.solo = false; });
  p.putSource(n - 2, 0, 'lines'); p.putSource(n - 2, 1, 'gradient'); p.trigger(n - 2, 0); p.state.selLayer = 0; p.render(); await new Promise(r => setTimeout(r, 400)); return 1; })()`);
const li = await ev(`${P}.state.layers.length - 2`), li3 = li - 1;
{ const t = await rect('#menubar'); await mouse('mouseMoved', t.l + 40, t.y, { buttons: 0 }); await mouse('mousePressed', t.l + 40, t.y); await mouse('mouseReleased', t.l + 40, t.y); await S(150); await ev(`${P}.menubar.close(); 1`); }   // o primeiro clique só acorda a janela (como no undo-check)
const L = (k) => ev(`JSON.stringify((() => { const L = ${P}.state.layers[${k}]; return { on: L.on, bus: L.bus, op: L.opacity, by: L.bypass, so: L.solo }; })())`).then(JSON.parse);
const lh = (k) => `#grid .lh[data-layer="${k}"]`;

// ---------- AC-1: painel da camada ----------
check('painel tem X, B, S, mistura, fader, ⏮ ⏭, nome, A e B', await ev(`(() => { const e = document.querySelector('${lh(li)}'); return !!(e && e.querySelector('.x') && e.querySelector('.by') && e.querySelector('.so') && e.querySelector('select.blend') && e.querySelector('.fader') && e.querySelector('.st.pv') && e.querySelector('.st.nx') && e.querySelector('.nm') && e.querySelectorAll('.bus').length === 2); })()`));
await click(lh(li3) + ' .nm');
check('clicar no nome da camada 3 a seleciona', await ev(`${P}.state.selLayer`) === li3);
check('a faixa do nome da selecionada fica verde-água', await ev(`getComputedStyle(document.querySelector('${lh(li3)} .nm')).backgroundColor === 'rgb(127, 245, 207)'`));
await click(lh(li) + ' .bus:nth-last-child(2)');
check('A põe a camada 2 no lado A do crossfader', (await L(li)).bus === 'A');
check('o A fica aceso', await ev(`document.querySelector('${lh(li)} .bus:nth-last-child(2)').classList.contains('act')`));
await click(lh(li) + ' .bus:last-child');
check('B passa a camada 2 para o lado B', (await L(li)).bus === 'B');
await click(lh(li) + ' .bus:last-child');
check('clicar no B de novo tira a camada do crossfader', (await L(li)).bus === null);
await click(lh(li) + ' .st.nx');
check('⏭ põe no ar o próximo clipe da camada', (await L(li)).on === 1, 'on=' + (await L(li)).on);
await click(lh(li) + ' .st.pv');
check('⏮ volta ao clipe anterior', (await L(li)).on === 0, 'on=' + (await L(li)).on);
{ const r = await rect(lh(li) + ' .fader'); await drag(r.x, r.t + 2, r.x, r.t + r.h * 0.5); }
const op = (await L(li)).op;
check('arrastar o fader até a metade deixa a opacidade perto de 0,5', Math.abs(op - 0.5) < 0.08, op.toFixed(3));
await click(lh(li) + ' .nm');
check('o painel Camada mostra o mesmo valor', await ev(`(() => { const t = document.getElementById('panels') || document.body; return t.textContent.includes(String(Math.round(${op} * 100))); })()`));
await click(lh(li) + ' .by');
check('B (bypass) desliga a camada', (await L(li)).by === true);
await click(lh(li) + ' .by');
await click(lh(li) + ' .so');
check('S (solo) liga o solo', (await L(li)).so === true);
await click(lh(li) + ' .so');
await click(lh(li) + ' .x');
check('✕ tira a camada do ar', (await L(li)).on === -1);

// ---------- AC-2: composição, crossfader e decks ----------
const C = '#grid .gh.corner.comp';
check('linha da composição tem ✕, B, ◀ ‖ ▶ e |◀ ▶|', await ev(`(() => { const e = document.querySelector('${C}'); return !!e && ['✕', 'B', '◀', '‖', '▶', '|◀', '▶|'].every(t => [...e.querySelectorAll('button')].some(b => b.textContent === t)); })()`));
await ev(`(() => { const p = ${P}; p.trigger(${li}, 1); return 1; })()`); await S(300);   // Gradient: nunca preto no meio
const px = () => ev(`JSON.stringify(${P}.probe ? ${P}.probe([[0.5, 0.5]])[0] : null)`);
const antes = await px();
await click(C + ' .by');
check('B da composição liga o bypass', await ev(`${P}.state.compBypass === true && ${P}.engine.compBypass === true`));
await S(300); const durante = await px();
check('com o bypass a saída fica no fundo e o clipe continua no ar', durante !== antes && (await L(li)).on === 1, antes + ' → ' + durante);
await click(C + ' .by');
await S(300);
check('B de novo volta a imagem', await ev(`${P}.state.compBypass === false`) && await px() === antes, await px());
await click(C + ' .x');
check('✕ da composição tira tudo do ar', await ev(`${P}.state.layers.every(L => L.on < 0)`));
check('crossfader fica embaixo das camadas, com A e B', await ev(`(() => { const x = document.getElementById('xfade'), lh = document.querySelector('#grid .lh'); if (!x || !lh) return false; const a = x.getBoundingClientRect(), b = lh.getBoundingClientRect(); return Math.abs(a.width - b.width) < 4 && x.querySelectorAll('button').length === 2; })()`));
check('abas dos decks ao lado do crossfader', await ev(`(() => { const x = document.getElementById('xfade').getBoundingClientRect(), d = document.getElementById('decks').getBoundingClientRect(); return Math.abs(x.top - d.top) < 2 && d.left >= x.right - 1; })()`));
await ev(`(() => { const p = ${P}; while (p.state.decks.length > 1) p.removeDeck(p.state.decks.length - 1); p.addDeck(1, 'Deck teste'); p.switchDeck(0); return 1; })()`); await S(300);
await click('#decks button:nth-child(2)');
check('clicar no segundo deck troca de deck', await ev(`${P}.state.deck`) === 1);
check('o deck aberto fica verde-água', await ev(`getComputedStyle(document.querySelector('#decks button.on')).backgroundColor === 'rgb(127, 245, 207)'`));
await click('#decks button:nth-child(1)');
check('voltar ao primeiro deck traz os clipes', await ev(`${P}.state.deck === 0 && !!${P}.state.layers[${li}].clips[0]`));
await ev(`(() => { const p = ${P}; while (p.state.decks.length > 1) p.removeDeck(p.state.decks.length - 1); return 1; })()`);

const ok = results.filter(Boolean).length;
console.log(`\n${results.length} verificações, ${results.length - ok} falha(s) — ${ok === results.length ? 'APROVADO' : 'REPROVADO'}`);
ws.close(); process.exit(ok === results.length ? 0 : 1);
