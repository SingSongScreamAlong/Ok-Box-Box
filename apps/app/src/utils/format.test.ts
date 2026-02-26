import { describe, it, expect } from 'vitest';

// Test utility functions that might exist in the app
describe('Format Utilities', () => {
    describe('formatLapTime', () => {
        it('should format seconds to lap time string', () => {
            // Example: 90.5 seconds = 1:30.500
            const formatLapTime = (seconds: number): string => {
                if (seconds <= 0) return '--:--.---';
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
            };
            
            expect(formatLapTime(90.5)).toBe('1:30.500');
            expect(formatLapTime(65.123)).toBe('1:05.123');
            expect(formatLapTime(0)).toBe('--:--.---');
            expect(formatLapTime(-1)).toBe('--:--.---');
        });
    });

    describe('formatGap', () => {
        it('should format gap in seconds', () => {
            const formatGap = (gap: number | null): string => {
                if (gap === null || gap === undefined) return '--';
                if (gap === 0) return 'SAME';
                const sign = gap > 0 ? '+' : '';
                return `${sign}${gap.toFixed(3)}s`;
            };
            
            expect(formatGap(1.234)).toBe('+1.234s');
            expect(formatGap(-0.567)).toBe('-0.567s');
            expect(formatGap(0)).toBe('SAME');
            expect(formatGap(null)).toBe('--');
        });
    });

    describe('formatFuel', () => {
        it('should format fuel with units', () => {
            const formatFuel = (liters: number | null, unit: 'L' | 'gal' = 'L'): string => {
                if (liters === null || liters === undefined) return '--';
                if (unit === 'gal') {
                    return `${(liters * 0.264172).toFixed(1)} gal`;
                }
                return `${liters.toFixed(1)} L`;
            };
            
            expect(formatFuel(10.5)).toBe('10.5 L');
            expect(formatFuel(10.5, 'gal')).toBe('2.8 gal');
            expect(formatFuel(null)).toBe('--');
        });
    });

    describe('formatSpeed', () => {
        it('should format speed with units', () => {
            const formatSpeed = (kph: number | null, unit: 'kph' | 'mph' = 'mph'): string => {
                if (kph === null || kph === undefined) return '--';
                if (unit === 'mph') {
                    return `${Math.round(kph * 0.621371)} mph`;
                }
                return `${Math.round(kph)} kph`;
            };
            
            expect(formatSpeed(160, 'mph')).toBe('99 mph');
            expect(formatSpeed(160, 'kph')).toBe('160 kph');
            expect(formatSpeed(null)).toBe('--');
        });
    });

    describe('formatPosition', () => {
        it('should format position with ordinal suffix', () => {
            const formatPosition = (pos: number | null): string => {
                if (pos === null || pos === undefined || pos <= 0) return '--';
                const suffixes = ['th', 'st', 'nd', 'rd'];
                const v = pos % 100;
                const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
                return `${pos}${suffix}`;
            };
            
            expect(formatPosition(1)).toBe('1st');
            expect(formatPosition(2)).toBe('2nd');
            expect(formatPosition(3)).toBe('3rd');
            expect(formatPosition(4)).toBe('4th');
            expect(formatPosition(11)).toBe('11th');
            expect(formatPosition(21)).toBe('21st');
            expect(formatPosition(null)).toBe('--');
        });
    });
});
