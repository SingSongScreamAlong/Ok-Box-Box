import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Flag, Users, Clock, Fuel, CheckCircle2,
  Plus, Trash2, Copy, Send, Bell, Settings,
  MapPin, RotateCcw, Download, Target, Edit2
} from 'lucide-react';
import { TrackMap } from '../../components/TrackMap';
import { useTeamData } from '../../hooks/useTeamData';
import type { Stint } from '../../services/mockData/types';

interface RaceConfig {
  trackId: string;
  trackName: string;
  totalLaps: number;
  totalTime: number; // minutes for timed races
  raceType: 'laps' | 'timed';
  fuelCapacity: number;
  pitLaneTime: number; // seconds
  minDriverTime: number; // minutes
  maxDriverTime: number; // minutes
}

interface RacePlanData {
  id: string;
  name: string;
  isActive: boolean;
  stints: Stint[];
  totalLaps: number;
  estimatedTime: number;
  fuelUsed: number;
  pitStops: number;
}

interface LocalPlanChange {
  id: string;
  timestamp: Date;
  type: 'stint_change' | 'driver_change' | 'fuel_change' | 'strategy_change';
  description: string;
  sentToDrivers: boolean;
  confirmedBy: string[];
  pendingConfirmation: string[];
}

const defaultConfig: RaceConfig = {
  trackId: '191',
  trackName: 'Daytona International Speedway',
  totalLaps: 120,
  totalTime: 1440, // 24 hours
  raceType: 'timed',
  fuelCapacity: 110,
  pitLaneTime: 25,
  minDriverTime: 30,
  maxDriverTime: 240,
};

// Helper functions
function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const tireColors: Record<string, string> = {
  soft: 'bg-red-500',
  medium: 'bg-yellow-500',
  hard: 'bg-white',
  wet: 'bg-blue-500',
  inter: 'bg-green-500',
};

