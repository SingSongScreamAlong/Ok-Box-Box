import { Server, Socket } from 'socket.io';
import { activeSessions } from './SessionHandler.js';
import { RelayAdapter } from '../services/RelayAdapter.js';
import { getSituationalAwarenessService } from '../services/ai/situational-awareness.js';
import { updateTelemetryCache } from './telemetry-cache.js';
import { getOrCreateEngine } from './inference-engine.js';
import { getOrCreateAnalyzer } from '../services/ai/live-session-analyzer.js';
import { generateSpotterCallouts } from '../services/ai/proactive-spotter.js';
import { wsLogger, logOncePerInterval } from '../observability/logger.js';
import { pushTelemetryToStream, TelemetryPacket } from '../services/telemetry/telemetry-streams.js';
import { getClassificationEngine } from '../services/incidents/classification-engine.js';

// Store current session info for late-joining clients
let currentSessionInfo: { sessionId: string; trackName: string; trackId?: number; sessionType: string; carName?: string; rpmRedline?: number; fuelTankCapacity?: number; trackLength?: string } | null = null;

/**
 * Normalize raw iRacing telemetry from desktop relay into the format expected by the handler.
 * Desktop relay sends: { sessionId, timestamp, playerCarIdx, activeCarIdx, isSpectating, raw: <iRacing telemetry> }
 * This extracts and transforms the raw data into our standard format.
 */
function normalizeRawTelemetry(data: any): any {
    // If no raw field, assume it's already in the expected format (Python relay)
    if (!data?.raw) return data;
    
    const raw = data.raw;
    const playerCarIdx = data.playerCarIdx ?? raw.PlayerCarIdx ?? 0;
    const activeCarIdx = data.activeCarIdx ?? playerCarIdx;
    const isSpectating = data.isSpectating ?? false;
    
    // Extract session context
    const sessionFlags = raw.SessionFlags ?? 0;
    let flagStatus = 'green';
    if (sessionFlags & 0x0001) flagStatus = 'checkered';
    else if (sessionFlags & 0x0002) flagStatus = 'white';
    else if (sessionFlags & 0x0004) flagStatus = 'green';
    else if (sessionFlags & 0x0008) flagStatus = 'yellow';
    else if (sessionFlags & 0x0010) flagStatus = 'red';
    else if (sessionFlags & 0x0020) flagStatus = 'blue';
    else if (sessionFlags & 0x4000) flagStatus = 'caution';
    
    // Build car data for the active car (player or spectated)
    const activeCar = {
        carIdx: activeCarIdx,
        carId: activeCarIdx,
        driverId: String(activeCarIdx),
        isPlayer: !isSpectating,
        isSpectated: isSpectating,
        
        // Position & Lap from CarIdx arrays
        position: raw.CarIdxPosition?.[activeCarIdx] || 0,
        classPosition: raw.CarIdxClassPosition?.[activeCarIdx] || 0,
        lap: raw.CarIdxLap?.[activeCarIdx] || raw.Lap || 0,
        lapDistPct: raw.CarIdxLapDistPct?.[activeCarIdx] || raw.LapDistPct || 0,
        
        // Speed & Motion (only for player car, not spectated)
        speed: isSpectating ? 0 : (raw.Speed || 0),
        gear: isSpectating ? 0 : (raw.Gear || 0),
        rpm: isSpectating ? 0 : (raw.RPM || 0),
        throttle: isSpectating ? 0 : (raw.Throttle || 0),
        brake: isSpectating ? 0 : (raw.Brake || 0),
        clutch: isSpectating ? 0 : (raw.Clutch || 0),
        steeringAngle: isSpectating ? 0 : (raw.SteeringWheelAngle || 0),
        
        // Lap Times
        lastLapTime: raw.CarIdxLastLapTime?.[activeCarIdx] || raw.LapLastLapTime || 0,
        bestLapTime: raw.CarIdxBestLapTime?.[activeCarIdx] || raw.LapBestLapTime || 0,
        deltaToSessionBest: isSpectating ? 0 : (raw.LapDeltaToSessionBestLap || 0),
        deltaToOptimalLap: isSpectating ? 0 : (raw.LapDeltaToOptimalLap || 0),
        
        // Fuel
        fuelLevel: isSpectating ? 0 : (raw.FuelLevel || 0),
        fuelPct: isSpectating ? 0 : (raw.FuelLevelPct || 0),
        fuelUsePerHour: isSpectating ? 0 : (raw.FuelUsePerHour || 0),
        
        // Tires (raw data for inference engine)
        tireWearRaw: {
            LF: [raw.LFwearL, raw.LFwearM, raw.LFwearR],
            RF: [raw.RFwearL, raw.RFwearM, raw.RFwearR],
            LR: [raw.LRwearL, raw.LRwearM, raw.LRwearR],
            RR: [raw.RRwearL, raw.RRwearM, raw.RRwearR],
        },
        tireTempsRaw: {
            LF: [raw.LFtempCL, raw.LFtempCM, raw.LFtempCR],
            RF: [raw.RFtempCL, raw.RFtempCM, raw.RFtempCR],
            LR: [raw.LRtempCL, raw.LRtempCM, raw.LRtempCR],
            RR: [raw.RRtempCL, raw.RRtempCM, raw.RRtempCR],
        },
        
        // Engine
        oilTemp: raw.OilTemp || 0,
        oilPress: raw.OilPress || 0,
        waterTemp: raw.WaterTemp || 0,
        voltage: raw.Voltage || 0,
        
        // Brake bias
        brakeBias: raw.dcBrakeBias || 55,
        
        // Status
        onPitRoad: raw.CarIdxOnPitRoad?.[activeCarIdx] || raw.OnPitRoad || false,
        isOnTrack: raw.IsOnTrack || false,
        incidentCount: isSpectating ? 0 : (raw.PlayerCarMyIncidentCount || 0),
        
        // Gap data for inference
        estTime: raw.CarIdxEstTime?.[activeCarIdx] || 0,
        f2Time: raw.CarIdxF2Time?.[activeCarIdx] || 0,
    };
    
    // Build all cars array from CarIdx data
    const cars: any[] = [];
    const numCars = raw.CarIdxPosition?.length || 0;
    for (let i = 0; i < numCars; i++) {
        const pos = raw.CarIdxPosition?.[i];
        if (pos > 0 || i === playerCarIdx) {
            cars.push({
                carIdx: i,
                carId: i,
                driverId: String(i),
                position: pos || 0,
                classPosition: raw.CarIdxClassPosition?.[i] || 0,
                lap: raw.CarIdxLap?.[i] || 0,
                lapDistPct: raw.CarIdxLapDistPct?.[i] || 0,
                onPitRoad: raw.CarIdxOnPitRoad?.[i] || false,
                lastLapTime: raw.CarIdxLastLapTime?.[i] || 0,
                bestLapTime: raw.CarIdxBestLapTime?.[i] || 0,
                estTime: raw.CarIdxEstTime?.[i] || 0,
                f2Time: raw.CarIdxF2Time?.[i] || 0,
                isPlayer: i === playerCarIdx,
            });
        }
    }
    
    return {
        sessionId: data.sessionId,
        timestamp: data.timestamp,
        sessionTime: raw.SessionTime || 0,
        sessionTimeMs: (raw.SessionTime || 0) * 1000,
        playerCarIdx,
        activeCarIdx,
        isSpectating,
        
        // Session context
        flagStatus,
        trackTemp: raw.TrackTemp || 0,
        airTemp: raw.AirTemp || 0,
        humidity: raw.RelativeHumidity || 0,
        windSpeed: raw.WindVel || 0,
        windDir: raw.WindDir || 0,
        skies: raw.Skies || 0,
        sessionTimeRemain: raw.SessionTimeRemain || 0,
        sessionLapsRemain: raw.SessionLapsRemain || 0,
        
        // Cars
        car: activeCar,
        cars,
        
        // Pass through raw for inference engine
        raw,
    };
}

