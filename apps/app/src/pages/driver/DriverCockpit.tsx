
import { useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { useRaceSimulation } from '../../hooks/useRaceSimulation'; // NEW: Simulation Engine
import { Volume2, VolumeX } from 'lucide-react';
import { TrackMap } from '../../components/TrackMapRive'; // Using the Pro wrapper

/**
 * DriverCockpit - Glanceable Second Monitor / iPad View
 */


export function DriverCockpit() {
  const { status, telemetry: realTelemetry, getCarMapPosition } = useRelay();
  const { criticalMessages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();

  
  // DEMO MODE STATE
  // If not connected to iRacing, use the Simulation Hook
  const isDemo = status !== 'connected' && status !== 'in_session';
  const { player: simPlayer, opponents: simOpponents } = useRaceSimulation({ isPlaying: isDemo });

  // HYBRID TELEMETRY: Use Real if available, else Sim
  const activeTelemetry = isDemo ? {
    speed: simPlayer.speed,
    trackPercentage: simPlayer.trackPercentage,
    carPosition: { trackPercentage: simPlayer.trackPercentage, x: 0, y: 0 }, // Map handles the xy via PCT
    lap: 5,
    position: 'P3',
    delta: -0.42,
    fuel: 12.5,
    lapsRemaining: 18
  } : {
    ...realTelemetry,
    carPosition: realTelemetry.trackPosition !== null ? getCarMapPosition(realTelemetry.trackPosition) : undefined
  };

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  const isLive = true; // status === 'in_session' || status === 'connected'; // FORCED LIVE

  
  // Track ID for map
  const trackId = 'daytona'; // Forced for Demo

  // TELEMETRY HISTORY FOR HEATMAP
  // In a real app we'd buffer this. For Sim, we just pass current speed for now 
  // or buffer the last N points. TrackMapPro handles simple array.
  // Let's create a visual buffer that trailing behind the car?
  // Actually TrackMapPro expects an array of points covering the track...
  // For now simple single-value speed coloring is easiest to start.

  // Mock Heatmap: We want to color the whole track based on "Ideal Speed" logic 
  // We can pass a static "ideal lap" telemetry array if we had one.
  // Or we just let the car color the segment it is on?
  // The current `TrackVisuals` logic uses the `telemetry` prop to color segments by index.
  // To make it look cool, let's generate a fake "Ideal Lap" buffer.
  const [heatmapData, setHeatmapData] = useState<{ speed: number }[]>([]);

  useEffect(() => {
    // One-time generation of a "Fake Heatmap" array (300 points)
    // Slow in corners (idx 0-30, 140-160), Fast elsewhere
    const points = Array.from({ length: 100 }, (_, i) => {
      let s = 300;
      if (i < 10) s = 80;
      if (i > 45 && i < 55) s = 90;
      return { speed: s };
    });
    setHeatmapData(points);
  }, []);

  return (
    <div className="fixed inset-0 top-14 bottom-10 bg-[#0e0e0e] text-white overflow-hidden flex flex-col z-10">

      {/* Track Map Section - fills remaining space */}
      <div className="relative flex-1 min-h-0">

        {/* Track Map */}
        <div className="absolute inset-0 z-0">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-[#0e0e0e]/40 pointer-events-none" />
        </div>

        {/* Top Bar - Track name, status, flag */}
        <div className="absolute top-0 left-0 right-0 z-20 h-12 px-4 flex items-center justify-between bg-[#0e0e0e]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            <h1 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Daytona International Speedway
            </h1>
            <span className="text-[10px] text-white/40 uppercase tracking-wider bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">Demo Simulation</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={`p-2 rounded transition-all duration-200 ${voiceEnabled ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.06]'}`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Speed Stats Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-[#0e0e0e]/80 backdrop-blur-xl border border-white/[0.08] rounded-lg px-8 py-4">
            <div className="font-mono text-6xl font-bold tracking-tighter text-white/90">
              {Math.round(activeTelemetry.speed ?? 0)}
              <span className="text-sm text-[#f97316] ml-2 font-semibold">KPH</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Panel - Crew Style */}
      <div className="h-16 border-t border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl">
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">Race Control Systems Online</span>
        </div>
      </div>

    </div>
  );
}
