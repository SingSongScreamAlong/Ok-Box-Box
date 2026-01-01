// =====================================================================
// Express Application Setup
// =====================================================================

import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { apiRouter } from './api/routes/index.js';
import { errorHandler } from './api/middleware/error-handler.js';
import { rateLimit } from 'express-rate-limit';
import { correlationMiddleware, getMetricsText } from './observability/index.js';

export const app: Express = express();

// Correlation ID middleware (must be first)
app.use(correlationMiddleware);

// Security middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
}));

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

// API routes
app.use('/api', apiRouter);

// Error handling
app.use(errorHandler);

