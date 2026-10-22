// O painel de navegação da direita, como no Resolume: Arquivos · Composições · Efeitos ·
// Fontes · Gravar, com a caixa de ajuda embaixo.
import { el, ICON } from './panel.js';
import { EFFECTS } from './effects.js';
import { AUDIO_FX } from './audio.js';
import { SOURCES } from './sources.js';
import { isVideoName, isImageName, mediaUrl } from './clips.js';
import { isPrepared } from './player.js';

const $ = (id) => document.getElementById(id);
const fmtDate = (ms) => { const d = new Date(ms); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

export class Browser {
  // ctx: { desktop (ponte ou null), toast, setDrag(d), preview(path|null), putInSelection(d), addEffectToSelection(id), comps:{save(name), saveAs(name), open(name), newComp(), current()}, recorder }
  constructor(ctx) {
    this.c = ctx; this.tab = 'files'; this.dir = ''; this.roots = []; this.favs = []; this.search = ''; this.listing = null; this.favFx = []; this.cameras = []; this.compList = [];
    $('browserTabs').onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) this.setTab(t.dataset.tab); };
    $('browserPan').addEventListener('mouseover', (e) => { const h = e.target.closest('[data-help]'); if (!h) return; const [t, b] = h.dataset.help.split('|'); $('browserHelp').querySelector('.hh').textContent = t; $('browserHelp').querySelector('.hb').textContent = b || ''; });
    this.init();
  }
  async init() {
    const D = this.c.desktop;
    if (D) {
      try { this.roots = await D.fs.roots(); } catch { }
      try { const p = await D.prefs.get(); this.favs = p.favorites || []; this.favFx = p.favFx || []; this.dir = p.lastDir || (this.roots[0] && this.roots[0].path) || ''; } catch { }
    }
    this.render();
  }
  setTab(t) { this.tab = t; this.render(); }
  savePrefs() { if (this.c.desktop) this.c.desktop.prefs.set({ favorites: this.favs, favFx: this.favFx, lastDir: this.dir }).catch(() => { }); }
  render() {
    $('browserTabs').querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab));
    const P = $('browserPan'); P.textContent = ''; P.className = 'pbody browser ' + this.tab;
    ({ files: () => this.renderFiles(P), comps: () => this.renderComps(P), fx: () => this.renderFx(P), src: () => this.renderSrc(P), rec: () => this.renderRec(P) })[this.tab]();
  }
  searchBox(P, help) {
    const s = el('input', 'search'); s.type = 'search'; s.placeholder = 'Buscar'; s.value = this.search; s.dataset.help = help || 'Buscar|Filtra a lista pelo nome.';
    s.oninput = () => { this.search = s.value; this.render(); const n = $('browserPan').querySelector('input.search'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
    s.onkeydown = (e) => e.stopPropagation(); P.appendChild(s);
  }
  match(name) { return !this.search || name.toLowerCase().includes(this.search.toLowerCase()); }
  // ---------- Arquivos ----------
  async renderFiles(P) {
    const D = this.c.desktop;
    if (!D) { P.appendChild(el('div', 'vazio', 'O navegador de arquivos precisa do programa instalado.')); return; }
    const bar = el('div', 'fbar');
    const up = el('button', 'ib'); up.innerHTML = '⬆'; up.title = 'Pasta de cima'; up.dataset.help = 'Pasta de cima|Sobe um nível.'; up.onclick = () => { const p = this.dir.replace(/[\\/]+$/, '').split(/[\\/]/); p.pop(); const parent = p.join('\\') + (p.length === 1 ? '\\' : ''); if (parent) this.go(parent); };
    const sel = el('select'); sel.dataset.help = 'Pastas|Pastas principais e favoritas.';
    const opts = [...this.roots.map(r => [r.path, r.name]), ...this.favs.map(f => [f, '♥ ' + f])];
    if (this.dir && !opts.some(o => o[0] === this.dir)) opts.unshift([this.dir, this.dir]);
    for (const [v, t] of opts) { const o = el('option', '', t); o.value = v; sel.appendChild(o); } sel.value = this.dir;
    sel.onchange = () => this.go(sel.value);
    const fav = el('button', 'ib' + (this.favs.includes(this.dir) ? ' on' : '')); fav.innerHTML = ICON.heart; fav.title = 'Favorita'; fav.dataset.help = 'Favorita|Guarda esta pasta na lista.';
    fav.onclick = () => { if (this.favs.includes(this.dir)) this.favs = this.favs.filter(f => f !== this.dir); else this.favs.push(this.dir); this.savePrefs(); this.render(); };
    bar.append(up, sel, fav); P.appendChild(bar);
    this.searchBox(P, 'Buscar|Filtra os arquivos desta pasta.');
    const list = el('div', 'flist'); P.appendChild(list);
    let L = this.listing;
    if (!L || L.dir !== this.dir) { try { L = this.listing = await D.fs.list(this.dir); } catch (e) { list.appendChild(el('div', 'vazio', 'Não consegui abrir: ' + e.message)); return; } }
    if (L.dir !== this.dir) return;
    for (const d of L.dirs) { if (!this.match(d.name)) continue; const r = el('div', 'item dir'); r.dataset.help = 'Pasta|Clique para entrar.'; r.innerHTML = '<i>▸</i><b>📁</b>'; r.appendChild(el('span', '', d.name)); r.onclick = () => this.go(d.path); list.appendChild(r); }
    for (const f of L.files) {
      if (!this.match(f.name)) continue;
      const r = el('div', 'item file'); r.draggable = true; r.dataset.help = f.name + '|Arraste para uma casa da grade. Duplo clique mostra na prévia.';
      const ic = el('i', 'th'); if (isImageName(f.name)) ic.style.backgroundImage = 'url("' + mediaUrl(f.path) + '")'; else if (isVideoName(f.name)) ic.textContent = '▶'; else ic.textContent = '✎';
      r.append(ic, el('span', '', f.name), el('small', '', f.size > 1e6 ? (f.size / 1e6).toFixed(1) + ' MB' : Math.round(f.size / 1e3) + ' kB'));
      if (isVideoName(f.name) && !isPrepared(f.name) && this.c.prepareFile) {   // H.264 todo intra ao lado do original
        const prog = this.c.preparingFile(f.path);
        const b = el('button', 'ib prep', prog != null ? Math.round(prog * 100) + ' %' : '⚙'); b.title = 'Preparar'; b.dataset.help = 'Preparar|Converte para H.264 com todos os quadros chave (como o DXV do Resolume): ré, pulo e esfregar lisos. Cria ' + f.name.replace(/\.[^.]+$/, '') + '.proj.mp4 nesta pasta.';
        b.onclick = (e) => { e.stopPropagation(); if (prog == null) this.c.prepareFile(f.path); }; b.draggable = false; r.appendChild(b);
      }
      r.ondragstart = (e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', f.path); this.c.setDrag({ path: f.path, name: f.name }); };
      r.ondragend = () => this.c.setDrag(null);
      r.ondblclick = () => this.c.preview(f.path, f.name);
      r.onclick = () => { list.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); r.classList.add('sel'); };
      list.appendChild(r);
    }
    if (!list.children.length) list.appendChild(el('div', 'vazio', 'Nenhum vídeo, imagem ou SVG aqui.'));
  }
  go(dir) { this.dir = dir; this.search = ''; this.savePrefs(); this.render(); }
  // ---------- Composições ----------
  async renderComps(P) {
    const D = this.c.desktop, cur = this.c.comps.current();
    const bar = el('div', 'fbar');
    const bNew = el('button', '', 'Nova'); bNew.dataset.help = 'Nova composição|Limpa a grade. O que não foi salvo se perde.'; bNew.onclick = () => this.c.comps.newComp();
    const bSave = el('button', '', 'Salvar'); bSave.dataset.help = 'Salvar|Grava a composição atual com o nome dela.'; bSave.onclick = () => cur ? this.c.comps.save(cur) : this.saveAs();
    const bAs = el('button', '', 'Salvar como…'); bAs.dataset.help = 'Salvar como|Grava com outro nome.'; bAs.onclick = () => this.saveAs();
    bar.append(bNew, bSave, bAs); P.appendChild(bar);
    if (this.askName) { const row = el('div', 'fbar'); const i = el('input'); i.placeholder = 'nome da composição'; i.value = cur || ''; i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && i.value.trim()) { this.askName = false; this.c.comps.save(i.value.trim()); } if (e.key === 'Escape') { this.askName = false; this.render(); } }; const ok = el('button', '', 'OK'); ok.onclick = () => { if (i.value.trim()) { this.askName = false; this.c.comps.save(i.value.trim()); } }; row.append(i, ok); P.appendChild(row); setTimeout(() => i.focus(), 0); }
    this.searchBox(P);
    const list = el('div', 'flist'); P.appendChild(list);
    if (!D) { list.appendChild(el('div', 'vazio', 'Composições salvas precisam do programa instalado.')); return; }
    try { this.compList = await D.comps.list(); } catch { this.compList = []; }
    for (const c of this.compList) {
      if (!this.match(c.name)) continue;
      const r = el('div', 'item comp' + (c.name === cur ? ' cur' : '')); r.dataset.help = c.name + '|Duplo clique abre. ✕ apaga.';
      r.append(el('b', '', c.name), el('small', '', c.layers + (c.layers === 1 ? ' camada · ' : ' camadas · ') + fmtDate(c.mtime)));
      const x = el('button', 'mini', '✕'); x.title = 'Apagar'; x.onclick = (e) => { e.stopPropagation(); D.comps.remove(c.name).then(() => this.render()); }; r.appendChild(x);
      r.ondblclick = () => this.c.comps.open(c.name);
      list.appendChild(r);
    }
    if (!this.compList.length) list.appendChild(el('div', 'vazio', 'Nenhuma composição salva. Monte a grade e clique em Salvar.'));
  }
  saveAs() { this.askName = true; this.render(); }
  // ---------- Efeitos ----------
  renderFx(P) {
    this.searchBox(P, 'Buscar|Filtra os efeitos pelo nome.');
    const list = el('div', 'flist'); P.appendChild(list);
    list.appendChild(el('div', 'grp', 'EFEITOS DE VÍDEO'));
    const items = [...EFFECTS].sort((a, b) => (this.favFx.includes(b.id) - this.favFx.includes(a.id)) || a.name.localeCompare(b.name));
    for (const e of items) {
      if (!this.match(e.name)) continue;
      const r = el('div', 'item fx'); r.draggable = true; r.dataset.help = e.name + '|' + e.desc + ' Arraste para um clipe, camada ou composição; duplo clique põe no clipe selecionado.';
      const fav = el('i', 'fav' + (this.favFx.includes(e.id) ? ' on' : '')); fav.innerHTML = ICON.heart; fav.title = 'Favorito'; fav.onclick = (ev) => { ev.stopPropagation(); if (this.favFx.includes(e.id)) this.favFx = this.favFx.filter(x => x !== e.id); else this.favFx.push(e.id); this.savePrefs(); this.render(); };
      r.append(el('span', '', e.name), fav);
      r.ondragstart = (ev) => { ev.dataTransfer.effectAllowed = 'copy'; ev.dataTransfer.setData('text/plain', 'fx:' + e.id); this.c.setDrag({ effect: e.id }); };
      r.ondragend = () => this.c.setDrag(null);
      r.ondblclick = () => this.c.addEffectToSelection(e.id);
      list.appendChild(r);
    }
    list.appendChild(el('div', 'grp', 'EFEITOS DE ÁUDIO'));
    for (const e of AUDIO_FX) {
      if (!this.match(e.name)) continue;
      const r = el('div', 'item fx'); r.draggable = true; r.dataset.help = e.name + '|' + e.desc + ' Arraste para um clipe de vídeo; duplo clique põe no clipe selecionado.';
      r.append(el('span', '', e.name));
      r.ondragstart = (ev) => { ev.dataTransfer.effectAllowed = 'copy'; ev.dataTransfer.setData('text/plain', 'afx:' + e.id); this.c.setDrag({ afx: e.id }); };
      r.ondragend = () => this.c.setDrag(null);
      r.ondblclick = () => this.c.addAudioFxToSelection(e.id);
      list.appendChild(r);
    }
  }
  // ---------- Fontes ----------
  async renderSrc(P) {
    this.searchBox(P, 'Buscar|Filtra as fontes pelo nome.');
    const list = el('div', 'flist'); P.appendChild(list);
    list.appendChild(el('div', 'grp', 'FONTES DE VÍDEO'));
    const mk = (name, desc, d) => {
      const r = el('div', 'item src'); r.draggable = true; r.dataset.help = name + '|' + desc + ' Arraste para uma casa; duplo clique põe na casa selecionada.';
      r.appendChild(el('span', '', name));
      r.ondragstart = (ev) => { ev.dataTransfer.effectAllowed = 'copy'; ev.dataTransfer.setData('text/plain', 'src'); this.c.setDrag(d); };
      r.ondragend = () => this.c.setDrag(null);
      r.ondblclick = () => this.c.putInSelection(d);
      list.appendChild(r);
    };
    for (const s of [...SOURCES].sort((a, b) => a.name.localeCompare(b.name))) if (this.match(s.name)) mk(s.name, s.desc, { source: s.id });
    if (this.match('Text Block')) mk('Text Block', 'Texto escrito com as fontes do Windows.', { text: true });
    if (this.match('Laser')) mk('Laser (espelho)', 'O que o LaserCube está desenhando aparece na projeção, no mesmo lugar.', { lasermirror: true });
    list.appendChild(el('div', 'grp', 'DISPOSITIVOS DE CAPTURA'));
    try { if (!this.cameras.length) this.cameras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch { }
    if (!this.cameras.length) list.appendChild(el('div', 'vazio', 'Nenhuma câmera encontrada.'));
    this.cameras.forEach((cam, i) => { const name = cam.label || ('Câmera ' + (i + 1)); if (this.match(name)) mk(name, 'Câmera ligada ao computador.', { camera: { id: cam.deviceId, label: name } }); });
    list.appendChild(el('div', 'grp dim', 'NDI · SPOUT · VIDEO ROUTER'));
    list.appendChild(el('div', 'vazio', 'Fora por enquanto (ver o rumo).'));
  }
  // ---------- Gravar ----------
  renderRec(P) {
    const R = this.c.recorder, o = R.opts;
    const top = el('div', 'fbar rec');
    const b = el('button', 'recbtn' + (R.state === 'recording' ? ' on' : R.state === 'armed' ? ' armed' : ''), R.state === 'recording' ? '■ PARAR  ' + R.elapsed() : R.state === 'armed' ? '● ARMADO' : '● RECORD'); b.dataset.help = 'Gravar|Grava a composição (ou uma tela) em WebM. Clique de novo para parar.';
    b.onclick = () => { if (R.state === 'idle') R.start(); else R.stop(); this.render(); };
    top.appendChild(b); P.appendChild(top);
    const row = (label, ctl, help) => { const r = el('div', 'rrow'); if (help) r.dataset.help = help; r.append(el('span', '', label), ctl); return r; };
    const sel = (opts, cur, set) => { const s = el('select'); for (const [v, t] of opts) { const op = el('option', '', t); op.value = v; s.appendChild(op); } s.value = cur; s.onchange = () => { set(s.value); this.render(); }; return s; };
    const num = (v, set, min, max) => { const i = el('input'); i.type = 'number'; i.value = v; i.min = min; i.max = max; i.onchange = () => set(+i.value); i.onkeydown = (e) => e.stopPropagation(); return i; };
    P.appendChild(el('div', 'grp', 'AJUSTES'));
    const grid = el('div', 'rgrid');
    grid.appendChild(row('Fonte', sel([['comp', 'Composição'], ...R.screens().map(s => ['screen:' + s.id, s.name])], o.source, v => { o.source = v; }), 'Fonte|O que vai para o arquivo: a composição inteira ou uma tela.'));
    grid.appendChild(row('Depois de gravar', sel([['clip', 'Virar clipe na grade'], ['show', 'Mostrar na pasta'], ['nothing', 'Nada']], o.after, v => { o.after = v; }), 'Depois de gravar|O que fazer quando a gravação termina. "Virar clipe": a gravação entra na primeira casa vazia da camada selecionada, como no Resolume.'));
    grid.appendChild(row('Mídia', sel([['video', 'Só vídeo'], ['video+mic', 'Vídeo e microfone']], o.media, v => { o.media = v; }), 'Mídia|Com ou sem o som do microfone.'));
    grid.appendChild(row('Preset', sel([['high', 'WebM alta qualidade'], ['normal', 'WebM normal'], ['low', 'WebM leve']], o.preset, v => { o.preset = v; }), 'Preset|Taxa de bits do vídeo.'));
    grid.appendChild(row('Início', sel([['now', 'Imediato'], ['trigger', 'No próximo disparo'], ['after', 'Depois de N s']], o.start, v => { o.start = v; }), 'Início|Quando começa a gravar depois de apertar Record.'));
    if (o.start === 'after') grid.appendChild(row('N s', num(o.startSecs, v => { o.startSecs = v; }, 1, 3600)));
    grid.appendChild(row('Parada', sel([['manual', 'Manual'], ['after', 'Depois de N s'], ['ended', 'Quando os clipes acabarem']], o.stop, v => { o.stop = v; }), 'Parada|Quando parar.'));
    if (o.stop === 'after') grid.appendChild(row('N s', num(o.stopSecs, v => { o.stopSecs = v; }, 1, 36000)));
    P.appendChild(grid);
    P.appendChild(el('div', 'grp', 'ARQUIVOS'));
    const list = el('div', 'flist'); P.appendChild(list);
    if (!R.files.length) list.appendChild(el('div', 'vazio', 'Aperte Record!'));
    for (const f of [...R.files].reverse()) { const r = el('div', 'item file'); r.dataset.help = f.name + '|Duplo clique mostra o arquivo na pasta.'; r.append(el('i', 'th', '▶'), el('span', '', f.name), el('small', '', (f.size / 1e6).toFixed(1) + ' MB')); r.ondblclick = () => this.c.desktop && this.c.desktop.rec.show(f.path); list.appendChild(r); }
  }
}
