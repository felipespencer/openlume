# Tilt Shift: m(r) = quanto da imagem desfocada entra em cada linha (a borda mostra degrau + rampa: é mistura, não sigma variável)
# e ajuste da vinheta como G * (16 u v (1-u)(1-v))^p, limitada a 1.
import sys
from pathlib import Path
import numpy as np
from PIL import Image

base = Path(sys.argv[1])
load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(float)
ref = load(base / 'blur/f1.png'); H, W, _ = ref.shape     # desfoque total
B = ref[H // 2 - 2:H // 2 + 3, W // 2 - 40:W // 2 - 2, 1].mean(axis=0)
def m(im, y):
    v = im[y - 1:y + 2, W // 2 - 40:W // 2 - 2, 1].mean(axis=0)
    return float((v * B).sum() / (B * B).sum())
print('sigma do desfoque total: borda em f1')
for sub, ns in [('blur', ['b1', 'f02', 'f06']), ('blur2', ['fa075', 'fa05'] + [p.stem for p in (base / 'blur3').glob('*.png')] if (base / 'blur3').exists() else ['fa075', 'fa05'])]:
    for n in ns:
        p = base / sub / f'{n}.png'
        if not p.exists(): p = base / 'blur3' / f'{n}.png'
        im = load(p)
        print(f'{n:9s}', ' '.join(f'{m(im, max(2, int(H * (0.5 - r)))):.2f}' for r in np.arange(0, 0.5, 0.04)), ' topo', f'{m(im, 3):.2f}')
print('r:       ', ' '.join(f'{r:.2f}' for r in np.arange(0, 0.5, 0.04)))

yy, xx = np.mgrid[0:H, 0:W]
u, v = (xx + 0.5) / W, (yy + 0.5) / H
f = 16 * u * v * (1 - u) * (1 - v)
for n in ['v025', 'v05', 'v075', 'v1']:
    val = load(base / f'vig/{n}.png')[:, :, 1] / 255
    ok = (val < 0.97) & (val > 0.02)
    A = np.stack([np.log(f[ok]), np.ones(ok.sum())], axis=1)
    p, g = np.linalg.lstsq(A, np.log(val[ok]), rcond=None)[0]
    mod = np.minimum(1, np.exp(g) * f ** p)
    print(n, f'p={p:.4f} G={np.exp(g):.4f} erro médio em ok={abs(mod[ok] - val[ok]).mean() * 255:.2f}/255 em toda a imagem={abs(mod - val).mean() * 255:.4f}/255 pixels afetados={ok.mean() * 100:.2f}% limiar f={np.exp(-g / p):.4f}')
