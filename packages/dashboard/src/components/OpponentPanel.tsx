/**
 * Opponent Panel Component
 * Displays inferred opponent strategy and threat levels.
 */

import React, { useEffect, useState } from 'react';
import { useSessionSocket } from '../hooks/useSessionSocket';
import './OpponentPanel.css';

interface OpponentModel {
    driverId: string;
    driverName: string;
    currentStintLaps: number;
    inferredTireAge: number;
    inferredDegradation?: {
        slope: number;
        r2: number;
    };
    inferredFuelLoad?: 'heavy' | 'medium' | 'light';
    predictedPitWindow?: { earliest: number; latest: number };
    predictedCliffLap?: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceScore: number;
}

interface OpponentIntelEvent {
    sessionId: string;
    timestamp: number;
    opponents: OpponentModel[];
}

export const OpponentPanel: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const { socket, isConnected } = useSessionSocket(sessionId);
    const [opponents, setOpponents] = useState<OpponentModel[]>([]);
    const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        const handleOpponentIntel = (data: OpponentIntelEvent) => {
            // Sort by threat level
            const sorted = [...(data.opponents || [])].sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return order[a.threatLevel] - order[b.threatLevel];
            });
            setOpponents(sorted);
        };

        socket.on('opponent:intel', handleOpponentIntel);

        return () => {
            socket.off('opponent:intel', handleOpponentIntel);
        };
    }, [socket]);

    const getThreatColor = (level: string) => {
        switch (level) {
            case 'critical': return '#ef4444';
            case 'high': return '#f59e0b';
            case 'medium': return '#facc15';
            default: return '#4ade80';
        }
    };

    const getThreatEmoji = (level: string) => {
        switch (level) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            default: return '🟢';
        }
    };

    if (!isConnected) {
        return (
            <div className="opponent-panel disconnected">
                <span>⚠️ Disconnected</span>
            </div>
        );
    }

    return (
        <div className="opponent-panel">
            <h3>🎯 Opponent Intel</h3>

            {opponents.length > 0 ? (
                <div className="opponent-list">
                    {opponents.map(opp => (
                        <div
                            key={opp.driverId}
                            className={`opponent-card ${opp.threatLevel}`}
                            onClick={() => setExpandedDriver(
                                expandedDriver === opp.driverId ? null : opp.driverId
                            )}
                            style={{ borderColor: getThreatColor(opp.threatLevel) }}
                        >
                            <div className="opponent-header">
                                <span className="threat-emoji">{getThreatEmoji(opp.threatLevel)}</span>
                                <span className="driver-name">{opp.driverName}</span>
                                <span
                                    className="threat-badge"
                                    style={{ background: getThreatColor(opp.threatLevel) }}
                                >
                                    {opp.threatLevel.toUpperCase()}
                                </span>
                            </div>

                            <div className="opponent-quick-stats">
                                <span>Stint: {opp.currentStintLaps} laps</span>
                                {opp.predictedPitWindow && (
                                    <span>
                                        Pit: L{opp.predictedPitWindow.earliest}-{opp.predictedPitWindow.latest}
                                    </span>
                                )}
                            </div>

                            {expandedDriver === opp.driverId && (
                                <div className="opponent-details">
                                    <div className="detail-row">
                                        <span className="label">Tire Age</span>
                                        <span className="value">{opp.inferredTireAge} laps</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Deg Slope</span>
                                        <span className="value">
                                            {opp.inferredDegradation
                                                ? `+${opp.inferredDegradation.slope.toFixed(3)}s/lap`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Fuel Load</span>
                                        <span className="value fuel-load">
                                            {opp.inferredFuelLoad || 'Unknown'}
                                        </span>
                                    </div>
                                    {opp.predictedCliffLap && (
                                        <div className="detail-row warning">
                                            <span className="label">⚠️ Cliff Predicted</span>
                                            <span className="value">Lap {opp.predictedCliffLap}</span>
                                        </div>
                                    )}
                                    <div className="detail-row confidence">
                                        <span className="label">Confidence</span>
                                        <div className="confidence-bar">
                                            <div
                                                className="confidence-fill"
                                                style={{ width: `${opp.confidenceScore * 100}%` }}
                                            />
                                        </div>
                                        <span className="value">{Math.round(opp.confidenceScore * 100)}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="opponent-empty">
                    <p>No opponent intel available yet.</p>
                    <p className="hint">Data builds as laps are completed.</p>
                </div>
            )}
        </div>
    );
};

export default OpponentPanel;
