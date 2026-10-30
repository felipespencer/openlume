// Worker do Background Removal: o que acontece com a máscara DEPOIS do modelo, fora da thread do desenho.
// Recebe a probabilidade de pessoa (Float32Array W×H, na resolução do modelo) e devolve a máscara 0..255.
// A ordem é a do efeito do Resolume 7.28 (lida do patch do Wire dele; só a lógica, nada de código):
//   1. máscara dura: corta em 0,5;
//   2. suavidade no tempo: mistura com a máscara anterior, com portão de movimento (mudança grande passa na hora,
//      tremida pequena é amortecida; zera quando o clipe muda);
//   3. fechar buracos: fundo que não encosta na borda da imagem vira pessoa (preenchimento por inundação);
//   4. filtrar pontinhos: regiões de pessoa pequenas em relação à maior somem (componentes conexos);
//   5. borda suave: desfoque da máscara;
//   6. refinar borda: erosão e dilatação casadas, que arredondam o contorno.
// O refino guiado pela imagem (upsampling bilateral conjunto) fica no shader do efeito, na hora de esticar.
// Dilatação e erosão em tempo que não depende do raio (van Herk / Gil-Werman), por linhas, com transposição.
const S = { acc: new Map(), t1: null, t2: null, pre: null, suf: null, q: null, lab: null };

