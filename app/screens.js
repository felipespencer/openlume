// Modelo da Saída avançada: telas, slices e máscaras. Funções puras sobre objetos simples;
// o motor lê este modelo e o editor o altera.
//
//   tela   = um destino (projetor ou janela) com o seu tamanho em pixels
//   slice  = recorta um pedaço da composição (in: x,y,w,h,rot) e o encaixa na tela
//            (warp: quatro cantos ou malha bezier), com soft edge, cor e máscara de entrada
//   máscara = polígono em pixels da tela que apaga (ou preserva, se invertida) uma região
import { meshFromRect, cornersFromRect, straightenHandles, resampleMesh, meshPoint, bbox, transformPts } from './warp.js';

let seq = 1;
export const nextId = () => seq++;

export function mkScreen(name, opts = {}) {
  return { id: seq++, name, device: opts.device || 'auto', w: opts.w || 1920, h: opts.h || 1080, enabled: true,
    opacity: 1, color: { bright: 1, contrast: 1, r: 0, g: 0, b: 0 }, items: [], rev: 1 };
}
export function mkSlice(name, inRect, outRect) {
  const s = { id: seq++, type: 'slice', name, enabled: true, source: 'comp',
    in: { x: inRect.x, y: inRect.y, w: inRect.w, h: inRect.h, rot: 0 }, flip: { x: false, y: false },
    warp: { mode: 'corners', curve: true, divX: 2, divY: 2, rot: 0, pts: cornersFromRect(outRect.x, outRect.y, outRect.w, outRect.h) },
    soft: { on: false, power: 2, lum: 0.5, gamma: [2.2, 2.2, 2.2], black: 0, grads: [], round: { on: true, r: 0.5 } },   // grads: degradês ajustados à mão; round: arredondado dos automáticos
    color: { bright: 1, contrast: 1, r: 0, g: 0, b: 0 },
    inMask: null, rev: 1 };
  return s;
}
export function mkMask(name, pts) { return { id: seq++, type: 'mask', name, enabled: true, invert: false, pts, rev: 1 }; }
export const touch = (o) => { o.rev = (o.rev || 0) + 1; return o; };

// Muda o tamanho da tela levando junto, na mesma proporção, as formas de saída dos slices e
// as máscaras: o slice que cobria a tela inteira continua cobrindo a tela inteira.
export function resizeScreen(sc, w, h) {
  w = Math.max(16, w | 0); h = Math.max(16, h | 0);
  if (w === sc.w && h === sc.h) return;
  const kx = w / sc.w, ky = h / sc.h;
  for (const it of sc.items) {
    if (it.type === 'slice') { transformPts(it.warp.pts, (x, y) => [x * kx, y * ky]); touch(it); }
    else { transformPts(it.pts, (x, y) => [x * kx, y * ky]); touch(it); }
  }
  sc.w = w; sc.h = h; touch(sc);
}

export function defaultScreens(compW, compH) {
  const sc = mkScreen('Projetor', { w: compW, h: compH });
  sc.items.push(mkSlice('Composição inteira', { x: 0, y: 0, w: compW, h: compH }, { x: 0, y: 0, w: compW, h: compH }));
  return [sc];
}

