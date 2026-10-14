// Teste automático dentro do próprio programa. Ligado por PROJ_TEST=<pasta com va.mp4 e vb.mp4>.
// Carrega dois vídeos de verdade (um deitado, um em pé) e uma imagem, dispara, lê pixels da
// composição e das telas, confere a janela de saída e grava capturas na mesma pasta.
//   va.mp4: ffmpeg -f lavfi -i testsrc=size=320x180:rate=25:duration=3 -pix_fmt yuv420p va.mp4
//   vb.mp4: ffmpeg -f lavfi -i testsrc2=size=180x320:rate=25:duration=3 -pix_fmt yuv420p vb.mp4
const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow } = require('electron');

module.exports = (win, app) => {
  const dir = process.env.PROJ_TEST;
  const b64 = (f) => fs.readFileSync(path.join(dir, f)).toString('base64');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const shot = async (w, name) => fs.writeFileSync(path.join(dir, name), (await w.webContents.capturePage()).toPNG());
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) console.log('CONSOLE ' + msg); });
  win.webContents.once('did-finish-load', async () => {
    const out = [];
    const ok = (name, cond, detail) => { out.push({ name, pass: !!cond }); console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + '  ' + (detail ?? '')); };
    try {
      await sleep(800);
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
        R.rodape={on:L[0].on===antes, sel:P.state.sel, prev:!!document.querySelector('#prevScr img'), nome:document.getElementById('prevName').textContent};
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
      ok('rodapé só seleciona', r.rodape.on && r.rodape.sel.l === 0 && r.rodape.sel.c === 1 && r.rodape.prev && /64×48/.test(r.rodape.nome), 'prévia: ' + r.rodape.nome);
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
        // estado final para as capturas: os dois vídeos e a imagem
        P.trigger(2,0); P.trigger(1,0); P.state.layers[0].opacity=0.35; P.render(); await S(700);
        document.getElementById('btnOut').click(); await S(2500);
        const sc=P.screens()[0]; R.saida=P.outWins().length; R.tela={id:sc.id,w:sc.w,h:sc.h};
        return R;
      })()`, true);
      ok('cancelar devolve o que estava', r2.cancelou, 'a máscara acrescentada sumiu, os dois slices ficaram, editor fechado');
      await shot(win, 'pc-controle.png');
      const o = BrowserWindow.getAllWindows().find(w => w !== win);
      let ov = null;
      if (o) {
        ov = await o.webContents.executeJavaScript(`(async()=>{ const v=document.getElementById('v'); const a=v.currentTime; await new Promise(r=>setTimeout(r,600)); return {w:v.videoWidth,h:v.videoHeight,anda:v.currentTime!==a,sid:new URLSearchParams(location.search).get('screen')}; })()`);
        await shot(o, 'pc-saida.png');
      }
      ok('janela de saída', r2.saida === 1 && ov && ov.w === r2.tela.w && ov.h === r2.tela.h && ov.anda && ov.sid === String(r2.tela.id), ov ? ov.w + '×' + ov.h + ', tela ' + ov.sid + ', recebendo quadros=' + ov.anda : 'não abriu');
      await shot(win, 'pc-grade.png');
    } catch (e) { ok('execução', false, e.message); }
    const f = out.filter(x => !x.pass);
    console.log(f.length ? 'REPROVADO: ' + f.map(x => x.name).join(', ') : 'APROVADO: ' + out.length + ' verificações');
    app.exit(f.length ? 1 : 0);
  });
};
