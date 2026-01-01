/**
 * Health Check Endpoints
 * 
 * Provides health check endpoints for monitoring and load balancers
 */

import { Request, Response, Router } from 'express';
import { Pool } from 'pg';

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    checks: {
        [key: string]: {
            status: 'pass' | 'fail';
            message?: string;
            responseTime?: number;
        };
    };
}

export class HealthCheckService {
    private startTime: number;
    private dbPool?: Pool;

    constructor(dbPool?: Pool) {
        this.startTime = Date.now();
        this.dbPool = dbPool;
    }

    /**
     * Basic liveness check - is the server running?
     */
    async liveness(): Promise<HealthCheckResult> {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            checks: {
                server: {
                    status: 'pass',
                    message: 'Server is running'
                }
            }
        };
    }

    /**
     * Readiness check - is the server ready to accept traffic?
     * Checks database connectivity and other dependencies
     */
    async readiness(): Promise<HealthCheckResult> {
        const checks: HealthCheckResult['checks'] = {};
        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

        // Check database connection
        if (this.dbPool) {
            const dbStart = Date.now();
            try {
                await this.dbPool.query('SELECT 1');
                checks.database = {
                    status: 'pass',
                    message: 'Database connection successful',
                    responseTime: Date.now() - dbStart
                };
            } catch (error) {
                checks.database = {
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Database connection failed',
                    responseTime: Date.now() - dbStart
                };
                overallStatus = 'unhealthy';
            }
        }

        // Check memory usage
        const memUsage = process.memoryUsage();
        const memUsedMB = memUsage.heapUsed / 1024 / 1024;
        const memTotalMB = memUsage.heapTotal / 1024 / 1024;
        const memPercent = (memUsedMB / memTotalMB) * 100;

        checks.memory = {
            status: memPercent < 90 ? 'pass' : 'fail',
            message: `${memUsedMB.toFixed(2)}MB / ${memTotalMB.toFixed(2)}MB (${memPercent.toFixed(1)}%)`
        };

        if (memPercent >= 90) {
            overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
        }

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            checks
        };
    }

    /**
     * Metrics endpoint - Prometheus-compatible metrics
     */
    async metrics(): Promise<string> {
        const uptime = (Date.now() - this.startTime) / 1000;
        const memUsage = process.memoryUsage();

        const metrics = [
            `# HELP pitbox_uptime_seconds Server uptime in seconds`,
            `# TYPE pitbox_uptime_seconds gauge`,
            `pitbox_uptime_seconds ${uptime}`,
            ``,
            `# HELP pitbox_memory_heap_used_bytes Heap memory used in bytes`,
            `# TYPE pitbox_memory_heap_used_bytes gauge`,
            `pitbox_memory_heap_used_bytes ${memUsage.heapUsed}`,
            ``,
            `# HELP pitbox_memory_heap_total_bytes Total heap memory in bytes`,
            `# TYPE pitbox_memory_heap_total_bytes gauge`,
            `pitbox_memory_heap_total_bytes ${memUsage.heapTotal}`,
            ``,
            `# HELP pitbox_memory_rss_bytes Resident set size in bytes`,
            `# TYPE pitbox_memory_rss_bytes gauge`,
            `pitbox_memory_rss_bytes ${memUsage.rss}`,
            ``
        ];

        return metrics.join('\n');
    }
}

/**
 * Create health check router
 */
export function createHealthCheckRouter(dbPool?: Pool): Router {
    const router = Router();
    const healthCheck = new HealthCheckService(dbPool);

    // Liveness probe - is the server running?
    router.get('/health', async (req: Request, res: Response) => {
        const result = await healthCheck.liveness();
        res.status(200).json(result);
    });

    // Readiness probe - is the server ready to accept traffic?
    router.get('/health/ready', async (req: Request, res: Response) => {
        const result = await healthCheck.readiness();
        const statusCode = result.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(result);
    });

    // Metrics endpoint - Prometheus format
    router.get('/health/metrics', async (req: Request, res: Response) => {
        const metrics = await healthCheck.metrics();
        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.status(200).send(metrics);
    });

    return router;
}
