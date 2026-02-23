/**
 * Relay Adapter Service
 * Validates incoming relay data against the strict protocol schema
 * and converts it to internal domain types for the application.
 */
import {
    SessionMetadataSchema,
    TelemetrySnapshotSchema,
    IncidentSchema,
    RaceEventSchema
} from '@controlbox/protocol';
import { z } from 'zod';

export class RelayAdapter {
    private static firstTelemetryLogged = false;
    private static lastValidationWarn: Record<string, number> = {};
    private static readonly VALIDATION_WARN_INTERVAL = 60_000; // Log validation warnings at most once per 60s per type
    
    constructor(
        _sessionManager: any,
        _socket: any
    ) { }

    /**
     * Handle incoming session metadata
     */
    public handleSessionMetadata(rawData: unknown): boolean {
        const result = SessionMetadataSchema.safeParse(rawData);

        if (!result.success) {
            this.logValidationError('session_metadata', result.error);
            return false;
        }

        const data = result.data;
        console.log(`[Adapter] ✅ Validated session metadata: ${data.trackName} [${data.category}]`);

        // Pass to internal handler (to be wired up)
        // this.sessionManager.handleSessionStart(data);

        return true;
    }

    /**
     * Handle incoming telemetry
     */
    public handleTelemetry(rawData: unknown): boolean {
        // Log first packet for debugging
        if (!RelayAdapter.firstTelemetryLogged) {
            RelayAdapter.firstTelemetryLogged = true;
            console.log('📊 RAW TELEMETRY DATA:', JSON.stringify(rawData).substring(0, 500));
        }
        
        const result = TelemetrySnapshotSchema.safeParse(rawData);

        if (!result.success) {
            // Start logging once per minute or sample? For now, just log.
            this.logValidationError('telemetry', result.error);
            return false;
        }

        // const data = result.data;
        // this.sessionManager.updateTelemetry(data);
        return true;
    }

    /**
     * Handle incoming incident
     */
    public handleIncident(rawData: unknown): boolean {
        const result = IncidentSchema.safeParse(rawData);

        if (!result.success) {
            this.logValidationError('incident', result.error);
            return false;
        }

        const data = result.data;
        console.log(`[Adapter] 🚨 Validated incident: ${data.type} (Lap ${data.lap})`);
        // this.sessionManager.handleIncident(data);
        return true;
    }

    /**
     * Handle race event
     */
    public handleRaceEvent(rawData: unknown): boolean {
        const result = RaceEventSchema.safeParse(rawData);

        if (!result.success) {
            this.logValidationError('race_event', result.error);
            return false;
        }

        const data = result.data;
        console.log(`[Adapter] 🏁 Validated race event: ${data.flagState}`);
        // this.sessionManager.handleRaceEvent(data);
        return true;
    }

    private logValidationError(type: string, error: z.ZodError) {
        const now = Date.now();
        const lastWarn = RelayAdapter.lastValidationWarn[type] || 0;
        if (now - lastWarn >= RelayAdapter.VALIDATION_WARN_INTERVAL) {
            RelayAdapter.lastValidationWarn[type] = now;
            console.warn(`[Adapter] ⚠️ Protocol Validation Failed for ${type} (throttled to 1/min):`, error.flatten());
        }
    }
}
