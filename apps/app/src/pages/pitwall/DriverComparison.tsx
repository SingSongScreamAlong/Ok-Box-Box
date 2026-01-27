import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, TrendingUp, TrendingDown, Minus, RefreshCw
} from 'lucide-react';
// Service imports for future API integration
// import { fetchDriverComparison, type DriverComparisonData } from '../../lib/telemetryService';
// import { fetchTeamDrivers, type Driver } from '../../lib/stintService';

// Types
interface LapData {
  lapNumber: number;
  lapTime: string;
  lapTimeMs: number;
  sector1: string;
  sector2: string;
  sector3: string;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  fuel: number;
  tireWear: number;
  incidents: number;
  position: number;
}

interface TelemetryTrace {
  distance: number; // 0-100 track percentage
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  steering: number;
}

interface DriverData {
  id: string;
  name: string;
  number: string;
  team?: string;
  car: string;
  iRating: number;
  color: string;
  laps: LapData[];
  bestLap: LapData | null;
  avgLapTime: string;
  consistency: number; // percentage
  telemetryTrace: TelemetryTrace[];
}

interface ComparisonMetric {
  label: string;
  driver1Value: string | number;
  driver2Value: string | number;
  driver1Better: boolean | null;
  unit?: string;
}

// Mock data generators
function generateLaps(driverSeed: number, lapCount: number): LapData[] {
  const baseLapTime = 87000 + (driverSeed * 500); // ~1:27.000 base
  const laps: LapData[] = [];
  
  for (let i = 1; i <= lapCount; i++) {
    const variation = (Math.random() - 0.5) * 2000; // ±1s variation
    const lapTimeMs = baseLapTime + variation + (i > 15 ? (i - 15) * 50 : 0); // tire deg
    const s1 = lapTimeMs * 0.32 + (Math.random() - 0.5) * 300;
    const s2 = lapTimeMs * 0.38 + (Math.random() - 0.5) * 400;
    const s3 = lapTimeMs - s1 - s2;
    
    laps.push({
      lapNumber: i,
      lapTime: formatLapTime(lapTimeMs),
      lapTimeMs,
      sector1: formatSectorTime(s1),
      sector2: formatSectorTime(s2),
      sector3: formatSectorTime(s3),
      sector1Ms: s1,
      sector2Ms: s2,
      sector3Ms: s3,
      fuel: 45 - (i * 1.8),
      tireWear: Math.min(100, i * 4),
      incidents: Math.random() > 0.95 ? 1 : 0,
      position: Math.max(1, Math.min(20, 5 + Math.floor((Math.random() - 0.5) * 6)))
    });
  }
  
  return laps;
}

function generateTelemetryTrace(driverSeed: number): TelemetryTrace[] {
  const trace: TelemetryTrace[] = [];
  const brakePoints = [15, 35, 55, 75, 92]; // Track percentage where braking occurs
  
  for (let d = 0; d <= 100; d += 1) {
    const nearBrake = brakePoints.some(bp => Math.abs(d - bp) < 5);
    const inCorner = brakePoints.some(bp => d > bp && d < bp + 10);
    const onStraight = !nearBrake && !inCorner;
    
    trace.push({
      distance: d,
      speed: onStraight ? 165 + driverSeed * 2 + Math.random() * 5 : 
             inCorner ? 75 + driverSeed + Math.random() * 10 : 
             120 + Math.random() * 20,
      throttle: onStraight ? 100 : inCorner ? 40 + driverSeed * 5 : 60,
      brake: nearBrake ? 80 - driverSeed * 3 : 0,
      gear: onStraight ? 6 : inCorner ? 2 + Math.floor(driverSeed / 2) : 4,
      steering: inCorner ? 15 - driverSeed * 2 : Math.random() * 3
    });
  }
  
  return trace;
}

function formatLapTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function formatSectorTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const millis = Math.floor(ms % 1000);
  return `${secs}.${millis.toString().padStart(3, '0')}`;
}

