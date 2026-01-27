import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Radio, Zap, Fuel, Video, VideoOff, Maximize2, Volume2, VolumeX, Users, Gauge, Thermometer, Clock, Flag, AlertTriangle, Mic, MicOff, Headphones, ChevronRight, BarChart3, Target, GitCompare, Calendar } from 'lucide-react';
import { getTeam, Team } from '../../lib/teams';
import { PitwallWelcome, useFirstTimeExperience } from '../../components/PitwallWelcome';
import { useRelay } from '../../hooks/useRelay';

// Radio channel interface for F1-style comms panel
interface RadioChannel {
  id: string;
  name: string;
  shortName: string;
  type: 'driver' | 'crew' | 'team' | 'race';
  volume: number;
  muted: boolean;
  active: boolean;
  speaking: boolean;
  color?: string;
}

// Mock driver data for team telemetry view
interface TeamDriver {
  id: string;
  name: string;
  carNumber: string;
  isActive: boolean;
  position: number | null;
  lap: number | null;
  lastLap: number | null;
  bestLap: number | null;
  gap: string | null;
  fuel: number | null;
  tireWear: { fl: number; fr: number; rl: number; rr: number } | null;
  speed: number | null;
  delta: number | null;
  incidents: number;
  stintLaps: number;
  cameraAvailable: boolean;
}

const mockTeamDrivers: TeamDriver[] = [
  {
    id: 'd1',
    name: 'Alex Rivera',
    carNumber: '42',
    isActive: true,
    position: 3,
    lap: 47,
    lastLap: 138.342,
    bestLap: 137.891,
    gap: '+2.341',
    fuel: 42.3,
    tireWear: { fl: 78, fr: 76, rl: 82, rr: 80 },
    speed: 187,
    delta: -0.234,
    incidents: 0,
    stintLaps: 12,
    cameraAvailable: true
  },
  {
    id: 'd2',
    name: 'Jordan Chen',
    carNumber: '42',
    isActive: false,
    position: null,
    lap: null,
    lastLap: 137.654,
    bestLap: 137.234,
    gap: null,
    fuel: null,
    tireWear: null,
    speed: null,
    delta: null,
    incidents: 2,
    stintLaps: 0,
    cameraAvailable: false
  },
  {
    id: 'd3',
    name: 'Sam Williams',
    carNumber: '42',
    isActive: false,
    position: null,
    lap: null,
    lastLap: 139.102,
    bestLap: 138.456,
    gap: null,
    fuel: null,
    tireWear: null,
    speed: null,
    delta: null,
    incidents: 1,
    stintLaps: 0,
    cameraAvailable: false
  },
  {
    id: 'd4',
    name: 'Casey Morgan',
    carNumber: '42',
    isActive: false,
    position: null,
    lap: null,
    lastLap: null,
    bestLap: null,
    gap: null,
    fuel: null,
    tireWear: null,
    speed: null,
    delta: null,
    incidents: 0,
    stintLaps: 0,
    cameraAvailable: false
  }
];

