import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkAuth: () => ipcRenderer.invoke('auth:check'),

  // Status
  getStatus: () => ipcRenderer.invoke('get-status'),

  // Event listeners
  onTelemetry: (callback: (data: any) => void) => {
    ipcRenderer.on('telemetry', (_event: any, data: any) => callback(data));
  },
  onSession: (callback: (data: any) => void) => {
    ipcRenderer.on('session', (_event: any, data: any) => callback(data));
  },
  onAuthUpdated: (callback: (auth: { loggedIn: boolean; user?: { email: string; tier: string } }) => void) => {
    ipcRenderer.on('auth:updated', (_event: any, auth: { loggedIn: boolean; user?: { email: string; tier: string } }) => callback(auth));
  },
  onAuthError: (callback: (message: string) => void) => {
    ipcRenderer.on('auth:error', (_event: any, message: string) => callback(message));
  },
  onRelayStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('relay:status', (_event: any, status: string) => callback(status));
  },
  onIRacingStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('iracing:status', (_event: any, status: string) => callback(status));
  },
  onVoiceStatus: (callback: (status: { state: 'starting' | 'ready' | 'fallback' | 'listening' | 'processing' | 'error'; detail: string }) => void) => {
    ipcRenderer.on('voice:status', (_event: any, status: { state: 'starting' | 'ready' | 'fallback' | 'listening' | 'processing' | 'error'; detail: string }) => callback(status));
  },
  onMessage: (callback: (msg: { text: string; type: 'sent' | 'received' }) => void) => {
    ipcRenderer.on('message', (_event: any, msg: any) => callback(msg));
  },

  // Voice
  sendPTTState: (pressed: boolean) => ipcRenderer.send('voice:pttState', pressed),
  sendAudioData: (audioBuffer: ArrayBuffer, mimeType: string) => ipcRenderer.send('voice:audioData', Buffer.from(audioBuffer), mimeType),
  onStartRecording: (callback: () => void) => {
    ipcRenderer.on('voice:startRecording', () => callback());
  },
  onStopRecording: (callback: () => void) => {
    ipcRenderer.on('voice:stopRecording', () => callback());
  },
  onPlayAudio: (callback: (base64Audio: string) => void) => {
    ipcRenderer.on('voice:playAudio', (_event: any, audio: string) => callback(audio));
  },
  onStopAudio: (callback: () => void) => {
    ipcRenderer.on('voice:stopAudio', () => callback());
  },
  onPTTFallbackMode: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('voice:pttFallbackMode', (_event: any, enabled: boolean) => callback(enabled));
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),

  // Relay mode (driving vs spectating)
  onRelayMode: (callback: (mode: string) => void) => {
    ipcRenderer.on('relay:mode', (_event: any, mode: string) => callback(mode));
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  openWebsite: () => ipcRenderer.send('open:website'),

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI: {
      getStatus: () => Promise<{
        iracing: boolean;
        server: boolean;
        iracingState: 'connected' | 'waiting' | 'disconnected';
        serverState: 'connected' | 'disconnected' | 'error';
        voiceState: 'starting' | 'ready' | 'fallback' | 'listening' | 'processing' | 'error';
        voiceDetail: string;
      }>;
      onTelemetry: (callback: (data: any) => void) => void;
      onSession: (callback: (data: any) => void) => void;
      onAuthUpdated: (callback: (auth: { loggedIn: boolean; user?: { email: string; tier: string } }) => void) => void;
      onAuthError: (callback: (message: string) => void) => void;
      onRelayStatus: (callback: (status: string) => void) => void;
      onIRacingStatus: (callback: (status: string) => void) => void;
      onVoiceStatus: (callback: (status: { state: 'starting' | 'ready' | 'fallback' | 'listening' | 'processing' | 'error'; detail: string }) => void) => void;
      onMessage: (callback: (msg: { text: string; type: 'sent' | 'received' }) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
