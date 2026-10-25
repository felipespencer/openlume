# por quadro do Spout: x mínimo do quadrado branco (>200) em cada canal R, G, B; imprime só quando muda
import array, sys, time, numpy as np, SpoutGL
GL_RGBA = 0x1908; NOME = 'Arena - Screen 1'; N=int(sys.argv[1]) if len(sys.argv)>1 else 60
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName(NOME); buf=None; k=0; fim=time.time()+20; t0=None; last=None
    while time.time()<fim and k<N:
        ok=r.receiveImage(buf, GL_RGBA, False, 0)
        if r.isUpdated(): w,h=r.getSenderWidth(),r.getSenderHeight(); buf=array.array('B',bytes(w*h*4)); continue
        if buf is not None and ok and r.isFrameNew():
            a=np.frombuffer(buf,np.uint8).reshape(h,w,4); t=time.time(); t0=t0 or t
            row=[]
            for ch in range(3):
                m=a[300:620,:,ch]>200; xs=np.nonzero(m)[1]; row.append(int(xs.min()) if len(xs) else -1)
            if row!=last: print(k, round(t-t0,3), 'R',row[0],'G',row[1],'B',row[2]); last=row
            k+=1
        r.waitFrameSync(NOME,100)
