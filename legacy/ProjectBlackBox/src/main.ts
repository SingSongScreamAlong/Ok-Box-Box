import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfig } from './config/AppConfig';
import { PitBoxCore } from './core/PitBoxCore';
import { PythonRelayService } from './services/PythonRelayService';
import { v4 as uuidv4 } from 'uuid';

// Simple driver identification service
class DriverIdentificationService {
  private drivers: any[] = [];
  private currentDriver: any = null;

  getAllDrivers(): any[] {
    return this.drivers;
  }

  getCurrentDriver(): any {
    return this.currentDriver;
  }
}

// Simple data transmission service
class DataTransmissionService {
  private serverUrl: string = '';

  getServerUrl(): string {
    return this.serverUrl;
  }

  testConnection(url: string): Promise<any> {
    return Promise.resolve({ connected: true });
  }
}

// Initialize services
const driverIdentificationService = new DriverIdentificationService();
const dataTransmissionService = new DataTransmissionService();

// Add missing type declarations
declare const __dirname: string;

// Extend process type declaration
interface ProcessExtended {
  platform: string;
  env: Record<string, string>;
  versions: { electron: string; chrome: string; node: string; };
  argv: string[];
  arch: string;
  version: string;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// @ts-ignore
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Initialize services
// Load configuration
AppConfig.load();

// Initialize PitBoxCore
const blackBoxCore = PitBoxCore.getInstance();

// Initialize Python Relay Service for iRacing telemetry
const pythonRelayService = new PythonRelayService();
pythonRelayService.initialize(AppConfig.getServerUrl());

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: true, // Show window by default
    icon: path.join(__dirname, '../resources/icon.png'),
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '../resources/index.html'));

  // Hide window to tray on close
  mainWindow.on('close', (event: any) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
    return true;
  });
};

