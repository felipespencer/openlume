// OpenLume — processo principal (Electron).
// Serve a pasta app/ por um esquema próprio (app://projecionista/), abre a janela de controle
// e põe cada janela de saída no monitor que a tela pede.
const { app, crashReporter, BrowserWindow, Menu, protocol, net, session, screen, ipcMain, shell, desktopCapturer, utilityProcess, MessageChannelMain } = require('electron');
let fechando = false;   // a página já confirmou o fechamento (ou o app está saindo): o X fecha de verdade
const { Readable } = require('node:stream');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { LaserCube } = require('./lasercube.js');

// ---------- registro de travamentos ----------
// Tudo que derruba o programa vai para openlume.log na pasta de dados (menu OpenLume →
// Abrir o registro): erros do processo principal, janela que caiu (com o motivo do Chromium),
// processo de GPU que caiu, e os erros que a própria janela manda. Os minidumps ficam em crashDumps.
const LOG_FILE = () => path.join(app.getPath('userData'), 'openlume.log');
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
const REC_DIR = (dir) => dir || path.join(app.getPath('videos'), 'OpenLume');
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
// janela da fonte "Página web" fica fora de todos os monitores: sem isto o Windows a dá como invisível e o Chromium para de desenhar nela
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
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
    backgroundColor: '#1b1c1f', title: 'OpenLume', autoHideMenuBar: true,
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
  const outWins = new Set();  // todas as janelas de saída abertas (para o botão "Mostrar saídas" trazê-las para a frente)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(ORIGIN + '/output.html')) return { action: 'deny' };
    const q = new URL(url).searchParams, want = q.get('display') || 'auto';
    const main = screen.getDisplayMatching(win.getBounds());
    let ext = null;
    if (want === 'auto') ext = screen.getAllDisplays().find(d => d.id !== main.id && !taken.has(d.id)) || null;
    else if (want !== 'window') ext = screen.getAllDisplays().find(d => String(d.id) === want) || null;
    const base = { backgroundColor: '#000000', title: 'OpenLume — saída', autoHideMenuBar: true, webPreferences: PREFS };
    const opts = ext
      ? { ...base, x: ext.bounds.x, y: ext.bounds.y, width: ext.bounds.width, height: ext.bounds.height, fullscreen: true, frame: false }
      : { ...base, width: 960, height: 540 };
    return { action: 'allow', overrideBrowserWindowOptions: opts };
  });
  win.webContents.on('did-create-window', (child, { options }) => {
    outWins.add(child); child.on('closed', () => outWins.delete(child));
    if (!options.fullscreen) return;
    const d = screen.getDisplayMatching({ x: options.x, y: options.y, width: options.width, height: options.height });
    taken.set(d.id, child); child.on('closed', () => { if (taken.get(d.id) === child) taken.delete(d.id); });
  });
  // "Mostrar saídas": traz as janelas de saída para a frente sem tirar o foco do controle (window.focus() da página não consegue)
  ipcMain.handle('outputs:show', () => {
    let n = 0;
    for (const w of outWins) { if (w.isDestroyed()) continue; if (w.isMinimized()) w.restore(); w.showInactive(); w.moveTop(); n++; }
    return n;
  });
  win.webContents.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F5') { win.webContents.reloadIgnoringCache(); ev.preventDefault(); }
    else if (input.key === 'F12') { win.webContents.toggleDevTools(); ev.preventDefault(); }
  });
  // o X da janela de controle não fecha na hora: a página pergunta "salvar e fechar / fechar sem salvar / cancelar"
  // (como o Resolume) e só então pede app:quit. No teste automático e ao sair pelo app.quit() o fechamento é direto.
  win.on('close', (e) => { if (fechando || process.env.PROJ_TEST) return; e.preventDefault(); win.webContents.send('app:closeRequested'); });
  ipcMain.handle('app:quit', () => { fechando = true; win.close(); });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged }));
  win.on('closed', () => app.quit());      // fechar o controle fecha as saídas junto
  win.loadURL(ORIGIN + '/index.html');
  return win;
}

