/**
 * Strategy Service
 * The "Brain" for race strategy intelligence.
 * Orchestrates LapTracker, StintTracker, and future intelligence models.
 */

import { EventEmitter } from 'events';
import { LapTracker } from './lap-tracker.js';
import { StintTracker } from './stint-tracker.js';
import { calculateDegradation } from './intelligence.js';
import type { LapData, DriverStrategyState, StrategyUpdateEvent } from './types.js';

export interface StrategyServiceEvents {
    'strategy:update': (event: StrategyUpdateEvent) => void;
}

interface DriverState {
    driverId: string;
    currentLap: number;
    lapDistPct: number;
    inPit: boolean;
    fuel: { level: number; pct: number };
    tires: { fl: number; fr: number; rl: number; rr: number };
}

export class StrategyService extends EventEmitter {
    private lapTracker: LapTracker;
    private stintTracker: StintTracker;
    private driverStates: Map<string, DriverState> = new Map();
    private sessionId: string | null = null;

    constructor() {
        super();
        this.lapTracker = new LapTracker();
        this.stintTracker = new StintTracker();

        // Wire up events
        this.lapTracker.on('lap:completed', (driverId: string, lap: LapData) => {
            this.stintTracker.addLapToStint(driverId, lap);
            this.broadcastUpdate();
        });
    }

    /**
     * Initialize for a new session
     */
    startSession(sessionId: string): void {
        this.sessionId = sessionId;
        this.lapTracker.reset();
        this.stintTracker.reset();
        this.driverStates.clear();
    }

    /**
     * Process incoming telemetry tick (60Hz path)
     * Lightweight: Only update position tracking here
     */
    processTelemetryTick(
        driverId: string,
        lapDistPct: number,
        currentLap: number,
        inPit: boolean,
        sessionTimeMs: number
    ): void {
        let state = this.driverStates.get(driverId);
        if (!state) {
            state = {
                driverId,
                currentLap,
                lapDistPct,
                inPit,
                fuel: { level: 0, pct: 0 },
                tires: { fl: 1, fr: 1, rl: 1, rr: 1 }
            };
            this.driverStates.set(driverId, state);
        }

        // Update position state
        state.lapDistPct = lapDistPct;
        state.currentLap = currentLap;
        state.inPit = inPit;

        // Process lap detection
        this.lapTracker.processTick(
            driverId,
            lapDistPct,
            currentLap,
            inPit,
            state.fuel.level,
            state.tires,
            sessionTimeMs
        );

        // Process stint detection
        this.stintTracker.processPitState(
            driverId,
            inPit,
            currentLap,
            state.fuel.level,
            sessionTimeMs
        );
    }

    /**
     * Process strategy update (1Hz path)
     * Heavy: Update fuel, tires, and run analysis
     */
    processStrategyUpdate(
        driverId: string,
        fuel: { level: number; pct: number },
        tires: { fl: number; fr: number; rl: number; rr: number }
    ): void {
        const state = this.driverStates.get(driverId);
        if (state) {
            state.fuel = fuel;
            state.tires = tires;
        }
    }

    /**
     * Get strategy state for a driver
     */
    getDriverStrategy(driverId: string): DriverStrategyState | undefined {
        const state = this.driverStates.get(driverId);
        if (!state) return undefined;

        const currentStint = this.stintTracker.getCurrentStint(driverId);
        const allStints = this.stintTracker.getAllStints(driverId);
        const allLaps = this.lapTracker.getDriverLaps(driverId);
        const cleanLaps = this.lapTracker.getCleanLaps(driverId);

        // Calculate rolling pace (Phase 13 enhancement)
        const rollingPace3Lap = this.calculateRollingPace(cleanLaps, 3);
        const rollingPace5Lap = this.calculateRollingPace(cleanLaps, 5);

        // Calculate fuel per lap
        const fuelPerLap = this.calculateFuelPerLap(allLaps);

        // Estimate laps remaining
        const estimatedLapsRemaining = (fuelPerLap !== undefined && fuelPerLap > 0)
            ? Math.floor(state.fuel.level / fuelPerLap)
            : undefined;

        // Phase 13: Calculate degradation
        const stintLaps = currentStint?.laps || [];
        const degradation = calculateDegradation(stintLaps);
        const degradationSlope = degradation?.slope;
        const projectedCliffLap = degradation?.projectedCliffLap;

        return {
            driverId,
            currentLap: state.currentLap,
            currentStint: currentStint!,
            allStints,
            allLaps,
            rollingPace3Lap,
            rollingPace5Lap,
            fuelPerLap,
            estimatedLapsRemaining,
            degradationSlope,
            projectedCliffLap
        };
    }

    /**
     * Broadcast strategy update to all listeners
     */
    private broadcastUpdate(): void {
        if (!this.sessionId) return;

        const drivers: StrategyUpdateEvent['drivers'] = [];

        for (const [driverId, state] of this.driverStates) {
            const strategy = this.getDriverStrategy(driverId);
            if (!strategy) continue;

            drivers.push({
                driverId,
                currentStintLaps: this.stintTracker.getCurrentStintLaps(driverId),
                tireAge: strategy.allLaps.length - (strategy.currentStint?.startLap || 0),
                fuelPct: state.fuel.pct,
                fuelPerLap: strategy.fuelPerLap || 0,
                degradationSlope: strategy.degradationSlope || 0,
                estimatedLapsRemaining: strategy.estimatedLapsRemaining || 0,
                projectedCliffLap: strategy.projectedCliffLap
            });
        }

        const event: StrategyUpdateEvent = {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            drivers
        };

        this.emit('strategy:update', event);
    }

    /**
     * Calculate rolling average pace
     */
    private calculateRollingPace(cleanLaps: LapData[], window: number): number | undefined {
        if (cleanLaps.length < window) return undefined;
        const recentLaps = cleanLaps.slice(-window);
        const sum = recentLaps.reduce((acc, l) => acc + l.lapTimeMs, 0);
        return sum / window;
    }

    /**
     * Calculate average fuel consumption per lap
     */
    private calculateFuelPerLap(laps: LapData[]): number | undefined {
        const validLaps = laps.filter(l => l.fuelUsed > 0);
        if (validLaps.length === 0) return undefined;
        const sum = validLaps.reduce((acc, l) => acc + l.fuelUsed, 0);
        return sum / validLaps.length;
    }
}

// Singleton instance
let strategyServiceInstance: StrategyService | null = null;

export function getStrategyService(): StrategyService {
    if (!strategyServiceInstance) {
        strategyServiceInstance = new StrategyService();
    }
    return strategyServiceInstance;
}
