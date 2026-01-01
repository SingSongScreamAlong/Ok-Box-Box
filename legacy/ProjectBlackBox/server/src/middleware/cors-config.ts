/**
 * CORS Configuration Middleware
 * 
 * Configures Cross-Origin Resource Sharing for production and development
 */

import cors, { CorsOptions } from 'cors';
import { config, isProduction } from '../config/environment.js';

/**
 * Get CORS configuration based on environment
 */
export function getCorsOptions(): CorsOptions {
    if (isProduction()) {
        // Production: Strict CORS with specific allowed origins
        return {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, curl, etc.)
                if (!origin) {
                    return callback(null, true);
                }

                if (config.CORS_ORIGINS.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`Origin ${origin} not allowed by CORS`));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'X-API-Key'
            ],
            exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
            maxAge: 86400, // 24 hours
            preflightContinue: false,
            optionsSuccessStatus: 204
        };
    } else {
        // Development: Permissive CORS for easier testing
        return {
            origin: true, // Allow all origins in development
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'X-API-Key'
            ]
        };
    }
}

/**
 * Create CORS middleware
 */
export const corsMiddleware = cors(getCorsOptions());

/**
 * Log CORS configuration on startup
 */
export function logCorsConfiguration(): void {
    if (isProduction()) {
        console.log('CORS Configuration (Production):');
        console.log('  Allowed Origins:', config.CORS_ORIGINS);
        console.log('  Credentials: true');
        console.log('  Strict mode enabled');
    } else {
        console.log('CORS Configuration (Development):');
        console.log('  Allowed Origins: * (all)');
        console.log('  Credentials: true');
        console.log('  Permissive mode for testing');
    }
}
