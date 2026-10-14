// A composição inteira num JSON: camadas, clipes (arquivos pelo caminho), efeitos, autopilot,
// transformações, telas da saída avançada e quadros do laser.
import { serializeClip, deserializeClip } from './clips.js';
import * as M from './screens.js';
import { serializeLaser, deserializeLaser } from './laser-model.js';
import { MIXER_OPT } from './mixers.js';
import { AUDIO_SETTINGS } from './audio.js';
import { cloneFx } from './effects.js';

export const AUTOPILOT = () => ({ dir: 'off', dur: 'clip', secs: 5, beats: 4, loop: true });
// grupo de camadas: entra na composição como uma camada só (opacidade, mistura, efeitos, transformação)
export const GROUP = (name) => ({ id: 0, name: name || 'Grupo', color: '', opacity: 1, blend: 'alpha', blendOpt: MIXER_OPT(), bypass: false, solo: false, fx: [], transform: { x: 0, y: 0, scale: 1, rot: 0 }, folded: false, ignoreColumn: false, firstCol: false, lock: false, bus: null, speed: 1 });
// crossfader: posição 0 = A, 1 = B; curva linear, potência igual ou corte; "ir para A/B" corta ou esmaece
export const XFADE = () => ({ pos: 0.5, curve: 'linear', behaviour: 'cut', secs: 2 });
// Configurações da composição (menu Composição → Configurações…)
export const SETTINGS = () => ({ w: 1920, h: 1080, fps: 30, bg: '#000000', desc: '', trig: 'normal', firstCol: false });   // 30 fps por padrão (pedido do Felipe em 2026-10-14); a janela de saída desenha no ritmo do monitor

export function serializeComposition(state, laser, cols) {
  return JSON.stringify({
    v: 1, name: state.name || 'Composição', cols, colNames: state.colNames || {}, settings: state.settings, master: state.master, speed: state.speed, compFx: state.compFx, compTransform: state.compTransform, compAutopilot: state.compAutopilot,
    layers: state.layers.map(L => ({ name: L.name, opacity: L.opacity, blend: L.blend, bypass: L.bypass, autopilot: L.autopilot, fx: L.fx, transform: L.transform, transition: L.transition, transMode: L.transMode, transOpt: L.transOpt, blendOpt: L.blendOpt, group: L.group ?? null, solo: !!L.solo, bus: L.bus || null, on: L.on, clips: L.clips.map(serializeClip) })),
    groups: state.groups || [], xfade: state.xfade || XFADE(), deck: state.deck || 0,
    bpm: state.bpm ? { bpm: state.bpm.bpm, snap: state.bpm.snap, metronome: !!state.bpm.metronome, nudgePct: state.bpm.nudgePct } : null, colSnap: state.colSnap || {}, audio: state.audioSettings || AUDIO_SETTINGS(),
    // os clipes das camadas são os do deck atual; os outros decks guardam as suas linhas (uma por camada)
    decks: (state.decks || []).map((d, i) => ({ name: d.name, color: d.color || '', closed: !!d.closed, rows: i === (state.deck || 0) ? null : state.layers.map(L => (d.cells[L.id] || []).map(serializeClip)) })),
    screens: JSON.parse(M.serialize(state.screens)),
    laser: JSON.parse(serializeLaser(laser.frames, laser.settings, laser.frames.indexOf(laser.active))),
  });
}
// devolve { layers, screens, laser, missing } — os clipes de arquivo que não abriram ficam vazios
export async function deserializeComposition(json, ctx) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  const lz = d.laser ? deserializeLaser(d.laser) : null;
  const laserById = (id) => lz && d.laser.frames ? lz.frames[d.laser.frames.findIndex((f, i) => i === id)] : null;
  let missing = 0;
  if (ctx.setCols && d.cols) ctx.setCols(d.cols);
  const layers = [];
  for (const l of d.layers || []) {
    const L = ctx.mkLayer(l.name || 'Camada');
    L.opacity = l.opacity ?? 1; L.blend = l.blend || 'normal'; L.bypass = !!l.bypass; L.autopilot = Object.assign(AUTOPILOT(), l.autopilot || {});
    L.fx = (l.fx || []).map(f => cloneFx(f)); L.transform = Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, l.transform || {}); L.transition = l.transition ?? 0; L.transMode = l.transMode || 'alpha'; L.transOpt = Object.assign(MIXER_OPT(), l.transOpt || {}); L.blendOpt = Object.assign(MIXER_OPT(), l.blendOpt || {}); L.group = l.group ?? null; L.solo = !!l.solo; L.bus = l.bus || null;
    for (let i = 0; i < L.clips.length; i++) {
      const o = (l.clips || [])[i];
      if (o && o.missing) { missing++; continue; }
      // o quadro do laser é referenciado pela posição na lista
      L.clips[i] = await deserializeClip(o, { toast: ctx.toast, laserClip: (idx) => { const f = lz && lz.frames[idx]; return f ? ctx.laserClip(f) : null; } });
      if (o && !L.clips[i]) missing++;
    }
    layers.push(L);
  }
  const clipOpts = { toast: ctx.toast, laserClip: (idx) => { const f = lz && lz.frames[idx]; return f ? ctx.laserClip(f) : null; } };
  const decks = [];
  for (const k of d.decks || []) {
    const dk = { name: k.name || 'Deck', color: k.color || '', closed: !!k.closed, rows: null };
    if (k.rows) {
      dk.rows = [];
      for (const row of k.rows) { const out = []; for (const o of row) { if (o && o.missing) { missing++; out.push(null); continue; } const c = await deserializeClip(o, clipOpts); if (o && !c) missing++; out.push(c); } dk.rows.push(out); }
    }
    decks.push(dk);
  }
  const groups = (d.groups || []).map(g => Object.assign(GROUP(), g, { blendOpt: Object.assign(MIXER_OPT(), g.blendOpt || {}), transform: Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, g.transform || {}), fx: (g.fx || []).map(f => cloneFx(f)) }));
  return { groups, decks, deck: d.deck || 0, xfade: Object.assign(XFADE(), d.xfade || {}), bpm: d.bpm || null, colSnap: d.colSnap || {}, audio: Object.assign(AUDIO_SETTINGS(), d.audio || {}), name: d.name, settings: Object.assign(SETTINGS(), d.settings || {}), colNames: d.colNames || {}, master: d.master ?? 1, speed: d.speed ?? 1, compFx: d.compFx || [], compTransform: Object.assign({ x: 0, y: 0, scale: 1, sx: 1, sy: 1, rot: 0 }, d.compTransform || {}), compAutopilot: Object.assign(AUTOPILOT(), d.compAutopilot || {}), layers, screens: d.screens ? M.deserialize({ screens: d.screens.screens || d.screens }) : null, laser: lz, missing };
}
