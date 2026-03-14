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
let relayPollInterval: NodeJS.Timeout | null = null;
let sessionId: string | null = null;
let voiceSystem: VoiceSystem | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

const SERVER_URL = process.env.OKBOXBOX_SERVER_URL || (app.isPackaged
  ? 'https://app.okboxbox.com'
  : 'http://localhost:3001');
const SUPABASE_URL = 'https://muypplgzqqtjlwinhunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eXBwbGd6cXF0amx3aW5odW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjgzODMsImV4cCI6MjA4NDc0NDM4M30.izBIDjwVkvTa2BenZn_jSp6r9i_drBgS_1_hnhW7k8I';
const APP_VERSION = '1.0.0';
const PTT_DISABLED = process.env.OKBOXBOX_DISABLE_PTT === '1';

function isLocalServerUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

function normalizeExpiryTimestamp(expiresAt: number | null | undefined, fallbackMs: number = 3600000): number {
  if (typeof expiresAt !== 'number' || Number.isNaN(expiresAt) || expiresAt <= 0) {
    return Date.now() + fallbackMs;
  }

  return expiresAt < 1_000_000_000_000 ? expiresAt * 1000 : expiresAt;
}

async function refreshSession(session: UserSession): Promise<UserSession | null> {
  if (!session.refreshToken) return null;
  try {
    console.log('🔐 Attempting token refresh...');
    const serverResponse = await fetch(`${SERVER_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (serverResponse.ok) {
      const payload = await serverResponse.json() as any;
      const result = payload?.data || payload;
      const refreshed: UserSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: session.userId,
        email: session.email,
        expiresAt: normalizeExpiryTimestamp(result.expiresAt),
        tier: session.tier,
      };
      store.set('session', refreshed);
      console.log(`🔐 Server token refreshed, expires ${new Date(refreshed.expiresAt).toISOString()}`);
      return refreshed;
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    if (!response.ok) {
      console.error('🔐 Token refresh failed:', response.status, serverResponse.status);
      return null;
    }
    const data = await response.json();
    const refreshed: UserSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user?.id || session.userId,
      email: data.user?.email || session.email,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tier: session.tier,
    };
    store.set('session', refreshed);
    console.log(`🔐 Supabase token refreshed, expires ${new Date(refreshed.expiresAt).toISOString()}`);
    return refreshed;
  } catch (err: any) {
    console.error('🔐 Token refresh error:', err.message);
    return null;
  }
}

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

function emitAuthError(message: string) {
  mainWindow?.webContents.send('auth:error', message);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

function handleSocketAuthFailure(message: string) {
  console.error('🔐 Relay authentication failed:', message);
  store.delete('session');
  socket?.disconnect();
  socket = null;
  mainWindow?.webContents.send('auth:updated', { loggedIn: false });
  emitAuthError(message);
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

function normalizeStoredSession(session: UserSession | undefined): UserSession | undefined {
  if (!session) return undefined;

  const normalizedExpiresAt = normalizeExpiryTimestamp(session.expiresAt);
  if (normalizedExpiresAt === session.expiresAt) {
    return session;
  }

  const normalizedSession: UserSession = {
    ...session,
    expiresAt: normalizedExpiresAt,
  };
  store.set('session', normalizedSession);
  return normalizedSession;
}

function getDriverEntry(sessionInfo: any, carIdx: number) {
  return sessionInfo?.DriverInfo?.Drivers?.[carIdx] || {};
}

function buildStandingsPayload(telemetry: Record<string, any>, sessionInfo: any, playerCarIdx: number) {
  const positions = Array.isArray(telemetry.CarIdxPosition) ? telemetry.CarIdxPosition : [];
  const standings = positions
    .map((position: number, carIdx: number) => {
      if (!(position > 0 || carIdx === playerCarIdx)) {
        return null;
      }

      const driver = getDriverEntry(sessionInfo, carIdx);
      return {
        carIdx,
        driverName: driver.UserName || `Car ${carIdx}`,
        carName: driver.CarScreenName || 'Unknown Car',
        carClass: driver.CarClassShortName || '',
        carNumber: driver.CarNumber || String(carIdx),
        iRating: driver.IRating || 0,
        position: position || 0,
        classPosition: telemetry.CarIdxClassPosition?.[carIdx] || 0,
        lap: telemetry.CarIdxLap?.[carIdx] || 0,
        lapDistPct: telemetry.CarIdxLapDistPct?.[carIdx] || 0,
        onPitRoad: !!telemetry.CarIdxOnPitRoad?.[carIdx],
        lastLapTime: telemetry.CarIdxLastLapTime?.[carIdx] || 0,
        bestLapTime: telemetry.CarIdxBestLapTime?.[carIdx] || 0,
        estTime: telemetry.CarIdxEstTime?.[carIdx] || 0,
        f2Time: telemetry.CarIdxF2Time?.[carIdx] || 0,
        isPlayer: carIdx === playerCarIdx,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const aPos = typeof a.position === 'number' && a.position > 0 ? a.position : 999;
      const bPos = typeof b.position === 'number' && b.position > 0 ? b.position : 999;
      return aPos - bPos;
    });

  return {
    standings,
    totalCars: standings.length,
  };
}

function buildStrategyRawPayload(telemetry: Record<string, any>, activeCarIdx: number) {
  return {
    cars: [{
      carId: activeCarIdx,
      position: telemetry.CarIdxPosition?.[activeCarIdx] || 0,
      classPosition: telemetry.CarIdxClassPosition?.[activeCarIdx] || 0,
      lap: telemetry.CarIdxLap?.[activeCarIdx] || telemetry.Lap || 0,
      lapDistPct: telemetry.CarIdxLapDistPct?.[activeCarIdx] || telemetry.LapDistPct || 0,
      lastLapTime: telemetry.CarIdxLastLapTime?.[activeCarIdx] || telemetry.LapLastLapTime || 0,
      bestLapTime: telemetry.CarIdxBestLapTime?.[activeCarIdx] || telemetry.LapBestLapTime || 0,
      incidentCount: telemetry.PlayerCarMyIncidentCount || 0,
      onPitRoad: !!(telemetry.CarIdxOnPitRoad?.[activeCarIdx] || telemetry.OnPitRoad),
      brake: telemetry.Brake || 0,
      brakeBias: telemetry.dcBrakeBias || 55,
      fuelLevel: telemetry.FuelLevel || 0,
      fuelPct: telemetry.FuelLevelPct || 0,
      fuelUsePerHour: telemetry.FuelUsePerHour || 0,
      tireTemps: {
        fl: { l: telemetry.LFtempCL || 0, m: telemetry.LFtempCM || 0, r: telemetry.LFtempCR || 0 },
        fr: { l: telemetry.RFtempCL || 0, m: telemetry.RFtempCM || 0, r: telemetry.RFtempCR || 0 },
        rl: { l: telemetry.LRtempCL || 0, m: telemetry.LRtempCM || 0, r: telemetry.LRtempCR || 0 },
        rr: { l: telemetry.RRtempCL || 0, m: telemetry.RRtempCM || 0, r: telemetry.RRtempCR || 0 },
      },
      tireCompound: telemetry.CarIdxTireCompound?.[activeCarIdx] ?? telemetry.dcTireCompound ?? null,
      oilTemp: telemetry.OilTemp || 0,
      oilPress: telemetry.OilPress || 0,
      waterTemp: telemetry.WaterTemp || 0,
      voltage: telemetry.Voltage || 0,
      engineWarnings: telemetry.EngineWarnings || 0,
    }],
  };
}

function buildTelemetryPayload(
  telemetry: Record<string, any>,
  sessionInfo: any,
  sessionId: string,
  timestamp: number,
  playerCarIdx: number,
  activeCarIdx: number,
  isSpectating: boolean,
) {
  const weekendInfo = sessionInfo?.WeekendInfo || {};
  const sessions = sessionInfo?.SessionInfo?.Sessions || [];
  const sessionNum = telemetry.SessionNum || 0;
  const sessionType = sessions[sessionNum]?.SessionType?.toLowerCase() || 'practice';
  const sessionFlags = telemetry.SessionFlags ?? 0;
  let flagStatus = 'green';
  if (sessionFlags & 0x0001) flagStatus = 'checkered';
  else if (sessionFlags & 0x0002) flagStatus = 'white';
  else if (sessionFlags & 0x0004) flagStatus = 'green';
  else if (sessionFlags & 0x0008) flagStatus = 'yellow';
  else if (sessionFlags & 0x0010) flagStatus = 'red';
  else if (sessionFlags & 0x0020) flagStatus = 'blue';
  else if (sessionFlags & 0x4000) flagStatus = 'caution';

  const positions = Array.isArray(telemetry.CarIdxPosition) ? telemetry.CarIdxPosition : [];
  const cars = positions
    .map((position: number, carIdx: number) => {
      if (!(position > 0 || carIdx === playerCarIdx)) {
        return null;
      }

      const driver = getDriverEntry(sessionInfo, carIdx);
      return {
        carIdx,
        carId: carIdx,
        driverId: String(carIdx),
        driverName: driver.UserName || `Car ${carIdx}`,
        carName: driver.CarScreenName || 'Unknown Car',
        carClass: driver.CarClassShortName || '',
        iRating: driver.IRating || 0,
        licenseLevel: driver.LicString || '',
        position: position || 0,
        classPosition: telemetry.CarIdxClassPosition?.[carIdx] || 0,
        lap: telemetry.CarIdxLap?.[carIdx] || 0,
        lapDistPct: telemetry.CarIdxLapDistPct?.[carIdx] || 0,
        pos: { s: telemetry.CarIdxLapDistPct?.[carIdx] || 0 },
        onPitRoad: !!telemetry.CarIdxOnPitRoad?.[carIdx],
        inPit: !!telemetry.CarIdxOnPitRoad?.[carIdx],
        lastLapTime: telemetry.CarIdxLastLapTime?.[carIdx] || 0,
        bestLapTime: telemetry.CarIdxBestLapTime?.[carIdx] || 0,
        estTime: telemetry.CarIdxEstTime?.[carIdx] || 0,
        f2Time: telemetry.CarIdxF2Time?.[carIdx] || 0,
        isPlayer: !isSpectating && carIdx === activeCarIdx,
        isSpectated: isSpectating && carIdx === activeCarIdx,
        speed: !isSpectating && carIdx === activeCarIdx ? (telemetry.Speed || 0) : 0,
        gear: !isSpectating && carIdx === activeCarIdx ? (telemetry.Gear || 0) : 0,
        rpm: !isSpectating && carIdx === activeCarIdx ? (telemetry.RPM || 0) : 0,
        throttle: !isSpectating && carIdx === activeCarIdx ? (telemetry.Throttle || 0) : 0,
        brake: !isSpectating && carIdx === activeCarIdx ? (telemetry.Brake || 0) : 0,
        clutch: !isSpectating && carIdx === activeCarIdx ? (telemetry.Clutch || 0) : 0,
        steering: !isSpectating && carIdx === activeCarIdx ? (telemetry.SteeringWheelAngle || 0) : 0,
        steeringAngle: !isSpectating && carIdx === activeCarIdx ? (telemetry.SteeringWheelAngle || 0) : 0,
        deltaToSessionBest: !isSpectating && carIdx === activeCarIdx ? (telemetry.LapDeltaToSessionBestLap || 0) : 0,
        deltaToOptimalLap: !isSpectating && carIdx === activeCarIdx ? (telemetry.LapDeltaToOptimalLap || 0) : 0,
        fuelLevel: !isSpectating && carIdx === activeCarIdx ? (telemetry.FuelLevel || 0) : 0,
        fuelPct: !isSpectating && carIdx === activeCarIdx ? (telemetry.FuelLevelPct || 0) : 0,
        fuelUsePerHour: !isSpectating && carIdx === activeCarIdx ? (telemetry.FuelUsePerHour || 0) : 0,
        tireWearRaw: !isSpectating && carIdx === activeCarIdx ? {
          LF: [telemetry.LFwearL, telemetry.LFwearM, telemetry.LFwearR],
          RF: [telemetry.RFwearL, telemetry.RFwearM, telemetry.RFwearR],
          LR: [telemetry.LRwearL, telemetry.LRwearM, telemetry.LRwearR],
          RR: [telemetry.RRwearL, telemetry.RRwearM, telemetry.RRwearR],
        } : undefined,
        tireTempsRaw: !isSpectating && carIdx === activeCarIdx ? {
          LF: [telemetry.LFtempCL, telemetry.LFtempCM, telemetry.LFtempCR],
          RF: [telemetry.RFtempCL, telemetry.RFtempCM, telemetry.RFtempCR],
          LR: [telemetry.LRtempCL, telemetry.LRtempCM, telemetry.LRtempCR],
          RR: [telemetry.RRtempCL, telemetry.RRtempCM, telemetry.RRtempCR],
        } : undefined,
        oilTemp: carIdx === activeCarIdx ? (telemetry.OilTemp || 0) : 0,
        oilPress: carIdx === activeCarIdx ? (telemetry.OilPress || 0) : 0,
        waterTemp: carIdx === activeCarIdx ? (telemetry.WaterTemp || 0) : 0,
        voltage: carIdx === activeCarIdx ? (telemetry.Voltage || 0) : 0,
        brakeBias: carIdx === activeCarIdx ? (telemetry.dcBrakeBias || 55) : 55,
        isOnTrack: carIdx === activeCarIdx ? !!telemetry.IsOnTrack : false,
        incidentCount: !isSpectating && carIdx === activeCarIdx ? (telemetry.PlayerCarMyIncidentCount || 0) : 0,
      };
    })
    .filter(Boolean);

  const activeCar = cars.find((car: any) => car.carIdx === activeCarIdx) || cars[0] || {
    carIdx: activeCarIdx,
    carId: activeCarIdx,
    driverId: String(activeCarIdx),
    driverName: `Car ${activeCarIdx}`,
    carName: 'Unknown Car',
    carClass: '',
    iRating: 0,
    licenseLevel: '',
    position: telemetry.CarIdxPosition?.[activeCarIdx] || 0,
    classPosition: telemetry.CarIdxClassPosition?.[activeCarIdx] || 0,
    lap: telemetry.CarIdxLap?.[activeCarIdx] || telemetry.Lap || 0,
    lapDistPct: telemetry.CarIdxLapDistPct?.[activeCarIdx] || telemetry.LapDistPct || 0,
    pos: { s: telemetry.CarIdxLapDistPct?.[activeCarIdx] || telemetry.LapDistPct || 0 },
    onPitRoad: !!(telemetry.CarIdxOnPitRoad?.[activeCarIdx] || telemetry.OnPitRoad),
    inPit: !!(telemetry.CarIdxOnPitRoad?.[activeCarIdx] || telemetry.OnPitRoad),
    lastLapTime: telemetry.CarIdxLastLapTime?.[activeCarIdx] || telemetry.LapLastLapTime || 0,
    bestLapTime: telemetry.CarIdxBestLapTime?.[activeCarIdx] || telemetry.LapBestLapTime || 0,
    estTime: telemetry.CarIdxEstTime?.[activeCarIdx] || 0,
    f2Time: telemetry.CarIdxF2Time?.[activeCarIdx] || 0,
    isPlayer: !isSpectating,
    isSpectated: isSpectating,
    speed: !isSpectating ? (telemetry.Speed || 0) : 0,
    gear: !isSpectating ? (telemetry.Gear || 0) : 0,
    rpm: !isSpectating ? (telemetry.RPM || 0) : 0,
    throttle: !isSpectating ? (telemetry.Throttle || 0) : 0,
    brake: !isSpectating ? (telemetry.Brake || 0) : 0,
    clutch: !isSpectating ? (telemetry.Clutch || 0) : 0,
    steering: !isSpectating ? (telemetry.SteeringWheelAngle || 0) : 0,
    steeringAngle: !isSpectating ? (telemetry.SteeringWheelAngle || 0) : 0,
    deltaToSessionBest: !isSpectating ? (telemetry.LapDeltaToSessionBestLap || 0) : 0,
    deltaToOptimalLap: !isSpectating ? (telemetry.LapDeltaToOptimalLap || 0) : 0,
    fuelLevel: !isSpectating ? (telemetry.FuelLevel || 0) : 0,
    fuelPct: !isSpectating ? (telemetry.FuelLevelPct || 0) : 0,
    fuelUsePerHour: !isSpectating ? (telemetry.FuelUsePerHour || 0) : 0,
    tireWearRaw: !isSpectating ? {
      LF: [telemetry.LFwearL, telemetry.LFwearM, telemetry.LFwearR],
      RF: [telemetry.RFwearL, telemetry.RFwearM, telemetry.RFwearR],
      LR: [telemetry.LRwearL, telemetry.LRwearM, telemetry.LRwearR],
      RR: [telemetry.RRwearL, telemetry.RRwearM, telemetry.RRwearR],
    } : undefined,
    tireTempsRaw: !isSpectating ? {
      LF: [telemetry.LFtempCL, telemetry.LFtempCM, telemetry.LFtempCR],
      RF: [telemetry.RFtempCL, telemetry.RFtempCM, telemetry.RFtempCR],
      LR: [telemetry.LRtempCL, telemetry.LRtempCM, telemetry.LRtempCR],
      RR: [telemetry.RRtempCL, telemetry.RRtempCM, telemetry.RRtempCR],
    } : undefined,
    oilTemp: telemetry.OilTemp || 0,
    oilPress: telemetry.OilPress || 0,
    waterTemp: telemetry.WaterTemp || 0,
    voltage: telemetry.Voltage || 0,
    brakeBias: telemetry.dcBrakeBias || 55,
    isOnTrack: !!telemetry.IsOnTrack,
    incidentCount: !isSpectating ? (telemetry.PlayerCarMyIncidentCount || 0) : 0,
  };

  return {
    type: 'telemetry',
    schemaVersion: 'v1',
    sessionId,
    timestamp,
    sessionTime: telemetry.SessionTime || 0,
    sessionTimeMs: (telemetry.SessionTime || 0) * 1000,
    playerCarIdx,
    activeCarIdx,
    isSpectating,
    trackName: weekendInfo.TrackDisplayName || weekendInfo.TrackName || 'Unknown Track',
    trackLength: weekendInfo.TrackLength || '0 km',
    trackId: weekendInfo.TrackID,
    sessionType,
    carName: activeCar.carName,
    flagStatus,
    trackTemp: telemetry.TrackTemp || 0,
    airTemp: telemetry.AirTemp || 0,
    humidity: telemetry.RelativeHumidity || 0,
    windSpeed: telemetry.WindVel || 0,
    windDir: telemetry.WindDir || 0,
    skies: telemetry.Skies || 0,
    sessionTimeRemain: telemetry.SessionTimeRemain || 0,
    sessionLapsRemain: telemetry.SessionLapsRemain || 0,
    car: activeCar,
    cars,
  };
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
  const relayId = process.env.RELAY_SECRET || `pitbox-relay-desktop-${session?.userId || 'unknown'}`;
  
  console.log('🔌 Connecting to server:', SERVER_URL);
  console.log('   Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');
  console.log('   RelayId:', relayId);
  
  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'], // Allow fallback to polling
    auth: { 
      relayId,
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

  socket.on('ack', (data) => {
    console.log('📨 Relay ack:', data);
  });

  socket.on('connect_error', (err) => {
    const socketError = err as Error & {
      description?: unknown;
      data?: { message?: unknown };
    };
    const detail = typeof socketError.description === 'string'
      ? socketError.description
      : typeof socketError.data?.message === 'string'
        ? socketError.data.message
        : '';
    const reason = [socketError.message, detail].filter(Boolean).join(' — ');

    console.error('❌ Connection error:', reason || socketError.message || 'Unknown websocket error');
    mainWindow?.webContents.send('relay:status', 'error');

    const authFailure = /authentication required|invalid relay credentials|invalid or expired websocket token|invalid token|expired websocket token/i.test(reason);
    if (authFailure) {
      handleSocketAuthFailure('Your desktop session is no longer valid. Please sign in again.');
    }
  });
  
  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`🔄 Reconnection attempt ${attempt}...`);
  });
}

function startIRacingRelay() {
  if (relayPollInterval) {
    console.log('🏎️ iRacing relay already running');
    return;
  }

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
  let lastStandingsTime = 0;
  let lastStrategyRawTime = 0;
  let lastIncidentCount = 0;
  let pollCount = 0;
  let firstTelemetrySent = false;
  let firstStrategyRawSent = false;
  let relayPollErrorCount = 0;
  let loggedWaitForDataMiss = false;
  let loggedRawTelemetryMiss = false;
  let loggedSocketDisconnected = false;
  let loggedRawTelemetryKeys = false;
  let pollInFlight = false;

  // Poll for connection and data
  relayPollInterval = setInterval(async () => {
    if (pollInFlight) {
      return;
    }
    pollInFlight = true;
    try {
      pollCount++;
      if (pollCount % 50 === 1) {
        console.log(`🔍 Polling iRacing... (poll #${pollCount})`);
      }
      // irsdk-node uses ready() which returns Promise<boolean>
      const connected = await iracing.ready();
      
      if (connected && !isConnected) {
        isConnected = true;
        sessionMetadataSent = false;
        lastStandingsTime = 0;
        lastStrategyRawTime = 0;
        lastIncidentCount = 0;
        firstStrategyRawSent = false;
        console.log('✅ Connected to iRacing');
        voiceSystem?.setIRacingConnected(true);
        mainWindow?.webContents.send('iracing:status', 'connected');
        startVideoCapture();
      } else if (!connected && isConnected) {
        isConnected = false;
        sessionMetadataSent = false;
        lastStandingsTime = 0;
        lastStrategyRawTime = 0;
        console.log('❌ Disconnected from iRacing');
        voiceSystem?.setIRacingConnected(false);
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
        voiceSystem?.setSessionId('');
      }

      if (!connected) {
        if (!loggedSocketDisconnected) {
          loggedSocketDisconnected = true;
          console.warn('⚠️ Relay polling skipped because iRacing SDK is not connected');
        }
        return;
      }
      loggedSocketDisconnected = false;

      // Must call waitForData before getTelemetry (irsdk-node requirement)
      const hasData = iracing.waitForData(500);
      if (!hasData) {
        if (!loggedWaitForDataMiss) {
          loggedWaitForDataMiss = true;
          console.warn('⚠️ Relay polling skipped because waitForData returned false after 500ms');
        }
        return;
      }
      loggedWaitForDataMiss = false;

      const rawTelemetry = iracing.getTelemetry();
      const sessionInfo = iracing.getSessionData(); // Note: getSessionData not getSessionInfo
      if (!rawTelemetry) {
        if (!loggedRawTelemetryMiss) {
          loggedRawTelemetryMiss = true;
          console.warn('⚠️ Relay polling skipped because getTelemetry returned no data');
        }
        return;
      }
      loggedRawTelemetryMiss = false;
      if (!loggedRawTelemetryKeys) {
        loggedRawTelemetryKeys = true;
        console.log('🧪 Raw telemetry keys sample:', Object.keys(rawTelemetry).slice(0, 20));
      }

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
      const weekendInfo = sessionInfo?.WeekendInfo || {};
      
      // Detect spectator mode: player position is 0 (not on track) and camera is on different car
      const isSpectating = playerPosition === 0 && camCarIdx !== playerCarIdx;
      const activeCarIdx = isSpectating ? camCarIdx : playerCarIdx;

      // Session ID for all events - detect session changes
      const rawSessionIdentity = telemetry.SessionUniqueID
        ?? weekendInfo.SubSessionID
        ?? weekendInfo.SubsessionID
        ?? weekendInfo.SessionID
        ?? weekendInfo.SessionId;
      const fallbackTrackKey = String(weekendInfo.TrackName || weekendInfo.TrackDisplayName || 'unknown-track')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const newSessionId = rawSessionIdentity
        ? `live_${String(rawSessionIdentity)}`
        : `live_runtime_${fallbackTrackKey}_${telemetry.SessionNum || 0}_${activeCarIdx}`;
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
        lastStandingsTime = 0;
        lastStrategyRawTime = 0;
        lastIncidentCount = 0;
        firstStrategyRawSent = false;
        voiceSystem?.setSessionId(sessionId);
      }

      // Send session_metadata once per session (like Python relay)
      if (!sessionMetadataSent && socket?.connected) {
        const activeDriverInfo = sessionInfo?.DriverInfo?.Drivers?.[activeCarIdx] || {};
        const sessions = sessionInfo?.SessionInfo?.Sessions || [];
        const sessionNum = telemetry.SessionNum || 0;
        const sessionType = sessions[sessionNum]?.SessionType?.toLowerCase() || 'practice';
        const weather = {
          ambientTemp: telemetry.AirTemp || 0,
          trackTemp: telemetry.TrackTemp || 0,
          precipitation: telemetry.Precipitation || 0,
          trackState: (telemetry.TrackWetness || 0) > 0 ? 'damp' : 'dry',
        } as const;
        const classes = sessionInfo?.CarClassInfo?.Classes;

        socket.emit('session_metadata', {
          type: 'session_metadata',
          schemaVersion: 'v1',
          sessionId,
          trackName: weekendInfo.TrackDisplayName || weekendInfo.TrackName || 'Unknown Track',
          trackConfig: weekendInfo.TrackConfigName || undefined,
          category: String(weekendInfo.Category || weekendInfo.TrackCategory || 'sports_car'),
          multiClass: Array.isArray(classes) && classes.length > 1,
          cautionsEnabled: Boolean(sessionInfo?.WeekendInfo?.WeekendOptions?.NumCautionLaps ?? 0),
          driverSwap: Boolean(sessionInfo?.WeekendInfo?.WeekendOptions?.DriverChanges ?? 0),
          maxDrivers: Number(sessionInfo?.WeekendInfo?.WeekendOptions?.DriverChanges || 1),
          weather,
          trackLength: weekendInfo.TrackLength || '0 km',
          trackId: weekendInfo.TrackID,
          sessionType,
          carName: activeDriverInfo.CarScreenName || 'Unknown Car',
          rpmRedline: telemetry.DriverCarSLBlinkRPM || 8000,
          fuelTankCapacity: telemetry.DriverCarFuelMaxLit || 20,
          timestamp: now,
          isSpectating,
        });
        console.log('📤 Session metadata emitted', { sessionId, trackName: weekendInfo.TrackDisplayName || weekendInfo.TrackName || 'Unknown Track', sessionType });
        sessionMetadataSent = true;
      }

      // Notify renderer of mode change
      mainWindow?.webContents.send('relay:mode', isSpectating ? 'spectating' : 'driving');

      // Update voice system with telemetry context
      voiceSystem?.updateTelemetry(telemetry);
      
      // Send to renderer for local HUD
      mainWindow?.webContents.send('telemetry', telemetry);

      // Send ALL raw telemetry to server - relay is a dumb pipe
      if (socket?.connected) {
        loggedSocketDisconnected = false;
        const telemetryPayload = buildTelemetryPayload(
          telemetry,
          sessionInfo,
          sessionId,
          now,
          playerCarIdx,
          activeCarIdx,
          isSpectating,
        );
        socket.emit('telemetry', telemetryPayload);
        if (!firstTelemetrySent) {
          firstTelemetrySent = true;
          console.log('📤 First telemetry emitted', {
            sessionId,
            playerCarIdx,
            activeCarIdx,
            isSpectating,
            carCount: telemetryPayload.cars?.length || 0,
          });
        }

        // Send full session info at 1Hz (contains driver info, weekend info, etc.)
        if (now - lastSessionInfoTime > 1000) {
          lastSessionInfoTime = now;
          socket.emit('session_info', {
            sessionId,
            timestamp: now,
            raw: sessionInfo,
          });
        }

        if (sessionInfo && now - lastStandingsTime > 1000) {
          lastStandingsTime = now;
          const standingsPayload = buildStandingsPayload(telemetry, sessionInfo, playerCarIdx);
          socket.emit('standings', {
            sessionId,
            timestamp: now,
            standings: standingsPayload.standings,
            totalCars: standingsPayload.totalCars,
          });
        }

        if (now - lastStrategyRawTime > 1000) {
          lastStrategyRawTime = now;
          const strategyPayload = buildStrategyRawPayload(telemetry, activeCarIdx);
          socket.emit('strategy_raw', {
            sessionId,
            timestamp: now,
            ...strategyPayload,
          });
          if (!firstStrategyRawSent) {
            firstStrategyRawSent = true;
            console.log('📤 First strategy_raw emitted', {
              sessionId,
              activeCarIdx,
              carCount: strategyPayload.cars?.length || 0,
              fuelLevel: strategyPayload.cars?.[0]?.fuelLevel,
              fuelPct: strategyPayload.cars?.[0]?.fuelPct,
              onPitRoad: strategyPayload.cars?.[0]?.onPitRoad,
              lap: strategyPayload.cars?.[0]?.lap,
              position: strategyPayload.cars?.[0]?.position,
            });
          }
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
      } else if (!loggedSocketDisconnected) {
        loggedSocketDisconnected = true;
        console.warn('⚠️ Relay polling skipped because websocket is not connected during emit phase');
      }
    } catch (err) {
      relayPollErrorCount++;
      if (relayPollErrorCount <= 10 || relayPollErrorCount % 50 === 0) {
        const message = err instanceof Error ? err.stack || err.message : String(err);
        console.error('❌ Relay polling error:', message);
      }
    } finally {
      pollInFlight = false;
    }
  }, 250);
}

