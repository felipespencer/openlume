// Painéis de propriedades do rodapé, no formato do Resolume: Composição | Camada (esquerda),
// Clipe (meio). Autopilot, master, mistura, transição, transformação e a cadeia de efeitos.
import { el, ICON, propsKit, fmtN } from './panel.js';
import { BLENDS, FITS } from './engine.js';
import { EFFECTS, effectById, mkFx } from './effects.js';
import { sourceById } from './sources.js';
import { renderText, playClip, pauseClip, seekClip, setRate, applyAudio } from './clips.js';
import { AUTOPILOT } from './composition.js';

const $ = (id) => document.getElementById(id);
const fmtT = (s) => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
const fmtT1 = (s) => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
const FONTS = ['Segoe UI', 'Arial', 'Impact', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Comic Sans MS', 'Bahnschrift'];

export class Panels {
  // ctx: { state, engine, laser, toast, renderGrid(), selectedClip(), drag(), trigger(li,col), removeLayer(li), applySpeed(), openLaser(frame) }
  constructor(ctx) {
    this.c = { onChange: () => { } }; this.ctx = ctx; this.tab = 'comp';
    Object.assign(this, propsKit(this));
    $('leftTabs').onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) { this.tab = t.dataset.tab; this.render(); } };
  }
  // o kit chama estes nomes
  pushUndo() { } draw() { } renderProps() { this.render(); } refresh() { this.render(); this.ctx.renderGrid(); }

  render() {
    const S = this.ctx.state;
    $('leftTabs').querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab));
    const P = $('leftPan'); P.textContent = '';
    if (this.tab === 'comp') this.renderComp(P); else this.renderLayer(P, S.layers[S.selLayer]);
    this.renderClip($('clipPan'), this.ctx.selectedClip());
  }
  autopilotRows(P, ap, onSet, help) {
    P.appendChild(this.phead('Autopilot', 'Autopilot|Quando o clipe acaba, a camada passa sozinha para o próximo, o anterior ou um ao acaso.' + (help || '')));
    P.appendChild(this.pseg('Direção', 'Direção|◀◀ anterior, OFF parado, ▶▶ próximo, ⤮ ao acaso.', [['prev', '◀◀'], ['off', 'OFF'], ['next', '▶▶'], ['random', '⤮']], ap.dir, v => onSet('dir', v)));
    P.appendChild(this.pselect('Duração', 'Duração|Quanto tempo cada clipe fica: o comprimento do próprio clipe ou um tempo fixo.', [['clip', 'Clipe inteiro'], ['fixed', 'Tempo fixo']], ap.dur, v => onSet('dur', v)));
    if (ap.dur === 'fixed') P.appendChild(this.pnum('Segundos', 'Segundos|Tempo fixo por clipe.', ap.secs, { min: 0.2, max: 600, step: 0.5, dec: 1, unit: ' s', bar: true, reset: 5 }, v => onSet('secs', v)));
    P.appendChild(this.pcheck('Loop', 'Loop|Chegando ao fim da fileira, volta ao começo.', ap.loop, v => onSet('loop', v), ap.loop ? 'dá a volta' : 'para no último'));
  }
  transformRows(P, tr, help) {
    P.appendChild(this.phead('Transform', 'Transform|Posição, escala e giro' + (help || '') + '.'));
    P.appendChild(this.pnum('Posição X', 'Posição X|−100 é a esquerda, 100 a direita.', Math.round(tr.x * 100), { min: -200, max: 200, step: 1, bar: true, reset: 0 }, v => { tr.x = v / 100; }));
    P.appendChild(this.pnum('Posição Y', 'Posição Y|−100 é embaixo, 100 em cima.', Math.round(tr.y * 100), { min: -200, max: 200, step: 1, bar: true, reset: 0 }, v => { tr.y = v / 100; }));
    P.appendChild(this.pnum('Escala', 'Escala|Tamanho.', Math.round(tr.scale * 100), { min: 1, max: 400, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.scale = v / 100; }));
    P.appendChild(this.pnum('Giro', 'Giro|Ângulo em graus.', tr.rot, { min: -180, max: 180, step: 1, unit: ' °', bar: true, reset: 0 }, v => { tr.rot = v; }));
  }
  // cadeia de efeitos: cabeçalho por efeito (nome, desvio, ✕) e os parâmetros; zona para soltar
  fxRows(P, owner, label) {
    const list = owner.fx || (owner.fx = []);
    P.appendChild(this.phead('Efeitos' + (label ? ' ' + label : ''), 'Efeitos|Arraste um efeito do painel Efeitos para cá, ou clique duas vezes nele. A ordem é de cima para baixo.'));
    list.forEach((f, i) => {
      const def = effectById(f.id); if (!def) return;
      const h = el('div', 'phead fxh'); h.dataset.help = def.name + '|' + def.desc;
      const by = el('label', 'ck' + (f.bypass ? '' : ' on')); by.innerHTML = f.bypass ? ICON.itemOff : ICON.item; by.title = 'Liga e desliga o efeito'; by.onclick = () => { f.bypass = !f.bypass; this.render(); };
      const nm = el('span', '', def.name);
      const up = el('button', 'mini', '▲'); up.type = 'button'; up.title = 'Subir'; up.disabled = i === 0; up.onclick = () => { list.splice(i - 1, 2, list[i], list[i - 1]); this.render(); };
      const x = el('button', 'mini', '✕'); x.type = 'button'; x.title = 'Tirar o efeito'; x.onclick = () => { list.splice(i, 1); this.render(); };
      h.append(by, nm, up, x); P.appendChild(h);
      if (!f.bypass) for (const p of def.params) P.appendChild(this.pnum(p.label, def.name + ' · ' + p.label + '|' + def.desc, f.params[p.key] ?? p.def, { min: p.min, max: p.max, step: p.step, dec: p.step < 1 ? 2 : 0, unit: p.unit, bar: true, reset: p.def }, v => { f.params[p.key] = v; }));
    });
    const dz = el('div', 'dropzone', list.length ? 'Solte outro efeito aqui' : 'Solte um efeito aqui'); dz.dataset.help = 'Soltar efeito|Arraste do painel Efeitos.';
    dz.ondragover = (e) => { const d = this.ctx.drag(); if (d && d.effect) { e.preventDefault(); dz.classList.add('over'); } };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const d = this.ctx.drag(); if (d && d.effect) { const f = mkFx(d.effect); if (f) { list.push(f); this.render(); } } };
    P.appendChild(dz);
  }

  renderComp(P) {
    const S = this.ctx.state, E = this.ctx.engine;
    $('leftTitle').textContent = S.name || 'Composição';
    this.autopilotRows(P, S.compAutopilot, (k, v) => { S.compAutopilot[k] = v; for (const L of S.layers) L.autopilot = { ...S.compAutopilot }; this.render(); }, ' Aqui vale para todas as camadas de uma vez.');
    P.appendChild(this.phead('Composição', 'Composição|Controles gerais.'));
    P.appendChild(this.pnum('Master', 'Master|Brilho geral de tudo que sai.', Math.round(S.master * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { S.master = v / 100; E.master = S.master * S.opacity; }));
    P.appendChild(this.pnum('Velocidade', 'Velocidade|Multiplica a velocidade de todos os vídeos.', S.speed, { min: 0.1, max: 4, step: 0.05, dec: 2, unit: 'x', bar: true, reset: 1 }, v => { S.speed = v; this.ctx.applySpeed(); }));
    P.appendChild(this.phead('Vídeo', 'Vídeo|Opacidade da composição.'));
    P.appendChild(this.pnum('Opacidade', 'Opacidade|Esmaece a composição inteira.', Math.round(S.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { S.opacity = v / 100; E.master = S.master * S.opacity; }));
    this.transformRows(P, E.compTransform, ' da composição inteira');
    this.fxRows(P, { fx: E.compFx }, 'da composição');
  }
  renderLayer(P, L) {
    if (!L) return; const S = this.ctx.state;
    $('leftTitle').textContent = L.name;
    P.appendChild(this.ptext('Nome', 'Nome|O nome da camada, como aparece na grade.', L.name, v => { L.name = v || L.name; this.ctx.renderGrid(); }));
    this.autopilotRows(P, L.autopilot || (L.autopilot = AUTOPILOT()), (k, v) => { L.autopilot[k] = v; this.render(); });
    P.appendChild(this.phead('Camada', 'Camada|Controles da camada.'));
    P.appendChild(this.pnum('Master', 'Master|Opacidade da camada; o fader da grade é o mesmo.', Math.round(L.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { L.opacity = v / 100; this.ctx.renderGrid(); }));
    P.appendChild(this.phead('Vídeo', 'Vídeo|Como a camada entra na composição.'));
    P.appendChild(this.pselect('Mistura', 'Mistura|Normal, Somar, Tela ou Multiplicar.', Object.entries(BLENDS), L.blend, v => { L.blend = v; }));
    P.appendChild(this.prow('Largura', '', el('span', 'pinfo', String(this.ctx.engine.W))));
    P.appendChild(this.prow('Altura', '', el('span', 'pinfo', String(this.ctx.engine.H))));
    P.appendChild(this.phead('Transição', 'Transição|Ao disparar outro clipe nesta camada, o anterior esmaece durante este tempo.'));
    P.appendChild(this.pnum('Duração', 'Duração da transição|0 corta seco.', L.transition || 0, { min: 0, max: 10, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v => { L.transition = v; }));
    this.transformRows(P, L.transform || (L.transform = { x: 0, y: 0, scale: 1, rot: 0 }), ' da camada');
    this.fxRows(P, L, 'da camada');
    if (S.layers.length > 1) P.appendChild(this.pbutton('Remover esta camada', 'Remover camada|Apaga a camada e os clipes dela.', () => this.ctx.removeLayer(S.selLayer)));
  }
  // transporte do vídeo: linha do tempo com entrada e saída, tocar para frente e para trás, modo, velocidade
  transportRows(P, clip) {
    const t = clip.tr, v = clip.el, S = this.ctx.state, dur = clip.dur || 0;
    P.appendChild(this.phead('Transporte', 'Transporte|Linha do tempo, direção, modo, velocidade, entrada e saída.'));
    const tl = el('div', 'timeline'); tl.dataset.help = 'Linha do tempo|Arraste para pular. As alças das pontas são a entrada (cut in) e a saída (cut out).';
    const range = el('div', 'range'), head = el('div', 'head'), hin = el('div', 'hnd in'), hout = el('div', 'hnd out'), txt = el('div', 'ttxt');
    tl.append(range, head, hin, hout, txt);
    const place = () => { const i = (t.in / dur) * 100, o = ((t.out || dur) / dur) * 100; range.style.left = i + '%'; range.style.width = Math.max(0, o - i) + '%'; hin.style.left = i + '%'; hout.style.left = o + '%'; head.style.left = (v.currentTime / dur) * 100 + '%'; txt.textContent = fmtT1(v.currentTime) + ' / ' + fmtT1(dur); };
    place(); this.tl = { place, clip };
    const drag = (what) => (e) => {
      e.preventDefault(); tl.setPointerCapture(e.pointerId);
      const at = (ev) => { const r = tl.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), s = f * dur;
        if (what === 'in') t.in = Math.min(s, (t.out || dur) - 0.1); else if (what === 'out') t.out = Math.max(s, t.in + 0.1); else seekClip(clip, s); place(); };
      at(e); tl.onpointermove = (ev) => { if (tl.hasPointerCapture(ev.pointerId)) at(ev); }; tl.onpointerup = () => { tl.onpointermove = null; this.render(); };
    };
    hin.onpointerdown = drag('in'); hout.onpointerdown = drag('out'); tl.onpointerdown = (e) => { if (e.target === hin || e.target === hout) return; drag('seek')(e); };
    const row = el('div', 'prow tlrow'); row.append(el('span', 'pl', 'Linha do tempo'), tl); P.appendChild(row);
    const btn = (txt0, help, on, fn) => { const b = el('button', 'ib' + (on ? ' on' : ''), txt0); b.type = 'button'; b.dataset.help = help; b.onclick = () => { fn(); setTimeout(() => this.render(), 40); }; return b; };
    const tr = el('div', 'pv tr');
    tr.append(
      btn('|◀', 'Ir para a entrada|Volta ao ponto de entrada.', false, () => { seekClip(clip, t.in); }),
      btn('◀', 'Para trás|Toca de trás para a frente.', t.playing && t.dir < 0, () => playClip(clip, -1, S.speed)),
      btn('‖', 'Pausar|Para onde está.', !t.playing, () => pauseClip(clip)),
      btn('▶', 'Para a frente|Toca normalmente.', t.playing && t.dir > 0, () => playClip(clip, 1, S.speed)),
      btn('▶|', 'Ir para a saída|Pula para o ponto de saída.', false, () => { seekClip(clip, (t.out || dur) - 0.05); }),
      btn('−1q', 'Um quadro para trás|', false, () => { pauseClip(clip); seekClip(clip, v.currentTime - 1 / 30); }),
      btn('+1q', 'Um quadro para a frente|', false, () => { pauseClip(clip); seekClip(clip, v.currentTime + 1 / 30); }));
    P.appendChild(this.prow('Tocar', '', tr));
    P.appendChild(this.pseg('Modo', 'Modo|Loop repete; vai e volta inverte nas pontas; uma vez para na saída; aleatório pula pelo clipe.', [['loop', 'Loop'], ['bounce', 'Vai e volta'], ['once', 'Uma vez'], ['random', 'Aleatório']], t.mode, v2 => { t.mode = v2; }));
    P.appendChild(this.pnum('Velocidade', 'Velocidade|1x é a do arquivo; até 10x.', clip.speed, { min: 0.05, max: 10, step: 0.05, dec: 2, unit: 'x', bar: true, reset: 1 }, v2 => { clip.speed = v2; setRate(clip, S.speed); }));
    P.appendChild(this.pnum('Entrada', 'Entrada (cut in)|Onde o clipe começa, em segundos.', t.in, { min: 0, max: dur, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v2 => { t.in = Math.min(v2, (t.out || dur) - 0.1); }));
    P.appendChild(this.pnum('Saída', 'Saída (cut out)|Onde o clipe termina, em segundos.', t.out || dur, { min: 0, max: dur, step: 0.1, dec: 1, unit: ' s', bar: true, reset: dur }, v2 => { t.out = Math.max(v2, t.in + 0.1); }));
    P.appendChild(this.prow('Duração', 'Duração|Entre a entrada e a saída, na velocidade atual.', el('span', 'pinfo', fmtT1(((t.out || dur) - t.in) / (clip.speed * S.speed)) + ' · arquivo ' + fmtT1(dur))));
    const a = clip.audio;
    P.appendChild(this.phead('Áudio', 'Áudio|O som do arquivo.'));
    P.appendChild(this.pnum('Volume', 'Volume|', Math.round(a.vol * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v2 => { a.vol = v2 / 100; applyAudio(clip); }));
    P.appendChild(this.pnum('Pan', 'Pan|Esquerda −100, direita 100.', Math.round(a.pan * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v2 => { a.pan = v2 / 100; applyAudio(clip); }));
    P.appendChild(this.pcheck('Mudo', 'Mudo|', a.mute, v2 => { a.mute = v2; applyAudio(clip); }, a.mute ? 'sem som' : 'com som'));
  }
  // chamado a cada quadro: move o cursor da linha do tempo sem redesenhar o painel
  tick() { if (this.tl && this.tl.clip.el && document.body.contains(this.tl.place ? $('clipPan') : null)) { try { this.tl.place(); } catch { } } }
  renderClip(P, clip) {
    this.tl = null;
    P.textContent = '';
    if (!clip) { $('clipTitle').textContent = 'Clipe'; P.appendChild(el('div', 'vazio', 'Nenhum clipe selecionado. Clique no nome de um clipe para ver a prévia, ou na miniatura para pôr no ar. Solte aqui um arquivo, uma fonte ou um efeito.')); return; }
    $('clipTitle').textContent = clip.name;
    P.appendChild(this.ptext('Nome', 'Nome|O nome do clipe.', clip.name, v => { clip.name = v || clip.name; this.ctx.renderGrid(); }));
    if (clip.kind === 'video') this.transportRows(P, clip);
    else if (clip.kind === 'image') P.appendChild(this.prow('Tamanho', '', el('span', 'pinfo', clip.w + ' × ' + clip.h)));
    else if (clip.kind === 'source') {
      const def = sourceById(clip.source);
      P.appendChild(this.phead(def.name, def.name + '|' + def.desc));
      for (const p of def.params) P.appendChild(this.pnum(p.label, def.name + ' · ' + p.label + '|' + def.desc, clip.params[p.key] ?? p.def, { min: p.min, max: p.max, step: p.step, dec: p.step < 1 ? 2 : 0, unit: p.unit, bar: true, reset: p.def }, v => { clip.params[p.key] = v; }));
    } else if (clip.kind === 'text') {
      const t = clip.text, up = () => { renderText(clip); this.ctx.renderGrid(); };
      P.appendChild(this.phead('Texto', 'Texto|O texto desenhado na composição.'));
      P.appendChild(this.ptext('Conteúdo', 'Conteúdo|O texto. Use | para quebrar linha.', t.content.replace(/\n/g, '|'), v => { t.content = v.replace(/\|/g, '\n'); up(); }));
      P.appendChild(this.pselect('Fonte', 'Fonte|Fontes do Windows.', FONTS.map(f => [f, f]), t.font, v => { t.font = v; up(); }));
      P.appendChild(this.pnum('Tamanho', 'Tamanho|Altura da letra em pixels.', t.size, { min: 10, max: 600, step: 2, unit: ' px', bar: true, reset: 160 }, v => { t.size = v; up(); }));
      P.appendChild(this.pcheck('Negrito', '', t.bold, v => { t.bold = v; up(); }));
      P.appendChild(this.pseg('Alinhar', '', [['left', 'Esq.'], ['center', 'Centro'], ['right', 'Dir.']], t.align, v => { t.align = v; up(); }));
      P.appendChild(this.pnum('Matiz', 'Matiz|Cor da letra.', Math.round(t.hue * 360), { min: 0, max: 360, step: 1, unit: '°', bar: true, reset: 0 }, v => { t.hue = v / 360; up(); }));
      P.appendChild(this.pnum('Saturação', '', Math.round(t.sat * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 0 }, v => { t.sat = v / 100; up(); }));
      P.appendChild(this.pnum('Brilho', '', Math.round(t.val * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { t.val = v / 100; up(); }));
      P.appendChild(this.pnum('X', '', Math.round(t.x * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { t.x = v / 100; up(); }));
      P.appendChild(this.pnum('Y', '', Math.round(t.y * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v => { t.y = v / 100; up(); }));
    } else if (clip.kind === 'camera') P.appendChild(this.prow('Câmera', '', el('span', 'pinfo', clip.name + ' · ' + clip.w + ' × ' + clip.h)));
    else if (clip.kind === 'laser') { P.appendChild(this.prow('Tipo', '', el('span', 'pinfo', 'Quadro do laser'))); P.appendChild(this.pbutton('Abrir no Laser', 'Abrir no Laser|Edita este quadro no módulo do laser.', () => { const f = this.ctx.laser.byId(clip.laserId); if (f) this.ctx.openLaser(f); })); return; }
    // para onde este clipe manda quando acaba
    const ap = clip.ap || (clip.ap = { mode: 'layer', l: 0, c: 0, dur: 'clip', secs: 5 }), S = this.ctx.state;
    P.appendChild(this.phead('Autopilot do clipe', 'Autopilot do clipe|Quando este clipe acaba, para onde a camada vai. "Como a camada" segue o Autopilot da camada.'));
    P.appendChild(this.pselect('Destino', 'Destino|Próximo, anterior, ao acaso, uma casa específica, parar (tira a camada do ar) ou como a camada manda.', [['layer', 'Como a camada'], ['next', 'Próximo'], ['prev', 'Anterior'], ['random', 'Ao acaso'], ['cell', 'Casa específica'], ['stop', 'Parar']], ap.mode, v => { ap.mode = v; }));
    if (ap.mode === 'cell') {
      P.appendChild(this.pselect('Camada', 'Camada de destino|Em qual camada está a casa.', S.layers.map((L, i) => [String(i), L.name]), String(Math.min(ap.l, S.layers.length - 1)), v => { ap.l = +v; }));
      const cols = S.layers[Math.min(ap.l, S.layers.length - 1)].clips.map((c, i) => [String(i), (i + 1) + (c ? ' · ' + c.name.slice(0, 14) : ' · vazia')]);
      P.appendChild(this.pselect('Coluna', 'Coluna de destino|Qual casa disparar.', cols, String(ap.c), v => { ap.c = +v; }));
    }
    if (ap.mode !== 'layer') {
      P.appendChild(this.pselect('Quando', 'Quando|No fim do clipe (vídeo) ou depois de um tempo fixo.', [['clip', 'No fim do clipe'], ['fixed', 'Tempo fixo']], ap.dur, v => { ap.dur = v; }));
      if (ap.dur === 'fixed') P.appendChild(this.pnum('Segundos', '', ap.secs, { min: 0.2, max: 600, step: 0.5, dec: 1, unit: ' s', bar: true, reset: 5 }, v => { ap.secs = v; }));
    }
    // vídeo e disparo, como no Resolume
    P.appendChild(this.phead('Vídeo', 'Vídeo|Opacidade e mistura só deste clipe.'));
    P.appendChild(this.pnum('Opacidade', 'Opacidade do clipe|Multiplica a da camada.', Math.round((clip.opacity ?? 1) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { clip.opacity = v / 100; }));
    P.appendChild(this.pselect('Mistura', 'Mistura do clipe|Vazio usa a da camada.', [['', 'Como a camada'], ...Object.entries(BLENDS)], clip.blend || '', v => { clip.blend = v; }));
    if (clip.kind !== 'source' && clip.kind !== 'text') P.appendChild(this.prow('Tamanho', '', el('span', 'pinfo', clip.w + ' × ' + clip.h)));
    P.appendChild(this.phead('Disparo', 'Disparo|Como a casa reage ao clique.'));
    P.appendChild(this.pseg('Estilo', 'Estilo de disparo|Normal: clique dispara. Piano: fica no ar só enquanto o botão está apertado. Alternar: clicar de novo tira do ar.', [['normal', 'Normal'], ['piano', 'Piano'], ['toggle', 'Alternar']], clip.trig || 'normal', v => { clip.trig = v; this.ctx.renderGrid(); }));
    P.appendChild(this.pcheck('Coluna', 'Ignorar disparo de coluna|A casa não entra quando a coluna inteira é disparada.', !!clip.ignoreColumn, v => { clip.ignoreColumn = v; }, clip.ignoreColumn ? 'ignora o disparo da coluna' : 'entra com a coluna'));
    if (clip.kind !== 'source' && clip.kind !== 'text') P.appendChild(this.pselect('Ajuste', 'Ajuste na tela|Encaixar mantém a proporção com faixas; Preencher corta; Esticar deforma.', Object.entries(FITS), clip.fit, v => { clip.fit = v; }));
    this.transformRows(P, clip.transform, ' do clipe');
    this.fxRows(P, clip, 'do clipe');
  }
}
