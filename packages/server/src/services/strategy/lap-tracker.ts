/**
 * Lap Tracker
 * Detects lap line crossings and records lap times.
 */

import { EventEmitter } from 'events';
import type { LapData, LapFlags } from './types.js';
import { getLapRepository } from './lap-repository.js';

interface DriverLapState {
    driverId: string;
    currentLap: number;
    lapStartTime: number;
    lastLapDistPct: number;
    fuelAtLapStart: number;
    wasInPit: boolean; // For out-lap detection
}

export interface LapTrackerEvents {
    'lap:completed': (driverId: string, lap: LapData) => void;
}

export class LapTracker extends EventEmitter {
    private driverStates: Map<string, DriverLapState> = new Map();
    private lapHistory: Map<string, LapData[]> = new Map();
    private sessionId: string | null = null;
    private persistLaps: boolean = true;  // Enable DB persistence

    /**
     * Set the current session ID for persistence
     */
    setSessionId(sessionId: string): void {
        this.sessionId = sessionId;
    }

    /**
     * Enable/disable lap persistence to database
     */
    setPersistLaps(enabled: boolean): void {
        this.persistLaps = enabled;
    }

    /**
     * Process telemetry tick to detect lap crossings
     */
    processTick(
        driverId: string,
        lapDistPct: number,
        currentLap: number,
        inPit: boolean,
        fuelLevel: number,
        tireWear: { fl: number; fr: number; rl: number; rr: number },
        sessionTimeMs: number
    ): LapData | null {
        let state = this.driverStates.get(driverId);

        if (!state) {
            // First tick for this driver
            state = {
                driverId,
                currentLap,
                lapStartTime: sessionTimeMs,
                lastLapDistPct: lapDistPct,
                fuelAtLapStart: fuelLevel,
                wasInPit: inPit
            };
            this.driverStates.set(driverId, state);
            return null;
        }

        // Detect lap crossing: lapDistPct wraps from ~1.0 to ~0.0
        // OR currentLap increments
        const crossedLine =
            (state.lastLapDistPct > 0.9 && lapDistPct < 0.1) ||
            (currentLap > state.currentLap);

        let completedLap: LapData | null = null;

        if (crossedLine && currentLap > state.currentLap) {
            // Calculate lap time
            const lapTimeMs = sessionTimeMs - state.lapStartTime;
            const fuelUsed = state.fuelAtLapStart - fuelLevel;

            // Determine lap flags
            const flags: LapFlags = {
                isClean: true, // TODO: Integrate with incident detection
                isInLap: inPit,
                isOutLap: state.wasInPit,
                hadTraffic: false, // TODO: Integrate with spatial awareness
                hadYellow: false,  // TODO: Integrate with flag state
                isPersonalBest: false // Calculated after adding to history
            };

            completedLap = {
                lapNumber: state.currentLap,
                lapTimeMs,
                fuelUsed: Math.max(0, fuelUsed),
                fuelRemaining: fuelLevel,
                tireWear,
                flags,
                timestamp: sessionTimeMs
            };

            // Check personal best
            const history = this.lapHistory.get(driverId) || [];
            const cleanLaps = history.filter(l => l.flags.isClean && !l.flags.isInLap && !l.flags.isOutLap);
            if (flags.isClean && !flags.isInLap && !flags.isOutLap) {
                const currentBest = cleanLaps.length > 0
                    ? Math.min(...cleanLaps.map(l => l.lapTimeMs))
                    : Infinity;
                completedLap.flags.isPersonalBest = lapTimeMs < currentBest;
            }

            // Store in history
            history.push(completedLap);
            this.lapHistory.set(driverId, history);

            // Emit event
            this.emit('lap:completed', driverId, completedLap);

            // Persist to database (async, don't await)
            if (this.persistLaps && this.sessionId) {
                getLapRepository().saveLap(this.sessionId, driverId, completedLap)
                    .catch(err => console.error('Failed to persist lap:', err));
            }

            // Reset state for next lap
            state.currentLap = currentLap;
            state.lapStartTime = sessionTimeMs;
            state.fuelAtLapStart = fuelLevel;
            state.wasInPit = inPit;
        }

        // Update tracking state
        state.lastLapDistPct = lapDistPct;
        state.wasInPit = inPit;

        return completedLap;
    }

    /**
     * Get lap history for a driver
     */
    getDriverLaps(driverId: string): LapData[] {
        return this.lapHistory.get(driverId) || [];
    }

    /**
     * Get clean laps only (for pace analysis)
     */
    getCleanLaps(driverId: string): LapData[] {
        return this.getDriverLaps(driverId).filter(
            l => l.flags.isClean && !l.flags.isInLap && !l.flags.isOutLap
        );
    }

    /**
     * Clear all state (new session)
     */
    reset(): void {
        this.driverStates.clear();
        this.lapHistory.clear();
    }
}
