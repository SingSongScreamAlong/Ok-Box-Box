/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */

import { BrowserWindow, globalShortcut } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import HID from 'node-hid';

// We'll use the Web Audio API via the renderer process for recording
// node-hid for background joystick input (works without window focus)
// uiohook-napi for global keyboard detection

interface VoiceConfig {
  pttType: 'keyboard' | 'joystick';
  pttKey: string;
  joystickId: number;
  joystickButton: number;
  serverUrl: string;
}

interface VoiceMessage {
  text: string;
  type: 'sent' | 'received';
}

export class VoiceSystem {
  private config: VoiceConfig;
  private mainWindow: BrowserWindow | null = null;
  private recording = false;
  private audioChunks: Buffer[] = [];
  private pttPressed = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private joystick: any = null;
  private hidDevice: HID.HID | null = null;
  private hidButtonState = false;
  private uiohookStarted = false;
  private socket: any = null;
  private sessionId: string | null = null;
  private telemetryContext: any = {};

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      pttType: config.pttType || 'keyboard',
      pttKey: config.pttKey || 'Space',
      joystickId: config.joystickId || 0,
      joystickButton: config.joystickButton || 0,
      serverUrl: config.serverUrl || 'https://octopus-app-qsi3i.ondigitalocean.app',
    };
  }

  setWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  setSocket(socket: any) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  setSessionId(id: string) {
    this.sessionId = id;
  }

  updateTelemetry(data: any) {
    this.telemetryContext = data;
  }

  updateConfig(settings: Partial<VoiceConfig>) {
    const oldPttType = this.config.pttType;
    
    if (settings.pttType) this.config.pttType = settings.pttType;
    if (settings.pttKey) this.config.pttKey = settings.pttKey;
    if (settings.joystickId !== undefined) this.config.joystickId = settings.joystickId;
    if (settings.joystickButton !== undefined) this.config.joystickButton = settings.joystickButton;
    console.log('🎙️ Voice config updated:', this.config);
    
    // Reinitialize PTT if type changed
    if (settings.pttType && settings.pttType !== oldPttType) {
      // Stop existing hooks
      if (this.hidDevice) {
        try { this.hidDevice.close(); } catch (e) { /* ignore */ }
        this.hidDevice = null;
      }
      if (this.uiohookStarted) {
        uIOhook.stop();
        this.uiohookStarted = false;
      }
      
      // Start new PTT based on type
      if (this.config.pttType === 'keyboard') {
        this.initKeyboardPTT();
      } else if (this.config.pttType === 'joystick') {
        this.initJoystick();
      }
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Listen for TTS audio from server
    this.socket.on('voice:response', (data: { success: boolean; query?: string; response?: string; audioBase64?: string; error?: string }) => {
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
    this.socket.on('voice:proactive', (data: { text: string; audio?: string; role: string }) => {
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
    } else if (this.config.pttType === 'joystick') {
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
      } catch (e) { /* ignore */ }
      this.hidDevice = null;
    }
    if (this.uiohookStarted) {
      uIOhook.stop();
      this.uiohookStarted = false;
    }
    console.log('🎙️ Voice system stopped');
  }

  private async initJoystick() {
    // Use node-hid for background joystick detection (works without window focus)
    console.log(`🎮 Initializing HID joystick PTT: Device ${this.config.joystickId}, Button ${this.config.joystickButton}`);
    
    try {
      const devices = HID.devices();
      
      // Find gaming devices - look for joysticks, gamepads, and wheels
      // UsagePage 1 = Generic Desktop, Usage 4 = Joystick, Usage 5 = Gamepad
      const gamepads = devices.filter(d => 
        d.usagePage === 1 && (d.usage === 4 || d.usage === 5 || d.usage === 8)
      );
      
      // Also look for SIMAGIC specifically by vendor ID
      const simagicDevices = devices.filter(d => 
        d.vendorId === 1155 || // SIMAGIC vendor ID
        (d.product && d.product.toLowerCase().includes('simagic'))
      );
      
      const allGamepads = [...new Map([...gamepads, ...simagicDevices].map(d => [d.path, d])).values()];
      
      console.log(`🎮 Found ${allGamepads.length} HID gamepad(s):`);
      allGamepads.forEach((gp, i) => {
        console.log(`   ${i}: ${gp.product || 'Unknown'} (VID:${gp.vendorId} PID:${gp.productId} Usage:${gp.usage})`);
      });
      
      if (allGamepads.length > this.config.joystickId) {
        const target = allGamepads[this.config.joystickId];
        console.log(`🎮 Opening HID device: ${target.product}`);
        
        try {
          this.hidDevice = new HID.HID(target.path!);
          this.startHIDButtonDetection();
        } catch (openErr) {
          console.error(`🎮 Failed to open HID device: ${openErr}`);
          console.log('🎮 Falling back to renderer Gamepad API (requires window focus)');
        }
      } else {
        console.log('🎮 No HID gamepad found, using renderer Gamepad API (requires window focus)');
      }
    } catch (err) {
      console.error('🎮 HID enumeration error:', err);
    }
  }

  private startHIDButtonDetection() {
    if (!this.hidDevice) return;
    
    // Track state for calibration
    let prevReport: Buffer | null = null;
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
    
    console.log(`🎮 HID button detection started for button ${this.config.joystickButton}`);
    console.log('🎮 Waiting for input to settle, then press PTT button...');
    
    this.hidDevice.on('data', (data: Buffer) => {
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
            } else if (!bitNowOn && candidateByte === i && candidateMask === diff) {
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
        const pressed = (data[buttonByteIndex] & buttonBitMask) !== 0;
        
        if (pressed !== this.hidButtonState) {
          this.hidButtonState = pressed;
          console.log(`🎮 HID PTT: ${pressed ? 'PRESSED' : 'RELEASED'}`);
          this.onPTTStateChange(pressed);
        }
      }
      
      prevReport = Buffer.from(data);
    });
    
    this.hidDevice.on('error', (err: Error) => {
      console.error('🎮 HID error:', err);
    });
  }

  private countBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  private initKeyboardPTT() {
    // Use uiohook for global keyboard detection (works without window focus)
    const keyMap: Record<string, number> = {
      'Space': UiohookKey.Space,
      'F1': UiohookKey.F1,
      'F2': UiohookKey.F2,
      'F3': UiohookKey.F3,
      'F4': UiohookKey.F4,
      'F5': UiohookKey.F5,
      'CapsLock': UiohookKey.CapsLock,
      'Tab': UiohookKey.Tab,
      'Backquote': UiohookKey.Backquote,
    };

    const targetKey = keyMap[this.config.pttKey] || UiohookKey.Space;
    console.log(`🎤 Keyboard PTT: ${this.config.pttKey} (global, works without focus)`);

    uIOhook.on('keydown', (e) => {
      if (e.keycode === targetKey && !this.pttPressed) {
        console.log(`🎤 PTT Key DOWN: ${this.config.pttKey}`);
        this.onPTTStateChange(true);
      }
    });

    uIOhook.on('keyup', (e) => {
      if (e.keycode === targetKey && this.pttPressed) {
        console.log(`🎤 PTT Key UP: ${this.config.pttKey}`);
        this.onPTTStateChange(false);
      }
    });

    uIOhook.start();
    this.uiohookStarted = true;
    console.log('🎤 Global keyboard hook started');
  }

  private pollPTT() {
    // HID polling is event-driven via startHIDPolling()
    // Renderer gamepad API is backup for when HID doesn't work
  }

  // Called from renderer when PTT state changes
  onPTTStateChange(pressed: boolean) {
    if (pressed && !this.pttPressed) {
      // PTT pressed - start recording
      this.pttPressed = true;
      this.startRecording();
    } else if (!pressed && this.pttPressed) {
      // PTT released - stop recording and process
      this.pttPressed = false;
      this.stopRecording();
    }
  }

  private startRecording() {
    this.recording = true;
    this.audioChunks = [];
    console.log('🎤 Recording started...');
    
    // Tell renderer to start capturing audio
    this.mainWindow?.webContents.send('voice:startRecording');
  }

  private stopRecording() {
    this.recording = false;
    console.log('🎤 Recording stopped, processing...');
    
    // Tell renderer to stop and send audio
    this.mainWindow?.webContents.send('voice:stopRecording');
  }

  // Called from renderer with recorded audio
  async processAudio(audioBuffer: Buffer) {
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

    } catch (err) {
      console.error('Voice processing error:', err);
    }
  }

  private async playAudioBase64(base64Audio: string) {
    // Send to renderer for playback
    this.mainWindow?.webContents.send('voice:playAudio', base64Audio);
  }

  private sendToRenderer(message: VoiceMessage) {
    this.mainWindow?.webContents.send('message', message);
  }
}
