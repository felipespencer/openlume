# Troca o nome do programa de OpenLume para OpenLux em todos os arquivos de texto do git (feito uma vez, em 2026-11-01).
# Mantém de propósito: o endereço do repositório no GitHub (felipespencer/openlume: o nome do repo só muda se o Felipe renomear lá),
# o appId do instalador (app.openlume: preserva a atualização no lugar da versão instalada) e os identificadores internos de tools/compare.
import subprocess, os, re
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
files = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, encoding='utf-8').stdout.split('\n')
SKIP_EXT = ('.png', '.jpg', '.jpeg', '.gif', '.mp4', '.msi', '.zip', '.exe', '.onnx', '.wasm', '.ico', '.webm', '.woff', '.woff2', '.ttf')
URL = re.compile(r'github\.com/felipespencer/openlume')
n = 0
for f in files:
    if not f or f.lower().endswith(SKIP_EXT) or f == 'tools/renomear-openlux.py': continue
    try: s = open(f, encoding='utf-8', newline='').read()
    except Exception: continue
    o = s
    s = s.replace('OpenLume', 'OpenLux').replace('OPENLUME', 'OPENLUX').replace('Openlume', 'Openlux')
    if f in ('package.json', 'package-lock.json'): s = s.replace('"name": "openlume"', '"name": "openlux"')
    if f in ('main.js', 'app/app.js'): s = s.replace('openlume.log', 'openlux.log')
    if s != o:
        open(f, 'w', encoding='utf-8', newline='').write(s); n += 1
print('arquivos alterados:', n)
