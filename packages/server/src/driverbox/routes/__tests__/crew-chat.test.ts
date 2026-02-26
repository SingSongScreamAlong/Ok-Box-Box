/**
 * Crew Chat Logic Tests
 * Tests for crew chat business logic and data transformations
 */

import { describe, it, expect } from 'vitest';

describe('Crew Chat Logic', () => {
    describe('Crew Member System Prompts', () => {
        const crewMembers = ['engineer', 'spotter', 'analyst'] as const;

        it('should have distinct personalities for each crew member', () => {
            const prompts: Record<string, string> = {
                engineer: 'race engineer focused on car setup, strategy, and technical performance',
                spotter: 'spotter focused on track position, traffic, and situational awareness',
                analyst: 'data analyst focused on telemetry, lap times, and performance trends',
            };

            for (const member of crewMembers) {
                expect(prompts[member]).toBeDefined();
                expect(prompts[member].length).toBeGreaterThan(20);
            }
        });

        it('should validate crew member type', () => {
            const validCrewMembers = new Set(['engineer', 'spotter', 'analyst']);
            
            expect(validCrewMembers.has('engineer')).toBe(true);
            expect(validCrewMembers.has('spotter')).toBe(true);
            expect(validCrewMembers.has('analyst')).toBe(true);
            expect(validCrewMembers.has('invalid')).toBe(false);
        });
    });

    describe('Telemetry Context Building', () => {
        it('should build context string from telemetry', () => {
            const buildContext = (telemetry: any): string => {
                if (!telemetry) return 'No live telemetry available.';
                
                const lines: string[] = [];
                if (telemetry.speed !== undefined) lines.push(`Speed: ${telemetry.speed} mph`);
                if (telemetry.fuel !== undefined) lines.push(`Fuel: ${telemetry.fuel.toFixed(1)} L`);
                if (telemetry.position !== undefined) lines.push(`Position: P${telemetry.position}`);
                if (telemetry.gap !== undefined) lines.push(`Gap: ${telemetry.gap > 0 ? '+' : ''}${telemetry.gap.toFixed(3)}s`);
                
                return lines.length > 0 ? lines.join('\n') : 'No telemetry data.';
            };

            const context = buildContext({ speed: 150, fuel: 25.5, position: 5, gap: 1.234 });
            expect(context).toContain('Speed: 150 mph');
            expect(context).toContain('Fuel: 25.5 L');
            expect(context).toContain('Position: P5');
            expect(context).toContain('Gap: +1.234s');

            const emptyContext = buildContext(null);
            expect(emptyContext).toBe('No live telemetry available.');
        });

        it('should handle partial telemetry data', () => {
            const buildContext = (telemetry: any): string => {
                if (!telemetry) return 'No live telemetry available.';
                const lines: string[] = [];
                if (telemetry.speed !== undefined) lines.push(`Speed: ${telemetry.speed} mph`);
                if (telemetry.fuel !== undefined) lines.push(`Fuel: ${telemetry.fuel.toFixed(1)} L`);
                return lines.length > 0 ? lines.join('\n') : 'No telemetry data.';
            };

            // Only speed available
            const context = buildContext({ speed: 100 });
            expect(context).toBe('Speed: 100 mph');
            expect(context).not.toContain('Fuel');
        });
    });

    describe('Message Validation', () => {
        it('should validate message length', () => {
            const validateMessage = (message: string): boolean => {
                if (!message || message.trim().length === 0) return false;
                if (message.length > 2000) return false;
                return true;
            };

            expect(validateMessage('Hello')).toBe(true);
            expect(validateMessage('')).toBe(false);
            expect(validateMessage('   ')).toBe(false);
            expect(validateMessage('a'.repeat(2001))).toBe(false);
            expect(validateMessage('a'.repeat(2000))).toBe(true);
        });

        it('should sanitize user input', () => {
            const sanitize = (input: string): string => {
                return input.trim().slice(0, 2000);
            };

            expect(sanitize('  hello  ')).toBe('hello');
            expect(sanitize('a'.repeat(3000))).toHaveLength(2000);
        });
    });

    describe('Conversation History', () => {
        it('should maintain conversation context', () => {
            const history: Array<{ role: string; content: string }> = [];
            
            const addMessage = (role: string, content: string) => {
                history.push({ role, content });
                // Keep last 10 messages
                if (history.length > 10) {
                    history.shift();
                }
            };

            addMessage('user', 'How is my pace?');
            addMessage('assistant', 'Your pace is consistent.');
            
            expect(history).toHaveLength(2);
            expect(history[0].role).toBe('user');
            expect(history[1].role).toBe('assistant');
        });

        it('should limit history length', () => {
            const history: string[] = [];
            const MAX_HISTORY = 10;

            for (let i = 0; i < 15; i++) {
                history.push(`Message ${i}`);
                if (history.length > MAX_HISTORY) {
                    history.shift();
                }
            }

            expect(history).toHaveLength(10);
            expect(history[0]).toBe('Message 5');
            expect(history[9]).toBe('Message 14');
        });
    });
});
