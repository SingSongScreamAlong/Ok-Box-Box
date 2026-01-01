// =====================================================================
// Metrics Registry Tests
// =====================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
    metricsRegistry,
    relayConnectionsTotal,
    relayDisconnectsTotal,
    websocketClientsConnected,
    telemetryFramesInTotal,
    telemetryDropTotal,
    resetMetrics,
    getMetricsText
} from '../metrics.js';

describe('Metrics Registry', () => {
    beforeEach(() => {
        resetMetrics();
    });

    describe('Counters', () => {
        it('should increment relay connections counter', async () => {
            relayConnectionsTotal.inc();
            relayConnectionsTotal.inc();

            const metrics = await getMetricsText();
            expect(metrics).toContain('controlbox_relay_connections_total');
        });

        it('should increment telemetry frames with labels', async () => {
            telemetryFramesInTotal.inc({ stream: 'baseline' });
            telemetryFramesInTotal.inc({ stream: 'baseline' });
            telemetryFramesInTotal.inc({ stream: 'controls' });

            const metrics = await getMetricsText();
            expect(metrics).toContain('controlbox_telemetry_frames_in_total');
            expect(metrics).toContain('stream="baseline"');
            expect(metrics).toContain('stream="controls"');
        });

        it('should track drops by reason', async () => {
            telemetryDropTotal.inc({ reason: 'auth_fail' });
            telemetryDropTotal.inc({ reason: 'parse_fail' });

            const metrics = await getMetricsText();
            expect(metrics).toContain('reason="auth_fail"');
            expect(metrics).toContain('reason="parse_fail"');
        });
    });

    describe('Gauges', () => {
        it('should update websocket clients gauge', async () => {
            websocketClientsConnected.set({ role: 'relay' }, 5);
            websocketClientsConnected.set({ role: 'dashboard' }, 10);

            const metrics = await getMetricsText();
            expect(metrics).toContain('controlbox_websocket_clients_connected');
            expect(metrics).toContain('role="relay"');
            expect(metrics).toContain('role="dashboard"');
        });
    });

    describe('Label Bounds', () => {
        it('should use bounded labels (no high-cardinality driver IDs)', async () => {
            // Verify we're using bounded labels like 'stream', 'role', 'reason'
            // and NOT unbounded labels like 'driverId', 'userId', etc.
            const metrics = await getMetricsText();

            // Should NOT contain high-cardinality labels
            expect(metrics).not.toContain('driverId=');
            expect(metrics).not.toContain('userId=');
            expect(metrics).not.toContain('sessionId=');
        });
    });
});
