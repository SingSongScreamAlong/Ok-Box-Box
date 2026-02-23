/**
 * Proactive Spotter Service
 * 
 * Auto-triggers spotter callouts based on gap/threat analysis from the
 * LiveSessionAnalyzer. Emits spotter:callout socket events to the frontend.
 * 
 * The spotter is voice-first: short, punchy, interrupt-driven.
 * It fires on STATE TRANSITIONS, not every tick.
 */

import { getAnalyzer } from './live-session-analyzer.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SpotterCallout {
    type: 'gap_closing' | 'gap_opening' | 'overtake_opportunity' | 'under_attack'
        | 'clear_ahead' | 'clear_behind' | 'pit_window' | 'position_change'
        | 'incident_warning' | 'tire_warning' | 'fuel_warning' | 'pace_alert';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    spokenMessage: string; // Short TTS version
    timestamp: number;
}

// ============================================================================
// STATE TRACKING (per session)
// ============================================================================

interface SpotterState {
    lastPosition: number;
    lastGapAhead: number;
    lastGapBehind: number;
    lastGapAheadTrend: string;
    lastGapBehindTrend: string;
    wasOvertakeOpportunity: boolean;
    wasUnderThreat: boolean;
    wasTireCliff: boolean;
    wasFuelShort: boolean;
    lastCalloutTime: Map<string, number>;
    lastLapCount: number;
}

const spotterStates: Map<string, SpotterState> = new Map();

function getOrCreateState(sessionId: string): SpotterState {
    let state = spotterStates.get(sessionId);
    if (!state) {
        state = {
            lastPosition: 0,
            lastGapAhead: 0,
            lastGapBehind: 0,
            lastGapAheadTrend: 'stable',
            lastGapBehindTrend: 'stable',
            wasOvertakeOpportunity: false,
            wasUnderThreat: false,
            wasTireCliff: false,
            wasFuelShort: false,
            lastCalloutTime: new Map(),
            lastLapCount: 0,
        };
        spotterStates.set(sessionId, state);
    }
    return state;
}

export function destroySpotterState(sessionId: string): void {
    spotterStates.delete(sessionId);
}

// ============================================================================
// COOLDOWN HELPERS
// ============================================================================

function isOnCooldown(state: SpotterState, key: string, cooldownMs: number): boolean {
    const last = state.lastCalloutTime.get(key);
    return last !== undefined && Date.now() - last < cooldownMs;
}

