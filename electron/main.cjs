const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Must be false when contextIsolation is true
      contextIsolation: true, // Required for contextBridge
      sandbox: false, // Disabled for development
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Force load Vite dev server
  mainWindow.loadURL('http://localhost:5173');
  // mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Clean up temp directory on start
  const tempPath = path.join(app.getPath('temp'), 'wordmaster-apkg-temp');
  if (fs.existsSync(tempPath)) {
    try {
      fs.rmSync(tempPath, { recursive: true, force: true });
    } catch (e) {
      console.warn('Could not clean temp directory:', e);
    }
  }

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

// IPC Handlers
ipcMain.handle('select-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Anki Package', extensions: ['apkg'] },
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();

    // File size check
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (ext === '.csv') {
      if (fileSizeMB > 50) {
        throw new Error(`CSV 檔案過大 (${fileSizeMB.toFixed(2)}MB)，請使用小於 50MB 的檔案`);
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return { path: filePath, type: 'csv', content };
    } else if (ext === '.apkg') {
      if (fileSizeMB > 500) {
        throw new Error(`APKG 檔案過大 (${fileSizeMB.toFixed(2)}MB)，請使用小於 500MB 的檔案`);
      }
      return { path: filePath, type: 'apkg' };
    }

    throw new Error('不支援的檔案格式，請選擇 .csv 或 .apkg 檔案');

  } catch (error) {
    console.error('File selection error:', error);
    throw error;
  }
});

// Extract .apkg file with proper error handling and memory management
ipcMain.handle('extract-apkg', async (event, apkgPath) => {
  const AdmZip = require('adm-zip');

  try {
    // File size check (500MB limit)
    const stats = fs.statSync(apkgPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > 500) {
      throw new Error(`檔案太大 (${fileSizeMB.toFixed(2)}MB)，請使用小於 500MB 的檔案`);
    }

    const zip = new AdmZip(apkgPath);
    // Use consistent temp path: ../public/temp/apkg_extract
    const extractRootDir = path.join(__dirname, '../public/temp');
    const extractPath = path.join(extractRootDir, 'apkg_extract');

    // Fix ENOTDIR: Ensure parent directory exists (recursive)
    if (!fs.existsSync(extractRootDir)) {
      fs.mkdirSync(extractRootDir, { recursive: true });
    }

    // Clean up previous extract
    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }

    // Create extract directory
    fs.mkdirSync(extractPath, { recursive: true });

    // Extract all files
    zip.extractAllTo(extractPath, true);

    // Read collection.anki2 or collection.anki21
    let dbPath = path.join(extractPath, 'collection.anki2');
    if (!fs.existsSync(dbPath)) {
      dbPath = path.join(extractPath, 'collection.anki21');
    }

    let dbBuffer = null;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      // Convert to array in chunks to avoid memory issues
      const chunkSize = 1024 * 1024; // 1MB chunks
      const result = [];
      for (let i = 0; i < fileBuffer.length; i += chunkSize) {
        const chunk = fileBuffer.slice(i, Math.min(i + chunkSize, fileBuffer.length));
        result.push(...Array.from(chunk));
      }
      dbBuffer = result;
    }

    // Get media files from media JSON mapping
    const mediaFiles = [];
    const mediaJsonPath = path.join(extractPath, 'media');

    if (fs.existsSync(mediaJsonPath) && fs.statSync(mediaJsonPath).isFile()) {
      try {
        // Read media mapping JSON
        const mediaMapping = JSON.parse(fs.readFileSync(mediaJsonPath, 'utf-8'));
        Object.entries(mediaMapping).forEach(([key, filename]) => {
          const mediaFilePath = path.join(extractPath, key);
          if (fs.existsSync(mediaFilePath)) {
            mediaFiles.push({
              name: filename,
              path: mediaFilePath
            });
          }
        });
      } catch (e) {
        console.warn('Could not parse media JSON:', e);
      }
    }

    // Also check for direct media files in extract directory
    const allFiles = fs.readdirSync(extractPath);
    allFiles.forEach(file => {
      const filePath = path.join(extractPath, file);
      const stat = fs.statSync(filePath);

      // If it's a media file (not db, not media json)
      if (stat.isFile() && !file.endsWith('.anki2') && !file.endsWith('.anki21') && file !== 'media') {
        const ext = path.extname(file).toLowerCase();
        if (['.mp3', '.wav', '.ogg', '.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) {
          // Avoid duplicates
          if (!mediaFiles.some(m => m.name === file)) {
            mediaFiles.push({
              name: file,
              path: filePath
            });
          }
        }
      }
    });

    return {
      dbBuffer,
      mediaFiles,
      extractPath
    };
  } catch (error) {
    console.error('Extract error:', error);
    throw new Error(`解壓失敗: ${error.message}`);
  }
});

// Copy media file to deck folder
ipcMain.handle('copy-media', async (event, sourcePath, deckId, filename) => {
  try {
    const targetDir = path.join(__dirname, '../public/media', deckId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);
    fs.copyFileSync(sourcePath, targetPath);
    return true;
  } catch (error) {
    console.error('Copy media error:', error);
    return false;
  }
});

ipcMain.handle('save-file', async (event, data, filename) => {
  const result = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (result.canceled) return false;

  try {
    fs.writeFileSync(result.filePath, data, 'utf-8');
    return true;
  } catch (error) {
    console.error('Save error:', error);
    return false;
  }
});
