// Mexe nos controles do Background Removal na aba Camada com mouse REAL (Input.dispatchMouseEvent pelo CDP) e confere que o valor
// chega ao motor e a máscara muda. Pré-requisito: efeito na camada 5, modo Máscara, aba Camada aberta, window.__snap() definido.
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const S = ms => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y, buttons = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: 1 });
const rect = (n) => ev(`(async()=>{const e=[...document.querySelectorAll('*')].filter(x=>x.children.length===0&&x.textContent.trim()===${JSON.stringify(n)})[0];if(!e)return null;e.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,80));const b=e.parentElement.querySelector('.bar');if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()`);
const CTL = [['Refinar borda', 'refine', [0, 0.25, 0.5, 0.75, 1]], ['Borda suave', 'soft', [0, 0.5, 1]], ['Máscara dura', 'hard', [1, 0]], ['Fechar buracos', 'fill', [0, 1]], ['Filtrar pontinhos', 'specks', [0, 0.1, 1]]];
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await ev(`(async()=>{const P=window.projecionista;Object.assign(P.state.layers[0].fx[0].params,{refine:.5,soft:.5,fill:1,hard:0,specks:.1,tsmooth:0,mode:1,invert:0,quality:1});P.render();await new Promise(r=>setTimeout(r,1500));})()`);
const base = await ev('window.__snap()'); console.log('padrão, área %', base);
let falhas = 0;
for (const [n, k, vals] of CTL) {
  const linha = [];
  for (const v of vals) {
    const r = await rect(n); if (!r) { console.log(n, 'controle não achado'); falhas++; break; }
    const x = r.x + r.w * v, y = r.y + r.h / 2;
    await mouse('mouseMoved', r.x + r.w / 2, y, 0); await mouse('mousePressed', r.x + r.w / 2, y); for (let i = 1; i <= 6; i++) await mouse('mouseMoved', r.x + r.w / 2 + (x - r.x - r.w / 2) * i / 6, y); await mouse('mouseReleased', x, y);
    await S(1200);
    const got = await ev(`window.projecionista.state.layers[0].fx[0].params[${JSON.stringify(k)}]`), area = await ev('window.__snap()');
    linha.push(`${v}→${typeof got === 'number' ? +got.toFixed(2) : got}: ${area}`);
    if (Math.abs(got - v) > 0.06) falhas++;
  }
  console.log(n.padEnd(20), linha.join('   '));
  await ev(`(async()=>{const P=window.projecionista;Object.assign(P.state.layers[0].fx[0].params,{refine:.5,soft:.5,fill:1,hard:0,specks:.1});await new Promise(r=>setTimeout(r,600));})()`);
}
console.log(falhas ? 'FALHAS: ' + falhas : 'valores do mouse chegaram ao motor em todos os controles');
ws.close(); process.exit(0);
