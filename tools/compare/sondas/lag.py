# média do atraso em px entre o canal R e o G (quadrado branco) ao longo de N quadros
import array, sys, time, numpy as np, SpoutGL
GL_RGBA = 0x1908; NOME = 'Arena - Screen 1'; N=int(sys.argv[1])
lags=[]; ts=[]; steps=[]
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName(NOME); buf=None; k=0; fim=time.time()+20; last=None; t0=None
    while time.time()<fim and k<N:
        ok=r.receiveImage(buf, GL_RGBA, False, 0)
        if r.isUpdated(): w,h=r.getSenderWidth(),r.getSenderHeight(); buf=array.array('B',bytes(w*h*4)); continue
        if buf is not None and ok and r.isFrameNew():
            a=np.frombuffer(buf,np.uint8).reshape(h,w,4); t=time.time(); t0=t0 or t
            xr=np.nonzero(a[400:600,:,0]>200)[1]; xg=np.nonzero(a[400:600,:,1]>200)[1]
            if len(xr) and len(xg):
                lag=int(xr.min())-int(xg.min())
                if 0<lag<1400: lags.append(lag)
                if last is not None and int(xr.min())!=last: steps.append(t)
                last=int(xr.min())
            k+=1
        r.waitFrameSync(NOME,100)
fps = (len(steps)-1)/(steps[-1]-steps[0]) if len(steps)>2 else 0
print('lag R-G px: media %.1f (n=%d) -> %.3f s a 375 px/s; passos do quadrado: %.1f/s' % (np.mean(lags), len(lags), np.mean(lags)/375, fps))
