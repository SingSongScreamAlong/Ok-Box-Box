/**
 * Centralized Environment Configuration
 * 
 * All environment variables should be accessed through this module.
 * This ensures type safety and provides sensible defaults for development.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root first, then server-specific
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../../.env');
const serverEnv = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: serverEnv, override: true });

export interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  SERVER_URL: string;

  // Backend Services
  BACKEND_URL: string;
  RELAY_AGENT_URL: string;
  DASHBOARD_URL: string;

  // Database
  DATABASE_URL: string;
  PG_CONNECTION_STRING: string;

  // Security
  JWT_SECRET: string;
  API_KEY: string;
  SERVICE_TOKEN: string;

  // AI Services
  OPENAI_API_KEY?: string;
  GRADIENT_AI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;

  // Feature Flags
  ENABLE_AI_COACHING: boolean;
  ENABLE_VOICE_SYNTHESIS: boolean;
  ENABLE_VIDEO_STREAMING: boolean;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';

  // CORS
  CORS_ORIGINS: string[];
}

/**
 * Load and validate environment variables
 */
function loadEnvironment(): EnvironmentConfig {
  const env = process.env;

  // Validate required variables in production
  if (env.NODE_ENV === 'production') {
    const required = [
      'JWT_SECRET',
      'DATABASE_URL',
      'SERVER_URL',
      'BACKEND_URL'
    ];

    for (const key of required) {
      if (!env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    // Validate JWT secret strength
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }

    // Block weak JWT secrets
    const weakSecrets = ['secret', 'default', 'test', 'password', '12345', 'changeme'];
    if (env.JWT_SECRET && weakSecrets.includes(env.JWT_SECRET.toLowerCase())) {
      throw new Error('JWT_SECRET is too weak. Use a cryptographically random string.');
    }
  }

  return {
    // Server Configuration
    NODE_ENV: (env.NODE_ENV as any) || 'development',
    PORT: parseInt(env.PORT || '3000', 10),
    SERVER_URL: env.SERVER_URL || 'http://localhost:3000',

    // Backend Services
    BACKEND_URL: env.BACKEND_URL || env.SERVER_URL || 'http://localhost:3000',
    RELAY_AGENT_URL: env.RELAY_AGENT_URL || 'ws://localhost:8765',
    DASHBOARD_URL: env.DASHBOARD_URL || env.CLIENT_URL || 'http://localhost:3001',

    // Database
    DATABASE_URL: env.DATABASE_URL || 'postgresql://pitbox:pitbox@localhost:5432/pitbox',
    PG_CONNECTION_STRING: env.PG_CONNECTION_STRING || env.DATABASE_URL || 'postgresql://pitbox:pitbox@localhost:5432/pitbox',

    // Security
    JWT_SECRET: env.JWT_SECRET || 'development-secret-change-in-production',
    API_KEY: env.API_KEY || 'development-api-key',
    SERVICE_TOKEN: env.SERVICE_TOKEN || 'development-service-token',

    // AI Services
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    GRADIENT_AI_API_KEY: env.GRADIENT_AI_API_KEY,
    ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY,

    // Feature Flags
    ENABLE_AI_COACHING: env.ENABLE_AI_COACHING !== 'false',
    ENABLE_VOICE_SYNTHESIS: env.ENABLE_VOICE_SYNTHESIS !== 'false',
    ENABLE_VIDEO_STREAMING: env.ENABLE_VIDEO_STREAMING !== 'false',

    // Logging
    LOG_LEVEL: (env.LOG_LEVEL as any) || (env.NODE_ENV === 'production' ? 'info' : 'debug'),

    // CORS
    CORS_ORIGINS: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3001', 'http://localhost:3000']
  };
}

// Export singleton instance
export const config: EnvironmentConfig = loadEnvironment();

// Helper to check if we're in production
export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';
