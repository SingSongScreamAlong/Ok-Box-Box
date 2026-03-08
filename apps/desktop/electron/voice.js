"use strict";
/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceSystem = void 0;
const uiohook_napi_1 = require("uiohook-napi");
const node_hid_1 = __importDefault(require("node-hid"));
class VoiceSystem {
    config;
    mainWindow = null;
    recording = false;
    audioChunks = [];
    pttPressed = false;
    pollInterval = null;
    joystick = null;
    hidDevice = null;
    hidButtonState = false;
    uiohookStarted = false;
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
        const oldPttType = this.config.pttType;
        if (settings.pttType)
            this.config.pttType = settings.pttType;
        if (settings.pttKey)
            this.config.pttKey = settings.pttKey;
        if (settings.joystickId !== undefined)
            this.config.joystickId = settings.joystickId;
        if (settings.joystickButton !== undefined)
            this.config.joystickButton = settings.joystickButton;
        console.log('🎙️ Voice config updated:', this.config);
        // Reinitialize PTT if type changed
        if (settings.pttType && settings.pttType !== oldPttType) {
            // Stop existing hooks
            if (this.hidDevice) {
                try {
                    this.hidDevice.close();
                }
                catch (e) { /* ignore */ }
                this.hidDevice = null;
            }
            if (this.uiohookStarted) {
                uiohook_napi_1.uIOhook.stop();
                this.uiohookStarted = false;
            }
            // Start new PTT based on type
            if (this.config.pttType === 'keyboard') {
                this.initKeyboardPTT();
            }
            else if (this.config.pttType === 'joystick') {
                this.initJoystick();
            }
        }
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
        // Initialize PTT based on type
        if (this.config.pttType === 'keyboard') {
            this.initKeyboardPTT();
        }
        else if (this.config.pttType === 'joystick') {
            await this.initJoystick();
        }
        console.log(`✅ Voice system ready (PTT: ${this.config.pttType})`);
    }
    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.hidDevice) {
            try {
                this.hidDevice.close();
            }
            catch (e) { /* ignore */ }
            this.hidDevice = null;
        }
        if (this.uiohookStarted) {
            uiohook_napi_1.uIOhook.stop();
            this.uiohookStarted = false;
        }
        console.log('🎙️ Voice system stopped');
    }
    async initJoystick() {
        // Use node-hid for background joystick detection (works without window focus)
        console.log(`🎮 Initializing HID joystick PTT: Device ${this.config.joystickId}, Button ${this.config.joystickButton}`);
        try {
            const devices = node_hid_1.default.devices();
            // Find gaming devices - look for joysticks, gamepads, and wheels
            // UsagePage 1 = Generic Desktop, Usage 4 = Joystick, Usage 5 = Gamepad
            const gamepads = devices.filter(d => d.usagePage === 1 && (d.usage === 4 || d.usage === 5 || d.usage === 8));
            // Also look for SIMAGIC specifically by vendor ID
            const simagicDevices = devices.filter(d => d.vendorId === 1155 || // SIMAGIC vendor ID
                (d.product && d.product.toLowerCase().includes('simagic')));
            const allGamepads = [...new Map([...gamepads, ...simagicDevices].map(d => [d.path, d])).values()];
            console.log(`🎮 Found ${allGamepads.length} HID gamepad(s):`);
            allGamepads.forEach((gp, i) => {
                console.log(`   ${i}: ${gp.product || 'Unknown'} (VID:${gp.vendorId} PID:${gp.productId} Usage:${gp.usage})`);
            });
            if (allGamepads.length > this.config.joystickId) {
                const target = allGamepads[this.config.joystickId];
                console.log(`🎮 Opening HID device: ${target.product}`);
                try {
                    this.hidDevice = new node_hid_1.default.HID(target.path);
                    this.startHIDButtonDetection();
                }
                catch (openErr) {
                    console.error(`🎮 Failed to open HID device: ${openErr}`);
                    console.log('🎮 Falling back to renderer Gamepad API (requires window focus)');
                }
            }
            else {
                console.log('🎮 No HID gamepad found, using renderer Gamepad API (requires window focus)');
            }
        }
        catch (err) {
            console.error('🎮 HID enumeration error:', err);
        }
    }
    startHIDButtonDetection() {
        if (!this.hidDevice)
            return;
        // Track state for calibration
        let prevReport = null;
        let calibrated = false;
        let buttonByteIndex = -1;
        let buttonBitMask = 0;
        // For calibration: track candidate buttons that toggled on, waiting for toggle off
        let candidateByte = -1;
        let candidateMask = 0;
        let candidateOnTime = 0;
        // Skip first N reports to let axes settle
        let reportCount = 0;
        const SETTLE_REPORTS = 20;
        // Debounce: ignore state changes within this window
        let lastStateChangeTime = 0;
        const DEBOUNCE_MS = 300;
        // Require minimum hold time to confirm press (filters noise)
        let pressStartTime = 0;
        const MIN_HOLD_MS = 150;
        // Track consecutive samples to confirm stable state
        let consecutivePressed = 0;
        let consecutiveReleased = 0;
        const STABLE_SAMPLES = 5;
        console.log(`🎮 HID button detection started for button ${this.config.joystickButton}`);
        console.log('🎮 Waiting for input to settle, then press PTT button...');
        this.hidDevice.on('data', (data) => {
            reportCount++;
            // Let the device settle before calibrating
            if (reportCount < SETTLE_REPORTS) {
                prevReport = Buffer.from(data);
                return;
            }
            if (reportCount === SETTLE_REPORTS) {
                console.log('🎮 Ready! Press and RELEASE the PTT button to calibrate...');
            }
            if (!calibrated && prevReport) {
                // Look for single-bit changes (buttons, not axes)
                for (let i = 0; i < Math.min(data.length, prevReport.length); i++) {
                    const diff = data[i] ^ prevReport[i];
                    if (diff !== 0 && this.countBits(diff) === 1) {
                        const bitNowOn = (data[i] & diff) !== 0;
                        if (bitNowOn && candidateByte < 0) {
                            // Button pressed - record as candidate
                            candidateByte = i;
                            candidateMask = diff;
                            candidateOnTime = Date.now();
                        }
                        else if (!bitNowOn && candidateByte === i && candidateMask === diff) {
                            // Same bit released - this is a real button!
                            const holdTime = Date.now() - candidateOnTime;
                            if (holdTime > 50 && holdTime < 5000) {
                                // Valid button press/release cycle
                                buttonByteIndex = i;
                                buttonBitMask = diff;
                                calibrated = true;
                                console.log(`🎮 Calibrated! PTT = byte ${i}, mask 0x${diff.toString(16)} (held ${holdTime}ms)`);
                            }
                            candidateByte = -1;
                            candidateMask = 0;
                        }
                    }
                }
                // Reset candidate if held too long (probably not a button)
                if (candidateByte >= 0 && Date.now() - candidateOnTime > 5000) {
                    candidateByte = -1;
                    candidateMask = 0;
                }
            }
            if (calibrated && buttonByteIndex >= 0) {
                const rawPressed = (data[buttonByteIndex] & buttonBitMask) !== 0;
                const now = Date.now();
                // Track consecutive samples for stability
                if (rawPressed) {
                    consecutivePressed++;
                    consecutiveReleased = 0;
                }
                else {
                    consecutiveReleased++;
                    consecutivePressed = 0;
                }
                // Track when button first appears pressed
                if (rawPressed && pressStartTime === 0) {
                    pressStartTime = now;
                }
                else if (!rawPressed) {
                    pressStartTime = 0;
                }
                // Only consider it pressed if held for MIN_HOLD_MS AND stable for STABLE_SAMPLES
                const stablePressed = rawPressed &&
                    (now - pressStartTime) >= MIN_HOLD_MS &&
                    consecutivePressed >= STABLE_SAMPLES;
                const stableReleased = !rawPressed && consecutiveReleased >= STABLE_SAMPLES;
                // Only change state if we have stable readings
                if (stablePressed && !this.hidButtonState && (now - lastStateChangeTime) > DEBOUNCE_MS) {
                    this.hidButtonState = true;
                    lastStateChangeTime = now;
                    console.log(`🎮 HID PTT: PRESSED`);
                    this.onPTTStateChange(true);
                }
                else if (stableReleased && this.hidButtonState && (now - lastStateChangeTime) > DEBOUNCE_MS) {
                    this.hidButtonState = false;
                    lastStateChangeTime = now;
                    console.log(`🎮 HID PTT: RELEASED`);
                    this.onPTTStateChange(false);
                }
            }
            prevReport = Buffer.from(data);
        });
        this.hidDevice.on('error', (err) => {
            console.error('🎮 HID error:', err);
        });
    }
    countBits(n) {
        let count = 0;
        while (n) {
            count += n & 1;
            n >>= 1;
        }
        return count;
    }
    initKeyboardPTT() {
        // Use uiohook for global keyboard detection (works without window focus)
        const keyMap = {
            'Space': uiohook_napi_1.UiohookKey.Space,
            'F1': uiohook_napi_1.UiohookKey.F1,
            'F2': uiohook_napi_1.UiohookKey.F2,
            'F3': uiohook_napi_1.UiohookKey.F3,
            'F4': uiohook_napi_1.UiohookKey.F4,
            'F5': uiohook_napi_1.UiohookKey.F5,
            'CapsLock': uiohook_napi_1.UiohookKey.CapsLock,
            'Tab': uiohook_napi_1.UiohookKey.Tab,
            'Backquote': uiohook_napi_1.UiohookKey.Backquote,
        };
        const targetKey = keyMap[this.config.pttKey] || uiohook_napi_1.UiohookKey.Space;
        console.log(`🎤 Keyboard PTT: ${this.config.pttKey} (global, works without focus)`);
        uiohook_napi_1.uIOhook.on('keydown', (e) => {
            if (e.keycode === targetKey && !this.pttPressed) {
                console.log(`🎤 PTT Key DOWN: ${this.config.pttKey}`);
                this.onPTTStateChange(true);
            }
        });
        uiohook_napi_1.uIOhook.on('keyup', (e) => {
            if (e.keycode === targetKey && this.pttPressed) {
                console.log(`🎤 PTT Key UP: ${this.config.pttKey}`);
                this.onPTTStateChange(false);
            }
        });
        uiohook_napi_1.uIOhook.start();
        this.uiohookStarted = true;
        console.log('🎤 Global keyboard hook started');
    }
    pollPTT() {
        // HID polling is event-driven via startHIDPolling()
        // Renderer gamepad API is backup for when HID doesn't work
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
    async processAudio(audioBuffer, mimeType = 'audio/webm') {
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
            const normalizedMimeType = mimeType.toLowerCase();
            const format = normalizedMimeType.includes('wav')
                ? 'wav'
                : normalizedMimeType.includes('ogg') || normalizedMimeType.includes('oga')
                    ? 'ogg'
                    : 'webm';
            // Send raw audio to server — server handles STT (Whisper) + AI + TTS (ElevenLabs)
            this.socket.emit('voice:query', {
                audio: audioBuffer.toString('base64'),
                format,
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
