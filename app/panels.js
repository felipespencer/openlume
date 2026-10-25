// Painéis de propriedades do rodapé, no formato do Resolume: Composição | Camada (esquerda),
// Clipe (meio). Autopilot, master, mistura, transição, transformação e a cadeia de efeitos.
import { el, ICON, propsKit, fmtN } from './panel.js';
import { FITS } from './engine.js';
import { MIXER_OPTS, MIXER_OPT, mixerById, mixerColor } from './mixers.js';
import { EFFECTS, effectById, mkFx } from './effects.js';
import { sourceById } from './sources.js';
import { PLAY_MODES, AWAY_MODES, captureNavigate, renderText, playClip, pauseClip, seekClip, setRate, applyAudio, mediaOf, rebuildAudioFx, updateAudioFx } from './clips.js';
import { AUTOPILOT } from './composition.js';
import { SHAPES, BEATS, ANIM } from './beat.js';
import { AUDIO_FX, audioFxById, BANDS } from './audio.js';
import { isPrepared } from './player.js';

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
    const G = this.ctx.selectedGroup ? this.ctx.selectedGroup() : null;
    $('leftTabs').querySelector('[data-tab=group]').hidden = !S.groups || !S.groups.length;
    if (this.tab === 'group' && !G) this.tab = 'layer';
    $('leftTabs').querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab));
    const P = $('leftPan'); P.textContent = '';
    if (this.tab === 'comp') this.renderComp(P); else if (this.tab === 'group') this.renderGroup(P, G); else this.renderLayer(P, S.layers[S.selLayer]);
    this.renderClip($('clipPan'), this.ctx.selectedClip());
  }
  autopilotRows(P, ap, onSet, help) {
    P.appendChild(this.phead('Autopilot', 'Autopilot|Quando o clipe acaba, a camada passa sozinha para o próximo, o anterior ou um ao acaso.' + (help || '')));
    P.appendChild(this.pseg('Direção', 'Direção|◀◀ anterior, OFF parado, ▶▶ próximo, ⤮ ao acaso.', [['prev', '◀◀'], ['off', 'OFF'], ['next', '▶▶'], ['random', '⤮']], ap.dir, v => onSet('dir', v)));
    P.appendChild(this.pselect('Duração', 'Duração|Quanto tempo cada clipe fica: o comprimento do próprio clipe ou um tempo fixo.', [['clip', 'Clipe inteiro'], ['fixed', 'Tempo fixo'], ['beats', 'Batidas']], ap.dur, v => onSet('dur', v)));
    if (ap.dur === 'beats') P.appendChild(this.pselect('Batidas', 'Batidas|Quantas batidas do relógio de BPM cada clipe fica.', BEATS.filter(b => b >= 1).map(b => [String(b), String(b)]), String(ap.beats || 4), v => onSet('beats', +v)));
    if (ap.dur === 'fixed') P.appendChild(this.pnum('Segundos', 'Segundos|Tempo fixo por clipe.', ap.secs, { min: 0.2, max: 600, step: 0.5, dec: 1, unit: ' s', bar: true, reset: 5 }, v => onSet('secs', v)));
    P.appendChild(this.pcheck('Loop', 'Loop|Chegando ao fim da fileira, volta ao começo.', ap.loop, v => onSet('loop', v), ap.loop ? 'dá a volta' : 'para no último'));
  }
  transformRows(P, tr, help) {
    P.appendChild(this.phead('Transform', 'Transform|Posição, escala e giro' + (help || '') + '.'));
    P.appendChild(this.pnum('Posição X', 'Posição X|−100 é a esquerda, 100 a direita.', Math.round(tr.x * 100), { min: -200, max: 200, step: 1, bar: true, reset: 0 }, v => { tr.x = v / 100; }));
    P.appendChild(this.pnum('Posição Y', 'Posição Y|−100 é embaixo, 100 em cima.', Math.round(tr.y * 100), { min: -200, max: 200, step: 1, bar: true, reset: 0 }, v => { tr.y = v / 100; }));
    // Escala muda largura e altura juntas (guarda a proporção esticada); Largura e Altura mexem cada uma sozinha
    const sx = tr.sx ?? 1, sy = tr.sy ?? 1;
    P.appendChild(this.pnum('Escala', 'Escala|Tamanho, largura e altura juntas.', Math.round(tr.scale * 100), { min: 1, max: 400, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.scale = v / 100; }));
    P.appendChild(this.pnum('Largura', 'Largura|Só a largura. 100 % é o tamanho normal; passa de 100 alarga, abaixo estreita.', Math.round(tr.scale * sx * 100), { min: 1, max: 800, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.sx = v / 100 / tr.scale; }));
    P.appendChild(this.pnum('Altura', 'Altura|Só a altura. 100 % é o tamanho normal; passa de 100 estica, abaixo achata.', Math.round(tr.scale * sy * 100), { min: 1, max: 800, step: 1, unit: ' %', bar: true, reset: 100 }, v => { tr.sy = v / 100 / tr.scale; }));
    P.appendChild(this.pnum('Giro', 'Giro|Ângulo em graus.', tr.rot, { min: -180, max: 180, step: 1, unit: ' °', bar: true, reset: 0 }, v => { tr.rot = v; }));
  }
  // um parâmetro de efeito ou de fonte: a linha do valor e o botão ♪, que o anima na batida
  // (forma dos presets do Resolume, ciclo em batidas, mínimo e máximo)
  paramRows(P, holder, p, help) {
    // cor e lista não animam na batida: só o controle
    if (p.color) { P.appendChild(this.pcolor(p.label, help, holder.params[p.key] ?? p.def, v => { holder.params[p.key] = v; }, p.alpha)); return; }
    if (p.opts) { P.appendChild(this.pselect(p.label, help, p.opts.map((t, i) => [String(i), t]), String(holder.params[p.key] ?? p.def), v => { holder.params[p.key] = +v; })); return; }
    const a = holder.panim && holder.panim[p.key];
    const o = { min: p.min, max: p.max, step: p.step, dec: p.step < 1 ? 2 : 0, unit: p.unit, bar: true };
    const row = this.pnum(p.label, help, holder.params[p.key] ?? p.def, { ...o, reset: p.def }, v => { holder.params[p.key] = v; });
    const b = el('button', 'anb' + (a ? ' on' : ''), '♪'); b.type = 'button'; b.title = a ? 'Parar a animação na batida (volta ao valor fixo)' : 'Animar este parâmetro na batida do BPM';
    b.onclick = (e) => { e.stopPropagation(); holder.panim = holder.panim || {}; if (a) delete holder.panim[p.key]; else holder.panim[p.key] = ANIM(p); this.render(); };
    row.querySelector('.pv').appendChild(b); P.appendChild(row);
    if (!a) return;
    P.appendChild(this.pselect('· Forma', 'Forma|Como o valor anda a cada ciclo: as formas dos presets de animação do Resolume.', SHAPES, a.shape, v => { a.shape = v; }));
    if (a.shape === 'fft') P.appendChild(this.pselect('· Faixa', 'Faixa|Qual parte do som move o parâmetro.', BANDS, a.band || 'bass', v => { a.band = v; }));
    else P.appendChild(this.pselect('· Batidas', 'Batidas|Quantas batidas dura um ciclo da forma.', BEATS.map(x => [String(x), x < 1 ? '1/' + Math.round(1 / x) : String(x)]), String(a.beats), v => { a.beats = +v; }));
    P.appendChild(this.pnum('· Mín', 'Mínimo|O valor no ponto mais baixo da forma.', a.min, { ...o, reset: p.min }, v => { a.min = v; }));
    P.appendChild(this.pnum('· Máx', 'Máximo|O valor no ponto mais alto da forma.', a.max, { ...o, reset: p.max }, v => { a.max = v; }));
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
      if (f.bypass) return;
      P.appendChild(this.pnum('Opacidade', def.name + ' · Opacidade|Quanto do efeito entra: 0 % é a imagem sem o efeito.', Math.round((f.opacity ?? 1) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { f.opacity = v / 100; }));
      for (const p of def.params) this.paramRows(P, f, p, def.name + ' · ' + p.label + '|' + def.desc);
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
    const AU = this.ctx.audio;
    if (AU) {
      P.appendChild(this.phead('Áudio e FFT', 'Áudio e FFT|A reação ao som: os níveis de graves, médios e agudos alimentam os parâmetros animados com a forma "FFT" (botão ♪ de cada parâmetro).'));
      P.appendChild(this.pselect('Fonte', 'Fonte da FFT|Composição: o som dos clipes. Microfone: a entrada de áudio do computador (placa de som ou microfone).', [['comp', 'Composição'], ['mic', 'Microfone / entrada']], AU.settings.source, v => { AU.setSource(v).then(() => this.render()); }));
      P.appendChild(this.pnum('Ganho', 'Ganho|Multiplica os níveis.', AU.settings.gain, { min: 0, max: 8, step: 0.1, dec: 1, unit: 'x', bar: true, reset: 1 }, v => { AU.settings.gain = v; }));
      P.appendChild(this.pnum('Queda', 'Queda (fallback)|Quão rápido o nível cai depois do pico, por segundo.', AU.settings.fallback, { min: 0.2, max: 30, step: 0.2, dec: 1, unit: '/s', bar: true, reset: 4 }, v => { AU.settings.fallback = v; }));
      const m = el('div', 'pv meters'); for (const [k, nm] of BANDS) { const w = el('div', 'meter'); w.dataset.band = k; w.title = nm; w.appendChild(el('i')); m.appendChild(w); } P.appendChild(this.prow('Níveis', 'Níveis|Graves, médios-graves, médios, agudos e tudo, agora.', m));
      if (AU.err) P.appendChild(this.prow('Aviso', '', el('span', 'pinfo', AU.err)));
    }
    const X = S.xfade;
    P.appendChild(this.phead('Crossfader', 'Crossfader|Camadas e grupos no bus A ficam de um lado, os do bus B do outro; o fader embaixo da grade passa de um para o outro. O bus de cada camada é escolhido no painel Camada.'));
    P.appendChild(this.pnum('Posição', 'Posição|0 % mostra só o bus A, 100 % só o bus B.', Math.round(X.pos * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 50 }, v => { X.pos = v / 100; X.target = null; this.ctx.renderDecks(); }));
    P.appendChild(this.pselect('Curva', 'Curva|Linear: proporcional. Potência igual: os dois lados somam sempre o mesmo brilho. Corte: troca seca no meio.', [['linear', 'Linear'], ['power', 'Potência igual'], ['cut', 'Corte']], X.curve, v => { X.curve = v; }));
    P.appendChild(this.pselect('Comportamento', 'Comportamento|O que os botões A e B fazem: cortam na hora ou esmaecem no tempo abaixo.', [['cut', 'Corta'], ['fade', 'Esmaece']], X.behaviour, v => { X.behaviour = v; }));
    if (X.behaviour === 'fade') P.appendChild(this.pnum('Tempo', 'Tempo|Quanto demora o esmaecer dos botões A e B.', X.secs, { min: 0.1, max: 30, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 2 }, v => { X.secs = v; }));
    const xb = el('div', 'pv'); const fa = el('button', 'wide', 'Ir para A'); fa.type = 'button'; fa.onclick = () => this.ctx.fadeTo('A'); const fb = el('button', 'wide', 'Ir para B'); fb.type = 'button'; fb.onclick = () => this.ctx.fadeTo('B'); xb.append(fa, fb); P.appendChild(this.prow('Ir para', 'Ir para A / B|O mesmo que os botões ao lado do fader.', xb));
    this.transformRows(P, E.compTransform, ' da composição inteira');
    this.fxRows(P, { fx: E.compFx }, 'da composição');
  }
  // parâmetros que alguns modos de mistura/transição têm: cor (to Color) e suavidade (Luma Key, Dissolve, Wipe…)
  mixerOptRows(P, modeId, opt, what) {
    const m = mixerById(modeId);
    if (m.color) P.appendChild(this.pcolor('Cor', 'Cor ' + what + (m.id === 'chromakey' ? '|A cor que some da camada (o verde ou o azul do fundo).' : '|A cor pela qual o modo "' + m.name + '" passa.'), mixerColor(m.id, opt), v => { opt.color = v; }));
    if (m.smooth) P.appendChild(this.pnum('Suavidade', 'Suavidade ' + what + '|Borda macia do modo "' + m.name + '".', Math.round((opt.smooth ?? 0.1) * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 10 }, v => { opt.smooth = v / 100; }));
  }
  renderLayer(P, L) {
    if (!L) return; const S = this.ctx.state;
    $('leftTitle').textContent = L.name;
    P.appendChild(this.ptext('Nome', 'Nome|O nome da camada, como aparece na grade.', L.name, v => { L.name = v || L.name; this.ctx.renderGrid(); }));
    this.autopilotRows(P, L.autopilot || (L.autopilot = AUTOPILOT()), (k, v) => { L.autopilot[k] = v; this.render(); });
    P.appendChild(this.phead('Camada', 'Camada|Controles da camada.'));
    P.appendChild(this.pnum('Master', 'Master|Opacidade da camada; o fader da grade é o mesmo.', Math.round(L.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { L.opacity = v / 100; this.ctx.renderGrid(); }));
    P.appendChild(this.phead('Vídeo', 'Vídeo|Como a camada entra na composição.'));
    P.appendChild(this.pselect('Mistura', 'Mistura|Como a camada entra sobre o que está embaixo, com os modos do Resolume. Até 50 % do fader a camada mistura; de 50 a 100 % vai ficando normal por cima. Os modos "50" misturam no fader inteiro.', MIXER_OPTS, L.blend === 'normal' ? 'alpha' : L.blend, v => { L.blend = v; }));
    P.appendChild(this.pseg('Rápidos', 'Rápidos|Cinco modos de mistura a um clique; a lista acima tem todos os outros.', [['alpha', 'Alpha'], ['add', 'Add'], ['multiply', 'Mult'], ['screen', 'Screen'], ['overlay', 'Over']], L.blend === 'normal' ? 'alpha' : L.blend, v => { L.blend = v; }));
    this.mixerOptRows(P, L.blend, L.blendOpt || (L.blendOpt = MIXER_OPT()), 'da mistura');
    P.appendChild(this.pselect('Bus', 'Bus do crossfader|A ou B: o crossfader embaixo da grade esmaece entre os dois lados. Nenhum: a camada não entra no crossfader.', [['', 'Nenhum'], ['A', 'A'], ['B', 'B']], L.bus || '', v => { L.bus = v || null; }));
    P.appendChild(this.pselect('Grupo', 'Grupo|Em que grupo a camada está. Grupos juntam camadas vizinhas numa só, com opacidade, mistura e efeitos próprios.', [['', 'Nenhum'], ...S.groups.map(g => [String(g.id), g.name])], L.group != null ? String(L.group) : '', v => this.ctx.setLayerGroup(S.selLayer, v ? +v : null)));
    P.appendChild(this.prow('Largura', '', el('span', 'pinfo', String(this.ctx.engine.W))));
    P.appendChild(this.prow('Altura', '', el('span', 'pinfo', String(this.ctx.engine.H))));
    P.appendChild(this.phead('Transição', 'Transição|Ao disparar outro clipe nesta camada, o anterior sai e o novo entra pelo modo escolhido, durante a duração. Como no Resolume: a transição é um modo de mistura rodado no tempo.'));
    P.appendChild(this.pselect('Modo', 'Modo da transição|Escolha da lista ou "Ao acaso", que sorteia um modo a cada disparo.', [['random', 'Ao acaso'], ...MIXER_OPTS], L.transMode || 'alpha', v => { L.transMode = v; }));
    P.appendChild(this.pnum('Duração', 'Duração da transição|0 corta seco. Até 10 s, como no Resolume.', L.transition || 0, { min: 0, max: 10, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v => { L.transition = v; }));
    if (L.transMode !== 'random') this.mixerOptRows(P, L.transMode, L.transOpt || (L.transOpt = MIXER_OPT()), 'da transição');
    this.transformRows(P, L.transform || (L.transform = { x: 0, y: 0, scale: 1, rot: 0 }), ' da camada');
    this.fxRows(P, L, 'da camada');
    if (S.layers.length > 1) P.appendChild(this.pbutton('Remover esta camada', 'Remover camada|Apaga a camada e os clipes dela.', () => this.ctx.removeLayer(S.selLayer)));
  }
  renderGroup(P, g) {
    if (!g) return; const S = this.ctx.state;
    $('leftTitle').textContent = g.name;
    P.appendChild(this.ptext('Nome', 'Nome|O nome do grupo, como aparece na grade.', g.name, v => { g.name = v || g.name; this.ctx.renderGrid(); }));
    P.appendChild(this.phead('Grupo', 'Grupo|Controles do grupo inteiro: as camadas dele entram na composição como uma só.'));
    P.appendChild(this.pnum('Master', 'Master|Opacidade do grupo; o fader da grade é o mesmo.', Math.round(g.opacity * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v => { g.opacity = v / 100; this.ctx.renderGrid(); }));
    P.appendChild(this.pnum('Velocidade', 'Velocidade|Multiplica a velocidade dos vídeos das camadas do grupo.', g.speed, { min: 0.1, max: 4, step: 0.05, dec: 2, unit: 'x', bar: true, reset: 1 }, v => { g.speed = v; this.ctx.applySpeed(); }));
    P.appendChild(this.phead('Vídeo', 'Vídeo|Como o grupo entra na composição.'));
    P.appendChild(this.pselect('Mistura', 'Mistura do grupo|Os mesmos modos da camada.', MIXER_OPTS, g.blend || 'alpha', v => { g.blend = v; }));
    this.mixerOptRows(P, g.blend, g.blendOpt || (g.blendOpt = MIXER_OPT()), 'da mistura');
    P.appendChild(this.pselect('Bus', 'Bus do crossfader|A ou B: o grupo inteiro entra no crossfader.', [['', 'Nenhum'], ['A', 'A'], ['B', 'B']], g.bus || '', v => { g.bus = v || null; }));
    P.appendChild(this.prow('Camadas', '', el('span', 'pinfo', S.layers.filter(L => L.group === g.id).map(L => L.name).join(', ') || 'nenhuma')));
    this.transformRows(P, g.transform || (g.transform = { x: 0, y: 0, scale: 1, rot: 0 }), ' do grupo');
    this.fxRows(P, g, 'do grupo');
    P.appendChild(this.pbutton('Adicionar camada ao grupo', 'Adicionar camada|Uma camada nova por cima das do grupo.', () => this.ctx.addLayerToGroup(g)));
    P.appendChild(this.pbutton('Remover o grupo (manter as camadas)', 'Remover grupo|As camadas ficam, soltas.', () => this.ctx.removeGroup(g, false)));
  }
  // transporte do vídeo: linha do tempo com entrada e saída, tocar para frente e para trás, modo, velocidade
  transportRows(P, clip) {
    const t = clip.tr, v = mediaOf(clip), S = this.ctx.state, dur = clip.dur || 0;
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
    // formato do Transport do Resolume: tipo, modo, ao voltar, velocidade (0–10) e duração editável (/2 ×2 mexem na velocidade)
    P.appendChild(this.pselect('Tipo', 'Tipo|Linha do tempo: a velocidade é a sua. BPM Sync: a faixa entre a entrada e a saída dura N batidas, presa ao relógio de BPM.', [['timeline', 'Linha do tempo'], ['bpm', 'BPM Sync']], t.sync || 'timeline', v2 => { t.sync = v2; if (v2 !== 'bpm') setRate(clip, S.speed); }));
    if (t.sync === 'bpm') P.appendChild(this.pselect('Batidas', 'Batidas|Quantas batidas a faixa do clipe dura.', BEATS.filter(x => x >= 1).map(x => [String(x), String(x)]), String(t.beats || 8), v2 => { t.beats = +v2; }));
    P.appendChild(this.pselect('Modo', 'Modo|Loop repete. Vai e volta inverte nas pontas. Aleatório pula pelo clipe. Uma vez e limpa: no fim, a camada sai do ar. Uma vez e segura: no fim, fica no último quadro.', PLAY_MODES, t.mode, v2 => { t.mode = v2; }));
    P.appendChild(this.pselect('Ao voltar', 'Ao voltar|O que acontece quando o clipe é disparado de novo depois de outro ter tocado na camada. Recomeça: da entrada. Continua: de onde parou. Relativo: na mesma altura em que estava o clipe que saiu.', AWAY_MODES, t.away || 'restart', v2 => { t.away = v2; }));
    P.appendChild(this.pnum('Velocidade', 'Velocidade|1x é a do arquivo; de 0 a 10x, como no Resolume.', clip.speed, { min: 0, max: 10, step: 0.01, dec: 2, unit: 'x', bar: true, reset: 1 }, v2 => { clip.speed = Math.max(0.01, v2); setRate(clip, S.speed); }));
    const faixa = (t.out || dur) - t.in, curDur = faixa / (clip.speed * S.speed);
    const setDur = (d) => { clip.speed = Math.max(0.01, Math.min(10, faixa / (Math.max(0.05, d) * S.speed))); setRate(clip, S.speed); };
    const drow = this.pnum('Duração', 'Duração|Quanto tempo a faixa entre a entrada e a saída leva para tocar. Mudar aqui muda a velocidade. /2 toca duas vezes mais rápido, ×2 duas vezes mais devagar.', +curDur.toFixed(2), { min: 0.05, max: 3600, step: 0.1, dec: 2, unit: ' s', reset: +faixa.toFixed(2) }, setDur);
    for (const [txt0, k] of [['/2', 0.5], ['×2', 2]]) { const b = el('button', 'mini', txt0); b.type = 'button'; b.title = k < 1 ? 'Metade da duração (velocidade em dobro)' : 'Dobro da duração (metade da velocidade)'; b.onclick = (e) => { e.stopPropagation(); setDur(curDur * k); this.render(); }; drow.querySelector('.pv').appendChild(b); }
    P.appendChild(drow);
    P.appendChild(this.pnum('Entrada', 'Entrada (cut in)|Onde o clipe começa, em segundos.', t.in, { min: 0, max: dur, step: 0.1, dec: 1, unit: ' s', bar: true, reset: 0 }, v2 => { t.in = Math.min(v2, (t.out || dur) - 0.1); }));
    P.appendChild(this.pnum('Saída', 'Saída (cut out)|Onde o clipe termina, em segundos.', t.out || dur, { min: 0, max: dur, step: 0.1, dec: 1, unit: ' s', bar: true, reset: dur }, v2 => { t.out = Math.max(v2, t.in + 0.1); }));
    P.appendChild(this.prow('Arquivo', 'Arquivo|Duração do arquivo inteiro.', el('span', 'pinfo', fmtT1(dur))));
    // arquivo preparado (H.264 todo intra ou DXV) toca no reprodutor próprio: ré e pulo lisos
    const prog = this.ctx.preparing(clip);
    if (clip.anim) P.appendChild(this.prow('Arquivo', 'Animação|GIF (ou WebP/AVIF) animado, quadro a quadro: ré, pulo e velocidade funcionam como num vídeo preparado.', el('span', 'pinfo ok', 'animação · ' + clip.player.frames + ' quadros · ' + clip.player.fps.toFixed(0) + ' fps')));
    else if (clip.player) P.appendChild(this.prow('Arquivo', 'Preparado|Cada quadro é chave e o OpenLume decodifica por conta própria: ré, pulo e esfregar sem travar.', el('span', 'pinfo ok', 'preparado · ' + (clip.player.allIntra ? 'todo intra' : clip.player.codec) + ' · ' + clip.player.fps.toFixed(0) + ' fps')));
    else if (prog != null) P.appendChild(this.prow('Preparando', '', el('span', 'pinfo', Math.round(prog * 100) + ' %')));
    else if (clip.path && !isPrepared(clip.name)) { P.appendChild(this.pbutton('Preparar (H.264 todo intra)', 'Preparar|Converte para H.264 com todos os quadros chave, como o DXV do Resolume: ré, pulo e esfregar ficam lisos. Cria nome.proj.mp4 ao lado do original.', () => this.ctx.prepare('h264'))); }
    else P.appendChild(this.prow('Arquivo', '', el('span', 'pinfo', 'solto na janela sem caminho; abra pelo painel Arquivos para poder preparar')));
    const a = clip.audio;
    P.appendChild(this.phead('Áudio', 'Áudio|O som do arquivo.'));
    P.appendChild(this.pnum('Volume', 'Volume|', Math.round(a.vol * 100), { min: 0, max: 100, step: 1, unit: ' %', bar: true, reset: 100 }, v2 => { a.vol = v2 / 100; applyAudio(clip); }));
    P.appendChild(this.pnum('Pan', 'Pan|Esquerda −100, direita 100.', Math.round(a.pan * 100), { min: -100, max: 100, step: 1, bar: true, reset: 0 }, v2 => { a.pan = v2 / 100; applyAudio(clip); }));
    P.appendChild(this.pcheck('Mudo', 'Mudo|', a.mute, v2 => { a.mute = v2; applyAudio(clip); }, a.mute ? 'sem som' : 'com som'));
    this.audioFxRows(P, clip);
  }
  // cadeia de efeitos de áudio do clipe (os seis do Resolume), com os parâmetros
  audioFxRows(P, clip) {
    const list = clip.afx || (clip.afx = []);
    P.appendChild(this.phead('Efeitos de áudio', 'Efeitos de áudio|Arraste um efeito de áudio do painel Efeitos para cá. A ordem é de cima para baixo.'));
    list.forEach((f, i) => {
      const def = audioFxById(f.id); if (!def) return;
      const h = el('div', 'phead fxh'); h.dataset.help = def.name + '|' + def.desc;
      const by = el('label', 'ck' + (f.bypass ? '' : ' on')); by.innerHTML = f.bypass ? ICON.itemOff : ICON.item; by.title = 'Liga e desliga o efeito'; by.onclick = () => { f.bypass = !f.bypass; rebuildAudioFx(clip); this.render(); };
      const up = el('button', 'mini', '▲'); up.type = 'button'; up.title = 'Subir'; up.disabled = i === 0; up.onclick = () => { list.splice(i - 1, 2, list[i], list[i - 1]); rebuildAudioFx(clip); this.render(); };
      const x = el('button', 'mini', '✕'); x.type = 'button'; x.title = 'Tirar o efeito'; x.onclick = () => { list.splice(i, 1); rebuildAudioFx(clip); this.render(); };
      h.append(by, el('span', '', def.name), up, x); P.appendChild(h);
      if (!f.bypass) for (const p of def.params) P.appendChild(this.pnum(p.label, def.name + ' · ' + p.label + '|' + def.desc, f.params[p.key] ?? p.def, { min: p.min, max: p.max, step: p.step, dec: p.step < 1 ? 2 : 0, unit: p.unit, bar: true, reset: p.def }, v => { f.params[p.key] = v; updateAudioFx(clip, f); }));
    });
    const dz = el('div', 'dropzone', list.length ? 'Solte outro efeito de áudio aqui' : 'Solte um efeito de áudio aqui'); dz.dataset.help = 'Soltar efeito de áudio|Arraste do painel Efeitos (parte de baixo).';
    dz.ondragover = (e) => { const d = this.ctx.drag(); if (d && d.afx) { e.preventDefault(); dz.classList.add('over'); } };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const d = this.ctx.drag(); if (d && d.afx) { const f = AUDIO_FX.find(a => a.id === d.afx); if (f) { const params = {}; for (const p of f.params) params[p.key] = p.def; list.push({ id: f.id, params, bypass: false }); rebuildAudioFx(clip); this.render(); } } };
    P.appendChild(dz);
  }
  // chamado a cada quadro: move o cursor da linha do tempo sem redesenhar o painel
  tick() {
    if (this.tl && mediaOf(this.tl.clip) && document.body.contains(this.tl.place ? $('clipPan') : null)) { try { this.tl.place(); } catch { } }
    const AU = this.ctx.audio; if (AU && this.tab === 'comp') for (const w of $('leftPan').querySelectorAll('.meter')) w.firstChild.style.height = Math.round((AU.levels[w.dataset.band] || 0) * 100) + '%';
  }
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
      for (const p of def.params) this.paramRows(P, clip, p, def.name + ' · ' + p.label + '|' + def.desc);
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
    else if (clip.kind === 'capture') {
      if (clip.cap.url) P.appendChild(this.ptext('Endereço', 'Endereço|A página que o navegador escondido mostra. Mudar aqui abre outra página no mesmo clipe.', clip.cap.url, v => { if (v && v !== clip.cap.url) { captureNavigate(clip, v); this.ctx.renderGrid(); } }));
      P.appendChild(this.prow('Captura', '', el('span', 'pinfo', (clip.cap.url ? 'página web' : clip.cap.srcName) + ' · ' + clip.w + ' × ' + clip.h)));
    }
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
    P.appendChild(this.pselect('Mistura', 'Mistura do clipe|Vazio usa a da camada.', [['', 'Como a camada'], ...MIXER_OPTS], clip.blend === 'normal' ? 'alpha' : (clip.blend || ''), v => { clip.blend = v; }));
    if (clip.kind !== 'source' && clip.kind !== 'text') P.appendChild(this.prow('Tamanho', '', el('span', 'pinfo', clip.w + ' × ' + clip.h)));
    P.appendChild(this.phead('Disparo', 'Disparo|Como a casa reage ao clique.'));
    P.appendChild(this.pseg('Estilo', 'Estilo de disparo|Normal: clique dispara. Piano: fica no ar só enquanto o botão está apertado. Alternar: clicar de novo tira do ar.', [['normal', 'Normal'], ['piano', 'Piano'], ['toggle', 'Alternar']], clip.trig || 'normal', v => { clip.trig = v; this.ctx.renderGrid(); }));
    P.appendChild(this.pcheck('Coluna', 'Ignorar disparo de coluna|A casa não entra quando a coluna inteira é disparada.', !!clip.ignoreColumn, v => { clip.ignoreColumn = v; }, clip.ignoreColumn ? 'ignora o disparo da coluna' : 'entra com a coluna'));
    if (clip.kind !== 'source' && clip.kind !== 'text') P.appendChild(this.pselect('Ajuste', 'Ajuste na tela|Encaixar mantém a proporção com faixas; Preencher corta; Esticar deforma.', Object.entries(FITS), clip.fit, v => { clip.fit = v; }));
    this.transformRows(P, clip.transform, ' do clipe');
    this.fxRows(P, clip, 'do clipe');
  }
}
