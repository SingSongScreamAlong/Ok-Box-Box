// =====================================================================
// ControlBox Standalone Server (No DB required)
// A lightweight server for relay agent testing
// =====================================================================

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import express from 'express';
import { join } from 'path';
import cors from 'cors';
import { getViewerTracker } from './services/telemetry/viewer-tracker.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';

// Helper to format lap time in seconds to MM:SS.mmm
function formatLapTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

console.log('🏎️  ControlBox Standalone Server Starting...');
console.log(`   Mode: Standalone (no database)`);
console.log(`   Port: ${PORT}`);
console.log(`   Build: 2026-01-19-v2`);

// Track active sessions for diagnostics
const activeSessions = new Map<string, { lastUpdate: number; driverCount: number }>();

// Store current session info for late-joining clients
let currentSessionInfo: { track: string; session: string; sessionId: string } | null = null;

// Create Express app for static file serving
const app = express();

// CORS - allow all origins with credentials
app.use(cors({ 
    origin: true,  // Reflect request origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

// Health check endpoints
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'standalone' });
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'standalone' });
});

app.get('/api/health/telemetry', (_req, res) => {
    const sessions: any[] = [];
    activeSessions.forEach((session, sessionId) => {
        sessions.push({
            sessionId,
            driverCount: session.driverCount,
            lastUpdate: session.lastUpdate,
            ageMs: Date.now() - session.lastUpdate
        });
    });
    res.json({ activeSessions: sessions.length, sessions, dashboardClients: dashboardClients.size });
});

// =====================================================================
// Stub API Routes (standalone mode - no database)
// These return empty/default data to prevent frontend errors
// =====================================================================

// Driver profile stub - returns empty profile
app.get('/api/v1/drivers/me', (_req, res) => {
    res.json({
        id: null,
        displayName: 'Guest Driver',
        iracingId: null,
        licenses: [],
        stats: { races: 0, wins: 0, podiums: 0, avgFinish: 0 },
        message: 'Standalone mode - connect iRacing for live data'
    });
});

// Driver sessions stub
app.get('/api/v1/drivers/me/sessions', (_req, res) => {
    res.json({ sessions: [], total: 0 });
});

// Driver stats stub
app.get('/api/v1/drivers/me/stats', (_req, res) => {
    res.json({ 
        totalRaces: 0, 
        wins: 0, 
        podiums: 0, 
        avgFinish: 0,
        safetyRating: 0,
        iRating: 0
    });
});

// Driver development stub
app.get('/api/v1/drivers/me/development', (_req, res) => {
    res.json({ skills: [], goals: [], progress: 0 });
});

// Serve legacy BlackBox dashboard at /blackbox
const blackboxPath = join(process.cwd(), 'public/blackbox');
app.use('/blackbox', express.static(blackboxPath));
app.get('/blackbox/*', (_req, res) => {
    res.sendFile(join(blackboxPath, 'index.html'));
});

// Default route
app.get('/', (_req, res) => {
    res.send(`
        <html>
            <head><title>ControlBox Server</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; background: #1a1a2e; color: #eee;">
                <h1>🏎️ ControlBox Server</h1>
                <p>Socket.IO server is running and ready for connections.</p>
                <p>Mode: <strong>Standalone</strong></p>
                <p>Port: <strong>${PORT}</strong></p>
                <p><a href="/blackbox" style="color: #4ecdc4;">Open BlackBox Dashboard</a></p>
            </body>
        </html>
    `);
});

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// Initialize ViewerTracker with Socket.IO instance
const viewerTracker = getViewerTracker();
viewerTracker.initialize(io);

// Track connected clients
let relayClient: Socket | null = null;
const dashboardClients: Set<string> = new Set();

