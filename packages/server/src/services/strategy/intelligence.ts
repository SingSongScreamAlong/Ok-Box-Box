/**
 * Degradation Calculator
 * Calculates tire degradation slope using linear regression on lap times.
 */

import type { LapData } from './types.js';

export interface DegradationResult {
    slope: number;           // Seconds lost per lap (e.g., +0.12 means losing 0.12s/lap)
    intercept: number;       // Baseline lap time at stint start
    r2: number;              // Correlation coefficient (0-1, higher = more reliable)
    projectedCliffLap?: number; // Estimated lap where pace drops below threshold
}

/**
 * Calculate degradation using simple linear regression
 * y = lapTime, x = stintLapNumber
 * slope = Σ[(xi - x̄)(yi - ȳ)] / Σ[(xi - x̄)²]
 */
export function calculateDegradation(
    laps: LapData[],
    thresholdPctDropoff: number = 0.03 // 3% slower than baseline = "cliff"
): DegradationResult | undefined {
    // Filter to clean laps only (no in/out laps, no traffic)
    const cleanLaps = laps.filter(
        l => l.flags.isClean && !l.flags.isInLap && !l.flags.isOutLap
    );

    // Need at least 3 data points for meaningful regression
    if (cleanLaps.length < 3) {
        return undefined;
    }

    // Create x (stint lap index) and y (lap time) arrays
    const n = cleanLaps.length;
    const x: number[] = [];
    const y: number[] = [];

    for (let i = 0; i < n; i++) {
        x.push(i + 1); // 1-indexed stint lap
        y.push(cleanLaps[i].lapTimeMs / 1000); // Convert to seconds
    }

    // Calculate means
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
    }

    // Avoid division by zero
    if (denominator === 0) return undefined;

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R² (coefficient of determination)
    let ssRes = 0; // Residual sum of squares
    let ssTot = 0; // Total sum of squares

    for (let i = 0; i < n; i++) {
        const predicted = slope * x[i] + intercept;
        ssRes += Math.pow(y[i] - predicted, 2);
        ssTot += Math.pow(y[i] - yMean, 2);
    }

    const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    // Calculate projected cliff lap (when lap time exceeds threshold % of baseline)
    let projectedCliffLap: number | undefined;

    if (slope > 0) { // Only if we're actually losing time
        const baselineLapTime = intercept; // Lap time at stint lap 1
        const cliffLapTime = baselineLapTime * (1 + thresholdPctDropoff);

        // Solve: cliffLapTime = slope * cliffLap + intercept
        // cliffLap = (cliffLapTime - intercept) / slope
        projectedCliffLap = Math.ceil((cliffLapTime - intercept) / slope);

        // Sanity check: cliff should be in the future
        if (projectedCliffLap <= cleanLaps.length) {
            projectedCliffLap = undefined; // Already past the cliff? Data might be noisy
        }
    }

    return {
        slope,
        intercept,
        r2,
        projectedCliffLap
    };
}

/**
 * Calculate fuel consumption statistics
 */
export interface FuelStats {
    averagePerLap: number;
    minPerLap: number;
    maxPerLap: number;
    lapsRemaining: number;
    pitWindowOpen: number;   // Lap when you CAN make it to end
    pitWindowOptimal: number; // Lap when you SHOULD pit for safety margin
}

export function calculateFuelStats(
    laps: LapData[],
    currentFuelLevel: number,
    totalRaceLaps: number,
    currentLap: number,
    safetyMarginLaps: number = 1 // Extra lap of fuel for margin
): FuelStats | undefined {
    // Get laps with valid fuel data
    const validLaps = laps.filter(l => l.fuelUsed > 0);

    if (validLaps.length < 2) return undefined;

    const fuelPerLap = validLaps.map(l => l.fuelUsed);
    const averagePerLap = fuelPerLap.reduce((a, b) => a + b, 0) / fuelPerLap.length;
    const minPerLap = Math.min(...fuelPerLap);
    const maxPerLap = Math.max(...fuelPerLap);

    // Calculate laps remaining with current fuel
    const lapsRemaining = Math.floor(currentFuelLevel / averagePerLap);

    // Calculate pit windows
    const lapsToGo = totalRaceLaps - currentLap;
    const fuelNeeded = lapsToGo * averagePerLap;
    const fuelDeficit = fuelNeeded - currentFuelLevel;

    // If we have enough fuel, no pit needed
    if (fuelDeficit <= 0) {
        return {
            averagePerLap,
            minPerLap,
            maxPerLap,
            lapsRemaining,
            pitWindowOpen: totalRaceLaps + 1, // No pit needed
            pitWindowOptimal: totalRaceLaps + 1
        };
    }

    // Calculate last lap we can pit and still finish
    const pitWindowOpen = currentLap + lapsRemaining;
    const pitWindowOptimal = pitWindowOpen - safetyMarginLaps;

    return {
        averagePerLap,
        minPerLap,
        maxPerLap,
        lapsRemaining,
        pitWindowOpen,
        pitWindowOptimal
    };
}
