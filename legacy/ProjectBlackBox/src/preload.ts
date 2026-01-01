import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Send events to main process
    send: (channel: string, data: any) => {
      // Whitelist channels
      const validChannels = ['update-settings', 'get-status', 'start-telemetry', 'stop-telemetry'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    
    // Receive events from main process
    receive: (channel: string, func: (...args: any[]) => void) => {
      // Whitelist channels
      const validChannels = ['status-update', 'telemetry-update', 'error', 'show-settings'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (_, ...args) => func(...args));
      }
    },
    
    // Request data from main process (invoke)
    invoke: async (channel: string, data: any) => {
      // Whitelist channels
      const validChannels = ['get-config', 'get-drivers', 'get-current-driver'];
      if (validChannels.includes(channel)) {
        return await ipcRenderer.invoke(channel, data);
      }
      return null;
    }
  }
);
