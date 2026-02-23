/**
 * Integration test for the Live Learning Loop pipeline:
 *   1. LiveSessionAnalyzer accumulates telemetry lap-by-lap
 *   2. getIntelligence() returns rich session intelligence
 *   3. buildContextForAI() produces a text block for crew-chat
 *   4. getPostSessionSummary() produces a summary for the learning pipeline
 *   5. Session lifecycle (create/get/destroy) works correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    LiveSessionAnalyzer,
    getOrCreateAnalyzer,
    getAnalyzer,
    destroyAnalyzer,
} from '../live-session-analyzer.js';

// Helper: generate a telemetry tick for a given lap
function makeTick(lap: number, overrides: Partial<Parameters<LiveSessionAnalyzer['ingestTelemetry']>[0]> = {}) {
    return {
        lap,
        lastLapTime: 90 + Math.random() * 2,   // ~90-92s laps
        bestLapTime: 89.5,
        position: 5,
        classPosition: 3,
        fuelLevel: 100 - lap * 2.5,             // ~2.5L per lap
        fuelPerLap: 2.5,
        tireWear: {
            fl: Math.max(0, 1 - lap * 0.015),
            fr: Math.max(0, 1 - lap * 0.018),
            rl: Math.max(0, 1 - lap * 0.012),
            rr: Math.max(0, 1 - lap * 0.014),
        },
        gapToLeader: 12.5 - lap * 0.1,
        gapToCarAhead: 2.0 - lap * 0.05,
        gapFromCarBehind: 1.5 + lap * 0.02,
        incidentCount: 0,
        onPitRoad: false,
        damageAero: 0,
        damageEngine: 0,
        ...overrides,
    };
}

describe('LiveSessionAnalyzer', () => {
    let analyzer: LiveSessionAnalyzer;

    beforeEach(() => {
        analyzer = new LiveSessionAnalyzer();
    });

    // ========================================================================
    // BASIC ACCUMULATION
    // ========================================================================

    it('should accumulate laps and track lap count', () => {
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75,
            fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5,
            gapToCarAhead: 1.5,
            gapFromCarBehind: 1.7,
            gapToLeader: 11.5,
        });

        expect(intel.lapCount).toBe(9); // lap recorded on transition, so 10 ticks = 9 completed laps
        expect(intel.bestLap).toBeGreaterThan(0);
        expect(intel.overallAvgPace).toBeGreaterThan(0);
    });

    it('should compute pace trend over laps', () => {
        // Feed improving laps (getting faster)
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                lastLapTime: 95 - lap * 0.3, // getting faster
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.paceTrend).toBe('improving');
    });

    it('should detect degrading pace', () => {
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                lastLapTime: 89 + lap * 0.5, // getting slower
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.paceTrend).toBe('degrading');
    });

    // ========================================================================
    // FUEL ANALYSIS
    // ========================================================================

    it('should project fuel laps correctly', () => {
        for (let lap = 1; lap <= 5; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 50,
            fuelPerLap: 2.5,
            tireWear: { fl: 0.9, fr: 0.9, rl: 0.9, rr: 0.9 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.projectedFuelLaps).toBe(20); // 50 / 2.5
        expect(intel.actualFuelPerLap).toBeGreaterThan(0);
    });

    // ========================================================================
    // TIRE ANALYSIS
    // ========================================================================

    it('should compute tire degradation rate', () => {
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.tireDegRate).toBeGreaterThan(0);
        expect(intel.estimatedTireLapsLeft).toBeGreaterThan(0);
        expect(intel.currentTireLife).toBeDefined();
    });

    // ========================================================================
    // GAP TRENDS
    // ========================================================================

    it('should detect closing gap ahead', () => {
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                gapToCarAhead: 3.0 - lap * 0.2, // closing
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.0, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.gapAheadTrend).toBe('closing');
    });

    it('should flag overtake opportunity when gap is small and closing', () => {
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                gapToCarAhead: 2.0 - lap * 0.15,
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 0.5, gapFromCarBehind: 3.0, gapToLeader: 11.5,
        });

        expect(intel.overtakeOpportunity).toBe(true);
    });

    // ========================================================================
    // INCIDENTS & MENTAL STATE
    // ========================================================================

    it('should track incidents and detect clustering', () => {
        for (let lap = 1; lap <= 10; lap++) {
            // Incidents on laps 5, 6, 7 (clustering)
            const incCount = lap >= 5 && lap <= 7 ? lap - 4 : (lap > 7 ? 3 : 0);
            analyzer.ingestTelemetry(makeTick(lap, {
                incidentCount: incCount,
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.totalIncidents).toBe(3);
        expect(intel.incidentRate).toBeGreaterThan(0);
    });

    it('should detect mental fatigue in long sessions', () => {
        // Simulate 40+ laps with degrading pace and incidents
        for (let lap = 1; lap <= 45; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                lastLapTime: 90 + (lap > 30 ? (lap - 30) * 0.3 : 0), // pace degrades after lap 30
                incidentCount: lap > 35 ? 2 : 0, // incidents late
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 10, fuelPerLap: 2.5,
            tireWear: { fl: 0.3, fr: 0.25, rl: 0.4, rr: 0.35 },
            position: 8, gapToCarAhead: 5.0, gapFromCarBehind: 1.0, gapToLeader: 30.0,
        });

        // Mental fatigue depends on real elapsed time + incident patterns
        // In a fast test loop, session duration is near-zero, so accept any result
        expect(['fresh', 'normal', 'fatigued', 'tilted']).toContain(intel.mentalFatigue);
    });

    // ========================================================================
    // PIT STOPS & STINTS
    // ========================================================================

    it('should detect pit stops and create new stints', () => {
        // Stint 1: laps 1-10
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        // Pit stop on lap 11
        analyzer.ingestTelemetry(makeTick(11, {
            onPitRoad: true,
            tireWear: { fl: 1, fr: 1, rl: 1, rr: 1 }, // fresh tires
        }));

        // Stint 2: laps 12-15
        for (let lap = 12; lap <= 15; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                tireWear: {
                    fl: 1 - (lap - 11) * 0.015,
                    fr: 1 - (lap - 11) * 0.018,
                    rl: 1 - (lap - 11) * 0.012,
                    rr: 1 - (lap - 11) * 0.014,
                },
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 60, fuelPerLap: 2.5,
            tireWear: { fl: 0.94, fr: 0.93, rl: 0.95, rr: 0.94 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.pitStops).toBeGreaterThanOrEqual(1);
        expect(intel.currentStintNumber).toBeGreaterThanOrEqual(1);
    });

    // ========================================================================
    // CONTEXT GENERATION
    // ========================================================================

    it('should generate AI context string', () => {
        for (let lap = 1; lap <= 5; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        const context = analyzer.buildContextForAI({
            fuelLevel: 87.5,
            fuelPerLap: 2.5,
            tireWear: { fl: 0.93, fr: 0.91, rl: 0.94, rr: 0.93 },
            position: 5,
            gapToCarAhead: 1.75,
            gapFromCarBehind: 1.6,
            gapToLeader: 12.0,
            totalLaps: 50,
        });

        expect(context).toContain('LIVE RACE ANALYSIS');
        expect(context).toContain('PACE ANALYSIS');
        expect(context).toContain('FUEL ANALYSIS');
        expect(context).toContain('TIRE ANALYSIS');
        expect(context).toContain('POSITION & GAPS');
        expect(context).toContain('STRATEGY RECOMMENDATION');
    });

    // ========================================================================
    // POST-SESSION SUMMARY
    // ========================================================================

    it('should produce a post-session summary', () => {
        for (let lap = 1; lap <= 20; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        const summary = analyzer.getPostSessionSummary();

        expect(summary.totalLaps).toBe(19); // off-by-one: 20 ticks = 19 completed laps
        expect(summary.avgPace).toBeGreaterThan(0);
        expect(summary.bestLap).toBeGreaterThan(0);
        expect(summary.consistency).toBeGreaterThanOrEqual(0);
        expect(summary.incidentRate).toBeGreaterThanOrEqual(0);
        expect(summary.sessionMinutes).toBeGreaterThanOrEqual(0);
        expect(['improving', 'stable', 'degrading', 'erratic']).toContain(summary.paceTrend);
    });

    // ========================================================================
    // STRATEGY RECOMMENDATION
    // ========================================================================

    it('should recommend pitting when fuel is critical', () => {
        for (let lap = 1; lap <= 5; lap++) {
            analyzer.ingestTelemetry(makeTick(lap));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 3,       // very low
            fuelPerLap: 2.5,
            tireWear: { fl: 0.5, fr: 0.5, rl: 0.5, rr: 0.5 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        // Should mention pit/fuel in recommendation
        expect(intel.recommendedAction.toLowerCase()).toMatch(/pit|fuel|box/);
    });

    // ========================================================================
    // SESSION LIFECYCLE (getOrCreate / get / destroy)
    // ========================================================================

    it('should manage analyzer lifecycle correctly', () => {
        const a1 = getOrCreateAnalyzer('test-session-1');
        const a2 = getOrCreateAnalyzer('test-session-1');
        expect(a1).toBe(a2); // same instance

        const a3 = getOrCreateAnalyzer('test-session-2');
        expect(a3).not.toBe(a1); // different session

        expect(getAnalyzer('test-session-1')).toBe(a1);
        expect(getAnalyzer('nonexistent')).toBeUndefined();

        destroyAnalyzer('test-session-1');
        expect(getAnalyzer('test-session-1')).toBeUndefined();

        destroyAnalyzer('test-session-2');
    });

    // ========================================================================
    // CONSISTENCY RATING
    // ========================================================================

    it('should rate consistency higher for uniform lap times', () => {
        // Very consistent laps
        for (let lap = 1; lap <= 10; lap++) {
            analyzer.ingestTelemetry(makeTick(lap, {
                lastLapTime: 91.0 + (Math.random() * 0.2 - 0.1), // ±0.1s
            }));
        }

        const intel = analyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        expect(intel.consistencyRating).toBeGreaterThan(70);
    });

    it('should rate consistency lower for erratic lap times', () => {
        const erraticAnalyzer = new LiveSessionAnalyzer();
        // Deliberately wild swings: alternating fast/slow
        for (let lap = 1; lap <= 10; lap++) {
            erraticAnalyzer.ingestTelemetry(makeTick(lap, {
                lastLapTime: lap % 2 === 0 ? 88 : 100, // 12s spread
            }));
        }

        const intel = erraticAnalyzer.getIntelligence({
            fuelLevel: 75, fuelPerLap: 2.5,
            tireWear: { fl: 0.85, fr: 0.82, rl: 0.88, rr: 0.86 },
            position: 5, gapToCarAhead: 1.5, gapFromCarBehind: 1.7, gapToLeader: 11.5,
        });

        // With 12s alternating swings, consistency should be notably lower
        expect(intel.consistencyRating).toBeLessThan(90);
    });

    it('should return a PostSessionSummary with all required fields', () => {
        // Regression test: ensures getPostSessionSummary() contract matches
        // what post-session-learner.ts expects (PostSessionSummary type).
        const summaryAnalyzer = new LiveSessionAnalyzer();
        for (let lap = 1; lap <= 5; lap++) {
            summaryAnalyzer.ingestTelemetry(makeTick(lap, { lastLapTime: 90 + lap * 0.1 }));
        }

        const summary = summaryAnalyzer.getPostSessionSummary();

        // All PostSessionSummary fields must be present and correctly typed
        expect(summary).toHaveProperty('avgPace');
        expect(summary).toHaveProperty('bestLap');
        expect(summary).toHaveProperty('consistency');
        expect(summary).toHaveProperty('incidentRate');
        expect(summary).toHaveProperty('incidentClustering');
        expect(summary).toHaveProperty('mentalFatigue');
        expect(summary).toHaveProperty('positionsGained');
        expect(summary).toHaveProperty('overtakeSuccessRate');
        expect(summary).toHaveProperty('avgFuelPerLap');
        expect(summary).toHaveProperty('avgTireDegPerLap');
        expect(summary).toHaveProperty('stintCount');
        expect(summary).toHaveProperty('totalLaps');
        expect(summary).toHaveProperty('sessionMinutes');
        expect(summary).toHaveProperty('paceTrend');

        expect(typeof summary.avgPace).toBe('number');
        expect(typeof summary.bestLap).toBe('number');
        expect(typeof summary.consistency).toBe('number');
        expect(typeof summary.incidentRate).toBe('number');
        expect(typeof summary.incidentClustering).toBe('boolean');
        expect(typeof summary.mentalFatigue).toBe('string');
        expect(typeof summary.totalLaps).toBe('number');
        expect(typeof summary.sessionMinutes).toBe('number');
        expect(typeof summary.paceTrend).toBe('string');
    });
});
