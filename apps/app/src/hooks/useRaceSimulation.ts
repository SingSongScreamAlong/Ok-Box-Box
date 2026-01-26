
import { useState, useEffect, useRef } from 'react';

/*
  useRaceSimulation: The "Demo Mode" Engine
  - Simulates a car driving around the track loop (0-1 progress).
  - Generates variable speed based on "corners" (slowing down) vs "straights" (speeding up).
  - Can simulate opponent cars ("ghosts") with offset positions.
*/

interface SimulationConfig {
    trackLength?: number; // meters, default 5000
    baseLapTime?: number; // seconds, default 90
    isPlaying?: boolean;
}

export interface SimCar {
    id: string;
    name: string;
    trackPercentage: number; // 0-1
    speed: number; // km/h
    color?: string;
    isGhost?: boolean;
}

export function useRaceSimulation({ trackLength = 5730, baseLapTime = 100, isPlaying = true }: SimulationConfig = {}) {
    const [player, setPlayer] = useState<SimCar>({ id: 'player', name: 'Player', trackPercentage: 0, speed: 0 });
    const [opponents, setOpponents] = useState<SimCar[]>([]);

    const lastUpdateRef = useRef<number>(Date.now());
    const progressRef = useRef<number>(0);

    // Initialize Ghosts once
    useEffect(() => {
        setOpponents([
            { id: 'ghost1', name: 'VER', trackPercentage: 0.05, speed: 0, color: '#1e3a8a', isGhost: true }, // Ahead
            { id: 'ghost2', name: 'HAM', trackPercentage: 0.98, speed: 0, color: '#06b6d4', isGhost: true }, // Behind
        ]);
    }, []);

    useEffect(() => {
        if (!isPlaying) return;

        let frameId: number;

        const tick = () => {
            const now = Date.now();
            const dt = (now - lastUpdateRef.current) / 1000; // time delta in seconds
            lastUpdateRef.current = now;

            // PHYSICS SIMULATION 🏎️
            // We simulate speed based on position (roughly). 
            // 0-1 progress. Let's say:
            // 0.0 - 0.1: Slow (Turn 1)
            // 0.1 - 0.4: Fast (Oval/Straight)
            // 0.4 - 0.6: Medium (Bus Stop)
            // 0.6 - 1.0: Fast (Oval)

            const p = progressRef.current;

            let targetSpeed = 300; // default straight
            // Simple functional slowing zones
            if (p > 0.02 && p < 0.08) targetSpeed = 80;  // Turn 1
            if (p > 0.48 && p < 0.55) targetSpeed = 100; // Bus Stop
            if (p > 0.80 && p < 0.85) targetSpeed = 290; // Tri-oval kink

            // Lerp speed
            // In a real hook we'd carry velocity state, but for mock display this is fine
            const currentSpeed = 300; // Just use target for now for smoothness, or lerp

            // Update Position
            // Distance = Speed * Time
            // % Delta = (Speed_m_s * dt) / TrackLength
            const speedMs = targetSpeed * 0.277778; // kmh to ms
            const deltaPct = (speedMs * dt) / trackLength;

            progressRef.current = (progressRef.current + deltaPct) % 1.0;

            // Update State
            setPlayer({
                id: 'player',
                name: 'Player',
                trackPercentage: progressRef.current,
                speed: targetSpeed
            });

            // Move opponents slightly differently to create "Battles"
            setOpponents(prev => prev.map(opp => {
                const oppSpeed = targetSpeed * (opp.id === 'ghost1' ? 1.01 : 0.99); // create drift
                const oppDelta = (oppSpeed * 0.277778 * dt) / trackLength;
                return {
                    ...opp,
                    trackPercentage: (opp.trackPercentage + oppDelta) % 1.0,
                    speed: oppSpeed
                };
            }));

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, trackLength]);

    return { player, opponents };
}
