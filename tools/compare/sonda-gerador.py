# Sonda de gerador no Resolume: põe o gerador na camada 1, casa 9, muda parâmetros pela API, captura pelo Spout
# e imprime o perfil de brilho (linha do meio e coluna do meio). Só lê o Resolume; nada dele vai para o app/.
# Uso: py tools/compare/sonda-gerador.py "Lines" '{"Amount":5}' [saida.png]
import json, sys, time, urllib.request, urllib.parse
import numpy as np
sys.path.insert(0, __file__.rsplit('\\', 1)[0].rsplit('/', 1)[0])
from capture import capturar

API = 'http://127.0.0.1:8080/api/v1/composition/layers/1/clips/9'
def req(method, path='', body=None, ctype='application/json'):
    data = body if isinstance(body, bytes) else (json.dumps(body).encode() if body is not None else b'')
    r = urllib.request.Request(API + path, data=data, method=method, headers={'Content-Type': ctype})
    return urllib.request.urlopen(r).read()

def abrir(nome):
    req('POST', '/open', ('source:///video/' + urllib.parse.quote(nome)).encode(), 'text/plain'); time.sleep(0.5)
    req('POST', '/connect'); time.sleep(0.5)

def valores(params):
    c = json.loads(req('GET'))
    sp = c['video']['sourceparams']
    body = {'video': {'sourceparams': {k: {'id': sp[k]['id'], 'value': v} for k, v in params.items()}}}
    req('PUT', '', body); time.sleep(0.4)

if __name__ == '__main__':
    nome, params = sys.argv[1], json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    abrir(nome)
    if params: valores(params)
    img = capturar(espera=3)
    a = np.asarray(img).astype(int)
    h, w = a.shape[:2]
    lum = a[..., :3].mean(axis=2)
    col = lum[:, w // 2]; row = lum[h // 2, :]
    print(f'{w}x{h}  coluna do meio (y=0 em cima), a cada {h//36} px:', ' '.join(str(int(v)) for v in col[::h // 36]))
    print('linha do meio, a cada', w // 48, 'px:', ' '.join(str(int(v)) for v in row[::w // 48]))
    print('cor no centro:', a[h // 2, w // 2, :4].tolist(), '| alfa médio:', round(float(a[..., 3].mean()), 1) if a.shape[2] > 3 else '-')
    if len(sys.argv) > 3: img.save(sys.argv[3])
