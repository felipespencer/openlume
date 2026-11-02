// Varredura só no Resolume: mesmo clipe, um efeito e uma lista de casos ("nome:Controle=v,Controle=v"); grava uma captura por caso.
// Uso: node tools/compare/sondas/varre.mjs "<efeito>" <clipe> <pasta de saída> caso1 caso2 ...
// Caso "sem" = sem efeito nenhum. Valores não citados voltam ao padrão (o efeito é posto de novo a cada caso).
// Só usa a API pública e a saída pelo Spout. Captura duas vezes até vir igual, por causa da marca d'água do modo demo.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from '../resolume.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [efeito, clipe, pasta, ...casos] = process.argv.slice(2);
fs.mkdirSync(pasta, { recursive: true });
const cap = (arq) => execFileSync('py', [path.join(HERE, '..', 'capture.py'), arq, '8'], { stdio: ['ignore', 'pipe', 'inherit'] });
const iguais = (x, y) => execFileSync('py', ['-c', 'import sys,numpy as n;from PIL import Image as I;a=n.asarray(I.open(sys.argv[1]).convert("L")).astype(float);b=n.asarray(I.open(sys.argv[2]).convert("L")).astype(float);print(int(abs(a-b).mean()<0.02))', x, y]).toString().trim() === '1';
const aguarda = (ms) => new Promise(r => setTimeout(r, ms));

await R.abrir(clipe);
await aguarda(800);
for (const caso of casos) {
  const [nome, resto = ''] = caso.split(':');
  if (nome === 'sem') await R.limpar(); else await R.efeito(efeito);
  for (const par of resto.split(',').filter(Boolean)) { const i = par.indexOf('='); await R.valor(par.slice(0, i), par.slice(i + 1)); }
  await aguarda(400);
  const arq = path.join(pasta, nome + '.png');
  let t = 0;
  for (; t < 5; t++) { cap(arq); await aguarda(500); cap(arq + '.b.png'); if (iguais(arq, arq + '.b.png')) break; }
  fs.rmSync(arq + '.b.png', { force: true });
  console.log(nome, resto, t >= 5 ? 'NAO PAROU DE MUDAR' : 'ok');
}
