import { useState } from 'react';
import './LapComparison.css';

interface LapData {
  lapNumber: number;
  lapTime: number;
  sector1: number;
  sector2: number;
  sector3: number;
  topSpeed: number;
  avgSpeed: number;
  fuelUsed: number;
  tireWear: number;
  isPersonalBest: boolean;
  isSessionBest: boolean;
}

interface LapComparisonProps {
  laps: LapData[];
  bestLap: LapData | null;
  theoreticalBest: {
    sector1: number;
    sector2: number;
    sector3: number;
    total: number;
  } | null;
}

export default function LapComparison({ laps, bestLap, theoreticalBest }: LapComparisonProps) {
  const [compareMode, setCompareMode] = useState<'best' | 'previous' | 'custom'>('best');

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  const formatDelta = (delta: number): string => {
    if (delta === 0) return '±0.000';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}`;
  };

  const getDeltaClass = (delta: number): string => {
    if (delta < 0) return 'faster';
    if (delta > 0) return 'slower';
    return 'equal';
  };

  const getComparisonLap = (lap: LapData): LapData | null => {
    if (compareMode === 'best') return bestLap;
    if (compareMode === 'previous') {
      const idx = laps.findIndex(l => l.lapNumber === lap.lapNumber);
      return idx > 0 ? laps[idx - 1] : null;
    }
    return null;
  };

  const recentLaps = laps.slice(-10).reverse();

  return (
    <div className="panel lap-comparison">
      <div className="panel-header">
        LAP ANALYSIS
        <div className="compare-mode-selector">
          <button 
            className={`mode-btn ${compareMode === 'best' ? 'active' : ''}`}
            onClick={() => setCompareMode('best')}
          >
            vs Best
          </button>
          <button 
            className={`mode-btn ${compareMode === 'previous' ? 'active' : ''}`}
            onClick={() => setCompareMode('previous')}
          >
            vs Prev
          </button>
        </div>
      </div>
      <div className="panel-content">
        {theoreticalBest && (
          <div className="theoretical-best">
            <div className="tb-header">
              <span className="tb-label">Theoretical Best</span>
              <span className="tb-time">{formatTime(theoreticalBest.total)}</span>
            </div>
            <div className="tb-sectors">
              <div className="tb-sector">
                <span className="sector-label">S1</span>
                <span className="sector-time">{formatTime(theoreticalBest.sector1)}</span>
              </div>
              <div className="tb-sector">
                <span className="sector-label">S2</span>
                <span className="sector-time">{formatTime(theoreticalBest.sector2)}</span>
              </div>
              <div className="tb-sector">
                <span className="sector-label">S3</span>
                <span className="sector-time">{formatTime(theoreticalBest.sector3)}</span>
              </div>
            </div>
          </div>
        )}

        {bestLap && (
          <div className="best-lap-summary">
            <div className="best-lap-header">
              <span className="best-label">🏆 Personal Best</span>
              <span className="best-lap-num">Lap {bestLap.lapNumber}</span>
            </div>
            <div className="best-lap-time">{formatTime(bestLap.lapTime)}</div>
            <div className="best-lap-sectors">
              <span>{formatTime(bestLap.sector1)}</span>
              <span>{formatTime(bestLap.sector2)}</span>
              <span>{formatTime(bestLap.sector3)}</span>
            </div>
          </div>
        )}

        <div className="lap-table">
          <div className="lap-table-header">
            <span className="col-lap">Lap</span>
            <span className="col-time">Time</span>
            <span className="col-delta">Delta</span>
            <span className="col-s1">S1</span>
            <span className="col-s2">S2</span>
            <span className="col-s3">S3</span>
          </div>
          <div className="lap-table-body">
            {recentLaps.length === 0 ? (
              <div className="no-laps">No lap data available</div>
            ) : (
              recentLaps.map(lap => {
                const compareLap = getComparisonLap(lap);
                const delta = compareLap ? lap.lapTime - compareLap.lapTime : 0;
                const s1Delta = compareLap ? lap.sector1 - compareLap.sector1 : 0;
                const s2Delta = compareLap ? lap.sector2 - compareLap.sector2 : 0;
                const s3Delta = compareLap ? lap.sector3 - compareLap.sector3 : 0;

                return (
                  <div 
                    key={lap.lapNumber} 
                    className={`lap-row ${lap.isPersonalBest ? 'pb' : ''} ${lap.isSessionBest ? 'sb' : ''}`}
                  >
                    <span className="col-lap">
                      {lap.lapNumber}
                      {lap.isPersonalBest && <span className="badge pb">PB</span>}
                      {lap.isSessionBest && <span className="badge sb">SB</span>}
                    </span>
                    <span className="col-time">{formatTime(lap.lapTime)}</span>
                    <span className={`col-delta ${getDeltaClass(delta)}`}>
                      {compareLap ? formatDelta(delta) : '-'}
                    </span>
                    <span className={`col-s1 ${getDeltaClass(s1Delta)}`}>
                      {formatTime(lap.sector1)}
                    </span>
                    <span className={`col-s2 ${getDeltaClass(s2Delta)}`}>
                      {formatTime(lap.sector2)}
                    </span>
                    <span className={`col-s3 ${getDeltaClass(s3Delta)}`}>
                      {formatTime(lap.sector3)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lap-stats">
          <div className="stat-item">
            <span className="stat-label">Avg Lap</span>
            <span className="stat-value">
              {laps.length > 0 
                ? formatTime(laps.reduce((sum, l) => sum + l.lapTime, 0) / laps.length)
                : '-'
              }
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Consistency</span>
            <span className="stat-value">
              {laps.length > 1 
                ? `±${(Math.sqrt(laps.reduce((sum, l) => {
                    const avg = laps.reduce((s, lap) => s + lap.lapTime, 0) / laps.length;
                    return sum + Math.pow(l.lapTime - avg, 2);
                  }, 0) / laps.length)).toFixed(3)}s`
                : '-'
              }
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Laps</span>
            <span className="stat-value">{laps.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
