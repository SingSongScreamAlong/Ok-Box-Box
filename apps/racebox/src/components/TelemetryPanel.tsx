import type { TelemetryPacket } from '@okboxbox/shared';
import './TelemetryPanel.css';

interface TelemetryPanelProps {
  telemetry: TelemetryPacket;
}

export function TelemetryPanel({ telemetry }: TelemetryPanelProps) {
  const formatLapTime = (ms: number): string => {
    if (ms <= 0) return '--:--.---';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  };

  return (
    <div className="telemetry-panel">
      <h3 className="panel-title">Telemetry</h3>
      
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="telemetry-label">Speed</span>
          <span className="telemetry-value large">{Math.round(telemetry.speed)}</span>
          <span className="telemetry-unit">km/h</span>
        </div>
        
        <div className="telemetry-item">
          <span className="telemetry-label">Gear</span>
          <span className="telemetry-value large">
            {telemetry.gear === -1 ? 'R' : telemetry.gear === 0 ? 'N' : telemetry.gear}
          </span>
        </div>
        
        <div className="telemetry-item">
          <span className="telemetry-label">RPM</span>
          <span className="telemetry-value">{Math.round(telemetry.rpm)}</span>
        </div>
        
        <div className="telemetry-item">
          <span className="telemetry-label">Fuel</span>
          <span className="telemetry-value">{telemetry.fuelLevel.toFixed(1)}</span>
          <span className="telemetry-unit">L</span>
        </div>
      </div>
      
      <div className="telemetry-timing">
        <div className="timing-row">
          <span className="timing-label">Last Lap</span>
          <span className="timing-value">{formatLapTime(telemetry.lastLapTime)}</span>
        </div>
        <div className="timing-row">
          <span className="timing-label">Best Lap</span>
          <span className="timing-value text-green">{formatLapTime(telemetry.bestLapTime)}</span>
        </div>
      </div>
      
      <div className="telemetry-inputs">
        <div className="input-bar">
          <span className="input-label">THR</span>
          <div className="input-track">
            <div 
              className="input-fill throttle" 
              style={{ width: `${telemetry.throttle}%` }} 
            />
          </div>
          <span className="input-value">{Math.round(telemetry.throttle)}%</span>
        </div>
        
        <div className="input-bar">
          <span className="input-label">BRK</span>
          <div className="input-track">
            <div 
              className="input-fill brake" 
              style={{ width: `${telemetry.brake}%` }} 
            />
          </div>
          <span className="input-value">{Math.round(telemetry.brake)}%</span>
        </div>
      </div>
    </div>
  );
}
