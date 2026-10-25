// Ponte entre a janela de controle e o processo principal: só o que a página precisa e
// o navegador não dá — monitores, disco (pastas, presets, composições, gravações) e o LaserCube.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('projDesktop', {
  displays: () => ipcRenderer.invoke('displays'),
  isTest: () => ipcRenderer.invoke('env:test'),
  log: { write: (kind, msg) => ipcRenderer.send('log', kind, msg), show: () => ipcRenderer.invoke('log:show'), lastCrash: () => ipcRenderer.invoke('log:lastCrash'), path: () => ipcRenderer.invoke('log:path'), relaunch: () => ipcRenderer.invoke('app:relaunch') },
  windows: () => ipcRenderer.invoke('windows'),
  // caminho no disco de um arquivo solto na janela (para salvar a composição por caminho)
  pathOf: (file) => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
  fs: { roots: () => ipcRenderer.invoke('fs:roots'), list: (dir) => ipcRenderer.invoke('fs:list', dir) },
  prefs: { get: () => ipcRenderer.invoke('prefs:get'), set: (p) => ipcRenderer.invoke('prefs:set', p) },
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    load: (name) => ipcRenderer.invoke('presets:load', name),
    save: (name, json) => ipcRenderer.invoke('presets:save', name, json),
    remove: (name) => ipcRenderer.invoke('presets:remove', name),
  },
  comps: {
    list: () => ipcRenderer.invoke('comps:list'),
    load: (name) => ipcRenderer.invoke('comps:load', name),
    save: (name, json) => ipcRenderer.invoke('comps:save', name, json),
    remove: (name) => ipcRenderer.invoke('comps:remove', name),
  },
  media: {
    prepare: (src, fmt) => ipcRenderer.invoke('media:prepare', src, fmt),
    onProgress: (fn) => ipcRenderer.on('media:progress', (_e, p) => fn(p)),
    read: (p) => ipcRenderer.invoke('media:read', p),
    readRange: (p, off, len) => ipcRenderer.invoke('media:readRange', p, off, len),
  },
  capture: {
    sources: () => ipcRenderer.invoke('capture:sources'),
    webOpen: (key, url, w, h, opts) => ipcRenderer.invoke('capture:web:open', key, url, w, h, opts),
    webClose: (key) => ipcRenderer.invoke('capture:web:close', key),
    pick: (p) => ipcRenderer.invoke('capture:pick', p),
    webShot: (key) => ipcRenderer.invoke('capture:web:shot', key),
    webInfo: (key) => ipcRenderer.invoke('capture:web:info', key),
  },
  rec: {
    save: (name, bytes, dir) => ipcRenderer.invoke('rec:save', name, bytes, dir),
    list: (dir) => ipcRenderer.invoke('rec:list', dir),
    show: (path) => ipcRenderer.invoke('rec:show', path),
  },
});
contextBridge.exposeInMainWorld('projLaser', {
  discover: () => ipcRenderer.invoke('laser:discover'),
  connect: (ip) => ipcRenderer.invoke('laser:connect', ip),
  disconnect: () => ipcRenderer.invoke('laser:disconnect'),
  output: (on) => ipcRenderer.invoke('laser:output', on),
  rate: (r) => ipcRenderer.invoke('laser:rate', r),
  fill: (f) => ipcRenderer.invoke('laser:fill', f),
  status: () => ipcRenderer.invoke('laser:status'),
  frame: (u16) => ipcRenderer.send('laser:frame', u16),
  onStatus: (fn) => { ipcRenderer.on('laser:status', (_e, s) => fn(s)); ipcRenderer.invoke('laser:status').then(fn); },
  onError: (fn) => ipcRenderer.on('laser:error', (_e, m) => fn(m)),
});
