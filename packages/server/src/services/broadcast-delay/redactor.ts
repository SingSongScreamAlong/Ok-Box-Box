// =====================================================================
// Broadcast Data Redactor
// Server-enforced removal of restricted fields from public feeds
// =====================================================================

import { REDACTED_FIELDS } from './types.js';

/**
 * Deep clone and redact sensitive fields from an object.
 * This ensures competitive/private data never reaches broadcast clients.
 */
export function redactForBroadcast<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => redactForBroadcast(item)) as T;
    }

    if (typeof data !== 'object') {
        return data;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        // Skip redacted fields
        if (REDACTED_FIELDS.includes(key as typeof REDACTED_FIELDS[number])) {
            continue;
        }

        // Recursively redact nested objects
        if (value !== null && typeof value === 'object') {
            result[key] = redactForBroadcast(value);
        } else {
            result[key] = value;
        }
    }

    return result as T;
}

/**
 * Create a thin timing-safe version of telemetry data.
 * Only includes fields safe for public broadcast.
 */
export function toThinBroadcastFrame(data: Record<string, unknown>): Record<string, unknown> {
    // Allowed fields for thin broadcast frame
    const allowedFields = [
        'sessionId',
        'timestamp',
        'ts',
        'v',
        'type',
        'streamType',
        'seq',
        'sampleHz',
    ];

    const allowedPayloadFields = [
        'speed',
        'gear',
        'rpm',
        'lap',
        'lapDistPct',
        'position',
        'sessionFlags',
        'gapAhead',
        'gapBehind',
        'throttle',
        'brake',
        'steering',
    ];

    const result: Record<string, unknown> = {};

    for (const field of allowedFields) {
        if (field in data) {
            result[field] = data[field];
        }
    }

    // Handle payload separately
    if (data.payload && typeof data.payload === 'object') {
        const payload: Record<string, unknown> = {};
        const srcPayload = data.payload as Record<string, unknown>;

        for (const field of allowedPayloadFields) {
            if (field in srcPayload) {
                payload[field] = srcPayload[field];
            }
        }

        result.payload = payload;
    }

    // Handle cars array (for timing data)
    if (data.cars && Array.isArray(data.cars)) {
        result.cars = (data.cars as Record<string, unknown>[]).map(car => {
            const thinCar: Record<string, unknown> = {};
            const carAllowed = [
                'carId', 'driverId', 'driverName', 'carNumber', 'teamName',
                'position', 'lap', 'speed', 'pos', 'gapAhead', 'gapBehind',
                'bestLap', 'lastLap', 'sessionFlags'
            ];

            for (const field of carAllowed) {
                if (field in car) {
                    thinCar[field] = car[field];
                }
            }

            return thinCar;
        });
    }

    return result;
}

/**
 * Redact incident data for broadcast
 */
export function redactIncident(incident: Record<string, unknown>): Record<string, unknown> {
    const allowed = [
        'incidentId',
        'sessionId',
        'timestamp',
        'lap',
        'trackPosition',
        'involvedDrivers',
        'incidentType',
        'severity',
        // Exclude: aiRecommendation, aiConfidence, stewardNotes, faultProbability
    ];

    const result: Record<string, unknown> = {};

    for (const field of allowed) {
        if (field in incident) {
            result[field] = incident[field];
        }
    }

    // Redact driver details within involvedDrivers
    if (result.involvedDrivers && Array.isArray(result.involvedDrivers)) {
        result.involvedDrivers = (result.involvedDrivers as Record<string, unknown>[]).map(driver => ({
            driverId: driver.driverId,
            driverName: driver.driverName,
            carNumber: driver.carNumber,
            position: driver.position,
            // Exclude: faultPct, aiAssessment
        }));
    }

    return result;
}
