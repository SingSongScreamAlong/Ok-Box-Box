import { GroundedFactPacket, ContactFacts, ThreeWideFacts, OfftrackFacts } from './types.js';
import { WorldSnapshot } from '../telemetry/spatial-awareness/snapshot.js';

// Constants
const CAR_LENGTH_M = 4.5;
const CAR_WIDTH_M = 2.0;
const TRACK_LENGTH_M = 4000; // Default, ideally from track config
const TURN_IN_LOOKBACK_SEC = 1.5;
const APEX_LOOKFORWARD_SEC = 0.5;

export class ExplanationBuilder {

    /**
     * Build an explanation for a contact event using historical snapshots.
     * COMPLETE FACT EXTRACTION for AI-grounded explanations.
     */
    public buildContactExplanation(
        primaryCarId: string,
        secondaryCarId: string,
        impactTime: number,
        snapshots: WorldSnapshot[]
    ): GroundedFactPacket | null {

        // 1. Find the snapshot at impact
        const impactSnap = this.findClosestSnapshot(snapshots, impactTime);
        if (!impactSnap) return null;

        // 2. Find the "Turn In" moment (1.5 seconds before impact)
        const turnInTime = impactTime - TURN_IN_LOOKBACK_SEC;
        const turnInSnap = this.findClosestSnapshot(snapshots, turnInTime);
        if (!turnInSnap) return null;

        // 3. Get car states at both moments
        const pCarImpact = impactSnap.cars.get(primaryCarId);
        const sCarImpact = impactSnap.cars.get(secondaryCarId);
        const pCarTurnIn = turnInSnap.cars.get(primaryCarId);
        const sCarTurnIn = turnInSnap.cars.get(secondaryCarId);

        if (!pCarTurnIn || !sCarTurnIn || !pCarImpact || !sCarImpact) return null;

        // 4. Calculate ALL Facts
        const facts: ContactFacts = {};

        // =========================================================
        // OVERLAP AT TURN-IN
        // =========================================================
        const distAtTurnIn = this.calculateLongitudinalDistance(
            pCarTurnIn.lapDistPct,
            sCarTurnIn.lapDistPct,
            TRACK_LENGTH_M
        );

        if (distAtTurnIn < CAR_LENGTH_M) {
            facts.overlapPctAtTurnIn = Math.max(0, (CAR_LENGTH_M - distAtTurnIn) / CAR_LENGTH_M);
            facts.overlapStateAtTurnIn = sCarTurnIn.laneOffset > pCarTurnIn.laneOffset ? 'RIGHT' : 'LEFT';
        } else {
            facts.overlapPctAtTurnIn = 0;
            facts.overlapStateAtTurnIn = 'CLEAR';
        }

        // =========================================================
        // TURN-IN DELTA (who committed to corner first)
        // =========================================================
        // Heuristic: Higher lateral G at turn-in = committed earlier
        const pLateralG = Math.abs(pCarTurnIn.lateralG || 0);
        const sLateralG = Math.abs(sCarTurnIn.lateralG || 0);

        // Estimate: 0.5G difference = ~200ms turn-in delta
        const gDiff = pLateralG - sLateralG;
        facts.turnInDeltaMs = Math.round(gDiff * 400); // Positive = primary turned in earlier

        // =========================================================
        // RACING ROOM AT APEX
        // =========================================================
        // Look slightly forward to estimate apex spacing
        const apexTime = impactTime + APEX_LOOKFORWARD_SEC;
        const apexSnap = this.findClosestSnapshot(snapshots, apexTime);

        if (apexSnap) {
            const pCarApex = apexSnap.cars.get(primaryCarId);
            const sCarApex = apexSnap.cars.get(secondaryCarId);

            if (pCarApex && sCarApex) {
                // Lateral separation in meters
                const lateralSep = Math.abs(pCarApex.laneOffset - sCarApex.laneOffset);
                // Racing room = separation minus car widths
                facts.racingRoomAtApexM = Math.max(0, lateralSep - CAR_WIDTH_M);
            }
        }

        // =========================================================
        // CLOSING SPEED
        // =========================================================
        const pSpeed = Math.sqrt(
            pCarTurnIn.velocity.x ** 2 +
            pCarTurnIn.velocity.y ** 2
        );
        const sSpeed = Math.sqrt(
            sCarTurnIn.velocity.x ** 2 +
            sCarTurnIn.velocity.y ** 2
        );
        facts.closingSpeedKph = Math.abs(pSpeed - sSpeed) * 3.6;

        // =========================================================
        // CONTACT POINT ESTIMATION
        // =========================================================
        facts.contactPoint = this.estimateContactPoint(
            pCarImpact.laneOffset,
            sCarImpact.laneOffset,
            pCarImpact.lapDistPct - sCarImpact.lapDistPct
        );

        // =========================================================
        // RELATIVE SPEED AT IMPACT
        // =========================================================
        const pImpactSpeed = Math.sqrt(
            pCarImpact.velocity.x ** 2 +
            pCarImpact.velocity.y ** 2
        );
        const sImpactSpeed = Math.sqrt(
            sCarImpact.velocity.x ** 2 +
            sCarImpact.velocity.y ** 2
        );
        facts.relativeSpeedKph = Math.abs(pImpactSpeed - sImpactSpeed) * 3.6;

        // 5. Construct Packet
        return {
            type: 'CONTACT_EXPLANATION',
            sessionId: impactSnap.sessionId,
            eventTime: impactTime,
            cars: { primary: primaryCarId, secondary: secondaryCarId },
            facts,
            confidence: this.calculateConfidence(facts)
        };
    }

