/**
 * Health Check Endpoints Tests
 */

import request from 'supertest';
import express, { Express } from 'express';
import { createHealthCheckRouter } from '../src/middleware/health-check';

describe('Health Check Endpoints', () => {
    let app: Express;

    beforeAll(() => {
        // Mock database pool for testing
        const mockPool = {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 })
        };

        app = express();
        app.use(createHealthCheckRouter(mockPool as any));
    });

    describe('GET /health', () => {
        it('should return 200 OK with healthy status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('checks');
            expect(response.body.checks).toHaveProperty('server');
            expect(response.body.checks.server.status).toBe('pass');
        });

        it('should include uptime in response', async () => {
            const response = await request(app).get('/health');

            expect(response.body.uptime).toBeGreaterThan(0);
            expect(typeof response.body.uptime).toBe('number');
        });
    });

    describe('GET /health/ready', () => {
        it('should return health status when ready', async () => {
            const response = await request(app)
                .get('/health/ready')
                .expect('Content-Type', /json/);

            // Can be 200 (healthy) or 503 (degraded) depending on DB
            expect([200, 503]).toContain(response.status);
            expect(response.body).toHaveProperty('status');
            expect(['healthy', 'degraded']).toContain(response.body.status);
            expect(response.body).toHaveProperty('checks');
        });
        it('should include memory check', async () => {
            const response = await request(app).get('/health/ready');

            expect(response.body.checks).toHaveProperty('memory');
            expect(response.body.checks.memory).toHaveProperty('status');
            expect(response.body.checks.memory).toHaveProperty('message');
        });
    });

    describe('GET /health/metrics', () => {
        it('should return Prometheus metrics', async () => {
            const response = await request(app)
                .get('/health/metrics')
                .expect(200)
                .expect('Content-Type', /text\/plain/);

            expect(response.text).toContain('pitbox_uptime_seconds');
            expect(response.text).toContain('pitbox_memory_heap_used_bytes');
            expect(response.text).toContain('pitbox_memory_heap_total_bytes');
            expect(response.text).toContain('pitbox_memory_rss_bytes');
        });

        it('should include metric types and help text', async () => {
            const response = await request(app).get('/health/metrics');

            expect(response.text).toContain('# HELP');
            expect(response.text).toContain('# TYPE');
            expect(response.text).toContain('gauge');
        });
    });
});
