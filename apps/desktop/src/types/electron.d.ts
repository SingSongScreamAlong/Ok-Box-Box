interface ElectronAPI {
  // Auth
  login: (email: string, password: string) => Promise<{ success: boolean; user?: { email: string; tier: string }; error?: string }>;
  logout: () => Promise<{ success: boolean }>;
  checkAuth: () => Promise<{ loggedIn: boolean; user?: { email: string; tier: string }; reason?: string }>;
  
  // Status
  getStatus: () => Promise<{ iracing: boolean; server: boolean }>;
  
  // Event listeners
  onTelemetry: (callback: (data: any) => void) => void;
  onSession: (callback: (data: any) => void) => void;
  onRelayStatus: (callback: (status: string) => void) => void;
  onIRacingStatus: (callback: (status: string) => void) => void;
  onRelayMode: (callback: (mode: string) => void) => void;
  onMessage: (callback: (msg: { text: string; type: 'sent' | 'received' }) => void) => void;
  
  // Voice
  sendPTTState: (pressed: boolean) => void;
  sendAudioData: (audioBuffer: ArrayBuffer) => void;
  onStartRecording: (callback: () => void) => void;
  onStopRecording: (callback: () => void) => void;
  onPlayAudio: (callback: (base64Audio: string) => void) => void;
  
  // Settings
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openWebsite: () => void;
  
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
