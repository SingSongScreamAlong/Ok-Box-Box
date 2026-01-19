// =====================================================================
// WebSocket Server
// =====================================================================

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/index.js';
import { socketRateLimiter } from './rate-limit.js';

// Modules
import { SessionHandler } from './SessionHandler.js';
import { AuthGate } from './AuthGate.js';
import { RoomManager } from './RoomManager.js';
import { TelemetryHandler } from './TelemetryHandler.js';
import { BroadcastHandler, setIO } from './BroadcastHandler.js';

let io: Server;

export function initializeWebSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigins,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // Provide IO instance to BroadcastHandler exports
    setIO(io);

    // 1. Setup Auth and Global Middleware
    const authGate = new AuthGate(io);
    authGate.setup();

    // 2. Start Session Cleanup Loop
    SessionHandler.startCleanupInterval();

    const sessionHandler = new SessionHandler(io);
    const telemetryHandler = new TelemetryHandler(io);
    const broadcastHandler = new BroadcastHandler(io);
    const roomManager = new RoomManager(); // stateless mostly

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Debug: Log all incoming events
        socket.onAny((eventName, ...args) => {
            // Filter redundant logs
            if (eventName !== 'telemetry' && eventName !== 'video_frame') {
                console.log(`📨 Event received: ${eventName}`, JSON.stringify(args).substring(0, 200));
            }
        });

        // 3. Setup Handlers
        roomManager.setup(socket);
        sessionHandler.setup(socket);
        telemetryHandler.setup(socket);
        broadcastHandler.setup(socket);

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
            socketRateLimiter.cleanup(socket.id);
        });
    });

    return io;
}

export function getIO(): Server {
    if (!io) {
        throw new Error('WebSocket server not initialized');
    }
    return io;
}

// Re-exports
export { getActiveSessions } from './SessionHandler.js';
export {
    broadcastTimingUpdate,
    broadcastNewIncident,
    broadcastIncidentUpdated,
    broadcastPenaltyProposed,
    broadcastPenaltyApproved,
    broadcastSessionState
} from './BroadcastHandler.js';
