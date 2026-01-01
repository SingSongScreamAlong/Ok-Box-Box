import 'dotenv/config';

// Configuration interface
export interface AppConfig {
  // Server
  port: number;
  nodeEnv: 'development' | 'production' | 'test';

  // Database
  database: {
    connectionString: string;
    poolMax: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    statementTimeoutMillis: number;
  };

  // Authentication
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
  };

  // External Services
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };

  elevenlabs: {
    apiKey: string;
    defaultVoiceId: string;
    defaultModel: string;
  };

  // CORS
  cors: {
    origin: string | string[];
    credentials: boolean;
  };

  // Logging
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    logDirectory: string;
    maxFileSize: string;
    maxFiles: number;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };

  // Health Checks
  health: {
    databaseTimeout: number;
    externalServicesTimeout: number;
  };

  // Multi-driver
  multiDriver: {
    maxDriversPerSession: number;
    maxSessionDuration: number; // in minutes
    driverSwitchCooldown: number; // in seconds
  };

  // Performance
  performance: {
    enableCompression: boolean;
    enableCaching: boolean;
    cacheTtl: number;
    maxPayloadSize: string;
  };
}

// Environment variable validation
const requiredEnvVars = [
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
];

const validateEnvironment = (): void => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    const errorMsg = 'FATAL: JWT_SECRET must be at least 32 characters long for security';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    } else {
      console.error('ERROR:', errorMsg);
      console.error('Starting anyway because NODE_ENV is not production, but this MUST be fixed before deployment!');
    }
  }

  // Prevent common weak JWT secrets
  const weakSecrets = ['secret', 'default', 'test', 'changeme', 'password', '12345'];
  const lowerSecret = jwtSecret.toLowerCase();
  if (weakSecrets.some(weak => lowerSecret.includes(weak))) {
    const errorMsg = 'FATAL: JWT_SECRET appears to contain common weak values. Use a cryptographically secure random string.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    } else {
      console.error('ERROR:', errorMsg);
    }
  }

  // Validate database connection string
  if (!process.env.PG_CONNECTION_STRING && !process.env.DATABASE_URL) {
    throw new Error('Either PG_CONNECTION_STRING or DATABASE_URL must be provided');
  }
};

// Get environment variable with fallback
const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue!;
};

// Get number environment variable
const getEnvNumber = (name: string, defaultValue: number): number => {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
};

// Get boolean environment variable
const getEnvBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// Build configuration object
const buildConfig = (): AppConfig => {
  validateEnvironment();

  const nodeEnv = (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development';

  return {
    port: getEnvNumber('PORT', 4000),
    nodeEnv,

    database: {
      connectionString: getEnvVar('PG_CONNECTION_STRING') || getEnvVar('DATABASE_URL'),
      poolMax: getEnvNumber('PG_POOL_MAX', 10),
      idleTimeoutMillis: getEnvNumber('PG_IDLE_TIMEOUT_MS', 30000),
      connectionTimeoutMillis: getEnvNumber('PG_CONN_TIMEOUT_MS', 5000),
      statementTimeoutMillis: getEnvNumber('PG_STMT_TIMEOUT_MS', 15000),
    },

    auth: {
      jwtSecret: getEnvVar('JWT_SECRET'),
      jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
      bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
    },

    openai: {
      apiKey: getEnvVar('OPENAI_API_KEY'),
      model: getEnvVar('OPENAI_MODEL', 'gpt-4'),
      maxTokens: getEnvNumber('OPENAI_MAX_TOKENS', 1000),
      temperature: getEnvNumber('OPENAI_TEMPERATURE', 7) / 10, // Convert to 0-1 range
    },

    elevenlabs: {
      apiKey: getEnvVar('ELEVENLABS_API_KEY'),
      defaultVoiceId: getEnvVar('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM'),
      defaultModel: getEnvVar('ELEVENLABS_MODEL', 'eleven_monolingual_v1'),
    },

    cors: {
      origin: nodeEnv === 'production'
        ? getEnvVar('CORS_ORIGIN', 'https://yourdomain.com')
        : getEnvVar('CORS_ORIGIN', '*'),
      credentials: getEnvBoolean('CORS_CREDENTIALS', false),
    },

    logging: {
      level: getEnvVar('LOG_LEVEL', nodeEnv === 'production' ? 'warn' : 'debug'),
      enableConsole: getEnvBoolean('LOG_CONSOLE', true),
      enableFile: getEnvBoolean('LOG_FILE', true),
      logDirectory: getEnvVar('LOG_DIR', './logs'),
      maxFileSize: getEnvVar('LOG_MAX_SIZE', '20m'),
      maxFiles: getEnvNumber('LOG_MAX_FILES', 5),
    },

    rateLimit: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      skipSuccessfulRequests: getEnvBoolean('RATE_LIMIT_SKIP_SUCCESS', false),
      skipFailedRequests: getEnvBoolean('RATE_LIMIT_SKIP_FAILED', false),
    },

    health: {
      databaseTimeout: getEnvNumber('HEALTH_DB_TIMEOUT', 5000),
      externalServicesTimeout: getEnvNumber('HEALTH_EXTERNAL_TIMEOUT', 10000),
    },

    multiDriver: {
      maxDriversPerSession: getEnvNumber('MAX_DRIVERS_PER_SESSION', 4),
      maxSessionDuration: getEnvNumber('MAX_SESSION_DURATION_MINUTES', 480), // 8 hours
      driverSwitchCooldown: getEnvNumber('DRIVER_SWITCH_COOLDOWN_SEC', 30),
    },

    performance: {
      enableCompression: getEnvBoolean('ENABLE_COMPRESSION', true),
      enableCaching: getEnvBoolean('ENABLE_CACHING', true),
      cacheTtl: getEnvNumber('CACHE_TTL_SEC', 300), // 5 minutes
      maxPayloadSize: getEnvVar('MAX_PAYLOAD_SIZE', '2mb'),
    },
  };
};

// Export singleton configuration
export const config = buildConfig();

// Validation for specific environments
if (config.nodeEnv === 'production') {
  // Production-specific validations
  if (config.cors.origin === '*') {
    console.warn('Warning: CORS is set to allow all origins in production');
  }

  if (config.logging.level === 'debug') {
    console.warn('Warning: Debug logging is enabled in production');
  }
}

// Development helpers
if (config.nodeEnv === 'development') {
  console.log('Configuration loaded for development environment');
  console.log(`Server will run on port ${config.port}`);
  console.log(`Database: ${config.database.connectionString.replace(/:[^:]*@/, ':***@')}`);
}

// Export for testing
export { buildConfig, validateEnvironment };
