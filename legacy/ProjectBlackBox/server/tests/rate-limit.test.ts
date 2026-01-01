/**
 * Rate Limiting Middleware Tests
 */

import request from 'supertest';
import express, { Express } from 'express';
import { apiLimiter, telemetryLimiter, aiLimiter } from '../src/middleware/rate-limit';

describe('Rate Limiting Middleware', () => {
    describe('API Rate Limiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use('/api', apiLimiter);
            app.get('/api/test', (req, res) => res.json({ success: true }));
        });

        it('should allow requests within limit', async () => {
            const response = await request(app)
                .get('/api/test')
                .expect(200);

            expect(response.body).toEqual({ success: true });
        });

        it('should include rate limit headers', async () => {
            const response = await request(app).get('/api/test');

            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });
    });

    describe('Telemetry Rate Limiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use('/api/telemetry', telemetryLimiter);
            app.post('/api/telemetry', (req, res) => res.json({ received: true }));
        });

        it('should allow high-frequency telemetry uploads', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({ data: 'test' })
                .expect(200);

            expect(response.body).toEqual({ received: true });
        });
    });

    describe('AI Coaching Rate Limiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use('/api/ai', aiLimiter);
            app.post('/api/ai/coach', (req, res) => res.json({ coaching: 'advice' }));
        });

        it('should allow AI coaching requests within limit', async () => {
            const response = await request(app)
                .post('/api/ai/coach')
                .send({ telemetry: {} })
                .expect(200);

            expect(response.body).toEqual({ coaching: 'advice' });
        });
    });
});
