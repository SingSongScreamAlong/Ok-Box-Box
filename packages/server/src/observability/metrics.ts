// =====================================================================
// Prometheus Metrics Registry
// DEV monitoring metrics for observability
// =====================================================================

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

// Create a custom registry to avoid conflicts
export const metricsRegistry = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop)
collectDefaultMetrics({ register: metricsRegistry, prefix: 'controlbox_' });

// =====================================================================
// Connection Metrics
// =====================================================================

export const relayConnectionsTotal = new Counter({
    name: 'controlbox_relay_connections_total',
    help: 'Total number of relay agent connections',
    registers: [metricsRegistry]
});

export const relayDisconnectsTotal = new Counter({
    name: 'controlbox_relay_disconnects_total',
    help: 'Total number of relay agent disconnections',
    registers: [metricsRegistry]
});

export const websocketClientsConnected = new Gauge({
    name: 'controlbox_websocket_clients_connected',
    help: 'Current number of connected WebSocket clients',
    labelNames: ['role'] as const,
    registers: [metricsRegistry]
});

// =====================================================================
// Telemetry Metrics
// =====================================================================

export const telemetryFramesInTotal = new Counter({
    name: 'controlbox_telemetry_frames_in_total',
    help: 'Total telemetry frames received from relays',
    labelNames: ['stream'] as const, // baseline, controls, lossless
    registers: [metricsRegistry]
});

export const telemetryFramesOutTotal = new Counter({
    name: 'controlbox_telemetry_frames_out_total',
    help: 'Total telemetry events emitted to clients',
    labelNames: ['event'] as const, // timing, strategy
    registers: [metricsRegistry]
});

export const telemetryDropTotal = new Counter({
    name: 'controlbox_telemetry_drop_total',
    help: 'Total telemetry frames dropped',
    labelNames: ['reason'] as const, // auth_fail, parse_fail, rate_limit, backpressure
    registers: [metricsRegistry]
});

// =====================================================================
// Event Metrics
// =====================================================================

export const timingUpdatesTotal = new Counter({
    name: 'controlbox_timing_updates_total',
    help: 'Total timing update events broadcast',
    registers: [metricsRegistry]
});

export const incidentEventsTotal = new Counter({
    name: 'controlbox_incident_events_total',
    help: 'Total incident events',
    labelNames: ['type'] as const, // new, updated
    registers: [metricsRegistry]
});

// =====================================================================
// Latency Histograms
// =====================================================================

export const dbWriteLatencyMs = new Histogram({
    name: 'controlbox_db_write_latency_ms',
    help: 'Database write latency in milliseconds',
    labelNames: ['operation'] as const, // telemetry, incident, session
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [metricsRegistry]
});

export const wsEmitLatencyMs = new Histogram({
    name: 'controlbox_ws_emit_latency_ms',
    help: 'WebSocket emit latency in milliseconds (sampled)',
    labelNames: ['event'] as const,
    buckets: [0.1, 0.5, 1, 2, 5, 10, 25, 50],
    registers: [metricsRegistry]
});

// =====================================================================
// Helper Functions
// =====================================================================

/**
 * Get current metrics as Prometheus text format
 */
export async function getMetricsText(): Promise<string> {
    return metricsRegistry.metrics();
}

/**
 * Get current metrics as JSON
 */
export async function getMetricsJson(): Promise<object[]> {
    return metricsRegistry.getMetricsAsJSON();
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
    metricsRegistry.resetMetrics();
}

// =====================================================================
// Runtime Stats (for diagnostics)
// =====================================================================

const runtimeStats = {
    startTime: Date.now(),
    lastFrameTime: 0,
    activeRelays: 0,
    activeDashboards: 0
};

export function updateRuntimeStats(update: Partial<typeof runtimeStats>): void {
    Object.assign(runtimeStats, update);
}

export function getRuntimeStats() {
    return {
        ...runtimeStats,
        uptimeMs: Date.now() - runtimeStats.startTime
    };
}
