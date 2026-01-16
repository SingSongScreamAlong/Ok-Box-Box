/**
 * Voice Service - ElevenLabs TTS Integration
 * 
 * Generates voice audio from text using ElevenLabs API.
 * Includes caching for repeated phrases and queue management.
 */

import { config } from '../../config/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceGenerationRequest {
    text: string;
    voiceId?: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
}

export interface VoiceGenerationResult {
    success: boolean;
    audioBuffer?: Buffer;
    audioUrl?: string;
    error?: string;
    durationMs?: number;
}

interface ElevenLabsVoice {
    voice_id: string;
    name: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice settings - race engineer voice profile
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // British Football Announcer
const DEFAULT_MODEL_ID = 'eleven_turbo_v2'; // Fastest model

// Voice presets for different contexts
export const VOICE_PRESETS = {
    raceEngineer: {
        voiceId: 'JBFqnCBsd6RMkjVDRZzb', // British Football Announcer
        stability: 0.5,
        similarityBoost: 0.75,
    },
    urgent: {
        voiceId: 'JBFqnCBsd6RMkjVDRZzb', // British Football Announcer - more intense
        stability: 0.3,
        similarityBoost: 0.8,
    },
    calm: {
        voiceId: 'JBFqnCBsd6RMkjVDRZzb', // British Football Announcer - calmer
        stability: 0.7,
        similarityBoost: 0.6,
    }
};

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
    audioBuffer: Buffer;
    createdAt: Date;
}

const audioCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(text: string, voiceId: string): string {
    return `${voiceId}:${text.toLowerCase().trim()}`;
}

function cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of audioCache.entries()) {
        if (now - entry.createdAt.getTime() > CACHE_TTL_MS) {
            audioCache.delete(key);
        }
    }

    // If still too large, remove oldest entries
    if (audioCache.size > CACHE_MAX_SIZE) {
        const entries = Array.from(audioCache.entries())
            .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

        const toRemove = entries.slice(0, audioCache.size - CACHE_MAX_SIZE);
        toRemove.forEach(([key]) => audioCache.delete(key));
    }
}

// ============================================================================
// SERVICE
// ============================================================================

export class VoiceService {
    private apiKey: string;
    private isAvailable: boolean = false;

    constructor() {
        this.apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || '';
        this.isAvailable = !!this.apiKey;

        if (!this.isAvailable) {
            console.warn('⚠️ VoiceService: ELEVENLABS_API_KEY not configured');
        }
    }

    /**
     * Check if voice service is available
     */
    isServiceAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Generate speech audio from text
     */
    async textToSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'Voice service not configured (missing API key)'
            };
        }

        const voiceId = request.voiceId || DEFAULT_VOICE_ID;
        const cacheKey = getCacheKey(request.text, voiceId);

        // Check cache first
        const cached = audioCache.get(cacheKey);
        if (cached) {
            console.log('🎤 Voice cache hit');
            return {
                success: true,
                audioBuffer: cached.audioBuffer
            };
        }

        try {
            const response = await fetch(
                `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey
                    },
                    body: JSON.stringify({
                        text: request.text,
                        model_id: request.modelId || DEFAULT_MODEL_ID,
                        voice_settings: {
                            stability: request.stability ?? 0.5,
                            similarity_boost: request.similarityBoost ?? 0.75
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs API error:', response.status, errorText);
                return {
                    success: false,
                    error: `ElevenLabs API error: ${response.status}`
                };
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = Buffer.from(arrayBuffer);

            // Cache the result
            audioCache.set(cacheKey, {
                audioBuffer,
                createdAt: new Date()
            });
            cleanupCache();

            console.log(`🎤 Generated voice audio: ${request.text.substring(0, 50)}...`);

            return {
                success: true,
                audioBuffer,
                durationMs: this.estimateDuration(request.text)
            };

        } catch (error) {
            console.error('Voice generation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get available voices
     */
    async getVoices(): Promise<ElevenLabsVoice[]> {
        if (!this.isAvailable) {
            return [];
        }

        try {
            const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json() as { voices?: ElevenLabsVoice[] };
            return data.voices || [];
        } catch (error) {
            console.error('Failed to fetch voices:', error);
            return [];
        }
    }

    /**
     * Estimate audio duration based on text length
     */
    private estimateDuration(text: string): number {
        // Average speaking rate: ~150 words per minute = 2.5 words/sec
        const words = text.split(/\s+/).length;
        return Math.round((words / 2.5) * 1000);
    }
}

// Singleton instance
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
    if (!voiceServiceInstance) {
        voiceServiceInstance = new VoiceService();
    }
    return voiceServiceInstance;
}
