/**
 * Stint Tracker
 * Groups laps into stints based on pit stop detection.
 */

import { EventEmitter } from 'events';
import type { LapData, Stint } from './types.js';

interface DriverStintState {
    driverId: string;
    currentStint: Stint;
    allStints: Stint[];
    wasInPit: boolean;
    pitEntryTime?: number;
}

export interface StintTrackerEvents {
    'stint:started': (driverId: string, stint: Stint) => void;
    'stint:ended': (driverId: string, stint: Stint) => void;
}

export class StintTracker extends EventEmitter {
    private driverStates: Map<string, DriverStintState> = new Map();

    /**
     * Process pit lane state and lap completions
     */
    processPitState(
        driverId: string,
        inPit: boolean,
        currentLap: number,
        fuelLevel: number,
        sessionTimeMs: number
    ): void {
        let state = this.driverStates.get(driverId);

        if (!state) {
            // Initialize first stint
            const firstStint: Stint = {
                stintNumber: 1,
                startLap: currentLap,
                compound: 'unknown',
                laps: [],
                startFuel: fuelLevel
            };

            state = {
                driverId,
                currentStint: firstStint,
                allStints: [firstStint],
                wasInPit: inPit
            };
            this.driverStates.set(driverId, state);
            this.emit('stint:started', driverId, firstStint);
            return;
        }

        // Detect pit entry
        if (inPit && !state.wasInPit) {
            state.pitEntryTime = sessionTimeMs;
        }

        // Detect pit exit (new stint)
        if (!inPit && state.wasInPit) {
            const pitDuration = state.pitEntryTime
                ? sessionTimeMs - state.pitEntryTime
                : 0;

            // End current stint
            state.currentStint.endLap = currentLap - 1;
            state.currentStint.pitStopDurationMs = pitDuration;
            this.emit('stint:ended', driverId, state.currentStint);

            // Start new stint
            const newStint: Stint = {
                stintNumber: state.allStints.length + 1,
                startLap: currentLap,
                compound: 'unknown', // TODO: Infer from pit duration or SDK data
                laps: [],
                startFuel: fuelLevel
            };

            state.currentStint = newStint;
            state.allStints.push(newStint);
            state.pitEntryTime = undefined;
            this.emit('stint:started', driverId, newStint);
        }

        state.wasInPit = inPit;
    }

    /**
     * Add a completed lap to the current stint
     */
    addLapToStint(driverId: string, lap: LapData): void {
        const state = this.driverStates.get(driverId);
        if (state) {
            state.currentStint.laps.push(lap);
        }
    }

    /**
     * Get current stint for a driver
     */
    getCurrentStint(driverId: string): Stint | undefined {
        return this.driverStates.get(driverId)?.currentStint;
    }

    /**
     * Get all stints for a driver
     */
    getAllStints(driverId: string): Stint[] {
        return this.driverStates.get(driverId)?.allStints || [];
    }

    /**
     * Get current stint lap count
     */
    getCurrentStintLaps(driverId: string): number {
        const stint = this.getCurrentStint(driverId);
        return stint?.laps.length || 0;
    }

    /**
     * Clear all state
     */
    reset(): void {
        this.driverStates.clear();
    }
}
