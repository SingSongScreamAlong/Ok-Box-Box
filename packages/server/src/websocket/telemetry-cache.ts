/**
 * Telemetry Cache for Voice Context
 * 
 * Stores latest telemetry data so the voice AI can access real-time info.
 */

export interface CarStanding {
    carIdx: number;
    driverName: string;
    carName: string;
    carClass: string;
    iRating: number;
    position: number;
    classPosition: number;
    lap: number;
    lapDistPct: number;
    onPitRoad: boolean;
    lastLapTime: number;
    bestLapTime: number;
    isPlayer: boolean;
}

export interface TelemetrySnapshot {
    // Track & Session
    trackName?: string;
    trackLength?: string;
    sessionType?: string;
    sessionLaps?: number;
    sessionTimeRemain?: number;
    flagStatus?: string;
    totalCars?: number;
    
    // Weather & Conditions
    trackTemp?: number;
    airTemp?: number;
    humidity?: number;
    windSpeed?: number;
    windDir?: number;
    skyCondition?: string;
    
    // Driver Info
    driverName?: string;
    carName?: string;
    carClass?: string;
    iRating?: number;
    licenseLevel?: string;
    
    // Position & Lap
    position?: number;
    classPosition?: number;
    lap?: number;
    lapsCompleted?: number;
    lapDistPct?: number;
    
    // Speed & Motion
    speed?: number;
    gear?: number;
    rpm?: number;
    throttle?: number;
    brake?: number;
    steeringAngle?: number;
    
    // Lap Times
    lastLapTime?: number;
    bestLapTime?: number;
    deltaToSessionBest?: number;
    deltaToOptimalLap?: number;
    
    // Fuel
    fuelLevel?: number;
    fuelPct?: number;
    fuelUsePerHour?: number;
    
    // Tires — inferred overall life (1.0 = fresh, 0.0 = dead)
    tireWear?: { fl: number; fr: number; rl: number; rr: number };
    // Tire surface wear (raw iRacing L/M/R averaged per corner)
    tireSurfaceWear?: { fl: number; fr: number; rl: number; rr: number };
    tireStintLaps?: number;
    // Tire temps (L/M/R per corner, Celsius)
    tireTemps?: {
        fl: { l: number; m: number; r: number };
        fr: { l: number; m: number; r: number };
        rl: { l: number; m: number; r: number };
        rr: { l: number; m: number; r: number };
    };
    tireCompound?: number;
    
    // Brake pressure per corner (0-100 scale)
    brakePressure?: { fl: number; fr: number; rl: number; rr: number };
    
    // Damage (0.0 = none, 1.0 = totaled) — inferred from telemetry
    damageAero?: number;
    damageEngine?: number;
    
    // Engine health
    oilTemp?: number;
    oilPressure?: number;
    waterTemp?: number;
    voltage?: number;
    engineWarnings?: number;
    
    // Status
    onPitRoad?: boolean;
    isOnTrack?: boolean;
    incidentCount?: number;
    
    // Pit tracking
    pitStops?: number;
    
    // Gaps (seconds)
    gapToLeader?: number;
    gapToCarAhead?: number;
    
    // Fuel per lap (liters)
    fuelPerLap?: number;
    
    // All cars on track (standings)
    standings?: CarStanding[];
    
    updatedAt?: number;
}

// Simple in-memory cache keyed by sessionId
const telemetryCache: Map<string, TelemetrySnapshot> = new Map();

function writeTelemetrySnapshot(sessionId: string, data: Partial<TelemetrySnapshot>): void {
    const existing = telemetryCache.get(sessionId) || {};
    telemetryCache.set(sessionId, {
        ...existing,
        ...data,
        updatedAt: Date.now()
    });
}

export function updateTelemetryCache(sessionId: string, data: Partial<TelemetrySnapshot>): void {
    writeTelemetrySnapshot(sessionId, data);
    if (sessionId !== 'live') {
        writeTelemetrySnapshot('live', data);
    }
}

export function getTelemetryForVoice(sessionId: string): TelemetrySnapshot | undefined {
    return telemetryCache.get(sessionId);
}

export function clearTelemetryCache(sessionId?: string): void {
    if (sessionId) {
        telemetryCache.delete(sessionId);
    } else {
        telemetryCache.clear();
    }
}
