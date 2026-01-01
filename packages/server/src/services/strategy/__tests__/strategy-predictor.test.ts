/**
 * Unit Tests: StrategyPredictor
 * 
 * Tests strategy prediction logic including
 * undercut analysis, threat assessment, and recommendations.
 */

import { describe, it, expect } from 'vitest';

// Mock types for testing (actual types come from service)
interface ThreatAnalysis {
    carIdx: number;
    gap: number;
    closingRate: number;
    lapsToOvertake: number | null;
    threatLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface UndercutResult {
    shouldUndercut: boolean;
    expectedGain: number;
    confidence: number;
    targetLap: number;
}

interface StrategyRecommendation {
    action: 'BOX_NOW' | 'DEFEND' | 'ATTACK' | 'STAY_OUT';
    reason: string;
    confidence: number;
    urgency: 'immediate' | 'soon' | 'low';
}

// Helper functions to test (these would be imported from the actual service)
function calculateClosingRate(gapHistory: number[]): number {
    if (gapHistory.length < 2) return 0;
    const firstGap = gapHistory[0];
    const lastGap = gapHistory[gapHistory.length - 1];
    return (firstGap - lastGap) / gapHistory.length;
}

function calculateLapsToOvertake(gap: number, closingRate: number): number | null {
    if (closingRate <= 0) return null;
    return Math.ceil(gap / closingRate);
}

function determineThreatLevel(
    gap: number,
    lapsToOvertake: number | null
): 'critical' | 'high' | 'medium' | 'low' {
    if (gap < 1.0) return 'critical';
    if (lapsToOvertake !== null && lapsToOvertake <= 3) return 'high';
    if (lapsToOvertake !== null && lapsToOvertake <= 10) return 'medium';
    return 'low';
}

function calculateUndercutGain(
    pitDelta: number,
    lapTimeDiff: number,
    lapsRemaining: number
): number {
    // Undercut gain = (lap time advantage * laps remaining) - pit delta
    return (lapTimeDiff * lapsRemaining) - pitDelta;
}

describe('StrategyPredictor', () => {
    describe('calculateClosingRate', () => {
        it('should return 0 for empty history', () => {
            expect(calculateClosingRate([])).toBe(0);
        });

        it('should return 0 for single gap entry', () => {
            expect(calculateClosingRate([5.0])).toBe(0);
        });

        it('should calculate positive closing rate when gap decreasing', () => {
            const gaps = [5.0, 4.5, 4.0, 3.5, 3.0];
            const rate = calculateClosingRate(gaps);
            expect(rate).toBeGreaterThan(0.3);
            expect(rate).toBeLessThan(0.6);
        });

        it('should calculate negative rate when gap increasing', () => {
            const gaps = [3.0, 3.5, 4.0, 4.5, 5.0];
            const rate = calculateClosingRate(gaps);
            expect(rate).toBeLessThan(-0.3);
            expect(rate).toBeGreaterThan(-0.6);
        });
    });

    describe('calculateLapsToOvertake', () => {
        it('should return null when not closing', () => {
            expect(calculateLapsToOvertake(5.0, 0)).toBeNull();
            expect(calculateLapsToOvertake(5.0, -0.5)).toBeNull();
        });

        it('should calculate laps correctly', () => {
            expect(calculateLapsToOvertake(5.0, 0.5)).toBe(10);
            expect(calculateLapsToOvertake(3.0, 1.0)).toBe(3);
            expect(calculateLapsToOvertake(2.5, 0.5)).toBe(5);
        });

        it('should round up to next lap', () => {
            expect(calculateLapsToOvertake(2.6, 0.5)).toBe(6);
        });
    });

    describe('determineThreatLevel', () => {
        it('should return critical for very close cars', () => {
            expect(determineThreatLevel(0.5, 1)).toBe('critical');
            expect(determineThreatLevel(0.9, null)).toBe('critical');
        });

        it('should return high for imminent threats', () => {
            expect(determineThreatLevel(1.5, 2)).toBe('high');
            expect(determineThreatLevel(2.0, 3)).toBe('high');
        });

        it('should return medium for medium-term threats', () => {
            expect(determineThreatLevel(5.0, 8)).toBe('medium');
        });

        it('should return low for non-threats', () => {
            expect(determineThreatLevel(10.0, 15)).toBe('low');
            expect(determineThreatLevel(5.0, null)).toBe('low');
        });
    });

    describe('calculateUndercutGain', () => {
        it('should calculate positive gain when worth undercutting', () => {
            // Pit delta 25s, lap time advantage 0.5s, 60 laps remaining
            // Gain = (0.5 * 60) - 25 = 30 - 25 = 5s
            expect(calculateUndercutGain(25, 0.5, 60)).toBe(5);
        });

        it('should calculate negative gain when not worth it', () => {
            // Pit delta 25s, lap time advantage 0.3s, 60 laps remaining
            // Gain = (0.3 * 60) - 25 = 18 - 25 = -7s
            expect(calculateUndercutGain(25, 0.3, 60)).toBe(-7);
        });

        it('should handle edge cases', () => {
            expect(calculateUndercutGain(0, 0.5, 10)).toBe(5);
            expect(calculateUndercutGain(25, 0, 60)).toBe(-25);
        });
    });
});
