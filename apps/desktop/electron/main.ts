import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, desktopCapturer, dialog } from 'electron';
import * as path from 'path';
import { IRacingSDK } from 'irsdk-node';
import { io, Socket } from 'socket.io-client';
import Store from 'electron-store';
import { VoiceSystem } from './voice';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let iracing: any = null;
let socket: Socket | null = null;
let videoInterval: NodeJS.Timeout | null = null;
let sessionId: string | null = null;
let voiceSystem: VoiceSystem | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

const SERVER_URL = 'https://octopus-app-qsi3i.ondigitalocean.app';
const SUPABASE_URL = 'https://muypplgzqqtjlwinhunw.supabase.co';
const APP_VERSION = '1.0.0';

// ── Protocol Handler (okboxbox:// deep links) ──
function registerProtocol() {
  app.setAsDefaultProtocolClient('okboxbox');
}

function parseProtocolUrl(url: string): { action: string; token: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'okboxbox:') return null;
    const action = parsed.hostname || parsed.pathname.replace(/^\//, '');
    const token = parsed.searchParams.get('token');
    if (!action || !token) return null;
    return { action, token };
  } catch { return null; }
}

function extractProtocolUrl(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith('okboxbox://')) || null;
}

// ── Auto-Start on Windows Boot ──
function setupAutoStart() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const AutoLaunch = require('auto-launch');
    const autoLauncher = new AutoLaunch({
      name: 'Ok,Box Box',
      path: app.getPath('exe'),
    });
    autoLauncher.isEnabled().then((enabled: boolean) => {
      if (!enabled) {
        autoLauncher.enable();
        console.log('✅ Auto-start enabled');
      }
    }).catch((err: Error) => {
      console.log('⚠️ Could not setup auto-start:', err.message);
    });
  } catch (err) {
    console.log('⚠️ auto-launch not available:', err);
  }
}

// ── Auto-Updater ──
async function checkForUpdates(silent = true) {
  try {
    const response = await fetch(`${SERVER_URL}/api/relay/version`);
    if (!response.ok) return null;
    const info = await response.json() as { version: string; download_url: string; release_notes: string };
    
    const current = APP_VERSION.split(/[-.]/).map(p => parseInt(p, 10) || 0);
    const remote = info.version.split(/[-.]/).map(p => parseInt(p, 10) || 0);
    const isNewer = remote.some((v, i) => v > (current[i] || 0)) && !remote.every((v, i) => v === (current[i] || 0));
    
    if (!isNewer) {
      if (!silent) await dialog.showMessageBox({ type: 'info', title: 'Ok, Box Box', message: 'Relay is up to date.' });
      return null;
    }
    
    const skipped = store.get('skippedVersion') as string | undefined;
    if (silent && skipped === info.version) return null;
    
    const result = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Download Update', 'Skip', 'Later'],
      defaultId: 0, cancelId: 2,
      title: `Update Available — v${info.version}`,
      message: `Version ${info.version} is available.`,
      detail: info.release_notes || 'A new version is ready to install.',
    });
    
    if (result.response === 0) await shell.openExternal(info.download_url);
    if (result.response === 1) store.set('skippedVersion', info.version);
  } catch (err) {
    if (!silent) console.error('Update check failed:', err);
  }
}

function startUpdateChecker() {
  if (updateCheckInterval) return;
  updateCheckInterval = setInterval(() => checkForUpdates(true), 1000 * 60 * 60 * 6); // every 6 hours
}

function stopUpdateChecker() {
  if (updateCheckInterval) { clearInterval(updateCheckInterval); updateCheckInterval = null; }
}

// Persistent storage for auth
const store = new Store({
  name: 'okboxbox-config',
  encryptionKey: 'okboxbox-secure-key-2026',
});

