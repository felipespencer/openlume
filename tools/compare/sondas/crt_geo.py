# CRT: área acesa, período horizontal e vertical da máscara (autocorrelação). Lê capturas sobre branco, sem bloom.
import sys
from pathlib import Path
import numpy as np
from PIL import Image

def periodo(s):
    s = s - s.mean()
    if abs(s).max() < 1e-6: return 0
    a = np.correlate(s, s, 'full')[s.size - 1:]; a /= a[0]
    for i in range(2, a.size - 1):
        if a[i] > a[i - 1] and a[i] >= a[i + 1] and a[i] > 0.15: return i
    return 0

for f in sorted(Path(sys.argv[1]).glob('*.png')):
    if f.stem.startswith('_'): continue
    im = np.asarray(Image.open(f).convert('RGB')).astype(float)
    t = im.sum(axis=2)
    xs, ys = np.where(t.max(axis=0) > 30)[0], np.where(t.max(axis=1) > 30)[0]
    if not xs.size: print(f.stem, 'apagado'); continue
    x0, x1, y0, y1 = xs[0], xs[-1], ys[0], ys[-1]
    r = im[:, :, 0]
    colr = r[y0:y1 + 1, x0:x1 + 1].mean(axis=0); linr = t[y0:y1 + 1, x0:x1 + 1].mean(axis=1)
    print(f'{f.stem:10s} x {x0}-{x1} ({x1 - x0 + 1}) y {y0}-{y1} ({y1 - y0 + 1}) período-x(vermelho) {periodo(colr)} período-y {periodo(linr)} média {im.mean(axis=(0, 1)).round(1).tolist()} máx {im.max(axis=(0, 1)).astype(int).tolist()}')
