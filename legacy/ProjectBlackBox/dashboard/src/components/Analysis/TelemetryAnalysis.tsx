import React, { useState, useEffect, useRef } from 'react';
import { TelemetryData } from '../../services/WebSocketService';
import './TelemetryAnalysis.css';

interface TelemetryAnalysisProps {
  telemetryData: TelemetryData | null;
}

interface LapData {
  lapNumber: number;
  lapTime: number;
  sectors: number[];
  avgSpeed: number;
  maxSpeed: number;
  fuelUsed: number;
  tireWearStart: number;
  tireWearEnd: number;
}

const TelemetryAnalysis: React.FC<TelemetryAnalysisProps> = ({ telemetryData }) => {
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);
  const [lapHistory, setLapHistory] = useState<LapData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'speed' | 'throttle' | 'brake' | 'rpm'>('speed');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedLap, setSelectedLap] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastLapRef = useRef<number>(0);

  // Collect telemetry history
  useEffect(() => {
    if (telemetryData) {
      setTelemetryHistory(prev => {
        const newHistory = [...prev, telemetryData];
        // Keep last 1000 data points
        if (newHistory.length > 1000) {
          return newHistory.slice(-1000);
        }
        return newHistory;
      });

      // Track lap completions
      if (telemetryData.lap > lastLapRef.current && lastLapRef.current > 0) {
        // Lap completed - calculate lap data
        const lapTelemetry = telemetryHistory.filter(t => t.lap === lastLapRef.current);
        if (lapTelemetry.length > 0) {
          const speeds = lapTelemetry.map(t => t.speed);
          const newLapData: LapData = {
            lapNumber: lastLapRef.current,
            lapTime: telemetryData.bestLapTime || telemetryData.lapTime,
            sectors: telemetryData.bestSectorTimes || [0, 0, 0],
            avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
            maxSpeed: Math.max(...speeds),
            fuelUsed: lapTelemetry[0]?.fuel?.level - (telemetryData.fuel?.level || 0),
            tireWearStart: lapTelemetry[0]?.tires?.frontLeft?.wear || 100,
            tireWearEnd: telemetryData.tires?.frontLeft?.wear || 100
          };
          setLapHistory(prev => [...prev, newLapData]);
        }
      }
      lastLapRef.current = telemetryData.lap;
    }
  }, [telemetryData]);

  // Draw telemetry graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || telemetryHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.fillStyle = 'rgba(13, 17, 23, 1)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Get data based on selected metric
    const getData = (t: TelemetryData): number => {
      switch (selectedMetric) {
        case 'speed': return t.speed;
        case 'throttle': return t.throttle * 100;
        case 'brake': return t.brake * 100;
        case 'rpm': return t.rpm / 100; // Scale down for display
        default: return t.speed;
      }
    };

    const getMax = (): number => {
      switch (selectedMetric) {
        case 'speed': return 350;
        case 'throttle': return 100;
        case 'brake': return 100;
        case 'rpm': return 140; // 14000 / 100
        default: return 350;
      }
    };

    const getColor = (): string => {
      switch (selectedMetric) {
        case 'speed': return '#00d4ff';
        case 'throttle': return '#00ff9d';
        case 'brake': return '#ff3b3b';
        case 'rpm': return '#ffd700';
        default: return '#00d4ff';
      }
    };

    const data = telemetryHistory.map(getData);
    const maxVal = getMax();
    const color = getColor();

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((val, i) => {
      const x = padding + (width - 2 * padding) * (i / (data.length - 1));
      const y = height - padding - ((val / maxVal) * (height - 2 * padding));
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw fill
    ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw Y-axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Roboto Mono';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      const value = maxVal * (1 - i / 5);
      ctx.fillText(value.toFixed(0), padding - 5, y + 3);
    }

    // Draw current value
    if (data.length > 0) {
      const currentVal = data[data.length - 1];
      ctx.fillStyle = color;
      ctx.font = 'bold 24px Roboto Mono';
      ctx.textAlign = 'right';
      ctx.fillText(currentVal.toFixed(1), width - padding, padding + 20);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '12px Roboto Mono';
      ctx.fillText(selectedMetric.toUpperCase(), width - padding, padding + 35);
    }

  }, [telemetryHistory, selectedMetric]);

  // Generate sample lap data if none exists
  const displayLapHistory = lapHistory.length > 0 ? lapHistory : [
    { lapNumber: 1, lapTime: 89.234, sectors: [28.1, 32.5, 28.6], avgSpeed: 198, maxSpeed: 312, fuelUsed: 2.8, tireWearStart: 100, tireWearEnd: 97 },
    { lapNumber: 2, lapTime: 88.567, sectors: [27.9, 32.1, 28.5], avgSpeed: 201, maxSpeed: 315, fuelUsed: 2.7, tireWearStart: 97, tireWearEnd: 94 },
    { lapNumber: 3, lapTime: 88.123, sectors: [27.8, 31.9, 28.4], avgSpeed: 203, maxSpeed: 318, fuelUsed: 2.8, tireWearStart: 94, tireWearEnd: 91 },
    { lapNumber: 4, lapTime: 88.456, sectors: [27.9, 32.0, 28.5], avgSpeed: 202, maxSpeed: 316, fuelUsed: 2.9, tireWearStart: 91, tireWearEnd: 88 },
    { lapNumber: 5, lapTime: 88.789, sectors: [28.0, 32.2, 28.5], avgSpeed: 200, maxSpeed: 314, fuelUsed: 2.8, tireWearStart: 88, tireWearEnd: 85 },
  ];

  const bestLap = displayLapHistory.reduce((best, lap) => 
    lap.lapTime < best.lapTime ? lap : best, displayLapHistory[0]);

  const formatLapTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  return (
    <div className="telemetry-analysis">
      {/* Live Graph Section */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>📊 Live Telemetry Trace</h3>
          <div className="metric-selector">
            {(['speed', 'throttle', 'brake', 'rpm'] as const).map(metric => (
              <button
                key={metric}
                className={`metric-btn ${selectedMetric === metric ? 'active' : ''} ${metric}`}
                onClick={() => setSelectedMetric(metric)}
              >
                {metric.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={200}
          className="telemetry-canvas"
        />
      </div>

      {/* Lap History Section */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>🏁 Lap History</h3>
          <div className="best-lap-badge">
            Best: {formatLapTime(bestLap?.lapTime || 0)} (Lap {bestLap?.lapNumber})
          </div>
        </div>
        
        <div className="lap-table">
          <div className="lap-header">
            <span>LAP</span>
            <span>TIME</span>
            <span>S1</span>
            <span>S2</span>
            <span>S3</span>
            <span>AVG SPD</span>
            <span>MAX SPD</span>
            <span>FUEL</span>
            <span>TIRE</span>
          </div>
          {displayLapHistory.slice(-10).reverse().map(lap => (
            <div 
              key={lap.lapNumber} 
              className={`lap-row ${lap.lapNumber === bestLap?.lapNumber ? 'best' : ''} ${selectedLap === lap.lapNumber ? 'selected' : ''}`}
              onClick={() => setSelectedLap(lap.lapNumber === selectedLap ? null : lap.lapNumber)}
            >
              <span className="lap-num">{lap.lapNumber}</span>
              <span className={`lap-time ${lap.lapNumber === bestLap?.lapNumber ? 'purple' : ''}`}>
                {formatLapTime(lap.lapTime)}
              </span>
              <span className={lap.sectors[0] <= Math.min(...displayLapHistory.map(l => l.sectors[0])) ? 'purple' : ''}>
                {lap.sectors[0].toFixed(1)}
              </span>
              <span className={lap.sectors[1] <= Math.min(...displayLapHistory.map(l => l.sectors[1])) ? 'purple' : ''}>
                {lap.sectors[1].toFixed(1)}
              </span>
              <span className={lap.sectors[2] <= Math.min(...displayLapHistory.map(l => l.sectors[2])) ? 'purple' : ''}>
                {lap.sectors[2].toFixed(1)}
              </span>
              <span>{lap.avgSpeed.toFixed(0)} km/h</span>
              <span>{lap.maxSpeed.toFixed(0)} km/h</span>
              <span>{lap.fuelUsed.toFixed(1)}L</span>
              <span className={lap.tireWearEnd < 50 ? 'warning' : ''}>
                {lap.tireWearEnd.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>📈 Session Summary</h3>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Laps</span>
            <span className="summary-value">{displayLapHistory.length}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Best Lap</span>
            <span className="summary-value purple">{formatLapTime(bestLap?.lapTime || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Avg Lap Time</span>
            <span className="summary-value">
              {formatLapTime(displayLapHistory.reduce((sum, l) => sum + l.lapTime, 0) / displayLapHistory.length)}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Consistency</span>
            <span className="summary-value">
              ±{(Math.max(...displayLapHistory.map(l => l.lapTime)) - Math.min(...displayLapHistory.map(l => l.lapTime))).toFixed(2)}s
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Top Speed</span>
            <span className="summary-value">{Math.max(...displayLapHistory.map(l => l.maxSpeed)).toFixed(0)} km/h</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Fuel Used</span>
            <span className="summary-value">{displayLapHistory.reduce((sum, l) => sum + l.fuelUsed, 0).toFixed(1)}L</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryAnalysis;
