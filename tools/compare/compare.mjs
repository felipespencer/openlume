// Bancada lado a lado: o mesmo clipe e o mesmo efeito no Resolume (API REST) e no OpenLume (CDP, porta 9333),
// captura das duas saídas e diferença por pixel.
// Uso: node tools/compare/compare.mjs "<efeito do Resolume>" [--clip arquivo] [--r "Controle=valor"]... [--o "chave=valor"]... [--nome rotulo] [--espera quadros]
//   --r muda um controle no Resolume (nome como na ficha); --o muda o parâmetro do efeito no OpenLume (chave do effects*.js).
//   Sem --o, usa o mapa rparams do efeito do OpenLume (controle do Resolume -> chave) para levar os mesmos valores.
// Precisa: Resolume com servidor web e a janela "Display" (Saída avançada, Device: Windowed) visível;
//          OpenLume aberto com `npx electron . --remote-debugging-port=9333`.
// Sai em tools/compare/saida/<rotulo>.png e imprime o número. Não usa código do Resolume.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as R from './resolume.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'saida');

function args(argv) {
  const a = { nome: null, clip: path.join(HERE, 'clips', 'rampa.mp4'), r: [], o: [], espera: 15 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--clip') a.clip = argv[++i]; else if (k === '--r') a.r.push(argv[++i]); else if (k === '--o') a.o.push(argv[++i]);
    else if (k === '--nome') a.nome = argv[++i]; else if (k === '--espera') a.espera = +argv[++i]; else a.efeito = k;
  }
  return a;
}
const kv = s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; };

// avalia JS na janela de controle do OpenLume
async function olEval(expr) {
  const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
  const page = pages.find(p => p.type === 'page' && p.title.includes('OpenLume') && !p.url.includes('output.html'));
  if (!page) throw new Error('OpenLume não está aberto com --remote-debugging-port=9333');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  const res = await new Promise(r => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) r(d); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
  ws.close();
  if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text);
  return res.result.result.value;
}

// no OpenLume: clipe na camada 1, casa 2; só esse efeito na camada; espera N quadros; devolve o PNG do motor
async function openlume(a, valoresR) {
  const clip = path.resolve(a.clip).replace(/\\/g, '/');
  const expr = `(async () => {
    const P = window.projecionista, L = P.state.layers[0], S = ms => new Promise(r => setTimeout(r, ms));
    const def = P.EFFECTS.find(e => (e.rname || e.name) === ${JSON.stringify(a.efeito)});
    if (!def) throw new Error('o OpenLume não tem o efeito ' + ${JSON.stringify(a.efeito)});
    const c = L.clips[1];
    if (!c || c.path !== ${JSON.stringify(clip)}) { await P.putPath(0, 1, ${JSON.stringify(clip)}, ${JSON.stringify(path.basename(clip))}); }
    P.trigger(0, 1);
    const params = {}; for (const p of def.params) params[p.key] = p.def;
    const rmap = def.rparams || {}, vr = ${JSON.stringify(valoresR)}, vo = ${JSON.stringify(Object.fromEntries(a.o.map(kv)))};
    // traduz o valor do Resolume: lista pelo nome da opção, cor "#rrggbbaa" inteira se o controle tem alfa (senão "#rrggbb"), o resto é número
    for (const [rn, v] of Object.entries(vr)) if (rmap[rn]) {
      const k = rmap[rn], p = def.params.find(q => q.key === k);
      params[k] = p.opts ? Math.max(0, (p.ropts || p.opts).indexOf(v)) : p.color ? String(v).slice(0, p.alpha ? 9 : 7) : +v;
    }
    for (const [k, v] of Object.entries(vo)) params[k] = isNaN(+v) ? v : +v;
    L.fx = [{ id: def.id, params, bypass: false, anim: {} }];
    P.render(); const f0 = P.frames(); while (P.frames() - f0 < ${a.espera}) await S(16);
    return { png: P.engine.canvas.toDataURL('image/png'), params, w: P.engine.canvas.width, h: P.engine.canvas.height };
  })()`;
  return olEval(expr);
}

const a = args(process.argv.slice(2));
if (!a.efeito) { console.log('uso: node tools/compare/compare.mjs "<efeito>" [--clip arq] [--r "Controle=v"] [--o "chave=v"] [--nome rótulo]'); process.exit(1); }
const rotulo = a.nome || a.efeito.replace(/\W+/g, '-').toLowerCase();
fs.mkdirSync(OUT, { recursive: true });

// Resolume
await R.abrir(a.clip);
await R.efeito(a.efeito);
const valoresR = Object.fromEntries(a.r.map(kv));
for (const [k, v] of Object.entries(valoresR)) await R.valor(k, v);
const rPng = path.join(OUT, rotulo + '.resolume.png');
// A marca d'água do Resolume (modo demo) passa pela saída de vez em quando: captura duas vezes e só aceita quando as duas
// são iguais (o clipe de teste é parado ou está num quadro fixo); senão tenta de novo
const cap = (arq) => execFileSync('py', [path.join(HERE, 'capture.py'), arq, String(a.espera)], { stdio: ['ignore', 'pipe', 'inherit'] });
const iguais = (x, y) => execFileSync('py', ['-c', 'import sys,numpy as n;from PIL import Image as I;a=n.asarray(I.open(sys.argv[1]).convert("L")).astype(float);b=n.asarray(I.open(sys.argv[2]).convert("L")).astype(float);print(int(abs(a-b).mean()<0.5))', x, y]).toString().trim() === '1';
for (let tent = 1; ; tent++) {
  cap(rPng); await new Promise(r => setTimeout(r, 700)); cap(rPng + '.b.png');
  if (iguais(rPng, rPng + '.b.png')) break;
  if (tent >= 5) { console.error('a captura do Resolume não parou de mudar (marca d\'água ou clipe andando)'); break; }
}
fs.rmSync(rPng + '.b.png', { force: true });

// OpenLume
const o = await openlume(a, valoresR);
const oPng = path.join(OUT, rotulo + '.openlume.png');
fs.writeFileSync(oPng, Buffer.from(o.png.split(',')[1], 'base64'));

// diferença
const lado = path.join(OUT, rotulo + '.png');
const num = JSON.parse(execFileSync('py', [path.join(HERE, 'diff.py'), rPng, oPng, lado]).toString());
console.log(JSON.stringify({ efeito: a.efeito, rotulo, resolume: valoresR, openlume: o.params, ...num, imagem: path.relative(ROOT, lado) }));
