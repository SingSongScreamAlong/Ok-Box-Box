import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, ChevronDown, ChevronUp, TrendingUp, 
  Target, Compass, Lightbulb, Quote, Sparkles
} from 'lucide-react';

interface DriverProfile {
  narrative: string;
  archetype: string;
  archetypeDescription: string;
  currentFocus: {
    title: string;
    why: string;
    cost: string;
    success: string;
  };
  mentalCues: string[];
  evidence: {
    metric: string;
    trend: string;
    detail: string;
  }[];
  progressSignals: {
    area: string;
    status: 'improving' | 'holding' | 'needs_time' | 'regressing';
    note: string;
  }[];
  longTermArc: string[];
}

const mockDriverProfile: DriverProfile = {
  narrative: "You're becoming more consistent, but still pushing too hard when chasing lap time. Your race craft is solid — the next step is trusting your pace instead of forcing it.",
  archetype: "Patient Finisher",
  archetypeDescription: "You tend to gain positions through consistency and smart decisions rather than raw aggression. This is a strength.",
  currentFocus: {
    title: "Corner exit patience",
    why: "You're fast on entry, but giving time back on exit. Being patient here will make the car easier to drive and improve consistency.",
    cost: "You're losing about 0.2s per lap in the final third of corners — that adds up over a stint.",
    success: "When you nail this, the car will feel planted and you'll carry more speed down the straights without trying harder."
  },
  mentalCues: [
    "Exit speed beats entry bravery.",
    "If the wheel is moving, the car is unhappy.",
    "Smooth first, fast later.",
    "Wait for the car to settle before adding throttle."
  ],
  evidence: [
    { metric: "Throttle application point", trend: "Improving", detail: "You're waiting 0.1s longer before full throttle — this is good." },
    { metric: "Corner exit speed", trend: "Holding", detail: "Not yet translating to speed gains, but the foundation is there." },
    { metric: "Lap time consistency", trend: "Improving", detail: "Standard deviation down 15% over last 3 sessions." }
  ],
  progressSignals: [
    { area: "Corner exit patience", status: "improving", note: "Still inconsistent under pressure, but trending right." },
    { area: "Trail braking", status: "holding", note: "Solid technique — maintain current approach." },
    { area: "Traffic management", status: "needs_time", note: "You tense up around other cars. This is normal." },
    { area: "Qualifying pace", status: "improving", note: "Gap to leaders shrinking each session." }
  ],
  longTermArc: [
    "You tend to overdrive when frustrated — awareness is the first step.",
    "Your strength is long-run consistency. Lean into it.",
    "You're learning to finish races, not just laps."
  ]
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'improving': return 'text-emerald-400';
    case 'holding': return 'text-blue-400';
    case 'needs_time': return 'text-amber-400';
    case 'regressing': return 'text-red-400';
    default: return 'text-white/50';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'improving': return 'Improving';
    case 'holding': return 'Holding';
    case 'needs_time': return 'Needs time';
    case 'regressing': return 'Regressing';
    default: return status;
  }
}

export function DriverProgress() {
  const { user } = useAuth();
  const [showEvidence, setShowEvidence] = useState(false);
  const [profile] = useState<DriverProfile>(mockDriverProfile);
  const videoRef = useRef<HTMLVideoElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]/90" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link 
          to="/driver/home" 
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Operations
        </Link>

        {/* Page Title */}
        <div className="mb-12">
          <h1 
            className="text-2xl uppercase tracking-[0.2em] font-semibold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Progress
          </h1>
          <p className="text-sm text-white/40">
            Your growth as a driver
          </p>
        </div>

        {/* 1. Opening Narrative - "How you're doing" */}
        <section className="mb-12">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-2">
                  Hey {driverName}
                </p>
                <p className="text-base text-white/90 leading-relaxed">
                  {profile.narrative}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Driver Archetype */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Compass size={14} className="text-white/40" />
            <h2 className="text-[10px] uppercase tracking-[0.15em] text-white/40">
              Your driving style is trending toward
            </h2>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded-lg p-6">
            <p 
              className="text-lg font-semibold text-[#3b82f6] mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {profile.archetype}
            </p>
            <p className="text-sm text-white/60 leading-relaxed">
              {profile.archetypeDescription}
            </p>
          </div>
        </section>

        {/* 3. Current Focus - ONE thing */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-white/40" />
            <h2 className="text-[10px] uppercase tracking-[0.15em] text-white/40">
              Current Focus
            </h2>
          </div>
          <div className="bg-gradient-to-br from-[#f97316]/10 to-transparent backdrop-blur-xl border border-[#f97316]/30 rounded-lg p-6">
            <p 
              className="text-xl font-semibold text-[#f97316] mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {profile.currentFocus.title}
            </p>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Why it matters</p>
                <p className="text-white/80 leading-relaxed">{profile.currentFocus.why}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">What it's costing you</p>
                <p className="text-white/80 leading-relaxed">{profile.currentFocus.cost}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">What success feels like</p>
                <p className="text-white/80 leading-relaxed">{profile.currentFocus.success}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Mental Cues - "What to think about" */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={14} className="text-white/40" />
            <h2 className="text-[10px] uppercase tracking-[0.15em] text-white/40">
              What to think about
            </h2>
          </div>
          <div className="space-y-3">
            {profile.mentalCues.map((cue, idx) => (
              <div 
                key={idx}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4 flex items-center gap-3"
              >
                <Quote size={14} className="text-white/20 flex-shrink-0" />
                <p className="text-sm text-white/70 italic">"{cue}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Evidence (collapsed by default) */}
        <section className="mb-12">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-white/60 transition-colors mb-4"
          >
            {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Why am I working on this?
          </button>
          
          {showEvidence && (
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-lg p-4 space-y-3">
              {profile.evidence.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/70">{item.metric}</p>
                    <p className="text-xs text-white/40">{item.detail}</p>
                  </div>
                  <span className={`text-xs font-medium ${
                    item.trend === 'Improving' ? 'text-emerald-400' : 
                    item.trend === 'Holding' ? 'text-blue-400' : 'text-amber-400'
                  }`}>
                    {item.trend}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 6. Progress Signals */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-white/40" />
            <h2 className="text-[10px] uppercase tracking-[0.15em] text-white/40">
              Progress Signals
            </h2>
          </div>
          <div className="space-y-2">
            {profile.progressSignals.map((signal, idx) => (
              <div 
                key={idx}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-white/80">{signal.area}</p>
                  <span className={`text-xs font-medium ${getStatusColor(signal.status)}`}>
                    {getStatusLabel(signal.status)}
                  </span>
                </div>
                <p className="text-xs text-white/40">{signal.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Long-Term Arc */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Compass size={14} className="text-white/40" />
            <h2 className="text-[10px] uppercase tracking-[0.15em] text-white/40">
              The bigger picture
            </h2>
          </div>
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-lg p-6 space-y-4">
            {profile.longTermArc.map((insight, idx) => (
              <p key={idx} className="text-sm text-white/60 leading-relaxed">
                {insight}
              </p>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="text-center pt-8 border-t border-white/[0.06]">
          <p className="text-xs text-white/30">
            This page is about understanding your growth — not driving faster.
          </p>
        </div>
      </div>
    </div>
  );
}
