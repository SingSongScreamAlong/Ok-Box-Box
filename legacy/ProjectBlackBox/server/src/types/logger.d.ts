import { Request, Response, NextFunction } from 'express';

export interface LoggerOptions {
  level?: 'error' | 'warn' | 'info' | 'http' | 'debug';
  timestamp?: boolean;
  colorize?: boolean;
  json?: boolean;
  meta?: Record<string, unknown>;
}

export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  http(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

// Core logging functions
export function logError(message: string, error?: Error, meta?: any): void;
export function logWarn(message: string, meta?: any): void;
export function logInfo(message: string, meta?: any): void;
export function logDebug(message: string, meta?: any): void;

// Performance monitoring
export function logPerformance(operation: string, startTime: number, meta?: any): void;

// Database operation logging
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  success: boolean,
  meta?: any
): void;

// API request logging
export function logApiRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userId?: string,
  meta?: any
): void;

// User action logging
export function logUserAction(
  userId: string,
  action: string,
  resource: string,
  success: boolean,
  meta?: any
): void;

// System health logging
export function logHealthCheck(
  service: string,
  status: 'healthy' | 'unhealthy',
  responseTime: number,
  meta?: any
): void;

// HTTP logger middleware
export function httpLogger(req: Request, res: Response, next: NextFunction): void;

// Graceful shutdown
export function closeLogger(): Promise<void>;

declare const logger: Logger;
export default logger;
