/**
 * Behavioral Gateway
 * WebSocket endpoint for live behavioral metrics
 * Subscribes to Redis pub/sub and forwards LiveMetrics to connected clients
 */

import { Server, Socket } from 'socket.io';
import { subscribeLiveMetrics, LiveMetrics } from '../services/telemetry/telemetry-streams.js';
import { startBehavioralWorker, stopBehavioralWorker, setRunSessionInfo } from '../services/telemetry/behavioral-worker.js';

// Track active subscriptions per socket
const socketSubscriptions = new Map<string, () => Promise<void>>();

// Track active runs being processed
const activeRuns = new Set<string>();

export class BehavioralGateway {
    constructor(private io: Server) {}

    public setup(socket: Socket): void {
        // Client subscribes to live behavioral metrics for a run
        socket.on('behavioral:subscribe', async (data: { runId: string; sessionId?: string; driverProfileId?: string }) => {
            const { runId, sessionId, driverProfileId } = data;
            
            if (!runId) {
                socket.emit('behavioral:error', { error: 'runId required' });
                return;
            }

            // Clean up any existing subscription for this socket
            const existingUnsub = socketSubscriptions.get(socket.id);
            if (existingUnsub) {
                await existingUnsub();
            }

            // Set session info for persistence
            if (sessionId && driverProfileId) {
                setRunSessionInfo(runId, sessionId, driverProfileId);
            }

            // Start worker for this run if not already running
            if (!activeRuns.has(runId)) {
                activeRuns.add(runId);
                // Start worker in background (non-blocking)
                startBehavioralWorker([runId]).catch(err => {
                    console.error('[BehavioralGateway] Worker start error:', err);
                });
            }

            // Subscribe to live metrics
            const unsubscribe = await subscribeLiveMetrics(runId, (metrics: LiveMetrics) => {
                socket.emit('behavioral:update', metrics);
            });

            socketSubscriptions.set(socket.id, unsubscribe);

            // Join room for this run
            socket.join(`behavioral:${runId}`);
            
            socket.emit('behavioral:subscribed', { runId });
            console.log(`[BehavioralGateway] Socket ${socket.id} subscribed to ${runId}`);
        });

        // Client unsubscribes
        socket.on('behavioral:unsubscribe', async (data: { runId: string }) => {
            const { runId } = data;
            
            const unsub = socketSubscriptions.get(socket.id);
            if (unsub) {
                await unsub();
                socketSubscriptions.delete(socket.id);
            }

            socket.leave(`behavioral:${runId}`);
            socket.emit('behavioral:unsubscribed', { runId });
        });

        // Clean up on disconnect
        socket.on('disconnect', async () => {
            const unsub = socketSubscriptions.get(socket.id);
            if (unsub) {
                await unsub();
                socketSubscriptions.delete(socket.id);
            }
        });
    }

    /**
     * Broadcast live metrics to all subscribers of a run
     * (Alternative to pub/sub for same-process scenarios)
     */
    public broadcastMetrics(metrics: LiveMetrics): void {
        this.io.to(`behavioral:${metrics.runId}`).emit('behavioral:update', metrics);
    }

    /**
     * Stop all workers (for graceful shutdown)
     */
    public shutdown(): void {
        stopBehavioralWorker();
        activeRuns.clear();
        socketSubscriptions.clear();
    }
}
