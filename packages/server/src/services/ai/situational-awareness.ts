// =====================================================================
// Situational Awareness Service
// Real-time race engineer intel powered by OpenAI
// NOT coaching - this is strategic awareness and race intelligence
// =====================================================================

import { chatCompletion, isLLMConfigured } from './llm-service.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RaceContext {
    sessionType: 'practice' | 'qualifying' | 'race';
    trackName: string;
    currentLap: number;
    totalLaps?: number;
    sessionTimeRemaining?: number;
    weather?: string;
}

export interface DriverState {
    position: number;
    totalCars: number;
    gapAhead: number | null;
    gapBehind: number | null;
    fuelLaps: number;
    fuelLevel: number;
    tireCondition: {
        fl: number;
        fr: number;
        rl: number;
        rr: number;
    };
    lastLapTime: number | null;
    bestLapTime: number | null;
    sector1Delta?: number;
    sector2Delta?: number;
    onPitRoad: boolean;
    incidentCount: number;
}

export interface TrafficInfo {
    carAhead?: {
        gap: number;
        driverName: string;
        pace: 'faster' | 'similar' | 'slower';
        defending: boolean;
    };
    carBehind?: {
        gap: number;
        driverName: string;
        pace: 'faster' | 'similar' | 'slower';
        attacking: boolean;
    };
    blueFlags: boolean;
    yellowFlags: boolean;
}

export interface SituationalUpdate {
    type: 'gap' | 'fuel' | 'traffic' | 'strategy' | 'caution' | 'opportunity';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    spokenMessage?: string; // Shorter version for TTS
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const RACE_ENGINEER_SYSTEM = `You are a professional motorsport race engineer providing real-time situational awareness to your driver.

Your role:
- Provide concise, actionable intel about the race situation
- Alert to opportunities and threats
- Give strategic guidance on gaps, fuel, and traffic
- Sound like a real F1/WEC race engineer on the radio

Communication style:
- Brief and direct - driver is focused on driving
- Use racing terminology naturally
- Numbers are precise (gaps to tenths, fuel to laps)
- Calm under pressure, urgent when needed
- Never patronizing or instructional about HOW to drive

You are NOT a driving coach. You don't tell them how to brake or steer.
You ARE their eyes on the data, their strategic partner, their race engineer.

Always respond with JSON in this format:
{
  "updates": [
    {
      "type": "gap|fuel|traffic|strategy|caution|opportunity",
      "priority": "low|medium|high|critical",
      "message": "Full message for display",
      "spokenMessage": "Shorter version for voice (optional)"
    }
  ]
}`;

// ============================================================================
// SERVICE
// ============================================================================

export class SituationalAwarenessService {
    private lastUpdate: number = 0;
    private updateIntervalMs: number = 5000; // Don't spam updates
    private recentMessages: string[] = [];

    /**
     * Check if the service is available
     */
    isAvailable(): boolean {
        return isLLMConfigured();
    }

    /**
     * Analyze current race situation and generate engineer updates
     */
    async analyzeRaceSituation(
        context: RaceContext,
        driver: DriverState,
        traffic: TrafficInfo
    ): Promise<SituationalUpdate[]> {
        // Rate limit
        const now = Date.now();
        if (now - this.lastUpdate < this.updateIntervalMs) {
            return [];
        }

        if (!this.isAvailable()) {
            return this.generateFallbackUpdates(context, driver, traffic);
        }

        const prompt = this.buildSituationPrompt(context, driver, traffic);

        try {
            const result = await chatCompletion([
                { role: 'system', content: RACE_ENGINEER_SYSTEM },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.6,
                maxTokens: 500
            });

            this.lastUpdate = now;

            if (!result.success || !result.content) {
                return this.generateFallbackUpdates(context, driver, traffic);
            }

            // Parse JSON response
            const parsed = JSON.parse(result.content);
            const updates = parsed.updates as SituationalUpdate[];

            // Filter out recently sent messages
            const filtered = updates.filter(u => !this.recentMessages.includes(u.message));
            
            // Track recent messages
            filtered.forEach(u => {
                this.recentMessages.push(u.message);
                if (this.recentMessages.length > 10) {
                    this.recentMessages.shift();
                }
            });

            return filtered;

        } catch (error) {
            console.error('Situational awareness error:', error);
            return this.generateFallbackUpdates(context, driver, traffic);
        }
    }

