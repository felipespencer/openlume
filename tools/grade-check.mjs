// Grade de clipes como no Resolume (plano 02-03): cliques de mouse REAIS pelo CDP (Input.dispatchMouseEvent) na casa,
// no nome, no ▶/■ e no nome da coluna, conferindo o estado depois de cada um. Mesma sequência medida no Resolume 7.28
// em 2026-11-03. Pré-requisito: `npx electron . --remote-debugging-port=9333`.
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = pages.find(p => p.type === 'page' && p.title === 'OpenLume');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result.result.value; };
const S = ms => new Promise(r => setTimeout(r, ms));
const click = async (sel) => {
  const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'nearest',inline:'nearest'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2};})()`);
  if (!r) throw new Error('não achei ' + sel);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', buttons: 0, clickCount: 1 });
  await S(350);
};
const D = 'C:/Users/felip/OneDrive/Documentos/projecionista-pc/tools/compare/';
// camada 1 = a de baixo (layers[n-1]); camada 2 logo acima
await ev(`(async()=>{const P=window.projecionista; const n=P.state.layers.length; P.state.layers.forEach((L,i)=>{ for(let c=0;c<8;c++) if(L.clips[c]) P.clearCell(i,c); P.eject(i); });
  await P.putPath(n-1,0,${JSON.stringify(D + 'clips/andando.mp4')},'andando.mp4');
  await P.putPath(n-1,1,${JSON.stringify(D + 'clips/quadA.png')},'quadA.png');
  P.putSource(n-1,2,'lines');
  await P.putPath(n-2,1,${JSON.stringify(D + 'clips/barras.png')},'barras.png');
  P.state.pv=null; P.state.sel=null; P.state.selCol=0; P.state.colOn=undefined; P.render(); await new Promise(r=>setTimeout(r,1500)); })()`);
const st = () => ev(`(()=>{const P=window.projecionista, n=P.state.layers.length; const cell=(l,c)=>document.querySelector('#grid .cell[data-layer="'+l+'"][data-col="'+c+'"]');
  return { on1:P.state.layers[n-1].on, on2:P.state.layers[n-2].on, sel:P.state.sel, pv:P.state.pv, selCol:P.state.selCol, colOn:P.state.colOn,
    prevName:document.getElementById('prevName').textContent,
    icons:[...document.querySelectorAll('#grid .colh .gh.col')].slice(0,5).map(b=>b.textContent).join(''),
    colCls:[...document.querySelectorAll('#grid .colh')].slice(0,5).map(h=>h.className.replace('colh','').trim()||'-'),
    nomes:[0,1,2].map(c=>cell(n-1,c).querySelector('.nm').textContent),
    linesThumb:!!P.state.layers[n-1].clips[2].thumb && P.state.layers[n-1].clips[2].thumb.length>100,
    cls1:[0,1,2,3].map(c=>cell(n-1,c).className.replace('cell','').trim()) };})()`);
const n = await ev('window.projecionista.state.layers.length');
const L1 = n - 1, L2 = n - 2, cell = (l, c, part) => `#grid .cell[data-layer="${l}"][data-col="${c}"]` + (part ? ' .' + part : '');
let falhas = 0; const ok = (nome, cond, info) => { console.log((cond ? 'OK   ' : 'FALHA') + ' ' + nome + (info ? ' — ' + info : '')); if (!cond) falhas++; };

let s = await st();
ok('ícones das colunas: ▶ com clipe, ■ vazia', s.icons === '▶▶▶■■', s.icons);
ok('nome sem extensão', s.nomes.join('|') === 'andando|quadA|Lines', s.nomes.join('|'));
ok('miniatura do gerador Lines não é preta', s.linesThumb);

await click(cell(L1, 1, 'nm')); s = await st();
ok('nome: seleciona e vai só para a Prévia', s.on1 === -1 && s.sel?.l === L1 && s.sel?.c === 1 && s.pv?.c === 1 && /quadA/.test(s.prevName), JSON.stringify({ on1: s.on1, pv: s.pv, prev: s.prevName }));
await click(cell(L1, 0, 'th')); s = await st();
ok('miniatura: põe no ar e seleciona; a Prévia continua', s.on1 === 0 && s.sel?.c === 0 && s.pv?.c === 1 && /quadA/.test(s.prevName), JSON.stringify({ on1: s.on1, sel: s.sel, prev: s.prevName }));
ok('classes: no ar / selecionado / na Prévia', s.cls1[0].includes('on') && s.cls1[0].includes('sel') && s.cls1[1].includes('pv') && !s.cls1[1].includes('on'), s.cls1.join(' , '));
await click(cell(L1, 1, 'nm')); s = await st();
ok('nome de outro clipe com um no ar: o do ar continua', s.on1 === 0 && s.pv?.c === 1, 'on1=' + s.on1);
await click('#grid .colh[data-col="1"] .gh.col'); s = await st();
ok('▶ da coluna 2: dispara a coluna (as duas camadas na 2)', s.on1 === 1 && s.on2 === 1 && s.colOn === 1 && s.selCol === 1 && s.colCls[1].includes('on') && s.colCls[1].includes('sel'), JSON.stringify({ on1: s.on1, on2: s.on2, cls: s.colCls[1] }));
await click(cell(L1, 3, 'th')); s = await st();
ok('casa vazia: a camada apaga e a casa fica selecionada', s.on1 === -1 && s.on2 === 1 && s.sel?.c === 3, JSON.stringify({ on1: s.on1, on2: s.on2, sel: s.sel }));
await click('#grid .colh[data-col="3"] .gh.col'); s = await st();
ok('■ da coluna vazia: todas as camadas apagam', s.on1 === -1 && s.on2 === -1 && s.colOn === 3, JSON.stringify({ on1: s.on1, on2: s.on2 }));
await click('#grid .colh[data-col="2"] .gh.col'); s = await st();
ok('▶ da coluna 3: Lines no ar, camada 2 preta', s.on1 === 2 && s.on2 === -1, JSON.stringify({ on1: s.on1, on2: s.on2 }));
await click('#grid .colh[data-col="2"] .gh.col'); s = await st();
ok('▶ de novo: nada muda', s.on1 === 2 && s.on2 === -1);
await click('#grid .colh[data-col="0"] .cn'); s = await st();
ok('nome da coluna 1: só seleciona', s.selCol === 0 && s.on1 === 2 && s.colCls[0].includes('sel') && !s.colCls[0].includes('on'), JSON.stringify({ selCol: s.selCol, on1: s.on1, cls: s.colCls[0] }));
const wave = await ev(`(async()=>{for(let i=0;i<30;i++){const c=window.projecionista.state.layers[${L1}].clips[0]; if(c.wave) return 'onda'; await new Promise(r=>setTimeout(r,200));} return 'sem onda';})()`);
console.log('info: andando.mp4 (sem trilha de áudio) →', wave);
console.log(falhas ? `${falhas} FALHA(S)` : 'grade-check APROVADO');
ws.close(); process.exit(falhas ? 1 : 0);
