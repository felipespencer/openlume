// Modelo e gerador de pontos do laser.
//
// Um quadro tem texto (opcional), caminhos desenhados (lápis, formas, SVG), cor, distorção e
// posição. O espaço do laser vai de -1 a 1 nos dois eixos, y para cima. renderPoints() faz o
// que o galvanômetro precisa: anda pelos caminhos em passos iguais, demora nos cantos e nas
// pontas, viaja apagado entre um caminho e outro, corta o que sai da zona segura e devolve
// x y r g b em 0..4095, prontos para o LaserCube.
import { FONTS as HERSHEY_FONTS } from './hershey.js';
import { EMS_FONTS } from './vendor/fontes-laser/fontes.js';
export const FONTS = { ...HERSHEY_FONTS, ...EMS_FONTS };
import { homography, applyHomography, meshFromRect, meshPoint, resampleMesh, cornersFromRect } from './warp.js';

let seq = 1;
export const LASER_DEFAULTS = () => ({ pps: 30000, bright: 0.6, corner: 3, safe: { w: 0.84, h: 0.76 }, flipX: true, flipY: false, flipCal: 1, colorCal: 1, fps: 30, scanHz: 50, fill: 50, style: 'ol', preset: 'standard', onSpeed: 0.0625, offSpeed: 0.0625, startWait: 8, startDwell: 2, curveDwell: 1, corner: 3, endDwell: 2, endWait: 1, curveAngle: 30, snap: 0.001, showPoints: false, map: MAP_DEFAULTS() });
// mapeamento da saída (como os quatro cantos e a malha da Saída avançada): pontos de ancoragem
// que levam o quadrado do palco (-1..1) para onde o laser deve desenhar na superfície
export const MAP_DEFAULTS = () => ({ mode: 'off', corners: cornersFromRect(-1, -1, 2, 2), divX: 2, divY: 2, mesh: meshFromRect(-1, -1, 2, 2, 2, 2) });
export function resetMap(map) { Object.assign(map, MAP_DEFAULTS(), { mode: map.mode }); }
export function setMapDivisions(map, dx, dy) { map.mesh = resampleMesh(map.mesh, map.divX, map.divY, dx, dy); map.divX = dx; map.divY = dy; }
// função ponto → ponto mapeado (null quando o mapeamento está desligado)
export function mapFn(map) {
  if (!map || map.mode === 'off') return null;
  if (map.mode === 'corners') { const H = homography(map.corners); return H ? (x, y) => applyHomography(H, (x + 1) / 2, (y + 1) / 2) : null; }
  return (x, y) => meshPoint(map.mesh, map.divX, map.divY, (x + 1) / 2, (y + 1) / 2);
}
// a varredura com os pontos levados pelo mapeamento (a zona segura já foi aplicada antes)
export function mapScan(scan, settings) {
  const fn = mapFn(settings.map); if (!fn) return scan;
  // a zona segura vale de novo depois do mapa: âncora nenhuma leva o feixe para fora dela
  const xy = new Float32Array(scan.xy.length), rgb = Float32Array.from(scan.rgb), lit = Uint8Array.from(scan.lit), sw = settings.safe.w, sh = settings.safe.h;
  for (let i = 0; i < scan.n; i++) {
    const q = fn(scan.xy[i * 2], scan.xy[i * 2 + 1]), inside = Math.abs(q[0]) <= sw && Math.abs(q[1]) <= sh;
    xy[i * 2] = Math.max(-sw, Math.min(sw, q[0])); xy[i * 2 + 1] = Math.max(-sh, Math.min(sh, q[1]));
    if (!inside) { lit[i] = 0; rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 0; }
  }
  return { xy, rgb, lit, n: scan.n };
}