// Video/Screen Capture Streaming
async function startVideoCapture() {
  if (videoInterval) return; // Already running
  
  // Skip video capture in dev mode — desktopCapturer can crash the GPU process
  if (!app.isPackaged) {
    console.log('🎥 Video capture skipped (dev mode)');
    return;
  }

  const VIDEO_FPS = 15; // 15 fps for streaming
  const VIDEO_QUALITY = 60; // JPEG quality
  let consecutiveErrors = 0;
  
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
        consecutiveErrors = 0;
      }
    } catch (err: any) {
      consecutiveErrors++;
      if (consecutiveErrors <= 3) {
        console.error('Video capture error:', err?.message || err);
      }
      if (consecutiveErrors >= 10) {
        console.warn('🎥 Too many video capture errors, disabling');
        stopVideoCapture();
      }
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
  const voiceStatus = voiceSystem?.getStatus() || { state: 'starting', detail: 'Starting' };
  return {
    iracing: iracingConnected,
    server: socket?.connected || false,
    iracingState: iracingConnected ? 'connected' : 'waiting',
    serverState: socket?.connected ? 'connected' : 'disconnected',
    voiceState: voiceStatus.state,
    voiceDetail: voiceStatus.detail,
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
function resolveVoiceSettings(settings: any) {
  const resolved = settings || {
    audioInput: 'default',
    audioOutput: 'default',
    pttType: 'keyboard',
    pttKey: 'Space',
    joystickId: 0,
    joystickButton: 0,
    crewRole: 'engineer',
  };

  if (!PTT_DISABLED) {
    return resolved;
  }

  return {
    ...resolved,
    pttType: 'disabled',
  };
}

ipcMain.handle('settings:get', () => {
  return resolveVoiceSettings(store.get('voiceSettings'));
});

ipcMain.handle('settings:save', (_event, settings: any) => {
  const resolvedSettings = resolveVoiceSettings(settings);
  store.set('voiceSettings', resolvedSettings);
  // Update voice system with new settings
  if (voiceSystem) {
    voiceSystem.updateConfig(resolvedSettings);
  }
});

// Auth IPC handlers
ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
  try {
    let response: Response;
    try {
      response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('🔐 Supabase login request failed:', message);
      return { success: false, error: `Unable to reach Supabase login service: ${message}` };
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      return { success: false, error: error?.error_description || `Login failed (${response.status})` };
    }
    
    const data = await response.json();
    
    // Check entitlements/tier from server
    let entitlementResponse: Response;
    try {
      entitlementResponse = await fetch(`${SERVER_URL}/api/auth/entitlements`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('🔐 Entitlements request failed:', message);
      return { success: false, error: `Signed in, but could not reach Ok-Box-Box API: ${message}` };
    }
    const entitlementPayload = entitlementResponse.ok ? await entitlementResponse.json() : null;
    const resolvedTier = entitlementPayload?.data?.products?.blackbox?.tier?.toLowerCase?.() || 'free';
    
    const session: UserSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user.id,
      email: data.user.email,
      expiresAt: Date.now() + (data.expires_in * 1000),
      tier: resolvedTier,
    };
    
    store.set('session', session);
    
    // Connect to server with auth
    connectToServer(session.accessToken);
    startIRacingRelay();
    mainWindow?.webContents.send('auth:updated', { loggedIn: true, user: { email: session.email, tier: session.tier } });
    
    return { success: true, user: { email: session.email, tier: session.tier } };
  } catch (err: any) {
    const message = getErrorMessage(err);
    console.error('🔐 Desktop login failed:', message);
    return { success: false, error: message };
  }
});

