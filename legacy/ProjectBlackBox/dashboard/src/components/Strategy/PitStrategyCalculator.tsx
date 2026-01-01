import React, { useState, useEffect, useMemo } from 'react';
import { TelemetryData } from '../../services/WebSocketService';
import './PitStrategyCalculator.css';

interface PitStrategyCalculatorProps {
  telemetryData: TelemetryData | null;
  totalLaps: number;
  currentLap: number;
}

interface PitStop {
  lap: number;
  tireCompound: 'soft' | 'medium' | 'hard';
  fuelToAdd: number;
}

interface StrategyResult {
  totalTime: number;
  pitStops: PitStop[];
  fuelPerLap: number;
  tireLifeLaps: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high';
  notes: string[];
}

const PitStrategyCalculator: React.FC<PitStrategyCalculatorProps> = ({ 
  telemetryData, 
  totalLaps = 52,
  currentLap = 1 
}) => {
  // Input state
  const [fuelLoad, setFuelLoad] = useState(110); // Starting fuel in liters
  const [fuelPerLap, setFuelPerLap] = useState(2.8); // Fuel consumption per lap
  const [lapTime, setLapTime] = useState(88.5); // Average lap time in seconds
  const [pitStopTime, setPitStopTime] = useState(24); // Pit stop time loss
  const [selectedCompound, setSelectedCompound] = useState<'soft' | 'medium' | 'hard'>('medium');
  const [numStops, setNumStops] = useState(1);
  
  // Tire life estimates (laps)
  const tireLife = {
    soft: 18,
    medium: 28,
    hard: 40
  };

  // Update from telemetry
  useEffect(() => {
    if (telemetryData) {
      if (telemetryData.fuel?.level) {
        setFuelLoad(telemetryData.fuel.level);
      }
      if (telemetryData.fuel?.usagePerHour && telemetryData.lapTime > 0) {
        const perLap = (telemetryData.fuel.usagePerHour / 3600) * telemetryData.lapTime;
        if (perLap > 0 && perLap < 10) {
          setFuelPerLap(perLap);
        }
      }
      if (telemetryData.bestLapTime > 0) {
        setLapTime(telemetryData.bestLapTime);
      }
    }
  }, [telemetryData]);

  // Calculate optimal strategy
  const strategy = useMemo((): StrategyResult => {
    const remainingLaps = totalLaps - currentLap;
    const fuelNeeded = remainingLaps * fuelPerLap;
    const maxFuelLaps = Math.floor(fuelLoad / fuelPerLap);
    
    const notes: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // Calculate pit windows based on number of stops
    const pitStops: PitStop[] = [];
    const stintLength = Math.floor(remainingLaps / (numStops + 1));
    
    for (let i = 0; i < numStops; i++) {
      const pitLap = currentLap + stintLength * (i + 1);
      
      // Determine tire compound for next stint
      let compound: 'soft' | 'medium' | 'hard' = 'medium';
      const remainingAfterPit = totalLaps - pitLap;
      
      if (remainingAfterPit <= tireLife.soft) {
        compound = 'soft'; // Can use softs for final stint
      } else if (remainingAfterPit <= tireLife.medium) {
        compound = 'medium';
      } else {
        compound = 'hard';
      }
      
      // Calculate fuel to add
      const lapsUntilNextStop = i < numStops - 1 ? stintLength : remainingAfterPit;
      const fuelForStint = lapsUntilNextStop * fuelPerLap + 2; // +2L safety margin
      
      pitStops.push({
        lap: pitLap,
        tireCompound: compound,
        fuelToAdd: Math.min(fuelForStint, 110) // Max tank capacity
      });
    }
    
    // Risk assessment
    if (stintLength > tireLife[selectedCompound]) {
      riskLevel = 'high';
      notes.push(`⚠️ Stint length (${stintLength} laps) exceeds ${selectedCompound} tire life (${tireLife[selectedCompound]} laps)`);
    }
    
    if (maxFuelLaps < stintLength) {
      riskLevel = 'high';
      notes.push(`⚠️ Fuel won't last the stint - need pit by lap ${currentLap + maxFuelLaps}`);
    }
    
    if (numStops === 0 && remainingLaps > tireLife.hard) {
      riskLevel = 'high';
      notes.push(`⚠️ No-stop strategy risky - ${remainingLaps} laps exceeds hard tire life`);
    }
    
    // Optimal window calculation
    const optimalPitWindow = {
      early: Math.max(currentLap + 5, pitStops[0]?.lap - 3 || currentLap + stintLength - 3),
      late: pitStops[0]?.lap + 3 || currentLap + stintLength + 3
    };
    
    if (pitStops.length > 0) {
      notes.push(`📍 Optimal pit window: Lap ${optimalPitWindow.early}-${optimalPitWindow.late}`);
    }
    
    // Undercut/overcut advice
    if (pitStops.length > 0 && pitStops[0].lap - currentLap < 10) {
      notes.push(`🏎️ Undercut opportunity: Pit early (lap ${pitStops[0].lap - 2}) for track position`);
    }
    
    // Calculate total race time
    const totalTime = remainingLaps * lapTime + (numStops * pitStopTime);
    
    return {
      totalTime,
      pitStops,
      fuelPerLap,
      tireLifeLaps: tireLife,
      riskLevel,
      notes
    };
  }, [fuelLoad, fuelPerLap, lapTime, numStops, selectedCompound, totalLaps, currentLap, pitStopTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className="pit-calculator">
      <div className="calc-header">
        <h3>🏁 Pit Strategy Calculator</h3>
        <span className={`risk-badge ${strategy.riskLevel}`}>
          {strategy.riskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Input Section */}
      <div className="calc-inputs">
        <div className="input-group">
          <label>Current Fuel (L)</label>
          <input 
            type="number" 
            value={fuelLoad.toFixed(1)} 
            onChange={(e) => setFuelLoad(parseFloat(e.target.value) || 0)}
            step="0.5"
          />
        </div>
        
        <div className="input-group">
          <label>Fuel/Lap (L)</label>
          <input 
            type="number" 
            value={fuelPerLap.toFixed(2)} 
            onChange={(e) => setFuelPerLap(parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        
        <div className="input-group">
          <label>Avg Lap Time</label>
          <input 
            type="text" 
            value={formatTime(lapTime)} 
            onChange={(e) => {
              const parts = e.target.value.split(':');
              if (parts.length === 2) {
                const secs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                if (!isNaN(secs)) setLapTime(secs);
              }
            }}
          />
        </div>
        
        <div className="input-group">
          <label>Pit Stop Loss (s)</label>
          <input 
            type="number" 
            value={pitStopTime} 
            onChange={(e) => setPitStopTime(parseInt(e.target.value) || 0)}
          />
        </div>
        
        <div className="input-group">
          <label>Number of Stops</label>
          <div className="stop-buttons">
            {[0, 1, 2, 3].map(n => (
              <button 
                key={n}
                className={numStops === n ? 'active' : ''}
                onClick={() => setNumStops(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        
        <div className="input-group">
          <label>Current Compound</label>
          <div className="compound-buttons">
            {(['soft', 'medium', 'hard'] as const).map(c => (
              <button 
                key={c}
                className={`compound-btn ${c} ${selectedCompound === c ? 'active' : ''}`}
                onClick={() => setSelectedCompound(c)}
              >
                {c.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Race Progress */}
      <div className="race-progress">
        <div className="progress-header">
          <span>Lap {currentLap} / {totalLaps}</span>
          <span>{Math.round((currentLap / totalLaps) * 100)}% Complete</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentLap / totalLaps) * 100}%` }}
          />
          {strategy.pitStops.map((stop, i) => (
            <div 
              key={i}
              className="pit-marker"
              style={{ left: `${(stop.lap / totalLaps) * 100}%` }}
              title={`Pit Lap ${stop.lap}`}
            >
              P{i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Output */}
      <div className="strategy-output">
        <h4>Recommended Strategy</h4>
        
        {strategy.pitStops.length === 0 ? (
          <div className="no-stop-strategy">
            <span className="strategy-icon">🎯</span>
            <span>No-Stop Strategy</span>
            <span className="fuel-remaining">
              Fuel at finish: {(fuelLoad - (totalLaps - currentLap) * fuelPerLap).toFixed(1)}L
            </span>
          </div>
        ) : (
          <div className="pit-stops-list">
            {strategy.pitStops.map((stop, i) => (
              <div key={i} className="pit-stop-card">
                <div className="stop-number">STOP {i + 1}</div>
                <div className="stop-details">
                  <div className="stop-lap">
                    <span className="label">Lap</span>
                    <span className="value">{stop.lap}</span>
                  </div>
                  <div className="stop-tire">
                    <span className="label">Tires</span>
                    <span className={`compound-badge ${stop.tireCompound}`}>
                      {stop.tireCompound.toUpperCase()}
                    </span>
                  </div>
                  <div className="stop-fuel">
                    <span className="label">Fuel</span>
                    <span className="value">+{stop.fuelToAdd.toFixed(1)}L</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Strategy Notes */}
        <div className="strategy-notes">
          {strategy.notes.map((note, i) => (
            <div key={i} className="note">{note}</div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat">
            <span className="label">Est. Race Time</span>
            <span className="value">{Math.floor(strategy.totalTime / 60)}:{Math.floor(strategy.totalTime % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="stat">
            <span className="label">Fuel Needed</span>
            <span className="value">{((totalLaps - currentLap) * fuelPerLap).toFixed(1)}L</span>
          </div>
          <div className="stat">
            <span className="label">Laps on Current Fuel</span>
            <span className="value">{Math.floor(fuelLoad / fuelPerLap)}</span>
          </div>
          <div className="stat">
            <span className="label">Tire Life ({selectedCompound})</span>
            <span className="value">{tireLife[selectedCompound]} laps</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitStrategyCalculator;
