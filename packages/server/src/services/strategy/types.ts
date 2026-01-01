/**
 * Strategy Intelligence Types
 * Shared types for lap tracking, stint management, and degradation analysis.
 */

/**
 * A single lap record
 */
export interface LapData {
    lapNumber: number;
    lapTimeMs: number;
    sector1Ms?: number;
    sector2Ms?: number;
    sector3Ms?: number;
    fuelUsed: number;        // Liters consumed this lap
    fuelRemaining: number;   // Liters remaining after this lap
    tireWear: {              // Wear percentages at END of lap
        fl: number;
        fr: number;
        rl: number;
        rr: number;
    };
    flags: LapFlags;
    timestamp: number;       // When lap was completed
}

/**
 * Flags describing lap quality
 */
export interface LapFlags {
    isClean: boolean;        // No off-tracks, no contact
    isInLap: boolean;        // Ended in pit
    isOutLap: boolean;       // Started from pit
    hadTraffic: boolean;     // Slower car within 2s during lap
    hadYellow: boolean;      // Yellow flag during lap
    isPersonalBest: boolean;
}

/**
 * A stint is a continuous run of laps on the same tire set
 */
export interface Stint {
    stintNumber: number;
    startLap: number;
    endLap?: number;         // undefined if stint is ongoing
    compound?: TireCompound;
    laps: LapData[];
    startFuel: number;
    pitStopDurationMs?: number; // Pit stop that ended this stint
}

export type TireCompound = 'soft' | 'medium' | 'hard' | 'wet' | 'intermediate' | 'unknown';

/**
 * Per-driver strategy state
 */
export interface DriverStrategyState {
    driverId: string;
    currentLap: number;
    currentStint: Stint;
    allStints: Stint[];
    allLaps: LapData[];

    // Derived metrics (Phase 13)
    rollingPace3Lap?: number;      // Average of last 3 clean laps
    rollingPace5Lap?: number;      // Average of last 5 clean laps
    degradationSlope?: number;     // Seconds lost per lap (e.g., +0.12)
    fuelPerLap?: number;           // Average fuel consumption
    estimatedLapsRemaining?: number;
    projectedCliffLap?: number;    // Predicted lap where pace drops > threshold
}

/**
 * Strategy update event payload (broadcast to dashboard)
 */
export interface StrategyUpdateEvent {
    sessionId: string;
    timestamp: number;
    drivers: {
        driverId: string;
        currentStintLaps: number;
        tireAge: number;
        fuelPct: number;
        fuelPerLap: number;
        degradationSlope: number;
        estimatedLapsRemaining: number;
        projectedCliffLap?: number;
    }[];
}
