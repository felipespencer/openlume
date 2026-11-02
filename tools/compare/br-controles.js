// Mede o efeito de cada controle do Background Removal na saída real do motor (modo Máscara, quadro parado da pessoa).
// Uso: node tools/drive.mjs evalfile tools/compare/br-controles.js  (OpenLume aberto com --remote-debugging-port=9333)
// Para cada qualidade e controle: diferença média contra o padrão (/255), % de pixels que mudaram, área da máscara e % de pixels de borda.
(async () => {
  const CLIP = window.__brClip || 'tools/compare/saida/pessoa2/f05.png';
  const P = window.projecionista, L = P.state.layers[0], S = ms => new Promise(r => setTimeout(r, ms));
  const abs = window.__brRoot + '/' + CLIP;
  const ok = await P.putPath(0, 1, abs, abs.split('/').pop()); if (!ok || !L.clips[1]) throw new Error('clipe não entrou: ' + abs); P.trigger(0, 1); await S(500); if (L.on !== 1) throw new Error('clipe não ligou');
  const def = P.EFFECTS.find(e => e.id === 'backgroundremoval');
  const base = { refine: 0.5, soft: 0.5, fill: 1, hard: 0, specks: 0.1, tsmooth: 0, mode: 1, invert: 0 };
  const fx = { id: def.id, params: { ...base, quality: 1 }, bypass: false, anim: {} };
  L.fx = [fx];
  const cv = P.engine.canvas, W = cv.width, H = cv.height, c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
  const x2 = c2.getContext('2d', { willReadFrequently: true });
  const espera = async () => { const r0 = P.seg.runs; while (P.seg.runs - r0 < 6) await S(16); const f0 = P.frames(); while (P.frames() - f0 < 3) await S(16); };
  const snap = () => { P.render(); x2.clearRect(0, 0, W, H); x2.drawImage(cv, 0, 0); const d = x2.getImageData(0, 0, W, H).data, g = new Uint8Array(W * H); for (let i = 0; i < g.length; i++) g[i] = d[i * 4 + 1]; return g; };
  const stats = (g, b) => { let dif = 0, mud = 0, area = 0, borda = 0; for (let i = 0; i < g.length; i++) { const e = Math.abs(g[i] - b[i]); dif += e; if (e > 8) mud++; area += g[i]; if (g[i] > 13 && g[i] < 242) borda++; } const n = g.length; return { dif: +(dif / n).toFixed(3), mudou: +(100 * mud / n).toFixed(3), area: +(area / n / 2.55).toFixed(2), borda: +(100 * borda / n).toFixed(3) }; };
  const out = { W, H, native: P.seg.native, ep: P.seg.ep, err: P.seg.err, r: {} };
  const SW = { refine: [0, 0.1, 0.25, 0.5, 0.75, 1], soft: [0, 0.1, 0.25, 0.5, 0.75, 1], fill: [0, 1], hard: [0, 1], specks: [0, 0.1, 0.5, 1] };
  for (const q of window.__brQ || [0, 1, 2]) {
    Object.assign(fx.params, base, { quality: q }); await S(1500); await espera(); await espera();
    const b = snap(); const rq = out.r['q' + q] = { base: stats(b, b) };
    for (const [k, vals] of Object.entries(SW)) { rq[k] = {};
      for (const v of vals) { Object.assign(fx.params, base, { quality: q, [k]: v }); await espera(); rq[k][v] = stats(snap(), b); } }
    Object.assign(fx.params, base, { quality: q });
  }
  return out;
})()