export function PitwallHome() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { hasSeenWelcome, markAsSeen } = useFirstTimeExperience('pitwall');
  const { status, session, connect } = useRelay();
  const [selectedDriver, setSelectedDriver] = useState<string>('d1');
  const [cameraAudio, setCameraAudio] = useState(false);
  const [expandedCamera, setExpandedCamera] = useState(false);
  const [drivers] = useState<TeamDriver[]>(mockTeamDrivers);
  const [masterVolume, setMasterVolume] = useState(75);
  
  // Radio channels state - F1-style comms panel
  const [radioChannels, setRadioChannels] = useState<RadioChannel[]>([
    // Driver channels
    { id: 'alex-driver', name: 'Alex Rivera', shortName: 'ALEX', type: 'driver', volume: 100, muted: false, active: true, speaking: false, color: '#22c55e' },
    { id: 'jordan-driver', name: 'Jordan Chen', shortName: 'JORDAN', type: 'driver', volume: 80, muted: false, active: false, speaking: false, color: '#3b82f6' },
    { id: 'sam-driver', name: 'Sam Williams', shortName: 'SAM', type: 'driver', volume: 80, muted: false, active: false, speaking: false, color: '#f97316' },
    { id: 'casey-driver', name: 'Casey Morgan', shortName: 'CASEY', type: 'driver', volume: 80, muted: true, active: false, speaking: false, color: '#a855f7' },
    // Crew channels (Spotter/Engineer per driver)
    { id: 'alex-eng', name: 'Alex Engineer', shortName: 'A ENG', type: 'crew', volume: 100, muted: false, active: true, speaking: true, color: '#22c55e' },
    { id: 'alex-spot', name: 'Alex Spotter', shortName: 'A SPOT', type: 'crew', volume: 90, muted: false, active: true, speaking: false, color: '#22c55e' },
    { id: 'jordan-eng', name: 'Jordan Engineer', shortName: 'J ENG', type: 'crew', volume: 60, muted: false, active: false, speaking: false, color: '#3b82f6' },
    { id: 'jordan-spot', name: 'Jordan Spotter', shortName: 'J SPOT', type: 'crew', volume: 60, muted: false, active: false, speaking: false, color: '#3b82f6' },
    // Team channels
    { id: 'team-all', name: 'Team All', shortName: 'TEAM', type: 'team', volume: 100, muted: false, active: true, speaking: false },
    { id: 'strategy', name: 'Strategy', shortName: 'STRAT', type: 'team', volume: 50, muted: false, active: false, speaking: false },
    { id: 'pitcrew', name: 'Pit Crew', shortName: 'PIT', type: 'team', volume: 70, muted: false, active: false, speaking: false },
    // Race control
    { id: 'race-ctrl', name: 'Race Control', shortName: 'RACE', type: 'race', volume: 100, muted: false, active: false, speaking: false, color: '#ef4444' },
  ]);

  // Derive connection state from relay status
  const isConnected = status === 'connected' || status === 'in_session';
  const sessionState = status === 'in_session' 
    ? (session.sessionType === 'qualifying' ? 'qual' : session.sessionType || 'practice')
    : 'offline';

  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(setTeam);
    }
  }, [teamId]);

  // Auto-connect on mount
  useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }
  }, [status, connect]);

  // Live clock for temporal presence
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const statusBadgeClass = isConnected 
    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  
  const sessionBadgeClass = sessionState === 'race'
    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
    : sessionState === 'qual'
      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
      : sessionState === 'practice'
        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        : 'bg-white/10 text-white/40 border border-white/20';

  // Format lap time helper
  const formatLapTime = (seconds: number | null): string => {
    if (seconds === null) return '—:—.———';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  // Radio channel handlers
  const toggleChannelMute = (channelId: string) => {
    setRadioChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, muted: !ch.muted } : ch
    ));
  };

  const setChannelVolume = (channelId: string, volume: number) => {
    setRadioChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, volume } : ch
    ));
  };

  const toggleChannelActive = (channelId: string) => {
    setRadioChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, active: !ch.active } : ch
    ));
  };

  const activeDriver = drivers.find(d => d.id === selectedDriver) || drivers[0];
  const currentDriver = drivers.find(d => d.isActive);

  return (
    <>
      {/* First-time welcome experience */}
      {!hasSeenWelcome && (
        <PitwallWelcome teamName={team?.name || 'Your Team'} onComplete={markAsSeen} />
      )}

      <div className="min-h-full relative overflow-hidden">
        {/* CSS Keyframes for animations */}
        <style>{`
          @keyframes gentlePulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.5; }
          }
          @keyframes statusGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
            50% { box-shadow: 0 0 8px 0 rgba(255,255,255,0.03); }
          }
        `}</style>

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
                <Radio size={20} className="text-white/70" />
              </div>
              <div>
                <h1 
                  className="text-xl font-semibold tracking-[0.1em] uppercase text-white/90"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Pit Wall
                </h1>
                <p className="text-xs mt-0.5 text-white/50">{team?.name || 'Team'} • Team Radio, Driver Cameras & Live Comms</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-white/40 tracking-wider">
                {currentTime.toLocaleTimeString()}
              </span>
              <span 
                className={`text-[10px] uppercase tracking-wider px-3 py-1.5 font-semibold ${statusBadgeClass}`}
                style={{ animation: !isConnected ? 'statusGlow 4s ease-in-out infinite' : 'none' }}
              >
                {isConnected ? 'Connected' : 'Awaiting Connection'}
              </span>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 font-semibold ${sessionBadgeClass}`}>
                {sessionState.toUpperCase()}
              </span>
            </div>
          </div>

          {/* F1-Style Radio Communications Panel */}
          <div className="mb-4 bg-[#1a1a1a] border border-white/10 rounded overflow-hidden">
            <div className="px-4 py-2 bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Headphones size={14} className="text-white/50" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/50 font-semibold">Team Radio</span>
                <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded">LIVE</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/30">Master Vol</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-20 h-1 bg-white/20 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-[10px] text-white/50 font-mono w-8">{masterVolume}%</span>
              </div>
            </div>
            
            {/* Channel Grid - F1 Style */}
            <div className="p-3 grid grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {radioChannels.map(channel => (
                <div 
                  key={channel.id}
                  className={`relative bg-[#0a0a0a] border rounded p-2 transition-all cursor-pointer ${
                    channel.active 
                      ? 'border-white/30 shadow-lg' 
                      : channel.muted 
                        ? 'border-red-500/30 opacity-50' 
                        : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => toggleChannelActive(channel.id)}
                >
                  {/* Volume indicator lights */}
                  <div className="flex gap-0.5 mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        className={`h-1 flex-1 rounded-sm transition-all ${
                          channel.speaking 
                            ? 'bg-green-400 animate-pulse' 
                            : channel.volume > i * 20 
                              ? channel.muted ? 'bg-red-500/50' : 'bg-amber-500/70'
                              : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Channel name display */}
                  <div 
                    className={`text-[10px] font-mono font-bold tracking-wider px-1 py-1 rounded text-center ${
                      channel.speaking 
                        ? 'bg-green-500/30 text-green-300' 
                        : channel.active 
                          ? 'bg-white/10 text-white' 
                          : channel.muted 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'text-white/50'
                    }`}
                    style={{ 
                      textShadow: channel.speaking ? '0 0 10px rgba(34,197,94,0.5)' : 'none',
                      borderLeft: channel.color ? `2px solid ${channel.color}` : 'none'
                    }}
                  >
                    {channel.shortName}
                  </div>
                  
                  {/* Mute/Volume control */}
                  <div className="flex items-center justify-between mt-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleChannelMute(channel.id); }}
                      className={`p-1 rounded transition-colors ${channel.muted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-white/40'}`}
                    >
                      {channel.muted ? <MicOff size={10} /> : <Mic size={10} />}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={channel.volume}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setChannelVolume(channel.id, Number(e.target.value))}
                      className="w-12 h-0.5 bg-white/20 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white/70 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access Tools Row */}
          <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link 
              to={`/team/${teamId}/pitwall/strategy`}
              className="bg-white/[0.03] border border-white/10 rounded p-4 hover:border-purple-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target size={18} className="text-purple-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Strategy</div>
                    <div className="text-[10px] text-white/40">Pit windows & fuel</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
            <Link 
              to={`/team/${teamId}/pitwall/compare`}
              className="bg-white/[0.03] border border-white/10 rounded p-4 hover:border-cyan-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitCompare size={18} className="text-cyan-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Compare</div>
                    <div className="text-[10px] text-white/40">Driver telemetry</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
            <Link 
              to={`/team/${teamId}/pitwall/practice`}
              className="bg-white/[0.03] border border-white/10 rounded p-4 hover:border-blue-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Practice</div>
                    <div className="text-[10px] text-white/40">Session analysis</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
            <Link 
              to={`/team/${teamId}/pitwall/planning`}
              className="bg-white/[0.03] border border-white/10 rounded p-4 hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-indigo-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Planning</div>
                    <div className="text-[10px] text-white/40">Event schedule</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
          </div>

          {/* Main Grid: Camera + Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Driver Camera Feed - Large */}
            <div className="lg:col-span-2 bg-black border border-white/10 rounded overflow-hidden relative" style={{ minHeight: '400px' }}>
              {/* Camera placeholder */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
                {activeDriver.cameraAvailable ? (
                  <div className="text-center">
                    <Video size={48} className="text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/40">Camera Feed</p>
                    <p className="text-xs text-white/20 mt-1">{activeDriver.name}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff size={48} className="text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">No Camera Available</p>
                    <p className="text-xs text-white/20 mt-1">Driver not in session</p>
                  </div>
                )}
              </div>
              
              {/* Camera overlay controls */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-black/60 text-white/70 font-semibold">
                  #{activeDriver.carNumber} {activeDriver.name}
                </span>
                {activeDriver.isActive && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" style={{ animation: 'gentlePulse 1s ease-in-out infinite' }} />
                    Live
                  </span>
                )}
              </div>
              
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button 
                  onClick={() => setCameraAudio(!cameraAudio)}
                  className="p-2 bg-black/60 hover:bg-black/80 transition-colors"
                >
                  {cameraAudio ? <Volume2 size={16} className="text-white/70" /> : <VolumeX size={16} className="text-white/40" />}
                </button>
                <button 
                  onClick={() => setExpandedCamera(!expandedCamera)}
                  className="p-2 bg-black/60 hover:bg-black/80 transition-colors"
                >
                  <Maximize2 size={16} className="text-white/70" />
                </button>
              </div>

              {/* Live telemetry overlay */}
              {activeDriver.isActive && (
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-black/80 px-3 py-2">
                      <div className="text-[10px] text-white/40 uppercase">Position</div>
                      <div className="text-2xl font-bold text-white font-mono">P{activeDriver.position}</div>
                    </div>
                    <div className="bg-black/80 px-3 py-2">
                      <div className="text-[10px] text-white/40 uppercase">Gap</div>
                      <div className="text-lg font-mono text-white">{activeDriver.gap || '—'}</div>
                    </div>
                    <div className="bg-black/80 px-3 py-2">
                      <div className="text-[10px] text-white/40 uppercase">Delta</div>
                      <div className={`text-lg font-mono ${activeDriver.delta !== null ? (activeDriver.delta < 0 ? 'text-green-400' : 'text-red-400') : 'text-white/30'}`}>
                        {activeDriver.delta !== null ? `${activeDriver.delta >= 0 ? '+' : ''}${activeDriver.delta.toFixed(3)}` : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/80 px-3 py-2">
                    <div className="text-[10px] text-white/40 uppercase">Last Lap</div>
                    <div className="text-lg font-mono text-white">{formatLapTime(activeDriver.lastLap)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Driver List Panel */}
            <div className="bg-white/[0.03] border border-white/10 rounded">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-white/40" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">Team Drivers</span>
                </div>
                <span className="text-[10px] text-white/30">{drivers.filter(d => d.isActive).length} active</span>
              </div>
              <div className="divide-y divide-white/5">
                {drivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver.id)}
                    className={`w-full p-3 text-left hover:bg-white/5 transition-colors ${selectedDriver === driver.id ? 'bg-white/[0.08]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold border ${driver.isActive ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                          {driver.carNumber}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${driver.isActive ? 'text-white' : 'text-white/50'}`}>{driver.name}</div>
                          <div className="text-[10px] text-white/30">
                            {driver.isActive ? `P${driver.position} • Lap ${driver.lap}` : driver.bestLap ? `Best: ${formatLapTime(driver.bestLap)}` : 'Not in session'}
                          </div>
                        </div>
                      </div>
                      {driver.isActive && (
                        <div className="text-right">
                          <div className={`text-xs font-mono ${driver.delta !== null ? (driver.delta < 0 ? 'text-green-400' : 'text-red-400') : 'text-white/30'}`}>
                            {driver.delta !== null ? `${driver.delta >= 0 ? '+' : ''}${driver.delta.toFixed(2)}` : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Telemetry Panels Row */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Speed</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${currentDriver?.speed ? 'text-white' : 'text-white/30'}`}>
                {currentDriver?.speed ? `${currentDriver.speed}` : '—'}
                <span className="text-xs text-white/30 ml-1">mph</span>
              </div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Fuel size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Fuel</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${currentDriver?.fuel ? (currentDriver.fuel < 10 ? 'text-red-400' : 'text-white') : 'text-white/30'}`}>
                {currentDriver?.fuel ? `${currentDriver.fuel.toFixed(1)}` : '—'}
                <span className="text-xs text-white/30 ml-1">L</span>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Stint</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${currentDriver?.stintLaps ? 'text-white' : 'text-white/30'}`}>
                {currentDriver?.stintLaps || '—'}
                <span className="text-xs text-white/30 ml-1">laps</span>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flag size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Lap</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${currentDriver?.lap ? 'text-white' : 'text-white/30'}`}>
                {currentDriver?.lap || '—'}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Incidents</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${currentDriver?.incidents ? (currentDriver.incidents > 4 ? 'text-red-400' : currentDriver.incidents > 0 ? 'text-yellow-400' : 'text-green-400') : 'text-white/30'}`}>
                {currentDriver?.incidents ?? '—'}
                <span className="text-xs text-white/30 ml-1">x</span>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40">Best Lap</span>
              </div>
              <div className={`text-lg font-mono font-bold ${currentDriver?.bestLap ? 'text-purple-400' : 'text-white/30'}`}>
                {currentDriver?.bestLap ? formatLapTime(currentDriver.bestLap) : '—:—.———'}
              </div>
            </div>
          </div>

          {/* Tire Wear Panel */}
          {currentDriver?.tireWear && (
            <div className="bg-white/[0.03] border border-white/10 rounded p-4">
              <div className="flex items-center gap-2 mb-3">
                <Thermometer size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Tire Condition</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {['FL', 'FR', 'RL', 'RR'].map((pos, i) => {
                  const wear = currentDriver.tireWear ? [currentDriver.tireWear.fl, currentDriver.tireWear.fr, currentDriver.tireWear.rl, currentDriver.tireWear.rr][i] : null;
                  const wearColor = wear !== null ? (wear > 80 ? 'text-green-400' : wear > 50 ? 'text-yellow-400' : 'text-red-400') : 'text-white/30';
                  return (
                    <div key={pos} className="text-center">
                      <div className="text-[10px] text-white/40 mb-1">{pos}</div>
                      <div className={`text-xl font-mono font-bold ${wearColor}`}>
                        {wear !== null ? `${wear}%` : '—'}
                      </div>
                      <div className="mt-1 h-1 bg-white/10 rounded overflow-hidden">
                        <div 
                          className={`h-full ${wear !== null ? (wear > 80 ? 'bg-green-500' : wear > 50 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-white/10'}`}
                          style={{ width: `${wear || 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connection waiting state */}
          {!isConnected && (
            <div className="mt-4 bg-white/[0.03] border border-white/10 rounded p-4 flex items-center gap-4">
              <div className="w-10 h-10 border border-white/10 rounded flex items-center justify-center">
                <Radio size={18} className="text-white/40" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white/70">Awaiting iRacing Connection</div>
                <div className="text-xs text-white/40 mt-0.5">Start iRacing and join a session. Telemetry and cameras will activate automatically.</div>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 bg-white/40 rounded-full"
                  style={{ animation: 'gentlePulse 2s ease-in-out infinite' }}
                />
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Listening</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
