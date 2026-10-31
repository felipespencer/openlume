# Rajada de quadros da saída do Resolume pelo Spout (bancada TEMPORAL): guarda todos os quadros novos que chegarem durante
# S segundos, reduzidos a 192×108 em cinza (canal R), num .npy [N,108,192] e os instantes (ms) num .json ao lado.
# O Resolume manda quadro novo a cada render (pode ser 60–120 por segundo, repetindo o quadro do vídeo); a análise
# (temporal.py) reamostra pelo instante.
# Uso: py tools/compare/capture-burst.py <saida.npy> <segundos> [quadros novos a pular antes]
import array, json, sys, time

import numpy as np
import SpoutGL
from PIL import Image

GL_RGBA = 0x1908
NOME = 'Arena - Screen 1'


def rajada(segundos, pular=0, nome=NOME, maximo=600):
    with SpoutGL.SpoutReceiver() as r:
        r.createOpenGL()
        if nome not in (r.getSenderList() or []):
            sys.exit(f'remetente Spout "{nome}" não existe (Resolume: Saída avançada → Device: Spout). Há: {r.getSenderList()}')
        r.setReceiverName(nome)
        buf, novos, quadros, ts = None, 0, [], []
        t0 = None; fim = time.time() + segundos + 10
        while time.time() < fim and len(quadros) < maximo:
            ok = r.receiveImage(buf, GL_RGBA, False, 0)
            if r.isUpdated():
                w, h = r.getSenderWidth(), r.getSenderHeight()
                buf = array.array('B', bytes(w * h * 4))
                continue
            if buf is not None and ok and r.isFrameNew():
                novos += 1
                if novos > pular:
                    if t0 is None: t0 = time.time()
                    if time.time() - t0 > segundos: break
                    img = np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)
                    g = Image.fromarray(np.ascontiguousarray(img[:, :, 0])).resize((192, 108), Image.BILINEAR)
                    quadros.append(np.asarray(g, dtype=np.uint8)); ts.append(round((time.time() - t0) * 1000, 1))
            r.waitFrameSync(nome, 100)
        if len(quadros) < 10:
            sys.exit(f'só vieram {len(quadros)} quadros')
        return np.stack(quadros), ts


if __name__ == '__main__':
    out, seg = sys.argv[1], float(sys.argv[2]); pular = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    q, ts = rajada(seg, pular)
    np.save(out, q); json.dump(ts, open(out.replace('.npy', '.json'), 'w'))
    print(q.shape, 'ms do 1º ao último:', ts[-1] - ts[0], '→', round(len(ts) / max(0.001, (ts[-1] - ts[0]) / 1000), 1), 'quadros/s')
