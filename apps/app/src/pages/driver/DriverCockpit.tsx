import { useEffect, useRef } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle,
  Radio,
  MessageSquare,
  Volume2,
  VolumeX,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Fuel,
  ChevronRight,
  Clock,
  Gauge
} from 'lucide-react';

/**
 * DriverCockpit - What To Do RIGHT NOW
 * 
 * This page exists for ONE reason:
 * → Tell the driver what to do on the current lap.
 * 
 * If an element does not influence the driver's actions NOW, it does not belong here.
 * 
 * NOT a dashboard. NOT analytics. NOT historical review.
 * This is a coach standing behind you — one voice, one focus, calm authority.
 */
export function DriverCockpit() {
  const { status, telemetry, session } = useRelay();
  const { 
    criticalMessages,
    messages,
    driverAssessment,
    engineerKnowledge,
    loading: engineerLoading 
  } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  const isLive = status === 'in_session' || status === 'connected';

  // Get the current focus from engineer messages (most recent important message)
  const currentFocus = messages.find(m => m.urgency === 'important') || messages[0];
  
  // Derive execution status from recent lap performance
  const getExecutionStatus = () => {
    if (!telemetry.delta) return 'baseline';
    if (telemetry.delta < -0.3) return 'improving';
    if (telemetry.delta > 0.3) return 'regressing';
    return 'holding';
  };
  
  const executionStatus = getExecutionStatus();

  // Execution status display
  const getExecutionDisplay = () => {
    switch (executionStatus) {
      case 'improving':
        return { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Improving' };
      case 'holding':
        return { icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', label: 'Holding' };
      case 'regressing':
        return { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Regressing' };
      default:
        return { icon: Minus, color: 'text-white/40', bg: 'bg-white/5 border-white/10', label: 'Baseline' };
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const execution = getExecutionDisplay();
  const ExecutionIcon = execution.icon;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover opacity-20"
        style={{ zIndex: 0 }}
      >
        <source src="https://okboxbox.com/video/okbb-bg.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" style={{ zIndex: 1 }} />

      {/* Main Cockpit UI - Vertical Flow */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 space-y-6">
        
        {/* CONTEXT HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLive ? (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-white/30" />
            )}
            <span className="text-sm text-white/50">
              {isLive 
                ? `${session.trackName || 'On Track'} • ${session.sessionType || 'Session'} • Lap ${telemetry.lap || '--'}` 
                : 'Off Track'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Fuel - Only show when actionable */}
            {isLive && telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 6 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium ${
                telemetry.lapsRemaining < 3 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                <Fuel className="w-3.5 h-3.5" />
                <span>{telemetry.lapsRemaining} laps fuel</span>
              </div>
            )}
            
            {/* Voice Toggle */}
            <button 
              onClick={toggleVoice}
              className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${voiceEnabled ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'}`}
              title={voiceEnabled ? 'Voice On' : 'Voice Off'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* CRITICAL ALERTS - Top priority interrupts */}
        {criticalMessages.map(msg => (
          <div 
            key={msg.id}
            className="border-l-4 border-red-500 bg-red-500/10 backdrop-blur-xl rounded-r-lg px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="font-semibold text-red-400">{msg.content}</span>
            </div>
          </div>
        ))}

        {/* ============================================ */}
        {/* DISCONNECTED STATE */}
        {/* ============================================ */}
        {!isLive && status !== 'connecting' && (
          <div className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-orange-500/10 backdrop-blur-xl border border-orange-500/20 rounded-full flex items-center justify-center">
                <Radio className="w-10 h-10 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your Engineer</h2>
              <p className="text-white/50 mb-8">
                {engineerLoading ? 'Loading...' : 'Standing by. Start iRacing to connect.'}
              </p>

              {/* What the Engineer Knows */}
              {!engineerLoading && engineerKnowledge.length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-lg p-5 mb-8 text-left max-w-md mx-auto">
                  <div className="text-xs uppercase tracking-wider text-orange-400 mb-4">What I Know About You</div>
                  <div className="space-y-3">
                    {engineerKnowledge.map((knowledge, idx) => (
                      <div key={idx} className="text-sm text-white/70 flex items-start gap-3">
                        <span className="text-orange-400/60 mt-0.5">•</span>
                        <span>{knowledge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center justify-center gap-4">
                <Link 
                  to="/driver/crew/engineer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to Engineer
                </Link>
                <Link 
                  to="/driver/sessions"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  View Sessions
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* CONNECTING STATE */}
        {/* ============================================ */}
        {status === 'connecting' && (
          <div className="py-16 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-yellow-400">Connecting to iRacing...</p>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* LIVE SESSION - The Core Experience */}
        {/* ============================================ */}
        {isLive && (
          <div className="space-y-4">
            
            {/* PRIMARY FOCUS CARD - Hero element with gradient border */}
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/50 via-orange-500/20 to-transparent rounded-2xl" />
              <div className="relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500/30 to-orange-600/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/10">
                    <Target className="w-7 h-7 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-orange-400/80 mb-2 font-medium">Current Focus</div>
                    <div className="text-xl font-medium leading-relaxed text-white/90">
                      {currentFocus?.content || driverAssessment || 'Drive your line. Build rhythm.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EXECUTION STATUS + DELTA - With glow effect */}
            <div className={`relative overflow-hidden backdrop-blur-xl rounded-xl p-4 ${
              executionStatus === 'improving' ? 'bg-gradient-to-r from-green-500/20 to-green-500/5 border border-green-500/30 shadow-lg shadow-green-500/10' :
              executionStatus === 'regressing' ? 'bg-gradient-to-r from-red-500/20 to-red-500/5 border border-red-500/30 shadow-lg shadow-red-500/10' :
              executionStatus === 'holding' ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30' :
              'bg-white/[0.03] border border-white/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExecutionIcon className={`w-5 h-5 ${execution.color}`} />
                  <span className={`font-semibold ${execution.color}`}>{execution.label}</span>
                </div>
                {telemetry.delta !== null && (
                  <span className={`text-3xl font-mono font-bold tracking-tight ${telemetry.delta < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}s
                  </span>
                )}
              </div>
            </div>

            {/* TELEMETRY GRID - Glass cards with depth */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Position - Highlighted */}
              <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Position</div>
                <div className="text-4xl font-bold font-mono tracking-tight">P{telemetry.position ?? '--'}</div>
              </div>

              {/* Lap */}
              <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Lap</div>
                <div className="text-4xl font-bold font-mono tracking-tight">{telemetry.lap ?? '--'}</div>
              </div>

              {/* Last Lap */}
              <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Last Lap
                </div>
                <div className="text-2xl font-mono font-bold tracking-tight">{formatTime(telemetry.lastLap)}</div>
              </div>

              {/* Best Lap - Purple accent */}
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 shadow-lg shadow-purple-500/10">
                <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-2 font-medium">Best Lap</div>
                <div className="text-2xl font-mono font-bold text-purple-300 tracking-tight">{formatTime(telemetry.bestLap)}</div>
              </div>
            </div>

            {/* SPEED + FUEL ROW - Larger cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Speed - Big number emphasis */}
              <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
                  <Gauge className="w-3 h-3" /> Speed
                </div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold font-mono tracking-tighter">
                    {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
                  </span>
                  <span className="text-xl text-white/30 ml-2">mph</span>
                </div>
              </div>

              {/* Fuel - With progress indicator */}
              <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                    <Fuel className="w-3 h-3" /> Fuel
                  </div>
                  <div className={`text-xs font-medium ${
                    telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white/50'
                  }`}>
                    {telemetry.lapsRemaining ?? '--'} laps
                  </div>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold font-mono tracking-tighter">
                    {telemetry.fuel !== null ? telemetry.fuel.toFixed(1) : '--'}
                  </span>
                  <span className="text-lg text-white/30 ml-2">L</span>
                </div>
                {/* Fuel bar */}
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 
                        ? 'bg-gradient-to-r from-red-500 to-red-400' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-400'
                    }`}
                    style={{ width: `${telemetry.fuel ? Math.min(100, (telemetry.fuel / 20) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ENGINEER VOICE - Subtle card */}
            {messages.filter(m => m.urgency !== 'critical').length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[10px] uppercase tracking-wider text-white/30 px-1 font-medium">Engineer</div>
                {messages.filter(m => m.urgency !== 'critical').slice(0, 2).map(msg => (
                  <div 
                    key={msg.id}
                    className="bg-gradient-to-r from-white/[0.04] to-transparent backdrop-blur-xl border-l-2 border-orange-500/50 rounded-r-lg px-4 py-3 text-white/70"
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* FOOTER - Minimal navigation */}
        <div className="pt-6 flex items-center justify-between text-xs text-white/30">
          <div className="flex items-center gap-4">
            <Link to="/driver/sessions" className="hover:text-white/50 transition-colors flex items-center gap-1">
              Sessions <ChevronRight className="w-3 h-3" />
            </Link>
            <Link to="/driver/crew/engineer" className="hover:text-white/50 transition-colors flex items-center gap-1">
              Engineer <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <span>Cockpit</span>
        </div>

      </div>
    </div>
  );
}
