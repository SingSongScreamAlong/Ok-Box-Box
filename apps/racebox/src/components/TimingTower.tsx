import type { TimingEntry } from '@okboxbox/shared';
import './TimingTower.css';

interface TimingTowerProps {
  entries: TimingEntry[];
}

export function TimingTower({ entries }: TimingTowerProps) {
  if (entries.length === 0) {
    return (
      <div className="timing-tower empty">
        <div className="timing-header">
          <h3 className="panel-title">Live Timing</h3>
        </div>
        <div className="timing-empty">
          <p>Waiting for session data...</p>
          <p className="text-muted">Start iRacing and the Relay agent to see live timing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timing-tower">
      <div className="timing-header">
        <h3 className="panel-title">Live Timing</h3>
        <span className="driver-count">{entries.length} drivers</span>
      </div>
      
      <div className="timing-table">
        <div className="timing-row header">
          <span className="col-pos">POS</span>
          <span className="col-driver">DRIVER</span>
          <span className="col-gap">GAP</span>
          <span className="col-int">INT</span>
          <span className="col-last">LAST</span>
          <span className="col-best">BEST</span>
        </div>
        
        {entries.map((entry) => (
          <div 
            key={entry.driverId} 
            className={`timing-row ${entry.onPitRoad ? 'in-pit' : ''} ${entry.inPit ? 'pit-stall' : ''}`}
          >
            <span className="col-pos">
              <span className="position-badge">{entry.position}</span>
            </span>
            <span className="col-driver">
              <span className="car-number">{entry.carNumber}</span>
              <span className="driver-name">{entry.driverName}</span>
            </span>
            <span className="col-gap mono">{entry.gap}</span>
            <span className="col-int mono">{entry.interval}</span>
            <span className="col-last mono">{entry.lastLap}</span>
            <span className="col-best mono text-green">{entry.bestLap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
