// Automape: mapear sozinho a partir de uma foto. A pessoa liga o projetor com a borda e a malha, fotografa de
// logo acima da lente, manda a foto; o programa acha o quadro do projetor (homografia foto → projetor), as
// coisas que há na foto (IA nos exemplos; áreas escuras/superfícies em qualquer foto) e cria slices e máscaras
// na Saída avançada. Bloco AM = funções puras (sem DOM); Automape = assistente em 7 passos com editor de pontos.
// Maquete de referência: automape-mockup.html. Nomes e textos em português.
import { el } from './panel.js';
import { openDialog } from './menus.js';
import { homography } from './warp.js';
import { FACADE_JPG, ROOM_JPG, AI_RESULTS, PLURAL, IGNORE_CLASSES, ptLabel, cap, makeSample, AN } from './automape-samples.js';

export const AM = (() => {
  // inversa da matriz 3×3 [[a,b,c],[d,e,f],[g,h,i]] (no app entra em warp.js como inverseHomography)
  function invert(M) {
    const { a, b, c, d, e, f, g, h } = M, i = M.i == null ? 1 : M.i;   // a homografia do warp.js não guarda o i (= 1)
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g);
    const G = b * f - c * e, Hh = -(a * f - c * d), I = a * e - b * d;
    const det = a * A + b * B + c * C; if (Math.abs(det) < 1e-12) return null;
    const k = 1 / det; return { a: A * k, b: D * k, c: G * k, d: B * k, e: E * k, f: Hh * k, g: C * k, h: F * k, i: I * k };
  }
  function apply(M, x, y) { const w = M.g * x + M.h * y + M.i; return [(M.a * x + M.b * y + M.c) / w, (M.d * x + M.e * y + M.f) / w]; }
  // função que leva um ponto da foto ao pixel do projetor (quadro = 4 cantos do projetor na foto)
  function photoToProjector(frame, W, H) {
    const inv = invert(homography(frame)); if (!inv) return null;
    return (p) => { const [u, v] = apply(inv, p[0], p[1]); return [u * W, v * H]; };
  }

  // --- imagem em cinza, desfoque, bordas ---
  function toGray(data, w, h) { const g = new Float32Array(w * h); for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114; return g; }
  function blur3(g, w, h) {
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; const k = (dx === 0 && dy === 0) ? 4 : ((dx === 0 || dy === 0) ? 2 : 1); s += g[yy * w + xx] * k; n += k; } }
      o[y * w + x] = s / n;
    }
    return o;
  }
  // mediana 3×3: apaga linhas de 1 px (a malha projetada) e mantém as bordas de verdade
  function median3(g, w, h) {
    const o = new Float32Array(w * h), v = new Float32Array(9);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = Math.min(h - 1, Math.max(0, y + dy)); for (let dx = -1; dx <= 1; dx++) { const xx = Math.min(w - 1, Math.max(0, x + dx)); v[n++] = g[yy * w + xx]; } }
      for (let i = 1; i < 9; i++) { const t = v[i]; let j = i - 1; while (j >= 0 && v[j] > t) { v[j + 1] = v[j]; j--; } v[j + 1] = t; }
      o[y * w + x] = v[4];
    }
    return o;
  }
  // mediana 5×5: apaga linhas de até 2 px (a malha projetada em fotos grandes) e mantém as bordas de verdade
  function median5(g, w, h) {
    const o = new Float32Array(w * h), v = new Float32Array(25);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -2; dy <= 2; dy++) { const yy = Math.min(h - 1, Math.max(0, y + dy)); for (let dx = -2; dx <= 2; dx++) { const xx = Math.min(w - 1, Math.max(0, x + dx)); v[n++] = g[yy * w + xx]; } }
      for (let i = 1; i < 25; i++) { const t = v[i]; let j = i - 1; while (j >= 0 && v[j] > t) { v[j + 1] = v[j]; j--; } v[j + 1] = t; }
      o[y * w + x] = v[12];
    }
    return o;
  }
  // engrossa em 1 px o conjunto dos pixels de borda (fecha furos de até 2 px onde a malha cruza uma borda)
  function dilate(mask, w, h) {
    const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!mask[i]) continue;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; o[yy * w + xx] = 1; } }
    }
    return o;
  }
  function sobel(g, w, h) {
    const m = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
      const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
      m[i] = Math.hypot(gx, gy) / 4;
    }
    return m;
  }
  // limiar de Otsu: separa o escuro do claro pelo histograma
  function otsu(g) {
    const hist = new Uint32Array(256); for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, g[i] | 0))]++;
    const n = g.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 0;
    for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sumB += t * hist[t]; const mB = sumB / wB, mF = (sum - sumB) / wF; const v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; thr = t; } }
    return thr;
  }
  // limiar entre o escuro (sem luz) e o iluminado. O Otsu sozinho pode cortar entre a parede iluminada e as
  // superfícies mais claras; então corta de novo dentro da classe escura e fica com esse corte se ele
  // separa de verdade (as médias das duas metades ficam a pelo menos 30 % da distância do primeiro corte).
  function litThreshold(g) {
    const t1 = otsu(g); let s0 = 0, n0 = 0, s1 = 0, n1 = 0;
    for (let i = 0; i < g.length; i++) { if (g[i] > t1) { s1 += g[i]; n1++; } else { s0 += g[i]; n0++; } }
    if (!n0 || !n1) return t1;
    const low = new Float32Array(n0); for (let i = 0, j = 0; i < g.length; i++) if (g[i] <= t1) low[j++] = g[i];
    const t2 = otsu(low); let a = 0, na = 0, b = 0, nb = 0;
    for (let i = 0; i < low.length; i++) { if (low[i] > t2) { b += low[i]; nb++; } else { a += low[i]; na++; } }
    if (!na || !nb) return t1;
    const sep1 = s1 / n1 - s0 / n0, sep2 = b / nb - a / na;
    return sep2 > sep1 * 0.3 ? t2 : t1;
  }
  // componentes conexos (4 vizinhos) dos pixels com mask != 0; flood fill com pilha própria, nunca recursivo
  function components(mask, w, h) {
    const lab = new Int32Array(w * h), comps = [], stack = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || lab[s]) continue;
      const id = comps.length + 1, c = { id, area: 0, first: s, minx: w, miny: h, maxx: 0, maxy: 0, border: 0 };
      let sp = 0; stack[sp++] = s; lab[s] = id;
      while (sp) {
        const i = stack[--sp]; c.area++; const x = i % w, y = (i - x) / w;
        if (x < c.minx) c.minx = x; if (x > c.maxx) c.maxx = x; if (y < c.miny) c.miny = y; if (y > c.maxy) c.maxy = y;
        if (x > 0 && mask[i - 1] && !lab[i - 1]) { lab[i - 1] = id; stack[sp++] = i - 1; }
        if (x < w - 1 && mask[i + 1] && !lab[i + 1]) { lab[i + 1] = id; stack[sp++] = i + 1; }
        if (y > 0 && mask[i - w] && !lab[i - w]) { lab[i - w] = id; stack[sp++] = i - w; }
        if (y < h - 1 && mask[i + w] && !lab[i + w]) { lab[i + w] = id; stack[sp++] = i + w; }
      }
      comps.push(c);
    }
    return { lab, comps };
  }
  // contorno externo de um componente: traçado de Moore em sentido horário, a partir do pixel mais acima à esquerda
  function traceContour(lab, id, w, h, start, area) {
    const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && lab[y * w + x] === id;
    const step = (x, y, b) => { for (let k = 1; k <= 8; k++) { const di = (b + k) % 8, nx = x + dirs[di][0], ny = y + dirs[di][1]; if (inside(nx, ny)) return [nx, ny, (di + 6) % 8]; } return null; };
    const sx = start % w, sy = (start - sx) / w, pts = [[sx, sy]];
    const first = step(sx, sy, 4); if (!first) return pts;   // pixel isolado
    let [x, y, b] = first, it = 0; const cap = 4 * (area || w * h) + 16;
    for (;;) {
      pts.push([x, y]);
      const nx = step(x, y, b); if (!nx) break;
      [x, y, b] = nx;
      // parada de Jacob: voltou ao pixel inicial e vai sair dele pelo mesmo caminho da primeira vez
      if (x === sx && y === sy) { const again = step(x, y, b); if (!again || (again[0] === first[0] && again[1] === first[1])) break; }
      if (++it > cap) break;
    }
    return pts;
  }
  // Douglas-Peucker num caminho aberto
  function simplifyOpen(pts, tol) {
    if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const [px, py] = pts[i]; const d = L < 1e-6 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
      if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    const out = []; for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]); return out;
  }
  // num contorno fechado: parte no ponto mais longe do começo e simplifica as duas metades
  function simplifyClosed(pts, tol) {
    if (pts.length < 4) return pts.slice();
    let f = 0, fd = -1; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; f = i; } }
    const a = simplifyOpen(pts.slice(0, f + 1), tol), b = simplifyOpen(pts.slice(f).concat([pts[0]]), tol);
    const out = a.concat(b.slice(1)); out.pop(); return out;
  }
  function area(p) { let s = 0; for (let i = 0, n = p.length; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function centroid(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
  function bbox(p) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  // casco convexo (cadeia monótona)
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  // ordena 4 cantos como cima-esq, cima-dir, baixo-dir, baixo-esq
  function orderQuad(q) {
    const c = centroid(q); const s = q.slice().sort((a, b) => Math.atan2(a[1] - c[1], a[0] - c[0]) - Math.atan2(b[1] - c[1], b[0] - c[0]));
    let k = 0; for (let i = 1; i < 4; i++) if (s[i][0] + s[i][1] < s[k][0] + s[k][1]) k = i;
    return [s[k], s[(k + 1) % 4], s[(k + 2) % 4], s[(k + 3) % 4]];
  }
  // o quadrilátero de maior área com vértices no casco: os 4 cantos "de verdade" de uma forma em perspectiva
  function bestQuad(pts) {
    let hp = hull(pts); if (hp.length <= 4) { while (hp.length < 4) hp.push(hp[hp.length - 1]); return orderQuad(hp); }
    if (hp.length > 28) { const step = hp.length / 28, s = []; for (let i = 0; i < 28; i++) s.push(hp[Math.floor(i * step)]); hp = s; }
    const n = hp.length; let best = -1, bq = null;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) for (let l = k + 1; l < n; l++) {
      const a = area([hp[i], hp[j], hp[k], hp[l]]); if (a > best) { best = a; bq = [hp[i], hp[j], hp[k], hp[l]]; }
    }
    return orderQuad(bq);
  }
  // ponto dentro de um quadrilátero convexo
  function insideQuad(q, x, y) {
    let pos = 0, neg = 0;
    for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c > 0) pos++; else if (c < 0) neg++; }
    return !(pos && neg);
  }
  const scalePts = (pts, k) => pts.map(p => [p[0] * k, p[1] * k]);

  // --- 1) quadro do projetor: a maior mancha clara da foto ---
  // img = { gray, w, h } na escala de trabalho. Devolve 4 cantos (cima-esq, cima-dir, baixo-dir, baixo-esq) ou null.
  function findProjectorFrame(img) {
    const { gray, w, h } = img, g = blur3(median5(gray, w, h), w, h), thr = litThreshold(g);
    const mask = new Uint8Array(w * h); for (let i = 0; i < mask.length; i++) mask[i] = g[i] > thr ? 1 : 0;
    const { lab, comps } = components(mask, w, h); if (!comps.length) return null;
    const big = comps.reduce((a, b) => b.area > a.area ? b : a);
    const edge = [];
    for (let y = big.miny; y <= big.maxy; y++) for (let x = big.minx; x <= big.maxx; x++) {
      const i = y * w + x; if (lab[i] !== big.id) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || lab[i - 1] !== big.id || lab[i + 1] !== big.id || lab[i - w] !== big.id || lab[i + w] !== big.id) edge.push([x, y]);
    }
    if (edge.length < 4) return null;
    return bestQuad(edge);
  }

  // --- 2) superfícies dentro do quadro ---
  // opts: { detail 10..120, minArea % do quadro, smooth px, frame 4 cantos na escala de trabalho, includeBg }
  // Devolve [{ poly, quad, isQuad, area, bg }] na escala de trabalho, do maior para o menor.
  function detectSurfaces(img, opts) {
    const { gray, w, h } = img, { frame } = opts;
    const thr = 130 - opts.detail;
    const m = sobel(blur3(median5(gray, w, h), w, h), w, h);
    // histerese (como no Canny): borda forte acima do limiar; borda fraca (55 % do limiar) só conta se estiver
    // ligada a uma forte. Fecha os trechos em que a malha projetada cruza uma borda e enfraquece o degrau.
    const lo = thr * 0.55, edge0 = new Uint8Array(w * h), st = new Int32Array(w * h); let sp = 0;
    for (let i = 0; i < w * h; i++) if (m[i] >= thr) { edge0[i] = 1; st[sp++] = i; }
    while (sp) {
      const i = st[--sp], x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; const j = yy * w + xx; if (!edge0[j] && m[j] >= lo) { edge0[j] = 1; st[sp++] = j; } } }
    }
    const edge = dilate(edge0, w, h);
    const inF = new Uint8Array(w * h), mask = new Uint8Array(w * h); let frameArea = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (insideQuad(frame, x, y)) { inF[i] = 1; frameArea++; if (!edge[i]) mask[i] = 1; } }
    if (!frameArea) return [];
    const { lab, comps } = components(mask, w, h);
    // faixa junto à borda do quadro (3 % da largura dele): o fundo é quem mais ocupa essa faixa
    const fb = bbox(frame), band = Math.max(3, fb.w * 0.03);
    const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    let totalBand = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!mask[i]) continue;
      let d = Infinity; for (let e = 0; e < 4; e++) d = Math.min(d, segDist(x, y, frame[e], frame[(e + 1) % 4]));
      if (d < band) { totalBand++; comps[lab[i] - 1].border++; }
    }
    let bg = null; for (const c of comps) if (c.border > (bg ? bg.border : 0)) bg = c;
    if (bg && bg.border < totalBand * 0.15) bg = null;
    const minPx = frameArea * opts.minArea / 100, out = [];
    for (const c of comps) {
      if (c.area < minPx) continue;
      const isBg = c === bg; if (isBg && !opts.includeBg) continue;
      const contour = traceContour(lab, c.id, w, h, c.first, c.area); if (contour.length < 3) continue;
      const poly = simplifyClosed(contour, opts.smooth); if (poly.length < 3) continue;
      const quad = bestQuad(poly), aP = area(poly), aQ = area(quad), aH = area(hull(poly));
      const isQuad = aQ >= aP * 0.9 && aP >= aH * 0.92;
      out.push({ poly, quad, isQuad, area: c.area, areaPct: c.area / frameArea * 100, bg: isBg });
    }
    out.sort((a, b) => b.area - a.area);
    return out;
  }

  // dilatação e erosão com janela quadrada (2r+1), em duas passadas
  function dilateR(mask, w, h, r) {
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const xx = x + d; if (xx >= 0 && xx < w && mask[y * w + xx]) v = 1; } t[y * w + x] = v; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const yy = y + d; if (yy >= 0 && yy < h && t[yy * w + x]) v = 1; } o[y * w + x] = v; }
    return o;
  }
  function erodeR(mask, w, h, r) {
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 1; for (let d = -r; d <= r && v; d++) { const xx = x + d; if (xx < 0 || xx >= w || !mask[y * w + xx]) v = 0; } t[y * w + x] = v; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 1; for (let d = -r; d <= r && v; d++) { const yy = y + d; if (yy < 0 || yy >= h || !t[yy * w + x]) v = 0; } o[y * w + x] = v; }
    return o;
  }

  // --- 2b) janelas: manchas escuras (vidro e caixilho) sobre a fachada clara ---
  // opts: { detail 10..120 (limiar de escuro em torno do Otsu), minArea % do quadro, smooth = raio do fechamento (px),
  //         frame 4 cantos na escala de trabalho, rectOnly }
  // Devolve [{ poly, quad, isQuad, area, areaPct, bg:false }] em ordem de leitura (de cima para baixo, da esquerda para a direita).
  function detectWindows(img, opts) {
    const { gray, w, h } = img, { frame } = opts, g = median3(gray, w, h);
    const inF = new Uint8Array(w * h); let frameArea = 0; const vals = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (insideQuad(frame, x, y)) { inF[i] = 1; frameArea++; vals.push(g[i]); } }
    if (!frameArea) return [];
    const T = Math.max(8, Math.min(247, otsu(Float32Array.from(vals)) + (opts.detail - 80)));
    let dark = new Uint8Array(w * h); for (let i = 0; i < dark.length; i++) dark[i] = inF[i] && g[i] < T ? 1 : 0;
    // fechamento: junta os vidros de uma mesma janela separados por caixilhos finos e reflexos claros
    const r = Math.max(0, Math.round(opts.smooth)); if (r) dark = erodeR(dilateR(dark, w, h, r), w, h, r);
    const { lab, comps } = components(dark, w, h);
    const fb = bbox(frame), minPx = frameArea * opts.minArea / 100, out = [];
    // distância de um ponto às bordas do quadro: o que encosta no quadro está cortado pela foto ou pela luz, não é janela inteira
    const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
    const edgeDist = (x, y) => { let d = Infinity; for (let e = 0; e < 4; e++) d = Math.min(d, segDist(x, y, frame[e], frame[(e + 1) % 4])); return d; };
    const tol = 2 * r + 2;
    for (const c of comps) {
      if (c.area < minPx) continue;
      if (c.maxx - c.minx + 1 > fb.w * 0.9 || c.maxy - c.miny + 1 > fb.h * 0.9) continue;   // é o fundo, não uma janela
      if (opts.rectOnly) {
        const xs = [c.minx, (c.minx + c.maxx) / 2, c.maxx], ys = [c.miny, (c.miny + c.maxy) / 2, c.maxy]; let touch = false;
        for (const x of xs) for (const y of ys) if (edgeDist(x, y) < tol) touch = true;
        if (touch) continue;
      }
      const contour = traceContour(lab, c.id, w, h, c.first, c.area); if (contour.length < 3) continue;
      const poly = simplifyClosed(contour, 2); if (poly.length < 3) continue;
      const quad = bestQuad(poly), fill = c.area / Math.max(1, area(quad)), convex = area(poly) / Math.max(1, area(hull(poly)));
      if (opts.rectOnly && (fill < 0.6 || convex < 0.72)) continue;   // mato, carro, sombra: recortado, não enche o retângulo
      out.push({ poly, quad, isQuad: fill >= 0.8, area: c.area, areaPct: c.area / frameArea * 100, bg: false, cy: (c.miny + c.maxy) / 2, cx: (c.minx + c.maxx) / 2 });
    }
    const band = Math.max(4, fb.h * 0.05);
    out.sort((a, b) => Math.floor(a.cy / band) - Math.floor(b.cy / band) || a.cx - b.cx);
    return out;
  }

  // --- 3b) formas → máscaras de saída no formato de mkMask (app/screens.js): polígono em px do projetor ---
  function toMasks(surfaces, frame, opts) {
    const W = opts.compW || 1920, H = opts.compH || 1080, map = photoToProjector(frame, W, H); if (!map) return [];
    const rp = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
    return surfaces.map((s, n) => ({ type: 'mask', name: s.name || ((opts.names || 'Janela ') + (n + 1)), pts: ((opts.shape === 'corners' || s.isQuad) ? s.quad : s.poly).map(map).map(rp), invert: false }));
  }

  // --- 3) superfícies → slices no formato de mkSlice (app/screens.js) ---
  // surfaces na escala da foto; frame = 4 cantos do quadro na foto; opts: { compW, compH, shape 'corners'|'mask', input 'whole'|'piece', naming 'slice'|'surface' }
  function toSlices(surfaces, frame, opts) {
    const W = opts.compW || 1920, H = opts.compH || 1080, map = photoToProjector(frame, W, H); if (!map) return [];
    const r1 = (v) => Math.round(v * 10) / 10, rp = (p) => [r1(p[0]), r1(p[1])];
    return surfaces.map((s, n) => {
      const quad = s.quad.map(map), poly = s.poly.map(map);
      let pts, inMask = null;
      if (opts.shape === 'corners' || s.isQuad) pts = quad;
      else { const bb = bbox(poly); pts = [[bb.x, bb.y], [bb.x + bb.w, bb.y], [bb.x + bb.w, bb.y + bb.h], [bb.x, bb.y + bb.h]]; inMask = { pts: poly.map(p => [Math.round((p[0] - bb.x) / bb.w * 1000) / 1000, Math.round((p[1] - bb.y) / bb.h * 1000) / 1000]), invert: false }; }
      const bb = bbox(pts);
      const inRect = opts.input === 'piece'
        ? { x: Math.max(0, bb.x), y: Math.max(0, bb.y), w: Math.min(W, bb.x + bb.w) - Math.max(0, bb.x), h: Math.min(H, bb.y + bb.h) - Math.max(0, bb.y), rot: 0 }
        : { x: 0, y: 0, w: W, h: H, rot: 0 };
      for (const k of ['x', 'y', 'w', 'h']) inRect[k] = r1(inRect[k]);
      return { name: s.name || ((opts.names || 'Slice ') + (n + 1)), in: inRect, warp: { mode: 'corners', pts: pts.map(rp) }, inMask };
    });
  }

  return { homography, invert, apply, photoToProjector, toGray, blur3, median3, median5, dilate, sobel, otsu, litThreshold, components, traceContour, simplifyClosed, area, centroid, bbox, hull, bestQuad, orderQuad, insideQuad, scalePts, findProjectorFrame, detectSurfaces, detectWindows, dilateR, erodeR, toMasks, toSlices };
})();

