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
import { getSituationalAwarenessService } from '../services/ai/situational-awareness.js';
import { getVoiceService, VOICE_PRESETS } from '../services/voice/voice-service.js';
// Parity tracking removed or unused


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
    // Broadcast Delay (RaceBox Plus)
    broadcastDelayMs: number;
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
            // Filter redundant logs
            if (eventName !== 'telemetry' && eventName !== 'video_frame') {
                console.log(`📨 Event received: ${eventName}`, JSON.stringify(args).substring(0, 200));
            }
        });

        // Send any active sessions to the new client immediately
        // ... (existing code omitted for brevity only if block unchanged, but we are replacing whole block mostly)
        for (const session of activeSessions.values()) {
            if (Date.now() - session.lastUpdate < 30000) {
                socket.emit('session:active', {
                    sessionId: session.sessionId,
                    trackName: session.trackName,
                    sessionType: session.sessionType
                });
            }
        }

        // ... (Join/Leave room handlers unchanged)
        socket.on('room:join', (data: JoinRoomMessage) => {
            const roomName = `session:${data.sessionId}`;
            socket.join(roomName);
            // ...
            const session = activeSessions.get(data.sessionId);
            if (session) {
                socket.emit('session:state', {
                    sessionId: data.sessionId,
                    trackName: session.trackName,
                    sessionType: session.sessionType,
                    status: 'active'
                });
                // Send current delay state
                socket.emit('broadcast:delay', { delayMs: session.broadcastDelayMs });
            }
            socket.emit('room:joined', { sessionId: data.sessionId });
        });

        socket.on('room:leave', (data: LeaveRoomMessage) => {
            const roomName = `session:${data.sessionId}`;
            socket.leave(roomName);
        });

        // =====================================================================
        // DIRECTOR CONTROLS (RaceBox Plus)
        // =====================================================================

        socket.on('broadcast:delay', (data: { sessionId: string; delayMs: number }) => {
            const session = activeSessions.get(data.sessionId);
            if (session) {
                session.broadcastDelayMs = Math.max(0, Math.min(data.delayMs, 60000)); // Clamp 0-60s
                console.log(`⏱️ Set Broadcast Delay for ${data.sessionId}: ${session.broadcastDelayMs}ms`);
                // Broadcast new delay to all consumers in room (so they know they are watching delayed stream)
                io.to(`session:${data.sessionId}`).emit('broadcast:delay', { delayMs: session.broadcastDelayMs });
            }
        });

        // =====================================================================
        // RELAY AGENT HANDLERS
        // =====================================================================

        const relayAdapter = new RelayAdapter(activeSessions, socket);

        // Session metadata
        socket.on('session_metadata', (data: unknown) => {
            const isValid = relayAdapter.handleSessionMetadata(data);

            if (isValid) {
                const validData = data as any;
                activeSessions.set(validData.sessionId, {
                    sessionId: validData.sessionId,
                    trackName: validData.trackName,
                    sessionType: validData.sessionType,
                    drivers: new Map(),
                    lastUpdate: Date.now(),
                    broadcastDelayMs: 0 // Default to 0
                });

                socket.join(`session:${validData.sessionId}`);
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

        // Telemetry snapshot
        socket.on('telemetry', (data: unknown) => {
            const isValid = relayAdapter.handleTelemetry(data);
            if (!isValid) return;

            const validData = data as any;

            // ... (Ack handling omitted for brevity, assumed standard)

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

            // Update internal state immediately (pit wall needs real-time)
            // But timing board users might want delayed? 
            // Architecture decision: Delay is for Public Broadcast. Teams (pitwall) usually want Live.
            // For now, we delay the 'timing:update' broadcast to everyone in the room.
            // Teams needing live can use a separate room or flag later. V1 assumes everyone in session room gets the stream.

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
            if (delay > 0) {
                setTimeout(() => {
                    io.volatile.to(`session:${validData.sessionId}`).emit('timing:update', payload);
                }, delay);
            } else {
                io.volatile.to(`session:${validData.sessionId}`).emit('timing:update', payload);
            }
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
                        lastUpdate: Date.now(),
                        broadcastDelayMs: 0
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
                const payload = {
                    sessionId: data.sessionId,
                    sessionTimeMs: timestamp, // Now a standard JS timestamp number
                    timing: { entries: timingEntries }
                };

                // Use delay
                const delay = activeSession.broadcastDelayMs;
                if (delay > 0) {
                    setTimeout(() => {
                        io.volatile.to(`session:${data.sessionId}`).emit('timing:update', payload);
                    }, delay);
                } else {
                    io.volatile.to(`session:${data.sessionId}`).emit('timing:update', payload);
                }

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
            const emitStrategy = () => {
                io.to(`session:${data.sessionId}`).emit('strategy:update', {
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

            // SITUATIONAL AWARENESS: Generate race engineer intel (async, non-blocking)
            const awarenessService = getSituationalAwarenessService();
            if (awarenessService.isAvailable() && data.cars && data.cars.length > 0) {
                const primaryCar = data.cars[0];
                
                // Build context for AI analysis
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

                // Fire and forget - don't block telemetry
                awarenessService.analyzeRaceSituation(raceContext, driverState, trafficInfo)
                    .then(updates => {
                        if (updates.length > 0) {
                            // Send to driver's relay
                            io.to(`session:${data.sessionId}`).emit('engineer:update', {
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

        // Voice generation request from relay (ElevenLabs TTS)
        socket.on('voice:generate', async (data: { text: string; preset?: string; voiceId?: string }) => {
            const voiceService = getVoiceService();
            
            if (!voiceService.isServiceAvailable()) {
                socket.emit('voice:audio', { 
                    success: false, 
                    error: 'ElevenLabs not configured',
                    text: data.text 
                });
                return;
            }

            try {
                // Get preset settings or use defaults
                const presetKey = data.preset as keyof typeof VOICE_PRESETS;
                const preset = presetKey ? VOICE_PRESETS[presetKey] : undefined;
                
                const result = await voiceService.textToSpeech({
                    text: data.text,
                    voiceId: data.voiceId || preset?.voiceId,
                    stability: preset?.stability,
                    similarityBoost: preset?.similarityBoost
                });

                if (result.success && result.audioBuffer) {
                    // Send audio as base64
                    socket.emit('voice:audio', {
                        success: true,
                        audioBase64: result.audioBuffer.toString('base64'),
                        text: data.text,
                        durationMs: result.durationMs
                    });
                } else {
                    socket.emit('voice:audio', {
                        success: false,
                        error: result.error,
                        text: data.text
                    });
                }
            } catch (err) {
                console.error('Voice generation error:', err);
                socket.emit('voice:audio', {
                    success: false,
                    error: 'Voice generation failed',
                    text: data.text
                });
            }
        });

        // Get available ElevenLabs voices
        socket.on('voice:list', async () => {
            const voiceService = getVoiceService();
            
            if (!voiceService.isServiceAvailable()) {
                socket.emit('voice:voices', { success: false, voices: [] });
                return;
            }

            const voices = await voiceService.getVoices();
            socket.emit('voice:voices', { 
                success: true, 
                voices: voices.map(v => ({ id: v.voice_id, name: v.name }))
            });
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

        // Session End - Trigger IDP Pipeline for all drivers
        socket.on('session_end', async (data: { sessionId: string }) => {
            console.log(`🏁 Session ended: ${data.sessionId}`);

            const session = activeSessions.get(data.sessionId);
            if (!session) {
                socket.emit('ack', { originalType: 'session_end', success: false, error: 'Session not found' });
                return;
            }

            // Notify all clients
            io.to(`session:${data.sessionId}`).emit('session:ended', {
                sessionId: data.sessionId,
                trackName: session.trackName,
                sessionType: session.sessionType,
                driverCount: session.drivers.size,
            });

            // Trigger IDP pipeline for each driver in the session
            // Import dynamically to avoid circular dependencies
            try {
                const { runPostSessionPipeline } = await import('../driverbox/services/idp/index.js');

                for (const [driverId] of session.drivers) {
                    // Note: In production, driverId would be resolved to driverProfileId
                    // via linked_racing_identities. For now, we log the intent.
                    console.log(`[IDP] Queuing post-session pipeline for driver ${driverId} in session ${data.sessionId}`);

                    // Queue async - don't block the socket
                    runPostSessionPipeline(data.sessionId, driverId).catch(err => {
                        console.error(`[IDP] Pipeline failed for driver ${driverId}:`, err);
                    });
                }
            } catch (err) {
                console.error('[IDP] Failed to load IDP services:', err);
            }

            // Clean up session from active map
            activeSessions.delete(data.sessionId);

            socket.emit('ack', { originalType: 'session_end', success: true });
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
