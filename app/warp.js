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
export function lerpBetween(a, b, h1, h2) {
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
  // fora de 0..1 (alça de emenda puxada para fora do slice) continua no retalho da beira, por extrapolação: sem o limite de baixo, o índice negativo derrubava o desenho
  const j = Math.max(0, Math.min(divX - 1, Math.floor(u * divX))), i = Math.max(0, Math.min(divY - 1, Math.floor(v * divY)));
  const s = u * divX - j, t = v * divY - i;
  const P = (r, c) => pts[(3 * i + r) * cols + 3 * j + c];
  const xs = [], ys = [];
  for (let r = 0; r < 4; r++) {
    xs.push(bez(P(r, 0)[0], P(r, 1)[0], P(r, 2)[0], P(r, 3)[0], s));
    ys.push(bez(P(r, 0)[1], P(r, 1)[1], P(r, 2)[1], P(r, 3)[1], s));
  }
  return [bez(xs[0], xs[1], xs[2], xs[3], t), bez(ys[0], ys[1], ys[2], ys[3], t)];
}

// Retalho (i,j) da rede: posição e derivadas em (s,t) locais, já em unidades de u e v globais (0..1 na rede toda).
function patchEval(pts, divX, divY, i, j, s, t) {
  const cols = 3 * divX + 1, u = 1 - s, v = 1 - t;
  const Bs = [u * u * u, 3 * s * u * u, 3 * s * s * u, s * s * s], dBs = [-3 * u * u, 3 * u * u - 6 * s * u, 6 * s * u - 3 * s * s, 3 * s * s];
  const Bt = [v * v * v, 3 * t * v * v, 3 * t * t * v, t * t * t], dBt = [-3 * v * v, 3 * v * v - 6 * t * v, 6 * t * v - 3 * t * t, 3 * t * t];
  const S = [0, 0], Su = [0, 0], Sv = [0, 0], Suv = [0, 0];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const P = pts[(3 * i + r) * cols + 3 * j + c];
    for (let k = 0; k < 2; k++) {
      S[k] += Bt[r] * Bs[c] * P[k]; Su[k] += Bt[r] * dBs[c] * P[k] * divX;
      Sv[k] += dBt[r] * Bs[c] * P[k] * divY; Suv[k] += dBt[r] * dBs[c] * P[k] * divX * divY;
    }
  }
  return { S, Su, Sv, Suv };
}
// Troca o número de divisões MANTENDO a forma: cada retalho novo é montado (Hermite → bezier) a partir da superfície antiga,
// com posição, tangentes e torção medidas por dentro do próprio retalho; assim as curvas que o usuário puxou não são
// achatadas e, quando a nova grade é um múltiplo da antiga, a superfície é idêntica.
export function resampleMesh(pts, divX, divY, newX, newY) {
  const out = meshFromRect(0, 0, 1, 1, newX, newY), cols = 3 * newX + 1, du = 1 / newX, dv = 1 / newY;
  const at = (u, v, su, sv) => {   // su/sv: de que lado fica o retalho novo (+1: depois do ponto, -1: antes)
    const jo = Math.max(0, Math.min(divX - 1, Math.floor(u * divX + su * 1e-7))), io = Math.max(0, Math.min(divY - 1, Math.floor(v * divY + sv * 1e-7)));
    return patchEval(pts, divX, divY, io, jo, Math.max(0, Math.min(1, u * divX - jo)), Math.max(0, Math.min(1, v * divY - io)));
  };
  for (let b = 0; b < newY; b++) for (let a = 0; a < newX; a++) {
    const D = [[null, null], [null, null]];
    for (let cb = 0; cb < 2; cb++) for (let ca = 0; ca < 2; ca++) D[cb][ca] = at((a + ca) * du, (b + cb) * dv, ca ? -1 : 1, cb ? -1 : 1);
    for (let k = 0; k < 2; k++) {
      const S = (cb, ca) => D[cb][ca].S[k], U = (cb, ca) => D[cb][ca].Su[k] * du / 3, V = (cb, ca) => D[cb][ca].Sv[k] * dv / 3, W = (cb, ca) => D[cb][ca].Suv[k] * du * dv / 9;
      const P = [[], [], [], []];
      P[0][0] = S(0, 0); P[0][1] = S(0, 0) + U(0, 0); P[0][2] = S(0, 1) - U(0, 1); P[0][3] = S(0, 1);
      P[3][0] = S(1, 0); P[3][1] = S(1, 0) + U(1, 0); P[3][2] = S(1, 1) - U(1, 1); P[3][3] = S(1, 1);
      P[1][0] = S(0, 0) + V(0, 0); P[2][0] = S(1, 0) - V(1, 0); P[1][3] = S(0, 1) + V(0, 1); P[2][3] = S(1, 1) - V(1, 1);
      P[1][1] = S(0, 0) + U(0, 0) + V(0, 0) + W(0, 0); P[1][2] = S(0, 1) - U(0, 1) + V(0, 1) - W(0, 1);
      P[2][1] = S(1, 0) + U(1, 0) - V(1, 0) - W(1, 0); P[2][2] = S(1, 1) - U(1, 1) - V(1, 1) + W(1, 1);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[(3 * b + r) * cols + 3 * a + c][k] = P[r][c];
    }
  }
  return out;
}
// Quatro cantos -> malha: as âncoras caem sobre a perspectiva dos cantos (a forma não vira retângulo) e os lados ficam retos.
export function meshFromCorners(corners, divX, divY) {
  const H = homography(corners), cols = 3 * divX + 1, rows = 3 * divY + 1, pts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push(r % 3 === 0 && c % 3 === 0 ? applyHomography(H, c / (cols - 1), r / (rows - 1)) : [0, 0]);
  return straightenHandles(pts, divX, divY);
}
// Malha -> quatro cantos: os quatro cantos da malha.
export function cornersOfMesh(pts, divX, divY) {
  const cols = 3 * divX + 1, rows = 3 * divY + 1;
  return [pts[0], pts[cols - 1], pts[rows * cols - 1], pts[(rows - 1) * cols]].map(p => [p[0], p[1]]);
}
// Segmentos retos: lados entre âncoras vizinhas cujas alças estão nos terços exatos. Chaves 'h:linha:coluna' e 'v:linha:coluna'
// (índices da rede de controle, da âncora de partida).
export function straightSegs(pts, divX, divY) {
  const cols = 3 * divX + 1, rows = 3 * divY + 1, P = (r, c) => pts[r * cols + c], set = new Set(), e = 0.25;
  // reto = as duas alças estão em cima da linha entre as âncoras, na ordem certa (não precisam estar nos terços: uma malha
  // tirada de uma perspectiva tem lados retos com as alças fora dos terços)
  const ok = (a, b, h1, h2) => {
    const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy;
    if (L2 < 1e-6) return Math.hypot(h1[0] - a[0], h1[1] - a[1]) < e && Math.hypot(h2[0] - a[0], h2[1] - a[1]) < e;
    const t1 = ((h1[0] - a[0]) * vx + (h1[1] - a[1]) * vy) / L2, t2 = ((h2[0] - a[0]) * vx + (h2[1] - a[1]) * vy) / L2, L = Math.sqrt(L2);
    const d1 = Math.abs((h1[0] - a[0]) * vy - (h1[1] - a[1]) * vx) / L, d2 = Math.abs((h2[0] - a[0]) * vy - (h2[1] - a[1]) * vx) / L;
    return d1 < e && d2 < e && t1 > -0.01 && t2 < 1.01 && t1 <= t2 + 0.01;
  };
  for (let r = 0; r < rows; r += 3) for (let c = 0; c + 3 < cols; c += 3) if (ok(P(r, c), P(r, c + 3), P(r, c + 1), P(r, c + 2))) set.add('h:' + r + ':' + c);
  for (let c = 0; c < cols; c += 3) for (let r = 0; r + 3 < rows; r += 3) if (ok(P(r, c), P(r + 3, c), P(r + 1, c), P(r + 2, c))) set.add('v:' + r + ':' + c);
  return set;
}
// Depois de mover a âncora (r,c): os lados que eram retos e tocam nela voltam a ser retos, e o miolo dos retalhos de quatro
// lados retos volta a ser plano. Os lados que o usuário curvou continuam curvos.
export function keepStraight(pts, divX, divY, segs, r, c) {
  const cols = 3 * divX + 1, rows = 3 * divY + 1, P = (rr, cc) => pts[rr * cols + cc];
  const h = (rr, cc) => { if (cc >= 0 && cc + 3 < cols && segs.has('h:' + rr + ':' + cc)) lerpBetween(P(rr, cc), P(rr, cc + 3), P(rr, cc + 1), P(rr, cc + 2)); };
  const v = (rr, cc) => { if (rr >= 0 && rr + 3 < rows && segs.has('v:' + rr + ':' + cc)) lerpBetween(P(rr, cc), P(rr + 3, cc), P(rr + 1, cc), P(rr + 2, cc)); };
  h(r, c - 3); h(r, c); v(r - 3, c); v(r, c);
  for (let pr = r - 3; pr <= r; pr += 3) for (let pc = c - 3; pc <= c; pc += 3) {
    if (pr < 0 || pc < 0 || pr + 3 >= rows || pc + 3 >= cols) continue;
    if (!(segs.has('h:' + pr + ':' + pc) && segs.has('h:' + (pr + 3) + ':' + pc) && segs.has('v:' + pr + ':' + pc) && segs.has('v:' + pr + ':' + (pc + 3)))) continue;
    const A = P(pr, pc), B = P(pr, pc + 3), C = P(pr + 3, pc + 3), D = P(pr + 3, pc);
    for (let i = 1; i <= 2; i++) for (let j = 1; j <= 2; j++) {
      const s = j / 3, t = i / 3, q = P(pr + i, pc + j);
      q[0] = (1 - t) * ((1 - s) * A[0] + s * B[0]) + t * ((1 - s) * D[0] + s * C[0]);
      q[1] = (1 - t) * ((1 - s) * A[1] + s * B[1]) + t * ((1 - s) * D[1] + s * C[1]);
    }
  }
}
// Caixa da superfície de verdade (não a das alças): é a que o Transformar mostra.
export function surfaceBBox(slice) {
  const w = slice.warp; if (w.mode !== 'mesh') return bbox(w.pts);
  const n = 4, pts = [];
  for (let r = 0; r <= w.divY * n; r++) for (let c = 0; c <= w.divX * n; c++) pts.push(meshPoint(w.pts, w.divX, w.divY, c / (w.divX * n), r / (w.divY * n)));
  return bbox(pts);
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
