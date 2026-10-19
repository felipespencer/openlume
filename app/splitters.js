// Divisórias arrastáveis entre as caixas da janela. Cada divisória muda uma
// variável CSS da página; os tamanhos são lembrados nas preferências.
const VARS = {
  splitMon: { v: '--monW', axis: 'x', from: 'right', min: 220, max: 900 },     // grade | monitores
  splitBot: { v: '--botH', axis: 'y', from: 'bottom', min: 120, max: 700 },   // meio | rodapé
  splitL: { v: '--leftW', axis: 'x', from: 'left', min: 200, max: 800 },     // Composição/Camada | Clipe
  splitR: { v: '--rightW', axis: 'x', from: 'right', min: 220, max: 900 },   // Clipe | navegador
};
export function initSplitters(prefs) {
  const root = document.documentElement, sizes = Object.assign({}, prefs && prefs.sizes || {});
  for (const id in VARS) if (sizes[id]) root.style.setProperty(VARS[id].v, sizes[id] + 'px');
  let save = null;
  for (const id in VARS) {
    const d = document.getElementById(id), cfg = VARS[id]; if (!d) continue;
    d.addEventListener('pointerdown', (e) => {
      e.preventDefault(); d.setPointerCapture(e.pointerId); d.classList.add('drag');
      const move = (ev) => {
        let px;
        if (cfg.axis === 'x') px = cfg.from === 'left' ? ev.clientX : innerWidth - ev.clientX;
        else px = innerHeight - ev.clientY;
        px = Math.round(Math.max(cfg.min, Math.min(cfg.max, px)));
        root.style.setProperty(cfg.v, px + 'px'); sizes[id] = px;
        dispatchEvent(new Event('resize'));
      };
      const up = () => { d.removeEventListener('pointermove', move); d.removeEventListener('pointerup', up); d.classList.remove('drag'); if (save) save(sizes); };
      d.addEventListener('pointermove', move); d.addEventListener('pointerup', up);
    });
    d.addEventListener('dblclick', () => { root.style.removeProperty(cfg.v); delete sizes[id]; dispatchEvent(new Event('resize')); if (save) save(sizes); });
  }
  return { onSave: (fn) => { save = fn; } };
}
