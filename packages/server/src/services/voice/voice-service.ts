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

export type CrewVoiceRole = 'engineer' | 'spotter' | 'analyst' | 'strategist' | 'crewChief';

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
const DEFAULT_MODEL_ID = 'eleven_flash_v2_5'; // Fastest model (~75ms TTFB)

// Voice presets for different contexts
export const VOICE_PRESETS = {
    raceEngineer: {
        voiceId: 'ErXwobaYiN019PkySvjV',
        stability: 0.5,
        similarityBoost: 0.75,
    },
    urgent: {
        voiceId: 'ErXwobaYiN019PkySvjV',
        stability: 0.3,
        similarityBoost: 0.8,
    },
    calm: {
        voiceId: 'ErXwobaYiN019PkySvjV',
        stability: 0.7,
        similarityBoost: 0.6,
    },
    spotter: {
        voiceId: 'TxGEqnHWrfWFTfGW9XjX',
        stability: 0.35,
        similarityBoost: 0.82,
    },
    analyst: {
        voiceId: 'VR6AewLTigWG4xSOukaG',
        stability: 0.68,
        similarityBoost: 0.65,
    },
    strategist: {
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        stability: 0.58,
        similarityBoost: 0.78,
    },
    crewChief: {
        voiceId: 'yoZ06aMxZJJ28mfd3POQ',
        stability: 0.46,
        similarityBoost: 0.8,
    }
};

const ROLE_TO_VOICE_PRESET: Record<CrewVoiceRole, typeof VOICE_PRESETS.raceEngineer> = {
    engineer: VOICE_PRESETS.raceEngineer,
    spotter: VOICE_PRESETS.spotter,
    analyst: VOICE_PRESETS.analyst,
    strategist: VOICE_PRESETS.strategist,
    crewChief: VOICE_PRESETS.crewChief,
};

export function isCrewVoiceRole(value: unknown): value is CrewVoiceRole {
    return value === 'engineer'
        || value === 'spotter'
        || value === 'analyst'
        || value === 'strategist'
        || value === 'crewChief';
}

export function getVoicePresetForRole(role: CrewVoiceRole | string | undefined): typeof VOICE_PRESETS.raceEngineer {
    return role && isCrewVoiceRole(role)
        ? ROLE_TO_VOICE_PRESET[role]
        : VOICE_PRESETS.raceEngineer;
}

// Acknowledgment phrases played immediately after STT while LLM+TTS process
const ACK_PHRASES = [
    'Copy, checking.',
    'Roger, standby.',
    'Affirm, one moment.',
    'Copy that, pulling numbers.',
    'Understood, checking the data.',
    'Roger that, give me a second.',
    'Stand by.',
    'Copy, we\'ll look into that.',
];

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
    private ackCacheWarmed: boolean = false;

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
     * Return a random pre-cached acknowledgment phrase as audio.
     * Warms the full ack cache in the background after the first call.
     */
    async getAckAudio(): Promise<Buffer | null> {
        if (!this.isAvailable) return null;

        const phrase = ACK_PHRASES[Math.floor(Math.random() * ACK_PHRASES.length)];
        const result = await this.textToSpeech({
            text: phrase,
            ...VOICE_PRESETS.raceEngineer,
        });

        // After the first successful ack, warm the rest of the phrases in the background
        if (result.success && !this.ackCacheWarmed) {
            this.ackCacheWarmed = true;
            this.warmAckCache().catch(() => {});
        }

        return result.success ? (result.audioBuffer ?? null) : null;
    }

    // ── Cache accessors (used by streaming TTS endpoint) ─────────────────────

    /**
     * Return a cached audio buffer without generating anything.
     */
    getCachedAudioBuffer(text: string, voiceId: string): Buffer | null {
        const key = getCacheKey(text, voiceId);
        return audioCache.get(key)?.audioBuffer ?? null;
    }

    /**
     * Store an audio buffer in the shared cache (used when piping streaming TTS).
     */
    cacheAudioBuffer(text: string, voiceId: string, buffer: Buffer): void {
        const key = getCacheKey(text, voiceId);
        audioCache.set(key, { audioBuffer: buffer, createdAt: new Date() });
        cleanupCache();
    }

    /**
     * Make a streaming request to ElevenLabs and return the raw Response for piping.
     * Callers are responsible for caching the accumulated bytes.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async fetchElevenLabsStream(request: VoiceGenerationRequest): Promise<{ ok: boolean; body: any } | null> {
        if (!this.isAvailable) return null;

        const voiceId = request.voiceId || DEFAULT_VOICE_ID;

        try {
            const response = await fetch(
                `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': this.apiKey,
                    },
                    body: JSON.stringify({
                        text: request.text,
                        model_id: request.modelId || DEFAULT_MODEL_ID,
                        voice_settings: {
                            stability: request.stability ?? 0.5,
                            similarity_boost: request.similarityBoost ?? 0.75,
                        },
                    }),
                }
            );

            if (!response.ok) {
                console.error('ElevenLabs stream error:', response.status);
                return null;
            }

            return response;
        } catch (error) {
            console.error('ElevenLabs stream fetch error:', error);
            return null;
        }
    }

    /**
     * Pre-generate all ack phrases so subsequent calls are instant cache hits.
     */
    private async warmAckCache(): Promise<void> {
        for (const phrase of ACK_PHRASES) {
            const key = getCacheKey(phrase, VOICE_PRESETS.raceEngineer.voiceId);
            if (!audioCache.has(key)) {
                await this.textToSpeech({ text: phrase, ...VOICE_PRESETS.raceEngineer });
                // Small delay between generations to avoid rate-limiting
                await new Promise(r => setTimeout(r, 200));
            }
        }
        console.log('🎤 Ack phrase cache warmed');
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