ipcMain.handle('auth:logout', () => {
  store.delete('session');
  socket?.disconnect();
  mainWindow?.webContents.send('auth:updated', { loggedIn: false });
  return { success: true };
});

ipcMain.handle('auth:check', async () => {
  let session = normalizeStoredSession(store.get('session') as UserSession | undefined);
  if (!session) return { loggedIn: false };
  
  // Check if token expired — try refresh first
  if (Date.now() > session.expiresAt) {
    const refreshed = await refreshSession(session);
    if (refreshed) {
      session = refreshed;
      // Only reconnect if no socket exists (startup handles initial connection)
      if (!socket) connectToServer(session.accessToken);
    } else {
      store.delete('session');
      emitAuthError('Your saved session expired. Please sign in again.');
      return { loggedIn: false, reason: 'expired' };
    }
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
    
    if (!response.ok) {
      emitAuthError('Desktop launch link is invalid, expired, or already used. Please launch again from okboxbox.com.');
      return;
    }
    const data = await response.json() as any;
    const result = data?.data || data;
    
    if (result.accessToken) {
      const session: UserSession = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || '',
        userId: result.user?.id || '',
        email: result.user?.email || '',
        expiresAt: normalizeExpiryTimestamp(result.expiresAt),
        tier: result.tier || 'free',
      };
      store.set('session', session);
      connectToServer(session.accessToken);
      startIRacingRelay();
      mainWindow?.webContents.send('auth:updated', { loggedIn: true, user: { email: session.email, tier: session.tier } });
      console.log(`🔗 Relay linked to ${session.email} via protocol`);
    }
  } catch (err) {
    console.error('Protocol link failed:', err);
    emitAuthError('Desktop launch failed. Check your connection and try launching again.');
  }
}

