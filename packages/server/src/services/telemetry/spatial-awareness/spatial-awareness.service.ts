/**
 * Spatial Awareness Service
 * The "World Model" core.
 */

import { EventEmitter } from 'events';
import { Kinematics, type CarState } from './kinematics.js';
import { SpatialStateMachine } from './state-machine.js';
import { EVENTS } from '@controlbox/protocol';
import type { TelemetrySnapshot } from '@controlbox/protocol';
import { WorldSnapshot } from './snapshot.js';

export class SpatialAwarenessService extends EventEmitter {
    private carStates: Map<string, CarState> = new Map();
    private stateMachine: SpatialStateMachine = new SpatialStateMachine();
    // 1D Spatial Hash: buckets[bucketIndex] = [carId, carId]
    private buckets: Map<number, string[]> = new Map();
    private readonly BUCKET_SIZE_METERS = 500;
    private trackLength = 4000; // Default, should update from session

    // Snapshot Buffer (30 seconds @ 60Hz = 1800 frames, but maybe we subsample)
    // Let's store last 30 seconds.
    private snapshots: WorldSnapshot[] = [];
    private readonly MAX_SNAPSHOTS = 1800;

    constructor() {
        super();
    }

    private lastSnapshotTime = 0;
    private readonly SNAPSHOT_INTERVAL_MS = 100; // 10Hz

    public processTelemetry(snapshot: TelemetrySnapshot) {
        // 1. Update World Model
        this.updateWorldModel(snapshot);

        // 2. Run Spatial Analysis (Pruned O(N^2))
        const now = Date.now();
        this.analyzeSpatialRelationships(now);

        // 3. Detect 3-Wide
        this.detectThreeWide(now);

        // 4. Capture Snapshot (Throttled to 10Hz)
        // Optimization: Deep cloning is expensive. We only need history at 10Hz for evidence.
        if (now - this.lastSnapshotTime >= this.SNAPSHOT_INTERVAL_MS) {
            this.captureSnapshot(now, snapshot.sessionId || 'unknown');
            this.lastSnapshotTime = now;
        }
    }

    public getCarState(carId: string): CarState | undefined {
        return this.carStates.get(carId);
    }

