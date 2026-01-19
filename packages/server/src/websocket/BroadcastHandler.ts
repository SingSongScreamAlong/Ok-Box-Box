import { Server, Socket } from 'socket.io';
import { activeSessions } from './SessionHandler.js';
import { getVoiceService, VOICE_PRESETS } from '../services/voice/voice-service.js';
import { RelayAdapter } from '../services/RelayAdapter.js';
import type {
    TimingUpdateMessage,
    IncidentNewMessage,
    PenaltyProposedMessage,
    SessionStateMessage
} from '@controlbox/common';

let ioInstance: Server | null = null;

export function setIO(io: Server) {
    ioInstance = io;
}

// Broadcast functions
export function broadcastTimingUpdate(message: TimingUpdateMessage): void {
    if (!ioInstance) return;
    ioInstance.volatile.to(`session:${message.sessionId}`).emit('timing:update', message);
}

export function broadcastNewIncident(message: IncidentNewMessage): void {
    if (!ioInstance) return;
    ioInstance.to(`session:${message.sessionId}`).emit('incident:new', message);
}

export function broadcastIncidentUpdated(message: IncidentNewMessage): void {
    if (!ioInstance) return;
    ioInstance.to(`session:${message.sessionId}`).emit('incident:updated', message);
}

export function broadcastPenaltyProposed(message: PenaltyProposedMessage): void {
    if (!ioInstance) return;
    ioInstance.to(`session:${message.sessionId}`).emit('penalty:proposed', message);
}

export function broadcastPenaltyApproved(message: PenaltyProposedMessage): void {
    if (!ioInstance) return;
    ioInstance.to(`session:${message.sessionId}`).emit('penalty:approved', message);
}

export function broadcastSessionState(message: SessionStateMessage): void {
    if (!ioInstance) return;
    ioInstance.to(`session:${message.sessionId}`).emit('session:state', message);
}


export class BroadcastHandler {
    constructor(private io: Server) { }

    public setup(socket: Socket) {
        const relayAdapter = new RelayAdapter(activeSessions, socket);

        // =====================================================================
        // DIRECTOR CONTROLS (RaceBox Plus)
        // =====================================================================

        socket.on('broadcast:delay', (data: { sessionId: string; delayMs: number }) => {
            const session = activeSessions.get(data.sessionId);
            if (session) {
                session.broadcastDelayMs = Math.max(0, Math.min(data.delayMs, 60000)); // Clamp 0-60s
                console.log(`⏱️ Set Broadcast Delay for ${data.sessionId}: ${session.broadcastDelayMs}ms`);
                // Broadcast new delay to all consumers in room (so they know they are watching delayed stream)
                this.io.to(`session:${data.sessionId}`).emit('broadcast:delay', { delayMs: session.broadcastDelayMs });
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
                this.io.to(`session:${validData.sessionId}`).emit('race:event', validData);

                // TEAM DASHBOARD: Emit race:state for pit wall view
                this.io.to(`session:${validData.sessionId}`).emit('race:state', {
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
                this.io.to(`session:${validData.sessionId}`).emit('event:log', {
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
                this.io.to(`session:${data.sessionId}`).emit('steward:decision', {
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
    }
}
