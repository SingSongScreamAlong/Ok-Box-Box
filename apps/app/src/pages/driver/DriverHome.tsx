import { useRelay } from '../../hooks/useRelay';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverData } from '../../hooks/useDriverData';
import { useLiveBehavioral, getBehavioralGrade } from '../../hooks/useLiveBehavioral';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Radio, Headphones, Wrench, Eye, ChevronRight, CheckCircle2, Circle, AlertCircle, Play, MessageSquare, Shield, TrendingUp, Award, Gauge } from 'lucide-react';
import { getLicenseColor } from '../../lib/driverService';

type CrewMemberStatus = 'ready' | 'active' | 'standby' | 'offline';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  status: CrewMemberStatus;
  statusMessage: string;
  color: string;
  link: string;
}

export function DriverHome() {
  const { user } = useAuth();
  const { status, session, connect } = useRelay();
  const { profile } = useDriverData();
  const { metrics: behavioralMetrics } = useLiveBehavioral({ 
    runId: 'live',
    enabled: status === 'in_session' || status === 'connected'
  });
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const isLive = status === 'in_session';
  const isConnected = status === 'connected' || status === 'in_session';

  // Dynamic crew messages based on behavioral metrics and session state
  const getEngineerMessage = () => {
    if (isLive && behavioralMetrics) {
      if (behavioralMetrics.behavioral.bsi < 60) return "Focus on smoother brake release.";
      if (behavioralMetrics.behavioral.tci < 60) return "Watch your throttle application.";
      return "Pace looks good, stay consistent.";
    }
    if (isLive) return "Monitoring fuel, pace, and strategy.";
    if (isConnected) return "Standing by for session start.";
    return "Let's review your setup before the race.";
  };

  const getSpotterMessage = () => {
    if (isLive && behavioralMetrics) {
      if (behavioralMetrics.behavioral.rci < 60) return "Rhythm is off — find your groove.";
      return "Track is clear, push when ready.";
    }
    if (isLive) return "Watching traffic and track conditions.";
    if (isConnected) return "Ready to call positions.";
    return "We can review racecraft together.";
  };

  const crewMembers: CrewMember[] = [
    { id: 'engineer', name: 'Race Engineer', role: 'Strategy & Setup', icon: <Wrench className="w-6 h-6" />, status: isLive ? 'active' : isConnected ? 'ready' : 'standby', statusMessage: getEngineerMessage(), color: '#f97316', link: '/driver/crew/engineer' },
    { id: 'spotter', name: 'Spotter', role: 'Traffic & Awareness', icon: <Eye className="w-6 h-6" />, status: isLive ? 'active' : isConnected ? 'ready' : 'standby', statusMessage: getSpotterMessage(), color: '#3b82f6', link: '/driver/crew/spotter' },
  ];

  const getStatusIcon = (s: CrewMemberStatus) => {
    if (s === 'active') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === 'ready') return <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />;
    if (s === 'standby') return <Circle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const relayIcon = status === 'in_session' ? <Radio className="w-6 h-6 text-green-500" /> : status === 'connected' ? <Wifi className="w-6 h-6 text-blue-500" /> : status === 'connecting' ? <Wifi className="w-6 h-6 text-yellow-500 animate-pulse" /> : <WifiOff className="w-6 h-6 text-white/40" />;
  const relayTitle = status === 'in_session' ? 'Session Active' : status === 'connected' ? 'Relay Connected' : status === 'connecting' ? 'Connecting...' : 'Relay Disconnected';
  const relayColor = status === 'in_session' ? 'border-green-500/50 bg-green-500/10' : status === 'connected' ? 'border-blue-500/50 bg-blue-500/10' : status === 'connecting' ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/20 bg-white/5';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Race Operations</h1>
        <p className="text-white/50 mt-2">Welcome back, {displayName}. Your crew is ready when you are.</p>
      </div>
      <div className={`border p-6 ${relayColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 border border-white/20 flex items-center justify-center bg-black/40">{relayIcon}</div>
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{relayTitle}</h2>
              <p className="text-sm text-white/60 mt-1">{status === 'in_session' ? `${session.sessionType?.toUpperCase() || 'LIVE'} at ${session.trackName || 'Track'}` : status === 'connected' ? 'Waiting for session start' : 'Your crew is available even without the relay'}</p>
            </div>
          </div>
          {status === 'disconnected' && (
            <div className="flex items-center gap-2">
              <button onClick={() => connect()} className="px-4 py-2 border border-white/20 text-white/60 font-semibold text-sm uppercase tracking-wider hover:bg-white/5 hover:text-white">Reconnect</button>
              <Link to="/download" className="px-4 py-2 border border-white/20 text-white/60 font-semibold text-sm uppercase tracking-wider hover:bg-white/5 hover:text-white">Download Relay</Link>
            </div>
          )}
          {(status === 'connected' || status === 'connecting') && (
            <button onClick={() => connect()} className="px-4 py-2 border border-white/20 text-white/60 font-semibold text-sm uppercase tracking-wider hover:bg-white/5 hover:text-white flex items-center gap-2">
              <Radio className="w-4 h-4" /> Refresh
            </button>
          )}
          {status === 'in_session' && <Link to="/driver/pitwall" className="px-4 py-2 bg-green-500 text-black font-semibold text-sm uppercase tracking-wider hover:bg-green-400 flex items-center gap-2"><Play className="w-4 h-4" />Open Pitwall</Link>}
        </div>
        {/* Enhanced telemetry status panel when in session */}
        {status === 'in_session' && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Track</div>
              <div className="text-sm font-medium text-white/80 mt-1">{session.trackName || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Session</div>
              <div className="text-sm font-medium text-white/80 mt-1 capitalize">{session.sessionType || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Car</div>
              <div className="text-sm font-medium text-white/80 mt-1">{session.carName || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Telemetry</div>
              <div className="text-sm font-medium text-green-400 mt-1 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                60 Hz
              </div>
            </div>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-3 mb-4"><Headphones className="w-5 h-5 text-[#f97316]" /><h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>Your Virtual Crew</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crewMembers.map((m) => (
            <Link key={m.id} to={m.link} className="bg-black/40 backdrop-blur-sm border border-white/10 p-5 hover:border-white/30 transition-all cursor-pointer group block">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 flex items-center justify-center border group-hover:scale-105 transition-transform" style={{ backgroundColor: `${m.color}20`, borderColor: `${m.color}40`, color: m.color }}>{m.icon}</div>
                <div className="flex items-center gap-2">{getStatusIcon(m.status)}<span className="text-[10px] uppercase tracking-wider text-white/40">{m.status}</span></div>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider group-hover:text-white transition-colors" style={{ fontFamily: 'Orbitron, sans-serif' }}>{m.name}</h3>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{m.role}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-white/60 italic">"{m.statusMessage}"</p>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
      {/* iRacing Stats */}
      {profile && profile.licenses && profile.licenses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>iRacing Stats</h2>
            </div>
            <Link to="/driver/idp" className="text-xs text-white/40 hover:text-white/60 uppercase tracking-wider flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {profile.licenses.map((license) => {
              const sr = license.safetyRating ?? 0;
              const promoThreshold = 3.0;
              const srToPromo = Math.max(0, promoThreshold - sr);
              const isCloseToPromo = sr >= 2.5 && sr < promoThreshold;
              const isPromotable = sr >= promoThreshold;
              return (
              <div key={license.discipline} className="bg-black/40 backdrop-blur-sm border border-white/10 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-10 h-10 flex items-center justify-center" style={{ backgroundColor: getLicenseColor(license.licenseClass), clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}>
                  <span className="absolute top-1 right-1.5 text-xs font-bold text-white">{license.licenseClass}</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{license.discipline === 'sportsCar' ? 'Road' : license.discipline === 'dirtOval' ? 'Dirt Oval' : license.discipline === 'dirtRoad' ? 'Dirt Road' : 'Oval'}</div>
                <div className="text-xl font-mono font-bold text-blue-400">{license.iRating ?? '—'}</div>
                <div className="text-[10px] text-white/40">iRating</div>
                <div className="mt-2 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-sm font-mono text-green-400">{license.safetyRating?.toFixed(2) ?? '—'}</span>
                  <span className="text-[10px] text-white/30 ml-1">SR</span>
                </div>
                {/* Promotion threshold indicator */}
                <div className="mt-2 pt-2 border-t border-white/5">
                  {isPromotable ? (
                    <div className="text-[10px] text-green-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Ready for promotion
                    </div>
                  ) : isCloseToPromo ? (
                    <div className="text-[10px] text-yellow-400">
                      +{srToPromo.toFixed(2)} SR to promote
                    </div>
                  ) : (
                    <div className="text-[10px] text-white/30">
                      Promotion at 3.00 SR
                    </div>
                  )}
                </div>
              </div>
            );})}
          </div>
          {profile.iRatingOverall && (
            <div className="mt-3 flex items-center gap-6 px-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/50">Overall iRating: <span className="text-blue-400 font-mono font-bold">{profile.iRatingOverall}</span></span>
              </div>
              {profile.safetyRatingOverall && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white/50">Overall SR: <span className="text-green-400 font-mono font-bold">{profile.safetyRatingOverall.toFixed(2)}</span></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Technique Status - Only show when connected */}
      {behavioralMetrics && isConnected && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm uppercase tracking-[0.15em] text-cyan-400" style={{ fontFamily: 'Orbitron, sans-serif' }}>Live Technique</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-cyan-400/70">
                {behavioralMetrics.confidence >= 80 ? 'High Confidence' : behavioralMetrics.confidence >= 50 ? 'Building' : 'Warming Up'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'bsi', label: 'Braking', value: behavioralMetrics.behavioral.bsi },
              { key: 'tci', label: 'Throttle', value: behavioralMetrics.behavioral.tci },
              { key: 'cpi2', label: 'Cornering', value: behavioralMetrics.behavioral.cpi2 },
              { key: 'rci', label: 'Rhythm', value: behavioralMetrics.behavioral.rci },
            ].map(({ key, label, value }) => {
              const { grade, color } = getBehavioralGrade(value);
              return (
                <div key={key} className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
                  <div className={`text-2xl font-bold font-mono ${color}`}>{grade}</div>
                  <div className="text-[10px] font-mono text-white/30">{Math.round(value)}/100</div>
                </div>
              );
            })}
          </div>
          {behavioralMetrics.coaching.length > 0 && (
            <div className="mt-4 pt-4 border-t border-cyan-500/20">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Live Coaching</div>
              <div className="text-sm text-cyan-300/80">💡 {behavioralMetrics.coaching[0]}</div>
            </div>
          )}
          {/* V1.1: Segment Insights */}
          {behavioralMetrics.segmentInsights && behavioralMetrics.segmentInsights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-cyan-500/20">
              <div className="text-[10px] uppercase tracking-wider text-orange-400/70 mb-2">Where You're Losing Time</div>
              <div className="space-y-2">
                {behavioralMetrics.segmentInsights.slice(0, 2).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-orange-300/80">
                    <span className="text-orange-400">📍</span>
                    <span>
                      <span className="text-white/50 capitalize">{insight.sectionType.replace('_', ' ')} ({Math.round(insight.binStartPct)}%):</span>{' '}
                      {insight.suggestion}
                      <span className="text-white/30 ml-1 text-xs">(-{Math.round(insight.timeDelta)}ms)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/driver/pitwall" className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#f97316]/50 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center group-hover:bg-[#f97316]/30"><Radio className="w-6 h-6 text-[#f97316]" /></div>
            <div className="flex-1"><h3 className="text-sm uppercase tracking-wider font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Live Pitwall</h3><p className="text-xs text-white/50 mt-1">Real-time telemetry when connected</p></div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60" />
          </div>
        </Link>
        <Link to="/driver/voice" className="bg-black/40 backdrop-blur-sm border border-white/10 p-6 hover:border-[#8b5cf6]/50 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center group-hover:bg-[#8b5cf6]/30"><MessageSquare className="w-6 h-6 text-[#8b5cf6]" /></div>
            <div className="flex-1"><h3 className="text-sm uppercase tracking-wider font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Crew Communication</h3><p className="text-xs text-white/50 mt-1">Configure what your crew calls out</p></div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60" />
          </div>
        </Link>
      </div>
    </div>
  );
}