/**
 * Normalize raw session_info from desktop relay.
 * Desktop relay sends: { sessionId, timestamp, raw: <iRacing sessionInfo> }
 */
function normalizeRawSessionInfo(data: any): any {
    if (!data?.raw) return data;
    
    const raw = data.raw;
    const weekendInfo = raw.WeekendInfo || {};
    const driverInfo = raw.DriverInfo || {};
    const sessionInfo = raw.SessionInfo || {};
    
    return {
        sessionId: data.sessionId,
        timestamp: data.timestamp,
        trackName: weekendInfo.TrackDisplayName || weekendInfo.TrackName || 'Unknown Track',
        trackId: weekendInfo.TrackID,
        trackLength: weekendInfo.TrackLength || '0 km',
        sessionType: sessionInfo.Sessions?.[0]?.SessionType?.toLowerCase() || 'practice',
        drivers: driverInfo.Drivers || [],
        raw,
    };
}

export class TelemetryHandler {
    private static firstPacketLogged = false;
    private lastSessionInfoEmit = 0;
    private static readonly SLOW_EMIT_INTERVAL = 1000; // 1Hz for slowly-changing data
    private lastWeather: { trackTemp: number; airTemp: number; humidity: number; windSpeed: number; windDir: number; skyCondition: string } | null = null;
    private cachedStandings: any[] = []; // Full standings from 1Hz standings event (no cap)
    private cachedDrivers: any[] = []; // Driver info from session_info (desktop relay)
    private lastCarStatusEmit: Map<string, number> = new Map();
     
    constructor(private io: Server) { }
     
    // Get current session info for late-joining clients
    public static getCurrentSessionInfo() {
        return currentSessionInfo;
    }
    
    private formatLapTime(seconds: number): string {
        if (!seconds || seconds <= 0) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
    }

    private computeGapFromCarBehind(position: number, carId: string | number): number {
        if (!this.cachedStandings || this.cachedStandings.length === 0) {
            return 0;
        }

        const normalizedPosition = position || 1;
        const carBehind = this.cachedStandings.find((s: any) => s.position === normalizedPosition + 1);
        const playerStanding = this.cachedStandings.find((s: any) => s.isPlayer || s.carIdx === carId || s.carId === carId);
        if (!carBehind || !playerStanding) {
            return 0;
        }

        const playerEst = playerStanding.estTime ?? 0;
        const behindEst = carBehind.estTime ?? 0;
        if (playerEst > 0 && behindEst > 0) {
            return Math.round(Math.abs(behindEst - playerEst) * 1000) / 1000;
        }

        return 0;
    }

    private emitCarStatus(sessionId: string, inferred: any, rawCar: any, force: boolean = false): void {
        const now = Date.now();
        const lastEmit = this.lastCarStatusEmit.get(sessionId) || 0;
        if (!force && now - lastEmit < TelemetryHandler.SLOW_EMIT_INTERVAL) {
            return;
        }
        this.lastCarStatusEmit.set(sessionId, now);

        const fuelPct = inferred.fuel.pct;
        const tireWear = inferred.tireWear;
        const minTireWear = Math.min(tireWear.fl, tireWear.fr, tireWear.rl, tireWear.rr);
        const tireStatus = minTireWear > 0.6 ? 'green' : minTireWear > 0.3 ? 'yellow' : 'red';
        const fuelLapsRemaining = (inferred.fuel.perLap && inferred.fuel.perLap > 0)
            ? Math.floor(inferred.fuel.level / inferred.fuel.perLap)
            : null;
        const maxDamage = Math.max(inferred.damage.aero, inferred.damage.engine);
        const damageStatus = maxDamage < 0.05 ? 'green' : maxDamage < 0.3 ? 'yellow' : 'red';
        const gapFromCarBehind = this.computeGapFromCarBehind(rawCar?.position || 1, rawCar?.carId);

        this.io.volatile.emit('car:status', {
            fuel: {
                level: inferred.fuel.level,
                percentage: fuelPct,
                perLap: inferred.fuel.perLap,
                lapsRemaining: fuelLapsRemaining,
                status: fuelPct > 0.3 ? 'green' : fuelPct > 0.15 ? 'yellow' : fuelPct > 0 ? 'red' : 'gray',
            },
            tires: {
                wear: tireWear,
                temps: inferred.tireTemps ? {
                    fl: ((inferred.tireTemps.fl?.l || 0) + (inferred.tireTemps.fl?.m || 0) + (inferred.tireTemps.fl?.r || 0)) / 3,
                    fr: ((inferred.tireTemps.fr?.l || 0) + (inferred.tireTemps.fr?.m || 0) + (inferred.tireTemps.fr?.r || 0)) / 3,
                    rl: ((inferred.tireTemps.rl?.l || 0) + (inferred.tireTemps.rl?.m || 0) + (inferred.tireTemps.rl?.r || 0)) / 3,
                    rr: ((inferred.tireTemps.rr?.l || 0) + (inferred.tireTemps.rr?.m || 0) + (inferred.tireTemps.rr?.r || 0)) / 3,
                } : { fl: 0, fr: 0, rl: 0, rr: 0 },
                tempsDetailed: inferred.tireTemps,
                compound: inferred.tireCompound,
                status: tireStatus,
            },
            damage: {
                aero: inferred.damage.aero,
                engine: inferred.damage.engine,
                status: damageStatus,
            },
            engine: inferred.engine,
            brakes: inferred.brakePressure,
            pit: inferred.pit,
            gaps: {
                toLeader: inferred.gaps.toLeader,
                toCarAhead: inferred.gaps.toCarAhead,
                fromCarBehind: gapFromCarBehind,
            },
            stint: {
                currentLap: inferred.tireStintLaps,
                avgPace: null,
                degradationSlope: null,
            },
            weather: this.lastWeather,
        });
    }

