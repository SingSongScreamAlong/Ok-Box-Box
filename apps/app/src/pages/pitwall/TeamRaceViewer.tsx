import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Users, Clock, Fuel, Flag, AlertTriangle, ChevronDown, ChevronUp,
  Thermometer, Droplets, Wind, Sun, CloudRain
} from 'lucide-react';
import { useRelay } from '../../hooks/useRelay';
import { getTeam, Team } from '../../lib/teams';

// Types for Team Race Viewer
interface Driver {
  id: string;
  name: string;
  shortName: string;
  color: string;
  iRating: number;
  safetyRating: string;
}

interface Stint {
  id: string;
  driverId: string;
  driverName: string;
  startLap: number;
  endLap: number | null;
  startTime: string;
  endTime: string | null;
  laps: number;
  avgLapTime: number | null;
  bestLapTime: number | null;
  fuelUsed: number;
  incidents: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'wet' | 'inter';
  tireAge: number;
  status: 'active' | 'completed' | 'scheduled';
}

interface TeamCar {
  carNumber: string;
  carClass: string;
  currentDriver: Driver;
  position: number;
  classPosition: number;
  lap: number;
  lastLapTime: number | null;
  bestLapTime: number | null;
  gapToLeader: string;
  gapToClassLeader: string;
  gapAhead: string;
  gapBehind: string;
  fuel: number;
  fuelPerLap: number;
  lapsRemaining: number;
  pitStops: number;
  lastPitLap: number | null;
  trackPosition: number;
  inPit: boolean;
  incidents: number;
  stints: Stint[];
  currentStint: Stint | null;
}

interface RaceSession {
  eventName: string;
  trackName: string;
  sessionType: 'practice' | 'qualifying' | 'race';
  raceFormat: 'sprint' | 'endurance' | 'multidriver';
  totalLaps: number | null;
  totalTime: number | null; // seconds
  currentLap: number;
  timeRemaining: number | null;
  timeElapsed: number;
  flagStatus: 'green' | 'yellow' | 'red' | 'white' | 'checkered';
  trackTemp: number;
  airTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCondition: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain';
}

type ViewMode = 'endurance' | 'multidriver';

// Mock team drivers
const mockDrivers: Driver[] = [
  { id: 'd1', name: 'Alex Rivera', shortName: 'RIV', color: '#ef4444', iRating: 4500, safetyRating: 'A 3.2' },
  { id: 'd2', name: 'Jordan Chen', shortName: 'CHE', color: '#22c55e', iRating: 4200, safetyRating: 'A 2.8' },
  { id: 'd3', name: 'Sam Williams', shortName: 'WIL', color: '#3b82f6', iRating: 3800, safetyRating: 'B 4.1' },
  { id: 'd4', name: 'Casey Morgan', shortName: 'MOR', color: '#f97316', iRating: 4100, safetyRating: 'A 1.9' },
];

// Mock stints for endurance
const mockStints: Stint[] = [
  { id: 's1', driverId: 'd1', driverName: 'Alex Rivera', startLap: 1, endLap: 35, startTime: '00:00:00', endTime: '01:07:12', laps: 35, avgLapTime: 115.2, bestLapTime: 113.8, fuelUsed: 98, incidents: 0, tireCompound: 'medium', tireAge: 35, status: 'completed' },
  { id: 's2', driverId: 'd2', driverName: 'Jordan Chen', startLap: 36, endLap: 70, startTime: '01:07:45', endTime: '02:15:02', laps: 35, avgLapTime: 115.6, bestLapTime: 114.2, fuelUsed: 99, incidents: 1, tireCompound: 'medium', tireAge: 35, status: 'completed' },
  { id: 's3', driverId: 'd3', driverName: 'Sam Williams', startLap: 71, endLap: 105, startTime: '02:15:35', endTime: '03:23:18', laps: 35, avgLapTime: 116.1, bestLapTime: 114.9, fuelUsed: 97, incidents: 0, tireCompound: 'hard', tireAge: 35, status: 'completed' },
  { id: 's4', driverId: 'd4', driverName: 'Casey Morgan', startLap: 106, endLap: null, startTime: '03:23:52', endTime: null, laps: 18, avgLapTime: 115.8, bestLapTime: 114.5, fuelUsed: 51, incidents: 0, tireCompound: 'hard', tireAge: 18, status: 'active' },
];

// Mock team car data
const mockTeamCar: TeamCar = {
  carNumber: '77',
  carClass: 'GT3',
  currentDriver: mockDrivers[3],
  position: 5,
  classPosition: 3,
  lap: 124,
  lastLapTime: 115.234,
  bestLapTime: 113.892,
  gapToLeader: '+2:34.567',
  gapToClassLeader: '+45.234',
  gapAhead: '-12.456',
  gapBehind: '+8.234',
  fuel: 47.2,
  fuelPerLap: 2.8,
  lapsRemaining: 16,
  pitStops: 3,
  lastPitLap: 105,
  trackPosition: 0.67,
  inPit: false,
  incidents: 1,
  stints: mockStints,
  currentStint: mockStints[3],
};

