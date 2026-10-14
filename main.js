// Projecionista — processo principal (Electron).
// Serve a pasta app/ por um esquema próprio (app://projecionista/), abre a janela de controle
// e põe cada janela de saída no monitor que a tela pede.
const { app, crashReporter, BrowserWindow, Menu, protocol, net, session, screen, ipcMain, shell } = require('electron');
const { Readable } = require('node:stream');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { LaserCube } = require('./lasercube.js');

// ---------- registro de travamentos ----------
// Tudo que derruba o programa vai para projecionista.log na pasta de dados (menu Projecionista →
// Abrir o registro): erros do processo principal, janela que caiu (com o motivo do Chromium),
// processo de GPU que caiu, e os erros que a própria janela manda. Os minidumps ficam em crashDumps.
const LOG_FILE = () => path.join(app.getPath('userData'), 'projecionista.log');
let lastCrash = '';
function logLine(kind, msg) {
  try { const f = LOG_FILE(); try { if (fs.statSync(f).size > 2e6) fs.renameSync(f, f + '.old'); } catch { } fs.appendFileSync(f, new Date().toISOString() + ' [' + kind + '] ' + String(msg).replace(/\r?\n/g, ' | ').slice(0, 4000) + '\n'); } catch { }
}
process.on('uncaughtException', (e) => { logLine('principal', (e && e.stack) || e); });
process.on('unhandledRejection', (e) => { logLine('principal-promise', (e && e.stack) || e); });
try { crashReporter.start({ submitURL: '', uploadToServer: false, compress: false }); } catch { }
const RECOVER_FILE = () => path.join(app.getPath('userData'), 'recuperar.txt');
app.on('child-process-gone', (_e, d) => {
  logLine('processo', (d.type || '?') + ' ' + (d.name || '') + ' caiu: ' + d.reason + ' (código ' + d.exitCode + ')');
  if (d.type === 'GPU' && !process.env.PROJ_TEST && !relaunching) {
    // depois que o processo de GPU cai, o WebGL desta sessão não volta confiável: reabre o programa
    // inteiro (a janela já salvou a composição automática ao perder o contexto) e recupera ao abrir
    relaunching = true; logLine('processo', 'reabrindo o programa por causa da placa de vídeo');
    try { fs.writeFileSync(RECOVER_FILE(), 'a placa de vídeo travou (' + d.reason + ' ' + d.exitCode + ')'); } catch { }
    setTimeout(() => { app.relaunch(); app.exit(0); }, 1200);
  }
});
let relaunching = false;
// opções de teste da placa de vídeo: PROJ_FLAGS="disable-accelerated-video-decode,use-angle=gl"
for (const f of (process.env.PROJ_FLAGS || '').split(',').map(s => s.trim()).filter(Boolean)) { const [k, v] = f.split('='); if (v != null) app.commandLine.appendSwitch(k, v); else app.commandLine.appendSwitch(k); logLine('abriu', 'opção: --' + f); }

