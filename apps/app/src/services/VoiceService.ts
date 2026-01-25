/**
 * VoiceService - Voice-First Interface
 * 
 * Purpose: Make the driver feel like they're talking to SOMEONE, not querying software.
 * 
 * Features:
 * - Text-to-Speech for engineer callouts
 * - Priority queue for messages
 * - Interrupt handling
 * - Silence periods
 * - Voice personality matching
 */

import type { EngineerMessage, MessageUrgency } from './EngineerCore';

// ========================
// VOICE CONFIGURATION
// ========================

export interface VoiceConfig {
  enabled: boolean;
  volume: number; // 0-1
  rate: number; // 0.5-2
  pitch: number; // 0-2
  voice: string | null; // Voice name or null for default
}

const DEFAULT_CONFIG: VoiceConfig = {
  enabled: true,
  volume: 0.8,
  rate: 1.1, // Slightly faster for urgency
  pitch: 1.0,
  voice: null,
};

// ========================
// VOICE SERVICE CLASS
// ========================

export class VoiceService {
  private config: VoiceConfig;
  private synth: SpeechSynthesis | null = null;
  private messageQueue: EngineerMessage[] = [];
  private isSpeaking: boolean = false;
  private silenceUntil: number = 0;
  private lastSpokenMessageId: string | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      
      // Voices may load asynchronously
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (this.synth) {
      this.availableVoices = this.synth.getVoices();
    }
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  /**
   * Update voice configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if voice is available
   */
  isAvailable(): boolean {
    return this.synth !== null && this.config.enabled;
  }

  /**
   * Request silence for a period
   */
  requestSilence(durationMs: number): void {
    this.silenceUntil = Date.now() + durationMs;
    this.stop(); // Stop current speech
  }

  /**
   * Check if currently in silence period
   */
  isInSilencePeriod(): boolean {
    return Date.now() < this.silenceUntil;
  }

  /**
   * Speak a message
   */
  speak(message: EngineerMessage): void {
    if (!this.isAvailable()) return;
    if (!message.speakable) return;
    if (this.isInSilencePeriod() && message.urgency !== 'critical') return;
    if (message.id === this.lastSpokenMessageId) return; // Don't repeat

    // Critical messages interrupt
    if (message.urgency === 'critical') {
      this.stop();
      this.speakNow(message);
      return;
    }

    // Important messages go to front of queue
    if (message.urgency === 'important') {
      this.messageQueue.unshift(message);
    } else {
      this.messageQueue.push(message);
    }

    this.processQueue();
  }

  /**
   * Speak immediately (for critical messages)
   */
  private speakNow(message: EngineerMessage): void {
    if (!this.synth) return;

    const utterance = this.createUtterance(message.content, message.urgency);
    
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.lastSpokenMessageId = message.id;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    this.synth.speak(utterance);
  }

  /**
   * Process the message queue
   */
  private processQueue(): void {
    if (this.isSpeaking) return;
    if (this.messageQueue.length === 0) return;
    if (this.isInSilencePeriod()) return;

    const message = this.messageQueue.shift();
    if (message) {
      this.speakNow(message);
    }
  }

  /**
   * Create a speech utterance with appropriate settings
   */
  private createUtterance(text: string, urgency: MessageUrgency): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.volume = this.config.volume;
    utterance.pitch = this.config.pitch;
    
    // Adjust rate based on urgency
    switch (urgency) {
      case 'critical':
        utterance.rate = this.config.rate * 1.2; // Faster for critical
        break;
      case 'important':
        utterance.rate = this.config.rate * 1.1;
        break;
      default:
        utterance.rate = this.config.rate;
    }

    // Set voice if specified
    if (this.config.voice) {
      const voice = this.availableVoices.find(v => v.name === this.config.voice);
      if (voice) {
        utterance.voice = voice;
      }
    } else {
      // Try to find a good English voice
      const englishVoice = this.availableVoices.find(v => 
        v.lang.startsWith('en') && v.name.includes('Male')
      ) || this.availableVoices.find(v => v.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    return utterance;
  }

  /**
   * Stop all speech
   */
  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.messageQueue = [];
    }
  }

  /**
   * Speak a simple text string (for quick callouts)
   */
  speakText(text: string, urgency: MessageUrgency = 'normal'): void {
    const message: EngineerMessage = {
      id: crypto.randomUUID(),
      content: text,
      urgency,
      tone: 'advisory',
      domain: 'general',
      speakable: true,
      timestamp: Date.now(),
    };
    this.speak(message);
  }

  /**
   * Check if currently speaking
   */
  isBusy(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.messageQueue.length;
  }
}

// ========================
// SINGLETON INSTANCE
// ========================

let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService();
  }
  return voiceServiceInstance;
}

export function initVoiceService(config: Partial<VoiceConfig> = {}): VoiceService {
  voiceServiceInstance = new VoiceService(config);
  return voiceServiceInstance;
}
