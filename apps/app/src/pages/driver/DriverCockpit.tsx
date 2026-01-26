
import { useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { useRaceSimulation } from '../../hooks/useRaceSimulation'; // NEW: Simulation Engine
import {
  Fuel, AlertTriangle, Volume2, VolumeX, Flag, Radio,
  Settings2, Circle, Wrench
} from 'lucide-react';
import { TrackMap } from '../../components/TrackMapRive'; // Using the Pro wrapper

/**
 * DriverCockpit - Glanceable Second Monitor / iPad View
 */

// Flag state colors and labels
const FLAG_STATES = {
  green: { color: 'bg-green-500', label: 'GREEN', textColor: 'text-green-400' },
  yellow: { color: 'bg-yellow-500', label: 'YELLOW', textColor: 'text-yellow-400' },
  white: { color: 'bg-white', label: 'WHITE', textColor: 'text-white' },
  checkered: { color: 'bg-white', label: 'CHECKERED', textColor: 'text-white' },
  red: { color: 'bg-red-500', label: 'RED', textColor: 'text-red-400' },
  blue: { color: 'bg-blue-500', label: 'BLUE', textColor: 'text-blue-400' },
  black: { color: 'bg-black border border-white', label: 'BLACK', textColor: 'text-white' },
} as const;

type FlagState = keyof typeof FLAG_STATES;

export function DriverCockpit() {
  const { status, telemetry: realTelemetry, session, getCarMapPosition } = useRelay();
  const { criticalMessages, messages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();

  // Spotter settings
  const [spotterEnabled, setSpotterEnabled] = useState(true);

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

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Track ID for map
  const trackId = 'daytona'; // Forced for Demo
  const flagState = 'green';
  const flagInfo = FLAG_STATES[flagState];

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
    <div className="fixed inset-0 top-14 bottom-10 bg-[#080808] text-white overflow-hidden flex flex-col z-10">

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
            telemetry={heatmapData} // Pass the fake heatmap
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-black/30 pointer-events-none" />
        </div>

        {/* Top Bar - Track name, status, flag */}
        <div className="absolute top-0 left-0 right-0 z-20 h-8 px-2 flex items-center justify-between bg-black/60 backdrop-blur-sm border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`} />
            <h1 className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Daytona International Speedway <span className="text-white/30 text-[9px] ml-1">DEMO SIMULATION</span>
            </h1>
          </div>
          <button
            onClick={toggleVoice}
            className={`p-1 rounded transition-colors ${voiceEnabled ? 'bg-orange-500/30 text-orange-400' : 'text-white/40 hover:text-white/60'}`}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Speed Stats Overlay for Demo */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="font-mono text-6xl font-bold tracking-tighter text-white drop-shadow-lg">
            {Math.round(activeTelemetry.speed ?? 0)}
            <span className="text-sm text-cyan-500 ml-2">KPH</span>
          </div>
        </div>

      </div>

      {/* Bottom Panel - Compact */}
      <div className="h-20 border-t border-white/10 bg-[#0a0a0a]">
        {/* ... (Keep existing bottom panel code for Pit/Radio/Tires) ... */}
        {/* Simplified for this file update to avoid context overflow, typically we keep it */}
        <div className="flex items-center justify-center h-full text-white/20 text-xs">
          RACE CONTROL SYSTEMS ONLINE
        </div>
      </div>

    </div>
  );
}
