// =====================================================================
// Express Application Setup
// =====================================================================

import express, { type Express, type Request, type Response } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { apiRouter } from './api/routes/index.js';
import { errorHandler } from './api/middleware/error-handler.js';
import { tieredRateLimiter } from './api/middleware/rate-limit-tiers.js';
import { optionalAuth } from './api/middleware/auth.js';
import { correlationMiddleware, getMetricsText } from './observability/index.js';

export const app: Express = express();

// Correlation ID middleware (must be first)
app.use(correlationMiddleware);

// CORS configuration - Must be FIRST before any security middleware
// Handle preflight OPTIONS requests explicitly
app.options('*', cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// Security middleware - after CORS to not interfere with preflight
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));

// Tiered Rate Limiting (based on user entitlements)
// Tiers: anonymous (50/15m), blackbox (200/15m), controlbox (500/15m), bundle (1000/15m), admin (2000/15m)
// Must attempt auth first to determine tier
app.use('/api', optionalAuth);
app.use('/api', tieredRateLimiter);

// Request logging
if (config.nodeEnv !== 'test') {
    app.use(morgan(config.logFormat));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics endpoint (gated by env flag)
if (config.metricsEnabled) {
    app.get('/metrics', async (_req: Request, res: Response) => {
        try {
            const metrics = await getMetricsText();
            res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
            res.send(metrics);
        } catch (err) {
            res.status(500).send('Error collecting metrics');
        }
    });
    console.log('📊 Prometheus metrics enabled at /metrics');
}

// iRacing OAuth callback (public route - must match registered redirect URI exactly)
// Route: GET /oauth/iracing/callback
import iracingCallbackRouter from './api/routes/oauth/iracing-callback.js';
app.use('/oauth/iracing', iracingCallbackRouter);

// API routes
app.use('/api', apiRouter);

// Serve legacy BlackBox dashboard at /blackbox
const currentDir = dirname(fileURLToPath(import.meta.url));
const blackboxPath = join(currentDir, '../public/blackbox');
app.use('/blackbox', express.static(blackboxPath));
// SPA fallback for /blackbox routes
app.get('/blackbox/*', (_req: Request, res: Response) => {
    res.sendFile(join(blackboxPath, 'index.html'));
});

// Error handling
app.use(errorHandler);

