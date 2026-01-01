/**
 * Strategy Panel Component
 * Displays live strategy data: Fuel, Tires, Degradation, Pit Window
 */

import React, { useEffect, useState } from 'react';
import { useSessionSocket } from '../hooks/useSessionSocket';
import './StrategyPanel.css';

interface DriverStrategy {
    driverId: string;
    currentStintLaps: number;
    tireAge: number;
    fuelPct: number;
    fuelPerLap: number;
    degradationSlope: number;
    estimatedLapsRemaining: number;
    projectedCliffLap?: number;
}

interface StrategyUpdate {
    sessionId: string;
    timestamp: number;
    strategy: {
        carId: number;
        fuel: { level: number; pct: number };
        tires: { fl: number; fr: number; rl: number; rr: number };
        damage: { aero: number; engine: number };
        pit: { inLane: boolean; stops: number };
    }[];
}

export const StrategyPanel: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const { socket, isConnected } = useSessionSocket(sessionId);
    const [strategies, setStrategies] = useState<DriverStrategy[]>([]);
    const [rawStrategy, setRawStrategy] = useState<StrategyUpdate | null>(null);

    useEffect(() => {
        if (!socket) return;

        // Listen for processed strategy updates (from StrategyService)
        const handleStrategyUpdate = (data: { drivers: DriverStrategy[] }) => {
            setStrategies(data.drivers || []);
        };

        // Listen for raw strategy data (1Hz from relay)
        const handleRawStrategy = (data: StrategyUpdate) => {
            setRawStrategy(data);
        };

        socket.on('strategy:update', handleStrategyUpdate);
        socket.on('strategy:update', handleRawStrategy);

        return () => {
            socket.off('strategy:update', handleStrategyUpdate);
            socket.off('strategy:update', handleRawStrategy);
        };
    }, [socket]);

    // Get player strategy (first one with meaningful data)
    const playerStrategy = rawStrategy?.strategy?.[0];

    if (!isConnected) {
        return (
            <div className="strategy-panel disconnected">
                <span>⚠️ Disconnected</span>
            </div>
        );
    }

    return (
        <div className="strategy-panel">
            <h3>📊 Strategy</h3>

            {playerStrategy ? (
                <div className="strategy-grid">
                    {/* Fuel Section */}
                    <div className="strategy-card fuel">
                        <div className="card-header">⛽ Fuel</div>
                        <div className="card-value">
                            {(playerStrategy.fuel.pct * 100).toFixed(1)}%
                        </div>
                        <div className="card-detail">
                            {playerStrategy.fuel.level.toFixed(1)} L
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill fuel-fill"
                                style={{ width: `${playerStrategy.fuel.pct * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Tire Wear Section */}
                    <div className="strategy-card tires">
                        <div className="card-header">🛞 Tires</div>
                        <div className="tire-grid">
                            <div className="tire fl">
                                <span className="tire-label">FL</span>
                                <span className="tire-wear">{Math.round(playerStrategy.tires.fl * 100)}%</span>
                            </div>
                            <div className="tire fr">
                                <span className="tire-label">FR</span>
                                <span className="tire-wear">{Math.round(playerStrategy.tires.fr * 100)}%</span>
                            </div>
                            <div className="tire rl">
                                <span className="tire-label">RL</span>
                                <span className="tire-wear">{Math.round(playerStrategy.tires.rl * 100)}%</span>
                            </div>
                            <div className="tire rr">
                                <span className="tire-label">RR</span>
                                <span className="tire-wear">{Math.round(playerStrategy.tires.rr * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Damage Section */}
                    <div className="strategy-card damage">
                        <div className="card-header">💥 Damage</div>
                        <div className="damage-row">
                            <span>Aero</span>
                            <span className={playerStrategy.damage.aero > 0 ? 'damaged' : 'ok'}>
                                {playerStrategy.damage.aero > 0 ? `${Math.round(playerStrategy.damage.aero * 100)}%` : 'OK'}
                            </span>
                        </div>
                        <div className="damage-row">
                            <span>Engine</span>
                            <span className={playerStrategy.damage.engine > 0 ? 'damaged' : 'ok'}>
                                {playerStrategy.damage.engine > 0 ? `${Math.round(playerStrategy.damage.engine * 100)}%` : 'OK'}
                            </span>
                        </div>
                    </div>

                    {/* Pit Status */}
                    <div className="strategy-card pit">
                        <div className="card-header">🔧 Pit</div>
                        <div className="card-value">
                            {playerStrategy.pit.inLane ? '🟡 IN PIT' : '🟢 ON TRACK'}
                        </div>
                        <div className="card-detail">
                            Stops: {playerStrategy.pit.stops}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="strategy-empty">
                    <p>Waiting for strategy data...</p>
                    <p className="hint">Strategy updates are sent at 1Hz from the relay agent.</p>
                </div>
            )}

            {/* Intelligent Predictions (from StrategyService) */}
            {strategies.length > 0 && (
                <div className="predictions-section">
                    <h4>🧠 Intelligence</h4>
                    <div className="prediction-grid">
                        <div className="prediction">
                            <span className="label">Deg. Slope</span>
                            <span className="value">
                                {strategies[0].degradationSlope > 0
                                    ? `+${strategies[0].degradationSlope.toFixed(3)}s/lap`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="prediction">
                            <span className="label">Fuel/Lap</span>
                            <span className="value">
                                {strategies[0].fuelPerLap > 0
                                    ? `${strategies[0].fuelPerLap.toFixed(2)} L`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="prediction">
                            <span className="label">Laps Remaining</span>
                            <span className="value">
                                {strategies[0].estimatedLapsRemaining || 'N/A'}
                            </span>
                        </div>
                        <div className="prediction">
                            <span className="label">Cliff Lap</span>
                            <span className="value warning">
                                {strategies[0].projectedCliffLap
                                    ? `Lap ${strategies[0].projectedCliffLap}`
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyPanel;
