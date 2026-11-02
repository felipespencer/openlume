# Lê as capturas da varredura do Tilt Shift: nitidez, saturação, cor e vinheta, medidas contra o quadro sem efeito.
import sys
from pathlib import Path
import numpy as np
from PIL import Image

pasta = Path(sys.argv[1])
load = lambda n: np.asarray(Image.open(pasta / (n + '.png')).convert('RGB')).astype(float)
sem = load('sem')
H, W, _ = sem.shape
# sigma equivalente da borda preto|branco em x=240: largura 10%-90% / 2,563 (para gaussiana)
def sigma(im, y):
    lin = im[y - 4:y + 5, 40:440, 1].mean(axis=0)
    lo, hi = lin[:30].mean(), lin[-30:].mean()
    if hi - lo < 5: return None
    n = (lin - lo) / (hi - lo)
    x10 = np.argmax(n >= 0.1); x90 = np.argmax(n >= 0.9)
    return round(float((x90 - x10) / 2.563), 2), round(float(40 + np.argmax(n >= 0.5)), 1)
for f in sorted(pasta.glob('*.png')):
    n = f.stem
    im = load(n)
    d = abs(im - sem).mean()
    c = im[H // 12, 700]; g = im[H // 2, 1200]    # mancha vermelha; cinza do meio
    finas = [round(float(im[y - 20:y + 20, 1500:1850, 1].std()), 1) for y in (H // 6, H // 2, 5 * H // 6)]
    canto, centro = im[6:30, 20:60, 1].mean(), im[H // 2 - 8:H // 2 + 8, 300:340, 1].mean()
    print(f"{n:8s} dif={d:6.2f} sigma(y=topo,meio,base)={[sigma(im, y) for y in (60, H // 2, H - 60)]} verm={c.round(0).tolist()} cinza={g.round(0).tolist()} finas1/2/4px={finas} branco_meio={centro:.0f}")
