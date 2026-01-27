import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Radio, Zap, Fuel, Video, VideoOff, Maximize2, Volume2, VolumeX, Users, Gauge, Thermometer, Clock, Flag, AlertTriangle, ChevronRight, Target, Monitor, MessageSquare, Settings, MapPin } from 'lucide-react';
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
  const [patchToHUD, setPatchToHUD] = useState(false);
  const [patchToDiscord, setPatchToDiscord] = useState(false);
  const [activePanel, setActivePanel] = useState<'strategy' | 'drivers' | 'trackmap' | 'setup' | null>(null);
  
  // Radio channels state - F1-style comms panel grouped by driver
  const [radioChannels, setRadioChannels] = useState<RadioChannel[]>([
    // Alex group
    { id: 'alex-driver', name: 'Alex Rivera', shortName: 'ALEX', type: 'driver', volume: 100, muted: false, active: true, speaking: false, color: '#22c55e' },
    { id: 'alex-eng', name: 'Alex Engineer', shortName: 'ENG', type: 'crew', volume: 100, muted: false, active: true, speaking: true, color: '#22c55e' },
    { id: 'alex-spot', name: 'Alex Spotter', shortName: 'SPOT', type: 'crew', volume: 90, muted: false, active: true, speaking: false, color: '#22c55e' },
    // Jordan group
    { id: 'jordan-driver', name: 'Jordan Chen', shortName: 'JORDAN', type: 'driver', volume: 80, muted: false, active: false, speaking: false, color: '#3b82f6' },
    { id: 'jordan-eng', name: 'Jordan Engineer', shortName: 'ENG', type: 'crew', volume: 60, muted: false, active: false, speaking: false, color: '#3b82f6' },
    { id: 'jordan-spot', name: 'Jordan Spotter', shortName: 'SPOT', type: 'crew', volume: 60, muted: false, active: false, speaking: false, color: '#3b82f6' },
    // Sam group
    { id: 'sam-driver', name: 'Sam Williams', shortName: 'SAM', type: 'driver', volume: 80, muted: false, active: false, speaking: false, color: '#f97316' },
    { id: 'sam-eng', name: 'Sam Engineer', shortName: 'ENG', type: 'crew', volume: 60, muted: false, active: false, speaking: false, color: '#f97316' },
    { id: 'sam-spot', name: 'Sam Spotter', shortName: 'SPOT', type: 'crew', volume: 60, muted: false, active: false, speaking: false, color: '#f97316' },
    // Casey group
    { id: 'casey-driver', name: 'Casey Morgan', shortName: 'CASEY', type: 'driver', volume: 80, muted: true, active: false, speaking: false, color: '#a855f7' },
    { id: 'casey-eng', name: 'Casey Engineer', shortName: 'ENG', type: 'crew', volume: 60, muted: true, active: false, speaking: false, color: '#a855f7' },
    { id: 'casey-spot', name: 'Casey Spotter', shortName: 'SPOT', type: 'crew', volume: 60, muted: true, active: false, speaking: false, color: '#a855f7' },
    // Team channels
    { id: 'team-all', name: 'All Team', shortName: 'TEAM', type: 'team', volume: 100, muted: false, active: true, speaking: false },
    { id: 'all-drivers', name: 'All Drivers', shortName: 'ALL DRV', type: 'team', volume: 100, muted: false, active: false, speaking: false },
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

          {/* Team Radio - F1 Style LED Panel */}
          <div className="mb-4 bg-[#1a1a1a] border border-[#333] rounded overflow-hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div className="px-3 py-2 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-amber-500/70" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/50 font-semibold">Team Radio</span>
                <span className="text-[9px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded font-medium">LIVE</span>
              </div>
              <div className="flex items-center gap-4">
                {/* Patch Controls */}
                <div className="flex items-center gap-2 border-r border-[#333] pr-4">
                  <button
                    onClick={() => setPatchToHUD(!patchToHUD)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wide transition-all ${
                      patchToHUD
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                        : 'bg-[#252525] border border-[#444] text-white/40 hover:border-[#555] hover:text-white/60'
                    }`}
                    title="Patch active channels to Driver HUD overlay"
                  >
                    <Monitor size={12} />
                    <span>HUD</span>
                    {patchToHUD && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />}
                  </button>
                  <button
                    onClick={() => setPatchToDiscord(!patchToDiscord)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wide transition-all ${
                      patchToDiscord
                        ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-400'
                        : 'bg-[#252525] border border-[#444] text-white/40 hover:border-[#555] hover:text-white/60'
                    }`}
                    title="Patch active channels to Discord voice"
                  >
                    <MessageSquare size={12} />
                    <span>Discord</span>
                    {patchToDiscord && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />}
                  </button>
                </div>
                
                {/* Master Volume */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30">Master</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="w-20 h-1 bg-[#333] rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-[10px] text-amber-500/70 font-mono w-8">{masterVolume}%</span>
                </div>
              </div>
            </div>
            
            {/* Driver Groups - F1 Style Grid */}
            <div className="p-3">
              {/* Row 1: Driver Names */}
              <div className="flex gap-2 mb-2">
                {/* Driver columns */}
                {['alex', 'jordan', 'sam', 'casey'].map(driverKey => {
                  const driverChannel = radioChannels.find(ch => ch.id === `${driverKey}-driver`);
                  if (!driverChannel) return null;
                  return (
                    <div key={driverKey} className="flex-1">
                      <button
                        onClick={() => toggleChannelActive(driverChannel.id)}
                        className={`w-full h-9 rounded border-2 transition-all font-mono text-[11px] font-bold tracking-wider ${
                          driverChannel.speaking
                            ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                            : driverChannel.active
                              ? 'bg-[#2a2a2a] border-amber-500/60 text-amber-400'
                              : driverChannel.muted
                                ? 'bg-[#1a1a1a] border-red-500/40 text-red-500/50'
                                : 'bg-[#1a1a1a] border-[#444] text-white/40 hover:border-[#555] hover:text-white/60'
                        }`}
                        style={{ 
                          textShadow: driverChannel.active || driverChannel.speaking ? '0 0 8px currentColor' : 'none',
                          borderLeft: `3px solid ${driverChannel.color}`
                        }}
                      >
                        {driverChannel.shortName}
                      </button>
                    </div>
                  );
                })}
                
                {/* Team buttons */}
                <div className="flex-1">
                  {(() => {
                    const ch = radioChannels.find(c => c.id === 'all-drivers');
                    if (!ch) return null;
                    return (
                      <button
                        onClick={() => toggleChannelActive(ch.id)}
                        className={`w-full h-9 rounded border-2 transition-all font-mono text-[10px] font-bold tracking-wider ${
                          ch.active
                            ? 'bg-[#2a2a2a] border-cyan-500/60 text-cyan-400'
                            : 'bg-[#1a1a1a] border-[#444] text-white/40 hover:border-[#555] hover:text-white/60'
                        }`}
                        style={{ textShadow: ch.active ? '0 0 8px currentColor' : 'none' }}
                      >
                        {ch.shortName}
                      </button>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  {(() => {
                    const ch = radioChannels.find(c => c.id === 'team-all');
                    if (!ch) return null;
                    return (
                      <button
                        onClick={() => toggleChannelActive(ch.id)}
                        className={`w-full h-9 rounded border-2 transition-all font-mono text-[10px] font-bold tracking-wider ${
                          ch.active
                            ? 'bg-[#2a2a2a] border-yellow-500/60 text-yellow-400'
                            : 'bg-[#1a1a1a] border-[#444] text-white/40 hover:border-[#555] hover:text-white/60'
                        }`}
                        style={{ textShadow: ch.active ? '0 0 8px currentColor' : 'none' }}
                      >
                        {ch.shortName}
                      </button>
                    );
                  })()}
                </div>
              </div>
              
              {/* Row 2: Engineer | Spotter for each driver */}
              <div className="flex gap-2">
                {['alex', 'jordan', 'sam', 'casey'].map(driverKey => {
                  const engChannel = radioChannels.find(ch => ch.id === `${driverKey}-eng`);
                  const spotChannel = radioChannels.find(ch => ch.id === `${driverKey}-spot`);
                  if (!engChannel || !spotChannel) return null;
                  return (
                    <div key={driverKey} className="flex-1 flex gap-1">
                      {/* Engineer */}
                      <button
                        onClick={() => toggleChannelActive(engChannel.id)}
                        className={`flex-1 h-7 rounded border transition-all font-mono text-[9px] font-semibold tracking-wide ${
                          engChannel.speaking
                            ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                            : engChannel.active
                              ? 'bg-[#252525] border-amber-500/40 text-amber-400/80'
                              : engChannel.muted
                                ? 'bg-[#181818] border-red-500/30 text-red-500/40'
                                : 'bg-[#181818] border-[#3a3a3a] text-white/30 hover:border-[#4a4a4a] hover:text-white/50'
                        }`}
                        style={{ textShadow: engChannel.active || engChannel.speaking ? '0 0 6px currentColor' : 'none' }}
                      >
                        ENG
                      </button>
                      {/* Spotter */}
                      <button
                        onClick={() => toggleChannelActive(spotChannel.id)}
                        className={`flex-1 h-7 rounded border transition-all font-mono text-[9px] font-semibold tracking-wide ${
                          spotChannel.speaking
                            ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                            : spotChannel.active
                              ? 'bg-[#252525] border-amber-500/40 text-amber-400/80'
                              : spotChannel.muted
                                ? 'bg-[#181818] border-red-500/30 text-red-500/40'
                                : 'bg-[#181818] border-[#3a3a3a] text-white/30 hover:border-[#4a4a4a] hover:text-white/50'
                        }`}
                        style={{ textShadow: spotChannel.active || spotChannel.speaking ? '0 0 6px currentColor' : 'none' }}
                      >
                        SPOT
                      </button>
                    </div>
                  );
                })}
                
                {/* Strategy & Pit buttons */}
                <div className="flex-1">
                  {(() => {
                    const ch = radioChannels.find(c => c.id === 'strategy');
                    if (!ch) return null;
                    return (
                      <button
                        onClick={() => toggleChannelActive(ch.id)}
                        className={`w-full h-7 rounded border transition-all font-mono text-[9px] font-semibold tracking-wide ${
                          ch.active
                            ? 'bg-[#252525] border-purple-500/40 text-purple-400/80'
                            : 'bg-[#181818] border-[#3a3a3a] text-white/30 hover:border-[#4a4a4a] hover:text-white/50'
                        }`}
                        style={{ textShadow: ch.active ? '0 0 6px currentColor' : 'none' }}
                      >
                        STRAT
                      </button>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  {(() => {
                    const ch = radioChannels.find(c => c.id === 'pitcrew');
                    if (!ch) return null;
                    return (
                      <button
                        onClick={() => toggleChannelActive(ch.id)}
                        className={`w-full h-7 rounded border transition-all font-mono text-[9px] font-semibold tracking-wide ${
                          ch.active
                            ? 'bg-[#252525] border-blue-500/40 text-blue-400/80'
                            : 'bg-[#181818] border-[#3a3a3a] text-white/30 hover:border-[#4a4a4a] hover:text-white/50'
                        }`}
                        style={{ textShadow: ch.active ? '0 0 6px currentColor' : 'none' }}
                      >
                        PIT
                      </button>
                    );
                  })()}
                </div>
              </div>
              
              {/* Row 3: Race Control - aligned under STRAT/PIT */}
              <div className="flex gap-2 mt-2">
                {/* 4 driver column spacers */}
                <div className="flex-1" />
                <div className="flex-1" />
                <div className="flex-1" />
                <div className="flex-1" />
                {/* Race control spans the last 2 columns (where ALL DRV and TEAM are) */}
                <div className="flex-1 flex gap-1">
                  {(() => {
                    const ch = radioChannels.find(c => c.id === 'race-ctrl');
                    if (!ch) return null;
                    return (
                      <button
                        onClick={() => toggleChannelActive(ch.id)}
                        className={`w-full h-7 rounded border transition-all font-mono text-[9px] font-bold tracking-wide ${
                          ch.active
                            ? 'bg-red-500/20 border-red-500/60 text-red-400'
                            : 'bg-[#181818] border-[#3a3a3a] text-white/30 hover:border-red-500/30 hover:text-red-400/50'
                        }`}
                        style={{ textShadow: ch.active ? '0 0 8px currentColor' : 'none' }}
                      >
                        ##RACE##
                      </button>
                    );
                  })()}
                </div>
                <div className="flex-1" />
              </div>
            </div>
          </div>

          {/* Quick Access Tools Row - Toggle Buttons */}
          <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button 
              onClick={() => setActivePanel(activePanel === 'strategy' ? null : 'strategy')}
              className={`text-left rounded p-4 transition-all group ${
                activePanel === 'strategy' 
                  ? 'bg-purple-500/20 border-2 border-purple-500/60' 
                  : 'bg-white/[0.03] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target size={18} className="text-purple-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Strategy</div>
                    <div className="text-[10px] text-white/40">Pit windows & fuel</div>
                  </div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${activePanel === 'strategy' ? 'rotate-90 text-purple-400' : 'text-white/20 group-hover:text-white/50'}`} />
              </div>
            </button>
            <button 
              onClick={() => setActivePanel(activePanel === 'drivers' ? null : 'drivers')}
              className={`text-left rounded p-4 transition-all group ${
                activePanel === 'drivers' 
                  ? 'bg-cyan-500/20 border-2 border-cyan-500/60' 
                  : 'bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-cyan-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Drivers</div>
                    <div className="text-[10px] text-white/40">Team & telemetry</div>
                  </div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${activePanel === 'drivers' ? 'rotate-90 text-cyan-400' : 'text-white/20 group-hover:text-white/50'}`} />
              </div>
            </button>
            <button 
              onClick={() => setActivePanel(activePanel === 'trackmap' ? null : 'trackmap')}
              className={`text-left rounded p-4 transition-all group ${
                activePanel === 'trackmap' 
                  ? 'bg-blue-500/20 border-2 border-blue-500/60' 
                  : 'bg-white/[0.03] border border-white/10 hover:border-blue-500/50 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Track Map</div>
                    <div className="text-[10px] text-white/40">Live positions</div>
                  </div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${activePanel === 'trackmap' ? 'rotate-90 text-blue-400' : 'text-white/20 group-hover:text-white/50'}`} />
              </div>
            </button>
            <button 
              onClick={() => setActivePanel(activePanel === 'setup' ? null : 'setup')}
              className={`text-left rounded p-4 transition-all group ${
                activePanel === 'setup' 
                  ? 'bg-indigo-500/20 border-2 border-indigo-500/60' 
                  : 'bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings size={18} className="text-indigo-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Setup</div>
                    <div className="text-[10px] text-white/40">Car configuration</div>
                  </div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${activePanel === 'setup' ? 'rotate-90 text-indigo-400' : 'text-white/20 group-hover:text-white/50'}`} />
              </div>
            </button>
          </div>

          {/* Conditional Panel Content */}
          {activePanel === 'strategy' && (
            <div className="mb-4 bg-purple-500/10 border-2 border-purple-500/40 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Target size={20} className="text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Strategy Analytics</h3>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-white/40 hover:text-white text-sm">✕ Close</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {/* Undercut/Overcut Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Undercut Window</div>
                  <div className="text-xl font-mono text-green-400">3.2s</div>
                  <div className="text-[10px] text-white/30 mt-1">Pit now gains vs P2</div>
                  <div className="mt-2 h-1 bg-white/10 rounded overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: '75%' }} />
                  </div>
                  <div className="text-[9px] text-green-400/70 mt-1">75% confidence</div>
                </div>
                
                {/* Tire Degradation Projection */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Tire Cliff ETA</div>
                  <div className="text-xl font-mono text-amber-400">~6 laps</div>
                  <div className="text-[10px] text-white/30 mt-1">Based on deg rate: 0.12s/lap</div>
                  <div className="mt-2 flex gap-1">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <div key={i} className={`flex-1 h-3 rounded-sm ${i <= 6 ? 'bg-amber-500/60' : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <div className="text-[9px] text-amber-400/70 mt-1">Grip loss accelerating</div>
                </div>
                
                {/* Optimal Pit Lap Calculator */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Optimal Pit Lap</div>
                  <div className="text-xl font-mono text-purple-400">Lap 19</div>
                  <div className="text-[10px] text-white/30 mt-1">Balances tire life + track pos</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 18</span>
                      <span className="text-yellow-400">-0.8s net</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 19</span>
                      <span className="text-green-400">+1.2s net ★</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 20</span>
                      <span className="text-yellow-400">+0.4s net</span>
                    </div>
                  </div>
                </div>
                
                {/* Traffic Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Pit Exit Traffic</div>
                  <div className="text-xl font-mono text-green-400">CLEAR</div>
                  <div className="text-[10px] text-white/30 mt-1">No cars in pit window</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Behind you</span>
                      <span className="text-white/70">P4 @ +8.3s</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Pit delta</span>
                      <span className="text-white/70">~22s</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Exit pos</span>
                      <span className="text-green-400">P3 (hold)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'drivers' && (
            <div className="mb-4 bg-cyan-500/10 border-2 border-cyan-500/40 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Driver Performance Analytics</h3>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-white/40 hover:text-white text-sm">✕ Close</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {/* Sector Comparison */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Sector Comparison</div>
                  <div className="text-[10px] text-white/50 mb-2">Alex vs Team Best</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/40">S1</span>
                        <span className="text-green-400">-0.12s</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '95%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/40">S2</span>
                        <span className="text-red-400">+0.24s</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '78%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/40">S3</span>
                        <span className="text-green-400">-0.08s</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '92%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-cyan-400/70 mt-2">Focus: T5-T7 braking</div>
                </div>
                
                {/* Consistency Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Consistency Score</div>
                  <div className="text-xl font-mono text-cyan-400">94.2%</div>
                  <div className="text-[10px] text-white/30 mt-1">Last 10 laps σ: ±0.18s</div>
                  <div className="mt-2 flex items-end gap-0.5 h-8">
                    {[0.2, 0.1, 0.15, 0.08, 0.12, 0.1, 0.18, 0.14, 0.09, 0.11].map((v, i) => (
                      <div key={i} className="flex-1 bg-cyan-500/60 rounded-t" style={{ height: `${v * 200}%` }} />
                    ))}
                  </div>
                  <div className="text-[9px] text-white/40 mt-1">Lap variance (lower = better)</div>
                </div>
                
                {/* Pace Trend */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Pace Trend</div>
                  <div className="text-xl font-mono text-green-400">↑ Improving</div>
                  <div className="text-[10px] text-white/30 mt-1">-0.3s over last 5 laps</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 43</span>
                      <span className="text-white/70">1:38.42</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 44</span>
                      <span className="text-white/70">1:38.31</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 45</span>
                      <span className="text-white/70">1:38.24</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 46</span>
                      <span className="text-white/70">1:38.18</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lap 47</span>
                      <span className="text-green-400">1:38.12 ★</span>
                    </div>
                  </div>
                </div>
                
                {/* Driver Fatigue / Stint Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Stint Fatigue Index</div>
                  <div className="text-xl font-mono text-amber-400">72%</div>
                  <div className="text-[10px] text-white/30 mt-1">Reaction time +4ms avg</div>
                  <div className="mt-2 h-2 bg-white/10 rounded overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500" style={{ width: '72%' }} />
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Stint length</span>
                      <span className="text-white/70">1h 42m</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Rec. swap</span>
                      <span className="text-amber-400">~25 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'trackmap' && (
            <div className="mb-4 bg-blue-500/10 border-2 border-blue-500/40 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Track Position Analytics</h3>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-white/40 hover:text-white text-sm">✕ Close</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {/* Gap Trend Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Gap to P2 Trend</div>
                  <div className="text-xl font-mono text-red-400">↓ Closing</div>
                  <div className="text-[10px] text-white/30 mt-1">-0.8s over 5 laps</div>
                  <div className="mt-2 flex items-end gap-0.5 h-8">
                    {[2.8, 2.6, 2.4, 2.2, 2.0].map((v, i) => (
                      <div key={i} className="flex-1 bg-red-500/60 rounded-t" style={{ height: `${v * 15}%` }} />
                    ))}
                  </div>
                  <div className="text-[9px] text-red-400/70 mt-1">P2 gaining 0.16s/lap</div>
                </div>
                
                {/* Traffic Prediction */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Traffic Ahead</div>
                  <div className="text-xl font-mono text-amber-400">2 cars</div>
                  <div className="text-[10px] text-white/30 mt-1">Backmarkers in ~3 laps</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">#77</span>
                      <span className="text-white/70">+12.4s (1.2s slower)</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">#34</span>
                      <span className="text-white/70">+18.1s (0.8s slower)</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-amber-400/70 mt-1">Blue flags expected T3</div>
                </div>
                
                {/* Battle Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Battle Zones</div>
                  <div className="space-y-2 mt-2">
                    <div className="p-2 bg-red-500/20 border border-red-500/30 rounded">
                      <div className="text-[10px] text-red-400 font-semibold">P2 vs P3</div>
                      <div className="text-[9px] text-white/50">Gap: 0.4s • DRS range</div>
                    </div>
                    <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded">
                      <div className="text-[10px] text-amber-400 font-semibold">P5 vs P6</div>
                      <div className="text-[9px] text-white/50">Gap: 1.1s • Closing</div>
                    </div>
                    <div className="p-2 bg-white/5 border border-white/10 rounded">
                      <div className="text-[10px] text-white/50 font-semibold">P8-P12</div>
                      <div className="text-[9px] text-white/30">Train forming</div>
                    </div>
                  </div>
                </div>
                
                {/* Position Change Probability */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Position Outlook</div>
                  <div className="text-xl font-mono text-amber-400">DEFEND</div>
                  <div className="text-[10px] text-white/30 mt-1">P2 threat level: HIGH</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Overtake P2</span>
                      <span className="text-white/50">12% (gap too big)</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Hold P3</span>
                      <span className="text-amber-400">64%</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/40">Lose to P4</span>
                      <span className="text-green-400">8%</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-blue-400/70 mt-2">Rec: Save tires for defense</div>
                </div>
              </div>
              
              {/* Track Map Visualization */}
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="col-span-3 bg-black/60 rounded p-4 relative" style={{ minHeight: '200px' }}>
                  <svg viewBox="0 0 400 150" className="w-full h-full">
                    {/* Track outline - oval */}
                    <ellipse cx="200" cy="75" rx="180" ry="60" fill="none" stroke="#333" strokeWidth="16" />
                    <ellipse cx="200" cy="75" rx="180" ry="60" fill="none" stroke="#444" strokeWidth="1" strokeDasharray="8,4" />
                    
                    {/* Start/Finish line */}
                    <line x1="200" y1="15" x2="200" y2="30" stroke="#fff" strokeWidth="2" />
                    <text x="200" y="12" textAnchor="middle" fill="#666" fontSize="8">S/F</text>
                    
                    {/* Sector markers */}
                    <circle cx="380" cy="75" r="3" fill="#666" />
                    <text x="392" y="78" fill="#555" fontSize="7">S1</text>
                    <circle cx="200" cy="135" r="3" fill="#666" />
                    <text x="200" y="148" textAnchor="middle" fill="#555" fontSize="7">S2</text>
                    <circle cx="20" cy="75" r="3" fill="#666" />
                    <text x="8" y="78" textAnchor="end" fill="#555" fontSize="7">S3</text>
                    
                    {/* Driver positions on track */}
                    {drivers.filter(d => d.isActive).map((driver, idx) => {
                      const angle = ((driver.position || idx) * 45 + 90) * (Math.PI / 180);
                      const x = 200 + 180 * Math.cos(angle);
                      const y = 75 + 60 * Math.sin(angle);
                      const isTeamCar = driver.id === 'd1' || driver.id === 'd2';
                      return (
                        <g key={driver.id}>
                          <circle cx={x} cy={y} r="10" fill={isTeamCar ? '#3b82f6' : '#555'} stroke={isTeamCar ? '#60a5fa' : '#666'} strokeWidth="1" />
                          <text x={x} y={y + 3} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                            {driver.carNumber}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Track info overlay */}
                  <div className="absolute bottom-2 left-3 text-[9px] text-white/40">
                    Daytona International Speedway • Lap 47/65
                  </div>
                  <div className="absolute top-2 right-3 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[8px] text-white/50">Team</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      <span className="text-[8px] text-white/50">Others</span>
                    </div>
                  </div>
                </div>
                
                {/* Live Standings */}
                <div className="bg-black/40 rounded p-3">
                  <div className="text-[10px] uppercase text-white/40 mb-2 font-semibold">Live Standings</div>
                  <div className="space-y-1.5">
                    {drivers.filter(d => d.isActive).sort((a, b) => (a.position || 99) - (b.position || 99)).slice(0, 8).map(driver => {
                      const isTeamCar = driver.id === 'd1' || driver.id === 'd2';
                      return (
                        <div key={driver.id} className={`flex items-center justify-between text-[10px] ${isTeamCar ? 'text-blue-400' : 'text-white/50'}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 font-mono font-bold">P{driver.position}</span>
                            <span className="font-mono">#{driver.carNumber}</span>
                          </div>
                          <span className="font-mono text-[9px]">{driver.gap || 'Leader'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'setup' && (
            <div className="mb-4 bg-indigo-500/10 border-2 border-indigo-500/40 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">Setup Performance Analytics</h3>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-white/40 hover:text-white text-sm">✕ Close</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {/* Balance Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Balance Tendency</div>
                  <div className="text-xl font-mono text-amber-400">UNDERSTEER</div>
                  <div className="text-[10px] text-white/30 mt-1">Detected in T3, T7, T11</div>
                  <div className="mt-2 relative h-3 bg-white/10 rounded">
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/30" />
                    <div className="absolute top-0 bottom-0 left-[58%] w-3 h-3 bg-amber-500 rounded-full" />
                  </div>
                  <div className="flex justify-between text-[8px] text-white/30 mt-1">
                    <span>Oversteer</span>
                    <span>Neutral</span>
                    <span>Understeer</span>
                  </div>
                  <div className="text-[9px] text-indigo-400/70 mt-2">Try: +0.5 rear wing</div>
                </div>
                
                {/* Setup vs Lap Time Correlation */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Setup Impact</div>
                  <div className="text-[10px] text-white/50 mb-2">Changes vs Lap Time</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/40">ARB +1 click</span>
                        <span className="text-green-400">-0.15s</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '85%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/40">Camber -0.2°</span>
                        <span className="text-green-400">-0.08s</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: '65%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/40">Toe +0.1°</span>
                        <span className="text-red-400">+0.12s</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '45%' }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tire Temp Analysis */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">Tire Temp Balance</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-center">
                      <div className="text-[8px] text-white/30">FL</div>
                      <div className="flex gap-0.5 justify-center">
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                        <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                      </div>
                      <div className="text-[8px] text-white/50 mt-1">I|M|O</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] text-white/30">FR</div>
                      <div className="flex gap-0.5 justify-center">
                        <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                      </div>
                      <div className="text-[8px] text-white/50 mt-1">I|M|O</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] text-white/30">RL</div>
                      <div className="flex gap-0.5 justify-center">
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                      </div>
                      <div className="text-[8px] text-white/50 mt-1">I|M|O</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] text-white/30">RR</div>
                      <div className="flex gap-0.5 justify-center">
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                        <div className="w-2 h-6 bg-green-500 rounded-sm" />
                        <div className="w-2 h-6 bg-red-500 rounded-sm" />
                      </div>
                      <div className="text-[8px] text-white/50 mt-1">I|M|O</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-indigo-400/70 mt-2">RR outer hot: -0.3 psi</div>
                </div>
                
                {/* Suggested Changes */}
                <div className="bg-black/40 rounded p-4">
                  <div className="text-[10px] uppercase text-white/40 mb-2">AI Recommendations</div>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-500/20 border border-green-500/30 rounded">
                      <div className="text-[10px] text-green-400 font-semibold">High Impact</div>
                      <div className="text-[9px] text-white/70">Rear ARB: 3 → 4</div>
                      <div className="text-[8px] text-green-400/70">Est. -0.2s/lap</div>
                    </div>
                    <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded">
                      <div className="text-[10px] text-amber-400 font-semibold">Medium Impact</div>
                      <div className="text-[9px] text-white/70">Front camber: -3.2 → -3.0</div>
                      <div className="text-[8px] text-amber-400/70">Est. -0.1s/lap</div>
                    </div>
                    <div className="p-2 bg-white/5 border border-white/10 rounded">
                      <div className="text-[10px] text-white/50 font-semibold">Fine Tune</div>
                      <div className="text-[9px] text-white/50">Brake bias: 54% → 53%</div>
                      <div className="text-[8px] text-white/30">Stability improvement</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid: Camera + Telemetry - Only show when no panel active */}
          {!activePanel && (
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
          )}

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

          {/* Tire Wear Panel - Compact inline */}
          {currentDriver?.tireWear && (
            <div className="bg-white/[0.03] border border-white/10 rounded px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Thermometer size={12} className="text-white/40" />
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Tires</span>
              </div>
              <div className="flex items-center gap-3">
                {['FL', 'FR', 'RL', 'RR'].map((pos, i) => {
                  const wear = currentDriver.tireWear ? [currentDriver.tireWear.fl, currentDriver.tireWear.fr, currentDriver.tireWear.rl, currentDriver.tireWear.rr][i] : null;
                  const wearColor = wear !== null ? (wear > 80 ? 'text-green-400' : wear > 50 ? 'text-yellow-400' : 'text-red-400') : 'text-white/30';
                  return (
                    <div key={pos} className="flex items-center gap-1">
                      <span className="text-[9px] text-white/30">{pos}</span>
                      <span className={`text-xs font-mono font-bold ${wearColor}`}>{wear !== null ? `${wear}%` : '—'}</span>
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
