# Roda um caso da bancada e imprime só os números. Uso: lote.sh "<efeito>" <clipe> <rótulo> [--r "Controle=v"]...
efeito="$1"; clipe="$2"; nome="$3"; shift 3
timeout 90 node tools/compare/compare.mjs "$efeito" --clip "$clipe" --nome "lote-02/cmp-$nome" "$@" 2>&1 | tail -1 | python -c "import sys,json
t=sys.stdin.read()
try:
  d=json.loads(t); print(d['rotulo'].split('cmp-')[1],'media',d['media'],'max',d['max'],'acima16',d['acima16'])
except Exception: print('ERRO',t[-300:])"
