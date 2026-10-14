// Projecionista — processo principal (Electron).
// Serve a pasta app/ por um esquema próprio (app://projecionista/), abre a janela de controle
// e põe cada janela de saída no monitor que a tela pede.
const { app, BrowserWindow, Menu, protocol, net, session, screen, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { LaserCube } = require('./lasercube.js');

const APP_DIR = path.join(__dirname, 'app');
const ORIGIN = 'app://projecionista';
const ALLOWED = /^\/[\w./-]+\.(html|css|js|png|svg|ico)$/;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);
// a mistura roda na janela de controle e alimenta a saída: ela não pode parar quando a
// janela de controle fica coberta ou minimizada
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const PREFS = { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false };

// ---------- monitores ----------
function displayList() {
  const prim = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d, i) => ({
    id: String(d.id), label: d.label || ('Monitor ' + (i + 1)), primary: d.id === prim.id,
    x: d.bounds.x, y: d.bounds.y, w: d.bounds.width, h: d.bounds.height, scale: d.scaleFactor,
  }));
}

// ---------- presets de saída, em disco ----------
const PRESET_DIR = () => path.join(app.getPath('userData'), 'saida-presets');
const presetFile = (name) => {
  const safe = String(name).replace(/[\\/:*?"<>|]/g, '').trim();
  if (!safe) throw new Error('nome vazio');
  return path.join(PRESET_DIR(), safe + '.json');
};

function createMain() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1100, minHeight: 680,
    backgroundColor: '#1b1c1f', title: 'Projecionista', autoHideMenuBar: true,
    webPreferences: { ...PREFS, preload: path.join(APP_DIR, 'preload.js') },
  });
  // janela de saída: output.html?screen=ID&display=<id do monitor | window | auto>
  // "auto" pega o primeiro monitor que não é o do controle e ainda não tem saída aberta
  const taken = new Map();   // display id → janela de saída que o ocupa
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(ORIGIN + '/output.html')) return { action: 'deny' };
    const q = new URL(url).searchParams, want = q.get('display') || 'auto';
    const main = screen.getDisplayMatching(win.getBounds());
    let ext = null;
    if (want === 'auto') ext = screen.getAllDisplays().find(d => d.id !== main.id && !taken.has(d.id)) || null;
    else if (want !== 'window') ext = screen.getAllDisplays().find(d => String(d.id) === want) || null;
    const base = { backgroundColor: '#000000', title: 'Projecionista — saída', autoHideMenuBar: true, webPreferences: PREFS };
    const opts = ext
      ? { ...base, x: ext.bounds.x, y: ext.bounds.y, width: ext.bounds.width, height: ext.bounds.height, fullscreen: true, frame: false }
      : { ...base, width: 960, height: 540 };
    return { action: 'allow', overrideBrowserWindowOptions: opts };
  });
  win.webContents.on('did-create-window', (child, { options }) => {
    if (!options.fullscreen) return;
    const d = screen.getDisplayMatching({ x: options.x, y: options.y, width: options.width, height: options.height });
    taken.set(d.id, child); child.on('closed', () => { if (taken.get(d.id) === child) taken.delete(d.id); });
  });
  win.webContents.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5') { win.webContents.reloadIgnoringCache(); ev.preventDefault(); }
    else if (input.key === 'F12') { win.webContents.toggleDevTools(); ev.preventDefault(); }
  });
  win.on('closed', () => app.quit());      // fechar o controle fecha as saídas junto
  win.loadURL(ORIGIN + '/index.html');
  return win;
}

app.whenReady().then(async () => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(APP_DIR, p);
    if (u.host !== 'projecionista' || !ALLOWED.test(p) || !file.startsWith(APP_DIR) || !fs.existsSync(file))
      return new Response('não encontrado', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  const OK = new Set(['media', 'midi', 'midiSysex', 'fullscreen', 'window-management']);
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(OK.has(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => OK.has(perm));
  Menu.setApplicationMenu(null);
  // cada abertura começa limpa: a versão do disco é sempre a que roda
  try { await session.defaultSession.clearCache(); } catch {}

  ipcMain.handle('displays', () => displayList());
  // diagnóstico: onde cada janela está de verdade (bounds em DIP, tela cheia, monitor que a contém)
  ipcMain.handle('windows', () => BrowserWindow.getAllWindows().map(w => ({ title: w.getTitle(), bounds: w.getBounds(), content: w.getContentBounds(), full: w.isFullScreen(), display: String(screen.getDisplayMatching(w.getBounds()).id) })));
  ipcMain.handle('presets:list', () => {
    try { return fs.readdirSync(PRESET_DIR()).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort(); } catch { return []; }
  });
  ipcMain.handle('presets:load', (_e, name) => fs.readFileSync(presetFile(name), 'utf8'));
  ipcMain.handle('presets:save', (_e, name, json) => {
    if (typeof json !== 'string' || json.length > 4e6) throw new Error('preset inválido');
    fs.mkdirSync(PRESET_DIR(), { recursive: true }); fs.writeFileSync(presetFile(name), json); return true;
  });
  ipcMain.handle('presets:remove', (_e, name) => { try { fs.unlinkSync(presetFile(name)); } catch {} return true; });

  // laser: um LaserCube por vez, controlado pela janela principal
  const laser = new LaserCube();
  ipcMain.handle('laser:discover', () => laser.discover());
  ipcMain.handle('laser:connect', (_e, ip) => laser.connect(String(ip)));
  ipcMain.handle('laser:disconnect', () => { laser.disconnect(); return true; });
  ipcMain.handle('laser:output', (_e, on) => { laser.setOutput(!!on); return true; });
  ipcMain.handle('laser:rate', (_e, r) => { laser.setRate(r | 0); return true; });
  ipcMain.handle('laser:status', () => laser.status());
  ipcMain.on('laser:frame', (_e, buf) => { laser.setFrame(new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2)); });
  app.on('before-quit', () => laser.disconnect());

  const win = createMain();
  laser.on('status', (s) => { if (!win.isDestroyed()) win.webContents.send('laser:status', s); });
  laser.on('error', (m) => { if (!win.isDestroyed()) win.webContents.send('laser:error', m); });
  if (process.env.PROJ_TEST) require('./tools/selftest-main.js')(win, app, laser);
});

app.on('window-all-closed', () => app.quit());
