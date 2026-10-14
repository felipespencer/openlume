// A composição inteira num JSON: camadas, clipes (arquivos pelo caminho), efeitos, autopilot,
// transformações, telas da saída avançada e quadros do laser.
import { serializeClip, deserializeClip } from './clips.js';
import * as M from './screens.js';
import { serializeLaser, deserializeLaser } from './laser-model.js';
import { MIXER_OPT } from './mixers.js';

export const AUTOPILOT = () => ({ dir: 'off', dur: 'clip', secs: 5, loop: true });
// Configurações da composição (menu Composição → Configurações…)
export const SETTINGS = () => ({ w: 1920, h: 1080, fps: 60, bg: '#000000', desc: '', trig: 'normal', firstCol: false });

export function serializeComposition(state, laser, cols) {
  return JSON.stringify({
    v: 1, name: state.name || 'Composição', cols, colNames: state.colNames || {}, settings: state.settings, master: state.master, speed: state.speed, compFx: state.compFx, compAutopilot: state.compAutopilot,
    layers: state.layers.map(L => ({ name: L.name, opacity: L.opacity, blend: L.blend, bypass: L.bypass, autopilot: L.autopilot, fx: L.fx, transform: L.transform, transition: L.transition, transMode: L.transMode, transOpt: L.transOpt, blendOpt: L.blendOpt, on: L.on, clips: L.clips.map(serializeClip) })),
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
    L.fx = (l.fx || []).map(f => ({ ...f, params: { ...f.params } })); L.transform = Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, l.transform || {}); L.transition = l.transition ?? 0; L.transMode = l.transMode || 'alpha'; L.transOpt = Object.assign(MIXER_OPT(), l.transOpt || {}); L.blendOpt = Object.assign(MIXER_OPT(), l.blendOpt || {});
    for (let i = 0; i < L.clips.length; i++) {
      const o = (l.clips || [])[i];
      if (o && o.missing) { missing++; continue; }
      // o quadro do laser é referenciado pela posição na lista
      L.clips[i] = await deserializeClip(o, { toast: ctx.toast, laserClip: (idx) => { const f = lz && lz.frames[idx]; return f ? ctx.laserClip(f) : null; } });
      if (o && !L.clips[i]) missing++;
    }
    layers.push(L);
  }
  return { name: d.name, settings: Object.assign(SETTINGS(), d.settings || {}), colNames: d.colNames || {}, master: d.master ?? 1, speed: d.speed ?? 1, compFx: d.compFx || [], compAutopilot: Object.assign(AUTOPILOT(), d.compAutopilot || {}), layers, screens: d.screens ? M.deserialize({ screens: d.screens.screens || d.screens }) : null, laser: lz, missing };
}
