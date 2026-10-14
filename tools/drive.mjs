// Controla o programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP): avalia JS na janela de controle
// e tira capturas. Uso:
//   node tools/drive.mjs eval "<expressão js>"      (pode ser async; o valor volta em JSON)
//   node tools/drive.mjs evalfile <arquivo.js>       (idem, lendo a expressão de um arquivo)
//   node tools/drive.mjs shot <arquivo.png> [título]  (captura a janela; padrão: Projecionista)
//   node tools/drive.mjs list                          (lista as janelas abertas)
const [, , cmd, a1, a2] = process.argv;
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333);
const pages = await (await fetch(base + '/json')).json();
if (cmd === 'list') { for (const p of pages) console.log(p.type, '|', p.title, '|', p.url); process.exit(0); }
const want = cmd === 'shot' ? (a2 || 'Projecionista') : 'Projecionista';
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
} else if (cmd === 'shot') {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('node:fs'); fs.writeFileSync(a1, Buffer.from(r.result.data, 'base64')); console.log('captura em', a1);
}
ws.close(); process.exit(0);