function passRowsMax(src, dst, W, H, r, pre, suf) {
  const w = 2 * r + 1, lastB = Math.floor((W - 1) / w);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let b = 0; b < W; b += w) { const e = Math.min(b + w, W);
      let v = src[o + b]; pre[b] = v; for (let i = b + 1; i < e; i++) { const x = src[o + i]; if (x > v) v = x; pre[i] = v; }
      v = src[o + e - 1]; suf[e - 1] = v; for (let i = e - 2; i >= b; i--) { const x = src[o + i]; if (x > v) v = x; suf[i] = v; } }
    for (let i = 0; i < W; i++) { const a = i - r, c = i + r;
      const sa = a < 0 ? (c < w ? -1 : suf[0]) : suf[a], pc = c >= W ? (Math.floor(a / w) === lastB ? -1 : pre[W - 1]) : pre[c];
      dst[o + i] = sa > pc ? sa : pc; }
  }
}
function passRowsMin(src, dst, W, H, r, pre, suf) {
  const w = 2 * r + 1, lastB = Math.floor((W - 1) / w);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let b = 0; b < W; b += w) { const e = Math.min(b + w, W);
      let v = src[o + b]; pre[b] = v; for (let i = b + 1; i < e; i++) { const x = src[o + i]; if (x < v) v = x; pre[i] = v; }
      v = src[o + e - 1]; suf[e - 1] = v; for (let i = e - 2; i >= b; i--) { const x = src[o + i]; if (x < v) v = x; suf[i] = v; } }
    for (let i = 0; i < W; i++) { const a = i - r, c = i + r;
      const sa = a < 0 ? (c < w ? 2 : suf[0]) : suf[a], pc = c >= W ? (Math.floor(a / w) === lastB ? 2 : pre[W - 1]) : pre[c];
      dst[o + i] = sa < pc ? sa : pc; }
  }
}
// desfoque de caixa de raio r por linhas (soma corrida); duas vezes vira quase gaussiano
function passRowsBox(src, dst, W, H, r) {
  for (let y = 0; y < H; y++) {
    const o = y * W; let s = 0, cnt = 0;
    for (let i = 0; i <= Math.min(r, W - 1); i++) { s += src[o + i]; cnt++; }
    for (let i = 0; i < W; i++) {
      dst[o + i] = s / cnt;
      const add = i + r + 1, rem = i - r;
      if (add < W) { s += src[o + add]; cnt++; }
      if (rem >= 0) { s -= src[o + rem]; cnt--; }
    }
  }
}
// metade da resolução (média 2×2) e volta bilinear
function down2(m, W, H) { const w = W >> 1, h = H >> 1, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = 2 * y * W + 2 * x; o[y * w + x] = (m[i] + m[i + 1] + m[i + W] + m[i + W + 1]) * 0.25; } return o; }
function up2(s, w, h, W, H) { const o = new Float32Array(W * H); for (let y = 0; y < H; y++) { const fy = Math.min(h - 1, Math.max(0, (y - 0.5) / 2)), y0 = fy | 0, y1 = Math.min(h - 1, y0 + 1), ty = fy - y0; for (let x = 0; x < W; x++) { const fx = Math.min(w - 1, Math.max(0, (x - 0.5) / 2)), x0 = fx | 0, x1 = Math.min(w - 1, x0 + 1), tx = fx - x0; const a = s[y0 * w + x0], b = s[y0 * w + x1], c = s[y1 * w + x0], d = s[y1 * w + x1]; o[y * W + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty; } } return o; }
function transpose(src, dst, W, H) { for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) dst[x * H + y] = src[o + x]; } }
function buffers(n, W, H) {
  if (!S.t1 || S.t1.length !== n) { S.t1 = new Float32Array(n); S.t2 = new Float32Array(n); }
  const L = Math.max(W, H); if (!S.pre || S.pre.length < L) { S.pre = new Float32Array(L); S.suf = new Float32Array(L); }
}
// dilatação (isMax) ou erosão de raio r, no lugar
function morph(m, W, H, r, isMax) {
  buffers(W * H, W, H); const pass = isMax ? passRowsMax : passRowsMin;
  pass(m, S.t1, W, H, r, S.pre, S.suf); transpose(S.t1, S.t2, W, H); pass(S.t2, S.t1, H, W, r, S.pre, S.suf); transpose(S.t1, m, H, W);
}
function blur(m, W, H, r) {
  buffers(W * H, W, H);
  for (let k = 0; k < 2; k++) { passRowsBox(m, S.t1, W, H, r); transpose(S.t1, S.t2, W, H); passRowsBox(S.t2, S.t1, H, W, r); transpose(S.t1, m, H, W); }
}
// 3. fechar buracos: inunda o fundo (< 0,5) a partir das bordas; o fundo que a inundação não alcança vira pessoa
function fillHoles(m, W, H) {
  const n = W * H; const q = S.q && S.q.length >= n ? S.q : (S.q = new Int32Array(n)); const seen = S.lab && S.lab.length >= n ? S.lab : (S.lab = new Uint8Array(n));
  seen.fill(0, 0, n); let head = 0, tail = 0;
  const push = (i) => { if (!seen[i] && m[i] < 0.5) { seen[i] = 1; q[tail++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (head < tail) { const i = q[head++], x = i % W; if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (i >= W) push(i - W); if (i + W < n) push(i + W); }
  for (let i = 0; i < n; i++) if (m[i] < 0.5 && !seen[i]) m[i] = 1;
}
// 4. filtrar pontinhos: rotula as regiões de pessoa (≥ 0,5); as com área menor que minSize × a maior somem
function filterSpecks(m, W, H, minSize) {
  const n = W * H; const q = S.q && S.q.length >= n ? S.q : (S.q = new Int32Array(n)); const lab = S.lab32 && S.lab32.length >= n ? S.lab32 : (S.lab32 = new Int32Array(n));
  lab.fill(0, 0, n); const areas = [0]; let L = 0;
  for (let s = 0; s < n; s++) {
    if (lab[s] || m[s] < 0.5) continue;
    L++; let head = 0, tail = 0; q[tail++] = s; lab[s] = L; let area = 0;
    while (head < tail) { const i = q[head++]; area++; const x = i % W;
      const t = (j) => { if (!lab[j] && m[j] >= 0.5) { lab[j] = L; q[tail++] = j; } };
      if (x > 0) t(i - 1); if (x < W - 1) t(i + 1); if (i >= W) t(i - W); if (i + W < n) t(i + W); }
    areas.push(area);
  }
  if (L < 2) return;
  let biggest = 0; for (let k = 1; k <= L; k++) if (areas[k] > biggest) biggest = areas[k];
  const limit = minSize * biggest;
  for (let i = 0; i < n; i++) if (lab[i] && areas[lab[i]] < limit) m[i] = 0;
}

onmessage = (ev) => {
  const { id, prob, W, H, tsmooth, fill, specks, hard, soft, refine, reset } = ev.data, n = W * H;
  // 1. máscara dura
  if (hard) for (let i = 0; i < n; i++) prob[i] = prob[i] >= 0.5 ? 1 : 0;
  // 2. suavidade no tempo, com portão de movimento
  let acc = S.acc.get(id);
  if (reset || !acc || acc.length !== n || tsmooth <= 0) { acc = prob; S.acc.set(id, acc); }
  else { const k = 1 - tsmooth, gate = 0.6; for (let i = 0; i < n; i++) { const d = prob[i] - acc[i]; acc[i] += (d > gate || d < -gate) ? d : d * k; } }
  let m = Float32Array.from(acc);
  if (fill) fillHoles(m, W, H);                                            // 3
  if (specks > 0) filterSpecks(m, W, H, specks);                            // 4
  const rSoft = Math.round(soft * H * 0.03), rRef = Math.round(refine * H * 0.02);
  if (rSoft > 0 || rRef > 0) {
    if (W >= 400) {   // grande: na metade da resolução e volta bilinear (o desfoque e a borda arredondada são suaves por natureza)
      const w = W >> 1, h = H >> 1; const s = down2(m, W, H);
      if (rSoft > 0) blur(s, w, h, Math.max(1, rSoft >> 1));                                                    // 5
      if (rRef > 0) { const r = Math.max(1, rRef >> 1); morph(s, w, h, r, false); morph(s, w, h, r, true); }   // 6: erosão e dilatação casadas
      m = up2(s, w, h, W, H);
    } else {
      if (rSoft > 0) blur(m, W, H, rSoft);
      if (rRef > 0) { morph(m, W, H, rRef, false); morph(m, W, H, rRef, true); }
    }
  }
  const mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = Math.max(0, Math.min(1, m[i])) * 255 + 0.5;
  postMessage({ id, mask, W, H }, [mask.buffer]);
};