function formatDelta(ms: number): string {
  const sign = ms >= 0 ? '+' : '-';
  const abs = Math.abs(ms);
  return `${sign}${(abs / 1000).toFixed(3)}`;
}

// Mock drivers
const mockDrivers: DriverData[] = [
  {
    id: 'd1',
    name: 'Alex Thompson',
    number: '42',
    team: 'Velocity Racing',
    car: 'Porsche 911 GT3 R',
    iRating: 4250,
    color: '#3b82f6',
    laps: generateLaps(0, 25),
    bestLap: null,
    avgLapTime: '',
    consistency: 0,
    telemetryTrace: generateTelemetryTrace(0)
  },
  {
    id: 'd2',
    name: 'Jordan Mitchell',
    number: '17',
    team: 'Velocity Racing',
    car: 'Porsche 911 GT3 R',
    iRating: 3890,
    color: '#f97316',
    laps: generateLaps(1, 25),
    bestLap: null,
    avgLapTime: '',
    consistency: 0,
    telemetryTrace: generateTelemetryTrace(1)
  },
  {
    id: 'd3',
    name: 'Sam Rodriguez',
    number: '88',
    team: 'Velocity Racing',
    car: 'Porsche 911 GT3 R',
    iRating: 3650,
    color: '#22c55e',
    laps: generateLaps(2, 25),
    bestLap: null,
    avgLapTime: '',
    consistency: 0,
    telemetryTrace: generateTelemetryTrace(2)
  },
  {
    id: 'd4',
    name: 'Casey Williams',
    number: '23',
    team: 'Velocity Racing',
    car: 'Porsche 911 GT3 R',
    iRating: 4100,
    color: '#a855f7',
    laps: generateLaps(0.5, 25),
    bestLap: null,
    avgLapTime: '',
    consistency: 0,
    telemetryTrace: generateTelemetryTrace(0.5)
  }
];

// Calculate derived stats
mockDrivers.forEach(driver => {
  const validLaps = driver.laps.filter(l => l.lapTimeMs > 0);
  driver.bestLap = validLaps.reduce((best, lap) => 
    !best || lap.lapTimeMs < best.lapTimeMs ? lap : best, null as LapData | null);
  
  const avgMs = validLaps.reduce((sum, l) => sum + l.lapTimeMs, 0) / validLaps.length;
  driver.avgLapTime = formatLapTime(avgMs);
  
  const variance = validLaps.reduce((sum, l) => sum + Math.pow(l.lapTimeMs - avgMs, 2), 0) / validLaps.length;
  driver.consistency = Math.max(0, 100 - Math.sqrt(variance) / 10);
});