export function mkFrame(name, kind = 'draw') {
  const f = { id: seq++, name, kind,
    text: { content: kind === 'text' ? 'TEXTO' : '', font: 'emsReadability', dir: 'h', size: 0.22, spacing: 1, scroll: 'none' },
    paths: [],
    color: { mode: 'solid', c1: '#00ff00', c2: '#4dd2ff', speed: 1 },   // uma cor só por padrão (verde, o que o olho e o laser mostram mais firme); o arco-íris troca a cor a cada ponto
    distort: { wave: 0, spin: 0, pulse: 0, jitter: 0, mirror: 'none', audio: false },
    pos: { x: 0, y: 0, scale: 0.8, rot: 0 }, rev: 1 };
  return f;
}
export const touch = (f) => { f.rev = (f.rev || 0) + 1; return f; };
export function describe(f) {
  const partes = [];
  if (f.text.content) partes.push('Texto · ' + ({ h: 'horizontal', v: 'vertical', stack: 'pilha' })[f.text.dir]);
  if (f.kind === 'contour') partes.push('Contorno da projeção');
  else if (f.paths.length) partes.push(({ draw: 'Desenho', svg: 'SVG', shape: 'Forma' })[f.kind] + ' · ' + f.paths.length + (f.paths.length === 1 ? ' caminho' : ' caminhos'));
  const fx = [];
  if (f.distort.wave) fx.push('onda'); if (f.distort.spin) fx.push('giro'); if (f.distort.pulse) fx.push('pulso'); if (f.distort.jitter) fx.push('tremor'); if (f.distort.mirror !== 'none') fx.push('espelho');
  fx.push(({ rainbow: 'arco-íris', solid: 'cor fixa', cycle: 'ciclo de cor', two: 'duas cores', strobe: 'estrobo' })[f.color.mode]);
  return (partes.join(' + ') || 'Vazio') + ' · ' + fx.join(', ');
}

// ---------- formas prontas (em -1..1) ----------
export function shapePaths(kind) {
  const n = 64, c = [];
  if (kind === 'circle') { for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; c.push([Math.cos(a), Math.sin(a)]); } return [c]; }
  if (kind === 'square') return [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]];
  if (kind === 'triangle') return [[[0, 1], [0.95, -0.7], [-0.95, -0.7], [0, 1]]];
  if (kind === 'star') { for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? 0.42 : 1; c.push([Math.cos(a) * r, Math.sin(a) * r]); } return [c]; }
  if (kind === 'wave') { for (let i = 0; i <= n; i++) { const x = -1 + 2 * i / n; c.push([x, Math.sin(x * Math.PI * 2) * 0.4]); } return [c]; }
  if (kind === 'line') return [[[-1, 0], [1, 0]]];
  if (kind === 'heart') { for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; c.push([Math.sin(t) ** 3, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]); } return [c]; }
  return [];
}

// ---------- texto com fonte de traço único ----------
// devolve caminhos em -1..1: altura de maiúscula = size (fração da altura do palco, que é 2)
export function textPaths(t, time = 0) {
  const font = FONTS[t.font] || FONTS.emsReadability || FONTS.simplex, cap = 21, k = (t.size * 2) / cap;
  const lines = (t.content || '').split('\n');
  const glyph = (ch) => { const code = ch.charCodeAt(0); return font[code >= 32 && code < 127 ? code - 32 : 31] || font[0]; };
  const out = [];
  const lineH = cap * 1.6;
  if (t.dir === 'stack') {
    // uma letra embaixo da outra, cada linha vira uma coluna
    lines.forEach((line, li) => {
      const chars = [...line.replace(/\s+/g, ' ')]; const total = chars.length * lineH * t.spacing;
      chars.forEach((ch, i) => {
        const g = glyph(ch), cy = -total / 2 + (i + 0.5) * lineH * t.spacing, cx = (li - (lines.length - 1) / 2) * 32 * t.spacing;
        for (const s of g.s) out.push(s.map(([x, y]) => [(x + cx) * k, -(y + cy) * k]));
      });
    });
    return out;
  }
  // horizontal (ou vertical = horizontal girado 90°)
  const widths = lines.map(line => [...line].reduce((w, ch) => { const g = glyph(ch); return w + (g.r - g.l) * t.spacing; }, 0));
  lines.forEach((line, li) => {
    let x = -widths[li] / 2; const baseY = (li - (lines.length - 1) / 2) * lineH;
    for (const ch of line) {
      const g = glyph(ch);
      for (const s of g.s) out.push(s.map(([gx, gy]) => [(gx - g.l + x) * k, -(gy + baseY) * k]));
      x += (g.r - g.l) * t.spacing;
    }
  });
  if (t.dir === 'v') return out.map(p => p.map(([x, y]) => [-y, x]));
  return out;
}