export function RacePlan() {
  const { teamId } = useParams<{ teamId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { drivers } = useTeamData();
  
  const [config] = useState<RaceConfig>(defaultConfig);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>(['d1', 'd2', 'd3']);
  const [activePlan, setActivePlan] = useState<'A' | 'B' | 'C'>('A');
  const [showConfig, setShowConfig] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<LocalPlanChange[]>([]);
  
  // Plans A, B, C
  const [plans, setPlans] = useState<Record<'A' | 'B' | 'C', RacePlanData>>({
    A: {
      id: 'plan-a',
      name: 'Plan A - Standard',
      isActive: true,
      stints: [
        { id: 's1', driverId: 'd1', startLap: 1, endLap: 30, laps: 30, fuelLoad: 95, tireCompound: 'medium', estimatedTime: 3510000, notes: 'Opening stint - conservative' },
        { id: 's2', driverId: 'd2', startLap: 31, endLap: 60, laps: 30, fuelLoad: 95, tireCompound: 'medium', estimatedTime: 3525000, notes: 'Build gap if possible' },
        { id: 's3', driverId: 'd3', startLap: 61, endLap: 90, laps: 30, fuelLoad: 95, tireCompound: 'hard', estimatedTime: 3540000, notes: 'Night stint - tire save' },
        { id: 's4', driverId: 'd1', startLap: 91, endLap: 120, laps: 30, fuelLoad: 95, tireCompound: 'medium', estimatedTime: 3510000, notes: 'Final push to finish' },
      ],
      totalLaps: 120,
      estimatedTime: 14085000,
      fuelUsed: 380,
      pitStops: 3,
    },
    B: {
      id: 'plan-b',
      name: 'Plan B - Aggressive',
      isActive: false,
      stints: [
        { id: 's1b', driverId: 'd1', startLap: 1, endLap: 25, laps: 25, fuelLoad: 80, tireCompound: 'soft', estimatedTime: 2875000, notes: 'Fast start - build lead' },
        { id: 's2b', driverId: 'd2', startLap: 26, endLap: 50, laps: 25, fuelLoad: 80, tireCompound: 'soft', estimatedTime: 2937500, notes: 'Maintain pace' },
        { id: 's3b', driverId: 'd3', startLap: 51, endLap: 75, laps: 25, fuelLoad: 80, tireCompound: 'medium', estimatedTime: 2950000, notes: 'Transition stint' },
        { id: 's4b', driverId: 'd1', startLap: 76, endLap: 100, laps: 25, fuelLoad: 80, tireCompound: 'medium', estimatedTime: 2925000, notes: 'Push for position' },
        { id: 's5b', driverId: 'd2', startLap: 101, endLap: 120, laps: 20, fuelLoad: 65, tireCompound: 'soft', estimatedTime: 2350000, notes: 'Sprint finish' },
      ],
      totalLaps: 120,
      estimatedTime: 14037500,
      fuelUsed: 385,
      pitStops: 4,
    },
    C: {
      id: 'plan-c',
      name: 'Plan C - Safety Car',
      isActive: false,
      stints: [
        { id: 's1c', driverId: 'd1', startLap: 1, endLap: 35, laps: 35, fuelLoad: 110, tireCompound: 'hard', estimatedTime: 4095000, notes: 'Extended opening - wait for SC' },
        { id: 's2c', driverId: 'd2', startLap: 36, endLap: 70, laps: 35, fuelLoad: 110, tireCompound: 'hard', estimatedTime: 4112500, notes: 'Long stint - fuel save' },
        { id: 's3c', driverId: 'd3', startLap: 71, endLap: 105, laps: 35, fuelLoad: 110, tireCompound: 'medium', estimatedTime: 4130000, notes: 'Night running' },
        { id: 's4c', driverId: 'd1', startLap: 106, endLap: 120, laps: 15, fuelLoad: 50, tireCompound: 'soft', estimatedTime: 1755000, notes: 'Sprint to end' },
      ],
      totalLaps: 120,
      estimatedTime: 14092500,
      fuelUsed: 380,
      pitStops: 3,
    },
  });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const currentPlan = plans[activePlan];

  const toggleDriver = (driverId: string) => {
    setSelectedDrivers(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const sendPlanToDrivers = () => {
    const change: LocalPlanChange = {
      id: `change-${Date.now()}`,
      timestamp: new Date(),
      type: 'strategy_change',
      description: `Switched to ${currentPlan.name}`,
      sentToDrivers: true,
      confirmedBy: [],
      pendingConfirmation: selectedDrivers,
    };
    setPendingChanges(prev => [change, ...prev]);
  };

  const confirmChange = (changeId: string, driverId: string) => {
    setPendingChanges(prev => prev.map(c => {
      if (c.id === changeId) {
        return {
          ...c,
          confirmedBy: [...c.confirmedBy, driverId],
          pendingConfirmation: c.pendingConfirmation.filter(id => id !== driverId),
        };
      }
      return c;
    }));
  };

  const getDriverById = (id: string) => drivers.find(d => d.id === id);

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

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              to={`/team/${teamId}/pitwall/planning`}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <ArrowLeft size={20} className="text-white/50" />
            </Link>
            <div>
              <h1 
                className="text-xl font-bold tracking-wide uppercase text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Race Plan
              </h1>
              <p className="text-sm mt-0.5 text-white/50">{config.trackName} • {config.raceType === 'timed' ? `${config.totalTime / 60}h` : `${config.totalLaps} laps`}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded text-xs text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <Settings size={14} />
              Config
            </button>
            <button 
              onClick={sendPlanToDrivers}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-400 font-semibold hover:bg-green-500/30 transition-colors"
            >
              <Send size={14} />
              Send to Drivers
            </button>
          </div>
        </div>

        {/* Config Panel (collapsible) */}
        {showConfig && (
          <div className="mb-6 bg-white/[0.03] border border-white/[0.06] rounded p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Track</label>
                <div className="flex items-center gap-2 text-white">
                  <MapPin size={14} className="text-white/40" />
                  <span className="text-sm">{config.trackName}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Race Format</label>
                <div className="flex items-center gap-2 text-white">
                  <Clock size={14} className="text-white/40" />
                  <span className="text-sm">{config.raceType === 'timed' ? `${config.totalTime / 60} Hours` : `${config.totalLaps} Laps`}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Fuel Capacity</label>
                <div className="flex items-center gap-2 text-white">
                  <Fuel size={14} className="text-white/40" />
                  <span className="text-sm">{config.fuelCapacity}L</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Max Driver Time</label>
                <div className="flex items-center gap-2 text-white">
                  <Users size={14} className="text-white/40" />
                  <span className="text-sm">{config.maxDriverTime / 60}h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Driver Selection */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Assigned Drivers</div>
          <div className="flex gap-2">
            {drivers.map(driver => (
              <button
                key={driver.id}
                onClick={() => toggleDriver(driver.id)}
                disabled={!driver.available}
                className={`flex items-center gap-2 px-3 py-2 rounded border-2 transition-all ${
                  selectedDrivers.includes(driver.id)
                    ? 'border-white/30 bg-white/10'
                    : driver.available
                      ? 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      : 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: driver.color }}
                />
                <span className="text-sm text-white font-medium">{driver.shortName}</span>
                <span className="text-xs text-white/40">#{driver.number}</span>
                {selectedDrivers.includes(driver.id) && (
                  <CheckCircle2 size={14} className="text-green-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(['A', 'B', 'C'] as const).map(plan => (
            <button
              key={plan}
              onClick={() => setActivePlan(plan)}
              className={`px-4 py-2 rounded font-mono text-sm font-bold transition-all ${
                activePlan === plan
                  ? plan === 'A' 
                    ? 'bg-green-500/20 border-2 border-green-500/60 text-green-400'
                    : plan === 'B'
                      ? 'bg-yellow-500/20 border-2 border-yellow-500/60 text-yellow-400'
                      : 'bg-red-500/20 border-2 border-red-500/60 text-red-400'
                  : 'bg-white/[0.03] border border-white/10 text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              Plan {plan}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-white/40">{currentPlan.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stint Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag size={16} className="text-white/40" />
                  <span className="font-medium text-sm uppercase tracking-wider text-white">Stint Plan</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{currentPlan.pitStops} pit stops</span>
                  <span>{currentPlan.stints.length} stints</span>
                  <span>~{formatTime(currentPlan.estimatedTime)}</span>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                {currentPlan.stints.map((stint, idx) => {
                  const driver = getDriverById(stint.driverId);
                  return (
                    <div 
                      key={stint.id}
                      className="flex items-center gap-3 p-3 bg-black/30 rounded border border-white/5 hover:border-white/10 transition-colors group"
                    >
                      {/* Stint Number */}
                      <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center text-xs font-mono font-bold text-white/60">
                        {idx + 1}
                      </div>
                      
                      {/* Driver */}
                      <div className="w-24 flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: driver?.color }}
                        />
                        <span className="text-sm font-medium text-white">{driver?.shortName}</span>
                      </div>
                      
                      {/* Laps */}
                      <div className="w-24">
                        <div className="text-xs text-white/40">Laps</div>
                        <div className="text-sm font-mono text-white">{stint.startLap}-{stint.endLap}</div>
                      </div>
                      
                      {/* Duration */}
                      <div className="w-20">
                        <div className="text-xs text-white/40">Time</div>
                        <div className="text-sm font-mono text-white">{formatTime(stint.estimatedTime)}</div>
                      </div>
                      
                      {/* Fuel */}
                      <div className="w-16">
                        <div className="text-xs text-white/40">Fuel</div>
                        <div className="text-sm font-mono text-white">{stint.fuelLoad}L</div>
                      </div>
                      
                      {/* Tire */}
                      <div className="w-20 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${tireColors[stint.tireCompound]}`} />
                        <span className="text-xs text-white/60 capitalize">{stint.tireCompound}</span>
                      </div>
                      
                      {/* Notes */}
                      <div className="flex-1 text-xs text-white/40 truncate">
                        {stint.notes}
                      </div>
                      
                      {/* Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button className="p-1.5 hover:bg-white/10 rounded">
                          <Edit2 size={12} className="text-white/40" />
                        </button>
                        <button className="p-1.5 hover:bg-red-500/20 rounded">
                          <Trash2 size={12} className="text-red-400/60" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Add Stint Button */}
                <button className="w-full p-3 border border-dashed border-white/20 rounded text-xs text-white/40 hover:border-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-2">
                  <Plus size={14} />
                  Add Stint
                </button>
              </div>
            </div>

            {/* Pending Confirmations */}
            {pendingChanges.length > 0 && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center gap-2">
                  <Bell size={16} className="text-yellow-400" />
                  <span className="font-medium text-sm text-yellow-400">Pending Confirmations</span>
                </div>
                <div className="p-4 space-y-3">
                  {pendingChanges.map(change => (
                    <div key={change.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white">{change.description}</div>
                        <div className="text-xs text-white/40">
                          {change.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {change.pendingConfirmation.map(driverId => {
                          const driver = getDriverById(driverId);
                          return (
                            <button
                              key={driverId}
                              onClick={() => confirmChange(change.id, driverId)}
                              className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded text-xs text-yellow-400 hover:bg-yellow-500/30"
                            >
                              <span>{driver?.shortName}</span>
                              <span className="text-yellow-500/60">pending</span>
                            </button>
                          );
                        })}
                        {change.confirmedBy.map(driverId => {
                          const driver = getDriverById(driverId);
                          return (
                            <div
                              key={driverId}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/40 rounded text-xs text-green-400"
                            >
                              <CheckCircle2 size={12} />
                              <span>{driver?.shortName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Track Preview */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <MapPin size={16} className="text-white/40" />
                <span className="font-medium text-sm uppercase tracking-wider text-white">Track</span>
              </div>
              <div className="p-4 h-48">
                <TrackMap 
                  trackId={config.trackId}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Plan Summary */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Target size={16} className="text-white/40" />
                <span className="font-medium text-sm uppercase tracking-wider text-white">Summary</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Total Time</span>
                  <span className="font-mono text-white">{formatTime(currentPlan.estimatedTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Pit Stops</span>
                  <span className="font-mono text-white">{currentPlan.pitStops}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Total Fuel</span>
                  <span className="font-mono text-white">{currentPlan.fuelUsed}L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Avg Stint</span>
                  <span className="font-mono text-white">{Math.round(currentPlan.totalLaps / currentPlan.stints.length)} laps</span>
                </div>
                
                <div className="pt-3 border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Driver Distribution</div>
                  {selectedDrivers.map(driverId => {
                    const driver = getDriverById(driverId);
                    const driverStints = currentPlan.stints.filter(s => s.driverId === driverId);
                    const totalLaps = driverStints.reduce((sum, s) => sum + s.laps, 0);
                    const percentage = Math.round((totalLaps / currentPlan.totalLaps) * 100);
                    return (
                      <div key={driverId} className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: driver?.color }}
                        />
                        <span className="text-xs text-white/60 w-12">{driver?.shortName}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded overflow-hidden">
                          <div 
                            className="h-full rounded"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: driver?.color 
                            }}
                          />
                        </div>
                        <span className="text-xs text-white/40 w-12 text-right">{totalLaps} laps</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded p-4 space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded text-xs text-white/60 hover:bg-white/[0.06] transition-colors">
                <Copy size={14} />
                Duplicate Plan
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded text-xs text-white/60 hover:bg-white/[0.06] transition-colors">
                <Download size={14} />
                Export Plan
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded text-xs text-white/60 hover:bg-white/[0.06] transition-colors">
                <RotateCcw size={14} />
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
