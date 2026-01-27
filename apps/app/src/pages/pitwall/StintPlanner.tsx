import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Clock, Fuel, Users,
  AlertTriangle, CheckCircle2, Save, Download, Upload,
  Settings, RotateCcw
} from 'lucide-react';
// Service imports for future API integration
// import {
//   fetchTeamDrivers,
//   validateStrategy,
//   calculateStintTime,
//   calculatePitDuration,
//   autoBalanceStints,
//   optimizeFuelLoads,
// } from '../../lib/stintService';

// Local types
interface Driver {
  id: string;
  name: string;
  number: string;
  color: string;
  avgLapTime: number;
  fuelPerLap: number;
  maxStintLength: number;
}
interface Stint {
  id: string;
  driverId: string;
  startLap: number;
  endLap: number;
  fuelLoad: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'wet';
  estimatedTime: string;
  notes: string;
}

interface RaceConfig {
  totalLaps: number;
  totalTime: number; // minutes (for timed races)
  raceType: 'laps' | 'timed';
  fuelCapacity: number;
  minPitStops: number;
  maxDriverTime: number; // minutes
  pitLaneTime: number; // seconds
  fuelFlowRate: number; // liters per second
  tireChangeTime: number; // seconds
  driverChangeTime: number; // seconds
}

// Mock data
const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Alex Thompson', number: '42', color: '#3b82f6', avgLapTime: 87000, fuelPerLap: 2.8, maxStintLength: 35 },
  { id: 'd2', name: 'Jordan Mitchell', number: '17', color: '#f97316', avgLapTime: 87500, fuelPerLap: 2.9, maxStintLength: 30 },
  { id: 'd3', name: 'Sam Rodriguez', number: '88', color: '#22c55e', avgLapTime: 88000, fuelPerLap: 3.0, maxStintLength: 28 },
  { id: 'd4', name: 'Casey Williams', number: '23', color: '#a855f7', avgLapTime: 87200, fuelPerLap: 2.85, maxStintLength: 32 },
];

