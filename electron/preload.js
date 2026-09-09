const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // You can add IPC channels here to communicate between Next.js UI and Electron
  // send: (channel, data) => ipcRenderer.send(channel, data),
  // on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
