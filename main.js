const { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 820,
    minHeight: 600,
    center: true,
    title: 'Salarium',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#f5f5f7',
    ...(isMac ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 22 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);

  // External links open in the default browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

ipcMain.on('app-info', (e) => {
  e.returnValue = { version: app.getVersion(), platform: process.platform };
});

ipcMain.on('set-theme', (_e, mode) => {
  if (['system', 'light', 'dark'].includes(mode)) nativeTheme.themeSource = mode;
});

ipcMain.handle('export-data', async (_e, jsonStr) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: 'salarium-backup-' + new Date().toISOString().slice(0, 10) + '.json',
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
