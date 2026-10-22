// Verifica o desfazer geral (Ctrl+Z / Ctrl+Y) no programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP), com eventos
// de entrada REAIS pelo CDP: arrasta a opacidade de uma camada, Ctrl+Z volta, Ctrl+Y refaz, Delete limpa a casa e Ctrl+Z
// traz o clipe de volta, e o menu Composição › Desfazer funciona. Uso: node tools/undo-check.mjs
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
const drag = async (x0, y0, x1, y1) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); for (let i = 1; i <= 10; i++) await mouse('mouseMoved', x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); await mouse('mouseReleased', x1, y1); };
const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const key = async (k, code, vk, mods = 0) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers: mods, windowsVirtualKeyCode: vk }); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const rectOf = async (sel) => JSON.parse(await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'null'; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,t:r.top,w:r.width,h:r.height})})()`));
const P = 'window.projecionista';

// preparo: fecha o que estiver aberto; garante um clipe (fonte) numa casa e outro no ar
await ev(`(() => { const p = ${P}; if (p.automape.dlg) p.automape.close(); p.ao.hide(false); if (p.laser.open) p.laser.hide(); return 1; })()`);
const prep = JSON.parse(await ev(`(() => { const p = ${P}, st = p.state; let li = st.layers.findIndex(L => L.on >= 0);
  if (li < 0) { li = 1; if (!st.layers[li].clips[0]) p.putSource(li, 0, 'sinewave'); p.trigger(li, 0); }
  const L = st.layers[li]; L.opacity = 1; let col = L.clips.findIndex((c, i) => c && i !== L.on); if (col < 0) { col = L.clips.findIndex(c => !c); p.putSource(li, col, 'gradient'); }
  p.render(); return JSON.stringify({ li, col, on: L.on, opac: L.opacity, kind: L.clips[col] && L.clips[col].kind, src: L.clips[col] && (L.clips[col].source || L.clips[col].path) }); })()`));
await wait(200);
const { li, col } = prep;
{ const t = await rectOf('#menubar'); await click(t.l + 40, t.y); await wait(150); await ev(`${P}.menubar.close(); 1`); }   // primeiro clique só acorda a janela
check('preparo: uma camada no ar e um clipe noutra casa', prep.on >= 0 && !!prep.kind, JSON.stringify(prep));

// 1. arrastar a opacidade da camada e Ctrl+Z
let r = await rectOf(`.lh[data-layer="${li}"] input[type=range]`);
await drag(r.l + r.w * 0.95, r.y, r.l + r.w * 0.3, r.y); await wait(200);
const op1 = await ev(`${P}.state.layers[${li}].opacity`);
check('arrastar o controle muda a opacidade da camada', op1 < prep.opac - 0.3, prep.opac + ' → ' + op1);
await key('z', 'KeyZ', 90, 2); await wait(600);
const after = JSON.parse(await ev(`(() => { const L = ${P}.state.layers[${li}]; const c = L.clips[L.on]; return JSON.stringify({ opac: L.opacity, on: L.on, tocando: !!c && (!!c.player || (c.el && !c.el.paused) || c.kind === 'source') }); })()`));
check('Ctrl+Z (tecla real) volta a opacidade', Math.abs(after.opac - prep.opac) < 1e-9, prep.opac + ' ← ' + after.opac);
check('o que tocava continua no ar', after.on === prep.on && after.tocando, JSON.stringify(after));
await key('y', 'KeyY', 89, 2); await wait(600);
const op2 = await ev(`${P}.state.layers[${li}].opacity`);
check('Ctrl+Y refaz', Math.abs(op2 - op1) < 1e-9, op1 + ' ↔ ' + op2);
await key('z', 'KeyZ', 90, 2); await wait(600);

// 2. Delete numa casa selecionada e Ctrl+Z traz o clipe de volta
await ev(`(() => { const p = ${P}; p.state.sel = { l: ${li}, c: ${col} }; p.state.selLayer = ${li}; p.render(); return 1; })()`);
r = await rectOf(`.cell[data-layer="${li}"][data-col="${col}"]`);
await mouse('mouseMoved', r.x, r.y, { buttons: 0 });
await key('Delete', 'Delete', 46); await wait(300);
const vazia = await ev(`!${P}.state.layers[${li}].clips[${col}]`);
check('Delete (tecla real) limpa a casa', vazia);
await key('z', 'KeyZ', 90, 2); await wait(1200);
const volta = JSON.parse(await ev(`(() => { const c = ${P}.state.layers[${li}].clips[${col}]; return JSON.stringify(c ? { kind: c.kind, src: c.source || c.path } : null); })()`));
check('Ctrl+Z traz o clipe de volta para a casa', !!volta && volta.kind === prep.kind && volta.src === prep.src, JSON.stringify(volta));

// 3. menu Composição › Desfazer com clique real (depois de mudar a opacidade de novo)
r = await rectOf(`.lh[data-layer="${li}"] input[type=range]`);
await drag(r.l + r.w * 0.95, r.y, r.l + r.w * 0.5, r.y); await wait(200);
const op3 = await ev(`${P}.state.layers[${li}].opacity`);
r = await rectOf('#menubar .mb:nth-child(2)'); await click(r.x, r.y); await wait(200);
let mi = JSON.parse(await ev("(()=>{ const it=[...document.querySelectorAll('.menu .mi')].find(e=>e.textContent.includes('Desfazer')); if(!it) return 'null'; const r=it.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2, off:it.classList.contains('off')||it.classList.contains('disabled')}); })()"));
if (!mi) { await ev(`${P}.menubar.show(1); 1`); await wait(150); mi = JSON.parse(await ev("(()=>{ const it=[...document.querySelectorAll('.menu .mi')].find(e=>e.textContent.includes('Desfazer')); if(!it) return 'null'; const r=it.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2, off:it.classList.contains('off')||it.classList.contains('disabled')}); })()")); }
check('o menu Composição tem "Desfazer" ligado', !!mi && !mi.off, JSON.stringify(mi));
if (mi) { await click(mi.x, mi.y); await wait(600); }
const op4 = await ev(`${P}.state.layers[${li}].opacity`);
check('clicar em Desfazer volta a opacidade', op3 < prep.opac - 0.2 && Math.abs(op4 - prep.opac) < 1e-9, op3 + ' → ' + op4);

// 4. custo do retrato (um por gesto)
const ms = await ev(`(() => { const t0 = performance.now(); for (let i = 0; i < 20; i++) ${P}.markUndo(); return (performance.now() - t0) / 20; })()`);
check('o retrato da composição custa menos de 8 ms', ms < 8, ms.toFixed(2) + ' ms');

const bad = results.filter(x => !x.ok);
console.log(bad.length ? 'REPROVADO: ' + bad.map(x => x.name).join(', ') : 'APROVADO: ' + results.length + ' verificações');
ws.close(); process.exit(bad.length ? 1 : 0);
