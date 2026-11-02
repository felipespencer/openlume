// Webcam virtual, do jeito que a pessoa usa: clique REAL em Saída › Webcam virtual pelo CDP, e a imagem lida de volta pela câmera com getUserMedia.
// Confere cor, orientação, proporção, qps, desligar e religar, câmera ocupada e OBS ausente (este só com PROJ_WEBCAM_SEM_OBS na abertura: --sem-obs).
// Programa aberto com --remote-debugging-port=9333 (ou PROJ_CDP). Uso: node tools/webcam-check.mjs [--sem-obs] [--basico]
const base = 'http://127.0.0.1:' + (process.env.PROJ_CDP || 9333), semObs = process.argv.includes('--sem-obs'), basico = process.argv.includes('--basico');
const pages = await (await fetch(base + '/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const S = ms => new Promise(r => setTimeout(r, ms));
let n = 0, falhas = 0; const check = (nome, ok, extra = '') => { n++; if (!ok) falhas++; console.log((ok ? 'OK    ' : 'FALHA ') + nome + (extra ? '  — ' + extra : '')); };
await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const P = 'window.projecionista';
const click = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 }); await S(200); };
const rectTexto = (t, sel) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.textContent.trim().startsWith(${JSON.stringify(t)}) && x.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
// abre Saída pelo mouse e devolve o item (e a marca dele); o primeiro clique numa janela só a acorda
{ const t = await ev(`(() => { const r = document.querySelector('#menubar').getBoundingClientRect(); return { x: r.x + 40, y: r.y + r.height / 2 }; })()`); await click(t.x, t.y); await ev(`${P}.menubar.close(); 1`); await S(150); }
const menu = async () => {
  await ev(`${P}.menubar.close(); 1`); await S(100);
  const m = await rectTexto('Saída', '#menubar *'); if (!m) throw new Error('menu Saída não achado'); await click(m.x, m.y);
  const it = await rectTexto('Webcam virtual', '.menuLayer .menu .mi .lb'); if (!it) throw new Error('item Webcam virtual não achado');
  const marcado = await ev(`(() => { const e = [...document.querySelectorAll('.menuLayer .menu .mi .lb')].find(x => x.textContent.startsWith('Webcam virtual')).closest('.mi'); return e.className + '|' + e.textContent; })()`);
  return { it, marcado };
};
for (let i = 0; i < 5 && await ev(`document.querySelectorAll('.dlgOver').length`) > 0; i++) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await S(200); }
if (await ev(`${P}.webcam.on`)) await ev(`${P}.webcam.desligar()`);

if (process.argv.includes('--ocupada')) {   // outro programa já escreve na câmera (rodar um escritor antes)
  const { it } = await menu(); await click(it.x, it.y); for (let i = 0; i < 60 && !await ev(`document.querySelectorAll('.dlgOver').length`); i++) await S(100);
  check('câmera ocupada: aviso claro e o item desligado', await ev(`[...document.querySelectorAll('.dlgOver *')].some(x => x.textContent.includes('já está em uso'))`) && !await ev(`${P}.webcam.on`));
  await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove())`);
  console.log(`
${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(falhas ? 1 : 0);
}
if (semObs) {
  const { it } = await menu(); await click(it.x, it.y); for (let i = 0; i < 60 && !await ev(`document.querySelectorAll('.dlgOver').length`); i++) await S(100);
  console.log('      ' + await ev(`(document.querySelector('.dlgOver') || {}).textContent || 'sem diálogo'`));
  check('sem OBS: aparece o aviso', await ev(`[...document.querySelectorAll('.dlgOver *')].some(x => x.textContent.includes('não está instalado'))`));
  check('sem OBS: botão Baixar o OBS', await ev(`[...document.querySelectorAll('.dlgOver button')].some(x => x.textContent === 'Baixar o OBS')`));
  check('sem OBS: o item fica desligado e o programa segue', !await ev(`${P}.webcam.on`) && await ev(`(async () => { const a = ${P}.frames(); await new Promise(r => setTimeout(r, 500)); return ${P}.frames() > a; })()`));
  console.log(`\n${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`); ws.close(); process.exit(falhas ? 1 : 0);
}

