// Limpeza da máscara do recorte de pessoa, num worker_thread do processo nativo (seg-native.js): recebe a probabilidade
// do modelo (Float32Array W×H) e devolve a máscara 0–255 já com buracos fechados, pontinhos filtrados, desfoque, erosão/
// dilatação e suavidade no tempo (na ordem do Background Removal do Resolume 7.28). Guarda, por efeito, a memória da
// suavidade no tempo (acc, p1, p2). Roda em paralelo com o modelo do quadro seguinte.
const { parentPort } = require('worker_threads');
const S = { t1: null, t2: null, pre: null, suf: null, q: null, lab: null, lab32: null };
const st = new Map();   // por efeito: { acc, p1, p2 }
function passRowsMax(src, dst, W, H, r, pre, suf) {
  const w = 2 * r + 1, lastB = Math.floor((W - 1) / w);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let b = 0; b < W; b += w) { const e = Math.min(b + w, W);
      let v = src[o + b]; pre[b] = v; for (let i = b + 1; i < e; i++) { const x = src[o + i]; if (x > v) v = x; pre[i] = v; }
      v = src[o + e - 1]; suf[e - 1] = v; for (let i = e - 2; i >= b; i--) { const x = src[o + i]; if (x > v) v = x; suf[i] = v; } }
    const iEnd = W - r;
    for (let i = r; i < iEnd; i++) { const sa = suf[i - r], pc = pre[i + r]; dst[o + i] = sa > pc ? sa : pc; }
    for (let i = 0; i < Math.min(r, W); i++) { const c = i + r; const sa = c < w ? -1 : suf[0], pc = c >= W ? (Math.floor((i - r) / w) === lastB ? -1 : pre[W - 1]) : pre[c]; dst[o + i] = sa > pc ? sa : pc; }
    for (let i = Math.max(r, iEnd); i < W; i++) { const a = i - r; const sa = a < 0 ? (i + r < w ? -1 : suf[0]) : suf[a], pc = Math.floor(a / w) === lastB ? -1 : pre[W - 1]; dst[o + i] = sa > pc ? sa : pc; }
  }
}
function passRowsMin(src, dst, W, H, r, pre, suf) {
  const w = 2 * r + 1, lastB = Math.floor((W - 1) / w);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let b = 0; b < W; b += w) { const e = Math.min(b + w, W);
      let v = src[o + b]; pre[b] = v; for (let i = b + 1; i < e; i++) { const x = src[o + i]; if (x < v) v = x; pre[i] = v; }
      v = src[o + e - 1]; suf[e - 1] = v; for (let i = e - 2; i >= b; i--) { const x = src[o + i]; if (x < v) v = x; suf[i] = v; } }
    const iEnd = W - r;
    for (let i = r; i < iEnd; i++) { const sa = suf[i - r], pc = pre[i + r]; dst[o + i] = sa < pc ? sa : pc; }
    for (let i = 0; i < Math.min(r, W); i++) { const c = i + r; const sa = c < w ? 2 : suf[0], pc = c >= W ? (Math.floor((i - r) / w) === lastB ? 2 : pre[W - 1]) : pre[c]; dst[o + i] = sa < pc ? sa : pc; }
    for (let i = Math.max(r, iEnd); i < W; i++) { const a = i - r; const sa = a < 0 ? (i + r < w ? 2 : suf[0]) : suf[a], pc = Math.floor(a / w) === lastB ? 2 : pre[W - 1]; dst[o + i] = sa < pc ? sa : pc; }
  }
}
function passRowsBox(src, dst, W, H, r) {   // desfoque de caixa por linhas (soma corrida); duas vezes vira quase gaussiano
  for (let y = 0; y < H; y++) {
    const o = y * W; let s = 0, cnt = 0;
    for (let i = 0; i <= Math.min(r, W - 1); i++) { s += src[o + i]; cnt++; }
    for (let i = 0; i < W; i++) { dst[o + i] = s / cnt; const add = i + r + 1, rem = i - r; if (add < W) { s += src[o + add]; cnt++; } if (rem >= 0) { s -= src[o + rem]; cnt--; } }
  }
}
function down2(m, W, H) { const w = W >> 1, h = H >> 1, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = 2 * y * W + 2 * x; o[y * w + x] = (m[i] + m[i + 1] + m[i + W] + m[i + W + 1]) * 0.25; } return o; }
function addUp2(s, w, h, m, W, H) { for (let y = 0; y < H; y++) { const fy = Math.min(h - 1, Math.max(0, (y - 0.5) / 2)), y0 = fy | 0, y1 = Math.min(h - 1, y0 + 1), ty = fy - y0, r0 = y0 * w, r1 = y1 * w, o = y * W; for (let x = 0; x < W; x++) { const fx = Math.min(w - 1, Math.max(0, (x - 0.5) / 2)), x0 = fx | 0, x1 = Math.min(w - 1, x0 + 1), tx = fx - x0; m[o + x] += (s[r0 + x0] * (1 - tx) + s[r0 + x1] * tx) * (1 - ty) + (s[r1 + x0] * (1 - tx) + s[r1 + x1] * tx) * ty; } } }
function transpose(src, dst, W, H) { for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) dst[x * H + y] = src[o + x]; } }
function buffers(n, W, H) {
  if (!S.t1 || S.t1.length !== n) { S.t1 = new Float32Array(n); S.t2 = new Float32Array(n); }
  const L = Math.max(W, H); if (!S.pre || S.pre.length < L) { S.pre = new Float32Array(L); S.suf = new Float32Array(L); }
}
function morph(m, W, H, r, isMax) {   // dilatação (isMax) ou erosão de raio r, no lugar (van Herk / Gil-Werman)
  buffers(W * H, W, H); const pass = isMax ? passRowsMax : passRowsMin;
  pass(m, S.t1, W, H, r, S.pre, S.suf); transpose(S.t1, S.t2, W, H); pass(S.t2, S.t1, H, W, r, S.pre, S.suf); transpose(S.t1, m, H, W);
}
function blur(m, W, H, r) { buffers(W * H, W, H); for (let k = 0; k < 2; k++) { passRowsBox(m, S.t1, W, H, r); transpose(S.t1, S.t2, W, H); passRowsBox(S.t2, S.t1, H, W, r); transpose(S.t1, m, H, W); } }
function fillHoles(m, W, H) {   // inunda o fundo (< 0,5) a partir das bordas; o fundo que a inundação não alcança vira pessoa
  const n = W * H; const q = S.q && S.q.length >= n ? S.q : (S.q = new Int32Array(n)); const seen = S.lab && S.lab.length >= n ? S.lab : (S.lab = new Uint8Array(n));
  seen.fill(0, 0, n); let head = 0, tail = 0;
  for (let x = 0; x < W; x++) { if (m[x] < 0.5) { seen[x] = 1; q[tail++] = x; } const j = (H - 1) * W + x; if (!seen[j] && m[j] < 0.5) { seen[j] = 1; q[tail++] = j; } }
  for (let y = 0; y < H; y++) { const a = y * W, b = a + W - 1; if (!seen[a] && m[a] < 0.5) { seen[a] = 1; q[tail++] = a; } if (!seen[b] && m[b] < 0.5) { seen[b] = 1; q[tail++] = b; } }
  while (head < tail) {
    const i = q[head++], x = i - ((i / W) | 0) * W;
    let j = i - 1; if (x > 0 && !seen[j] && m[j] < 0.5) { seen[j] = 1; q[tail++] = j; }
    j = i + 1; if (x < W - 1 && !seen[j] && m[j] < 0.5) { seen[j] = 1; q[tail++] = j; }
    j = i - W; if (j >= 0 && !seen[j] && m[j] < 0.5) { seen[j] = 1; q[tail++] = j; }
    j = i + W; if (j < n && !seen[j] && m[j] < 0.5) { seen[j] = 1; q[tail++] = j; }
  }
  for (let i = 0; i < n; i++) if (m[i] < 0.5 && !seen[i]) m[i] = 1;
}
function filterSpecks(m, W, H, minSize) {   // regiões de pessoa com área menor que minSize × a maior somem
  const n = W * H; const q = S.q && S.q.length >= n ? S.q : (S.q = new Int32Array(n)); const lab = S.lab32 && S.lab32.length >= n ? S.lab32 : (S.lab32 = new Int32Array(n));
  lab.fill(0, 0, n); const areas = [0]; let L = 0;
  for (let s0 = 0; s0 < n; s0++) {
    if (lab[s0] || m[s0] < 0.5) continue;
    L++; let head = 0, tail = 0; q[tail++] = s0; lab[s0] = L; let area = 0;
    while (head < tail) {
      const i = q[head++]; area++; const x = i - ((i / W) | 0) * W;
      let j = i - 1; if (x > 0 && !lab[j] && m[j] >= 0.5) { lab[j] = L; q[tail++] = j; }
      j = i + 1; if (x < W - 1 && !lab[j] && m[j] >= 0.5) { lab[j] = L; q[tail++] = j; }
      j = i - W; if (j >= 0 && !lab[j] && m[j] >= 0.5) { lab[j] = L; q[tail++] = j; }
      j = i + W; if (j < n && !lab[j] && m[j] >= 0.5) { lab[j] = L; q[tail++] = j; }
    }
    areas.push(area);
  }
  if (L < 2) return;
  let biggest = 0; for (let k = 1; k <= L; k++) if (areas[k] > biggest) biggest = areas[k];
  const limit = minSize * biggest;
  for (let i = 0; i < n; i++) if (lab[i] && areas[lab[i]] < limit) m[i] = 0;
}
function post(e, prob, W, H, p) {
  const n = W * H;
  if (p.hard) for (let i = 0; i < n; i++) prob[i] = prob[i] >= 0.5 ? 1 : 0;                      // 1
  // 2. suavidade no tempo, como o Resolume descreve: mediana de 3 quadros com portão de movimento (tira o pisca de um quadro só,
  //    mas um pixel que mudou muito passa direto) e depois um passa-baixa adaptativo (1€): tremida pequena é amortecida,
  //    mudança grande passa quase inteira, então a máscara não deixa rastro quando a pessoa se mexe
  let acc = e.acc;
  if (!acc || acc.length !== n || p.tsmooth <= 0) { acc = e.acc = prob; e.p1 = null; e.p2 = null; }
  else {
    const kmin = 1 - p.tsmooth, beta = 3.0, p1 = e.p1, p2 = e.p2;
    for (let i = 0; i < n; i++) {
      let x = prob[i];
      if (p1 && p2) { const a = p1[i], b = p2[i]; x = Math.max(Math.min(x, a), Math.min(Math.max(x, a), b)); }   // mediana(x, a, b) SEMPRE: um pixel de borda que pisca 0,1,0 vira 0 (com o portão de movimento, |x-a| = 1 passava direto e a borda tremia); mudança de verdade (0,1,1) entra um quadro depois
      const d = x - acc[i], k = Math.min(1, kmin + beta * Math.abs(d)); acc[i] += d * k;
    }
  }
  e.p2 = e.p1; e.p1 = Float32Array.from(prob);
  const m = Float32Array.from(acc);
  if (p.fill || p.specks > 0) {
    if (W >= 400) {   // grande: decisões (buraco / pontinho) na metade da resolução, aplicadas na máscara inteira
      const w = W >> 1, h = H >> 1, s = down2(m, W, H), before = Float32Array.from(s);
      if (p.fill) fillHoles(s, w, h);                                                            // 3
      if (p.specks > 0) filterSpecks(s, w, h, p.specks);                                         // 4
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const j = yy * w + xx, a = s[j] >= 0.5, b = before[j] >= 0.5; if (a === b) continue; const v = a ? 1 : 0, i = 2 * yy * W + 2 * xx; m[i] = v; m[i + 1] = v; m[i + W] = v; m[i + W + 1] = v; }
    } else { if (p.fill) fillHoles(m, W, H); if (p.specks > 0) filterSpecks(m, W, H, p.specks); }
  }
  const rSoft = Math.round(p.soft * H * 0.006), rRef = Math.round(p.refine * H * 0.008);         // raios na resolução da máscara, calibrados na bancada contra o Resolume (o Soft Edge 1,0 deles ≈ 3 px em 1080p)
  if (rSoft > 0 || rRef > 0) {
    if (W >= 400) {   // grande: desfoque e erosão/dilatação na metade; só a mudança volta para a máscara inteira (o detalhe fino fica)
      const w = W >> 1, h = H >> 1, s0 = down2(m, W, H), s1 = Float32Array.from(s0);
      if (rSoft > 0) blur(s1, w, h, Math.max(1, rSoft >> 1));                                                   // 5
      if (rRef > 0) { const r = Math.max(1, rRef >> 1); morph(s1, w, h, r, false); morph(s1, w, h, r, true); }  // 6
      for (let i = 0; i < s1.length; i++) s1[i] -= s0[i];
      addUp2(s1, w, h, m, W, H);
    } else { if (rSoft > 0) blur(m, W, H, rSoft); if (rRef > 0) { morph(m, W, H, rRef, false); morph(m, W, H, rRef, true); } }
  }
  const mask = new Uint8Array(n); for (let i = 0; i < n; i++) { const v = m[i]; mask[i] = v <= 0 ? 0 : v >= 1 ? 255 : v * 255 + 0.5; }
  return mask;
}
parentPort.on('message', (m) => {
  if (m.drop != null) { st.delete(m.drop); return; }
  const { id, fx, prob, W, H, params, reset } = m;
  let e = st.get(fx); if (!e) { e = { acc: null, p1: null, p2: null }; st.set(fx, e); }
  if (reset) { e.acc = null; e.p1 = null; e.p2 = null; }
  const t0 = performance.now();
  try { const mask = post(e, prob, W, H, params); parentPort.postMessage({ id, mask, W, H, ms: performance.now() - t0 }, [mask.buffer]); }
  catch (err) { parentPort.postMessage({ id, mask: null, err: err.message || String(err) }); }
});
