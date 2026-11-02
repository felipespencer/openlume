// Confere o modo Atalhos de teclado com mouse e teclas de verdade (CDP): ligar com Ctrl+Shift+K, tingir o que é mapeável, clicar
// seleciona sem disparar, apertar uma tecla mapeia (letra no canto e linha na lista), Delete tira, Esc sai, e com o modo desligado
// a tecla dispara o clipe / a coluna / o transporte, o piano solta ao soltar, teclas repetidas ficam vermelhas e o mapa vai na composição.
// Programa aberto com --remote-debugging-port=9333. Uso: node tools/keymap-check.mjs
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada'); process.exit(1); }
const d = path.join(os.tmpdir(), 'ol-tr'); fs.mkdirSync(d, { recursive: true }); const clipPath = path.join(d, 't.mp4').split(String.fromCharCode(92)).join('/');
if (!fs.existsSync(clipPath)) execFileSync(path.join(import.meta.dirname, 'ffmpeg', 'ffmpeg.exe'), ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=12', '-pix_fmt', 'yuv420p', clipPath]);
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && waits.has(x.id)) { waits.get(x.id)(x); waits.delete(x.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(200); };
const VK = { Delete: 46, Escape: 27, Backspace: 8 };
const keyDown = (key, code, vk, modifiers = 0) => send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: vk, text: key.length === 1 ? key : undefined });
const keyUp = (key, code, vk, modifiers = 0) => send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk });
const tecla = async (ch) => { const code = /\d/.test(ch) ? 'Digit' + ch : 'Key' + ch.toUpperCase(), vk = ch.toUpperCase().charCodeAt(0); await keyDown(ch, code, vk); await wait(40); await keyUp(ch, code, vk); await wait(250); };
const especial = async (key) => { await keyDown(key, key, VK[key]); await wait(40); await keyUp(key, key, VK[key]); await wait(250); };
let falhas = 0; const check = (name, ok, info = '') => { if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove()); 1`);
// preparo: dois clipes (Camada 5, coluna 1 e Camada 1, coluna 2), mapa vazio, modo desligado
await ev(`(async () => { const p = ${P}; if (p.keymap.on) p.keymap.stop(); p.state.keymap = null;
  await p.putPath(0, 0, ${JSON.stringify(clipPath)}, 'a.mp4'); await p.putPath(4, 1, ${JSON.stringify(clipPath)}, 'b.mp4'); await new Promise(r => setTimeout(r, 1500));
  for (const L of p.state.layers) if (L.on >= 0) p.eject(p.state.layers.indexOf(L)); p.state.selLayer = 0; p.state.sel = { l: 0, c: 0 }; p.render(); p.panels.render(); return 1; })()`);
await wait(500);
const km = `${P}.keymap`, S = `${P}.state`;
const centro = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
const cel = (li, c) => `#grid .cell[data-layer="${li}"][data-col="${c}"]`;
const noAr = (li) => ev(`${S}.layers[${li}].on`);

// 1. ligar com Ctrl+Shift+K (tecla de verdade)
await keyDown('K', 'KeyK', 75, 10); await wait(40); await keyUp('K', 'KeyK', 75, 10); await wait(500);
check('Ctrl+Shift+K liga o modo', (await ev(`${km}.on`)) === true && (await ev(`document.body.classList.contains('mapmode')`)) === true);
check('a aba Atalhos aparece à frente e fica ativa', await ev(`(() => { const t = document.querySelector('#browserTabs [data-tab=keys]'); return !!t && t.classList.contains('on') && t === document.querySelector('#browserTabs').firstElementChild; })()`));
check('o aviso do modo aparece', (await ev(`(() => { const p = document.getElementById('mapPill'); return !!p && !p.hidden; })()`)) === true);
const tintados = await ev(`document.querySelectorAll('.mappable').length`);
check('clipes, colunas, camadas, transporte e barra ficam tingidos', tintados > 60, tintados + ' elementos');

// 2. clicar seleciona sem disparar
let c = await centro(cel(0, 0)); await click(c[0], c[1]);
check('clicar num clipe o seleciona e NÃO o dispara', (await ev(`${km}.cur && ${km}.cur.kind`)) === 'clip' && (await noAr(0)) === -1, 'camada 5 no ar: ' + await noAr(0));
check('o clipe selecionado ganha a moldura branca', await ev(`document.querySelector(${JSON.stringify(cel(0, 0))}).classList.contains('mapsel')`));

// 3. apertar uma tecla mapeia
await tecla('q');
check('apertar Q mapeia o clipe', (await ev(`${S}.keymap.presets['Padrão'].map(m => m.key + ':' + m.kind + ':' + m.a + ':' + m.b).join(',')`)) === 'Q:clip:5:0', await ev(`JSON.stringify(${S}.keymap.presets['Padrão'])`));
check('a letra Q aparece no canto do clipe', (await ev(`document.querySelector(${JSON.stringify(cel(0, 0))}).dataset.mapkey`)) === 'Q');
check('a lista mostra "Camada 5 · Clipe 1 · Tocar" com a tecla Q', await ev(`[...document.querySelectorAll('#browserPan .krow')].some(r => r.textContent.includes('Camada 5') && r.textContent.includes('Clipe 1') && r.textContent.endsWith('Q'))`));
check('o inspetor mostra o Alvo "Por posição"', await ev(`(() => { const s = document.querySelector('#browserPan .kinsp select'); return !!s && s.value === 'pos'; })()`));

