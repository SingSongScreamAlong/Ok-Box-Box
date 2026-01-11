import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let relayProcess: ChildProcess | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
  stopRelay();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.handle('get-license', () => {
  return store.get('license', null);
});

ipcMain.handle('set-license', (_event, license) => {
  store.set('license', license);
  return true;
});

ipcMain.handle('get-settings', () => {
  return store.get('settings', {
    apiEndpoint: 'http://localhost:4000',
    autoStartRelay: true,
    modules: ['RACEBOX'],
  });
});

ipcMain.handle('set-settings', (_event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('validate-license', async (_event, { licenseKey, machineId }) => {
  const settings = store.get('settings', { apiEndpoint: 'http://localhost:4000' }) as { apiEndpoint: string };
  
  try {
    const response = await fetch(`${settings.apiEndpoint}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        machineId,
        version: app.getVersion(),
      }),
    });

    const data = await response.json();
    
    if (data.valid && data.relayToken) {
      store.set('relayToken', data.relayToken);
      store.set('license', data.license);
    }

    return data;
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
});

ipcMain.handle('start-relay', async () => {
  if (relayProcess) {
    return { success: true, message: 'Relay already running' };
  }

  const relayToken = store.get('relayToken') as string;
  const settings = store.get('settings', { apiEndpoint: 'http://localhost:4000' }) as { apiEndpoint: string };

  if (!relayToken) {
    return { success: false, error: 'No relay token. Please validate license first.' };
  }

  try {
    // Find Python and relay agent path
    const relayPath = join(app.getAppPath(), '../../relay/agent/agent.py');
    
    relayProcess = spawn('python', [relayPath, '--token', relayToken, '--api', settings.apiEndpoint], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    relayProcess.stdout?.on('data', (data) => {
      mainWindow?.webContents.send('relay-log', { level: 'info', message: data.toString() });
    });

    relayProcess.stderr?.on('data', (data) => {
      mainWindow?.webContents.send('relay-log', { level: 'error', message: data.toString() });
    });

    relayProcess.on('exit', (code) => {
      mainWindow?.webContents.send('relay-status', { running: false, exitCode: code });
      relayProcess = null;
    });

    return { success: true, message: 'Relay started' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to start relay' };
  }
});

ipcMain.handle('stop-relay', () => {
  return stopRelay();
});

ipcMain.handle('get-relay-status', () => {
  return { running: relayProcess !== null };
});

ipcMain.handle('open-app', (_event, appName: string) => {
  const settings = store.get('settings', { apiEndpoint: 'http://localhost:4000' }) as { apiEndpoint: string };
  const baseUrl = settings.apiEndpoint.replace(':4000', '');
  
  const appUrls: Record<string, string> = {
    racebox: `${baseUrl}:5173`,
    blackbox: `${baseUrl}:5174`,
    controlbox: `${baseUrl}:5175`,
  };

  const url = appUrls[appName.toLowerCase()];
  if (url) {
    shell.openExternal(url);
  }
});

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

function stopRelay(): { success: boolean } {
  if (relayProcess) {
    relayProcess.kill();
    relayProcess = null;
    return { success: true };
  }
  return { success: false };
}
