import { Server, Socket } from 'socket.io';
import { activeSessions } from './SessionHandler.js';
import { RelayAdapter } from '../services/RelayAdapter.js';
import { getSituationalAwarenessService } from '../services/ai/situational-awareness.js';

export class TelemetryHandler {
    constructor(private io: Server) { }

    public setup(socket: Socket) {
        const relayAdapter = new RelayAdapter(activeSessions, socket);

        // Telemetry snapshot
        socket.on('telemetry', (data: unknown) => {
            const isValid = relayAdapter.handleTelemetry(data);
            if (!isValid) return;

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
