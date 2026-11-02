// Limpeza da máscara do recorte de pessoa, num worker_thread do processo nativo (seg-native.js): recebe a probabilidade
// do modelo (Float32Array W×H) e devolve a máscara 0–255 já com buracos fechados, pontinhos filtrados, desfoque, erosão/
// e suavidade no tempo (na ordem do Background Removal do Resolume 7.28). Guarda, por efeito, a memória da
// suavidade no tempo (acc, p1, p2). Roda em paralelo com o modelo do quadro seguinte.
const { parentPort } = require('worker_threads');
const S = { t1: null, t2: null, q: null, lab: null, lab32: null };
const st = new Map();   // por efeito: { acc, p1, p2 }
function down2(m, W, H) { const w = W >> 1, h = H >> 1, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = 2 * y * W + 2 * x; o[y * w + x] = (m[i] + m[i + 1] + m[i + W] + m[i + W + 1]) * 0.25; } return o; }
function addUp2(s, w, h, m, W, H) {
  const X0 = new Int32Array(W), X1 = new Int32Array(W), TX = new Float32Array(W);
  for (let x = 0; x < W; x++) { const fx = Math.min(w - 1, Math.max(0, (x - 0.5) / 2)), x0 = fx | 0; X0[x] = x0; X1[x] = Math.min(w - 1, x0 + 1); TX[x] = fx - x0; }
  for (let y = 0; y < H; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y - 0.5) / 2)), y0 = fy | 0, y1 = Math.min(h - 1, y0 + 1), ty = fy - y0, uy = 1 - ty, r0 = y0 * w, r1 = y1 * w, o = y * W;
    for (let x = 0; x < W; x++) {
      const a = s[r0 + X0[x]], b = s[r0 + X1[x]], c = s[r1 + X0[x]], d = s[r1 + X1[x]];
      if (a < 1e-3 && a > -1e-3 && b < 1e-3 && b > -1e-3 && c < 1e-3 && c > -1e-3 && d < 1e-3 && d > -1e-3) continue;   // longe da borda não muda nada
      const t = TX[x], u = 1 - t; m[o + x] += (a * u + b * t) * uy + (c * u + d * t) * ty;
    }
  }
}
function transpose(src, dst, W, H) { for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) dst[x * H + y] = src[o + x]; } }
function buffers(n, W, H) {
  if (!S.t1 || S.t1.length !== n) { S.t1 = new Float32Array(n); S.t2 = new Float32Array(n); }
}
// Borda suave e Refinar borda variam SEM DEGRAU: raios fracionários, por eixo, medidos em pixels da saída (a máscara é quadrada e é
// esticada na composição; sem isso o efeito sai mais largo na horizontal).
function gaussRows(m, W, H, sigma) {   // desfoque gaussiano numa direção
  if (sigma < 0.02) return;
  const t = S.t1;
  if (sigma < 0.7) {   // sigma pequeno: um gaussiano amostrado não faria nada; três pontos com a mesma variância continuam variando até zero
    const a = sigma * sigma / 2, c = 1 - 2 * a;
    for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) t[o + x] = c * m[o + x] + a * (m[o + (x > 0 ? x - 1 : 0)] + m[o + (x < W - 1 ? x + 1 : x)]); }
    m.set(t); return;
  }
  const R = Math.ceil(sigma * 3), k = new Float32Array(R + 1); let tot = 0;
  for (let i = 0; i <= R; i++) { k[i] = Math.exp(-i * i / (2 * sigma * sigma)); tot += i ? 2 * k[i] : k[i]; }
  for (let i = 0; i <= R; i++) k[i] /= tot;
  for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) { let s = k[0] * m[o + x]; for (let r = 1; r <= R; r++) { const a = x - r, b = x + r; s += k[r] * (m[o + (a < 0 ? 0 : a)] + m[o + (b >= W ? W - 1 : b)]); } t[o + x] = s; } }
  m.set(t);
}
function min1X(a, t, W, H) { for (let y = 0; y < H; y++) { const o = y * W, e = o + W - 1; let p = a[o], c = a[o]; for (let i = o; i <= e; i++) { const q = i < e ? a[i + 1] : c; let v = c; if (p < v) v = p; if (q < v) v = q; t[i] = v; p = c; c = q; } } }
function min1Y(a, t, W, H) { const n = W * H; for (let i = 0; i < n; i++) { const u = i >= W ? a[i - W] : a[i], d = i < n - W ? a[i + W] : a[i]; let v = a[i]; if (u < v) v = u; if (d < v) v = d; t[i] = v; } }
function erodeAxis(m, W, H, r, min1) {   // erosão numa direção, de pixel em pixel; a parte fracionária do raio mistura com um pixel a mais
  if (r <= 0) return;
  const r0 = Math.floor(r), f = r - r0, t = S.t1;
  for (let k = 0; k < r0; k++) { min1(m, t, W, H); m.set(t); }
  if (f > 0.001) { min1(m, t, W, H); for (let i = 0; i < m.length; i++) m[i] += (t[i] - m[i]) * f; }
}
function eachAxis(m, W, H, fn, vx, vy) { buffers(W * H, W, H); fn(m, W, H, vx); transpose(m, S.t2, W, H); fn(S.t2, H, W, vy); transpose(S.t2, m, H, W); }
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
// A mediana de 3 quadros tira o pisca da borda, mas a máscara chega um quadro depois: só a partir daqui (no padrão, 0,1, o que pesa é o atraso)
const MEDIAN_FROM = 0.3;
function post(e, prob, W, H, p) {
  const n = W * H;
  if (p.hard) for (let i = 0; i < n; i++) prob[i] = prob[i] >= 0.5 ? 1 : 0;                      // 1
  // 2. suavidade no tempo, como o Resolume descreve: mediana de 3 quadros com portão de movimento (tira o pisca de um quadro só,
  //    mas um pixel que mudou muito passa direto) e depois um passa-baixa adaptativo (1€): tremida pequena é amortecida,
  //    mudança grande passa quase inteira, então a máscara não deixa rastro quando a pessoa se mexe
  let m;
  if (p.tsmooth <= 0) { e.acc = null; e.p1 = null; e.p2 = null; m = prob; }   // sem suavidade: a máscara do modelo passa direto
  else {
    let acc = e.acc; const med = p.tsmooth >= MEDIAN_FROM;
    if (!acc || acc.length !== n) { acc = e.acc = prob.slice(); e.p1 = null; e.p2 = null; }
    else {
      const kmin = 1 - p.tsmooth, beta = 3.0, p1 = med ? e.p1 : null, p2 = med ? e.p2 : null, usa = p1 && p2;
      for (let i = 0; i < n; i++) {
        let x = prob[i];
        if (usa) { const a = p1[i], b = p2[i]; x = Math.max(Math.min(x, a), Math.min(Math.max(x, a), b)); }
        const d = x - acc[i], k = Math.min(1, kmin + beta * Math.abs(d)); acc[i] += d * k;
      }
    }
    if (med) { e.p2 = e.p1; e.p1 = prob; } else { e.p1 = null; e.p2 = null; }
    m = acc.slice();
  }
  if (p.fill || p.specks > 0) {
    if (W >= 400) {   // grande: decisões (buraco / pontinho) na metade da resolução, aplicadas na máscara inteira
      const w = W >> 1, h = H >> 1, s = down2(m, W, H), before = s.slice();
      if (p.fill) fillHoles(s, w, h);                                                            // 3
      if (p.specks > 0) filterSpecks(s, w, h, p.specks);                                         // 4
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const j = yy * w + xx, a = s[j] >= 0.5, b = before[j] >= 0.5; if (a === b) continue; const v = a ? 1 : 0, i = 2 * yy * W + 2 * xx; m[i] = v; m[i + 1] = v; m[i + W] = v; m[i + W + 1] = v; }
    } else { if (p.fill) fillHoles(m, W, H); if (p.specks > 0) filterSpecks(m, W, H, p.specks); }
  }
  // 5 e 6, medidos na bancada contra o Resolume 7.28 (tools/compare/br-arena.mjs, varrendo cada controle): Soft Edge é um desfoque de
  // sigma 3,6 px × valor e Refine Edge é uma erosão de 12,1 px × valor², em pixels de uma saída de 1080 de altura
  const ky = H / 1080, kx = W / (1080 * (p.aspect || 16 / 9));
  const sg = p.soft * 3.6, d = p.refine * p.refine * 12.1;
  if (sg > 0) {
    if (W >= 400) {   // grande: desfoque na metade da resolução (4× mais rápido) e só a MUDANÇA volta para a máscara inteira; o 1,3 compensa o que a redução já tinha alisado (medido na bancada)
      const w = W >> 1, h = H >> 1, s0 = down2(m, W, H), s1 = s0.slice();
      eachAxis(s1, w, h, gaussRows, 1.3 * sg * kx / 2, 1.3 * sg * ky / 2);
      for (let i = 0; i < s1.length; i++) s1[i] -= s0[i];
      addUp2(s1, w, h, m, W, H);
    } else eachAxis(m, W, H, gaussRows, 1.4 * sg * kx, 1.4 * sg * ky);   // 1,4: a máscara pequena passa depois pelo refino guiado, que reafia a borda (medido na bancada)
  }
  if (d > 0) { buffers(n, W, H); erodeAxis(m, W, H, d * kx, min1X); erodeAxis(m, W, H, d * ky, min1Y); }
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