// imagem conhecida: faixas verticais de cor + metade de cima com um quadrado branco no canto superior esquerdo (orientação) e uma faixa que anda (tempo)
const padrao = `(async () => { const p = ${P}, L = p.state.layers[0]; const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d');
  const cor = ['#c02020', '#20c020', '#2020c0', '#c0c020', '#20c0c0', '#c020c0', '#808080', '#ffffff']; cor.forEach((k, i) => { x.fillStyle = k; x.fillRect(i * 240, 0, 240, 1080); });
  x.fillStyle = '#000'; x.fillRect(0, 0, 200, 200); x.fillStyle = '#fff'; x.fillRect(40, 40, 120, 120);
  const b = await new Promise(r => c.toBlob(r, 'image/png')); const f = new File([b], 'cam-prova.png', { type: 'image/png' }); const tmp = URL.createObjectURL(f); window.__camUrl = tmp; return tmp; })()`;
await ev(padrao);
await ev(`(async () => { const p = ${P}; document.querySelectorAll('.dlgOver').forEach(d => d.remove()); for (const L of p.state.layers) { if (L.on >= 0) p.eject(p.state.layers.indexOf(L)); L.fx = []; } const path = ${JSON.stringify(process.argv.find(a => a.endsWith('.png')) || '')}; if (path) { await p.putPath(0, 1, path, 'prova.png'); p.trigger(0, 1); } return 1; })()`);

const qps0 = await ev(`(async () => { const a = ${P}.frames(), t = performance.now(); await new Promise(r => setTimeout(r, 2500)); return (${P}.frames() - a) / ((performance.now() - t) / 1000); })()`);
const m1 = await menu(); await click(m1.it.x, m1.it.y); for (let i = 0; i < 40 && !await ev(`${P}.webcam.on`); i++) await S(100);
console.log('      ligou em até ' + (await ev(`${P}.webcam.on`) ? 'menos de 4 s' : 'mais de 4 s')); await S(800);
check('clique real em Saída › Webcam virtual liga', await ev(`${P}.webcam.on`) === true);
const leitor = `(async () => { const l = await navigator.mediaDevices.enumerateDevices(); let cams = l.filter(d => d.kind === 'videoinput'); if (!cams.some(c => c.label)) { const s0 = await navigator.mediaDevices.getUserMedia({ video: true }); s0.getTracks().forEach(t => t.stop()); cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } const obs = cams.find(c => /OBS/i.test(c.label)); if (!obs) return { erro: 'sem câmera', cams: cams.map(c => c.label) };
  const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: obs.deviceId }, width: 1920, height: 1080, frameRate: 30 } }); const v = document.createElement('video'); v.srcObject = s; v.muted = true; await v.play(); await new Promise(r => setTimeout(r, 1500));
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(v, 0, 0, 1920, 1080);
  const at = (X, Y, q = 8) => { const d = x.getImageData(X - q, Y - q, q * 2, q * 2).data; const r = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) { r[0] += d[i]; r[1] += d[i + 1]; r[2] += d[i + 2]; } return r.map(k => Math.round(k / (d.length / 4))); };
  const faixas = []; for (let i = 0; i < 8; i++) faixas.push(at(i * 240 + 120, 700));
  const res = { w: v.videoWidth, h: v.videoHeight, faixas, canto: at(100, 100), fora: at(20, 20), base: at(100, 1000) };
  let n = 0; const fim = performance.now() + 3000; await new Promise(ok => { const f = () => { n++; if (performance.now() < fim) v.requestVideoFrameCallback(f); else ok(); }; v.requestVideoFrameCallback(f); }); res.qps = n / 3;
  s.getTracks().forEach(t => t.stop()); return res; })()`;
