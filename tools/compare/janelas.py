# Lista as janelas visíveis do Resolume (Arena.exe) com posição e tamanho
import ctypes, ctypes.wintypes as W
u = ctypes.windll.user32; k = ctypes.windll.kernel32
u.SetProcessDPIAware()
pids = set()
import subprocess
for line in subprocess.run(['tasklist', '/FI', 'IMAGENAME eq Arena.exe', '/FO', 'CSV', '/NH'], capture_output=True, text=True).stdout.splitlines():
    p = line.split('","')
    if len(p) > 1: pids.add(int(p[1]))
def cb(h, _):
    vis = u.IsWindowVisible(h)
    pid = W.DWORD(); u.GetWindowThreadProcessId(h, ctypes.byref(pid))
    if pid.value not in pids: return True
    n = u.GetWindowTextLengthW(h); b = ctypes.create_unicode_buffer(n + 1); u.GetWindowTextW(h, b, n + 1)
    r = W.RECT(); u.GetWindowRect(h, ctypes.byref(r))
    if not (vis or b.value): return True
    print(h, "visivel" if vis else "escondida", repr(b.value), r.left, r.top, r.right - r.left, r.bottom - r.top)
    return True
u.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, W.HWND, W.LPARAM)(cb), 0)
