// =====================================================================
// Structured Logger with Redaction
// Pino-based logger with aggressive redaction of sensitive data
// =====================================================================

import pino from 'pino';
import { config } from '../config/index.js';

// =====================================================================
// Redaction Paths
// =====================================================================

const REDACTION_PATHS = [
    // Authentication
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'res.headers["set-cookie"]',

    // Tokens
    'token',
    'accessToken',
    'refreshToken',
    'jwt',
    'apiKey',
    'apiSecret',
    'secret',
    'password',

    // Nested auth
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.jwt',
    '*.apiKey',
    '*.apiSecret',
    '*.secret',
    '*.password',

    // Request body sensitive fields
    'body.password',
    'body.token',
    'body.apiKey',

    // PII (partial redaction better handled in custom serializer)
    'email',
    '*.email',
];

// =====================================================================
// Custom Serializers
// =====================================================================

function redactString(value: string, keepLast: number = 6): string {
    if (!value || value.length <= keepLast) {
        return '[REDACTED]';
    }
    return `[REDACTED...${value.slice(-keepLast)}]`;
}

function redactUserId(userId: string): string {
    return redactString(userId, 6);
}

function redactSessionId(sessionId: string): string {
    return redactString(sessionId, 8);
}

const serializers = {
    req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: {
            'user-agent': req.headers?.['user-agent'],
            'content-type': req.headers?.['content-type'],
            'x-request-id': req.headers?.['x-request-id'],
            // Authorization header redacted via paths
        },
        remoteAddress: req.remoteAddress,
    }),
    res: (res: any) => ({
        statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
    user: (user: any) => user ? ({
        id: redactUserId(user.id || user.userId || ''),
        role: user.role,
        capabilities: user.capabilities?.length || 0,
    }) : undefined,
    session: (session: any) => session ? ({
        id: redactSessionId(session.id || session.sessionId || ''),
        state: session.state,
    }) : undefined,
};

// =====================================================================
// Logger Instance
// =====================================================================

const isDevelopment = config.nodeEnv === 'development';

export const logger = pino({
    level: config.logLevel || (isDevelopment ? 'debug' : 'info'),

    // Redaction
    redact: {
        paths: REDACTION_PATHS,
        censor: '[REDACTED]',
        remove: false,
    },

    // Serializers
    serializers,

    // Transport (pretty print in dev)
    transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
        },
    } : undefined,

    // Base properties
    base: {
        service: 'controlbox-server',
        version: '0.1.0-alpha',
    },

    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
});

// =====================================================================
// Child Loggers for Subsystems
// =====================================================================

export const wsLogger = logger.child({ subsystem: 'websocket' });
export const relayLogger = logger.child({ subsystem: 'relay' });
export const apiLogger = logger.child({ subsystem: 'api' });
export const dbLogger = logger.child({ subsystem: 'db' });
export const opsLogger = logger.child({ subsystem: 'ops' });

// =====================================================================
// Utility Functions
// =====================================================================

/**
 * Redact an object's sensitive fields manually
 * Use when pino auto-redaction isn't enough
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['token', 'accessToken', 'refreshToken', 'jwt', 'apiKey',
        'apiSecret', 'secret', 'password', 'authorization', 'cookie'];

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            result[key] = '[REDACTED]';
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = redactObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Create a safe context object for logging
 */
export function safeContext(context: Record<string, unknown>): Record<string, unknown> {
    return {
        ...redactObject(context),
        timestamp: Date.now(),
    };
}

export default logger;
