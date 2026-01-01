// BlackBox Driver App - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', 
  {
    // Send messages to main process
    send: (channel, data) => {
      // Whitelist channels
      const validChannels = [
        'start-telemetry', 
        'stop-telemetry', 
        'start-video', 
        'stop-video',
        'update-settings',
        'reset-settings',
        'create-driver',
        'update-driver',
        'delete-driver',
        'select-driver',
        'open-log-directory',
        'minimize-window',
        'maximize-window',
        'close-window'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    
    // Receive messages from main process
    receive: (channel, func) => {
      // Whitelist channels
      const validChannels = [
        'status-update',
        'telemetry-update',
        'error',
        'show-settings'
      ];
      
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    // Invoke methods and get responses (promise-based)
    invoke: (channel, data) => {
      // Whitelist channels
      const validChannels = [
        'get-config',
        'get-drivers',
        'get-current-driver',
        'get-version',
        'get-system-info',
        'test-connection'
      ];
      
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  }
);
