/**
 * BlackBox Cloud - AI Race Engineer
 * Generates radio calls based on telemetry analysis
 */

import OpenAI from 'openai';

interface TelemetryFrame {
    lap: number;
    speed: number;
    gear: number;
    rpm: number;
    throttle: number;
    brake: number;
    position: { s: number };
    timestamp: number;
}

export class RaceEngineer {
    private openai: OpenAI | null = null;
    private lastCallTime = new Map<string, number>();
    private minCallInterval = 30000; // 30 seconds between calls

    constructor(apiKey: string) {
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
            console.log('AI Race Engineer initialized with OpenAI');
        } else {
            console.log('AI Race Engineer running in demo mode (no OpenAI key)');
        }
    }

    /**
     * Analyze telemetry buffer and decide if a radio call is needed
     */
    async analyzeAndRespond(sessionId: string, buffer: TelemetryFrame[]): Promise<string | null> {
        // Throttle calls
        const now = Date.now();
        const lastCall = this.lastCallTime.get(sessionId) || 0;
        if (now - lastCall < this.minCallInterval) {
            return null;
        }

        if (buffer.length < 10) {
            return null;
        }

        // Simple heuristics (no AI call needed for basic updates)
        const latest = buffer[buffer.length - 1];
        const lapStart = buffer.find(f => f.lap === latest.lap);

        // New lap started
        if (lapStart && buffer.indexOf(lapStart) > buffer.length - 5) {
            this.lastCallTime.set(sessionId, now);
            return this.generateLapCall(latest);
        }

        // Use AI for more complex analysis if available
        if (this.openai && Math.random() < 0.1) { // 10% chance per analysis
            const response = await this.generateAICall(buffer);
            if (response) {
                this.lastCallTime.set(sessionId, now);
                return response;
            }
        }

        return null;
    }

    /**
     * Respond to driver voice input
     */
    async respondToDriver(sessionId: string, question: string, buffer: TelemetryFrame[]): Promise<string | null> {
        const latest = buffer.length > 0 ? buffer[buffer.length - 1] : null;

        // Simple keyword matching for common questions
        const questionLower = question.toLowerCase();

        if (questionLower.includes('fuel')) {
            return `Fuel is looking good. You have margin for the stint.`;
        }

        if (questionLower.includes('gap') || questionLower.includes('ahead') || questionLower.includes('behind')) {
            return `Gap is stable. Keep your rhythm.`;
        }

        if (questionLower.includes('tire') || questionLower.includes('tyre')) {
            return `Tires are in the window. Push when you need to.`;
        }

        if (questionLower.includes('position') || questionLower.includes('where')) {
            return latest ? `You're at position ${Math.round(latest.position.s * 100)}% through the lap.` : null;
        }

        // Use AI for complex questions
        if (this.openai) {
            return await this.generateAIResponse(question, buffer);
        }

        return `Copy. Focusing on the data.`;
    }

    /**
     * Generate simple lap update call
     */
    private generateLapCall(frame: TelemetryFrame): string {
        const lapMessages = [
            `Lap ${frame.lap} complete. Keep pushing.`,
            `Good lap. Lap ${frame.lap} in the books.`,
            `Lap ${frame.lap} done. Stay focused.`,
            `That's lap ${frame.lap}. Looking good.`
        ];
        return lapMessages[Math.floor(Math.random() * lapMessages.length)];
    }

    /**
     * Generate AI-powered radio call
     */
    private async generateAICall(buffer: TelemetryFrame[]): Promise<string | null> {
        if (!this.openai) return null;

        const latest = buffer[buffer.length - 1];
        const avgSpeed = buffer.reduce((sum, f) => sum + f.speed, 0) / buffer.length;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional race engineer giving radio updates to a driver. 
Keep messages SHORT (under 15 words), calm, and actionable.
Never say "um" or filler words. Be direct like real F1/NASCAR engineers.
Examples:
- "Gap plus 2 tenths. Keep this line."
- "Fuel good. Push when ready."
- "Careful turn 3, grip dropping."`
                    },
                    {
                        role: 'user',
                        content: `Current telemetry: Lap ${latest.lap}, Speed ${Math.round(avgSpeed)} km/h avg, 
Position ${Math.round(latest.position.s * 100)}% through lap.
Give a brief race engineer update.`
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            });

            return response.choices[0]?.message?.content || null;
        } catch (error) {
            console.error('OpenAI error:', error);
            return null;
        }
    }

    /**
     * Generate AI response to driver question
     */
    private async generateAIResponse(question: string, buffer: TelemetryFrame[]): Promise<string | null> {
        if (!this.openai) return null;

        const latest = buffer.length > 0 ? buffer[buffer.length - 1] : null;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional race engineer responding to driver questions over radio.
Keep responses SHORT (under 20 words), calm, and helpful.
Current data: ${latest ? `Lap ${latest.lap}, ${Math.round(latest.speed)} km/h` : 'No data'}`
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            });

            return response.choices[0]?.message?.content || null;
        } catch (error) {
            console.error('OpenAI error:', error);
            return `Copy. We'll check and get back to you.`;
        }
    }
}
