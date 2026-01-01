import React, { useState, useMemo } from 'react';
import './SetupAnalysis.css';

interface SetupChange {
  id: string;
  timestamp: number;
  component: string;
  parameter: string;
  oldValue: number;
  newValue: number;
  unit: string;
  lapBefore: number;
  lapAfter: number;
  impact: {
    lapTimeDelta: number;
    sectorDeltas: number[];
    tireWearDelta: number;
    stabilityRating: number;
  };
}

interface SetupParameter {
  component: string;
  parameter: string;
  currentValue: number;
  unit: string;
  min: number;
  max: number;
  recommended: number;
  description: string;
}

const SetupAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'compare'>('current');
  const [selectedComponent, setSelectedComponent] = useState<string>('aero');

  // Current setup parameters
  const setupParameters: Record<string, SetupParameter[]> = useMemo(() => ({
    aero: [
      { component: 'Front Wing', parameter: 'Angle', currentValue: 12, unit: '°', min: 0, max: 20, recommended: 11, description: 'Increases front downforce, reduces top speed' },
      { component: 'Rear Wing', parameter: 'Angle', currentValue: 8, unit: '°', min: 0, max: 15, recommended: 7, description: 'Increases rear downforce and stability' },
      { component: 'Ride Height', parameter: 'Front', currentValue: 25, unit: 'mm', min: 15, max: 40, recommended: 24, description: 'Lower = more downforce, risk of bottoming' },
      { component: 'Ride Height', parameter: 'Rear', currentValue: 45, unit: 'mm', min: 30, max: 60, recommended: 42, description: 'Affects rake angle and rear grip' },
    ],
    suspension: [
      { component: 'Springs', parameter: 'Front Stiffness', currentValue: 180, unit: 'N/mm', min: 100, max: 300, recommended: 175, description: 'Stiffer = more responsive, less grip' },
      { component: 'Springs', parameter: 'Rear Stiffness', currentValue: 160, unit: 'N/mm', min: 100, max: 300, recommended: 155, description: 'Softer rear = more traction on exit' },
      { component: 'Anti-Roll Bar', parameter: 'Front', currentValue: 7, unit: 'clicks', min: 1, max: 10, recommended: 6, description: 'Higher = less body roll, less grip' },
      { component: 'Anti-Roll Bar', parameter: 'Rear', currentValue: 5, unit: 'clicks', min: 1, max: 10, recommended: 4, description: 'Lower = more rear grip in corners' },
    ],
    dampers: [
      { component: 'Bump', parameter: 'Front', currentValue: 8, unit: 'clicks', min: 1, max: 12, recommended: 7, description: 'Controls compression over bumps' },
      { component: 'Bump', parameter: 'Rear', currentValue: 6, unit: 'clicks', min: 1, max: 12, recommended: 6, description: 'Higher = more stable over kerbs' },
      { component: 'Rebound', parameter: 'Front', currentValue: 9, unit: 'clicks', min: 1, max: 12, recommended: 8, description: 'Controls extension speed' },
      { component: 'Rebound', parameter: 'Rear', currentValue: 7, unit: 'clicks', min: 1, max: 12, recommended: 7, description: 'Lower = better traction' },
    ],
    brakes: [
      { component: 'Brake Bias', parameter: 'Distribution', currentValue: 54, unit: '%', min: 45, max: 65, recommended: 52, description: 'Higher = more front braking' },
      { component: 'Brake Pressure', parameter: 'Max', currentValue: 95, unit: '%', min: 80, max: 100, recommended: 92, description: 'Maximum brake force applied' },
      { component: 'Brake Ducts', parameter: 'Front', currentValue: 3, unit: 'setting', min: 1, max: 5, recommended: 3, description: 'Cooling vs drag tradeoff' },
      { component: 'Brake Ducts', parameter: 'Rear', currentValue: 2, unit: 'setting', min: 1, max: 5, recommended: 2, description: 'Cooling vs drag tradeoff' },
    ],
    differential: [
      { component: 'Differential', parameter: 'Preload', currentValue: 45, unit: 'Nm', min: 20, max: 100, recommended: 40, description: 'Higher = more stability, less rotation' },
      { component: 'Differential', parameter: 'Power', currentValue: 65, unit: '%', min: 40, max: 100, recommended: 60, description: 'Locking under acceleration' },
      { component: 'Differential', parameter: 'Coast', currentValue: 35, unit: '%', min: 20, max: 80, recommended: 30, description: 'Locking under deceleration' },
    ],
    tires: [
      { component: 'Tire Pressure', parameter: 'Front Left', currentValue: 23.5, unit: 'psi', min: 20, max: 28, recommended: 23.0, description: 'Hot pressure target' },
      { component: 'Tire Pressure', parameter: 'Front Right', currentValue: 23.5, unit: 'psi', min: 20, max: 28, recommended: 23.0, description: 'Hot pressure target' },
      { component: 'Tire Pressure', parameter: 'Rear Left', currentValue: 22.0, unit: 'psi', min: 19, max: 26, recommended: 21.5, description: 'Hot pressure target' },
      { component: 'Tire Pressure', parameter: 'Rear Right', currentValue: 22.0, unit: 'psi', min: 19, max: 26, recommended: 21.5, description: 'Hot pressure target' },
      { component: 'Camber', parameter: 'Front', currentValue: -3.2, unit: '°', min: -4.0, max: -1.0, recommended: -3.0, description: 'Negative = more grip in corners' },
      { component: 'Camber', parameter: 'Rear', currentValue: -1.8, unit: '°', min: -3.0, max: -0.5, recommended: -1.5, description: 'Less aggressive than front' },
      { component: 'Toe', parameter: 'Front', currentValue: 0.05, unit: '°', min: -0.2, max: 0.2, recommended: 0.08, description: 'Toe-out = better turn-in' },
      { component: 'Toe', parameter: 'Rear', currentValue: 0.15, unit: '°', min: 0, max: 0.3, recommended: 0.12, description: 'Toe-in = more stability' },
    ],
  }), []);

  // Setup change history
  const changeHistory: SetupChange[] = useMemo(() => [
    {
      id: '1',
      timestamp: Date.now() - 3600000,
      component: 'Front Wing',
      parameter: 'Angle',
      oldValue: 10,
      newValue: 12,
      unit: '°',
      lapBefore: 5,
      lapAfter: 8,
      impact: {
        lapTimeDelta: -0.234,
        sectorDeltas: [-0.087, -0.112, -0.035],
        tireWearDelta: 2,
        stabilityRating: 85
      }
    },
    {
      id: '2',
      timestamp: Date.now() - 2400000,
      component: 'Brake Bias',
      parameter: 'Distribution',
      oldValue: 52,
      newValue: 54,
      unit: '%',
      lapBefore: 8,
      lapAfter: 12,
      impact: {
        lapTimeDelta: -0.089,
        sectorDeltas: [-0.045, -0.032, -0.012],
        tireWearDelta: -1,
        stabilityRating: 78
      }
    },
    {
      id: '3',
      timestamp: Date.now() - 1200000,
      component: 'Rear Wing',
      parameter: 'Angle',
      oldValue: 7,
      newValue: 8,
      unit: '°',
      lapBefore: 12,
      lapAfter: 15,
      impact: {
        lapTimeDelta: 0.045,
        sectorDeltas: [0.012, -0.023, 0.056],
        tireWearDelta: 1,
        stabilityRating: 92
      }
    },
  ], []);

  const getValueStatus = (current: number, recommended: number, min: number, max: number) => {
    const range = max - min;
    const diff = Math.abs(current - recommended) / range;
    if (diff < 0.1) return 'optimal';
    if (diff < 0.2) return 'good';
    return 'review';
  };

  const componentIcons: Record<string, string> = {
    aero: '🛩️',
    suspension: '🔧',
    dampers: '⚙️',
    brakes: '🛑',
    differential: '⚡',
    tires: '🛞'
  };

  return (
    <div className="setup-analysis">
      {/* Tabs */}
      <div className="setup-tabs">
        <button 
          className={activeTab === 'current' ? 'active' : ''} 
          onClick={() => setActiveTab('current')}
        >
          ⚙️ Current Setup
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''} 
          onClick={() => setActiveTab('history')}
        >
          📊 Change History
        </button>
        <button 
          className={activeTab === 'compare' ? 'active' : ''} 
          onClick={() => setActiveTab('compare')}
        >
          🔄 Compare Setups
        </button>
      </div>

      {activeTab === 'current' && (
        <div className="setup-current">
          {/* Component Selector */}
          <div className="component-selector">
            {Object.keys(setupParameters).map(comp => (
              <button
                key={comp}
                className={selectedComponent === comp ? 'active' : ''}
                onClick={() => setSelectedComponent(comp)}
              >
                <span className="comp-icon">{componentIcons[comp]}</span>
                <span className="comp-name">{comp.charAt(0).toUpperCase() + comp.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Parameters Grid */}
          <div className="parameters-grid">
            {setupParameters[selectedComponent]?.map((param, idx) => (
              <div 
                key={idx} 
                className={`parameter-card ${getValueStatus(param.currentValue, param.recommended, param.min, param.max)}`}
              >
                <div className="param-header">
                  <span className="param-component">{param.component}</span>
                  <span className="param-name">{param.parameter}</span>
                </div>
                
                <div className="param-value">
                  <span className="current">{param.currentValue}</span>
                  <span className="unit">{param.unit}</span>
                </div>

                <div className="param-range">
                  <div className="range-bar">
                    <div 
                      className="range-fill"
                      style={{ 
                        left: `${((param.min - param.min) / (param.max - param.min)) * 100}%`,
                        width: `${((param.currentValue - param.min) / (param.max - param.min)) * 100}%`
                      }}
                    />
                    <div 
                      className="recommended-marker"
                      style={{ left: `${((param.recommended - param.min) / (param.max - param.min)) * 100}%` }}
                    />
                  </div>
                  <div className="range-labels">
                    <span>{param.min}</span>
                    <span className="recommended">Rec: {param.recommended}</span>
                    <span>{param.max}</span>
                  </div>
                </div>

                <div className="param-description">{param.description}</div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="setup-recommendations">
            <h4>🔧 Setup Recommendations</h4>
            <div className="rec-list">
              <div className="rec-item">
                <span className="rec-icon">⚠️</span>
                <div className="rec-content">
                  <strong>Brake Bias +2% Forward</strong>
                  <span>Current 54% causing rear lockups in Sector 2. Recommend 52%.</span>
                </div>
              </div>
              <div className="rec-item">
                <span className="rec-icon">💡</span>
                <div className="rec-content">
                  <strong>Front Wing -1°</strong>
                  <span>Slight understeer detected. Reducing to 11° may improve turn-in.</span>
                </div>
              </div>
              <div className="rec-item">
                <span className="rec-icon">✅</span>
                <div className="rec-content">
                  <strong>Tire Pressures Optimal</strong>
                  <span>Hot pressures within 0.5 psi of targets across all corners.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="setup-history">
          <div className="history-list">
            {changeHistory.map(change => (
              <div key={change.id} className="history-item">
                <div className="history-header">
                  <div className="change-info">
                    <span className="change-component">{change.component}</span>
                    <span className="change-param">{change.parameter}</span>
                  </div>
                  <div className="change-time">
                    {new Date(change.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="change-values">
                  <span className="old-value">{change.oldValue}{change.unit}</span>
                  <span className="arrow">→</span>
                  <span className="new-value">{change.newValue}{change.unit}</span>
                  <span className={`delta ${change.newValue > change.oldValue ? 'up' : 'down'}`}>
                    ({change.newValue > change.oldValue ? '+' : ''}{change.newValue - change.oldValue}{change.unit})
                  </span>
                </div>

                <div className="change-impact">
                  <div className="impact-item">
                    <span className="impact-label">Lap Time</span>
                    <span className={`impact-value ${change.impact.lapTimeDelta < 0 ? 'positive' : 'negative'}`}>
                      {change.impact.lapTimeDelta > 0 ? '+' : ''}{change.impact.lapTimeDelta.toFixed(3)}s
                    </span>
                  </div>
                  <div className="impact-item">
                    <span className="impact-label">Tire Wear</span>
                    <span className={`impact-value ${change.impact.tireWearDelta < 0 ? 'positive' : 'negative'}`}>
                      {change.impact.tireWearDelta > 0 ? '+' : ''}{change.impact.tireWearDelta}%
                    </span>
                  </div>
                  <div className="impact-item">
                    <span className="impact-label">Stability</span>
                    <span className="impact-value">{change.impact.stabilityRating}%</span>
                  </div>
                </div>

                <div className="sector-deltas">
                  {change.impact.sectorDeltas.map((delta, idx) => (
                    <div key={idx} className={`sector-delta ${delta < 0 ? 'positive' : 'negative'}`}>
                      S{idx + 1}: {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="history-summary">
            <h4>Session Setup Summary</h4>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-value">{changeHistory.length}</span>
                <span className="stat-label">Changes Made</span>
              </div>
              <div className="stat positive">
                <span className="stat-value">
                  {changeHistory.reduce((sum, c) => sum + (c.impact.lapTimeDelta < 0 ? c.impact.lapTimeDelta : 0), 0).toFixed(3)}s
                </span>
                <span className="stat-label">Time Gained</span>
              </div>
              <div className="stat negative">
                <span className="stat-value">
                  +{changeHistory.reduce((sum, c) => sum + (c.impact.lapTimeDelta > 0 ? c.impact.lapTimeDelta : 0), 0).toFixed(3)}s
                </span>
                <span className="stat-label">Time Lost</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="setup-compare">
          <div className="compare-header">
            <select defaultValue="current">
              <option value="current">Current Setup</option>
              <option value="quali">Qualifying Setup</option>
              <option value="race">Race Setup</option>
            </select>
            <span>vs</span>
            <select defaultValue="baseline">
              <option value="baseline">Baseline Setup</option>
              <option value="optimal">Optimal</option>
              <option value="teammate">Teammate Setup</option>
            </select>
          </div>

          <div className="compare-grid">
            <div className="compare-section">
              <h4>🛩️ Aerodynamics</h4>
              <div className="compare-row">
                <span className="param">Front Wing</span>
                <span className="val-a">12°</span>
                <span className="diff positive">+2°</span>
                <span className="val-b">10°</span>
              </div>
              <div className="compare-row">
                <span className="param">Rear Wing</span>
                <span className="val-a">8°</span>
                <span className="diff positive">+1°</span>
                <span className="val-b">7°</span>
              </div>
            </div>

            <div className="compare-section">
              <h4>🛑 Brakes</h4>
              <div className="compare-row">
                <span className="param">Brake Bias</span>
                <span className="val-a">54%</span>
                <span className="diff positive">+2%</span>
                <span className="val-b">52%</span>
              </div>
              <div className="compare-row">
                <span className="param">Pressure</span>
                <span className="val-a">95%</span>
                <span className="diff neutral">0%</span>
                <span className="val-b">95%</span>
              </div>
            </div>

            <div className="compare-section">
              <h4>🛞 Tires</h4>
              <div className="compare-row">
                <span className="param">Front Pressure</span>
                <span className="val-a">23.5 psi</span>
                <span className="diff positive">+0.5</span>
                <span className="val-b">23.0 psi</span>
              </div>
              <div className="compare-row">
                <span className="param">Front Camber</span>
                <span className="val-a">-3.2°</span>
                <span className="diff negative">-0.2°</span>
                <span className="val-b">-3.0°</span>
              </div>
            </div>
          </div>

          <div className="compare-impact">
            <h4>Predicted Impact</h4>
            <div className="impact-summary">
              <div className="impact-card">
                <span className="impact-icon">⏱️</span>
                <span className="impact-label">Lap Time</span>
                <span className="impact-delta negative">+0.15s</span>
              </div>
              <div className="impact-card">
                <span className="impact-icon">🏎️</span>
                <span className="impact-label">Top Speed</span>
                <span className="impact-delta negative">-3 km/h</span>
              </div>
              <div className="impact-card">
                <span className="impact-icon">↩️</span>
                <span className="impact-label">Stability</span>
                <span className="impact-delta positive">+8%</span>
              </div>
              <div className="impact-card">
                <span className="impact-icon">🛞</span>
                <span className="impact-label">Tire Life</span>
                <span className="impact-delta positive">+2 laps</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupAnalysis;