// ---------- deformação ----------
export const outRect = (slice) => bbox(slice.warp.pts);
export function setWarpMode(slice, mode) {
  const w = slice.warp; if (w.mode === mode) return;
  const r = outRect(slice);
  w.mode = mode;
  w.pts = mode === 'mesh' ? meshFromRect(r.x, r.y, r.w, r.h, w.divX, w.divY) : cornersFromRect(r.x, r.y, r.w, r.h);
  touch(slice);
}
export function setDivisions(slice, dx, dy) {
  const w = slice.warp; dx = Math.max(1, Math.min(10, dx | 0)); dy = Math.max(1, Math.min(10, dy | 0));
  if (w.mode === 'mesh') w.pts = resampleMesh(w.pts, w.divX, w.divY, dx, dy);
  w.divX = dx; w.divY = dy; touch(slice);
}
export function setCurve(slice, curve) {
  const w = slice.warp; w.curve = !!curve;
  if (!w.curve && w.mode === 'mesh') straightenHandles(w.pts, w.divX, w.divY);
  touch(slice);
}
export function resetWarp(slice) {
  const w = slice.warp, r = outRect(slice);
  w.pts = w.mode === 'mesh' ? meshFromRect(r.x, r.y, r.w, r.h, w.divX, w.divY) : cornersFromRect(r.x, r.y, r.w, r.h);
  w.rot = 0; touch(slice);
}
// move uma âncora da malha arrastando as alças vizinhas junto (ou um canto, no modo de quatro cantos)
export function moveAnchor(slice, idx, dx, dy) {
  const w = slice.warp;
  if (w.mode === 'corners') { w.pts[idx][0] += dx; w.pts[idx][1] += dy; touch(slice); return; }
  const cols = 3 * w.divX + 1, rows = 3 * w.divY + 1, r = Math.floor(idx / cols), c = idx % cols;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
    w.pts[rr * cols + cc][0] += dx; w.pts[rr * cols + cc][1] += dy;
  }
  if (!w.curve) straightenHandles(w.pts, w.divX, w.divY);
  touch(slice);
}
export function moveHandle(slice, idx, dx, dy) { slice.warp.pts[idx][0] += dx; slice.warp.pts[idx][1] += dy; touch(slice); }
export const isAnchor = (slice, idx) => {
  const w = slice.warp; if (w.mode === 'corners') return true;
  const cols = 3 * w.divX + 1; return (idx % cols) % 3 === 0 && Math.floor(idx / cols) % 3 === 0;
};
// alças ligadas a uma âncora (as vizinhas diretas na linha e na coluna)
export function handlesOf(slice, idx) {
  const w = slice.warp; if (w.mode !== 'mesh') return [];
  const cols = 3 * w.divX + 1, rows = 3 * w.divY + 1, r = Math.floor(idx / cols), c = idx % cols, out = [];
  if (c > 0) out.push(idx - 1); if (c < cols - 1) out.push(idx + 1);
  if (r > 0) out.push(idx - cols); if (r < rows - 1) out.push(idx + cols);
  return out;
}
// Transformar: leva a forma inteira de um retângulo a outro (mover e redimensionar)
export function fitOutRect(slice, to) {
  const from = outRect(slice);
  const sx = from.w ? to.w / from.w : 1, sy = from.h ? to.h / from.h : 1;
  transformPts(slice.warp.pts, (x, y) => [to.x + (x - from.x) * sx, to.y + (y - from.y) * sy]);
  touch(slice);
}
export function rotateOut(slice, deg) {
  const w = slice.warp, r = outRect(slice), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const a = (deg - w.rot) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  transformPts(w.pts, (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
  w.rot = deg; touch(slice);
}

// ---------- soft edge ----------
// Emenda em cada borda do slice: largura (fração do retângulo de entrada) e o trecho da borda onde ela vale
// (fração ao longo da borda, 0..1 no sentido x ou y da composição). Um slice tem emenda numa borda quando outro slice
// com soft edge ligado, da mesma fonte, cobre aquela borda — em qualquer comprimento: a rampa fica só no trecho
// sobreposto (um projetor em pé encostado num deitado emenda só onde os dois se encontram). Giro é ignorado nesta conta.
export function softWidths(slice, all) {
  const r = { l: 0, r: 0, t: 0, b: 0, lS: [0, 1], rS: [0, 1], tS: [0, 1], bS: [0, 1] };
  if (!slice.soft.on) return r;
  const A = slice.in; const span = (cur, a, b) => cur[2] ? [Math.min(cur[0], a), Math.max(cur[1], b), 1] : [a, b, 1];   // união dos trechos (marca que já tem um)
  let lS = [0, 1, 0], rS = [0, 1, 0], tS = [0, 1, 0], bS = [0, 1, 0];
  for (const o of all) {
    if (o === slice || o.type !== 'slice' || !o.enabled || !o.soft.on || o.source !== slice.source) continue;
    const B = o.in;
    const ix0 = Math.max(A.x, B.x), ix1 = Math.min(A.x + A.w, B.x + B.w), iy0 = Math.max(A.y, B.y), iy1 = Math.min(A.y + A.h, B.y + B.h);
    if (ix1 <= ix0 || iy1 <= iy0) continue;
    const sy0 = (iy0 - A.y) / A.h, sy1 = (iy1 - A.y) / A.h, sx0 = (ix0 - A.x) / A.w, sx1 = (ix1 - A.x) / A.w;
    // a emenda vai no sentido em que a sobreposição é fina: uma faixa alta e estreita emenda esquerda/direita, uma faixa
    // larga e baixa emenda cima/baixo (um quadrado no canto, as duas). Assim um projetor em pé encostado num deitado não
    // ganha uma emenda de baixo só porque a faixa encosta no pé dele.
    const hr = (ix1 - ix0) / A.w, vr = (iy1 - iy0) / A.h, lr = hr <= vr + 1e-6, tb = vr <= hr + 1e-6;
    if (lr && ix0 <= A.x + 1 && ix1 < A.x + A.w) { r.l = Math.max(r.l, (ix1 - A.x) / A.w); lS = span(lS, sy0, sy1); }
    if (lr && ix1 >= A.x + A.w - 1 && ix0 > A.x) { r.r = Math.max(r.r, (A.x + A.w - ix0) / A.w); rS = span(rS, sy0, sy1); }
    if (tb && iy0 <= A.y + 1 && iy1 < A.y + A.h) { r.t = Math.max(r.t, (iy1 - A.y) / A.h); tS = span(tS, sx0, sx1); }
    if (tb && iy1 >= A.y + A.h - 1 && iy0 > A.y) { r.b = Math.max(r.b, (A.y + A.h - iy0) / A.h); bS = span(bS, sx0, sx1); }
  }
  r.lS = lS.slice(0, 2); r.rS = rS.slice(0, 2); r.tS = tS.slice(0, 2); r.bS = bS.slice(0, 2);
  return r;
}
export const allSlices = (screens) => screens.flatMap(s => s.enabled ? s.items.filter(i => i.type === 'slice') : []);

// Degradês de emenda do slice, em pixels do recorte de entrada (0..w, 0..h, y para baixo). Cada um é uma reta
// A (brilho inteiro) → B (zero) com uma faixa de n1 px para um lado e n2 para o outro, e cantos redondos do lado de A.
// Os automáticos nascem de softWidths, um por borda com vizinho; os ajustados à mão vivem em soft.grads, e um ajustado
// que guarda a borda de origem (edge) substitui o automático daquela borda. (Ideia do Felipe, 2026-10-30: a alça de
// degradê do Illustrator puxada na própria imagem; o Resolume só tem emenda por borda.)
export const EDGE_NAMES = { l: 'esquerda', r: 'direita', t: 'de cima', b: 'de baixo' };
export function softGrads(slice, all) {
  const out = [], man = slice.soft.grads || [], rd = slice.soft.round || { on: true, r: 0.5 };
  if (slice.soft.on) {
    const sw = softWidths(slice, all), w = slice.in.w, h = slice.in.h;
    const mk = (edge, a, b, n) => { if (man.some(g => g.edge === edge)) return; out.push({ edge, auto: true, a, b, n1: n, n2: n, roundOn: rd.on, round: rd.r }); };
    if (sw.l > 0) { const m = (sw.lS[0] + sw.lS[1]) / 2 * h; mk('l', [sw.l * w, m], [0, m], (sw.lS[1] - sw.lS[0]) * h / 2); }
    if (sw.r > 0) { const m = (sw.rS[0] + sw.rS[1]) / 2 * h; mk('r', [w - sw.r * w, m], [w, m], (sw.rS[1] - sw.rS[0]) * h / 2); }
    if (sw.t > 0) { const m = (sw.tS[0] + sw.tS[1]) / 2 * w; mk('t', [m, sw.t * h], [m, 0], (sw.tS[1] - sw.tS[0]) * w / 2); }
    if (sw.b > 0) { const m = (sw.bS[0] + sw.bS[1]) / 2 * w; mk('b', [m, h - sw.b * h], [m, h], (sw.bS[1] - sw.bS[0]) * w / 2); }
  }
  for (const g of man) out.push(g);
  return out;
}
// Mexer num degradê automático: vira ajustado (cópia em soft.grads, com a borda de origem) e volta como o alvo da edição.
export function adoptGrad(slice, g) {
  if (!g.auto) return g;
  const m = { id: seq++, edge: g.edge, a: [g.a[0], g.a[1]], b: [g.b[0], g.b[1]], n1: g.n1, n2: g.n2, roundOn: g.roundOn, round: g.round };
  (slice.soft.grads || (slice.soft.grads = [])).push(m); touch(slice); return m;
}
export function gradName(g, i) { return g.auto ? `Emenda ${EDGE_NAMES[g.edge]}` : g.edge ? `Emenda ${EDGE_NAMES[g.edge]}` : `Degradê ${i + 1}`; }
// raio do arredondado em pixels: fração de metade do lado menor da faixa
export const gradRadius = (g) => g.roundOn ? Math.min(Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), g.n1 + g.n2) / 2 * (g.round || 0) : 0;
// contorno da faixa (pixels do recorte), com os dois cantos do lado de A arredondados
export function gradOutline(g) {
  const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1], L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
  const P = [[g.a[0] + px * g.n1, g.a[1] + py * g.n1], [g.b[0] + px * g.n1, g.b[1] + py * g.n1], [g.b[0] - px * g.n2, g.b[1] - py * g.n2], [g.a[0] - px * g.n2, g.a[1] - py * g.n2]];
  const r = gradRadius(g); if (r < 1) return P;
  const out = [];
  for (let k = 0; k < 4; k++) {
    const p0 = P[(k + 3) % 4], p1 = P[k], p2 = P[(k + 1) % 4];
    if (k === 1 || k === 2) { out.push(p1); continue; }   // lado de B (beirada do projetor): reto
    const u = [p0[0] - p1[0], p0[1] - p1[1]], v = [p2[0] - p1[0], p2[1] - p1[1]], lu = Math.hypot(...u) || 1, lv = Math.hypot(...v) || 1, rr = Math.min(r, lu / 2, lv / 2);
    const c = [p1[0] + u[0] / lu * rr + v[0] / lv * rr, p1[1] + u[1] / lu * rr + v[1] / lv * rr];
    const a0 = Math.atan2(p1[1] + u[1] / lu * rr - c[1], p1[0] + u[0] / lu * rr - c[0]), a1 = Math.atan2(p1[1] + v[1] / lv * rr - c[1], p1[0] + v[0] / lv * rr - c[0]);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    for (let t = 0; t <= 8; t++) { const a = a0 + d * t / 8; out.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]); }
  }
  return out;
}

