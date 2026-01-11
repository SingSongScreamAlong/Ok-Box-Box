import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[config.logLevel as LogLevel] ?? levels.info;

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const argsStr = args.length > 0 ? ' ' + args.map(a => 
    typeof a === 'object' ? JSON.stringify(a) : String(a)
  ).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (currentLevel <= levels.debug) {
      console.debug(formatMessage('debug', message, ...args));
    }
  },
  
  info(message: string, ...args: unknown[]): void {
    if (currentLevel <= levels.info) {
      console.info(formatMessage('info', message, ...args));
    }
  },
  
  warn(message: string, ...args: unknown[]): void {
    if (currentLevel <= levels.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },
  
  error(message: string, ...args: unknown[]): void {
    if (currentLevel <= levels.error) {
      console.error(formatMessage('error', message, ...args));
    }
  },
};
