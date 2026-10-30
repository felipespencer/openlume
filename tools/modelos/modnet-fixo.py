# Fixa o tamanho de entrada do MODNet-HRNet (grafo estatico, tudo na placa). Uso, no venv com onnx + onnxsim:
#   python -I tools/modelos/modnet-fixo.py modnet-hrnet_w18.onnx app/vendor/modnet-hrnet/modnet-hrnet_w18-480.onnx 480
#   python -I tools/modelos/modnet-fixo.py modnet-hrnet_w18.onnx app/vendor/modnet-hrnet/modnet-hrnet_w18-640.onnx 640
# (o modnet-hrnet_w18.onnx dinamico vem do paddle2onnx; veja app/vendor/modnet-hrnet/LEIA-ME.txt)
import sys, onnx
from onnxsim import simplify
src, dst, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
m = onnx.load(src)
name = m.graph.input[0].name
ms, ok = simplify(m, overwrite_input_shapes={name: [1, 3, n, n]})
assert ok, 'simplify falhou'
onnx.save(ms, dst)
import collections
c = collections.Counter(nd.op_type for nd in ms.graph.node)
print('ok', dst, 'entrada', name, 'nós', len(ms.graph.node), dict(c.most_common(8)))
