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

export interface TelemetryContext {
    trackName?: string;
    sessionType?: string;
    position?: number;
    lap?: number;
    speed?: number;
    gapToLeader?: number;
    gapToCarAhead?: number;
    lastLapTime?: number;
    bestLapTime?: number;
    fuelRemaining?: number;
    tireDegradation?: number;
}

export interface ConversationContext {
    sessionId: string;
    driverId: string;
    iRacingId?: string;
    recentMessages: string[];
    telemetry?: TelemetryContext;
    driverContext?: string; // Pre-formatted driver context from IDP
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
     * Format lap time from seconds to mm:ss.xxx
     */
    private formatLapTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
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
            // Build comprehensive telemetry context string
            const t = context.telemetry as any;
            
            // Format standings for AI context
            let standingsInfo = '';
            if (t?.standings && t.standings.length > 0) {
                standingsInfo = '\nCURRENT STANDINGS:\n';
                for (const car of t.standings.slice(0, 10)) {
                    const lapTime = car.lastLapTime > 0 ? this.formatLapTime(car.lastLapTime) : 'N/A';
                    const status = car.onPitRoad ? ' (PIT)' : '';
                    const playerMark = car.isPlayer ? ' ← YOU' : '';
                    standingsInfo += `P${car.position}: ${car.driverName} - ${car.carName} [${car.carClass}] - Lap ${car.lap} - Last: ${lapTime}${status}${playerMark}\n`;
                }
            }
            
            const telemetryInfo = t ? `
CURRENT TELEMETRY DATA:

SESSION INFO:
- Track: ${t.trackName || 'Unknown'} (${t.trackLength || 'N/A'})
- Session Type: ${t.sessionType || 'Unknown'}
- Session Laps: ${t.sessionLaps || 'Unlimited'}
- Time Remaining: ${t.sessionTimeRemain ? Math.floor(t.sessionTimeRemain / 60) + ' min' : 'N/A'}
- Flag: ${t.flagStatus?.toUpperCase() || 'GREEN'}
- Total Cars: ${t.totalCars || 'N/A'}

WEATHER & CONDITIONS:
- Track Temp: ${t.trackTemp ? t.trackTemp + '°F' : 'N/A'}
- Air Temp: ${t.airTemp ? t.airTemp + '°F' : 'N/A'}
- Humidity: ${t.humidity ? t.humidity + '%' : 'N/A'}
- Wind: ${t.windSpeed ? t.windSpeed + ' mph' : 'N/A'}
- Sky: ${t.skyCondition || 'N/A'}

YOUR CAR:
- Driver: ${t.driverName || 'Unknown'}
- Car: ${t.carName || 'Unknown'}
- Class: ${t.carClass || 'N/A'}
- iRating: ${t.iRating || 'N/A'}
- License: ${t.licenseLevel || 'N/A'}
- On Track: ${t.isOnTrack ? 'Yes' : 'No'}
- In Pits: ${t.onPitRoad ? 'Yes' : 'No'}

POSITION & PROGRESS:
- Overall Position: P${t.position || '?'} of ${t.totalCars || '?'}
- Class Position: P${t.classPosition || '?'}
- Current Lap: ${t.lap || '?'}
- Laps Completed: ${t.lapsCompleted || '?'}
- Track Position: ${t.lapDistPct ? (t.lapDistPct * 100).toFixed(1) + '%' : 'N/A'}

SPEED & INPUTS:
- Speed: ${t.speed ? t.speed + ' mph' : 'N/A'}
- Gear: ${t.gear !== undefined ? t.gear : 'N/A'}
- RPM: ${t.rpm ? Math.round(t.rpm) : 'N/A'}
- Throttle: ${t.throttle !== undefined ? t.throttle + '%' : 'N/A'}
- Brake: ${t.brake !== undefined ? t.brake + '%' : 'N/A'}

LAP TIMES:
- Last Lap: ${t.lastLapTime && t.lastLapTime > 0 ? this.formatLapTime(t.lastLapTime) : 'N/A'}
- Best Lap: ${t.bestLapTime && t.bestLapTime > 0 ? this.formatLapTime(t.bestLapTime) : 'N/A'}
- Delta to Session Best: ${t.deltaToSessionBest ? (t.deltaToSessionBest > 0 ? '+' : '') + t.deltaToSessionBest.toFixed(3) + 's' : 'N/A'}
- Delta to Optimal: ${t.deltaToOptimalLap ? (t.deltaToOptimalLap > 0 ? '+' : '') + t.deltaToOptimalLap.toFixed(3) + 's' : 'N/A'}

FUEL:
- Fuel Level: ${t.fuelLevel ? t.fuelLevel.toFixed(1) + ' L' : 'N/A'}
- Fuel Percentage: ${t.fuelPct !== undefined ? t.fuelPct + '%' : 'N/A'}
- Fuel Use/Hour: ${t.fuelUsePerHour ? t.fuelUsePerHour.toFixed(2) + ' L/hr' : 'N/A'}

TIRES (% worn):
- Front Left: ${t.tireLFwear !== undefined ? t.tireLFwear + '%' : 'N/A'}
- Front Right: ${t.tireRFwear !== undefined ? t.tireRFwear + '%' : 'N/A'}
- Rear Left: ${t.tireLRwear !== undefined ? t.tireLRwear + '%' : 'N/A'}
- Rear Right: ${t.tireRRwear !== undefined ? t.tireRRwear + '%' : 'N/A'}

TEMPERATURES:
- Oil Temp: ${t.oilTemp ? t.oilTemp + '°F' : 'N/A'}
- Water Temp: ${t.waterTemp ? t.waterTemp + '°F' : 'N/A'}

INCIDENTS: ${t.incidentCount !== undefined ? t.incidentCount + 'x' : 'N/A'}
${standingsInfo}
` : 'No telemetry data available - respond with general racing advice.';

            // Include driver context (IDP profile, traits, goals) if available
            const driverKnowledge = context.driverContext || '';

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
                            content: `You are a professional race engineer providing real-time radio communication to YOUR driver in iRacing.
You know this driver personally - their strengths, weaknesses, goals, and history. Use this knowledge to give personalized advice.
Keep responses brief (1-2 sentences max), clear, and actionable.
Use racing terminology naturally. Stay calm and focused.
IMPORTANT: Use the ACTUAL telemetry and driver data provided below. Do NOT make up data.

${driverKnowledge}
${telemetryInfo}`
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
