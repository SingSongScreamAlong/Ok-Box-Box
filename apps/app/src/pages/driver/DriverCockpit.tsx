import { useState, useRef, useEffect } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useEngineer } from '../../hooks/useEngineer';
import { useVoice } from '../../hooks/useVoice';
import { Link } from 'react-router-dom';
import { 
  Gauge, Send, ArrowLeft, Flag,
  Settings2, Clock, ChevronRight, Loader2,
  Fuel, MapPin, Zap, AlertTriangle
} from 'lucide-react';

/**
 * DriverCockpit - Matches Crew page layout exactly
 */

export function DriverCockpit() {
  const { status, telemetry, session } = useRelay();
  const { 
    criticalMessages,
    messages,
    driverAssessment,
    loading: engineerLoading 
  } = useEngineer();
  const { isEnabled: voiceEnabled, toggleVoice, speak } = useVoice();
  
  const [input, setInput] = useState('');
  const [showLiveData, setShowLiveData] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    if (!input.trim()) return;
    // TODO: Send to engineer
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { label: 'Race Strategy', prompt: 'What\'s the race strategy?' },
    { label: 'Fuel Plan', prompt: 'Calculate fuel strategy' },
    { label: 'Setup Tips', prompt: 'Setup recommendations?' },
    { label: 'Tire Management', prompt: 'How should I manage tires?' },
  ];

  // Track image based on track name
  const getTrackImage = () => {
    const name = (session.trackName || '').toLowerCase();
    if (name.includes('daytona')) return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80';
    if (name.includes('spa')) return 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1200&q=80';
    return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80';
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex relative">
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Gauge className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>Cockpit</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Live Session</p>
            </div>
          </div>
        </div>

        {/* Session Status */}
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Flag className="w-3 h-3" />Session Status
          </h3>
          {engineerLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          ) : isLive ? (
            <button className="w-full text-left p-3 rounded border border-white/20 bg-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white/90">{session.trackName || 'On Track'}</span>
                <span className="text-[10px] text-emerald-400">LIVE</span>
              </div>
              <div className="text-[10px] text-white/50 capitalize">{session.sessionType || 'Practice'}</div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                <span className="flex items-center gap-1"><Flag className="w-3 h-3" />Lap {telemetry.lap ?? '--'}</span>
                <span>P{telemetry.position ?? '--'}</span>
              </div>
            </button>
          ) : (
            <div className="p-3 rounded border border-white/[0.06] text-center">
              <div className="text-xs text-white/40">Waiting for connection...</div>
            </div>
          )}
        </div>

        {/* Race Details - Only when live */}
        {isLive && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Race Details</h3>
            <div className="space-y-3 bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40 flex items-center gap-2"><Clock className="w-3 h-3" />Last Lap</span>
                <span className="text-white/80 font-medium font-mono">{formatTime(telemetry.lastLap)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40 flex items-center gap-2"><Clock className="w-3 h-3" />Best Lap</span>
                <span className="text-purple-400 font-medium font-mono">{formatTime(telemetry.bestLap)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40 flex items-center gap-2"><Fuel className="w-3 h-3" />Fuel</span>
                <span className="text-white/80 font-medium">{telemetry.fuel?.toFixed(1) ?? '--'} L</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header with tabs */}
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-white/30'}`}></div>
            <span className="text-sm text-white/70">{isLive ? `${session.trackName || 'On Track'} - ${session.sessionType || 'Session'}` : 'Waiting for session'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowLiveData(true)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded ${showLiveData ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
            >
              <MapPin className="w-3 h-3 inline mr-1.5" />Track Data
            </button>
            <button 
              onClick={() => setShowLiveData(false)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded ${!showLiveData ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
            >
              Chat
            </button>
            <button 
              onClick={toggleVoice}
              className={`p-2 rounded transition-colors ml-2 ${voiceEnabled ? 'bg-orange-500/20 text-orange-400' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalMessages.length > 0 && (
          <div className="p-4 space-y-2">
            {criticalMessages.map(msg => (
              <div key={msg.id} className="border-l-4 border-red-500 bg-red-500/10 rounded-r px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="font-semibold text-red-400">{msg.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {showLiveData ? (
            <div className="space-y-4 p-4">
              {/* Engineer Header with Track Image */}
              <div className="bg-white/[0.03] border border-white/[0.12] rounded p-4 shadow-lg shadow-black/20">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3.5 h-3.5 text-[#f97316]" />
                      <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Engineer's Briefing</span>
                    </div>
                    <h2 className="text-lg font-bold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {session.trackName || 'Waiting for Session'}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />USA</span>
                      <span>3.56 mi • 12 turns</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider">Today</div>
                    <div className="text-sm text-white/70 font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>

              {/* Track Layout with Image */}
              <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  Track Layout
                </h3>
                <div className="h-48 relative rounded overflow-hidden">
                  <img 
                    src={getTrackImage()}
                    alt={session.trackName || 'Track'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 right-2 text-[10px] text-white/40">
                    Pit Loss: ~28s
                  </div>
                </div>
              </div>

              {/* Fuel Strategy */}
              <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-4 flex items-center gap-2">
                  <Fuel className="w-3 h-3" />
                  Fuel Strategy
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-mono font-bold text-[#f97316]">{telemetry.fuelPerLap?.toFixed(2) ?? '0.62'}</div>
                    <div className="text-[10px] text-white/30 uppercase">Gal/Lap</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-mono font-bold text-white/80">{telemetry.fuel?.toFixed(1) ?? '27.9'}</div>
                    <div className="text-[10px] text-white/30 uppercase">Total Fuel</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-mono font-bold text-emerald-400">1</div>
                    <div className="text-[10px] text-white/30 uppercase">Pit Stops</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-mono font-bold text-white/80">{telemetry.lapsRemaining ?? '22'}</div>
                    <div className="text-[10px] text-white/30 uppercase">Pit Window</div>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white/[0.03] rounded text-xs text-white/50">
                  <strong className="text-white/70">Recommendation:</strong> Pit around lap 22 for optimal strategy. Pit loss is ~28s.
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Setup Recommendations */}
                <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
                  <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                    <Settings2 className="w-3 h-3" />
                    Setup Recommendations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.slice(0, 2).map(action => (
                      <button 
                        key={action.label}
                        onClick={() => { setInput(action.prompt); setShowLiveData(false); }}
                        className="px-3 py-1.5 text-xs border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] flex items-center gap-1 rounded transition-all duration-200"
                      >
                        {action.label}<ChevronRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy Notes */}
                <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
                  <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Strategy Notes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.slice(2).map(action => (
                      <button 
                        key={action.label}
                        onClick={() => { setInput(action.prompt); setShowLiveData(false); }}
                        className="px-3 py-1.5 text-xs border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] flex items-center gap-1 rounded transition-all duration-200"
                      >
                        {action.label}<ChevronRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Chat messages */}
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">Engineer</span>
                </div>
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                  {messages.find(m => m.urgency === 'important')?.content || driverAssessment || "I'm still learning your style. Give me a few more sessions."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="px-4 py-2 border-t border-white/[0.04] bg-[#0e0e0e]/40">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {quickActions.map(action => (
              <button 
                key={action.label} 
                onClick={() => { setInput(action.prompt); setShowLiveData(false); inputRef.current?.focus(); }} 
                className="flex-shrink-0 px-3 py-1.5 text-xs border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] flex items-center gap-1 rounded transition-all duration-200"
              >
                {action.label}<ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <input 
              ref={inputRef} 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={handleKeyPress} 
              placeholder="Ask your engineer about strategy, setup, fuel, tires..." 
              className="flex-1 h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200" 
              onFocus={() => setShowLiveData(false)} 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim()} 
              className="h-11 px-5 bg-[#f97316] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#ea580c] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 rounded transition-all duration-200"
            >
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
