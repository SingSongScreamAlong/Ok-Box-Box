// =====================================================================
// Broadcast Delay Buffer
// Per-session ring buffer with configurable delay
// =====================================================================

import {
    type BufferedEvent,
    type BroadcastEventType,
    type SessionBufferState,
    MAX_BUFFER_SIZE,
    ALLOWED_DELAYS,
    type AllowedDelay
} from './types.js';

/**
 * Per-session delay buffer
 */
export class BroadcastDelayBuffer {
    private sessionId: string;
    private delayMs: AllowedDelay = 0;
    private buffers: Map<BroadcastEventType, BufferedEvent[]> = new Map();
    private droppedCount = 0;
    private lastFlushMs = 0;
    private eventCounter = 0;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.initBuffers();
    }

    private initBuffers(): void {
        const eventTypes: BroadcastEventType[] = [
            'telemetry:timing',
            'telemetry:frame',
            'incident:new',
            'state:update'
        ];
        for (const type of eventTypes) {
            this.buffers.set(type, []);
        }
    }

    /**
     * Set the delay in milliseconds. Must be an allowed value.
     */
    setDelay(delayMs: number): boolean {
        if (!ALLOWED_DELAYS.includes(delayMs as AllowedDelay)) {
            return false;
        }
        this.delayMs = delayMs as AllowedDelay;
        return true;
    }

    /**
     * Get current delay
     */
    getDelay(): number {
        return this.delayMs;
    }

    /**
     * Enqueue an event for delayed broadcast
     */
    enqueue(eventName: BroadcastEventType, payload: unknown): void {
        if (this.delayMs === 0) {
            // No delay - will be emitted immediately by caller
            return;
        }

        const buffer = this.buffers.get(eventName);
        if (!buffer) return;

        const event: BufferedEvent = {
            eventName,
            payload,
            tsMs: Date.now(),
            id: `${this.sessionId}-${++this.eventCounter}`
        };

        buffer.push(event);

        // Enforce max size - drop oldest
        while (buffer.length > MAX_BUFFER_SIZE) {
            buffer.shift();
            this.droppedCount++;
        }
    }

    /**
     * Flush events that are ready to be emitted (past delay threshold)
     */
    flush(): BufferedEvent[] {
        if (this.delayMs === 0) {
            return [];
        }

        const now = Date.now();
        const threshold = now - this.delayMs;
        const ready: BufferedEvent[] = [];

        for (const [eventType, buffer] of this.buffers) {
            const toFlush: BufferedEvent[] = [];
            const toKeep: BufferedEvent[] = [];

            for (const event of buffer) {
                if (event.tsMs <= threshold) {
                    toFlush.push(event);
                } else {
                    toKeep.push(event);
                }
            }

            ready.push(...toFlush);
            this.buffers.set(eventType, toKeep);
        }

        this.lastFlushMs = now;
        return ready.sort((a, b) => a.tsMs - b.tsMs);
    }

    /**
     * Get current buffer state for diagnostics
     */
    getState(): SessionBufferState {
        const bufferDepthByEvent: Record<BroadcastEventType, number> = {
            'telemetry:timing': 0,
            'telemetry:frame': 0,
            'incident:new': 0,
            'state:update': 0
        };

        for (const [eventType, buffer] of this.buffers) {
            bufferDepthByEvent[eventType] = buffer.length;
        }

        return {
            sessionId: this.sessionId,
            delayMs: this.delayMs,
            bufferDepthByEvent,
            droppedCount: this.droppedCount,
            lastFlushMs: this.lastFlushMs
        };
    }

    /**
     * Check if delay is active
     */
    isDelayed(): boolean {
        return this.delayMs > 0;
    }

    /**
     * Clear all buffers
     */
    clear(): void {
        for (const buffer of this.buffers.values()) {
            buffer.length = 0;
        }
        this.droppedCount = 0;
    }
}