interface UserSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
  tier: 'free' | 'driver' | 'team' | 'league';
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 480,
    minWidth: 280,
    minHeight: 400,
    maxWidth: 400,
    maxHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    title: 'Ok,Box Box',
    frame: false,
    transparent: false,
    resizable: true,
    titleBarStyle: 'hidden',
  });

  // In development, load from Vite dev server
  const isDev = !app.isPackaged;
  if (isDev) {
    // Try multiple ports in case one is in use
    const tryPorts = [5177, 5178, 5179];
    for (const port of tryPorts) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`);
        mainWindow.webContents.openDevTools();
        break;
      } catch {
        continue;
      }
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if ((app as any).isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => { (app as any).isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('Ok,Box Box');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

function connectToServer(accessToken: string) {
  const session = store.get('session') as UserSession | undefined;
  
  console.log('🔌 Connecting to server:', SERVER_URL);
  console.log('   Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');
  console.log('   RelayId:', `pitbox-relay-desktop-${session?.userId || 'unknown'}`);
  
  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'], // Allow fallback to polling
    auth: { 
      relayId: process.env.RELAY_SECRET || `pitbox-relay-desktop-${session?.userId || 'unknown'}`,
      token: accessToken,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to Ok,Box Box server');
    console.log('   Socket ID:', socket?.id);
    mainWindow?.webContents.send('relay:status', 'connected');
    
    // Initialize voice system with socket
    if (voiceSystem) {
      voiceSystem.setSocket(socket);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from server:', reason);
    mainWindow?.webContents.send('relay:status', 'disconnected');
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
    mainWindow?.webContents.send('relay:status', 'error');
  });
  
  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`🔄 Reconnection attempt ${attempt}...`);
  });
}

function startIRacingRelay() {
  // Initialize iRacing SDK
  console.log('🏎️ Initializing iRacing SDK...');
  try {
    iracing = new IRacingSDK();
    iracing.startSDK(); // Must call startSDK() to begin polling shared memory
    console.log('✅ iRacing SDK initialized and started');
  } catch (err: any) {
    console.error('❌ Failed to initialize iRacing SDK:', err.message);
    return;
  }
  
  let isConnected = false;
  let sessionMetadataSent = false;
  let lastSessionInfoTime = 0;
  let lastIncidentCount = 0;
  let pollCount = 0;

  // Poll for connection and data
  setInterval(async () => {
    try {
      pollCount++;
      if (pollCount % 50 === 1) {
        console.log(`🔍 Polling iRacing... (poll #${pollCount})`);
      }
      // irsdk-node uses ready() which returns a Promise<boolean>
      const connected = await iracing.ready();
      
      if (connected && !isConnected) {
        isConnected = true;
        sessionMetadataSent = false;
        lastIncidentCount = 0;
        console.log('✅ Connected to iRacing');
        mainWindow?.webContents.send('iracing:status', 'connected');
        startVideoCapture();
      } else if (!connected && isConnected) {
        isConnected = false;
        sessionMetadataSent = false;
        console.log('❌ Disconnected from iRacing');
        mainWindow?.webContents.send('iracing:status', 'disconnected');
        stopVideoCapture();
        
        // Emit session_end before clearing sessionId
        if (socket?.connected && sessionId) {
          socket.emit('session_end', {
            sessionId,
            timestamp: Date.now(),
            reason: 'disconnected',
          });
          console.log('📤 Session end sent');
        }
        sessionId = null;
      }

      if (!connected) return;

      // Must call waitForData before getTelemetry (irsdk-node requirement)
      const hasData = iracing.waitForData(16); // 16ms = ~60Hz
      if (!hasData) return;

      const rawTelemetry = iracing.getTelemetry();
      const sessionInfo = iracing.getSessionData(); // Note: getSessionData not getSessionInfo
      if (!rawTelemetry) return;

      // irsdk-node wraps values in objects with a 'value' array - extract them
      const telemetry: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawTelemetry)) {
        if (val && typeof val === 'object' && 'value' in val) {
          // Single value or array
          telemetry[key] = Array.isArray(val.value) && val.value.length === 1 
            ? val.value[0] 
            : val.value;
        } else {
          telemetry[key] = val;
        }
      }

      const now = Date.now();
      const playerCarIdx = telemetry.PlayerCarIdx || 0;
      const camCarIdx = telemetry.CamCarIdx ?? playerCarIdx;
      const playerPosition = telemetry.CarIdxPosition?.[playerCarIdx] || 0;
      
      // Detect spectator mode: player position is 0 (not on track) and camera is on different car
      const isSpectating = playerPosition === 0 && camCarIdx !== playerCarIdx;
      const activeCarIdx = isSpectating ? camCarIdx : playerCarIdx;

      // Session ID for all events - detect session changes
      const newSessionId = telemetry.SessionUniqueID ? `live_${telemetry.SessionUniqueID}` : null;
      if (newSessionId && newSessionId !== sessionId) {
        // Session changed - emit session_end for old session
        if (sessionId && socket?.connected) {
          socket.emit('session_end', {
            sessionId,
            timestamp: now,
            reason: 'session_change',
          });
          console.log('📤 Session end (session change)');
        }
        sessionId = newSessionId;
        sessionMetadataSent = false; // Force re-send metadata for new session
        lastIncidentCount = 0;
        voiceSystem?.setSessionId(sessionId);
      }

      // Send session_metadata once per session (like Python relay)
      if (!sessionMetadataSent && sessionInfo && socket?.connected) {
        const weekendInfo = sessionInfo.WeekendInfo || {};
        const activeDriverInfo = sessionInfo.DriverInfo?.Drivers?.[activeCarIdx] || {};
        const sessions = sessionInfo.SessionInfo?.Sessions || [];
        const sessionNum = telemetry.SessionNum || 0;
        const sessionType = sessions[sessionNum]?.SessionType?.toLowerCase() || 'practice';

        socket.emit('session_metadata', {
          sessionId,
          trackName: weekendInfo.TrackDisplayName || weekendInfo.TrackName || 'Unknown Track',
          trackLength: weekendInfo.TrackLength || '0 km',
          trackId: weekendInfo.TrackID,
          sessionType,
          carName: activeDriverInfo.CarScreenName || 'Unknown Car',
          rpmRedline: telemetry.DriverCarSLBlinkRPM || 8000,
          fuelTankCapacity: telemetry.DriverCarFuelMaxLit || 20,
          timestamp: now,
          isSpectating,
        });
        sessionMetadataSent = true;
        const modeStr = isSpectating ? '👁️ SPECTATING' : '🏎️ DRIVING';
        console.log(`📍 Session: ${weekendInfo.TrackDisplayName} (${sessionType}) - ${modeStr}`);
      }

      // Notify renderer of mode change
      mainWindow?.webContents.send('relay:mode', isSpectating ? 'spectating' : 'driving');

      // Update voice system with telemetry context
      voiceSystem?.updateTelemetry(telemetry);
      
      // Send to renderer for local HUD
      mainWindow?.webContents.send('telemetry', telemetry);

      // Send ALL raw telemetry to server - relay is a dumb pipe
      if (socket?.connected) {
        // Raw telemetry dump - send everything iRacing provides
        socket.volatile.emit('telemetry', {
          sessionId,
          timestamp: now,
          playerCarIdx,
          activeCarIdx,
          isSpectating,
          // Dump the entire raw telemetry object
          raw: telemetry,
        });

        // Send full session info at 1Hz (contains driver info, weekend info, etc.)
        if (now - lastSessionInfoTime > 1000) {
          lastSessionInfoTime = now;
          socket.emit('session_info', {
            sessionId,
            timestamp: now,
            raw: sessionInfo,
          });
        }

        // Detect incidents
        const currentIncidents = telemetry.PlayerCarMyIncidentCount || 0;
        if (currentIncidents > lastIncidentCount) {
          socket.emit('incident', {
            sessionId,
            timestamp: now,
            carIdx: playerCarIdx,
            incidentCount: currentIncidents,
            delta: currentIncidents - lastIncidentCount,
            raw: {
              lap: telemetry.Lap,
              lapDistPct: telemetry.LapDistPct,
              sessionTime: telemetry.SessionTime,
            },
          });
          lastIncidentCount = currentIncidents;
        }
      }
    } catch (err) {
      // Silently handle polling errors
    }
  }, 100); // 10 Hz polling
}

