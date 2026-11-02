// Mede a limpeza da máscara (app/seg-post.js) fora do programa, num worker de verdade, com máscara 512² sintética de pessoa.
// Uso: node tools/compare/br-limpeza-bench.mjs
import { Worker } from 'node:worker_threads';
import path from 'node:path';
const w = new Worker(path.resolve('app/seg-post.js'));
const mk = (W, H, t) => { const p = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (x - W / 2 - t) / (W * 0.28), b = (y - H * 0.6) / (H * 0.45); const d = Math.hypot(a, b) + 0.015 * Math.sin(x * 0.3) * Math.cos(y * 0.2); p[y * W + x] = Math.max(0, Math.min(1, (1 - d) * 40)); } return p; };
const roda = (W, H, params, n = 40) => new Promise(res => { let i = 0, soma = 0; const pede = () => { const prob = mk(W, H, i % 9); w.postMessage({ id: i, fx: 1, prob, W, H, params: { aspect: 16 / 9, ...params } }, [prob.buffer]); }; w.on('message', function f(m) { if (i > 5) soma += m.ms; if (++i >= n) { w.off('message', f); res(+(soma / (n - 6)).toFixed(1)); } else pede(); }); pede(); });
const P = { fill: true, specks: 0.1, hard: false };
for (const [nome, W, H, x] of [['Média padrão', 512, 512, { soft: .5, refine: .5, tsmooth: .1 }], ['Média máximo', 512, 512, { soft: 1, refine: 1, tsmooth: .1 }], ['Média Webcam', 512, 512, { soft: .8, refine: .5, tsmooth: .95, fill: false, specks: .6 }], ['Alta padrão', 640, 640, { soft: .5, refine: .5, tsmooth: .1 }], ['Alta máximo', 640, 640, { soft: 1, refine: 1, tsmooth: .1 }], ['Baixa padrão', 192, 192, { soft: .5, refine: .5, tsmooth: .1 }]])
  console.log(nome.padEnd(14), await roda(W, H, { ...P, ...x }), 'ms');
await w.terminate();
