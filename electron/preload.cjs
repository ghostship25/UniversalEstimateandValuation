const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  
  // Save buffer to temporary file and launch MS Excel / LibreOffice / OnlyOffice
  saveAndOpenXlsx: (fileName, buffer) => {
    return ipcRenderer.invoke('desktop:save-and-open-xlsx', { fileName, buffer });
  },

  // Open existing local file in MS Excel / LibreOffice
  openInOffice: (filePath) => {
    return ipcRenderer.invoke('desktop:open-in-office', filePath);
  },

  // Start file watcher for live sync when file is edited & saved in Excel
  startWatchingXlsx: (filePath) => {
    return ipcRenderer.invoke('desktop:watch-xlsx', filePath);
  },

  // Stop file watcher
  stopWatchingXlsx: () => {
    return ipcRenderer.invoke('desktop:stop-watch-xlsx');
  },

  // Select local Excel / CSV file via native OS dialog
  selectFile: () => {
    return ipcRenderer.invoke('desktop:select-file');
  },

  // Listener for live file change updates from Excel
  onXlsxUpdated: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('desktop:xlsx-updated', subscription);
    return () => {
      ipcRenderer.removeListener('desktop:xlsx-updated', subscription);
    };
  },

  // Windows COM / OLE Excel Automation Bridge
  initComAutomation: () => {
    return ipcRenderer.invoke('desktop:init-com');
  },
  readComCellData: (cellRef) => {
    return ipcRenderer.invoke('desktop:read-com-cell', cellRef);
  },
  writeComCellData: (data) => {
    return ipcRenderer.invoke('desktop:write-com-cell', data);
  }
});
