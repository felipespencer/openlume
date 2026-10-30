// Processo nativo do Background Removal (utilityProcess do Electron): roda os modelos no onnxruntime-node com
// DirectML, direto na placa de vídeo, como o Resolume faz. Fala com a janela por uma MessagePort.
//   Qualidade Baixa — PP-HumanSeg (PaddleSeg, Apache 2.0, vendor/pphumanseg): 192×192, fundo/pessoa.
//   Média — MODNet-HRNet_W18 (PaddleSeg, Apache 2.0, vendor/modnet-hrnet) em 480×480; Alta — o mesmo em 640×640. Na bancada
//   (quadros parados da gravação do Felipe) foi o que mais bateu com o Medium e o High do Resolume 7.28; o PP-MattingV2 batia pior.
//   (RVM, vendor/rvm, fica para a reserva pela WebGPU na janela.)
// Recebe o quadro já no tamanho do modelo como RGBA (Uint8), devolve a máscara 0..255 já limpa, na ordem do
// efeito do Resolume 7.28: máscara dura, suavidade no tempo (com portão de movimento), fechar buracos
// (inundação), filtrar pontinhos (componentes conexos), borda suave (desfoque), refinar borda (erosão e
// dilatação casadas). O refino guiado pela imagem fica no shader do efeito, na hora de esticar.
const path = require('path');
let ort = null, ortErr = '';
try { ort = require('onnxruntime-node'); } catch (e) { ortErr = e.message || String(e); }

const VENDOR = path.join(__dirname, 'vendor');
const MODELS = {
  fast: { file: path.join(VENDOR, 'pphumanseg', 'pphumanseg.onnx'), k: 1 / 127.5, b: -1 },
  // MODNet-HRNet em dois grafos de tamanho FIXO (onnxsim, tools/modelos/modnet-fixo.py): o grafo dinâmico calculava o tamanho de
  // cada Resize com Shape/Slice/Cast/Concat, e o onnxruntime punha esses 104 nós na CPU, com uma sincronização GPU↔CPU em cada um;
  // fixo, tudo roda na placa: 480² de 49 para 28 ms, 640² de 60 para 35 ms (mesma máscara, diferença 1e-5)
  // Média = PP-MattingV2 512² (grafo de entrada fixa). Bancada de 2026-10-30 com 8 quadros da webcam do Felipe (braços levantados,
  // mãos perto da borda) contra o Medium do Resolume: PP-MattingV2 8,6/255, MODNet 480 14,4 (perde os braços), RVM 11,3.
  // A bancada anterior, num quadro parado só com ombros, tinha apontado o MODNet; era um caso só.
  ppmattingv2: { file: path.join(VENDOR, 'ppmattingv2', 'ppmattingv2-stdc1-human_512.onnx'), k: 1 / 127.5, b: -1 },
  modnet_hrnet_640: { file: path.join(VENDOR, 'modnet-hrnet', 'modnet-hrnet_w18-640.onnx'), k: 1 / 127.5, b: -1 },
  rvm: { file: path.join(VENDOR, 'rvm', 'rvm_mobilenetv3_fp32.onnx'), k: 1 / 255, b: 0 },
};
const sess = {}; const loading = {}; const failed = {};
// chave do modelo: o MODNet tem um grafo por tamanho; os outros são um só
const modelKey = (kind, W) => kind === 'modnet_hrnet' ? 'modnet_hrnet_' + W : kind;
const st = new Map();   // por efeito: { rec (memória do RVM) }; a memória da limpeza (máscara anterior) vive no worker de limpeza
// A limpeza da máscara (buracos, pontinhos, desfoque, erosão, suavidade no tempo) roda num worker_thread (seg-post.js): a CPU limpa o
// quadro N enquanto a placa calcula o N+1, em cores diferentes, sem uma atrapalhar a outra (no mesmo fio, a limpeza de 16 ms
// atrasava a submissão do modelo). A janela mantém até dois pedidos em voo por efeito; aqui um espera na fila enquanto o modelo roda.
const { Worker } = require('worker_threads');
let postW = null; const inflight = new Map();   // id do pedido → { T, kind } à espera da limpeza
function postWorker() {
  if (postW) return postW;
  postW = new Worker(path.join(__dirname, 'seg-post.js'));
  postW.on('message', (r) => {
    const w = inflight.get(r.id); inflight.delete(r.id);
    if (!r.mask) { send({ type: 'skip', id: r.id }); return; }
    const et = w ? { ...w.T, post: r.ms } : { post: r.ms };
    send({ type: 'mask', id: r.id, mask: r.mask, W: r.W, H: r.H, ms: (w ? w.T.prep + w.T.modelo_espera : 0) + r.ms, kind: w ? w.kind : undefined, etapas: et });   // por cópia: a porta do Electron não transfere ArrayBuffer
  });
  postW.on('error', (e) => { send({ type: 'err', msg: 'Limpeza da máscara: ' + (e.message || e) }); });
  return postW;
}
let ep = 'dml';

