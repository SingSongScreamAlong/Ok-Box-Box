import { useRef, useEffect, useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer, getEngineerRoleColor } from '../../hooks/useEngineer';
import { Link } from 'react-router-dom';
import { 
  Fuel,
  Flag,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Zap,
  MessageSquare,
  ChevronRight,
  Video,
  VideoOff
} from 'lucide-react';

/**
 * DriverCockpit - The unified driver dashboard
 * 
 * Combines:
 * - Driver camera system (video background)
 * - Live telemetry overlay
 * - AI crew alerts powered by EngineerCore
 * - Driver memory integration
 * 
 * This is THE driver experience - one view, always available.
 * The engineer KNOWS you and speaks with conviction.
 */
export function DriverCockpit() {
  const { status, telemetry, session } = useRelay();
  const { 
    messages, 
    criticalMessages, 
    driverAssessment,
    engineerKnowledge,
    loading: engineerLoading 
  } = useEngineer();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const isLive = status === 'in_session' || status === 'connected';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* DRIVER CAMERA SYSTEM - Video Background */}
      {cameraEnabled && (
        <>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover"
            style={{ zIndex: 0, opacity: isLive ? 0.4 : 0.25 }}
          >
            <source src="https://okboxbox.com/video/okbb-bg.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" style={{ zIndex: 1 }} />
        </>
      )}

      {/* Main Cockpit UI */}
      <div className="relative z-10 h-screen flex flex-col">
        
        {/* TOP BAR - Session State */}
        <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isLive ? (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-500" />
              )}
              <span className="text-[10px] uppercase tracking-wider text-white/60">
                {status === 'in_session' ? 'Live Session' : 
                 status === 'connected' ? 'Connected' :
                 status === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            
            {/* Session Info */}
            {session.trackName && (
              <>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <Flag className="w-3 h-3 text-orange-400" />
                  <span className="text-xs">{session.trackName}</span>
                  <span className="text-[10px] text-white/40 uppercase">{session.sessionType}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Camera Toggle */}
            <button 
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`p-1.5 rounded transition-colors ${cameraEnabled ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            
            {/* Fuel Status */}
            {telemetry.lapsRemaining !== null && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                telemetry.lapsRemaining < 3 ? 'bg-red-500/20 text-red-400' : 
                telemetry.lapsRemaining < 6 ? 'bg-yellow-500/20 text-yellow-400' : 
                'bg-green-500/20 text-green-400'
              }`}>
                <Fuel className="w-3 h-3" />
                <span>{telemetry.lapsRemaining} laps</span>
              </div>
            )}
          </div>
        </div>

        {/* CRITICAL ALERTS - Top priority interrupts from Engineer */}
        {criticalMessages.map(msg => (
          <div 
            key={msg.id}
            className="border-l-4 border-red-500 bg-red-500/20 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="font-bold uppercase tracking-wider text-red-400">{msg.content}</span>
            </div>
            <span className="text-xs uppercase text-orange-400">{msg.domain}</span>
          </div>
        ))}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 p-4 flex flex-col">
          
          {/* Disconnected State - Engineer Knowledge Display */}
          {!isLive && status !== 'connecting' && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center max-w-lg">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Radio className="w-8 h-8 text-orange-400" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Your Engineer
                </h2>
                <p className="text-sm text-white/50 mb-6">
                  {engineerLoading ? 'Loading...' : 'Standing by. Start iRacing to connect.'}
                </p>

                {/* What the Engineer Knows */}
                {!engineerLoading && engineerKnowledge.length > 0 && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/20 rounded p-4 mb-6 text-left">
                    <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-3">What I Know About You</div>
                    <div className="space-y-2">
                      {engineerKnowledge.map((knowledge, idx) => (
                        <div key={idx} className="text-sm text-white/70 flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span>{knowledge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex items-center justify-center gap-3">
                  <Link 
                    to="/driver/crew/engineer"
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded text-xs uppercase tracking-wider hover:bg-orange-500/30 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Talk to Engineer
                  </Link>
                  <Link 
                    to="/driver/sessions"
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
                  >
                    View Sessions
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {status === 'connecting' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm uppercase tracking-wider text-yellow-400">Connecting to iRacing...</p>
              </div>
            </div>
          )}

          {/* LIVE TELEMETRY */}
          {isLive && (
            <div className="flex-1 flex flex-col justify-end space-y-3">
              
              {/* Telemetry Grid - Bottom of screen */}
              <div className="grid grid-cols-12 gap-2">
                
                {/* Position & Lap */}
                <div className="col-span-2 space-y-2">
                  <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 text-center rounded">
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Position</div>
                    <div className="text-4xl font-bold font-mono">P{telemetry.position ?? '--'}</div>
                  </div>
                  <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 text-center rounded">
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Lap</div>
                    <div className="text-2xl font-bold font-mono">{telemetry.lap ?? '--'}</div>
                  </div>
                </div>

                {/* Speed & Delta */}
                <div className="col-span-6 space-y-2">
                  <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 rounded">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Speed</div>
                        <div className="text-5xl font-bold font-mono tracking-tight">
                          {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
                          <span className="text-lg text-white/40 ml-1">mph</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Gear</div>
                        <div className="text-4xl font-bold font-mono">{telemetry.gear ?? 'N'}</div>
                      </div>
                    </div>
                    {/* RPM Bar */}
                    <div className="mt-2 h-2 bg-white/10 rounded overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                        style={{ width: `${telemetry.rpm ? Math.min(100, (telemetry.rpm / 8000) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Delta */}
                  <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Delta to Best</div>
                      <div className={`text-3xl font-bold font-mono flex items-center gap-2 ${
                        telemetry.delta === null ? 'text-white/30' :
                        telemetry.delta < 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {telemetry.delta !== null ? (
                          <>
                            {telemetry.delta < 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}s
                          </>
                        ) : (
                          <><Minus className="w-6 h-6" />--.---</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lap Times */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 rounded">
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Last Lap</div>
                      <div className="text-xl font-mono font-bold">{formatTime(telemetry.lastLap)}</div>
                    </div>
                    <div className="bg-black/70 backdrop-blur-sm border border-purple-500/30 p-3 rounded">
                      <div className="text-[10px] uppercase tracking-wider text-purple-400">Best Lap</div>
                      <div className="text-xl font-mono font-bold text-purple-400">{formatTime(telemetry.bestLap)}</div>
                    </div>
                  </div>
                </div>

                {/* Fuel & Inputs */}
                <div className="col-span-4 space-y-2">
                  <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Fuel</div>
                      <div className={`text-xs ${
                        telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/60'
                      }`}>
                        {telemetry.lapsRemaining ?? '--'} laps
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="text-2xl font-mono font-bold">
                        {telemetry.fuel !== null ? telemetry.fuel.toFixed(1) : '--'}
                        <span className="text-sm text-white/40">L</span>
                      </div>
                      <div className="text-xs text-white/40">
                        {telemetry.fuelPerLap !== null ? `${telemetry.fuelPerLap.toFixed(2)}/lap` : ''}
                      </div>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${telemetry.fuel ? Math.min(100, (telemetry.fuel / 20) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Throttle / Brake */}
                  <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 rounded">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Throttle</div>
                        <div className="h-12 bg-white/10 relative overflow-hidden rounded">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-75"
                            style={{ height: `${telemetry.throttle ?? 0}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono">
                            {telemetry.throttle ?? 0}%
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Brake</div>
                        <div className="h-12 bg-white/10 relative overflow-hidden rounded">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-red-500 transition-all duration-75"
                            style={{ height: `${telemetry.brake ?? 0}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono">
                            {telemetry.brake ?? 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Crew Stream */}
              <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-white/40" />
                    <span className="text-[10px] uppercase tracking-wider text-white/40">AI Crew</span>
                  </div>
                  <Link to="/driver/crew/engineer" className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 flex items-center gap-1">
                    Open Chat <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-2 space-y-1 max-h-20 overflow-y-auto">
                  {messages.filter(m => m.urgency !== 'critical').length > 0 ? (
                    messages.filter(m => m.urgency !== 'critical').map(msg => (
                      <div 
                        key={msg.id}
                        className={`flex items-center gap-2 px-2 py-1 border-l-2 rounded ${
                          msg.urgency === 'important' ? 'bg-yellow-500/20 border-yellow-500' :
                          'bg-blue-500/20 border-blue-500'
                        }`}
                      >
                        <span className={`text-[10px] uppercase font-semibold ${getEngineerRoleColor(msg.domain)}`}>
                          {msg.domain}
                        </span>
                        <span className="text-sm text-white/80">{msg.content}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-white/30 italic px-2 py-1">
                      {engineerLoading ? 'Loading...' : driverAssessment}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM BAR - Quick Access */}
        <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm border-t border-white/10 px-4 py-2">
          <div className="flex items-center gap-4">
            <Link to="/driver/crew/engineer" className="text-[10px] uppercase tracking-wider text-orange-400/60 hover:text-orange-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Engineer
            </Link>
            <Link to="/driver/crew/spotter" className="text-[10px] uppercase tracking-wider text-blue-400/60 hover:text-blue-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Spotter
            </Link>
            <Link to="/driver/crew/analyst" className="text-[10px] uppercase tracking-wider text-purple-400/60 hover:text-purple-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Analyst
            </Link>
          </div>
          <div className="text-[10px] text-white/20">
            Ok, Box Box • Cockpit
          </div>
        </div>
      </div>
    </div>
  );
}
