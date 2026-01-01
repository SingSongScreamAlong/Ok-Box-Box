/**
 * BlackBox Cloud - Main Server
 * WebSocket + REST API backend for AI Race Engineering
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { RaceEngineer } from './ai/race_engineer.js';

// Environment configuration
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// HTTP server
const httpServer = createServer(app);

// Socket.IO server
const io = new SocketIO(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ============================================
// In-Memory State (replace with Postgres later)
// ============================================

interface Session {
    id: string;
    name: string;
    track: string;
    createdAt: Date;
    relayConnected: boolean;
    webClients: number;
}

interface TelemetryFrame {
    sessionId: string;
    lap: number;
    speed: number;
    gear: number;
    rpm: number;
    throttle: number;
    brake: number;
    clutch: number;
    position: { s: number };
    timestamp: number;
}

interface RadioCall {
    id: string;
    sessionId: string;
    role: string;
    text: string;
    timestamp: number;
}

const sessions = new Map<string, Session>();
const telemetryBuffer = new Map<string, TelemetryFrame[]>();
const radioLogs = new Map<string, RadioCall[]>();

// AI Race Engineer
const raceEngineer = new RaceEngineer(OPENAI_API_KEY);

// ============================================
// WebSocket Handling
// ============================================

io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    let clientSessionId = '';
    let clientRole = '';

    // Join session
    socket.on('join_session', (data: { sessionId: string; role: string }) => {
        clientSessionId = data.sessionId || uuidv4();
        clientRole = data.role || 'viewer';

        socket.join(clientSessionId);

        // Create session if doesn't exist
        if (!sessions.has(clientSessionId)) {
            sessions.set(clientSessionId, {
                id: clientSessionId,
                name: `Session ${clientSessionId.slice(0, 8)}`,
                track: 'Unknown',
                createdAt: new Date(),
                relayConnected: false,
                webClients: 0
            });
            telemetryBuffer.set(clientSessionId, []);
            radioLogs.set(clientSessionId, []);
        }

        const session = sessions.get(clientSessionId)!;

        if (clientRole === 'relay') {
            session.relayConnected = true;
            console.log(`Relay joined session: ${clientSessionId}`);
        } else {
            session.webClients++;
            console.log(`Web client joined session: ${clientSessionId}`);
        }

        // Send current session state
        socket.emit('session_joined', {
            sessionId: clientSessionId,
            session: session
        });
    });

    // ============================================
    // Relay Protocol Handlers (controlbox-relay)
    // ============================================

    // Session metadata from relay (sent when iRacing session starts)
    socket.on('session_metadata', (data: {
        sessionId: string;
        trackName: string;
        sessionType: string;
        relayId?: string;
        category?: string;
        isMulticlass?: boolean;
    }) => {
        clientSessionId = data.sessionId;
        clientRole = 'relay';

        socket.join(clientSessionId);

        // Create or update session
        if (!sessions.has(clientSessionId)) {
            sessions.set(clientSessionId, {
                id: clientSessionId,
                name: data.trackName,
                track: data.trackName,
                createdAt: new Date(),
                relayConnected: true,
                webClients: 0
            });
            telemetryBuffer.set(clientSessionId, []);
            radioLogs.set(clientSessionId, []);
        } else {
            const session = sessions.get(clientSessionId)!;
            session.relayConnected = true;
            session.track = data.trackName;
            session.name = data.trackName;
        }

        console.log(`📡 Relay connected: ${data.trackName} [${data.sessionType}]`);
        socket.emit('ack', { originalType: 'session_metadata', success: true });

        // Notify web clients of active session
        io.to(clientSessionId).emit('session:active', {
            sessionId: clientSessionId,
            trackName: data.trackName,
            sessionType: data.sessionType
        });
    });

    // Telemetry from Relay (multi-driver format)
    socket.on('telemetry', async (data: any) => {
        const sessionId = data.sessionId || clientSessionId;
        if (!sessionId) return;

        // Handle multi-driver format from relay
        const drivers = data.drivers || [];
        const timestamp = data.sessionTimeMs || Date.now();

        // Store summary frame for AI analysis
        const buffer = telemetryBuffer.get(sessionId) || [];
        if (drivers.length > 0) {
            const firstDriver = drivers[0];
            buffer.push({
                sessionId,
                lap: firstDriver.lapNumber || 0,
                speed: firstDriver.speed || 0,
                gear: 0,
                rpm: 0,
                throttle: 0,
                brake: 0,
                clutch: 0,
                position: { s: firstDriver.lapDistPct || 0 },
                timestamp
            });
            if (buffer.length > 100) buffer.shift();
            telemetryBuffer.set(sessionId, buffer);
        }

        // Broadcast timing update to web clients
        io.to(sessionId).emit('timing:update', {
            sessionId,
            sessionTimeMs: timestamp,
            timing: {
                entries: drivers.map((d: any, idx: number) => ({
                    driverId: d.driverId,
                    driverName: d.driverName,
                    carNumber: d.carNumber,
                    position: d.position ?? idx + 1,
                    lapNumber: d.lapNumber ?? 0,
                    lastLapTime: d.lastLapTime,
                    bestLapTime: d.bestLapTime,
                    gapToLeader: d.gapToLeader,
                    lapDistPct: d.lapDistPct,
                    speed: d.speed
                }))
            }
        });

        // Also emit raw telemetry for other consumers
        socket.to(sessionId).emit('telemetry', data);

        // Check if AI should generate a radio call (throttled)
        if (buffer.length % 50 === 0 && buffer.length > 0) {
            const radioCall = await raceEngineer.analyzeAndRespond(sessionId, buffer);
            if (radioCall) {
                broadcastRadioCall(sessionId, radioCall);
            }
        }
    });

    // Race events from relay (flag changes, etc.)
    socket.on('race_event', (data: { sessionId: string; eventType: string; data?: any }) => {
        const sessionId = data.sessionId || clientSessionId;
        console.log(`🏁 Race event: ${data.eventType}`);
        io.to(sessionId).emit('race:event', data);
        socket.emit('ack', { originalType: 'race_event', success: true });
    });

    // Incidents from relay
    socket.on('incident', (data: { sessionId: string; type: string; driverName?: string; driverId?: string }) => {
        const sessionId = data.sessionId || clientSessionId;
        console.log(`🚨 Incident: ${data.type} - ${data.driverName || 'Unknown'}`);
        io.to(sessionId).emit('incident:new', {
            sessionId,
            incident: { ...data, id: uuidv4(), timestamp: Date.now() }
        });
        socket.emit('ack', { originalType: 'incident', success: true });
    });

    // Driver voice from Relay
    socket.on('driver_voice', async (data: { sessionId: string; text: string; timestamp: number }) => {
        const sessionId = data.sessionId || clientSessionId;
        console.log(`Driver voice: "${data.text}"`);

        // Process with AI
        const buffer = telemetryBuffer.get(sessionId) || [];
        const response = await raceEngineer.respondToDriver(sessionId, data.text, buffer);

        if (response) {
            broadcastRadioCall(sessionId, response);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (clientSessionId && sessions.has(clientSessionId)) {
            const session = sessions.get(clientSessionId)!;
            if (clientRole === 'relay') {
                session.relayConnected = false;
            } else {
                session.webClients = Math.max(0, session.webClients - 1);
            }
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Broadcast radio call to all session participants
function broadcastRadioCall(sessionId: string, text: string) {
    const radioCall: RadioCall = {
        id: uuidv4(),
        sessionId,
        role: 'race_engineer',
        text,
        timestamp: Date.now()
    };

    // Store in log
    const log = radioLogs.get(sessionId) || [];
    log.push(radioCall);
    radioLogs.set(sessionId, log);

    // Broadcast to all session clients (relay + web)
    io.to(sessionId).emit('radio_call', radioCall);

    console.log(`📻 Radio call [${sessionId}]: ${text}`);
}

// ============================================
// REST API
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List sessions
app.get('/api/sessions', (req, res) => {
    const sessionList = Array.from(sessions.values()).map(s => ({
        id: s.id,
        name: s.name,
        track: s.track,
        createdAt: s.createdAt,
        relayConnected: s.relayConnected,
        webClients: s.webClients
    }));
    res.json({ sessions: sessionList });
});

// Get session details
app.get('/api/sessions/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const log = radioLogs.get(req.params.id) || [];
    res.json({ session, radioLog: log.slice(-50) });
});

// Create session
app.post('/api/sessions', (req, res) => {
    const id = uuidv4();
    const session: Session = {
        id,
        name: req.body.name || `Session ${id.slice(0, 8)}`,
        track: req.body.track || 'Unknown',
        createdAt: new Date(),
        relayConnected: false,
        webClients: 0
    };

    sessions.set(id, session);
    telemetryBuffer.set(id, []);
    radioLogs.set(id, []);

    res.json({ session });
});

// Send manual radio call (for testing)
app.post('/api/sessions/:id/radio', (req, res) => {
    const sessionId = req.params.id;
    const text = req.body.text;

    if (!text) {
        return res.status(400).json({ error: 'text required' });
    }

    broadcastRadioCall(sessionId, text);
    res.json({ success: true });
});

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
    console.log('================================================');
    console.log('BlackBox Cloud Server');
    console.log('================================================');
    console.log(`HTTP Server: http://localhost:${PORT}`);
    console.log(`WebSocket:   ws://localhost:${PORT}`);
    console.log(`OpenAI:      ${OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log('================================================');
});
