/**
 * Unit Tests: OpponentModeler
 * 
 * Tests opponent strategy inference including
 * degradation estimation from lap times and pit stop analysis.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock types
interface PitStopWork {
    type: 'fuel_only' | 'tires_only' | 'full_service';
    estimatedFuel: number;
    estimatedTireChange: boolean;
}

// Helper functions to test
function inferPitStopWork(durationSeconds: number): PitStopWork {
    if (durationSeconds < 7) {
        return { type: 'fuel_only', estimatedFuel: durationSeconds * 2, estimatedTireChange: false };
    } else if (durationSeconds < 14) {
        return { type: 'tires_only', estimatedFuel: 0, estimatedTireChange: true };
    } else {
        return { type: 'full_service', estimatedFuel: (durationSeconds - 10) * 2, estimatedTireChange: true };
    }
}

function calculateDegradationSlope(lapTimes: number[]): number {
    if (lapTimes.length < 3) return 0;

    // Simple linear regression
    const n = lapTimes.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += lapTimes[i];
        sumXY += i * lapTimes[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
}

function estimatePitWindow(
    currentLap: number,
    lapsSinceLastPit: number,
    degradationSlope: number,
    avgStintLength: number
): { earliest: number; latest: number } {
    const avgRemaining = avgStintLength - lapsSinceLastPit;

    // Adjust based on degradation
    let adjustment = 0;
    if (degradationSlope > 0.1) {
        // High degradation = pit earlier
        adjustment = -Math.round(degradationSlope * 10);
    } else if (degradationSlope < -0.05) {
        // Improving = pit later (unlikely but possible with fuel load)
        adjustment = 2;
    }

    const expectedPit = currentLap + avgRemaining + adjustment;

    return {
        earliest: Math.max(currentLap + 1, expectedPit - 3),
        latest: expectedPit + 3
    };
}

describe('OpponentModeler', () => {
    describe('inferPitStopWork', () => {
        it('should infer fuel only for short stops', () => {
            const result = inferPitStopWork(5);
            expect(result.type).toBe('fuel_only');
            expect(result.estimatedTireChange).toBe(false);
            expect(result.estimatedFuel).toBe(10); // 5 * 2
        });

        it('should infer tires only for medium stops', () => {
            const result = inferPitStopWork(10);
            expect(result.type).toBe('tires_only');
            expect(result.estimatedTireChange).toBe(true);
            expect(result.estimatedFuel).toBe(0);
        });

        it('should infer full service for long stops', () => {
            const result = inferPitStopWork(20);
            expect(result.type).toBe('full_service');
            expect(result.estimatedTireChange).toBe(true);
            expect(result.estimatedFuel).toBe(20); // (20 - 10) * 2
        });

        it('should handle edge cases at boundaries', () => {
            expect(inferPitStopWork(7).type).toBe('tires_only');
            expect(inferPitStopWork(14).type).toBe('full_service');
        });
    });

    describe('calculateDegradationSlope', () => {
        it('should return 0 for insufficient data', () => {
            expect(calculateDegradationSlope([])).toBe(0);
            expect(calculateDegradationSlope([90])).toBe(0);
            expect(calculateDegradationSlope([90, 90.5])).toBe(0);
        });

        it('should calculate positive slope for degrading tires', () => {
            // Lap times increasing = degradation
            const lapTimes = [90.0, 90.2, 90.4, 90.6, 90.8];
            const slope = calculateDegradationSlope(lapTimes);
            expect(slope).toBeGreaterThan(0.15);
            expect(slope).toBeLessThan(0.25);
        });

        it('should calculate negative slope for improving pace', () => {
            // Lap times decreasing = fuel burning off
            const lapTimes = [91.0, 90.8, 90.6, 90.4, 90.2];
            const slope = calculateDegradationSlope(lapTimes);
            expect(slope).toBeLessThan(0);
        });

        it('should return near-zero for consistent pace', () => {
            const lapTimes = [90.0, 90.1, 89.9, 90.0, 90.1];
            const slope = calculateDegradationSlope(lapTimes);
            expect(Math.abs(slope)).toBeLessThan(0.05);
        });
    });

    describe('estimatePitWindow', () => {
        it('should predict pit window based on average stint', () => {
            const window = estimatePitWindow(10, 5, 0, 20);
            // 20 - 5 = 15 laps remaining, so pit around lap 25
            expect(window.earliest).toBeGreaterThanOrEqual(22);
            expect(window.latest).toBeLessThanOrEqual(28);
        });

        it('should adjust earlier for high degradation', () => {
            const normal = estimatePitWindow(10, 5, 0, 20);
            const degrading = estimatePitWindow(10, 5, 0.2, 20);

            expect(degrading.earliest).toBeLessThan(normal.earliest);
        });

        it('should not predict pit before current lap', () => {
            const window = estimatePitWindow(30, 25, 0, 20);
            expect(window.earliest).toBeGreaterThan(30);
        });
    });
});