// ---------- caminhos finais do quadro (texto + desenhos + distorção + posição) ----------
export function framePaths(f, time = 0, audio = 0) {
  let paths = [...f.paths.map(p => p.map(q => [q[0], q[1]])), ...textPaths(f.text, time)];
  if (!paths.length) return [];
  const d = f.distort, t = f.text;
  // rolagem do texto: desloca e dá a volta
  if (t.content && t.scroll !== 'none') {
    const sp = time * 0.35 * (f.color.speed || 1), off = ((sp % 2) + 2) % 2;
    const sh = t.scroll === 'left' ? -off : t.scroll === 'right' ? off : 0, sv = t.scroll === 'up' ? off : 0;
    paths = paths.map(p => p.map(([x, y]) => [x + sh * 1.5, y + sv * 1.5])).concat(paths.map(p => p.map(([x, y]) => [x + sh * 1.5 - Math.sign(sh || 1) * (sh ? 3 : 0), y + sv * 1.5 - (sv ? 3 : 0)])));
  }
  const pulse = 1 + d.pulse * 0.3 * Math.sin(time * 3) * (d.audio ? 0.3 + audio : 1);
  const ang = (f.pos.rot + d.spin * time) * Math.PI / 180, cs = Math.cos(ang), sn = Math.sin(ang), sc = f.pos.scale * pulse;
  const jit = d.jitter * 0.03 * (d.audio ? 0.3 + audio : 1);
  let out = paths.map(p => p.map(([x, y]) => {
    if (d.wave) y += d.wave * 0.25 * Math.sin(x * 5 + time * 2.5);
    if (jit) { x += (Math.random() - 0.5) * jit; y += (Math.random() - 0.5) * jit; }
    return [f.pos.x + (x * cs - y * sn) * sc, f.pos.y + (x * sn + y * cs) * sc];
  }));
  if (d.mirror === 'x' || d.mirror === '4') out = out.concat(out.map(p => p.map(([x, y]) => [-x, y])));
  if (d.mirror === 'y' || d.mirror === '4') out = out.concat(out.map(p => p.map(([x, y]) => [x, -y])));
  return out;
}

// ---------- cor ----------
function hsv(h, s, v) {
  h = ((h % 1) + 1) % 1; const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s);
  return [[v, tt, p], [q, v, p], [p, v, tt], [p, q, v], [tt, p, v], [v, p, q]][i % 6];
}
const hex = (c) => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
export function colorAt(col, u, time) {
  const sp = col.speed || 1;
  if (col.mode === 'solid') return hex(col.c1);
  if (col.mode === 'rainbow') return hsv(u + time * 0.15 * sp, 1, 1);
  if (col.mode === 'cycle') return hsv(time * 0.2 * sp, 1, 1);
  if (col.mode === 'two') { const a = hex(col.c1), b = hex(col.c2), m = 0.5 + 0.5 * Math.sin((u * 4 + time * sp) * Math.PI); return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m]; }
  if (col.mode === 'strobe') return Math.floor(time * 8 * sp) % 2 ? hex(col.c1) : [0, 0, 0];
  return [1, 1, 1];
}

// ---------- varredura: caminhos → pontos do galvanômetro ----------
// devolve { xy: Float32Array (-1..1), rgb: Float32Array (0..1), lit: Uint8Array, n }
export function scanPaths(paths, settings, color, time) {
  return (settings.style || 'ol') === 'ol' ? scanPathsOL(paths, settings, color, time) : scanPathsAdaptive(paths, settings, color, time);
}

// Predefinições de renderização do LaserOS (lidas no ldCore.dll com o REA, 2026-10-14): os parâmetros do OpenLase.
// on/off = quanto o feixe anda por ponto (fração do meio palco, distância de Chebyshev); esperas em pontos.
export const OL_PRESETS = {
  standard: { label: 'Padrão', onSpeed: 0.0625, offSpeed: 0.0625, startWait: 8, startDwell: 2, curveDwell: 1, corner: 3, endDwell: 2, endWait: 1, curveAngle: 30, snap: 0.001 },
  quality: { label: 'Qualidade', onSpeed: 0.025, offSpeed: 0.025, startWait: 6, startDwell: 1, curveDwell: 1, corner: 1, endDwell: 1, endWait: 2, curveAngle: 30, snap: 0 },
  speed: { label: 'Velocidade', onSpeed: 0.0571, offSpeed: 0.0444, startWait: 2, startDwell: 0, curveDwell: 0, corner: 0, endDwell: 0, endWait: 1, curveAngle: 30, snap: 0 },
};
export function applyOlPreset(settings, id) { const p = OL_PRESETS[id]; if (!p) return; settings.preset = id; for (const k of Object.keys(p)) if (k !== 'label') settings[k] = p[k]; }

