// =====================================================================
// Correlation ID Middleware
// Adds request IDs for HTTP and context for WebSocket tracing
// =====================================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}

/**
 * Middleware that adds a unique request ID to every HTTP request.
 * - Checks for existing X-Request-ID header (from load balancer/proxy)
 * - Generates UUID if not present
 * - Attaches to req.requestId and response header
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
    const existingId = req.headers['x-request-id'];
    const requestId = (typeof existingId === 'string' ? existingId : uuidv4());
    
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    
    next();
}

/**
 * Context object for WebSocket event tracing
 */
export interface WsTraceContext {
    socketId: string;
    sessionId?: string;
    orgId?: string;
    userId?: string;
    role?: 'relay' | 'dashboard' | 'admin';
    timestamp: number;
}

/**
 * Create a trace context for WebSocket events
 */
export function createWsTraceContext(
    socketId: string,
    options: Partial<Omit<WsTraceContext, 'socketId' | 'timestamp'>> = {}
): WsTraceContext {
    return {
        socketId,
        timestamp: Date.now(),
        ...options
    };
}

/**
 * Format trace context for structured logging
 */
export function formatTraceContext(ctx: WsTraceContext): string {
    const parts = [`socket:${ctx.socketId.slice(0, 8)}`];
    if (ctx.sessionId) parts.push(`session:${ctx.sessionId.slice(0, 8)}`);
    if (ctx.orgId) parts.push(`org:${ctx.orgId.slice(0, 8)}`);
    if (ctx.role) parts.push(`role:${ctx.role}`);
    return `[${parts.join(' ')}]`;
}
