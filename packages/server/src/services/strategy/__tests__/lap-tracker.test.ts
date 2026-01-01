/**
 * Unit Tests: LapTracker
 * 
 * Tests lap crossing detection and lap time calculation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LapTracker } from '../lap-tracker.js';

describe('LapTracker', () => {
    let tracker: LapTracker;

    beforeEach(() => {
        tracker = new LapTracker();
    });

    describe('processTick', () => {
        it('should not create lap on first tick', () => {
            const result = tracker.processTick(
                'driver1',
                0.5,  // lapDistPct
                1,    // currentLap
                false, // inPit
                50,   // fuelLevel
                { fl: 0.9, fr: 0.9, rl: 0.9, rr: 0.9 },
                1000  // sessionTimeMs
            );

            expect(result).toBeNull();
        });

        it('should detect lap crossing when lapDistPct wraps', () => {
            // First tick at end of lap
            tracker.processTick(
                'driver1', 0.95, 1, false, 50,
                { fl: 0.9, fr: 0.9, rl: 0.9, rr: 0.9 },
                1000
            );

            // Second tick at start of new lap
            const result = tracker.processTick(
                'driver1', 0.05, 2, false, 48,
                { fl: 0.88, fr: 0.88, rl: 0.89, rr: 0.89 },
                91000  // 90 seconds later
            );

            expect(result).not.toBeNull();
            expect(result?.lapNumber).toBe(1);
            expect(result?.lapTimeMs).toBe(90000);
            expect(result?.fuelUsed).toBeCloseTo(2, 1);
        });

        it('should flag out-lap correctly', () => {
            // Start in pit
            tracker.processTick(
                'driver1', 0.95, 1, true, 50,
                { fl: 1, fr: 1, rl: 1, rr: 1 },
                1000
            );

            // Cross line, now on track
            const result = tracker.processTick(
                'driver1', 0.05, 2, false, 48,
                { fl: 0.98, fr: 0.98, rl: 0.98, rr: 0.98 },
                91000
            );

            expect(result).not.toBeNull();
            expect(result?.flags.isOutLap).toBe(true);
        });

        it('should flag in-lap correctly', () => {
            // Start on track
            tracker.processTick(
                'driver1', 0.95, 1, false, 50,
                { fl: 0.8, fr: 0.8, rl: 0.8, rr: 0.8 },
                1000
            );

            // Cross line, now in pit
            const result = tracker.processTick(
                'driver1', 0.05, 2, true, 48,
                { fl: 0.78, fr: 0.78, rl: 0.78, rr: 0.78 },
                91000
            );

            expect(result).not.toBeNull();
            expect(result?.flags.isInLap).toBe(true);
        });
    });

    describe('getDriverLaps', () => {
        it('should return empty array for unknown driver', () => {
            const laps = tracker.getDriverLaps('unknown');
            expect(laps).toEqual([]);
        });

        it('should return completed laps for driver', () => {
            // Complete one lap
            tracker.processTick('driver1', 0.95, 1, false, 50, { fl: 0.9, fr: 0.9, rl: 0.9, rr: 0.9 }, 1000);
            tracker.processTick('driver1', 0.05, 2, false, 48, { fl: 0.88, fr: 0.88, rl: 0.88, rr: 0.88 }, 91000);

            const laps = tracker.getDriverLaps('driver1');
            expect(laps).toHaveLength(1);
            expect(laps[0].lapNumber).toBe(1);
        });
    });

    describe('getCleanLaps', () => {
        it('should exclude in/out laps', () => {
            // Out lap (from pit)
            tracker.processTick('driver1', 0.95, 1, true, 50, { fl: 1, fr: 1, rl: 1, rr: 1 }, 1000);
            tracker.processTick('driver1', 0.05, 2, false, 48, { fl: 0.98, fr: 0.98, rl: 0.98, rr: 0.98 }, 91000);

            // Clean lap
            tracker.processTick('driver1', 0.95, 2, false, 46, { fl: 0.96, fr: 0.96, rl: 0.96, rr: 0.96 }, 170000);
            tracker.processTick('driver1', 0.05, 3, false, 44, { fl: 0.94, fr: 0.94, rl: 0.94, rr: 0.94 }, 250000);

            const cleanLaps = tracker.getCleanLaps('driver1');
            expect(cleanLaps).toHaveLength(1);
            expect(cleanLaps[0].lapNumber).toBe(2);
        });
    });

    describe('reset', () => {
        it('should clear all state', () => {
            tracker.processTick('driver1', 0.95, 1, false, 50, { fl: 0.9, fr: 0.9, rl: 0.9, rr: 0.9 }, 1000);
            tracker.processTick('driver1', 0.05, 2, false, 48, { fl: 0.88, fr: 0.88, rl: 0.88, rr: 0.88 }, 91000);

            expect(tracker.getDriverLaps('driver1')).toHaveLength(1);

            tracker.reset();

            expect(tracker.getDriverLaps('driver1')).toHaveLength(0);
        });
    });
});
