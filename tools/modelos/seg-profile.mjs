// Perfil do modelo de recorte no onnxruntime-node com DirectML: tempo por rodada e quais nós caem na CPU.
// Uso: node tools/seg-profile.mjs [arquivo.onnx] [lado] [provider]   (padrão: MODNet-HRNet, 480, dml)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ort = require('onnxruntime-node');
const file = process.argv[2] || path.join('app', 'vendor', 'modnet-hrnet', 'modnet-hrnet_w18.onnx');
const n = +(process.argv[3] || 480), ep = process.argv[4] || 'dml';
const NOPROF = !!process.env.NOPROF;   // NOPROF=1: só o tempo, sem o perfil (o perfil deixa a rodada mais lenta)
const s = await ort.InferenceSession.create(file, { executionProviders: [ep], graphOptimizationLevel: 'all', ...(NOPROF ? {} : { enableProfiling: true, profileFilePrefix: path.join(process.env.TEMP || '.', 'seg-prof') }) });
const x = new ort.Tensor('float32', Float32Array.from({ length: 3 * n * n }, () => Math.random() * 2 - 1), [1, 3, n, n]);
const feeds = { [s.inputNames[0]]: x };
await s.run(feeds);   // compila
const times = [];
for (let i = 0; i < 10; i++) { const t0 = performance.now(); await s.run(feeds); times.push(performance.now() - t0); }
times.sort((a, b) => a - b);
console.log(`${path.basename(file)} ${n}² ${ep}: mediana ${times[5].toFixed(1)} ms, mín ${times[0].toFixed(1)}, máx ${times[9].toFixed(1)}`);
if (NOPROF) { await s.release(); process.exit(0); }
// o binding do Node não devolve o caminho do perfil: o arquivo seg-prof_*.json aparece no TEMP quando a sessão fecha
let prof = null; try { prof = s.endProfiling(); } catch { }
await s.release();
if (!prof) { const dir = process.env.TEMP || '.'; const c = fs.readdirSync(dir).filter(f => f.startsWith('seg-prof') && f.endsWith('.json')).map(f => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs); prof = c[0]; }
if (!prof) { console.log('sem arquivo de perfil'); process.exit(0); }
const ev = JSON.parse(fs.readFileSync(prof, 'utf8'));
const byProv = {}, byOp = {};
for (const e of ev) {
  if (e.cat !== 'Node' || !e.args || !e.args.provider) continue;
  const p = e.args.provider, op = e.args.op_name; const d = e.dur / 1000;
  byProv[p] = byProv[p] || { n: 0, ms: 0 }; byProv[p].n++; byProv[p].ms += d;
  const k = p.replace('ExecutionProvider', '') + ':' + op; byOp[k] = byOp[k] || { n: 0, ms: 0 }; byOp[k].n++; byOp[k].ms += d;
}
console.log('por provider (11 rodadas):', JSON.stringify(Object.fromEntries(Object.entries(byProv).map(([k, v]) => [k, { nos: v.n, ms: +v.ms.toFixed(1) }]))));
const top = Object.entries(byOp).sort((a, b) => b[1].ms - a[1].ms).slice(0, 12);
for (const [k, v] of top) console.log(`  ${k.padEnd(28)} ${String(v.n).padStart(5)} nós  ${v.ms.toFixed(1)} ms`);
const cpu = Object.entries(byOp).filter(([k]) => k.startsWith('CPU:'));
if (cpu.length) console.log('na CPU:', cpu.map(([k, v]) => k.slice(4) + '×' + v.n).join(', '));
fs.unlinkSync(prof);
