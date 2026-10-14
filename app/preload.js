// Ponte entre a janela de controle e o processo principal: só o que a página precisa e
// o navegador não dá — a lista de monitores e os presets de saída gravados em disco.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('projDesktop', {
  displays: () => ipcRenderer.invoke('displays'),
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    load: (name) => ipcRenderer.invoke('presets:load', name),
    save: (name, json) => ipcRenderer.invoke('presets:save', name, json),
    remove: (name) => ipcRenderer.invoke('presets:remove', name),
  },
});
