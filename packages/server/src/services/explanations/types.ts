/**
 * Grounded Explanation Types
 * Defines the structure for physics-derived fact packets.
 */

export interface GroundedFactPacket {
    type: 'CONTACT_EXPLANATION' | 'THREE_WIDE_EXPLANATION' | 'OFFTRACK_EXPLANATION';
    sessionId: string;
    eventTime: number;
    corner?: string; // e.g. "T5" if mapped

    // Involved parties
    cars: {
        primary: string; // The driver receiving the explanation
        secondary?: string; // The other car involved
        tertiary?: string; // For 3-wide
    };

    // The raw receipts (Physics)
    facts: ContactFacts | ThreeWideFacts | OfftrackFacts;

    // Calculated confidence of this explanation
    confidence: number;
}

export interface ContactFacts {
    overlapPctAtTurnIn?: number;  // 0.0 to 1.0
    overlapStateAtTurnIn?: 'LEFT' | 'RIGHT' | 'CLEAR';
    turnInDeltaMs?: number;       // Negative = other car turned in early
    racingRoomAtApexM?: number;   // Meters of space left
    closingSpeedKph?: number;
    contactPoint?: string;        // e.g. "LF->RR"
    relativeSpeedKph?: number;
}

export interface ThreeWideFacts {
    position: 'LEFT' | 'MIDDLE' | 'RIGHT';
    lateralSeparationM: number;   // Avg space between cars
    durationSeconds: number;      // How long were they 3-wide?
}

export interface OfftrackFacts {
    marginM: number;              // How far off?
    lostTimeSeconds?: number;
    reason?: 'LOCKED_UP' | 'FORCED_WIDE' | 'LOST_TRACTION';
}
