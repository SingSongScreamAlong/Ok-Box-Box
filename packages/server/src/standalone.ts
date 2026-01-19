// =====================================================================
// ControlBox Standalone Server (No DB required)
// A lightweight server for relay agent testing
// =====================================================================

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { getViewerTracker } from './services/telemetry/viewer-tracker.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';

console.log('🏎️  ControlBox Standalone Server Starting...');
console.log(`   Mode: Standalone (no database)`);
console.log(`   Port: ${PORT}`);
console.log(`   Build: 2026-01-19-v2`);

// Track active sessions for diagnostics
const activeSessions = new Map<string, { lastUpdate: number; driverCount: number }>();

// Create Express app for static file serving
const app = express();
app.use(cors({ origin: '*' }));

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

// Serve legacy BlackBox dashboard at /blackbox
const currentDir = dirname(fileURLToPath(import.meta.url));
const blackboxPath = join(currentDir, '../public/blackbox');
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
            socket.broadcast.emit('session:active', {
                sessionId: metadata.sessionId,
                trackName: metadata.trackName || 'Unknown Track',
                sessionType: metadata.sessionType || 'practice'
            });
            console.log(`📡 Broadcasting session:active for ${metadata.sessionId}`);
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
        // Broadcast to all dashboard clients
        // Emit both event names for compatibility with different dashboard versions
        socket.broadcast.emit('telemetry:update', data);
        socket.broadcast.emit('telemetry_update', data);  // Legacy dashboard format
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
        socket.broadcast.emit('incident:new', data);
    });

    socket.on('race_event', (data: unknown) => {
        console.log(`🏁 Race event:`, data);
        socket.broadcast.emit('race:event', data);
    });

    socket.on('driver_update', (data: unknown) => {
        console.log(`👤 Driver update:`, data);
        socket.broadcast.emit('driver:update', data);
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
