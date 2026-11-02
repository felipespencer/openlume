# Tilt Shift, medida fina: forma da transição entre foco e desfoque (por linha) e formato da vinheta.
import sys
from pathlib import Path
import numpy as np
from PIL import Image

base = Path(sys.argv[1])
load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(float)

def est(im, y, W):
    lin = im[y - 1:y + 2, W // 2 - 100:W // 2 + 100, 1].mean(axis=0) / 255
    return float((lin * (1 - lin)).sum() * np.sqrt(np.pi)), lin

im = load(base / 'blur/b1.png'); H, W, _ = im.shape
print('b1, linhas com |y-0,5| = r: sigma estimado (Blur 1, Focus .4, Falloff 1)')
print(' '.join(f'{r:.3f}:{est(im, int(H * (0.5 - r)), W)[0]:.2f}' for r in np.arange(0.08, 0.5, 0.02)))
for n, sub in [('f02', 'blur'), ('f06', 'blur'), ('fa075', 'blur2'), ('fa05', 'blur2')]:
    im = load(base / sub / f'{n}.png')
    print(n, ' '.join(f'{r:.2f}:{est(im, int(H * (0.5 - r)) + (2 if r >= 0.5 else 0), W)[0]:.2f}' for r in np.arange(0.0, 0.501, 0.04)))
im = load(base / 'blur/b1.png')
for r in (0.14, 0.2, 0.28):
    _, lin = est(im, int(H * (0.5 - r)), W)
    print(f'perfil da borda em r={r}: a cada 3 px em volta do centro', (lin[100 - 18:100 + 19:3] * 255).round().astype(int).tolist())

print('VINHETA (branco): valor/255 na vertical do canto e ao longo das bordas')
for n in ['v025', 'v05', 'v075', 'v1']:
    v = load(base / f'vig/{n}.png')[:, :, 1] / 255
    print(n, 'borda-esq em y=0,.1,.2,.3,.4,.5:', [round(float(v[int(t * (H - 1)), 0]), 3) for t in (0, .1, .2, .3, .4, .5)],
          'borda-cima x=0,.1..,.5:', [round(float(v[0, int(t * (W - 1))]), 3) for t in (0, .1, .2, .3, .4, .5)],
          'entra em x px (y=.5):', [round(float(v[H // 2, x]), 3) for x in (0, 10, 20, 40, 60, 80, 120)],
          'entra em y px (x=.5):', [round(float(v[y, W // 2]), 3) for y in (0, 10, 20, 40, 60, 80, 120)])
