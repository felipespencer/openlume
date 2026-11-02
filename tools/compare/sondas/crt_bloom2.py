# CRT: procura o formato do núcleo do bloom (gaussiana, triângulo, caixa, cosseno) e o ganho, em unidades do tubo.
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from numpy.fft import rfft2, irfft2

load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
def nucleo(tipo, L):
    R = int(np.ceil(L * (3 if tipo == 'gauss' else 1))) + 1
    x = np.arange(-R, R + 1, dtype=np.float32)
    if tipo == 'gauss': k = np.exp(-0.5 * (x / L) ** 2)
    elif tipo == 'tri': k = np.clip(1 - abs(x) / L, 0, None)
    elif tipo == 'caixa': k = (abs(x) <= L).astype(np.float32)
    else: k = np.where(abs(x) < L, np.cos(x / L * np.pi / 2) ** 2, 0)
    return k / k.sum()
def conv(a, kx, ky):
    h, w = a.shape
    fx = np.zeros(w, np.float32); fy = np.zeros(h, np.float32)
    rx, ry = kx.size // 2, ky.size // 2
    fx[np.arange(-rx, rx + 1) % w] = kx; fy[np.arange(-ry, ry + 1) % h] = ky
    return irfft2(rfft2(a) * np.fft.rfft(fx)[None, :] * np.fft.fft(fy)[:, None], s=a.shape)
def fit(sem, com, u):
    a, b = load(sem), load(com)
    H, W, _ = a.shape
    a0, b0 = a[:, :, 0], b[:, :, 0]
    res = []
    for tipo in ('gauss', 'tri', 'caixa', 'cos'):
        best = None
        for lx in np.arange(0.5, 6.01, 0.5):
            for ly in np.arange(0.5, 6.01, 0.5):
                g = conv(a0, nucleo(tipo, max(0.6, lx * u)), nucleo(tipo, max(0.6, ly * u)))
                nc = b0 < 0.98
                k = float((g[nc] * (b0[nc] - a0[nc])).sum() / max(1e-6, (g[nc] ** 2).sum()))
                e = float(abs(np.clip(a0 + k * g, 0, 1) - b0).mean() * 255)
                if best is None or e < best[0]: best = (round(e, 2), float(lx), float(ly), round(k, 2))
        res.append((tipo, best))
    return res
pasta = Path(sys.argv[1])
print('c16 (u=12)', fit(pasta / 'c16n.png', pasta / 'c16.png', 12))
print('padrão (u=0,94)', fit(pasta / 'p0.png', pasta / 'pad.png', 0.939))
