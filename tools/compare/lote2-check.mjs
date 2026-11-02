// Lote 2 (Tilt Shift, CRT, Acuarela) no programa aberto com --remote-debugging-port=9333: cada controle deslizante movido com mouse REAL pelo CDP
// tem de chegar ao motor e mudar a imagem (a Acuarela muda sozinha, nela só o valor é conferido); a composição salva e abre com os mesmos valores; qps de cada efeito.
// Uso: node tools/compare/lote2-check.mjs <imagem>
import path from 'node:path';
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const S = ms => new Promise(r => setTimeout(r, ms));
const mouse = (type, x, y, buttons = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: 1 });
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const P = 'window.projecionista', abs = path.resolve(process.argv[2]).replace(/\\/g, '/');
await ev(`(async () => { const p = ${P}, L = p.state.layers[0]; document.querySelectorAll('.dlgOver').forEach(d => d.remove()); if (!L.clips[1] || L.clips[1].path !== ${JSON.stringify(abs)}) await p.putPath(0, 1, ${JSON.stringify(abs)}, ${JSON.stringify(path.basename(abs))}); p.trigger(0, 1); return 1; })()`);
const snap = `(() => { const c = document.createElement('canvas'); c.width = 96; c.height = 54; const x = c.getContext('2d'); x.drawImage(${P}.engine.canvas, 0, 0, 96, 54); return Array.from(x.getImageData(0, 0, 96, 54).data); })()`;
const dif = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const rect = (n) => ev(`(async () => { const e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && x.textContent.trim() === ${JSON.stringify(n)} && x.parentElement.querySelector('.bar'))[0]; if (!e) return null; e.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 80)); const b = e.parentElement.querySelector('.bar'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
let falhas = 0;
for (const [nome, muda] of [['Tilt Shift', true], ['CRT', true], ['Acuarela', false]]) {
  await ev(`(() => { const p = ${P}, L = p.state.layers[0], def = p.EFFECTS.find(e => e.name === ${JSON.stringify(nome)}), params = {}; for (const q of def.params) params[q.key] = q.def; L.fx = [{ id: def.id, params, bypass: false, anim: {} }]; p.state.selLayer = 0; p.panels.tab = 'layer'; p.render(); return 1; })()`);
  await S(500);
  const ctl = await ev(`${P}.EFFECTS.find(e => e.name === ${JSON.stringify(nome)}).params.filter(q => !q.opts && !q.color).map(q => ({ key: q.key, label: q.label, min: q.min, max: q.max, def: q.def }))`);
  const linha = [];
  for (const c of ctl) {
    const r = await rect(c.label); if (!r) { console.log(' ', nome, c.label, 'controle não achado'); falhas++; continue; }
    const alvo = (c.def - c.min) / ((c.max - c.min) || 1) > 0.5 ? 0.15 : 0.85, y = r.y + r.h / 2, x0 = r.x + r.w / 2, x1 = r.x + r.w * alvo;
    const a = await ev(snap);
    await mouse('mouseMoved', x0, y, 0); await mouse('mousePressed', x0, y); for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / 6, y); await S(10); } await mouse('mouseReleased', x1, y, 0);
    await S(260);
    const got = await ev(`${P}.state.layers[0].fx[0].params[${JSON.stringify(c.key)}]`), b = await ev(snap), d = dif(a, b);
    const okValor = Math.abs((got - c.min) / ((c.max - c.min) || 1) - alvo) < (c.max - c.min === 1 && c.key === 'reset' ? 0.2 : 0.08), okImg = !muda || d > 0.02;
    if (!okValor) falhas++;
    linha.push(`${c.label}=${+(+got).toFixed(2)} Δ${d.toFixed(2)}${okValor ? '' : ' VALOR!'}${okImg ? '' : ' (imagem igual)'}`);
    await ev(`(() => { ${P}.state.layers[0].fx[0].params[${JSON.stringify(c.key)}] = ${c.def}; return 1; })()`); await S(120);
  }
  console.log(nome + ':', linha.join(' | '));
  const f0 = await ev(`${P}.frames()`), t0 = Date.now(); await S(3000); const qps = (await ev(`${P}.frames()`) - f0) / ((Date.now() - t0) / 1000);
  console.log('  qps ' + qps.toFixed(1));
}
// salvar e abrir: valores fora do padrão atravessam o JSON da composição
const salvo = await ev(`(async () => { const { serializeComposition } = await import('./composition.js'); const p = ${P}, L = p.state.layers[0]; const mk = (n, v) => { const def = p.EFFECTS.find(e => e.name === n), params = {}; for (const q of def.params) params[q.key] = q.def; Object.assign(params, v); return { id: def.id, params, bypass: false, anim: {} }; }; L.fx = [mk('Tilt Shift', { blur: 0.33 }), mk('CRT', { cols: 123 }), mk('Acuarela', { strength: 0.77 })]; p.render(); await new Promise(r => setTimeout(r, 400)); const j = JSON.parse(serializeComposition(p.state, p.laser, p.state.cols || 9)); const achou = JSON.stringify(j); return { tilt: achou.includes('"blur":0.33'), crt: achou.includes('"cols":123'), acu: achou.includes('"strength":0.77') }; })()`).catch(e => ({ erro: e.message }));
console.log('salvar:', JSON.stringify(salvo)); if (!salvo.tilt || !salvo.crt || !salvo.acu) falhas++;
await ev(`(() => { ${P}.state.layers[0].fx = []; ${P}.render(); return 1; })()`);
console.log(falhas ? 'FALHAS: ' + falhas : 'APROVADO'); ws.close(); process.exit(0);
