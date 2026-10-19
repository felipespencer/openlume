// Relógio de BPM: as batidas correm o tempo todo (4 por compasso); TAP,
// nudge, /2 ×2, RESYNC, metrônomo e pausa; Beat Snap segura os disparos até a próxima batida;
// qualquer parâmetro de efeito ou fonte pode animar na batida com formas prontas
// (4 to the Floor, On Off, Random, Step, LFO, Saw…). O código é nosso.
export const BPM = () => ({ bpm: 120, running: true, beat: 0, nudge: 0, nudgePct: 5, metronome: false, snap: 0 });
export const SNAPS = [[0, 'Desligado'], [0.25, '1/4 de batida'], [0.5, '1/2 batida'], [1, '1 batida'], [2, '2 batidas'], [4, '1 compasso (4)'], [8, '2 compassos (8)'], [16, '4 compassos (16)']];
export const BEATS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64];
export const SHAPES = [['4floor', '4 to the Floor'], ['1floor', '1 to the Floor'], ['onoff', 'On Off'], ['random', 'Random'], ['step12', 'Step 1 2'], ['step1234', 'Step 1 2 3 4'], ['lfo', 'LFO'], ['saw', 'Saw'], ['updown', 'Up N Down'], ['jittery', 'Jittery'], ['adsr', 'ADSR'], ['ease', 'EasyEase'], ['fft', 'FFT (som)']];
export const ANIM = (p) => ({ shape: '4floor', beats: 4, min: p.min, max: p.max });
export const effBpm = (B) => B.bpm * (1 + (B.nudge || 0) / 100);
export function advance(B, dt) { if (B.running) B.beat += dt * effBpm(B) / 60; }
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// valor 0..1 de uma forma na fase (0..1) do ciclo; cycle é o número do ciclo (para as aleatórias)
export function shapeValue(shape, phase, cycle) {
  switch (shape) {
    case '4floor': return 1 - (phase * 4 % 1);
    case '1floor': return 1 - phase;
    case 'onoff': return phase < 0.5 ? 1 : 0;
    case 'random': return hash(cycle);
    case 'step12': return Math.floor(phase * 2);
    case 'step1234': return Math.floor(phase * 4) / 3;
    case 'lfo': return 0.5 + 0.5 * Math.cos(phase * Math.PI * 4);
    case 'saw': return phase;
    case 'updown': return 1 - Math.abs(2 * phase - 1);
    case 'jittery': return hash(cycle * 8 + Math.floor(phase * 8));
    case 'adsr': return phase < 0.1 ? phase / 0.1 : phase < 0.15 ? 1 - (phase - 0.1) / 0.05 * 0.25 : phase < 0.7 ? 0.75 : 0.75 * (1 - (phase - 0.7) / 0.3);
    case 'ease': return phase < 0.5 ? 2 * phase * phase : 1 - 2 * (1 - phase) * (1 - phase);
    default: return 0;
  }
}
export function animValue(a, B) {
  if (a.shape === 'fft') { const lv = B.audio ? (B.audio[a.band || 'bass'] || 0) : 0; return (a.min ?? 0) + ((a.max ?? 1) - (a.min ?? 0)) * Math.min(1, lv); }   // reação ao som: o nível da faixa
  const beats = a.beats || 4, x = B.beat / beats, cycle = Math.floor(x), phase = x - cycle;
  return (a.min ?? 0) + ((a.max ?? 1) - (a.min ?? 0)) * shapeValue(a.shape, phase, cycle);
}
export const setBpm = (B, v) => { if (isFinite(v)) B.bpm = Math.max(20, Math.min(500, Math.round(v * 10) / 10)); };
// TAP: média dos intervalos entre os toques (2 no mínimo; mais de 2 s sem tocar recomeça)
export function tap(B, now) {
  const t = B.taps || (B.taps = []);
  if (t.length && now - t[t.length - 1] > 2) t.length = 0;
  t.push(now); if (t.length > 8) t.shift();
  if (t.length >= 2) { const iv = (t[t.length - 1] - t[0]) / (t.length - 1); setBpm(B, 60 / iv); B.beat = Math.floor(B.beat); }
  return t.length;
}
// RESYNC: este instante vira a batida 1 do compasso
export function resync(B) { B.beat = Math.round(B.beat / 4) * 4; }
// metrônomo em WebAudio: um clique por batida, mais agudo na primeira do compasso
let ac = null;
export function click(accent) {
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = accent ? 1600 : 1000;
    g.gain.setValueAtTime(0.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.06);
  } catch { }
}
