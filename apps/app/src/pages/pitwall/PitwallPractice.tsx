import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Timer, Clock, CheckCircle, Plus, TrendingUp, TrendingDown, Zap, BarChart3, Activity, AlertTriangle, Target, Layers, Loader2 } from 'lucide-react';
import { useTeamData } from '../../hooks/useTeamData';

// Types - comprehensive practice/telemetry modeling
interface RunPlan {
  id: string;
  name: string;
  target_laps: number;
  completed_laps: number;
  target_time?: string;
  focus: string[];
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
}

interface SectorTime {
  sector: number;
  time: number; // ms
  delta_to_best: number; // ms, negative = faster
  color: 'purple' | 'green' | 'yellow' | 'red'; // purple = personal best, green = session best
}

interface LapData {
  lap_number: number;
  lap_time: string;
  lap_time_ms: number;
  sectors: SectorTime[];
  fuel_used: number;
  tire_wear: number; // % degradation this lap
  is_valid: boolean;
  is_personal_best: boolean;
  is_session_best: boolean;
  track_temp: number;
  conditions: 'dry' | 'damp' | 'wet';
}

interface DriverStint {
  driver_id: string;
  driver_name: string;
  laps: number;
  best_lap: string;
  best_lap_ms: number;
  avg_lap: string;
  avg_lap_ms: number;
  consistency: number; // % variance
  incidents: number;
  fuel_per_lap: number;
  tire_deg_per_lap: number;
  sectors: { s1_best: string; s2_best: string; s3_best: string };
  theoretical_best: string;
  gap_to_leader: string;
  lap_history: LapData[];
}

interface TelemetrySnapshot {
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  steering: number;
  fuel_remaining: number;
  tire_temps: { fl: number; fr: number; rl: number; rr: number };
  tire_wear: { fl: number; fr: number; rl: number; rr: number };
}

// Mock data - professional depth
const mockRunPlans: RunPlan[] = [
  {
    id: 'rp1',
    name: 'Long Run Simulation',
    target_laps: 30,
    completed_laps: 30,
    target_time: '1:48.000',
    focus: ['Tire degradation curve', 'Fuel consumption mapping', 'Consistency under load'],
    status: 'completed',
    notes: 'Completed. Tire deg 0.08s/lap on mediums. Fuel 2.78L/lap avg.'
  },
  {
    id: 'rp2',
    name: 'Qualifying Simulation',
    target_laps: 5,
    completed_laps: 3,
    target_time: '1:46.500',
    focus: ['Single lap pace', 'Optimal tire prep', 'Track position'],
    status: 'in_progress',
    notes: 'Current best 1:46.892. Gap to target: +0.392s'
  },
  {
    id: 'rp3',
    name: 'Race Start Practice',
    target_laps: 10,
    completed_laps: 0,
    focus: ['Launch technique', 'Turn 1 positioning', 'First lap survival'],
    status: 'planned'
  },
  {
    id: 'rp4',
    name: 'Traffic Management',
    target_laps: 20,
    completed_laps: 0,
    focus: ['Overtaking zones', 'Defensive lines', 'Dirty air management'],
    status: 'planned'
  }
];

