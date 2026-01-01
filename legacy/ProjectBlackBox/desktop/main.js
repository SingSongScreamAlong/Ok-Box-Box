const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let tray;
let serverProcess;
let relayProcess;

const isDev = !app.isPackaged;

// Paths
const resourcesPath = isDev 
  ? path.join(__dirname, '..') 
  : process.resourcesPath;

const serverPath = isDev
  ? path.join(resourcesPath, 'server')
  : path.join(resourcesPath, 'server');

const dashboardPath = isDev
  ? path.join(resourcesPath, 'dashboard', 'build')
  : path.join(resourcesPath, 'dashboard');

const relayPath = isDev
  ? path.join(resourcesPath, 'relay_agent')
  : path.join(resourcesPath, 'relay_agent');

const envPath = isDev
  ? path.join(resourcesPath, '.env')
  : path.join(resourcesPath, '.env');

// Load environment variables
function loadEnv() {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#')) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
      console.log('✅ Environment loaded from', envPath);
    }
  } catch (err) {
    console.error('Failed to load .env:', err);
  }
}

// Start the Node.js server
function startServer() {
  return new Promise((resolve, reject) => {
    const serverScript = path.join(serverPath, 'dist', 'server.js');
    
    if (!fs.existsSync(serverScript)) {
      console.error('Server script not found:', serverScript);
      reject(new Error('Server not found'));
      return;
    }

    console.log('Starting server from:', serverScript);
    
    serverProcess = spawn('node', [serverScript], {
      cwd: serverPath,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server] ${data}`);
      if (data.toString().includes('listening') || data.toString().includes('started')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    // Resolve after timeout if no explicit ready message
    setTimeout(resolve, 3000);
  });
}

// Start the relay agent (Python)
function startRelayAgent() {
  const relayExe = path.join(relayPath, 'blackbox_relay.exe');
  const relayPy = path.join(relayPath, 'main.py');

  let command, args;
  
  if (fs.existsSync(relayExe)) {
    command = relayExe;
    args = [];
  } else if (fs.existsSync(relayPy)) {
    command = 'python';
    args = [relayPy];
  } else {
    console.log('Relay agent not found, skipping...');
    return;
  }

  console.log('Starting relay agent:', command);

  relayProcess = spawn(command, args, {
    cwd: relayPath,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  relayProcess.stdout.on('data', (data) => {
    console.log(`[Relay] ${data}`);
  });

  relayProcess.stderr.on('data', (data) => {
    console.error(`[Relay Error] ${data}`);
  });
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'BlackBox Racing',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#0a0c10'
  });

  // Load the dashboard
  if (isDev) {
    // In dev, load from React dev server
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files or local server
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  if (!fs.existsSync(iconPath)) {
    console.log('Tray icon not found, skipping tray creation');
    return;
  }

  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open BlackBox', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('BlackBox Racing');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow?.show();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  console.log('BlackBox Racing starting...');
  
  loadEnv();
  
  try {
    await startServer();
    console.log('✅ Server started');
  } catch (err) {
    console.error('Failed to start server:', err);
  }

  startRelayAgent();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('Shutting down...');
  
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (relayProcess) {
    relayProcess.kill();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
