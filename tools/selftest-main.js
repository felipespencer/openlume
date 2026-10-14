// Teste automático dentro do próprio programa. Ligado por PROJ_TEST=<pasta com va.mp4 e vb.mp4>.
// Carrega dois vídeos de verdade (um deitado, um em pé) e uma imagem, dispara, lê pixels da
// composição e confere a janela de saída. Grava capturas de tela na mesma pasta e sai.
//   va.mp4: ffmpeg -f lavfi -i testsrc=size=320x180:rate=25:duration=3 -pix_fmt yuv420p va.mp4
//   vb.mp4: ffmpeg -f lavfi -i testsrc2=size=180x320:rate=25:duration=3 -pix_fmt yuv420p vb.mp4
const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow } = require('electron');

module.exports = (win, app) => {
  const dir = process.env.PROJ_TEST;
  const b64 = (f) => fs.readFileSync(path.join(dir, f)).toString('base64');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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
        // estado final para a captura de tela: os dois vídeos e a imagem
        P.trigger(2,0); P.trigger(1,0); L[0].opacity=0.35; P.render(); await S(700);
        document.getElementById('btnOut').click(); await S(2500);
        R.saida=!!(P.outWin() && !P.outWin().closed);
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

      fs.writeFileSync(path.join(dir, 'pc-controle.png'), (await win.webContents.capturePage()).toPNG());
      const o = BrowserWindow.getAllWindows().find(w => w !== win);
      let ov = null;
      if (o) {
        ov = await o.webContents.executeJavaScript(`(async()=>{ const v=document.getElementById('v'); const a=v.currentTime; await new Promise(r=>setTimeout(r,600)); return {w:v.videoWidth,h:v.videoHeight,anda:v.currentTime!==a}; })()`);
        fs.writeFileSync(path.join(dir, 'pc-saida.png'), (await o.webContents.capturePage()).toPNG());
      }
      ok('janela de saída', r.saida && ov && ov.w === 1920 && ov.h === 1080 && ov.anda, ov ? ov.w + '×' + ov.h + ', recebendo quadros=' + ov.anda : 'não abriu');
    } catch (e) { ok('execução', false, e.message); }
    const f = out.filter(x => !x.pass);
    console.log(f.length ? 'REPROVADO: ' + f.map(x => x.name).join(', ') : 'APROVADO: ' + out.length + ' verificações');
    app.exit(f.length ? 1 : 0);
  });
};