async function load(kind) {
  if (sess[kind] || loading[kind]) return loading[kind];
  loading[kind] = (async () => {
    try { sess[kind] = await ort.InferenceSession.create(MODELS[kind].file, { executionProviders: [ep], graphOptimizationLevel: 'all' }); }
    catch (e) {
      if (ep === 'dml') { ep = 'cpu'; try { sess[kind] = await ort.InferenceSession.create(MODELS[kind].file, { executionProviders: ['cpu'] }); send({ type: 'err', msg: 'DirectML não abriu (' + (e.message || e) + '); modelo na CPU' }); } catch (e2) { failed[kind] = true; send({ type: 'err', msg: 'Tirar o fundo: ' + (e2.message || e2) }); } }
      else { failed[kind] = true; send({ type: 'err', msg: 'Tirar o fundo: ' + (e.message || e) }); }
    } finally { loading[kind] = null; }
  })();
  return loading[kind];
}
// RGBA → tensor [1,3,H,W] float32: valor = pixel * k + b
function tensor(rgba, W, H, k, b) {
  const n = W * H, t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { t[i] = rgba[i * 4] * k + b; t[n + i] = rgba[i * 4 + 1] * k + b; t[2 * n + i] = rgba[i * 4 + 2] * k + b; }
  return new ort.Tensor('float32', t, [1, 3, H, W]);
}

async function run(msg) {
  const { id, fx, rgba, W, H, kind, ratio, params, reset } = msg;
  let e = st.get(fx); if (!e) { e = { rec: null }; st.set(fx, e); }
  if (reset) e.rec = null;
  const key = modelKey(kind, W), M = MODELS[key], s = sess[key]; const T = { t0: performance.now() };
  const src = tensor(rgba, W, H, M.k, M.b); T.prep = performance.now();
  let outP;
  if (kind === 'rvm') {
    if (!e.rec) { e.rec = {}; for (const k of ['r1i', 'r2i', 'r3i', 'r4i']) e.rec[k] = new ort.Tensor('float32', new Float32Array([0]), [1, 1, 1, 1]); }
    outP = s.run({ src, downsample_ratio: new ort.Tensor('float32', new Float32Array([ratio]), [1]), ...e.rec });
  } else outP = s.run({ [s.inputNames[0]]: src });
  const out = await outP; T.model = performance.now();
  let prob; const n = W * H;
  if (kind === 'rvm') { e.rec = { r1i: out.r1o, r2i: out.r2o, r3i: out.r3o, r4i: out.r4o }; prob = Float32Array.from(out.pha.data); }
  else if (kind === 'fast') {
    const o = out[s.outputNames[0]], data = o.data; prob = new Float32Array(n);
    // saída [1,2,H,W] = (fundo, pessoa). O PP-HumanSeg exportado já traz Softmax: canal 1 É a probabilidade de pessoa
    // (passar isso por outra sigmoide achatava a máscara para 0,27..0,73 — a Baixa saía cinza). Se vierem logits, aí sim a sigmoide da diferença.
    if (o.dims.length === 4 && o.dims[1] === 2) { let mn = Infinity, mx = -Infinity; for (let i = 0; i < 2 * n; i += 97) { const v = data[i]; if (v < mn) mn = v; if (v > mx) mx = v; } const probs = mn >= -0.001 && mx <= 1.001;
      for (let i = 0; i < n; i++) prob[i] = probs ? data[n + i] : 1 / (1 + Math.exp(data[i] - data[n + i])); }
    else for (let i = 0; i < n; i++) prob[i] = Math.min(1, Math.max(0, data[i]));
  } else { const data = out[s.outputNames[0]].data; prob = new Float32Array(n); for (let i = 0; i < n; i++) prob[i] = Math.min(1, Math.max(0, data[i])); }
  inflight.set(id, { T: { prep: T.prep - T.t0, modelo_espera: T.model - T.prep }, kind });
  postWorker().postMessage({ id, fx, prob, W, H, params, reset }, [prob.buffer]);
}

