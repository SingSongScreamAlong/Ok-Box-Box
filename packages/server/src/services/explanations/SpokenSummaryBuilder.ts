import { GroundedFactPacket, ContactFacts } from './types.js';

export class SpokenSummaryBuilder {

    /**
     * Converts a grounded fact packet into a short, human-readable summary.
     * Returns null if confidence is too low.
     */
    public buildSpokenSummary(packet: GroundedFactPacket): string | null {
        // 1. Confidence Gating
        if (packet.confidence < 0.70) {
            return null; // Too uncertain, say nothing.
        }

        const isHedged = packet.confidence < 0.80;
        const prefix = isHedged ? "It looked like " : "";

        // 2. Switch by Type
        switch (packet.type) {
            case 'CONTACT_EXPLANATION':
                return this.summarizeContact(packet.facts as ContactFacts, prefix);
            case 'THREE_WIDE_EXPLANATION':
                return this.summarizeThreeWide(prefix); // TODO
            case 'OFFTRACK_EXPLANATION':
                return this.summarizeOfftrack(prefix); // TODO
            default:
                return null;
        }
    }

    private summarizeContact(facts: ContactFacts, prefix: string): string {
        // Strategy: Focus on Overlap and Turn-In

        if (facts.overlapStateAtTurnIn === 'CLEAR') {
            return prefix + "you were not fully alongside at turn-in. You need more overlap next time.";
        }

        if (facts.overlapPctAtTurnIn && facts.overlapPctAtTurnIn > 0.4) {
            // Significant overlap
            if (facts.turnInDeltaMs && facts.turnInDeltaMs < -0.1) {
                return prefix + "you were alongside. They turned in early on you.";
            }
            return prefix + "you had the corner. They didn't leave you racing room.";
        }

        if (facts.overlapPctAtTurnIn && facts.overlapPctAtTurnIn <= 0.4) {
            // Marginal overlap
            return prefix + "it was a bold move. You barely had a nose in there.";
        }

        return prefix + "contact reported. Check your relative speed.";
    }

    private summarizeThreeWide(prefix: string): string {
        return prefix + "three wide hazard. Pick a lane and stay consistent.";
    }

    private summarizeOfftrack(prefix: string): string {
        return prefix + "you went wide. Watch the track limits.";
    }

    /**
     * Secondary Output: Evidence Line (Details on Demand)
     * Technical, precise, no hedging.
     */
    public buildEvidenceLine(packet: GroundedFactPacket): string {
        const timeStr = packet.eventTime.toFixed(1);

        if (packet.type === 'CONTACT_EXPLANATION') {
            const f = packet.facts as ContactFacts;
            const pct = f.overlapPctAtTurnIn ? (f.overlapPctAtTurnIn * 100).toFixed(0) + '%' : 'unknown';
            const state = f.overlapStateAtTurnIn || 'unknown';
            return `At ${timeStr}s, overlap was ${pct} (${state}).`;
        }

        return "No detailed evidence available for this event type.";
    }
}
