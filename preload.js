const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nativeFile', {
  exportData: (jsonStr) => ipcRenderer.invoke('export-data', jsonStr),
  importData: () => ipcRenderer.invoke('import-data'),
});
