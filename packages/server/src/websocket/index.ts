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
import { getWhisperService, getVoiceService } from '../services/voice/index.js';
import { getTelemetryForVoice } from './telemetry-cache.js';
import { getDriverProfileByUserId } from '../db/repositories/driver-profile.repo.js';
import { buildLiveTelemetryContext, fetchDriverContextForVoice } from '../driverbox/routes/drivers.js';
import { getVoicePresetForRole, isCrewVoiceRole } from '../services/voice/voice-service.js';
import { processPreferenceChange } from '../services/ai/preference-parser.js';

let io: Server;
const voiceConversationHistory = new Map<string, { messages: string[]; updatedAt: number }>();
const MAX_VOICE_HISTORY_MESSAGES = 8;

function getVoiceHistoryKey(socket: Socket, sessionId: string, role: string): string {
    return `${socket.data.user?.id || socket.id}:${sessionId}:${role}`;
}

function normalizeLiveRadioRole(role: unknown): 'engineer' | 'spotter' {
    return role === 'spotter' ? 'spotter' : 'engineer';
}

function getVoiceHistory(key: string): string[] {
    return voiceConversationHistory.get(key)?.messages || [];
}

function setVoiceHistory(key: string, messages: string[]): void {
    voiceConversationHistory.set(key, {
        messages: messages.slice(-MAX_VOICE_HISTORY_MESSAGES),
        updatedAt: Date.now()
    });
}

function clearVoiceHistoryForSocket(socket: Socket): void {
    const prefix = `${socket.data.user?.id || socket.id}:`;
    for (const key of voiceConversationHistory.keys()) {
        if (key.startsWith(prefix)) {
            voiceConversationHistory.delete(key);
        }
    }
}

export function initializeWebSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigins,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        maxHttpBufferSize: 5e6, // 5MB for voice audio payloads
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

        // 4. Voice Query Handler
        socket.on('voice:query', async (data: { audio: string; format?: string; sessionId?: string | null; role?: string | null }) => {
            try {
                console.log(`🎤 voice:query received – format=${data.format}, audio length=${data.audio?.length ?? 0} chars, socketId=${socket.id}, isRelay=${socket.data.isRelay}, user=${socket.data.user?.email || 'none'}`);

                // Check voice_engineer capability
                const entitlements: any[] = socket.data.user?.entitlements ?? [];
                const caps = deriveCapabilitiesFromEntitlements(entitlements, []);
                const allowDevRelayVoice = config.nodeEnv === 'development' && socket.data.isRelay === true;
                if (!socket.data.user?.isSuperAdmin && !caps.voice_engineer && !allowDevRelayVoice) {
                    console.log('🎤 BLOCKED: no voice entitlement. isSuperAdmin=', socket.data.user?.isSuperAdmin, 'caps.voice_engineer=', caps.voice_engineer, 'allowDevRelayVoice=', allowDevRelayVoice);
                    socket.emit('voice:response', { success: false, error: 'Subscription required. Visit /pricing to upgrade.' });
                    return;
                }
                if (allowDevRelayVoice && !caps.voice_engineer) {
                    console.log('🎤 Allowing relay voice query in development without paid entitlement');
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
                const audioFormat = data.format || 'webm';
                console.log(`🎤 Decoded audio: ${audioBuffer.length} bytes, format=${audioFormat}, first4=[${audioBuffer.slice(0, 4).toString('hex')}]`);

                // Get current telemetry for context
                const requestedSessionId = typeof data.sessionId === 'string' && data.sessionId.length > 0
                    ? data.sessionId
                    : 'live';
                const requestedRole = isCrewVoiceRole(data.role)
                    ? normalizeLiveRadioRole(data.role)
                    : 'engineer';
                const telemetry = getTelemetryForVoice(requestedSessionId) || getTelemetryForVoice('live');
                const historyKey = getVoiceHistoryKey(socket, requestedSessionId, requestedRole);
                const recentMessages = getVoiceHistory(historyKey);

                let driverContext = '';
                const userId = typeof socket.data.user?.id === 'string' ? socket.data.user.id : null;
                if (userId && userId !== 'relay' && userId !== 'anonymous') {
                    try {
                        const driverProfile = await getDriverProfileByUserId(userId);
                        if (driverProfile) {
                            driverContext = await fetchDriverContextForVoice(driverProfile.id);
                        }
                    } catch (err) {
                        console.warn('Could not load relay voice driver profile context:', err);
                    }
                }

                const liveContext = buildLiveTelemetryContext(requestedSessionId);
                const combinedContext = [driverContext, liveContext].filter(Boolean).join('\n');

                // Process voice query (STT + AI response)
                const conversation = await whisperService.processDriverQuery(
                    audioBuffer,
                    {
                        sessionId: requestedSessionId,
                        driverId: userId || socket.id,
                        role: requestedRole,
                        recentMessages,
                        telemetry,
                        driverContext: combinedContext
                    },
                    audioFormat
                );

                if (!conversation) {
                    console.error('🎤 processDriverQuery returned null – transcription or AI failed');
                    socket.emit('voice:response', {
                        success: false,
                        error: 'Failed to process voice query'
                    });
                    return;
                }
                setVoiceHistory(historyKey, [...recentMessages, conversation.query, conversation.response]);
                if (userId && userId !== 'relay' && userId !== 'anonymous') {
                    processPreferenceChange(userId, conversation.query).catch(() => { /* ignore preference parse errors */ });
                }
                console.log(`🎤 Voice query success: "${conversation.query}" → "${conversation.response}"`);

                // Generate TTS audio if available
                let audioBase64: string | undefined;
                if (voiceService.isServiceAvailable()) {
                    const voicePreset = getVoicePresetForRole(requestedRole);
                    const ttsResult = await voiceService.textToSpeech({
                        text: conversation.response,
                        ...voicePreset
                    });

                    if (ttsResult.success && ttsResult.audioBuffer) {
                        audioBase64 = ttsResult.audioBuffer.toString('base64');
                    }
                }

                socket.emit('voice:response', {
                    success: true,
                    role: requestedRole,
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
            clearVoiceHistoryForSocket(socket);
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
