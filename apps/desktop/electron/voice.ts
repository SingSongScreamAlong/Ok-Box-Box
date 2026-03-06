/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */

import { BrowserWindow } from 'electron';

// We'll use the Web Audio API via the renderer process for recording
// and node-based solutions for joystick input

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
    console.log('🎙️ Voice system stopped');
  }

  private async initJoystick() {
    // For Electron, we can use the Gamepad API via the renderer
    // or use a native module like node-hid
    // For now, we'll request gamepad state from renderer
    console.log(`Joystick PTT: Device ${this.config.joystickId}, Button ${this.config.joystickButton}`);
  }

  private pollPTT() {
    // For keyboard PTT, we need to check via renderer (globalShortcut doesn't work for held keys)
    // For joystick, we poll gamepad state
    // This will be handled via IPC from renderer
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
