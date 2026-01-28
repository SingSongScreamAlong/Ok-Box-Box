import { Server, Socket } from 'socket.io';
import { activeSessions } from './SessionHandler.js';
import { RelayAdapter } from '../services/RelayAdapter.js';
import { getSituationalAwarenessService } from '../services/ai/situational-awareness.js';
import { updateTelemetryCache } from './telemetry-cache.js';

export class TelemetryHandler {
    private static firstPacketLogged = false;
    
    constructor(private io: Server) { }
    
    private formatLapTime(seconds: number): string {
        if (!seconds || seconds <= 0) return '—';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
    }

    public setup(socket: Socket) {
        const relayAdapter = new RelayAdapter(activeSessions, socket);

        // Session metadata (contains track name, session type)
        socket.on('session_metadata', (data: unknown) => {
            const rawData = data as any;
            console.log('📍 SESSION METADATA:', JSON.stringify(rawData));
            
            if (rawData && typeof rawData === 'object') {
                updateTelemetryCache('live', {
                    trackName: rawData.trackName,
                    sessionType: rawData.sessionType
                });
            }
        });

        // Also handle session_info (relay forwards this)
        socket.on('session_info', (data: unknown) => {
            const rawData = data as any;
            console.log('📍 SESSION INFO:', JSON.stringify(rawData));
            
            if (rawData && typeof rawData === 'object') {
                updateTelemetryCache('live', {
                    trackName: rawData.trackName || rawData.track,
                    sessionType: rawData.sessionType || rawData.session
                });
            }
        });

        // Telemetry snapshot
        socket.on('telemetry', (data: unknown) => {
            const rawData = data as any;
            
            // Log first packet for debugging
            if (!TelemetryHandler.firstPacketLogged) {
                TelemetryHandler.firstPacketLogged = true;
                console.log('📊 FIRST TELEMETRY:', JSON.stringify(rawData).substring(0, 500));
            }
            
            // Always try to cache telemetry for voice, even if validation fails
            if (rawData && typeof rawData === 'object') {
                
                // Try multiple possible data structures
                const car = rawData.cars?.[0] || rawData.car || rawData;
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
                    totalCars: rawData.totalCars,
                    
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
                    
                    // Tires (convert to percentage worn)
                    tireLFwear: car?.tireLFwear ? Math.round((1 - car.tireLFwear) * 100) : undefined,
                    tireRFwear: car?.tireRFwear ? Math.round((1 - car.tireRFwear) * 100) : undefined,
                    tireLRwear: car?.tireLRwear ? Math.round((1 - car.tireLRwear) * 100) : undefined,
                    tireRRwear: car?.tireRRwear ? Math.round((1 - car.tireRRwear) * 100) : undefined,
                    
                    // Temperatures (convert to Fahrenheit)
                    oilTemp: car?.oilTemp ? Math.round(car.oilTemp * 9/5 + 32) : undefined,
                    waterTemp: car?.waterTemp ? Math.round(car.waterTemp * 9/5 + 32) : undefined,
                    
                    // Status
                    onPitRoad: car?.onPitRoad,
                    isOnTrack: car?.isOnTrack,
                    incidentCount: car?.incidentCount,
                    
                    // Standings (all cars on track)
                    standings: rawData.standings
                };
                
                updateTelemetryCache('live', cacheData);
                if (rawData.sessionId) {
                    updateTelemetryCache(rawData.sessionId, cacheData);
                }
            }

            // Validate but don't block - always try to broadcast telemetry
            const isValid = relayAdapter.handleTelemetry(data);
            if (!isValid) {
                console.log('[TelemetryHandler] Validation failed but continuing with broadcast');
            }

            const validData = data as any;

            let session = activeSessions.get(validData.sessionId);
            if (!session) {
                session = {
                    sessionId: validData.sessionId,
                    trackName: 'Unknown Track',
                    sessionType: 'race',
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

            // Update telemetry cache for voice context (use first car as driver)
            const driverCar = validData.cars?.[0];
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
            const roomSize = this.io.sockets.adapter.rooms.get(roomName)?.size || 0;
            
            // Log every 60th frame (~1 per second at 60Hz)
            if (Math.random() < 0.017) {
                console.log(`📡 Broadcasting timing:update to ${roomName} (${roomSize} clients)`);
            }
            
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
                const lrocTelemetry = {
                    driverId: driverCar.driverId || String(driverCar.carId),
                    driverName: driverCar.driverName || 'Driver',
                    speed: speedMph || 0,
                    rpm: car?.rpm || 0,
                    gear: car?.gear || 0,
                    throttle: car?.throttle ? car.throttle * 100 : 0,
                    brake: car?.brake ? car.brake * 100 : 0,
                    clutch: car?.clutch ? car.clutch * 100 : 0,
                    steering: car?.steeringAngle || 0,
                    fuel: {
                        level: car?.fuelLevel || 0,
                        usagePerHour: car?.fuelUsePerHour || 0
                    },
                    tires: {
                        frontLeft: { temp: 0, wear: car?.tireLFwear || 1, pressure: 0 },
                        frontRight: { temp: 0, wear: car?.tireRFwear || 1, pressure: 0 },
                        rearLeft: { temp: 0, wear: car?.tireLRwear || 1, pressure: 0 },
                        rearRight: { temp: 0, wear: car?.tireRRwear || 1, pressure: 0 }
                    },
                    position: { x: 0, y: 0, z: 0 },
                    lap: car?.lap || 0,
                    sector: 0,
                    lapTime: car?.lastLapTime || 0,
                    sectorTime: 0,
                    bestLapTime: car?.bestLapTime || 0,
                    deltaToBestLap: car?.deltaToSessionBest || 0,
                    bestSectorTimes: [],
                    gForce: { lateral: 0, longitudinal: 0, vertical: 0 },
                    trackPosition: car?.lapDistPct || 0,
                    racePosition: car?.position || 0,
                    gapAhead: 0,
                    gapBehind: 0,
                    flags: 0,
                    drsStatus: 0,
                    carSettings: { brakeBias: 0, abs: 0, tractionControl: 0, tractionControl2: 0, fuelMixture: 0 },
                    energy: { batteryPct: 0, deployPct: 0, deployMode: 0 },
                    weather: { windSpeed: rawData.windSpeed || 0, windDirection: rawData.windDir || 0 },
                    timestamp: Date.now()
                };
                
                // Broadcast to all connected clients (LROC doesn't join session rooms)
                this.io.volatile.emit('telemetry_update', lrocTelemetry);
                
                // Also emit session_info for LROC
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
                
                // Emit competitor_data for standings (use drivers array from relay)
                const standings = rawData.standings || rawData.drivers || validData.cars;
                if (standings && standings.length > 0) {
                    const competitorData = standings
                        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                        .map((s: any) => ({
                            position: s.position || 0,
                            driver: s.driverName || s.driverName || `Car ${s.carId || s.carIdx}`,
                            gap: s.isPlayer ? '—' : (s.gapToLeader ? `+${s.gapToLeader.toFixed(1)}s` : '--'),
                            lastLap: s.lastLapTime > 0 ? this.formatLapTime(s.lastLapTime) : '—'
                        }));
                    this.io.volatile.emit('competitor_data', competitorData);
                }
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
                        trackName: 'Unknown Track',
                        sessionType: 'race',
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

        // Strategy Update Handler (Phase 11 - 1Hz)
        socket.on('strategy_update', (data: any) => {
            console.log('[TelemetryHandler] strategy_update received:', data?.sessionId);
            if (!data || !data.sessionId || !data.cars) return;

            const session = activeSessions.get(data.sessionId);
            if (!session) return;

            // Merge Strategy Data
            for (const car of data.cars) {
                const driverId = String(car.carId);
                const driver = session.drivers.get(driverId);
                if (driver) {
                    driver.strategy = {
                        fuel: car.fuel,
                        tires: car.tires,
                        damage: car.damage,
                        pit: car.pit
                    };
                }
            }

            // Broadcast to Dashboard (1Hz)
            const emitStrategy = () => {
                this.io.to(`session:${data.sessionId}`).emit('strategy:update', {
                    sessionId: data.sessionId,
                    timestamp: data.timestamp,
                    strategy: data.cars
                });
            };

            const delay = session?.broadcastDelayMs || 0;
            if (delay > 0) {
                setTimeout(emitStrategy, delay);
            } else {
                emitStrategy();
            }

            // TEAM DASHBOARD: Emit car:status for the first/primary car
            if (data.cars && data.cars.length > 0) {
                const primaryCar = data.cars[0];
                const fuelPct = primaryCar.fuel?.pct || 0;

                this.io.to(`session:${data.sessionId}`).emit('car:status', {
                    fuel: {
                        level: primaryCar.fuel?.level || 0,
                        percentage: fuelPct,
                        lapsRemaining: primaryCar.fuel?.lapsRemaining || null,
                        status: fuelPct > 0.3 ? 'green' : fuelPct > 0.15 ? 'yellow' : fuelPct > 0 ? 'red' : 'gray'
                    },
                    tires: {
                        wear: primaryCar.tires || { fl: 1, fr: 1, rl: 1, rr: 1 },
                        temps: primaryCar.tireTemps ? {
                            fl: (primaryCar.tireTemps.fl?.l + primaryCar.tireTemps.fl?.m + primaryCar.tireTemps.fl?.r) / 3 || 0,
                            fr: (primaryCar.tireTemps.fr?.l + primaryCar.tireTemps.fr?.m + primaryCar.tireTemps.fr?.r) / 3 || 0,
                            rl: (primaryCar.tireTemps.rl?.l + primaryCar.tireTemps.rl?.m + primaryCar.tireTemps.rl?.r) / 3 || 0,
                            rr: (primaryCar.tireTemps.rr?.l + primaryCar.tireTemps.rr?.m + primaryCar.tireTemps.rr?.r) / 3 || 0,
                        } : { fl: 0, fr: 0, rl: 0, rr: 0 },
                        status: 'green' // Calculate from wear
                    },
                    damage: {
                        aero: primaryCar.damage?.aero || 0,
                        engine: primaryCar.damage?.engine || 0,
                        status: (!primaryCar.damage || (primaryCar.damage.aero === 0 && primaryCar.damage.engine === 0)) ? 'green' : 'yellow'
                    },
                    stint: {
                        currentLap: primaryCar.stintLap || 0,
                        avgPace: primaryCar.avgPace || null,
                        degradationSlope: primaryCar.degradation || null
                    }
                });
            }

            // TEAM DASHBOARD: Emit opponent:intel from all other cars
            if (data.cars && data.cars.length > 1) {
                const opponents = data.cars.slice(1).map((car: any, idx: number) => ({
                    carId: car.carId,
                    driverId: String(car.carId),
                    driverName: session.drivers.get(String(car.carId))?.driverName || `Car ${car.carId}`,
                    carNumber: String(car.carId),
                    position: idx + 2, // Primary car is P1
                    gap: car.gap || 0,
                    gapTrend: 'stable',
                    threatLevel: 'yellow',
                    tirePhase: car.tires ? (Math.min(car.tires.fl, car.tires.fr, car.tires.rl, car.tires.rr) > 0.7 ? 'fresh' : 'optimal') : 'unknown'
                }));

                this.io.to(`session:${data.sessionId}`).emit('opponent:intel', { opponents });
            }

            // SITUATIONAL AWARENESS: Generate race engineer intel (async, non-blocking)
            const awarenessService = getSituationalAwarenessService();
            if (awarenessService.isAvailable() && data.cars && data.cars.length > 0) {
                const primaryCar = data.cars[0];

                const raceContext = {
                    sessionType: session.sessionType as 'practice' | 'qualifying' | 'race',
                    trackName: session.trackName,
                    currentLap: primaryCar.lap || 0,
                    totalLaps: undefined,
                    sessionTimeRemaining: undefined
                };

                const driverState = {
                    position: primaryCar.position || 1,
                    totalCars: session.drivers.size || 1,
                    gapAhead: primaryCar.gapAhead || null,
                    gapBehind: primaryCar.gapBehind || null,
                    fuelLaps: primaryCar.fuel?.lapsRemaining || (primaryCar.fuel?.level / (primaryCar.fuel?.perLap || 1)) || 99,
                    fuelLevel: primaryCar.fuel?.level || 0,
                    tireCondition: primaryCar.tires || { fl: 1, fr: 1, rl: 1, rr: 1 },
                    lastLapTime: primaryCar.lastLapTime || null,
                    bestLapTime: primaryCar.bestLapTime || null,
                    onPitRoad: primaryCar.pit?.inLane || false,
                    incidentCount: primaryCar.incidents || 0
                };

                const trafficInfo = {
                    carAhead: undefined,
                    carBehind: undefined,
                    blueFlags: false,
                    yellowFlags: false
                };

                awarenessService.analyzeRaceSituation(raceContext, driverState, trafficInfo)
                    .then(updates => {
                        if (updates.length > 0) {
                            this.io.to(`session:${data.sessionId}`).emit('engineer:update', {
                                sessionId: data.sessionId,
                                updates
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
