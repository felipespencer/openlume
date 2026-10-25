# Sonda de tempo no Resolume: captura quadros consecutivos do Spout; depois de 5 quadros dispara a casa 3 (quadB)
# e imprime, por quadro, o pixel no quadrado velho (A) e no novo (B), em RGB.
import array, sys, time, json, urllib.request, numpy as np, SpoutGL
GL_RGBA = 0x1908; NOME = 'Arena - Screen 1'; API='http://127.0.0.1:8080/api/v1'
N = int(sys.argv[1]) if len(sys.argv) > 1 else 60
CASA = sys.argv[2] if len(sys.argv) > 2 else '3'
PA=(360,460); PB=(1460,460); PA2=(300,800); PB2=(1400,800)   # (x,y): branco A, branco B, laranja A, laranja B
out=[]
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName(NOME); buf=None; k=0; fim=time.time()+20
    while time.time()<fim and k<N:
        ok=r.receiveImage(buf, GL_RGBA, False, 0)
        if r.isUpdated(): w,h=r.getSenderWidth(),r.getSenderHeight(); buf=array.array('B',bytes(w*h*4)); continue
        if buf is not None and ok and r.isFrameNew():
            a=np.frombuffer(buf,np.uint8).reshape(h,w,4)
            out.append([list(map(int,a[y,x][:3])) for x,y in (PA,PB,PA2,PB2)]); k+=1
            if k==5: urllib.request.urlopen(urllib.request.Request(API+'/composition/layers/1/clips/'+CASA+'/connect', data=b'', method='POST')).read()
        r.waitFrameSync(NOME,100)
last=None
for i,row in enumerate(out):
    if row!=last: print(i-5, ' '.join('%3d,%3d,%3d'%tuple(p) for p in row)); last=row
