// Ponte entre a janela de controle e o processo principal: só o que a página precisa e
// o navegador não dá — monitores, presets de saída em disco e o LaserCube (UDP).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('projDesktop', {
  displays: () => ipcRenderer.invoke('displays'),
  windows: () => ipcRenderer.invoke('windows'),
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    load: (name) => ipcRenderer.invoke('presets:load', name),
    save: (name, json) => ipcRenderer.invoke('presets:save', name, json),
    remove: (name) => ipcRenderer.invoke('presets:remove', name),
  },
});
contextBridge.exposeInMainWorld('projLaser', {
  discover: () => ipcRenderer.invoke('laser:discover'),
  connect: (ip) => ipcRenderer.invoke('laser:connect', ip),
  disconnect: () => ipcRenderer.invoke('laser:disconnect'),
  output: (on) => ipcRenderer.invoke('laser:output', on),
  rate: (r) => ipcRenderer.invoke('laser:rate', r),
  status: () => ipcRenderer.invoke('laser:status'),
  frame: (u16) => ipcRenderer.send('laser:frame', u16),
  onStatus: (fn) => { ipcRenderer.on('laser:status', (_e, s) => fn(s)); ipcRenderer.invoke('laser:status').then(fn); },
  onError: (fn) => ipcRenderer.on('laser:error', (_e, m) => fn(m)),
});
