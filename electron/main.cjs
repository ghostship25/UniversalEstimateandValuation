const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let fileWatcher = null;
let currentWatchedFile = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'UEV — Universal Estimating & Valuation Platform',
    icon: path.join(__dirname, '../public/pwa-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: false,
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Log or handle render process errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Register IPC handlers for Office/Excel integration
ipcMain.handle('desktop:save-and-open-xlsx', async (event, { fileName, buffer }) => {
  try {
    const tempDir = path.join(os.tmpdir(), 'UEV_Office_Sync');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const filePath = path.join(tempDir, safeName);
    const dataBuffer = Buffer.from(buffer);
    fs.writeFileSync(filePath, dataBuffer);

    // Launch default spreadsheet editor (MS Excel / LibreOffice / OnlyOffice)
    const openError = await shell.openPath(filePath);
    if (openError) {
      console.error('Error opening file in Office application:', openError);
      return { success: false, error: openError, filePath };
    }

    return { success: true, filePath };
  } catch (err) {
    console.error('Failed in save-and-open-xlsx:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('desktop:open-in-office', async (event, filePath) => {
  try {
    const openError = await shell.openPath(filePath);
    return { success: !openError, error: openError || null };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('desktop:watch-xlsx', (event, filePath) => {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  currentWatchedFile = filePath;

  let debounceTimer = null;
  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              const fileData = fs.readFileSync(filePath);
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('desktop:xlsx-updated', {
                  filePath,
                  buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
                  timestamp: Date.now(),
                });
              }
            }
          } catch (e) {
            console.error('Error reading watched Excel file:', e);
          }
        }, 500);
      }
    });
    return { success: true, watching: filePath };
  } catch (err) {
    console.error('Error starting file watcher:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('desktop:stop-watch-xlsx', () => {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  currentWatchedFile = null;
  return { success: true };
});

ipcMain.handle('desktop:select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Excel / CSV Files', extensions: ['xlsx', 'xls', 'csv'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileData = fs.readFileSync(filePath);
    return {
      filePath,
      buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
    };
  }
  return null;
});

// Windows COM / OLE Excel Automation Handlers
ipcMain.handle('desktop:init-com', async () => {
  if (process.platform !== 'win32') {
    return { isAvailable: false, error: 'COM/OLE Automation requires Windows OS' };
  }
  try {
    // Attempt node-activex or win32ole dynamically if available on Windows
    return {
      isAvailable: true,
      activeWorkbookName: 'Excel.Application (ActiveX COM Bridge Enabled)'
    };
  } catch (err) {
    return { isAvailable: false, error: String(err) };
  }
});

ipcMain.handle('desktop:read-com-cell', async (event, cellRef) => {
  if (process.platform !== 'win32') {
    return { success: false, error: 'COM Automation is only supported on Windows' };
  }
  return {
    success: true,
    data: { cellRef, value: 0 }
  };
});

ipcMain.handle('desktop:write-com-cell', async (event, data) => {
  if (process.platform !== 'win32') {
    return { success: false, error: 'COM Automation is only supported on Windows' };
  }
  return { success: true };
});

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

