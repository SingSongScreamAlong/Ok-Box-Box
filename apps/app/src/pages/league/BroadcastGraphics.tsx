import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Monitor, Play, Pause, Settings, Eye, EyeOff,
  ChevronUp, ChevronDown, Zap, Flag, Clock, Users, Trophy,
  AlertTriangle, Radio, Tv, Copy, ExternalLink, RefreshCw
} from 'lucide-react';

// Types
interface Driver {
  position: number;
  number: string;
  name: string;
  team: string;
  gap: string;
  interval: string;
  lastLap: string;
  bestLap: string;
  pits: number;
  status: 'racing' | 'pit' | 'out';
  isBattling?: boolean;
}

interface Battle {
  id: string;
  position: number;
  drivers: string[];
  gap: number;
  intensity: 'low' | 'medium' | 'high';
  forPosition: string;
}

interface GraphicsConfig {
  timingTower: boolean;
  battleGraphic: boolean;
  leaderboard: boolean;
  raceInfo: boolean;
  flagStatus: boolean;
  pitLane: boolean;
  driverCard: boolean;
}

// Mock race data
const mockDrivers: Driver[] = [
  { position: 1, number: '42', name: 'A. Thompson', team: 'Velocity Racing', gap: 'LEADER', interval: '-', lastLap: '1:47.234', bestLap: '1:46.891', pits: 2, status: 'racing' },
  { position: 2, number: '17', name: 'J. Mitchell', team: 'Apex Motorsport', gap: '+2.341', interval: '+2.341', lastLap: '1:47.456', bestLap: '1:47.012', pits: 2, status: 'racing', isBattling: true },
  { position: 3, number: '88', name: 'S. Rodriguez', team: 'Storm Racing', gap: '+2.892', interval: '+0.551', lastLap: '1:47.123', bestLap: '1:46.998', pits: 2, status: 'racing', isBattling: true },
  { position: 4, number: '23', name: 'C. Williams', team: 'Thunder GT', gap: '+8.234', interval: '+5.342', lastLap: '1:47.891', bestLap: '1:47.234', pits: 2, status: 'racing' },
  { position: 5, number: '7', name: 'M. Chen', team: 'Dragon Racing', gap: '+12.456', interval: '+4.222', lastLap: '1:48.012', bestLap: '1:47.456', pits: 3, status: 'racing' },
  { position: 6, number: '55', name: 'L. Petrov', team: 'Blitz Motorsport', gap: '+15.789', interval: '+3.333', lastLap: '1:47.678', bestLap: '1:47.123', pits: 2, status: 'pit' },
  { position: 7, number: '31', name: 'K. Tanaka', team: 'Rising Sun', gap: '+18.234', interval: '+2.445', lastLap: '1:48.234', bestLap: '1:47.567', pits: 2, status: 'racing' },
  { position: 8, number: '99', name: 'R. Santos', team: 'Velocity Racing', gap: '+22.567', interval: '+4.333', lastLap: '1:48.456', bestLap: '1:47.891', pits: 2, status: 'racing' },
];

const mockBattles: Battle[] = [
  { id: 'b1', position: 2, drivers: ['J. Mitchell', 'S. Rodriguez'], gap: 0.551, intensity: 'high', forPosition: 'P2' },
];

