// =====================================================================
// Support Bundle Generator
// Creates sanitized diagnostic bundles for support
// =====================================================================

import { getMetricsJson, getRuntimeStats } from './metrics.js';
import { getRecentErrors, getErrorCounts } from './error-buffer.js';
import { getActiveSessions } from '../websocket/index.js';
import { pool } from '../db/client.js';
import { config } from '../config/index.js';
import { execSync } from 'child_process';

export interface SupportBundleOptions {
    sessionId?: string;
    timeRangeMs?: number;
    includeDbSample?: boolean;
}

export interface SupportBundle {
    generatedAt: string;
    version: {
        package: string;
        gitCommit?: string;
        nodeVersion: string;
    };
    config: Record<string, unknown>;
    runtime: {
        uptimeMs: number;
        activeRelays: number;
        activeDashboards: number;
    };
    sessions: {
        active: number;
        list: Array<{
            sessionId: string;
            trackName: string;
            driverCount: number;
            lastUpdate: number;
        }>;
    };
    metrics: object[];
    errors: {
        recent: Array<{
            id: string;
            timestamp: number;
            subsystem: string;
            message: string;
        }>;
        countsBySubsystem: Record<string, number>;
    };
    database?: {
        connected: boolean;
        tableCounts?: Record<string, number>;
    };
    sessionFlow?: {
        sessionId: string;
        flowData: unknown;
    };
}

/**
 * Get git commit hash if available
 */
function getGitCommit(): string | undefined {
    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch {
        return undefined;
    }
}

/**
 * Get sanitized config (no secrets)
 */
function getSanitizedConfig(): Record<string, unknown> {
    const safeConfig: Record<string, unknown> = {
        nodeEnv: config.nodeEnv,
        port: config.port,
        corsOrigins: config.corsOrigins,
        logFormat: config.logFormat,
        metricsEnabled: (config as any).metricsEnabled ?? false,
        diagnosticsEnabled: (config as any).diagnosticsEnabled ?? false
    };

    return safeConfig;
}

/**
 * Get database table counts
 */
async function getTableCounts(): Promise<Record<string, number>> {
    const tables = ['sessions', 'incidents', 'penalties', 'session_drivers', 'steward_notes'];
    const counts: Record<string, number> = {};

    for (const table of tables) {
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            counts[table] = parseInt(result.rows[0].count, 10);
        } catch {
            counts[table] = -1; // Table might not exist
        }
    }

    return counts;
}

/**
 * Generate a support bundle
 */
export async function generateSupportBundle(options: SupportBundleOptions = {}): Promise<SupportBundle> {
    const { sessionId, includeDbSample = false } = options;

    // Get active sessions
    const activeSessions = getActiveSessions();

    // Get runtime stats
    const runtimeStats = getRuntimeStats();

    // Get metrics
    const metrics = await getMetricsJson();

    // Get recent errors (sanitized)
    const recentErrors = getRecentErrors(200).map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        subsystem: e.subsystem,
        message: e.message
        // Exclude stack traces from bundle
    }));

    // Build bundle
    const bundle: SupportBundle = {
        generatedAt: new Date().toISOString(),
        version: {
            package: '0.1.0-alpha',
            gitCommit: getGitCommit(),
            nodeVersion: process.version
        },
        config: getSanitizedConfig(),
        runtime: {
            uptimeMs: runtimeStats.uptimeMs,
            activeRelays: runtimeStats.activeRelays,
            activeDashboards: runtimeStats.activeDashboards
        },
        sessions: {
            active: activeSessions.length,
            list: activeSessions.map(s => ({
                sessionId: s.sessionId,
                trackName: s.trackName,
                driverCount: s.driverCount,
                lastUpdate: s.lastUpdate
            }))
        },
        metrics,
        errors: {
            recent: recentErrors,
            countsBySubsystem: getErrorCounts()
        }
    };

    // Add database info if requested
    if (includeDbSample) {
        try {
            await pool.query('SELECT 1');
            bundle.database = {
                connected: true,
                tableCounts: await getTableCounts()
            };
        } catch {
            bundle.database = { connected: false };
        }
    }

    // Add session flow if sessionId provided
    if (sessionId) {
        const session = activeSessions.find(s => s.sessionId === sessionId);
        if (session) {
            bundle.sessionFlow = {
                sessionId,
                flowData: session
            };
        }
    }

    return bundle;
}
