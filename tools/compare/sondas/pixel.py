# valor RGB de um pixel por quadro do Spout (todos os quadros), para medir decaimento por quadro
import array, sys, time, numpy as np, SpoutGL
GL_RGBA = 0x1908; NOME = 'Arena - Screen 1'; N=int(sys.argv[1]); X=int(sys.argv[2]); Y=int(sys.argv[3])
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName(NOME); buf=None; k=0; fim=time.time()+20; t0=None; out=[]
    while time.time()<fim and k<N:
        ok=r.receiveImage(buf, GL_RGBA, False, 0)
        if r.isUpdated(): w,h=r.getSenderWidth(),r.getSenderHeight(); buf=array.array('B',bytes(w*h*4)); continue
        if buf is not None and ok and r.isFrameNew():
            a=np.frombuffer(buf,np.uint8).reshape(h,w,4); t=time.time(); t0=t0 or t; out.append((round(t-t0,3),)+tuple(map(int,a[Y,X][:3]))); k+=1
        r.waitFrameSync(NOME,100)
print(' '.join('%.3f:%d,%d,%d'%o for o in out))
