import { Socket } from 'socket.io';
import { RelayAdapter } from '../services/RelayAdapter.js';
import { Server } from 'socket.io';
import { destroyEngine } from './inference-engine.js';
import { clearTelemetryCache } from './telemetry-cache.js';
import { getAnalyzer, destroyAnalyzer } from '../services/ai/live-session-analyzer.js';
import { destroySpotterState } from '../services/ai/proactive-spotter.js';
import { endRun } from '../services/telemetry/behavioral-worker.js';

export interface DriverSessionState {
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
}

export interface ActiveSession {
    sessionId: string;
    trackName: string;
    sessionType: string;
    drivers: Map<string, DriverSessionState>;
    lastUpdate: number;
    // Broadcast Delay (RaceBox Plus)
    broadcastDelayMs: number;
}

// Track active sessions for dashboard clients
export const activeSessions: Map<string, ActiveSession> = new Map();

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

export class SessionHandler {
    constructor(private io: Server) { }

    public setup(socket: Socket) {
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
                this.io.emit('session:active', {
                    sessionId: validData.sessionId,
                    trackName: validData.trackName,
                    sessionType: validData.sessionType
                });
                socket.emit('ack', { originalType: 'session_metadata', success: true });
            } else {
                socket.emit('ack', { originalType: 'session_metadata', success: false, error: 'Validation Failed' });
            }
        });

        // Session End - Trigger IDP Pipeline for all drivers
        socket.on('session_end', async (data: { sessionId: string; userId?: string }) => {
            console.log(`🏁 Session ended: ${data.sessionId}`);

            const session = activeSessions.get(data.sessionId);
            if (!session) {
                socket.emit('ack', { originalType: 'session_end', success: false, error: 'Session not found' });
                return;
            }

            // Notify all clients
            this.io.to(`session:${data.sessionId}`).emit('session:ended', {
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
                    runPostSessionPipeline(data.sessionId, driverId).catch((err: any) => {
                        console.error(`[IDP] Pipeline failed for driver ${driverId}:`, err);
                    });
                }
            } catch (err) {
                console.error('[IDP] Failed to load IDP services:', err);
            }

            // Trigger iRacing profile sync if userId is provided
            // This fetches latest race results from iRacing Data API
            if (data.userId) {
                try {
                    const { getIRacingProfileSyncService } = await import('../services/iracing-oauth/index.js');
                    const syncService = getIRacingProfileSyncService();

                    console.log(`[iRacing Sync] Triggering post-session sync for user ${data.userId}`);

                    // Non-blocking sync
                    syncService.syncProfile(data.userId).catch(err => {
                        console.error(`[iRacing Sync] Post-session sync failed for user ${data.userId}:`, err);
                    });
                } catch (err) {
                    console.error('[iRacing Sync] Failed to load sync service:', err);
                }
            }

            // POST-SESSION LEARNING: Extract intelligence before cleanup
            const sessionAnalyzer = getAnalyzer(data.sessionId);
            if (sessionAnalyzer) {
                const summary = sessionAnalyzer.getPostSessionSummary();
                console.log(`[PostSession] Session ${data.sessionId} summary:`, JSON.stringify(summary));

                // Emit session intelligence to connected clients for debrief
                this.io.to(`session:${data.sessionId}`).emit('session:intelligence', {
                    sessionId: data.sessionId,
                    summary,
                });

                // Update driver memory with learned insights
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { updateDriverMemoryFromSession } = await import('../services/ai/post-session-learner.js') as any;
                    for (const [driverId] of session.drivers) {
                        updateDriverMemoryFromSession(driverId, data.sessionId, summary).catch((err: any) => {
                            console.error(`[PostSession] Memory update failed for driver ${driverId} in session ${data.sessionId}:`, err);
                        });
                    }
                    console.log(`[PostSession] Queued memory updates for ${session.drivers.size} driver(s) in session ${data.sessionId}`);
                } catch (err) {
                    // Dynamic import can fail if the module or its dependencies have issues.
                    // This is non-fatal — the session still ends cleanly.
                    console.error(`[PostSession] Failed to load post-session-learner module (path: ../services/ai/post-session-learner.js):`, err instanceof Error ? err.message : err);
                }
            }

            // Clean up session from active map
            activeSessions.delete(data.sessionId);
            destroyEngine(data.sessionId);
            destroyAnalyzer(data.sessionId);
            destroyAnalyzer('live');
            destroySpotterState(data.sessionId);
            destroySpotterState('live');
            clearTelemetryCache(data.sessionId);
            clearTelemetryCache('live');

            // End behavioral worker run (persists final snapshot + cleans up stream)
            endRun(data.sessionId).catch(err => {
                console.error(`[BehavioralWorker] Failed to end run ${data.sessionId}:`, err);
            });
            endRun('live').catch(err => {
                console.error('[BehavioralWorker] Failed to end live run:', err);
            });

            socket.emit('ack', { originalType: 'session_end', success: true });
        });

        // Replay clip saved — store metadata and broadcast to session viewers
        socket.on('clip_saved', (data: any) => {
            if (!data?.clip_id && !data?.clipId) return;
            const clipId = data.clip_id || data.clipId;
            const sessionId = data.session_id || data.sessionId;
            console.log(`📹 Clip saved: ${clipId} [${data.event_type || data.eventType}] for session ${sessionId}`);

            // Broadcast to all clients watching this session
            if (sessionId) {
                this.io.to(`session:${sessionId}`).emit('clip:saved', {
                    clipId,
                    sessionId,
                    eventType: data.event_type || data.eventType,
                    eventLabel: data.event_label || data.eventLabel,
                    severity: data.severity,
                    sessionTimeMs: data.session_time_ms || data.sessionTimeMs,
                    durationMs: data.duration_ms || data.durationMs,
                    frameCount: data.frame_count || data.frameCount,
                    resolution: data.resolution,
                    fileSizeBytes: data.file_size_bytes || data.fileSizeBytes,
                    telemetrySync: data.telemetry_sync || data.telemetrySync,
                });
            }

            socket.emit('ack', { originalType: 'clip_saved', success: true });
        });
    }

    public static startCleanupInterval() {
        // Periodically clean up stale sessions
        setInterval(() => {
            const now = Date.now();
            for (const [sessionId, session] of activeSessions) {
                if (now - session.lastUpdate > 300000) { // 5 minute timeout (handles red flags, long pits)
                    console.log(`   Cleaning up stale session: ${sessionId}`);
                    activeSessions.delete(sessionId);
                    destroyEngine(sessionId);
                    destroyAnalyzer(sessionId);
                    destroySpotterState(sessionId);
                    clearTelemetryCache(sessionId);
                }
            }
        }, 30000);
    }
}
