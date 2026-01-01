/**
 * Preload Script
 * 
 * Exposes safe IPC methods to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    login: (email: string, password: string) =>
        ipcRenderer.invoke('auth:login', email, password),
    logout: () =>
        ipcRenderer.invoke('auth:logout'),
    getBootstrap: () =>
        ipcRenderer.invoke('auth:getBootstrap'),

    // Relay status
    getRelayStatus: () =>
        ipcRenderer.invoke('relay:status'),

    // Events from main process
    onStatusChange: (callback: (status: any) => void) => {
        ipcRenderer.on('relay:statusChange', (_, status) => callback(status));
    },

    // HUD events
    onHUDUpdate: (callback: (data: any) => void) => {
        ipcRenderer.on('hud:update', (_, data) => callback(data));
    },
    onCoachingMessage: (callback: (data: { message: string; type: string }) => void) => {
        ipcRenderer.on('hud:coaching', (_, data) => callback(data));
    }
});