// Gerador de pontos com o comportamento do OpenLase, o renderizador que o LaserOS usa (libol.c, LGPL; lido para
// entender o método, reescrito aqui): distância de Chebyshev; cada traço começa com o primeiro ponto e `startDwell`
// repetições dele, segue a `onSpeed` por ponto, demora `corner` pontos nos cantos (ângulo maior que `curveAngle`) e
// `curveDwell` nas curvas, e termina com `endDwell` repetições do último ponto; a viagem apagada entre traços tem
// `endWait` pontos parados, a travessia a `offSpeed` e `startWait` pontos parados no destino (se a distância passa de
// `snap`). O quadro inteiro é levado ao tamanho fixo pontos/s ÷ atualização: se sobra, reamostra os pontos acesos
// (os apagados ficam 1:1), se falta, completa com pontos apagados no último lugar. Com tamanho fixo o laser repete o
// desenho num ritmo constante, que é o que o deixa firme.
export function scanPathsOL(paths, settings, color, time) {
  const P = (v, d) => (v == null || isNaN(v) ? d : v);
  const on = Math.max(0.002, P(settings.onSpeed, 0.0625)), off = Math.max(0.002, P(settings.offSpeed, 0.0625));
  const startWait = P(settings.startWait, 8) | 0, startDwell = P(settings.startDwell, 2) | 0, cornerDwell = P(settings.corner, 3) | 0, curveDwell = P(settings.curveDwell, 1) | 0, endDwell = P(settings.endDwell, 2) | 0, endWait = P(settings.endWait, 1) | 0;
  const cosCurve = Math.cos(P(settings.curveAngle, 30) * Math.PI / 180), snap = P(settings.snap, 0.001);
  const frameLen = Math.max(100, Math.round(settings.pps / (settings.scanHz || settings.fps || 30)));
  const sw = settings.safe.w, sh = settings.safe.h;
  const clip = (x, y) => { const inside = Math.abs(x) <= sw && Math.abs(y) <= sh; return [Math.max(-sw, Math.min(sw, x)), Math.max(-sh, Math.min(sh, y)), inside]; };
  let L = 0; for (const p of paths) for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  const xy = [], rgb = [], lit = [];
  const push = (x, y, isOn, u) => { const [cx, cy, inside] = clip(x, y); xy.push(cx, cy); const c = isOn && inside ? colorAt(color, u, time) : [0, 0, 0]; rgb.push(c[0], c[1], c[2]); lit.push(isOn && inside ? 1 : 0); };
  let acc = 0, last = null;   // último ponto desenhado (para a viagem apagada)
  for (const p of paths) {
    if (p.length < 2) continue;
    // viagem apagada (render_object): espera no fim, travessia a offSpeed, espera no começo
    if (last) {
      const dx = p[0][0] - last[0], dy = p[0][1] - last[1], dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > snap) {
        const n = Math.ceil(dist / off);
        for (let i = 0; i < endWait; i++) push(last[0], last[1], 0, 0);
        for (let j = 0; j < n; j++) push(last[0] + dx * j / n, last[1] + dy * j / n, 0, 0);
        for (let i = 0; i < startWait; i++) push(p[0][0], p[0][1], 0, 0);
      }
    } else for (let i = 0; i < startWait; i++) push(p[0][0], p[0][1], 0, 0);
    // o traço (line_to): primeiro ponto, depois cada segmento com a espera no vértice de saída
    push(p[0][0], p[0][1], 1, acc / (L || 1));
    let prevSlope = null, cur = p[0];
    for (let i = 1; i < p.length; i++) {
      const [x1, y1] = p[i], dx = x1 - cur[0], dy = y1 - cur[1];
      // get_dwell: no segundo vértice é startDwell; depois, canto ou curva pelo ângulo entre o segmento anterior e o próximo
      let dwell;
      if (i === 1) dwell = startDwell;
      else {
        const dex = prevSlope[0] - cur[0], dey = prevSlope[1] - cur[1], dsx = cur[0] - x1, dsy = cur[1] - y1;
        const lens = Math.hypot(dex, dey) * Math.hypot(dsx, dsy);
        if (lens === 0) dwell = cornerDwell; else dwell = (dex * dsx + dey * dsy) / lens > cosCurve ? curveDwell : cornerDwell;
      }
      for (let k = 0; k < dwell; k++) push(cur[0], cur[1], 1, acc / (L || 1));
      const dist = Math.max(Math.abs(dx), Math.abs(dy)), n = Math.max(1, Math.ceil(dist / on)), seg = Math.hypot(dx, dy);
      for (let j = 1; j <= n; j++) push(cur[0] + dx * j / n, cur[1] + dy * j / n, 1, (acc + seg * j / n) / (L || 1));
      acc += seg; prevSlope = cur; cur = p[i];
    }
    for (let k = 0; k < endDwell; k++) push(cur[0], cur[1], 1, acc / (L || 1));   // olEnd
    last = cur;
  }
  let n = lit.length;
  if (!n) return { xy: new Float32Array(0), rgb: new Float32Array(0), lit: new Uint8Array(0), n: 0 };
  // fecha a volta: viagem apagada do fim até o começo do primeiro traço (o quadro repete em laço)
  // (o OpenLase não faz isto; sem isto o laço emendava o último ponto aceso ao primeiro com um risco)
  const first = paths.find(p => p.length >= 2);
  if (first) { const dx = first[0][0] - last[0], dy = first[0][1] - last[1], dist = Math.max(Math.abs(dx), Math.abs(dy)); if (dist > snap) { const m = Math.ceil(dist / off); for (let i = 0; i < endWait; i++) push(last[0], last[1], 0, 0); for (let j = 0; j < m; j++) push(last[0] + dx * j / m, last[1] + dy * j / m, 0, 0); } n = lit.length; }
  // tamanho fixo do quadro (render_output): reamostra se sobra, completa com apagados se falta
  let oxy = xy, orgb = rgb, olit = lit;
  if (n > frameLen) {
    oxy = []; orgb = []; olit = [];
    const delta = n / frameLen; let pos = 0;
    while (pos < n - 1) {
      const i = Math.floor(pos), rest = pos - i;
      oxy.push(xy[i * 2] * (1 - rest) + xy[i * 2 + 2] * rest, xy[i * 2 + 1] * (1 - rest) + xy[i * 2 + 3] * rest);
      if (!lit[i] || !lit[i + 1]) { orgb.push(0, 0, 0); olit.push(0); pos += 1; }
      else { orgb.push(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]); olit.push(1); pos += delta; }
    }
  }
  while (olit.length < frameLen) { const k = olit.length - 1; oxy.push(oxy[k * 2], oxy[k * 2 + 1]); orgb.push(0, 0, 0); olit.push(0); }
  return { xy: Float32Array.from(oxy), rgb: Float32Array.from(orgb), lit: Uint8Array.from(olit), n: olit.length };
}