// Video/Screen Capture Streaming
async function startVideoCapture() {
  if (videoInterval) return; // Already running
  
  const VIDEO_FPS = 15; // 15 fps for streaming
  const VIDEO_QUALITY = 60; // JPEG quality
  
  videoInterval = setInterval(async () => {
    if (!socket?.connected || !sessionId) return;
    
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 854, height: 480 }, // 480p
      });
      
      if (sources.length > 0) {
        const thumbnail = sources[0].thumbnail;
        const jpegBuffer = thumbnail.toJPEG(VIDEO_QUALITY);
        
        socket.volatile.emit('video_frame', {
          sessionId,
          image: jpegBuffer,
        });
      }
    } catch (err) {
      console.error('Video capture error:', err);
    }
  }, 1000 / VIDEO_FPS);
  
  console.log('🎥 Video capture started');
}

function stopVideoCapture() {
  if (videoInterval) {
    clearInterval(videoInterval);
    videoInterval = null;
    console.log('🎥 Video capture stopped');
  }
}

// IPC handlers
ipcMain.handle('get-status', async () => {
  // irsdk-node uses ready() which returns Promise<boolean>
  const iracingConnected = iracing ? await iracing.ready() : false;
  return {
    iracing: iracingConnected,
    server: socket?.connected || false,
  };
});

// Voice IPC handlers
ipcMain.on('voice:pttState', (_event, pressed: boolean) => {
  voiceSystem?.onPTTStateChange(pressed);
});

ipcMain.on('voice:audioData', (_event, audioBuffer: Buffer, mimeType: string) => {
  console.log(`🎤 Received audio data from renderer: ${audioBuffer?.length || 0} bytes`);
  voiceSystem?.processAudio(audioBuffer, mimeType);
});

// Window control IPC handlers
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.on('open:website', () => {
  shell.openExternal('https://okboxbox.com');
});

