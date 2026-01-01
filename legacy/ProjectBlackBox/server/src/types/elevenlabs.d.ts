declare module 'elevenlabs' {
  export interface VoiceSettings {
    stability: number;
    similarity_boost: number;
    style?: number;
    speaker_boost?: boolean;
  }

  export interface Voice {
    voice_id: string;
    name: string;
    category: string;
    description: string;
    preview_url: string;
    labels: Record<string, string>;
    settings: VoiceSettings;
  }

  export interface TextToSpeechOptions {
    voice_id?: string;
    model_id?: string;
    voice_settings?: Partial<VoiceSettings>;
  }

  export interface AudioResponse {
    audio: ArrayBuffer;
    type: string;
  }

  export interface HistoryItem {
    history_item_id: string;
    voice_id: string;
    voice_name: string;
    text: string;
    date_unix: number;
    date: string;
    download_url: string;
  }

  export class ElevenLabsAPI {
    constructor(apiKey?: string, options?: { baseUrl?: string });
    
    // Text to Speech
    textToSpeech(text: string, options?: TextToSpeechOptions): Promise<AudioResponse>;
    
    // Voices
    getVoices(): Promise<Voice[]>;
    getVoice(voiceId: string): Promise<Voice>;
    
    // History
    getHistory(): Promise<HistoryItem[]>;
    getHistoryItem(historyItemId: string): Promise<HistoryItem>;
    deleteHistoryItem(historyItemId: string): Promise<boolean>;
    
    // Voice Settings
    getDefaultVoiceSettings(): VoiceSettings;
    
    // Utils
    streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer>;
  }

  export default ElevenLabsAPI;
}
