import React, { useState, useEffect } from 'react';
import { FuelSavingCoach, FuelState, FuelStrategy, FuelCoachingMessage } from '../services/FuelSavingCoach';
import './FuelPanel.css';

interface FuelPanelProps {
  compact?: boolean;
}

const FuelPanel: React.FC<FuelPanelProps> = ({ compact = false }) => {
  const [fuelState, setFuelState] = useState<FuelState | null>(null);
  const [strategy, setStrategy] = useState<FuelStrategy | null>(null);
  const [lastMessage, setLastMessage] = useState<FuelCoachingMessage | null>(null);

  useEffect(() => {
    const unsubFuel = FuelSavingCoach.subscribe((state) => {
      setFuelState(state);
      setStrategy(FuelSavingCoach.getStrategy());
    });

    const unsubMsg = FuelSavingCoach.subscribeToMessages((msg) => {
      setLastMessage(msg);
      setTimeout(() => setLastMessage(null), 5000);
    });

    return () => {
      unsubFuel();
      unsubMsg();
    };
  }, []);

  const getModeColor = (mode: FuelState['mode']) => {
    switch (mode) {
      case 'critical': return 'var(--accent-danger)';
      case 'save': return 'var(--accent-warning)';
      case 'push': return 'var(--accent-success)';
      default: return 'var(--accent-primary)';
    }
  };

  const getModeLabel = (mode: FuelState['mode']) => {
    switch (mode) {
      case 'critical': return 'CRITICAL';
      case 'save': return 'SAVE';
      case 'push': return 'PUSH';
      default: return 'NORMAL';
    }
  };

  if (compact) {
    return (
      <div className="fuel-panel-compact">
        <div className="fuel-compact-header">
          <span className="fuel-icon">⛽</span>
          <span className="fuel-value">{fuelState?.currentFuel.toFixed(1) || '--'}L</span>
          {fuelState && (
            <span 
              className="fuel-mode-badge"
              style={{ background: getModeColor(fuelState.mode) }}
            >
              {getModeLabel(fuelState.mode)}
            </span>
          )}
        </div>
        {fuelState && (
          <div className="fuel-compact-info">
            <span>{fuelState.lapsRemaining} laps remaining</span>
            <span className={fuelState.surplus >= 0 ? 'text-green' : 'text-red'}>
              {fuelState.surplus >= 0 ? '+' : ''}{fuelState.surplus.toFixed(1)}L
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fuel-panel">
      <div className="panel-header">
        <span>⛽ Fuel Management</span>
        {fuelState && (
          <span 
            className="fuel-mode-indicator"
            style={{ color: getModeColor(fuelState.mode) }}
          >
            {getModeLabel(fuelState.mode)}
          </span>
        )}
      </div>

      <div className="panel-content">
        {lastMessage && (
          <div className={`fuel-message ${lastMessage.urgency}`}>
            <span className="message-type">{lastMessage.type.toUpperCase()}</span>
            <span className="message-text">{lastMessage.message}</span>
          </div>
        )}

        <div className="fuel-stats">
          <div className="fuel-stat">
            <div className="stat-label">Current Fuel</div>
            <div className="stat-value">{fuelState?.currentFuel.toFixed(1) || '--'}L</div>
          </div>
          <div className="fuel-stat">
            <div className="stat-label">Per Lap</div>
            <div className="stat-value">{fuelState?.fuelPerLap.toFixed(2) || '--'}L</div>
          </div>
          <div className="fuel-stat">
            <div className="stat-label">Laps Left</div>
            <div className="stat-value">{fuelState?.lapsRemaining || '--'}</div>
          </div>
          <div className="fuel-stat">
            <div className="stat-label">Surplus</div>
            <div 
              className="stat-value"
              style={{ color: (fuelState?.surplus || 0) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}
            >
              {fuelState?.surplus !== undefined ? (fuelState.surplus >= 0 ? '+' : '') + fuelState.surplus.toFixed(1) : '--'}L
            </div>
          </div>
        </div>

        {fuelState && fuelState.mode !== 'normal' && fuelState.mode !== 'push' && (
          <div className="fuel-target">
            <div className="target-label">Target Delta</div>
            <div className="target-value">
              +{fuelState.targetDelta.toFixed(2)}s per lap
            </div>
          </div>
        )}

        {strategy && strategy.liftZones.length > 0 && (
          <div className="lift-zones">
            <div className="zones-header">Lift & Coast Zones</div>
            {strategy.liftZones.map((zone, i) => (
              <div key={i} className="lift-zone">
                <span className="zone-corner">{zone.cornerName}</span>
                <span className="zone-distance">{zone.coastDistance}m</span>
                <span className="zone-cost">-{zone.timeCost.toFixed(2)}s</span>
              </div>
            ))}
          </div>
        )}

        {strategy && (
          <div className="fuel-strategy">
            <div className="strategy-item">
              <span>Mix Setting</span>
              <span className="strategy-value">{strategy.mixSetting}/10</span>
            </div>
            {strategy.shortShiftGear && (
              <div className="strategy-item">
                <span>Short Shift</span>
                <span className="strategy-value">Before gear {strategy.shortShiftGear}</span>
              </div>
            )}
            <div className="strategy-item">
              <span>Finish Estimate</span>
              <span 
                className="strategy-value"
                style={{ 
                  color: strategy.estimatedFinish === 'comfortable' ? 'var(--accent-success)' :
                         strategy.estimatedFinish === 'tight' ? 'var(--accent-warning)' : 'var(--accent-danger)'
                }}
              >
                {strategy.estimatedFinish.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelPanel;
