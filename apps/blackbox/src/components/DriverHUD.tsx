import React, { useState, useEffect } from 'react';
import type { TelemetryData } from '../types';
import './DriverHUD.css';

interface DriverHUDProps {
  telemetry: TelemetryData | null;
  onOpenApex: () => void;
  onOpenPanel: (panel: string) => void;
}

interface QuickStat {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
}

const DriverHUD: React.FC<DriverHUDProps> = ({ telemetry, onOpenApex, onOpenPanel }) => {
  const [deltaTime, setDeltaTime] = useState(0);
  const [lastLapDelta, setLastLapDelta] = useState(0);

  useEffect(() => {
    if (telemetry) {
      // Simulate delta calculation
      const newDelta = (Math.random() - 0.5) * 2;
      setDeltaTime(prev => prev * 0.9 + newDelta * 0.1);
      
      if (telemetry.lapTime < 5) {
        setLastLapDelta((Math.random() - 0.5) * 1.5);
      }
    }
  }, [telemetry?.lap]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getDeltaColor = (delta: number) => {
    if (delta < -0.1) return 'var(--accent-success)';
    if (delta > 0.1) return 'var(--accent-danger)';
    return 'var(--text-primary)';
  };

  const getGearColor = (gear: number) => {
    const colors = ['#ff4444', '#ff6644', '#ff8844', '#ffaa44', '#aaff44', '#44ff44', '#44ffaa'];
    return colors[Math.min(gear, 6)] || '#ffffff';
  };

  const quickStats: QuickStat[] = [
    {
      label: 'Position',
      value: `P${telemetry?.racePosition || '-'}`,
      color: telemetry?.racePosition === 1 ? 'var(--accent-warning)' : undefined,
    },
    {
      label: 'Gap Ahead',
      value: telemetry?.gapAhead ? `+${telemetry.gapAhead.toFixed(1)}` : '-',
      unit: 's',
    },
    {
      label: 'Gap Behind',
      value: telemetry?.gapBehind ? `-${telemetry.gapBehind.toFixed(1)}` : '-',
      unit: 's',
    },
    {
      label: 'Fuel',
      value: telemetry?.fuel?.toFixed(1) || '-',
      unit: 'L',
      color: (telemetry?.fuel || 100) < 20 ? 'var(--accent-danger)' : undefined,
    },
  ];

  const hudButtons = [
    { id: 'apex', icon: '◈', label: 'APEX', color: 'var(--accent-primary)', action: onOpenApex },
    { id: 'fuel', icon: '⛽', label: 'Fuel', action: () => onOpenPanel('fuel') },
    { id: 'weather', icon: '🌤️', label: 'Weather', action: () => onOpenPanel('weather') },
    { id: 'pit', icon: '🔧', label: 'Pit', action: () => onOpenPanel('pit') },
    { id: 'tires', icon: '🔘', label: 'Tires', action: () => onOpenPanel('tires') },
    { id: 'track', icon: '🗺️', label: 'Track', action: () => onOpenPanel('track') },
    { id: 'rivals', icon: '🏎️', label: 'Rivals', action: () => onOpenPanel('rivals') },
    { id: 'telemetry', icon: '📊', label: 'Data', action: () => onOpenPanel('telemetry') },
  ];

  return (
    <div className="driver-hud">
      {/* Top Bar - Essential Info */}
      <div className="hud-top-bar">
        <div className="hud-lap-info">
          <div className="lap-current">
            <span className="lap-label">LAP</span>
            <span className="lap-value">{telemetry?.lap || '-'}</span>
          </div>
          <div className="lap-sector">
            <span className="sector-label">S{telemetry?.sector || '-'}</span>
          </div>
        </div>

        <div className="hud-delta">
          <div 
            className="delta-value"
            style={{ color: getDeltaColor(deltaTime) }}
          >
            {deltaTime >= 0 ? '+' : ''}{deltaTime.toFixed(3)}
          </div>
          <div className="delta-label">vs Best</div>
        </div>

        <div className="hud-lap-time">
          <div className="current-time">{formatTime(telemetry?.lapTime || 0)}</div>
          <div className="best-time">
            <span className="best-label">BEST</span>
            <span className="best-value">{formatTime(telemetry?.bestLapTime || 0)}</span>
          </div>
        </div>
      </div>

      {/* Center - Speed and Gear */}
      <div className="hud-center">
        <div className="hud-speed">
          <div className="speed-value">{Math.round(telemetry?.speed || 0)}</div>
          <div className="speed-unit">KM/H</div>
        </div>
        
        <div 
          className="hud-gear"
          style={{ color: getGearColor(telemetry?.gear || 0) }}
        >
          {telemetry?.gear === 0 ? 'N' : telemetry?.gear === -1 ? 'R' : telemetry?.gear || '-'}
        </div>

        <div className="hud-rpm">
          <div className="rpm-bar">
            <div 
              className="rpm-fill"
              style={{ 
                width: `${((telemetry?.rpm || 0) / 8500) * 100}%`,
                background: (telemetry?.rpm || 0) > 7500 
                  ? 'linear-gradient(90deg, var(--accent-warning), var(--accent-danger))'
                  : 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))'
              }}
            />
          </div>
          <div className="rpm-value">{Math.round(telemetry?.rpm || 0)}</div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="hud-quick-stats">
        {quickStats.map((stat, i) => (
          <div key={i} className="quick-stat">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>
              {stat.value}
              {stat.unit && <span className="stat-unit">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Pedal Inputs */}
      <div className="hud-inputs">
        <div className="input-group">
          <div className="input-label">THR</div>
          <div className="input-bar throttle">
            <div 
              className="input-fill"
              style={{ height: `${(telemetry?.throttle || 0) * 100}%` }}
            />
          </div>
          <div className="input-value">{Math.round((telemetry?.throttle || 0) * 100)}%</div>
        </div>
        <div className="input-group">
          <div className="input-label">BRK</div>
          <div className="input-bar brake">
            <div 
              className="input-fill"
              style={{ height: `${(telemetry?.brake || 0) * 100}%` }}
            />
          </div>
          <div className="input-value">{Math.round((telemetry?.brake || 0) * 100)}%</div>
        </div>
      </div>

      {/* Last Lap Delta */}
      {lastLapDelta !== 0 && (
        <div 
          className="hud-last-lap-delta"
          style={{ color: getDeltaColor(lastLapDelta) }}
        >
          Last Lap: {lastLapDelta >= 0 ? '+' : ''}{lastLapDelta.toFixed(3)}s
        </div>
      )}

      {/* Quick Access Buttons */}
      <div className="hud-buttons">
        {hudButtons.map((btn) => (
          <button
            key={btn.id}
            className={`hud-button ${btn.id === 'apex' ? 'apex-button' : ''}`}
            onClick={btn.action}
            style={btn.color ? { '--btn-color': btn.color } as React.CSSProperties : undefined}
          >
            <span className="btn-icon">{btn.icon}</span>
            <span className="btn-label">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Tire Temps Mini Display */}
      <div className="hud-tires-mini">
        <div className="tire-mini fl">
          <span>{Math.round(telemetry?.tires.frontLeft.temp || 0)}°</span>
        </div>
        <div className="tire-mini fr">
          <span>{Math.round(telemetry?.tires.frontRight.temp || 0)}°</span>
        </div>
        <div className="tire-mini rl">
          <span>{Math.round(telemetry?.tires.rearLeft.temp || 0)}°</span>
        </div>
        <div className="tire-mini rr">
          <span>{Math.round(telemetry?.tires.rearRight.temp || 0)}°</span>
        </div>
      </div>

      {/* APEX Quick Access */}
      <button className="apex-fab" onClick={onOpenApex}>
        <span className="apex-fab-icon">◈</span>
        <span className="apex-fab-label">Ask APEX</span>
      </button>
    </div>
  );
};

export default DriverHUD;
