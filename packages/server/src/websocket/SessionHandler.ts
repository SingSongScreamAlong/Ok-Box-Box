import { Socket } from 'socket.io';
import { RelayAdapter } from '../services/RelayAdapter.js';
import { Server } from 'socket.io';

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

            // Clean up session from active map
            activeSessions.delete(data.sessionId);

            socket.emit('ack', { originalType: 'session_end', success: true });
        });
    }

    public static startCleanupInterval() {
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
    }
}
