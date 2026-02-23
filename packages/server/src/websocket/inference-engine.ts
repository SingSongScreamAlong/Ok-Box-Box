/**
 * Inference Engine — Server-Side Telemetry Intelligence
 *
 * All computation that was previously in the Python relay now lives here.
 * The relay is a dumb pipe; this engine processes raw iRacing data into
 * actionable strategy values:
 *   - Tire wear (inferred from temps, speed, steering, brake, laps)
 *   - Gap calculations (from CarIdxF2Time / CarIdxEstTime)
 *   - Pit stop tracking (from onPitRoad transitions)
 *   - Damage inference (from top speed loss + engine temp baselines)
 *   - Brake pressure (from pedal input + brake bias)
 *   - Fuel per lap (from usePerHour + best lap time)
 *
 * One InferenceEngine instance per active session.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TireWearCorners {
    fl: number;
    fr: number;
    rl: number;
    rr: number;
}

export interface TireTempsLMR {
    l: number;
    m: number;
    r: number;
}

export interface EngineHealthData {
    oilTemp: number;
    oilPressure: number;
    waterTemp: number;
    voltage: number;
    warnings: number;
}

export interface BrakePressureData {
    fl: number;
    fr: number;
    rl: number;
    rr: number;
}

export interface InferredStrategy {
    tireWear: TireWearCorners;
    tireTemps: {
        fl: TireTempsLMR;
        fr: TireTempsLMR;
        rl: TireTempsLMR;
        rr: TireTempsLMR;
    } | null;
    tireStintLaps: number;
    tireCompound: number | null;
    damage: { aero: number; engine: number };
    engine: EngineHealthData;
    brakePressure: BrakePressureData;
    fuel: {
        level: number;
        pct: number;
        perLap: number | null;
        usePerHour: number;
    };
    pit: { inLane: boolean; stops: number };
    gaps: { toLeader: number; toCarAhead: number };
}

// ---------------------------------------------------------------------------
// Constants — Tire Wear Model
// ---------------------------------------------------------------------------

const TIRE_OPTIMAL_TEMP_LOW = 80.0;
const TIRE_OPTIMAL_TEMP_HIGH = 110.0;
const BASE_WEAR_PER_LAP = 0.018;
const OVERHEAT_WEAR_MULT = 1.6;
const UNDERHEAT_WEAR_MULT = 1.1;
const FRONT_BIAS = 1.15;
const REAR_BIAS = 0.90;
const LOAD_WEAR_SCALE = 0.0001;

const CORNERS = ['fl', 'fr', 'rl', 'rr'] as const;
type Corner = typeof CORNERS[number];

// ---------------------------------------------------------------------------
// Per-Session Engine
// ---------------------------------------------------------------------------

export class InferenceEngine {
    // Tire wear state
    private tireWear: TireWearCorners = { fl: 1, fr: 1, rl: 1, rr: 1 };
    private tireStintLaps = 0;
    private lastLapForWear = -1;
    private tireTempsAccum: Record<Corner, number[]> = { fl: [], fr: [], rl: [], rr: [] };
    private lastTireTemps: InferredStrategy['tireTemps'] = null;
    private tireCompound: number | null = null;

    // Pit tracking
    private pitStops = 0;
    private wasOnPitRoad = false;
    private pitEntryLap = -1;

    // Damage inference
    private baselineTopSpeed: number | null = null;
    private recentTopSpeeds: number[] = [];
    private damageAero = 0;
    private damageEngine = 0;
    private baselineOilTemp: number | null = null;
    private baselineWaterTemp: number | null = null;

    // Latest engine health
    private engineHealth: EngineHealthData = {
        oilTemp: 0, oilPressure: 0, waterTemp: 0, voltage: 0, warnings: 0,
    };

    // Latest fuel
    private fuelPerLap: number | null = null;

    // Latest gaps
    private gapToLeader = 0;
    private gapToCarAhead = 0;

    // ---------------------------------------------------------------------------
    // Public API — called by TelemetryHandler
    // ---------------------------------------------------------------------------

    /**
     * Process a 60Hz raw telemetry frame from the relay.
     * Updates tire wear accumulators, damage baselines, pit tracking, and gaps.
     */
    processTelemetry(data: any): void {
        const car = data?.cars?.[0];
        if (!car) return;

        const speed: number = car.speed ?? 0;
        const throttle: number = car.throttle ?? 0;
        const brake: number = car.brake ?? 0;
        const steering: number = car.steeringAngle ?? 0;
        const currentLap: number = car.lap ?? 0;
        const onPitRoad: boolean = !!car.onPitRoad;

        // Accumulate tire temps for wear calculation
        if (car.tireTempsRaw) {
            for (const corner of CORNERS) {
                const raw = car.tireTempsRaw[corner];
                if (raw) {
                    const avg = ((raw.l ?? 0) + (raw.m ?? 0) + (raw.r ?? 0)) / 3;
                    this.tireTempsAccum[corner].push(avg);
                }
            }
        }

        // On new lap, compute wear for the completed lap
        if (currentLap > this.lastLapForWear && this.lastLapForWear >= 0) {
            this.tireStintLaps++;
            for (const corner of CORNERS) {
                const temps = this.tireTempsAccum[corner];
                const avgTemp = temps.length > 0
                    ? temps.reduce((a, b) => a + b, 0) / temps.length
                    : 90;
                const wearDelta = this.computeWearForLap(corner, avgTemp, speed, steering, brake);
                this.tireWear[corner] = Math.max(0, this.tireWear[corner] - wearDelta);
                this.tireTempsAccum[corner] = [];
            }
        }
        this.lastLapForWear = currentLap;

        // Pit tracking
        this.updatePitTracking(onPitRoad, currentLap);

        // Damage inference (aero from top speed, engine from temps)
        this.updateDamageInference(speed, throttle, car);

        // Gap calculation from standings
        this.computeGaps(car, data.standings);
    }

    /**
     * Process a 1Hz raw strategy frame from the relay.
     * Updates engine health, fuel, tire temps snapshot, brake pressure.
     */
    processStrategyRaw(data: any): void {
        const car = data?.cars?.[0];
        if (!car) return;

        // Engine health
        this.engineHealth = {
            oilTemp: car.oilTemp ?? 0,
            oilPressure: car.oilPress ?? 0,
            waterTemp: car.waterTemp ?? 0,
            voltage: car.voltage ?? 0,
            warnings: car.engineWarnings ?? 0,
        };

        // Tire temps snapshot (L/M/R)
        if (car.tireTemps) {
            this.lastTireTemps = car.tireTemps;
        }

        // Tire compound
        if (car.tireCompound != null) {
            this.tireCompound = car.tireCompound;
        }

        // Fuel per lap
        const usePerHour = car.fuelUsePerHour ?? 0;
        const bestLap = car.bestLapTime ?? 0;
        if (usePerHour > 0 && bestLap > 0) {
            this.fuelPerLap = Math.round(((usePerHour / 3600) * bestLap) * 1000) / 1000;
        } else {
            this.fuelPerLap = null;
        }
    }

    /**
     * Get the current inferred strategy snapshot.
     * Called by TelemetryHandler to build the strategy_update broadcast.
     */
    getInferredStrategy(rawCar: any): InferredStrategy {
        const fuelLevel = rawCar?.fuelLevel ?? rawCar?.fuel?.level ?? 0;
        const fuelPct = rawCar?.fuelPct ?? rawCar?.fuel?.pct ?? 0;
        const usePerHour = rawCar?.fuelUsePerHour ?? rawCar?.fuel?.usePerHour ?? 0;
        const onPitRoad = !!rawCar?.onPitRoad;
        const brake = rawCar?.brake ?? 0;
        const brakeBias = rawCar?.brakeBias ?? 55;

        return {
            tireWear: {
                fl: Math.round(this.tireWear.fl * 1000) / 1000,
                fr: Math.round(this.tireWear.fr * 1000) / 1000,
                rl: Math.round(this.tireWear.rl * 1000) / 1000,
                rr: Math.round(this.tireWear.rr * 1000) / 1000,
            },
            tireTemps: this.lastTireTemps,
            tireStintLaps: this.tireStintLaps,
            tireCompound: this.tireCompound,
            damage: {
                aero: Math.round(this.damageAero * 1000) / 1000,
                engine: Math.round(this.damageEngine * 1000) / 1000,
            },
            engine: { ...this.engineHealth },
            brakePressure: this.computeBrakePressure(brake, brakeBias),
            fuel: {
                level: Math.round(fuelLevel * 100) / 100,
                pct: Math.round(fuelPct * 10000) / 10000,
                perLap: this.fuelPerLap,
                usePerHour: Math.round(usePerHour * 100) / 100,
            },
            pit: {
                inLane: onPitRoad,
                stops: this.pitStops,
            },
            gaps: {
                toLeader: this.gapToLeader,
                toCarAhead: this.gapToCarAhead,
            },
        };
    }

    // ---------------------------------------------------------------------------
    // Private — Tire Wear
    // ---------------------------------------------------------------------------

    private computeWearForLap(
        corner: Corner, avgTemp: number, speed: number, steering: number, brake: number,
    ): number {
        // Temperature factor
        let tempFactor: number;
        if (avgTemp < TIRE_OPTIMAL_TEMP_LOW) {
            tempFactor = UNDERHEAT_WEAR_MULT;
        } else if (avgTemp > TIRE_OPTIMAL_TEMP_HIGH) {
            const overheat = (avgTemp - TIRE_OPTIMAL_TEMP_HIGH) / 30;
            tempFactor = OVERHEAT_WEAR_MULT + overheat;
        } else {
            tempFactor = 1.0;
        }

        // Axle bias
        const axleFactor = (corner === 'fl' || corner === 'fr') ? FRONT_BIAS : REAR_BIAS;

        // Load factor
        const load = speed * (Math.abs(steering) + brake * 0.5);
        const loadFactor = 1.0 + load * LOAD_WEAR_SCALE;

        const wearDelta = BASE_WEAR_PER_LAP * tempFactor * axleFactor * loadFactor;
        return Math.max(0, Math.min(wearDelta, 0.10));
    }

    private resetTireState(): void {
        this.tireWear = { fl: 1, fr: 1, rl: 1, rr: 1 };
        this.tireStintLaps = 0;
        this.lastLapForWear = -1;
        this.tireTempsAccum = { fl: [], fr: [], rl: [], rr: [] };
    }

    // ---------------------------------------------------------------------------
    // Private — Pit Tracking
    // ---------------------------------------------------------------------------

    private updatePitTracking(onPitRoad: boolean, currentLap: number): void {
        if (onPitRoad && !this.wasOnPitRoad) {
            this.pitEntryLap = currentLap;
        }
        if (!onPitRoad && this.wasOnPitRoad) {
            if (this.pitEntryLap >= 0) {
                this.pitStops++;
                this.resetTireState();
            }
        }
        this.wasOnPitRoad = onPitRoad;
    }

    // ---------------------------------------------------------------------------
    // Private — Damage Inference
    // ---------------------------------------------------------------------------

    private updateDamageInference(speed: number, throttle: number, car: any): void {
        // Aero: track top speed at full throttle
        if (throttle > 0.95 && speed > 20) {
            this.recentTopSpeeds.push(speed);
            if (this.recentTopSpeeds.length > 120) {
                this.recentTopSpeeds = this.recentTopSpeeds.slice(-120);
            }
        }

        if (this.baselineTopSpeed === null && this.recentTopSpeeds.length >= 60) {
            this.baselineTopSpeed = Math.max(...this.recentTopSpeeds);
        }

        if (this.baselineTopSpeed && this.baselineTopSpeed > 0 && this.recentTopSpeeds.length >= 30) {
            const currentTop = Math.max(...this.recentTopSpeeds.slice(-30));
            const speedLossPct = Math.max(0, (this.baselineTopSpeed - currentTop) / this.baselineTopSpeed);
            this.damageAero = Math.min(1.0, speedLossPct / 0.05);
        } else {
            this.damageAero = 0;
        }

        // Engine: temp deviation from baseline
        const oilTemp = car.oilTemp ?? 0;
        const waterTemp = car.waterTemp ?? 0;
        const oilPress = car.oilPress ?? 0;

        if (oilTemp > 50 && waterTemp > 50) {
            if (this.baselineOilTemp === null) {
                this.baselineOilTemp = oilTemp;
                this.baselineWaterTemp = waterTemp;
            } else {
                if (oilTemp < this.baselineOilTemp + 5) {
                    this.baselineOilTemp = this.baselineOilTemp * 0.999 + oilTemp * 0.001;
                }
                if (waterTemp < (this.baselineWaterTemp ?? 0) + 5) {
                    this.baselineWaterTemp = (this.baselineWaterTemp ?? 0) * 0.999 + waterTemp * 0.001;
                }
            }
        }

        if (this.baselineOilTemp && this.baselineWaterTemp) {
            const oilExcess = Math.max(0, oilTemp - this.baselineOilTemp - 10) / 30;
            const waterExcess = Math.max(0, waterTemp - this.baselineWaterTemp - 10) / 30;
            let oilPressFactor = 0;
            if (oilPress > 0 && oilPress < 200) {
                oilPressFactor = Math.max(0, (300 - oilPress) / 300);
            }
            this.damageEngine = Math.min(1.0, Math.max(oilExcess, waterExcess, oilPressFactor));
        } else {
            this.damageEngine = 0;
        }
    }

    // ---------------------------------------------------------------------------
    // Private — Gap Calculation
    // ---------------------------------------------------------------------------

    private computeGaps(car: any, standings: any[] | undefined): void {
        if (!standings || standings.length === 0) {
            return;
        }

        const playerIdx = car.carId ?? car.carIdx;
        const playerPos = car.position ?? 0;

        // Gap to leader from f2Time (iRacing native)
        const playerStanding = standings.find((s: any) => s.carIdx === playerIdx || s.isPlayer);
        if (playerStanding?.f2Time && playerStanding.f2Time > 0) {
            this.gapToLeader = Math.round(Math.abs(playerStanding.f2Time) * 1000) / 1000;
        } else {
            // Fallback: lap fraction difference
            const leader = standings.find((s: any) => s.position === 1);
            if (leader && car.bestLapTime && car.bestLapTime > 0 && playerPos > 1) {
                const playerProgress = (car.lap ?? 0) + (car.lapDistPct ?? 0);
                const leaderProgress = (leader.lap ?? 0) + (leader.lapDistPct ?? 0);
                this.gapToLeader = Math.round(Math.abs((leaderProgress - playerProgress) * car.bestLapTime) * 1000) / 1000;
            }
        }

        // Gap to car ahead from estTime differential
        if (playerPos > 1) {
            const carAhead = standings.find((s: any) => s.position === playerPos - 1);
            if (carAhead && playerStanding) {
                const playerEst = playerStanding.estTime ?? 0;
                const aheadEst = carAhead.estTime ?? 0;
                if (playerEst > 0 && aheadEst > 0) {
                    this.gapToCarAhead = Math.round(Math.abs(playerEst - aheadEst) * 1000) / 1000;
                }
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Private — Brake Pressure
    // ---------------------------------------------------------------------------

    private computeBrakePressure(brake: number, brakeBias: number): BrakePressureData {
        const frontPct = brakeBias / 100;
        const rearPct = 1 - frontPct;
        const pressure = brake * 100;
        return {
            fl: Math.round(pressure * frontPct * 0.5 * 10) / 10,
            fr: Math.round(pressure * frontPct * 0.5 * 10) / 10,
            rl: Math.round(pressure * rearPct * 0.5 * 10) / 10,
            rr: Math.round(pressure * rearPct * 0.5 * 10) / 10,
        };
    }
}

// ---------------------------------------------------------------------------
// Session Registry — one engine per session
// ---------------------------------------------------------------------------

const engines: Map<string, InferenceEngine> = new Map();

export function getOrCreateEngine(sessionId: string): InferenceEngine {
    let engine = engines.get(sessionId);
    if (!engine) {
        engine = new InferenceEngine();
        engines.set(sessionId, engine);
        console.log(`[InferenceEngine] Created engine for session: ${sessionId}`);
    }
    return engine;
}

export function destroyEngine(sessionId: string): void {
    engines.delete(sessionId);
}

export function getEngine(sessionId: string): InferenceEngine | undefined {
    return engines.get(sessionId);
}