const createTrayIcon = (): void => {
  const iconPath = path.join(__dirname, '../assets/icons/tray-icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('PitBox Driver App');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Start Telemetry',
      click: () => blackBoxCore.startTelemetry()
    },
    {
      label: 'Stop Telemetry',
      click: () => blackBoxCore.stopTelemetry()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
};

const createTray = (): void => {
  try {
    // Try multiple possible paths for the tray icon
    const possibleIconPaths = [
      path.join(__dirname, '../resources/tray-icon.png'),
      path.join(app.getAppPath(), 'resources/tray-icon.png'),
      path.join(app.getPath('exe'), '../resources/tray-icon.png')
    ];

    let iconPath = '';

    // Find the first path that exists
    for (const testPath of possibleIconPaths) {
      if (fs.existsSync(testPath)) {
        iconPath = testPath;
        console.log('Found tray icon at:', iconPath);
        break;
      }
    }

    if (iconPath) {
      // Create the tray icon with the found path
      const icon = nativeImage.createFromPath(iconPath);
      tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    } else {
      // Use a default icon from Electron as fallback
      console.log('Tray icon not found, using default icon');
      tray = new Tray(nativeImage.createEmpty());
    }
  } catch (error) {
    console.error('Failed to create tray icon:', error);
    // Create a simple empty tray icon as fallback
    tray = new Tray(nativeImage.createEmpty());
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'Status: Connected',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Start Telemetry',
      click: () => {
        blackBoxCore.startTelemetry();
      }
    },
    {
      label: 'Stop Telemetry',
      click: () => {
        blackBoxCore.stopTelemetry();
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('show-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('PitBox Driver App');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('close-window', () => mainWindow?.close());

  // File system
  ipcMain.on('open-log-directory', () => {
    const logPath = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    nativeImage.createFromPath(path.join(__dirname, '../resources/icon.png')).toDataURL();
    shell.openPath(logPath);
  });

  // IPC handlers moved to registerIpcHandlers()

  ipcMain.on('create-driver', async (event: any, driverData: any) => {
    try {
      await createDriver(driverData);
      event.reply('driver-created', { success: true });
    } catch (error: any) {
      console.error('Error creating driver:', error);
      event.reply('driver-created', {
        success: false,
        error: error.message
      });
    }
  });

  ipcMain.on('update-driver', async (event: any, driverData: any) => {
    try {
      await updateDriver(driverData);
      event.reply('driver-updated', { success: true });
    } catch (error: any) {
      console.error('Error updating driver:', error);
      event.reply('driver-updated', {
        success: false,
        error: error.message
      });
    }
  });

  ipcMain.on('delete-driver', async (event: any, driverData: any) => {
    try {
      await deleteDriver(driverData);
      event.reply('driver-deleted', { success: true });
    } catch (error: any) {
      console.error('Error deleting driver:', error);
      event.reply('driver-deleted', {
        success: false,
        error: error.message
      });
    }
  });

  ipcMain.on('select-driver', async (event: any, driverData: any) => {
    try {
      await selectDriver(driverData);
      event.reply('driver-selected', { success: true });
    } catch (error: any) {
      console.error('Error selecting driver:', error);
      event.reply('driver-selected', {
        success: false,
        error: error.message
      });
    }
  });

  ipcMain.on('open-log-directory', (event: any) => {
    try {
      const logPath = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath, { recursive: true });
      }
      shell.openPath(logPath);
      event.reply('log-directory-opened', { success: true });
    } catch (error: any) {
      console.error('Error opening log directory:', error);
      event.reply('log-directory-opened', {
        success: false,
        error: error.message
      });
    }
  });

  ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  // IPC handlers are registered in registerIpcHandlers()
};

// Update application status
const updateStatus = (additionalStatus = {}): void => {
  try {
    if (!tray) return;

    const status = blackBoxCore.getStatus();
    const isRunning = status.isConnected;
    const isConnected = status.isTransmitting;
    const currentDriver = status.currentDriver;
    const stats = status.telemetryStats;

    // Update tray context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: isRunning ? 'Stop Telemetry' : 'Start Telemetry',
        click: () => {
          if (isRunning) {
            stopTelemetry();
          } else {
            startTelemetry();
          }
        }
      },
      {
        label: `Status: ${isRunning ? 'Running' : 'Stopped'}`,
        enabled: false
      },
      {
        label: `Connection: ${isConnected ? 'Connected' : 'Disconnected'}`,
        enabled: false
      },
      {
        label: `Driver: ${currentDriver ? currentDriver.name : 'None'}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('show-settings');
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    // Update window status if exists
    if (mainWindow) {
      mainWindow.webContents.send('status-update', {
        isRunning,
        isConnected,
        currentDriver,
        stats,
        ...additionalStatus
      });
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
};

// Update telemetry statistics
const updateTelemetryStats = (): void => {
  try {
    const status = blackBoxCore.getStatus();
    const stats = status.telemetryStats;
    if (mainWindow) {
      mainWindow.webContents.send('telemetry-stats', stats);
    }
  } catch (error) {
    console.error('Error updating telemetry stats:', error);
  }
};

// Start telemetry capture
const startTelemetry = async (): Promise<void> => {
  try {
    // Use Python relay service for iRacing telemetry
    console.log('Starting Python relay agent for iRacing telemetry...');
    const success = pythonRelayService.start();
    if (success) {
      updateStatus({ isRunning: true, simConnected: true, serverConnected: true });
      console.log('Telemetry started via Python relay agent');
    } else {
      console.error('Failed to start Python relay agent');
      throw new Error('Failed to start Python relay agent');
    }
  } catch (error) {
    console.error('Error starting telemetry:', error);
    throw error;
  }
};

// Stop telemetry capture
const stopTelemetry = async (): Promise<void> => {
  try {
    pythonRelayService.stop();
    updateStatus({ isRunning: false });
    console.log('Telemetry stopped');
  } catch (error) {
    console.error('Error stopping telemetry:', error);
    throw error;
  }
};

// Initialize services
const initializeServices = async (): Promise<void> => {
  try {
    // Initialize PitBoxCore
    await blackBoxCore.initialize();

    // Set up event listeners
    blackBoxCore.on('telemetry', (data) => {
      updateTelemetryStats();
    });

    blackBoxCore.on('driver_changed', (data) => {
      updateStatus();
    });

    blackBoxCore.on('session_started', (data) => {
      console.log('Session started:', data);
      if (mainWindow) {
        mainWindow.webContents.send('session-started', data);
      }
    });

    blackBoxCore.on('stint_started', (data) => {
      console.log('Stint started:', data);
      if (mainWindow) {
        mainWindow.webContents.send('stint-started', data);
      }
    });

    console.log('Services initialized');
  } catch (error) {
    console.error('Error initializing services:', error);
    throw error;
  }
};

// Update settings
const updateSettings = async (settings: any): Promise<void> => {
  try {
    // Update PitBoxCore settings
    blackBoxCore.updateSettings(settings);

    // Update config using the public update method
    AppConfig.update(settings);

    console.log('Settings updated');
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

// Reset settings to default
const resetSettings = async (): Promise<void> => {
  try {
    // Update configuration
    AppConfig.reset();

    // Update services with new settings
    const config = AppConfig.getAll();
    blackBoxCore.updateSettings(config);

    console.log('Settings reset');
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
};

// Create driver profile
const createDriver = async (driverData: any): Promise<void> => {
  try {
    const driver = blackBoxCore.createDriver(
      driverData.name,
      driverData.email,
      driverData.team
    );

    if (mainWindow) {
      mainWindow.webContents.send('driver-created', driver);
    }
  } catch (error: any) {
    console.error('Failed to create driver:', error);
    mainWindow?.webContents.send('error', {
      message: `Failed to create driver: ${error.message}`
    });
  }
};

// Update driver profile
const updateDriver = async (driverData: any): Promise<void> => {
  try {
    // Using the correct parameter count for updateDriver
    const updatedDriver = blackBoxCore.updateDriver(driverData.id, driverData);

    if (mainWindow) {
      mainWindow.webContents.send('driver-updated', updatedDriver);
    }
  } catch (error: any) {
    console.error('Failed to update driver:', error);
    mainWindow?.webContents.send('error', {
      message: `Failed to update driver: ${error.message}`
    });
  }
};

// Delete driver profile
const deleteDriver = async (driverData: any): Promise<void> => {
  try {
    // Delete driver using PitBoxCore
    const success = blackBoxCore.deleteDriver(driverData.id);

    if (success) {
      console.log(`Driver ${driverData.id} deleted successfully`);
      if (mainWindow) {
        mainWindow.webContents.send('driver-deleted', {
          success: true,
          driverId: driverData.id
        });
      }
    } else {
      throw new Error('Failed to delete driver');
    }
  } catch (error: any) {
    console.error('Failed to delete driver:', error);
    mainWindow?.webContents.send('error', {
      message: `Failed to delete driver: ${error.message}`
    });
  }
};

// Select driver profile
const selectDriver = async (driverData: any): Promise<void> => {
  try {
    // Using the correct method name setDriver instead of selectDriver
    const success = blackBoxCore.setDriver(driverData.id);
    if (!success) {
      throw new Error(`Driver with ID ${driverData.id} not found`);
    }
    updateStatus();

    if (mainWindow) {
      mainWindow.webContents.send('driver-selected', driverData);
    }
  } catch (error: any) {
    console.error('Failed to select driver:', error);
    mainWindow?.webContents.send('error', {
      message: `Failed to select driver: ${error.message}`
    });
  }
};

// Cleanup before quit
app.on('before-quit', () => {
  isQuitting = true;
  blackBoxCore.stop();
});

// Register IPC handlers
const registerIpcHandlers = (): void => {
  // Event handlers (one-way)
  ipcMain.on('start-telemetry', async (event: any) => {
    try {
      await startTelemetry();
      event.reply('telemetry-status', { running: true });
    } catch (error: any) {
      console.error('Error starting telemetry:', error);
      event.reply('telemetry-status', {
        running: false,
        error: error.message
      });
    }
  });

  ipcMain.on('stop-telemetry', async (event: any) => {
    try {
      await stopTelemetry();
      event.reply('telemetry-status', { running: false });
    } catch (error: any) {
      console.error('Error stopping telemetry:', error);
      const status = blackBoxCore.getStatus();
      event.reply('telemetry-status', {
        running: status.isConnected,
        error: error.message
      });
    }
  });

  // Remove video capture IPC handlers
  // ipcMain.on('start-video', ...);
  // ipcMain.on('stop-video', ...);

  ipcMain.on('update-settings', async (event: any, settings: any) => {
    try {
      await updateSettings(settings);
      event.reply('settings-updated', { success: true });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      event.reply('settings-updated', {
        success: false,
        error: error.message
      });
    }
  });

  // Add new IPC handlers for session and stint management
  ipcMain.on('reset-session', async (event: any) => {
    try {
      blackBoxCore.resetSession();
      event.reply('session-reset', { success: true });
    } catch (error: any) {
      console.error('Error resetting session:', error);
      event.reply('session-reset', {
        success: false,
        error: error.message
      });
    }
  });

  ipcMain.handle('get-status', async () => {
    return blackBoxCore.getStatus();
  });

  ipcMain.handle('get-drivers', async () => {
    return blackBoxCore.getAllDrivers();
  });

  // Other IPC handlers
  ipcMain.on('minimize-window', () => mainWindow?.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.handle('get-config', async () => AppConfig.getAll());

  ipcMain.handle('get-current-driver', async () => {
    return blackBoxCore.getAllDrivers().find(d => d.id === blackBoxCore.getStatus().currentDriver?.id) || null;
  });

  ipcMain.handle('get-version', async () => app.getVersion());

  ipcMain.handle('test-connection', async () => {
    return { success: false, error: "Not implemented in simplified build" };
  });

  ipcMain.handle('get-system-info', async () => {
    return {
      platform: process.platform,
      arch: (process as ProcessExtended).arch,
      version: (process as ProcessExtended).version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      userDataPath: app.getPath('userData')
    };
  });
};

// Initialize app when ready
app.whenReady().then(() => {
  // Create window
  createWindow();

  // Load configuration
  AppConfig.load();

  // Initialize services
  initializeServices();

  // Register IPC handlers
  registerIpcHandlers();

  // Create tray icon
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Start services if auto-start is enabled
if (AppConfig.getAutoStart()) {
  blackBoxCore.start();
}

// Export PitBoxCore for testing
export { blackBoxCore };
