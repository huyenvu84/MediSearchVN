const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true, // Hide the default menu bar
  });

  // Check if we are in development mode
  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev, load from the Vite dev server
    win.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    // win.webContents.openDevTools();
  } else {
    // In production, load the built html file
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});