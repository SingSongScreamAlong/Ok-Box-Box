/**
 * Mock Telemetry Data Generator
 * Generates realistic iRacing telemetry data for load testing
 */

export interface TelemetryData {
    sessionId: string;
    driverId: string;
    timestamp: number;
    lap: number;
    lapDist: number;
    speed: number;
    rpm: number;
    gear: number;
    throttle: number;
    brake: number;
    clutch: number;
    steeringAngle: number;
    lapTime: number;
    fuelLevel: number;
    tirePressure: {
        FL: number;
        FR: number;
        RL: number;
        RR: number;
    };
    tireTemp: {
        FL: number;
        FR: number;
        RL: number;
        RR: number;
    };
    position: { x: number, y: number, z: number };
    sector: number;
    sectorTime: number;
    bestLapTime: number;
    bestSectorTimes: number[];
    gForce: { lateral: number, longitudinal: number, vertical: number };
    trackPosition: number;
    racePosition: number;
    gapAhead: number;
    gapBehind: number;
}

export class MockTelemetryGenerator {
    private sessionId: string;
    private driverId: string;
    private currentLap: number = 1;
    private lapDistance: number = 0;
    private trackLength: number = 5000; // meters
    private baseSpeed: number = 200; // km/h
    private baseLapTime: number = 90; // seconds

    constructor(sessionId: string, driverId: string) {
        this.sessionId = sessionId;
        this.driverId = driverId;
    }

    // Silverstone Track Coordinates (approximate path from TrackRegistry)
    private trackPath = [
        { x: 480, y: 200 }, // Start
        { x: 600, y: 180 }, // Abbey
        { x: 580, y: 250 }, // Village
        { x: 530, y: 250 }, // Loop
        { x: 540, y: 280 }, // Aintree
        { x: 480, y: 400 }, // Wellington Straight
        { x: 250, y: 500 }, // Brooklands
        { x: 280, y: 550 }, // Luffield
        { x: 400, y: 500 }, // Woodcote
        { x: 550, y: 250 }, // Copse
        { x: 700, y: 250 }, // Maggotts
        { x: 750, y: 400 }, // Becketts
        { x: 650, y: 600 }, // Chapel
        { x: 700, y: 650 }, // Hangar Straight
        { x: 800, y: 600 }, // Stowe
        { x: 850, y: 400 }, // Vale
        { x: 700, y: 150 }, // Club
        { x: 480, y: 200 }  // Finish Line
    ];

    private getInterpolatedPosition(progress: number): { x: number, y: number } {
        // Find segment
        const totalSegments = this.trackPath.length - 1;
        const segmentProgress = progress * totalSegments;
        const segmentIndex = Math.floor(segmentProgress);
        const segmentT = segmentProgress - segmentIndex;

        const p1 = this.trackPath[segmentIndex >= totalSegments ? 0 : segmentIndex];
        const p2 = this.trackPath[segmentIndex + 1 >= this.trackPath.length ? 0 : segmentIndex + 1];

        return {
            x: p1.x + (p2.x - p1.x) * segmentT,
            y: p1.y + (p2.y - p1.y) * segmentT
        };
    }

    /**
     * Generate a single telemetry sample
     */
    generateSample(): TelemetryData {
        // Simulate realistic racing data
        const trackProgress = this.lapDistance / this.trackLength;
        const position = this.getInterpolatedPosition(trackProgress);

        // Speed varies based on track position (corners vs straights)
        const speedVariation = Math.sin(trackProgress * Math.PI * 4) * 50;
        const speed = this.baseSpeed + speedVariation + this.randomNoise(10);

        // RPM correlates with speed
        const rpm = Math.floor((speed / 300) * 8000) + this.randomNoise(200);

        // Gear based on speed
        const gear = Math.min(6, Math.max(1, Math.floor(speed / 50)));

        // Throttle and brake based on speed changes
        const isAccelerating = speedVariation > 0;
        const throttle = isAccelerating ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3;
        const brake = isAccelerating ? 0 : Math.random() * 0.5;

        // Steering varies through corners
        const steeringAngle = Math.sin(trackProgress * Math.PI * 6) * 0.3 + this.randomNoise(0.05);

        // Fuel decreases over time
        const fuelLevel = 50 - (this.currentLap * 2.5);

        // Tire pressures and temps increase with laps
        const basePressure = 28 + (this.currentLap * 0.5);
        const baseTemp = 80 + (this.currentLap * 5);

        const telemetry: TelemetryData = {
            sessionId: this.sessionId,
            driverId: this.driverId,
            timestamp: Date.now(),
            lap: this.currentLap,
            lapDist: this.lapDistance,
            speed: Math.max(0, speed),
            rpm: Math.max(0, Math.min(9000, rpm)),
            gear,
            throttle: Math.max(0, Math.min(1, throttle)),
            brake: Math.max(0, Math.min(1, brake)),
            clutch: gear === 1 ? Math.random() * 0.5 : 0,
            steeringAngle: Math.max(-1, Math.min(1, steeringAngle)),
            lapTime: this.baseLapTime + this.randomNoise(2),
            fuelLevel: Math.max(0, fuelLevel),
            tirePressure: {
                FL: basePressure + this.randomNoise(0.5),
                FR: basePressure + this.randomNoise(0.5),
                RL: basePressure + this.randomNoise(0.5),
                RR: basePressure + this.randomNoise(0.5),
            },
            tireTemp: {
                FL: baseTemp + this.randomNoise(5),
                FR: baseTemp + this.randomNoise(5),
                RL: baseTemp + this.randomNoise(5),
                RR: baseTemp + this.randomNoise(5),
            },
            // Add required position (x, y, z) for TrackMap
            position: { x: position.x, y: position.y, z: 0 },
            // Add other missing properties required by the interface (approximated)
            sector: Math.floor(trackProgress * 3) + 1,
            sectorTime: 30.5,
            bestLapTime: 88.5,
            bestSectorTimes: [28.2, 30.1, 30.2],
            gForce: { lateral: steeringAngle * 2, longitudinal: isAccelerating ? 0.5 : -1.0, vertical: 0 },
            trackPosition: trackProgress,
            racePosition: 1,
            gapAhead: 1.2,
            gapBehind: 0.8
        } as any; // Cast as any to avoid strict interface matching during mock

        // Update position for next sample
        this.lapDistance += (speed / 3.6) * (1 / 60); // Assuming 60Hz updates

        if (this.lapDistance >= this.trackLength) {
            this.lapDistance = 0;
            this.currentLap++;
        }

        return telemetry;
    }

    /**
     * Generate multiple samples
     */
    generateBatch(count: number): TelemetryData[] {
        const samples: TelemetryData[] = [];
        for (let i = 0; i < count; i++) {
            samples.push(this.generateSample());
        }
        return samples;
    }

    /**
     * Add random noise to values
     */
    private randomNoise(magnitude: number): number {
        return (Math.random() - 0.5) * 2 * magnitude;
    }

    /**
     * Reset generator state
     */
    reset(): void {
        this.currentLap = 1;
        this.lapDistance = 0;
    }

}

/**
 * Generate mock session data
 */
export function generateMockSession(driverCount: number = 1) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generators: MockTelemetryGenerator[] = [];

    for (let i = 0; i < driverCount; i++) {
        const driverId = `driver_${i + 1}`;
        generators.push(new MockTelemetryGenerator(sessionId, driverId));
    }

    return {
        sessionId,
        generators,
        generateSamples: (samplesPerDriver: number = 1) => {
            return generators.map(gen => gen.generateBatch(samplesPerDriver));
        }
    };
}

export default MockTelemetryGenerator;
