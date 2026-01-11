import React, { useState, useEffect } from 'react';
import { PitWindowCalculator, PitWindow, PitStrategy, UndercutAnalysis } from '../services/PitWindowCalculator';
import './PitStrategyPanel.css';

interface PitStrategyPanelProps {
  compact?: boolean;
}

const PitStrategyPanel: React.FC<PitStrategyPanelProps> = ({ compact = false }) => {
  const [pitWindow, setPitWindow] = useState<PitWindow | null>(null);
  const [strategies, setStrategies] = useState<PitStrategy[]>([]);
  const [undercut, setUndercut] = useState<UndercutAnalysis | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState(0);

  useEffect(() => {
    const unsub = PitWindowCalculator.subscribe((window) => {
      setPitWindow(window);
      const comparison = PitWindowCalculator.compareStrategies();
      setStrategies(comparison.strategies);
      setSelectedStrategy(comparison.recommended);
      setUndercut(PitWindowCalculator.findUndercutOpportunity());
    });

    return unsub;
  }, []);

  const getWindowStatus = () => {
    if (!pitWindow) return { color: 'var(--text-muted)', text: 'NO DATA' };
    if (pitWindow.optimalLap === -1) return { color: 'var(--accent-success)', text: 'NO STOP NEEDED' };
    if (pitWindow.confidence > 0.8) return { color: 'var(--accent-success)', text: 'OPTIMAL' };
    if (pitWindow.confidence > 0.5) return { color: 'var(--accent-warning)', text: 'CALCULATING' };
    return { color: 'var(--text-muted)', text: 'LOW CONFIDENCE' };
  };

  if (compact) {
    const status = getWindowStatus();
    return (
      <div className="pit-panel-compact">
        <div className="pit-compact-header">
          <span className="pit-icon">🔧</span>
          <span className="pit-label">Pit Window</span>
          <span className="pit-status" style={{ color: status.color }}>{status.text}</span>
        </div>
        {pitWindow && pitWindow.optimalLap > 0 && (
          <div className="pit-compact-info">
            <span>Optimal: Lap {pitWindow.optimalLap}</span>
            <span>Window: {pitWindow.windowStart}-{pitWindow.windowEnd}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pit-panel">
      <div className="panel-header">
        <span>🔧 Pit Strategy</span>
        <span className="pit-confidence">
          {pitWindow ? `${(pitWindow.confidence * 100).toFixed(0)}% confidence` : '--'}
        </span>
      </div>

      <div className="panel-content">
        {pitWindow && pitWindow.optimalLap > 0 ? (
          <>
            <div className="pit-window-display">
              <div className="window-optimal">
                <div className="optimal-label">Optimal Pit Lap</div>
                <div className="optimal-value">{pitWindow.optimalLap}</div>
              </div>
              <div className="window-range">
                <div className="range-label">Window</div>
                <div className="range-value">
                  Lap {pitWindow.windowStart} - {pitWindow.windowEnd}
                </div>
              </div>
            </div>

            <div className="pit-reason">
              <span className="reason-icon">ℹ️</span>
              <span>{pitWindow.reason}</span>
            </div>
          </>
        ) : pitWindow?.optimalLap === -1 ? (
          <div className="no-stop-needed">
            <span className="check-icon">✓</span>
            <span>No pit stop needed - can finish on current tires/fuel</span>
          </div>
        ) : (
          <div className="no-data">Collecting data...</div>
        )}

        {undercut && undercut.successProbability > 0.4 && (
          <div className="undercut-opportunity">
            <div className="undercut-header">
              <span className="undercut-icon">⚡</span>
              <span>Undercut Opportunity</span>
            </div>
            <div className="undercut-details">
              <div className="undercut-target">
                <span>Target:</span>
                <span>{undercut.target}</span>
              </div>
              <div className="undercut-stats">
                <div className="undercut-stat">
                  <span className="stat-label">Gap</span>
                  <span className="stat-value">{undercut.gap.toFixed(1)}s</span>
                </div>
                <div className="undercut-stat">
                  <span className="stat-label">Potential</span>
                  <span className="stat-value text-green">+{undercut.undercutPotential.toFixed(1)}s</span>
                </div>
                <div className="undercut-stat">
                  <span className="stat-label">Success</span>
                  <span className="stat-value">{(undercut.successProbability * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="undercut-action">
                Pit on lap {undercut.optimalLap} for best chance
              </div>
            </div>
          </div>
        )}

        {strategies.length > 0 && (
          <div className="strategy-comparison">
            <div className="comparison-header">Strategy Options</div>
            <div className="strategy-tabs">
              {strategies.map((s, i) => (
                <button
                  key={i}
                  className={`strategy-tab ${i === selectedStrategy ? 'active' : ''}`}
                  onClick={() => setSelectedStrategy(i)}
                >
                  {s.stops}-Stop
                </button>
              ))}
            </div>
            
            {strategies[selectedStrategy] && (
              <div className="strategy-details">
                <div className="strategy-row">
                  <span>Pit Laps</span>
                  <span>{strategies[selectedStrategy].pitLaps.join(', ')}</span>
                </div>
                <div className="strategy-row">
                  <span>Compounds</span>
                  <span className="compounds">
                    {strategies[selectedStrategy].tireCompounds.map((c, i) => (
                      <span key={i} className={`compound ${c}`}>{c[0].toUpperCase()}</span>
                    ))}
                  </span>
                </div>
                <div className="strategy-row">
                  <span>Position Delta</span>
                  <span className={strategies[selectedStrategy].positionDelta >= 0 ? 'text-green' : 'text-red'}>
                    {strategies[selectedStrategy].positionDelta >= 0 ? '+' : ''}{strategies[selectedStrategy].positionDelta}
                  </span>
                </div>
                <div className="strategy-row">
                  <span>Risk</span>
                  <span className={`risk-badge ${strategies[selectedStrategy].riskLevel}`}>
                    {strategies[selectedStrategy].riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PitStrategyPanel;
