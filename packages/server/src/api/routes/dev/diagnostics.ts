// =====================================================================
// DEV Diagnostics API Routes
// Protected routes for debugging and support (admin only)
// =====================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { Socket } from 'socket.io';
import { execSync } from 'child_process';
import { config } from '../../../config/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { getActiveSessions, getIO } from '../../../websocket/index.js';
import { getRecentErrors, getErrorCounts, pushError, ErrorEntry } from '../../../observability/error-buffer.js';
import { getMetricsJson, getRuntimeStats } from '../../../observability/metrics.js';
import { generateSupportBundle } from '../../../observability/support-bundle.js';
import { getParitySnapshot, getParitySessionIds } from '../../../observability/parity-tracking.js';

const diagnosticsRouter = Router();

// =====================================================================
// Guard Middleware: ENV flag + admin capability check
// =====================================================================

function requireDiagnosticsAccess(req: Request, res: Response, next: NextFunction): void {
    // Check env flag first
    if (!config.diagnosticsEnabled) {
        res.status(404).json({
            success: false,
            error: 'Diagnostics not enabled'
        });
        return;
    }

    // Check for admin:diagnostics capability
    // For now, we check for super_admin or session_authority capability
    const user = (req as any).user;
    if (!user) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
    }

    // Accept super admins or users with session_authority capability
    const capabilities = user.capabilities || [];
    const isSuperAdmin = user.isSuperAdmin === true;
    const hasDiagnosticsCap = capabilities.includes('admin:diagnostics') ||
        capabilities.includes('session_authority') ||
        isSuperAdmin;

    if (!hasDiagnosticsCap) {
        res.status(403).json({
            success: false,
            error: 'Requires admin:diagnostics capability'
        });
        return;
    }

    next();
}

// Apply auth and diagnostics guard to all routes
diagnosticsRouter.use(requireAuth);
diagnosticsRouter.use(requireDiagnosticsAccess);

// =====================================================================
// GET /health/relay - Relay connection status
// =====================================================================

