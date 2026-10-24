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

// Supabase URL and key from the setup screen, kept in the app's data folder so
// they survive updates.
const configFile = () => path.join(app.getPath('userData'), 'config.json');
ipcMain.on('config-get', (e) => {
  try { e.returnValue = JSON.parse(fs.readFileSync(configFile(), 'utf8')); } catch { e.returnValue = null; }
});
ipcMain.handle('config-set', (_e, cfg) => {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify({ url: String(cfg.url), key: String(cfg.key) }, null, 2), 'utf8');
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
