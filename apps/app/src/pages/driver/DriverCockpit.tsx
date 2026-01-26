
import { useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { useRaceSimulation } from '../../hooks/useRaceSimulation';
import { 
  Volume2, VolumeX, Gauge, Fuel, Flag, Clock, 
  TrendingUp, TrendingDown, Minus, MapPin
} from 'lucide-react';
import { TrackMap } from '../../components/TrackMapRive';

/**
 * DriverCockpit - Glanceable Second Monitor / iPad View
 * Styled to match Crew pages with sidebars, cards, and panels
 */

export function DriverCockpit() {
  const { status, telemetry: realTelemetry, getCarMapPosition } = useRelay();
  const { criticalMessages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();

  const isDemo = status !== 'connected' && status !== 'in_session';
  const { player: simPlayer, opponents: simOpponents } = useRaceSimulation({ isPlaying: isDemo });

  const activeTelemetry = isDemo ? {
    speed: simPlayer.speed,
    trackPercentage: simPlayer.trackPercentage,
    carPosition: { trackPercentage: simPlayer.trackPercentage, x: 0, y: 0 },
    lap: 5,
    position: 3,
    delta: -0.42,
    fuel: 12.5,
    lapsRemaining: 18,
    lastLap: '1:48.234',
    bestLap: '1:47.891',
    gap: '+2.4s'
  } : {
    ...realTelemetry,
    carPosition: realTelemetry.trackPosition !== null ? getCarMapPosition(realTelemetry.trackPosition) : undefined,
    position: realTelemetry.position || 0,
    delta: 0,
    fuel: realTelemetry.fuel || 0,
    lapsRemaining: 0,
    lastLap: '--:--.---',
    bestLap: '--:--.---',
    gap: '--'
  };

  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  const trackId = 'daytona';

  const [heatmapData, setHeatmapData] = useState<{ speed: number }[]>([]);
  useEffect(() => {
    const points = Array.from({ length: 100 }, (_, i) => {
      let s = 300;
      if (i < 10) s = 80;
      if (i > 45 && i < 55) s = 90;
      return { speed: s };
    });
    setHeatmapData(points);
  }, []);

  const DeltaIcon = activeTelemetry.delta < 0 ? TrendingUp : activeTelemetry.delta > 0 ? TrendingDown : Minus;
  const deltaColor = activeTelemetry.delta < 0 ? 'text-emerald-400' : activeTelemetry.delta > 0 ? 'text-red-400' : 'text-white/50';

  return (
    <div className="h-[calc(100vh-9rem)] flex relative bg-[#0a0a0a] overflow-hidden">
      
      {/* Left Sidebar - Race Info */}
      <div className="w-64 border-r border-white/[0.08] bg-[#111111]/90 backdrop-blur-xl flex flex-col flex-shrink-0 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Track Map
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Live Position</p>
            </div>
          </div>
        </div>

        {/* Position Card */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <Flag className="w-3 h-3" />Race Position
          </h3>
          <div className="bg-white/[0.03] rounded p-4 border border-white/[0.08] backdrop-blur-sm">
            <div className="text-5xl font-bold text-white/90 font-mono">
              P{activeTelemetry.position}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <DeltaIcon className={`w-4 h-4 ${deltaColor}`} />
              <span className={`text-sm font-mono ${deltaColor}`}>
                {activeTelemetry.delta > 0 ? '+' : ''}{activeTelemetry.delta.toFixed(2)}s
              </span>
              <span className="text-[10px] text-white/30 uppercase">to leader</span>
            </div>
          </div>
        </div>

        {/* Lap Times */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />Lap Times
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
              <span className="text-white/50">Last Lap</span>
              <span className="text-white/90 font-mono">{activeTelemetry.lastLap}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
              <span className="text-white/50">Best Lap</span>
              <span className="text-emerald-400 font-mono">{activeTelemetry.bestLap}</span>
            </div>
          </div>
        </div>

        {/* Fuel & Laps */}
        <div className="p-4 flex-1">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-emerald-400 mb-3 flex items-center gap-2">
            <Fuel className="w-3 h-3" />Race Status
          </h3>
          <div className="space-y-3 bg-white/[0.03] rounded p-3 border border-white/[0.08] backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Fuel Remaining</span>
              <span className="text-white/80 font-mono">{activeTelemetry.fuel?.toFixed(1)}L</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Laps to Go</span>
              <span className="text-white/80 font-mono">{activeTelemetry.lapsRemaining}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Gap Ahead</span>
              <span className="text-white/80 font-mono">{activeTelemetry.gap}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Track Map */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Top Bar */}
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/70">Daytona International Speedway</span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              {isDemo ? 'Demo' : 'Live'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-all duration-200 rounded flex items-center gap-2 ${
                voiceEnabled 
                  ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' 
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.06]'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              Voice
            </button>
          </div>
        </div>

        {/* Track Map Area */}
        <div className="flex-1 relative">
          {/* Background Video - Left Side */}
          <div className="absolute left-0 top-0 bottom-0 w-1/4 overflow-hidden opacity-20 pointer-events-none">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              src="https://assets.mixkit.co/videos/preview/mixkit-race-car-driving-on-a-track-at-night-1213-large.mp4"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]" />
          </div>
          
          {/* Background Video - Right Side */}
          <div className="absolute right-0 top-0 bottom-0 w-1/4 overflow-hidden opacity-20 pointer-events-none">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              src="https://assets.mixkit.co/videos/preview/mixkit-race-car-driving-on-a-track-at-night-1213-large.mp4"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0a0a0a]" />
          </div>

          {/* Ok Box Box Pill Logo - Behind Track */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.15]">
            <div className="flex gap-4 transform rotate-12 scale-[3]">
              <div className="w-8 h-32 bg-white rounded-full" />
              <div className="w-8 h-32 bg-[#3b82f6] rounded-full" />
              <div className="w-8 h-32 bg-[#f97316] rounded-full" />
            </div>
          </div>

          <TrackMap
            trackId={trackId}
            carPosition={activeTelemetry.carPosition}
            otherCars={isDemo 
              ? simOpponents.map(o => ({ x: 0, y: 0, trackPercentage: o.trackPercentage, carNumber: o.name, color: o.color }))
              : realTelemetry.otherCars?.map(o => ({ x: 0, y: 0, trackPercentage: o.trackPercentage, carNumber: o.carNumber, color: o.color }))
            }
            telemetry={heatmapData}
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent pointer-events-none" />
          
          {/* Speed Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="bg-[#0e0e0e]/80 backdrop-blur-xl border border-white/[0.08] rounded-lg px-6 py-3 flex items-baseline gap-2">
              <Gauge className="w-5 h-5 text-white/40" />
              <span className="font-mono text-4xl font-bold text-white/90">
                {Math.round(activeTelemetry.speed ?? 0)}
              </span>
              <span className="text-sm text-[#f97316] font-semibold">KPH</span>
            </div>
          </div>

          {/* Bottom Left Controls */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-[#0e0e0e]/80 backdrop-blur-xl border border-white/[0.08] rounded-lg p-1.5 flex items-center gap-1">
              <button
                onClick={toggleVoice}
                className={`p-2 rounded transition-all ${
                  voiceEnabled 
                    ? 'bg-[#f97316]/20 text-[#f97316]' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                }`}
                title={voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <div className="w-px h-5 bg-white/[0.08]" />
              <button
                className="p-2 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                title="Settings"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Leaderboard */}
      <div className="w-72 border-l border-white/[0.08] bg-[#111111]/90 backdrop-blur-xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Flag className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Leaderboard
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Live Standings</p>
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-hidden">
          {/* Demo leaderboard data */}
          {[
            { pos: 1, num: '1', driver: 'M. Verstappen', gap: 'Leader', color: '#1e3a8a' },
            { pos: 2, num: '11', driver: 'S. Perez', gap: '+2.4s', color: '#1e3a8a' },
            { pos: 3, num: '44', driver: 'L. Hamilton', gap: '+5.1s', color: '#06b6d4', isPlayer: true },
            { pos: 4, num: '63', driver: 'G. Russell', gap: '+7.8s', color: '#06b6d4' },
            { pos: 5, num: '16', driver: 'C. Leclerc', gap: '+12.3s', color: '#dc2626' },
            { pos: 6, num: '55', driver: 'C. Sainz', gap: '+14.9s', color: '#dc2626' },
            { pos: 7, num: '4', driver: 'L. Norris', gap: '+18.2s', color: '#f97316' },
            { pos: 8, num: '81', driver: 'O. Piastri', gap: '+21.5s', color: '#f97316' },
            { pos: 9, num: '14', driver: 'F. Alonso', gap: '+25.8s', color: '#22c55e' },
            { pos: 10, num: '18', driver: 'L. Stroll', gap: '+28.1s', color: '#22c55e' },
          ].map((entry) => (
            <div 
              key={entry.pos}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] ${
                entry.isPlayer ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Position */}
              <div className={`w-6 text-center font-mono text-sm font-bold ${
                entry.pos === 1 ? 'text-yellow-400' : 
                entry.pos === 2 ? 'text-gray-300' : 
                entry.pos === 3 ? 'text-amber-600' : 'text-white/50'
              }`}>
                {entry.pos}
              </div>
              
              {/* Car Number with team color */}
              <div 
                className="w-8 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: entry.color }}
              >
                {entry.num}
              </div>
              
              {/* Driver Name */}
              <div className="flex-1 min-w-0">
                <span className={`text-xs truncate ${entry.isPlayer ? 'text-white font-semibold' : 'text-white/70'}`}>
                  {entry.driver}
                </span>
              </div>
              
              {/* Gap */}
              <div className={`text-xs font-mono ${
                entry.pos === 1 ? 'text-white/40' : 
                entry.isPlayer ? 'text-cyan-400' : 'text-white/50'
              }`}>
                {entry.gap}
              </div>
            </div>
          ))}
        </div>

        {/* Team Radio Transcripts - F1 Style */}
        <div className="border-t border-white/[0.06] flex flex-col">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Team Radio</span>
          </div>
          <div className="p-2 space-y-2 max-h-32 overflow-hidden">
            {/* Latest message - highlighted */}
            <div className="bg-[#f97316]/10 border-l-2 border-l-[#f97316] rounded-r p-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] uppercase tracking-wider text-[#f97316] font-bold">Engineer</span>
                <span className="text-[9px] text-white/30">LAP 12</span>
              </div>
              <p className="text-[11px] text-white/90 leading-tight">"Looking good, keep this pace. Fuel is on target."</p>
            </div>
            {/* Previous messages */}
            <div className="bg-white/[0.02] border-l-2 border-l-emerald-500/50 rounded-r p-2 opacity-70">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Spotter</span>
                <span className="text-[9px] text-white/30">LAP 11</span>
              </div>
              <p className="text-[11px] text-white/70 leading-tight">"Clear behind, gap is 2.4 seconds."</p>
            </div>
            <div className="bg-white/[0.02] border-l-2 border-l-cyan-500/50 rounded-r p-2 opacity-50">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold">Strategist</span>
                <span className="text-[9px] text-white/30">LAP 10</span>
              </div>
              <p className="text-[11px] text-white/60 leading-tight">"Box window opens in 5 laps."</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
