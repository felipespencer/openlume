// Geometria da deformação de um slice. Funções puras, usadas pelo motor (para gerar a malha
// de triângulos) e pelo editor (para desenhar as curvas e as alças).
//
// Dois modos:
//   corners: quatro cantos; a imagem é levada ao quadrilátero por uma transformação projetiva
//            (homografia), como uma projeção em perspectiva.
//   mesh:    rede de retalhos bezier bicúbicos. Com N×M divisões, a rede de controle tem
//            (3N+1)×(3M+1) pontos; os de índice múltiplo de 3 nas duas direções são âncoras,
//            os outros são alças.

// Homografia do quadrado unitário para os quatro cantos p (cima-esq, cima-dir, baixo-dir, baixo-esq).
export function homography(p) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-9) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  return { a, b, c: x0, d, e, f: y0, g, h };
}
// Inversa: leva pontos do quadrilátero de volta ao quadrado unitário (o Automape usa para ir da foto ao projetor).
export function invertHomography(H) {
  if (!H) return null;
  const { a, b, c, d, e, f, g, h } = H, i = 1;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g), G = b * f - c * e, Hh = -(a * f - c * d), I = a * e - b * d;
  const det = a * A + b * B + c * C; if (Math.abs(det) < 1e-12) return null;
  const k = 1 / det; return { a: A * k, b: D * k, c: G * k, d: B * k, e: E * k, f: Hh * k, g: C * k, h: F * k, i: I * k };
}
export function applyHomography(H, u, v) {
  if (!H) return [u, v];
  const w = H.g * u + H.h * v + 1;
  return [(H.a * u + H.b * v + H.c) / w, (H.d * u + H.e * v + H.f) / w];
}

// Rede de controle reta a partir de um retângulo: âncoras na grade, alças nos terços.
export function meshFromRect(x, y, w, h, divX, divY) {
  const cols = 3 * divX + 1, rows = 3 * divY + 1, pts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    pts.push([x + w * c / (cols - 1), y + h * r / (rows - 1)]);
  return pts;
}
export function cornersFromRect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }

// Põe cada alça no terço da reta entre as duas âncoras vizinhas (modo "reta").
export function straightenHandles(pts, divX, divY) {
  const cols = 3 * divX + 1, rows = 3 * divY + 1, P = (r, c) => pts[r * cols + c];
  // primeiro ao longo das linhas de âncoras, depois ao longo das colunas, depois os miolos
  for (let r = 0; r < rows; r += 3) for (let c = 0; c + 3 < cols; c += 3) lerpBetween(P(r, c), P(r, c + 3), P(r, c + 1), P(r, c + 2));
  for (let c = 0; c < cols; c++) for (let r = 0; r + 3 < rows; r += 3) lerpBetween(P(r, c), P(r + 3, c), P(r + 1, c), P(r + 2, c));
  return pts;
}
function lerpBetween(a, b, h1, h2) {
  h1[0] = a[0] + (b[0] - a[0]) / 3; h1[1] = a[1] + (b[1] - a[1]) / 3;
  h2[0] = a[0] + 2 * (b[0] - a[0]) / 3; h2[1] = a[1] + 2 * (b[1] - a[1]) / 3;
}

// Ponto da superfície no retalho (i,j) em (s,t) ∈ [0,1]².
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
export function meshPoint(pts, divX, divY, u, v) {
  const cols = 3 * divX + 1;
  let j = Math.min(divX - 1, Math.floor(u * divX)), i = Math.min(divY - 1, Math.floor(v * divY));
  const s = u * divX - j, t = v * divY - i;
  const P = (r, c) => pts[(3 * i + r) * cols + 3 * j + c];
  const xs = [], ys = [];
  for (let r = 0; r < 4; r++) {
    xs.push(bez(P(r, 0)[0], P(r, 1)[0], P(r, 2)[0], P(r, 3)[0], s));
    ys.push(bez(P(r, 0)[1], P(r, 1)[1], P(r, 2)[1], P(r, 3)[1], s));
  }
  return [bez(xs[0], xs[1], xs[2], xs[3], t), bez(ys[0], ys[1], ys[2], ys[3], t)];
}

// Troca o número de divisões mantendo a forma atual: as âncoras novas caem sobre a superfície
// antiga, as alças ficam retas.
export function resampleMesh(pts, divX, divY, newX, newY) {
  const out = meshFromRect(0, 0, 1, 1, newX, newY);
  const cols = 3 * newX + 1;
  for (let r = 0; r <= 3 * newY; r += 3) for (let c = 0; c <= 3 * newX; c += 3)
    out[r * cols + c] = meshPoint(pts, divX, divY, c / (3 * newX), r / (3 * newY));
  return straightenHandles(out, newX, newY);
}

