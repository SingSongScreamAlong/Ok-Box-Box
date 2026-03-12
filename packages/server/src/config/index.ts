// =====================================================================
// Server Configuration
// =====================================================================

import { createHash } from 'crypto';

const derivedDevSecret = createHash('sha256')
    .update([
        process.cwd(),
        process.env.USERNAME || '',
        process.env.COMPUTERNAME || '',
        'okboxbox-dev-secret',
    ].join('|'))
    .digest('hex');

export const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://controlbox:controlbox_dev@localhost:5432/controlbox',
    databasePoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),

    // Redis
    redisUrl: process.env.REDIS_URL || (process.env.NODE_ENV === 'production' ? '' : 'redis://localhost:6379'),

    // JWT
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : derivedDevSecret),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // CORS — auto-strip localhost in production
    corsOrigins: (() => {
        const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5175,https://app.okboxbox.com,https://okboxbox.com,https://www.okboxbox.com').split(',').map(origin => origin.trim()).filter(Boolean);
        if (process.env.NODE_ENV === 'production') {
            const filtered = origins.filter(o => !o.includes('localhost') && !o.includes('127.0.0.1'));
            return filtered.length > 0 ? filtered : origins; // fallback to all if nothing left
        }
        return origins;
    })(),

    // AI
    aiInferenceUrl: process.env.AI_INFERENCE_URL || 'http://localhost:8000',
    aiModelId: process.env.AI_MODEL_ID || 'default',

    // iRacing Relay
    iracingRelayHost: process.env.IRACING_RELAY_HOST || 'localhost',
    iracingRelayPort: parseInt(process.env.IRACING_RELAY_PORT || '3002', 10),

    // Logging — default to 'info' in production, 'debug' in dev
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    logFormat: process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev'),

    // Observability (DEV features)
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    diagnosticsEnabled: process.env.DIAGNOSTICS_ENABLED === 'true',
    opsUiEnabled: process.env.OPS_UI_ENABLED === '1',
    allowAnonymousSocketViewers: process.env.ALLOW_ANONYMOUS_SOCKET_VIEWERS === 'true' || process.env.NODE_ENV !== 'production',

    // External AI Services
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',

    // Supabase (server-side only — admin operations like account deletion)
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

    // Admin seeding — override defaults via env in production
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@okboxbox.com',
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
    devSeedAdminPassword: process.env.DEV_SEED_ADMIN_PASSWORD || derivedDevSecret.slice(0, 24),

    // FP1 Testing Mode — grants all driver capabilities to free tier users
    fp1TestingMode: process.env.FP1_TESTING_MODE === 'true',
} as const;

// Validate required production configs
if (config.nodeEnv === 'production') {
    if (!config.jwtSecret) {
        throw new Error('JWT_SECRET must be set in production');
    }
    if (config.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long for production security');
    }

    // Validate Database URL (Prevent localhost in production unless explicitly allowed)
    if (!process.env.ALLOW_LOCAL_DB && (
        config.databaseUrl.includes('localhost') ||
        config.databaseUrl.includes('127.0.0.1')
    )) {
        throw new Error('Production DATABASE_URL cannot be localhost. Set ALLOW_LOCAL_DB=true to bypass.');
    }

    // Warn if Redis URL is not set (OAuth service has in-memory fallback)
    if (!process.env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL not set — OAuth state will use in-memory store (not suitable for multi-instance)');
    }

    // Validate CORS origins — no localhost in production
    if (!process.env.CORS_ORIGINS) {
        console.warn('⚠️  CORS_ORIGINS not explicitly set — using built-in defaults. Set CORS_ORIGINS for explicit control.');
    }
    const localhostOrigins = config.corsOrigins.filter(o => o.includes('localhost') || o.includes('127.0.0.1'));
    if (localhostOrigins.length > 0) {
        console.warn(`⚠️  CORS_ORIGINS contains localhost entries in production: ${localhostOrigins.join(', ')}. Remove them for production security.`);
    }

    if (config.allowAnonymousSocketViewers) {
        console.warn('⚠️  ALLOW_ANONYMOUS_SOCKET_VIEWERS enabled in production — websocket telemetry may be visible to unauthenticated clients.');
    }

    // Warn if admin seed password is not set — production first-admin seeding will fail without it
    if (!process.env.SEED_ADMIN_PASSWORD) {
        console.warn('⚠️  SEED_ADMIN_PASSWORD not set — set this env var before first deployment to avoid a predictable admin password.');
    }
}