// ---------- máscaras ----------
export function maskShape(kind, x, y, w, h) {
  if (kind === 'circle') { const n = 32, pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([x + w / 2 + Math.cos(a) * w / 2, y + h / 2 + Math.sin(a) * h / 2]); } return pts; }
  if (kind === 'triangle') return [[x + w / 2, y], [x + w, y + h], [x, y + h]];
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}
// máscara de entrada do slice: polígono em coordenadas locais (0..1)
export function setInMask(slice, kind) {
  slice.inMask = kind ? { pts: maskShape(kind, 0.1, 0.1, 0.8, 0.8), invert: false, rev: 1 } : null;
  touch(slice);
}

// ---------- salvar e abrir ----------
export function serialize(screens) {
  return JSON.stringify({ v: 1, screens: screens.map(sc => ({
    name: sc.name, device: sc.device, w: sc.w, h: sc.h, enabled: sc.enabled, opacity: sc.opacity, color: sc.color,
    items: sc.items.map(it => it.type === 'slice'
      ? { type: 'slice', name: it.name, enabled: it.enabled, source: it.source, in: it.in, flip: it.flip,
          warp: { mode: it.warp.mode, curve: it.warp.curve, divX: it.warp.divX, divY: it.warp.divY, rot: it.warp.rot, pts: it.warp.pts },
          soft: it.soft, color: it.color, inMask: it.inMask && { pts: it.inMask.pts, invert: it.inMask.invert } }
      : { type: 'mask', name: it.name, enabled: it.enabled, invert: it.invert, pts: it.pts }),
  })) });
}
export function deserialize(json) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  return (d.screens || []).map(s => {
    const sc = mkScreen(s.name || 'Tela', { device: s.device, w: s.w, h: s.h });
    sc.enabled = s.enabled !== false; sc.opacity = s.opacity ?? 1; Object.assign(sc.color, s.color || {});
    for (const it of s.items || []) {
      if (it.type === 'mask') { const m = mkMask(it.name || 'Máscara', (it.pts || []).map(p => [+p[0], +p[1]])); m.enabled = it.enabled !== false; m.invert = !!it.invert; sc.items.push(m); continue; }
      const sl = mkSlice(it.name || 'Slice', it.in || { x: 0, y: 0, w: sc.w, h: sc.h }, { x: 0, y: 0, w: sc.w, h: sc.h });
      sl.enabled = it.enabled !== false; sl.source = it.source || 'comp';
      Object.assign(sl.in, it.in || {}); Object.assign(sl.flip, it.flip || {});
      if (it.warp) { Object.assign(sl.warp, it.warp); sl.warp.pts = (it.warp.pts || sl.warp.pts).map(p => [+p[0], +p[1]]); }
      if (it.soft) { Object.assign(sl.soft, it.soft); sl.soft.gamma = (it.soft.gamma || [2.2, 2.2, 2.2]).map(Number); }
      sl.soft.grads = ((it.soft && it.soft.grads) || []).map(g => ({ id: seq++, edge: g.edge || null, a: [+g.a[0], +g.a[1]], b: [+g.b[0], +g.b[1]], n1: +g.n1 || 8, n2: +g.n2 || 8, roundOn: g.roundOn !== false, round: g.round ?? 0.5 }));
      sl.soft.round = Object.assign({ on: true, r: 0.5 }, (it.soft && it.soft.round) || {});
      Object.assign(sl.color, it.color || {});
      if (it.inMask) sl.inMask = { pts: it.inMask.pts.map(p => [+p[0], +p[1]]), invert: !!it.inMask.invert, rev: 1 };
      sc.items.push(sl);
    }
    return sc;
  });
}
