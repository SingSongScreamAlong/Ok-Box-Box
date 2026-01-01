// =====================================================================
// Ops API Routes
// Admin-only operations monitoring and diagnostics
// =====================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { execSync } from 'child_process';
import { config } from '../../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
    socketEvents,
    relayEvents,
    sessionEvents,
    errorEvents,
    getEventBufferStats
} from '../../observability/ring-buffer.js';
import { getSocketStats, getActiveConnections } from '../../observability/socket-tap.js';
import { getRelayStats, getAllSessionStats, getHottestSessions, getIngestRates } from '../../observability/relay-tap.js';
import { getRuntimeStats } from '../../observability/metrics.js';
import { getRecentErrors } from '../../observability/error-buffer.js';
import { generateSupportBundle } from '../../observability/support-bundle.js';
import { getParitySnapshot } from '../../observability/parity-tracking.js';
import { getActiveSessions } from '../../websocket/index.js';
import { opsLogger } from '../../observability/logger.js';

const opsRouter = Router();

// Server start time for uptime calculation
const serverStartTime = Date.now();

// Trace storage (in-memory)
const activeTraces = new Map<string, {
    traceId: string;
    sessionId: string;
    startedAt: number;
    expiresAt: number;
    samples: unknown[];
}>();

// =====================================================================
// Guard Middleware: OPS_UI_ENABLED + admin:ops capability
// =====================================================================