// ============================================================================================
//  Assistente do Automape: 7 passos, editor de pontos (reto/curvo, bezier, zoom, nova forma,
//  desfazer) e a criação dos slices e máscaras na Saída avançada. Mesmo fluxo da maquete
//  (automape-mockup.html), agora sobre openDialog.
// ============================================================================================
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const NAMES = { window: 'Janela ', slice: 'Slice ', surface: 'Superfície ' };
const TIP_POINTS = '<b>Como ajustar o contorno</b> — clique numa forma para selecionar; aí os pontos dela aparecem.<div class="anims">' + AN.card(AN.drag, 'Arraste um ponto branco para mover') + AN.card(AN.add, 'Duplo clique numa linha cria um ponto') + AN.card(AN.del, 'Duplo clique num ponto apaga') + AN.card(AN.bz, 'Ponto "Curvo": arraste o losango rosa. Com Ctrl, a alça mexe sozinha') + AN.card(AN.zoom, 'Roda do mouse: zoom; arraste o fundo: mover') + AN.card(AN.novo, '＋ Nova forma: clique os pontos, duplo clique fecha') + '</div>';
const ZOOM_MAX = 8;

export class Automape {
  // ctx: { compW, compH, toast(msg), setGrid(on), gridOn(), create(result) → cria na Saída avançada e abre o editor, desktop }
  constructor(ctx) {
    this.c = ctx; this.dlg = null; this.step = 0; this.tipSeen = false; this.UNDO = []; this.REDO = []; this.malhaSample = null;
    this.S = this.freshState();
    this.SAMPLES = {
      predio: { label: 'fachada de prédio', info: 'State Office Building, Madison (EUA). Foto CC BY-SA 2.0, Wikimedia Commons; só para o exemplo.', mode: 'ai', output: 'masks', naming: 'window', shape: 'corners', detail: 80, minArea: 0.1, smooth: 3, frame: (w, h) => [[0, Math.round(h * 0.04)], [w, Math.round(h * 0.04)], [w, h], [0, h]] },
      sala: { label: 'sala, dentro de casa', info: 'Cabana no Douthat State Park (EUA). Foto CC BY 2.0, Wikimedia Commons; só para o exemplo.', mode: 'ai', output: 'slices', naming: 'slice', shape: 'mask', detail: 80, minArea: 0.3, smooth: 3, frame: (w, h) => [[0, 0], [w, 0], [w, h], [0, h]] },
      malha: { label: 'parede com a malha', info: 'parede escura, a luz do projetor com borda e malha, e quatro superfícies (foto sintética com autoteste)', mode: 'surfaces', output: 'slices', naming: 'slice', shape: 'corners', detail: 80, minArea: 1, smooth: 3, frame: null },
    };
    // Esc cancela o desenho antes de fechar o diálogo; Ctrl+Z desfaz; Delete tira a forma selecionada
    addEventListener('keydown', (e) => { if (!this.dlg) return; if (e.key === 'Escape') { const box = this.$('wPhotoBox'); if (box && box._drawing) { this.cancelDrawing(box); e.stopImmediatePropagation(); e.preventDefault(); } } }, true);
    addEventListener('keydown', (e) => {
      if (!this.dlg) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) this.redo(); else this.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); e.stopPropagation(); this.redo(); return; }
      if (e.key === 'Delete' && this.editShape() && this.S.sel.has(this.S.editId)) { e.preventDefault(); this.toggleDrop(); }
    });
  }
  freshState() {
    return { photo: null, pw: 0, ph: 0, work: null, sample: '', truth: null, frame: null, autoFrame: true,
      mode: 'ai', output: 'masks', rectOnly: true, conf: 38, actions: {},
      detail: 80, minArea: 0.1, smooth: 3, includeBg: false, shape: 'corners', input: 'whole', naming: 'window',
      items: [], sel: new Set(), result: [], test: null, editId: 0, editPt: -1 };
  }
  $(id) { return this.dlg ? this.dlg.body.querySelector('#' + id) : null; }
  toast(m) { this.c.toast(m); }

  // ---------- abrir e fechar ----------
  open(step) {
    if (this.dlg) { this.go(step || 0); return; }
    this.S = this.freshState(); this.UNDO = []; this.REDO = [];
    const d = openDialog({
      title: 'Automape', width: 800, cls: 'automape',
      build: (body) => { body.innerHTML = '<div id="wizHead"><span class="step" id="wStep"></span><span class="ttl" id="wTitle"></span><span class="dots" id="wDots"></span></div><div id="wizBody"></div><div class="wtip" id="wTip"></div>'; },
      buttons: [{ label: 'Cancelar' }, { label: 'Voltar', fn: () => { this.back(); return false; } }, { label: 'Começar', primary: true, fn: () => { this.next(); return false; } }],
    });
    this.dlg = d;
    const foot = d.body.parentNode.querySelector('.dfoot'); const bts = foot.querySelectorAll('button'); this.bBack = bts[1]; this.bNext = bts[2];
    const ob = new MutationObserver(() => { if (!document.body.contains(d.body)) { ob.disconnect(); this.onClosed(); } }); ob.observe(document.body, { childList: true });
    // soltar uma foto em cima do assistente
    d.body.addEventListener('dragover', (e) => { e.preventDefault(); const z = this.$('wDrop'); if (z) z.classList.add('over'); });
    d.body.addEventListener('dragleave', () => { const z = this.$('wDrop'); if (z) z.classList.remove('over'); });
    d.body.addEventListener('drop', (e) => { e.preventDefault(); const z = this.$('wDrop'); if (z) z.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) this.readFile(f); });
    this.go(step || 0);
  }
  onClosed() { this.dlg = null; if (this.c.gridOn() && this.ligouMalha) this.c.setGrid(false); this.ligouMalha = false; }   // a malha ligada pelo menu Saída fica
  close() { if (this.dlg) this.dlg.close(); }

  // ---------- passos ----------
  go(n) {
    this.step = n; const st = this.STEPS()[n]; const $ = (id) => this.$(id);
    $('wStep').textContent = 'Passo ' + (n + 1) + ' de 7'; $('wTitle').textContent = st.title;
    const dots = $('wDots'); dots.textContent = ''; for (let i = 0; i < 7; i++) dots.appendChild(el('i', i < n ? 'done' : i === n ? 'on' : ''));
    const body = $('wizBody'); body.textContent = ''; st.build(body); $('wTip').innerHTML = st.tip;
    this.bBack.disabled = n === 0; this.bNext.textContent = st.next || 'Próximo';
    this.wizRefresh();
  }
  back() { if (this.step > 0) this.go(this.step - 1); }
  next() {
    if (this.step === 3 && !this.S.photo) { this.toast('Mande uma foto ou escolha um exemplo'); return; }
    if (this.step === 6) { this.create(); return; }
    this.go(this.step + 1);
  }
  create() {
    if (!this.S.result.length) { this.toast('Nada marcado para criar'); return; }
    const r = this.c.create(this.S.result); this.toast('Criado na Saída avançada: ' + this.resultWords()); this.close(); return r;
  }
  STEPS() {
    const self = this, c = this.c;
    return [
      { title: 'O que é o Automape', next: 'Começar', build(b) {
          b.appendChild(el('div', 'am-ilus')).innerHTML = ILUS;
          b.appendChild(el('p', 'lead')).innerHTML = 'Você tira <b>uma foto</b> do que o projetor ilumina. O OpenLume lê a foto com IA, descobre o que tem ali (janelas, portas, sofá, mesa, quadros…) e monta o mapa na Saída avançada. Leva uns dois minutos.';
          b.appendChild(el('p', '', 'Depois desta tela são seis passos. Em cada um há uma coisa só para fazer, e uma dica embaixo explicando o porquê.'));
        }, tip: '<b>Dica.</b> Funciona em fachada de prédio e dentro de casa. Depois de pronto, tudo continua ajustável na Saída avançada, como sempre.' },
      { title: 'Ligue o projetor e mostre a malha', build(b) {
          b.appendChild(el('p', 'lead')).innerHTML = 'Com o projetor ligado e apontado para o lugar, aperte o botão. O projetor passa a mostrar uma <b>borda clara</b> e uma <b>malha fina</b>.';
          const bt = el('button', 'big' + (c.gridOn() ? ' on' : ' neon'), c.gridOn() ? '✓ Malha ligada no projetor' : 'Mostrar a malha no projetor'); bt.type = 'button'; bt.id = 'wGridBtn';
          bt.onclick = () => { if (!c.gridOn()) self.ligouMalha = true; c.setGrid(!c.gridOn()); bt.classList.toggle('on', c.gridOn()); bt.classList.toggle('neon', !c.gridOn()); bt.textContent = c.gridOn() ? '✓ Malha ligada no projetor' : 'Mostrar a malha no projetor'; self.toast(c.gridOn() ? 'O projetor mostra a borda e a malha: agora fotografe' : 'Malha desligada'); };
          b.appendChild(bt);
          b.appendChild(el('div', 'anrow')).innerHTML = AN.card(AN.malha, 'o projetor acende a borda e a malha fina', true) + '<p>Olhe para a parede: a borda mostra até onde a luz vai, e a malha mostra como ela se deforma nas superfícies. A malha cobre a área total de projeção de cada tela, por cima de tudo, e sai sozinha quando o Automape fecha (ou liga e desliga no menu Saída).</p>';
        }, tip: '<b>Por quê?</b> A foto precisa registrar o tamanho exato da imagem do projetor. Sem a borda, o Automape não sabe onde a luz termina; sem a malha, não sabe o que está torto.' },
      { title: 'Tire a foto', build(b) {
          b.appendChild(el('div', 'anrow')).innerHTML = AN.card(AN.foto, 'celular logo acima da lente, foto com a malha inteira', true) + '<p class="lead">Com o celular, fotografe a parede com a malha projetada.</p>';
          b.appendChild(el('div', 'wok')).innerHTML = CERTO_ERRADO;
          b.appendChild(el('ol')).innerHTML = '<li><b>Encoste o celular logo acima da lente</b> do projetor, olhando para onde ele aponta.</li><li><b>Deixe a malha inteira dentro da foto.</b> Pode sobrar parede em volta; não pode cortar a borda.</li><li><b>Segure firme</b> e fotografe. Vale qualquer celular.</li>';
        }, tip: '<b>Por quê acima da lente?</b> Dali a câmera vê a cena quase do mesmo ponto que o projetor. É isso que faz o mapa cair no lugar certo em qualquer superfície, torta ou não.' },
      { title: 'Mande a foto', build(b) {
          b.appendChild(el('p', 'lead', 'Arraste a foto aqui, ou escolha o arquivo.'));
          const d = el('div', 'neon'); d.id = 'wDrop'; d.innerHTML = 'Solte a foto aqui<br><span style="color:#666">ou</span><br><button type="button" id="wFile">Escolher arquivo…</button><input type="file" id="wFileIn" accept="image/*" hidden>';
          b.appendChild(d); d.querySelector('#wFile').onclick = () => d.querySelector('#wFileIn').click();
          d.querySelector('#wFileIn').onchange = (e) => { if (e.target.files[0]) self.readFile(e.target.files[0]); };
          b.appendChild(el('p', '', 'Não tem uma foto agora? Use um exemplo:'));
          const sm = el('div', 'wsamples');
          const mk = (id, src, label, sub) => { const bt = el('button'); bt.type = 'button'; bt.id = id; bt.innerHTML = '<img src="' + src + '" alt=""><b>' + label + '</b><span style="color:#8a8a8a">' + sub + '</span>'; sm.appendChild(bt); return bt; };
          mk('wSamplePredio', FACADE_JPG, 'Fachada de prédio', 'muitas janelas').onclick = () => self.loadSample('predio').then(() => self.go(4));
          mk('wSampleSala', ROOM_JPG, 'Sala, dentro de casa', 'sofá, lareira, mesa…').onclick = () => self.loadSample('sala').then(() => self.go(4));
          if (!self.malhaSample) self.malhaSample = makeSample(AM);
          mk('wSampleMalha', self.malhaSample.canvas.toDataURL('image/jpeg', 0.6), 'Parede com a malha', 'quatro superfícies').onclick = () => self.loadSample('malha').then(() => self.go(4));
          b.appendChild(sm);
          if (self.S.photo) b.appendChild(el('p', 'wstatus', 'Foto carregada: ' + (self.SAMPLES[self.S.sample] ? 'exemplo (' + self.SAMPLES[self.S.sample].label + ')' : 'sua foto') + ', ' + self.S.pw + '×' + self.S.ph + ' px. Próximo para continuar.'));
        }, tip: '<b>Dica.</b> Qualquer foto de celular serve. Não precisa recortar nem endireitar: o Automape acha a borda da malha sozinho.' },
      { title: 'A IA leu a foto', build(b) {
          b.appendChild(el('div', 'wstatus', 'Lendo a foto… ✓ pronto'));
          const bar = el('div', 'zbar'); bar.id = 'wZbar'; b.appendChild(bar);
          const box = el('div'); box.id = 'wPhotoBox'; box.innerHTML = '<div class="zoomWrap"><canvas id="wCv"></canvas><svg id="wSvg"></svg></div>'; b.appendChild(box); self.makeZoomable(box, bar);
          const sum = el('p', 'lead'); sum.id = 'wSummary'; b.appendChild(sum);
          b.appendChild(el('p')).innerHTML = '<b>Quer ajustar?</b> Clique numa forma e mexa nos pontos dela. O botão <b>?</b> na barra mostra como (arrastar, criar, apagar, curvar, zoom, nova forma). <b>Ctrl+Z</b> desfaz.';
        }, tip: '<b>O que aconteceu aqui.</b> A IA olhou a foto, disse o que viu e recortou o contorno de cada coisa (sofá com forma de sofá, tapete oval). Nos exemplos o resultado é de verdade, calculado antes. A IA lendo fotos novas no seu computador vem na próxima versão; por enquanto, numa foto sua, o Automape acha as áreas escuras (janelas) ou as superfícies iluminadas. Os mesmos pontos continuam editáveis depois, na Saída avançada.' },
      { title: 'O que fazer com cada coisa', build(b) {
          b.appendChild(el('div', 'anrow')).innerHTML = AN.card(AN.mask, 'janela: quadrado preto · sofá: projetar nele', true) + '<p class="lead">Para cada tipo de coisa que a IA achou, escolha:</p>';
          b.appendChild(el('p')).innerHTML = '<b>Quadrado preto</b>: o projetor não acende ali. Bom para janela, porta, espelho.<br><b>Projetar nele</b>: vira um slice com o contorno exato da coisa, com conteúdo próprio. Bom para parede, sofá, caixa, tela.<br><b>Deixar quieto</b>: nada muda; a composição passa por cima como está.';
          const rows = el('div'); rows.id = 'wRows'; b.appendChild(rows); self.buildActionRows(rows);
        }, tip: '<b>Já vem escolhido.</b> Janela e porta nascem como quadrado preto; o resto, como "projetar nele". Troque o que quiser; dá para mudar depois na Saída avançada.' },
      { title: 'Veja como fica no projetor', next: 'Criar na Saída avançada', build(b) {
          const pv = svgEl('svg', { id: 'wPrev', viewBox: '0 0 ' + c.compW + ' ' + c.compH }); b.appendChild(pv);
          b.appendChild(el('div', 'wlegend')).innerHTML = '<span><i style="background:#6a6a6a"></i>sua composição</span><span><i style="background:#000;border-color:#F5D742"></i>quadrado preto (máscara)</span><span><i style="background:rgba(110,193,255,.5);border-color:#6EC1FF"></i>projetar nele (slice, no contorno)</span>';
          const t = el('p', 'lead'); t.id = 'wResTxt'; b.appendChild(t);
        }, tip: '<b>E depois?</b> Ao criar, tudo aparece na Saída avançada como slices e máscaras normais: você arrasta cantos, muda conteúdo, apaga o que não quiser. O Automape só poupa o começo.' },
    ];
  }

  // ---------- foto ----------
  shrink(src, maxW = 640) {
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const k = Math.min(1, maxW / Math.max(sw, sh)), w = Math.max(8, Math.round(sw * k)), h = Math.max(8, Math.round(sh * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h);
    return { gray: AM.toGray(x.getImageData(0, 0, w, h).data, w, h), w, h, scale: w / sw };
  }
  loadSample(name) {
    const sp = this.SAMPLES[name], S = this.S;
    const apply = (src, truth) => { Object.assign(S, { mode: sp.mode, output: sp.output, naming: sp.naming, shape: sp.shape || 'corners', detail: sp.detail, minArea: sp.minArea, smooth: sp.smooth, actions: {} }); this.loadPhoto(src, { sample: name, truth, frame: sp.frame }); };
    if (name === 'malha') { if (!this.malhaSample) this.malhaSample = makeSample(AM); apply(this.malhaSample.canvas, this.malhaSample.truth); return Promise.resolve(); }
    return new Promise((res) => { const img = new Image(); img.onload = () => { apply(img, null); res(); }; img.src = name === 'sala' ? ROOM_JPG : FACADE_JPG; });
  }
  readFile(f) {
    const img = new Image();
    img.onload = () => { const S = this.S; this.loadPhoto(img); if (S.mode === 'ai') { S.mode = 'windows'; S.output = 'masks'; S.naming = 'window'; S.shape = 'corners'; S.detail = 80; S.minArea = 0.1; S.smooth = 3; this.detect(); } this.toast('Foto carregada: ' + f.name); URL.revokeObjectURL(img.src); if (this.dlg) this.go(4); };
    img.onerror = () => this.toast('Não consegui abrir esse arquivo como imagem'); img.src = URL.createObjectURL(f);
  }
  loadPhoto(src, extra = {}) {
    const S = this.S;
    S.items = []; S.sel = new Set(); S.editId = 0; S.editPt = -1; this.UNDO = []; this.REDO = [];
    const wb = this.$('wPhotoBox'); if (wb) this.hideMiniTip(wb);
    S.photo = src; S.pw = src.naturalWidth || src.width; S.ph = src.naturalHeight || src.height;
    S.work = this.shrink(src); S.sample = extra.sample || ''; S.truth = extra.truth || null;
    if (extra.frame) { S.frame = extra.frame(S.pw, S.ph); S.autoFrame = false; } else { S.autoFrame = true; this.autoFrame(); }
    this.detect();
  }
  autoFrame() {
    const S = this.S, f = AM.findProjectorFrame(S.work);
    S.frame = f ? AM.scalePts(f, 1 / S.work.scale) : [[S.pw * 0.1, S.ph * 0.1], [S.pw * 0.9, S.ph * 0.1], [S.pw * 0.9, S.ph * 0.9], [S.pw * 0.1, S.ph * 0.9]];
  }

  // ---------- o que a IA achou ----------
  defaultAction(cls) { if (IGNORE_CLASSES.has(cls)) return 'ignore'; if (cls === 'janela' || cls === 'porta') return 'mask'; return 'slice'; }
  aiItems(name) {
    const S = this.S, R = AI_RESULTS[name]; if (!R) return [];
    const k = S.pw / R.w, photoArea = S.pw * S.ph;
    const iou = (a, b) => { const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[2], b[2]), y1 = Math.min(a[3], b[3]); const i = Math.max(0, x1 - x0) * Math.max(0, y1 - y0); const u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i; return u ? i / u : 0; };
    const contains = (a, b) => b[0] >= a[0] - 2 && b[1] >= a[1] - 2 && b[2] <= a[2] + 2 && b[3] <= a[3] + 2;
    let list = R.items.filter(it => it.conf >= S.conf).map(it => ({ cls: ptLabel(it.label), label: it.label, box: it.box.map(v => v * k), conf: it.conf, poly: it.poly }));
    list.sort((a, b) => b.conf - a.conf);
    const kept = []; for (const it of list) { if (kept.some(o => o.cls === it.cls && iou(o.box, it.box) > 0.6)) continue; kept.push(it); }
    const out = kept.filter(it => kept.filter(o => o !== it && o.cls === it.cls && contains(it.box, o.box)).length < 2)
      .filter(it => (it.box[2] - it.box[0]) * (it.box[3] - it.box[1]) < photoArea * 0.9 || IGNORE_CLASSES.has(it.cls));
    const band = Math.max(4, S.ph * 0.05);
    out.sort((a, b) => Math.floor((a.box[1] + a.box[3]) / 2 / band) - Math.floor((b.box[1] + b.box[3]) / 2 / band) || a.box[0] - b.box[0]);
    const counts = {};
    return out.map((it, i) => {
      const [x0, y0, x1, y1] = it.box, q = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      counts[it.cls] = (counts[it.cls] || 0) + 1;
      if (!(it.cls in S.actions)) S.actions[it.cls] = this.defaultAction(it.cls);
      const poly = it.poly ? it.poly.map(p => [p[0] * k, p[1] * k]) : q;
      const quad = it.poly ? AM.bestQuad(poly) : q, aP = AM.area(poly);
      const isQuad = !it.poly || (poly.length <= 6 && AM.area(quad) >= aP * 0.9 && aP >= AM.area(AM.hull(poly)) * 0.92);
      const item = { id: i + 1, poly, quad, isQuad, areaPct: aP / photoArea * 100, bg: false, cls: it.cls, conf: it.conf, name: cap(it.cls) + ' ' + counts[it.cls] };
      if (it.poly && !isQuad) this.autoSmooth(item);
      return item;
    });
  }
  detect() {
    const S = this.S; if (!S.work) return;
    const k = S.work.scale, frameW = AM.scalePts(S.frame, k), manual = S.items.filter(i => i.manual);
    if (S.mode === 'ai') { S.items = this.aiItems(S.sample); S.sel = new Set(S.items.filter(s => S.actions[s.cls] !== 'ignore').map(s => s.id)); }
    else {
      const list = S.mode === 'windows'
        ? AM.detectWindows(S.work, { detail: S.detail, minArea: S.minArea, smooth: S.smooth, frame: frameW, rectOnly: S.rectOnly })
        : AM.detectSurfaces(S.work, { detail: S.detail, minArea: S.minArea, smooth: S.smooth, frame: frameW, includeBg: S.includeBg });
      S.items = list.map((s, i) => ({ id: i + 1, poly: AM.scalePts(s.poly, 1 / k), quad: AM.scalePts(s.quad, 1 / k), isQuad: s.isQuad, areaPct: s.areaPct, bg: s.bg }));
      S.sel = new Set(S.items.map(s => s.id));
    }
    for (const m of manual) { m.id = Math.max(0, ...S.items.map(i => i.id)) + 1; S.items.push(m); S.sel.add(m.id); }
    this.selfTest(); this.render();
  }
  selfTest() {
    const S = this.S; S.test = null;
    if (S.mode === 'ai') { S.test = S.items.length ? { kind: 'ai', n: S.items.length } : null; return; }
    if (S.sample !== 'malha' || !S.truth) return;
    const map = AM.photoToProjector(S.frame, 1920, 1080); if (!map) { S.test = { kind: 'truth', ok: 0, n: S.truth.length }; return; }
    const tol = 1920 * 0.02; let ok = 0;
    for (const t of S.truth) { const tq = AM.orderQuad(t.map(map)); if (S.items.some(s => { const q = AM.orderQuad(s.quad.map(map)); return q.every((p, i) => Math.hypot(p[0] - tq[i][0], p[1] - tq[i][1]) < tol); })) ok++; }
    S.test = { kind: 'truth', ok, n: S.truth.length };
  }

  // ---------- formas, pontos e curvas ----------
  shapeOf(s) { return (this.S.shape === 'corners' || s.isQuad) ? s.quad : s.poly; }
  isLive(s) { return this.shapeOf(s) === s.poly; }
  ensureCtrl(s) { const n = s.poly.length; if (s.ctrl && s.ctrl.length === n) return s.ctrl; s.ctrl = s.poly.map(a => ({ out: [a[0], a[1]], in: [a[0], a[1]] })); return s.ctrl; }
  isSmooth(s, i) { const c = this.ensureCtrl(s)[i], a = s.poly[i]; return Math.hypot(c.out[0] - a[0], c.out[1] - a[1]) > 0.5 || Math.hypot(c.in[0] - a[0], c.in[1] - a[1]) > 0.5; }
  updateCurved(s) { this.ensureCtrl(s); s.curved = s.poly.some((_, i) => this.isSmooth(s, i)); }
  smoothPoint(s, i) { const n = s.poly.length, a = s.poly[i], p = s.poly[(i - 1 + n) % n], q = s.poly[(i + 1) % n]; const tx = (q[0] - p[0]) / 6, ty = (q[1] - p[1]) / 6; this.ensureCtrl(s); s.ctrl[i] = { out: [a[0] + tx, a[1] + ty], in: [a[0] - tx, a[1] - ty], linked: true }; this.updateCurved(s); }
  cornerPoint(s, i) { const a = s.poly[i]; this.ensureCtrl(s); s.ctrl[i] = { out: [a[0], a[1]], in: [a[0], a[1]] }; this.updateCurved(s); }
  // a IA viu redondo? onde o contorno vira pouco (menos de 40°), o ponto já nasce curvo
  autoSmooth(s) {
    const n = s.poly.length; if (n < 5) return; this.ensureCtrl(s);
    for (let i = 0; i < n; i++) { const a = s.poly[i], p = s.poly[(i - 1 + n) % n], q = s.poly[(i + 1) % n]; const a1 = Math.atan2(a[1] - p[1], a[0] - p[0]), a2 = Math.atan2(q[1] - a[1], q[0] - a[0]); let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d; if (d < 40 * Math.PI / 180) this.smoothPoint(s, i); }
    this.updateCurved(s);
  }
  flatPoly(s) {
    if (!this.isLive(s) || !s.curved) return this.shapeOf(s);
    const n = s.poly.length, out = []; this.ensureCtrl(s);
    const bez = (a, c1, c2, b, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]; };
    for (let i = 0; i < n; i++) { const a = s.poly[i], b = s.poly[(i + 1) % n], c1 = s.ctrl[i].out, c2 = s.ctrl[(i + 1) % n].in; for (let k = 0; k < 8; k++) out.push(bez(a, c1, c2, b, k / 8)); }
    return out;
  }
  pathOf(s) { const n = s.poly.length; this.ensureCtrl(s); let d = 'M' + s.poly[0].join(','); for (let i = 0; i < n; i++) { const b = s.poly[(i + 1) % n], c1 = s.ctrl[i].out, c2 = s.ctrl[(i + 1) % n].in; d += ' C' + c1.join(',') + ' ' + c2.join(',') + ' ' + b.join(','); } return d + ' Z'; }
  refreshShape(svg, s) { const pg = svg.querySelector('[data-id="' + s.id + '"]'); if (!pg) return; if (pg.tagName === 'path') pg.setAttribute('d', this.pathOf(s)); else pg.setAttribute('points', this.shapeOf(s).map(q => q.join(',')).join(' ')); }
  editShape() { return this.S.items.find(i => i.id === this.S.editId); }
  selected() { return this.S.items.filter(s => this.S.sel.has(s.id)); }
  actionOf(s) { const S = this.S; return S.mode === 'ai' ? (S.actions[s.cls] || 'slice') : S.output === 'masks' ? 'mask' : 'slice'; }
  currentResult() {
    const S = this.S, o = { compW: this.c.compW, compH: this.c.compH, shape: S.shape, input: S.input, names: NAMES[S.naming] };
    const sel = this.selected().map(s => (this.isLive(s) && s.curved) ? Object.assign({}, s, { poly: this.flatPoly(s) }) : s);
    if (S.mode !== 'ai') return S.output === 'masks' ? AM.toMasks(sel, S.frame, o) : AM.toSlices(sel, S.frame, o);
    return AM.toMasks(sel.filter(s => this.actionOf(s) === 'mask'), S.frame, o).concat(AM.toSlices(sel.filter(s => this.actionOf(s) === 'slice'), S.frame, o));
  }
  resultWords() {
    const nM = this.S.result.filter(r => r.type === 'mask').length, nS = this.S.result.length - nM, pl = (n, a, b) => n + ' ' + (n === 1 ? a : b);
    return nM && nS ? pl(nM, 'máscara', 'máscaras') + ' e ' + pl(nS, 'slice', 'slices') : nM ? pl(nM, 'máscara', 'máscaras') : pl(nS, 'slice', 'slices');
  }
  countWords() {
    const S = this.S, sel = this.selected(); if (!sel.length) return 'nada';
    if (S.mode === 'windows') return (sel.length === 1 ? '1 janela' : sel.length + ' janelas') + ' (áreas escuras)';
    if (S.mode === 'surfaces') return (sel.length === 1 ? '1 superfície' : sel.length + ' superfícies') + ' iluminadas';
    const counts = {}; for (const it of S.items) counts[it.cls] = (counts[it.cls] || 0) + 1;
    const parts = [], out = [];
    for (const cls of Object.keys(counts)) { const n = counts[cls], w = n === 1 ? cls : (PLURAL[cls] || cls); (S.actions[cls] === 'ignore' ? out : parts).push(n + ' ' + w); }
    return parts.join(', ') + (out.length ? ' (e ' + out.join(', ') + ', que fica de fora)' : '');
  }

  // ---------- desfazer ----------
  snapshot() { const S = this.S; this.UNDO.push({ items: JSON.parse(JSON.stringify(S.items)), sel: [...S.sel], editId: S.editId, editPt: S.editPt, actions: JSON.parse(JSON.stringify(S.actions)) }); this.REDO = []; if (this.UNDO.length > 50) this.UNDO.shift(); this.syncUndo(); }
  undo() { const u = this.UNDO.pop(); if (!u) { this.toast('Nada para desfazer'); return; } const S = this.S; this.REDO.push({ items: JSON.parse(JSON.stringify(S.items)), sel: [...S.sel], editId: S.editId, editPt: S.editPt, actions: JSON.parse(JSON.stringify(S.actions)) }); S.items = u.items; S.sel = new Set(u.sel); S.editId = u.editId; S.editPt = u.editPt; S.actions = u.actions; this.syncUndo(); this.render(); this.toast('Desfeito'); }
  // Ctrl+Shift+Z / Ctrl+Y: refaz o que o Ctrl+Z desfez (Felipe, 2026-10-30); uma mudança nova apaga o refazer
  redo() { const u = this.REDO.pop(); if (!u) { this.toast('Nada para refazer'); return; } const S = this.S; this.UNDO.push({ items: JSON.parse(JSON.stringify(S.items)), sel: [...S.sel], editId: S.editId, editPt: S.editPt, actions: JSON.parse(JSON.stringify(S.actions)) }); S.items = u.items; S.sel = new Set(u.sel); S.editId = u.editId; S.editPt = u.editPt; S.actions = u.actions; this.syncUndo(); this.render(); this.toast('Refeito'); }
  syncUndo() { if (!this.dlg) return; this.dlg.body.querySelectorAll('[data-z="undo"]').forEach(b => b.disabled = !this.UNDO.length); }

  // ---------- desenho da foto ----------
  render() {
    const S = this.S; S.result = this.currentResult(); this.wizRefresh();
  }
  sizeBox(box, maxW, maxH) { const S = this.S, k = Math.min(maxW / S.pw, maxH / S.ph); const w = Math.round(S.pw * k) + 'px', h = Math.round(S.ph * k) + 'px'; if (box.style.width !== w || box.style.height !== h) { box.style.width = w; box.style.height = h; this.zoomReset(box); } }
  drawPhoto(cv, svg) {
    const S = this.S, ai = S.mode === 'ai', masks = !ai && S.output === 'masks';
    if (cv.width !== S.pw || cv.height !== S.ph) { cv.width = S.pw; cv.height = S.ph; } cv.getContext('2d').drawImage(S.photo, 0, 0);
    svg.setAttribute('viewBox', '0 0 ' + S.pw + ' ' + S.ph); svg.setAttribute('preserveAspectRatio', 'none'); svg.textContent = '';
    const nameOf = (i) => NAMES[S.naming] + (i + 1); const box = svg.closest('#wPhotoBox');
    let n = 0;
    for (const s of S.items) {
      const on = S.sel.has(s.id); const idx = on ? n++ : -1; const mk = on && (masks || (ai && this.actionOf(s) === 'mask'));
      const cls = 'sf' + (mk ? ' mk' : '') + (ai && !mk ? ' ai' : '') + (on ? '' : ' off') + (s.bg ? ' bgs' : '') + (S.editId === s.id ? ' active' : '');
      const pg = this.isLive(s) ? svgEl('path', { d: this.pathOf(s), class: cls, 'data-id': s.id }) : svgEl('polygon', { points: this.flatPoly(s).map(p => p.join(',')).join(' '), class: cls, 'data-id': s.id });
      pg.onclick = () => { if (box && (box._panned || box._drawing)) return; if (S.editId !== s.id) { S.editId = s.id; S.editPt = -1; this.render(); } };
      pg.ondblclick = (e) => { if (box && box._drawing) return; e.stopPropagation(); const b = svg.getBoundingClientRect(); this.addPointAt(s, (e.clientX - b.left) / b.width * S.pw, (e.clientY - b.top) / b.height * S.ph); };
      svg.appendChild(pg);
      const fp = this.flatPoly(s), c = AM.centroid(fp), bb = AM.bbox(fp);
      const fs = Math.max(10, Math.min(S.pw / 36, bb.w / (ai && !mk ? 7 : 4), bb.h / 2));
      const t = svgEl('text', { x: c[0], y: c[1] + fs * 0.35, class: 'sname' + (mk ? ' mk' : '') + (on ? '' : ' off'), 'text-anchor': 'middle', 'font-size': fs });
      t.textContent = on ? (mk ? String(idx + 1) : (ai || s.manual ? s.name : nameOf(idx))) : (ai || s.manual ? s.name + ' (nada)' : s.bg ? 'fundo' : 'fora'); svg.appendChild(t);
    }
    const hg = svgEl('g', { class: 'hgroup' }); svg.appendChild(hg); const act = this.editShape(); if (act && S.sel.has(act.id)) this.drawEditHandles(svg, hg, act); if (box) this.syncBar(box);
    svg.appendChild(svgEl('polygon', { points: S.frame.map(p => p.join(',')).join(' '), class: 'fr' }));
  }
  drawPreview(pv) {
    const S = this.S, W = this.c.compW, H = this.c.compH, nM = S.result.filter(r => r.type === 'mask').length;
    pv.textContent = ''; pv.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, class: 'pcomp' + (nM ? ' lit' : '') }));
    for (const it of S.result) {
      if (it.type === 'mask') { pv.appendChild(svgEl('polygon', { points: it.pts.map(p => p.join(',')).join(' '), class: 'pmk' })); continue; }
      let shp = it.warp.pts;
      if (it.inMask) { const bb = AM.bbox(it.warp.pts); shp = it.inMask.pts.map(p => [bb.x + p[0] * bb.w, bb.y + p[1] * bb.h]); pv.appendChild(svgEl('polygon', { points: it.warp.pts.map(p => p.join(',')).join(' '), class: 'pslice', style: 'fill:none;stroke-opacity:.35;stroke-dasharray:6 6' })); pv.appendChild(svgEl('polygon', { points: shp.map(p => p.join(',')).join(' '), class: 'pslice' })); }
      else pv.appendChild(svgEl('polygon', { points: it.warp.pts.map(p => p.join(',')).join(' '), class: 'pslice' }));
      const c = AM.centroid(shp), bb = AM.bbox(shp), fs = Math.min(40, bb.w / (it.name.length * 0.62), bb.h * 0.6);
      if (fs < 14) continue;
      const t = svgEl('text', { x: c[0], y: c[1] + fs * 0.35, class: 'pname', 'font-size': fs }); t.textContent = it.name; pv.appendChild(t);
    }
  }
  wizRefresh() {
    const S = this.S; if (!this.dlg || !S.photo) return;
    const $ = (id) => this.$(id);
    if (this.step === 4 && $('wCv')) {
      const wb = $('wPhotoBox'); this.sizeBox(wb, 760, 400); this.drawPhoto($('wCv'), $('wSvg')); this.zoomApply(wb);
      if (!this.tipSeen && !wb._drawing && !this.miniTipOf(wb)) this.showMiniTip(wb, TIP_POINTS, false);
      const user = S.sample === '';
      $('wSummary').innerHTML = (S.mode === 'ai' ? 'A IA encontrou: <b>' + this.countWords() + '</b>.' : 'Encontrei: <b>' + this.countWords() + '</b>.')
        + (user ? '<br><span style="color:var(--warn);font-size:12px">Nesta versão a IA lê só os três exemplos; na sua foto, marquei ' + (S.mode === 'windows' ? 'as áreas escuras (janelas)' : 'as superfícies iluminadas') + '. A IA em fotos novas vem na próxima versão.</span>' : '');
    }
    if (this.step === 5 && $('wRows')) this.buildActionRows($('wRows'));
    if (this.step === 6 && $('wPrev')) { this.drawPreview($('wPrev')); $('wResTxt').innerHTML = 'Vai criar <b>' + this.resultWords() + '</b> na tela "Projetor" da Saída avançada.'; }
  }
  buildActionRows(rows) {
    const S = this.S; rows.textContent = '';
    const ai = S.mode === 'ai', classes = ai ? [...new Set(S.items.map(i => i.cls))] : (S.items.length ? ['*'] : []);
    if (!classes.length) { rows.appendChild(el('p', '', 'Nada foi achado nesta foto.')); return; }
    for (const cls of classes) {
      const n = ai ? S.items.filter(i => i.cls === cls).length : S.items.length;
      const label = ai ? (n === 1 ? cap(cls) : n + ' ' + (PLURAL[cls] || cls)) : (S.mode === 'windows' ? n + ' janelas' : n + ' superfícies');
      const act = ai ? (S.actions[cls] || this.defaultAction(cls)) : (S.output === 'masks' ? 'mask' : 'slice');
      const row = el('div', 'wrow'); row.innerHTML = '<div class="nm">' + label + '</div><div class="opts"><button type="button" data-wact="mask">Quadrado preto</button><button type="button" data-wact="slice">Projetar nele</button><button type="button" data-wact="ignore">Deixar quieto</button></div>';
      row.querySelectorAll('button').forEach(b => {
        b.classList.toggle('on', b.dataset.wact === act);
        b.onclick = () => {
          const a = b.dataset.wact; this.snapshot();
          if (ai) { S.actions[cls] = a; for (const it of S.items) if (it.cls === cls) { if (a === 'ignore') S.sel.delete(it.id); else S.sel.add(it.id); } }
          else { if (a === 'ignore') S.sel = new Set(); else { S.sel = new Set(S.items.map(i => i.id)); S.output = a === 'mask' ? 'masks' : 'slices'; S.naming = a === 'mask' ? 'window' : 'slice'; } }
          this.render();
        };
      });
      rows.appendChild(row);
    }
  }

  // ---------- barra: zoom, nova forma, ponto reto/curvo, tirar do mapa, desfazer, ajuda ----------
  zoomState(box) { if (!box._z) box._z = { k: 1, tx: 0, ty: 0 }; return box._z; }
  zoomApply(box) {
    const z = this.zoomState(box), wrap = box.querySelector('.zoomWrap'); if (!wrap) return; const W = box.clientWidth, H = box.clientHeight;
    z.k = Math.max(1, Math.min(ZOOM_MAX, z.k)); z.tx = Math.min(0, Math.max(W - W * z.k, z.tx)); z.ty = Math.min(0, Math.max(H - H * z.k, z.ty));
    wrap.style.transform = 'translate(' + z.tx + 'px,' + z.ty + 'px) scale(' + z.k + ')';
    const r = Math.max(2.5, this.S.pw / 280) / z.k; box.querySelectorAll('circle.pt').forEach(c => c.setAttribute('r', c.classList.contains('sel') ? r * 1.4 : r));
    const bar = box._zbar; if (bar) bar.querySelector('.zv').textContent = Math.round(z.k * 100) + ' %';
  }
  zoomTo(box, k, cx, cy) { const z = this.zoomState(box), W = box.clientWidth, H = box.clientHeight; if (cx == null) { cx = W / 2; cy = H / 2; } const k2 = Math.max(1, Math.min(ZOOM_MAX, k)); z.tx = cx - (cx - z.tx) * (k2 / z.k); z.ty = cy - (cy - z.ty) * (k2 / z.k); z.k = k2; this.zoomApply(box); }
  zoomReset(box) { const z = this.zoomState(box); z.k = 1; z.tx = 0; z.ty = 0; this.zoomApply(box); }
  makeZoomable(box, bar) {
    const self = this; box._zbar = bar;
    bar.innerHTML = '<button type="button" data-z="-" title="Afastar">−</button><span class="zv">100 %</span><button type="button" data-z="+" title="Aproximar">+</button><button type="button" data-z="0" style="font-size:12px;padding:0 8px">Ajustar</button>'
      + '<button type="button" data-z="new" style="font-size:12px;padding:0 10px;margin-left:10px" title="Desenhar uma área que a IA não achou: clique os pontos na foto">＋ Nova forma</button>'
      + '<span class="selLbl">—</span><span class="ptLbl" style="color:#8a8a8a">Ponto:</span><button type="button" data-pm="corner" style="font-size:12px;padding:0 8px" title="Ponto normal: os lados chegam retos nele">Reto</button><button type="button" data-pm="smooth" style="font-size:12px;padding:0 8px" title="Bezier: o ponto ganha duas alças (losangos rosa) para curvar os lados">Curvo</button>'
      + '<button type="button" data-z="drop" style="font-size:12px;padding:0 8px;margin-left:6px">✕ Tirar do mapa</button><button type="button" data-z="undo" title="Desfazer (Ctrl+Z)" style="margin-left:6px" disabled>↶</button>'
      + '<button type="button" data-z="?" title="Como ajustar os pontos" style="font-size:13px;min-width:26px">?</button><span class="zhint">roda: zoom · fundo: mover</span>';
    bar.querySelector('[data-z="+"]').onclick = () => this.zoomTo(box, this.zoomState(box).k * 1.5);
    bar.querySelector('[data-z="-"]').onclick = () => this.zoomTo(box, this.zoomState(box).k / 1.5);
    bar.querySelector('[data-z="0"]').onclick = () => this.zoomReset(box);
    bar.querySelector('[data-z="?"]').onclick = () => { if (this.miniTipOf(box)) this.hideMiniTip(box); else this.showMiniTip(box, TIP_POINTS, false); };
    bar.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => this.setPointMode(b.dataset.pm === 'smooth'));
    bar.querySelector('[data-z="drop"]').onclick = () => this.toggleDrop(); bar.querySelector('[data-z="undo"]').onclick = () => this.undo();
    const newBt = bar.querySelector('[data-z="new"]'); newBt.onclick = () => { if (box._drawing) this.finishDrawing(box); else this.startDrawing(box); };
    box.addEventListener('wheel', (e) => { e.preventDefault(); const b = box.getBoundingClientRect(); this.zoomTo(box, this.zoomState(box).k * Math.pow(1.2, -e.deltaY / 100), e.clientX - b.left, e.clientY - b.top); }, { passive: false });
    let pan = null;
    box.addEventListener('pointerdown', (e) => { if (e.target.classList && (e.target.classList.contains('pt') || e.target.classList.contains('bh'))) return; pan = { x: e.clientX, y: e.clientY, tx: this.zoomState(box).tx, ty: this.zoomState(box).ty, moved: false, id: e.pointerId }; });
    box.addEventListener('pointermove', (e) => { if (!pan) return; const dx = e.clientX - pan.x, dy = e.clientY - pan.y; if (!pan.moved && Math.hypot(dx, dy) < 4) return; if (!pan.moved) { try { box.setPointerCapture(pan.id); } catch { } } pan.moved = true; box._panned = true; box.querySelector('.zoomWrap').classList.add('panning'); const z = this.zoomState(box); z.tx = pan.tx + dx; z.ty = pan.ty + dy; this.zoomApply(box); });
    const end = () => { if (!pan) return; pan = null; box.querySelector('.zoomWrap').classList.remove('panning'); setTimeout(() => { box._panned = false; }, 0); };
    box.addEventListener('pointerup', (e) => { const wasPan = pan && pan.moved; end(); if (box._drawing && !wasPan && !(e.target.classList && e.target.classList.contains('pt'))) { const svg = box.querySelector('svg'), b = svg.getBoundingClientRect(); this.addDrawPoint(box, (e.clientX - b.left) / b.width * this.S.pw, (e.clientY - b.top) / b.height * this.S.ph); } });
    box.addEventListener('pointercancel', end);
    box.addEventListener('dblclick', (e) => { if (box._drawing) { e.stopPropagation(); this.finishDrawing(box); } }, true);
    this.syncBar(box); this.syncUndo();
  }
  syncBar(box) {
    const bar = box._zbar; if (!bar) return; const S = this.S, s = this.editShape();
    const pm = bar.querySelectorAll('[data-pm]'), drop = bar.querySelector('[data-z="drop"]'), lbl = bar.querySelector('.selLbl');
    const q = bar.querySelector('[data-z="?"]'); if (q) q.classList.toggle('neon', !this.tipSeen && !this.miniTipOf(box));
    const grp = [...pm, drop, bar.querySelector('.ptLbl')].filter(Boolean);
    if (!s) { grp.forEach(b => b.hidden = true); if (lbl) { lbl.textContent = '← clique numa forma para editar'; lbl.classList.add('neonTxt'); lbl.style.maxWidth = 'none'; } return; }
    grp.forEach(b => b.hidden = false); if (lbl) { lbl.classList.remove('neonTxt'); lbl.style.maxWidth = '110px'; }
    if (drop) drop.textContent = S.sel.has(s.id) ? '✕ Tirar do mapa' : '↩ Devolver ao mapa';
    const smooth = S.editPt >= 0 && S.editPt < s.poly.length ? this.isSmooth(s, S.editPt) : (this.isLive(s) && s.poly.every((_, i) => this.isSmooth(s, i)));
    pm.forEach(b => b.classList.toggle('on', (b.dataset.pm === 'smooth') === smooth));
    if (lbl) lbl.textContent = (s.name || 'forma') + (S.editPt >= 0 ? ' · ponto ' + (S.editPt + 1) : '');
  }
  setPointMode(smooth) {
    const S = this.S, s = this.editShape(); if (!s) { this.toast('Clique numa forma primeiro'); return; }
    this.snapshot();
    if (!this.isLive(s)) { s.poly = s.quad.map(p => [p[0], p[1]]); s.ctrl = null; s.isQuad = false; }
    const idx = S.editPt >= 0 && S.editPt < s.poly.length ? [S.editPt] : s.poly.map((_, i) => i);
    for (const i of idx) smooth ? this.smoothPoint(s, i) : this.cornerPoint(s, i);
    s.quad = AM.bestQuad(this.flatPoly(s)); s.edited = true; this.render();
  }
  toggleDrop() { const S = this.S, s = this.editShape(); if (!s) return; this.snapshot(); if (S.sel.has(s.id)) S.sel.delete(s.id); else S.sel.add(s.id); this.render(); }
  // mini popup de ajuda, acima da foto (não cobre ponto nenhum)
  miniTipOf(box) { return box.previousElementSibling && box.previousElementSibling.classList.contains('miniTip') ? box.previousElementSibling : null; }
  showMiniTip(box, html, sticky) {
    let t = this.miniTipOf(box); if (!t) { t = el('div', 'miniTip'); box.parentNode.insertBefore(t, box); }
    t.innerHTML = html + (sticky ? '' : '<div class="row"><button type="button" class="tipOk">Entendi</button></div>');
    const ok = t.querySelector('.tipOk'); if (ok) ok.onclick = () => { t.remove(); this.tipSeen = true; this.syncBar(box); };
    t.onpointerdown = (e) => e.stopPropagation(); t.ondblclick = (e) => e.stopPropagation();
  }
  hideMiniTip(box) { const t = this.miniTipOf(box); if (t) t.remove(); }

  // ---------- pontos e alças da forma selecionada ----------
  drawEditHandles(svg, hg, s) {
    if (!this.isLive(s)) { this.addPointHandles(svg, hg, s); return; }
    this.ensureCtrl(s);
    const S = this.S, box = svg.closest('#wPhotoBox'), zk = box ? this.zoomState(box).k : 1, r = Math.max(2.5, S.pw / 280) / zk * 1.1;
    const dpath = (x, y) => 'M' + x + ',' + (y - r) + ' L' + (x + r) + ',' + y + ' L' + x + ',' + (y + r) + ' L' + (x - r) + ',' + y + ' Z';
    s.poly.forEach((a, i) => {
      if (!this.isSmooth(s, i)) return;
      for (const key of ['out', 'in']) {
        const h = s.ctrl[i][key], other = s.ctrl[i][key === 'out' ? 'in' : 'out'];
        const ln = svgEl('line', { x1: a[0], y1: a[1], x2: h[0], y2: h[1], class: 'bl', 'data-pt': i, 'data-key': key + 'l' }); hg.appendChild(ln);
        const dm = svgEl('path', { d: dpath(h[0], h[1]), class: 'bh' + (s.ctrl[i].linked === false ? ' free' : ''), 'data-pt': i, 'data-key': key }); hg.appendChild(dm);
        dm.onpointerdown = (e) => { e.stopPropagation(); dm.setPointerCapture(e.pointerId); e.preventDefault(); dm._moved = false; if (e.ctrlKey) { s.ctrl[i].linked = false; this.toast('Alça solta: mexe sozinha (Ctrl). "Curvo" alinha de novo.'); } };
        dm.onpointermove = (e) => {
          if (!dm.hasPointerCapture(e.pointerId)) return; const b = svg.getBoundingClientRect();
          const x = Math.max(0, Math.min(S.pw, (e.clientX - b.left) / b.width * S.pw)), y = Math.max(0, Math.min(S.ph, (e.clientY - b.top) / b.height * S.ph));
          if (Math.hypot(x - h[0], y - h[1]) < 0.01) return; if (!dm._moved) this.snapshot(); dm._moved = true; h[0] = x; h[1] = y;
          if (e.ctrlKey) s.ctrl[i].linked = false;
          // como no Adobe: a alça do outro lado fica alinhada (ponto liso), guardando o comprimento; com Ctrl (ou solta) mexe sozinha
          if (s.ctrl[i].linked !== false) { const L = Math.hypot(other[0] - a[0], other[1] - a[1]), d = Math.hypot(x - a[0], y - a[1]) || 1; other[0] = a[0] - (x - a[0]) / d * L; other[1] = a[1] - (y - a[1]) / d * L; }
          dm.setAttribute('d', dpath(x, y)); ln.setAttribute('x2', x); ln.setAttribute('y2', y); this.refreshShape(svg, s); this.updateHandleEls(svg, s, i);
        };
        dm.onpointerup = (e) => { if (!dm.hasPointerCapture(e.pointerId)) return; dm.releasePointerCapture(e.pointerId); if (dm._moved) { this.updateCurved(s); this.afterEdit(s, true); } };
        dm.ondblclick = (e) => { e.stopPropagation(); this.snapshot(); this.cornerPoint(s, i); this.afterEdit(s, true); };
      }
    });
    this.addPointHandles(svg, hg, s);
  }
  updateHandleEls(svg, s, i) {
    const hg = svg.querySelector('.hgroup'); if (!hg || !s.ctrl) return; const a = s.poly[i];
    const box = svg.closest('#wPhotoBox'), zk = box ? this.zoomState(box).k : 1, r = Math.max(2.5, this.S.pw / 280) / zk * 1.1;
    for (const key of ['out', 'in']) {
      const h = s.ctrl[i][key], ln = hg.querySelector('[data-pt="' + i + '"][data-key="' + key + 'l"]'), dm = hg.querySelector('[data-pt="' + i + '"][data-key="' + key + '"]');
      if (ln) { ln.setAttribute('x1', a[0]); ln.setAttribute('y1', a[1]); ln.setAttribute('x2', h[0]); ln.setAttribute('y2', h[1]); }
      if (dm) dm.setAttribute('d', 'M' + h[0] + ',' + (h[1] - r) + ' L' + (h[0] + r) + ',' + h[1] + ' L' + h[0] + ',' + (h[1] + r) + ' L' + (h[0] - r) + ',' + h[1] + ' Z');
    }
  }
  addPointHandles(svg, hg, s) {
    const S = this.S, box = svg.closest('#wPhotoBox'), zk = box ? this.zoomState(box).k : 1;
    const pts = this.shapeOf(s), r = Math.max(2.5, S.pw / 280) / zk, live = pts === s.poly;
    pts.forEach((p, j) => {
      const h = svgEl('circle', { cx: p[0], cy: p[1], r: j === S.editPt ? r * 1.4 : r, class: 'pt' + (j === S.editPt ? ' sel' : '') + (live && this.isSmooth(s, j) ? ' smooth' : '') }); hg.appendChild(h);
      h.onpointerdown = (e) => { e.stopPropagation(); h.setPointerCapture(e.pointerId); e.preventDefault(); h._moved = false; };
      h.onpointermove = (e) => { if (!h.hasPointerCapture(e.pointerId)) return; const b = svg.getBoundingClientRect(); const x = Math.max(0, Math.min(S.pw, (e.clientX - b.left) / b.width * S.pw)), y = Math.max(0, Math.min(S.ph, (e.clientY - b.top) / b.height * S.ph)); if (Math.hypot(x - p[0], y - p[1]) < 0.01) return; if (!h._moved) this.snapshot(); h._moved = true; if (live && s.ctrl) { const dx = x - p[0], dy = y - p[1]; s.ctrl[j].in[0] += dx; s.ctrl[j].in[1] += dy; s.ctrl[j].out[0] += dx; s.ctrl[j].out[1] += dy; } p[0] = x; p[1] = y; h.setAttribute('cx', x); h.setAttribute('cy', y); this.refreshShape(svg, s); if (live) this.updateHandleEls(svg, s, j); };
      h.onpointerup = (e) => { if (!h.hasPointerCapture(e.pointerId)) return; h.releasePointerCapture(e.pointerId); if (h._moved) this.afterEdit(s, live); else { S.editPt = j; hg.querySelectorAll('circle.pt.sel').forEach(c => { c.classList.remove('sel'); c.setAttribute('r', r); }); h.classList.add('sel'); h.setAttribute('r', r * 1.4); if (box) this.syncBar(box); } };
      h.ondblclick = (e) => { e.stopPropagation(); if (pts.length <= 3) { this.toast('Uma forma precisa de pelo menos 3 pontos'); return; } this.snapshot(); pts.splice(j, 1); if (live && s.ctrl) { s.ctrl.splice(j, 1); this.updateCurved(s); } S.editPt = -1; this.afterEdit(s, live); };
    });
  }
  afterEdit(s, live) { this.syncUndo(); if (live) { s.quad = AM.bestQuad(this.flatPoly(s)); s.isQuad = false; } else { s.poly = s.quad.map(p => [p[0], p[1]]); s.ctrl = null; s.isQuad = true; } s.edited = true; this.render(); }
  addPointAt(s, x, y) {
    this.snapshot();
    const S = this.S, pts = this.shapeOf(s), live = pts === s.poly;
    if (!live) { s.poly = s.quad.map(p => [p[0], p[1]]); s.ctrl = null; }
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const bez = (a, c1, c2, b, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]; };
    const n = s.poly.length; this.ensureCtrl(s); let best = 0, bt = 0.5, bd = Infinity;
    for (let i = 0; i < n; i++) { const a = s.poly[i], b = s.poly[(i + 1) % n], c1 = s.ctrl[i].out, c2 = s.ctrl[(i + 1) % n].in; for (let k = 1; k < 16; k++) { const t = k / 16, q = bez(a, c1, c2, b, t), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = i; bt = t; } } }
    const a = s.poly[best], b = s.poly[(best + 1) % n], c1 = s.ctrl[best].out, c2 = s.ctrl[(best + 1) % n].in, t = bt;
    const straight = Math.hypot(c1[0] - a[0], c1[1] - a[1]) < 0.5 && Math.hypot(c2[0] - b[0], c2[1] - b[1]) < 0.5;
    const p01 = lerp(a, c1, t), p12 = lerp(c1, c2, t), p23 = lerp(c2, b, t), p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t), mid = lerp(p012, p123, t);
    s.ctrl[best].out = p01; s.ctrl[(best + 1) % n].in = p23;
    s.poly.splice(best + 1, 0, mid); s.ctrl.splice(best + 1, 0, straight ? { in: [mid[0], mid[1]], out: [mid[0], mid[1]] } : { in: p012, out: p123 });
    if (straight) { s.ctrl[best].out = [a[0], a[1]]; s.ctrl[(best + 2) % (n + 1)].in = [b[0], b[1]]; }
    S.editPt = best + 1; this.updateCurved(s); s.quad = AM.bestQuad(this.flatPoly(s)); s.isQuad = false; s.edited = true; this.render();
  }

  // ---------- nova forma, ponto a ponto ----------
  startDrawing(box) {
    box._drawing = { pts: [] }; box.querySelector('.zoomWrap').classList.add('drawing');
    const bt = box._zbar && box._zbar.querySelector('[data-z="new"]'); if (bt) { bt.textContent = '✓ Concluir forma'; bt.classList.add('on', 'neon'); }
    const hint = box._zbar && box._zbar.querySelector('.zhint'); if (hint) hint.innerHTML = '<b style="color:var(--accent)">Desenhando:</b> clique os pontos na foto · duplo clique (ou Concluir) fecha · Esc cancela';
    this.toast('Clique os pontos da forma na foto; duplo clique (ou "Concluir") fecha. Esc cancela.');
  }
  addDrawPoint(box, x, y) { const d = box._drawing; if (!d) return; if (d.pts.length >= 3 && Math.hypot(x - d.pts[0][0], y - d.pts[0][1]) < this.S.pw / 60) { this.finishDrawing(box); return; } d.pts.push([x, y]); this.drawTemp(box); }
  drawTemp(box) {
    const svg = box.querySelector('svg'); let g = svg.querySelector('.drawTmp'); const d = box._drawing;
    if (!d || !d.pts.length) { if (g) g.remove(); return; }
    const r = Math.max(2.5, this.S.pw / 280) / this.zoomState(box).k;
    if (!g) { g = svgEl('g', { class: 'drawTmp' }); g.appendChild(svgEl('polyline', { points: '' })); svg.appendChild(g); }
    g.querySelector('polyline').setAttribute('points', d.pts.map(p => p.join(',')).join(' '));
    const have = g.querySelectorAll('circle').length;
    for (let i = have; i < d.pts.length; i++) g.appendChild(svgEl('circle', { cx: d.pts[i][0], cy: d.pts[i][1], r: i ? r : r * 1.6, class: i ? '' : 'first' }));
  }
  cancelDrawing(box) { if (!box._drawing) return; box._drawing = null; const hint = box._zbar && box._zbar.querySelector('.zhint'); if (hint) hint.textContent = 'roda: zoom · fundo: mover'; box.querySelector('.zoomWrap').classList.remove('drawing'); const bt = box._zbar && box._zbar.querySelector('[data-z="new"]'); if (bt) { bt.textContent = '＋ Nova forma'; bt.classList.remove('on', 'neon'); } this.drawTemp(box); }
  finishDrawing(box) {
    const S = this.S, d = box._drawing; if (!d) return;
    if (d.pts.length < 3) { this.toast('Uma forma precisa de pelo menos 3 pontos'); this.cancelDrawing(box); return; }
    this.snapshot();
    const poly = d.pts.map(p => [p[0], p[1]]), n = S.items.filter(i => i.cls === 'forma').length + 1, id = Math.max(0, ...S.items.map(i => i.id)) + 1;
    S.items.push({ id, poly, quad: AM.bestQuad(poly), isQuad: false, areaPct: AM.area(poly) / (S.pw * S.ph) * 100, bg: false, cls: 'forma', conf: 100, name: 'Forma ' + n, edited: true, manual: true });
    S.sel.add(id); S.editId = id; S.editPt = -1; if (S.mode === 'ai' && !('forma' in S.actions)) S.actions.forma = 'slice';
    this.cancelDrawing(box); this.toast('Forma ' + n + ' criada'); this.render();
  }
}