// 4. Delete tira; mapeia de novo
await especial('Delete');
check('Delete tira o atalho', (await ev(`${S}.keymap.presets['Padrão'].length`)) === 0 && (await ev(`document.querySelector(${JSON.stringify(cel(0, 0))}).dataset.mapkey`)) === undefined);
await tecla('q');
// coluna 2, transporte ▶, solo da camada 1, e o mesmo Q de novo em outro clipe (repetida)
c = await centro('#grid button.gh.col[data-col="1"]'); await click(c[0], c[1]); await tecla('2');
c = await centro('#clipPan .tbtns button[data-k="▶"]'); await click(c[0], c[1]); await tecla('w');
c = await centro('#clipPan .tbtns button[data-k="◀"]'); await click(c[0], c[1]); await tecla('e');
c = await centro(cel(4, 1)); await click(c[0], c[1]); await tecla('q');
check('teclas repetidas ficam em vermelho na lista', (await ev(`document.querySelectorAll('#browserPan .krow.dup').length`)) === 2);
await especial('Delete');   // tira o segundo Q (o clipe da Camada 1)
check('4 atalhos no preset (Q, 2, W, E)', (await ev(`${S}.keymap.presets['Padrão'].length`)) === 4, await ev(`${S}.keymap.presets['Padrão'].map(m => m.key + ':' + m.kind).join(',')`));

// 5. Esc sai
await especial('Escape');
check('Esc sai do modo e some a aba e o aviso', (await ev(`${km}.on`)) === false && (await ev(`!document.querySelector('#browserTabs [data-tab=keys]')`)) && (await ev(`document.getElementById('mapPill').hidden`)) === true && (await ev(`document.querySelectorAll('.mappable').length`)) === 0);

// 6. com o modo desligado a tecla dispara
await tecla('q');
check('Q dispara o clipe da Camada 5, coluna 1', (await noAr(0)) === 0, 'on=' + await noAr(0));
await ev(`(() => { ${P}.eject(0); return 1; })()`); await wait(200);
await tecla('2');
check('2 dispara a coluna 2 (o clipe da Camada 1)', (await noAr(4)) === 1, 'on=' + await noAr(4));
await ev(`(() => { const c = ${S}.layers[4].clips[1]; ${S}.sel = { l: 4, c: 1 }; ${S}.selLayer = 4; ${P}.render(); ${P}.panels.render(); return 1; })()`); await wait(400);
await tecla('w'); await wait(500);
let t = await ev(`(() => { const c = ${S}.layers[4].clips[1]; return { playing: c.tr.playing, dir: c.tr.dir }; })()`);
check('W (transporte ▶) toca o clipe selecionado para a frente', t.playing && t.dir === 1, JSON.stringify(t));
await tecla('e'); await wait(300);
t = await ev(`(() => { const c = ${S}.layers[4].clips[1]; return { playing: c.tr.playing, dir: c.tr.dir }; })()`);
check('E (transporte ◀) toca o clipe selecionado para trás', t.playing && t.dir === -1, JSON.stringify(t));

// 7. piano: toca enquanto segura
await ev(`(() => { ${P}.eject(0); ${P}.eject(4); const m = ${S}.keymap.presets['Padrão'].find(m => m.key === 'Q'); m.piano = true; return 1; })()`); await wait(200);
await keyDown('q', 'KeyQ', 81); await wait(250);
const seg = await noAr(0); await keyUp('q', 'KeyQ', 81); await wait(300);
check('piano: o clipe toca enquanto a tecla está apertada e sai ao soltar', seg === 0 && (await noAr(0)) === -1, 'segurando=' + seg + ' solto=' + await noAr(0));
await ev(`(() => { ${S}.keymap.presets['Padrão'].find(m => m.key === 'Q').piano = false; return 1; })()`);

// 8. o mapa vai junto com a composição
const salvo = await ev(`(async () => { const m = await import('./composition.js'); const j = JSON.parse(m.serializeComposition(${S}, ${P}.laser, ${P}.cols())); return j.keymap && j.keymap.presets['Padrão'].map(x => x.key).join(','); })()`);
check('a composição salva leva o mapa de teclas', salvo === 'Q,2,W,E', salvo);
// 9. Alvo "Este clipe": a tecla segue o clipe mesmo trocado de lugar
await ev(`(() => { const m = ${S}.keymap.presets['Padrão'].find(m => m.key === 'Q'); m.target = 'this'; m.uid = ${S}.layers[0].clips[0].id; return 1; })()`);
await ev(`(() => { ${P}.eject(0); const L = ${S}.layers[0]; L.clips[3] = L.clips[0]; L.clips[0] = null; ${P}.render(); return 1; })()`); await wait(300);
await tecla('q');
check('Alvo "Este clipe": a tecla acha o clipe na casa nova', (await noAr(0)) === 3, 'on=' + await noAr(0));

// limpeza
await ev(`(() => { ${S}.keymap = null; for (const li of [0, 4]) ${P}.eject(li); const L = ${S}.layers[0]; L.clips[0] = L.clips[3]; L.clips[3] = null; ${P}.render(); return 1; })()`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo'); ws.close(); process.exit(falhas ? 1 : 0);
