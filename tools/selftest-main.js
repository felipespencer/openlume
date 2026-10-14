// Teste automático dentro do próprio programa. Ligado por PROJ_TEST=<pasta com va.mp4 e vb.mp4>.
// Carrega dois vídeos de verdade (um deitado, um em pé) e uma imagem, dispara, lê pixels da
// composição e das telas, confere a janela de saída e grava capturas na mesma pasta.
//   va.mp4: ffmpeg -f lavfi -i testsrc=size=320x180:rate=25:duration=3 -pix_fmt yuv420p va.mp4
//   vb.mp4: ffmpeg -f lavfi -i testsrc2=size=180x320:rate=25:duration=3 -pix_fmt yuv420p vb.mp4
const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow } = require('electron');

// LaserCube falso em 127.0.0.1: responde o pacote de informação, as perguntas de buffer e
// conta os pacotes de pontos que chegam, para o teste conferir o protocolo sem aparelho.
function fakeLaserCube() {
  const dgram = require('node:dgram');
  const F = { cmds: [], packets: 0, points: 0, lit: 0, maxPts: 0, bad: 0, rate: 0, out: null, free: 4000 };
  const info = () => { const b = Buffer.alloc(64); b[0] = 0x77; b[3] = 1; b[4] = 20; b[5] = F.out ? 1 : 0; b.writeUInt32LE(F.rate || 30000, 10); b.writeUInt32LE(45000, 14); b.writeUInt16LE(F.free, 19); b.writeUInt16LE(6000, 21); b[23] = 82; b.writeInt8(41, 24); b.write('LaserCube falso', 38); return b; };
  const cmd = dgram.createSocket('udp4'), data = dgram.createSocket('udp4');
  cmd.on('message', (m, r) => {
    F.cmds.push(m[0]);
    if (m[0] === 0x77) cmd.send(info(), r.port, r.address);
    else if (m[0] === 0x8a) { const b = Buffer.from([0x8a, 0, 0, 0]); b.writeUInt16LE(F.free, 2); cmd.send(b, r.port, r.address); }
    else if (m[0] === 0x80) F.out = m[1] === 1;
    else if (m[0] === 0x82) F.rate = m.readUInt32LE(1);
  });
  data.on('message', (m, r) => {
    if (m[0] !== 0xa9 || (m.length - 4) % 10) { F.bad++; return; }
    const n = (m.length - 4) / 10; F.packets++; F.points += n; F.maxPts = Math.max(F.maxPts, n);
    for (let i = 0; i < n; i++) { const o = 4 + i * 10; if (m.readUInt16LE(o) > 4095 || m.readUInt16LE(o + 2) > 4095) F.bad++; if (m.readUInt16LE(o + 4) + m.readUInt16LE(o + 6) + m.readUInt16LE(o + 8) > 0) F.lit++; }
    const b = Buffer.from([0x8a, 0, 0, 0]); b.writeUInt16LE(F.free, 2); data.send(b, r.port, r.address);
  });
  cmd.bind(45457, '127.0.0.1'); data.bind(45458, '127.0.0.1');
  F.close = () => { cmd.close(); data.close(); };
  return F;
}