export function DriverComparison() {
  const { teamId } = useParams<{ teamId: string }>();
  const [drivers] = useState<DriverData[]>(mockDrivers);
  const [driver1, setDriver1] = useState<DriverData>(mockDrivers[0]);
  const [driver2, setDriver2] = useState<DriverData>(mockDrivers[1]);
  const [viewMode, setViewMode] = useState<'laps' | 'telemetry' | 'sectors'>('laps');
  const [selectedLap, setSelectedLap] = useState<number | 'best'>('best');
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);

  // Calculate comparison metrics
  const getComparisonMetrics = (): ComparisonMetric[] => {
    const d1Best = driver1.bestLap?.lapTimeMs || 0;
    const d2Best = driver2.bestLap?.lapTimeMs || 0;
    
    return [
      {
        label: 'Best Lap',
        driver1Value: driver1.bestLap?.lapTime || '--',
        driver2Value: driver2.bestLap?.lapTime || '--',
        driver1Better: d1Best < d2Best
      },
      {
        label: 'Average Lap',
        driver1Value: driver1.avgLapTime,
        driver2Value: driver2.avgLapTime,
        driver1Better: parseFloat(driver1.avgLapTime.replace(':', '')) < parseFloat(driver2.avgLapTime.replace(':', ''))
      },
      {
        label: 'Consistency',
        driver1Value: driver1.consistency.toFixed(1),
        driver2Value: driver2.consistency.toFixed(1),
        driver1Better: driver1.consistency > driver2.consistency,
        unit: '%'
      },
      {
        label: 'Best S1',
        driver1Value: driver1.bestLap?.sector1 || '--',
        driver2Value: driver2.bestLap?.sector1 || '--',
        driver1Better: (driver1.bestLap?.sector1Ms || 0) < (driver2.bestLap?.sector1Ms || 0)
      },
      {
        label: 'Best S2',
        driver1Value: driver1.bestLap?.sector2 || '--',
        driver2Value: driver2.bestLap?.sector2 || '--',
        driver1Better: (driver1.bestLap?.sector2Ms || 0) < (driver2.bestLap?.sector2Ms || 0)
      },
      {
        label: 'Best S3',
        driver1Value: driver1.bestLap?.sector3 || '--',
        driver2Value: driver2.bestLap?.sector3 || '--',
        driver1Better: (driver1.bestLap?.sector3Ms || 0) < (driver2.bestLap?.sector3Ms || 0)
      },
      {
        label: 'Incidents',
        driver1Value: driver1.laps.reduce((sum, l) => sum + l.incidents, 0),
        driver2Value: driver2.laps.reduce((sum, l) => sum + l.incidents, 0),
        driver1Better: driver1.laps.reduce((sum, l) => sum + l.incidents, 0) < driver2.laps.reduce((sum, l) => sum + l.incidents, 0)
      },
      {
        label: 'iRating',
        driver1Value: driver1.iRating.toLocaleString(),
        driver2Value: driver2.iRating.toLocaleString(),
        driver1Better: driver1.iRating > driver2.iRating
      }
    ];
  };

  const metrics = getComparisonMetrics();
  const lapDelta = (driver1.bestLap?.lapTimeMs || 0) - (driver2.bestLap?.lapTimeMs || 0);

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-60"
        >
          <source src="/videos/team-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/90 via-[#0e0e0e]/70 to-[#0e0e0e]/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/90" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  to={`/team/${teamId}/pitwall`}
                  className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Pit Wall
                </Link>
                <div className="h-4 w-px bg-white/[0.10]" />
                <div>
                  <h1 className="text-lg font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Driver Comparison
                  </h1>
                  <p className="text-[10px] text-white/40">Side-by-side telemetry analysis</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] rounded text-xs text-white/70 hover:text-white transition-colors backdrop-blur-sm">
                <RefreshCw className="w-3 h-3" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

      {/* Driver Selection */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Driver 1 Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown1(!showDropdown1)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.10] rounded-lg hover:border-white/[0.20] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: driver1.color }}
                >
                  #{driver1.number}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{driver1.name}</p>
                  <p className="text-[10px] text-white/40">{driver1.car} • {driver1.iRating} iR</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>
            
            {showDropdown1 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-white/[0.10] rounded-lg shadow-xl z-10 overflow-hidden">
                {drivers.filter(d => d.id !== driver2.id).map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setDriver1(d); setShowDropdown1(false); }}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors ${
                      d.id === driver1.id ? 'bg-white/[0.05]' : ''
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: d.color }}
                    >
                      #{d.number}
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-white">{d.name}</p>
                      <p className="text-[10px] text-white/40">{d.iRating} iR</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Driver 2 Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown2(!showDropdown2)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.10] rounded-lg hover:border-white/[0.20] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: driver2.color }}
                >
                  #{driver2.number}
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{driver2.name}</p>
                  <p className="text-[10px] text-white/40">{driver2.car} • {driver2.iRating} iR</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>
            
            {showDropdown2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-white/[0.10] rounded-lg shadow-xl z-10 overflow-hidden">
                {drivers.filter(d => d.id !== driver1.id).map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setDriver2(d); setShowDropdown2(false); }}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors ${
                      d.id === driver2.id ? 'bg-white/[0.05]' : ''
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: d.color }}
                    >
                      #{d.number}
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-white">{d.name}</p>
                      <p className="text-[10px] text-white/40">{d.iRating} iR</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delta Summary */}
        <div className="mt-4 flex items-center justify-center">
          <div className="px-6 py-3 bg-white/[0.03] border border-white/[0.10] rounded-lg">
            <p className="text-[10px] text-white/40 text-center mb-1">Best Lap Delta</p>
            <p className={`text-2xl font-mono font-bold text-center ${
              lapDelta < 0 ? 'text-emerald-400' : lapDelta > 0 ? 'text-red-400' : 'text-white'
            }`}>
              {formatDelta(lapDelta)}
            </p>
            <p className="text-[10px] text-white/30 text-center mt-1">
              {lapDelta < 0 ? `${driver1.name} faster` : lapDelta > 0 ? `${driver2.name} faster` : 'Equal'}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">{metric.label}</p>
              <div className="flex items-center justify-between">
                <div className={`text-sm font-mono ${metric.driver1Better === true ? 'text-emerald-400' : metric.driver1Better === false ? 'text-white/50' : 'text-white'}`}>
                  {metric.driver1Value}{metric.unit || ''}
                </div>
                <div className="px-2">
                  {metric.driver1Better === true ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : metric.driver1Better === false ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : (
                    <Minus className="w-3 h-3 text-white/30" />
                  )}
                </div>
                <div className={`text-sm font-mono ${metric.driver1Better === false ? 'text-emerald-400' : metric.driver1Better === true ? 'text-white/50' : 'text-white'}`}>
                  {metric.driver2Value}{metric.unit || ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 w-fit">
          {(['laps', 'telemetry', 'sectors'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-xs uppercase tracking-wider rounded transition-colors ${
                viewMode === mode
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Comparison View */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {viewMode === 'laps' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Driver 1 Laps */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: driver1.color }} />
                <span className="text-sm text-white font-medium">{driver1.name}</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] sticky top-0">
                    <tr className="text-white/40 uppercase">
                      <th className="px-3 py-2 text-left">Lap</th>
                      <th className="px-3 py-2 text-right">Time</th>
                      <th className="px-3 py-2 text-right">S1</th>
                      <th className="px-3 py-2 text-right">S2</th>
                      <th className="px-3 py-2 text-right">S3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver1.laps.map((lap, idx) => {
                      const isBest = lap.lapTimeMs === driver1.bestLap?.lapTimeMs;
                      const d2Lap = driver2.laps[idx];
                      const delta = d2Lap ? lap.lapTimeMs - d2Lap.lapTimeMs : 0;
                      
                      return (
                        <tr 
                          key={lap.lapNumber}
                          className={`border-b border-white/[0.04] ${isBest ? 'bg-purple-500/10' : ''}`}
                        >
                          <td className="px-3 py-2 text-white/60">{lap.lapNumber}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className={isBest ? 'text-purple-400' : 'text-white'}>{lap.lapTime}</span>
                            {d2Lap && (
                              <span className={`ml-2 text-[10px] ${delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-white/30'}`}>
                                {formatDelta(delta)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-white/60">{lap.sector1}</td>
                          <td className="px-3 py-2 text-right font-mono text-white/60">{lap.sector2}</td>
                          <td className="px-3 py-2 text-right font-mono text-white/60">{lap.sector3}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Driver 2 Laps */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: driver2.color }} />
                <span className="text-sm text-white font-medium">{driver2.name}</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] sticky top-0">
                    <tr className="text-white/40 uppercase">
                      <th className="px-3 py-2 text-left">Lap</th>
                      <th className="px-3 py-2 text-right">Time</th>
                      <th className="px-3 py-2 text-right">S1</th>
                      <th className="px-3 py-2 text-right">S2</th>
                      <th className="px-3 py-2 text-right">S3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver2.laps.map((lap, idx) => {
                      const isBest = lap.lapTimeMs === driver2.bestLap?.lapTimeMs;
                      const d1Lap = driver1.laps[idx];
                      const delta = d1Lap ? lap.lapTimeMs - d1Lap.lapTimeMs : 0;
                      
                      return (
                        <tr 
                          key={lap.lapNumber}
                          className={`border-b border-white/[0.04] ${isBest ? 'bg-purple-500/10' : ''}`}
                        >
                          <td className="px-3 py-2 text-white/60">{lap.lapNumber}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className={isBest ? 'text-purple-400' : 'text-white'}>{lap.lapTime}</span>
                            {d1Lap && (
                              <span className={`ml-2 text-[10px] ${delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-white/30'}`}>
                                {formatDelta(delta)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-white/60">{lap.sector1}</td>
                          <td className="px-3 py-2 text-right font-mono text-white/60">{lap.sector2}</td>
                          <td className="px-3 py-2 text-right font-mono text-white/60">{lap.sector3}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'telemetry' && (
          <div className="space-y-4">
            {/* Speed Trace */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-white font-medium">Speed Trace</h3>
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5" style={{ backgroundColor: driver1.color }} />
                    <span className="text-white/50">{driver1.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5" style={{ backgroundColor: driver2.color }} />
                    <span className="text-white/50">{driver2.name}</span>
                  </div>
                </div>
              </div>
              <div className="h-48 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-[9px] text-white/30">
                  <span>200</span>
                  <span>150</span>
                  <span>100</span>
                  <span>50</span>
                </div>
                {/* Chart area */}
                <div className="ml-12 h-full relative bg-white/[0.02] rounded">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(pct => (
                    <div 
                      key={pct}
                      className="absolute left-0 right-0 border-t border-white/[0.05]"
                      style={{ top: `${pct}%` }}
                    />
                  ))}
                  {/* Driver 1 trace */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke={driver1.color}
                      strokeWidth="2"
                      points={driver1.telemetryTrace.map((t, i) => 
                        `${(t.distance / 100) * 100}%,${100 - (t.speed / 200) * 100}%`
                      ).join(' ')}
                    />
                  </svg>
                  {/* Driver 2 trace */}
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke={driver2.color}
                      strokeWidth="2"
                      strokeDasharray="4,2"
                      points={driver2.telemetryTrace.map((t, i) => 
                        `${(t.distance / 100) * 100}%,${100 - (t.speed / 200) * 100}%`
                      ).join(' ')}
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-12 flex justify-between text-[9px] text-white/30 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Throttle/Brake Traces */}
            <div className="grid grid-cols-2 gap-4">
              {/* Throttle */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-sm text-white font-medium mb-4">Throttle Application</h3>
                <div className="h-32 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] text-white/30">
                    <span>100</span>
                    <span>50</span>
                    <span>0</span>
                  </div>
                  <div className="ml-10 h-full relative bg-white/[0.02] rounded">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={driver1.color}
                        strokeWidth="1.5"
                        points={driver1.telemetryTrace.map(t => 
                          `${t.distance}%,${100 - t.throttle}%`
                        ).join(' ')}
                      />
                      <polyline
                        fill="none"
                        stroke={driver2.color}
                        strokeWidth="1.5"
                        strokeDasharray="3,2"
                        points={driver2.telemetryTrace.map(t => 
                          `${t.distance}%,${100 - t.throttle}%`
                        ).join(' ')}
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Brake */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-sm text-white font-medium mb-4">Brake Pressure</h3>
                <div className="h-32 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] text-white/30">
                    <span>100</span>
                    <span>50</span>
                    <span>0</span>
                  </div>
                  <div className="ml-10 h-full relative bg-white/[0.02] rounded">
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={driver1.color}
                        strokeWidth="1.5"
                        points={driver1.telemetryTrace.map(t => 
                          `${t.distance}%,${100 - t.brake}%`
                        ).join(' ')}
                      />
                      <polyline
                        fill="none"
                        stroke={driver2.color}
                        strokeWidth="1.5"
                        strokeDasharray="3,2"
                        points={driver2.telemetryTrace.map(t => 
                          `${t.distance}%,${100 - t.brake}%`
                        ).join(' ')}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'sectors' && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
            <h3 className="text-sm text-white font-medium mb-6">Sector Analysis (Best Lap)</h3>
            
            <div className="space-y-6">
              {['Sector 1', 'Sector 2', 'Sector 3'].map((sector, idx) => {
                const d1Time = idx === 0 ? driver1.bestLap?.sector1Ms : idx === 1 ? driver1.bestLap?.sector2Ms : driver1.bestLap?.sector3Ms;
                const d2Time = idx === 0 ? driver2.bestLap?.sector1Ms : idx === 1 ? driver2.bestLap?.sector2Ms : driver2.bestLap?.sector3Ms;
                const d1Display = idx === 0 ? driver1.bestLap?.sector1 : idx === 1 ? driver1.bestLap?.sector2 : driver1.bestLap?.sector3;
                const d2Display = idx === 0 ? driver2.bestLap?.sector1 : idx === 1 ? driver2.bestLap?.sector2 : driver2.bestLap?.sector3;
                const delta = (d1Time || 0) - (d2Time || 0);
                const maxTime = Math.max(d1Time || 0, d2Time || 0);
                
                return (
                  <div key={sector}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/50">{sector}</span>
                      <span className={`text-xs font-mono ${delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-white/30'}`}>
                        Δ {formatDelta(delta)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {/* Driver 1 bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-[10px] text-white/50">{driver1.name.split(' ')[0]}</div>
                        <div className="flex-1 h-6 bg-white/[0.05] rounded relative">
                          <div 
                            className="h-full rounded"
                            style={{ 
                              width: `${((d1Time || 0) / maxTime) * 100}%`,
                              backgroundColor: driver1.color
                            }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white">
                            {d1Display}
                          </span>
                        </div>
                      </div>
                      {/* Driver 2 bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-[10px] text-white/50">{driver2.name.split(' ')[0]}</div>
                        <div className="flex-1 h-6 bg-white/[0.05] rounded relative">
                          <div 
                            className="h-full rounded"
                            style={{ 
                              width: `${((d2Time || 0) / maxTime) * 100}%`,
                              backgroundColor: driver2.color
                            }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white">
                            {d2Display}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Theoretical Best */}
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <h4 className="text-xs text-white/50 uppercase tracking-wider mb-3">Theoretical Best Lap</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.03] rounded border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: driver1.color }} />
                    <span className="text-xs text-white">{driver1.name}</span>
                  </div>
                  <p className="text-lg font-mono text-white">
                    {formatLapTime(
                      Math.min(...driver1.laps.map(l => l.sector1Ms)) +
                      Math.min(...driver1.laps.map(l => l.sector2Ms)) +
                      Math.min(...driver1.laps.map(l => l.sector3Ms))
                    )}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1">
                    vs actual best: {driver1.bestLap?.lapTime}
                  </p>
                </div>
                <div className="p-3 bg-white/[0.03] rounded border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: driver2.color }} />
                    <span className="text-xs text-white">{driver2.name}</span>
                  </div>
                  <p className="text-lg font-mono text-white">
                    {formatLapTime(
                      Math.min(...driver2.laps.map(l => l.sector1Ms)) +
                      Math.min(...driver2.laps.map(l => l.sector2Ms)) +
                      Math.min(...driver2.laps.map(l => l.sector3Ms))
                    )}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1">
                    vs actual best: {driver2.bestLap?.lapTime}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