// Mock session
const mockSession: RaceSession = {
  eventName: 'Daytona 24 Hours',
  trackName: 'Daytona International Speedway',
  sessionType: 'race',
  raceFormat: 'endurance',
  totalLaps: null,
  totalTime: 86400, // 24 hours
  currentLap: 124,
  timeRemaining: 72000, // 20 hours remaining
  timeElapsed: 14400, // 4 hours elapsed
  flagStatus: 'green',
  trackTemp: 28,
  airTemp: 22,
  humidity: 65,
  windSpeed: 12,
  weatherCondition: 'clear',
};

export function TeamRaceViewer() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('endurance');
  const [teamCar, setTeamCar] = useState<TeamCar>(mockTeamCar);
  const [session, setSession] = useState<RaceSession>(mockSession);
  const [expandedStint, setExpandedStint] = useState<string | null>(null);
  const [showStintHistory, setShowStintHistory] = useState(true);
  useRelay(); // Hook for relay connection state
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  useEffect(() => {
    if (teamId) {
      getTeam(teamId).then(setTeam);
    }
  }, [teamId]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTeamCar(prev => ({
        ...prev,
        trackPosition: (prev.trackPosition + 0.01) % 1,
        fuel: Math.max(0, prev.fuel - 0.05),
        lastLapTime: 114 + Math.random() * 3,
      }));
      setSession(prev => ({
        ...prev,
        timeRemaining: prev.timeRemaining ? prev.timeRemaining - 1 : null,
        timeElapsed: prev.timeElapsed + 1,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLapTime = (seconds: number | null): string => {
    if (seconds === null) return '—:—.———';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  const getFlagColor = (flag: string): string => {
    switch (flag) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      case 'white': return 'bg-white';
      case 'checkered': return 'bg-gradient-to-r from-black via-white to-black';
      default: return 'bg-gray-500';
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'clear': return <Sun size={16} className="text-yellow-400" />;
      case 'cloudy': return <Wind size={16} className="text-gray-400" />;
      case 'light_rain': return <Droplets size={16} className="text-blue-400" />;
      case 'heavy_rain': return <CloudRain size={16} className="text-blue-500" />;
      default: return <Sun size={16} className="text-yellow-400" />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a]">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-30"
        >
          <source src="/videos/team-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-1">
              Team Race Viewer
            </div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {session.eventName}
            </h1>
            <div className="text-sm text-white/50 mt-1">{session.trackName}</div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('endurance')}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                viewMode === 'endurance'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Clock size={14} className="inline mr-2" />
              Endurance
            </button>
            <button
              onClick={() => setViewMode('multidriver')}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                viewMode === 'multidriver'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Users size={14} className="inline mr-2" />
              Multi-Driver
            </button>
          </div>
        </div>

        {/* Session Status Bar */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* Flag & Time */}
            <div className="flex items-center gap-6">
              <div className={`w-8 h-8 ${getFlagColor(session.flagStatus)}`} />
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Time Remaining</div>
                <div className="text-2xl font-bold text-white font-mono">
                  {session.timeRemaining ? formatTime(session.timeRemaining) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Elapsed</div>
                <div className="text-lg text-white/70 font-mono">{formatTime(session.timeElapsed)}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Lap</div>
                <div className="text-lg text-white/70 font-mono">{session.currentLap}</div>
              </div>
            </div>

            {/* Weather */}
            <div className="flex items-center gap-4">
              {getWeatherIcon(session.weatherCondition)}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Thermometer size={14} className="text-red-400" />
                  <span className="text-white/70">{session.trackTemp}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind size={14} className="text-blue-400" />
                  <span className="text-white/70">{session.airTemp}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets size={14} className="text-cyan-400" />
                  <span className="text-white/70">{session.humidity}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Car Status - Left Column */}
          <div className="col-span-4">
            {/* Car Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <span className="text-xl font-bold text-orange-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {teamCar.carNumber}
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{teamCar.currentDriver.name}</div>
                    <div className="text-xs text-white/40">{teamCar.carClass} • {team?.name || 'Team'}</div>
                  </div>
                </div>
                <div className={`px-3 py-1 text-xs font-bold ${teamCar.inPit ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {teamCar.inPit ? 'IN PIT' : 'ON TRACK'}
                </div>
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 p-3">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Overall</div>
                  <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    P{teamCar.position}
                  </div>
                </div>
                <div className="bg-white/5 p-3">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">In Class</div>
                  <div className="text-3xl font-bold text-orange-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    P{teamCar.classPosition}
                  </div>
                </div>
              </div>

              {/* Gaps */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/5 p-2">
                  <div className="text-[10px] text-white/40 uppercase">Gap Ahead</div>
                  <div className="text-sm font-mono text-green-400">{teamCar.gapAhead}</div>
                </div>
                <div className="bg-white/5 p-2">
                  <div className="text-[10px] text-white/40 uppercase">Gap Behind</div>
                  <div className="text-sm font-mono text-red-400">{teamCar.gapBehind}</div>
                </div>
                <div className="bg-white/5 p-2">
                  <div className="text-[10px] text-white/40 uppercase">To Leader</div>
                  <div className="text-sm font-mono text-white/70">{teamCar.gapToLeader}</div>
                </div>
                <div className="bg-white/5 p-2">
                  <div className="text-[10px] text-white/40 uppercase">To Class Leader</div>
                  <div className="text-sm font-mono text-white/70">{teamCar.gapToClassLeader}</div>
                </div>
              </div>

              {/* Lap Times */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Last Lap</div>
                  <div className="text-xl font-mono text-white">{formatLapTime(teamCar.lastLapTime)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Best Lap</div>
                  <div className="text-xl font-mono text-purple-400">{formatLapTime(teamCar.bestLapTime)}</div>
                </div>
              </div>

              {/* Fuel */}
              <div className="bg-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Fuel size={16} className="text-orange-400" />
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Fuel</span>
                  </div>
                  <span className="text-sm font-mono text-white">{teamCar.fuel.toFixed(1)}L</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                    style={{ width: `${(teamCar.fuel / 100) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-white/50">
                  <span>{teamCar.fuelPerLap.toFixed(2)}L/lap</span>
                  <span>{teamCar.lapsRemaining} laps remaining</span>
                </div>
              </div>
            </div>

            {/* Pit Stops */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Pit Stops</div>
                <div className="text-lg font-bold text-white">{teamCar.pitStops}</div>
              </div>
              <div className="text-xs text-white/50">
                Last pit: Lap {teamCar.lastPitLap || '—'}
              </div>
            </div>
          </div>

          {/* Center - Stint Timeline / Driver Grid */}
          <div className="col-span-5">
            {viewMode === 'endurance' ? (
              /* Endurance Mode - Stint Timeline */
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em]">
                    Stint Timeline
                  </div>
                  <button
                    onClick={() => setShowStintHistory(!showStintHistory)}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showStintHistory ? 'Hide History' : 'Show History'}
                  </button>
                </div>

                {/* Current Stint */}
                {teamCar.currentStint && (
                  <div className="bg-green-500/10 border border-green-500/30 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-green-400 uppercase">Active Stint</span>
                      </div>
                      <span className="text-xs text-white/40">Stint #{teamCar.currentStint.id.replace('s', '')}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: mockDrivers.find(d => d.id === teamCar.currentStint?.driverId)?.color + '30', color: mockDrivers.find(d => d.id === teamCar.currentStint?.driverId)?.color }}
                      >
                        {mockDrivers.find(d => d.id === teamCar.currentStint?.driverId)?.shortName}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{teamCar.currentStint.driverName}</div>
                        <div className="text-xs text-white/40">Started Lap {teamCar.currentStint.startLap}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-white">{teamCar.currentStint.laps}</div>
                        <div className="text-[10px] text-white/40 uppercase">Laps</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{formatLapTime(teamCar.currentStint.avgLapTime)}</div>
                        <div className="text-[10px] text-white/40 uppercase">Avg</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-400">{formatLapTime(teamCar.currentStint.bestLapTime)}</div>
                        <div className="text-[10px] text-white/40 uppercase">Best</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{teamCar.currentStint.tireAge}</div>
                        <div className="text-[10px] text-white/40 uppercase">Tire Age</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stint History */}
                {showStintHistory && (
                  <div className="space-y-2">
                    {teamCar.stints.filter(s => s.status === 'completed').reverse().map((stint) => (
                      <div 
                        key={stint.id}
                        className="bg-white/5 border border-white/10 p-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setExpandedStint(expandedStint === stint.id ? null : stint.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ backgroundColor: mockDrivers.find(d => d.id === stint.driverId)?.color + '30', color: mockDrivers.find(d => d.id === stint.driverId)?.color }}
                            >
                              {mockDrivers.find(d => d.id === stint.driverId)?.shortName}
                            </div>
                            <div>
                              <div className="text-sm text-white">{stint.driverName}</div>
                              <div className="text-[10px] text-white/40">Laps {stint.startLap}-{stint.endLap}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-mono text-white">{formatLapTime(stint.avgLapTime)}</div>
                              <div className="text-[10px] text-white/40">avg</div>
                            </div>
                            {expandedStint === stint.id ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                          </div>
                        </div>
                        
                        {expandedStint === stint.id && (
                          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-4 gap-2 text-center">
                            <div>
                              <div className="text-sm font-bold text-white">{stint.laps}</div>
                              <div className="text-[10px] text-white/40">Laps</div>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-purple-400">{formatLapTime(stint.bestLapTime)}</div>
                              <div className="text-[10px] text-white/40">Best</div>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{stint.fuelUsed.toFixed(1)}L</div>
                              <div className="text-[10px] text-white/40">Fuel</div>
                            </div>
                            <div>
                              <div className={`text-sm font-bold ${stint.incidents > 0 ? 'text-red-400' : 'text-green-400'}`}>{stint.incidents}x</div>
                              <div className="text-[10px] text-white/40">Inc</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Multi-Driver Mode - Driver Grid */
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
                <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-4">
                  Driver Roster
                </div>
                <div className="space-y-3">
                  {mockDrivers.map((driver) => {
                    const isActive = driver.id === teamCar.currentDriver.id;
                    const driverStints = teamCar.stints.filter(s => s.driverId === driver.id);
                    const totalLaps = driverStints.reduce((sum, s) => sum + s.laps, 0);
                    const avgLap = driverStints.length > 0 
                      ? driverStints.reduce((sum, s) => sum + (s.avgLapTime || 0), 0) / driverStints.length 
                      : null;
                    
                    return (
                      <div 
                        key={driver.id}
                        className={`p-4 border transition-all ${
                          isActive 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                              style={{ backgroundColor: driver.color + '30', color: driver.color }}
                            >
                              {driver.shortName}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold">{driver.name}</span>
                                {isActive && (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-400 uppercase">
                                    Driving
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-white/40">
                                {driver.iRating} iR • {driver.safetyRating}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-lg font-bold text-white">{driverStints.length}</div>
                            <div className="text-[10px] text-white/40 uppercase">Stints</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">{totalLaps}</div>
                            <div className="text-[10px] text-white/40 uppercase">Laps</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">{avgLap ? formatLapTime(avgLap) : '—'}</div>
                            <div className="text-[10px] text-white/40 uppercase">Avg Lap</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">
                              {((totalLaps / session.currentLap) * 100).toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-white/40 uppercase">Drive %</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Strategy & Alerts */}
          <div className="col-span-3">
            {/* Next Pit Window */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 mb-4">
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-3">
                Pit Window
              </div>
              <div className="text-center mb-3">
                <div className="text-3xl font-bold text-orange-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {teamCar.lapsRemaining}
                </div>
                <div className="text-xs text-white/40 uppercase">Laps Until Pit</div>
              </div>
              <div className="bg-white/5 p-2 text-center">
                <div className="text-sm text-white/70">
                  Pit Lap: <span className="font-bold text-white">{teamCar.lap + teamCar.lapsRemaining}</span>
                </div>
              </div>
            </div>

            {/* Driver Queue (Endurance) */}
            {viewMode === 'endurance' && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 mb-4">
                <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-3">
                  Driver Queue
                </div>
                <div className="space-y-2">
                  {mockDrivers.map((driver, index) => {
                    const isActive = driver.id === teamCar.currentDriver.id;
                    const isNext = index === (mockDrivers.findIndex(d => d.id === teamCar.currentDriver.id) + 1) % mockDrivers.length;
                    
                    return (
                      <div 
                        key={driver.id}
                        className={`flex items-center gap-2 p-2 ${
                          isActive ? 'bg-green-500/20 border border-green-500/30' :
                          isNext ? 'bg-orange-500/10 border border-orange-500/20' :
                          'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: driver.color + '30', color: driver.color }}
                        >
                          {driver.shortName}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-white">{driver.name}</div>
                        </div>
                        {isActive && <span className="text-[10px] text-green-400 uppercase">Now</span>}
                        {isNext && <span className="text-[10px] text-orange-400 uppercase">Next</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alerts */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-3">
                Alerts
              </div>
              <div className="space-y-2">
                {teamCar.fuel < 20 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30">
                    <AlertTriangle size={14} className="text-yellow-400" />
                    <span className="text-xs text-yellow-400">Low fuel warning</span>
                  </div>
                )}
                {teamCar.incidents > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs text-red-400">{teamCar.incidents}x incident points</span>
                  </div>
                )}
                {session.flagStatus === 'yellow' && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30">
                    <Flag size={14} className="text-yellow-400" />
                    <span className="text-xs text-yellow-400">Yellow flag - Pit opportunity</span>
                  </div>
                )}
                {teamCar.fuel >= 20 && teamCar.incidents === 0 && session.flagStatus === 'green' && (
                  <div className="text-xs text-white/30 text-center py-2">No active alerts</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