// desenho do passo 1 (projetor, celular acima da lente, parede com borda e malha)
const ILUS = '<svg viewBox="0 0 470 210" class="ilus"><rect x="300" y="18" width="160" height="176" fill="#2a2b30" stroke="#3a3b41"/><polygon points="318,40 446,48 440,172 322,166" fill="#5c5a57"/><polygon points="335,58 392,62 390,118 334,114" fill="#c9c6c0"/><polygon points="402,64 434,66 433,120 402,118" fill="#d2cfc9"/><polygon points="340,128 380,130 379,156 339,154" fill="#bdb9b2"/><g stroke="rgba(0,0,0,.55)" stroke-width="1"><line x1="339.3" y1="41.3" x2="341.7" y2="167"/><line x1="360.7" y1="42.7" x2="361.3" y2="168"/><line x1="382" y1="44" x2="381" y2="169"/><line x1="403.3" y1="45.3" x2="400.7" y2="170"/><line x1="424.7" y1="46.7" x2="420.3" y2="171"/><line x1="319" y1="71.5" x2="444.5" y2="79"/><line x1="320" y1="103" x2="443" y2="110"/><line x1="321" y1="134.5" x2="441.5" y2="141"/></g><polygon points="318,40 446,48 440,172 322,166" fill="none" stroke="#ececec" stroke-width="4"/><polygon points="96,98 318,40 322,166 96,112" fill="rgba(111,230,198,.10)"/><line x1="96" y1="98" x2="318" y2="40" stroke="#6fe6c6" stroke-width="1" stroke-dasharray="4 3"/><line x1="96" y1="112" x2="322" y2="166" stroke="#6fe6c6" stroke-width="1" stroke-dasharray="4 3"/><rect x="18" y="80" width="78" height="46" rx="4" fill="#3a3b41" stroke="#5a5c64"/><circle cx="96" cy="105" r="10" fill="#1b1c1f" stroke="#8b8d95" stroke-width="2"/><circle cx="96" cy="105" r="4" fill="#6fe6c6"/><text x="20" y="150" font-size="11" fill="#8b8d95" font-family="Segoe UI, sans-serif">projetor ligado, com a malha</text><g transform="translate(85,46)"><rect x="0" y="0" width="22" height="44" rx="4" fill="#1b1c1f" stroke="#d6d7db" stroke-width="1.5"/><circle cx="11" cy="46" r="3" fill="#39FF14"/><rect x="3" y="4" width="16" height="30" fill="#2c2d32"/></g><text x="114" y="62" font-size="11" fill="#d6d7db" font-family="Segoe UI, sans-serif">câmera logo acima da lente,</text><text x="114" y="76" font-size="11" fill="#d6d7db" font-family="Segoe UI, sans-serif">olhando para onde o projetor aponta</text><text x="302" y="206" font-size="10" fill="#8b8d95" font-family="Segoe UI, sans-serif">borda e malha: até onde a luz vai</text></svg>';
const CERTO_ERRADO = '<div><svg viewBox="0 0 200 110"><rect x="10" y="48" width="60" height="34" rx="4" fill="#3a3b41" stroke="#5a5c64"/><circle cx="70" cy="65" r="8" fill="#1b1c1f" stroke="#8b8d95" stroke-width="2"/><circle cx="70" cy="65" r="3" fill="#6fe6c6"/><rect x="60" y="14" width="18" height="34" rx="3" fill="#1b1c1f" stroke="#d6d7db" stroke-width="1.5"/><circle cx="69" cy="49" r="2.5" fill="#39FF14"/><polygon points="70,58 190,20 190,105 70,72" fill="rgba(111,230,198,.12)"/><rect x="150" y="26" width="40" height="70" fill="#5c5a57"/></svg><div class="certo">✓ Certo: câmera logo acima da lente</div></div>'
  + '<div><svg viewBox="0 0 200 110"><rect x="10" y="48" width="60" height="34" rx="4" fill="#3a3b41" stroke="#5a5c64"/><circle cx="70" cy="65" r="8" fill="#1b1c1f" stroke="#8b8d95" stroke-width="2"/><circle cx="70" cy="65" r="3" fill="#6fe6c6"/><rect x="108" y="70" width="18" height="34" rx="3" fill="#1b1c1f" stroke="#FFB02E" stroke-width="1.5"/><circle cx="117" cy="69" r="2.5" fill="#FFB02E"/><polygon points="70,58 190,20 190,105 70,72" fill="rgba(111,230,198,.12)"/><rect x="150" y="26" width="40" height="70" fill="#5c5a57"/></svg><div class="errado">✗ Errado: câmera longe da lente</div></div>';
