// Akai APC40 mkII com compatibilidade nativa: ligar o cabo e funcionar, sem amarrar nada.
// O mapa segue o que o Resolume instala para ela (default/Shortcuts/MIDI/APC 40 MK II.xml):
//   - pads (notas 0–39, canal 1): linhas de baixo para cima = camadas 1, 2, 3, 4 (de baixo);
//     a linha de cima dispara as colunas 1–8; cor do pad pelo estado da casa (vazia, guardada,
//     no ar, no ar e selecionada), com os mesmos números de cor do Resolume;
//   - botões de pista (mesma nota nos canais 1–8 = camada 1–8 de baixo): 48 desligar (B),
//     49 solo (S), 50 clipe anterior, 66 próximo clipe, 52 limpar (X);
//   - faders CC 7 por canal = opacidade da camada; master CC 14 = master; crossfader CC 15;
//     knobs da direita CC 16–23 = os 8 primeiros parâmetros do clipe selecionado; knobs de
//     pista CC 48–55 = o primeiro parâmetro do primeiro efeito da camada; cue level CC 47 =
//     posição do clipe selecionado; CC 13 = BPM;
//   - scene launch 82–86 selecionam as camadas 5…1; 80 seleciona a composição; 81 para tudo;
//     96/97 próxima/anterior coluna; 60/61 deck anterior/próximo; 90 RESYNC (com Shift:
//     metrônomo); 99 TAP; 100/101 nudge; 91 Play; 93 Record; 98 Shift;
//   - setas ▲▼ (94/95) mudam a janela de camadas de 4 em 4; Shift + ◀▶ muda a janela de colunas.
// Ao ligar, o programa põe a controladora no modo "Ableton Live" por SysEx, em que os LEDs
// dos botões são do programa. Web MIDI (Chromium) com SysEx; a permissão é dada em main.js.
const PAD = { empty: 1, stored: 33, on: 52, onSel: 53 };   // cores do Resolume (velocity)
const ROWS = 4, COLS = 8;

export class APC40 {
  constructor(ctx) {
    this.ctx = ctx; this.access = null; this.in = null; this.out = null; this.name = ''; this.enabled = true; this.err = '';
    this.shift = false; this.rowBase = 0; this.colBase = 0; this.last = new Map(); this.inputs = []; this.outputs = [];
  }
  async init() {
    if (!navigator.requestMIDIAccess) { this.err = 'Web MIDI indisponível'; return; }
    try { this.access = await navigator.requestMIDIAccess({ sysex: true }); } catch (e) { this.err = e.message || String(e); return; }
    this.access.onstatechange = () => this.scan();
    this.scan();
  }
  scan() {
    if (!this.access) return;
    this.inputs = [...this.access.inputs.values()].map(p => p.name); this.outputs = [...this.access.outputs.values()].map(p => p.name);
    const isApc = (p) => /APC40/i.test(p.name || '');
    let i = null, o = null;
    for (const p of this.access.inputs.values()) if (isApc(p) && !i) i = p;
    for (const p of this.access.outputs.values()) if (isApc(p) && !o) o = p;
    if (i !== this.in) { if (this.in) this.in.onmidimessage = null; this.in = i; if (i) i.onmidimessage = (e) => { if (this.enabled) this.handle(e.data); }; }
    if (o !== this.out) { this.out = o; this.last.clear(); if (o) { this.intro(); this.refresh(true); } }
    const was = this.name; this.name = i ? i.name : '';
    if (was !== this.name) this.ctx.onStatus(this.name);
  }
  // modo Ableton Live (0x41): botões momentâneos, LEDs dos botões pelo programa, anéis dos knobs pela própria controladora
  intro() { try { this.out.send([0xF0, 0x47, 0x7F, 0x29, 0x60, 0x00, 0x04, 0x41, 0x09, 0x07, 0x01, 0xF7]); } catch { } }
  setEnabled(on) { this.enabled = on; if (on) this.refresh(true); else this.allOff(); }
  allOff() { if (!this.out) return; for (let n = 0; n < 40; n++) this.send(0x90, n, 0); for (let ch = 0; ch < 8; ch++) for (const n of [48, 49, 50, 52, 66]) this.send(0x90 + ch, n, 0); for (const n of [80, 81, 82, 83, 84, 85, 86, 90, 91, 93]) this.send(0x90, n, 0); }

