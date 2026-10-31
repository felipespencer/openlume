// Bancada TEMPORAL do Background Removal: o mesmo vídeo em movimento nos dois programas, em modo Máscara, com a
// Suavidade no tempo em dois valores (0 e 0,95); captura N quadros seguidos de cada lado (Resolume pelo Spout em rajada,
// OpenLume pelo canvas via CDP) e mede, em cada programa, quanto o 0,95 ATRASA e quanto RASTRO deixa em relação ao 0
// do mesmo programa. Assim dá para calibrar a nossa suavidade pela deles sem precisar de sincronia entre os programas.
// Uso: node tools/compare/temporal.mjs [--clip arq.mp4] [--n 90] [--valor 0.95] [--nome rotulo]
// Precisa: Resolume com servidor web e Spout "Arena - Screen 1"; OpenLume com --remote-debugging-port=9333.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from './resolume.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'saida', 'temporal');
const a = { clip: path.join(HERE, 'saida', 'pessoa2', 'pessoa2.mp4'), n: 90, valor: 0.95, nome: 'temporal' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) { const k = argv[i]; if (k === '--clip') a.clip = argv[++i]; else if (k === '--n') a.n = +argv[++i]; else if (k === '--valor') a.valor = +argv[++i]; else if (k === '--nome') a.nome = argv[++i]; }
fs.mkdirSync(OUT, { recursive: true });
const clip = path.resolve(a.clip).replace(/\\/g, '/');

// ---- OpenLume (CDP) ----
const base = 'http://127.0.0.1:9333';
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume') || pages.find(p => p.type === 'page' && p.title.includes('OpenLume'));
if (!page) { console.error('OpenLume não está aberto com --remote-debugging-port=9333'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };

async function openlumeSerie(tsmooth) {
  // carrega o clipe (uma vez), põe o efeito em modo Máscara com a suavidade pedida, dispara do começo e grava N quadros reduzidos
  const b64 = await ev(`(async () => {
    const P = window.projecionista, L = P.state.layers[0], S = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('.dlgOver').forEach(d => d.remove());
    const def = P.EFFECTS.find(e => (e.rname || e.name) === 'Background Removal');
    let c = L.clips[1];
    if (!c || c.path !== ${JSON.stringify(clip)}) { await P.putPath(0, 1, ${JSON.stringify(clip)}, ${JSON.stringify(path.basename(clip))}); await S(2500); c = L.clips[1]; }
    const params = {}; for (const p of def.params) params[p.key] = p.def;
    params.mode = 1; params.quality = 1; params.tsmooth = ${tsmooth};
    L.fx = [{ id: def.id, params, bypass: false, anim: {} }];
    P.trigger(0, 1); P.render(); await S(1500);   // deixa a máscara nascer e o modelo aquecer
    P.trigger(0, 1);                              // recomeça o clipe: as séries dos dois valores começam no mesmo quadro do vídeo
    const W = 192, H = 108, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d', { willReadFrequently: true });
    const out = new Uint8Array(${a.n} * W * H); const ts = []; const t0 = performance.now(); let k = 0, lastF = -1;
    await new Promise(res => { const tick = () => { const f = P.frames(); if (f !== lastF) { lastF = f; ctx.drawImage(P.engine.canvas, 0, 0, W, H); const d = ctx.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) out[k * W * H + i] = d[i * 4]; ts.push(Math.round(performance.now() - t0)); k++; } if (k < ${a.n}) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    let s = ''; for (let i = 0; i < out.length; i += 8192) s += String.fromCharCode.apply(null, out.subarray(i, i + 8192));
    return JSON.stringify({ b64: btoa(s), ts });
  })()`);
  const o = JSON.parse(b64);
  return { buf: Buffer.from(o.b64, 'base64'), ts: o.ts };
}

// ---- Resolume (REST + Spout) ----
async function resolumeSerie(tsmooth) {
  await R.abrir(a.clip);
  await R.efeito('Background Removal');
  await R.valor('Mode', 'Mask'); await R.valor('Model Quality', 'Medium'); await R.valor('Temporal Smoothness', tsmooth);
  await new Promise(r => setTimeout(r, 1500));
  await R.abrir(a.clip);   // recomeça do começo
  const npy = path.join(OUT, `${a.nome}-resolume-${tsmooth}.npy`);
  execFileSync('py', [path.join(HERE, 'capture-burst.py'), npy, String(a.n)], { stdio: ['ignore', 'inherit', 'inherit'] });
  return npy;
}

for (const v of [0, a.valor]) {
  console.log(`Resolume, Temporal Smoothness ${v}…`); await resolumeSerie(v);
  console.log(`OpenLume, Suavidade no tempo ${v}…`); const s = await openlumeSerie(v);
  fs.writeFileSync(path.join(OUT, `${a.nome}-openlume-${v}.raw`), s.buf); fs.writeFileSync(path.join(OUT, `${a.nome}-openlume-${v}.json`), JSON.stringify(s.ts));
}
ws.close();
const rel = execFileSync('py', ['-I', path.join(HERE, 'temporal.py'), OUT, a.nome, String(a.valor), String(a.n)]).toString();
console.log(rel);
