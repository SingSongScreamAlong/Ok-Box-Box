/**
 * Opponent Intelligence Pane
 * Shows threat cards for nearby opponents with clickable evidence.
 */

import React from 'react';
import { ClickableEvidence } from '../EvidencePopover';
import type { OpponentIntelCard, StatusColor } from '../../types/evidence';
import './OpponentIntelPane.css';

interface OpponentIntelPaneProps {
    opponents: OpponentIntelCard[];
    maxVisible?: number;
}

export const OpponentIntelPane: React.FC<OpponentIntelPaneProps> = ({
    opponents,
    maxVisible = 6
}) => {
    // Sort by threat level priority and gap
    const sortedOpponents = [...opponents]
        .sort((a, b) => {
            const priorityOrder: Record<StatusColor, number> = { red: 0, yellow: 1, green: 2, gray: 3 };
            const priorityDiff = priorityOrder[a.threatLevel] - priorityOrder[b.threatLevel];
            if (priorityDiff !== 0) return priorityDiff;
            return Math.abs(a.gap) - Math.abs(b.gap);
        })
        .slice(0, maxVisible);

    return (
        <div className={`opponent-intel-pane ${opponents.length === 0 ? 'no-data' : ''}`}>
            <div className="pane-header">
                <span className="pane-title">Opponent Intelligence</span>
                <span className="opponent-count">
                    {opponents.length > 0 ? `${opponents.length} tracked` : 'Waiting for data...'}
                </span>
            </div>

            <div className="opponents-grid">
                {opponents.length === 0 ? (
                    // Show empty placeholder slots
                    <>
                        <EmptyOpponentSlot position={1} />
                        <EmptyOpponentSlot position={2} />
                        <EmptyOpponentSlot position={3} />
                        <EmptyOpponentSlot position={4} />
                    </>
                ) : (
                    sortedOpponents.map(opp => (
                        <OpponentCard key={opp.carId} opponent={opp} />
                    ))
                )}
            </div>
        </div>
    );
};

// ============================================================================
// EMPTY SLOT PLACEHOLDER
// ============================================================================

const EmptyOpponentSlot: React.FC<{ position: number }> = ({ position }) => {
    return (
        <div className="opponent-card-wrapper empty-slot">
            <div className="opponent-card gray">
                <div className="card-header">
                    <span className="car-number">#—</span>
                    <span className="position">P{position}</span>
                </div>
                <div className="driver-name">—</div>
                <div className="gap-row">
                    <span className="gap-value">+0.0s</span>
                    <span className="gap-trend stable">➡️</span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// OPPONENT CARD
// ============================================================================

const OpponentCard: React.FC<{ opponent: OpponentIntelCard }> = ({ opponent }) => {
    const gapSign = opponent.gap >= 0 ? '+' : '';
    const gapDisplay = `${gapSign}${opponent.gap.toFixed(1)}s`;

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'closing': return '⬆️';
            case 'extending': return '⬇️';
            default: return '➡️';
        }
    };

    const getTirePhaseLabel = (phase?: string) => {
        if (!phase || phase === 'unknown') return null;
        const labels: Record<string, string> = {
            fresh: '🟢 Fresh',
            optimal: '🟡 Optimal',
            degraded: '🟠 Degraded',
            critical: '🔴 Critical'
        };
        return labels[phase];
    };

    return (
        <ClickableEvidence evidence={opponent.evidence} className="opponent-card-wrapper">
            <div className={`opponent-card ${opponent.threatLevel}`}>
                {/* Header */}
                <div className="card-header">
                    <span className="car-number">#{opponent.carNumber}</span>
                    <span className="position">P{opponent.position}</span>
                </div>

                {/* Driver Name */}
                <div className="driver-name">{opponent.driverName}</div>

                {/* Gap */}
                <div className="gap-row">
                    <span className="gap-value">{gapDisplay}</span>
                    <span className={`gap-trend ${opponent.gapTrend}`}>
                        {getTrendIcon(opponent.gapTrend)}
                    </span>
                </div>

                {/* Intel Rows */}
                <div className="intel-rows">
                    {/* Pit Window */}
                    {opponent.pitWindow && (
                        <div className="intel-row">
                            <span className="intel-label">Pit</span>
                            <span className="intel-value">
                                L{opponent.pitWindow.earliest}-{opponent.pitWindow.latest}
                            </span>
                        </div>
                    )}

                    {/* Tire Phase */}
                    {getTirePhaseLabel(opponent.tirePhase) && (
                        <div className="intel-row">
                            <span className="intel-label">Tires</span>
                            <span className="intel-value">
                                {getTirePhaseLabel(opponent.tirePhase)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </ClickableEvidence>
    );
};

export default OpponentIntelPane;
