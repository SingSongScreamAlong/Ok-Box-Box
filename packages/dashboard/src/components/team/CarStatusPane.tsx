/**
 * Car Status Pane
 * Left side: Fuel, Tires, Damage, Stint info.
 * Each section clickable for evidence.
 */

import React from 'react';
import { ClickableEvidence } from '../EvidencePopover';
import type { CarStatusData, StatusColor } from '../../types/evidence';
import './CarStatusPane.css';

interface CarStatusPaneProps {
    data: CarStatusData | null;
}

// Default values for when no data is available
const DEFAULT_CAR_STATUS: CarStatusData = {
    fuel: {
        level: 0,
        percentage: 0,
        lapsRemaining: null,
        status: 'gray'
    },
    tires: {
        wear: { fl: 1, fr: 1, rl: 1, rr: 1 },
        temps: { fl: 0, fr: 0, rl: 0, rr: 0 },
        status: 'gray'
    },
    damage: {
        aero: 0,
        engine: 0,
        status: 'gray'
    },
    stint: {
        currentLap: 0,
        avgPace: null,
        degradationSlope: null
    }
};

export const CarStatusPane: React.FC<CarStatusPaneProps> = ({ data }) => {
    // Use default values when no data - shows full UI structure
    const d = data ?? DEFAULT_CAR_STATUS;

    return (
        <div className={`car-status-pane ${!data ? 'no-data' : ''}`}>
            {/* FUEL */}
            <ClickableEvidence evidence={d.fuel.evidence} className="status-section">
                <div className={`section-header ${d.fuel.status}`}>
                    <span className="section-icon">⛽</span>
                    <span className="section-title">Fuel</span>
                    <StatusIndicator status={d.fuel.status} />
                </div>
                <div className="fuel-display">
                    <div className="fuel-bar">
                        <div
                            className="fuel-fill"
                            style={{ width: `${d.fuel.percentage * 100}%` }}
                        />
                    </div>
                    <div className="fuel-values">
                        <span className="fuel-level">{d.fuel.level.toFixed(1)}L</span>
                        <span className="fuel-pct">{Math.round(d.fuel.percentage * 100)}%</span>
                    </div>
                    {d.fuel.lapsRemaining !== null && (
                        <div className="fuel-laps">
                            {d.fuel.lapsRemaining.toFixed(1)} laps remaining
                        </div>
                    )}
                </div>
            </ClickableEvidence>

            {/* TIRES */}
            <ClickableEvidence evidence={d.tires.evidence} className="status-section">
                <div className={`section-header ${d.tires.status}`}>
                    <span className="section-icon">🛞</span>
                    <span className="section-title">Tires</span>
                    {d.tires.compound && (
                        <span className="tire-compound">{d.tires.compound}</span>
                    )}
                    <StatusIndicator status={d.tires.status} />
                </div>
                <div className="tire-grid">
                    <TireCell corner="FL" wear={d.tires.wear.fl} temp={d.tires.temps.fl} />
                    <TireCell corner="FR" wear={d.tires.wear.fr} temp={d.tires.temps.fr} />
                    <TireCell corner="RL" wear={d.tires.wear.rl} temp={d.tires.temps.rl} />
                    <TireCell corner="RR" wear={d.tires.wear.rr} temp={d.tires.temps.rr} />
                </div>
            </ClickableEvidence>

            {/* DAMAGE */}
            <ClickableEvidence evidence={d.damage.evidence} className="status-section">
                <div className={`section-header ${d.damage.status}`}>
                    <span className="section-icon">💥</span>
                    <span className="section-title">Damage</span>
                    <StatusIndicator status={d.damage.status} />
                </div>
                <div className="damage-display">
                    <div className="damage-row">
                        <span className="damage-label">Aero</span>
                        <DamageBar value={d.damage.aero} />
                    </div>
                    <div className="damage-row">
                        <span className="damage-label">Engine</span>
                        <DamageBar value={d.damage.engine} />
                    </div>
                </div>
            </ClickableEvidence>

            {/* STINT */}
            <div className="status-section stint-section">
                <div className="section-header">
                    <span className="section-icon">🔄</span>
                    <span className="section-title">Stint</span>
                </div>
                <div className="stint-display">
                    <div className="stint-stat">
                        <span className="stat-label">Lap</span>
                        <span className="stat-value">{d.stint.currentLap}</span>
                    </div>
                    <div className="stint-stat">
                        <span className="stat-label">Pace</span>
                        <span className="stat-value">{d.stint.avgPace || '—'}</span>
                    </div>
                    <div className="stint-stat">
                        <span className="stat-label">Deg</span>
                        <span className="stat-value">
                            {d.stint.degradationSlope !== null
                                ? `+${d.stint.degradationSlope.toFixed(2)}s`
                                : '—'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatusIndicator: React.FC<{ status: StatusColor }> = ({ status }) => {
    return <span className={`status-dot ${status}`} />;
};

const TireCell: React.FC<{ corner: string; wear: number; temp: number }> = ({ corner, wear, temp }) => {
    const wearPct = Math.round(wear * 100);
    const wearClass = wearPct > 70 ? 'good' : wearPct > 40 ? 'medium' : 'low';

    return (
        <div className={`tire-cell ${wearClass}`}>
            <span className="tire-corner">{corner}</span>
            <span className="tire-wear">{wearPct}%</span>
            <span className="tire-temp">{Math.round(temp)}°</span>
        </div>
    );
};

const DamageBar: React.FC<{ value: number }> = ({ value }) => {
    const pct = Math.round(value * 100);
    const damageClass = pct === 0 ? 'ok' : pct < 30 ? 'minor' : pct < 70 ? 'moderate' : 'severe';

    return (
        <div className="damage-bar-container">
            <div className={`damage-bar ${damageClass}`} style={{ width: `${pct}%` }} />
            <span className="damage-value">{pct === 0 ? 'OK' : `${pct}%`}</span>
        </div>
    );
};

export default CarStatusPane;