function requireOpsAccess(req: Request, res: Response, next: NextFunction): void {
    // Check env flag first
    if (!config.opsUiEnabled) {
        res.status(404).json({
            success: false,
            error: 'Ops UI not enabled'
        });
        return;
    }

    // Allow localhost bypass in development
    const clientIp = req.ip || req.socket.remoteAddress;
    if (config.nodeEnv === 'development' &&
        (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1')) {
        return next();
    }

    // Check for admin:ops capability
    const user = (req as any).user;
    if (!user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
    }

    const capabilities = user.capabilities || [];
    const isAdmin = user.role === 'admin' || user.isSuperAdmin === true;
    const hasOpsCap = capabilities.includes('admin:ops');

    if (!isAdmin || !hasOpsCap) {
        res.status(403).json({
            success: false,
            error: 'Requires admin role and admin:ops capability'
        });
        return;
    }

    next();
}

// Apply guards
opsRouter.use(requireAuth);
opsRouter.use(requireOpsAccess);

// =====================================================================
// GET /summary - System overview
// =====================================================================

opsRouter.get('/summary', async (_req: Request, res: Response) => {
    try {
        // Build info
        let gitSha: string | undefined;
        try {
            gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
        } catch {
            gitSha = undefined;
        }

        const socketStats = getSocketStats();
        const relayStats = getRelayStats();
        const runtimeStats = getRuntimeStats();
        const sessions = getActiveSessions();
        const eventBufferStats = getEventBufferStats();
        const ingestRates = getIngestRates();
        const hottestSessions = getHottestSessions(10);

        // Error count last 10 minutes
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const recentErrors = getRecentErrors(500).filter(e => e.timestamp > tenMinutesAgo);

        res.json({
            success: true,
            data: {
                build: {
                    gitSha,
                    version: '0.1.0-alpha',
                    environment: config.nodeEnv
                },
                uptime: {
                    startedAt: serverStartTime,
                    uptimeMs: Date.now() - serverStartTime,
                    uptimeFormatted: formatUptime(Date.now() - serverStartTime)
                },
                sessions: {
                    active: sessions.length,
                    details: sessions.map(s => ({
                        sessionId: redactSessionId(s.sessionId),
                        trackName: s.trackName,
                        driverCount: s.driverCount,
                        ageMs: Date.now() - s.lastUpdate
                    }))
                },
                sockets: socketStats,
                relay: {
                    ...relayStats,
                    ingestRates
                },
                errors: {
                    last10mCount: recentErrors.length,
                    bySubsystem: countByField(recentErrors, 'subsystem')
                },
                eventBuffers: eventBufferStats,
                runtime: runtimeStats,
                hottestSessions: hottestSessions.slice(0, 10),
                timestamp: Date.now()
            }
        });
    } catch (err) {
        opsLogger.error({ err }, 'Failed to get ops summary');
        res.status(500).json({ success: false, error: 'Failed to get summary' });
    }
});

// =====================================================================
// GET /sockets - Active socket connections
// =====================================================================

opsRouter.get('/sockets', (_req: Request, res: Response) => {
    try {
        const connections = getActiveConnections();

        res.json({
            success: true,
            data: {
                count: connections.length,
                sockets: connections.map((c: any) => ({
                    socketId: c.socketId,
                    role: c.role,
                    surface: c.surface,
                    joinedRoomsCount: c.joinedRooms.size,
                    joinedRooms: Array.from(c.joinedRooms),
                    connectedAtMs: c.connectedAt,
                    lastSeenMs: c.lastSeenAt,
                    ageMs: Date.now() - c.connectedAt
                })),
                timestamp: Date.now()
            }
        });
    } catch (err) {
        opsLogger.error({ err }, 'Failed to get sockets');
        res.status(500).json({ success: false, error: 'Failed to get sockets' });
    }
});

// =====================================================================
// GET /sessions - Session stats
// =====================================================================

opsRouter.get('/sessions', (_req: Request, res: Response) => {
    try {
        const sessionStats = getAllSessionStats();

        res.json({
            success: true,
            data: {
                count: sessionStats.length,
                sessions: sessionStats.map(s => ({
                    sessionId: s.sessionId,
                    state: s.state,
                    driverCount: s.driverCount,
                    createdAt: s.createdAt,
                    lastFrameAt: s.lastFrameAt,
                    ageMs: Date.now() - s.createdAt,
                    lastFrameAgeMs: Date.now() - s.lastFrameAt,
                    rates: {
                        baseline: s.frameCountByStream['baseline'] || 0,
                        controls: s.frameCountByStream['controls'] || 0,
                        total: Object.values(s.frameCountByStream).reduce((a, b) => a + b, 0)
                    },
                    drops: s.dropCount,
                    errors: s.errorCount
                })),
                timestamp: Date.now()
            }
        });
    } catch (err) {
        opsLogger.error({ err }, 'Failed to get sessions');
        res.status(500).json({ success: false, error: 'Failed to get sessions' });
    }
});

// =====================================================================
// GET /events - Ring buffer slices
// =====================================================================

opsRouter.get('/events', (req: Request, res: Response) => {
    try {
        const eventType = req.query.type as string || 'all';
        const limit = Math.min(parseInt(req.query.limit as string, 10) || 200, 500);
        const sessionId = req.query.sessionId as string;

        let events: unknown[] = [];

        switch (eventType) {
            case 'socket':
                events = socketEvents.getLast(limit);
                break;
            case 'relay':
                events = relayEvents.getLast(limit);
                break;
            case 'session':
                events = sessionEvents.getLast(limit);
                break;
            case 'error':
                events = errorEvents.getLast(limit);
                break;
            default:
                // Return all (limited per type)
                const perType = Math.floor(limit / 4);
                events = [
                    ...socketEvents.getLast(perType),
                    ...relayEvents.getLast(perType),
                    ...sessionEvents.getLast(perType),
                    ...errorEvents.getLast(perType)
                ].sort((a: any, b: any) => b.timestamp - a.timestamp);
        }

        // Filter by sessionId if provided
        if (sessionId) {
            const redactedId = redactSessionId(sessionId);
            events = events.filter((e: any) =>
                e.sessionId === redactedId || e.sessionId === sessionId
            );
        }

        res.json({
            success: true,
            data: {
                type: eventType,
                count: events.length,
                events,
                timestamp: Date.now()
            }
        });
    } catch (err) {
        opsLogger.error({ err }, 'Failed to get events');
        res.status(500).json({ success: false, error: 'Failed to get events' });
    }
});

// =====================================================================
// POST /trace/start - Start trace mode for a session
// =====================================================================

opsRouter.post('/trace/start', (req: Request, res: Response) => {
    try {
        const { sessionId, durationSec = 30 } = req.body;

        if (!sessionId) {
            res.status(400).json({ success: false, error: 'sessionId required' });
            return;
        }

        const duration = Math.min(Math.max(durationSec, 10), 300); // 10-300 seconds
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = Date.now();

        activeTraces.set(traceId, {
            traceId,
            sessionId,
            startedAt: now,
            expiresAt: now + duration * 1000,
            samples: []
        });

        opsLogger.info({ traceId, sessionId, duration }, 'Trace started');

        res.json({
            success: true,
            data: {
                traceId,
                sessionId: redactSessionId(sessionId),
                durationSec: duration,
                expiresAt: now + duration * 1000
            }
        });
    } catch (err) {
        opsLogger.error({ err }, 'Failed to start trace');
        res.status(500).json({ success: false, error: 'Failed to start trace' });
    }
});

// =====================================================================
// GET /trace/:traceId - Get trace results
// =====================================================================

opsRouter.get('/trace/:traceId', (req: Request, res: Response) => {
    try {
        const { traceId } = req.params;
        const trace = activeTraces.get(traceId);

        if (!trace) {
            res.status(404).json({ success: false, error: 'Trace not found' });
            return;
        }

        const isExpired = Date.now() > trace.expiresAt;

        res.json({
            success: true,
            data: {
                traceId: trace.traceId,
                sessionId: redactSessionId(trace.sessionId),
                startedAt: trace.startedAt,
                expiresAt: trace.expiresAt,
                isExpired,
                durationMs: (isExpired ? trace.expiresAt : Date.now()) - trace.startedAt,
                samples: trace.samples,
                // Include session events during trace period
                events: {
                    relay: relayEvents.filter(e =>
                        e.timestamp >= trace.startedAt && e.timestamp <= trace.expiresAt
                    ),
                    session: sessionEvents.filter(e =>
                        e.timestamp >= trace.startedAt && e.timestamp <= trace.expiresAt
                    )
                }
            }
        });

        // Cleanup expired traces
        if (isExpired) {
            activeTraces.delete(traceId);
        }
    } catch (err) {
        opsLogger.error({ err }, 'Failed to get trace');
        res.status(500).json({ success: false, error: 'Failed to get trace' });
    }
});

// =====================================================================
// POST /support-pack - Generate support pack
// =====================================================================

opsRouter.post('/support-pack', async (req: Request, res: Response) => {
    try {
        const { sessionId, traceId, includeConfig = true } = req.body;

        const packId = `pack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = Date.now();

        // Gather data
        const socketStats = getSocketStats();
        const relayStats = getRelayStats();
        const runtimeStats = getRuntimeStats();
        const sessions = getActiveSessions();
        const eventBufferStats = getEventBufferStats();

        // Get existing support bundle (already redacted)
        const bundle = await generateSupportBundle({
            sessionId,
            timeRangeMs: 3600000, // Last hour
            includeDbSample: false
        });

        // Build support pack
        const pack: Record<string, unknown> = {
            packId,
            generatedAt: now,
            generatedAtIso: new Date(now).toISOString(),

            summary: {
                environment: config.nodeEnv,
                uptime: Date.now() - serverStartTime,
                activeSessions: sessions.length,
                activeConnections: socketStats.activeConnections
            },

            socketStats,
            relayStats,
            runtimeStats,
            eventBufferStats,

            recentEvents: {
                socket: socketEvents.getLast(100),
                relay: relayEvents.getLast(100),
                session: sessionEvents.getLast(100),
                error: errorEvents.getLast(100)
            },

            supportBundle: bundle
        };

        // Add session-specific data
        if (sessionId) {
            const parity = getParitySnapshot(sessionId);
            pack.sessionParity = parity;

            pack.sessionEvents = {
                relay: relayEvents.filter(e => e.sessionId?.includes(sessionId.slice(-4))),
                session: sessionEvents.filter(e => e.sessionId?.includes(sessionId.slice(-4)))
            };
        }

        // Add trace data
        if (traceId) {
            const trace = activeTraces.get(traceId);
            if (trace) {
                pack.trace = {
                    traceId: trace.traceId,
                    sessionId: redactSessionId(trace.sessionId),
                    startedAt: trace.startedAt,
                    samples: trace.samples
                };
            }
        }

        // Add redacted config
        if (includeConfig) {
            pack.config = {
                nodeEnv: config.nodeEnv,
                port: config.port,
                logLevel: config.logLevel,
                metricsEnabled: config.metricsEnabled,
                diagnosticsEnabled: config.diagnosticsEnabled,
                opsUiEnabled: config.opsUiEnabled
                // Sensitive fields NOT included
            };
        }

        opsLogger.info({ packId, sessionId: sessionId ? redactSessionId(sessionId) : null }, 'Support pack generated');

        res.json({
            success: true,
            data: pack
        });
    } catch (err) {
        opsLogger.error({ err }, 'Failed to generate support pack');
        res.status(500).json({ success: false, error: 'Failed to generate support pack' });
    }
});

// =====================================================================
// Helper Functions
// =====================================================================

function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function redactSessionId(sessionId: string): string {
    if (!sessionId || sessionId.length <= 8) return sessionId;
    return sessionId.slice(0, 4) + '...' + sessionId.slice(-4);
}

function countByField(items: any[], field: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
        const value = item[field] || 'unknown';
        counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
}

export default opsRouter;
