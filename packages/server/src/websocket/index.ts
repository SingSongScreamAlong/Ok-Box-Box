// =====================================================================
// WebSocket Server
// =====================================================================

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/index.js';
import { socketRateLimiter } from './rate-limit.js';
import { deriveCapabilitiesFromEntitlements } from '../services/billing/entitlement-service.js';

// Modules
import { SessionHandler } from './SessionHandler.js';
import { AuthGate } from './AuthGate.js';
import { RoomManager } from './RoomManager.js';
import { TelemetryHandler } from './TelemetryHandler.js';
import { BroadcastHandler, setIO } from './BroadcastHandler.js';
import { BehavioralGateway } from './BehavioralGateway.js';
import { getWhisperService, getVoiceService, VOICE_PRESETS } from '../services/voice/index.js';
import { getTelemetryForVoice } from './telemetry-cache.js';
import { getCachedDriverContext, formatDriverContextForAI } from '../services/voice/driver-context.service.js';
import { getTeamById } from '../db/repositories/team.repo.js';
import { getActiveMembership, getMembershipsForDriver } from '../db/repositories/team-membership.repo.js';
import { getDriverProfileByUserId } from '../db/repositories/driver-profile.repo.js';

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
    const behavioralGateway = new BehavioralGateway(io);
    const roomManager = new RoomManager(); // stateless mostly

    io.on('connection', (socket: Socket) => {
        // Dashboard join handler - send current session info to late-joining clients
        socket.on('dashboard:join', (_data: { type: string }) => {
            // Send current session info if available
            const sessionInfo = TelemetryHandler.getCurrentSessionInfo();
            if (sessionInfo) {
                socket.emit('session:active', sessionInfo);
            }
        });

        // 3. Setup Handlers
        roomManager.setup(socket);
        sessionHandler.setup(socket);
        telemetryHandler.setup(socket);
        broadcastHandler.setup(socket);
        behavioralGateway.setup(socket);

        // 4. Team Radio Room Handlers
        socket.on('team:join', async (data: { teamId: string }) => {
            try {
                const userId = socket.data.user?.id;
                if (!userId || !data?.teamId) return;

                const team = await getTeamById(data.teamId);
                if (!team) return;

                const isOwner = team.owner_user_id === userId;
                let allowed = isOwner;

                if (!allowed) {
                    const driverProfile = await getDriverProfileByUserId(userId);
                    if (driverProfile) {
                        const membership = await getActiveMembership(data.teamId, driverProfile.id);
                        allowed = membership !== null;
                    }
                }

                if (!allowed) {
                    socket.emit('team:error', { error: 'Not a member of this team' });
                    return;
                }

                socket.join(`team:${data.teamId}`);
                socket.emit('team:joined', { teamId: data.teamId });
                console.log(`[TeamRadio] ${socket.id} joined team:${data.teamId}`);
            } catch (err) {
                console.error('[TeamRadio] Error joining team room:', err);
            }
        });

        socket.on('team:leave', (data: { teamId: string }) => {
            if (data?.teamId) socket.leave(`team:${data.teamId}`);
        });

        // 5. Voice Query Handler
        socket.on('voice:query', async (data: { audio: string; format?: string }) => {
            try {
                // Check voice_engineer capability
                const entitlements: any[] = socket.data.user?.entitlements ?? [];
                const caps = deriveCapabilitiesFromEntitlements(entitlements, []);
                if (!socket.data.user?.isSuperAdmin && !caps.voice_engineer) {
                    socket.emit('voice:response', { success: false, error: 'Subscription required. Visit /pricing to upgrade.' });
                    return;
                }

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

                // Broadcast driver query + engineer response to all team rooms this driver belongs to
                const userId = socket.data.user?.id;
                if (userId) {
                    try {
                        const driverProfile = await getDriverProfileByUserId(userId);
                        if (driverProfile) {
                            const memberships = await getMembershipsForDriver(driverProfile.id);
                            const activeTeamIds = memberships
                                .filter(m => m.status === 'active')
                                .map(m => m.team_id);

                            if (activeTeamIds.length > 0) {
                                const radioEvent = {
                                    driverId: driverProfile.id,
                                    driverName: (driverProfile as any).display_name || (driverProfile as any).name || 'Driver',
                                    query: conversation.query,
                                    response: conversation.response,
                                    audioBase64, // engineer TTS audio for pitwall to play
                                    timestamp: Date.now(),
                                };
                                for (const teamId of activeTeamIds) {
                                    io.to(`team:${teamId}`).emit('team:radio', radioEvent);
                                }
                                console.log(`[TeamRadio] Broadcast to ${activeTeamIds.length} team(s) for driver ${driverProfile.id}`);
                            }
                        }
                    } catch (err) {
                        console.warn('[TeamRadio] Could not broadcast to team rooms:', err);
                    }
                }

            } catch (error) {
                console.error('Voice query error:', error);
                socket.emit('voice:response', {
                    success: false,
                    error: error instanceof Error ? error.message : 'Voice query failed'
                });
            }
        });

        socket.on('disconnect', () => {
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
