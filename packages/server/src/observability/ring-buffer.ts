// =====================================================================
// Generic Ring Buffer
// Bounded buffer for last-N events with automatic eviction
// =====================================================================

export interface RingBufferEntry {
    id: string;
    timestamp: number;
    [key: string]: unknown;
}

/**
 * Generic bounded ring buffer for storing recent events
 */
export class RingBuffer<T extends RingBufferEntry> {
    private buffer: T[] = [];
    private maxSize: number;
    private evictedCount = 0;
    private entryCounter = 0;

    constructor(maxSize: number = 500) {
        this.maxSize = maxSize;
    }

    /**
     * Push an entry to the buffer
     */
    push(entry: Omit<T, 'id' | 'timestamp'>): T {
        const fullEntry = {
            ...entry,
            id: `rb-${++this.entryCounter}`,
            timestamp: Date.now()
        } as T;

        this.buffer.push(fullEntry);

        // Evict oldest if over capacity
        while (this.buffer.length > this.maxSize) {
            this.buffer.shift();
            this.evictedCount++;
        }

        return fullEntry;
    }

    /**
     * Get all entries (newest first)
     */
    getAll(): T[] {
        return [...this.buffer].reverse();
    }

    /**
     * Get last N entries (newest first)
     */
    getLast(n: number): T[] {
        return this.buffer.slice(-n).reverse();
    }

    /**
     * Filter entries by predicate
     */
    filter(predicate: (entry: T) => boolean): T[] {
        return this.buffer.filter(predicate).reverse();
    }

    /**
     * Get entries since timestamp
     */
    since(timestampMs: number): T[] {
        return this.filter(e => e.timestamp >= timestampMs);
    }

    /**
     * Get buffer stats
     */
    getStats(): { count: number; maxSize: number; evictedCount: number } {
        return {
            count: this.buffer.length,
            maxSize: this.maxSize,
            evictedCount: this.evictedCount
        };
    }

    /**
     * Clear the buffer
     */
    clear(): void {
        this.buffer = [];
        this.evictedCount = 0;
    }
}

// =====================================================================
// Typed Ring Buffers for Ops Events
// =====================================================================

export interface SocketEventEntry extends RingBufferEntry {
    type: 'connect' | 'disconnect' | 'auth_fail' | 'join' | 'leave' | 'error';
    socketId: string;
    role?: string;
    surface?: string;
    room?: string;
    reason?: string;
    details?: string;
}

export interface RelayEventEntry extends RingBufferEntry {
    type: 'connected' | 'disconnected' | 'frame' | 'drop' | 'drift_warn' | 'invalid_payload';
    sessionId: string;
    streamType?: string;
    reason?: string;
    driftMs?: number;
    frameCount?: number;
}

export interface SessionEventEntry extends RingBufferEntry {
    type: 'created' | 'ended' | 'state_change' | 'driver_join' | 'driver_leave';
    sessionId: string;
    state?: string;
    driverCount?: number;
    details?: string;
}

export interface ErrorEventEntry extends RingBufferEntry {
    type: 'exception' | 'handler_error' | 'db_error' | 'validation_error';
    subsystem: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
}

// Global ring buffers (singletons)
export const socketEvents = new RingBuffer<SocketEventEntry>(500);
export const relayEvents = new RingBuffer<RelayEventEntry>(500);
export const sessionEvents = new RingBuffer<SessionEventEntry>(500);
export const errorEvents = new RingBuffer<ErrorEventEntry>(500);

// =====================================================================
// Helper to get all event buffers
// =====================================================================

export function getAllEventBuffers(): {
    socket: SocketEventEntry[];
    relay: RelayEventEntry[];
    session: SessionEventEntry[];
    error: ErrorEventEntry[];
} {
    return {
        socket: socketEvents.getAll(),
        relay: relayEvents.getAll(),
        session: sessionEvents.getAll(),
        error: errorEvents.getAll()
    };
}

export function getEventBufferStats(): Record<string, { count: number; evicted: number }> {
    return {
        socket: { count: socketEvents.getStats().count, evicted: socketEvents.getStats().evictedCount },
        relay: { count: relayEvents.getStats().count, evicted: relayEvents.getStats().evictedCount },
        session: { count: sessionEvents.getStats().count, evicted: sessionEvents.getStats().evictedCount },
        error: { count: errorEvents.getStats().count, evicted: errorEvents.getStats().evictedCount }
    };
}
