// Confere o painel Transporte com cliques de verdade (CDP): linha do tempo fina, cada botão do "Tocar" faz o que diz, e a
// linha do tempo pula quando se clica nela. Precisa de um vídeo: gera um de 12 s com o ffmpeg do projeto se não passar PROJ_CLIP.
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/transport-check.mjs [video.mp4]
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume') || pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada'); process.exit(1); }
let clipPath = process.argv[2];
if (!clipPath) { const d = path.join(os.tmpdir(), 'ol-tr'); fs.mkdirSync(d, { recursive: true }); clipPath = path.join(d, 't.mp4');
  if (!fs.existsSync(clipPath)) execFileSync(path.join(import.meta.dirname, 'ffmpeg', 'ffmpeg.exe'), ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=12', '-pix_fmt', 'yuv420p', clipPath]); }
clipPath = clipPath.split(String.fromCharCode(92)).join('/');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
let falhas = 0; const check = (name, ok, info = '') => { if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove()); 1`);
await ev(`(async () => { const p = ${P}; await p.putPath(0, 0, ${JSON.stringify(clipPath)}, 't.mp4'); await new Promise(r => setTimeout(r, 1500)); p.render(); p.panels.render(); return 1; })()`);
await wait(500);
const clip = `${P}.state.layers[0].clips[0]`;
const st = () => ev(`(() => { const c = ${clip}, v = c.el; return { playing: c.tr.playing, dir: c.tr.dir, t: +v.currentTime.toFixed(2), paused: v.paused, rate: v.playbackRate }; })()`);
const btn = (txt) => ev(`(() => { const b = [...document.querySelectorAll('#clipPan .tbtns button')].find(x => x.dataset.k === ${JSON.stringify(txt)}); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2, q.width, q.height]; })()`);
const press = async (txt) => { const q = await btn(txt); if (!q) throw new Error('botão ' + txt + ' não achado'); await click(q[0], q[1]); await wait(250); };

// linha do tempo fina
const tl = await ev(`(() => { const e = document.querySelector('#clipPan .timeline'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; })()`);
check('a linha do tempo existe', !!tl);
const bar = await ev(`(() => { const e = document.querySelector('#clipPan .timeline .tbar'); return e ? e.getBoundingClientRect().height : null; })()`);
check('a barra da linha do tempo é fina como a do Resolume (9 px)', bar !== null && bar <= 10, 'barra ' + bar + ' px');

// botões do Tocar
await press('‖'); let s = await st(); check('‖ pausa', s.playing === false && s.paused, JSON.stringify(s));
await press('▶'); await wait(600); let s2 = await st(); check('▶ toca para a frente', s2.playing && s2.dir === 1 && !s2.paused && s2.t !== s.t, JSON.stringify(s) + ' → ' + JSON.stringify(s2));
await press('‖'); s = await st();
await press('◀'); await wait(700); s2 = await st(); check('◀ toca para trás (o tempo diminui)', s2.playing && s2.dir === -1 && s2.t < s.t + 0.01 && (s2.t !== s.t), JSON.stringify(s) + ' → ' + JSON.stringify(s2));
await press('‖');
await press('|◀'); s = await st(); check('|◀ vai para a entrada', s.t <= 0.05, JSON.stringify(s));
await press('▶|'); s = await st(); check('▶| vai para a saída', s.t >= 11.5, JSON.stringify(s));
await press('|◀'); await press('+1q'); s = await st(); check('+1q avança um quadro e pausa', s.t > 0.02 && s.t < 0.08 && s.playing === false, JSON.stringify(s));
await press('−1q'); s2 = await st(); check('−1q volta um quadro', s2.t < s.t, JSON.stringify(s) + ' → ' + JSON.stringify(s2));
// clicar na linha do tempo pula
if (tl) { await click(tl[0] + tl[2] * 0.5, tl[1] + tl[3] / 2); await wait(250); s = await st(); check('clicar no meio da linha do tempo pula para o meio', Math.abs(s.t - 6) < 0.8, JSON.stringify(s)); }
await press('▶'); await wait(400); s = await st(); check('tocar de novo depois de pular funciona', s.playing && !s.paused, JSON.stringify(s));

// IN/OUT empurram a agulha, como no Resolume (conferido lá: IN além da agulha leva a agulha ao IN; OUT aquém dela leva ao OUT)
await ev(`(() => { const c = ${clip}; c.tr.in = 0; c.tr.out = c.dur; c.tr.playing = false; c.el.pause(); c.el.currentTime = 2; ${P}.panels.render(); return 1; })()`); await wait(300);
const rect = (sel) => ev(`(() => { const e = document.querySelector('#clipPan .timeline ${sel}'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
const dragTo = async (sel, frac, inner) => { const m = await rect(sel), tl2 = await rect(''); const x0 = m[0] + m[2] / 2, y0 = m[1] + m[3] / 2, x1 = tl2[0] + 6 + (tl2[2] - 12) * frac; await mouse('mouseMoved', x0, y0); await mouse('mousePressed', x0, y0); for (let k = 1; k <= 6; k++) await mouse('mouseMoved', x0 + (x1 - x0) * k / 6, y0); await mouse('mouseReleased', x1, y0); await wait(250); };
await dragTo('.hnd.in', 0.5); s = await ev(`(() => ({ in: ${clip}.tr.in, t: ${clip}.el.currentTime }))()`);
check('arrastar o IN para depois da agulha leva a agulha junto', s.in > 5 && Math.abs(s.t - s.in) < 0.05, JSON.stringify(s));
await ev(`(() => { ${clip}.el.currentTime = 9; ${P}.panels.render(); return 1; })()`); await wait(300);
await dragTo('.hnd.out', 0.6); s = await ev(`(() => ({ out: ${clip}.tr.out, t: ${clip}.el.currentTime }))()`);
check('arrastar o OUT para antes da agulha leva a agulha junto', s.out < 8 && Math.abs(s.t - s.out) < 0.05, JSON.stringify(s));
await ev(`(() => { ${clip}.el.currentTime = 6.5; ${P}.panels.render(); return 1; })()`); await wait(300);
await dragTo('.hnd.in', 0.1); s = await ev(`(() => ({ in: ${clip}.tr.in, t: ${clip}.el.currentTime }))()`);
check('puxar o IN para longe da agulha não mexe nela', s.in < 2 && Math.abs(s.t - 6.5) < 0.05, JSON.stringify(s));

// IN e OUT se fecham um contra o outro e o clipe fica parado
await ev(`(() => { const c = ${clip}; c.tr.in = 0; c.tr.out = c.dur; c.tr.playing = false; c.el.pause(); c.el.currentTime = 6; ${P}.panels.render(); return 1; })()`); await wait(300);
await dragTo('.hnd.in', 0.5); await dragTo('.hnd.out', 0.5);
s = await ev(`(() => ({ in: ${clip}.tr.in, out: ${clip}.tr.out }))()`);
check('IN e OUT podem se encontrar', Math.abs(s.out - s.in) < 0.05, JSON.stringify(s));
await ev(`(() => { ${P}.trigger(0, 0); return 1; })()`); await wait(300);
await press('▶'); await wait(700); s = await st();
check('com IN = OUT o clipe fica parado (▶ não anda)', s.paused && Math.abs(s.t - 6) < 0.1, JSON.stringify(s));
await press('◀'); await wait(500); s2 = await st();
check('com IN = OUT o ◀ também não anda', Math.abs(s2.t - s.t) < 0.05, JSON.stringify(s2));
// abriu de novo: continua andando sozinho
await press('▶'); await dragTo('.hnd.out', 1.0); await wait(900); s2 = await st();
check('abrindo o IN/OUT de novo o clipe volta a andar sozinho', !s2.paused && s2.playing && s2.t > 6.3, JSON.stringify(s2));
await ev(`(() => { const c = ${clip}; c.tr.in = 0; c.tr.out = c.dur; ${P}.panels.render(); return 1; })()`);

// o mesmo com o clipe NO AR (disparado): ◀ anda para trás e ‖ para
await ev(`(() => { ${P}.trigger(0, 0); return 1; })()`); await wait(600);
await press('▶'); await wait(500); await press('◀'); s = await st(); await wait(700); s2 = await st();
check('no ar: ◀ toca para trás', s2.t < s.t - 0.2 || (s.t < 0.3 && s2.t <= s.t), JSON.stringify(s) + ' → ' + JSON.stringify(s2));
await press('‖'); s = await st(); await wait(400); s2 = await st(); check('no ar: ‖ para', s.t === s2.t && !s2.playing, JSON.stringify(s2));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo'); ws.close(); process.exit(falhas ? 1 : 0);
