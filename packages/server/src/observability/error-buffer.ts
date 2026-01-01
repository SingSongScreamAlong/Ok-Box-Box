// =====================================================================
// Error Ring Buffer
// In-memory storage for recent errors (diagnostics)
// =====================================================================

export interface ErrorEntry {
    id: string;
    timestamp: number;
    subsystem: 'relay' | 'gateway' | 'ws' | 'db' | 'auth' | 'api' | 'unknown';
    message: string;
    stack?: string;
    metadata?: Record<string, unknown>;
}

const MAX_BUFFER_SIZE = 500;
const errorBuffer: ErrorEntry[] = [];
let errorIdCounter = 0;

/**
 * Sanitize stack trace to remove sensitive paths and info
 */
function sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Remove absolute file paths (keep relative)
    let sanitized = stack.replace(/\(\/[^)]+\//g, '(');

    // Remove home directory references
    sanitized = sanitized.replace(/\/Users\/[^/]+\//g, '~/');
    sanitized = sanitized.replace(/\/home\/[^/]+\//g, '~/');

    // Limit length
    if (sanitized.length > 500) {
        sanitized = sanitized.substring(0, 500) + '... (truncated)';
    }

    return sanitized;
}

/**
 * Push an error to the ring buffer
 */
export function pushError(
    error: Error | string,
    subsystem: ErrorEntry['subsystem'] = 'unknown',
    metadata?: Record<string, unknown>
): void {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? sanitizeStack(error.stack) : undefined;

    const entry: ErrorEntry = {
        id: `err-${++errorIdCounter}`,
        timestamp: Date.now(),
        subsystem,
        message,
        stack,
        metadata: metadata ? scrubSensitiveData(metadata) : undefined
    };

    errorBuffer.push(entry);

    // Remove oldest entries if buffer exceeds max size
    while (errorBuffer.length > MAX_BUFFER_SIZE) {
        errorBuffer.shift();
    }
}

/**
 * Get recent errors from the buffer
 */
export function getRecentErrors(limit: number = 100): ErrorEntry[] {
    const count = Math.min(limit, errorBuffer.length);
    return errorBuffer.slice(-count).reverse();
}

/**
 * Get errors filtered by subsystem
 */
export function getErrorsBySubsystem(
    subsystem: ErrorEntry['subsystem'],
    limit: number = 100
): ErrorEntry[] {
    return errorBuffer
        .filter(e => e.subsystem === subsystem)
        .slice(-limit)
        .reverse();
}

/**
 * Get error count by subsystem (for metrics)
 */
export function getErrorCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of errorBuffer) {
        counts[entry.subsystem] = (counts[entry.subsystem] || 0) + 1;
    }
    return counts;
}

/**
 * Clear all errors (for testing)
 */
export function clearErrors(): void {
    errorBuffer.length = 0;
}

/**
 * Get buffer stats
 */
export function getBufferStats() {
    return {
        size: errorBuffer.length,
        maxSize: MAX_BUFFER_SIZE,
        oldestTimestamp: errorBuffer[0]?.timestamp || null,
        newestTimestamp: errorBuffer[errorBuffer.length - 1]?.timestamp || null
    };
}

// =====================================================================
// Sensitive Data Scrubbing
// =====================================================================

const SENSITIVE_KEYS = /secret|password|token|key|jwt|api_?key|auth|bearer|credential|private/i;

/**
 * Recursively scrub sensitive data from an object
 */
export function scrubSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.test(key)) {
            result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = scrubSensitiveData(value as Record<string, unknown>);
        } else if (typeof value === 'string' && value.length > 20 && SENSITIVE_KEYS.test(key)) {
            result[key] = '[REDACTED]';
        } else {
            result[key] = value;
        }
    }

    return result;
}
