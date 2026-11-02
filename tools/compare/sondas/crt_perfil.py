# CRT: perfil de uma célula (16 colunas, 9 fileiras, Height Scale 4: célula 72 × 120 px, área em x 384-1536).
import sys
from pathlib import Path
import numpy as np
from PIL import Image

pasta = Path(sys.argv[1])
for f in sorted(pasta.glob('*.png')):
    if f.stem.startswith('_'): continue
    im = np.asarray(Image.open(f).convert('RGB')).astype(int)
    if im.max() < 5: print(f.stem, 'apagado'); continue
    t = im.sum(axis=2)
    # coluna par a partir de x=384+72*4=672; linha do meio de uma fileira: y do brilho máximo
    x0 = 672
    cel = t[:, x0:x0 + 72]
    linha = int(np.argmax(cel.mean(axis=1)))
    print(f.stem, 'linha', linha)
    print('  horiz R', im[linha, x0:x0 + 72:2, 0].tolist())
    print('  horiz G', im[linha, x0:x0 + 72:2, 1].tolist())
    print('  horiz B', im[linha, x0:x0 + 72:2, 2].tolist())
    xr = x0 + int(np.argmax(im[linha, x0:x0 + 24, 0]))
    print('  vert R em x', xr, im[0:240:4, xr, 0].tolist())