  // camada pelo índice de baixo (0 = a de baixo), com a janela das setas ▲▼
  layerAt(fromBottom) { const S = this.ctx.state, li = S.layers.length - 1 - (fromBottom + this.rowBase); return li >= 0 && li < S.layers.length ? li : -1; }
  handle(d) {
    const st = d[0] & 0xF0, ch = d[0] & 0x0F, n = d[1], v = d[2];
    if (st === 0x90 || st === 0x80) this.note(ch, n, st === 0x90 && v > 0);
    else if (st === 0xB0) this.cc(ch, n, v);
  }
  note(ch, n, on) {
    const C = this.ctx, S = C.state;
    if (n === 98) { this.shift = on; return; }
    if (n < 40) {                                     // pads
      if (!on) return;
      const row = n >> 3, col = (n & 7) + this.colBase;
      if (row === ROWS) { if (col < C.cols()) C.triggerColumn(col); return; }
      const li = this.layerAt(row); if (li < 0 || col >= C.cols()) return;
      const L = S.layers[li], clip = L.clips[col];
      if (clip && clip.trig === 'toggle' && L.on === col) C.eject(li); else C.trigger(li, col);
      return;
    }
    if (n === 48 || n === 49 || n === 50 || n === 52 || n === 66) {   // botões de pista: canal = camada de baixo
      if (!on) return;
      const li = this.layerAt(ch); if (li < 0) return;
      const L = S.layers[li];
      if (n === 48) { L.bypass = !L.bypass; C.render(); }
      else if (n === 49) { L.solo = !L.solo; C.render(); }
      else if (n === 50) C.stepClip(li, -1);
      else if (n === 66) C.stepClip(li, 1);
      else C.eject(li);
      return;
    }
    if (!on) { if (n === 100 || n === 101) C.nudge(0); return; }
    if (n >= 82 && n <= 86) { const li = this.layerAt(86 - n); if (li >= 0) C.selectLayer(li); return; }
    if (n === 80) { C.selectComp(); return; }
    if (n === 81) { C.stopAll(); return; }
    if (n === 96 || n === 97) { if (this.shift) { this.colBase = Math.max(0, Math.min(Math.max(0, C.cols() - COLS), this.colBase + (n === 96 ? COLS : -COLS))); this.refresh(true); } else C.stepColumn(n === 96 ? 1 : -1); return; }
    if (n === 94 || n === 95) { const max = Math.max(0, S.layers.length - ROWS); this.rowBase = Math.max(0, Math.min(max, this.rowBase + (n === 94 ? ROWS : -ROWS))); this.refresh(true); return; }
    if (n === 60 || n === 61) { C.stepDeck(n === 61 ? 1 : -1); return; }
    if (n === 90) { if (this.shift) C.metronome(); else C.resync(); return; }
    if (n === 99) { C.tap(); return; }
    if (n === 100 || n === 101) { C.nudge(n === 101 ? 1 : -1); return; }
    if (n === 91) { C.playAll(1); return; }
    if (n === 93) { C.record(); return; }
  }
  cc(ch, n, v) {
    const C = this.ctx, f = v / 127;
    if (n === 7) { const li = this.layerAt(ch); if (li >= 0) C.setOpacity(li, f); return; }
    if (n === 14) { C.setMaster(f); return; }
    if (n === 15) { C.setXfade(f); return; }
    if (n === 13) { C.setBpm(20 + f * 480); return; }
    if (n === 47) { C.seekSelected(f); return; }
    if (n >= 16 && n <= 23) { C.clipKnob(n - 16, f); return; }
    if (n >= 48 && n <= 55) { const li = this.layerAt(n - 48); if (li >= 0) C.layerKnob(li, f); return; }
  }

  // ---------- LEDs ----------
  send(status, d1, d2) {
    const k = status * 256 + d1; if (this.last.get(k) === d2) return; this.last.set(k, d2);
    try { this.out.send([status, d1, d2]); } catch { }
  }
  // o que cada LED deve mostrar agora, pelo estado da grade
  leds() {
    const C = this.ctx, S = C.state, out = [], sel = S.sel, cols = C.cols();
    for (let row = 0; row < ROWS; row++) {
      const li = this.layerAt(row);
      for (let c = 0; c < COLS; c++) {
        const col = c + this.colBase, L = li >= 0 ? S.layers[li] : null, clip = L && col < cols ? L.clips[col] : null;
        let color = clip ? (L.on === col ? (sel && sel.l === li && sel.c === col ? PAD.onSel : PAD.on) : PAD.stored) : (L ? PAD.empty : 0), status = 0x90;
        if (clip && C.waiting(li, col)) { status = 0x9D; color = PAD.on; }   // esperando o Beat Snap: pisca
        out.push([status, row * 8 + c, color]);
      }
    }
    for (let c = 0; c < COLS; c++) {   // linha de cima: colunas
      const col = c + this.colBase, tem = S.layers.filter(L => L.clips[col]);
      out.push([0x90, 32 + c, col < cols ? (tem.length && tem.every(L => L.on === col) ? PAD.stored : PAD.empty) : 0]);
    }
    for (let ch = 0; ch < 8; ch++) {   // botões de pista
      const li = this.layerAt(ch), L = li >= 0 ? S.layers[li] : null;
      out.push([0x90 + ch, 48, L && L.bypass ? 127 : 0], [0x90 + ch, 49, L && L.solo ? 127 : 0], [0x90 + ch, 50, L ? 1 : 0], [0x90 + ch, 66, L ? 1 : 0], [0x90 + ch, 52, L && L.on >= 0 ? 127 : (L ? 1 : 0)]);
    }
    for (let i = 0; i < 5; i++) { const li = this.layerAt(i); out.push([0x90, 86 - i, li >= 0 ? (li === S.selLayer && C.layerTab() ? PAD.stored : PAD.empty) : 0]); }
    out.push([0x90, 80, C.layerTab() ? 0 : 127], [0x90, 81, 1], [0x90, 90, S.bpm.metronome ? 127 : 1], [0x90, 91, 127], [0x90, 93, C.recording() ? 127 : 1], [0x90, 99, 1], [0x90, 100, 1], [0x90, 101, 1], [0x90, 94, this.rowBase > 0 ? 127 : 1], [0x90, 95, this.rowBase + ROWS < S.layers.length ? 127 : 1], [0x90, 96, 1], [0x90, 97, 1], [0x90, 60, S.decks.length > 1 ? 127 : 1], [0x90, 61, S.decks.length > 1 ? 127 : 1]);
    return out;
  }
  refresh(force) {
    if (!this.out || !this.enabled) return;
    if (force) this.last.clear();
    for (const [s, d1, d2] of this.leds()) this.send(s, d1, d2);
  }
}