export function scanPathsAdaptive(paths, settings, color, time) {
  // o orçamento de pontos vem de quantas vezes por segundo o feixe repassa o desenho (scanHz), não da taxa de quadros:
  // com ~1000 pontos a 30 mil pontos/s o desenho era repassado só 30 vezes por segundo e o olho via piscar
  const budget = Math.max(150, Math.round(settings.pps / (settings.scanHz || settings.fps)));
  const corner = Math.max(0, settings.corner | 0);
  const sw = settings.safe.w, sh = settings.safe.h;
  // pontos fora da zona segura são presos na borda e apagados
  const clip = (x, y) => { const inside = Math.abs(x) <= sw && Math.abs(y) <= sh; return [Math.max(-sw, Math.min(sw, x)), Math.max(-sh, Math.min(sh, y)), inside]; };
  let L = 0; const lens = paths.map(p => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); L += l; return l; });
  const overhead = paths.length * (2 * corner + 6) + paths.reduce((a, p) => a + p.length * 0.5, 0);
  const step = Math.max(0.0035, L / Math.max(50, budget - overhead));
  const xy = [], rgb = [], lit = [];
  const push = (x, y, on, u) => { const [cx, cy, inside] = clip(x, y); xy.push(cx, cy); const c = on && inside ? colorAt(color, u, time) : [0, 0, 0]; rgb.push(c[0], c[1], c[2]); lit.push(on && inside ? 1 : 0); };
  let acc = 0, last = null;
  paths.forEach((p, pi) => {
    if (p.length < 2) return;
    // viagem apagada do fim do caminho anterior até o começo deste
    if (last) { const d = Math.hypot(p[0][0] - last[0], p[0][1] - last[1]); const k = Math.max(2, Math.min(12, Math.round(d / (step * 3)))); for (let i = 1; i <= k; i++) push(last[0] + (p[0][0] - last[0]) * i / k, last[1] + (p[0][1] - last[1]) * i / k, 0, 0); }
    else push(p[0][0], p[0][1], 0, 0);
    for (let i = 0; i < corner; i++) push(p[0][0], p[0][1], 0, 0);          // chega apagado e para
    for (let i = 0; i < corner; i++) push(p[0][0], p[0][1], 1, acc / L);    // acende parado
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i], d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(d / step));
      for (let j = 1; j <= n; j++) { const u = (acc + d * j / n) / (L || 1); push(x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n, 1, u); }
      acc += d;
      // canto fechado: demora no vértice para o galvo chegar lá
      if (i < p.length - 1) { const [x2, y2] = p[i + 1]; const a1 = Math.atan2(y1 - y0, x1 - x0), a2 = Math.atan2(y2 - y1, x2 - x1); let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da; if (da > 0.4) for (let k = 0; k < corner; k++) push(x1, y1, 1, acc / (L || 1)); }
    }
    const e = p[p.length - 1];
    for (let i = 0; i < corner; i++) push(e[0], e[1], 1, acc / (L || 1));
    push(e[0], e[1], 0, 0);
    last = e;
  });
  return { xy: Float32Array.from(xy), rgb: Float32Array.from(rgb), lit: Uint8Array.from(lit), n: lit.length };
}

