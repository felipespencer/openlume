// Acuarela nunca para de mudar: comparar por estatística. Em cada caso: põe o efeito do zero nos dois programas, espera, captura dois quadros
// com 0,5 s entre eles e mede: distância até a imagem original (D), mudança no tempo (T) e nitidez restante (N, 1 = igual à original).
// Uso: node tools/compare/sondas/acu.mjs <imagem> "nome:Controle=v,Controle=v" ...   [ACU_SO=O só OpenLume]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../resolume.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [img, ...casos] = process.argv.slice(2);
const so = process.env.ACU_SO || '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'acu-'));
const S = ms => new Promise(r => setTimeout(r, ms));
const cap = (arq) => execFileSync('py', [path.join(HERE, '..', 'capture.py'), arq, '4'], { stdio: ['ignore', 'pipe', 'ignore'] });
async function ol(expr) {
  const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
  const page = pages.find(p => p.type === 'page' && p.title.includes('OpenLume') && !p.url.includes('output.html'));
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  const res = await new Promise(r => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) r(d); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
  ws.close(); if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text);
  return res.result.result.value;
}
const py = `
import sys,json,numpy as n
from PIL import Image as I
L=lambda p:n.asarray(I.open(p).convert('RGB').resize((960,540))).astype(float)
s,a,b=L(sys.argv[1]),L(sys.argv[2]),L(sys.argv[3])
g=lambda x:(abs(n.diff(x.mean(axis=2),axis=0)).mean()+abs(n.diff(x.mean(axis=2),axis=1)).mean())
print(json.dumps({'D':round(float(abs(a-s).mean()),1),'T':round(float(abs(a-b).mean()),2),'N':round(float(g(a)/g(s)),3),'media':round(float(a.mean()),1)}))`;
const med = (a, b) => JSON.parse(execFileSync('py', ['-c', py, img, a, b]).toString());
const abs = path.resolve(img).replace(/\\/g, '/');
if (so !== 'O') { await R.abrir(img); await S(600); }
await ol(`(async () => { const P = window.projecionista; if (!P.state.layers[0].clips[1] || P.state.layers[0].clips[1].path !== ${JSON.stringify(abs)}) await P.putPath(0, 1, ${JSON.stringify(abs)}, ${JSON.stringify(path.basename(abs))}); P.trigger(0, 1); return 1; })()`);
for (const caso of casos) {
  const [nome, resto = ''] = caso.split(':');
  const vals = Object.fromEntries(resto.split(',').filter(Boolean).map(s => s.split('=')));
  const espera = +(process.env.ACU_ESPERA || 6000);
  let r = null;
  if (so !== 'O') {
    await R.limpar(); await S(300); await R.efeito('Acuarela');
    for (const [k, v] of Object.entries(vals)) await R.valor(k, v);
    await S(espera);
    const a = path.join(tmp, 'ra.png'), b = path.join(tmp, 'rb.png'); cap(a); await S(500); cap(b); r = med(a, b);
    if (process.env.ACU_SALVA) fs.copyFileSync(a, path.join(process.env.ACU_SALVA, nome + '.resolume.png'));
  }
  const a = path.join(tmp, 'oa.png'), b = path.join(tmp, 'ob.png');
  const grava = async (arq) => { const u = await ol(`window.projecionista.engine.canvas.toDataURL('image/png')`); fs.writeFileSync(arq, Buffer.from(u.split(',')[1], 'base64')); };
  await ol(`(() => { const P = window.projecionista, L = P.state.layers[0], def = P.EFFECTS.find(e => e.name === 'Acuarela'), params = {}; for (const p of def.params) params[p.key] = p.def; const v = ${JSON.stringify(vals)}; for (const [k, x] of Object.entries(v)) if (def.rparams[k]) params[def.rparams[k]] = +x; L.fx = []; P.render(); L.fx = [{ id: def.id, params, bypass: false, anim: {} }]; return 1; })()`);
  await S(espera); await grava(a); await S(500); await grava(b);
  const o = med(a, b);
  if (process.env.ACU_SALVA) fs.copyFileSync(a, path.join(process.env.ACU_SALVA, nome + '.openlume.png'));
  console.log(nome.padEnd(10), 'Resolume', JSON.stringify(r), 'OpenLume', JSON.stringify(o));
}