function setCooldown(state: SpotterState, key: string): void {
    state.lastCalloutTime.set(key, Date.now());
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

/**
 * Analyze the current race situation and generate proactive spotter callouts.
 * Called on every telemetry tick — internally rate-limited via edge-triggering.
 */
export function generateSpotterCallouts(
    sessionId: string,
    currentData: {
        position: number;
        gapToCarAhead: number;
        gapFromCarBehind: number;
        fuelLevel: number;
        fuelPerLap: number | null;
        tireWear: { fl: number; fr: number; rl: number; rr: number };
        gapToLeader: number;
        lap: number;
    }
): SpotterCallout[] {
    const callouts: SpotterCallout[] = [];
    const state = getOrCreateState(sessionId);
    const analyzer = getAnalyzer('live') || getAnalyzer(sessionId);

    // Only generate callouts once per lap transition (not every tick)
    if (currentData.lap === state.lastLapCount && currentData.lap > 0) {
        // Still allow gap-based callouts between laps, but throttle heavily
        // Only check gap transitions every ~5 seconds
        if (isOnCooldown(state, '_tick', 5000)) {
            return callouts;
        }
        setCooldown(state, '_tick');
    }
    state.lastLapCount = currentData.lap;

    // Get accumulated intelligence if available
    const intel = analyzer ? analyzer.getIntelligence({
        fuelLevel: currentData.fuelLevel,
        fuelPerLap: currentData.fuelPerLap,
        tireWear: currentData.tireWear,
        position: currentData.position,
        gapToCarAhead: currentData.gapToCarAhead,
        gapFromCarBehind: currentData.gapFromCarBehind,
        gapToLeader: currentData.gapToLeader,
    }) : null;

    const now = Date.now();

    // ── POSITION CHANGE ──────────────────────────────────────────
    if (state.lastPosition > 0 && currentData.position !== state.lastPosition) {
        const gained = state.lastPosition - currentData.position;
        if (gained > 0 && !isOnCooldown(state, 'position', 10000)) {
            setCooldown(state, 'position');
            callouts.push({
                type: 'position_change',
                priority: 'high',
                message: `Position gained! Now P${currentData.position}`,
                spokenMessage: `P${currentData.position}. Good move.`,
                timestamp: now,
            });
        } else if (gained < 0 && !isOnCooldown(state, 'position', 10000)) {
            setCooldown(state, 'position');
            callouts.push({
                type: 'position_change',
                priority: 'medium',
                message: `Lost position. Now P${currentData.position}`,
                spokenMessage: `P${currentData.position}. Lost one.`,
                timestamp: now,
            });
        }
    }
    state.lastPosition = currentData.position;

    // ── OVERTAKE OPPORTUNITY (edge-triggered) ────────────────────
    if (intel) {
        if (intel.overtakeOpportunity && !state.wasOvertakeOpportunity && !isOnCooldown(state, 'overtake', 30000)) {
            setCooldown(state, 'overtake');
            callouts.push({
                type: 'overtake_opportunity',
                priority: 'high',
                message: `Overtake opportunity — gap ${currentData.gapToCarAhead.toFixed(1)}s and closing`,
                spokenMessage: `Gap closing. Push now.`,
                timestamp: now,
            });
        }
        state.wasOvertakeOpportunity = intel.overtakeOpportunity;

        // ── UNDER ATTACK (edge-triggered) ────────────────────────
        if (intel.underThreat && !state.wasUnderThreat && !isOnCooldown(state, 'threat', 30000)) {
            setCooldown(state, 'threat');
            callouts.push({
                type: 'under_attack',
                priority: 'high',
                message: `Car behind closing — ${currentData.gapFromCarBehind.toFixed(1)}s and gaining`,
                spokenMessage: `Car behind. ${currentData.gapFromCarBehind.toFixed(1)} seconds. Defend.`,
                timestamp: now,
            });
        }
        state.wasUnderThreat = intel.underThreat;

        // ── TIRE CLIFF (edge-triggered) ──────────────────────────
        if (intel.tireCliff && !state.wasTireCliff && !isOnCooldown(state, 'tire-cliff', 60000)) {
            setCooldown(state, 'tire-cliff');
            callouts.push({
                type: 'tire_warning',
                priority: 'high',
                message: `Tires approaching cliff — ${intel.estimatedTireLapsLeft} laps estimated`,
                spokenMessage: `Tires going off. ${intel.estimatedTireLapsLeft} laps.`,
                timestamp: now,
            });
        }
        state.wasTireCliff = intel.tireCliff;

        // ── FUEL SHORT (edge-triggered) ──────────────────────────
        const fuelShort = !intel.fuelToFinish && intel.projectedFuelLaps < 8;
        if (fuelShort && !state.wasFuelShort && !isOnCooldown(state, 'fuel-short', 60000)) {
            setCooldown(state, 'fuel-short');
            callouts.push({
                type: 'fuel_warning',
                priority: 'high',
                message: `Fuel won't make it — ${intel.projectedFuelLaps.toFixed(0)} laps projected`,
                spokenMessage: `Fuel short. ${intel.projectedFuelLaps.toFixed(0)} laps. Plan your stop.`,
                timestamp: now,
            });
        }
        state.wasFuelShort = fuelShort;
    }

    // ── GAP AHEAD TRANSITIONS ────────────────────────────────────
    // DRS/attack range entry
    if (currentData.gapToCarAhead > 0 && currentData.gapToCarAhead < 1.0 &&
        state.lastGapAhead >= 1.0 && !isOnCooldown(state, 'drs-ahead', 20000)) {
        setCooldown(state, 'drs-ahead');
        callouts.push({
            type: 'gap_closing',
            priority: 'high',
            message: `In DRS range — ${currentData.gapToCarAhead.toFixed(1)}s to car ahead`,
            spokenMessage: `Under a second. Attack range.`,
            timestamp: now,
        });
    }
    state.lastGapAhead = currentData.gapToCarAhead;

    // ── GAP BEHIND TRANSITIONS ───────────────────────────────────
    // Car behind enters DRS range
    if (currentData.gapFromCarBehind > 0 && currentData.gapFromCarBehind < 1.0 &&
        state.lastGapBehind >= 1.0 && !isOnCooldown(state, 'drs-behind', 20000)) {
        setCooldown(state, 'drs-behind');
        callouts.push({
            type: 'under_attack',
            priority: 'high',
            message: `Car behind in DRS — ${currentData.gapFromCarBehind.toFixed(1)}s`,
            spokenMessage: `Car behind under a second. Defend.`,
            timestamp: now,
        });
    }

    // Car behind pulls away (clear behind)
    if (currentData.gapFromCarBehind > 3.0 && state.lastGapBehind > 0 &&
        state.lastGapBehind < 2.0 && !isOnCooldown(state, 'clear-behind', 30000)) {
        setCooldown(state, 'clear-behind');
        callouts.push({
            type: 'clear_behind',
            priority: 'low',
            message: `Clear behind — gap ${currentData.gapFromCarBehind.toFixed(1)}s`,
            spokenMessage: `Clear behind.`,
            timestamp: now,
        });
    }
    state.lastGapBehind = currentData.gapFromCarBehind;

    // ── GAP TREND TRANSITIONS ────────────────────────────────────
    if (intel) {
        // Gap ahead trend changed to closing
        if (intel.gapAheadTrend === 'closing' && state.lastGapAheadTrend !== 'closing' &&
            currentData.gapToCarAhead > 1.0 && currentData.gapToCarAhead < 5.0 &&
            !isOnCooldown(state, 'trend-ahead', 45000)) {
            setCooldown(state, 'trend-ahead');
            callouts.push({
                type: 'gap_closing',
                priority: 'medium',
                message: `Closing on car ahead — gap ${currentData.gapToCarAhead.toFixed(1)}s`,
                spokenMessage: `Closing. ${currentData.gapToCarAhead.toFixed(1)} seconds.`,
                timestamp: now,
            });
        }
        state.lastGapAheadTrend = intel.gapAheadTrend;

        // Gap behind trend changed to closing (threat building)
        if (intel.gapBehindTrend === 'closing' && state.lastGapBehindTrend !== 'closing' &&
            currentData.gapFromCarBehind > 1.0 && currentData.gapFromCarBehind < 4.0 &&
            !isOnCooldown(state, 'trend-behind', 45000)) {
            setCooldown(state, 'trend-behind');
            callouts.push({
                type: 'gap_closing',
                priority: 'medium',
                message: `Car behind gaining — gap ${currentData.gapFromCarBehind.toFixed(1)}s`,
                spokenMessage: `Car behind gaining. ${currentData.gapFromCarBehind.toFixed(1)}.`,
                timestamp: now,
            });
        }
        state.lastGapBehindTrend = intel.gapBehindTrend;
    }

    return callouts;
}