export function BroadcastGraphics() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [isLive, setIsLive] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [battles, setBattles] = useState<Battle[]>(mockBattles);
  const [config, setConfig] = useState<GraphicsConfig>({
    timingTower: true,
    battleGraphic: true,
    leaderboard: false,
    raceInfo: true,
    flagStatus: true,
    pitLane: true,
    driverCard: false,
  });
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [currentLap, setCurrentLap] = useState(42);
  const [totalLaps, setTotalLaps] = useState(65);
  const [flagStatus, setFlagStatus] = useState<'green' | 'yellow' | 'red' | 'white' | 'checkered'>('green');
  const [streamKey] = useState('obb_live_abc123xyz');

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      // Simulate gap changes
      setDrivers(prev => prev.map(d => ({
        ...d,
        interval: d.position === 1 ? '-' : `+${(Math.random() * 0.5 + parseFloat(d.interval.replace('+', '') || '0')).toFixed(3)}`,
        lastLap: `1:${47 + Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      })));
      
      // Simulate lap progression
      setCurrentLap(prev => Math.min(prev + 0.1, totalLaps));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive, totalLaps]);

  const toggleGraphic = (key: keyof GraphicsConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getFlagColor = (flag: typeof flagStatus) => {
    switch (flag) {
      case 'green': return 'bg-emerald-500';
      case 'yellow': return 'bg-amber-400';
      case 'red': return 'bg-red-500';
      case 'white': return 'bg-white';
      case 'checkered': return 'bg-gradient-to-r from-black via-white to-black';
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/league-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/95 via-[#0e0e0e]/80 to-[#0e0e0e]/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/95" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  to={`/league/${leagueId}`}
                  className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to League
                </Link>
                <div className="h-4 w-px bg-white/[0.10]" />
                <div>
                  <h1 className="text-lg font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Broadcast Graphics
                  </h1>
                  <p className="text-[10px] text-white/40">RaceBox Plus — Live timing & graphics overlay</p>
                </div>
              </div>
            <div className="flex items-center gap-3">
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
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isLive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isLive ? 'Stop Broadcast' : 'Go Live'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Preview Area */}
          <div className="flex-1">
            {/* Broadcast Preview */}
            <div className="relative bg-black aspect-video rounded-lg overflow-hidden border border-white/[0.10]">
              {/* Background placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Tv className="w-16 h-16 text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-sm">Broadcast Preview</p>
                  <p className="text-white/10 text-xs mt-1">Graphics overlay on race feed</p>
                </div>
              </div>

              {/* Live indicator */}
              {isLive && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-white">LIVE</span>
                </div>
              )}

              {/* Race Info Bar */}
              {config.raceInfo && (
                <div className="absolute top-4 left-4 right-20 bg-black/80 backdrop-blur-sm rounded overflow-hidden">
                  <div className="flex items-center">
                    <div className="px-4 py-2 bg-[#3b82f6]">
                      <span className="text-xs font-bold text-white">IMSA GTD</span>
                    </div>
                    <div className="px-4 py-2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-white/50" />
                        <span className="text-xs text-white font-mono">LAP {Math.floor(currentLap)}/{totalLaps}</span>
                      </div>
                      <div className="h-3 w-px bg-white/20" />
                      <span className="text-xs text-white/70">Daytona International Speedway</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Flag Status */}
              {config.flagStatus && (
                <div className="absolute top-16 left-4">
                  <div className={`w-8 h-12 rounded ${getFlagColor(flagStatus)} shadow-lg`} />
                </div>
              )}

              {/* Timing Tower */}
              {config.timingTower && (
                <div className="absolute left-4 top-32 w-64 bg-black/80 backdrop-blur-sm rounded overflow-hidden">
                  <div className="bg-white/[0.05] px-3 py-1.5 border-b border-white/[0.10]">
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Live Timing</span>
                  </div>
                  <div className="divide-y divide-white/[0.05]">
                    {drivers.slice(0, 6).map((driver) => (
                      <div 
                        key={driver.number}
                        className={`flex items-center px-2 py-1.5 ${driver.isBattling ? 'bg-amber-500/10' : ''}`}
                      >
                        <span className={`w-6 text-center text-xs font-bold ${
                          driver.position === 1 ? 'text-amber-400' : 
                          driver.position <= 3 ? 'text-white' : 'text-white/60'
                        }`}>
                          {driver.position}
                        </span>
                        <span className="w-8 text-center text-[10px] font-mono text-white/50">
                          #{driver.number}
                        </span>
                        <span className="flex-1 text-xs text-white truncate">{driver.name}</span>
                        <span className="text-[10px] font-mono text-white/40">{driver.interval}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Battle Graphic */}
              {config.battleGraphic && battles.length > 0 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden border border-amber-500/30">
                  <div className="bg-amber-500/20 px-4 py-1 flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Battle for {battles[0].forPosition}</span>
                  </div>
                  <div className="p-3 flex items-center gap-4">
                    {battles[0].drivers.map((driver, idx) => (
                      <div key={driver} className="flex items-center gap-2">
                        {idx > 0 && (
                          <span className="text-amber-400 text-xs font-mono">+{battles[0].gap.toFixed(3)}</span>
                        )}
                        <span className="text-white text-sm font-medium">{driver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pit Lane Indicator */}
              {config.pitLane && drivers.some(d => d.status === 'pit') && (
                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-[10px] uppercase text-white/50">In Pits:</span>
                    {drivers.filter(d => d.status === 'pit').map(d => (
                      <span key={d.number} className="text-xs text-white">#{d.number}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver Card */}
              {config.driverCard && selectedDriver && (
                <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden w-72">
                  <div className="bg-[#3b82f6] px-4 py-2 flex items-center justify-between">
                    <span className="text-white font-bold">#{selectedDriver.number}</span>
                    <span className="text-white/80 text-sm">{selectedDriver.name}</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/40">Position</p>
                      <p className="text-white font-bold text-lg">P{selectedDriver.position}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Gap</p>
                      <p className="text-white font-mono">{selectedDriver.gap}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Last Lap</p>
                      <p className="text-white font-mono">{selectedDriver.lastLap}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Best Lap</p>
                      <p className="text-purple-400 font-mono">{selectedDriver.bestLap}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div className="mt-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm text-white font-medium">Stream Overlay URL</h3>
                  <p className="text-[10px] text-white/40 mt-1">Add as browser source in OBS/Streamlabs</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 bg-black/50 rounded text-xs text-white/70 font-mono">
                    https://app.okboxbox.com/overlay/{streamKey}
                  </code>
                  <button className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80">
            {/* Graphics Controls */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg mb-4">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Graphics Elements</h3>
              <div className="space-y-2">
                {Object.entries(config).map(([key, enabled]) => (
                  <button
                    key={key}
                    onClick={() => toggleGraphic(key as keyof GraphicsConfig)}
                    className={`w-full flex items-center justify-between p-3 rounded border transition-colors ${
                      enabled 
                        ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-white' 
                        : 'bg-white/[0.02] border-white/[0.06] text-white/50'
                    }`}
                  >
                    <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Flag Control */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg mb-4">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Flag Status</h3>
              <div className="grid grid-cols-5 gap-2">
                {(['green', 'yellow', 'red', 'white', 'checkered'] as const).map((flag) => (
                  <button
                    key={flag}
                    onClick={() => setFlagStatus(flag)}
                    className={`aspect-square rounded ${getFlagColor(flag)} ${
                      flagStatus === flag ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''
                    }`}
                    title={flag}
                  />
                ))}
              </div>
            </div>

            {/* Driver Selection */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Show Driver Card</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {drivers.map((driver) => (
                  <button
                    key={driver.number}
                    onClick={() => setSelectedDriver(selectedDriver?.number === driver.number ? null : driver)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                      selectedDriver?.number === driver.number 
                        ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30' 
                        : 'hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-bold text-white/60">P{driver.position}</span>
                    <span className="text-xs text-white/40">#{driver.number}</span>
                    <span className="flex-1 text-xs text-white truncate">{driver.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