export function renderPoints(frame, settings, time, audio = 0) {
  const paths = frame ? framePaths(frame, time, audio) : [];
  return scanPaths(paths, settings, frame ? frame.color : { mode: 'solid', c1: '#000000' }, time);
}
// pontos para o LaserCube: x y r g b em 0..4095, com brilho e espelho da saída
export function toU16(scan, settings) {
  scan = mapScan(scan, settings);
  const out = new Uint16Array(scan.n * 5), b = settings.bright;
  for (let i = 0; i < scan.n; i++) {
    let x = scan.xy[i * 2], y = scan.xy[i * 2 + 1];
    if (settings.flipX) x = -x; if (settings.flipY) y = -y;
    out[i * 5] = Math.round((x + 1) / 2 * 4095); out[i * 5 + 1] = Math.round((y + 1) / 2 * 4095);
    out[i * 5 + 2] = Math.round(scan.rgb[i * 3] * b * 4095); out[i * 5 + 3] = Math.round(scan.rgb[i * 3 + 1] * b * 4095); out[i * 5 + 4] = Math.round(scan.rgb[i * 3 + 2] * b * 4095);
  }
  return out;
}

// ---------- desenho à mão: simplificação (Ramer-Douglas-Peucker) ----------
export function simplify(pts, tol = 0.006) {
  if (pts.length < 3) return pts.slice();
  const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const rec = (a, b) => { let m = 0, mi = -1; for (let i = a + 1; i < b; i++) { const d = dist(pts[i], pts[a], pts[b]); if (d > m) { m = d; mi = i; } } return m > tol ? [...rec(a, mi), ...rec(mi, b).slice(1)] : [pts[a], pts[b]]; };
  return rec(0, pts.length - 1);
}

