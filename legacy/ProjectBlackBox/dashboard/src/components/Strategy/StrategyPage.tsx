import React, { useState, useMemo } from 'react';
import { TelemetryData, CompetitorData, StrategyData } from '../../services/WebSocketService';
import SetupAnalysis from '../Setup/SetupAnalysis';
import './StrategyPage.css';

interface StrategyPageProps {
  telemetryData: TelemetryData | null;
  competitorData: CompetitorData[] | null;
  strategyData: StrategyData | null;
  totalLaps: number;
  currentLap: number;
}

interface DriverDetail {
  position: number;
  driver: string;
  team: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  tireCompound: 'soft' | 'medium' | 'hard';
  tireAge: number;
  tireWear: number;
  fuelLoad: number;
  pitStops: number;
  speed: number;
  incidents: number;
  iRating: number;
  safetyRating: number;
  aggression: 'low' | 'medium' | 'high';
  consistency: number;
  overtakes: number;
  defenseMoves: number;
  trackPosition: number;
}

interface PitStop {
  lap: number;
  tireCompound: 'soft' | 'medium' | 'hard';
  fuelToAdd: number;
}

const StrategyPage: React.FC<StrategyPageProps> = ({ 
  telemetryData, 
  competitorData,
  strategyData,
  totalLaps = 52,
  currentLap = 1 
}) => {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'pit' | 'tire' | 'fuel' | 'weather' | 'setup'>('pit');
  const [numStops, setNumStops] = useState(1);
  const [selectedCompound, setSelectedCompound] = useState<'soft' | 'medium' | 'hard'>('medium');

  // Generate detailed driver data
  const drivers: DriverDetail[] = useMemo(() => {
    const baseDrivers = [
      { driver: 'VERSTAPPEN', team: 'Red Bull Racing', iRating: 8500, safetyRating: 4.2 },
      { driver: 'HAMILTON', team: 'Mercedes AMG', iRating: 8200, safetyRating: 4.5 },
      { driver: 'YOU', team: 'Your Team', iRating: 5500, safetyRating: 3.8 },
      { driver: 'LECLERC', team: 'Scuderia Ferrari', iRating: 7800, safetyRating: 3.9 },
      { driver: 'NORRIS', team: 'McLaren F1', iRating: 7500, safetyRating: 4.1 },
      { driver: 'SAINZ', team: 'Scuderia Ferrari', iRating: 7400, safetyRating: 4.3 },
      { driver: 'RUSSELL', team: 'Mercedes AMG', iRating: 7200, safetyRating: 4.4 },
      { driver: 'PIASTRI', team: 'McLaren F1', iRating: 6800, safetyRating: 4.0 },
      { driver: 'ALONSO', team: 'Aston Martin', iRating: 7600, safetyRating: 4.6 },
      { driver: 'STROLL', team: 'Aston Martin', iRating: 5200, safetyRating: 3.5 },
    ];

    const compounds: ('soft' | 'medium' | 'hard')[] = ['medium', 'hard', 'soft', 'medium', 'hard', 'soft', 'medium', 'hard', 'medium', 'soft'];
    const aggressions: ('low' | 'medium' | 'high')[] = ['high', 'medium', 'low', 'high', 'medium', 'low', 'medium', 'high', 'low', 'high'];

    return baseDrivers.map((d, i) => {
      const position = i + 1;
      const gap = position === 1 ? 'LEADER' : `+${(position * 2.5 + Math.random() * 2).toFixed(3)}s`;
      const interval = position === 1 ? '-' : `+${(1.5 + Math.random() * 2).toFixed(3)}s`;
      
      return {
        position,
        driver: d.driver,
        team: d.team,
        gap,
        interval,
        lastLap: `1:${27 + Math.floor(Math.random() * 2)}.${(Math.random() * 999).toFixed(0).padStart(3, '0')}`,
        bestLap: `1:${27 + Math.floor(Math.random() * 1)}.${(Math.random() * 500).toFixed(0).padStart(3, '0')}`,
        tireCompound: compounds[i],
        tireAge: Math.floor(Math.random() * 15) + 5,
        tireWear: Math.floor(Math.random() * 30) + 60,
        fuelLoad: 80 - (currentLap * 2.5) + Math.random() * 10,
        pitStops: Math.floor(Math.random() * 2),
        speed: 280 + Math.random() * 30,
        incidents: Math.floor(Math.random() * 4),
        iRating: d.iRating,
        safetyRating: d.safetyRating,
        aggression: aggressions[i],
        consistency: 85 + Math.random() * 15,
        overtakes: Math.floor(Math.random() * 5),
        defenseMoves: Math.floor(Math.random() * 3),
        trackPosition: (i * 0.08 + (telemetryData?.trackPosition ?? 0)) % 1
      };
    });
  }, [competitorData, telemetryData, currentLap]);

  const selectedDriverData = selectedDriver ? drivers.find(d => d.driver === selectedDriver) : null;

  // Pit strategy calculations
  const fuelPerLap = telemetryData?.fuel?.usagePerHour ? (telemetryData.fuel.usagePerHour / 3600) * 90 : 2.8;
  const currentFuel = telemetryData?.fuel?.level || 80;
  const remainingLaps = totalLaps - currentLap;
  const fuelNeeded = remainingLaps * fuelPerLap;

  const tireLife = { soft: 18, medium: 28, hard: 40 };

  const calculatePitWindows = () => {
    const windows: PitStop[] = [];
    const stintLength = Math.floor(remainingLaps / (numStops + 1));
    
    for (let i = 0; i < numStops; i++) {
      const pitLap = currentLap + stintLength * (i + 1);
      windows.push({
        lap: pitLap,
        tireCompound: i === numStops - 1 ? 'soft' : 'medium',
        fuelToAdd: stintLength * fuelPerLap + 2
      });
    }
    return windows;
  };

  const pitWindows = calculatePitWindows();

  const getCompoundColor = (compound: string) => {
    switch (compound) {
      case 'soft': return '#ff4444';
      case 'medium': return '#ffeb3b';
      case 'hard': return '#ffffff';
      default: return '#888';
    }
  };

  const getAggressionColor = (aggression: string) => {
    switch (aggression) {
      case 'low': return '#00ff9d';
      case 'medium': return '#ffeb3b';
      case 'high': return '#ff4444';
      default: return '#888';
    }
  };

  return (
    <div className="strategy-page">
      {/* Left Panel - Driver Standings */}
      <div className="standings-panel">
        <div className="panel-header">
          <h3>Race Standings</h3>
          <span className="lap-badge">Lap {currentLap}/{totalLaps}</span>
        </div>
        
        <div className="standings-table">
          <div className="table-header">
            <span className="col-pos">POS</span>
            <span className="col-driver">DRIVER</span>
            <span className="col-gap">GAP</span>
            <span className="col-tire">TIRE</span>
            <span className="col-stops">PIT</span>
          </div>
          
          <div className="table-body">
            {drivers.map(driver => (
              <div 
                key={driver.driver}
                className={`driver-row ${driver.driver === 'YOU' ? 'player' : ''} ${selectedDriver === driver.driver ? 'selected' : ''}`}
                onClick={() => setSelectedDriver(selectedDriver === driver.driver ? null : driver.driver)}
              >
                <span className="col-pos">
                  <span className="pos-num">{driver.position}</span>
                </span>
                <span className="col-driver">
                  <span className="driver-name">{driver.driver}</span>
                  <span className="team-name">{driver.team}</span>
                </span>
                <span className="col-gap">{driver.gap}</span>
                <span className="col-tire">
                  <span className="tire-badge" style={{ background: getCompoundColor(driver.tireCompound) }}>
                    {driver.tireCompound.charAt(0).toUpperCase()}
                  </span>
                  <span className="tire-age">{driver.tireAge}L</span>
                </span>
                <span className="col-stops">{driver.pitStops}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center Panel - Strategy Tools */}
      <div className="strategy-tools-panel">
        <div className="tools-tabs">
          <button className={activeSection === 'pit' ? 'active' : ''} onClick={() => setActiveSection('pit')}>🏁 Pit Strategy</button>
          <button className={activeSection === 'tire' ? 'active' : ''} onClick={() => setActiveSection('tire')}>🛞 Tire Management</button>
          <button className={activeSection === 'fuel' ? 'active' : ''} onClick={() => setActiveSection('fuel')}>⛽ Fuel Strategy</button>
          <button className={activeSection === 'weather' ? 'active' : ''} onClick={() => setActiveSection('weather')}>🌤️ Weather</button>
          <button className={activeSection === 'setup' ? 'active' : ''} onClick={() => setActiveSection('setup')}>⚙️ Setup</button>
        </div>

        <div className="tools-content">
          {activeSection === 'pit' && (
            <div className="pit-section">
              <div className="pit-controls">
                <div className="control-group">
                  <label>Number of Stops</label>
                  <div className="stop-buttons">
                    {[0, 1, 2, 3].map(n => (
                      <button key={n} className={numStops === n ? 'active' : ''} onClick={() => setNumStops(n)}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label>Next Compound</label>
                  <div className="compound-buttons">
                    {(['soft', 'medium', 'hard'] as const).map(c => (
                      <button 
                        key={c} 
                        className={`${c} ${selectedCompound === c ? 'active' : ''}`}
                        onClick={() => setSelectedCompound(c)}
                      >
                        {c.charAt(0).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="race-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(currentLap / totalLaps) * 100}%` }}></div>
                  {pitWindows.map((pit, i) => (
                    <div key={i} className="pit-marker" style={{ left: `${(pit.lap / totalLaps) * 100}%` }}>
                      P{i + 1}
                    </div>
                  ))}
                </div>
                <div className="progress-labels">
                  <span>Lap {currentLap}</span>
                  <span>Lap {totalLaps}</span>
                </div>
              </div>

              <div className="pit-windows">
                <h4>Recommended Pit Windows</h4>
                {pitWindows.length === 0 ? (
                  <div className="no-stop">No-stop strategy selected</div>
                ) : (
                  pitWindows.map((pit, i) => (
                    <div key={i} className="pit-window-card">
                      <div className="pit-number">STOP {i + 1}</div>
                      <div className="pit-details">
                        <div className="detail">
                          <span className="label">Lap</span>
                          <span className="value">{pit.lap}</span>
                        </div>
                        <div className="detail">
                          <span className="label">Tires</span>
                          <span className="value" style={{ color: getCompoundColor(pit.tireCompound) }}>
                            {pit.tireCompound.toUpperCase()}
                          </span>
                        </div>
                        <div className="detail">
                          <span className="label">Fuel</span>
                          <span className="value">+{pit.fuelToAdd.toFixed(1)}L</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="undercut-analysis">
                <h4>Undercut/Overcut Analysis</h4>
                <div className="analysis-cards">
                  <div className="analysis-card undercut">
                    <span className="card-title">Undercut</span>
                    <span className="card-value">+0.8s gain</span>
                    <span className="card-note">Pit lap {currentLap + 3}</span>
                  </div>
                  <div className="analysis-card overcut">
                    <span className="card-title">Overcut</span>
                    <span className="card-value">+0.3s gain</span>
                    <span className="card-note">Pit lap {currentLap + 8}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'tire' && (
            <div className="tire-section">
              <div className="current-tires">
                <h4>Current Tire Status</h4>
                <div className="tire-grid">
                  {['FL', 'FR', 'RL', 'RR'].map(pos => (
                    <div key={pos} className="tire-card">
                      <span className="tire-pos">{pos}</span>
                      <div className="tire-temp">{Math.floor(85 + Math.random() * 15)}°C</div>
                      <div className="tire-wear-bar">
                        <div className="wear-fill" style={{ width: `${75 + Math.random() * 20}%` }}></div>
                      </div>
                      <span className="tire-wear-pct">{Math.floor(75 + Math.random() * 20)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tire-life-estimate">
                <h4>Estimated Tire Life</h4>
                <div className="life-bars">
                  {(['soft', 'medium', 'hard'] as const).map(compound => (
                    <div key={compound} className="life-bar-row">
                      <span className="compound-label" style={{ color: getCompoundColor(compound) }}>
                        {compound.toUpperCase()}
                      </span>
                      <div className="life-bar">
                        <div className="life-fill" style={{ width: `${(tireLife[compound] / 50) * 100}%`, background: getCompoundColor(compound) }}></div>
                      </div>
                      <span className="life-laps">{tireLife[compound]} laps</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tire-strategy-rec">
                <h4>📊 Recommendation</h4>
                <p>Based on current wear rates and track conditions, switch to <strong style={{ color: '#ffeb3b' }}>MEDIUM</strong> compound at lap {currentLap + 12} for optimal performance.</p>
              </div>
            </div>
          )}

          {activeSection === 'fuel' && (
            <div className="fuel-section">
              <div className="fuel-gauge">
                <div className="gauge-visual">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="#00d4ff" 
                      strokeWidth="8"
                      strokeDasharray={`${(currentFuel / 110) * 283} 283`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="gauge-text">
                    <span className="fuel-amount">{currentFuel.toFixed(1)}</span>
                    <span className="fuel-unit">L</span>
                  </div>
                </div>
              </div>

              <div className="fuel-stats">
                <div className="fuel-stat">
                  <span className="label">Fuel Per Lap</span>
                  <span className="value">{fuelPerLap.toFixed(2)} L</span>
                </div>
                <div className="fuel-stat">
                  <span className="label">Laps Remaining</span>
                  <span className="value">{Math.floor(currentFuel / fuelPerLap)}</span>
                </div>
                <div className="fuel-stat">
                  <span className="label">Fuel Needed</span>
                  <span className="value">{fuelNeeded.toFixed(1)} L</span>
                </div>
                <div className="fuel-stat">
                  <span className="label">Fuel Delta</span>
                  <span className={`value ${currentFuel > fuelNeeded ? 'positive' : 'negative'}`}>
                    {currentFuel > fuelNeeded ? '+' : ''}{(currentFuel - fuelNeeded).toFixed(1)} L
                  </span>
                </div>
              </div>

              <div className="fuel-saving">
                <h4>Fuel Saving Modes</h4>
                <div className="saving-options">
                  <div className="saving-option">
                    <span className="option-name">Lift & Coast</span>
                    <span className="option-save">-0.15 L/lap</span>
                    <span className="option-loss">+0.3s/lap</span>
                  </div>
                  <div className="saving-option">
                    <span className="option-name">Short Shift</span>
                    <span className="option-save">-0.08 L/lap</span>
                    <span className="option-loss">+0.1s/lap</span>
                  </div>
                  <div className="saving-option">
                    <span className="option-name">Engine Mode 2</span>
                    <span className="option-save">-0.20 L/lap</span>
                    <span className="option-loss">+0.5s/lap</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'weather' && (
            <div className="weather-section">
              <div className="current-weather">
                <div className="weather-icon">☀️</div>
                <div className="weather-info">
                  <span className="weather-status">Clear</span>
                  <span className="weather-temp">28°C</span>
                </div>
              </div>

              <div className="weather-forecast">
                <h4>Race Forecast</h4>
                <div className="forecast-timeline">
                  {[0, 15, 30, 45, 60].map(mins => (
                    <div key={mins} className="forecast-item">
                      <span className="time">+{mins}m</span>
                      <span className="icon">{mins < 45 ? '☀️' : '⛅'}</span>
                      <span className="rain">{mins < 45 ? '0%' : '15%'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="weather-impact">
                <h4>Weather Impact Analysis</h4>
                <p>Current conditions favor dry setup. No rain expected during race window. Track temperature optimal for medium compound performance.</p>
              </div>
            </div>
          )}

          {activeSection === 'setup' && (
            <div className="setup-section">
              <SetupAnalysis />
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Driver Detail */}
      <div className="driver-detail-panel">
        {selectedDriverData ? (
          <>
            <div className="detail-header">
              <div className="driver-position" style={{ background: selectedDriverData.driver === 'YOU' ? '#00d4ff' : '#ff6b35' }}>
                P{selectedDriverData.position}
              </div>
              <div className="driver-info">
                <h3>{selectedDriverData.driver}</h3>
                <span className="team">{selectedDriverData.team}</span>
              </div>
            </div>

            <div className="detail-sections">
              <div className="detail-section">
                <h4>📊 Performance</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Last Lap</span>
                    <span className="value">{selectedDriverData.lastLap}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Best Lap</span>
                    <span className="value purple">{selectedDriverData.bestLap}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Gap</span>
                    <span className="value">{selectedDriverData.gap}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Interval</span>
                    <span className="value">{selectedDriverData.interval}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Top Speed</span>
                    <span className="value">{selectedDriverData.speed.toFixed(0)} km/h</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Consistency</span>
                    <span className="value">{selectedDriverData.consistency.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>🛞 Tires & Fuel</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Compound</span>
                    <span className="value" style={{ color: getCompoundColor(selectedDriverData.tireCompound) }}>
                      {selectedDriverData.tireCompound.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Tire Age</span>
                    <span className="value">{selectedDriverData.tireAge} laps</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Tire Wear</span>
                    <span className="value">{selectedDriverData.tireWear}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Fuel Load</span>
                    <span className="value">{selectedDriverData.fuelLoad.toFixed(1)} L</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Pit Stops</span>
                    <span className="value">{selectedDriverData.pitStops}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>👤 Driver Profile</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">iRating</span>
                    <span className="value">{selectedDriverData.iRating.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Safety Rating</span>
                    <span className="value">{selectedDriverData.safetyRating.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Aggression</span>
                    <span className="value" style={{ color: getAggressionColor(selectedDriverData.aggression) }}>
                      {selectedDriverData.aggression.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Incidents</span>
                    <span className={`value ${selectedDriverData.incidents > 2 ? 'warning' : ''}`}>
                      {selectedDriverData.incidents}x
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Overtakes</span>
                    <span className="value">{selectedDriverData.overtakes}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Defense Moves</span>
                    <span className="value">{selectedDriverData.defenseMoves}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>📊 Assessment</h4>
                <p className="ai-assessment">
                  {selectedDriverData.driver === 'YOU' 
                    ? 'Focus on consistent lap times. Current pace is competitive. Watch tire wear in sector 2.'
                    : selectedDriverData.aggression === 'high'
                    ? `${selectedDriverData.driver} is driving aggressively. Expect late braking into corners. Leave space to avoid contact.`
                    : selectedDriverData.aggression === 'low'
                    ? `${selectedDriverData.driver} is driving conservatively. Good opportunity for overtake at Stowe.`
                    : `${selectedDriverData.driver} is maintaining steady pace. May attempt undercut strategy.`
                  }
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="no-driver-selected">
            <span className="icon">👆</span>
            <span className="text">Select a driver from the standings to view detailed information</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyPage;