diagnosticsRouter.get('/health/relay', (_req: Request, res: Response) => {
    try {
        const io = getIO();
        const sockets = io.sockets.sockets;

        const relayConnections: any[] = [];

        sockets.forEach((socket) => {
            // Check if this looks like a relay connection (has sent session metadata)
            const rooms = Array.from(socket.rooms);
            const sessionRooms = rooms.filter(r => r.startsWith('session:'));

            relayConnections.push({
                socketId: socket.id.slice(0, 12) + '...', // Truncate for privacy
                connected: socket.connected,
                rooms: sessionRooms,
                transport: socket.conn?.transport?.name || 'unknown',
                // Don't expose full handshake data for security
                joinedAt: (socket as any).handshake?.issued || null
            });
        });

        res.json({
            success: true,
            data: {
                totalConnections: sockets.size,
                relays: relayConnections,
                timestamp: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to get relay health' });
    }
});

// =====================================================================
// GET /sessions/active - Active session overview
// =====================================================================

diagnosticsRouter.get('/sessions/active', (_req: Request, res: Response) => {
    try {
        const sessions = getActiveSessions();
        const runtimeStats = getRuntimeStats();

        res.json({
            success: true,
            data: {
                count: sessions.length,
                sessions: sessions.map(s => ({
                    sessionId: s.sessionId,
                    trackName: s.trackName,
                    sessionType: s.sessionType,
                    driverCount: s.driverCount,
                    lastUpdate: s.lastUpdate,
                    ageMs: Date.now() - s.lastUpdate
                })),
                runtime: runtimeStats,
                timestamp: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to get active sessions' });
    }
});

// =====================================================================
// GET /session/:id/flow - Event pipeline snapshot
// =====================================================================

diagnosticsRouter.get('/session/:id/flow', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const sessions = getActiveSessions();
        const session = sessions.find(s => s.sessionId === id);

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'Session not found'
            });
            return;
        }

        // Get metrics for this session (would need per-session tracking for full implementation)
        // For now, return session-level info with overall metrics
        res.json({
            success: true,
            data: {
                sessionId: id,
                session: {
                    trackName: session.trackName,
                    sessionType: session.sessionType,
                    driverCount: session.driverCount,
                    lastUpdate: session.lastUpdate
                },
                flow: {
                    // These would ideally be per-session, but for MVP we show overall
                    ingestRates: {
                        baseline: 'N/A (aggregate only)',
                        controls: 'N/A (aggregate only)',
                        lossless: 'N/A (aggregate only)'
                    },
                    emitRates: {
                        timing: 'N/A (aggregate only)',
                        incidents: 'N/A (aggregate only)'
                    },
                    dbHealth: {
                        status: 'ok',
                        lastWriteMs: null
                    }
                },
                errors: getRecentErrors(10).filter(e =>
                    e.metadata && (e.metadata as any).sessionId === id
                ),
                timestamp: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to get session flow' });
    }
});

// =====================================================================
// GET /errors/recent - Recent errors from ring buffer
// =====================================================================

diagnosticsRouter.get('/errors/recent', (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const subsystem = req.query.subsystem as string | undefined;

        let errors = getRecentErrors(Math.min(limit, 500));

        if (subsystem) {
            errors = errors.filter(e => e.subsystem === subsystem);
        }

        res.json({
            success: true,
            data: {
                count: errors.length,
                errors,
                countsBySubsystem: getErrorCounts(),
                timestamp: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to get recent errors' });
    }
});

// =====================================================================
// POST /session/:id/inject - Synthetic event injection (DEV ONLY)
// =====================================================================

diagnosticsRouter.post('/session/:id/inject', (req: Request, res: Response) => {
    try {
        // Extra safety check: only allow in development mode
        if (config.nodeEnv === 'production') {
            res.status(403).json({
                success: false,
                error: 'Event injection disabled in production'
            });
            return;
        }

        const { id: sessionId } = req.params;
        const { eventType, payload } = req.body;

        if (!eventType || !payload) {
            res.status(400).json({
                success: false,
                error: 'eventType and payload required'
            });
            return;
        }

        // Only allow specific event types
        const allowedEvents = ['timing:update', 'incident:new', 'race:event'];
        if (!allowedEvents.includes(eventType)) {
            res.status(400).json({
                success: false,
                error: `eventType must be one of: ${allowedEvents.join(', ')}`
            });
            return;
        }

        const io = getIO();
        io.to(`session:${sessionId}`).emit(eventType, {
            ...payload,
            _synthetic: true,
            _injectedAt: Date.now()
        });

        console.log(`[DIAG] Injected ${eventType} into session ${sessionId}`);

        res.json({
            success: true,
            data: {
                eventType,
                sessionId,
                injectedAt: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to inject event' });
    }
});

// =====================================================================
// POST /support-bundle - Generate diagnostic bundle
// =====================================================================

diagnosticsRouter.post('/support-bundle', async (req: Request, res: Response) => {
    try {
        const { sessionId, timeRangeMs, includeDbSample } = req.body;

        const bundle = await generateSupportBundle({
            sessionId,
            timeRangeMs,
            includeDbSample: includeDbSample === true
        });

        res.json({
            success: true,
            data: bundle
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to generate support bundle' });
    }
});

// =====================================================================
// GET /metrics/snapshot - Metrics as JSON (for dashboard)
// =====================================================================

diagnosticsRouter.get('/metrics/snapshot', async (_req: Request, res: Response) => {
    try {
        const metrics = await getMetricsJson();
        const runtimeStats = getRuntimeStats();

        res.json({
            success: true,
            data: {
                metrics,
                runtime: runtimeStats,
                timestamp: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to get metrics snapshot' });
    }
});

// =====================================================================
// GET /build - Gateway identity and version info
// =====================================================================

diagnosticsRouter.get('/build', (_req: Request, res: Response) => {
    let gitSha: string | undefined;
    try {
        gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch {
        gitSha = undefined;
    }

    res.json({
        success: true,
        data: {
            gitSha,
            buildTime: process.env.BUILD_TIME || null,
            version: '0.1.0-alpha',
            environment: config.nodeEnv,
            timestamp: Date.now()
        }
    });
});

// =====================================================================
// GET /parity - Parity metrics for a session
// =====================================================================

diagnosticsRouter.get('/parity', (req: Request, res: Response) => {
    try {
        const sessionId = req.query.sessionId as string;

        if (!sessionId) {
            // Return list of sessions with parity data
            const sessionIds = getParitySessionIds();
            res.json({
                success: true,
                data: {
                    sessions: sessionIds,
                    count: sessionIds.length,
                    timestamp: Date.now()
                }
            });
            return;
        }

        const parity = getParitySnapshot(sessionId);

        if (!parity) {
            res.status(404).json({
                success: false,
                error: 'No parity data for session'
            });
            return;
        }

        res.json({
            success: true,
            data: {
                sessionId: parity.sessionId,
                streams: parity.streams,
                duplicates: parity.duplicates,
                outOfOrder: parity.outOfOrder,
                lastError: parity.lastError,
                timestamp: Date.now()
            }
        });
    } catch (err) {
        pushError(err as Error, 'api');
        res.status(500).json({ success: false, error: 'Failed to get parity data' });
    }
});

export default diagnosticsRouter;
