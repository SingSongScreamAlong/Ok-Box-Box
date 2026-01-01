import { ElevenLabsClient } from 'elevenlabs/wrapper';
import { Readable } from 'stream';

export interface VoiceMessage {
  text: string;
  voiceId?: string;
  model?: string;
}

export interface AudioResponse {
  audioData: Buffer;
  duration: number;
  format: string;
  voiceId: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

// Helper function to convert stream/async iterable to buffer
async function streamToBuffer(stream: Readable | AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  if (Symbol.asyncIterator in stream) {
    // Handle async iterable
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  
  // Handle readable stream
  return new Promise((resolve, reject) => {
    (stream as Readable).on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    (stream as Readable).on('error', reject);
    (stream as Readable).on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export class ElevenLabsService {
  private client: ElevenLabsClient | null = null;
  private defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  private defaultModel: string = 'eleven_monolingual_v1';
  private enabled: boolean = false;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  ELEVENLABS_API_KEY not configured - voice synthesis disabled');
      return;
    }

    this.client = new ElevenLabsClient({
      apiKey: apiKey,
    });
    this.enabled = true;
    console.log('✅ ElevenLabs service initialized');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async generateSpeech(message: VoiceMessage): Promise<AudioResponse> {
    if (!this.client) {
      throw new Error('ElevenLabs service not configured');
    }

    try {
      const voiceId = message.voiceId || this.defaultVoiceId;
      const model = message.model || this.defaultModel;

      // Generate speech using ElevenLabs API
      const audioStream = await this.client.generate({
        voice: voiceId,
        text: message.text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      });

      // Convert stream to buffer
      const audioData = await streamToBuffer(audioStream as Readable);

      // Estimate duration (rough calculation based on text length)
      // Approximately 150 words per minute, so ~2.5 words per second
      const wordCount = message.text.split(/\s+/).length;
      const estimatedDuration = (wordCount / 2.5) * 1000; // in milliseconds

      return {
        audioData,
        duration: estimatedDuration,
        format: 'mp3',
        voiceId,
      };

    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transcribeAudio(audioData: Buffer, options?: {
    language?: string;
    model?: string;
  }): Promise<TranscriptionResult> {
    try {
      // ElevenLabs focuses on TTS, so we use OpenAI's Whisper for STT
      // This requires OPENAI_API_KEY or GRADIENT_AI_API_KEY in environment

      const openaiApiKey = process.env.OPENAI_API_KEY || process.env.GRADIENT_AI_API_KEY;

      if (!openaiApiKey) {
        console.warn('No OpenAI API key found. STT requires OPENAI_API_KEY.');
        return {
          text: '[STT unavailable - OPENAI_API_KEY not configured]',
          confidence: 0,
          language: options?.language || 'en',
          duration: 0,
        };
      }

      // Use OpenAI's Whisper API for transcription
      const FormData = require('form-data');
      const axios = require('axios');

      const formData = new FormData();
      formData.append('file', audioData, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });
      formData.append('model', options?.model || 'whisper-1');

      if (options?.language) {
        formData.append('language', options.language);
      }

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${openaiApiKey}`,
          },
        }
      );

      const confidence = response.data.text ? 0.9 : 0.0;

      return {
        text: response.data.text || '',
        confidence: confidence,
        language: response.data.language || options?.language || 'en',
        duration: response.data.duration || 0,
      };

    } catch (error) {
      console.error('Speech-to-text transcription error:', error);
      return {
        text: '[Transcription failed]',
        confidence: 0,
        language: options?.language || 'en',
        duration: 0,
      };
    }
  }

  async getAvailableVoices(): Promise<any[]> {
    if (!this.client) {
      return [];
    }

    try {
      const voices = await this.client.voices.getAll();
      return voices.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  async generateCoachingAudio(
    coachingText: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AudioResponse> {
    // Adjust voice settings based on urgency
    let voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.5,
    };

    let selectedVoiceId = this.defaultVoiceId;

    switch (urgency) {
      case 'high':
        voiceSettings = {
          stability: 0.3, // More dynamic for urgent messages
          similarity_boost: 0.7,
        };
        // Could use a different voice for urgent messages
        break;
      case 'low':
        voiceSettings = {
          stability: 0.7, // More stable for calm messages
          similarity_boost: 0.3,
        };
        break;
      default:
        // Medium urgency - use default settings
        break;
    }

    if (!this.client) {
      throw new Error('ElevenLabs service not configured');
    }

    try {
      const audioStream = await this.client.generate({
        voice: selectedVoiceId,
        text: coachingText,
        model_id: this.defaultModel,
        voice_settings: voiceSettings,
      });

      // Convert stream to buffer
      const audioData = await streamToBuffer(audioStream as Readable);

      // Estimate duration
      const wordCount = coachingText.split(/\s+/).length;
      const estimatedDuration = (wordCount / 2.5) * 1000;

      return {
        audioData,
        duration: estimatedDuration,
        format: 'mp3',
        voiceId: selectedVoiceId,
      };

    } catch (error) {
      console.error('ElevenLabs coaching audio generation error:', error);
      throw new Error(`Failed to generate coaching audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility method to create different types of coaching messages
  createCoachingMessage(
    type: 'performance' | 'warning' | 'celebration' | 'instruction',
    content: string
  ): VoiceMessage {
    const prefixes = {
      performance: 'Performance analysis: ',
      warning: 'Warning: ',
      celebration: 'Great job! ',
      instruction: 'Instruction: ',
    };

    return {
      text: `${prefixes[type]}${content}`,
      voiceId: this.defaultVoiceId,
      model: this.defaultModel,
    };
  }
}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();
