# CRT: vinheta (razão sobre a faixa branca da imagem de prova) e médias Resolume × OpenLume de cada caso da bateria.
import sys
from pathlib import Path
import numpy as np
from PIL import Image

S = Path(sys.argv[1])
load = lambda p: np.asarray(Image.open(p).convert('L')).astype(np.float32)
a, b = load(S / 'crt/vig.png'), load(S / 'crt/padrao.png')
H, W = a.shape
print('vinheta 100: razão vig/padrão na faixa branca, média em blocos')
for y in (4, 20, 40, 80, 120, 200, 300, 540):
    print(f' y={y:3d}', [round(float(a[y - 3:y + 4, x - 6:x + 7].mean() / max(1, b[y - 3:y + 4, x - 6:x + 7].mean())), 2) for x in (250, 300, 360, 420, 470)])
yy, xx = np.mgrid[0:H, 240:480]
u, v = (xx + 0.5) / W, (yy + 0.5) / H
f = 16 * u * v * (1 - u) * (1 - v)
r = np.clip(a[:, 240:480] / np.maximum(b[:, 240:480], 1), 0, 1.2)
# média por faixa de f, para ver a curva
for lo, hi in [(0, .02), (.02, .05), (.05, .1), (.1, .2), (.2, .3), (.3, .4), (.4, .6), (.6, .8)]:
    m = (f >= lo) & (f < hi)
    if m.any(): print(f' f {lo}-{hi}: razão {r[m].mean():.3f} (f médio {f[m].mean():.3f})')
print('médias (Resolume, OpenLume):')
for n in sys.argv[2:]:
    print(f' {n:10s} {load(S / f"cmp-{n}.resolume.png").mean():.1f} {load(S / f"cmp-{n}.openlume.png").mean():.1f}')