// ---------- limpeza da máscara ----------

// ---------- ligação com a janela ----------
let port = null, busy = false, queued = null;
function send(m, transfer) { if (port) port.postMessage(m, transfer || []); }
// Aquecimento: logo que o programa abre, cada modelo roda uma vez em cada tamanho que o efeito usa (Baixa 192², Média 480²,
// Alta 640²), para o DirectML compilar ANTES do primeiro uso. Sem isso os primeiros ~5 s depois de ligar o efeito saíam sem
// recorte (Felipe, 2026-10-30). Roda em segundo plano, um tamanho por vez, e cede a vez a um pedido de verdade.
let warmed = false;
async function warm() {
  if (warmed || !ort) return; warmed = true;
  for (const [kind, n] of [['fast', 192], ['ppmattingv2', 512], ['modnet_hrnet_640', 640]]) {
    try {
      if (!sess[kind]) { if (failed[kind]) continue; await load(kind); if (!sess[kind]) continue; }
      while (busy) await new Promise(r => setTimeout(r, 50));
      busy = true; const t0 = performance.now();
      try { const s = sess[kind]; await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', new Float32Array(3 * n * n), [1, 3, n, n]) }); send({ type: 'warm', kind, n, ms: Math.round(performance.now() - t0) }); }
      finally { busy = false; }
    } catch (e) { send({ type: 'err', msg: 'Aquecimento do recorte (' + kind + ' ' + n + '): ' + (e.message || e) }); }
  }
}
async function handle(msg) {
  if (msg.type === 'hello') { send({ type: 'ready', ok: !!ort, ep, err: ortErr }); setTimeout(warm, 300); return; }
  if (msg.type === 'drop') { st.delete(msg.id); if (postW) postW.postMessage({ drop: msg.id }); return; }
  if (msg.type !== 'run' || !ort) return;
  const key = modelKey(msg.kind, msg.W);
  if (!MODELS[key]) { send({ type: 'skip', id: msg.id }); return; }
  if (busy) { if (queued) send({ type: 'skip', id: queued.id }); queued = msg; return; }   // o modelo está ocupado: este espera (só o mais novo)
  busy = true;
  try {
    if (!sess[key]) { if (failed[key]) { send({ type: 'skip', id: msg.id }); return; } await load(key); if (!sess[key]) { send({ type: 'skip', id: msg.id }); return; } }
    await run(msg);
  } catch (e) { send({ type: 'err', id: msg.id, msg: 'Tirar o fundo: ' + (e.message || e) }); }
  finally { busy = false; if (queued) { const q = queued; queued = null; handle(q); } }
}
process.on('uncaughtException', (e) => { try { send({ type: 'err', msg: 'Tirar o fundo (nativo): ' + (e.message || e), fatal: true }); } catch {} console.error('seg-native uncaught', e); });
process.on('unhandledRejection', (e) => { try { send({ type: 'err', msg: 'Tirar o fundo (nativo): ' + ((e && e.message) || e), fatal: true }); } catch {} console.error('seg-native unhandled', e); });
process.parentPort.on('message', (ev) => {
  if (ev.ports && ev.ports[0]) { port = ev.ports[0]; port.on('message', (e2) => { if (e2 && e2.data) handle(e2.data); }); port.start(); send({ type: 'ready', ok: !!ort, ep, err: ortErr }); setTimeout(warm, 300); }
});
