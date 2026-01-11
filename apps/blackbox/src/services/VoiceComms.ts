/**
 * Voice Communications Service
 * Handles PTT, Whisper STT, and ElevenLabs TTS for driver-engineer communication
 */

export interface VoiceConfig {
  whisperApiKey?: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  pttKey: string;
  sampleRate: number;
  language: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
}

export interface VoiceMessage {
  id: string;
  from: 'driver' | 'engineer';
  text: string;
  audioUrl?: string;
  timestamp: number;
}

type VoiceEventType = 
  | 'ptt_start' 
  | 'ptt_end' 
  | 'transcription' 
  | 'engineer_speaking' 
  | 'engineer_done'
  | 'connection_change'
  | 'error';

type VoiceEventCallback = (event: VoiceEventType, data?: unknown) => void;

class VoiceCommsService {
  private config: VoiceConfig = {
    pttKey: 'KeyT',
    sampleRate: 16000,
    language: 'en',
  };

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  private isEngineerSpeaking = false;
  private listeners: Set<VoiceEventCallback> = new Set();
  private messageHistory: VoiceMessage[] = [];

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  configure(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setWhisperApiKey(key: string): void {
    this.config.whisperApiKey = key;
  }

  setElevenLabsConfig(apiKey: string, voiceId: string): void {
    this.config.elevenLabsApiKey = apiKey;
    this.config.elevenLabsVoiceId = voiceId;
  }

  setPTTKey(key: string): void {
    this.config.pttKey = key;
  }

  getPTTKey(): string {
    return this.config.pttKey;
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: VoiceEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: VoiceEventType, data?: unknown): void {
    this.listeners.forEach(cb => cb(event, data));
  }

  // ============================================================================
  // PTT & RECORDING
  // ============================================================================

  async startPTT(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await this.processRecording();
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.emit('ptt_start');

    } catch (error) {
      console.error('[VoiceComms] Failed to start recording:', error);
      this.emit('error', { type: 'microphone', message: 'Failed to access microphone' });
    }
  }

  async stopPTT(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.emit('ptt_end');
  }

  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // Convert to format Whisper expects (if needed)
    const transcription = await this.transcribeAudio(audioBlob);
    
    if (transcription) {
      const message: VoiceMessage = {
        id: `msg-${Date.now()}`,
        from: 'driver',
        text: transcription.text,
        timestamp: Date.now(),
      };
      this.messageHistory.push(message);
      this.emit('transcription', transcription);
    }
  }

  // ============================================================================
  // WHISPER STT
  // ============================================================================

  private async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult | null> {
    if (!this.config.whisperApiKey) {
      console.warn('[VoiceComms] Whisper API key not configured');
      // Return mock transcription for testing
      return {
        text: '[Whisper API key required for transcription]',
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', this.config.language);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.whisperApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        text: result.text,
        confidence: 1.0, // Whisper doesn't return confidence
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error('[VoiceComms] Transcription failed:', error);
      this.emit('error', { type: 'transcription', message: 'Failed to transcribe audio' });
      return null;
    }
  }

  // ============================================================================
  // ELEVENLABS TTS
  // ============================================================================

  async speakToDriver(text: string): Promise<void> {
    if (!this.config.elevenLabsApiKey || !this.config.elevenLabsVoiceId) {
      console.warn('[VoiceComms] ElevenLabs not configured, using browser TTS');
      await this.browserSpeak(text);
      return;
    }

    try {
      this.isEngineerSpeaking = true;
      this.emit('engineer_speaking', { text });

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.elevenLabsApiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const message: VoiceMessage = {
        id: `msg-${Date.now()}`,
        from: 'engineer',
        text,
        audioUrl,
        timestamp: Date.now(),
      };
      this.messageHistory.push(message);

      await this.playAudio(audioUrl);

    } catch (error) {
      console.error('[VoiceComms] TTS failed:', error);
      this.emit('error', { type: 'tts', message: 'Failed to generate speech' });
      // Fallback to browser TTS
      await this.browserSpeak(text);
    } finally {
      this.isEngineerSpeaking = false;
      this.emit('engineer_done');
    }
  }

  private async playAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Audio playback failed'));
      audio.play();
    });
  }

  private async browserSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.isEngineerSpeaking = true;
      this.emit('engineer_speaking', { text });

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      
      utterance.onend = () => {
        this.isEngineerSpeaking = false;
        this.emit('engineer_done');
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }

  // ============================================================================
  // STATE & HISTORY
  // ============================================================================

  isDriverTransmitting(): boolean {
    return this.isRecording;
  }

  isEngineerTalking(): boolean {
    return this.isEngineerSpeaking;
  }

  getMessageHistory(): VoiceMessage[] {
    return [...this.messageHistory];
  }

  clearHistory(): void {
    this.messageHistory = [];
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.listeners.clear();
  }
}

export const VoiceComms = new VoiceCommsService();
export default VoiceComms;
