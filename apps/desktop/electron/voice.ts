/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */

import { BrowserWindow } from 'electron';
import HID from 'node-hid';

// We'll use the Web Audio API via the renderer process for recording
// and node-hid for background joystick input (works without window focus)

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
    if (settings.pttType) this.config.pttType = settings.pttType;
    if (settings.pttKey) this.config.pttKey = settings.pttKey;
    if (settings.joystickId !== undefined) this.config.joystickId = settings.joystickId;
    if (settings.joystickButton !== undefined) this.config.joystickButton = settings.joystickButton;
    console.log('🎙️ Voice config updated:', this.config);
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
    if (this.hidDevice) {
      this.hidDevice.close();
      this.hidDevice = null;
    }
    console.log('🎙️ Voice system stopped');
  }

  private async initJoystick() {
    // Use node-hid for background joystick detection (works without window focus)
    console.log(`🎮 Initializing joystick PTT: Device ${this.config.joystickId}, Button ${this.config.joystickButton}`);
    
    try {
      const devices = HID.devices();
      const gamepads = devices.filter(d => 
        d.usagePage === 1 && (d.usage === 4 || d.usage === 5) // Joystick or Gamepad
      );
      
      console.log(`🎮 Found ${gamepads.length} HID gamepad(s):`);
      gamepads.forEach((gp, i) => {
        console.log(`   ${i}: ${gp.product} (VID:${gp.vendorId} PID:${gp.productId})`);
      });
      
      if (gamepads.length > this.config.joystickId) {
        const target = gamepads[this.config.joystickId];
        console.log(`🎮 Opening: ${target.product}`);
        this.hidDevice = new HID.HID(target.path!);
        
        // Start polling HID device for button state
        this.startHIDPolling();
      } else {
        console.log('🎮 No matching gamepad found, falling back to renderer gamepad API');
      }
    } catch (err) {
      console.error('🎮 HID init error:', err);
    }
  }

  private startHIDPolling() {
    if (!this.hidDevice) return;
    
    // Read HID data asynchronously
    this.hidDevice.on('data', (data: Buffer) => {
      // HID button data varies by device - typically buttons are in bytes 5-6
      // For SIMAGIC, we need to find the right byte/bit for button 9
      // Button 9 would be bit 1 of byte 2 (0-indexed) for many devices
      const buttonByte = Math.floor(this.config.joystickButton / 8);
      const buttonBit = this.config.joystickButton % 8;
      
      // Offset by typical header bytes (varies by device)
      const dataOffset = 5; // Common offset for button data
      const byteIndex = dataOffset + buttonByte;
      
      if (byteIndex < data.length) {
        const pressed = (data[byteIndex] & (1 << buttonBit)) !== 0;
        
        if (pressed !== this.pttPressed) {
          console.log(`🎮 HID PTT Button ${this.config.joystickButton}: ${pressed ? 'PRESSED' : 'RELEASED'}`);
          this.onPTTStateChange(pressed);
        }
      }
    });
    
    this.hidDevice.on('error', (err: Error) => {
      console.error('🎮 HID error:', err);
    });
    
    console.log('🎮 HID polling started');
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