const motor = `(() => { const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(${P}.engine.canvas, 0, 0, 1920, 1080); const at = (X, Y, q = 8) => { const d = x.getImageData(X - q, Y - q, q * 2, q * 2).data; const r = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) { r[0] += d[i]; r[1] += d[i + 1]; r[2] += d[i + 2]; } return r.map(k => Math.round(k / (d.length / 4))); }; const f = []; for (let i = 0; i < 8; i++) f.push(at(i * 240 + 120, 700)); return { faixas: f, canto: at(100, 100), fora: at(20, 20), base: at(100, 1000) }; })()`;
const lido = await ev(leitor), ref = await ev(motor);
if (lido.erro) { check('câmera aparece', false, JSON.stringify(lido)); }
else {
  check('"OBS Virtual Camera" entrega 1920×1080', lido.w === 1920 && lido.h === 1080, `${lido.w}×${lido.h}`);
  const difs = lido.faixas.map((f, i) => Math.max(...f.map((k, c) => Math.abs(k - ref.faixas[i][c]))));
  console.log('      motor', JSON.stringify(ref.faixas)); console.log('      câmera', JSON.stringify(lido.faixas));
  check('cada faixa até 6/255 por canal da saída do motor', Math.max(...difs) <= 6, 'diferenças ' + difs.join(' '));
  check('de pé e sem espelhar: canto superior esquerdo como no motor', Math.max(...lido.canto.map((k, i) => Math.abs(k - ref.canto[i]))) <= 8 && Math.max(...lido.base.map((k, i) => Math.abs(k - ref.base[i]))) <= 8, `canto ${lido.canto} × ${ref.canto}; base ${lido.base} × ${ref.base}`);
  check('a câmera recebe ao menos 25 quadros/s', lido.qps >= 25, lido.qps.toFixed(1));
}
const est = await ev(`({ e: ${P}.webcam.enviados, p: ${P}.webcam.pulados })`);
const qps1 = await ev(`(async () => { const a = ${P}.frames(), t = performance.now(); await new Promise(r => setTimeout(r, 2500)); return (${P}.frames() - a) / ((performance.now() - t) / 1000); })()`);
check('a composição não cai: ao menos 27 qps, e não menos que 90% de antes', qps1 >= Math.min(27, qps0 * 0.9), `antes ${qps0.toFixed(1)}, com webcam ${qps1.toFixed(1)}; enviados ${est.e}, pulados ${est.p}`);
if (!basico) {
  // fora de 16:9: inteira, com barras
  await ev(`(() => { const p = ${P}; p.applySettings({ ...p.state.settings, w: 1080, h: 1080 }); return 1; })()`); await S(800);
  const q = await ev(leitor);
  const fb = (c) => Math.max(...c) <= 12;
  check('composição quadrada: barras pretas dos lados, imagem no meio', fb(q.faixas[0]) && fb(q.faixas[7]) && !fb(q.faixas[3]) && q.w === 1920, `esq ${q.faixas[0]} meio ${q.faixas[3]} dir ${q.faixas[7]}`);
  await ev(`(() => { const p = ${P}; p.applySettings({ ...p.state.settings, w: 1920, h: 1080 }); return 1; })()`); await S(500);
  // desligar, ocupada e religar
  const m2 = await menu(); check('o menu mostra o item ligado', /✓|✔|check/.test(m2.marcado), m2.marcado.slice(0, 80)); await click(m2.it.x, m2.it.y); await S(800);
  check('desligar pelo menu desliga', await ev(`${P}.webcam.on`) === false);
  const m3 = await menu(); await click(m3.it.x, m3.it.y); await S(800);
  check('religar na mesma sessão funciona', await ev(`${P}.webcam.on`) === true && (await ev(`(async () => { const a = ${P}.webcam.enviados; await new Promise(r => setTimeout(r, 800)); return ${P}.webcam.enviados > a; })()`)));
  await ev(`${P}.webcam.desligar()`);
}
await ev(`document.querySelectorAll('.dlgOver').forEach(d => d.remove())`);
console.log(`\n${n} verificações, ${falhas} falha(s) — ${falhas ? 'REPROVADO' : 'APROVADO'}`);
ws.close(); process.exit(falhas ? 1 : 0);
