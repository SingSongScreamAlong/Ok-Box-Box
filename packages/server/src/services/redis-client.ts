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

/**
 * Get or create the main Redis client (for streams, commands)
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
    if (redisClient?.isOpen) {
        return redisClient;
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
        console.warn('[Redis] REDIS_URL not set, pub/sub unavailable');
        return null;
    }

    try {
        pubSubClient = createClient({
            url: config.redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 5) return false;
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        pubSubClient.on('error', (err) => {
            console.error('[Redis PubSub] Error:', err.message);
        });

        await pubSubClient.connect();
        console.log('[Redis PubSub] Connected');
        return pubSubClient;
    } catch (err) {
        console.warn('[Redis PubSub] Connection failed:', err instanceof Error ? err.message : err);
        pubSubClient = null;
        return null;
    }
}

async function connectRedis(): Promise<RedisClientType | null> {
    if (!config.redisUrl) {
        console.warn('[Redis] REDIS_URL not set, Redis unavailable');
        return null;
    }

    try {
        redisClient = createClient({
            url: config.redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 5) {
                        console.error('[Redis] Max reconnection attempts reached');
                        return false;
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            console.error('[Redis] Error:', err.message);
        });

        redisClient.on('reconnecting', () => {
            console.log('[Redis] Reconnecting...');
        });

        await redisClient.connect();
        console.log('[Redis] Connected to', config.redisUrl);
        return redisClient;
    } catch (err) {
        console.warn('[Redis] Connection failed:', err instanceof Error ? err.message : err);
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
