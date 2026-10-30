// Worker do Background Removal: tudo que não é desenhar acontece aqui, fora da thread do desenho.
// Recebe o quadro do clipe como ImageBitmap (já no tamanho do modelo), roda o modelo no onnxruntime-web com
// WebGPU (ou WebAssembly com threads, sem WebGPU) e devolve a máscara 0..255 já limpa.
//   Qualidade Baixa — PP-HumanSeg (PaddleSeg, Apache 2.0, vendor/pphumanseg): 192×192, fundo/pessoa.
//   Média / Alta — RVM, Robust Video Matting (GPL-3.0, vendor/rvm): transparência de verdade com memória entre
//   quadros (r1..r4, que fica na GPU). Precisa de WebGPU.
// A limpeza segue a ordem do efeito do Resolume 7.28 (lida do patch do Wire dele; só a lógica, nada de código):
//   1. máscara dura: corta em 0,5;
//   2. suavidade no tempo: mistura com a máscara anterior, com portão de movimento (mudança grande passa na hora,
//      tremida pequena é amortecida; zera quando o clipe muda);
//   3. fechar buracos: fundo que não encosta na borda da imagem vira pessoa (preenchimento por inundação);
//   4. filtrar pontinhos: regiões de pessoa pequenas em relação à maior somem (componentes conexos);
//   5. borda suave: desfoque da máscara;
//   6. refinar borda: erosão e dilatação casadas, que arredondam o contorno.
// O refino guiado pela imagem (upsampling bilateral conjunto) fica no shader do efeito, na hora de esticar.
importScripts('vendor/ort/ort.webgpu.min.js');

const GPU = !!self.navigator.gpu;
ort.env.wasm.wasmPaths = new URL('vendor/ort/', self.location.href).href;
ort.env.wasm.proxy = false;   // já estamos num worker
ort.env.wasm.numThreads = GPU ? 1 : (self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 2)) : 1);

const sess = {}; const loading = {}; let noPrecise = false;
const st = new Map();   // por efeito: { rec (memória do RVM), q, acc (máscara anterior) }
const S = { t1: null, t2: null, pre: null, suf: null, q: null, lab: null, lab32: null };
const cv = new OffscreenCanvas(192, 192); const c2d = cv.getContext('2d', { willReadFrequently: true });

async function load(kind) {
  if (sess[kind] || loading[kind]) return loading[kind];
  loading[kind] = (async () => {
    try {
      if (kind === 'precise') {
        if (!GPU) throw new Error('precisa de WebGPU');
        sess.precise = await ort.InferenceSession.create('vendor/rvm/rvm_mobilenetv3_fp32.onnx', { executionProviders: ['webgpu'],
          preferredOutputLocation: { fgr: 'gpu-buffer', r1o: 'gpu-buffer', r2o: 'gpu-buffer', r3o: 'gpu-buffer', r4o: 'gpu-buffer' } });   // só o alfa volta para a CPU
      } else sess.fast = await ort.InferenceSession.create('vendor/pphumanseg/pphumanseg.onnx', { executionProviders: [GPU ? 'webgpu' : 'wasm'] });
    } catch (e) {
      if (kind === 'precise') { noPrecise = true; postMessage({ type: 'err', msg: 'Qualidade Média/Alta não abriu (' + (e.message || e) + '); usando a Baixa' }); }
      else postMessage({ type: 'err', msg: 'Tirar o fundo: ' + (e.message || e), fatal: true });
    } finally { loading[kind] = null; }
  })();
  return loading[kind];
}

// o quadro como tensor [1,3,H,W] float32: valor = pixel * k + b
function tensor(bitmap, W, H, k, b) {
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  c2d.drawImage(bitmap, 0, 0, W, H); bitmap.close();
  const d = c2d.getImageData(0, 0, W, H).data, n = W * H, t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { t[i] = d[i * 4] * k + b; t[n + i] = d[i * 4 + 1] * k + b; t[2 * n + i] = d[i * 4 + 2] * k + b; }
  return new ort.Tensor('float32', t, [1, 3, H, W]);
}
function dropRec(e) { if (e.rec) for (const k in e.rec) if (e.rec[k] && e.rec[k].dispose) e.rec[k].dispose(); e.rec = null; }

