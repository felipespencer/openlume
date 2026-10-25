// Mede no Resolume como o Threshold trata a cor e a suavidade (só o Resolume; resultado em JSON).
// Cor: limiar 0 deixa a tela inteira com a Cor 1; lê o pixel do meio para cada cinza mandado.
// Suavidade: na rampa do clipe rampa.mp4 (linha 100: valor = x/1919), acha onde a saída passa de 10 %, 50 % e 90 %.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from './resolume.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(HERE, 'saida', 'medir.png');
const ler = (code) => JSON.parse(execFileSync('py', ['-c', code, tmp]).toString());
const cap = () => execFileSync('py', [path.join(HERE, 'capture.py'), tmp, '8'], { stdio: ['ignore', 'pipe', 'inherit'] });

await R.abrir(path.join(HERE, 'clips', 'rampa.mp4'));
await R.efeito('Threshold');
const out = { cor: [], suave: [] };
await R.valor('Threshold', 0);
for (const v of [16, 32, 64, 96, 128, 160, 192, 224, 255]) {
  const h = v.toString(16).padStart(2, '0');
  await R.valor('Color 1', `#${h}${h}${h}ff`); await new Promise(r => setTimeout(r, 300)); cap();
  out.cor.push([v, ...ler('import sys,numpy as n;from PIL import Image as I;a=n.asarray(I.open(sys.argv[1]).convert("RGB"));print(list(map(int,a[540,960])))')]);
}
await R.valor('Color 1', '#ffffffff');
for (const [th, sm] of [[0.5, 0.2], [0.5, 0.4], [0.5, 0.8], [0.3, 0.4], [0.7, 0.4]]) {
  await R.valor('Threshold', th); await R.valor('Smoothness', sm); await new Promise(r => setTimeout(r, 300)); cap();
  const p = ler('import sys,numpy as n;from PIL import Image as I;r=n.asarray(I.open(sys.argv[1]).convert("L")).astype(float)[100];x=n.arange(1920)/1919\ndef at(v):\n i=int(n.argmax(r>=v*255)); return round(float(x[i]),3)\nprint([at(.1),at(.5),at(.9)])');
  out.suave.push({ th, sm, a10: p[0], a50: p[1], a90: p[2] });
}
console.log(JSON.stringify(out));