    /**
     * Build the situation prompt for the LLM
     */
    private buildSituationPrompt(
        context: RaceContext,
        driver: DriverState,
        traffic: TrafficInfo
    ): string {
        const lines: string[] = [
            `Session: ${context.sessionType} at ${context.trackName}`,
            `Lap: ${context.currentLap}${context.totalLaps ? `/${context.totalLaps}` : ''}`,
        ];

        if (context.sessionTimeRemaining) {
            const mins = Math.floor(context.sessionTimeRemaining / 60);
            lines.push(`Time remaining: ${mins} minutes`);
        }

        lines.push('');
        lines.push(`Position: P${driver.position} of ${driver.totalCars}`);
        
        if (driver.gapAhead !== null) {
            lines.push(`Gap to P${driver.position - 1}: ${driver.gapAhead.toFixed(1)}s`);
        }
        if (driver.gapBehind !== null) {
            lines.push(`Gap from P${driver.position + 1}: ${driver.gapBehind.toFixed(1)}s`);
        }

        lines.push('');
        lines.push(`Fuel: ${driver.fuelLaps.toFixed(1)} laps remaining`);
        
        if (driver.lastLapTime && driver.bestLapTime) {
            const delta = driver.lastLapTime - driver.bestLapTime;
            lines.push(`Last lap: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}s vs best`);
        }

        if (traffic.carAhead) {
            lines.push('');
            lines.push(`Car ahead: ${traffic.carAhead.driverName} (${traffic.carAhead.gap.toFixed(1)}s)`);
            lines.push(`Pace: ${traffic.carAhead.pace}, ${traffic.carAhead.defending ? 'defending' : 'not defending'}`);
        }

        if (traffic.carBehind) {
            lines.push(`Car behind: ${traffic.carBehind.driverName} (${traffic.carBehind.gap.toFixed(1)}s)`);
            lines.push(`Pace: ${traffic.carBehind.pace}, ${traffic.carBehind.attacking ? 'attacking' : 'not attacking'}`);
        }

        if (traffic.blueFlags) {
            lines.push('');
            lines.push('⚠️ BLUE FLAGS - faster car approaching');
        }

        if (traffic.yellowFlags) {
            lines.push('');
            lines.push('⚠️ YELLOW FLAGS in sector');
        }

        lines.push('');
        lines.push('What situational updates should the driver receive right now?');
        lines.push('Only include updates that are actionable or important. Do not repeat obvious information.');

        return lines.join('\n');
    }

    /**
     * Generate basic updates without LLM (fallback)
     */
    private generateFallbackUpdates(
        _context: RaceContext,
        driver: DriverState,
        traffic: TrafficInfo
    ): SituationalUpdate[] {
        const updates: SituationalUpdate[] = [];

        // Critical fuel warning
        if (driver.fuelLaps < 2) {
            updates.push({
                type: 'fuel',
                priority: 'critical',
                message: `Critical fuel: ${driver.fuelLaps.toFixed(1)} laps remaining`,
                spokenMessage: `Box this lap. Fuel critical.`
            });
        } else if (driver.fuelLaps < 5) {
            updates.push({
                type: 'fuel',
                priority: 'high',
                message: `Low fuel: ${driver.fuelLaps.toFixed(1)} laps remaining`,
                spokenMessage: `Fuel for ${Math.floor(driver.fuelLaps)} laps.`
            });
        }

        // Gap opportunities
        if (driver.gapAhead !== null && driver.gapAhead < 1.0 && traffic.carAhead) {
            updates.push({
                type: 'opportunity',
                priority: 'high',
                message: `${traffic.carAhead.driverName} is ${driver.gapAhead.toFixed(1)}s ahead - DRS range`,
                spokenMessage: `Gap under one second. Push now.`
            });
        }

        // Threat from behind
        if (driver.gapBehind !== null && driver.gapBehind < 1.0 && traffic.carBehind?.attacking) {
            updates.push({
                type: 'traffic',
                priority: 'high',
                message: `${traffic.carBehind.driverName} attacking - ${driver.gapBehind.toFixed(1)}s behind`,
                spokenMessage: `Car behind in DRS. Defend.`
            });
        }

        // Blue flags
        if (traffic.blueFlags) {
            updates.push({
                type: 'caution',
                priority: 'high',
                message: 'Blue flags - let faster car through',
                spokenMessage: 'Blue flag. Let them by.'
            });
        }

        // Yellow flags
        if (traffic.yellowFlags) {
            updates.push({
                type: 'caution',
                priority: 'critical',
                message: 'Yellow flags - no overtaking, slow down',
                spokenMessage: 'Yellow. Slow down.'
            });
        }

        return updates;
    }

    /**
     * Reset the service state (e.g., new session)
     */
    reset(): void {
        this.lastUpdate = 0;
        this.recentMessages = [];
    }
}

// Singleton
let instance: SituationalAwarenessService | null = null;

export function getSituationalAwarenessService(): SituationalAwarenessService {
    if (!instance) {
        instance = new SituationalAwarenessService();
    }
    return instance;
}