    public getSnapshot(timestamp: number, toleranceMs = 100): WorldSnapshot | undefined {
        // ... (existing) ...
        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            if (Math.abs(this.snapshots[i].timestamp - timestamp) < toleranceMs) {
                return this.snapshots[i];
            }
        }
        return undefined;
    }

    public getRecentSnapshots(): WorldSnapshot[] {
        return this.snapshots;
    }

    private captureSnapshot(now: number, sessionId: string) {
        // Deep clone car states
        const carsClone = new Map<string, CarState>();
        this.carStates.forEach((val, key) => {
            carsClone.set(key, { ...val, velocity: { ...val.velocity } });
        });

        const snapshot: WorldSnapshot = {
            timestamp: now,
            sessionId,
            cars: carsClone,
            events: [] // TODO: Collect events emitted during this tick?
        };

        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.MAX_SNAPSHOTS) {
            this.snapshots.shift();
        }
    }

    private updateWorldModel(snapshot: TelemetrySnapshot) {
        this.buckets.clear();

        // In a real implementation, we'd get track length from SessionMetadata
        // For now, assume fixed or update dynamically if available

        snapshot.cars.forEach(car => {
            // Normalize inputs
            // Assuming car.pos.s is 0-1
            const lapDistPct = car.pos.s;

            // Approximate lane offset from track_pct if not explicitly provided
            // Valid range is roughly -1 to 1. 0 is center.
            // This needs a real track map to correspond lat/lon to lane, 
            // but for now we might use normalized track width if available
            // or infer from lateral velocity/position relative to racing line.
            // Placeholder: using 0 for now.
            const laneOffset = 0;

            const state: CarState = {
                id: car.carId.toString(),
                lapDistPct,
                trackLengthMeters: this.trackLength,
                velocity: { x: car.velocityX, y: car.velocityY },
                trackWidth: 10, // m
                laneOffset
            };

            this.carStates.set(state.id, state);

            // Spatial Hash
            const bucket = Math.floor((lapDistPct * this.trackLength) / this.BUCKET_SIZE_METERS);
            if (!this.buckets.has(bucket)) this.buckets.set(bucket, []);
            this.buckets.get(bucket)!.push(state.id);
        });
    }

    private analyzeSpatialRelationships(now: number) {
        const processedPairs = new Set<string>();

        this.carStates.forEach(carA => {
            const bucket = Math.floor((carA.lapDistPct * this.trackLength) / this.BUCKET_SIZE_METERS);

            // Check current and adjacent buckets (wrap around handled logically)
            const bucketsToCheck = [bucket, bucket - 1, bucket + 1];

            bucketsToCheck.forEach(b => {
                const candidates = this.buckets.get(b) || [];
                candidates.forEach(carBId => {
                    if (carA.id === carBId) return;

                    const pairKey = [carA.id, carBId].sort().join(':');
                    if (processedPairs.has(pairKey)) return;
                    processedPairs.add(pairKey);

                    const carB = this.carStates.get(carBId)!;
                    this.checkPair(carA, carB, now);
                });
            });
        });
    }

    private checkPair(carA: CarState, carB: CarState, now: number) {
        const gap = Kinematics.getLongitudinalGap(carA.lapDistPct, carB.lapDistPct, this.trackLength);
        const overlap = Kinematics.calculateOverlap(gap);

        // Update State Machine
        const stateChanged = this.stateMachine.update(carA.id, carB.id, overlap, now);

        if (stateChanged) {
            // const newState = this.stateMachine.getState(carA.id, carB.id);
            // const side = Kinematics.getRelativeSide(carA, carB);

            // Emit Event
            // We need to map this to the specific schema
            // For now, just a raw emit
            /*
            this.emit(EVENTS.INTELLIGENCE.V1.OVERLAP, {
                type: 'overlap_state_changed',
                carA: carA.id,
                carB: carB.id,
                side: side || 'BOTH', 
                overlapPercentage: overlap,
                // ...
            });
            */
            // Note: In real impl, we'd emit proper Protocol objects
        }
    }

    private detectThreeWide(_now: number) {
        // Iterate through populated buckets
        for (const [_, carIds] of this.buckets.entries()) {
            if (carIds.length < 3) continue;

            // Check every combination of 3 cars in this bucket
            // This is O(k^3) where k is cars in bucket. Since k is small (max ~5-6 in 500m), this is fast.
            for (let i = 0; i < carIds.length; i++) {
                for (let j = i + 1; j < carIds.length; j++) {
                    for (let k = j + 1; k < carIds.length; k++) {
                        const idA = carIds[i];
                        const idB = carIds[j];
                        const idC = carIds[k];

                        const carA = this.carStates.get(idA)!;
                        const carB = this.carStates.get(idB)!;
                        const carC = this.carStates.get(idC)!;

                        if (this.areThreeWide(carA, carB, carC)) {
                            // Sort by lane (left to right)
                            const cars = [carA, carB, carC].sort((a, b) => a.laneOffset - b.laneOffset);

                            // Emit Event (Debouncing would be handled here in a real impl)
                            this.emit((EVENTS as any).INTELLIGENCE.V1.THREE_WIDE, {
                                type: 'three_wide_detected',
                                cars: cars.map(c => c.id),
                                lapDistPct: carA.lapDistPct, // Approximate center
                                confidence: 0.8
                            });
                        }
                    }
                }
            }
        }
    }

    private areThreeWide(a: CarState, b: CarState, c: CarState): boolean {
        // Must all overlap each other significantly
        const gapAB = Kinematics.getLongitudinalGap(a.lapDistPct, b.lapDistPct, this.trackLength);
        const gapBC = Kinematics.getLongitudinalGap(b.lapDistPct, c.lapDistPct, this.trackLength);
        const gapAC = Kinematics.getLongitudinalGap(a.lapDistPct, c.lapDistPct, this.trackLength);

        const overlapAB = Kinematics.calculateOverlap(gapAB);
        const overlapBC = Kinematics.calculateOverlap(gapBC);
        const overlapAC = Kinematics.calculateOverlap(gapAC);

        const THRESHOLD = 0.4; // 40% overlap required for "3-wide" call
        return overlapAB > THRESHOLD && overlapBC > THRESHOLD && overlapAC > THRESHOLD;
    }
}
