# posição do quadrado branco (canal R, x mínimo) em quadros consecutivos do Spout
import array, sys, time, numpy as np, SpoutGL
GL_RGBA = 0x1908; NOME = 'Arena - Screen 1'; N=int(sys.argv[1]) if len(sys.argv)>1 else 20
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName(NOME); buf=None; k=0; fim=time.time()+10; t0=None; out=[]
    while time.time()<fim and k<N:
        ok=r.receiveImage(buf, GL_RGBA, False, 0)
        if r.isUpdated(): w,h=r.getSenderWidth(),r.getSenderHeight(); buf=array.array('B',bytes(w*h*4)); continue
        if buf is not None and ok and r.isFrameNew():
            a=np.frombuffer(buf,np.uint8).reshape(h,w,4); m=a[...,0]>200; ys,xs=np.nonzero(m)
            t=time.time(); t0=t0 or t; out.append((round(t-t0,3), int(xs.min()) if len(xs) else -1, int(ys.min()) if len(ys) else -1)); k+=1
        r.waitFrameSync(NOME,100)
print(out)
