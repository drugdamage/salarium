const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  info: ipcRenderer.sendSync('app-info'),
  setTheme: (mode) => ipcRenderer.send('set-theme', mode),
  exportData: (jsonStr) => ipcRenderer.invoke('export-data', jsonStr),
  importData: () => ipcRenderer.invoke('import-data'),
});