// Settings IPC handlers
ipcMain.handle('settings:get', () => {
  return store.get('voiceSettings') || {
    audioInput: 'default',
    audioOutput: 'default',
    pttType: 'keyboard',
    pttKey: 'Space',
    joystickId: 0,
    joystickButton: 0,
  };
});

ipcMain.handle('settings:save', (_event, settings: any) => {
  store.set('voiceSettings', settings);
  // Update voice system with new settings
  if (voiceSystem) {
    voiceSystem.updateConfig(settings);
  }
});

// Auth IPC handlers
ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eXBwbGd6cXF0amx3aW5odW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjgzODMsImV4cCI6MjA4NDc0NDM4M30.izBIDjwVkvTa2BenZn_jSp6r9i_drBgS_1_hnhW7k8I',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error_description || 'Login failed' };
    }
    
    const data = await response.json();
    
    // Check license/tier from server
    const tierResponse = await fetch(`${SERVER_URL}/api/user/tier`, {
      headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    const tierData = tierResponse.ok ? await tierResponse.json() : { tier: 'free' };
    
    const session: UserSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user.id,
      email: data.user.email,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tier: tierData.tier || 'free',
    };
    
    store.set('session', session);
    
    // Connect to server with auth
    connectToServer(session.accessToken);
    startIRacingRelay();
    
    return { success: true, user: { email: session.email, tier: session.tier } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('auth:logout', () => {
  store.delete('session');
  socket?.disconnect();
  return { success: true };
});

ipcMain.handle('auth:check', async () => {
  const session = store.get('session') as UserSession | undefined;
  if (!session) return { loggedIn: false };
  
  // Check if token expired
  if (Date.now() > session.expiresAt) {
    store.delete('session');
    return { loggedIn: false, reason: 'expired' };
  }
  
  return { 
    loggedIn: true, 
    user: { email: session.email, tier: session.tier },
  };
});

// ── Single Instance Lock ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', (_event, argv) => {
  const url = extractProtocolUrl(argv);
  if (url) handleProtocolUrl(url);
  mainWindow?.show();
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

async function handleProtocolUrl(url: string) {
  const parsed = parseProtocolUrl(url);
  if (!parsed || parsed.action !== 'launch') return;
  
  try {
    // Exchange launch token for access token
    const response = await fetch(`${SERVER_URL}/api/launch-token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: parsed.token }),
    });
    
    if (!response.ok) return;
    const data = await response.json() as any;
    const result = data?.data || data;
    
    if (result.accessToken) {
      const session: UserSession = {
        accessToken: result.accessToken,
        refreshToken: '',
        userId: result.user?.id || '',
        email: result.user?.email || '',
        expiresAt: result.expiresAt || (Date.now() + 3600000),
        tier: 'driver',
      };
      store.set('session', session);
      connectToServer(session.accessToken);
      startIRacingRelay();
      mainWindow?.webContents.send('auth:updated', { loggedIn: true, user: { email: session.email, tier: session.tier } });
      console.log(`🔗 Relay linked to ${session.email} via protocol`);
    }
  } catch (err) {
    console.error('Protocol link failed:', err);
  }
}

app.whenReady().then(async () => {
  registerProtocol();
  setupAutoStart();
  createWindow();
  createTray();
  
  // Initialize voice system with saved settings
  const savedVoiceSettings = store.get('voiceSettings') as any;
  voiceSystem = new VoiceSystem({
    serverUrl: SERVER_URL,
    ...savedVoiceSettings,
  });
  voiceSystem.setWindow(mainWindow!);
  await voiceSystem.start();
  
  if (savedVoiceSettings) {
    console.log('🎙️ Loaded saved voice settings:', savedVoiceSettings);
  }
  
  // Check for existing session
  const session = store.get('session') as UserSession | undefined;
  console.log('🔐 Session check:', session ? `expires ${new Date(session.expiresAt).toISOString()}` : 'no session');
  if (session && Date.now() < session.expiresAt) {
    console.log('🔐 Valid session found, connecting...');
    connectToServer(session.accessToken);
    startIRacingRelay();
  } else if (session) {
    console.log('🔐 Session expired, need to re-login');
  }
  
  // DEV MODE: Connect without auth for voice testing (relay-only mode)
  const devToken = process.env.DEV_AUTH_TOKEN;
  if (devToken && !session) {
    console.log('🔧 DEV MODE: Connecting with dev token...');
    connectToServer(devToken);
    startIRacingRelay();
  }

  // Check for updates
  await checkForUpdates(true);
  startUpdateChecker();

  // Handle protocol URL from cold launch
  const pendingUrl = extractProtocolUrl(process.argv);
  if (pendingUrl) handleProtocolUrl(pendingUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, stay in tray
  }
});

app.on('before-quit', () => {
  stopUpdateChecker();
  socket?.disconnect();
});

