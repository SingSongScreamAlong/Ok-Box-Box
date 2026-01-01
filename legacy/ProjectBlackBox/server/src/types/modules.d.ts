// Allow TypeScript to understand .js imports in a TypeScript file
declare module '*.js' {
  const content: any;
  export default content;
}

// Declare modules with their types
declare module '../db' {
  import { Pool } from 'pg';
  export const pool: Pool;
  export function ping(): Promise<boolean>;
  export function withTx<T>(fn: (client: any) => Promise<T>): Promise<T>;
  export function setStatementTimeout(ms: number): Promise<void>;
}

declare module '../auth' {
  import { Request, Response, NextFunction } from 'express';
  
  export interface AuthRequest extends Request {
    user?: {
      id: string;
      username: string;
      role: string;
    };
  }
  
  export function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): void;
}

declare module '../logger' {
  import { Request, Response } from 'express';

  export function logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void;

  export function logUserAction(
    userId: string,
    action: string,
    details?: Record<string, unknown>
  ): void;

  export function logError(
    error: Error,
    context?: string,
    metadata?: Record<string, unknown>
  ): void;
}
