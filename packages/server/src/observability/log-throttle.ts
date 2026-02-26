// =====================================================================
// Log Throttle Utility
// Prevents log spam in high-frequency paths (telemetry, websocket loops)
// =====================================================================

const lastLogTime = new Map<string, number>();

/**
 * Execute a logging function at most once per interval for a given key.
 * Useful for high-frequency paths like telemetry handlers.
 * 
 * @param key - Unique identifier for this log message
 * @param intervalMs - Minimum milliseconds between logs (default: 5000)
 * @param fn - The logging function to execute
 * @returns true if the log was executed, false if throttled
 * 
 * @example
 * // In a telemetry loop that runs 60Hz:
 * logOncePerInterval('telemetry-status', 5000, () => {
 *     wsLogger.debug({ carCount }, 'Processing telemetry batch');
 * });
 */
export function logOncePerInterval(
    key: string,
    intervalMs: number,
    fn: () => void
): boolean {
    const now = Date.now();
    const lastTime = lastLogTime.get(key) || 0;

    if (now - lastTime >= intervalMs) {
        lastLogTime.set(key, now);
        fn();
        return true;
    }

    return false;
}

/**
 * Create a throttled logger for a specific subsystem.
 * Returns a function that only logs once per interval.
 * 
 * @param defaultIntervalMs - Default throttle interval (default: 5000ms)
 * 
 * @example
 * const throttledLog = createThrottledLogger(10000);
 * 
 * // In hot path:
 * throttledLog('ws-heartbeat', () => wsLogger.debug('Heartbeat sent'));
 */
export function createThrottledLogger(defaultIntervalMs: number = 5000) {
    return (key: string, fn: () => void, intervalMs?: number): boolean => {
        return logOncePerInterval(key, intervalMs ?? defaultIntervalMs, fn);
    };
}

/**
 * Clear throttle state for a key (useful for testing or reset scenarios)
 */
export function clearThrottle(key: string): void {
    lastLogTime.delete(key);
}

/**
 * Clear all throttle state
 */
export function clearAllThrottles(): void {
    lastLogTime.clear();
}

/**
 * Get current throttle map size (for diagnostics)
 */
export function getThrottleMapSize(): number {
    return lastLogTime.size;
}
