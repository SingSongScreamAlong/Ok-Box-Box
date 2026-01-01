/**
 * Whisper Service - OpenAI Speech-to-Text Integration
 * 
 * Transcribes audio using OpenAI Whisper API.
 * Supports streaming and batch transcription.
 */

import { config } from '../../config/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptionRequest {
    audioBuffer: Buffer;
    language?: string; // ISO 639-1 code, e.g., 'en'
    prompt?: string; // Optional prompt to guide transcription
}

export interface TranscriptionResult {
    success: boolean;
    text?: string;
    language?: string;
    durationMs?: number;
    error?: string;
}

export interface ConversationContext {
    sessionId: string;
    driverId: string;
    recentMessages: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1';
const WHISPER_MODEL = 'whisper-1';

// Racing-specific prompt to improve transcription accuracy
const RACING_PROMPT = `
Racing radio communication. Common terms: box, pit, push, gap, delta, understeer, oversteer,
P1-P20, sector, DRS, tyre, fuel, mode, copy, affirm, negative, standby.
`;

// ============================================================================
// SERVICE
// ============================================================================

export class WhisperService {
    private apiKey: string;
    private isAvailable: boolean = false;

    constructor() {
        this.apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || '';
        this.isAvailable = !!this.apiKey;

        if (!this.isAvailable) {
            console.warn('⚠️ WhisperService: OPENAI_API_KEY not configured');
        }
    }

    /**
     * Check if service is available
     */
    isServiceAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Transcribe audio buffer to text
     */
    async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'Whisper service not configured (missing API key)'
            };
        }

        try {
            // Create form data with audio file
            const formData = new FormData();
            const blob = new Blob([request.audioBuffer], { type: 'audio/webm' });
            formData.append('file', blob, 'audio.webm');
            formData.append('model', WHISPER_MODEL);

            if (request.language) {
                formData.append('language', request.language);
            }

            // Use racing prompt for better accuracy
            const prompt = request.prompt
                ? `${RACING_PROMPT} ${request.prompt}`
                : RACING_PROMPT;
            formData.append('prompt', prompt);

            const startTime = Date.now();

            const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Whisper API error:', response.status, errorText);
                return {
                    success: false,
                    error: `Whisper API error: ${response.status}`
                };
            }

            const data = await response.json() as { text: string; language?: string };
            const durationMs = Date.now() - startTime;

            console.log(`🎙️ Transcribed: "${data.text}" (${durationMs}ms)`);

            return {
                success: true,
                text: data.text,
                language: data.language,
                durationMs
            };

        } catch (error) {
            console.error('Transcription error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Process driver voice input and generate AI response
     */
    async processDriverQuery(
        audioBuffer: Buffer,
        context: ConversationContext
    ): Promise<{ query: string; response: string } | null> {
        // First, transcribe the audio
        const transcription = await this.transcribe({
            audioBuffer,
            language: 'en',
            prompt: context.recentMessages.slice(-3).join(' ')
        });

        if (!transcription.success || !transcription.text) {
            console.error('Failed to transcribe driver query');
            return null;
        }

        const query = transcription.text;

        // Generate AI response using chat completion
        try {
            const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional race engineer providing real-time radio communication to a driver. 
                            Keep responses brief (1-2 sentences max), clear, and actionable. 
                            Use racing terminology naturally. Stay calm and focused.
                            Context: Driver "${context.driverId}" in session "${context.sessionId}".`
                        },
                        ...context.recentMessages.map((msg, i) => ({
                            role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
                            content: msg
                        })),
                        { role: 'user', content: query }
                    ],
                    max_tokens: 100,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
            const aiResponse = data.choices?.[0]?.message?.content || 'Copy that.';

            console.log(`🗣️ Driver: "${query}"`);
            console.log(`🎧 Engineer: "${aiResponse}"`);

            return { query, response: aiResponse };

        } catch (error) {
            console.error('AI response error:', error);
            return { query, response: 'Copy, standby.' };
        }
    }
}

// Singleton instance
let whisperServiceInstance: WhisperService | null = null;

export function getWhisperService(): WhisperService {
    if (!whisperServiceInstance) {
        whisperServiceInstance = new WhisperService();
    }
    return whisperServiceInstance;
}
