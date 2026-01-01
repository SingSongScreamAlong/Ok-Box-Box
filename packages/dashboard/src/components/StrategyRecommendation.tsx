/**
 * Strategy Recommendation Component
 * Displays AI-powered strategic recommendations.
 */

import React, { useEffect, useState } from 'react';
import { useSessionSocket } from '../hooks/useSessionSocket';
import './StrategyRecommendation.css';

interface StrategicRecommendation {
    action: 'stay_out' | 'box_now' | 'box_next_lap' | 'box_in_N_laps' | 'defend' | 'attack';
    laps?: number;
    reason: string;
    confidence: number;
    alternativeActions: string[];
}

interface ThreatAssessment {
    driver: string;
    driverName: string;
    currentGap: number;
    closingRate: number;
    lapsUntilCatch: number;
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'imminent';
    recommendation: string;
}

interface StrategyIntelEvent {
    sessionId: string;
    timestamp: number;
    recommendation?: StrategicRecommendation;
    threats?: ThreatAssessment[];
}

export const StrategyRecommendation: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const { socket, isConnected } = useSessionSocket(sessionId);
    const [recommendation, setRecommendation] = useState<StrategicRecommendation | null>(null);
    const [threats, setThreats] = useState<ThreatAssessment[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleStrategyIntel = (data: StrategyIntelEvent) => {
            if (data.recommendation) {
                setRecommendation(data.recommendation);
            }
            if (data.threats) {
                setThreats(data.threats);
            }
        };

        socket.on('strategy:intel', handleStrategyIntel);

        return () => {
            socket.off('strategy:intel', handleStrategyIntel);
        };
    }, [socket]);

    const getActionEmoji = (action: string) => {
        switch (action) {
            case 'box_now': return '🚨';
            case 'box_next_lap': return '⚠️';
            case 'box_in_N_laps': return '📍';
            case 'defend': return '🛡️';
            case 'attack': return '⚔️';
            default: return '✅';
        }
    };

    const getActionLabel = (action: string, laps?: number) => {
        switch (action) {
            case 'box_now': return 'BOX NOW';
            case 'box_next_lap': return 'BOX NEXT LAP';
            case 'box_in_N_laps': return `BOX IN ${laps} LAPS`;
            case 'defend': return 'DEFEND';
            case 'attack': return 'ATTACK';
            default: return 'STAY OUT';
        }
    };

    const getActionClass = (action: string) => {
        switch (action) {
            case 'box_now': return 'critical';
            case 'box_next_lap': return 'warning';
            case 'defend': return 'caution';
            case 'attack': return 'positive';
            default: return 'neutral';
        }
    };

    const getThreatEmoji = (level: string) => {
        switch (level) {
            case 'imminent': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    };

    if (!isConnected) {
        return (
            <div className="strategy-rec disconnected">
                <span>⚠️ Disconnected</span>
            </div>
        );
    }

    return (
        <div className="strategy-rec">
            <h3>🧠 Strategy AI</h3>

            {/* Main Recommendation */}
            {recommendation ? (
                <div className={`rec-card ${getActionClass(recommendation.action)}`}>
                    <div className="rec-action">
                        <span className="rec-emoji">{getActionEmoji(recommendation.action)}</span>
                        <span className="rec-label">{getActionLabel(recommendation.action, recommendation.laps)}</span>
                    </div>
                    <div className="rec-reason">{recommendation.reason}</div>
                    <div className="rec-confidence">
                        <span className="label">Confidence</span>
                        <div className="confidence-bar">
                            <div
                                className="confidence-fill"
                                style={{ width: `${recommendation.confidence * 100}%` }}
                            />
                        </div>
                        <span className="value">{Math.round(recommendation.confidence * 100)}%</span>
                    </div>
                    {recommendation.alternativeActions.length > 0 && (
                        <div className="rec-alternatives">
                            <span className="label">Alternatives:</span>
                            {recommendation.alternativeActions.map((alt, i) => (
                                <span key={i} className="alt-action">{alt}</span>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="rec-empty">
                    <p>Analyzing race state...</p>
                </div>
            )}

            {/* Threat List */}
            {threats.length > 0 && (
                <div className="threats-section">
                    <h4>⚠️ Threats</h4>
                    <div className="threats-list">
                        {threats.slice(0, 3).map((threat, i) => (
                            <div key={i} className={`threat-card ${threat.threatLevel}`}>
                                <div className="threat-header">
                                    <span className="threat-emoji">{getThreatEmoji(threat.threatLevel)}</span>
                                    <span className="threat-name">{threat.driverName}</span>
                                    <span className="threat-gap">{threat.currentGap.toFixed(1)}s</span>
                                </div>
                                <div className="threat-detail">
                                    {threat.closingRate > 0 ? (
                                        <span>Catching at {threat.closingRate.toFixed(2)}s/lap • {threat.lapsUntilCatch} laps</span>
                                    ) : (
                                        <span>Gap extending</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyRecommendation;