const mockStints: DriverStint[] = [
  { 
    driver_id: 'd1', driver_name: 'Alex Rivera', laps: 45, 
    best_lap: '1:47.342', best_lap_ms: 107342, avg_lap: '1:48.012', avg_lap_ms: 108012,
    consistency: 94, incidents: 0, fuel_per_lap: 2.78, tire_deg_per_lap: 0.08,
    sectors: { s1_best: '32.456', s2_best: '42.123', s3_best: '32.612' },
    theoretical_best: '1:47.191', gap_to_leader: '-',
    lap_history: [
      { lap_number: 43, lap_time: '1:47.892', lap_time_ms: 107892, sectors: [{ sector: 1, time: 32567, delta_to_best: 111, color: 'green' }, { sector: 2, time: 42234, delta_to_best: 111, color: 'yellow' }, { sector: 3, time: 33091, delta_to_best: 479, color: 'yellow' }], fuel_used: 2.81, tire_wear: 0.09, is_valid: true, is_personal_best: false, is_session_best: false, track_temp: 38, conditions: 'dry' },
      { lap_number: 44, lap_time: '1:47.456', lap_time_ms: 107456, sectors: [{ sector: 1, time: 32489, delta_to_best: 33, color: 'green' }, { sector: 2, time: 42156, delta_to_best: 33, color: 'green' }, { sector: 3, time: 32811, delta_to_best: 199, color: 'yellow' }], fuel_used: 2.76, tire_wear: 0.07, is_valid: true, is_personal_best: false, is_session_best: false, track_temp: 37, conditions: 'dry' },
      { lap_number: 45, lap_time: '1:47.342', lap_time_ms: 107342, sectors: [{ sector: 1, time: 32456, delta_to_best: 0, color: 'purple' }, { sector: 2, time: 42123, delta_to_best: 0, color: 'purple' }, { sector: 3, time: 32763, delta_to_best: 151, color: 'yellow' }], fuel_used: 2.74, tire_wear: 0.06, is_valid: true, is_personal_best: true, is_session_best: false, track_temp: 36, conditions: 'dry' },
    ]
  },
  { 
    driver_id: 'd2', driver_name: 'Jordan Chen', laps: 38, 
    best_lap: '1:47.156', best_lap_ms: 107156, avg_lap: '1:48.445', avg_lap_ms: 108445,
    consistency: 86, incidents: 1, fuel_per_lap: 2.82, tire_deg_per_lap: 0.11,
    sectors: { s1_best: '32.234', s2_best: '42.089', s3_best: '32.678' },
    theoretical_best: '1:47.001', gap_to_leader: '-0.186',
    lap_history: []
  },
  { 
    driver_id: 'd3', driver_name: 'Sam Williams', laps: 28, 
    best_lap: '1:48.102', best_lap_ms: 108102, avg_lap: '1:48.890', avg_lap_ms: 108890,
    consistency: 91, incidents: 0, fuel_per_lap: 2.71, tire_deg_per_lap: 0.06,
    sectors: { s1_best: '32.678', s2_best: '42.456', s3_best: '32.812' },
    theoretical_best: '1:47.946', gap_to_leader: '+0.946',
    lap_history: []
  },
  { 
    driver_id: 'd4', driver_name: 'Casey Morgan', laps: 15, 
    best_lap: '1:49.234', best_lap_ms: 109234, avg_lap: '1:50.678', avg_lap_ms: 110678,
    consistency: 72, incidents: 2, fuel_per_lap: 2.95, tire_deg_per_lap: 0.14,
    sectors: { s1_best: '33.456', s2_best: '43.234', s3_best: '32.544' },
    theoretical_best: '1:49.234', gap_to_leader: '+2.078',
    lap_history: []
  }
];

const statusStyles: Record<string, { bg: string; text: string; icon: any }> = {
  planned: { bg: 'bg-white/10', text: 'text-white/40', icon: Clock },
  in_progress: { bg: 'bg-[#f97316]/20', text: 'text-[#f97316]', icon: Timer },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle }
};