    public setup(socket: Socket) {
        const relayAdapter = new RelayAdapter(activeSessions, socket);

        // Session metadata (contains track name, session type)
        socket.on('session_metadata', (data: unknown) => {
            const rawData = data as any;
            // Throttle metadata logging to once per 10 seconds (avoids spam on reconnects)
            logOncePerInterval('session-metadata', 10000, () => {
                wsLogger.debug({ metadata: rawData }, 'Session metadata received');
            });
            
            if (rawData && typeof rawData === 'object') {
                updateTelemetryCache(rawData.sessionId || 'live', {
                    trackName: rawData.trackName,
                    trackLength: rawData.trackLength,
                    sessionType: rawData.sessionType
                });
                
                // Store session info for late-joining clients
                currentSessionInfo = {
                    sessionId: rawData.sessionId,
                    trackName: rawData.trackName,
                    trackId: rawData.trackId,  // iRacing track ID for shape file loading
                    sessionType: rawData.sessionType,
                    carName: rawData.carName,
                    rpmRedline: rawData.rpmRedline,
                    fuelTankCapacity: rawData.fuelTankCapacity,
                    trackLength: rawData.trackLength,
                };
                
                // Broadcast session info to all dashboard clients
                this.io.emit('session:active', currentSessionInfo);
            }
        });

        // Also handle session_info (relay forwards this)
        socket.on('session_info', (data: unknown) => {
            // Normalize raw format from desktop relay
            const rawData = normalizeRawSessionInfo(data as any);
            // eslint-disable-next-line no-console -- Low-frequency event, useful for debugging relay connection
            console.log('📍 SESSION INFO:', JSON.stringify(rawData).substring(0, 500));
            
            if (rawData && typeof rawData === 'object') {
                updateTelemetryCache(rawData.sessionId || 'live', {
                    trackName: rawData.trackName || rawData.track,
                    trackLength: rawData.trackLength,
                    sessionType: rawData.sessionType || rawData.session
                });
                
                // Update driver names from session info if available
                if (rawData.drivers && Array.isArray(rawData.drivers)) {
                    // Cache driver info for use by telemetry handler
                    this.cachedDrivers = rawData.drivers;
                }
            }
        });

        // Incident events from relay
        socket.on('incident', (data: unknown) => {
            const rawData = data as any;

            // Route through ClassificationEngine for severity scoring, responsibility
            // prediction, explanation generation, and DB persistence (non-blocking)
            const trigger = {
                type: 'incident_count_increase' as const,
                timestamp: Date.now(),
                sessionTimeMs: rawData.sessionTime ? rawData.sessionTime * 1000 : Date.now(),
                primaryDriverId: String(rawData.carIdx ?? rawData.driverId ?? rawData.primaryDriverId ?? 0),
                nearbyDriverIds: (rawData.nearbyCarIdxs ?? rawData.nearbyDriverIds ?? []).map(String),
                triggerData: {
                    lapNumber: rawData.lap ?? 0,
                    trackPosition: rawData.lapDistPct ?? rawData.trackPosition ?? 0,
                    severity: rawData.severity,
                    cornerName: rawData.cornerName,
                },
            };
            getClassificationEngine()
                .processTrigger(trigger, rawData.sessionId ?? 'live')
                .then(classified => {
                    // Broadcast enriched incident if classification succeeded
                    if (classified) {
                        this.io.emit('incident:new', classified);
                    } else {
                        // Fallback: broadcast raw relay incident
                        this.io.emit('incident:new', rawData);
                    }
                })
                .catch(() => {
                    // Fallback on any classification error
                    this.io.emit('incident:new', rawData);
                });
        });

        // Session end event from relay
        socket.on('session_end', (data: unknown) => {
            const rawData = data as any;
            // eslint-disable-next-line no-console -- Session end is important for debugging
            console.log('🏁 SESSION END:', JSON.stringify(rawData));
            
            // Clear cached data for this session
            if (rawData?.sessionId) {
                this.cachedStandings = [];
                this.cachedDrivers = [];
                TelemetryHandler.firstPacketLogged = false;
                
                // Remove from active sessions
                activeSessions.delete(rawData.sessionId);
                
                // Broadcast session end to all clients
                this.io.emit('session:end', {
                    sessionId: rawData.sessionId,
                    reason: rawData.reason || 'unknown',
                    timestamp: rawData.timestamp || Date.now(),
                });
            }
        });

        // Race events (flags, safety car, etc.)
        socket.on('race_event', (data: unknown) => {
            const rawData = data as any;
            // eslint-disable-next-line no-console -- Race events (flags, safety car) are rare and important
            console.log('🏁 RACE EVENT:', JSON.stringify(rawData));
            
            // Broadcast to all connected clients
            this.io.emit('race:event', rawData);
        });

        // Standings (1Hz) — ALL cars on track, no cap
        socket.on('standings', (data: unknown) => {
            const rawData = data as any;
            if (!rawData?.standings) return;

            // Cache full standings for use by telemetry and strategy_raw handlers
            this.cachedStandings = rawData.standings;

            // Update telemetry cache for voice AI context
            updateTelemetryCache(rawData.sessionId || 'live', {
                standings: rawData.standings,
                totalCars: rawData.totalCars || rawData.standings.length,
            });

            // Emit competitor_data to frontend (all cars)
            const competitorData = rawData.standings
                .sort((a: any, b: any) => {
                    const aPos = typeof a.position === 'number' && a.position > 0 ? a.position : 999;
                    const bPos = typeof b.position === 'number' && b.position > 0 ? b.position : 999;
                    return aPos - bPos;
                })
                .map((s: any) => ({
                    position: s.position || 0,
                    driver: s.driverName || `Car ${s.carIdx}`,
                    carNumber: s.carNumber || String(s.carIdx || ''),
                    lapDistPct: s.lapDistPct ?? 0,
                    isPlayer: !!s.isPlayer,
                    gap: s.isPlayer ? '—' : (s.gapToLeader ? `+${s.gapToLeader.toFixed(1)}s` : '--'),
                    lastLap: s.lastLapTime > 0 ? this.formatLapTime(s.lastLapTime) : '—',
                }));
            this.io.volatile.emit('competitor_data', competitorData);
        });

        // Telemetry snapshot
        socket.on('telemetry', (data: unknown) => {
            // Normalize raw format from desktop relay (has raw field with iRacing data)
            const rawData = normalizeRawTelemetry(data as any);
            if ((!Array.isArray(rawData.standings) || rawData.standings.length === 0) && this.cachedStandings.length > 0) {
                rawData.standings = this.cachedStandings;
            }
            
            // Enrich car data with driver names from cached session info
            if (this.cachedDrivers.length > 0 && rawData.cars) {
                for (const car of rawData.cars) {
                    const driverInfo = this.cachedDrivers[car.carIdx];
                    if (driverInfo) {
                        car.driverName = driverInfo.UserName || car.driverName;
                        car.carName = driverInfo.CarScreenName || car.carName;
                        car.carClass = driverInfo.CarClassShortName || car.carClass;
                        car.iRating = driverInfo.IRating || car.iRating;
                        car.licenseLevel = driverInfo.LicString || car.licenseLevel;
                    }
                }
                // Also enrich the active car
                if (rawData.car) {
                    const activeDriverInfo = this.cachedDrivers[rawData.car.carIdx];
                    if (activeDriverInfo) {
                        rawData.car.driverName = activeDriverInfo.UserName || rawData.car.driverName;
                        rawData.car.carName = activeDriverInfo.CarScreenName || rawData.car.carName;
                        rawData.car.carClass = activeDriverInfo.CarClassShortName || rawData.car.carClass;
                        rawData.car.iRating = activeDriverInfo.IRating || rawData.car.iRating;
                        rawData.car.licenseLevel = activeDriverInfo.LicString || rawData.car.licenseLevel;
                    }
                }
            }
            
            const selectDriverCar = (payload: any) => {
                const cars = Array.isArray(payload?.cars) ? payload.cars : [];
                return (
                    cars.find((c: any) => c?.isPlayer) ||
                    cars.find((c: any) => payload?.playerCarIdx != null && (c?.carIdx === payload.playerCarIdx || c?.carId === payload.playerCarIdx)) ||
                    cars[0] ||
                    payload?.car ||
                    payload
                );
            };
            
            // Log first packet for debugging
            if (!TelemetryHandler.firstPacketLogged) {
                TelemetryHandler.firstPacketLogged = true;
                // eslint-disable-next-line no-console -- One-time log per session for debugging
                console.log('📊 FIRST TELEMETRY:', JSON.stringify(rawData).substring(0, 500));
            }
            
            // Run server-side inference engine on raw telemetry (60Hz)
            const telemetryCar = selectDriverCar(rawData);
            const telemetrySessionId = rawData?.sessionId || 'live';
            const inferenceEngine = getOrCreateEngine(telemetrySessionId);
            inferenceEngine.processTelemetry(rawData);

            // Feed spatial context to incident classifier for contact analysis
            getClassificationEngine().updateSpatialContext(rawData);
            const inferred = inferenceEngine.getInferredStrategy(telemetryCar);
            
            // Push to Redis Stream for behavioral analysis (non-blocking)
            const streamPacket: TelemetryPacket = {
                runId: telemetrySessionId,
                userId: telemetryCar?.userId || 'unknown',
                ts: Date.now(),
                sessionTime: rawData?.sessionTime || 0,
                lap: telemetryCar?.lap || 0,
                lapDistPct: telemetryCar?.lapDistPct || 0,
                speed: telemetryCar?.speed || 0,
                throttle: telemetryCar?.throttle || 0,
                brake: telemetryCar?.brake || 0,
                steer: telemetryCar?.steeringAngle || telemetryCar?.steer || 0,
                gear: telemetryCar?.gear || 0,
                rpm: telemetryCar?.rpm || 0,
                trackSurface: telemetryCar?.trackSurface ?? 1,
                absActive: telemetryCar?.absActive || 0,
                incidentCount: telemetryCar?.incidentCount || rawData?.incidentCount || 0,
                lastLapTime: telemetryCar?.lastLapTime || 0,
                bestLapTime: telemetryCar?.bestLapTime || 0,
                position: telemetryCar?.position || 0,
                fuelLevel: telemetryCar?.fuelLevel || 0,
                // Rotation control channels
                yaw: telemetryCar?.yaw,
                velocityX: telemetryCar?.velocityX,
                velocityY: telemetryCar?.velocityY,
                fps: rawData?.fps,
                latency: rawData?.latency,
            };
            pushTelemetryToStream(streamPacket).catch(() => {
                // Silent fail — Redis may not be available
            });
            
            // Always try to cache telemetry for voice, even if validation fails
            if (rawData && typeof rawData === 'object') {
                
                // Try multiple possible data structures
                const car = selectDriverCar(rawData);
                const speedMph = car?.speed ? Math.round(car.speed * 2.237) : undefined;
                
                // Cache ALL telemetry for voice queries
                const cacheData = {
                    // Track & Session
                    trackName: rawData.trackName,
                    trackLength: rawData.trackLength,
                    sessionType: rawData.sessionType,
                    sessionLaps: rawData.sessionLaps,
                    sessionTimeRemain: rawData.sessionTimeRemain,
                    flagStatus: rawData.flagStatus,
                    totalCars: this.cachedStandings.length || undefined,
                    
                    // Weather & Conditions (convert to Fahrenheit)
                    trackTemp: rawData.trackTemp ? Math.round(rawData.trackTemp * 9/5 + 32) : undefined,
                    airTemp: rawData.airTemp ? Math.round(rawData.airTemp * 9/5 + 32) : undefined,
                    humidity: rawData.humidity ? Math.round(rawData.humidity * 100) : undefined,
                    windSpeed: rawData.windSpeed ? Math.round(rawData.windSpeed * 2.237) : undefined, // m/s to mph
                    windDir: rawData.windDir,
                    skyCondition: rawData.skyCondition,
                    
                    // Driver Info
                    driverName: car?.driverName,
                    carName: car?.carName,
                    carClass: car?.carClass,
                    iRating: car?.iRating,
                    licenseLevel: car?.licenseLevel,
                    
                    // Position & Lap
                    position: car?.position,
                    classPosition: car?.classPosition,
                    lap: car?.lap,
                    lapsCompleted: car?.lapsCompleted,
                    lapDistPct: car?.lapDistPct,
                    
                    // Speed & Motion (convert to mph)
                    speed: speedMph,
                    gear: car?.gear,
                    rpm: car?.rpm,
                    throttle: car?.throttle ? Math.round(car.throttle * 100) : undefined,
                    brake: car?.brake ? Math.round(car.brake * 100) : undefined,
                    
                    // Lap Times
                    lastLapTime: car?.lastLapTime,
                    bestLapTime: car?.bestLapTime,
                    deltaToSessionBest: car?.deltaToSessionBest,
                    deltaToOptimalLap: car?.deltaToOptimalLap,
                    
                    // Fuel
                    fuelLevel: car?.fuelLevel,
                    fuelPct: car?.fuelPct ? Math.round(car.fuelPct * 100) : undefined,
                    fuelUsePerHour: car?.fuelUsePerHour,
                    
                    // Tires — inferred by server engine from raw temps/speed/steering
                    tireWear: inferred.tireWear,
                    tireStintLaps: inferred.tireStintLaps,
                    
                    // Temperatures (convert to Fahrenheit)
                    oilTemp: car?.oilTemp ? Math.round(car.oilTemp * 9/5 + 32) : undefined,
                    waterTemp: car?.waterTemp ? Math.round(car.waterTemp * 9/5 + 32) : undefined,
                    
                    // Status
                    onPitRoad: car?.onPitRoad,
                    isOnTrack: car?.isOnTrack,
                    incidentCount: car?.incidentCount,
                    
                    // Gaps (computed by server engine from CarIdxF2Time / CarIdxEstTime)
                    gapToLeader: inferred.gaps.toLeader,
                    gapToCarAhead: inferred.gaps.toCarAhead,
                    
                    // Pit tracking (server-side)
                    pitStops: inferred.pit.stops,
                };
                
                updateTelemetryCache('live', cacheData);
                if (rawData.sessionId) {
                    updateTelemetryCache(rawData.sessionId, cacheData);
                }
                
                // Store latest weather for car:status emission (1Hz path)
                if (rawData.trackTemp || rawData.airTemp) {
                    this.lastWeather = {
                        trackTemp: rawData.trackTemp ? Math.round(rawData.trackTemp * 9/5 + 32) : 0,
                        airTemp: rawData.airTemp ? Math.round(rawData.airTemp * 9/5 + 32) : 0,
                        humidity: rawData.humidity ? Math.round(rawData.humidity * 100) : 0,
                        windSpeed: rawData.windSpeed ? Math.round(rawData.windSpeed * 2.237) : 0,
                        windDir: rawData.windDir ? Math.round(rawData.windDir * 180 / Math.PI) : 0,
                        skyCondition: rawData.skyCondition || 'Unknown',
                    };
                }

                this.emitCarStatus(telemetrySessionId, inferred, telemetryCar);
            }

            // Skip protocol validation on hot path — relay format is richer than
            // the strict protocol schema (extra fields, steeringAngle vs steering, etc.)
            // and the validated result is never used. Validation can be re-enabled once
            // the protocol schema is updated to match the relay's actual output.

            const validData = data as any;

            let session = activeSessions.get(validData.sessionId);
            if (!session) {
                session = {
                    sessionId: validData.sessionId,
                    trackName: validData.trackName || currentSessionInfo?.trackName || 'Unknown Track',
                    sessionType: validData.sessionType || currentSessionInfo?.sessionType || 'race',
                    drivers: new Map(),
                    lastUpdate: Date.now(),
                    broadcastDelayMs: 0
                };
                activeSessions.set(validData.sessionId, session);
            }
            session.lastUpdate = Date.now();

            // Update drivers
            if (validData.cars) {
                for (const car of validData.cars) {
                    session.drivers.set(String(car.carId), {
                        driverId: car.driverId || String(car.carId),
                        driverName: car.driverName || `Car ${car.carId}`,
                        carNumber: String(car.carId),
                        lapDistPct: car.pos?.s || 0
                    });
                }
            }

            const timingEntries = validData.cars?.map((c: any) => ({
                driverId: c.driverId || String(c.carId),
                driverName: c.driverName || `Car ${c.carId}`,
                carNumber: String(c.carId),
                position: c.position ?? 0,
                lapNumber: c.lap ?? 0,
                lastLapTime: 0,
                bestLapTime: 0,
                gapToLeader: 0,
                lapDistPct: c.pos?.s || 0,
                speed: c.speed
            })) ?? [];

            const payload = {
                sessionId: validData.sessionId,
                sessionTimeMs: validData.sessionTimeMs ?? Date.now(),
                timing: { entries: timingEntries }
            };

            // Update telemetry cache for voice context (prefer player car)
            const driverCar = selectDriverCar(validData);
            if (driverCar) {
                updateTelemetryCache(validData.sessionId || 'live', {
                    trackName: session.trackName,
                    sessionType: session.sessionType,
                    position: driverCar.position,
                    lap: driverCar.lap,
                    speed: driverCar.speed,
                    lastLapTime: driverCar.lastLapTime,
                    bestLapTime: driverCar.bestLapTime
                });
            }

            const delay = session.broadcastDelayMs;
            const roomName = `session:${validData.sessionId}`;

            if (delay > 0) {
                setTimeout(() => {
                    this.io.volatile.to(roomName).emit('timing:update', payload);
                }, delay);
            } else {
                this.io.volatile.to(roomName).emit('timing:update', payload);
            }
            
            // LROC COMPATIBILITY: Broadcast telemetry_update in legacy format
            // This allows the Live Race Ops Console to receive telemetry data
            if (driverCar) {
                const driverSpeedMph = driverCar.speed ? Math.round(driverCar.speed * 2.237) : 0;
                const lightweightCars = (Array.isArray(validData.cars) ? validData.cars : []).map((c: any) => ({
                    carIdx: c.carIdx ?? c.carId,
                    carId: c.carId,
                    carNumber: c.carNumber,
                    driverName: c.driverName,
                    position: c.position,
                    lap: c.lap,
                    lastLapTime: c.lastLapTime,
                    bestLapTime: c.bestLapTime,
                    onPitRoad: c.onPitRoad,
                    isPlayer: !!c.isPlayer,
                    pos: { s: c?.pos?.s },
                }));
                const derivedStandings = lightweightCars.map((c: any, idx: number) => ({
                    carIdx: c.carIdx ?? c.carId,
                    carNumber: c.carNumber,
                    driverName: c.driverName,
                    position: c.position || idx + 1,
                    lapDistPct: c?.pos?.s,
                    lap: c.lap,
                    lastLapTime: c.lastLapTime,
                    bestLapTime: c.bestLapTime,
                    onPitRoad: c.onPitRoad,
                    isPlayer: !!c.isPlayer,
                    gapToLeader: 0,
                }));
                const effectiveStandings = this.cachedStandings.length > 0
                    ? this.cachedStandings
                    : derivedStandings;
                if (this.cachedStandings.length === 0 && derivedStandings.length > 0) {
                    this.cachedStandings = derivedStandings;
                }
                const playerStanding = effectiveStandings.find((s: any) => s.isPlayer);
                const lightweightStandings = effectiveStandings.map((s: any) => ({
                    carIdx: s.carIdx ?? s.carId,
                    carNumber: s.carNumber,
                    driverName: s.driverName,
                    position: s.position,
                    lapDistPct: s.lapDistPct,
                    lap: s.lap,
                    lastLapTime: s.lastLapTime,
                    bestLapTime: s.bestLapTime,
                    onPitRoad: s.onPitRoad,
                    isPlayer: !!s.isPlayer,
                    gapToLeader: s.gapToLeader,
                }));
                const racePosition =
                    (typeof driverCar.position === 'number' && driverCar.position > 0)
                        ? driverCar.position
                        : (typeof playerStanding?.position === 'number' && playerStanding.position > 0 ? playerStanding.position : 0);
                const trackPosition =
                    (typeof driverCar.lapDistPct === 'number' ? driverCar.lapDistPct : undefined) ??
                    (typeof driverCar.pos?.s === 'number' ? driverCar.pos.s : undefined) ??
                    (typeof playerStanding?.lapDistPct === 'number' ? playerStanding.lapDistPct : 0);
                const lrocTelemetry = {
                    driverId: driverCar.driverId || String(driverCar.carId),
                    driverName: driverCar.driverName || 'Driver',
                    speed: driverSpeedMph,
                    rpm: driverCar.rpm || 0,
                    rpmMax: currentSessionInfo?.rpmRedline || 8000,
                    gear: driverCar.gear || 0,
                    throttle: driverCar.throttle ? driverCar.throttle * 100 : 0,
                    brake: driverCar.brake ? driverCar.brake * 100 : 0,
                    clutch: driverCar.clutch ? driverCar.clutch * 100 : 0,
                    steering: driverCar.steeringAngle || 0,
                    fuel: {
                        level: driverCar.fuelLevel || 0,
                        usagePerHour: driverCar.fuelUsePerHour || 0
                    },
                    tires: {
                        frontLeft: { temp: 0, wear: inferred.tireWear.fl, pressure: 0 },
                        frontRight: { temp: 0, wear: inferred.tireWear.fr, pressure: 0 },
                        rearLeft: { temp: 0, wear: inferred.tireWear.rl, pressure: 0 },
                        rearRight: { temp: 0, wear: inferred.tireWear.rr, pressure: 0 }
                    },
                    position: { x: 0, y: 0, z: 0 },
                    lap: driverCar.lap || 0,
                    sector: 0,
                    lapTime: driverCar.lastLapTime || 0,
                    sectorTime: 0,
                    bestLapTime: driverCar.bestLapTime || 0,
                    deltaToBestLap: driverCar.deltaToSessionBest || 0,
                    bestSectorTimes: [],
                    gForce: { lateral: 0, longitudinal: 0, vertical: 0 },
                    trackPosition,
                    racePosition,
                    gapAhead: inferred.gaps.toCarAhead,
                    gapBehind: 0, // Gap behind only available in 1Hz car:status path
                    flags: 0,
                    drsStatus: 0,
                    carSettings: { brakeBias: 0, abs: 0, tractionControl: 0, tractionControl2: 0, fuelMixture: 0 },
                    energy: { batteryPct: 0, deployPct: 0, deployMode: 0 },
                    weather: { windSpeed: rawData.windSpeed || 0, windDirection: rawData.windDir || 0 },
                    timestamp: Date.now(),
                    cars: lightweightCars,
                    standings: lightweightStandings,
                    totalCars: lightweightStandings.length || lightweightCars.length || undefined,
                };
                
                // Broadcast to all connected clients (LROC doesn't join session rooms)
                this.io.volatile.emit('telemetry_update', lrocTelemetry);
                
                // Also emit telemetry:driver for Driver Tier app compatibility
                const driverPayload = {
                    sessionId: validData.sessionId,
                    timestamp: Date.now(),
                    cars: validData.cars,
                    drivers: driverCar ? [driverCar] : [],
                    standings: effectiveStandings,
                    totalCars: effectiveStandings.length || lightweightCars.length || undefined,
                    trackName: rawData.trackName || session?.trackName,
                    sessionType: rawData.sessionType || session?.sessionType,
                    rpmRedline: currentSessionInfo?.rpmRedline,
                    fuelTankCapacity: currentSessionInfo?.fuelTankCapacity,
                };
                this.io.emit('telemetry:driver', driverPayload);
                
                // Also emit session_info for LROC (throttled to 1Hz)
                const now = Date.now();
                if (now - this.lastSessionInfoEmit >= TelemetryHandler.SLOW_EMIT_INTERVAL) {
                this.lastSessionInfoEmit = now;
                this.io.volatile.emit('session_info', {
                    track: rawData.trackName || session?.trackName || 'Unknown Track',
                    session: rawData.sessionType || session?.sessionType || 'RACE',
                    driver: driverCar.driverName || 'Driver',
                    car: driverCar.carName || 'Unknown Car',
                    weather: {
                        temperature: rawData.airTemp ? Math.round(rawData.airTemp * 9/5 + 32) : 0,
                        trackTemperature: rawData.trackTemp ? Math.round(rawData.trackTemp * 9/5 + 32) : 0,
                        windSpeed: rawData.windSpeed ? Math.round(rawData.windSpeed * 2.237) : 0,
                        windDirection: 'N',
                        humidity: rawData.humidity ? Math.round(rawData.humidity * 100) : 0,
                        trackGrip: 100
                    },
                    totalLaps: rawData.sessionLaps || 0,
                    sessionTime: validData.sessionTimeMs || 0,
                    remainingTime: rawData.sessionTimeRemain || 0
                });
                } // end session_info throttle
                
                // competitor_data now emitted by the dedicated 'standings' handler (1Hz, all cars)
            }
        });

        // Binary Telemetry Handler (Phase 10)
        socket.on('telemetry_binary', (data: { sessionId: string; payload: Buffer }) => {
            if (!data || !data.sessionId || !data.payload) return;

            try {
                const buffer = data.payload;
                // Parse Header: timestamp (double 8 bytes) + count (uint8 1 byte)
                const timestamp = buffer.readDoubleLE(0);
                const carCount = buffer.readUInt8(8);
                const headerSize = 9;
                const carStructSize = 14;

                const cars: any[] = [];

                for (let i = 0; i < carCount; i++) {
                    const offset = headerSize + (i * carStructSize);
                    if (offset + carStructSize > buffer.length) break;

                    const carId = buffer.readUInt16LE(offset);
                    const lapDistPct = buffer.readFloatLE(offset + 2);
                    const speed = buffer.readFloatLE(offset + 6);
                    const lap = buffer.readUInt16LE(offset + 10);
                    const position = buffer.readUInt8(offset + 12);

                    cars.push({
                        carId,
                        driverId: String(carId),
                        position,
                        lap,
                        pos: { s: lapDistPct },
                        speed
                    });
                }

                let activeSession = activeSessions.get(data.sessionId);
                if (!activeSession) {
                    activeSession = {
                        sessionId: data.sessionId,
                        trackName: currentSessionInfo?.trackName || 'Unknown Track',
                        sessionType: currentSessionInfo?.sessionType || 'race',
                        drivers: new Map(),
                        lastUpdate: Date.now(),
                        broadcastDelayMs: 0
                    };
                    activeSessions.set(data.sessionId, activeSession);
                }
                activeSession.lastUpdate = Date.now();

                const timingEntries = cars.map(c => {
                    const knownDriver = activeSession!.drivers.get(String(c.carId));
                    const driverName = knownDriver?.driverName || `Car ${c.carId}`;

                    if (!knownDriver) {
                        activeSession!.drivers.set(String(c.carId), {
                            driverId: String(c.carId),
                            driverName,
                            carNumber: String(c.carId),
                            lapDistPct: c.pos.s
                        });
                    } else {
                        knownDriver.lapDistPct = c.pos.s;
                    }

                    return {
                        driverId: String(c.carId),
                        driverName,
                        carNumber: String(c.carId),
                        position: c.position,
                        lapNumber: c.lap,
                        lastLapTime: 0,
                        bestLapTime: 0,
                        gapToLeader: 0,
                        lapDistPct: c.pos.s,
                        speed: c.speed
                    };
                });

                const payload = {
                    sessionId: data.sessionId,
                    sessionTimeMs: timestamp,
                    timing: { entries: timingEntries }
                };

                const delay = activeSession.broadcastDelayMs;
                if (delay > 0) {
                    setTimeout(() => {
                        this.io.volatile.to(`session:${data.sessionId}`).emit('timing:update', payload);
                    }, delay);
                } else {
                    this.io.volatile.to(`session:${data.sessionId}`).emit('timing:update', payload);
                }

            } catch (err) {
                console.error('Error parsing binary telemetry:', err);
            }
        });

        // Strategy Raw Handler (1Hz) — relay sends raw iRacing vars, server does all inference
        socket.on('strategy_raw', (data: any) => {
            if (!data || !data.sessionId || !data.cars) return;

            const session = activeSessions.get(data.sessionId);
            if (!session) return;

            const rawCar = data.cars[0];
            if (!rawCar) return;

            // Run inference engine on raw strategy data
            const engine = getOrCreateEngine(data.sessionId);
            engine.processStrategyRaw(data);
            const inferred = engine.getInferredStrategy(rawCar);

            // Merge inferred strategy into session driver state
            const driverId = String(rawCar.carId);
            const driver = session.drivers.get(driverId);
            if (driver) {
                driver.strategy = {
                    fuel: { ...inferred.fuel, perLap: inferred.fuel.perLap ?? undefined },
                    tires: inferred.tireWear,
                    damage: inferred.damage,
                    pit: inferred.pit,
                };
            }

            // Cache inferred strategy for voice AI context
            updateTelemetryCache(data.sessionId || 'live', {
                tireWear: inferred.tireWear,
                tireTemps: inferred.tireTemps as any,
                tireStintLaps: inferred.tireStintLaps,
                tireCompound: inferred.tireCompound ?? undefined,
                brakePressure: inferred.brakePressure,
                damageAero: inferred.damage.aero,
                damageEngine: inferred.damage.engine,
                oilTemp: inferred.engine.oilTemp ? Math.round(inferred.engine.oilTemp * 9/5 + 32) : undefined,
                oilPressure: inferred.engine.oilPressure,
                waterTemp: inferred.engine.waterTemp ? Math.round(inferred.engine.waterTemp * 9/5 + 32) : undefined,
                voltage: inferred.engine.voltage,
                engineWarnings: inferred.engine.warnings,
                pitStops: inferred.pit.stops,
                fuelPerLap: inferred.fuel.perLap ?? undefined,
                fuelLevel: inferred.fuel.level,
                fuelPct: inferred.fuel.pct ? Math.round(inferred.fuel.pct * 100) : undefined,
                gapToLeader: inferred.gaps.toLeader,
                gapToCarAhead: inferred.gaps.toCarAhead,
            });
            const gapFromCarBehind = this.computeGapFromCarBehind(rawCar.position || 1, rawCar.carId);

            // LIVE SESSION ANALYZER: Feed accumulated race intelligence
            // Use both session-keyed and 'live' alias so crew-chat can find it
            const analyzer = getOrCreateAnalyzer(data.sessionId);
            const liveAnalyzer = data.sessionId !== 'live' ? getOrCreateAnalyzer('live') : analyzer;

            const analyzerPayload = {
                lap: rawCar.lap || 0,
                lastLapTime: rawCar.lastLapTime || 0,
                bestLapTime: rawCar.bestLapTime || 0,
                position: rawCar.position || 1,
                classPosition: rawCar.classPosition || rawCar.position || 1,
                fuelLevel: inferred.fuel.level,
                fuelPerLap: inferred.fuel.perLap,
                tireWear: inferred.tireWear,
                gapToLeader: inferred.gaps.toLeader,
                gapToCarAhead: inferred.gaps.toCarAhead,
                gapFromCarBehind,
                incidentCount: rawCar.incidentCount || 0,
                onPitRoad: inferred.pit.inLane,
                damageAero: inferred.damage.aero,
                damageEngine: inferred.damage.engine,
            };
            analyzer.ingestTelemetry(analyzerPayload);
            if (liveAnalyzer !== analyzer) {
                liveAnalyzer.ingestTelemetry(analyzerPayload);
            }

            // Emit intelligence summary to frontend every ~10 seconds (1Hz input, emit every 10th)
            if (rawCar.lap && rawCar.lap % 1 === 0 && Math.random() < 0.1) {
                const intel = analyzer.getIntelligence({
                    fuelLevel: inferred.fuel.level,
                    fuelPerLap: inferred.fuel.perLap,
                    tireWear: inferred.tireWear,
                    position: rawCar.position || 1,
                    gapToCarAhead: inferred.gaps.toCarAhead,
                    gapFromCarBehind,
                    gapToLeader: inferred.gaps.toLeader,
                });
                this.io.to(`session:${data.sessionId}`).emit('race:intelligence', {
                    sessionId: data.sessionId,
                    intelligence: intel,
                });
            }

            // PROACTIVE SPOTTER: Generate edge-triggered spotter callouts
            const spotterCallouts = generateSpotterCallouts(data.sessionId, {
                position: rawCar.position || 1,
                gapToCarAhead: inferred.gaps.toCarAhead,
                gapFromCarBehind,
                fuelLevel: inferred.fuel.level,
                fuelPerLap: inferred.fuel.perLap,
                tireWear: inferred.tireWear,
                gapToLeader: inferred.gaps.toLeader,
                lap: rawCar.lap || 0,
            });
            if (spotterCallouts.length > 0) {
                this.io.to(`session:${data.sessionId}`).emit('spotter:callout', {
                    sessionId: data.sessionId,
                    callouts: spotterCallouts,
                });
            }

            // Build computed strategy payload (same shape clients expect)
            const computedCar = {
                carId: rawCar.carId,
                fuel: inferred.fuel,
                tires: inferred.tireWear,
                tireTemps: inferred.tireTemps,
                tireCompound: inferred.tireCompound,
                brakePressure: inferred.brakePressure,
                damage: inferred.damage,
                engine: inferred.engine,
                pit: inferred.pit,
            };

            // Broadcast computed strategy to Dashboard (1Hz)
            const emitStrategy = () => {
                this.io.to(`session:${data.sessionId}`).emit('strategy:update', {
                    sessionId: data.sessionId,
                    timestamp: data.timestamp,
                    strategy: [computedCar],
                });
            };

            const delay = session?.broadcastDelayMs || 0;
            if (delay > 0) {
                setTimeout(emitStrategy, delay);
            } else {
                emitStrategy();
            }
            this.emitCarStatus(data.sessionId, inferred, rawCar, true);

            // SITUATIONAL AWARENESS: Generate race engineer intel (async, non-blocking)
            const awarenessService = getSituationalAwarenessService();
            if (awarenessService.isAvailable()) {
                const raceContext = {
                    sessionType: session.sessionType as 'practice' | 'qualifying' | 'race',
                    trackName: session.trackName,
                    currentLap: rawCar.lap || 0,
                    totalLaps: undefined,
                    sessionTimeRemaining: undefined,
                };

                const saFuelLaps = (inferred.fuel.perLap && inferred.fuel.perLap > 0)
                    ? inferred.fuel.level / inferred.fuel.perLap
                    : 99;

                const driverState = {
                    position: rawCar.position || 1,
                    totalCars: session.drivers.size || 1,
                    gapAhead: inferred.gaps.toCarAhead || null,
                    gapBehind: gapFromCarBehind || null,
                    fuelLaps: saFuelLaps,
                    fuelLevel: inferred.fuel.level,
                    tireCondition: inferred.tireWear,
                    lastLapTime: rawCar.lastLapTime || null,
                    bestLapTime: rawCar.bestLapTime || null,
                    onPitRoad: inferred.pit.inLane,
                    incidentCount: rawCar.incidentCount || 0,
                    damageAero: inferred.damage.aero,
                    damageEngine: inferred.damage.engine,
                    pitStops: inferred.pit.stops,
                };

                // Build traffic info from standings
                const playerPos = rawCar.position || 1;
                const saStandings = this.cachedStandings || [];
                const carAheadStanding = saStandings.find((s: any) => s.position === playerPos - 1);
                const carBehindStanding = saStandings.find((s: any) => s.position === playerPos + 1);

                const trafficInfo: any = {
                    blueFlags: false,
                    yellowFlags: false,
                };

                if (carAheadStanding && inferred.gaps.toCarAhead > 0) {
                    trafficInfo.carAhead = {
                        gap: inferred.gaps.toCarAhead,
                        driverName: carAheadStanding.driverName || `P${playerPos - 1}`,
                        pace: 'similar' as const,
                        defending: false,
                    };
                }
                if (carBehindStanding && gapFromCarBehind > 0) {
                    trafficInfo.carBehind = {
                        gap: gapFromCarBehind,
                        driverName: carBehindStanding.driverName || `P${playerPos + 1}`,
                        pace: gapFromCarBehind < 1.5 ? 'faster' as const : 'similar' as const,
                        attacking: gapFromCarBehind < 1.0,
                    };
                }

                awarenessService.analyzeRaceSituation(raceContext, driverState, trafficInfo)
                    .then(updates => {
                        if (updates.length > 0) {
                            this.io.to(`session:${data.sessionId}`).emit('engineer:update', {
                                sessionId: data.sessionId,
                                updates,
                            });
                        }
                    })
                    .catch(err => {
                        console.error('Situational awareness error:', err);
                    });
            }
        });

        // Incident detected by relay
        socket.on('incident', (data: unknown) => {
            const isValid = relayAdapter.handleIncident(data);
            if (isValid) {
                const validData = data as any;

                const involvedDrivers = validData.cars?.map((carId: number, idx: number) => ({
                    driverId: String(carId),
                    driverName: validData.driverNames?.[idx] || 'Unknown',
                    carNumber: String(carId),
                    role: 'involved'
                })) || [];

                this.io.to(`session:${validData.sessionId}`).emit('incident:new', {
                    sessionId: validData.sessionId,
                    incident: {
                        id: `inc-${Date.now()}`,
                        type: validData.type,
                        severity: validData.severity ?? 'medium',
                        lapNumber: validData.lap ?? 0,
                        sessionTimeMs: Date.now(),
                        trackPosition: validData.trackPosition ?? 0,
                        cornerName: validData.cornerName,
                        involvedDrivers: involvedDrivers as any[],
                        status: 'pending'
                    }
                });

                this.io.to(`session:${validData.sessionId}`).emit('event:log', {
                    id: `evt-${Date.now()}`,
                    timestamp: Date.now(),
                    category: 'warning',
                    message: `Incident: ${validData.cornerName || 'Unknown'} - ${involvedDrivers.map((d: any) => d.driverName).join(', ')}`,
                    importance: validData.severity === 'high' ? 'critical' : validData.severity === 'med' ? 'warning' : 'info'
                });

                socket.emit('ack', { originalType: 'incident', success: true });
            } else {
                socket.emit('ack', { originalType: 'incident', success: false, error: 'Validation Failed' });
            }
        });
    }
}
