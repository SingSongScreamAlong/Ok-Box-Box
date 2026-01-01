import React from 'react';
import { CompetitorData, StrategyData } from '../../services/WebSocketService';

interface CompetitorAnalysisProps {
  competitorData: CompetitorData[] | null;
  strategyData: StrategyData | null;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ competitorData, strategyData }) => {
  // Sample competitor data for development/testing
  const sampleCompetitorData: CompetitorData[] = [
    { position: 1, driver: 'VERSTAPPEN', gap: 'LEADER', lastLap: '1:27.654' },
    { position: 2, driver: 'HAMILTON', gap: '+2.576s', lastLap: '1:27.892' },
    { position: 3, driver: 'YOU', gap: '+3.821s', lastLap: '1:28.456' },
    { position: 4, driver: 'LECLERC', gap: '+6.697s', lastLap: '1:28.234' },
    { position: 5, driver: 'NORRIS', gap: '+8.455s', lastLap: '1:28.789' },
  ];

  // Sample strategy data for development/testing
  const sampleStrategyData: StrategyData = {
    pitWindow: 'Lap 14-17',
    optimalPit: 'Lap 15',
    tireStrategy: 'Medium → Hard',
    fuelStrategy: 'Standard',
    paceTarget: '1:28.2-1:28.5',
    positionPrediction: 'P3-P4',
    undercutRisk: 'Low',
    tireLife: 73
  };

  // Use provided data or fallback to sample data
  const displayCompetitorData = competitorData || sampleCompetitorData;
  const displayStrategyData = strategyData || sampleStrategyData;

  return (
    <div className="panel">
      <div className="panel-header">RACE STRATEGY & TIMING ANALYSIS</div>
      <div className="panel-content">
        <div className="strategy-grid">
          <div className={`strategy-item ${displayStrategyData.pitWindow ? 'optimal' : ''}`}>
            <div className="stat-label">Pit Window</div>
            <div className="stat-value">{displayStrategyData.pitWindow}</div>
          </div>
          <div className={`strategy-item ${displayStrategyData.optimalPit ? 'warning' : ''}`}>
            <div className="stat-label">Optimal Pit</div>
            <div className="stat-value">{displayStrategyData.optimalPit}</div>
          </div>
          <div className="strategy-item">
            <div className="stat-label">Tire Strategy</div>
            <div className="stat-value">{displayStrategyData.tireStrategy}</div>
          </div>
          <div className="strategy-item">
            <div className="stat-label">Fuel Strategy</div>
            <div className="stat-value">{displayStrategyData.fuelStrategy}</div>
          </div>
          <div className="strategy-item">
            <div className="stat-label">Pace Target</div>
            <div className="stat-value">{displayStrategyData.paceTarget}</div>
          </div>
          <div className="strategy-item">
            <div className="stat-label">Position Pred.</div>
            <div className="stat-value">{displayStrategyData.positionPrediction}</div>
          </div>
          <div className={`strategy-item ${displayStrategyData.undercutRisk === 'Low' ? 'optimal' : 'warning'}`}>
            <div className="stat-label">Undercut Risk</div>
            <div className="stat-value">{displayStrategyData.undercutRisk}</div>
          </div>
          <div className={`strategy-item ${displayStrategyData.tireLife > 80 ? 'optimal' : 
                                         displayStrategyData.tireLife > 60 ? 'warning' : 'critical'}`}>
            <div className="stat-label">Tire Life</div>
            <div className="stat-value">{displayStrategyData.tireLife}%</div>
          </div>
        </div>
        
        {/* Sector Analysis */}
        <div style={{ marginTop: '16px' }}>
          <div className="section-title">SECTOR ANALYSIS</div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Sector 1</div>
              <div className="stat-value">23.845s</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Best S1</div>
              <div className="stat-value status-good">23.721s</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Sector 2</div>
              <div className="stat-value">31.245s</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Best S2</div>
              <div className="stat-value status-warning">30.987s</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Sector 3</div>
              <div className="stat-value">33.012s</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Best S3</div>
              <div className="stat-value status-good">32.891s</div>
            </div>
          </div>
        </div>

        {/* Weather & Track Conditions */}
        <div style={{ marginTop: '16px' }}>
          <div className="section-title">TRACK CONDITIONS</div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Track Temp</div>
              <div className="stat-value">42°C</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Air Temp</div>
              <div className="stat-value">28°C</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Wind Speed</div>
              <div className="stat-value">12 km/h</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Wind Direction</div>
              <div className="stat-value">NW</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Humidity</div>
              <div className="stat-value">65%</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Track Grip</div>
              <div className="stat-value status-good">95%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorAnalysis;
