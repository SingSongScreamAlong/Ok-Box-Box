// =====================================================================
// Error Handler Middleware
// =====================================================================

import type { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred';

    // Only log 5xx errors fully; 4xx are expected client errors
    if (statusCode >= 500) {
        console.error('Error:', err);

        // Capture to Sentry with user context
        if (process.env.SENTRY_DSN) {
            Sentry.withScope((scope) => {
                if (req.user) {
                    scope.setUser({ id: req.user.id, email: req.user.email });
                }
                scope.setTag('error_code', code);
                scope.setExtra('url', req.originalUrl);
                scope.setExtra('method', req.method);
                Sentry.captureException(err);
            });
        }
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message: statusCode >= 500 ? 'An unexpected error occurred' : message,
        },
    });
}

export class ApiError extends Error implements AppError {
    statusCode: number;
    code: string;

    constructor(statusCode: number, code: string, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
    }

    static badRequest(message: string) {
        return new ApiError(400, 'BAD_REQUEST', message);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, 'UNAUTHORIZED', message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message = 'Not found') {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(message: string) {
        return new ApiError(409, 'CONFLICT', message);
    }

    static internal(message = 'Internal server error') {
        return new ApiError(500, 'INTERNAL_ERROR', message);
    }
}