io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Debug: Log all incoming events
    socket.onAny((eventName, ...args) => {
        if (eventName !== 'telemetry') {
            console.log(`📨 Event: ${eventName}`);
        }
    });

    // =====================================================================
    // Relay Agent Events (from Python iRacing relay)
    // =====================================================================

    socket.on('session_metadata', (data: unknown) => {
        console.log(`📊 Session metadata received`);
        relayClient = socket;
        // Broadcast to all dashboard clients
        socket.broadcast.emit('session:metadata', data);
        
        // Also emit session:active for dashboard auto-redirect
        const metadata = data as any;
        if (metadata?.sessionId) {
            // Store current session info for late-joining clients
            currentSessionInfo = {
                track: metadata.trackName || 'Unknown Track',
                session: metadata.sessionType || 'practice',
                sessionId: metadata.sessionId
            };
            
            socket.broadcast.emit('session:active', {
                sessionId: metadata.sessionId,
                trackName: metadata.trackName || 'Unknown Track',
                sessionType: metadata.sessionType || 'practice'
            });
            // Emit session_info for LROC/dashboard compatibility
            socket.broadcast.emit('session_info', currentSessionInfo);
            console.log(`📡 Broadcasting session:active for ${metadata.sessionId}: ${metadata.trackName}`);
        }
    });

    socket.on('telemetry', (data: unknown) => {
        // Track session for diagnostics
        const telemetryData = data as any;
        if (telemetryData?.sessionId) {
            activeSessions.set(telemetryData.sessionId, {
                lastUpdate: Date.now(),
                driverCount: telemetryData.cars?.length || 0
            });
        }
        
        // Log telemetry receipt (sample 1 in 60 to avoid spam)
        if (Math.random() < 0.017) {
            console.log(`📊 Telemetry: ${telemetryData.cars?.length || 0} cars, ${telemetryData.standings?.length || 0} standings, broadcasting to ${dashboardClients.size} clients`);
        }
        
        // Extract session info from telemetry if not already set
        if (!currentSessionInfo && telemetryData.sessionId) {
            currentSessionInfo = {
                track: telemetryData.trackName || 'Live Session',
                session: telemetryData.sessionType || 'race',
                sessionId: telemetryData.sessionId
            };
            console.log(`📋 Session info extracted from telemetry: ${currentSessionInfo.track}`);
        }
        
        // Broadcast to all dashboard clients with session info included
        const enrichedData = {
            ...telemetryData,
            trackName: currentSessionInfo?.track || telemetryData.trackName,
            sessionType: currentSessionInfo?.session || telemetryData.sessionType
        };
        socket.broadcast.emit('telemetry:update', enrichedData);
        socket.broadcast.emit('telemetry:driver', enrichedData);
        
        // Format telemetry for LROC/dashboard compatibility
        // cars[] has detailed telemetry (throttle, brake, rpm, gear)
        // drivers[] has timing data (speed, lap times, position)
        const car = telemetryData.cars?.[0];
        const driver = telemetryData.drivers?.[0];
        if (car || driver) {
            const formattedTelemetry = {
                speed: driver?.speed ? Math.round(driver.speed * 2.237) : 0, // m/s to mph
                rpm: car?.rpm || 0,
                gear: car?.gear || 0,
                throttle: car?.throttle ? car.throttle * 100 : 0,
                brake: car?.brake ? car.brake * 100 : 0,
                lap: driver?.lapNumber || car?.lap || 0,
                position: driver?.position || car?.position || 0,
                lastLapTime: driver?.lastLapTime || 0,
                bestLapTime: driver?.bestLapTime || 0,
                trackPosition: driver?.lapDistPct || car?.pos?.s || 0,
                fuel: { level: car?.fuelLevel || 0 },
                timestamp: Date.now()
            };
            socket.broadcast.emit('telemetry_update', formattedTelemetry);
        }
        
        // Emit competitor_data for leaderboard
        // Relay sends 'standings' array, fallback to 'drivers' or 'cars'
        const standings = telemetryData.standings || telemetryData.drivers || telemetryData.cars;
        if (standings && standings.length > 0) {
            const competitorData = standings
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((s: any) => ({
                    position: s.position || 0,
                    driver: s.driverName || `Car ${s.carId || s.carIdx}`,
                    gap: s.isPlayer ? '—' : (s.gapToLeader ? `+${s.gapToLeader.toFixed(1)}s` : '--'),
                    lastLap: s.lastLapTime > 0 ? formatLapTime(s.lastLapTime) : '—'
                }));
            socket.broadcast.emit('competitor_data', competitorData);
        }
    });

    // v2: Baseline stream (4Hz)
    socket.on('telemetry:baseline', (data: unknown) => {
        socket.broadcast.emit('telemetry:baseline', data);
    });

    // v2: Controls stream (15Hz when viewers present)
    socket.on('telemetry:controls', (data: unknown) => {
        socket.broadcast.emit('telemetry:controls', data);
    });

    // v2: Event stream (instant)
    socket.on('event', (data: unknown) => {
        console.log(`🚨 Event:`, data);
        socket.broadcast.emit('event', data);
    });

    socket.on('incident', (data: unknown) => {
        console.log(`⚠️ Incident received:`, data);
        // Use io.emit to broadcast to ALL clients including late joiners
        io.emit('incident:new', data);
    });

    socket.on('race_event', (data: unknown) => {
        console.log(`🏁 Race event:`, data);
        io.emit('race:event', data);
    });

    socket.on('driver_update', (data: unknown) => {
        console.log(`👤 Driver update:`, data);
        io.emit('driver:update', data);
    });

    // =====================================================================
    // Dashboard Client Events
    // =====================================================================

    socket.on('room:join', (data: { sessionId: string }) => {
        const roomName = `session:${data.sessionId}`;
        socket.join(roomName);
        dashboardClients.add(socket.id);
        console.log(`   Dashboard ${socket.id} joined room ${roomName}`);
        socket.emit('room:joined', { sessionId: data.sessionId });

        // Track viewer for adaptive streaming
        viewerTracker.viewerJoined(socket, data.sessionId, 'web');
    });

    // Dashboard join event (used by frontend useRelay hook)
    socket.on('dashboard:join', (data: { type: string }) => {
        dashboardClients.add(socket.id);
        console.log(`   Dashboard ${socket.id} joined as ${data.type}`);
        
        // Send current session info to late-joining clients
        if (currentSessionInfo) {
            socket.emit('session_info', currentSessionInfo);
            console.log(`   Sent session_info to late joiner: ${currentSessionInfo.track}`);
        }
    });

    socket.on('room:leave', (data: { sessionId: string }) => {
        const roomName = `session:${data.sessionId}`;
        socket.leave(roomName);
        console.log(`   Dashboard ${socket.id} left room ${roomName}`);

        // Track viewer leave
        viewerTracker.viewerLeft(socket, data.sessionId);
    });

    // Relay registration (so we can send control messages)
    socket.on('relay:register', (data: { sessionId: string }) => {
        const roomName = `session:${data.sessionId}`;
        socket.join(roomName);
        relayClient = socket;
        console.log(`📡 Relay registered for session ${data.sessionId}`);

        // Send current viewer count immediately
        const viewerCount = viewerTracker.getViewerCount(data.sessionId);
        socket.emit('relay:viewers', {
            type: 'relay:viewers',
            sessionId: data.sessionId,
            viewerCount,
            requestControls: viewerCount > 0,
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        dashboardClients.delete(socket.id);

        // Handle viewer disconnect
        viewerTracker.handleDisconnect(socket);

        if (relayClient?.id === socket.id) {
            relayClient = null;
            console.log('   ⚠️ Relay agent disconnected');
        }
    });
});

// Start listening
httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 ControlBox server running at http://${HOST}:${PORT}`);
    console.log(`   Health check: http://${HOST}:${PORT}/api/health`);
    console.log('');
    console.log('   Waiting for relay agent to connect...');
});

// Graceful shutdown
const shutdown = () => {
    console.log('\n🛑 Shutting down...');
    httpServer.close(() => {
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
