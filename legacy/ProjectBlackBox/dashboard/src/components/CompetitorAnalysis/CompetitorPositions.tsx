import React from 'react';
import { CompetitorData } from '../../services/WebSocketService';

interface CompetitorPositionsProps {
  competitorData: CompetitorData[] | null;
}

const CompetitorPositions: React.FC<CompetitorPositionsProps> = ({ competitorData }) => {
  // Sample competitor data for development/testing
  const sampleCompetitorData: CompetitorData[] = [
    { position: 1, driver: 'VERSTAPPEN', gap: 'LEADER', lastLap: '1:27.654' },
    { position: 2, driver: 'HAMILTON', gap: '+2.576s', lastLap: '1:27.892' },
    { position: 3, driver: 'YOU', gap: '+3.821s', lastLap: '1:28.456' },
    { position: 4, driver: 'LECLERC', gap: '+6.697s', lastLap: '1:28.234' },
    { position: 5, driver: 'NORRIS', gap: '+8.455s', lastLap: '1:28.789' },
  ];

  // Use provided data or fallback to sample data
  const displayCompetitorData = competitorData || sampleCompetitorData;

  return (
    <div className="panel">
      <div className="panel-header">COMPETITOR ANALYSIS & FIELD DATA</div>
      <div className="panel-content">
        {/* Position Table */}
        <div className="section-title">RACE POSITIONS</div>
        <div style={{ background: '#0d1117', borderRadius: '6px', padding: '8px', marginBottom: '16px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '30px 1fr 60px 60px', 
            gap: '8px', 
            fontSize: '10px', 
            marginBottom: '6px', 
            color: '#7d8590', 
            fontWeight: 600 
          }}>
            <div>POS</div>
            <div>DRIVER</div>
            <div>GAP</div>
            <div>LAST LAP</div>
          </div>
          
          {displayCompetitorData.map((competitor, index) => (
            <div 
              key={`competitor-${index}`}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '30px 1fr 60px 60px', 
                gap: '8px', 
                fontSize: '11px', 
                marginBottom: '4px', 
                color: '#f0f6fc',
                ...(competitor.driver === 'YOU' ? {
                  background: 'rgba(255, 107, 53, 0.1)',
                  padding: '4px',
                  borderRadius: '4px'
                } : {})
              }}
            >
              <div style={{ 
                color: competitor.position === 1 
                  ? '#ffeb3b' 
                  : competitor.driver === 'YOU' 
                    ? '#ff6b35' 
                    : '#7d8590' 
              }}>
                {competitor.position}
              </div>
              <div>{competitor.driver}</div>
              <div>{competitor.gap}</div>
              <div style={{ 
                color: index === 0 ? '#00ff41' : '#f0f6fc' 
              }}>
                {competitor.lastLap}
              </div>
            </div>
          ))}
        </div>

        {/* Gap Analysis */}
        <div className="section-title">GAP ANALYSIS</div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Gap to P1</div>
            <div className="stat-value status-critical">
              {displayCompetitorData.find(c => c.driver === 'YOU')?.gap || '-'}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Gap to P2</div>
            <div className="stat-value status-warning">
              {calculateGapToPrevious(displayCompetitorData, 'YOU')}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Gap to P4</div>
            <div className="stat-value status-good">
              {calculateGapToNext(displayCompetitorData, 'YOU')}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Last Lap Delta</div>
            <div className="stat-value status-warning">
              {calculateLastLapDelta(displayCompetitorData, 'YOU', 1)}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Pace vs Leader</div>
            <div className="stat-value">
              {calculateAveragePaceDelta(displayCompetitorData, 'YOU', 1)}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">DRS Range</div>
            <div className="stat-value status-critical">
              {isInDrsRange(displayCompetitorData, 'YOU') ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate gap to previous position
const calculateGapToPrevious = (competitors: CompetitorData[], driverName: string): string => {
  const driverIndex = competitors.findIndex(c => c.driver === driverName);
  if (driverIndex <= 0) return '-';
  
  const driver = competitors[driverIndex];
  const previousDriver = competitors[driverIndex - 1];
  
  if (driver.gap === 'LEADER' || previousDriver.gap === 'LEADER') return '-';
  
  // Extract numerical values from gap strings (remove '+' and 's')
  const driverGap = parseFloat(driver.gap.replace('+', '').replace('s', ''));
  const previousGap = parseFloat(previousDriver.gap.replace('+', '').replace('s', ''));
  
  return `+${(driverGap - previousGap).toFixed(3)}s`;
};

// Helper function to calculate gap to next position
const calculateGapToNext = (competitors: CompetitorData[], driverName: string): string => {
  const driverIndex = competitors.findIndex(c => c.driver === driverName);
  if (driverIndex === -1 || driverIndex === competitors.length - 1) return '-';
  
  const driver = competitors[driverIndex];
  const nextDriver = competitors[driverIndex + 1];
  
  if (driver.gap === 'LEADER' || nextDriver.gap === 'LEADER') return '-';
  
  // Extract numerical values from gap strings (remove '+' and 's')
  const driverGap = parseFloat(driver.gap.replace('+', '').replace('s', ''));
  const nextGap = parseFloat(nextDriver.gap.replace('+', '').replace('s', ''));
  
  return `+${(nextGap - driverGap).toFixed(3)}s`;
};

// Helper function to calculate last lap delta compared to another position
const calculateLastLapDelta = (competitors: CompetitorData[], driverName: string, comparePosition: number): string => {
  const driver = competitors.find(c => c.driver === driverName);
  const compareDriver = competitors.find(c => c.position === comparePosition);
  
  if (!driver || !compareDriver) return '-';
  
  // Parse lap times (format: '1:27.654')
  const driverTime = parseLapTime(driver.lastLap);
  const compareTime = parseLapTime(compareDriver.lastLap);
  
  if (driverTime === null || compareTime === null) return '-';
  
  const delta = driverTime - compareTime;
  return delta > 0 ? `+${delta.toFixed(3)}s` : `${delta.toFixed(3)}s`;
};

// Helper function to parse lap time string to seconds
const parseLapTime = (lapTime: string): number | null => {
  const match = lapTime.match(/(\d+):(\d+\.\d+)/);
  if (!match) return null;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseFloat(match[2]);
  
  return minutes * 60 + seconds;
};

// Helper function to calculate average pace delta (simplified for demo)
const calculateAveragePaceDelta = (competitors: CompetitorData[], driverName: string, comparePosition: number): string => {
  // In a real implementation, this would average over multiple laps
  return calculateLastLapDelta(competitors, driverName, comparePosition);
};

// Helper function to check if driver is in DRS range (within 1 second of car ahead)
const isInDrsRange = (competitors: CompetitorData[], driverName: string): boolean => {
  const driverIndex = competitors.findIndex(c => c.driver === driverName);
  if (driverIndex <= 0) return false;
  
  const previousDriver = competitors[driverIndex - 1];
  const driver = competitors[driverIndex];
  
  if (driver.gap === 'LEADER' || previousDriver.gap === 'LEADER') return false;
  
  const driverGap = parseFloat(driver.gap.replace('+', '').replace('s', ''));
  const previousGap = parseFloat(previousDriver.gap.replace('+', '').replace('s', ''));
  
  return (driverGap - previousGap) < 1.0;
};

export default CompetitorPositions;
