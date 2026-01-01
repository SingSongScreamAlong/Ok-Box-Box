// =====================================================================
// Broadcast Delay Service
// Orchestrates delay buffers and director control
// =====================================================================

import { Server, Socket } from 'socket.io';
import { BroadcastDelayBuffer } from './buffer.js';
import { redactForBroadcast, toThinBroadcastFrame, redactIncident } from './redactor.js';
import {
    type BroadcastEventType,
    type SessionBufferState,
    type DelayControlMessage,
    ALLOWED_DELAYS
} from './types.js';

// Metrics counters
let bufferEnqueuedTotal = 0;
let bufferDroppedTotal = 0;
let bufferFlushTotal = 0;

/**
 * Broadcast Delay Service
 * Manages per-session delay buffers and director control
 */
export class BroadcastDelayService {
    private io: Server;
    private buffers: Map<string, BroadcastDelayBuffer> = new Map();
    private flushInterval: ReturnType<typeof setInterval> | null = null;

    constructor(io: Server) {
        this.io = io;
        this.startFlushLoop();
    }

    /**
     * Start the flush loop (runs every 100ms)
     */
    private startFlushLoop(): void {
        this.flushInterval = setInterval(() => {
            this.flushAll();
        }, 100);
    }

    /**
     * Stop the flush loop
     */
    stop(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    /**
     * Get or create buffer for a session
     */
    private getBuffer(sessionId: string): BroadcastDelayBuffer {
        let buffer = this.buffers.get(sessionId);
        if (!buffer) {
            buffer = new BroadcastDelayBuffer(sessionId);
            this.buffers.set(sessionId, buffer);
        }
        return buffer;
    }

    /**
     * Set delay for a session (director control)
     */
    setDelay(sessionId: string, delayMs: number): boolean {
        const buffer = this.getBuffer(sessionId);
        const success = buffer.setDelay(delayMs);

        if (success) {
            // Notify all broadcast clients of the delay change
            this.io.to(`broadcast:session:${sessionId}`).emit('broadcast:delay:state', buffer.getState());
            console.log(`[BROADCAST] Session ${sessionId} delay set to ${delayMs}ms`);
        }

        return success;
    }

    /**
     * Get delay state for a session
     */
    getDelayState(sessionId: string): SessionBufferState {
        return this.getBuffer(sessionId).getState();
    }

    /**
     * Emit an event to broadcast room (with delay if configured)
     */
    emitToBroadcast(
        sessionId: string,
        eventName: BroadcastEventType,
        payload: unknown
    ): void {
        const buffer = this.getBuffer(sessionId);

        // Redact data before buffering/emitting
        let redactedPayload: unknown;

        switch (eventName) {
            case 'telemetry:frame':
                redactedPayload = toThinBroadcastFrame(payload as Record<string, unknown>);
                break;
            case 'incident:new':
                redactedPayload = redactIncident(payload as Record<string, unknown>);
                break;
            default:
                redactedPayload = redactForBroadcast(payload);
        }

        if (buffer.isDelayed()) {
            // Enqueue for delayed emission
            buffer.enqueue(eventName, redactedPayload);
            bufferEnqueuedTotal++;
        } else {
            // Immediate emission (no delay)
            this.io.to(`broadcast:session:${sessionId}`).emit(eventName, redactedPayload);
        }
    }

    /**
     * Flush all buffers and emit ready events
     */
    private flushAll(): void {
        for (const [sessionId, buffer] of this.buffers) {
            const events = buffer.flush();

            for (const event of events) {
                this.io.to(`broadcast:session:${sessionId}`).emit(event.eventName, event.payload);
                bufferFlushTotal++;
            }

            // Update dropped counter
            const state = buffer.getState();
            if (state.droppedCount > 0) {
                bufferDroppedTotal += state.droppedCount;
            }
        }
    }

    /**
     * Register director control handlers on a socket
     */
    registerDirectorHandlers(socket: Socket, hasCap: (cap: string) => boolean): void {
        // Set delay
        socket.on('broadcast:delay:set', async (data: DelayControlMessage) => {
            if (!hasCap('racebox:director:control')) {
                socket.emit('error', { message: 'Missing racebox:director:control capability' });
                return;
            }

            if (!data.sessionId || typeof data.delayMs !== 'number') {
                socket.emit('error', { message: 'Invalid delay control message' });
                return;
            }

            if (!ALLOWED_DELAYS.includes(data.delayMs as typeof ALLOWED_DELAYS[number])) {
                socket.emit('error', { message: `Delay must be one of: ${ALLOWED_DELAYS.join(', ')}ms` });
                return;
            }

            const success = this.setDelay(data.sessionId, data.delayMs);
            socket.emit('broadcast:delay:state', this.getDelayState(data.sessionId));
        });

        // Get delay state
        socket.on('broadcast:delay:get', (data: { sessionId: string }) => {
            if (!data.sessionId) return;
            socket.emit('broadcast:delay:state', this.getDelayState(data.sessionId));
        });
    }

    /**
     * Handle client joining broadcast room
     */
    joinBroadcastRoom(socket: Socket, sessionId: string): void {
        const roomName = `broadcast:session:${sessionId}`;
        socket.join(roomName);

        // Send current delay state
        socket.emit('broadcast:delay:state', this.getDelayState(sessionId));

        console.log(`[BROADCAST] Client ${socket.id} joined ${roomName}`);
    }

    /**
     * Cleanup session buffer
     */
    cleanupSession(sessionId: string): void {
        const buffer = this.buffers.get(sessionId);
        if (buffer) {
            buffer.clear();
            this.buffers.delete(sessionId);
        }
    }

    /**
     * Get metrics for diagnostics
     */
    getMetrics(): {
        bufferEnqueuedTotal: number;
        bufferDroppedTotal: number;
        bufferFlushTotal: number;
        activeSessions: number;
        sessionDelays: Record<string, number>;
    } {
        const sessionDelays: Record<string, number> = {};
        for (const [sessionId, buffer] of this.buffers) {
            sessionDelays[sessionId] = buffer.getDelay();
        }

        return {
            bufferEnqueuedTotal,
            bufferDroppedTotal,
            bufferFlushTotal,
            activeSessions: this.buffers.size,
            sessionDelays
        };
    }
}

// Singleton instance (created when websocket initializes)
let broadcastDelayService: BroadcastDelayService | null = null;

export function initBroadcastDelayService(io: Server): BroadcastDelayService {
    if (!broadcastDelayService) {
        broadcastDelayService = new BroadcastDelayService(io);
    }
    return broadcastDelayService;
}

export function getBroadcastDelayService(): BroadcastDelayService | null {
    return broadcastDelayService;
}
