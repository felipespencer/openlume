# Compara a saída do Resolume com a do OpenLume: as duas reduzidas a 960x540, diferença média e máxima
# por canal (0-255) e uma imagem Resolume | OpenLume | diferença (ampliada 4x).
# Uso: py tools/compare/diff.py resolume.png openlume.png lado-a-lado.png
# Recusa imagem lisa (preta ou de uma cor só): é sinal de captura falsa.
import json, sys

import numpy as np
from PIL import Image

W, H = 960, 540


def ler(p):
    return np.asarray(Image.open(p).convert('RGB').resize((W, H), Image.BILINEAR), dtype=np.float32)


r, o = ler(sys.argv[1]), ler(sys.argv[2])
for nome, img in (('Resolume', r), ('OpenLume', o)):
    if img.std() < 2:
        sys.exit(f'captura do {nome} lisa (desvio {img.std():.1f}): conferir janela/clipe')
d = np.abs(r - o)
lado = np.concatenate([r, o, np.clip(d * 4, 0, 255)], axis=1).astype(np.uint8)
Image.fromarray(lado).save(sys.argv[3])
print(json.dumps({'media': round(float(d.mean()), 2), 'max': int(d.max()),
                  'porCanal': [round(float(d[..., i].mean()), 2) for i in range(3)],
                  'acima16': round(float((d.max(axis=2) > 16).mean() * 100), 1)}))
