import { useEffect } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { 
  Fuel, Clock, AlertTriangle, Volume2, VolumeX
} from 'lucide-react';
import { TrackMapRive } from '../../components/TrackMapRive';

/**
 * DriverCockpit - Glanceable Second Monitor / iPad View
 * 
 * Track map is the hero. Data overlaid around edges.
 * Designed for quick glances during a race.
 */

export function DriverCockpit() {
  const { status, telemetry, session, getCarMapPosition } = useRelay();
  const { criticalMessages } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  const isLive = status === 'in_session' || status === 'connected';

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Get car position for track map
  const carPosition = telemetry.trackPosition !== null 
    ? getCarMapPosition(telemetry.trackPosition) 
    : undefined;

  // Track ID for map
  const trackId = (session.trackName || 'default').toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');

  return (
    <div className="h-screen bg-[#0a0a0a] text-white overflow-hidden relative">
      
      {/* Critical Alerts - Top overlay */}
      {criticalMessages.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-30 space-y-2">
          {criticalMessages.map(msg => (
            <div key={msg.id} className="border-l-4 border-red-500 bg-red-500/20 backdrop-blur-xl rounded-r px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="font-semibold text-red-400">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Track Map - Full screen hero */}
      <div className="absolute inset-0 z-0">
        <TrackMapRive 
          trackId={trackId}
          showPitLane={true}
          carPosition={carPosition}
          currentSector={telemetry.sector || undefined}
          speed={telemetry.speed || undefined}
          throttle={telemetry.throttle || undefined}
          brake={telemetry.brake || undefined}
          className="w-full h-full"
        />
        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Top Bar - Track name and status */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`} />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {session.trackName || 'Waiting for Session'}
            </h1>
            <div className="text-xs text-white/50 capitalize">{session.sessionType || 'Practice'}</div>
          </div>
        </div>
        <button 
          onClick={toggleVoice}
          className={`p-3 rounded-lg backdrop-blur-sm transition-colors ${voiceEnabled ? 'bg-orange-500/30 text-orange-400' : 'bg-black/30 text-white/40 hover:text-white/60'}`}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Position & Lap - Large, top left */}
      <div className="absolute top-24 left-6 z-20">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-6xl font-bold font-mono tracking-tighter">
            P{telemetry.position ?? '--'}
          </div>
          <div className="text-sm text-white/50 mt-1">Lap {telemetry.lap ?? '--'}</div>
        </div>
      </div>

      {/* Delta - Large, top right */}
      {telemetry.delta !== null && (
        <div className="absolute top-24 right-6 z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className={`text-5xl font-bold font-mono tracking-tighter ${
              telemetry.delta < 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(2)}s
            </div>
            <div className="text-sm text-white/50 mt-1">vs Best</div>
          </div>
        </div>
      )}

      {/* Lap Times - Bottom left */}
      <div className="absolute bottom-24 left-6 z-20">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-white/40" />
            <div>
              <div className="text-xs text-white/40">Last Lap</div>
              <div className="text-2xl font-mono font-bold">{formatTime(telemetry.lastLap)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs text-purple-400">Best Lap</div>
              <div className="text-2xl font-mono font-bold text-purple-400">{formatTime(telemetry.bestLap)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fuel - Bottom right */}
      <div className="absolute bottom-24 right-6 z-20">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <Fuel className={`w-5 h-5 ${
              telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-green-400'
            }`} />
            <div>
              <div className="text-xs text-white/40">Fuel</div>
              <div className="text-3xl font-mono font-bold">
                {telemetry.fuel?.toFixed(1) ?? '--'}
                <span className="text-lg text-white/40 ml-1">L</span>
              </div>
              <div className={`text-sm font-medium ${
                telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/50'
              }`}>
                {telemetry.lapsRemaining ?? '--'} laps remaining
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speed - Bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl px-8 py-4 border border-white/10 text-center">
          <div className="text-6xl font-bold font-mono tracking-tighter">
            {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
          </div>
          <div className="text-sm text-white/50">mph</div>
        </div>
      </div>

      {/* Not connected state */}
      {!isLive && status !== 'connecting' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-2xl font-medium mb-2">Waiting for Session</div>
            <div className="text-white/50">Start iRacing to connect</div>
          </div>
        </div>
      )}

      {status === 'connecting' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-orange-400">Connecting...</div>
          </div>
        </div>
      )}

    </div>
  );
}