export function PitwallPractice() {
  const { teamId } = useParams<{ teamId: string }>();
  const { runPlans: serviceRunPlans, driverStints: serviceStints, loading: dataLoading } = useTeamData();
  const [runPlans, setRunPlans] = useState<RunPlan[]>([]);
  const [stints, setStints] = useState<DriverStint[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'telemetry'>('overview');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Map service data to local format (camelCase -> snake_case for compatibility)
  useEffect(() => {
    if (!dataLoading && serviceRunPlans.length > 0) {
      setRunPlans(serviceRunPlans.map(rp => ({
        id: rp.id,
        name: rp.name,
        target_laps: rp.targetLaps,
        completed_laps: rp.completedLaps,
        target_time: rp.targetTime,
        focus: rp.focus,
        status: rp.status,
        notes: rp.notes,
      })));
    }
    if (!dataLoading && serviceStints.length > 0) {
      setStints(serviceStints.map(s => ({
        driver_id: s.driverId,
        driver_name: s.driverName,
        laps: s.laps,
        best_lap: s.bestLap,
        best_lap_ms: s.bestLapMs,
        avg_lap: s.avgLap,
        avg_lap_ms: s.avgLapMs,
        consistency: s.consistency,
        incidents: s.incidents,
        fuel_per_lap: s.fuelPerLap,
        tire_deg_per_lap: s.tireDegPerLap,
        sectors: { s1_best: s.sectors.s1Best, s2_best: s.sectors.s2Best, s3_best: s.sectors.s3Best },
        theoretical_best: s.theoreticalBest,
        gap_to_leader: s.gapToLeader,
        lap_history: [],
      })));
    }
  }, [dataLoading, serviceRunPlans, serviceStints]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  // Find best lap and theoretical best across all drivers
  const bestOverall = stints.reduce((best, s) => (!best || s.best_lap_ms < best.ms) ? { time: s.best_lap, ms: s.best_lap_ms, driver: s.driver_name } : best, { time: '', ms: Infinity, driver: '' });
  const theoreticalBest = stints.reduce((best, s) => (!best || s.theoretical_best < best) ? s.theoretical_best : best, '');
  const totalLaps = stints.reduce((sum, s) => sum + s.laps, 0);
  const totalIncidents = stints.reduce((sum, s) => sum + s.incidents, 0);
  const avgFuelPerLap = stints.length > 0 ? (stints.reduce((sum, s) => sum + s.fuel_per_lap, 0) / stints.length).toFixed(2) : '0';

  const selectedStint = stints.find(s => s.driver_id === selectedDriver);

  if (dataLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-white/50 text-sm">Loading practice...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/bg-3.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/95 via-[#0e0e0e]/80 to-[#0e0e0e]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/95" />
      </div>

      <div className="relative z-10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide uppercase text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Practice Analysis
          </h1>
          <p className="text-sm mt-1 text-white/50">Daytona International Speedway • GT3 • Dry Conditions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-white/40 uppercase">Session Time</div>
            <div className="text-lg font-mono text-white">1:24:32</div>
          </div>
        </div>
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Session Best</div>
          <div className="text-xl font-bold text-purple-400 font-mono">{bestOverall.time}</div>
          <div className="text-[10px] text-white/30">{bestOverall.driver}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Theoretical</div>
          <div className="text-xl font-bold text-[#3b82f6] font-mono">{theoreticalBest}</div>
          <div className="text-[10px] text-white/30">Combined sectors</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Laps</div>
          <div className="text-xl font-bold text-white font-mono">{totalLaps}</div>
          <div className="text-[10px] text-white/30">{stints.length} drivers</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Fuel/Lap</div>
          <div className="text-xl font-bold text-[#f97316] font-mono">{avgFuelPerLap}L</div>
          <div className="text-[10px] text-white/30">Team average</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Track Temp</div>
          <div className="text-xl font-bold text-white font-mono">36°C</div>
          <div className="text-[10px] text-white/30">Optimal</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded p-3 text-center">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Incidents</div>
          <div className={`text-xl font-bold font-mono ${totalIncidents === 0 ? 'text-green-400' : totalIncidents <= 2 ? 'text-yellow-400' : 'text-red-400'}`}>{totalIncidents}x</div>
          <div className="text-[10px] text-white/30">Session total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded p-1 w-fit">
            {(['overview', 'sectors', 'telemetry'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                  activeTab === tab ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {tab === 'overview' ? 'Driver Overview' : tab === 'sectors' ? 'Sector Analysis' : 'Telemetry'}
              </button>
            ))}
          </div>

          {/* Overview Tab - Driver Comparison */}
          {activeTab === 'overview' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-cyan-400" />
                  <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Driver Comparison
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-black/20 text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                      <th className="text-left py-3 px-4">Driver</th>
                      <th className="text-right py-3 px-3">Laps</th>
                      <th className="text-right py-3 px-3">Best</th>
                      <th className="text-right py-3 px-3">Theoretical</th>
                      <th className="text-right py-3 px-3">Gap</th>
                      <th className="text-right py-3 px-3">Avg</th>
                      <th className="text-right py-3 px-3">Cons.</th>
                      <th className="text-right py-3 px-3">Fuel/L</th>
                      <th className="text-right py-3 px-3">Tire Deg</th>
                      <th className="text-right py-3 px-4">Inc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stints.map((stint, idx) => (
                      <tr 
                        key={stint.driver_id} 
                        className={`border-t border-white/5 cursor-pointer transition-colors ${selectedDriver === stint.driver_id ? 'bg-white/5' : 'hover:bg-white/5'}`}
                        onClick={() => setSelectedDriver(stint.driver_id === selectedDriver ? null : stint.driver_id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: idx === 0 ? '#f97316' : idx === 1 ? '#3b82f6' : idx === 2 ? '#22c55e' : '#a855f7', color: 'black' }}>
                              {stint.driver_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="font-medium text-white">{stint.driver_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white">{stint.laps}</td>
                        <td className={`py-3 px-3 text-right font-mono ${stint.best_lap_ms === bestOverall.ms ? 'text-purple-400 font-bold' : 'text-white'}`}>
                          {stint.best_lap}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#3b82f6]">{stint.theoretical_best}</td>
                        <td className={`py-3 px-3 text-right font-mono ${stint.gap_to_leader.startsWith('-') ? 'text-green-400' : stint.gap_to_leader === '-' ? 'text-white/30' : 'text-red-400'}`}>
                          {stint.gap_to_leader}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white/70">{stint.avg_lap}</td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span className={stint.consistency >= 90 ? 'text-green-400' : stint.consistency >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                            {stint.consistency}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white/70">{stint.fuel_per_lap}L</td>
                        <td className="py-3 px-3 text-right font-mono">
                          <span className={stint.tire_deg_per_lap <= 0.08 ? 'text-green-400' : stint.tire_deg_per_lap <= 0.12 ? 'text-yellow-400' : 'text-red-400'}>
                            {(stint.tire_deg_per_lap * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {stint.incidents > 0 ? <span className="text-red-400">{stint.incidents}x</span> : <span className="text-white/30">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sectors Tab */}
          {activeTab === 'sectors' && (
            <div className="border border-white/10">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Layers size={16} className="text-[#f97316]" />
                <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Sector Times
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider pt-8">Driver</div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sector 1</div>
                    <div className="text-xs text-white/30">T1 → T5</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sector 2</div>
                    <div className="text-xs text-white/30">T5 → Bus Stop</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sector 3</div>
                    <div className="text-xs text-white/30">Bus Stop → S/F</div>
                  </div>
                </div>
                {stints.map((stint, idx) => (
                  <div key={stint.driver_id} className="grid grid-cols-4 gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: idx === 0 ? '#f97316' : idx === 1 ? '#3b82f6' : idx === 2 ? '#22c55e' : '#a855f7', color: 'black' }}>
                        {stint.driver_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-white">{stint.driver_name}</span>
                    </div>
                    <div className={`text-center p-2 font-mono text-sm ${stint.sectors.s1_best === '32.234' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-[#0a0a0a] text-white border border-white/5'}`}>
                      {stint.sectors.s1_best}
                    </div>
                    <div className={`text-center p-2 font-mono text-sm ${stint.sectors.s2_best === '42.089' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-[#0a0a0a] text-white border border-white/5'}`}>
                      {stint.sectors.s2_best}
                    </div>
                    <div className={`text-center p-2 font-mono text-sm ${stint.sectors.s3_best === '32.544' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-[#0a0a0a] text-white border border-white/5'}`}>
                      {stint.sectors.s3_best}
                    </div>
                  </div>
                ))}
                {/* Ideal Lap */}
                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-purple-400" />
                    <span className="text-sm text-purple-400 font-semibold">Ideal Lap</span>
                  </div>
                  <div className="text-center p-2 bg-purple-500/10 border border-purple-500/30 font-mono text-sm text-purple-400">32.234</div>
                  <div className="text-center p-2 bg-purple-500/10 border border-purple-500/30 font-mono text-sm text-purple-400">42.089</div>
                  <div className="text-center p-2 bg-purple-500/10 border border-purple-500/30 font-mono text-sm text-purple-400">32.544</div>
                </div>
              </div>
            </div>
          )}

          {/* Telemetry Tab */}
          {activeTab === 'telemetry' && (
            <div className="border border-white/10">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Activity size={16} className="text-green-400" />
                <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Lap History
                </span>
              </div>
              <div className="p-4">
                {selectedStint && selectedStint.lap_history.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStint.lap_history.map(lap => (
                      <div key={lap.lap_number} className={`p-3 border ${lap.is_personal_best ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-[#0a0a0a]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/40">Lap {lap.lap_number}</span>
                            <span className={`text-lg font-mono font-bold ${lap.is_personal_best ? 'text-purple-400' : lap.is_session_best ? 'text-green-400' : 'text-white'}`}>
                              {lap.lap_time}
                            </span>
                            {lap.is_personal_best && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 uppercase">PB</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>Fuel: {lap.fuel_used}L</span>
                            <span>Track: {lap.track_temp}°C</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {lap.sectors.map(s => (
                            <div key={s.sector} className={`text-center p-2 text-xs font-mono ${
                              s.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                              s.color === 'green' ? 'bg-green-500/20 text-green-400' :
                              s.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              S{s.sector}: {(s.time / 1000).toFixed(3)}
                              <span className="ml-1 text-[10px]">
                                {s.delta_to_best === 0 ? '' : s.delta_to_best > 0 ? `+${(s.delta_to_best / 1000).toFixed(3)}` : (s.delta_to_best / 1000).toFixed(3)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <Activity size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Select a driver from the overview to view lap history</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Run Plans */}
          <div className="border border-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-[#f97316]" />
                <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Run Plans
                </span>
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 border border-white/20 text-xs text-white/50 hover:bg-white/5 transition-colors">
                <Plus size={12} />
                Add Plan
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {runPlans.map(plan => {
                const status = statusStyles[plan.status];
                const StatusIcon = status.icon;
                const progress = plan.target_laps > 0 ? (plan.completed_laps / plan.target_laps) * 100 : 0;

                return (
                  <div key={plan.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <StatusIcon size={16} className={status.text} />
                        <span className="font-medium text-white">{plan.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider ${status.bg} ${status.text}`}>
                        {plan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-2 text-xs text-white/40">
                      <span>{plan.completed_laps} / {plan.target_laps} laps</span>
                      {plan.target_time && <span>Target: {plan.target_time}</span>}
                    </div>
                    <div className="h-1 bg-white/10 mb-2 overflow-hidden">
                      <div className={`h-full transition-all ${plan.status === 'completed' ? 'bg-green-500' : 'bg-[#f97316]'}`} style={{ width: `${progress}%` }} />
                    </div>
                    {plan.notes && (
                      <div className="text-xs text-white/50 mb-2 italic">{plan.notes}</div>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {plan.focus.map((f, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/40 uppercase tracking-wider">{f}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Driver Detail */}
          {selectedStint && (
            <div className="border border-white/10 border border-[#f97316]/30">
              <div className="px-4 py-3 border-b border-white/10 bg-[#f97316]/10">
                <span className="font-medium text-sm text-[#f97316]">{selectedStint.driver_name}</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-[#0a0a0a] border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase">Best</div>
                    <div className="text-sm font-mono text-purple-400">{selectedStint.best_lap}</div>
                  </div>
                  <div className="text-center p-2 bg-[#0a0a0a] border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase">Theoretical</div>
                    <div className="text-sm font-mono text-[#3b82f6]">{selectedStint.theoretical_best}</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-white/40">Laps</span><span className="text-white font-mono">{selectedStint.laps}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Consistency</span><span className={`font-mono ${selectedStint.consistency >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>{selectedStint.consistency}%</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Fuel/Lap</span><span className="text-white font-mono">{selectedStint.fuel_per_lap}L</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Tire Deg</span><span className="text-white font-mono">{(selectedStint.tire_deg_per_lap * 100).toFixed(1)}%/lap</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Incidents</span><span className={`font-mono ${selectedStint.incidents === 0 ? 'text-green-400' : 'text-red-400'}`}>{selectedStint.incidents}x</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border border-white/10 p-4 space-y-2">
            <button className="w-full flex items-center justify-center gap-2 bg-[#f97316] text-black px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-[#f97316]/90 transition-colors">
              <TrendingUp size={14} />
              Compare Telemetry
            </button>
            <button className="w-full flex items-center justify-center gap-2 border border-white/20 text-white/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors">
              Export Session Data
            </button>
          </div>

          {/* Alerts */}
          <div className="border border-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-400" />
              <span className="text-xs uppercase tracking-wider text-white/50">Session Notes</span>
            </div>
            <div className="p-3 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-white/60">
                <TrendingDown size={12} className="text-yellow-400 mt-0.5" />
                <span>Casey showing high tire deg - review driving style</span>
              </div>
              <div className="flex items-start gap-2 text-white/60">
                <TrendingUp size={12} className="text-green-400 mt-0.5" />
                <span>Sam's fuel efficiency best in team - share technique</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
