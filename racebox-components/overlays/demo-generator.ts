// =====================================================================
// Demo Data Generator
// Deterministic seeded fake data for OBS overlay testing
// =====================================================================

import type { SessionTiming, TimingEntry, ThinTelemetryFrame } from './data-adapter';

// =====================================================================
// Seeded Random Number Generator (Mulberry32)
// =====================================================================

function mulberry32(seed: number): () => number {
    return function (): number {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// =====================================================================
// Demo Driver/Car Data
// =====================================================================

const DRIVER_FIRST_NAMES = [
    'Max', 'Lewis', 'Charles', 'Carlos', 'Lando', 'Oscar', 'George', 'Fernando',
    'Sergio', 'Daniel', 'Pierre', 'Yuki', 'Valtteri', 'Logan', 'Alexander',
    'Kevin', 'Nico', 'Esteban', 'Lance', 'Zhou', 'Marcus', 'Colton', 'Josef',
    'Scott', 'Will', 'Pato', 'Felix', 'Rinus', 'David', 'Alex'
];

const DRIVER_LAST_NAMES = [
    'Verstappen', 'Hamilton', 'Leclerc', 'Sainz', 'Norris', 'Piastri', 'Russell',
    'Alonso', 'Perez', 'Ricciardo', 'Gasly', 'Tsunoda', 'Bottas', 'Sargeant',
    'Albon', 'Magnussen', 'Hulkenberg', 'Ocon', 'Stroll', 'Guanyu', 'Ericsson',
    'Herta', 'Newgarden', 'Dixon', 'Power', 'O\'Ward', 'Rosenqvist', 'VeeKay',
    'Malukas', 'Palou'
];

const TEAM_NAMES = [
    'Red Bull Racing', 'Mercedes', 'Ferrari', 'McLaren', 'Aston Martin',
    'Alpine', 'Williams', 'AlphaTauri', 'Alfa Romeo', 'Haas',
    'Penske', 'Ganassi', 'Andretti', 'Arrow McLaren', 'Rahal Letterman'
];

const TRACK_NAMES = [
    'Silverstone Circuit', 'Circuit de Spa-Francorchamps', 'Monza',
    'Suzuka Circuit', 'Circuit of the Americas', 'Interlagos',
    'Road America', 'Indianapolis Motor Speedway', 'Watkins Glen'
];

// =====================================================================
// Demo Generator
// =====================================================================

export interface DemoConfig {
    sessionId: string;
    seed?: string;
    carCount?: number;
    trackName?: string;
    sessionType?: 'race' | 'qualifying' | 'practice';
}

export class DemoDataGenerator {
    private rng: () => number;
    private sessionId: string;
    private carCount: number;
    private trackName: string;
    private sessionType: string;

    private drivers: Array<{
        driverId: string;
        driverName: string;
        carNumber: string;
        teamName: string;
    }> = [];

    private positions: number[] = [];
    private lapDistPcts: number[] = [];
    private speeds: number[] = [];
    private laps: number[] = [];
    private currentLap = 1;
    private simulationTimeMs = 0;

    constructor(config: DemoConfig) {
        this.sessionId = config.sessionId;
        const seedString = `${config.sessionId}-${config.seed || 'default'}`;
        this.rng = mulberry32(hashString(seedString));

        // Deterministic car count based on seed
        this.carCount = config.carCount || 20 + Math.floor(this.rng() * 40); // 20-60 cars
        this.trackName = config.trackName || TRACK_NAMES[Math.floor(this.rng() * TRACK_NAMES.length)];
        this.sessionType = config.sessionType || 'race';

        this.generateDrivers();
        this.initializePositions();
    }

    private generateDrivers(): void {
        const usedNumbers = new Set<string>();

        for (let i = 0; i < this.carCount; i++) {
            const firstName = DRIVER_FIRST_NAMES[Math.floor(this.rng() * DRIVER_FIRST_NAMES.length)];
            const lastName = DRIVER_LAST_NAMES[Math.floor(this.rng() * DRIVER_LAST_NAMES.length)];
            const teamName = TEAM_NAMES[Math.floor(this.rng() * TEAM_NAMES.length)];

            let carNumber: string;
            do {
                carNumber = String(Math.floor(this.rng() * 99) + 1);
            } while (usedNumbers.has(carNumber));
            usedNumbers.add(carNumber);

            this.drivers.push({
                driverId: `demo-driver-${i}`,
                driverName: `${firstName} ${lastName}`,
                carNumber,
                teamName
            });
        }
    }

    private initializePositions(): void {
        // Initialize positions and track positions
        for (let i = 0; i < this.carCount; i++) {
            this.positions.push(i + 1);
            // Spread cars around the track
            this.lapDistPcts.push(1 - (i * 0.03) % 1);
            this.speeds.push(150 + this.rng() * 100); // 150-250 km/h base
            this.laps.push(1);
        }
    }

    /**
     * Advance simulation by deltaMs
     */
    advance(deltaMs: number): void {
        this.simulationTimeMs += deltaMs;

        const lapLength = 1.0; // Full lap = 1.0
        const avgLapTimeMs = 90000; // 90 second lap
        const distPerMs = lapLength / avgLapTimeMs;

        for (let i = 0; i < this.carCount; i++) {
            // Add some randomness to speed
            const speedFactor = 0.95 + this.rng() * 0.1;
            const dist = distPerMs * deltaMs * speedFactor;

            // Simulate battles - cars close together move at similar speeds
            if (i > 0 && this.lapDistPcts[i] - this.lapDistPcts[i - 1] < 0.02) {
                // In a battle, slightly randomize who's faster
                const battleFactor = 0.99 + this.rng() * 0.02;
                this.lapDistPcts[i] += dist * battleFactor;
            } else {
                this.lapDistPcts[i] += dist;
            }

            // Handle lap completion
            if (this.lapDistPcts[i] >= 1.0) {
                this.lapDistPcts[i] -= 1.0;
                this.laps[i]++;

                if (i === 0) {
                    this.currentLap = this.laps[0];
                }
            }

            // Update speed with variation
            this.speeds[i] = 150 + Math.sin(this.simulationTimeMs / 1000 + i) * 50 + this.rng() * 50;
        }

        // Occasionally swap positions (battles/overtakes)
        if (this.rng() < 0.02) { // 2% chance per tick
            const idx = Math.floor(this.rng() * (this.carCount - 1));
            [this.positions[idx], this.positions[idx + 1]] = [this.positions[idx + 1], this.positions[idx]];
        }
    }

    /**
     * Generate timing data at current state
     */
    generateTiming(): SessionTiming {
        const entries: TimingEntry[] = this.drivers.map((driver, i) => ({
            driverId: driver.driverId,
            driverName: driver.driverName,
            carNumber: driver.carNumber,
            teamName: driver.teamName,
            position: this.positions[i],
            lapNumber: this.laps[i],
            lapDistPct: this.lapDistPcts[i],
            lastLapTime: 88000 + this.rng() * 4000, // 88-92 seconds
            bestLapTime: 87000 + this.rng() * 2000, // 87-89 seconds
            gapToLeader: i * (0.5 + this.rng() * 1.5),
            speed: this.speeds[i],
            sector: Math.floor(this.lapDistPcts[i] * 3) + 1,
            inPit: false,
            retired: false
        }));

        // Sort by position
        entries.sort((a, b) => a.position - b.position);

        return {
            sessionId: this.sessionId,
            entries,
            sessionState: 'racing',
            sessionTimeElapsed: this.simulationTimeMs / 1000,
            sessionTimeRemaining: 3600 - this.simulationTimeMs / 1000,
            lapsRemaining: 50 - this.currentLap,
            leaderId: this.drivers[0].driverId,
            fastestLap: {
                driverId: this.drivers[0].driverId,
                time: 87500,
                lap: Math.max(1, this.currentLap - 1)
            },
            timestamp: Date.now()
        };
    }

    /**
     * Generate thin frame data at current state
     */
    generateFrame(): ThinTelemetryFrame {
        // Pick a "featured" driver based on time
        const featuredIdx = Math.floor((this.simulationTimeMs / 5000) % this.carCount);
        const driver = this.drivers[featuredIdx];

        return {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            speed: this.speeds[featuredIdx],
            gear: Math.floor(1 + this.speeds[featuredIdx] / 50),
            rpm: 5000 + this.speeds[featuredIdx] * 40,
            lap: this.laps[featuredIdx],
            lapProgress: this.lapDistPcts[featuredIdx],
            position: this.positions[featuredIdx],
            throttle: 0.3 + this.rng() * 0.7,
            brake: this.rng() < 0.2 ? this.rng() * 0.5 : 0,
            driverId: driver.driverId
        };
    }

    /**
     * Occasionally generate an incident (low probability)
     */
    maybeGenerateIncident(): { type: string; drivers: string[] } | null {
        if (this.rng() < 0.001) { // 0.1% chance per tick
            const idx1 = Math.floor(this.rng() * this.carCount);
            const idx2 = Math.floor(this.rng() * this.carCount);

            return {
                type: this.rng() < 0.5 ? 'contact' : 'off-track',
                drivers: [this.drivers[idx1].driverName, this.drivers[idx2].driverName]
            };
        }
        return null;
    }

    getSessionId(): string {
        return this.sessionId;
    }

    getTrackName(): string {
        return this.trackName;
    }

    getCarCount(): number {
        return this.carCount;
    }
}