const defaultConfig: RaceConfig = {
  totalLaps: 120,
  totalTime: 180,
  raceType: 'laps',
  fuelCapacity: 110,
  minPitStops: 2,
  maxDriverTime: 120,
  pitLaneTime: 25,
  fuelFlowRate: 2.5,
  tireChangeTime: 12,
  driverChangeTime: 8,
};

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatLapTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export function StintPlanner() {
  const { teamId } = useParams<{ teamId: string }>();
  const [drivers] = useState<Driver[]>(mockDrivers);
  const [config, setConfig] = useState<RaceConfig>(defaultConfig);
  const [stints, setStints] = useState<Stint[]>([
    { id: 's1', driverId: 'd1', startLap: 1, endLap: 40, fuelLoad: 110, tireCompound: 'medium', estimatedTime: '', notes: 'Opening stint - conservative pace' },
    { id: 's2', driverId: 'd2', startLap: 41, endLap: 80, fuelLoad: 110, tireCompound: 'medium', estimatedTime: '', notes: 'Middle stint - push if in position' },
    { id: 's3', driverId: 'd1', startLap: 81, endLap: 120, fuelLoad: 95, tireCompound: 'soft', estimatedTime: '', notes: 'Final stint - full attack' },
  ]);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedStint, setSelectedStint] = useState<string | null>(null);
  const [draggedStint, setDraggedStint] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate stint times
  const calculateStintTime = (stint: Stint): number => {
    const driver = drivers.find(d => d.id === stint.driverId);
    if (!driver) return 0;
    const laps = stint.endLap - stint.startLap + 1;
    return laps * driver.avgLapTime;
  };

  // Calculate pit stop duration
  const calculatePitDuration = (stintBefore: Stint, stintAfter: Stint): number => {
    let duration = config.pitLaneTime;
    
    // Fuel time
    const fuelNeeded = stintAfter.fuelLoad;
    duration += fuelNeeded / config.fuelFlowRate;
    
    // Tire change
    if (stintBefore.tireCompound !== stintAfter.tireCompound) {
      duration += config.tireChangeTime;
    }
    
    // Driver change
    if (stintBefore.driverId !== stintAfter.driverId) {
      duration += config.driverChangeTime;
    }
    
    return duration;
  };

  // Validate strategy
  const validateStrategy = (): string[] => {
    const errors: string[] = [];
    
    // Check lap coverage
    const coveredLaps = new Set<number>();
    stints.forEach(stint => {
      for (let lap = stint.startLap; lap <= stint.endLap; lap++) {
        if (coveredLaps.has(lap)) {
          errors.push(`Lap ${lap} is covered by multiple stints`);
        }
        coveredLaps.add(lap);
      }
    });
    
    for (let lap = 1; lap <= config.totalLaps; lap++) {
      if (!coveredLaps.has(lap)) {
        errors.push(`Lap ${lap} is not covered by any stint`);
        break; // Only report first gap
      }
    }
    
    // Check fuel capacity
    stints.forEach(stint => {
      const driver = drivers.find(d => d.id === stint.driverId);
      if (driver) {
        const laps = stint.endLap - stint.startLap + 1;
        const fuelNeeded = laps * driver.fuelPerLap;
        if (fuelNeeded > stint.fuelLoad) {
          errors.push(`Stint ${stints.indexOf(stint) + 1}: Not enough fuel (need ${fuelNeeded.toFixed(1)}L, have ${stint.fuelLoad}L)`);
        }
      }
    });
    
    // Check max stint length
    stints.forEach(stint => {
      const driver = drivers.find(d => d.id === stint.driverId);
      if (driver) {
        const laps = stint.endLap - stint.startLap + 1;
        if (laps > driver.maxStintLength) {
          errors.push(`Stint ${stints.indexOf(stint) + 1}: Exceeds ${driver.name}'s max stint (${laps} > ${driver.maxStintLength} laps)`);
        }
      }
    });
    
    // Check minimum pit stops
    if (stints.length - 1 < config.minPitStops) {
      errors.push(`Strategy requires minimum ${config.minPitStops} pit stops (currently ${stints.length - 1})`);
    }
    
    // Check driver time limits
    const driverTimes: Record<string, number> = {};
    stints.forEach(stint => {
      const time = calculateStintTime(stint);
      driverTimes[stint.driverId] = (driverTimes[stint.driverId] || 0) + time;
    });
    
    Object.entries(driverTimes).forEach(([driverId, time]) => {
      const driver = drivers.find(d => d.id === driverId);
      if (driver && time > config.maxDriverTime * 60000) {
        errors.push(`${driver.name} exceeds max drive time (${formatTime(time)} > ${config.maxDriverTime}min)`);
      }
    });
    
    setValidationErrors(errors);
    return errors;
  };

  // Add new stint
  const addStint = () => {
    const lastStint = stints[stints.length - 1];
    const newStint: Stint = {
      id: `s${Date.now()}`,
      driverId: drivers[0].id,
      startLap: lastStint ? lastStint.endLap + 1 : 1,
      endLap: Math.min((lastStint ? lastStint.endLap + 30 : 30), config.totalLaps),
      fuelLoad: config.fuelCapacity,
      tireCompound: 'medium',
      estimatedTime: '',
      notes: ''
    };
    setStints([...stints, newStint]);
  };

  // Remove stint
  const removeStint = (stintId: string) => {
    setStints(stints.filter(s => s.id !== stintId));
    if (selectedStint === stintId) setSelectedStint(null);
  };

  // Update stint
  const updateStint = (stintId: string, updates: Partial<Stint>) => {
    setStints(stints.map(s => s.id === stintId ? { ...s, ...updates } : s));
  };

  // Calculate totals
  const totalRaceTime = stints.reduce((sum, stint) => sum + calculateStintTime(stint), 0);
  const totalPitTime = stints.slice(0, -1).reduce((sum, stint, idx) => {
    return sum + calculatePitDuration(stint, stints[idx + 1]) * 1000;
  }, 0);
  const totalFuel = stints.reduce((sum, stint) => sum + stint.fuelLoad, 0);

  // Driver time breakdown
  const driverTimeBreakdown = drivers.map(driver => {
    const driverStints = stints.filter(s => s.driverId === driver.id);
    const totalTime = driverStints.reduce((sum, stint) => sum + calculateStintTime(stint), 0);
    const totalLaps = driverStints.reduce((sum, stint) => sum + (stint.endLap - stint.startLap + 1), 0);
    return { driver, totalTime, totalLaps, stintCount: driverStints.length };
  }).filter(d => d.totalLaps > 0);

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
                    Stint Planner
                  </h1>
                  <p className="text-[10px] text-white/40">Pre-race strategy planning</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/[0.05] rounded text-xs transition-colors">
                <Upload className="w-3 h-3" />
                Import
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/[0.05] rounded text-xs transition-colors">
                <Download className="w-3 h-3" />
                Export
              </button>
              <button 
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
                  showConfig ? 'bg-[#3b82f6] text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Settings className="w-3 h-3" />
                Config
              </button>
              <button 
                onClick={validateStrategy}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded text-xs transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Validate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Race Config Panel (collapsible) */}
            {showConfig && (
              <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                <h3 className="text-sm text-white font-medium mb-4">Race Configuration</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Race Type</label>
                    <select
                      value={config.raceType}
                      onChange={(e) => setConfig({ ...config, raceType: e.target.value as 'laps' | 'timed' })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    >
                      <option value="laps">Lap Race</option>
                      <option value="timed">Timed Race</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">
                      {config.raceType === 'laps' ? 'Total Laps' : 'Duration (min)'}
                    </label>
                    <input
                      type="number"
                      value={config.raceType === 'laps' ? config.totalLaps : config.totalTime}
                      onChange={(e) => setConfig({ 
                        ...config, 
                        [config.raceType === 'laps' ? 'totalLaps' : 'totalTime']: Number(e.target.value) 
                      })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Fuel Capacity (L)</label>
                    <input
                      type="number"
                      value={config.fuelCapacity}
                      onChange={(e) => setConfig({ ...config, fuelCapacity: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Min Pit Stops</label>
                    <input
                      type="number"
                      value={config.minPitStops}
                      onChange={(e) => setConfig({ ...config, minPitStops: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Max Driver Time (min)</label>
                    <input
                      type="number"
                      value={config.maxDriverTime}
                      onChange={(e) => setConfig({ ...config, maxDriverTime: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Pit Lane Time (s)</label>
                    <input
                      type="number"
                      value={config.pitLaneTime}
                      onChange={(e) => setConfig({ ...config, pitLaneTime: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Fuel Flow (L/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.fuelFlowRate}
                      onChange={(e) => setConfig({ ...config, fuelFlowRate: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase">Tire Change (s)</label>
                    <input
                      type="number"
                      value={config.tireChangeTime}
                      onChange={(e) => setConfig({ ...config, tireChangeTime: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Strategy Validation Errors
                </div>
                <ul className="space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-xs text-red-300/70">• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visual Timeline */}
            <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <h3 className="text-sm text-white font-medium mb-4">Race Timeline</h3>
              <div className="relative h-16">
                {/* Track background */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-white/[0.05] rounded" />
                
                {/* Lap markers */}
                {[0, 25, 50, 75, 100].map(pct => (
                  <div 
                    key={pct}
                    className="absolute top-0 bottom-0 w-px bg-white/[0.10]"
                    style={{ left: `${pct}%` }}
                  >
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-white/30">
                      {Math.round(config.totalLaps * pct / 100)}
                    </span>
                  </div>
                ))}
                
                {/* Stints */}
                {stints.map((stint, idx) => {
                  const driver = drivers.find(d => d.id === stint.driverId);
                  const startPct = ((stint.startLap - 1) / config.totalLaps) * 100;
                  const widthPct = ((stint.endLap - stint.startLap + 1) / config.totalLaps) * 100;
                  
                  return (
                    <div
                      key={stint.id}
                      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer transition-all ${
                        selectedStint === stint.id ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ 
                        left: `${startPct}%`, 
                        width: `${widthPct}%`,
                        backgroundColor: driver?.color || '#666'
                      }}
                      onClick={() => setSelectedStint(stint.id)}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-medium truncate px-1">
                        {driver?.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stint List */}
            <div className="space-y-3">
              {stints.map((stint, idx) => {
                const driver = drivers.find(d => d.id === stint.driverId);
                const stintTime = calculateStintTime(stint);
                const laps = stint.endLap - stint.startLap + 1;
                const fuelNeeded = driver ? laps * driver.fuelPerLap : 0;
                const fuelOk = stint.fuelLoad >= fuelNeeded;
                const isSelected = selectedStint === stint.id;
                
                return (
                  <div key={stint.id}>
                    {/* Stint Card */}
                    <div 
                      className={`p-4 bg-white/[0.03] border rounded-lg transition-all cursor-pointer ${
                        isSelected ? 'border-white/[0.30] bg-white/[0.05]' : 'border-white/[0.06] hover:border-white/[0.15]'
                      }`}
                      onClick={() => setSelectedStint(isSelected ? null : stint.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Drag Handle */}
                        <div className="pt-1 cursor-grab text-white/20 hover:text-white/40">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        
                        {/* Stint Number */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: driver?.color || '#666' }}
                        >
                          S{idx + 1}
                        </div>
                        
                        {/* Stint Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <select
                              value={stint.driverId}
                              onChange={(e) => updateStint(stint.id, { driverId: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 bg-white/[0.05] border border-white/[0.10] rounded text-sm text-white"
                            >
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1 text-xs text-white/50">
                              <Clock className="w-3 h-3" />
                              {formatTime(stintTime)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-xs">
                            <div>
                              <label className="text-white/30">Laps</label>
                              <div className="flex items-center gap-1 mt-1">
                                <input
                                  type="number"
                                  value={stint.startLap}
                                  onChange={(e) => updateStint(stint.id, { startLap: Number(e.target.value) })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-14 px-2 py-1 bg-white/[0.03] border border-white/[0.10] rounded text-white text-center"
                                />
                                <span className="text-white/30">-</span>
                                <input
                                  type="number"
                                  value={stint.endLap}
                                  onChange={(e) => updateStint(stint.id, { endLap: Number(e.target.value) })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-14 px-2 py-1 bg-white/[0.03] border border-white/[0.10] rounded text-white text-center"
                                />
                                <span className="text-white/40 ml-1">({laps})</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-white/30">Fuel Load</label>
                              <div className="flex items-center gap-1 mt-1">
                                <input
                                  type="number"
                                  value={stint.fuelLoad}
                                  onChange={(e) => updateStint(stint.id, { fuelLoad: Number(e.target.value) })}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`w-16 px-2 py-1 bg-white/[0.03] border rounded text-white text-center ${
                                    fuelOk ? 'border-white/[0.10]' : 'border-red-500/50'
                                  }`}
                                />
                                <span className="text-white/40">L</span>
                                {!fuelOk && (
                                  <span className="text-red-400 text-[10px]">Need {fuelNeeded.toFixed(0)}L</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-white/30">Tires</label>
                              <select
                                value={stint.tireCompound}
                                onChange={(e) => updateStint(stint.id, { tireCompound: e.target.value as Stint['tireCompound'] })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full mt-1 px-2 py-1 bg-white/[0.03] border border-white/[0.10] rounded text-white"
                              >
                                <option value="soft">Soft</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                                <option value="wet">Wet</option>
                              </select>
                            </div>
                            <div className="flex items-end justify-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); removeStint(stint.id); }}
                                className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Expanded Notes */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-white/[0.06]">
                              <label className="text-[10px] text-white/30 uppercase">Notes</label>
                              <textarea
                                value={stint.notes}
                                onChange={(e) => updateStint(stint.id, { notes: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Strategy notes for this stint..."
                                className="w-full mt-1 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white placeholder-white/20 resize-none"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Pit Stop Indicator */}
                    {idx < stints.length - 1 && (
                      <div className="flex items-center justify-center py-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                          <Fuel className="w-3 h-3" />
                          Pit Stop • {calculatePitDuration(stint, stints[idx + 1]).toFixed(0)}s
                          {stint.driverId !== stints[idx + 1].driverId && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Driver Change
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Add Stint Button */}
              <button
                onClick={addStint}
                className="w-full p-4 border-2 border-dashed border-white/[0.10] rounded-lg text-white/40 hover:text-white/60 hover:border-white/[0.20] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Stint
              </button>
            </div>
          </div>

          {/* Sidebar - Summary */}
          <div className="w-72">
            {/* Race Summary */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg mb-4">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Race Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Total Laps</span>
                  <span className="text-sm font-mono text-white">{config.totalLaps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Estimated Time</span>
                  <span className="text-sm font-mono text-white">{formatTime(totalRaceTime + totalPitTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Pit Stops</span>
                  <span className="text-sm font-mono text-white">{stints.length - 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Total Pit Time</span>
                  <span className="text-sm font-mono text-amber-400">{formatTime(totalPitTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/40">Total Fuel</span>
                  <span className="text-sm font-mono text-white">{totalFuel}L</span>
                </div>
              </div>
            </div>

            {/* Driver Breakdown */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg mb-4">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Driver Time</h3>
              <div className="space-y-3">
                {driverTimeBreakdown.map(({ driver, totalTime, totalLaps, stintCount }) => (
                  <div key={driver.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: driver.color }} />
                        <span className="text-xs text-white">{driver.name.split(' ')[0]}</span>
                      </div>
                      <span className="text-xs font-mono text-white/60">{formatTime(totalTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${(totalTime / (config.maxDriverTime * 60000)) * 100}%`,
                            backgroundColor: driver.color
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-white/30">{totalLaps} laps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded text-xs text-white/70 hover:text-white transition-colors">
                  <RotateCcw className="w-3 h-3" />
                  Auto-Balance Stints
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded text-xs text-white/70 hover:text-white transition-colors">
                  <Fuel className="w-3 h-3" />
                  Optimize Fuel Loads
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 border border-[#3b82f6]/30 rounded text-xs text-[#3b82f6] transition-colors">
                  <Save className="w-3 h-3" />
                  Save Strategy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
