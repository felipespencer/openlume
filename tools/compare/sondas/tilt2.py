# Curvas do Tilt Shift: saturação por mancha, sigma do desfoque por altura, vinheta radial. Só lê as capturas do Resolume.
import sys
from pathlib import Path
import numpy as np
from PIL import Image

base = Path(sys.argv[1])
load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(float)

print('SATURAÇÃO: cor de cada mancha')
sem = load(base / 'sat/sem.png'); H, W, _ = sem.shape
xs = [int((i + 0.5) * W / 8) for i in range(8)]
print(' sem ', [sem[H // 4, x].round().astype(int).tolist() for x in xs[:3] + xs[6:]])
for n in ['s0', 's01', 's025', 's05', 's075', 's1']:
    im = load(base / f'sat/{n}.png')
    print(f' {n:5s}', [im[H // 4, x].round().astype(int).tolist() for x in xs[:3] + xs[6:]], 'cinzas', [int(im[3 * H // 4, x, 0]) for x in xs])

def perfil(im, y):
    lin = im[y - 2:y + 3, W // 2 - 300:W // 2 + 300, 1].mean(axis=0) / 255
    x = np.arange(lin.size)
    # sigma a partir da inclinação: área de p(1-p) = sigma / sqrt(pi) para gaussiana
    return float((lin * (1 - lin)).sum() * np.sqrt(np.pi))

print('DESFOQUE: sigma (px) por altura; y = 0, .1 ... 1')
ys = [int(min(H - 3, max(2, f * H))) for f in np.linspace(0, 1, 11)]
for sub in ['blur', 'blur2']:
    for f in sorted((base / sub).glob('*.png')):
        im = load(f)
        print(f' {f.stem:6s}', ' '.join(f'{perfil(im, y):6.1f}' for y in ys))

im = load(base / 'blur/b1.png')
lin = im[2:7, W // 2 - 80:W // 2 + 81, 1].mean(axis=0)
print('forma da borda (topo, Blur 1), a cada 8 px:', lin[::8].round().astype(int).tolist())

print('VINHETA: brilho no branco ao longo da diagonal e dos eixos')
for n in ['v025', 'v05', 'v075', 'v1']:
    im = load(base / f'vig/{n}.png')[:, :, 1]
    dg = [im[int(t * (H - 1)), int(t * (W - 1))] for t in np.linspace(0, 0.5, 11)]
    hz = [im[H // 2, int(t * (W - 1))] for t in np.linspace(0, 0.5, 6)]
    vt = [im[int(t * (H - 1)), W // 2] for t in np.linspace(0, 0.5, 6)]
    print(f' {n:5s} diag', np.round(dg).astype(int).tolist(), 'horiz', np.round(hz).astype(int).tolist(), 'vert', np.round(vt).astype(int).tolist())
