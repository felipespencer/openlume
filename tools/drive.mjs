// Controla o programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP): avalia JS na janela de controle
// e tira capturas. Uso:
//   node tools/drive.mjs eval "<expressão js>"      (pode ser async; o valor volta em JSON)
//   node tools/drive.mjs evalfile <arquivo.js>       (idem, lendo a expressão de um arquivo)
//   node tools/drive.mjs shot <arquivo.png> [título]  (captura a janela; padrão: OpenLume)
//   node tools/drive.mjs list                          (lista as janelas abertas)
//   node tools/drive.mjs close-outputs                 (fecha as janelas de saída)
const [, , cmd, a1, a2] = process.argv;
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
if (cmd === 'list') { for (const p of pages) console.log(p.type, '|', p.title, '|', p.url); process.exit(0); }
if (cmd === 'close-outputs') {   // fecha as janelas de saída (mesmo as que a janela de controle já não conhece)
  const v = await (await fetch(base + '/json/version')).json(); const bws = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => bws.onopen = r);
  let n = 0; for (const p of pages) if (p.type === 'page' && p.url.includes('output.html')) { bws.send(JSON.stringify({ id: ++n, method: 'Target.closeTarget', params: { targetId: p.id } })); }
  await new Promise(r => setTimeout(r, 500)); console.log('fechadas', n); bws.close(); process.exit(0);
}
const want = cmd === 'shot' ? (a2 || 'OpenLume') : (process.env.PROJ_TARGET || 'OpenLume');   // PROJ_TARGET: título de outra janela (ex.: 'OpenLume — saída')
const page = pages.find(p => p.type === 'page' && p.title === want) || pages.find(p => p.type === 'page' && p.title.includes(want));
if (!page) { console.error('janela não achada:', want, pages.map(p => p.title)); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
if (cmd === 'eval' || cmd === 'evalfile') {
  const expr = cmd === 'evalfile' ? (await import('node:fs')).readFileSync(a1, 'utf8') : a1;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) console.error('ERRO', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  else console.log(JSON.stringify(r.result.result.value, null, 1));
} else if (cmd === 'drag') {   // arrasto de verdade (pointerdown/move/up pelo CDP): node tools/drive.mjs drag "x0 y0 x1 y1"
  const [x0, y0, x1, y1] = a1.split(/[ ,]+/).map(Number);
  const ev = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, clickCount: 1, ...extra });
  await ev('mouseMoved', x0, y0, { buttons: 0 }); await ev('mousePressed', x0, y0);
  for (let i = 1; i <= 8; i++) await ev('mouseMoved', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8);
  await ev('mouseReleased', x1, y1); console.log('arrastou', x0, y0, '→', x1, y1);
} else if (cmd === 'shot') {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('node:fs'); fs.writeFileSync(a1, Buffer.from(r.result.data, 'base64')); console.log('captura em', a1);
}
ws.close(); process.exit(0);
