// O mesmo varrimento de br-controles.js, no Resolume: mesmo quadro parado, Background Removal em modo Mask, um controle por vez.
// Uso: node tools/compare/br-resolume.mjs [Low|Medium|High] [quadro.png]
// Grava saida/br-ctl/<qualidade>-<controle>-<valor>.png (descarta captura com a marca d'água do demo) e imprime os números.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from './resolume.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const Q = process.argv[2] || 'Medium';
const CLIP = process.argv[3] || path.join(HERE, 'saida', 'pessoa2', 'f05.png');
const TAG = process.argv[4] || '';
const OUT = path.join(HERE, 'saida', 'br-ctl'); fs.mkdirSync(OUT, { recursive: true });
const S = ms => new Promise(r => setTimeout(r, ms));
const BASE = { 'Refine Edge': 0.5, 'Soft Edge': 0.5, 'Fill Holes': 'true', 'Hard Mask': 'false', 'Filter Specks': 0.1, 'Temporal Smoothness': 0, Mode: 'Mask', Invert: 'false', 'Model Quality': Q };
const SW = { 'Refine Edge': [0, 0.1, 0.25, 0.75, 1], 'Soft Edge': [0, 0.1, 0.25, 0.75, 1], 'Fill Holes': ['false'], 'Hard Mask': ['true'], 'Filter Specks': [0, 0.5, 1] };

await R.abrir(CLIP);
await R.efeito('Background Removal');
const pus = async (o) => { for (const [k, v] of Object.entries(o)) await R.valor(k, v); };
const shot = async (nome) => {
  await S(1500);
  const arq = path.join(OUT, `${Q}${TAG}-${nome}`), cs = [];
  const CAP = `import sys,numpy as n
from PIL import Image as I
a=n.asarray(I.open(sys.argv[1]).convert('L'));print(int((a>242).mean()<0.12))`;   // a marca d'água do demo acinzenta a pessoa: com ela quase nada fica branco (o meio-tom não serve: a qualidade Low tem 22% normalmente)
  const c = arq + '.tmp.png'; let n = 0;
  for (;;) { execFileSync('py', [path.join(HERE, 'capture.py'), c, '5'], { stdio: ['ignore', 'pipe', 'inherit'] }); if (execFileSync('py', ['-c', CAP, c]).toString().trim() === '0') break; if (++n > 40) throw new Error("marca d'água não saiu: " + nome); await S(1000); }
  fs.renameSync(c, arq + '.png');
  return arq + '.png';
};
await pus(BASE); await S(4000);
const lista = [['base', await shot('base')]];
for (const [k, vals] of Object.entries(SW)) for (const v of vals) { await pus(BASE); await R.valor(k, v); lista.push([`${k}=${v}`, await shot(`${k.replace(/ /g, '')}-${v}`)]); }
await pus(BASE);
const STATS = `
import sys,json,numpy as n
from PIL import Image as I
L=json.loads(sys.argv[1]); g=lambda p:n.asarray(I.open(p).convert('RGB'))[:,:,1].astype(float); b=g(L[0][1])
for nome,p in L:
    a=g(p); e=abs(a-b); print(f"{nome:24s} dif {e.mean():7.3f}  mudou% {100*(e>8).mean():7.3f}  area% {a.mean()/2.55:6.2f}  borda% {100*((a>13)&(a<242)).mean():7.3f}")
`;
console.log(Q); console.log(execFileSync('py', ['-c', STATS, JSON.stringify(lista)]).toString());
