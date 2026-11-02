# CRT: perfil vertical e horizontal do fósforo vermelho por nível de entrada e Spread (célula 72×120).
import sys
from pathlib import Path
import numpy as np
from PIL import Image
for f in sorted(Path(sys.argv[1]).glob('*.png')):
    im = np.asarray(Image.open(f).convert('RGB')).astype(int)
    x = 678
    print(f'{f.stem:10s} máx {im.max(axis=(0,1)).tolist()} média {im.mean(axis=(0,1)).round(1).tolist()}')
    print('   vert R', im[0:124:4, x, 0].tolist())
    lin = int(np.argmax(im[:124, x, 0]))
    print('   horiz R linha', lin, im[lin, 672:672 + 24:2, 0].tolist(), 'G', im[lin, 696:696 + 24:2, 1].tolist())
