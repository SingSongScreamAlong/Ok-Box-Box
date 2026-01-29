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
import { getWhisperService, getVoiceService, VOICE_PRESETS } from '../services/voice/index.js';
import { getTelemetryForVoice } from './telemetry-cache.js';
import { getCachedDriverContext, formatDriverContextForAI } from '../services/voice/driver-context.service.js';

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

        // Dashboard join handler - send current session info to late-joining clients
        socket.on('dashboard:join', (data: { type: string }) => {
            console.log(`   Dashboard ${socket.id} joined as ${data.type}`);
            
            // Send current session info if available
            const sessionInfo = TelemetryHandler.getCurrentSessionInfo();
            if (sessionInfo) {
                socket.emit('session:active', sessionInfo);
                console.log(`   Sent session:active to late joiner: ${sessionInfo.trackName}`);
            }
        });

        // 3. Setup Handlers
        roomManager.setup(socket);
        sessionHandler.setup(socket);
        telemetryHandler.setup(socket);
        broadcastHandler.setup(socket);

        // 4. Voice Query Handler
        socket.on('voice:query', async (data: { audio: string; format?: string }) => {
            try {
                const whisperService = getWhisperService();
                const voiceService = getVoiceService();

                if (!whisperService.isServiceAvailable()) {
                    socket.emit('voice:response', {
                        success: false,
                        error: 'Speech-to-text service unavailable'
                    });
                    return;
                }

                // Decode base64 audio
                const audioBuffer = Buffer.from(data.audio, 'base64');

                // Get current telemetry for context
                const telemetry = getTelemetryForVoice('live');
                
                // Get driver's iRacing ID from telemetry (if available)
                const iRacingId = telemetry?.driverName ? String(telemetry.driverName) : undefined;
                
                // Fetch driver context (IDP profile, traits, goals, team strategy)
                let driverContext: string | undefined;
                if (iRacingId) {
                    try {
                        const ctx = await getCachedDriverContext(iRacingId);
                        if (ctx) {
                            driverContext = formatDriverContextForAI(ctx);
                            console.log('🎤 Voice query - driver context loaded for:', ctx.driverName);
                        }
                    } catch (err) {
                        console.warn('Could not load driver context:', err);
                    }
                }

                // Process voice query (STT + AI response)
                const conversation = await whisperService.processDriverQuery(
                    audioBuffer,
                    {
                        sessionId: 'live',
                        driverId: socket.id,
                        iRacingId,
                        recentMessages: [],
                        telemetry,
                        driverContext
                    }
                );

                if (!conversation) {
                    socket.emit('voice:response', {
                        success: false,
                        error: 'Failed to process voice query'
                    });
                    return;
                }

                // Generate TTS audio if available
                let audioBase64: string | undefined;
                if (voiceService.isServiceAvailable()) {
                    const ttsResult = await voiceService.textToSpeech({
                        text: conversation.response,
                        ...VOICE_PRESETS.raceEngineer
                    });

                    if (ttsResult.success && ttsResult.audioBuffer) {
                        audioBase64 = ttsResult.audioBuffer.toString('base64');
                    }
                }

                socket.emit('voice:response', {
                    success: true,
                    query: conversation.query,
                    response: conversation.response,
                    audioBase64
                });

            } catch (error) {
                console.error('Voice query error:', error);
                socket.emit('voice:response', {
                    success: false,
                    error: error instanceof Error ? error.message : 'Voice query failed'
                });
            }
        });

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
