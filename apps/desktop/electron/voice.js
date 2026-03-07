"use strict";
/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceSystem = void 0;
class VoiceSystem {
    config;
    mainWindow = null;
    recording = false;
    audioChunks = [];
    pttPressed = false;
    pollInterval = null;
    joystick = null;
    socket = null;
    sessionId = null;
    telemetryContext = {};
    constructor(config = {}) {
        this.config = {
            pttType: config.pttType || 'keyboard',
            pttKey: config.pttKey || 'Space',
            joystickId: config.joystickId || 0,
            joystickButton: config.joystickButton || 0,
            serverUrl: config.serverUrl || 'https://octopus-app-qsi3i.ondigitalocean.app',
        };
    }
    setWindow(window) {
        this.mainWindow = window;
    }
    setSocket(socket) {
        this.socket = socket;
        this.setupSocketListeners();
    }
    setSessionId(id) {
        this.sessionId = id;
    }
    updateTelemetry(data) {
        this.telemetryContext = data;
    }
    updateConfig(settings) {
        if (settings.pttType)
            this.config.pttType = settings.pttType;
        if (settings.pttKey)
            this.config.pttKey = settings.pttKey;
        if (settings.joystickId !== undefined)
            this.config.joystickId = settings.joystickId;
        if (settings.joystickButton !== undefined)
            this.config.joystickButton = settings.joystickButton;
        console.log('🎙️ Voice config updated:', this.config);
    }
    setupSocketListeners() {
        if (!this.socket)
            return;
        // Listen for TTS audio from server
        this.socket.on('voice:response', (data) => {
            if (!data.success) {
                console.error('Voice response error:', data.error);
                this.sendToRenderer({ text: `Error: ${data.error || 'Unknown error'}`, type: 'received' });
                return;
            }
            if (data.response) {
                this.sendToRenderer({ text: data.response, type: 'received' });
            }
            if (data.audioBase64) {
                this.playAudioBase64(data.audioBase64);
            }
        });
        // Listen for proactive messages (spotter, engineer alerts)
        this.socket.on('voice:proactive', (data) => {
            this.sendToRenderer({ text: `[${data.role}] ${data.text}`, type: 'received' });
            if (data.audio) {
                this.playAudioBase64(data.audio);
            }
        });
    }
    async start() {
        console.log('🎙️ Voice system starting...');
        // Start PTT polling
        this.pollInterval = setInterval(() => this.pollPTT(), 10);
        // Initialize joystick if needed
        if (this.config.pttType === 'joystick') {
            await this.initJoystick();
        }
        console.log(`✅ Voice system ready (PTT: ${this.config.pttType})`);
    }
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        console.log('🎙️ Voice system stopped');
    }
    async initJoystick() {
        // For Electron, we can use the Gamepad API via the renderer
        // or use a native module like node-hid
        // For now, we'll request gamepad state from renderer
        console.log(`Joystick PTT: Device ${this.config.joystickId}, Button ${this.config.joystickButton}`);
    }
    pollPTT() {
        // For keyboard PTT, we need to check via renderer (globalShortcut doesn't work for held keys)
        // For joystick, we poll gamepad state
        // This will be handled via IPC from renderer
    }
    // Called from renderer when PTT state changes
    onPTTStateChange(pressed) {
        if (pressed && !this.pttPressed) {
            // PTT pressed - start recording
            this.pttPressed = true;
            this.startRecording();
        }
        else if (!pressed && this.pttPressed) {
            // PTT released - stop recording and process
            this.pttPressed = false;
            this.stopRecording();
        }
    }
    startRecording() {
        this.recording = true;
        this.audioChunks = [];
        console.log('🎤 Recording started...');
        // Tell renderer to start capturing audio
        this.mainWindow?.webContents.send('voice:startRecording');
    }
    stopRecording() {
        this.recording = false;
        console.log('🎤 Recording stopped, processing...');
        // Tell renderer to stop and send audio
        this.mainWindow?.webContents.send('voice:stopRecording');
    }
    // Called from renderer with recorded audio
    async processAudio(audioBuffer) {
        if (audioBuffer.length < 1000) {
            console.log('Recording too short, ignored');
            return;
        }
        if (!this.socket?.connected) {
            console.error('Not connected to server');
            return;
        }
        try {
            console.log(`🎤 Sending ${audioBuffer.length} bytes to server for processing...`);
            // Send raw audio to server — server handles STT (Whisper) + AI + TTS (ElevenLabs)
            this.socket.emit('voice:query', {
                audio: audioBuffer.toString('base64'),
                format: 'webm',
            });
        }
        catch (err) {
            console.error('Voice processing error:', err);
        }
    }
    async playAudioBase64(base64Audio) {
        // Send to renderer for playback
        this.mainWindow?.webContents.send('voice:playAudio', base64Audio);
    }
    sendToRenderer(message) {
        this.mainWindow?.webContents.send('message', message);
    }
}
exports.VoiceSystem = VoiceSystem;
