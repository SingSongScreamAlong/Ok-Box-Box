
import { useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { useRaceSimulation } from '../../hooks/useRaceSimulation';
import { 
  Volume2, VolumeX, Gauge, Fuel, Flag, Clock, 
  TrendingUp, TrendingDown, Minus, MapPin, Radio
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
    <div className="h-[calc(100vh-6rem)] flex relative bg-[#0e0e0e]">
      
      {/* Left Sidebar - Race Info */}
      <div className="w-64 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#f97316]" />
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
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Flag className="w-3 h-3" />Race Position
          </h3>
          <div className="bg-white/[0.02] rounded p-4 border border-white/[0.06]">
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
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />Lap Times
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <span className="text-white/50">Last Lap</span>
              <span className="text-white/90 font-mono">{activeTelemetry.lastLap}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <span className="text-white/50">Best Lap</span>
              <span className="text-[#f97316] font-mono">{activeTelemetry.bestLap}</span>
            </div>
          </div>
        </div>

        {/* Fuel & Laps */}
        <div className="p-4 flex-1">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Fuel className="w-3 h-3" />Race Status
          </h3>
          <div className="space-y-3 bg-white/[0.02] rounded p-3 border border-white/[0.06]">
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
        </div>
      </div>

      {/* Right Sidebar - Crew Comms */}
      <div className="w-64 border-l border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Radio className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Crew Radio
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Communications</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            <div className="bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400">Spotter</span>
                <span className="text-[10px] text-white/30">2s ago</span>
              </div>
              <p className="text-xs text-white/70">Clear all around, good pace.</p>
            </div>
            <div className="bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[#f97316]">Engineer</span>
                <span className="text-[10px] text-white/30">15s ago</span>
              </div>
              <p className="text-xs text-white/70">Fuel looks good for the stint. Keep this pace.</p>
            </div>
            <div className="bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400">Spotter</span>
                <span className="text-[10px] text-white/30">45s ago</span>
              </div>
              <p className="text-xs text-white/70">Car behind backing off, you've got the gap.</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 text-[10px] uppercase tracking-wider border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] rounded transition-all">
              Pit Request
            </button>
            <button className="px-3 py-2 text-[10px] uppercase tracking-wider border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] rounded transition-all">
              Fuel Calc
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