    /**
     * Build explanation for three-wide situations
     */
    public buildThreeWideExplanation(
        leftCarId: string,
        middleCarId: string,
        rightCarId: string,
        startTime: number,
        snapshots: WorldSnapshot[]
    ): GroundedFactPacket | null {
        const startSnap = this.findClosestSnapshot(snapshots, startTime);
        if (!startSnap) return null;

        const leftCar = startSnap.cars.get(leftCarId);
        const middleCar = startSnap.cars.get(middleCarId);
        const rightCar = startSnap.cars.get(rightCarId);

        if (!leftCar || !middleCar || !rightCar) return null;

        // Calculate lateral separation
        const leftMiddleSep = Math.abs(leftCar.laneOffset - middleCar.laneOffset);
        const middleRightSep = Math.abs(middleCar.laneOffset - rightCar.laneOffset);
        const avgSeparation = (leftMiddleSep + middleRightSep) / 2;

        // Estimate duration by scanning forward
        let duration = 0;
        for (let t = startTime; t < startTime + 5; t += 0.1) {
            const snap = this.findClosestSnapshot(snapshots, t);
            if (!snap) break;

            const l = snap.cars.get(leftCarId);
            const m = snap.cars.get(middleCarId);
            const r = snap.cars.get(rightCarId);

            if (!l || !m || !r) break;

            // Check if still 3-wide (all within reasonable distance)
            const totalWidth = Math.abs(l.laneOffset - r.laneOffset);
            if (totalWidth > 4 * CAR_WIDTH_M) break; // No longer 3-wide

            duration = t - startTime;
        }

        const facts: ThreeWideFacts = {
            position: 'MIDDLE', // For middle car perspective
            lateralSeparationM: avgSeparation,
            durationSeconds: duration
        };

        return {
            type: 'THREE_WIDE_EXPLANATION',
            sessionId: startSnap.sessionId,
            eventTime: startTime,
            cars: { primary: middleCarId, secondary: leftCarId, tertiary: rightCarId },
            facts,
            confidence: duration > 0.5 ? 0.9 : 0.6
        };
    }

