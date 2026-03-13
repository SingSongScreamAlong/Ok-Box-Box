/**
 * IDPSummaryCard — Compact driver intelligence card for Home page
 * 
 * Surfaces archetype, top engineer opinion, and skill trajectory
 * from the IDP page onto the command center. Uses existing /api/v1/drivers/me/idp endpoint.
 * 
 * Phase 0: Compact summary card
 * TODO Phase 1: Add telemetry-informed archetype confidence
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Brain, TrendingUp, TrendingDown, Minus,
  ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface IDPIdentity {
  archetype: string;
  skillTrajectory: string;
  confidence?: number;
}

interface EngineerOpinion {
  // API returns: domain, summary, detail, sentiment, suggestedAction, priority, confidence
  domain: string;
  summary: string;
  detail: string;
  suggestedAction: string;
  priority: number;
  confidence: number;
}

interface IDPSummary {
  memory: { sessionsAnalyzed: number } | null;
  identity: IDPIdentity | null;
  opinions: EngineerOpinion[];
}

const ARCHETYPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  calculated_racer:  { label: 'Calculated Racer',  color: 'text-blue-400',   desc: 'Methodical, data-driven, consistent' },
  aggressive_hunter: { label: 'Aggressive Hunter',  color: 'text-red-400',    desc: 'Pushes limits, hunts positions' },
  consistent_grinder:{ label: 'Consistent Grinder', color: 'text-green-400',  desc: 'Reliable, steady improvement' },
  raw_talent:        { label: 'Raw Talent',          color: 'text-purple-400', desc: 'Fast but volatile' },
  developing:        { label: 'Developing',          color: 'text-white/40',   desc: 'Building driver profile' },
};

const TRAJECTORY_INFO: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  ascending:   { label: 'Ascending',   icon: TrendingUp,   color: 'text-green-400' },
  plateaued:   { label: 'Plateaued',   icon: Minus,        color: 'text-yellow-400' },
  declining:   { label: 'Declining',   icon: TrendingDown,  color: 'text-red-400' },
  developing:  { label: 'Developing',  icon: TrendingUp,   color: 'text-white/30' },
};

export function IDPSummaryCard() {
  const { session } = useAuth();
  const [data, setData] = useState<IDPSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return; }

    fetch(`${API_BASE}/api/v1/drivers/me/idp`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json) setData(json); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  if (loading) return null;
  if (!data?.memory || data.memory.sessionsAnalyzed === 0) return null;

  const archetype = data.identity?.archetype || 'developing';
  const archetypeInfo = ARCHETYPE_LABELS[archetype] || ARCHETYPE_LABELS.developing;
  const trajectory = data.identity?.skillTrajectory || 'developing';
  const trajInfo = TRAJECTORY_INFO[trajectory] || TRAJECTORY_INFO.developing;
  const TrajIcon = trajInfo.icon;

  // Top priority opinion
  const topOpinion = data.opinions?.length > 0
    ? [...data.opinions].sort((a, b) => b.priority - a.priority)[0]
    : null;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-400/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Driver Intelligence</h2>
        </div>
        <Link to="/driver/idp" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
          Full Profile <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-5">
        {/* Archetype + Trajectory row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">Archetype</div>
            <div className={`text-sm font-semibold uppercase tracking-wider ${archetypeInfo.color}`} style={ORBITRON}>
              {archetypeInfo.label}
            </div>
            <div className="text-[9px] text-white/20 mt-0.5">{archetypeInfo.desc}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-white/25 uppercase tracking-wider mb-1">Trajectory</div>
            <div className={`flex items-center gap-1.5 justify-end ${trajInfo.color}`}>
              <TrajIcon className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider" style={ORBITRON}>{trajInfo.label}</span>
            </div>
            <div className="text-[9px] text-white/20 mt-0.5">{data.memory.sessionsAnalyzed} sessions analyzed</div>
          </div>
        </div>

        {/* Top engineer opinion */}
        {topOpinion && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
                <span className="text-[8px] text-[#f97316]">ENG</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-white/25">Top Priority</span>
              {topOpinion.confidence > 0 && (
                <span className="text-[8px] text-white/15 ml-auto">{Math.round(topOpinion.confidence * 100)}% conf</span>
              )}
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
              <span className="text-white/60 font-medium">{topOpinion.domain}:</span> {topOpinion.summary}
            </p>
            {topOpinion.suggestedAction && (
              <p className="text-[10px] text-[#f97316]/60 mt-1 italic">→ {topOpinion.suggestedAction}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
