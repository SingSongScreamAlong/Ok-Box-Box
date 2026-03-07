"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods to renderer
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    login: (email, password) => electron_1.ipcRenderer.invoke('auth:login', email, password),
    logout: () => electron_1.ipcRenderer.invoke('auth:logout'),
    checkAuth: () => electron_1.ipcRenderer.invoke('auth:check'),
    // Status
    getStatus: () => electron_1.ipcRenderer.invoke('get-status'),
    // Event listeners
    onTelemetry: (callback) => {
        electron_1.ipcRenderer.on('telemetry', (_event, data) => callback(data));
    },
    onSession: (callback) => {
        electron_1.ipcRenderer.on('session', (_event, data) => callback(data));
    },
    onRelayStatus: (callback) => {
        electron_1.ipcRenderer.on('relay:status', (_event, status) => callback(status));
    },
    onIRacingStatus: (callback) => {
        electron_1.ipcRenderer.on('iracing:status', (_event, status) => callback(status));
    },
    onMessage: (callback) => {
        electron_1.ipcRenderer.on('message', (_event, msg) => callback(msg));
    },
    // Voice
    sendPTTState: (pressed) => electron_1.ipcRenderer.send('voice:pttState', pressed),
    sendAudioData: (audioBuffer) => electron_1.ipcRenderer.send('voice:audioData', Buffer.from(audioBuffer)),
    onStartRecording: (callback) => {
        electron_1.ipcRenderer.on('voice:startRecording', () => callback());
    },
    onStopRecording: (callback) => {
        electron_1.ipcRenderer.on('voice:stopRecording', () => callback());
    },
    onPlayAudio: (callback) => {
        electron_1.ipcRenderer.on('voice:playAudio', (_event, audio) => callback(audio));
    },
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('settings:get'),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('settings:save', settings),
    // Relay mode (driving vs spectating)
    onRelayMode: (callback) => {
        electron_1.ipcRenderer.on('relay:mode', (_event, mode) => callback(mode));
    },
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.send('window:minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window:maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window:close'),
    openWebsite: () => electron_1.ipcRenderer.send('open:website'),
    // Remove listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
});