app.whenReady().then(async () => {
  registerProtocol();
  setupAutoStart();
  createWindow();
  createTray();
  
  // Initialize voice system with saved settings
  const savedVoiceSettings = resolveVoiceSettings(store.get('voiceSettings')) as any;
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
  const session = normalizeStoredSession(store.get('session') as UserSession | undefined);
  console.log('🔐 Session check:', session ? `expires ${new Date(session.expiresAt).toISOString()}` : 'no session');
  if (session && Date.now() < session.expiresAt) {
    console.log('🔐 Valid session found, connecting...');
    connectToServer(session.accessToken);
    startIRacingRelay();
  } else if (session) {
    console.log('🔐 Session expired, attempting refresh...');
    const refreshed = await refreshSession(session);
    if (refreshed) {
      connectToServer(refreshed.accessToken);
      startIRacingRelay();
    } else {
      console.log('🔐 Refresh failed, need to re-login');
      store.delete('session');
      emitAuthError('Your saved session expired. Please sign in again.');
    }
  }
  
  if (!socket && process.env.RELAY_SECRET) {
    console.log('🔌 Using relay secret for hosted desktop auth');
    connectToServer('');
    startIRacingRelay();
  } else if (!socket && !app.isPackaged && isLocalServerUrl(SERVER_URL)) {
    console.log('🔧 DEV MODE: Connecting without auth for local testing...');
    connectToServer('dev-no-auth');
    startIRacingRelay();
  } else if (!socket && !app.isPackaged) {
    console.log('🔐 DEV MODE: Skipping unauthenticated relay bootstrap for non-local server');
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
  if (relayPollInterval) {
    clearInterval(relayPollInterval);
    relayPollInterval = null;
  }
  socket?.disconnect();
});