// ---------- SVG ----------
// Importa qualquer SVG: cada elemento geométrico é amostrado ao longo do comprimento (o
// navegador faz as contas das curvas); saltos entre subcaminhos viram caminhos separados.
export function svgToPaths(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement; if (!root || root.nodeName !== 'svg') throw new Error('Não é um SVG');
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1000px;height:1000px;visibility:hidden';
  const svg = document.importNode(root, true); host.appendChild(svg); document.body.appendChild(host);
  const raw = [];
  try {
    const els = svg.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
    const rootM = svg.getScreenCTM();
    for (const e of els) {
      let len; try { len = e.getTotalLength(); } catch { continue; }
      if (!(len > 0)) continue;
      const m = e.getScreenCTM(); if (!m) continue;
      const toRoot = rootM.inverse().multiply(m);
      const n = Math.max(12, Math.min(2000, Math.round(len / 2)));
      const step = len / n; let cur = [], prev = null;
      for (let i = 0; i <= n; i++) {
        const p = e.getPointAtLength(Math.min(len, i * step)), q = new DOMPoint(p.x, p.y).matrixTransform(toRoot), pt = [q.x, q.y];
        if (prev && Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) > step * 2.5 + 1e-6) { if (cur.length > 1) raw.push(cur); cur = []; }
        cur.push(pt); prev = pt;
      }
      if (cur.length > 1) raw.push(cur);
    }
  } finally { host.remove(); }
  if (!raw.length) throw new Error('O SVG não tem linhas nem formas');
  // normaliza para caber em -0.9..0.9 mantendo a proporção; y do SVG cresce para baixo
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of raw) for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const k = 1.8 / Math.max(x1 - x0, y1 - y0, 1e-6), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return raw.map(p => simplify(p.map(([x, y]) => [(x - cx) * k, -(y - cy) * k]), 0.004));
}
export function pathsToSvg(paths) {
  const body = paths.map(p => `  <polyline fill="none" stroke="#fff" stroke-width="0.01" points="${p.map(([x, y]) => x.toFixed(4) + ',' + (-y).toFixed(4)).join(' ')}"/>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2" width="1000" height="1000">\n  <rect x="-1" y="-1" width="2" height="2" fill="#000"/>\n${body}\n</svg>\n`;
}

// ---------- salvar e abrir ----------
export function serializeLaser(frames, settings, activeId) {
  return JSON.stringify({ v: 1, settings, active: activeId, frames: frames.map(f => ({ name: f.name, kind: f.kind, text: f.text, paths: f.kind === 'contour' ? [] : f.paths, contour: f.contour, color: f.color, distort: f.distort, pos: f.pos })) });
}
export function deserializeLaser(json) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  const frames = (d.frames || []).map(s => { const f = mkFrame(s.name || 'Quadro', s.kind || 'draw'); Object.assign(f.text, s.text || {}); f.paths = (s.paths || []).map(p => p.map(q => [+q[0], +q[1]])); Object.assign(f.color, s.color || {}); Object.assign(f.distort, s.distort || {}); Object.assign(f.pos, s.pos || {}); if (s.contour) f.contour = { ...s.contour }; return f; });
  const settings = Object.assign(LASER_DEFAULTS(), d.settings || {});
  // o LaserCube de teste (Wi-Fi, 2026-10-14) mostra o desenho espelhado na horizontal: arquivos sem a marca de calibração ganham o espelho horizontal
  if (!(d.settings && d.settings.flipCal)) { settings.flipX = true; settings.flipCal = 1; }
  // quadros salvos antes de a cor fixa virar o padrão: o arco-íris (a cor antiga padrão) vira verde fixo, uma vez só
  if (!(d.settings && d.settings.colorCal)) { for (const f of frames) if (f.color.mode === 'rainbow') { f.color.mode = 'solid'; f.color.c1 = '#00ff00'; } settings.colorCal = 1; }
  settings.map = Object.assign(MAP_DEFAULTS(), d.settings && d.settings.map || {}); if (settings.map.mesh.length !== (3 * settings.map.divX + 1) * (3 * settings.map.divY + 1)) settings.map.mesh = meshFromRect(-1, -1, 2, 2, settings.map.divX, settings.map.divY);
  return { frames, settings, active: d.active != null ? frames[d.frames.findIndex((_, i) => i === d.active)] : null };
}

