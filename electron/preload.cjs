const { contextBridge, ipcRenderer } = require('electron');

try {
    contextBridge.exposeInMainWorld('electronAPI', {
        selectFile: () => ipcRenderer.invoke('select-file'),
        saveFile: (data, filename) => ipcRenderer.invoke('save-file', data, filename),
        extractApkg: (apkgPath, targetDir) => ipcRenderer.invoke('extract-apkg', apkgPath, targetDir),
        copyMedia: (sourcePath, deckId, filename) => ipcRenderer.invoke('copy-media', sourcePath, deckId, filename)
    });
    console.log('Electron API exposed successfully');
} catch (error) {
    console.error('Failed to expose electronAPI:', error);
}
