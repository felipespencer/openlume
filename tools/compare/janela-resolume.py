# Captura SÓ a janela principal do Resolume (pela posição dela), nunca a tela inteira. Uso: python janela-resolume.py saida.png [x y para clicar antes (coord. da janela)]...
import ctypes, ctypes.wintypes as w, time, sys
from PIL import ImageGrab
u = ctypes.windll.user32
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception: pass
found = []
@ctypes.WINFUNCTYPE(ctypes.c_bool, w.HWND, w.LPARAM)
def cb(h, l):
    n = u.GetWindowTextLengthW(h)
    if n and u.IsWindowVisible(h):
        b = ctypes.create_unicode_buffer(n + 1); u.GetWindowTextW(h, b, n + 1)
        if b.value.startswith('Resolume Arena - '): found.append((h, b.value))
    return True
u.EnumWindows(cb, 0)
if not found: print('janela do Resolume não achada'); sys.exit(1)
h = found[0][0]
u.ShowWindow(h, 9)
fg = u.GetForegroundWindow(); me = ctypes.windll.kernel32.GetCurrentThreadId(); t1 = u.GetWindowThreadProcessId(fg, None); t2 = u.GetWindowThreadProcessId(h, None)
u.keybd_event(0x12, 0, 0, 0); u.keybd_event(0x12, 0, 2, 0)   # um Alt solto libera o SetForegroundWindow
u.AttachThreadInput(me, t1, True); u.AttachThreadInput(t2, t1, True); u.BringWindowToTop(h); u.SetForegroundWindow(h); u.AttachThreadInput(t2, t1, False); u.AttachThreadInput(me, t1, False)
time.sleep(1.2)
if u.GetForegroundWindow() != h: print('o Resolume não ficou na frente: não capturo (a tela mostraria outro programa)'); sys.exit(2)
r = w.RECT(); u.GetWindowRect(h, ctypes.byref(r))
def click(x, y):   # x, y em coordenadas da janela
    u.SetCursorPos(r.left + int(x), r.top + int(y)); time.sleep(0.2); u.mouse_event(2, 0, 0, 0, 0); time.sleep(0.08); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.7)
args = sys.argv[2:]
i = 0
while i < len(args):
    if args[i] == 'scroll':   # scroll x y cliques (negativo desce)
        u.SetCursorPos(r.left + int(float(args[i + 1])), r.top + int(float(args[i + 2]))); time.sleep(0.2)
        u.mouse_event(0x0800, 0, 0, int(float(args[i + 3])) * 120, 0); time.sleep(0.6); i += 4
    else:
        click(float(args[i]), float(args[i + 1])); i += 2
ImageGrab.grab(bbox=(r.left, r.top, r.right, r.bottom), all_screens=True).save(sys.argv[1])
print('ok', found[0][1], (r.left, r.top, r.right, r.bottom))