async function run(msg) {
  const { id, bitmap, W, H, kind, q, ratio, params, reset } = msg;
  let e = st.get(id); if (!e) { e = { rec: null, q: -1, acc: null }; st.set(id, e); }
  if (reset) { dropRec(e); e.acc = null; }
  if (reset) e.pend = null;
  let prob; const T = { t0: performance.now() }; let outP;
  // o modelo é disparado na GPU e, enquanto ela calcula, a CPU limpa a máscara do quadro anterior (um quadro de atraso, como no Resolume)
  if (kind === 'precise') {
    if (!e.rec || e.q !== q) { dropRec(e); e.q = q; e.rec = {}; e.pend = null; for (const k of ['r1i', 'r2i', 'r3i', 'r4i']) e.rec[k] = new ort.Tensor('float32', new Float32Array([0]), [1, 1, 1, 1]); }
    const src = tensor(bitmap, W, H, 1 / 255, 0); T.prep = performance.now();
    outP = sess.precise.run({ src, downsample_ratio: new ort.Tensor('float32', new Float32Array([ratio]), [1]), ...e.rec });
  } else {
    const s = sess.fast; const src = tensor(bitmap, W, H, 1 / 127.5, -1); T.prep = performance.now();
    outP = s.run({ [s.inputNames[0]]: src });
  }
  let prev = null;
  if (e.pend && e.pend.kind === kind && e.pend.W === W && e.pend.H === H) { prev = { mask: post(e, e.pend.prob, W, H, params), W, H }; }
  T.post = performance.now();
  const out = await outP; T.model = performance.now();
  if (kind === 'precise') {
    dropRec(e); e.rec = { r1i: out.r1o, r2i: out.r2o, r3i: out.r3o, r4i: out.r4o }; if (out.fgr.dispose) out.fgr.dispose();
    prob = Float32Array.from(out.pha.data);
  } else {
    const s = sess.fast, n = W * H; const o = out[s.outputNames[0]], data = o.data; prob = new Float32Array(n);
    // saída [1,2,H,W] = (fundo, pessoa). O PP-HumanSeg exportado já traz Softmax: canal 1 É a probabilidade de pessoa
    // (passar isso por outra sigmoide achatava a máscara para 0,27..0,73 — a Baixa saía cinza). Se vierem logits, aí sim a sigmoide da diferença.
    if (o.dims.length === 4 && o.dims[1] === 2) { let mn = Infinity, mx = -Infinity; for (let i = 0; i < 2 * n; i += 97) { const v = data[i]; if (v < mn) mn = v; if (v > mx) mx = v; } const probs = mn >= -0.001 && mx <= 1.001;
      for (let i = 0; i < n; i++) prob[i] = probs ? data[n + i] : 1 / (1 + Math.exp(data[i] - data[n + i])); }
    else for (let i = 0; i < n; i++) prob[i] = Math.min(1, Math.max(0, data[i]));
  }
  e.pend = { prob, kind, W, H };
  self.__T = { prep: T.prep - T.t0, post: T.post - T.prep, modelo_espera: T.model - T.post };
  return prev;
}