// ---------- pintura do feixe num canvas 2D (prévia e espelho na projeção) ----------
export function paintScan(cx, W, H, scan, showPoints, scale = 1) {
  const k = Math.min(W, H) / 2 * scale, ox = W / 2, oy = H / 2;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
  if (!scan || !scan.n) return;
  const X = (i) => ox + scan.xy[i * 2] * k, Y = (i) => oy - scan.xy[i * 2 + 1] * k;
  cx.lineCap = 'round'; cx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    cx.lineWidth = (pass ? 1.6 : 6) * Math.max(1, W / 1000); cx.globalAlpha = pass ? 1 : 0.35;
    for (let i = 1; i < scan.n; i++) {
      if (!(scan.lit[i] && scan.lit[i - 1])) continue;
      cx.strokeStyle = `rgb(${scan.rgb[i * 3] * 255 | 0},${scan.rgb[i * 3 + 1] * 255 | 0},${scan.rgb[i * 3 + 2] * 255 | 0})`;
      cx.beginPath(); cx.moveTo(X(i - 1), Y(i - 1)); cx.lineTo(X(i), Y(i)); cx.stroke();
    }
  }
  cx.globalAlpha = 1;
  if (showPoints) {
    cx.setLineDash([2, 4]); cx.strokeStyle = '#666'; cx.lineWidth = 1; cx.beginPath();
    for (let i = 1; i < scan.n; i++) { if (scan.lit[i] && scan.lit[i - 1]) continue; cx.moveTo(X(i - 1), Y(i - 1)); cx.lineTo(X(i), Y(i)); }
    cx.stroke(); cx.setLineDash([]);
    for (let i = 0; i < scan.n; i++) { cx.fillStyle = scan.lit[i] ? '#fff' : '#555'; cx.fillRect(X(i) - 1, Y(i) - 1, 2, 2); }
  }
}

// ---------- contorno da projeção: bordas da imagem viram caminhos do laser ----------
// Recebe os pixels de uma versão pequena da composição, acha a linha onde o brilho cruza o
// limiar (marching squares) e emenda os segmentos em caminhos. Coordenadas em -1..1, com a
// proporção da imagem preservada (a largura ocupa -1..1).
export function contourPaths(data, w, h, level = 0.4, tol = 0.01) {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
  const segs = [];
  const at = (x, y) => lum[y * w + x];
  const lerp = (x0, y0, x1, y1) => { const a = at(x0, y0), b = at(x1, y1); const t = (level - a) / ((b - a) || 1e-9); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; };
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const c = (at(x, y) >= level ? 8 : 0) | (at(x + 1, y) >= level ? 4 : 0) | (at(x + 1, y + 1) >= level ? 2 : 0) | (at(x, y + 1) >= level ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const T = () => lerp(x, y, x + 1, y), R = () => lerp(x + 1, y, x + 1, y + 1), B = () => lerp(x, y + 1, x + 1, y + 1), Lf = () => lerp(x, y, x, y + 1);
    const e = { 1: [Lf, B], 2: [B, R], 3: [Lf, R], 4: [T, R], 5: [Lf, T, B, R], 6: [T, B], 7: [Lf, T], 8: [Lf, T], 9: [T, B], 10: [Lf, B, T, R], 11: [T, R], 12: [Lf, R], 13: [B, R], 14: [Lf, B] }[c];
    for (let i = 0; i < e.length; i += 2) segs.push([e[i](), e[i + 1]()]);
  }
  // emenda: segmentos que compartilham ponta viram um caminho só
  const key = (p) => Math.round(p[0] * 4) + ',' + Math.round(p[1] * 4);
  const ends = new Map(); segs.forEach((s, i) => { for (const p of s) { const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
  const used = new Uint8Array(segs.length), paths = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue; used[i] = 1;
    let path = [segs[i][0], segs[i][1]];
    for (let dir = 0; dir < 2; dir++) {
      for (let guard = 0; guard < 5000; guard++) {
        const end = path[path.length - 1], cands = (ends.get(key(end)) || []).filter(j => !used[j]);
        if (!cands.length) break;
        const j = cands[0]; used[j] = 1; const s = segs[j];
        path.push(key(s[0]) === key(end) ? s[1] : s[0]);
      }
      path.reverse();
    }
    if (path.length >= 3) paths.push(path);
  }
  const sx = 2 / w, sy = 2 / h * (h / w);   // largura -1..1; altura na proporção
  return paths.map(p => simplify(p.map(([x, y]) => [x * sx - 1, (h / w) - y * sy]), tol)).filter(p => p.length >= 2);
}
