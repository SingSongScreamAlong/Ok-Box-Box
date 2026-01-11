import type { TelemetryData } from '../types';
import './Telemetry.css';

interface TelemetryProps {
  telemetryData: TelemetryData | null;
}

export default function Telemetry({ telemetryData }: TelemetryProps) {
  const data = telemetryData;

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '-:--:---';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  return (
    <div className="panel telemetry-panel">
      <div className="panel-header">LIVE TELEMETRY</div>
      <div className="panel-content">
        {!data ? (
          <div className="telemetry-empty">
            <p>Waiting for telemetry data...</p>
            <p className="text-muted">Connect iRacing and start a session</p>
          </div>
        ) : (
          <>
            <div className="telemetry-primary">
              <div className="speed-display">
                <span className="speed-value">{Math.round(data.speed)}</span>
                <span className="speed-unit">KPH</span>
              </div>
              <div className="gear-display">
                <span className="gear-label">GEAR</span>
                <span className="gear-value">{data.gear === 0 ? 'N' : data.gear === -1 ? 'R' : data.gear}</span>
              </div>
              <div className="rpm-display">
                <span className="rpm-value">{Math.round(data.rpm)}</span>
                <span className="rpm-unit">RPM</span>
              </div>
            </div>

            <div className="telemetry-inputs">
              <div className="input-bar throttle">
                <span className="input-label">THR</span>
                <div className="input-track">
                  <div className="input-fill" style={{ width: `${data.throttle * 100}%` }}></div>
                </div>
                <span className="input-value">{Math.round(data.throttle * 100)}%</span>
              </div>
              <div className="input-bar brake">
                <span className="input-label">BRK</span>
                <div className="input-track">
                  <div className="input-fill" style={{ width: `${data.brake * 100}%` }}></div>
                </div>
                <span className="input-value">{Math.round(data.brake * 100)}%</span>
              </div>
            </div>

            <div className="telemetry-times">
              <div className="time-row">
                <span className="time-label">LAP TIME</span>
                <span className="time-value">{formatTime(data.lapTime)}</span>
              </div>
              <div className="time-row">
                <span className="time-label">BEST LAP</span>
                <span className="time-value text-green">{formatTime(data.bestLapTime)}</span>
              </div>
              <div className="time-row">
                <span className="time-label">SECTOR</span>
                <span className="time-value">{formatTime(data.sectorTime)}</span>
              </div>
            </div>

            <div className="telemetry-position">
              <div className="position-item">
                <span className="position-label">POSITION</span>
                <span className="position-value">P{data.racePosition}</span>
              </div>
              <div className="position-item">
                <span className="position-label">GAP AHEAD</span>
                <span className="position-value">{data.gapAhead > 0 ? `+${data.gapAhead.toFixed(3)}` : '-'}</span>
              </div>
              <div className="position-item">
                <span className="position-label">GAP BEHIND</span>
                <span className="position-value">{data.gapBehind > 0 ? `-${data.gapBehind.toFixed(3)}` : '-'}</span>
              </div>
            </div>

            <div className="telemetry-tires">
              <div className="tire-label">TIRE TEMPS</div>
              <div className="tire-grid">
                <div className="tire fl">
                  <span className="tire-pos">FL</span>
                  <span className="tire-temp">{Math.round(data.tires.frontLeft.temp)}°</span>
                </div>
                <div className="tire fr">
                  <span className="tire-pos">FR</span>
                  <span className="tire-temp">{Math.round(data.tires.frontRight.temp)}°</span>
                </div>
                <div className="tire rl">
                  <span className="tire-pos">RL</span>
                  <span className="tire-temp">{Math.round(data.tires.rearLeft.temp)}°</span>
                </div>
                <div className="tire rr">
                  <span className="tire-pos">RR</span>
                  <span className="tire-temp">{Math.round(data.tires.rearRight.temp)}°</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
