/**
 * Opponent Modeler
 * Infers opponent strategy from observable data (lap times, pit stops).
 * 
 * Philosophy: "We don't have their data, so we BUILD a model from what we CAN see."
 */

import { EventEmitter } from 'events';
import { calculateDegradation, type DegradationResult } from './intelligence.js';
import type { LapData } from './types.js';

/**
 * Inferred opponent state
 */
export interface OpponentModel {
    driverId: string;
    driverName: string;

    // Observable data
    lapTimes: number[];           // All lap times in ms
    cleanLapTimes: number[];      // Filtered lap times (no in/out laps)
    pitStops: PitStopRecord[];

    // Inferred metrics
    currentStintLaps: number;     // Laps since last pit
    inferredDegradation?: DegradationResult;
    inferredFuelLoad?: 'heavy' | 'medium' | 'light';
    inferredTireAge: number;      // Laps on current set

    // Predictions
    predictedPitWindow?: { earliest: number; latest: number };
    predictedCliffLap?: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';

    // Confidence
    confidenceScore: number;      // 0-1, based on data quality
}

export interface PitStopRecord {
    lap: number;
    durationMs: number;
    inferredWork: ('fuel' | 'tires' | 'both')[];
}

// Constants for inference
const TYPICAL_FUEL_ONLY_STOP_MS = 5000;    // ~5s for fuel only
const TYPICAL_TIRE_CHANGE_MS = 12000;      // ~12s for 4 tires
const TYPICAL_FULL_SERVICE_MS = 15000;     // ~15s for fuel + tires
const MAX_STINT_LAPS_ESTIMATE = 35;        // Typical max tire life
const MIN_LAPS_FOR_DEGRADATION = 4;        // Need data to build model

export class OpponentModeler extends EventEmitter {
    private opponents: Map<string, OpponentModel> = new Map();
    // @ts-ignore - Reserved for future use
    private sessionId: string | null = null;

    /**
     * Initialize for a new session
     */
    startSession(sessionId: string): void {
        this.sessionId = sessionId;
        this.opponents.clear();
    }

    /**
     * Record a lap time for an opponent
     */
    recordLapTime(
        driverId: string,
        driverName: string,
        _lapNumber: number, // Reserved for future use
        lapTimeMs: number,
        isInLap: boolean,
        isOutLap: boolean
    ): void {
        let model = this.opponents.get(driverId);

        if (!model) {
            model = this.createNewModel(driverId, driverName);
            this.opponents.set(driverId, model);
        }

        model.lapTimes.push(lapTimeMs);

        // Track clean laps only (no pit in/out)
        if (!isInLap && !isOutLap && lapTimeMs > 0) {
            model.cleanLapTimes.push(lapTimeMs);
        }

        model.currentStintLaps++;
        model.inferredTireAge++;

        // Re-run analysis with new data
        this.analyzeOpponent(model);
    }

    /**
     * Record a pit stop for an opponent
     */
    recordPitStop(driverId: string, lap: number, durationMs: number): void {
        const model = this.opponents.get(driverId);
        if (!model) return;

        // Infer what work was done based on stop duration
        const inferredWork = this.inferPitWork(durationMs);

        model.pitStops.push({
            lap,
            durationMs,
            inferredWork
        });

        // Reset stint counters
        model.currentStintLaps = 0;

        // If tires changed, reset tire age
        if (inferredWork.includes('tires') || inferredWork.includes('both')) {
            model.inferredTireAge = 0;
            model.cleanLapTimes = []; // Reset degradation data
        }

        // If fuel added, estimate load
        if (inferredWork.includes('fuel') || inferredWork.includes('both')) {
            model.inferredFuelLoad = this.inferFuelLoad(durationMs);
        }

        this.analyzeOpponent(model);
    }

    /**
     * Get model for a specific opponent
     */
    getOpponentModel(driverId: string): OpponentModel | undefined {
        return this.opponents.get(driverId);
    }

    /**
     * Get all opponent models
     */
    getAllModels(): OpponentModel[] {
        return Array.from(this.opponents.values());
    }

    /**
     * Get opponents sorted by threat level
     */
    getThreats(): OpponentModel[] {
        const threatOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return this.getAllModels()
            .filter(m => m.threatLevel !== 'low')
            .sort((a, b) => threatOrder[a.threatLevel] - threatOrder[b.threatLevel]);
    }

    // ========================================
    // Private Methods
    // ========================================

    private createNewModel(driverId: string, driverName: string): OpponentModel {
        return {
            driverId,
            driverName,
            lapTimes: [],
            cleanLapTimes: [],
            pitStops: [],
            currentStintLaps: 0,
            inferredTireAge: 0,
            threatLevel: 'low',
            confidenceScore: 0
        };
    }

