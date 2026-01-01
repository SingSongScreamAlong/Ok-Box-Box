/**
 * Driver HUD Component - Lovely-inspired Design
 * 
 * Modular dashboard inspired by Lovely Sim Racing dashboard
 * with Ok, Box Box branding. Features:
 * - Central speed/gear/RPM display
 * - Side panels for fuel, tires, gaps
 * - PTT button for AI race engineer
 * 
 * Design Reference: https://github.com/Lovely-Sim-Racing/lovely-dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { socketClient } from '../lib/socket-client';
import './DriverHUD.css';

interface TelemetryData {
    speed: number;
    rpm: number;
    rpmMax: number;
    gear: number;
    fuelLevel: number;
    fuelPerLap: number;
    lapsRemaining: number;
    tireWear: {
        fl: number;
        fr: number;
        rl: number;
        rr: number;
    };
    position: number;
    totalCars: number;
    gapAhead: number | null;
    gapBehind: number | null;
    lapNumber: number;
    lastLapTime: number | null;
    bestLapTime: number | null;
    delta: number | null; // Delta to best lap
}

interface DriverHUDProps {
    sessionId?: string;
}

export const DriverHUD: React.FC<DriverHUDProps> = ({ sessionId }) => {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [isPTTActive, setIsPTTActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Subscribe to telemetry updates
    useEffect(() => {
        const handleTelemetry = (data: TelemetryData) => {
            setTelemetry(data);
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        socketClient.on('telemetry:driver', handleTelemetry);
        socketClient.on('disconnect', handleDisconnect);

        return () => {
            socketClient.off('telemetry:driver');
            socketClient.off('disconnect');
        };
    }, [sessionId]);

    // PTT handlers - use socket.io directly
    const handlePTTDown = useCallback(() => {
        setIsPTTActive(true);
        // Voice recording would start here
    }, []);

    const handlePTTUp = useCallback(() => {
        setIsPTTActive(false);
        // Voice recording would stop and send here
    }, []);

    // Format time display
    const formatLapTime = (ms: number | null): string => {
        if (ms === null) return '--:--.---';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    };

    // Format gap display
    const formatGap = (gap: number | null): string => {
        if (gap === null) return '---';
        const sign = gap >= 0 ? '+' : '';
        return `${sign}${gap.toFixed(2)}`;
    };

    // Format delta
    const formatDelta = (delta: number | null): { text: string; className: string } => {
        if (delta === null) return { text: '-.---', className: '' };
        const sign = delta >= 0 ? '+' : '-';
        const className = delta < 0 ? 'delta-faster' : delta > 0 ? 'delta-slower' : '';
        return { text: `${sign}${Math.abs(delta).toFixed(3)}`, className };
    };

    // Get wear color class
    const getWearClass = (wear: number): string => {
        if (wear > 80) return 'wear-critical';
        if (wear > 50) return 'wear-warning';
        return 'wear-good';
    };

    // Calculate fuel laps
    const fuelLaps = telemetry?.fuelPerLap && telemetry.fuelPerLap > 0
        ? Math.floor(telemetry.fuelLevel / telemetry.fuelPerLap)
        : null;

    const deltaInfo = formatDelta(telemetry?.delta ?? null);

    // RPM percentage for bar
    const rpmPct = telemetry
        ? Math.min(100, (telemetry.rpm / telemetry.rpmMax) * 100)
        : 0;

    // RPM shift light threshold
    const isShiftLight = rpmPct > 95;

    return (
        <div className={`lovely-hud ${isConnected ? '' : 'disconnected'}`}>
            {/* Branding */}
            <div className="hud-brand">
                <span className="brand-text">OK, BOX BOX</span>
                <span className={`brand-status ${isConnected ? 'live' : ''}`}>
                    {isConnected ? '● LIVE' : '○ OFFLINE'}
                </span>
            </div>

            {/* RPM Bar - Top */}
            <div className={`rpm-strip ${isShiftLight ? 'shift-light' : ''}`}>
                <div className="rpm-fill" style={{ width: `${rpmPct}%` }} />
                <div className="rpm-markers">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="rpm-marker" />
                    ))}
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="hud-grid">
                {/* Left Panel - Gaps & Position */}
                <div className="hud-panel panel-left">
                    <div className="info-block position-block">
                        <span className="info-label">POS</span>
                        <span className="info-value position-value">
                            P{telemetry?.position ?? '-'}
                            <span className="position-total">/{telemetry?.totalCars ?? '-'}</span>
                        </span>
                    </div>
                    <div className="info-block">
                        <span className="info-label">GAP AHEAD</span>
                        <span className="info-value gap-value">{formatGap(telemetry?.gapAhead ?? null)}</span>
                    </div>
                    <div className="info-block">
                        <span className="info-label">BEHIND</span>
                        <span className="info-value gap-value">{formatGap(telemetry?.gapBehind ?? null)}</span>
                    </div>
                </div>

                {/* Center Panel - Speed, Gear, Delta */}
                <div className="hud-panel panel-center">
                    <div className="center-display">
                        <div className="gear-display">
                            <span className="gear-value">{telemetry?.gear ?? 'N'}</span>
                        </div>
                        <div className="speed-display">
                            <span className="speed-value">{telemetry?.speed ?? 0}</span>
                            <span className="speed-unit">KPH</span>
                        </div>
                        <div className={`delta-display ${deltaInfo.className}`}>
                            <span className="delta-value">{deltaInfo.text}</span>
                        </div>
                    </div>
                    <div className="lap-info">
                        <div className="lap-block">
                            <span className="lap-label">LAP</span>
                            <span className="lap-value">{telemetry?.lapNumber ?? 0}</span>
                        </div>
                        <div className="lap-block">
                            <span className="lap-label">LAST</span>
                            <span className="lap-value time">{formatLapTime(telemetry?.lastLapTime ?? null)}</span>
                        </div>
                        <div className="lap-block best">
                            <span className="lap-label">BEST</span>
                            <span className="lap-value time">{formatLapTime(telemetry?.bestLapTime ?? null)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Fuel & Tires */}
                <div className="hud-panel panel-right">
                    <div className="info-block fuel-block">
                        <span className="info-label">FUEL</span>
                        <span className="info-value">{telemetry?.fuelLevel?.toFixed(1) ?? '--'} L</span>
                        <span className="info-sub">{fuelLaps !== null ? `~${fuelLaps} LAPS` : '--'}</span>
                    </div>
                    <div className="tire-display">
                        <div className="tire-row">
                            <div className={`tire ${getWearClass(telemetry?.tireWear.fl ?? 0)}`}>
                                {telemetry?.tireWear.fl ?? 0}%
                            </div>
                            <div className={`tire ${getWearClass(telemetry?.tireWear.fr ?? 0)}`}>
                                {telemetry?.tireWear.fr ?? 0}%
                            </div>
                        </div>
                        <div className="tire-row">
                            <div className={`tire ${getWearClass(telemetry?.tireWear.rl ?? 0)}`}>
                                {telemetry?.tireWear.rl ?? 0}%
                            </div>
                            <div className={`tire ${getWearClass(telemetry?.tireWear.rr ?? 0)}`}>
                                {telemetry?.tireWear.rr ?? 0}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PTT Button */}
            <button
                className={`ptt-button ${isPTTActive ? 'active' : ''}`}
                onMouseDown={handlePTTDown}
                onMouseUp={handlePTTUp}
                onMouseLeave={handlePTTUp}
                onTouchStart={handlePTTDown}
                onTouchEnd={handlePTTUp}
            >
                <span className="ptt-icon">🎙️</span>
                <span className="ptt-text">{isPTTActive ? 'SPEAKING...' : 'ASK ENGINEER'}</span>
            </button>
        </div>
    );
};

export default DriverHUD;
