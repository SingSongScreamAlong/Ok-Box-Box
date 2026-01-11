/**
 * Voice Service for AI Engineer Push-to-Talk
 * Handles voice capture, encoding, and transmission to team/driver
 */

import webSocketService from './WebSocketService';

export interface VoiceSettings {
  pttKey: string;
  inputDevice: string;
  outputDevice: string;
  volume: number;
  noiseGate: number;
}

export interface VoiceMessage {
  id: string;
  from: string;
  timestamp: number;
  duration: number;
  audioData?: ArrayBuffer;
}

type VoiceEventCallback = (data: unknown) => void;

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private isPTTActive = false;
  private pttKey = 'KeyT'; // Default PTT key
  private listeners: Map<string, Set<VoiceEventCallback>> = new Map();
  private messageId: string | null = null;
  
  private settings: VoiceSettings = {
    pttKey: 'KeyT',
    inputDevice: 'default',
    outputDevice: 'default',
    volume: 100,
    noiseGate: 10,
  };

  async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext();
      
      // Setup keyboard listeners for PTT
      this.setupKeyboardListeners();
      
      console.log('VoiceService initialized');
      return true;
    } catch (err) {
      console.error('Failed to initialize VoiceService:', err);
      return false;
    }
  }

  private setupKeyboardListeners(): void {
    // PTT key down - start recording
    window.addEventListener('keydown', (e) => {
      if (e.code === this.pttKey && !e.repeat && !this.isPTTActive) {
        e.preventDefault();
        this.startPTT();
      }
    });

    // PTT key up - stop recording
    window.addEventListener('keyup', (e) => {
      if (e.code === this.pttKey && this.isPTTActive) {
        e.preventDefault();
        this.stopPTT();
      }
    });
  }

  setPTTKey(keyCode: string): void {
    this.pttKey = keyCode;
    this.settings.pttKey = keyCode;
    this.emit('settings_changed', this.settings);
  }

  getPTTKey(): string {
    return this.pttKey;
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.pttKey) {
      this.pttKey = newSettings.pttKey;
    }
    this.emit('settings_changed', this.settings);
  }

  private async startPTT(): Promise<void> {
    if (!this.mediaStream || this.isRecording) return;

    this.isPTTActive = true;
    this.isRecording = true;
    this.audioChunks = [];
    this.messageId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Notify listeners that PTT started
    this.emit('ptt_start', { messageId: this.messageId });

    // Notify backend that voice transmission is starting
    const socket = webSocketService.getSocket();
    if (socket) {
      socket.emit('engineer:voice:start', {
        messageId: this.messageId,
        timestamp: Date.now(),
      });
    }

    // Create MediaRecorder for capturing audio
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        
        // Stream audio chunks to backend in real-time
        this.sendAudioChunk(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.finalizeRecording();
    };

    // Record in small chunks for real-time streaming
    this.mediaRecorder.start(100); // 100ms chunks
    
    console.log('PTT started - recording voice');
  }

  private async stopPTT(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.isPTTActive = false;
    this.isRecording = false;

    // Stop the recorder (triggers onstop)
    this.mediaRecorder.stop();
    
    console.log('PTT stopped');
  }

  private async sendAudioChunk(chunk: Blob): Promise<void> {
    const socket = webSocketService.getSocket();
    if (!socket || !this.messageId) return;

    // Convert blob to ArrayBuffer for transmission
    const arrayBuffer = await chunk.arrayBuffer();
    
    socket.emit('engineer:voice:chunk', {
      messageId: this.messageId,
      chunk: arrayBuffer,
      timestamp: Date.now(),
    });
  }

  private async finalizeRecording(): Promise<void> {
    const socket = webSocketService.getSocket();
    
    // Create final audio blob
    const audioBlob = new Blob(this.audioChunks, { 
      type: this.getSupportedMimeType() 
    });
    
    const duration = this.audioChunks.length * 100; // Approximate duration in ms

    // Notify backend that voice transmission ended
    if (socket && this.messageId) {
      socket.emit('engineer:voice:end', {
        messageId: this.messageId,
        duration,
        timestamp: Date.now(),
      });
    }

    // Emit local event
    this.emit('ptt_end', {
      messageId: this.messageId,
      duration,
      audioBlob,
    });

    // Reset state
    this.messageId = null;
    this.audioChunks = [];
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm';
  }

  // Play received voice message
  async playVoiceMessage(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Apply volume
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.settings.volume / 100;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (err) {
      console.error('Failed to play voice message:', err);
    }
  }

  // Get available audio devices
  async getAudioDevices(): Promise<{ inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[] }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      inputs: devices.filter(d => d.kind === 'audioinput'),
      outputs: devices.filter(d => d.kind === 'audiooutput'),
    };
  }

  // Event handling
  on(event: string, callback: VoiceEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  isActive(): boolean {
    return this.isPTTActive;
  }

  // Text-to-speech for AI engineer messages
  private speechSynthesis: SpeechSynthesis | null = null;
  private speechQueue: string[] = [];
  private isSpeaking = false;

  speak(text: string, priority: 'high' | 'normal' = 'normal'): void {
    if (!this.speechSynthesis) {
      this.speechSynthesis = window.speechSynthesis;
    }

    if (priority === 'high') {
      // Cancel current speech and speak immediately
      this.speechSynthesis.cancel();
      this.speechQueue = [];
      this.speakNow(text);
    } else {
      // Add to queue
      this.speechQueue.push(text);
      this.processQueue();
    }
  }

  private speakNow(text: string): void {
    if (!this.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for racing context
    utterance.pitch = 0.9; // Slightly lower for professional sound
    utterance.volume = this.settings.volume / 100;

    // Try to find a good voice
    const voices = this.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Daniel') || 
      v.name.includes('Google UK English Male') ||
      v.name.includes('Microsoft David') ||
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.emit('tts_start', { text });
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.emit('tts_end', { text });
      this.processQueue();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    this.speechSynthesis.speak(utterance);
  }

  private processQueue(): void {
    if (this.isSpeaking || this.speechQueue.length === 0) return;
    const next = this.speechQueue.shift();
    if (next) {
      this.speakNow(next);
    }
  }

  stopSpeaking(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.speechQueue = [];
      this.isSpeaking = false;
    }
  }

  destroy(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.audioContext = null;
  }
}

const voiceService = new VoiceService();
export default voiceService;
