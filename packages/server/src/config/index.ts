// =====================================================================
// Server Configuration
// =====================================================================

export const config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://controlbox:controlbox_dev@localhost:5432/controlbox',
    databasePoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'controlbox_dev_secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // CORS
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://app.okboxbox.com,https://okboxbox.com,https://octopus-app-qsi3i.ondigitalocean.app').split(','),

    // AI
    aiInferenceUrl: process.env.AI_INFERENCE_URL || 'http://localhost:8000',
    aiModelId: process.env.AI_MODEL_ID || 'default',

    // iRacing Relay
    iracingRelayHost: process.env.IRACING_RELAY_HOST || 'localhost',
    iracingRelayPort: parseInt(process.env.IRACING_RELAY_PORT || '3002', 10),

    // Logging
    logLevel: process.env.LOG_LEVEL || 'debug',
    logFormat: process.env.LOG_FORMAT || 'dev',

    // Observability (DEV features)
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    diagnosticsEnabled: process.env.DIAGNOSTICS_ENABLED === 'true',
    opsUiEnabled: process.env.OPS_UI_ENABLED === '1',

    // External AI Services
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
} as const;

// Validate required production configs
if (config.nodeEnv === 'production') {
    if (config.jwtSecret === 'controlbox_dev_secret') {
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
}
