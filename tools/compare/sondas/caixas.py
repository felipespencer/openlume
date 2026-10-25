# caixa do quadrado branco em cada canal (x0,x1,y0,y1) numa captura
import sys,numpy as n;from PIL import Image as I
a=n.asarray(I.open(sys.argv[1]).convert('RGB')).astype(int)
for ch,nome in enumerate('RGB'):
    m=a[...,ch]>200; ys,xs=n.nonzero(m)
    print(sys.argv[2] if len(sys.argv)>2 else '', nome, 'x',xs.min(),xs.max(),'y',ys.min(),ys.max()) if len(xs) else print(nome,'nada')
