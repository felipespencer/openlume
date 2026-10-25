# Captura a saída do Resolume pelo Spout (Saída avançada → Device: Spout; o remetente chama "Arena - Screen 1").
# Spout passa a textura pela placa de vídeo, sem compressão: chega o pixel que o Resolume desenhou.
# Por que não pela tela: neste PC a leitura DXGI clareia tudo (HDR; 129 vira 213) e a GDI devolve quadro parado.
# Uso: py tools/compare/capture.py <saida.png> [quadros novos a esperar antes de capturar]
# Sai com erro se não houver remetente ou se a imagem vier preta.
import array, sys, time

import numpy as np
import SpoutGL

GL_RGBA = 0x1908
NOME = 'Arena - Screen 1'


def capturar(espera=0, nome=NOME, limite=5.0):
    with SpoutGL.SpoutReceiver() as r:
        r.createOpenGL()
        if nome not in (r.getSenderList() or []):
            sys.exit(f'remetente Spout "{nome}" não existe (Resolume: Saída avançada → Device: Spout). Há: {r.getSenderList()}')
        r.setReceiverName(nome)
        buf, novos, fim = None, 0, time.time() + limite
        while time.time() < fim:
            ok = r.receiveImage(buf, GL_RGBA, False, 0)
            if r.isUpdated():  # primeira vez ou mudou de tamanho: o buffer tem de ser do tamanho do remetente
                w, h = r.getSenderWidth(), r.getSenderHeight()
                buf = array.array('B', bytes(w * h * 4))
                continue
            if buf is not None and ok and r.isFrameNew():
                novos += 1
                if novos > espera:
                    img = np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)
                    return np.ascontiguousarray(img[:, :, :3])
            r.waitFrameSync(nome, 100)
        sys.exit('o Spout não mandou quadro novo a tempo')


if __name__ == '__main__':
    from PIL import Image
    img = capturar(int(sys.argv[2]) if len(sys.argv) > 2 else 0)
    if img.mean() < 1:
        sys.exit('captura preta')
    Image.fromarray(img).save(sys.argv[1])
    print(img.shape[1], img.shape[0], round(float(img.mean()), 1))
