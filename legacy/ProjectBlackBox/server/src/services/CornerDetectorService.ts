/**
 * Corner Detector Service
 * Detects corners from telemetry data based on speed dips and lateral G
 */

import { pool } from '../db.js';

export interface CornerData {
    cornerNumber: number;
    entrySpeed: number;   // km/h
    minSpeed: number;     // km/h at apex
    exitSpeed: number;    // km/h
    lateralG: number;     // Peak lateral G
    brakingDistance: number; // meters (approx)
    trackPosition: number; // 0-1 track position
}

export interface CornerAnalysisResult {
    sessionId: string;
    corners: CornerData[];
    lapNumber: number;
}

class CornerDetectorService {

    // Threshold for corner detection (speed drop %)
    private readonly SPEED_DROP_THRESHOLD = 15; // 15% speed drop = corner
    private readonly MIN_CORNER_SAMPLES = 5;

    async analyzeCorners(sessionId: string, lapNumber?: number): Promise<CornerAnalysisResult | null> {
        // Get telemetry for session (or specific lap)
        let query = `
      SELECT speed, g_lat, track_position, lap
      FROM telemetry
      WHERE session_id = $1
    `;
        const params: any[] = [sessionId];

        if (lapNumber) {
            query += ' AND lap = $2';
            params.push(lapNumber);
        }

        query += ' ORDER BY ts ASC';

        const result = await pool.query(query, params);

        if (result.rowCount === 0) return null;

        const telemetry = result.rows;
        const targetLap = lapNumber || telemetry[telemetry.length - 1]?.lap || 1;

        // Filter to target lap
        const lapData = telemetry.filter((t: any) => t.lap === targetLap);

        if (lapData.length < 50) return null; // Not enough data

        // Detect corners
        const corners = this.detectCorners(lapData);

        return {
            sessionId,
            corners,
            lapNumber: targetLap
        };
    }

    private detectCorners(telemetry: any[]): CornerData[] {
        const corners: CornerData[] = [];
        let cornerNum = 0;
        let inCorner = false;
        let cornerStart = 0;
        let minSpeedIdx = 0;
        let minSpeed = Infinity;
        let maxLatG = 0;

        // Convert speeds to km/h and smooth
        const speeds = telemetry.map((t: any) => (t.speed || 0) * 3.6);
        const smoothedSpeeds = this.movingAverage(speeds, 5);

        // Find local maxima and minima to detect corners
        for (let i = 5; i < smoothedSpeeds.length - 5; i++) {
            const prevSpeed = smoothedSpeeds[i - 5];
            const currSpeed = smoothedSpeeds[i];
            const nextSpeed = smoothedSpeeds[i + 5];
            const latG = Math.abs(telemetry[i].g_lat || 0);

            // Entering corner (speed dropping significantly)
            if (!inCorner && prevSpeed > currSpeed * 1.1 && latG > 0.3) {
                inCorner = true;
                cornerStart = i - 5;
                minSpeed = currSpeed;
                minSpeedIdx = i;
                maxLatG = latG;
            }

            // In corner - track minimum speed
            if (inCorner) {
                if (currSpeed < minSpeed) {
                    minSpeed = currSpeed;
                    minSpeedIdx = i;
                }
                if (latG > maxLatG) {
                    maxLatG = latG;
                }

                // Exiting corner (speed increasing)
                if (currSpeed > minSpeed * 1.1 && nextSpeed > currSpeed) {
                    cornerNum++;
                    corners.push({
                        cornerNumber: cornerNum,
                        entrySpeed: Math.round(smoothedSpeeds[cornerStart]),
                        minSpeed: Math.round(minSpeed),
                        exitSpeed: Math.round(currSpeed),
                        lateralG: Math.round(maxLatG * 100) / 100,
                        brakingDistance: (cornerStart - minSpeedIdx) * 2, // Very rough estimate
                        trackPosition: telemetry[minSpeedIdx].track_position || 0
                    });

                    inCorner = false;
                    minSpeed = Infinity;
                    maxLatG = 0;
                }
            }
        }

        return corners;
    }

    private movingAverage(arr: number[], window: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < arr.length; i++) {
            const start = Math.max(0, i - Math.floor(window / 2));
            const end = Math.min(arr.length, i + Math.ceil(window / 2));
            const slice = arr.slice(start, end);
            result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
        }
        return result;
    }
}

export default new CornerDetectorService();