// ---------- limpeza da máscara ----------
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
// desfoque de caixa de raio r por linhas (soma corrida); duas vezes vira quase gaussiano
function passRowsBox(src, dst, W, H, r) {
  for (let y = 0; y < H; y++) {
    const o = y * W; let s = 0, cnt = 0;
    for (let i = 0; i <= Math.min(r, W - 1); i++) { s += src[o + i]; cnt++; }
    for (let i = 0; i < W; i++) { dst[o + i] = s / cnt; const add = i + r + 1, rem = i - r; if (add < W) { s += src[o + add]; cnt++; } if (rem >= 0) { s -= src[o + rem]; cnt--; } }
  }
}
// metade da resolução (média 2×2) e volta bilinear
function down2(m, W, H) { const w = W >> 1, h = H >> 1, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = 2 * y * W + 2 * x; o[y * w + x] = (m[i] + m[i + 1] + m[i + W] + m[i + W + 1]) * 0.25; } return o; }
function up2(s, w, h, W, H) { const o = new Float32Array(W * H); for (let y = 0; y < H; y++) { const fy = Math.min(h - 1, Math.max(0, (y - 0.5) / 2)), y0 = fy | 0, y1 = Math.min(h - 1, y0 + 1), ty = fy - y0; for (let x = 0; x < W; x++) { const fx = Math.min(w - 1, Math.max(0, (x - 0.5) / 2)), x0 = fx | 0, x1 = Math.min(w - 1, x0 + 1), tx = fx - x0; const a = s[y0 * w + x0], b = s[y0 * w + x1], c = s[y1 * w + x0], d = s[y1 * w + x1]; o[y * W + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty; } } return o; }
// soma a imagem pequena (bilinear) na grande, no lugar
function addUp2(s, w, h, m, W, H) { for (let y = 0; y < H; y++) { const fy = Math.min(h - 1, Math.max(0, (y - 0.5) / 2)), y0 = fy | 0, y1 = Math.min(h - 1, y0 + 1), ty = fy - y0, r0 = y0 * w, r1 = y1 * w, o = y * W; for (let x = 0; x < W; x++) { const fx = Math.min(w - 1, Math.max(0, (x - 0.5) / 2)), x0 = fx | 0, x1 = Math.min(w - 1, x0 + 1), tx = fx - x0; m[o + x] += (s[r0 + x0] * (1 - tx) + s[r0 + x1] * tx) * (1 - ty) + (s[r1 + x0] * (1 - tx) + s[r1 + x1] * tx) * ty; } } }
function transpose(src, dst, W, H) { for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) dst[x * H + y] = src[o + x]; } }
function buffers(n, W, H) {
  if (!S.t1 || S.t1.length !== n) { S.t1 = new Float32Array(n); S.t2 = new Float32Array(n); }
  const L = Math.max(W, H); if (!S.pre || S.pre.length < L) { S.pre = new Float32Array(L); S.suf = new Float32Array(L); }
}
function morph(m, W, H, r, isMax) {   // dilatação (isMax) ou erosão de raio r, no lugar (van Herk / Gil-Werman: tempo não depende do raio)
  buffers(W * H, W, H); const pass = isMax ? passRowsMax : passRowsMin;
  pass(m, S.t1, W, H, r, S.pre, S.suf); transpose(S.t1, S.t2, W, H); pass(S.t2, S.t1, H, W, r, S.pre, S.suf); transpose(S.t1, m, H, W);
}
function blur(m, W, H, r) {
  buffers(W * H, W, H);
  for (let k = 0; k < 2; k++) { passRowsBox(m, S.t1, W, H, r); transpose(S.t1, S.t2, W, H); passRowsBox(S.t2, S.t1, H, W, r); transpose(S.t1, m, H, W); }
}
// 3. fechar buracos: inunda o fundo (< 0,5) a partir das bordas; o fundo que a inundação não alcança vira pessoa (no lugar)
function fillHoles(m, W, H) {
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
// 4. filtrar pontinhos: rotula as regiões de pessoa (≥ 0,5); as com área menor que minSize × a maior somem (no lugar)
function filterSpecks(m, W, H, minSize) {
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
      if (p1 && p2) { const a = p1[i], b = p2[i]; if (Math.abs(x - a) < 0.5) x = Math.max(Math.min(x, a), Math.min(Math.max(x, a), b)); }   // mediana(x, a, b), só sem movimento
      const d = x - acc[i], k = Math.min(1, kmin + beta * Math.abs(d)); acc[i] += d * k;
    }
  }
  e.p2 = e.p1; e.p1 = Float32Array.from(prob);
  const m = Float32Array.from(acc);
  if (p.fill || p.specks > 0) {
    if (W >= 400) {   // grande: as decisões (buraco / pontinho) são tomadas na metade da resolução e aplicadas na máscara inteira
      const w = W >> 1, h = H >> 1, s = down2(m, W, H), before = Float32Array.from(s);
      if (p.fill) fillHoles(s, w, h);                                                            // 3
      if (p.specks > 0) filterSpecks(s, w, h, p.specks);                                         // 4
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const j = yy * w + xx, a = s[j] >= 0.5, b = before[j] >= 0.5; if (a === b) continue; const v = a ? 1 : 0, i = 2 * yy * W + 2 * xx; m[i] = v; m[i + 1] = v; m[i + W] = v; m[i + W + 1] = v; }
    } else {
      if (p.fill) fillHoles(m, W, H);
      if (p.specks > 0) filterSpecks(m, W, H, p.specks);
    }
  }
  const rSoft = Math.round(p.soft * H * 0.006), rRef = Math.round(p.refine * H * 0.008);         // raios na resolução da máscara, calibrados na bancada contra o Resolume (o Soft Edge 1,0 deles ≈ 3 px em 1080p)
  if (rSoft > 0 || rRef > 0) {
    if (W >= 400) {   // grande: desfoque e erosão/dilatação na metade da resolução; só a MUDANÇA volta para a máscara inteira (o detalhe fino fica)
      const w = W >> 1, h = H >> 1, s0 = down2(m, W, H), s1 = Float32Array.from(s0);
      if (rSoft > 0) blur(s1, w, h, Math.max(1, rSoft >> 1));                                                   // 5
      if (rRef > 0) { const r = Math.max(1, rRef >> 1); morph(s1, w, h, r, false); morph(s1, w, h, r, true); }  // 6: erosão e dilatação casadas
      for (let i = 0; i < s1.length; i++) s1[i] -= s0[i];
      addUp2(s1, w, h, m, W, H);
    } else {
      if (rSoft > 0) blur(m, W, H, rSoft);
      if (rRef > 0) { morph(m, W, H, rRef, false); morph(m, W, H, rRef, true); }
    }
  }
  const mask = new Uint8Array(n); for (let i = 0; i < n; i++) { const v = m[i]; mask[i] = v <= 0 ? 0 : v >= 1 ? 255 : v * 255 + 0.5; }
  return mask;
}

