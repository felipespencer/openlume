# Análise da bancada temporal: para cada programa, compara a série com suavidade V contra a série com suavidade 0 do MESMO
# programa (mesmo vídeo, do começo), ambas reamostradas a 30 Hz pelo instante de captura. Mede: atraso (o deslocamento k,
# em quadros de 30 Hz, que melhor casa as duas séries), diferença residual depois de casar, RASTRO (máscara que fica onde
# a série 0 diz fundo) e BURACO (o contrário). Gera uma tira com 4 instantes. Uso: py -I temporal.py <pasta> <rotulo> <valor> <segundos>
import json, os, sys
import numpy as np
from PIL import Image

pasta, rotulo, valor, seg = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
W, H, FPS = 192, 108, 30


def carrega(prog, v):
    if prog == 'resolume':
        q = np.load(os.path.join(pasta, f'{rotulo}-resolume-{v}.npy')).astype(np.float32) / 255.0
        ts = json.load(open(os.path.join(pasta, f'{rotulo}-resolume-{v}.json')))
    else:
        raw = np.fromfile(os.path.join(pasta, f'{rotulo}-openlume-{v}.raw'), dtype=np.uint8)
        q = raw.reshape(-1, H, W).astype(np.float32) / 255.0
        ts = json.load(open(os.path.join(pasta, f'{rotulo}-openlume-{v}.json')))
    ts = np.asarray(ts[:len(q)], dtype=np.float64)
    # reamostra a 30 Hz pelo instante mais próximo
    grade = np.arange(0, min(seg * 1000, ts[-1]) + 1, 1000 / FPS)
    idx = np.abs(ts[None, :] - grade[:, None]).argmin(axis=1)
    return q[idx], len(q), float(len(q) / max(0.001, (ts[-1] - ts[0]) / 1000))


def mede(prog):
    (s0, n0, f0), (sv, nv, fv) = carrega(prog, 0), carrega(prog, valor)
    m = min(len(s0), len(sv)); s0, sv = s0[:m], sv[:m]
    melhor = None
    for k in range(-8, 9):   # sv[t] ≈ s0[t - k]: k > 0 = a suavizada ATRASA k quadros
        a, b = (sv[k:], s0[:m - k]) if k >= 0 else (sv[:m + k], s0[-k:])
        d = float(np.abs(a - b).mean() * 255)
        if melhor is None or d < melhor[1]: melhor = (k, d)
    k, resid = melhor
    bruto = float(np.abs(sv - s0).mean() * 255)
    rastro = float(((s0 < 0.2) & (sv > 0.5)).mean() * 100)
    buraco = float(((s0 > 0.8) & (sv < 0.5)).mean() * 100)
    mov = float(np.abs(np.diff(s0, axis=0)).mean() * 255)
    return dict(quadros_30hz=m, capturados=[n0, nv], taxa_captura=[round(f0, 1), round(fv, 1)], atraso_quadros=k, dif_sem_casar=round(bruto, 2), dif_casada=round(resid, 2), rastro_pct=round(rastro, 3), buraco_pct=round(buraco, 3), movimento_por_quadro=round(mov, 2)), s0, sv


res = {}
tiras = []
for prog in ('resolume', 'openlume'):
    try:
        r, s0, sv = mede(prog); res[prog] = r
        for t in (15, 35, 55, 75):
            if t < len(s0): tiras.append((prog, t, s0[t], sv[t]))
    except Exception as e:
        res[prog] = {'erro': str(e)}
print(json.dumps(res, ensure_ascii=False, indent=1))
if tiras:
    sheet = Image.new('L', (W * 4 * 2, H * 2 + 10), 0)
    for i, (prog, t, a, b) in enumerate(tiras):
        row = 0 if prog == 'resolume' else 1
        col = i % 4
        sheet.paste(Image.fromarray((a * 255).astype(np.uint8)), (col * W * 2, row * (H + 10)))
        sheet.paste(Image.fromarray((b * 255).astype(np.uint8)), (col * W * 2 + W, row * (H + 10)))
    sheet.save(os.path.join(pasta, f'{rotulo}-tira.png'))
