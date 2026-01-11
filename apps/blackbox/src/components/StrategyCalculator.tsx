import { useState, useMemo } from 'react';
import './StrategyCalculator.css';

interface StrategyCalculatorProps {
  currentLap: number;
  totalLaps: number;
  currentFuel: number;
  fuelPerLap: number;
  currentTireWear: number;
  tireWearPerLap: number;
  pitStopTime: number;
  currentPosition: number;
  gapAhead: number;
  gapBehind: number;
}

interface PitWindow {
  earliestLap: number;
  latestLap: number;
  optimalLap: number;
  reason: string;
}

interface StrategyOption {
  name: string;
  stops: number;
  pitLaps: number[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export default function StrategyCalculator({
  currentLap,
  totalLaps,
  currentFuel,
  fuelPerLap,
  currentTireWear,
  tireWearPerLap,
  pitStopTime,
  currentPosition,
  gapAhead,
  gapBehind,
}: StrategyCalculatorProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<number>(0);

  const lapsRemaining = totalLaps - currentLap;
  const fuelLapsRemaining = fuelPerLap > 0 ? Math.floor(currentFuel / fuelPerLap) : 999;
  const tireLapsRemaining = tireWearPerLap > 0 ? Math.floor((100 - currentTireWear) / tireWearPerLap) : 999;

  const pitWindow = useMemo((): PitWindow => {
    const fuelLimit = currentLap + fuelLapsRemaining;
    const tireLimit = currentLap + tireLapsRemaining;
    const latestLap = Math.min(fuelLimit, tireLimit, totalLaps - 1);
    
    // Optimal is halfway through remaining stint or before limits
    const optimalLap = Math.min(
      currentLap + Math.floor(lapsRemaining / 2),
      latestLap - 2
    );

    let reason = '';
    if (fuelLimit < tireLimit) {
      reason = 'Fuel limited';
    } else if (tireLimit < fuelLimit) {
      reason = 'Tire limited';
    } else {
      reason = 'Balanced';
    }

    return {
      earliestLap: currentLap + 1,
      latestLap: Math.max(currentLap + 1, latestLap),
      optimalLap: Math.max(currentLap + 1, optimalLap),
      reason,
    };
  }, [currentLap, fuelLapsRemaining, tireLapsRemaining, lapsRemaining, totalLaps]);

  const strategies = useMemo((): StrategyOption[] => {
    const options: StrategyOption[] = [];

    // No-stop strategy (if possible)
    if (fuelLapsRemaining >= lapsRemaining && tireLapsRemaining >= lapsRemaining) {
      options.push({
        name: 'No Stop',
        stops: 0,
        pitLaps: [],
        estimatedTime: 0,
        riskLevel: currentTireWear > 60 ? 'high' : 'low',
        description: 'Complete race on current tires and fuel',
      });
    }

    // One-stop strategy
    const oneStopLap = Math.floor(currentLap + lapsRemaining / 2);
    options.push({
      name: 'One Stop',
      stops: 1,
      pitLaps: [oneStopLap],
      estimatedTime: pitStopTime,
      riskLevel: 'low',
      description: `Pit on lap ${oneStopLap} for fresh tires`,
    });

    // Two-stop strategy
    if (lapsRemaining > 20) {
      const twoStopLap1 = Math.floor(currentLap + lapsRemaining / 3);
      const twoStopLap2 = Math.floor(currentLap + (lapsRemaining * 2) / 3);
      options.push({
        name: 'Two Stop',
        stops: 2,
        pitLaps: [twoStopLap1, twoStopLap2],
        estimatedTime: pitStopTime * 2,
        riskLevel: 'medium',
        description: `Aggressive strategy with fresher tires`,
      });
    }

    // Undercut strategy
    if (gapAhead > 0 && gapAhead < pitStopTime + 5) {
      options.push({
        name: 'Undercut',
        stops: 1,
        pitLaps: [currentLap + 1],
        estimatedTime: pitStopTime,
        riskLevel: 'medium',
        description: `Pit now to undercut car ahead (${gapAhead.toFixed(1)}s gap)`,
      });
    }

    // Overcut strategy
    if (gapBehind > 0 && gapBehind < pitStopTime + 3) {
      options.push({
        name: 'Overcut',
        stops: 1,
        pitLaps: [pitWindow.latestLap],
        estimatedTime: pitStopTime,
        riskLevel: 'medium',
        description: `Stay out to overcut car behind (${gapBehind.toFixed(1)}s gap)`,
      });
    }

    return options;
  }, [currentLap, lapsRemaining, fuelLapsRemaining, tireLapsRemaining, currentTireWear, pitStopTime, gapAhead, gapBehind, pitWindow]);

  const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
    switch (risk) {
      case 'low': return 'var(--accent-success)';
      case 'medium': return 'var(--accent-warning)';
      case 'high': return 'var(--accent-danger)';
    }
  };

  return (
    <div className="panel strategy-calculator">
      <div className="panel-header">
        RACE STRATEGY
      </div>
      <div className="panel-content">
        <div className="race-status">
          <div className="status-item">
            <span className="status-label">Lap</span>
            <span className="status-value">{currentLap} / {totalLaps}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Position</span>
            <span className="status-value">P{currentPosition}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Remaining</span>
            <span className="status-value">{lapsRemaining} laps</span>
          </div>
        </div>

        <div className="resource-bars">
          <div className="resource-bar">
            <div className="bar-header">
              <span className="bar-label">⛽ Fuel</span>
              <span className="bar-value">{currentFuel.toFixed(1)}L ({fuelLapsRemaining} laps)</span>
            </div>
            <div className="bar-track">
              <div 
                className="bar-fill fuel" 
                style={{ width: `${Math.min(100, (fuelLapsRemaining / lapsRemaining) * 100)}%` }}
              />
            </div>
          </div>
          <div className="resource-bar">
            <div className="bar-header">
              <span className="bar-label">🛞 Tires</span>
              <span className="bar-value">{(100 - currentTireWear).toFixed(0)}% ({tireLapsRemaining} laps)</span>
            </div>
            <div className="bar-track">
              <div 
                className="bar-fill tires" 
                style={{ width: `${100 - currentTireWear}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pit-window">
          <div className="pit-window-header">
            <span className="pw-label">Pit Window</span>
            <span className="pw-reason">{pitWindow.reason}</span>
          </div>
          <div className="pit-window-track">
            <div 
              className="pit-window-range"
              style={{
                left: `${((pitWindow.earliestLap - currentLap) / lapsRemaining) * 100}%`,
                width: `${((pitWindow.latestLap - pitWindow.earliestLap) / lapsRemaining) * 100}%`,
              }}
            />
            <div 
              className="pit-window-optimal"
              style={{
                left: `${((pitWindow.optimalLap - currentLap) / lapsRemaining) * 100}%`,
              }}
            />
          </div>
          <div className="pit-window-labels">
            <span>Lap {pitWindow.earliestLap}</span>
            <span className="optimal-label">Optimal: Lap {pitWindow.optimalLap}</span>
            <span>Lap {pitWindow.latestLap}</span>
          </div>
        </div>

        <div className="strategy-options">
          <div className="options-header">Strategy Options</div>
          {strategies.map((strategy, idx) => (
            <div 
              key={idx}
              className={`strategy-option ${selectedStrategy === idx ? 'selected' : ''}`}
              onClick={() => setSelectedStrategy(idx)}
            >
              <div className="option-header">
                <span className="option-name">{strategy.name}</span>
                <span 
                  className="option-risk"
                  style={{ color: getRiskColor(strategy.riskLevel) }}
                >
                  {strategy.riskLevel.toUpperCase()}
                </span>
              </div>
              <div className="option-details">
                <span className="option-stops">{strategy.stops} stop{strategy.stops !== 1 ? 's' : ''}</span>
                {strategy.pitLaps.length > 0 && (
                  <span className="option-laps">
                    Lap {strategy.pitLaps.join(', ')}
                  </span>
                )}
                <span className="option-time">+{strategy.estimatedTime.toFixed(1)}s</span>
              </div>
              <div className="option-desc">{strategy.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
