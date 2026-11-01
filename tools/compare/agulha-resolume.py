# Põe o clipe do Resolume parado em posições conhecidas (0, 50%, 100%) e grava a captura do Transport de cada uma,
# para copiar a agulha da linha do tempo no OpenLux. Precisa do clipe rampa.mp4 na camada 1, coluna 2, selecionado.
import json, urllib.request, ctypes, ctypes.wintypes as w, time, os
from PIL import ImageGrab
T = os.environ['TEMP']
ids = json.load(open(os.path.join(T, 'rid.json')))
API = 'http://127.0.0.1:8080/api/v1'
def put(pid, value):
    req = urllib.request.Request('%s/parameter/by-id/%d' % (API, pid), data=json.dumps({'value': value}).encode(), method='PUT', headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req).read()
u = ctypes.windll.user32
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception: pass
found = []
@ctypes.WINFUNCTYPE(ctypes.c_bool, w.HWND, w.LPARAM)
def cb(h, l):
    n = u.GetWindowTextLengthW(h)
    if n and u.IsWindowVisible(h):
        b = ctypes.create_unicode_buffer(n + 1); u.GetWindowTextW(h, b, n + 1)
        if b.value.startswith('Resolume Arena'): found.append(h)
    return True
u.EnumWindows(cb, 0)
u.ShowWindow(found[0], 9); u.SetForegroundWindow(found[0]); time.sleep(1.5)
put(ids['dir'], 1)   # "||": parado
time.sleep(0.5)
for name, frac in (('0', 0.0), ('50', 0.5), ('100', 1.0)):
    put(ids['pos'], ids['max'] * frac); time.sleep(0.8)
    im = ImageGrab.grab(all_screens=True)
    im.save(os.path.join(T, 'ag-%s.png' % name))
print('ok', len(found))