    private analyzeOpponent(model: OpponentModel): void {
        // 1. Infer degradation from lap time trend
        if (model.cleanLapTimes.length >= MIN_LAPS_FOR_DEGRADATION) {
            // Convert to LapData format for reuse of existing logic
            const fakeLaps: LapData[] = model.cleanLapTimes.map((time, i) => ({
                lapNumber: i + 1,
                lapTimeMs: time,
                fuelUsed: 0,
                fuelRemaining: 0,
                tireWear: { fl: 1, fr: 1, rl: 1, rr: 1 },
                flags: { isClean: true, isInLap: false, isOutLap: false, hadTraffic: false, hadYellow: false, isPersonalBest: false },
                timestamp: Date.now()
            }));

            model.inferredDegradation = calculateDegradation(fakeLaps);
        }

        // 2. Predict pit window
        model.predictedPitWindow = this.predictPitWindow(model);

        // 3. Predict cliff lap
        if (model.inferredDegradation?.projectedCliffLap) {
            // Adjust cliff prediction based on current stint lap
            const currentLap = model.lapTimes.length;
            model.predictedCliffLap = currentLap + model.inferredDegradation.projectedCliffLap - model.currentStintLaps;
        }

        // 4. Calculate threat level
        model.threatLevel = this.calculateThreatLevel(model);

        // 5. Update confidence
        model.confidenceScore = this.calculateConfidence(model);
    }

    private inferPitWork(durationMs: number): ('fuel' | 'tires' | 'both')[] {
        if (durationMs < TYPICAL_FUEL_ONLY_STOP_MS + 2000) {
            return ['fuel']; // Quick stop = fuel only
        } else if (durationMs < TYPICAL_TIRE_CHANGE_MS + 2000) {
            return ['tires']; // Medium stop = tires only (maybe splash fuel)
        } else {
            return ['both']; // Long stop = full service
        }
    }

    private inferFuelLoad(durationMs: number): 'heavy' | 'medium' | 'light' {
        // Longer fuel stops = more fuel added = heavier car
        if (durationMs > TYPICAL_FULL_SERVICE_MS + 5000) {
            return 'heavy';
        } else if (durationMs > TYPICAL_FULL_SERVICE_MS) {
            return 'medium';
        } else {
            return 'light';
        }
    }

    private predictPitWindow(model: OpponentModel): { earliest: number; latest: number } | undefined {
        // If no degradation data, use simple stint length estimate
        const currentLap = model.lapTimes.length;

        if (model.inferredDegradation && model.inferredDegradation.slope > 0.05) {
            // High deg = pit soon
            const lapsUntilCliff = model.inferredDegradation.projectedCliffLap
                ? model.inferredDegradation.projectedCliffLap - model.currentStintLaps
                : MAX_STINT_LAPS_ESTIMATE - model.currentStintLaps;

            return {
                earliest: currentLap + Math.max(1, lapsUntilCliff - 5),
                latest: currentLap + lapsUntilCliff
            };
        }

        // Fallback: Estimate based on typical stint length
        const typicalStintLength = model.pitStops.length > 0
            ? this.averageStintLength(model)
            : MAX_STINT_LAPS_ESTIMATE;

        const lapsRemaining = Math.max(1, typicalStintLength - model.currentStintLaps);

        return {
            earliest: currentLap + Math.max(1, lapsRemaining - 3),
            latest: currentLap + lapsRemaining
        };
    }

    private averageStintLength(model: OpponentModel): number {
        if (model.pitStops.length < 2) return MAX_STINT_LAPS_ESTIMATE;

        let totalLaps = 0;
        for (let i = 1; i < model.pitStops.length; i++) {
            totalLaps += model.pitStops[i].lap - model.pitStops[i - 1].lap;
        }
        return Math.round(totalLaps / (model.pitStops.length - 1));
    }

    private calculateThreatLevel(model: OpponentModel): 'low' | 'medium' | 'high' | 'critical' {
        // Check degradation rate
        const deg = model.inferredDegradation?.slope || 0;

        // High deg + long stint = about to pit (threat for undercut)
        if (deg > 0.15 && model.currentStintLaps > 20) {
            return 'critical';
        }

        // Approaching pit window
        if (model.predictedPitWindow) {
            const currentLap = model.lapTimes.length;
            if (currentLap >= model.predictedPitWindow.earliest - 2) {
                return 'high';
            }
        }

        // Medium deg or medium stint
        if (deg > 0.08 || model.currentStintLaps > 15) {
            return 'medium';
        }

        return 'low';
    }

    private calculateConfidence(model: OpponentModel): number {
        let confidence = 0;

        // More data = higher confidence
        const dataPoints = model.cleanLapTimes.length;
        confidence += Math.min(0.3, dataPoints * 0.05); // Up to 0.3 for 6+ laps

        // Pit stop data helps
        confidence += Math.min(0.2, model.pitStops.length * 0.1);

        // Low variance in lap times = more reliable
        if (dataPoints > 3) {
            const mean = model.cleanLapTimes.reduce((a, b) => a + b, 0) / dataPoints;
            const variance = model.cleanLapTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dataPoints;
            const cv = Math.sqrt(variance) / mean; // Coefficient of variation
            confidence += Math.max(0, 0.3 - cv * 10); // Low CV = high confidence
        }

        // Good R² on degradation = reliable trend
        if (model.inferredDegradation && model.inferredDegradation.r2 > 0.7) {
            confidence += 0.2;
        }

        return Math.min(1, confidence);
    }
}

// Singleton
let opponentModelerInstance: OpponentModeler | null = null;

export function getOpponentModeler(): OpponentModeler {
    if (!opponentModelerInstance) {
        opponentModelerInstance = new OpponentModeler();
    }
    return opponentModelerInstance;
}
