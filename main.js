const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 720,
    minWidth: 760,
    minHeight: 600,
    center: true,
    title: 'Salarium',
    backgroundColor: '#151517',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

ipcMain.handle('export-data', async (_e, jsonStr) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: 'salarium-backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, jsonStr, 'utf8');
  return true;
});

ipcMain.handle('import-data', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  return fs.readFileSync(filePaths[0], 'utf8');
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