    /**
     * Build explanation for off-track excursions
     */
    public buildOfftrackExplanation(
        carId: string,
        offtrackTime: number,
        snapshots: WorldSnapshot[]
    ): GroundedFactPacket | null {
        const snap = this.findClosestSnapshot(snapshots, offtrackTime);
        if (!snap) return null;

        const car = snap.cars.get(carId);
        if (!car) return null;

        // Estimate how far off track (lane offset > 1.0 = off track)
        const marginM = Math.max(0, (Math.abs(car.laneOffset) - 1.0) * 5); // Rough meters

        // Try to determine reason
        let reason: 'LOCKED_UP' | 'FORCED_WIDE' | 'LOST_TRACTION' | undefined;

        // Check for high longitudinal decel (lockup)
        if (car.longitudinalG && car.longitudinalG < -1.5) {
            reason = 'LOCKED_UP';
        }
        // Check for contact (forced wide)
        else if (snap.cars.size > 1) {
            // Look for nearby car
            for (const [otherId, otherCar] of snap.cars) {
                if (otherId === carId) continue;
                const dist = this.calculateLongitudinalDistance(
                    car.lapDistPct,
                    otherCar.lapDistPct,
                    TRACK_LENGTH_M
                );
                if (dist < CAR_LENGTH_M * 1.5) {
                    reason = 'FORCED_WIDE';
                    break;
                }
            }
        }

        if (!reason) {
            reason = 'LOST_TRACTION';
        }

        const facts: OfftrackFacts = {
            marginM,
            reason
        };

        return {
            type: 'OFFTRACK_EXPLANATION',
            sessionId: snap.sessionId,
            eventTime: offtrackTime,
            cars: { primary: carId },
            facts,
            confidence: 0.8
        };
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private findClosestSnapshot(snapshots: WorldSnapshot[], timestamp: number): WorldSnapshot | undefined {
        let best: WorldSnapshot | undefined;
        let minDiff = Infinity;

        for (const s of snapshots) {
            const diff = Math.abs(s.timestamp - timestamp);
            if (diff < minDiff) {
                minDiff = diff;
                best = s;
            }
        }

        // If > 200ms off, data might be missing
        if (minDiff > 0.2) return undefined;
        return best;
    }

    private calculateLongitudinalDistance(
        lapDistPct1: number,
        lapDistPct2: number,
        trackLengthM: number
    ): number {
        // Handle wraparound at start/finish
        let delta = Math.abs(lapDistPct1 - lapDistPct2);
        if (delta > 0.5) delta = 1 - delta; // Wraparound
        return delta * trackLengthM;
    }

    private estimateContactPoint(
        pLaneOffset: number,
        sLaneOffset: number,
        lapDistDelta: number
    ): string {
        // Determine lateral relationship
        const lateral = pLaneOffset > sLaneOffset ? 'R' : 'L';

        // Determine longitudinal relationship
        const longitudinal = lapDistDelta > 0 ? 'F' : 'R';

        // Primary car's contact corner
        const pCorner = `${lateral}${longitudinal}`;

        // Secondary car's opposite corner
        const sLateral = pLaneOffset > sLaneOffset ? 'L' : 'R';
        const sLongitudinal = lapDistDelta > 0 ? 'R' : 'F';
        const sCorner = `${sLateral}${sLongitudinal}`;

        return `${pCorner}->${sCorner}`;
    }

    private calculateConfidence(facts: ContactFacts): number {
        let score = 0.7; // Base confidence

        // High overlap = high confidence
        if (facts.overlapPctAtTurnIn && facts.overlapPctAtTurnIn > 0.4) {
            score += 0.2;
        }
        // Marginal overlap = lower confidence
        else if (facts.overlapPctAtTurnIn && facts.overlapPctAtTurnIn < 0.1 && facts.overlapPctAtTurnIn > 0) {
            score -= 0.2;
        }

        // Racing room data available = higher confidence
        if (facts.racingRoomAtApexM !== undefined) {
            score += 0.1;
        }

        // Contact point estimated = higher confidence
        if (facts.contactPoint) {
            score += 0.05;
        }

        return Math.min(Math.max(score, 0.3), 1.0);
    }
}
