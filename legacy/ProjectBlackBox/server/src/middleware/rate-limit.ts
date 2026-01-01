/**
 * Rate Limiting Middleware for PitBox Server
 * Protects API endpoints from abuse and DoS attacks
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Applies to all /api/* routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Store in memory (for production, consider Redis)
  // store: new RedisStore({ client: redisClient })
});

/**
 * Telemetry upload rate limiter
 * Higher limit for real-time telemetry data
 */
export const telemetryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 600, // 600 requests per minute (10/sec * 60)
  message: {
    error: 'Telemetry upload rate limit exceeded. Reduce sampling rate.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for authenticated services
    return req.headers['x-service-token'] === process.env.SERVICE_TOKEN;
  }
});

/**
 * AI coaching rate limiter
 * Lower limit for expensive AI operations
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  message: {
    error: 'AI coaching rate limit exceeded. Please wait before requesting more analysis.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'AI rate limit exceeded',
      message: 'Too many AI requests. AI analysis is resource-intensive.',
      retryAfter: '1 minute',
      tip: 'Consider caching coaching results or reducing request frequency'
    });
  }
});

/**
 * Authentication rate limiter
 * Strict limit for login/signup to prevent brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Strict rate limiter for sensitive operations
 * Used for password resets, email changes, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Too many requests for this sensitive operation.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Export rate limiter
 * Moderate limit for telemetry data exports
 */
export const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 exports per 5 minutes
  message: {
    error: 'Export rate limit exceeded. Please wait before exporting more data.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create custom rate limiter
 */
export const createRateLimiter = (options: {
  windowMinutes: number;
  maxRequests: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMinutes * 60 * 1000,
    max: options.maxRequests,
    message: {
      error: options.message || 'Rate limit exceeded',
      retryAfter: `${options.windowMinutes} minute${options.windowMinutes > 1 ? 's' : ''}`
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export default {
  apiLimiter,
  telemetryLimiter,
  aiLimiter,
  authLimiter,
  strictLimiter,
  exportLimiter,
  createRateLimiter
};
