// =====================================================================
// WebSocket Server
// =====================================================================

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import type {
    JoinRoomMessage,
    LeaveRoomMessage,
    TimingUpdateMessage,
    IncidentNewMessage,
    PenaltyProposedMessage,
    SessionStateMessage
} from '@controlbox/common';
import { config } from '../config/index.js';
import { RelayAdapter } from '../services/RelayAdapter.js';
import { recordFrameIn, recordAckSent, cleanupParityData } from '../observability/parity-tracking.js';

let io: Server;


// Track active sessions for dashboard clients
const activeSessions: Map<string, {
    sessionId: string;
    trackName: string;
    sessionType: string;
    drivers: Map<string, {
        driverId: string;
        driverName: string;
        carNumber: string;
        lapDistPct: number;
        // Phase 11: Strategy Data
        strategy?: {
            fuel: { level: number; pct: number; perLap?: number };
            tires?: { fl: number; fr: number; rl: number; rr: number };
            damage?: { aero: number; engine: number };
            pit?: { inLane: boolean; stops: number };
        }
    }>;
    lastUpdate: number;
}> = new Map();

export function initializeWebSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigins,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Debug: Log all incoming events
        socket.onAny((eventName, ...args) => {
            console.log(`📨 Event received: ${eventName}`, JSON.stringify(args).substring(0, 200));
        });

        // Send any active sessions to the new client immediately
        // This allows late-joining dashboards to auto-join the session
        for (const session of activeSessions.values()) {
            // Only send if recent update (within last 30 seconds)
            if (Date.now() - session.lastUpdate < 30000) {
                console.log(`   Sending active session ${session.sessionId} to new client ${socket.id}`);
                socket.emit('session:active', {
                    sessionId: session.sessionId,
                    trackName: session.trackName,
                    sessionType: session.sessionType
                });
            }
        }

        // Join session room (for dashboard clients)
        socket.on('room:join', (data: JoinRoomMessage) => {
            const roomName = `session:${data.sessionId}`;
            socket.join(roomName);
            console.log(`   Dashboard client ${socket.id} joined room ${roomName}`);

            // Send current session state if available
            const session = activeSessions.get(data.sessionId);
            if (session) {
                socket.emit('session:state', {
                    sessionId: data.sessionId,
                    trackName: session.trackName,
                    sessionType: session.sessionType,
                    status: 'active'
                });
            }

            socket.emit('room:joined', { sessionId: data.sessionId });
        });

        // Leave session room
        socket.on('room:leave', (data: LeaveRoomMessage) => {
            const roomName = `session:${data.sessionId}`;
            socket.leave(roomName);
            console.log(`   Client ${socket.id} left room ${roomName}`);
        });

        // =====================================================================
        // RELAY AGENT HANDLERS - Receive telemetry from iRacing relay
        // =====================================================================

        // Initialize Adapter for this socket connection using activeSessions for now
        // TODO: Move activeSessions state to a proper Service/Store
        const relayAdapter = new RelayAdapter(activeSessions, socket);

        // Session metadata from relay (sent when session starts)
        socket.on('session_metadata', (data: unknown) => {
            const isValid = relayAdapter.handleSessionMetadata(data);

            if (isValid) {
                // Validated! Logic below needs to be moved to Adapter or SessionManager
                // For Phase 0, we can keep the mutation here temporarily OR 
                // we can duplicate the type-safe logic here now that we know it's valid.
                // Ideally: sessionManager.handleStart(data);

                // Since RelayAdapter holds the validation logic but not the state (yet),
                // we will allow the legacy logic to run IF validation passes, 
                // casting to the trusted protocol type.

                // Legacy Logic Re-implementation with validated data:
                const validData = data as any; // We trust it now

                console.log(`📡 Session metadata received: ${validData.trackName}`);

                // Store/update session
                activeSessions.set(validData.sessionId, {
                    sessionId: validData.sessionId,
                    trackName: validData.trackName,
                    sessionType: validData.sessionType, // Loose string for now
                    drivers: new Map(),
                    lastUpdate: Date.now()
                });

                // Join relay to session room
                socket.join(`session:${validData.sessionId}`);

                // Broadcast session start to all connected clients
                io.emit('session:active', {
                    sessionId: validData.sessionId,
                    trackName: validData.trackName,
                    sessionType: validData.sessionType
                });

                socket.emit('ack', { originalType: 'session_metadata', success: true });
            } else {
                socket.emit('ack', { originalType: 'session_metadata', success: false, error: 'Validation Failed' });
            }
        });

        // Telemetry snapshot from relay
        socket.on('telemetry', (data: unknown) => {
            const isValid = relayAdapter.handleTelemetry(data);

            if (!isValid) return; // Silent fail for high freq telemetry

            const validData = data as any;

            // Parity tracking and ack handling
            const streamType = validData.streamType || 'telemetry';
            const { shouldAck } = recordFrameIn(
                validData.sessionId,
                streamType,
                validData.ts || validData.timestamp || Date.now(),
                validData.frameId
            );

            // Emit relay:ack if requested
            if (shouldAck && validData.ackRequested && validData.frameId) {
                socket.emit('relay:ack', {
                    frameId: validData.frameId,
                    sessionId: validData.sessionId,
                    receivedAtMs: Date.now()
                });
                recordAckSent(validData.sessionId, streamType);
            }

            const session = activeSessions.get(validData.sessionId);
            if (!session) {
                // Auto-create session if we get telemetry without metadata
                activeSessions.set(validData.sessionId, {
                    sessionId: validData.sessionId,
                    trackName: 'Unknown Track',
                    sessionType: 'race',
                    drivers: new Map(),
                    lastUpdate: Date.now()
                });
            }

            // Update session data
            const activeSession = activeSessions.get(validData.sessionId)!;
            activeSession.lastUpdate = Date.now();

            // Update drivers
            if (validData.cars) { // Protocol uses 'cars', legacy used 'drivers' sometimes? Protocol strictly says 'cars'
                // ADAPTER MAPPING: Protocol 'cars' -> Internal 'drivers'
                for (const car of validData.cars) {
                    // Need to map Protocol CarTelemetrySnapshot -> Internal Driver state
                    activeSession.drivers.set(String(car.carId), { // carId is number in protocol, string map key
                        driverId: car.driverId || String(car.carId),
                        driverName: car.driverName || `Car ${car.carId}`, // Protocol doesn't guarantee name in telemetry?
                        carNumber: String(car.carId), // Simplification
                        lapDistPct: car.pos?.s || 0
                    });
                }
            }

            // Broadcast timing update to dashboard clients in this session room
            // MAPPING: Protocol 'cars' -> Dashboard 'timing' entry
            const timingEntries = validData.cars?.map((c: any) => ({
                driverId: c.driverId || String(c.carId),
                driverName: c.driverName || `Car ${c.carId}`,
                carNumber: String(c.carId),
                position: c.position ?? 0,
                lapNumber: c.lap ?? 0,
                lastLapTime: 0, // Not in simple shim
                bestLapTime: 0,
                gapToLeader: 0,
                lapDistPct: c.pos?.s || 0,
                speed: c.speed
            })) ?? [];

            // VOLATILE: Fire and forget. If client lags, they skip to next frame. No buffer bloat.
            io.volatile.to(`session:${validData.sessionId}`).emit('timing:update', {
                sessionId: validData.sessionId,
                sessionTimeMs: validData.sessionTimeMs ?? Date.now(),
                timing: { entries: timingEntries }
            });
        });

        // Binary Telemetry Handler (Phase 10)
        // Highly optimized path for receiving telemetry from updated relay agents
        socket.on('telemetry_binary', (data: { sessionId: string; payload: Buffer }) => {
            if (!data || !data.sessionId || !data.payload) return;

            try {
                const buffer = data.payload;
                // Parse Header
                // timestamp (double 8 bytes) + count (uint8 1 byte)
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
                    // 1 byte padding at offset + 13

                    cars.push({
                        carId,
                        driverId: String(carId), // Fallback
                        // Name not sent in binary to save space, will use cached or ID
                        // driverName will be patched from session state if available
                        position,
                        lap,
                        pos: { s: lapDistPct },
                        speed
                    });
                }

                // Process Telemetry (Same Logic as JSON path)
                let activeSession = activeSessions.get(data.sessionId);
                if (!activeSession) {
                    activeSession = {
                        sessionId: data.sessionId,
                        trackName: 'Unknown Track',
                        sessionType: 'race',
                        drivers: new Map(),
                        lastUpdate: Date.now()
                    };
                    activeSessions.set(data.sessionId, activeSession);
                }
                activeSession.lastUpdate = Date.now();

                // Update drivers and broadcast
                const timingEntries = cars.map(c => {
                    // Enrich with known driver name from session storage
                    const knownDriver = activeSession!.drivers.get(String(c.carId));
                    const driverName = knownDriver?.driverName || `Car ${c.carId}`;

                    if (!knownDriver) {
                        // Upsert new driver found
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

                // Volatile Broadcast
                io.volatile.to(`session:${data.sessionId}`).emit('timing:update', {
                    sessionId: data.sessionId,
                    sessionTimeMs: timestamp, // Now a standard JS timestamp number
                    timing: { entries: timingEntries }
                });

            } catch (err) {
                console.error('Error parsing binary telemetry:', err);
            }
        });

        // Strategy Update Handler (Phase 11 - 1Hz)
        socket.on('strategy_update', (data: any) => {
            if (!data || !data.sessionId || !data.cars) return;

            const session = activeSessions.get(data.sessionId);
            if (!session) return; // Only process strategy for active sessions

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
            io.to(`session:${data.sessionId}`).emit('strategy:update', {
                sessionId: data.sessionId,
                timestamp: data.timestamp,
                strategy: data.cars
            });

            // TEAM DASHBOARD: Emit car:status for the first/primary car
            // (pit wall typically shows your own car's status)
            if (data.cars && data.cars.length > 0) {
                const primaryCar = data.cars[0];
                const fuelPct = primaryCar.fuel?.pct || 0;

                io.to(`session:${data.sessionId}`).emit('car:status', {
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

                io.to(`session:${data.sessionId}`).emit('opponent:intel', { opponents });
            }
        });

        // Incident detected by relay
        socket.on('incident', (data: unknown) => {
            const isValid = relayAdapter.handleIncident(data);
            if (isValid) {
                const validData = data as any;

                // const primaryDriver = validData.driverNames?.[0] || 'Unknown';

                // Map drivers
                const involvedDrivers = validData.cars?.map((carId: number, idx: number) => ({
                    driverId: String(carId),
                    driverName: validData.driverNames?.[idx] || 'Unknown',
                    carNumber: String(carId),
                    role: 'involved'
                })) || [];

                // Broadcast to dashboard
                // MAPPING: Protocol incident -> Internal Incident
                io.to(`session:${validData.sessionId}`).emit('incident:new', {
                    sessionId: validData.sessionId,
                    incident: {
                        id: `inc-${Date.now()}`,
                        type: validData.type,
                        severity: validData.severity ?? 'medium',
                        lapNumber: validData.lap ?? 0,
                        // Convert sessionTime (secs) to ms, or fallback to now
                        sessionTimeMs: Date.now(), // Simplified
                        trackPosition: validData.trackPosition ?? 0,
                        cornerName: validData.cornerName,
                        involvedDrivers: involvedDrivers as any[],
                        status: 'pending'
                    }
                });

                // TEAM DASHBOARD: Emit event:log entry for pit wall event log
                io.to(`session:${validData.sessionId}`).emit('event:log', {
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

        // Race event from relay (flags, etc.)
        socket.on('race_event', (data: unknown) => {
            const isValid = relayAdapter.handleRaceEvent(data);
            if (isValid) {
                const validData = data as any;

                // Protocol matches Internal for Race Event mostly?
                // Just pass it through for now as it was generic before
                io.to(`session:${validData.sessionId}`).emit('race:event', validData);

                // TEAM DASHBOARD: Emit race:state for pit wall view
                io.to(`session:${validData.sessionId}`).emit('race:state', {
                    flagState: validData.flagState || 'green',
                    sessionType: validData.sessionPhase || 'Race',
                    currentLap: validData.lap || 0,
                    totalLaps: null, // Would need session metadata
                    timeRemaining: validData.timeRemaining || null,
                    position: 0, // Driver-specific, updated from telemetry
                    classPosition: undefined,
                    gap: '—'
                });

                // TEAM DASHBOARD: Emit event:log for race events (flag changes, etc.)
                io.to(`session:${validData.sessionId}`).emit('event:log', {
                    id: `evt-${Date.now()}`,
                    timestamp: Date.now(),
                    category: 'system',
                    message: `Flag: ${validData.flagState?.toUpperCase() || 'GREEN'} - Lap ${validData.lap || 0}`,
                    importance: validData.flagState === 'yellow' || validData.flagState === 'red' ? 'warning' : 'info'
                });

                socket.emit('ack', { originalType: 'race_event', success: true });
            } else {
                socket.emit('ack', { originalType: 'race_event', success: false, error: 'Validation Failed' });
            }
        });

        // Video Frame Relay (Phase 8 - Binary 60fps)
        // High-frequency, low-latency relay using Volatile Events (UDP-like)
        socket.on('video_frame', (data: { sessionId: string; image: Buffer }) => {
            if (data && data.sessionId && data.image) {
                // Volatile: If client can't keep up, drop the packet. Don't buffer.
                // Binary: 'image' is now a Buffer (raw JPEG bytes)
                socket.volatile.to(`session:${data.sessionId}`).emit('video:frame', {
                    sessionId: data.sessionId,
                    image: data.image, // Raw Buffer
                    timestamp: Date.now()
                });
            }
        });

        // Steward action from dashboard
        socket.on('steward:action', async (data: {
            sessionId: string;
            incidentId: string;
            action: 'approve' | 'reject' | 'modify';
            penaltyType?: string;
            penaltyValue?: number;
            notes?: string;
            stewardId?: string;
        }) => {
            console.log('⚖️ Steward action received:', data);

            try {
                // Broadcast the decision to all clients in the session
                io.to(`session:${data.sessionId}`).emit('steward:decision', {
                    incidentId: data.incidentId,
                    action: data.action,
                    penaltyType: data.penaltyType,
                    penaltyValue: data.penaltyValue,
                    notes: data.notes,
                    stewardId: data.stewardId,
                    decidedAt: new Date().toISOString()
                });

                // Log for audit trail
                console.log('[STEWARD] Decision broadcast:', {
                    type: 'STEWARD_DECISION',
                    incidentId: data.incidentId,
                    action: data.action,
                    timestamp: new Date()
                });

                // Acknowledge back to sender
                socket.emit('steward:action:ack', {
                    success: true,
                    incidentId: data.incidentId,
                    action: data.action
                });
            } catch (error) {
                console.error('[STEWARD] Error processing action:', error);
                socket.emit('steward:action:ack', {
                    success: false,
                    error: 'Failed to process steward action'
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    // Periodically clean up stale sessions
    setInterval(() => {
        const now = Date.now();
        for (const [sessionId, session] of activeSessions) {
            if (now - session.lastUpdate > 60000) { // 1 minute timeout
                console.log(`   Cleaning up stale session: ${sessionId}`);
                activeSessions.delete(sessionId);
            }
        }
    }, 30000);

    return io;
}

// Get list of active sessions (for REST API)
export function getActiveSessions() {
    return Array.from(activeSessions.values()).map(s => ({
        sessionId: s.sessionId,
        trackName: s.trackName,
        sessionType: s.sessionType,
        driverCount: s.drivers.size,
        lastUpdate: s.lastUpdate
    }));
}

export function getIO(): Server {
    if (!io) {
        throw new Error('WebSocket server not initialized');
    }
    return io;
}

// Broadcast functions

export function broadcastTimingUpdate(message: TimingUpdateMessage): void {
    if (!io) return;
    io.volatile.to(`session:${message.sessionId}`).emit('timing:update', message);
}

export function broadcastNewIncident(message: IncidentNewMessage): void {
    if (!io) return;
    io.to(`session:${message.sessionId}`).emit('incident:new', message);
}

export function broadcastIncidentUpdated(message: IncidentNewMessage): void {
    if (!io) return;
    io.to(`session:${message.sessionId}`).emit('incident:updated', message);
}

export function broadcastPenaltyProposed(message: PenaltyProposedMessage): void {
    if (!io) return;
    io.to(`session:${message.sessionId}`).emit('penalty:proposed', message);
}

export function broadcastPenaltyApproved(message: PenaltyProposedMessage): void {
    if (!io) return;
    io.to(`session:${message.sessionId}`).emit('penalty:approved', message);
}

export function broadcastSessionState(message: SessionStateMessage): void {
    if (!io) return;
    io.to(`session:${message.sessionId}`).emit('session:state', message);
}