app.whenReady().then(async () => {
  // Isolamento de origem (COOP/COEP): libera SharedArrayBuffer, e com ele o WebAssembly com várias threads (segmentação
  // de pessoa 3-4× mais rápida). 'credentialless' deixa carregar imagem/vídeo de outros sites, só sem cookies.
  const withIsolation = (r) => { const h = new Headers(r.headers); h.set('Cross-Origin-Opener-Policy', 'same-origin'); h.set('Cross-Origin-Embedder-Policy', 'credentialless'); h.set('Cross-Origin-Resource-Policy', 'same-origin'); return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h }); };
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    if (u.host === 'projecionista' && p.startsWith('/media/')) return serveMedia(req, p.slice(7));
    const file = path.join(APP_DIR, p);
    if (u.host !== 'projecionista' || !ALLOWED.test(p) || !file.startsWith(APP_DIR) || !fs.existsSync(file))
      return new Response('não encontrado', { status: 404 });
    // o isolamento só na janela de controle (index.html e o que ela carrega); páginas escondidas (yt.html) embutem iframes de outros sites, e o COEP os bloquearia
    return net.fetch(pathToFileURL(file).toString()).then(r => p === '/yt.html' ? r : withIsolation(r));
  });
  const OK = new Set(['media', 'midi', 'midiSysex', 'fullscreen', 'window-management']);
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(OK.has(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => OK.has(perm));
  Menu.setApplicationMenu(null);
  // cada abertura começa limpa: a versão do disco é sempre a que roda
  try { await session.defaultSession.clearCache(); } catch {}

  // Servidor HTTP local (só 127.0.0.1): o YouTube embutido exige um referer http(s) (erro 153 sem ele), então a página yt.html é
  // servida daqui em vez do app://. Porta escolhida pelo sistema; a página pergunta por local:port.
  const http = require('http');
  const LOCAL_PAGES = new Set(['/yt.html', '/celular.html']);
  const localSrv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1'); const p = u.pathname;
    if (!LOCAL_PAGES.has(p)) { res.writeHead(404); res.end('não encontrado'); return; }
    fs.readFile(path.join(APP_DIR, p), (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(data); });
  });
  let localPort = 0;
  localSrv.on('error', (e) => logLine('erro', 'servidor local: ' + (e.message || e)));
  localSrv.listen(0, '127.0.0.1', () => { localPort = localSrv.address().port; });
  ipcMain.handle('local:port', () => localPort);
  // Celular como fonte: a página /celular (https na rede local, certificado próprio) manda a câmera por WebRTC para a janela.
  // Sinalização mínima: o celular faz POST /celular/oferta com a oferta SDP e fica esperando a resposta; a janela responde por phone:answer.
  const https = require('https'); const os = require('os');
  const certFile = path.join(app.getPath('userData'), 'celular-cert.json'); let cert = null;
  try { cert = JSON.parse(fs.readFileSync(certFile, 'utf8')); } catch { }
  const lanIps = () => { const r = []; for (const l of Object.values(os.networkInterfaces())) for (const a of l) if (a.family === 'IPv4' && !a.internal) r.push(a.address); return r; };
  if (!cert || !cert.ips || JSON.stringify(cert.ips) !== JSON.stringify(lanIps())) {
    try { const sg = require('selfsigned'); const ips = lanIps(); const p = sg.generate([{ name: 'commonName', value: 'OpenLume' }], { days: 3650, keySize: 2048, extensions: [{ name: 'subjectAltName', altNames: [...ips, '127.0.0.1'].map(ip => ({ type: 7, ip })) }] }); cert = { key: p.private, cert: p.cert, ips }; fs.writeFileSync(certFile, JSON.stringify(cert)); } catch (e) { logLine('erro', 'certificado do celular: ' + (e.message || e)); }
  }
  const phoneOffers = new Map(); let phoneSeq = 0, phonePort = 0;
  if (cert) {
    const phoneSrv = https.createServer({ key: cert.key, cert: cert.cert }, (req, res) => {
      const u = new URL(req.url, 'https://x'); const p = u.pathname;
      if (req.method === 'GET' && (p === '/' || p === '/celular')) { fs.readFile(path.join(APP_DIR, 'celular.html'), (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(data); }); return; }
      if (req.method === 'POST' && p === '/celular/oferta') {
        let body = ''; req.on('data', (d) => { body += d; if (body.length > 200000) req.destroy(); });
        req.on('end', () => {
          let o; try { o = JSON.parse(body); } catch { res.writeHead(400); res.end('{}'); return; }
          const id = ++phoneSeq; phoneOffers.set(id, res); res.setTimeout(30000, () => { if (phoneOffers.delete(id)) { res.writeHead(504, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ erro: 'o OpenLume não respondeu' })); } });
          for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && w.webContents.getURL().includes('index.html')) w.webContents.send('phone:offer', { id, sdp: String(o.sdp || ''), nome: String(o.nome || 'Celular'), ip: req.socket.remoteAddress });
        }); return;
      }
      res.writeHead(404); res.end('não encontrado');
    });
    phoneSrv.on('error', (e) => logLine('erro', 'servidor do celular: ' + (e.message || e)));
    phoneSrv.listen(0, '0.0.0.0', () => { phonePort = phoneSrv.address().port; });
  }
  // o certificado é nosso: janelas do próprio programa (teste automático) podem abrir a página do celular sem reclamar
  app.on('certificate-error', (ev, _wc, url, _err, _c, cb) => { let ok = false; try { const u = new URL(url); ok = phonePort && +u.port === phonePort && (u.hostname === '127.0.0.1' || lanIps().includes(u.hostname)); } catch { } ev.preventDefault(); cb(ok); });
  ipcMain.handle('phone:info', () => ({ port: phonePort, ips: lanIps(), urls: lanIps().map(ip => 'https://' + ip + ':' + phonePort + '/celular') }));
  ipcMain.handle('phone:answer', (_e, id, sdp, erro) => { const res = phoneOffers.get(id); if (!res) return false; phoneOffers.delete(id); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(sdp ? { sdp } : { erro: erro || 'recusado' })); return true; });
  ipcMain.handle('displays', () => displayList());
  // ---------- fonte "Captura": telas, janelas e páginas web ----------
  // a imagem chega à janela de controle por getUserMedia com chromeMediaSourceId (captura do Chromium)
  const webPages = new Map();   // chave -> janela escondida que renderiza uma página; o conteúdo é capturado como "aba", sem a janela aparecer
  ipcMain.handle('capture:sources', async () => {
    const pages = new Set([...webPages.values()]);
    const own = new Set(BrowserWindow.getAllWindows().filter(w => !pages.has(w)).map(w => { try { return w.getMediaSourceId(); } catch { return ''; } }));
    const list = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 192, height: 108 }, fetchWindowIcons: false });
    return list.filter(s => !own.has(s.id) && s.name).map(s => ({ id: s.id, name: s.name, kind: s.id.startsWith('screen') ? 'screen' : 'window', thumb: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : '' }));
  });
  ipcMain.handle('capture:web:open', async (e, key, url, w, h, opts) => {   // opts: só para depurar (opções extras da janela; opts.wp vai em webPreferences)
    key = String(key); w = Math.max(16, w | 0 || 1920); h = Math.max(16, h | 0 || 1080);
    let win = webPages.get(key);
    if (!win || win.isDestroyed()) {
      // a janela precisa estar num monitor para o Windows compor o conteúdo (fora da tela sai branca): fica no canto do monitor principal,
      // invisível (opacidade 0), sem foco, sem receber cliques e fora da barra de tarefas
      const o = opts && typeof opts === 'object' ? opts : {};
      win = new BrowserWindow({ show: true, x: 0, y: 0, width: w, height: h, frame: false, skipTaskbar: true, focusable: false, resizable: false, movable: false, opacity: 0, ...o, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required', ...(o.wp || {}) } });
      win.setIgnoreMouseEvents(true); win.setOpacity(process.env.PROJ_WEB_OPACITY != null ? +process.env.PROJ_WEB_OPACITY : 0);   // PROJ_WEB_OPACITY: só para depurar a captura
      win.webContents.setAudioMuted(true);
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.setTitle('OpenLume · página ' + key);
      win.webContents.on('did-fail-load', (_e, code, desc, u) => { win.__err = code + ' ' + desc + ' ' + String(u).slice(0, 40); });
      win.webContents.on('render-process-gone', (_e, d) => { win.__err = 'renderer: ' + d.reason; });
      webPages.set(key, win);
    }
    win.setContentSize(w, h); win.setPosition(0, 0);
    // espera a página carregar (uns 4 s por janela nesta máquina) para a captura não começar numa janela vazia; desiste em 20 s
    await Promise.race([win.loadURL(String(url)).catch(() => { }), new Promise(r => setTimeout(r, 20000))]);
    // a captura é da JANELA (Windows Graphics Capture pega janela fora da tela); a captura de conteúdo (webContents) não inicia no Electron 33
    return win.getMediaSourceId();
  });
  // o caminho oficial do Chromium: a janela de controle pede getDisplayMedia e este tratador entrega a fonte escolhida
  // (getUserMedia com chromeMediaSourceId de uma página derruba o processo principal: NOTREACHED)
  let nextPick = null;   // { key } (página escondida) ou { srcId } (tela/janela), escolhido logo antes do pedido
  ipcMain.handle('capture:pick', (_e, pick) => { nextPick = pick && typeof pick === 'object' ? pick : null; return true; });
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const pick = nextPick; nextPick = null;
    try {
      // página: a janela fora da tela não entra na lista do desktopCapturer; vai direto pelo id da janela
      if (pick && pick.key) { const w = webPages.get(String(pick.key)); if (w && !w.isDestroyed()) return callback({ video: { id: w.getMediaSourceId(), name: w.getTitle() } }); }
      const list = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
      const s = (pick && pick.srcId && list.find(x => x.id === pick.srcId)) || list.find(x => x.id.startsWith('screen'));
      callback(s ? { video: s } : {});
    } catch { callback({}); }
  }, { useSystemPicker: false });
  // retrato da página pelo próprio Chromium (depuração e reserva, caso a captura da janela falhe)
  ipcMain.handle('capture:web:shot', async (_e, key) => { const w = webPages.get(String(key)); if (!w || w.isDestroyed()) return ''; const im = await w.webContents.capturePage(); return im.resize({ width: 480 }).toDataURL(); });
  ipcMain.handle('capture:web:info', (_e, key) => { const w = webPages.get(String(key)); if (!w || w.isDestroyed()) return null; const wc = w.webContents; return { url: wc.getURL().slice(0, 60), loading: wc.isLoading(), crashed: wc.isCrashed(), bounds: w.getBounds(), visible: w.isVisible(), minimized: w.isMinimized(), title: w.getTitle(), fps: wc.getFrameRate && wc.getFrameRate(), err: w.__err || '' }; });
  ipcMain.handle('capture:web:close', (_e, key) => { const w = webPages.get(String(key)); if (w && !w.isDestroyed()) w.destroy(); webPages.delete(String(key)); return true; });
  ipcMain.on('log', (_e, kind, msg) => logLine('janela:' + String(kind).slice(0, 20), msg));
  ipcMain.handle('log:show', () => { try { fs.appendFileSync(LOG_FILE(), ''); } catch { } shell.showItemInFolder(LOG_FILE()); return LOG_FILE(); });
  ipcMain.handle('log:lastCrash', () => { let c = lastCrash; lastCrash = ''; try { const f = RECOVER_FILE(); if (fs.existsSync(f)) { c = c || fs.readFileSync(f, 'utf8'); fs.unlinkSync(f); } } catch { } return c; });
  ipcMain.handle('log:path', () => LOG_FILE());
  ipcMain.handle('env:test', () => !!process.env.PROJ_TEST);
  ipcMain.handle('app:relaunch', () => { try { fs.writeFileSync(RECOVER_FILE(), 'a placa de vídeo não voltou'); } catch { } app.relaunch(); app.exit(0); });
  logLine('abriu', 'OpenLume ' + app.getVersion() + ' · Electron ' + process.versions.electron + ' · ' + process.platform + ' ' + process.arch + (app.isPackaged ? ' · instalado' : ' · desenvolvimento'));
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
  // com a saida ligada, a cada 10 s o registro ganha as estatisticas do fluxo de pontos (para achar a causa de piscadas)
  setInterval(() => { try { if (laser.outputOn && laser.ip) { const s = laser.stats; logLine('laser', JSON.stringify({ quadros: s.frames, maiorPausaQuadroMs: s.maxGapMs, quadroApagado: s.blankPumps, bufferVazio: s.underruns, errosPacote: s.errMax, bufLivreMin: s.minFree, pacotes: s.pktsSent, pps: laser.rate, preenchimento: laser.fill })); laser.resetStats(); } } catch { } }, 10000);
  ipcMain.handle('laser:discover', () => laser.discover());
  ipcMain.handle('laser:connect', (_e, ip) => laser.connect(String(ip)));
  ipcMain.handle('laser:disconnect', () => { laser.disconnect(); return true; });
  ipcMain.handle('laser:output', (_e, on) => { laser.setOutput(!!on); return true; });
  ipcMain.handle('laser:rate', (_e, r) => { laser.setRate(r | 0); return true; });
  ipcMain.handle('laser:fill', (_e, f) => { laser.setFill(+f); return true; });
  ipcMain.handle('laser:status', () => laser.status());
  ipcMain.on('laser:frame', (_e, buf) => { laser.setFrame(new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2)); });
  app.on('before-quit', () => { fechando = true; laser.disconnect(); });

  const win = createMain();
  // Background Removal nativo: um utilityProcess roda os modelos no onnxruntime-node com DirectML (como o Resolume);
  // a janela pede a porta (seg:port) e fala direto com ele, sem passar pelo processo principal
  let segProc = null;
  ipcMain.on('seg:port', (e) => {
    try {
      if (!segProc) { segProc = utilityProcess.fork(path.join(__dirname, 'app', 'seg-native.js'), [], { serviceName: 'OpenLume segmentação' }); segProc.on('exit', () => { segProc = null; }); }
      const { port1, port2 } = new MessageChannelMain();
      segProc.postMessage({ type: 'port' }, [port1]);
      e.sender.postMessage('seg:port', null, [port2]);
    } catch (err) { logLine('erro', 'seg nativo: ' + (err.message || err)); }
  });
  laser.on('status', (s) => { if (!win.isDestroyed()) win.webContents.send('laser:status', s); });
  laser.on('error', (m) => { if (!win.isDestroyed()) win.webContents.send('laser:error', m); });
  if (process.env.PROJ_TEST) require('./tools/selftest-main.js')(win, app, laser);
});

app.on('window-all-closed', () => app.quit());
