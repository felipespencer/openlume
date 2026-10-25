# captura RGBA do Spout e imprime pixels (r,g,b,a) em pontos dados
import array, sys, time, numpy as np, SpoutGL
GL_RGBA = 0x1908; NOME = 'Arena - Screen 1'
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName(NOME); buf=None; novos=0; fim=time.time()+5
    while time.time()<fim:
        ok=r.receiveImage(buf, GL_RGBA, False, 0)
        if r.isUpdated(): w,h=r.getSenderWidth(),r.getSenderHeight(); buf=array.array('B',bytes(w*h*4)); continue
        if buf is not None and ok and r.isFrameNew():
            novos+=1
            if novos>5:
                a=np.frombuffer(buf,np.uint8).reshape(r.getSenderHeight(),r.getSenderWidth(),4); break
        r.waitFrameSync(NOME,100)
print(sys.argv[1], ' '.join('(%d,%d)=%s'%(x,y,list(map(int,a[y,x]))) for x,y in ((200,100),(1700,100),(1700,540),(1700,1000))))