let busy = false, nativePort = null, nativeOk = false;
onmessage = async (ev) => {
  const msg = ev.data;
  if (msg.type === 'port') {   // porta para o processo nativo (onnxruntime-node + DirectML): as respostas dele vão direto para a janela
    nativePort = ev.ports[0];
    nativePort.onmessage = (e2) => { const r = e2.data; if (!r) return; if (r.type === 'ready') { nativeOk = !!r.ok; postMessage({ type: 'native', ok: nativeOk, ep: r.ep, err: r.err }); return; } postMessage(r, r.mask ? [r.mask.buffer] : []); };
    nativePort.postMessage({ type: 'hello' }); return;
  }
  if (msg.type === 'run' && msg.native && nativePort && nativeOk) {   // nativo: só os pixels RGBA, já no tamanho do modelo
    const { bitmap, W, H } = msg; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    c2d.drawImage(bitmap, 0, 0, W, H); bitmap.close(); const rgba = c2d.getImageData(0, 0, W, H).data;
    nativePort.postMessage({ type: 'run', id: msg.id, rgba: new Uint8Array(rgba.buffer), W, H, kind: msg.kind, ratio: msg.ratio, params: msg.params, reset: msg.reset }); return;   // por cópia: a porta do Electron não transfere ArrayBuffer
  }
  if (msg.type === 'drop' && nativePort) nativePort.postMessage(msg);
  if (msg.type === 'hello') { let adapter = null; try { const a = GPU && await navigator.gpu.requestAdapter(); adapter = a ? (a.info ? a.info.vendor + '/' + a.info.architecture : 'sem info') : 'nenhum'; } catch (e) { adapter = 'erro ' + e.message; } postMessage({ type: 'ready', gpu: GPU, adapter }); return; }
  if (msg.type === 'drop') { const e = st.get(msg.id); if (e) { dropRec(e); e.pend = null; st.delete(msg.id); } return; }
  if (msg.type !== 'run') return;
  if (msg.kind !== 'fast' && msg.kind !== 'precise') msg.kind = 'precise';   // sem o nativo, o RVM pela WebGPU faz as vezes das qualidades Média e Alta
  if (busy) { msg.bitmap.close(); postMessage({ type: 'skip', id: msg.id }); return; }
  busy = true;
  try {
    const kind = msg.kind === 'precise' && !noPrecise ? 'precise' : 'fast';
    if (!sess[kind]) { await load(kind); if (!sess[kind]) { msg.bitmap.close(); postMessage({ type: 'skip', id: msg.id }); return; } }
    if (kind !== msg.kind) { msg.kind = 'fast'; }
    const t0 = performance.now();
    const r = await run(msg);
    if (r) postMessage({ type: 'mask', id: msg.id, mask: r.mask, W: r.W, H: r.H, ms: performance.now() - t0, kind, etapas: self.__T }, [r.mask.buffer]);
    else postMessage({ type: 'skip', id: msg.id, ms: performance.now() - t0 });
  } catch (e) { postMessage({ type: 'err', id: msg.id, msg: 'Tirar o fundo: ' + (e.message || e) }); }
  finally { busy = false; }
};
