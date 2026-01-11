import dotenv from 'dotenv';

dotenv.config();

// Parse CORS origins from env (comma-separated) or use defaults
const parseCorsOrigin = (): string | string[] => {
  const envOrigin = process.env.CORS_ORIGIN;
  if (!envOrigin) {
    // Development defaults
    return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://localhost:3000'];
  }
  // Production: parse comma-separated origins
  if (envOrigin.includes(',')) {
    return envOrigin.split(',').map(o => o.trim());
  }
  return envOrigin;
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/okboxbox',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  
  // CORS
  corsOrigin: parseCorsOrigin(),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Feature flags
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
