// =====================================================================
// Health Check Routes
// =====================================================================

import { Router, type Request, type Response } from 'express';
import type { HealthCheckResponse } from '@controlbox/common';
import { pool } from '../../db/client.js';
import { isLLMConfigured, getLLMModelInfo } from '../../services/ai/llm-service.js';
import { getRedisClient } from '../../services/redis-client.js';
import { config } from '../../config/index.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
    const startTime = process.uptime();

    // Check database
    let dbStatus: 'ok' | 'error' = 'error';
    try {
        await pool.query('SELECT 1');
        dbStatus = 'ok';
    } catch {
        dbStatus = 'error';
    }

    // Check Redis (optional dependency — treat unconfigured as 'ok' since it's optional)
    let redisStatus: 'ok' | 'error' = 'ok';
    if (config.redisUrl) {
        try {
            const redis = await getRedisClient();
            if (redis) {
                await redis.ping();
                redisStatus = 'ok';
            } else {
                redisStatus = 'error';
            }
        } catch {
            redisStatus = 'error';
        }
    }

    // Check AI configuration
    const aiStatus: 'ok' | 'error' | 'disabled' = isLLMConfigured() ? 'ok' : 'disabled';

    const isHealthy = dbStatus === 'ok';

    const response: HealthCheckResponse = {
        status: isHealthy ? 'healthy' : 'degraded',
        version: '0.1.0-alpha',
        uptime: startTime,
        checks: {
            database: dbStatus,
            redis: redisStatus,
            ai: aiStatus,
        },
        timestamp: new Date().toISOString(),
    };

    res.status(isHealthy ? 200 : 503).json({
        success: true,
        data: response,
        ai: getLLMModelInfo(),
        build: '2026-03-13-v1',
        opsEnabled: config.opsUiEnabled,
    });
});

healthRouter.get('/ready', async (_req: Request, res: Response) => {
    // Readiness check - is the server ready to accept traffic
    try {
        await pool.query('SELECT 1');
        res.json({ ready: true });
    } catch {
        res.status(503).json({ ready: false });
    }
});

// Telemetry diagnostic endpoint
import { activeSessions } from '../../websocket/SessionHandler.js';
healthRouter.get('/telemetry', (_req: Request, res: Response) => {
    const sessions: any[] = [];
    activeSessions.forEach((session, sessionId) => {
        sessions.push({
            sessionId,
            trackName: session.trackName,
            sessionType: session.sessionType,
            driverCount: session.drivers.size,
            lastUpdate: session.lastUpdate,
            ageMs: Date.now() - session.lastUpdate
        });
    });
    res.json({
        activeSessions: sessions.length,
        sessions
    });
});
