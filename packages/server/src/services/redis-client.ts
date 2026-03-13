/**
 * Shared Redis Client
 * Single connection pool for all Redis operations (streams, pub/sub, cache)
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';

let redisClient: RedisClientType | null = null;
let pubSubClient: RedisClientType | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClientType | null> | null = null;

// Circuit breaker: after a failed connection, wait before retrying
const RETRY_COOLDOWN_MS = 60_000;
let lastFailureTime = 0;
let failureLogged = false;
let pubSubLastFailureTime = 0;
let pubSubFailureLogged = false;

function formatRedisError(err: unknown): string {
    if (err instanceof Error) {
        const details = [err.name, err.message].filter(Boolean).join(': ');
        const code = typeof (err as Error & { code?: unknown }).code === 'string'
            ? ` code=${String((err as Error & { code?: unknown }).code)}`
            : '';
        const cause = (err as Error & { cause?: unknown }).cause;
        const causeText = cause instanceof Error
            ? ` cause=${cause.name}: ${cause.message}`
            : cause != null
                ? ` cause=${String(cause)}`
                : '';
        return `${details || 'Unknown Redis error'}${code}${causeText}`;
    }

    if (typeof err === 'string') {
        return err;
    }

    if (err == null) {
        return 'Unknown Redis error';
    }

    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

/**
 * Get or create the main Redis client (for streams, commands)
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
    if (redisClient?.isOpen) {
        return redisClient;
    }

    // Circuit breaker: skip if we failed recently
    if (lastFailureTime && (Date.now() - lastFailureTime < RETRY_COOLDOWN_MS)) {
        return null;
    }

    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    isConnecting = true;
    connectionPromise = connectRedis();
    const client = await connectionPromise;
    isConnecting = false;
    return client;
}

/**
 * Get or create a dedicated pub/sub client
 * (Redis requires separate connection for pub/sub subscribers)
 */
export async function getPubSubClient(): Promise<RedisClientType | null> {
    if (pubSubClient?.isOpen) {
        return pubSubClient;
    }

    if (!config.redisUrl) {
        if (!pubSubFailureLogged) {
            console.warn('[Redis] REDIS_URL not set, pub/sub unavailable');
            pubSubFailureLogged = true;
        }
        return null;
    }

    // Circuit breaker
    if (pubSubLastFailureTime && (Date.now() - pubSubLastFailureTime < RETRY_COOLDOWN_MS)) {
        return null;
    }

    try {
        pubSubClient = createClient({
            url: config.redisUrl,
            socket: {
                reconnectStrategy: false
            }
        });

        pubSubClient.on('error', (err) => {
            if (!pubSubFailureLogged) {
                console.error('[Redis PubSub] Error:', formatRedisError(err));
                pubSubFailureLogged = true;
            }
            pubSubLastFailureTime = Date.now();
            try { pubSubClient?.disconnect(); } catch (_) {}
            pubSubClient = null;
        });

        await pubSubClient.connect();
        pubSubFailureLogged = false;
        pubSubLastFailureTime = 0;
        console.log('[Redis PubSub] Connected');
        return pubSubClient;
    } catch (err) {
        if (!pubSubFailureLogged) {
            console.warn('[Redis PubSub] Connection failed:', formatRedisError(err));
            pubSubFailureLogged = true;
        }
        pubSubLastFailureTime = Date.now();
        pubSubClient = null;
        return null;
    }
}

async function connectRedis(): Promise<RedisClientType | null> {
    if (!config.redisUrl) {
        if (!failureLogged) {
            console.warn('[Redis] REDIS_URL not set, Redis unavailable');
            failureLogged = true;
        }
        return null;
    }

    try {
        redisClient = createClient({
            url: config.redisUrl,
            socket: {
                reconnectStrategy: false
            }
        });

        redisClient.on('error', (err) => {
            if (!failureLogged) {
                console.error('[Redis] Error:', formatRedisError(err));
                failureLogged = true;
            }
            lastFailureTime = Date.now();
            try { redisClient?.disconnect(); } catch (_) {}
            redisClient = null;
        });

        redisClient.on('end', () => {
            redisClient = null;
        });

        await redisClient.connect();
        failureLogged = false;
        lastFailureTime = 0;
        console.log('[Redis] Connected to', config.redisUrl);
        return redisClient;
    } catch (err) {
        if (!failureLogged) {
            console.warn('[Redis] Connection failed:', formatRedisError(err));
            failureLogged = true;
        }
        lastFailureTime = Date.now();
        redisClient = null;
        return null;
    }
}

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
    if (redisClient?.isOpen) {
        await redisClient.quit();
        redisClient = null;
    }
    if (pubSubClient?.isOpen) {
        await pubSubClient.quit();
        pubSubClient = null;
    }
    console.log('[Redis] Connections closed');
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
    return redisClient?.isOpen ?? false;
}
