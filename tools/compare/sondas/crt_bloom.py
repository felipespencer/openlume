# CRT: ajusta o bloom como saída = limite(máscara + k × gauss(máscara, sx, sy)). Pares (sem bloom, com bloom) sobre a mesma entrada.
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from numpy.fft import rfft2, irfft2

load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
def gauss(a, sx, sy):
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    return irfft2(rfft2(a) * np.exp(-2 * np.pi ** 2 * ((fx * sx) ** 2 + (fy * sy) ** 2)), s=a.shape)
def fit(sem, com, nome):
    a, b = load(sem)[:, :, 0], load(com)[:, :, 0]
    best = None
    for sx in (0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26, 30, 40):
        for sy in (0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26, 30, 40):
            g = gauss(a, sx, sy)
            nc = b < 0.98                          # só onde não cortou
            k = float((g[nc] * (b[nc] - a[nc])).sum() / max(1e-6, (g[nc] ** 2).sum()))
            e = float(abs(np.clip(a + k * g, 0, 1) - b).mean() * 255)
            if best is None or e < best[0]: best = (e, sx, sy, k)
    print(f'{nome:14s} erro {best[0]:.2f}/255 sx={best[1]} sy={best[2]} k={best[3]:.2f} média sem {a.mean() * 255:.1f} com {b.mean() * 255:.1f}')
pasta = Path(sys.argv[1])
for linha in sys.argv[2:]:
    n, s, c = linha.split(':')
    fit(pasta / s, pasta / c, n)
