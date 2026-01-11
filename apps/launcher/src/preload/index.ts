import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // License
  getLicense: () => ipcRenderer.invoke('get-license'),
  setLicense: (license: unknown) => ipcRenderer.invoke('set-license', license),
  validateLicense: (data: { licenseKey?: string; machineId: string }) => 
    ipcRenderer.invoke('validate-license', data),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('set-settings', settings),

  // Relay
  startRelay: () => ipcRenderer.invoke('start-relay'),
  stopRelay: () => ipcRenderer.invoke('stop-relay'),
  getRelayStatus: () => ipcRenderer.invoke('get-relay-status'),
  onRelayLog: (callback: (log: { level: string; message: string }) => void) => {
    ipcRenderer.on('relay-log', (_event, log) => callback(log));
  },
  onRelayStatus: (callback: (status: { running: boolean; exitCode?: number }) => void) => {
    ipcRenderer.on('relay-status', (_event, status) => callback(status));
  },

  // Apps
  openApp: (appName: string) => ipcRenderer.invoke('open-app', appName),

  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
});
