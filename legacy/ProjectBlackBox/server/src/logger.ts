import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '..', 'logs', 'all.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  }),

  // File transport for error logs only
  new winston.transports.File({
    filename: path.join(__dirname, '..', 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  }),

  // File transport for HTTP logs
  new winston.transports.File({
    filename: path.join(__dirname, '..', 'logs', 'http.log'),
    level: 'http',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Custom middleware for HTTP request logging
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
  });

  next();
};

// Utility functions for different log levels
export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, {
    error: error?.message,
    stack: error?.stack,
    ...meta
  });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

// Performance monitoring
export const logPerformance = (operation: string, startTime: number, meta?: any) => {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...meta
  });
};

// Database operation logging
export const logDatabaseOperation = (
  operation: string,
  table: string,
  duration: number,
  success: boolean,
  meta?: any
) => {
  const level = success ? 'info' : 'error';
  logger.log(level, `Database: ${operation} on ${table}`, {
    operation,
    table,
    duration,
    success,
    ...meta
  });
};

// API request logging
export const logApiRequest = (
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userId?: string,
  meta?: any
) => {
  const level = statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, `API: ${method} ${url} ${statusCode}`, {
    method,
    url,
    statusCode,
    duration,
    userId,
    ...meta
  });
};

// User action logging
export const logUserAction = (
  userId: string,
  action: string,
  resource: string,
  success: boolean,
  meta?: any
) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, `User Action: ${action} on ${resource}`, {
    userId,
    action,
    resource,
    success,
    ...meta
  });
};

// System health logging
export const logHealthCheck = (
  service: string,
  status: 'healthy' | 'unhealthy',
  responseTime: number,
  meta?: any
) => {
  const level = status === 'healthy' ? 'info' : 'error';
  logger.log(level, `Health Check: ${service} is ${status}`, {
    service,
    status,
    responseTime,
    ...meta
  });
};

// Graceful shutdown handler
export const closeLogger = () => {
  return new Promise<void>((resolve) => {
    logger.on('finish', resolve);
    logger.end();
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection', new Error(String(reason)), { promise: promise.toString() });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logInfo('Received SIGINT, shutting down gracefully...');
  await closeLogger();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logInfo('Received SIGTERM, shutting down gracefully...');
  await closeLogger();
  process.exit(0);
});