module.exports = (win, app, laser) => {
  const dir = process.env.PROJ_TEST;
  const b64 = (f) => fs.readFileSync(path.join(dir, f)).toString('base64');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const shot = async (w, name) => fs.writeFileSync(path.join(dir, name), (await w.webContents.capturePage()).toPNG());
  const fake = fakeLaserCube();
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) console.log('CONSOLE ' + msg); });
  win.webContents.once('did-finish-load', async () => {
    const out = [];
    const ok = (name, cond, detail) => { out.push({ name, pass: !!cond }); console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + '  ' + (detail ?? '')); };
    try {
      await sleep(800);
      await win.webContents.executeJavaScript(`window.__recDir = ${JSON.stringify(dir)}; window.projecionista.recorder.c.dir = window.__recDir; true`, true);
      const r = await win.webContents.executeJavaScript(`(async()=>{
        const P=window.projecionista, S=(ms)=>new Promise(r=>setTimeout(r,ms));
        const file=(b,name,type)=>new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],name,{type});
        const cv=document.createElement('canvas'); cv.width=64; cv.height=48; const x=cv.getContext('2d'); x.fillStyle='#ff0000'; x.fillRect(0,0,64,48);
        const png=await new Promise(r=>cv.toBlob(b=>r(new File([b],'vermelho.png',{type:'image/png'}))));
        const R={};
        const mid=[[0.5,0.5]], pts=[[0.5,0.5],[0.2,0.3]];   // centro, e um ponto fora da faixa do vídeo em pé
        R.vazio=P.probe(mid)[0];
        R.n1=await P.putFiles(2,0,[file(${JSON.stringify(b64('va.mp4'))},'deitado.mp4','video/mp4')]);
        R.n2=await P.putFiles(1,0,[file(${JSON.stringify(b64('vb.mp4'))},'em-pe.mp4','video/mp4')]);
        R.n3=await P.putFiles(0,1,[png]);
        const L=P.state.layers;
        R.clips=[L[2].clips[0],L[1].clips[0],L[0].clips[1]].map(c=>c&&{w:c.w,h:c.h,kind:c.kind,thumb:(c.thumb||'').slice(0,16)});
        R.guardadoSemAr=L.every(l=>l.on===-1) && P.probe(mid)[0].join()==='0,0,0';
        const thAr=await Promise.all([L[2].clips[0],L[1].clips[0]].map(c=>new Promise(r=>{const i=new Image(); i.onload=()=>r(i.naturalWidth/i.naturalHeight); i.onerror=()=>r(0); i.src=c.thumb;})));
        R.thAr=thAr;
        // dispara o vídeo deitado na camada de baixo
        document.querySelector('.cell[data-layer="2"][data-col="0"] .th').parentElement.click(); await S(900);
        const t0=L[2].clips[0].el.currentTime; await S(500); R.aAnda=L[2].clips[0].el.currentTime!==t0;
        R.soA=P.probe(pts);
        // dispara o vídeo em pé na camada do meio: no centro manda ele, na lateral aparece o de baixo
        P.trigger(1,0); await S(900);
        R.aMaisB=P.probe(pts);
        R.bToca=!L[1].clips[0].el.paused;
        // clique no rodapé: só seleciona, não troca o que está no ar
        const antes=L[0].on; document.querySelector('.cell[data-layer="0"][data-col="1"] .nm').click(); await S(200);
        R.rodape={on:L[0].on===1, sel:P.state.sel, prev:!!document.querySelector('#prevScr canvas, #prevScr img'), nome:document.getElementById('prevName').textContent};
        // casa vazia: a camada fica preta
        document.querySelector('.cell[data-layer="1"][data-col="5"]').click(); await S(200);
        R.vaziaPreta={on:L[1].on, pausado:L[1].clips[0].el.paused, px:P.probe(pts)};
        // coluna 2: só a camada de cima tem clipe (imagem vermelha); as outras ficam pretas
        document.querySelector('.gh.col[data-col="1"]').click(); await S(300);
        R.coluna={on:L.map(l=>l.on), px:P.probe([[0.5,0.5],[0.02,0.5]])};
        // mover o clipe no ar para outra casa: continua no ar na casa nova
        P.moveClip(0,1,0,3,false); R.mover={on:L[0].on, tem3:!!L[0].clips[3], tem1:!!L[0].clips[1]};
        // opacidade e mistura
        L[0].opacity=0.5; R.meia=P.probe(mid)[0]; L[0].opacity=1;
        R.dom={casas:document.querySelectorAll('.cell').length, noAr:document.querySelectorAll('.cell.on').length};

        // ---------- Saída avançada ----------
        // a imagem vermelha está no ar na camada de cima, com faixas pretas nas laterais (12,5% de cada lado)
        const M=P.M, sc=P.screens()[0], s1=sc.items[0];
        R.telaPadrao={telas:P.screens().length, itens:sc.items.length, nome:s1.name, modo:s1.warp.mode, px:P.probeScreen(sc,[[0.5,0.5],[0.05,0.5]])};
        // dois projetores lado a lado numa tela só: cada slice mostra 1080 px da composição, 240 de emenda
        s1.in={x:0,y:0,w:1080,h:1080,rot:0}; M.fitOutRect(s1,{x:0,y:0,w:960,h:1080});
        const s2=M.mkSlice('Slice 2',{x:840,y:0,w:1080,h:1080},{x:960,y:0,w:960,h:1080}); sc.items.push(s2);
        R.semSoft=P.probeScreen(sc,[[0.45,0.5],[0.25,0.5]]);   // meio da emenda de s1 (x local 0,9) e um ponto cheio
        s1.soft.on=true; s2.soft.on=true; M.touch(s1); M.touch(s2);
        R.larguras=M.softWidths(s1,[s1,s2]);
        // x local 0,8889 = 1 − 0,5·(240/1080): o meio da rampa, onde ela vale a luminância (0,5) elevada a 1/2,2
        R.comSoft=P.probeScreen(sc,[[(1080-120)/1080*0.5,0.5],[0.25,0.5]]);
        s1.soft.lum=0.25; R.lum25=P.probeScreen(sc,[[(1080-120)/1080*0.5,0.5]])[0][0]; s1.soft.lum=0.5;
        s1.soft.black=40; R.preto=P.probeScreen(sc,[[0.002,0.95]])[0]; s1.soft.black=0;   // canto fora da emenda, na faixa preta da imagem
        s1.soft.on=false; s2.soft.on=false; M.touch(s1); M.touch(s2);
        // malha: puxa o canto de cima à esquerda para dentro; o canto da tela fica preto
        M.setWarpMode(s1,'mesh'); R.malha={pts:s1.warp.pts.length, divs:[s1.warp.divX,s1.warp.divY]};
        M.moveAnchor(s1,0,300,300);
        R.malhaPx=P.probeScreen(sc,[[0.01,0.01],[0.3,0.5]]);
        M.setDivisions(s1,3,1); R.malha3={pts:s1.warp.pts.length, canto:s1.warp.pts[0].map(Math.round)};
        M.resetWarp(s1); R.malhaZero=P.probeScreen(sc,[[0.3,0.5]])[0];
        // máscara de saída no meio da tela, e invertida
        const mk=M.mkMask('Máscara',M.maskShape('rect',760,340,400,400)); sc.items.push(mk);
        R.mascara=P.probeScreen(sc,[[0.5,0.5],[0.25,0.5]]);
        mk.invert=true; M.touch(mk); R.mascaraInv=P.probeScreen(sc,[[0.5,0.5],[0.25,0.5]]);
        sc.items.pop();
        // máscara de entrada do slice 2 (círculo): o canto do recorte some, o centro fica
        M.setInMask(s2,'circle'); R.inMask=P.probeScreen(sc,[[0.75,0.5],[0.52,0.03]]); M.setInMask(s2,null);
        R.semMascara=P.probeScreen(sc,[[0.75,0.5]])[0];   // tirar a máscara não pode apagar o slice (realimentação de textura)
        // espelhar: a faixa preta da imagem troca de lado dentro do slice 2
        R.flipAntes=P.probeScreen(sc,[[0.99,0.5]])[0]; s2.flip.x=true; M.touch(s2); R.flipDepois=P.probeScreen(sc,[[0.99,0.5],[0.52,0.5]]); s2.flip.x=false; M.touch(s2);
        // uma segunda tela em pé (1080×1920) não pode mexer na primeira nem no monitor da composição
        const pAntes=P.probeScreen(sc,[[0.3,0.5],[0.75,0.5],[0.05,0.5]]);
        const sc2=M.mkScreen('Tela 2',{w:1080,h:1920}); sc2.items.push(M.mkSlice('S',{x:0,y:0,w:1920,h:1080},{x:0,y:0,w:1080,h:1920})); P.screens().push(sc2);
        const emPe=P.probeScreen(sc2,[[0.5,0.5],[0.5,0.05]]);
        const pDepois=P.probeScreen(sc,[[0.3,0.5],[0.75,0.5],[0.05,0.5]]);
        P.render(); await S(100);
        const mon=document.querySelector('#outScr canvas').getContext('2d').getImageData(960,540,1,1).data;
        R.telaEmPe={antes:pAntes.join('|'),depois:pDepois.join('|'),emPe:emPe.map(p=>p.join()).join('|'),mestre:[P.engine.canvas.width,P.engine.canvas.height],monitor:[mon[0],mon[1],mon[2]]};
        // mudar o tamanho da tela leva o slice junto: a composição continua cabendo inteira
        const sc3=M.mkScreen('Tela 3',{w:1920,h:1080}); sc3.items.push(M.mkSlice('S',{x:0,y:0,w:1920,h:1080},{x:0,y:0,w:1920,h:1080})); P.screens().push(sc3);
        M.resizeScreen(sc3,1080,1920); const o3=M.outRect(sc3.items[0]);
        R.redimensiona={out:[o3.x,o3.y,o3.w,o3.h], px:P.probeScreen(sc3,[[0.5,0.5],[0.95,0.5],[0.5,0.95]])};
        P.screens().pop(); P.screens().pop();
        // salvar e abrir: o preset volta igual
        const json=M.serialize(P.screens()); const back=M.deserialize(json);
        R.serial={telas:back.length, itens:back[0].items.length, in:JSON.stringify(back[0].items[1].in)===JSON.stringify(s2.in), pts:JSON.stringify(back[0].items[0].warp.pts)===JSON.stringify(s1.warp.pts)};
        if(window.projDesktop){ await window.projDesktop.presets.save('teste-automatico',json); const lista=await window.projDesktop.presets.list(); const lido=await window.projDesktop.presets.load('teste-automatico'); await window.projDesktop.presets.remove('teste-automatico'); R.preset={na:lista.includes('teste-automatico'),igual:lido===json, depois:(await window.projDesktop.presets.list()).includes('teste-automatico')}; }
        // editor: abre, mostra as duas abas, cancelar devolve o que estava
        P.ao.show(); await S(300);
        R.editor={aberto:!document.getElementById('ao').hidden, linhas:document.querySelectorAll('#aoList .row').length, slices:document.querySelectorAll('#aoSvg .slice').length, grupos:document.querySelectorAll('#aoProps .prow').length};
        P.ao.setTab('out'); await S(100);
        R.editorOut={slices:document.querySelectorAll('#aoSvg .slice').length, ancoras:0};
        P.ao.select(sc,s1); P.ao.setMode('pts'); await S(50); R.editorOut.ancoras=document.querySelectorAll('#aoSvg .hd.anc').length;
        // desfazer: apaga o slice 2 e volta
        P.ao.removeItem(s2); const n1=sc.items.length; P.ao.undo(); await S(100); R.desfazer={depoisApagar:n1, depoisDesfazer:P.screens()[0].items.length, refazer:(P.ao.redo(), P.screens()[0].items.length)}; P.ao.undo();
        // ---------- efeitos, fontes, texto, transição, autopilot, composição ----------
        // efeito na camada: inverter o vermelho dá ciano
        P.trigger(0,3); await S(200); const semFx=P.probe(mid)[0];
        L[0].fx.push({id:'invertrgb',params:{r:1,g:1,b:1},bypass:false}); const comFx=P.probe(mid)[0]; await S(120); const pv=document.querySelector('#prevScr canvas'); const prevFx=pv?[...pv.getContext('2d').getImageData(960,540,1,1).data].slice(0,3):null; L[0].fx=[];
        // efeito na composição
        P.engine.compFx.push({id:'threshold',params:{level:0.2},bypass:false}); const compFx=P.probe([[0.5,0.5],[0.05,0.5]]); P.engine.compFx=[];
        // fonte gerada: Test Card no meio é colorido; Solid Color vermelho
        P.putSource(1,2,'testcard'); P.trigger(1,2); await S(100); const fonte=P.probe([[0.5,0.5],[0.1,0.5]]);
        P.putSource(1,4,'solidcolor'); L[1].clips[4].params.hue=0; P.trigger(1,4); await S(100); const solido=P.probe(mid)[0]; P.eject(1);
        // texto: branco no centro
        P.eject(0); P.putText(2,5,'MMMMMMM'); P.trigger(2,5); await S(150); const grade9=P.probe([0.3,0.4,0.5,0.6,0.7].flatMap(x=>[0.45,0.5,0.55].map(y=>[x,y]))); const texto=grade9.reduce((a,b)=>b[0]+b[1]+b[2]>a[0]+a[1]+a[2]?b:a,[0,0,0]); P.eject(2);
        // transição: dispara o vermelho e logo depois o Test Card na mesma camada, com 1 s de transição; no meio há mistura
        L[0].transition=1; P.putSource(0,2,'solidcolor'); L[0].clips[2].params.hue=0.33; P.trigger(0,3); await S(100); P.trigger(0,2); await S(400); const meio=P.probe(mid)[0]; await S(800); const fim=P.probe(mid)[0]; L[0].transition=0; P.eject(0);
        // modos de transição do Resolume: Cut (antes de 50 % só o antigo, depois só o novo), Push Left (o novo entra pela direita e empurra o antigo para a esquerda: no meio, esquerda antigo, direita novo), to Black (no meio, preto)
        const probeT = async (mode, wait) => { L[0].transMode = mode; L[0].transition = 1; P.trigger(0,3); await S(150); P.trigger(0,2); await S(wait); return P.probe([[0.25,0.5],[0.75,0.5]]); };
        const trans = {}; trans.cutAntes = await probeT('cut', 250); await S(500); trans.cutDepois = P.probe(mid)[0];
        trans.push = await probeT('pushleft', 500); trans.preto = await probeT('toblack', 500);
        L[0].transition = 0; L[0].transMode = 'alpha'; await S(600); P.eject(0);
        // mistura da camada: verde (camada de cima) sobre vermelho; 50 Multiply → preto, 50 Add → amarelo, Alpha → verde, Add a 50 % do fader → amarelo (Add a 100 % seria verde: vira normal por cima, como no Resolume)
        P.putSource(1,5,'solidcolor'); L[1].clips[5].params.hue = 0; P.trigger(1,5); P.trigger(0,2); await S(150);
        L[0].blend = 'multiply50'; trans.mult = P.probe(mid)[0]; L[0].blend = 'add50'; trans.add = P.probe(mid)[0]; L[0].blend = 'alpha'; trans.alpha = P.probe(mid)[0];
        L[0].opacity = 0.5; L[0].blend = 'add'; trans.add50 = P.probe(mid)[0]; L[0].opacity = 1; L[0].blend = 'normal'; P.eject(0); P.eject(1);
        R.trans = trans;
        // decks: o deck novo fica vazio, o clipe que estava no ar continua (ghost); disparar no deck novo tira o ghost; o deck 1 volta com os clipes
        P.trigger(0,2); await S(100); const dk = {}; P.addDeck(1); await S(100);
        dk.vazio = L[0].clips.every(c => !c) && L[1].clips.every(c => !c); dk.decks = P.state.decks.length; dk.atual = P.state.deck; dk.ghost = !!L[0].ghost; dk.px = P.probe(mid)[0];
        P.putSource(0,0,'solidcolor'); L[0].clips[0].params.hue = 0.66; P.trigger(0,0); await S(100); dk.novo = P.probe(mid)[0]; dk.semGhost = !L[0].ghost;
        P.switchDeck(0); await S(100); dk.volta = [L[0].clips.filter(Boolean).length, L[0].on, !!L[0].ghost]; P.eject(0); P.removeDeck(1); dk.fim = P.state.decks.length; dk.semClipe0 = !L[0].clips[0];
        // grupos: camadas 1 e 2 num grupo a 50 % → verde pela metade; solo do grupo esconde a camada 3; bus A com o crossfader em B esconde
        P.trigger(0,2); await S(100); const gp = {}; const gr = P.newGroup(0); P.setLayerGroup(1, gr.id); gp.membros = L.map(x => x.group); gr.opacity = 0.5; gp.meio = P.probe(mid)[0]; gr.opacity = 1;
        L[0].transform.scale = 0.5; P.putSource(2,0,'solidcolor'); L[2].clips[0].params.hue = 0; P.trigger(2,0); await S(100);
        gp.canto = P.probe([[0.05,0.5]])[0]; gr.solo = true; gp.soloCanto = P.probe([[0.05,0.5]])[0]; gr.solo = false;
        L[2].bus = 'A'; P.state.xfade.pos = 1; gp.busB = P.probe([[0.05,0.5]])[0]; P.state.xfade.pos = 0.5; gp.busMeio = P.probe([[0.05,0.5]])[0]; L[2].bus = null;
        gp.grade = { linhas: document.querySelectorAll('#grid .grp').length, colunas: document.querySelectorAll('#grid .gcol').length, decks: document.querySelectorAll('#decks button').length };
        L[0].transform.scale = 1; P.removeGroup(gr, false); gp.semGrupo = L.every(x => x.group == null) && P.state.groups.length === 0 && document.querySelectorAll('#grid .grp').length === 0;
        P.eject(0); P.eject(2); P.state.layers[2].clips[0] = null;
        R.decks = dk; R.grupos = gp;
        // composição automática: salva e abre de volta com os mesmos clipes
        await P.autosave(); const auto = { salvou: false, clipes: 0 }; try { const j = await window.projDesktop.comps.load('_automatica'); const d = JSON.parse(j); auto.salvou = true; auto.clipes = d.layers.reduce((a, l) => a + l.clips.filter(Boolean).length, 0); auto.escondida = !(await window.projDesktop.comps.list()).some(c => c.name === '_automatica'); } catch (e) { auto.erro = e.message; }
        auto.agora = L.reduce((a, l) => a + l.clips.filter(Boolean).length, 0); R.auto = auto;
        // assistente de projetores: um deitado 1920×1080 e um em pé 1080×1920 (que o Windows vê deitado), lado a lado → 3000×1920 com 2 telas
        const wiz = {}, prevScreens = P.screens(); P.applyProjectors([{ d: { id: 'd1', label: 'P1', w: 1920, h: 1080 }, vertical: false, x: 0, y: 0 }, { d: { id: 'd2', label: 'P2', w: 1920, h: 1080 }, vertical: true, x: 1920, y: 0 }], { open: false });
        wiz.comp = [P.engine.W, P.engine.H]; const scs = P.screens(); wiz.telas = scs.map(s => ({ dev: s.device, w: s.w, h: s.h, in: s.items[0].in, rot: Math.round(s.items[0].warp.rot || 0) }));
        wiz.px = P.probeScreen(scs[1], [[0.5, 0.5]])[0];
        P.applyProjectors([{ d: { id: 'd1', label: 'P1', w: 1920, h: 1080 }, vertical: false, x: 0, y: 0 }, { d: { id: 'd2', label: 'P2', w: 1920, h: 1080 }, vertical: false, x: 1720, y: 0 }], { open: false }); wiz.emenda = [P.engine.W, P.screens().map(s => s.items[0].soft.on)];
        P.applySettings({ ...P.state.settings, w: 1920, h: 1080 }); P.setScreens(prevScreens); R.wiz = wiz;
        // tirar o fundo: o modelo ONNX carrega e segmenta um quadro do vídeo; a máscara vira textura do efeito
        const sg = { ort: !!window.ort }; await P.seg.load(); sg.sessao = !!P.seg.session; sg.erro = P.seg.err;
        const sv = L.flatMap(x => x.clips).find(c => c && c.kind === 'video' && c.el instanceof HTMLVideoElement && c.el.readyState >= 2);
        const bf = { id: 'backgroundremoval', params: {}, bypass: false, panim: {} };
        if (sg.sessao && sv) { const t0s = performance.now(); sg.rodou = await P.seg.run(sv, bf); sg.ms = Math.round(performance.now() - t0s); sg.tex = !!bf._maskTex; sg.erro = P.seg.err; }
        R.seg = sg;
        // áudio: o vídeo entra no grafo (fonte → efeitos → volume → pan → master → FFT); EQ-3 e LowPass criam nós; a forma FFT segue o nível da faixa
        const au = {}; const av = L.flatMap(x => x.clips).find(c => c && c.kind === 'video' && c.el instanceof HTMLMediaElement);
        P.audio.attach(av); au.ligado = !!(av.srcNode && av.gainNode && av.panNode); av.afx = [P.mkAudioFx('eq3'), P.mkAudioFx('lowpass')]; P.C.rebuildAudioFx(av); au.nos = (av.afxNodes || []).length;
        av.afx[1].params.freq = 500; P.C.updateAudioFx(av, av.afx[1]); au.freq = av.afxNodes[1].all[0].frequency.value; av.afx = []; P.C.rebuildAudioFx(av);
        P.audio.levels.mid = 0.5; au.fft = P.engine.paramValue({ params: {}, panim: { x: { shape: 'fft', band: 'mid', min: 0, max: 2 } } }, { key: 'x', def: 0 }); P.audio.levels.mid = 0;
        au.ctx = P.audio.ctx && P.audio.ctx.state; au.bandas = Object.keys(P.audio.levels).length;
        R.audio = au;
        // todos os efeitos compilam e desenham sem erro; Trails (feedback) segura a imagem depois que o clipe sai
        const fxAll = { n: 0, erros: [] }; P.trigger(0,3); await S(100);
        for (const def of P.EFFECTS) { L[0].fx = [{ id: def.id, params: {}, bypass: false, panim: {} }]; try { P.probe(mid); fxAll.n++; } catch (e) { fxAll.erros.push(def.id + ': ' + e.message); } }
        const cropFx = { id: 'crop', params: { l: 0, r: 0, t: 0, b: 0, soft: 0 }, bypass: false, panim: {} };
        L[0].fx = [cropFx, { id: 'trails', params: { amount: 0.9, mode: 0 }, bypass: false, panim: {} }]; P.probe(mid); P.probe(mid); const trailsAntes = P.probe(mid)[0];
        cropFx.params.l = 1; const trailsDepois = P.probe(mid)[0]; L[0].fx = []; P.eject(0);
        R.fxAll = { ...fxAll, trails: [trailsAntes, trailsDepois], total: P.EFFECTS.length };
        // APC40 mkII (sem a controladora: as mensagens entram pela função que recebe o MIDI): pad da camada 2 coluna 2, linha de cima dispara a coluna, fader e master
        const A = P.apc, ap = {}; P.putSource(1,1,'testcard'); A.handle([0x90, 9, 127]); ap.pad = [L[1].on, L[0].on];
        A.handle([0x90, 32 + 3, 127]); ap.coluna = L.map(x => x.on);
        A.handle([0xB0, 7, 64]); ap.fader = L[2].opacity; A.handle([0xB0, 14, 127]); ap.master = P.state.master;
        A.handle([0x90 + 1, 48, 127]); ap.bypass = L[1].bypass; A.handle([0x90 + 1, 48, 127]);
        A.handle([0x90, 9, 127]); const leds = A.leds(); const led = (s, n) => (leds.find(x => x[0] === s && x[1] === n) || [])[2];
        ap.leds = [led(0x90, 9), led(0x90, 8), led(0x90, 35), led(0x91, 52)];
        A.handle([0x90 + 1, 52, 127]); ap.limpar = L[1].on; L[2].opacity = 1; P.state.master = 1; P.engine.master = 1; P.eject(0); P.eject(1); P.eject(2); P.state.layers[1].clips[1] = null;
        R.apc = ap;
        // BPM: a batida anda no tempo certo; TAP a 150; animação de parâmetro na batida; Beat Snap segura o disparo até a batida
        const B = P.bpm; B.bpm = 120; const b0 = B.beat; await S(500); const bAnda = B.beat - b0;
        const tp0 = performance.now() / 1000; P.tapBpm(tp0); P.tapBpm(tp0 + 0.4); P.tapBpm(tp0 + 0.8); const bTap = B.bpm; B.bpm = 120; B.taps = [];
        const hold = { params: {}, panim: { bright: { shape: 'onoff', beats: 1, min: -1, max: 1 } } }, pdef = { key: 'bright', def: 0 };
        B.running = false; B.beat = 0.25; const an1 = P.engine.paramValue(hold, pdef); B.beat = 0.75; const an2 = P.engine.paramValue(hold, pdef); B.beat = 0; B.running = true;
        B.snap = 2; P.trigger(0,3); const snapAntes = [L[0].on, P.pending()]; await S(1300); const snapDepois = [L[0].on, P.pending()]; B.snap = 0; P.eject(0);
        // BPM Sync: a faixa de va.mp4 (1 s a 2 s) dura 2 batidas: a 120 BPM é 1 s → velocidade 1x; a 240 BPM, 2x
        let vbL = -1, vbCol = -1; L.forEach((x, i) => x.clips.forEach((c, k) => { if (vbL < 0 && c && c.kind === 'video' && c.el && c.dur >= 1) { vbL = i; vbCol = k; } }));
        const vb = L[vbL].clips[vbCol], vbTr = { ...vb.tr }, vbOut = Math.min(1, vb.dur);
        vb.tr.in = 0; vb.tr.out = vbOut; vb.tr.sync = 'bpm'; vb.tr.beats = 2; P.trigger(vbL, vbCol); await S(300); const syncRate1 = vb.el.playbackRate;
        B.bpm = 240; await S(300); const syncRate2 = vb.el.playbackRate; const syncPos = vb.el.currentTime; B.bpm = 120; Object.assign(vb.tr, vbTr, { sync: 'timeline' }); P.eject(vbL);
        R.bpm = { anda: bAnda, tap: bTap, an: [an1, an2], snapAntes, snapDepois, syncRate: [syncRate1, syncRate2], syncPos, barra: document.querySelectorAll('#bpmBar button').length };
        // autopilot: tempo fixo de 0,3 s, próximo com loop → troca de casa sozinho
        L[0].autopilot={dir:'next',dur:'fixed',secs:0.4,loop:true}; P.trigger(0,2); const ap0=L[0].on; await S(600); const ap1=L[0].on; await S(400); const ap2=L[0].on; L[0].autopilot.dir='off'; P.eject(0);
        R.extras={semFx,comFx,prevFx,compFx,fonte,solido,texto,meio,fim,ap:[ap0,ap1,ap2]};
        // composição: salva e abre de volta
        L[0].name='Topo'; L[1].fx.push({id:'blur',params:{amount:0.5},bypass:false});
        const cjson=P.serialize(); const antesN=P.state.layers.map(l=>l.clips.filter(c=>c&&(c.path||c.kind!=='video'&&c.kind!=='image')).length);   // arquivo solto sem caminho não vai para o arquivo
        P.ao.hide(true); await P.load(cjson,'teste'); await S(300); P.ao.show(); P.ao.setTab('out'); P.ao.select(P.screens()[0],P.screens()[0].items[0]); P.ao.setMode('pts');
        R.comp={nome:P.state.name, camadas:P.state.layers.length, primeira:P.state.layers[0].name, clipes:P.state.layers.map(l=>l.clips.filter(Boolean).length), antes:antesN, fx:P.state.layers[1].fx.length, blur:P.state.layers[1].fx[0]&&P.state.layers[1].fx[0].params.amount, kinds:P.state.layers.flatMap(l=>l.clips.filter(Boolean).map(c=>c.kind))};
        // gravação: 1,5 s da composição
        P.trigger(1,2); P.recorder.opts.stop='after'; P.recorder.opts.stopSecs=1.5; P.recorder.start(); await S(3500);
        R.rec={estado:P.recorder.state, arquivos:P.recorder.files.length, tamanho:P.recorder.files.length?P.recorder.files[P.recorder.files.length-1].size:0, blob:P.recorder.lastBlob?P.recorder.lastBlob.size:0};
        P.eject(1);
        // navegador: abas existem e a lista de arquivos da pasta de teste tem os dois vídeos
        P.browser.setTab('files'); P.browser.go(${JSON.stringify(dir)}); await S(600);
        R.nav={itens:document.querySelectorAll('#browserPan .item.file').length, abas:document.querySelectorAll('#browserTabs [data-tab]').length};
        P.browser.setTab('fx'); await S(50); R.nav.efeitos=document.querySelectorAll('#browserPan .item.fx').length;
        P.browser.setTab('src'); await S(300); R.nav.fontes=document.querySelectorAll('#browserPan .item.src').length;
        P.browser.setTab('comps'); await S(300); R.nav.comps=document.querySelectorAll('#browserPan .item.comp').length;
        P.browser.setTab('rec'); await S(50); R.nav.rec=document.querySelectorAll('#browserPan .recbtn').length;
        // arquivo do disco por caminho (Range) vira clipe
        R.caminho=await P.putPath(2,7,${JSON.stringify(dir.replace(/\\/g, '/') + '/va.mp4')},'va.mp4'); R.caminhoClip=P.state.layers[2].clips[7]&&[P.state.layers[2].clips[7].w,P.state.layers[2].clips[7].h];
        // volta a grade ao estado que os testes seguintes esperam
        P.state.layers[0].name='Camada 3'; P.eject(0); P.eject(1); P.eject(2); P.state.layers[0].clips[2]=null; P.state.layers[1].clips[2]=null; P.state.layers[1].clips[4]=null; P.state.layers[2].clips[5]=null; P.state.layers[2].clips[7]=null; P.state.layers[1].fx=[]; P.render();
        // ---------- laser ----------
        const Z=P.laser, LM=await import('./laser-model.js');
        R.laserTexto={a:LM.textPaths({content:'A',font:'simplex',dir:'h',size:0.2,spacing:1,scroll:'none'}).length, vertical:LM.textPaths({content:'AB',font:'simplex',dir:'v',size:0.2,spacing:1,scroll:'none'}).length, pilha:LM.textPaths({content:'AB',font:'gothic',dir:'stack',size:0.2,spacing:1,scroll:'none'}).length};
        const fr=LM.mkFrame('Teste','text'); fr.text.content='LASER'; fr.color.mode='solid'; fr.color.c1='#ffffff';
        const zs1=LM.renderPoints(fr,Z.settings,0); const lit1=zs1.lit.reduce((a,b)=>a+b,0);
        // zona segura: um quadro grande demais é cortado — nenhum ponto aceso fora do retângulo
        const big=LM.mkFrame('Grande','shape'); big.paths=LM.shapePaths('circle'); big.pos.scale=1.0; big.color.mode='solid'; big.color.c1='#ffffff';
        const zs2=LM.renderPoints(big,Z.settings,0); let fora=0, acesos=0; for(let i=0;i<zs2.n;i++){ if(zs2.lit[i]){ acesos++; if(Math.abs(zs2.xy[i*2])>Z.settings.safe.w+1e-6||Math.abs(zs2.xy[i*2+1])>Z.settings.safe.h+1e-6) fora++; } }
        const u16=LM.toU16(zs1,Z.settings); let max=0; for(const v of u16) max=Math.max(max,v);
        const svgPaths=LM.svgToPaths('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="30"/><circle cx="50" cy="70" r="20"/><path d="M10 90 L90 90 M10 95 L90 95"/></svg>');
        // mapeamento: com os 4 cantos na metade direita, todo x sai acima do meio (2048); zerar devolve
        const flipPadrao=Z.settings.flipX===true && LM.deserializeLaser('{"frames":[],"settings":{}}').settings.flipX===true && LM.deserializeLaser(JSON.stringify({frames:[],settings:{flipX:false,flipCal:1}})).settings.flipX===false;   // padrão espelhado na horizontal (cubo real); arquivo calibrado respeita a escolha
        Z.settings.flipX=false;   // a geometria do mapa é testada sem o espelho
        const MP=Z.settings.map; MP.mode='corners'; MP.corners=[[0,-1],[1,-1],[1,1],[0,1]]; const um=LM.toU16(zs1,Z.settings); let xmin=4095,xmax=0,foraAceso=0; const lim=Math.round((Z.settings.safe.w+1)/2*4095)+1; for(let i=0;i<zs1.n;i++){ xmin=Math.min(xmin,um[i*5]); xmax=Math.max(xmax,um[i*5]); if(um[i*5]>lim&&(um[i*5+2]+um[i*5+3]+um[i*5+4])>0) foraAceso++; }
        MP.mode='mesh'; LM.setMapDivisions(MP,3,2); const nMesh=MP.mesh.length; MP.mesh.forEach(p=>{ p[0]=p[0]*0.5; p[1]=p[1]*0.5; }); const um2=LM.toU16(zs1,Z.settings); let mmin=4095,mmax=0; for(let i=0;i<zs1.n;i++){ mmin=Math.min(mmin,um2[i*5+1]); mmax=Math.max(mmax,um2[i*5+1]); }
        const lback=LM.deserializeLaser(LM.serializeLaser(Z.frames,Z.settings,null)); const mapaVolta=lback.settings.map.mode==="mesh"&&lback.settings.map.mesh.length===nMesh&&Math.abs(lback.settings.map.mesh[0][0]+0.5)<1e-6;
        LM.resetMap(MP); MP.mode='off'; const um3=LM.toU16(zs1,Z.settings); let zmin=4095; for(let i=0;i<zs1.n;i++) zmin=Math.min(zmin,um3[i*5]);
        R.laserMapa={xmin,xmax,foraAceso,lim,nMesh,mmin,mmax,mapaVolta,zmin,flipPadrao};
        R.laserPontos={n:zs1.n, lit:lit1, orcamento:Math.round(Z.settings.pps/(Z.settings.scanHz||Z.settings.fps)), fora, acesos, u16len:u16.length, max, svg:svgPaths.length};
        // clipe de laser na grade: disparar manda o quadro para o laser, tirar do ar tira
        Z.frames.push(fr); P.putLaserClip(0,6,fr); P.trigger(0,6); await S(100); const ativo1=Z.active===fr; P.eject(0); await S(100); const ativo2=Z.active;
        R.laserGrade={casa:document.querySelector('.cell[data-layer="0"][data-col="6"]').classList.contains('laser'), ativo1, ativo2:ativo2===null};
        // LaserCube falso: conecta, liga a saída, confere os pacotes
        let lz=null;
        if(window.projLaser){ try{ const info=await window.projLaser.connect('127.0.0.1'); Z.setActive(fr); await S(200); const st0=await window.projLaser.status(); await window.projLaser.output(true); await S(700); const st1=await window.projLaser.status(); await window.projLaser.output(false); await S(100); lz={nome:info.name, bateria:info.battery, antes:st0.outputOn, depois:st1.outputOn, bufSize:st1.bufSize}; }catch(e){ lz={erro:e.message}; } }
        R.laserCube=lz;
        // espelho: a fonte "Laser (espelho)" na grade mostra o círculo que o laser desenha
        const circ=Z.frames.find(f=>f.name==='Círculo'); circ.distort.pulse=0; Z.setActive(circ);
        P.state.layers[0].clips[0]=P.C.laserMirrorClip(); P.trigger(0,0); await S(250);
        const esp=P.probe([[0.5+0.8*0.5*1080/1920,0.5],[0.5,0.5]]);   // na borda do círculo (raio 0,8 do quadrado de 1080) há luz; no centro não
        R.espelho={borda:esp[0],centro:esp[1]}; P.eject(0); Z.setActive(null);
        // contorno: com um retângulo vermelho na projeção, o quadro de contorno acha as bordas dele
        const red=P.putSource(0,3,'solidcolor'); red.params.hue=0; red.transform.scale=0.5; P.trigger(0,3); await S(200);
        Z.add('contour'); const ctr=Z.frames[Z.frames.length-1]; ctr.contour.level=0.2; Z.setActive(ctr); Z.scanNow(performance.now()/1000+1);
        R.contorno={caminhos:ctr.paths.length, pontos:ctr.paths.reduce((a,p)=>a+p.length,0)}; Z.setActive(null); Z.frames.pop();
        // autopilot do clipe: o vermelho manda para a casa (camada 2, coluna 3) depois de 0,3 s; o Test Card de lá para
        red.ap={mode:'cell',l:1,c:2,dur:'fixed',secs:0.3}; P.putSource(1,2,'testcard'); P.state.layers[1].clips[2].ap={mode:'stop',l:0,c:0,dur:'fixed',secs:0.3};
        P.eject(0); P.eject(1); P.trigger(0,3); await S(450); const apCell=[P.state.layers[0].on,P.state.layers[1].on]; red.ap.mode='layer'; await S(600); const apStop=P.state.layers[1].on;
        R.apClip={cell:apCell, stop:apStop}; P.eject(0); P.eject(1); P.state.layers[1].clips[2]=null; P.state.layers[0].clips[0]=null; P.state.layers[0].clips[3]=null; P.render();
        // transporte do clipe: entrada/saída em loop, para trás, uma vez, ignorar coluna
        await P.putPath(2,7,${JSON.stringify(dir.replace(/\\/g, '/') + '/va.mp4')},'va.mp4'); const vc=P.state.layers[2].clips[7];
        vc.tr.in=1.0; vc.tr.out=2.0; vc.tr.mode='loop'; P.trigger(2,7); await S(1300); const loopPos=vc.el.currentTime;
        P.C.seekClip(vc,1.8); await S(100); P.C.playClip(vc,-1,1); const re0=vc.el.currentTime; await S(400); const re1=vc.el.currentTime;
        P.C.pauseClip(vc); vc.tr.mode='once'; P.C.seekClip(vc,1.5); await S(100); P.C.playClip(vc,1,1); await S(900); const oncePos=vc.el.currentTime, oncePlaying=vc.tr.playing;
        P.eject(2); vc.ignoreColumn=true; P.triggerColumn(7); const ign=P.state.layers[2].on; vc.ignoreColumn=false; P.eject(0); P.eject(1); P.eject(2);
        R.transporte={loopPos, re:[re0,re1], oncePos, oncePlaying, ign}; P.state.sel={l:2,c:7}; P.render();
        // preparar: ffmpeg gera va.proj.mp4 (todo intra) e o clipe passa para o reprodutor próprio
        let prep={erro:'sem ponte'};
        if(window.projDesktop){ try{
          await P.prepareClip(2,7,'h264'); const pc=P.state.layers[2].clips[7], pl=pc.player;
          prep={nome:pc.nome||pc.name, player:!!pl, intra:pl&&pl.allIntra, n:pl&&pl.samples.length, w:pc.w, h:pc.h, dur:pc.dur, thumb:(pc.thumb||'').slice(0,15)};
          pc.tr.in=0; pc.tr.out=pc.dur; pc.tr.mode='loop'; P.trigger(2,7); await S(600);
          const f0=pl.frameIndex, t0=pl.currentTime; prep.px=P.probe(mid)[0]; await S(500); prep.anda=[f0,pl.frameIndex,t0,pl.currentTime];
          // para trás: o quadro mostrado anda para trás de verdade
          P.C.seekClip(pc,2.0); await S(150); P.C.playClip(pc,-1,1); await S(150); const rf0=pl.frameIndex, rt0=pl.currentTime; await S(500); prep.re=[rf0,pl.frameIndex,rt0,pl.currentTime];
          // pulo: a 0,5 s o quadro certo aparece em menos de 150 ms
          P.C.pauseClip(pc); P.C.seekClip(pc,0.5); await S(150); prep.pulo=[pl.indexAt(0.5),pl.frameIndex];
          // velocidade 4x: anda mais rápido que o relógio
          P.C.seekClip(pc,0.2); pc.tr.mode='loop'; P.C.playClip(pc,1,4); const v0=pl.currentTime; await S(400); prep.rapido=pl.currentTime-v0; P.C.setRate(pc,1);
          P.eject(2);
        }catch(e){ prep={erro:e.message}; } }
        R.prep=prep;
        // menus, configurações da composição, colunas e área de transferência
        const mn={};
        mn.barra=[...document.querySelectorAll('#menubar .mb')].map(b=>b.textContent);
        P.menubar.show(1); await S(50); mn.itens=[...document.querySelectorAll('.menu .mi .lb')].map(e=>e.textContent); P.menubar.close(); mn.fechou=!document.querySelector('.menuLayer .menu');
        P.settingsDialog(); await S(50); mn.dialogo=!!document.querySelector('.dlgOver'); mn.linhas=document.querySelectorAll('.dlgOver .prow').length; document.querySelector('.dlgOver .dfoot button').click(); await S(50); mn.dialogoFechou=!document.querySelector('.dlgOver');
        const scN=M.mkScreen('Tela N',{w:1920,h:1080}); scN.items.push(M.mkSlice('S',{x:0,y:0,w:1920,h:1080},{x:0,y:0,w:1920,h:1080})); P.screens().push(scN);
        P.applySettings({...P.state.settings, w:1280, h:720, bg:'#204060'}); await S(120); mn.tam=[P.engine.W,P.engine.H,P.engine.canvas.width, document.getElementById('compInfo').textContent]; mn.fundo=P.probe(mid)[0]; mn.slice=scN.items[0].in.w;
        P.putSource(0,0,'solidcolor'); P.state.layers[0].clips[0].params.hue=0.33; P.trigger(0,0); await S(100); mn.verde=P.probe(mid)[0]; P.eject(0);
        P.applySettings({...P.state.settings, w:1920, h:1080, bg:'#000000'}); await S(100); mn.volta=[P.engine.W, scN.items[0].in.w]; P.screens().pop();
        const c0=P.cols(); P.insertColumn(1); mn.col=[c0,P.cols(),P.state.layers[0].clips.length, P.state.layers[0].clips[1]===null, !!P.state.layers[0].clips[0]]; P.removeColumn(1); mn.col.push(P.cols(), P.state.layers[0].clips.length);
        P.state.sel={l:0,c:0}; P.copyClip(false); P.state.sel={l:1,c:3}; P.pasteClip(); mn.cola=[!!P.state.layers[1].clips[3], P.state.layers[1].clips[3]&&P.state.layers[1].clips[3].kind, P.state.layers[1].clips[3]!==P.state.layers[0].clips[0]];
        P.toggleTestCard(); const tcOn=P.state.layers[0].testCard===true; P.trigger(0,0); await S(100); const tcPx=P.probe([[0.5,0.5],[0.1,0.5]]); P.toggleTestCard(); mn.testCard=[tcOn, P.state.layers.some(L=>L.testCard), tcPx[0].join()!=='0,0,0'];
        P.state.layers[1].clips[3]=null; P.state.layers[0].clips[0]=null; P.render();
        R.menus=mn;
        // GIF animado: vira clipe de vídeo de 20 quadros, toca e anda para trás
        let gif={erro:''};
        try{
          await P.putPath(1,7,${JSON.stringify(dir.replace(/\\/g, '/') + '/anim.gif')},'anim.gif'); const gc=P.state.layers[1].clips[7], gp=gc.player;
          gif={kind:gc.kind, anim:!!gc.anim, frames:gp&&gp.frames, w:gc.w, h:gc.h, dur:gc.dur, thumb:(gc.thumb||'').slice(0,15)};
          gc.tr.mode='loop'; P.trigger(1,7); await S(400); const g0=gp.frameIndex; gif.px=P.probe(mid)[0]; await S(400); gif.anda=[g0,gp.frameIndex];
          P.C.seekClip(gc,1.5); await S(100); P.C.playClip(gc,-1,1); await S(100); const gr0=gp.frameIndex; await S(500); gif.re=[gr0,gp.frameIndex];
          const cp=P.C.cloneClip(gc); gif.copia=cp.player!==gp && cp.player.frames===gp.frames; cp.player.close();
          P.eject(1); P.state.layers[1].clips[7]=null;
        }catch(e){ gif.erro=e.message; }
        R.gif=gif;
        window.__shotEditor=true;
        return R;
      })()`, true);
      const nz = (p) => p[0] + p[1] + p[2] > 30;
      ok('clipes medidos', r.n1 === 1 && r.n2 === 1 && r.n3 === 1 && r.clips[0].w === 320 && r.clips[0].h === 180 && r.clips[1].w === 180 && r.clips[1].h === 320 && r.clips[2].w === 64,
        r.clips.map(c => c.kind + ' ' + c.w + '×' + c.h).join(', '));
      ok('miniatura na proporção', Math.abs(r.thAr[0] - 16 / 9) < 0.05 && Math.abs(r.thAr[1] - 9 / 16) < 0.05, r.thAr.map(x => x.toFixed(3)).join(' e '));
      ok('arquivo solto não vai para o ar', r.vazio.join() === '0,0,0' && r.guardadoSemAr, 'composição preta antes de disparar');
      ok('disparar toca o vídeo', r.aAnda && nz(r.soA[0]) && nz(r.soA[1]), 'centro ' + r.soA[0] + ', lateral ' + r.soA[1]);
      ok('camadas misturadas na proporção certa', r.bToca && nz(r.aMaisB[0]) && r.aMaisB[0].join() !== r.soA[0].join() && Math.abs(r.aMaisB[1][0] - r.soA[1][0]) < 12 && Math.abs(r.aMaisB[1][1] - r.soA[1][1]) < 12,
        'vídeo em pé por cima: centro mudou para ' + r.aMaisB[0] + '; na lateral segue o de baixo ' + r.aMaisB[1]);
      ok('rodapé seleciona e dispara do começo', r.rodape.on && r.rodape.sel.l === 0 && r.rodape.sel.c === 1 && r.rodape.prev && /64×48/.test(r.rodape.nome), 'prévia: ' + r.rodape.nome);
      ok('casa vazia deixa a camada preta', r.vaziaPreta.on === -1 && r.vaziaPreta.pausado && nz(r.vaziaPreta.px[0]) && nz(r.vaziaPreta.px[1]) && r.vaziaPreta.px[0].join() !== r.aMaisB[0].join(),
        'camada do meio fora do ar e vídeo pausado; a de baixo continua');
      ok('coluna', r.coluna.on.join() === '1,-1,-1' && r.coluna.px[0][0] > 200 && r.coluna.px[0][1] < 40 && r.coluna.px[1].join() === '0,0,0',
        'no ar por camada: ' + r.coluna.on + '; centro ' + r.coluna.px[0] + ' (imagem vermelha), lateral ' + r.coluna.px[1] + ' (preto)');
      ok('mover clipe no ar', r.mover.on === 3 && r.mover.tem3 && !r.mover.tem1, 'continua no ar na casa nova');
      ok('opacidade', r.meia[0] > 100 && r.meia[0] < 150, 'vermelho a 50% = ' + r.meia[0]);
      ok('grade', r.dom.casas === 24 && r.dom.noAr === 1, r.dom.casas + ' casas, ' + r.dom.noAr + ' no ar');

      const T = r.telaPadrao;
      ok('tela padrão mostra a composição', T.telas === 1 && T.itens === 1 && T.modo === 'corners' && T.px[0][0] > 200 && T.px[1].join() === '0,0,0', T.nome + ': centro ' + T.px[0] + ', faixa preta ' + T.px[1]);
      ok('larguras da emenda', Math.abs(r.larguras.r - 240 / 1080) < 1e-6 && r.larguras.l === 0 && r.larguras.t === 0 && r.larguras.b === 0, 'direita ' + (r.larguras.r * 1080).toFixed(0) + ' px, outras 0');
      const esperado = Math.pow(0.5, 1 / 2.2) * r.semSoft[1][0];
      ok('soft edge: meio da rampa', r.semSoft[0][0] > 200 && Math.abs(r.comSoft[0][0] - esperado) < 10 && Math.abs(r.comSoft[1][0] - r.semSoft[1][0]) < 3,
        'sem ' + r.semSoft[0][0] + ' → com ' + r.comSoft[0][0] + ' (esperado ' + esperado.toFixed(0) + '); fora da emenda segue ' + r.comSoft[1][0]);
      ok('soft edge: luminância muda a rampa', r.lum25 < r.comSoft[0][0] - 20 && Math.abs(r.lum25 - Math.pow(0.25, 1 / 2.2) * r.semSoft[1][0]) < 10, 'luminância 0,25 → ' + r.lum25);
      ok('soft edge: nível de preto', r.preto[0] >= 36 && r.preto[0] <= 44 && r.preto[1] >= 36, 'preto da imagem subiu para ' + r.preto);
      ok('malha bezier', r.malha.pts === 49 && r.malha.divs.join() === '2,2' && r.malhaPx[0].join() === '0,0,0' && r.malhaPx[1][0] > 200 && r.malha3.pts === 40 && r.malha3.canto.join() === '300,300' && r.malhaZero[0] > 200,
        '7×7 pontos; canto puxado fica preto ' + r.malhaPx[0] + ', miolo segue ' + r.malhaPx[1] + '; 3×1 divisões = 10×4 pontos com o canto em ' + r.malha3.canto + '; zerar devolve ' + r.malhaZero);
      ok('máscara de saída', r.mascara[0].join() === '0,0,0' && r.mascara[1][0] > 200 && r.mascaraInv[0][0] > 200 && r.mascaraInv[1].join() === '0,0,0', 'centro ' + r.mascara[0] + ' / fora ' + r.mascara[1] + '; invertida: centro ' + r.mascaraInv[0] + ' / fora ' + r.mascaraInv[1]);
      ok('máscara de entrada', r.inMask[0][0] > 200 && r.inMask[1].join() === '0,0,0', 'centro ' + r.inMask[0] + ', canto ' + r.inMask[1]);
      ok('tirar a máscara devolve o slice', r.semMascara[0] > 200, 'centro do slice 2 ' + r.semMascara);
      ok('espelhar', r.flipAntes[0] < 30 && r.flipDepois[0][0] > 200 && r.flipDepois[1].join() === '0,0,0', 'borda direita: ' + r.flipAntes + ' → ' + r.flipDepois[0] + '; a faixa preta foi para a esquerda ' + r.flipDepois[1]);
      ok('segunda tela em pé não mexe na primeira', r.telaEmPe.antes === r.telaEmPe.depois && r.telaEmPe.monitor[0] > 200 && r.telaEmPe.monitor[1] < 40,
        'antes ' + r.telaEmPe.antes + ' / depois ' + r.telaEmPe.depois + '; tela em pé ' + r.telaEmPe.emPe + '; canvas mestre ' + r.telaEmPe.mestre + '; monitor ' + r.telaEmPe.monitor);
      ok('redimensionar a tela leva o slice junto', r.redimensiona.out.join() === '0,0,1080,1920' && r.redimensiona.px[0][0] > 200 && r.redimensiona.px[1].join() === '0,0,0' && r.redimensiona.px[2][0] > 200,
        'slice ficou ' + r.redimensiona.out.join('×') + '; centro ' + r.redimensiona.px[0] + ', borda direita ' + r.redimensiona.px[1] + ' (faixa preta da imagem), embaixo ' + r.redimensiona.px[2]);
      ok('salvar e abrir', r.serial.telas === 1 && r.serial.itens === 2 && r.serial.in && r.serial.pts, 'preset volta com os mesmos retângulos e pontos');
      ok('preset em disco', r.preset && r.preset.na && r.preset.igual && !r.preset.depois, r.preset ? 'gravado, lido igual e apagado' : 'sem ponte com o processo principal');
      const X = r.extras;
      ok('efeitos na camada e na composição', X.semFx[0] > 200 && X.semFx[1] < 40 && X.comFx[0] < 40 && X.comFx[1] > 200 && X.comFx[2] > 200 && X.prevFx && X.prevFx[0] < 40 && X.prevFx[1] > 200 && X.compFx[0][0] > 200 && X.compFx[0][1] > 200 && X.compFx[1].join() === '0,0,0',
        'vermelho ' + X.semFx + ' → Invert RGB ' + X.comFx + '; prévia mostra o efeito: ' + X.prevFx + '; Threshold na composição: centro ' + X.compFx[0] + ', faixa ' + X.compFx[1]);
      ok('fontes geradas e texto', X.fonte[0].join() !== '0,0,0' && X.solido[0] > 200 && X.solido[1] < 40 && X.texto[0] > 200 && X.texto[1] > 200,
        'Test Card centro ' + X.fonte[0] + '; Solid Color ' + X.solido + '; texto ' + X.texto);
      ok('transição entre clipes', X.meio[0] > 40 && X.meio[1] > 40 && X.fim[1] > 200 && X.fim[0] < 40, 'no meio ' + X.meio + ' (vermelho e verde misturados), no fim ' + X.fim);
      ok('autopilot', X.ap[0] === 2 && X.ap[1] === 3 && X.ap[2] === 2, 'casa ' + X.ap.join(' → '));
      const Tm = r.trans;
      ok('transições do Resolume', Tm.cutAntes[0][0] > 200 && Tm.cutAntes[0][1] < 40 && Tm.cutDepois[1] > 200 && Tm.cutDepois[0] < 40 && Tm.push[0][0] > 200 && Tm.push[0][1] < 40 && Tm.push[1][1] > 200 && Tm.push[1][0] < 40 && Tm.preto[0][0] < 70 && Tm.preto[0][1] < 70,
        'Cut: antes ' + Tm.cutAntes[0] + ', depois ' + Tm.cutDepois + '; Push Left no meio: esquerda ' + Tm.push[0] + ', direita ' + Tm.push[1] + '; to Black no meio ' + Tm.preto[0]);
      const Dk = r.decks, Gp = r.grupos;
      ok('decks', Dk.vazio && Dk.decks === 2 && Dk.atual === 1 && Dk.ghost && Dk.px[1] > 200 && Dk.novo[2] > 200 && Dk.novo[1] < 60 && Dk.semGhost && Dk.volta[0] >= 2 && Dk.volta[1] === -1 && Dk.volta[2] && Dk.fim === 1 && Dk.semClipe0,
        'deck novo vazio com o verde ainda no ar ' + Dk.px + '; disparo no deck 2 ' + Dk.novo + '; de volta ao deck 1: ' + Dk.volta[0] + ' clipes, no ar ' + Dk.volta[1] + ', ghost ' + Dk.volta[2] + '; removido → ' + Dk.fim + ' deck');
      ok('grupos, solo e crossfader', Gp.membros[0] != null && Gp.membros[0] === Gp.membros[1] && Gp.membros[2] == null && Gp.meio[1] > 100 && Gp.meio[1] < 160 && Gp.canto[0] > 200 && Gp.soloCanto[0] < 20 && Gp.busB[0] < 20 && Gp.busMeio[0] > 100 && Gp.busMeio[0] < 160 && Gp.grade.linhas === 1 && Gp.grade.colunas === 8 && Gp.grade.decks === 2 && Gp.semGrupo,
        'grupo a 50 % ' + Gp.meio + '; canto com o vermelho de baixo ' + Gp.canto + ', com solo do grupo ' + Gp.soloCanto + '; bus A com o fader em B ' + Gp.busB + ', no meio ' + Gp.busMeio + '; grade: ' + JSON.stringify(Gp.grade));
      const At = r.auto;
      ok('composição automática', At.salvou && At.clipes === At.agora && At.escondida, At.erro || (At.clipes + ' clipes gravados sozinhos; fora da lista de composições: ' + At.escondida));
      const Wz = r.wiz;
      ok('assistente de projetores', Wz.comp.join() === '3000,1920' && Wz.telas.length === 2 && Wz.telas[0].dev === 'd1' && Wz.telas[0].in.w === 1920 && Wz.telas[1].in.x === 1920 && Wz.telas[1].in.w === 1080 && Wz.telas[1].in.h === 1920 && Wz.emenda[0] === 3640 && Wz.emenda[1].join() === 'true,true',
        'composição ' + Wz.comp.join('×') + '; telas ' + JSON.stringify(Wz.telas.map(t => [t.dev, t.in.x + ',' + t.in.y + ' ' + t.in.w + '×' + t.in.h, 'giro ' + t.rot])) + '; sobrepostos 200 px: ' + Wz.emenda[0] + ' de largura, soft edge ' + Wz.emenda[1].join('/'));
      const Sg = r.seg;
      ok('tirar o fundo (PP-HumanSeg em ONNX)', Sg.ort && Sg.sessao && Sg.rodou && Sg.tex && !Sg.erro, Sg.erro || ('modelo carregado; um quadro segmentado em ' + Sg.ms + ' ms; máscara na textura ' + Sg.tex));
      const Au = r.audio;
      ok('áudio: grafo, efeitos de áudio e FFT', Au.ligado && Au.nos === 2 && Au.freq === 500 && Au.fft === 1 && Au.bandas === 5,
        'clipe no grafo ' + Au.ligado + '; EQ-3 + LowPass = ' + Au.nos + ' nós, LowPass em ' + Au.freq + ' Hz; forma FFT com médios a 0,5 → ' + Au.fft + '; contexto ' + Au.ctx);
      const Fx = r.fxAll;
      ok('os 90 efeitos do Resolume', Fx.total >= 88 && Fx.n === Fx.total && Fx.erros.length === 0 && Fx.trails[0][0] > 200 && Fx.trails[1][0] > 100,
        Fx.n + ' de ' + Fx.total + ' efeitos desenharam' + (Fx.erros.length ? '; erros: ' + Fx.erros.join(' | ') : '') + '; Trails: com o clipe ' + Fx.trails[0] + ', clipe apagado ' + Fx.trails[1]);
      const Ap = r.apc;
      ok('APC40 mkII', Ap.pad.join() === '1,-1' && Ap.coluna.join() === '3,-1,-1' && Math.abs(Ap.fader - 64 / 127) < 0.01 && Ap.master === 1 && Ap.bypass === true && Ap.leds[0] === 53 && Ap.leds[1] === 33 && Ap.leds[2] === 33 && Ap.leds[3] === 127 && Ap.limpar === -1,
        'pad 9 → camada 2 coluna 2 ' + Ap.pad.join('/') + '; pad 35 → coluna 4 ' + Ap.coluna.join('/') + '; fader ' + Ap.fader.toFixed(2) + ', master ' + Ap.master + ', bypass ' + Ap.bypass + '; LEDs ' + Ap.leds.join('/') + '; limpar → ' + Ap.limpar);
      const Bp = r.bpm;
      ok('BPM: relógio, TAP, animação, Beat Snap e BPM Sync', Math.abs(Bp.anda - 1) < 0.3 && Math.abs(Bp.tap - 150) < 2 && Bp.an[0] === 1 && Bp.an[1] === -1 && Bp.snapAntes.join() === '-1,1' && Bp.snapDepois.join() === '3,0' && Math.abs(Bp.syncRate[0] - 1) < 0.15 && Math.abs(Bp.syncRate[1] - 2) < 0.3 && Bp.syncPos >= 0 && Bp.syncPos <= 1.15 && Bp.barra >= 12,
        'em 0,5 s andou ' + Bp.anda.toFixed(2) + ' batida a 120; TAP deu ' + Bp.tap + '; On Off a 1 batida: ' + Bp.an.join(' / ') + '; Beat Snap 2: antes ' + Bp.snapAntes.join('/') + ', depois ' + Bp.snapDepois.join('/') + '; BPM Sync: velocidade ' + Bp.syncRate.map(x => x.toFixed(2)).join(' → ') + ', posição ' + Bp.syncPos.toFixed(2) + ' s; barra com ' + Bp.barra + ' botões');
      ok('modos de mistura da camada', Tm.mult[0] < 30 && Tm.mult[1] < 30 && Tm.add[0] > 200 && Tm.add[1] > 200 && Tm.alpha[1] > 200 && Tm.alpha[0] < 40 && Tm.add50[0] > 200 && Tm.add50[1] > 200,
        'verde sobre vermelho: 50 Multiply ' + Tm.mult + ', 50 Add ' + Tm.add + ', Alpha ' + Tm.alpha + ', Add a 50 % ' + Tm.add50);
      const Cp = r.comp;
      ok('salvar e abrir a composição', Cp.nome === 'teste' && Cp.camadas === 3 && Cp.primeira === 'Topo' && Cp.clipes.join() === Cp.antes.join() && Cp.fx === 1 && Cp.blur === 0.5 && Cp.kinds.includes('source') && Cp.kinds.includes('text'),
        Cp.camadas + ' camadas, clipes ' + Cp.clipes.join('/') + ' (antes ' + Cp.antes.join('/') + '), tipos ' + [...new Set(Cp.kinds)].join(', ') + ', efeito da camada 2 preservado');
      ok('gravar', r.rec.estado === 'idle' && r.rec.arquivos >= 1 && r.rec.tamanho > 10000, r.rec.arquivos + ' arquivo(s), último com ' + (r.rec.tamanho / 1e3).toFixed(0) + ' kB');
      ok('navegador', r.nav.abas === 5 && r.nav.itens >= 2 && r.nav.efeitos >= 20 && r.nav.fontes >= 12 && r.nav.rec === 1, r.nav.abas + ' abas; ' + r.nav.itens + ' arquivos na pasta; ' + r.nav.efeitos + ' efeitos; ' + r.nav.fontes + ' fontes; ' + r.nav.comps + ' composições salvas');
      ok('clipe por caminho do disco', r.caminho && r.caminhoClip && r.caminhoClip[0] === 320, 'va.mp4 aberto por app://…/media/ com ' + (r.caminhoClip || []).join('×'));
      ok('laser: texto de traço único', r.laserTexto.a === 3 && r.laserTexto.vertical > 3 && r.laserTexto.pilha > 3, 'A = ' + r.laserTexto.a + ' traços; vertical ' + r.laserTexto.vertical + ', pilha ' + r.laserTexto.pilha);
      ok('laser: varredura e zona segura', r.laserPontos.n > 300 && r.laserPontos.n <= r.laserPontos.orcamento * 1.3 && r.laserPontos.lit > 100 && r.laserPontos.fora === 0 && r.laserPontos.acesos > 50 && r.laserPontos.u16len === r.laserPontos.n * 5 && r.laserPontos.max <= 4095 && r.laserPontos.svg === 4,
        r.laserPontos.n + ' pontos (' + r.laserPontos.lit + ' acesos) para ' + r.laserPontos.orcamento + ' de orçamento; quadrado grande: ' + r.laserPontos.acesos + ' acesos, ' + r.laserPontos.fora + ' fora da zona; SVG → ' + r.laserPontos.svg + ' caminhos');
      const Lm = r.laserMapa;
      ok('laser: mapeamento por âncoras', Lm.xmin >= 2040 && Lm.xmax > 3000 && Lm.xmax <= Lm.lim && Lm.foraAceso === 0 && Lm.nMesh === 70 && Lm.mmin >= 1000 && Lm.mmax <= 3100 && Lm.mapaVolta && Lm.zmin < 1500 && Lm.flipPadrao,
        '4 cantos na metade direita: x de ' + Lm.xmin + ' a ' + Lm.xmax + ' (zona segura até ' + Lm.lim + ', ' + Lm.foraAceso + ' acesos fora); malha 3×2 (' + Lm.nMesh + ' pontos) encolhida: y de ' + Lm.mmin + ' a ' + Lm.mmax + '; salvar/abrir guarda o mapa=' + Lm.mapaVolta + '; zerado volta a ' + Lm.zmin);
      ok('laser: clipe na grade', r.laserGrade.casa && r.laserGrade.ativo1 && r.laserGrade.ativo2, 'disparar manda o quadro, tirar do ar tira');
      ok('laser: LaserCube falso', r.laserCube && !r.laserCube.erro && r.laserCube.nome === 'LaserCube falso' && r.laserCube.bateria === 82 && !r.laserCube.antes && r.laserCube.depois && r.laserCube.bufSize === 6000 && fake.packets > 5 && fake.maxPts <= 140 && fake.bad === 0 && fake.lit > 100 && fake.rate === 30000 && fake.out === false,
        r.laserCube && r.laserCube.erro ? r.laserCube.erro : (r.laserCube ? r.laserCube.nome + ' ' + r.laserCube.bateria + '%; ' : 'sem ponte; ') + fake.packets + ' pacotes, ' + fake.points + ' pontos (' + fake.lit + ' acesos), máx ' + fake.maxPts + '/pacote, ' + fake.bad + ' inválidos, taxa ' + fake.rate + ', saída no fim ' + fake.out);
      await win.webContents.executeJavaScript(`window.projecionista.laser.show(); window.projecionista.laser.sel = window.projecionista.laser.frames[0]; window.projecionista.laser.refresh(); true`, true); await sleep(400);
      await shot(win, 'pc-laser.png');
      await win.webContents.executeJavaScript(`window.projecionista.laser.setTab('laser'); true`, true); await sleep(200);
      await shot(win, 'pc-laser-aparelho.png');
      await win.webContents.executeJavaScript(`window.projecionista.laser.hide(); true`, true);
      ok('laser: espelho na projeção', r.espelho.borda.join() !== '0,0,0' && r.espelho.centro.join() === '0,0,0', 'borda do círculo ' + r.espelho.borda + ', centro ' + r.espelho.centro);
      ok('laser: contorno da projeção', r.contorno.caminhos >= 1 && r.contorno.pontos >= 4, r.contorno.caminhos + ' caminho(s), ' + r.contorno.pontos + ' pontos em volta do retângulo');
      ok('autopilot do clipe', r.apClip.cell.join() === '3,2' && r.apClip.stop === -1, 'casa específica: camadas ficaram em ' + r.apClip.cell.join(',') + ' (esperado 3,2); "parar": camada 2 em ' + r.apClip.stop + ' (esperado -1)');
      const Tr = r.transporte;
      ok('transporte do clipe', Tr.loopPos >= 0.95 && Tr.loopPos <= 2.05 && Tr.re[1] < Tr.re[0] && Tr.re[1] > 1.0 && !Tr.oncePlaying && Tr.oncePos >= 1.9 && Tr.ign === -1,
        'loop entre 1 s e 2 s: posição ' + Tr.loopPos.toFixed(2) + '; para trás ' + Tr.re[0].toFixed(2) + ' → ' + Tr.re[1].toFixed(2) + '; uma vez parou em ' + Tr.oncePos.toFixed(2) + '; ignorar coluna: camada ficou ' + (Tr.ign === -1 ? 'fora do ar' : 'no ar'));
      const Pp = r.prep;
      ok('preparar e reprodutor próprio', Pp && !Pp.erro && Pp.player && Pp.intra && Pp.n >= 70 && Pp.w === 320 && Pp.h === 180 && Pp.thumb.startsWith('data:image') && nz(Pp.px) && Pp.anda[1] > Pp.anda[0] && Pp.re[1] < Pp.re[0] && Pp.re[3] < Pp.re[2] && Pp.re[3] > 1.0 && Pp.pulo[0] === Pp.pulo[1] && Pp.rapido > 1.0,
        Pp && Pp.erro ? Pp.erro : Pp.n + ' quadros todo intra ' + Pp.w + '×' + Pp.h + ' ' + (Pp.dur || 0).toFixed(2) + ' s; toca ' + Pp.anda[0] + '→' + Pp.anda[1] + '; ré ' + Pp.re[0] + '→' + Pp.re[1] + ' (' + Pp.re[2].toFixed(2) + '→' + Pp.re[3].toFixed(2) + ' s); pulo para 0,5 s mostra o quadro ' + Pp.pulo[1] + ' (esperado ' + Pp.pulo[0] + '); 4x andou ' + (Pp.rapido || 0).toFixed(2) + ' s em 0,4');
      const Mn = r.menus;
      ok('barra de menus e diálogos', Mn.barra.join() === 'Projecionista,Composição,Deck,Grupo,Camada,Coluna,Clipe,Saída,Atalhos,Ver' && Mn.itens.includes('Configurações…') && Mn.itens.includes('Salvar como…') && Mn.fechou && Mn.dialogo && Mn.linhas >= 9 && Mn.dialogoFechou,
        Mn.barra.length + ' menus; Composição com ' + Mn.itens.length + ' itens; Configurações com ' + Mn.linhas + ' linhas; ' + JSON.stringify([Mn.fechou, Mn.dialogo, Mn.dialogoFechou]));
      ok('configurações da composição', Mn.tam[0] === 1280 && Mn.tam[1] === 720 && Mn.tam[2] >= 1280 && Mn.tam[3] === '1280×720' && Mn.fundo[2] > 80 && Mn.fundo[0] < 60 && Mn.verde[1] > 200 && Mn.slice === 1280 && Mn.volta[0] === 1920 && Mn.volta[1] === 1920,
        '1280×720: motor ' + Mn.tam.join('/') + ', fundo ' + Mn.fundo + ', clipe verde ' + Mn.verde + ', slice recorta ' + Mn.slice + '; de volta a ' + Mn.volta.join('/'));
      ok('colunas, copiar/colar, Test Card', Mn.col.join() === '8,9,9,true,true,8,8' && Mn.cola.join() === 'true,source,true' && Mn.testCard.join() === 'true,false,true',
        'colunas ' + Mn.col.join('/') + '; colar ' + Mn.cola.join('/') + '; test card ' + Mn.testCard.join('/'));
      const G = r.gif;
      ok('GIF animado como clipe', G && !G.erro && G.kind === 'video' && G.anim && G.frames === 20 && G.w === 160 && G.h === 90 && Math.abs(G.dur - 2) < 0.1 && G.thumb.startsWith('data:image') && nz(G.px) && G.anda[1] > G.anda[0] && G.re[1] < G.re[0] && G.copia,
        G && G.erro ? G.erro : G.frames + ' quadros ' + G.w + '×' + G.h + ' ' + (G.dur || 0).toFixed(2) + ' s; toca ' + G.anda[0] + '→' + G.anda[1] + '; ré ' + G.re[0] + '→' + G.re[1] + '; cópia independente=' + G.copia);
      await shot(win, 'pc-clipe.png');
      ok('editor', r.editor.aberto && r.editor.linhas === 3 && r.editor.slices === 2 && r.editor.grupos >= 8 && r.editorOut.slices === 2 && r.editorOut.ancoras === 8,   // malha 3×1 = 4×2 âncoras
        r.editor.linhas + ' linhas na árvore, ' + r.editor.slices + ' slices na Entrada, ' + r.editorOut.slices + ' na Saída, ' + r.editorOut.ancoras + ' âncoras, ' + r.editor.grupos + ' linhas de propriedades');
      ok('desfazer e refazer', r.desfazer.depoisApagar === 1 && r.desfazer.depoisDesfazer === 2 && r.desfazer.refazer === 1, 'apagar → 1 item, desfazer → 2, refazer → 1');

      await shot(win, 'pc-editor-saida.png');
      await win.webContents.executeJavaScript(`window.projecionista.ao.setTab('in'); true`, true); await sleep(200);
      await shot(win, 'pc-editor-entrada.png');
      const r2 = await win.webContents.executeJavaScript(`(async()=>{
        const P=window.projecionista, S=(ms)=>new Promise(r=>setTimeout(r,ms));
        // acrescenta uma máscara com o editor aberto e cancela: ela some, os dois slices ficam
        P.ao.add('maskRect'); const n=P.screens()[0].items.length; P.ao.hide(true); await S(100);
        const R={cancelou:n===3 && P.screens()[0].items.length===2 && document.getElementById('ao').hidden};
        // estado final para as capturas: em cada camada, o primeiro clipe que sobrou na composição recarregada (as casas 2,0 e 1,0 ficam vazias depois do load)
        P.state.layers.forEach((l,i)=>{ const k=l.clips.findIndex(Boolean); if(k>=0) P.trigger(i,k); }); P.state.layers[0].opacity=0.35; P.render(); await S(700);
        R.noAr=P.state.layers.map(l=>l.on);
        document.getElementById('btnOut').click(); await S(2500);
        const sc=P.screens()[0]; R.saida=P.outWins().length; R.tela={id:sc.id,w:sc.w,h:sc.h};
        return R;
      })()`, true);
      ok('cancelar devolve o que estava', r2.cancelou, 'a máscara acrescentada sumiu, os dois slices ficaram, editor fechado');
      await shot(win, 'pc-controle.png');
      const o = BrowserWindow.getAllWindows().find(w => w !== win);
      let ov = null;
      if (o) {
        ov = await o.webContents.executeJavaScript(`(async()=>{ const sid=new URLSearchParams(location.search).get('screen'); const src=window.opener.__projCanvas[sid]; const o=document.getElementById('adotado')||document.getElementById('out'); const pc=document.createElement('canvas'); pc.width=pc.height=32; const c=pc.getContext('2d',{willReadFrequently:true}); const h=()=>{ c.drawImage(src,0,0,32,32); const d=c.getImageData(0,0,32,32).data; let s=0; for(let i=0;i<d.length;i+=4) s=(s*31+d[i]+d[i+1]+d[i+2])>>>0; return s; }; const a=h(), t0=window.opener.projecionista.engine.time; await new Promise(r=>setTimeout(r,600)); return {w:o.width,h:o.height,anda:h()!==a || window.opener.projecionista.engine.time!==t0,sid,adotado:o.id==='adotado'&&o.ownerDocument===document&&o.isConnected}; })()`);   // a saída adota o canvas da tela (adoptNode); conferimos que ele está nesta janela e que muda
        // o que o projetor mostra de verdade: a captura da janela de saída tem de ter imagem (não pode ser preta)
        o.moveTop(); await sleep(400);
        const img = await o.webContents.capturePage(); const bm = img.getBitmap(), sz = img.getSize(); let soma = 0, n = 0;
        for (let i = 0; i < bm.length; i += 4 * 97) { soma += bm[i] + bm[i + 1] + bm[i + 2]; n += 3; }
        ov.brilho = n ? Math.round(soma / n) : 0; ov.captura = sz.width + '×' + sz.height;
        fs.writeFileSync(path.join(dir, 'pc-saida.png'), img.toPNG());
      }
      ok('janela de saída', r2.saida === 1 && ov && ov.w === r2.tela.w && ov.h === r2.tela.h && ov.anda && ov.adotado && ov.brilho > 8 && ov.sid === String(r2.tela.id), ov ? ov.w + '×' + ov.h + ', tela ' + ov.sid + ', canvas adotado=' + ov.adotado + ', recebendo quadros=' + ov.anda + ', captura ' + ov.captura + ' brilho médio ' + ov.brilho + ', no ar ' + r2.noAr.join('/') : 'não abriu');
      await shot(win, 'pc-grade.png');
    } catch (e) { ok('execução', false, e.message); }
    const f = out.filter(x => !x.pass);
    console.log(f.length ? 'REPROVADO: ' + f.map(x => x.name).join(', ') : 'APROVADO: ' + out.length + ' verificações');
    fake.close(); laser && laser.disconnect();
    app.exit(f.length ? 1 : 0);
  });
};
