// Projecionista — processo principal (Electron).
// Serve a pasta app/ por um esquema próprio (app://projecionista/), abre a janela de controle
// e põe a janela de saída no projetor quando há um segundo monitor.
const { app, BrowserWindow, Menu, protocol, net, session, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

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

function createMain() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1100, minHeight: 680,
    backgroundColor: '#1b1c1f', title: 'Projecionista', autoHideMenuBar: true, webPreferences: PREFS,
  });
  // janela de saída: no segundo monitor em tela cheia, se houver; senão uma janela comum
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(ORIGIN + '/output.html')) return { action: 'deny' };
    const main = screen.getDisplayMatching(win.getBounds());
    const ext = screen.getAllDisplays().find(d => d.id !== main.id);
    const base = { backgroundColor: '#000000', title: 'Projecionista — saída', autoHideMenuBar: true, webPreferences: PREFS };
    const opts = ext
      ? { ...base, x: ext.bounds.x, y: ext.bounds.y, width: ext.bounds.width, height: ext.bounds.height, fullscreen: true, frame: false }
      : { ...base, width: 960, height: 540 };
    return { action: 'allow', overrideBrowserWindowOptions: opts };
  });
  win.webContents.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5') { win.webContents.reloadIgnoringCache(); ev.preventDefault(); }
    else if (input.key === 'F12') { win.webContents.toggleDevTools(); ev.preventDefault(); }
  });
  win.on('closed', () => app.quit());      // fechar o controle fecha a saída junto
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

  const win = createMain();
  if (process.env.PROJ_TEST) require('./tools/selftest-main.js')(win, app);
});

app.on('window-all-closed', () => app.quit());
