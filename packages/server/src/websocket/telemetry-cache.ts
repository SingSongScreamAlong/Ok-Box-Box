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
    
    // Tires
    tireLFwear?: number;
    tireRFwear?: number;
    tireLRwear?: number;
    tireRRwear?: number;
    
    // Temperatures
    oilTemp?: number;
    waterTemp?: number;
    
    // Status
    onPitRoad?: boolean;
    isOnTrack?: boolean;
    incidentCount?: number;
    
    // Gaps
    gapToLeader?: number;
    gapToCarAhead?: number;
    
    // All cars on track (standings)
    standings?: CarStanding[];
    
    updatedAt?: number;
}

// Simple in-memory cache keyed by sessionId
const telemetryCache: Map<string, TelemetrySnapshot> = new Map();

export function updateTelemetryCache(sessionId: string, data: Partial<TelemetrySnapshot>): void {
    const existing = telemetryCache.get(sessionId) || {};
    telemetryCache.set(sessionId, { 
        ...existing, 
        ...data,
        updatedAt: Date.now()
    });
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