// Vértices da forma de saída: posições (px da tela) e coordenadas locais (u,v) do slice.
// O retalho é fatiado em K×K; nos quatro cantos a homografia também é avaliada numa grade,
// porque a interpolação linear do triângulo não faz perspectiva sozinha.
export function tessellate(slice, K = 12) {
  const w = slice.warp, pos = [], luv = [], idx = [];
  const nx = w.mode === 'mesh' ? w.divX * K : K, ny = w.mode === 'mesh' ? w.divY * K : K;
  const H = w.mode === 'corners' ? homography(w.pts) : null;
  for (let r = 0; r <= ny; r++) for (let c = 0; c <= nx; c++) {
    const u = c / nx, v = r / ny;
    const p = w.mode === 'mesh' ? meshPoint(w.pts, w.divX, w.divY, u, v) : applyHomography(H, u, v);
    pos.push(p[0], p[1]); luv.push(u, v);
  }
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
    const a = r * (nx + 1) + c, b = a + 1, d = a + nx + 1, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  return { pos: new Float32Array(pos), luv: new Float32Array(luv), idx: new Uint32Array(idx) };
}

// Posição no projetor de um ponto local (u, v em 0..1 do recorte) do slice: quatro cantos pela homografia, malha pelo
// retalho bezier. É o mesmo mapeamento que o motor usa (tessellate), então as alças desenhadas por aqui caem exatamente
// sobre a imagem deformada (07-01: alças do degradê de emenda na aba Saída).
export function localToOut(slice, u, v) {
  const w = slice.warp;
  if (w.mode === 'mesh') return meshPoint(w.pts, w.divX, w.divY, u, v);
  return applyHomography(homography(w.pts), u, v);
}
// O caminho de volta: do ponto no projetor para (u, v). Quatro cantos: homografia inversa (com o termo i). Malha: Newton
// com Jacobiano por diferença finita, partindo do (u, v) proporcional dentro da caixa envolvente; para em 0,25 px.
export function outToLocal(slice, x, y) {
  const w = slice.warp;
  if (w.mode !== 'mesh') {
    const Hi = invertHomography(homography(w.pts)); if (!Hi) return [0.5, 0.5];
    const d = Hi.g * x + Hi.h * y + Hi.i; return [(Hi.a * x + Hi.b * y + Hi.c) / d, (Hi.d * x + Hi.e * y + Hi.f) / d];
  }
  const b = bbox(w.pts); let u = b.w ? (x - b.x) / b.w : 0.5, v = b.h ? (y - b.y) / b.h : 0.5;
  for (let it = 0; it < 12; it++) {
    const p = meshPoint(w.pts, w.divX, w.divY, u, v), ex = p[0] - x, ey = p[1] - y;
    if (Math.abs(ex) < 0.25 && Math.abs(ey) < 0.25) break;
    const h = 1e-3, pu = meshPoint(w.pts, w.divX, w.divY, u + h, v), pv = meshPoint(w.pts, w.divX, w.divY, u, v + h);
    const a = (pu[0] - p[0]) / h, c = (pv[0] - p[0]) / h, bb = (pu[1] - p[1]) / h, dd = (pv[1] - p[1]) / h, det = a * dd - c * bb;
    if (Math.abs(det) < 1e-9) break;
    u -= (dd * ex - c * ey) / det; v -= (-bb * ex + a * ey) / det;
    u = Math.max(-0.5, Math.min(1.5, u)); v = Math.max(-0.5, Math.min(1.5, v));   // a malha só existe em 0..1; fora dela a conta é extrapolação
  }
  return [u, v];
}

// Caixa envolvente dos pontos.
export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
// Aplica a mesma transformação afim a todos os pontos (mover, redimensionar, girar).
export function transformPts(pts, fn) { for (const p of pts) { const q = fn(p[0], p[1]); p[0] = q[0]; p[1] = q[1]; } return pts; }

// Caminho SVG da borda da forma, para o editor.
export function outlinePath(slice, n = 16) {
  const w = slice.warp;
  if (w.mode === 'corners') return 'M' + w.pts.map(p => p.join(',')).join(' L') + ' Z';
  const edge = (f) => { const a = []; for (let k = 0; k <= n; k++) a.push(f(k / n)); return a; };
  const pts = [
    ...edge(t => meshPoint(w.pts, w.divX, w.divY, t, 0)),
    ...edge(t => meshPoint(w.pts, w.divX, w.divY, 1, t)),
    ...edge(t => meshPoint(w.pts, w.divX, w.divY, 1 - t, 1)),
    ...edge(t => meshPoint(w.pts, w.divX, w.divY, 0, 1 - t)),
  ];
  return 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + ' Z';
}
// Linhas internas da malha (uma por âncora, nas duas direções).
export function meshLinesPath(slice, n = 16) {
  const w = slice.warp, parts = [];
  const line = (f) => { const a = []; for (let k = 0; k <= n; k++) a.push(f(k / n)); return 'M' + a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'); };
  for (let i = 1; i < w.divY; i++) parts.push(line(t => meshPoint(w.pts, w.divX, w.divY, t, i / w.divY)));
  for (let j = 1; j < w.divX; j++) parts.push(line(t => meshPoint(w.pts, w.divX, w.divY, j / w.divX, t)));
  return parts.join(' ');
}
