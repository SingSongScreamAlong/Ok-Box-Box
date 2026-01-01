// =====================================================================
// Relay Tap
// Relay ingest tracking for ops monitoring
// =====================================================================

import { relayEvents, sessionEvents, type RelayEventEntry, type SessionEventEntry } from './ring-buffer.js';
import { relayLogger } from './logger.js';

// =====================================================================
// Session Stats Tracking
// =====================================================================

interface SessionStats {
    sessionId: string;
    state: string;
    driverCount: number;
    createdAt: number;
    lastFrameAt: number;
    frameCountByStream: Record<string, number>;
    dropCount: number;
    driftSamples: number[];
    errorCount: number;
}

const activeSessions = new Map<string, SessionStats>();

// Global counters
let totalFrames = 0;
let totalDrops = 0;
let totalDriftWarnings = 0;

// Rolling rate tracking (last 60s)
const RATE_WINDOW_MS = 60000;
const frameTimestamps: number[] = [];

// =====================================================================
// Recording Functions
// =====================================================================

export function recordSessionCreated(sessionId: string): void {
    activeSessions.set(sessionId, {
        sessionId,
        state: 'active',
        driverCount: 0,
        createdAt: Date.now(),
        lastFrameAt: Date.now(),
        frameCountByStream: {},
        dropCount: 0,
        driftSamples: [],
        errorCount: 0
    });

    sessionEvents.push({
        type: 'created',
        sessionId: redactSessionId(sessionId)
    } as Omit<SessionEventEntry, 'id' | 'timestamp'>);

    relayLogger.info({ sessionId: redactSessionId(sessionId) }, 'Session created');
}

export function recordSessionEnded(sessionId: string): void {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.state = 'ended';
    }
    activeSessions.delete(sessionId);

    sessionEvents.push({
        type: 'ended',
        sessionId: redactSessionId(sessionId)
    } as Omit<SessionEventEntry, 'id' | 'timestamp'>);

    relayLogger.info({ sessionId: redactSessionId(sessionId) }, 'Session ended');
}

export function recordFrame(sessionId: string, streamType: string): void {
    totalFrames++;
    const now = Date.now();

    // Update rate tracking
    frameTimestamps.push(now);
    while (frameTimestamps.length > 0 && frameTimestamps[0] < now - RATE_WINDOW_MS) {
        frameTimestamps.shift();
    }

    // Update session stats
    let session = activeSessions.get(sessionId);
    if (!session) {
        // Auto-create session if not tracked
        recordSessionCreated(sessionId);
        session = activeSessions.get(sessionId)!;
    }

    session.lastFrameAt = now;
    session.frameCountByStream[streamType] = (session.frameCountByStream[streamType] || 0) + 1;
}

export function recordDrop(sessionId: string, reason: string): void {
    totalDrops++;

    const session = activeSessions.get(sessionId);
    if (session) {
        session.dropCount++;
    }

    relayEvents.push({
        type: 'drop',
        sessionId: redactSessionId(sessionId),
        reason
    } as Omit<RelayEventEntry, 'id' | 'timestamp'>);

    relayLogger.warn({ sessionId: redactSessionId(sessionId), reason }, 'Frame dropped');
}

export function recordDrift(sessionId: string, driftMs: number): void {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.driftSamples.push(driftMs);
        // Keep last 100 samples
        if (session.driftSamples.length > 100) {
            session.driftSamples.shift();
        }
    }

    // Only log warning for significant drift
    if (Math.abs(driftMs) > 5000) {
        totalDriftWarnings++;

        relayEvents.push({
            type: 'drift_warn',
            sessionId: redactSessionId(sessionId),
            driftMs
        } as Omit<RelayEventEntry, 'id' | 'timestamp'>);

        relayLogger.warn({ sessionId: redactSessionId(sessionId), driftMs }, 'Clock drift warning');
    }
}

export function recordInvalidPayload(sessionId: string, reason: string): void {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.errorCount++;
    }

    relayEvents.push({
        type: 'invalid_payload',
        sessionId: redactSessionId(sessionId),
        reason
    } as Omit<RelayEventEntry, 'id' | 'timestamp'>);

    relayLogger.warn({ sessionId: redactSessionId(sessionId), reason }, 'Invalid payload');
}

export function recordDriverUpdate(sessionId: string, driverCount: number): void {
    const session = activeSessions.get(sessionId);
    if (session) {
        session.driverCount = driverCount;
    }

    sessionEvents.push({
        type: 'driver_join',
        sessionId: redactSessionId(sessionId),
        driverCount
    } as Omit<SessionEventEntry, 'id' | 'timestamp'>);
}

// =====================================================================
// Query Functions
// =====================================================================

export function getSessionStats(sessionId: string): SessionStats | null {
    const session = activeSessions.get(sessionId);
    if (!session) return null;

    return {
        ...session,
        sessionId: redactSessionId(session.sessionId)
    };
}

export function getAllSessionStats(): SessionStats[] {
    return Array.from(activeSessions.values()).map(s => ({
        ...s,
        sessionId: redactSessionId(s.sessionId)
    }));
}

export function getHottestSessions(n: number): SessionStats[] {
    const now = Date.now();
    const allSessions = Array.from(activeSessions.values());

    // Calculate frame rate for each session (frames in last 60s)
    const withRates = allSessions.map(s => {
        const totalFrames = Object.values(s.frameCountByStream).reduce((a, b) => a + b, 0);
        const ageSeconds = (now - s.createdAt) / 1000;
        const rate = ageSeconds > 0 ? totalFrames / ageSeconds : 0;
        return { session: s, rate };
    });

    // Sort by rate descending
    withRates.sort((a, b) => b.rate - a.rate);

    return withRates.slice(0, n).map(({ session }) => ({
        ...session,
        sessionId: redactSessionId(session.sessionId)
    }));
}

export function getIngestRates(): { total: number; byStream: Record<string, number> } {
    const now = Date.now();
    const windowMs = 60000;

    // Approximate total rate from timestamps
    const recentFrames = frameTimestamps.filter(t => t > now - windowMs).length;
    const totalRate = recentFrames / (windowMs / 1000);

    // Aggregate by stream across all sessions
    const byStream: Record<string, number> = {};
    for (const session of activeSessions.values()) {
        for (const [stream, count] of Object.entries(session.frameCountByStream)) {
            byStream[stream] = (byStream[stream] || 0) + count;
        }
    }

    return { total: totalRate, byStream };
}

export function getRelayStats(): {
    totalFrames: number;
    totalDrops: number;
    totalDriftWarnings: number;
    activeSessions: number;
    ingestRate: number;
} {
    return {
        totalFrames,
        totalDrops,
        totalDriftWarnings,
        activeSessions: activeSessions.size,
        ingestRate: getIngestRates().total
    };
}

export function getDriftP95(sessionId: string): number | null {
    const session = activeSessions.get(sessionId);
    if (!session || session.driftSamples.length < 10) return null;

    const sorted = [...session.driftSamples].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx];
}

// =====================================================================
// Redaction Helpers
// =====================================================================

function redactSessionId(sessionId: string): string {
    if (!sessionId || sessionId.length <= 8) return sessionId;
    return sessionId.slice(0, 4) + '...' + sessionId.slice(-4);
}
