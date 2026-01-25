import { useEffect } from 'react';
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
  Flag,
  Timer,
  Zap
} from 'lucide-react';

/**
 * DriverCockpit - What To Do RIGHT NOW
 * 
 * Visual design matching the Race Engineer page style.
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

  // Speak critical messages automatically
  useEffect(() => {
    if (voiceEnabled && criticalMessages.length > 0) {
      criticalMessages.forEach(msg => speak(msg));
    }
  }, [voiceEnabled, criticalMessages, speak]);

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

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Track images mapping
  const getTrackImage = (trackName: string | null) => {
    if (!trackName) return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80';
    const name = trackName.toLowerCase();
    if (name.includes('daytona')) return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80';
    if (name.includes('spa')) return 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1200&q=80';
    if (name.includes('monza')) return 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80';
    return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 py-6">
        
        {/* CRITICAL ALERTS - Top priority interrupts */}
        {criticalMessages.map(msg => (
          <div 
            key={msg.id}
            className="mb-4 border-l-4 border-red-500 bg-red-500/10 backdrop-blur-xl rounded-r-lg px-5 py-4"
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
        {/* LIVE SESSION - Rich Visual Layout */}
        {/* ============================================ */}
        {isLive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* HERO - Track Image with Focus Overlay */}
              <div className="relative rounded-xl overflow-hidden">
                {/* Track Image */}
                <div className="relative h-48 md:h-64">
                  <img 
                    src={getTrackImage(session.trackName)}
                    alt={session.trackName || 'Track'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  
                  {/* Track Info Overlay */}
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-medium mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      LIVE SESSION
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold">{session.trackName || 'On Track'}</h1>
                    <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
                      <Flag className="w-3 h-3" />
                      <span className="capitalize">{session.sessionType || 'Practice'}</span>
                    </div>
                  </div>

                  {/* Voice Toggle */}
                  <button 
                    onClick={toggleVoice}
                    className={`absolute top-4 right-4 p-2 rounded-lg backdrop-blur-sm transition-colors ${voiceEnabled ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50' : 'bg-black/50 border border-white/20 text-white/60 hover:text-white'}`}
                    title={voiceEnabled ? 'Voice On' : 'Voice Off'}
                  >
                    {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>

                {/* Focus Card - Overlapping the image */}
                <div className="relative -mt-16 mx-4 mb-4">
                  <div className="bg-gradient-to-br from-white/[0.1] to-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500/40 to-orange-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Target className="w-6 h-6 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1 font-semibold">Current Focus</div>
                        <div className="text-lg font-medium leading-relaxed">
                          {currentFocus?.content || driverAssessment || 'Drive your line. Build rhythm.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE TELEMETRY SECTION */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    LIVE TELEMETRY
                  </div>
                  <div className="text-xs text-white/40">Lap {telemetry.lap ?? '--'}</div>
                </div>
                
                <div className="p-4">
                  {/* Main Stats Row */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Position</div>
                      <div className="text-3xl font-bold font-mono text-white">P{telemetry.position ?? '--'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Speed</div>
                      <div className="text-3xl font-bold font-mono text-green-400">
                        {telemetry.speed !== null ? Math.round(telemetry.speed) : '--'}
                        <span className="text-sm text-white/40 ml-1">mph</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Delta</div>
                      <div className={`text-3xl font-bold font-mono ${
                        telemetry.delta === null ? 'text-white/40' :
                        telemetry.delta < 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {telemetry.delta !== null ? (
                          <>{telemetry.delta > 0 ? '+' : ''}{telemetry.delta.toFixed(3)}s</>
                        ) : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Fuel</div>
                      <div className="text-3xl font-bold font-mono text-white">
                        {telemetry.fuel !== null ? telemetry.fuel.toFixed(1) : '--'}
                        <span className="text-sm text-white/40 ml-1">L</span>
                      </div>
                    </div>
                  </div>

                  {/* Lap Times Row */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40">Last Lap</div>
                        <div className="text-xl font-mono font-bold">{formatTime(telemetry.lastLap)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Timer className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-purple-400">Best Lap</div>
                        <div className="text-xl font-mono font-bold text-purple-400">{formatTime(telemetry.bestLap)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FUEL STRATEGY */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                    <Fuel className="w-3.5 h-3.5 text-green-400" />
                    FUEL STATUS
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold font-mono text-green-400">
                        {telemetry.fuelPerLap !== null ? telemetry.fuelPerLap.toFixed(2) : '--'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">L/Lap</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold font-mono text-white">
                        {telemetry.fuel !== null ? telemetry.fuel.toFixed(1) : '--'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Total Fuel</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold font-mono ${
                        telemetry.lapsRemaining !== null && telemetry.lapsRemaining < 3 ? 'text-red-400' : 'text-white'
                      }`}>
                        {telemetry.lapsRemaining ?? '--'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">Laps Remaining</div>
                    </div>
                  </div>
                  
                  {/* Fuel Bar */}
                  <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
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
            </div>

            {/* RIGHT COLUMN - Sidebar */}
            <div className="space-y-4">
              
              {/* EXECUTION STATUS */}
              <div className={`rounded-xl p-4 border ${
                executionStatus === 'improving' ? 'bg-green-500/10 border-green-500/30' :
                executionStatus === 'regressing' ? 'bg-red-500/10 border-red-500/30' :
                executionStatus === 'holding' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-white/[0.02] border-white/10'
              }`}>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Execution Status</div>
                <div className="flex items-center gap-3">
                  {executionStatus === 'improving' && <TrendingUp className="w-6 h-6 text-green-400" />}
                  {executionStatus === 'regressing' && <TrendingDown className="w-6 h-6 text-red-400" />}
                  {(executionStatus === 'holding' || executionStatus === 'baseline') && <Minus className="w-6 h-6 text-yellow-400" />}
                  <span className={`text-xl font-semibold ${
                    executionStatus === 'improving' ? 'text-green-400' :
                    executionStatus === 'regressing' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {executionStatus === 'improving' ? 'Improving' :
                     executionStatus === 'regressing' ? 'Regressing' :
                     executionStatus === 'holding' ? 'Holding' : 'Baseline'}
                  </span>
                </div>
              </div>

              {/* SESSION INFO */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Session Details</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Session Type</span>
                    <span className="text-sm font-medium capitalize">{session.sessionType || 'Practice'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Current Lap</span>
                    <span className="text-sm font-medium">{telemetry.lap ?? '--'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Position</span>
                    <span className="text-sm font-medium">P{telemetry.position ?? '--'}</span>
                  </div>
                </div>
              </div>

              {/* ENGINEER MESSAGES */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                    ENGINEER
                  </div>
                  <Link to="/driver/crew/engineer" className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                    Open Chat <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {messages.filter(m => m.urgency !== 'critical').length > 0 ? (
                    messages.filter(m => m.urgency !== 'critical').slice(0, 3).map(msg => (
                      <div 
                        key={msg.id}
                        className="bg-white/[0.03] border-l-2 border-orange-500/50 rounded-r px-3 py-2 text-sm text-white/70"
                      >
                        {msg.content}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-white/40 italic py-2">
                      {driverAssessment || 'No messages yet'}
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK LINKS */}
              <div className="space-y-2">
                <Link 
                  to="/driver/sessions"
                  className="flex items-center justify-between w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-sm">View Sessions</span>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </Link>
                <Link 
                  to="/driver/stats"
                  className="flex items-center justify-between w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-sm">Driver Stats</span>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </Link>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
