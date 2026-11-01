# Gera atalhos-mockup.html: a maquete do modo "Atalhos de teclado" sobre uma captura real do OpenLume.
# Entrada (em %TEMP%): om.png (captura 1584x861) e om.json (retângulos dos elementos, de tools/drive.mjs eval).
import json, base64, os, sys
T = os.environ['TEMP']
d = json.load(open(os.path.join(T, 'om.json'), encoding='utf-8'))
R = d['R']
b64 = base64.b64encode(open(os.path.join(T, 'om.png'), 'rb').read()).decode()
R = [r for r in R if not (r['x'] >= 1204 and r['y'] >= 540) and r['y'] + r['h'] <= 861 and r['x'] + r['w'] <= 1584]   # fora da janela (rolagem) não entra   # o painel da direita é trocado pela aba Atalhos
seen = set(); U = []
for r in R:
    k = (r['x'], r['y'], r['w'], r['h'])
    if k in seen: continue
    seen.add(k); U.append(r)
clips = [r for r in U if r['k'] == 'clip']
badge = {}
first_clip = U.index(clips[0]); badge[first_clip] = 'Q'
def setb(pred, letter):
    for i, r in enumerate(U):
        if pred(r) and i not in badge: badge[i] = letter; return
setb(lambda r: r['l'] == 'Coluna 2', '2')
setb(lambda r: r['y'] > 600 and r['l'] == '▶', 'W')
setb(lambda r: r['l'] == 'TAP', 'T')
ov = []
for i, r in enumerate(U):
    cls = 'ov ' + r['k'] + (' sel' if i == first_clip else '')
    b = '<i class="bd">%s</i>' % badge[i] if i in badge else ''
    ov.append('<div class="%s" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx" title="%s">%s</div>' % (cls, r['x'], r['y'], r['w'], r['h'], r['l'].replace('"', ''), b))

tpl = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'atalhos-mockup.tpl.html'), encoding='utf-8').read()
html = tpl.replace('/*IMG*/', b64).replace('<!--OVERLAYS-->', ''.join(ov))
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'atalhos-mockup.html')
open(out, 'w', encoding='utf-8', newline='').write(html)
print(len(html) // 1024, 'KB', len(U), 'elementos ->', out)