const APP_DIR = path.join(__dirname, 'app');
const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska', ogv: 'video/ogg', avi: 'video/x-msvideo', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml' };
const MEDIA_EXT = new Set(Object.keys(MIME));
// arquivos do disco são servidos em app://projecionista/media/<caminho em base64url>, com Range
// (o vídeo precisa pular dentro do arquivo)
function serveMedia(req, enc) {
  let file; try { file = Buffer.from(enc.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch { return new Response('caminho inválido', { status: 400 }); }
  let st; try { st = fs.statSync(file); } catch { return new Response('não encontrado', { status: 404 }); }
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!st.isFile() || !MEDIA_EXT.has(ext)) return new Response('não é mídia', { status: 403 });
  const size = st.size, type = MIME[ext], range = req.headers.get('range');
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : size - 1; end = Math.min(end, size - 1);
    if (start > end) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), { status: 206, headers: { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), { headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
}
// pastas de onde a pessoa escolhe arquivos
function roots() {
  const out = [];
  for (const [name, key] of [['Vídeos', 'videos'], ['Imagens', 'pictures'], ['Área de trabalho', 'desktop'], ['Documentos', 'documents'], ['Downloads', 'downloads']]) { try { out.push({ name, path: app.getPath(key) }); } catch { } }
  for (const l of 'CDEFGHIJKLMNOPQRSTUVWXYZ') { const d = l + ':\\'; try { if (fs.existsSync(d)) out.push({ name: 'Disco ' + l + ':', path: d }); } catch { } }
  return out;
}
function listDir(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  const dirs = [], files = [];
  for (const e of ents) {
    if (e.name.startsWith('.') || e.name.startsWith('$')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) dirs.push({ name: e.name, path: full });
    else if (e.isFile() && MEDIA_EXT.has(path.extname(e.name).slice(1).toLowerCase())) { let size = 0; try { size = fs.statSync(full).size; } catch { } files.push({ name: e.name, path: full, size }); }
  }
  const col = (a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
  return { dir, dirs: dirs.sort(col), files: files.sort(col) };
}
// ---------- preparar vídeo: H.264 "todo intra" (cada quadro é chave), como o DXV do Resolume ----------
function findFfmpeg() {
  const cands = [path.join(__dirname, 'tools', 'ffmpeg', 'ffmpeg.exe'), path.join(process.resourcesPath || '', 'ffmpeg', 'ffmpeg.exe')];
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch { } }
  return 'ffmpeg';   // no PATH
}
const preparing = new Map();   // caminho de saída → processo
function prepareMedia(src, fmt, onProgress) {
  return new Promise((resolve, reject) => {
    const ext = fmt === 'dxv' ? '.proj.mov' : '.proj.mp4';
    const out = src.replace(/\.[^.\\/]+$/, '') + ext;
    if (preparing.has(out)) return reject(new Error('já está sendo preparado'));
    const args = ['-y', '-hide_banner', '-nostats', '-progress', 'pipe:1', '-i', src];
    if (fmt === 'dxv') args.push('-c:v', 'dxv', '-an', out);
    else args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-g', '1', '-keyint_min', '1', '-bf', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', out);
    let dur = 0, err = '';
    let p;
    try { p = spawn(findFfmpeg(), args, { windowsHide: true }); } catch (e) { return reject(e); }
    preparing.set(out, p);
    p.on('error', (e) => { preparing.delete(out); reject(new Error('ffmpeg não encontrado: ' + e.message)); });
    p.stderr.on('data', (d) => { const s = d.toString(); err += s.slice(-2000); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(s); if (m && !dur) dur = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]); });
    p.stdout.on('data', (d) => { const m = /out_time_us=(\d+)/.exec(d.toString()); if (m && dur) onProgress(Math.min(0.99, (+m[1] / 1e6) / dur)); });
    p.on('close', (code) => { preparing.delete(out); if (code === 0 && fs.existsSync(out)) resolve({ path: out, size: fs.statSync(out).size }); else reject(new Error('ffmpeg saiu com código ' + code + ': ' + err.split('\n').filter(Boolean).slice(-2).join(' '))); });
  });
}
const PREFS_FILE = () => path.join(app.getPath('userData'), 'prefs.json');
const COMP_DIR = () => path.join(app.getPath('userData'), 'composicoes');
const REC_DIR = (dir) => dir || path.join(app.getPath('videos'), 'Projecionista');
const safeName = (name) => { const s = String(name).replace(/[\\/:*?"<>|]/g, '').trim(); if (!s) throw new Error('nome vazio'); return s; };
const ORIGIN = 'app://projecionista';
const ALLOWED = /^\/[\w./-]+\.(html|css|js|mjs|png|svg|ico|wasm|onnx|txt)$/;

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
  win.webContents.on('render-process-gone', (_e, d) => {
    lastCrash = 'a janela caiu: ' + d.reason + ' (código ' + d.exitCode + ')'; logLine('janela', lastCrash + ' — reabrindo');
    if (d.reason !== 'clean-exit' && d.reason !== 'killed' && !win.isDestroyed()) setTimeout(() => { try { win.webContents.reload(); } catch { } }, 500);
  });
  win.webContents.on('unresponsive', () => logLine('janela', 'parou de responder'));
  win.webContents.on('responsive', () => logLine('janela', 'voltou a responder'));
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
    if (u.host === 'projecionista' && p.startsWith('/media/')) return serveMedia(req, p.slice(7));
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
  ipcMain.on('log', (_e, kind, msg) => logLine('janela:' + String(kind).slice(0, 20), msg));
  ipcMain.handle('log:show', () => { try { fs.appendFileSync(LOG_FILE(), ''); } catch { } shell.showItemInFolder(LOG_FILE()); return LOG_FILE(); });
  ipcMain.handle('log:lastCrash', () => { let c = lastCrash; lastCrash = ''; try { const f = RECOVER_FILE(); if (fs.existsSync(f)) { c = c || fs.readFileSync(f, 'utf8'); fs.unlinkSync(f); } } catch { } return c; });
  ipcMain.handle('log:path', () => LOG_FILE());
  ipcMain.handle('env:test', () => !!process.env.PROJ_TEST);
  ipcMain.handle('app:relaunch', () => { try { fs.writeFileSync(RECOVER_FILE(), 'a placa de vídeo não voltou'); } catch { } app.relaunch(); app.exit(0); });
  logLine('abriu', 'Projecionista ' + app.getVersion() + ' · Electron ' + process.versions.electron + ' · ' + process.platform + ' ' + process.arch + (app.isPackaged ? ' · instalado' : ' · desenvolvimento'));
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
  // disco: pastas, preferências, composições e gravações
  ipcMain.handle('fs:roots', () => roots());
  ipcMain.handle('fs:list', (_e, dir) => listDir(String(dir)));
  ipcMain.handle('prefs:get', () => { try { return JSON.parse(fs.readFileSync(PREFS_FILE(), 'utf8')); } catch { return {}; } });
  ipcMain.handle('prefs:set', (_e, p) => { fs.writeFileSync(PREFS_FILE(), JSON.stringify(p || {})); return true; });
  ipcMain.handle('comps:list', () => {
    try { return fs.readdirSync(COMP_DIR()).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => { const full = path.join(COMP_DIR(), f); let layers = 0; try { layers = (JSON.parse(fs.readFileSync(full, 'utf8')).layers || []).length; } catch { } return { name: f.slice(0, -5), mtime: fs.statSync(full).mtimeMs, layers }; }).sort((a, b) => b.mtime - a.mtime); } catch { return []; }
  });
  ipcMain.handle('comps:load', (_e, name) => fs.readFileSync(path.join(COMP_DIR(), safeName(name) + '.json'), 'utf8'));
  ipcMain.handle('comps:save', (_e, name, json) => { if (typeof json !== 'string' || json.length > 50e6) throw new Error('composição inválida'); fs.mkdirSync(COMP_DIR(), { recursive: true }); fs.writeFileSync(path.join(COMP_DIR(), safeName(name) + '.json'), json); return true; });
  ipcMain.handle('comps:remove', (_e, name) => { try { fs.unlinkSync(path.join(COMP_DIR(), safeName(name) + '.json')); } catch { } return true; });
  ipcMain.handle('rec:save', (_e, name, bytes, dir) => { const d = REC_DIR(dir); fs.mkdirSync(d, { recursive: true }); const full = path.join(d, safeName(name)); fs.writeFileSync(full, Buffer.from(bytes)); return { name: safeName(name), path: full, size: fs.statSync(full).size }; });
  ipcMain.handle('rec:list', (_e, dir) => { const d = REC_DIR(dir); try { return fs.readdirSync(d).filter(f => f.endsWith('.webm')).map(f => ({ name: f, path: path.join(d, f), size: fs.statSync(path.join(d, f)).size })); } catch { return []; } });
  ipcMain.handle('rec:show', (_e, p) => { shell.showItemInFolder(String(p)); return true; });
  ipcMain.handle('media:prepare', (e, src, fmt) => prepareMedia(String(src), fmt, (f) => { if (!e.sender.isDestroyed()) e.sender.send('media:progress', { src, f }); }));
  ipcMain.handle('media:read', (_e, p) => { const b = fs.readFileSync(String(p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
  // um trecho do arquivo: o reprodutor próprio lê o cabeçalho em pedaços e depois só os quadros que vai mostrar
  ipcMain.handle('media:readRange', (_e, p, off, len) => {
    off = Math.max(0, Number(off) || 0); len = Math.max(0, Math.min(64 * 1024 * 1024, Number(len) || 0));
    const fd = fs.openSync(String(p), 'r');
    try { const size = fs.fstatSync(fd).size; len = Math.max(0, Math.min(len, size - off)); const b = Buffer.alloc(len); let got = 0; while (got < len) { const n = fs.readSync(fd, b, got, len - got, off + got); if (!n) break; got += n; } return { size, data: b.buffer.slice(b.byteOffset, b.byteOffset + got) }; }
    finally { fs.closeSync(fd); }
  });

  // laser: um LaserCube por vez, controlado pela janela principal
  const laser = new LaserCube();
  ipcMain.handle('laser:discover', () => laser.discover());
  ipcMain.handle('laser:connect', (_e, ip) => laser.connect(String(ip)));
  ipcMain.handle('laser:disconnect', () => { laser.disconnect(); return true; });
  ipcMain.handle('laser:output', (_e, on) => { laser.setOutput(!!on); return true; });
  ipcMain.handle('laser:rate', (_e, r) => { laser.setRate(r | 0); return true; });
  ipcMain.handle('laser:fill', (_e, f) => { laser.setFill(+f); return true; });
  ipcMain.handle('laser:status', () => laser.status());
  ipcMain.on('laser:frame', (_e, buf) => { laser.setFrame(new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2)); });
  app.on('before-quit', () => laser.disconnect());

  const win = createMain();
  laser.on('status', (s) => { if (!win.isDestroyed()) win.webContents.send('laser:status', s); });
  laser.on('error', (m) => { if (!win.isDestroyed()) win.webContents.send('laser:error', m); });
  if (process.env.PROJ_TEST) require('./tools/selftest-main.js')(win, app, laser);
});

app.on('window-all-closed', () => app.quit());
