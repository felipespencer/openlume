// Confere o Transform do clipe com cliques de verdade (CDP): a Escala como no Resolume (grupo que abre e fecha, com Escala, Largura e
// Altura independentes). Programa aberto com --remote-debugging-port=9333.
// Uso: node tools/transform-check.mjs
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('janela do OpenLume não achada'); process.exit(1); }
const d = path.join(os.tmpdir(), 'ol-tr'); fs.mkdirSync(d, { recursive: true }); const clipPath = path.join(d, 't.mp4');
if (!fs.existsSync(clipPath)) execFileSync(path.join(import.meta.dirname, 'ffmpeg', 'ffmpeg.exe'), ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=12', '-pix_fmt', 'yuv420p', clipPath]);
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && waits.has(x.id)) { waits.get(x.id)(x); waits.delete(x.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(200); };
let falhas = 0; const check = (name, ok, info = '') => { if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + name + (info ? '  — ' + info : '')); };
const P = 'window.projecionista';
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove()); 1`);
await ev(`(async () => { const p = ${P}; await p.putPath(0, 0, ${JSON.stringify(clipPath.split(String.fromCharCode(92)).join('/'))}, 't.mp4'); await new Promise(r => setTimeout(r, 1500)); const c = p.state.layers[0].clips[0]; c.transform = { x: 0, y: 0, scale: 1, rot: 0 }; p.panels.scaleOpen = false; p.panels.render(); return 1; })()`);
await wait(400);
const clip = `${P}.state.layers[0].clips[0]`;
const rowOf = (label) => `[...document.querySelectorAll('#clipPan .prow')].find(r => r.querySelector('.pl') && r.querySelector('.pl').textContent.replace(/[▶▼]/g, '').trim() === ${JSON.stringify(label)} && !r.classList.contains('grp'))`;
const pt = (label, sel) => ev(`(() => { const r = ${rowOf(label)}; if (!r) return null; r.scrollIntoView({ block: 'center' }); const e = ${sel}; const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; })()`);
const mais = async (label, vezes = 1) => { for (let i = 0; i < vezes; i++) { const q = await pt(label, `r.querySelectorAll('button.pm')[1]`); await click(q[0], q[1]); await wait(150); } };

// Escala como no Resolume: fechada é uma linha só; aberta mostra o cabeçalho e Escala, Largura e Altura independentes
const existe = (l) => ev(`!!${rowOf(l)}`);
check('fechada: só a linha "Escala" (sem Largura, Altura nem Travar)', (await existe('Escala')) && !(await existe('Largura')) && !(await existe('Altura')) && !(await existe('Travar')));
const tgl = await pt('Escala', `r.querySelector('.tgl')`); await click(tgl[0], tgl[1]); await wait(250);
check('abrir a setinha mostra Escala, Largura e Altura', (await existe('Escala')) && (await existe('Largura')) && (await existe('Altura')));
const tam = () => ev(`(() => { const t = ${clip}.transform; return { escala: Math.round(t.scale * 100), w: Math.round((t.sx ?? 1) * 100), h: Math.round((t.sy ?? 1) * 100) }; })()`);
let s0 = await tam(); check('começa em 100 / 100 / 100', s0.escala === 100 && s0.w === 100 && s0.h === 100, JSON.stringify(s0));
await mais('Escala', 10); s0 = await tam(); check('Escala mexe sozinha (Largura e Altura ficam em 100)', s0.escala === 110 && s0.w === 100 && s0.h === 100, JSON.stringify(s0));
await mais('Largura', 20); s0 = await tam(); check('Largura mexe sozinha', s0.w === 120 && s0.h === 100 && s0.escala === 110, JSON.stringify(s0));
await mais('Altura', 30); s0 = await tam(); check('Altura mexe sozinha', s0.h === 130 && s0.w === 120 && s0.escala === 110, JSON.stringify(s0));
const eng = await ev(`(() => { const t = ${clip}.transform; return [t.scale * (t.sx ?? 1), t.scale * (t.sy ?? 1)].map(v => +v.toFixed(3)); })()`);
check('o tamanho na tela é Escala × Largura e Escala × Altura', Math.abs(eng[0] - 1.32) < 0.02 && Math.abs(eng[1] - 1.43) < 0.02, JSON.stringify(eng));
const tgl2 = await ev(`(() => { const e = document.querySelector('#clipPan .prow.grp .tgl'); e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; })()`); await click(tgl2[0], tgl2[1]); await wait(250);
check('fechar a setinha esconde Largura e Altura de novo', !(await existe('Largura')) && (await existe('Escala')));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo'); ws.close(); process.exit(falhas ? 1 : 0);
