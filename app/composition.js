// A composição inteira num JSON: camadas, clipes (arquivos pelo caminho), efeitos, autopilot,
// transformações, telas da saída avançada e quadros do laser.
import { serializeClip, deserializeClip } from './clips.js';
import * as M from './screens.js';
import { serializeLaser, deserializeLaser } from './laser-model.js';

export const AUTOPILOT = () => ({ dir: 'off', dur: 'clip', secs: 5, loop: true });

export function serializeComposition(state, laser, cols) {
  return JSON.stringify({
    v: 1, name: state.name || 'Composição', cols, master: state.master, speed: state.speed, compFx: state.compFx, compAutopilot: state.compAutopilot,
    layers: state.layers.map(L => ({ name: L.name, opacity: L.opacity, blend: L.blend, bypass: L.bypass, autopilot: L.autopilot, fx: L.fx, transform: L.transform, transition: L.transition, on: L.on, clips: L.clips.map(serializeClip) })),
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
  const layers = [];
  for (const l of d.layers || []) {
    const L = ctx.mkLayer(l.name || 'Camada');
    L.opacity = l.opacity ?? 1; L.blend = l.blend || 'normal'; L.bypass = !!l.bypass; L.autopilot = Object.assign(AUTOPILOT(), l.autopilot || {});
    L.fx = (l.fx || []).map(f => ({ ...f, params: { ...f.params } })); L.transform = Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, l.transform || {}); L.transition = l.transition ?? 0;
    for (let i = 0; i < L.clips.length; i++) {
      const o = (l.clips || [])[i];
      if (o && o.missing) { missing++; continue; }
      // o quadro do laser é referenciado pela posição na lista
      L.clips[i] = await deserializeClip(o, { toast: ctx.toast, laserClip: (idx) => { const f = lz && lz.frames[idx]; return f ? ctx.laserClip(f) : null; } });
      if (o && !L.clips[i]) missing++;
    }
    layers.push(L);
  }
  return { name: d.name, master: d.master ?? 1, speed: d.speed ?? 1, compFx: d.compFx || [], compAutopilot: Object.assign(AUTOPILOT(), d.compAutopilot || {}), layers, screens: d.screens ? M.deserialize({ screens: d.screens.screens || d.screens }) : null, laser: lz, missing };
}
