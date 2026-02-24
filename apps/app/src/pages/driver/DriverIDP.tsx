import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Brain, Target, TrendingUp, TrendingDown, Minus,
  Zap, AlertTriangle, CheckCircle, Clock, Activity,
  ChevronRight, Info, Loader2, RefreshCw, User, Sparkles,
  MessageSquare, Flag, Star
} from 'lucide-react';

// Types matching the IDP system
interface DriverMemory {
  brakingStyle: 'early' | 'late' | 'trail' | 'threshold' | 'unknown';
  brakingConsistency: number | null;
  throttleStyle: 'aggressive' | 'smooth' | 'hesitant' | 'unknown';
  tractionManagement: number | null;
  cornerEntryStyle: 'aggressive' | 'conservative' | 'variable' | null;
  overtakingStyle: 'aggressive' | 'patient' | 'opportunistic' | null;
  currentConfidence: number | null;
  confidenceTrend: 'rising' | 'falling' | 'stable' | 'volatile' | null;
  postIncidentTiltRisk: number | null;
  fatigueOnsetLap: number | null;
  lateRaceDegradation: number | null;
  sessionLengthSweetSpot: number | null;
  incidentProneness: number | null;
  recoverySpeed: 'fast' | 'slow' | 'unknown' | null;
  sessionsAnalyzed: number;
  lapsAnalyzed: number;
  memoryConfidence: number;
}

interface EngineerOpinion {
  id: string;
  domain: 'pace' | 'consistency' | 'racecraft' | 'mental' | 'technique' | 'development';
  summary: string;
  detail: string | null;
  sentiment: 'positive' | 'neutral' | 'concern' | 'critical';
  suggestedAction: string | null;
  priority: number;
  confidence: number | null;
  evidenceSummary: string | null;
  createdAt: string | null;
}

interface DriverIdentity {
  archetype: 'calculated_racer' | 'aggressive_hunter' | 'consistent_grinder' | 'raw_talent' | 'developing' | null;
  archetypeConfidence: number | null;
  archetypeEvidence: string | null;
  skillTrajectory: 'ascending' | 'plateaued' | 'breaking_through' | 'declining' | 'developing';
  trajectoryEvidence: string | null;
  readyForLongerRaces: boolean;
  readyForHigherSplits: boolean;
  readyForNewDiscipline: boolean;
  currentChapter: string | null;
  nextMilestone: string | null;
}

interface IDPData {
  memory: DriverMemory | null;
  opinions: EngineerOpinion[];
  identity: DriverIdentity | null;
}

interface DriverReport {
  generatedAt: string;
  summary: {
    totalRaces: number;
    totalLaps: number;
    totalIncidents: number;
    avgIncidentsPerRace: number;
    avgFinishPosition: number;
    avgPositionsGained: number;
    cleanRacePercentage: number;
  };
  problemAreas: {
    track: string;
    incidents: number;
    races: number;
    avgIncidentsPerRace: number;
    recommendation: string;
  }[];
  incidentPatterns: {
    pattern: string;
    frequency: number;
    description: string;
    fix: string;
  }[];
  strengths: {
    area: string;
    evidence: string;
  }[];
  improvementPlan: {
    priority: number;
    focus: string;
    why: string;
    how: string;
    expectedImpact: string;
  }[];
  recentTrend: {
    direction: 'improving' | 'declining' | 'stable';
    description: string;
  };
}

// Archetype display info
const ARCHETYPE_INFO: Record<string, { label: string; description: string; icon: typeof Brain; color: string }> = {
  calculated_racer: {
    label: 'Calculated Racer',
    description: 'Methodical, consistent, low-risk approach. You race smart and minimize mistakes.',
    icon: Brain,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  aggressive_hunter: {
    label: 'Aggressive Hunter',
    description: 'Bold, attacking style. High-risk, high-reward approach to racing.',
    icon: Zap,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  consistent_grinder: {
    label: 'Consistent Grinder',
    description: 'Steady improvement through repetition. Reliable and predictable.',
    icon: Target,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  raw_talent: {
    label: 'Raw Talent',
    description: 'Natural speed with room to refine racecraft. High ceiling.',
    icon: Star,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  developing: {
    label: 'Developing',
    description: 'Building your foundation. More data needed to identify your style.',
    icon: Activity,
    color: 'text-white/60 bg-white/5 border-white/20',
  },
};

const TRAJECTORY_INFO: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  ascending: { label: 'Ascending', icon: TrendingUp, color: 'text-emerald-400' },
  plateaued: { label: 'Plateaued', icon: Minus, color: 'text-amber-400' },
  breaking_through: { label: 'Breaking Through', icon: Sparkles, color: 'text-purple-400' },
  declining: { label: 'Declining', icon: TrendingDown, color: 'text-red-400' },
  developing: { label: 'Developing', icon: Activity, color: 'text-white/50' },
};

const SENTIMENT_STYLES: Record<string, { bg: string; border: string; icon: typeof CheckCircle }> = {
  positive: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle },
  neutral: { bg: 'bg-white/[0.03]', border: 'border-white/[0.08]', icon: Info },
  concern: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle },
};

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatStyle(value: string | null | undefined): string {
  if (!value || value === 'unknown') return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

function ConfidenceMeter({ value, label }: { value: number | null | undefined; label: string }) {
  // Handle null, undefined, and NaN
  const isValid = value !== null && value !== undefined && !isNaN(value);
  const pct = isValid ? Math.round(value * 100) : 0;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/50 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono text-white/70">{isValid ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${isValid ? pct : 0}%` }} />
      </div>
    </div>
  );
}

export function DriverIDP() {
  const { session } = useAuth();
  const [data, setData] = useState<IDPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('identity');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedOpinion, setExpandedOpinion] = useState<string | null>(null);
  const [report, setReport] = useState<DriverReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch IDP data
  useEffect(() => {
    if (session?.access_token) {
      fetchIDPData();
      fetchReport();
    }
  }, [session?.access_token]);

  const fetchReport = async () => {
    if (!session?.access_token) return;
    setLoadingReport(true);
    try {
      const response = await fetch('/api/v1/drivers/me/report', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const json = await response.json();
        setReport(json);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchIDPData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/drivers/me/idp', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // No IDP data yet - that's okay
          setData({ memory: null, opinions: [], identity: null });
        } else {
          throw new Error('Failed to fetch profile data');
        }
      } else {
        const json = await response.json();
        setData(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const syncHistory = async () => {
    if (!session?.access_token) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/v1/drivers/me/sync-history', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      const json = await response.json();
      
      if (!response.ok) {
        setSyncResult({ success: false, message: json.error || 'Sync failed' });
      } else {
        setSyncResult({ success: true, message: json.message });
        // Refresh IDP data after sync
        await fetchIDPData();
      }
    } catch (err) {
      setSyncResult({ success: false, message: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-[#0e0e0e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
          <span className="text-white/50 text-sm">Loading driver profile...</span>
        </div>
      </div>
    );
  }

  const hasData = data?.memory && data.memory.sessionsAnalyzed > 0;
  const archetype = data?.identity?.archetype || 'developing';
  const archetypeInfo = ARCHETYPE_INFO[archetype] || ARCHETYPE_INFO.developing;
  const ArchetypeIcon = archetypeInfo.icon;
  const trajectory = data?.identity?.skillTrajectory || 'developing';
  const trajectoryInfo = TRAJECTORY_INFO[trajectory] || TRAJECTORY_INFO.developing;
  const TrajectoryIcon = trajectoryInfo.icon;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e0e0e] via-[#121212] to-[#0e0e0e]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Driver Profile
              </h1>
              <p className="text-xs text-white/40 mt-1">How the AI understands you as a driver</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={syncHistory}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#f97316]/10 hover:bg-[#f97316]/20 border border-[#f97316]/30 rounded text-xs text-[#f97316] hover:text-[#fb923c] transition-colors disabled:opacity-50"
              >
                {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                {syncing ? 'Syncing...' : 'Sync Race History'}
              </button>
              <button
                onClick={async () => {
                  if (!session?.access_token) return;
                  setSyncing(true);
                  setSyncResult(null);
                  try {
                    const response = await fetch('/api/v1/drivers/me/sync-history-full', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${session.access_token}` },
                    });
                    const json = await response.json();
                    if (!response.ok) {
                      setSyncResult({ success: false, message: json.error || 'Full sync failed' });
                    } else {
                      setSyncResult({ success: true, message: json.message });
                      await fetchIDPData();
                      fetchReport();
                    }
                  } catch (err) {
                    setSyncResult({ success: false, message: err instanceof Error ? err.message : 'Full sync failed' });
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                title="Re-fetch ALL races from your iRacing history (slower but complete)"
              >
                {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Full Sync
              </button>
              <button
                onClick={async () => {
                  if (!session?.access_token) return;
                  if (!confirm('This will reset your driver memory and recalculate from your race data. Continue?')) return;
                  setSyncing(true);
                  setSyncResult(null);
                  try {
                    const response = await fetch('/api/v1/drivers/me/reset-memory', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${session.access_token}` },
                    });
                    const json = await response.json();
                    if (!response.ok) {
                      setSyncResult({ success: false, message: json.error || 'Reset failed' });
                    } else {
                      setSyncResult({ success: true, message: json.message });
                      await fetchIDPData();
                      fetchReport();
                    }
                  } catch (err) {
                    setSyncResult({ success: false, message: err instanceof Error ? err.message : 'Reset failed' });
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                title="Reset memory and recalculate from actual race data (fixes corrupted stats)"
              >
                {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Reset
              </button>
              <button
                onClick={fetchIDPData}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded text-xs text-white/60 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {syncResult && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${syncResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {syncResult.message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {!hasData ? (
          /* Empty State */
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-12 text-center">
            <User className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h2 className="text-lg text-white/60 mb-2">No Profile Data Yet</h2>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-6">
              Complete sessions with the relay running to build your driver profile. 
              The AI learns your tendencies, strengths, and areas for improvement over time.
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-white/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <span className="font-mono">3+</span>
                </div>
                <span>Sessions needed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <span className="font-mono">3+</span>
                </div>
                <span>Laps per session</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identity Card */}
            <div className={`${archetypeInfo.color} backdrop-blur-xl border rounded-lg overflow-hidden`}>
              <button
                onClick={() => setExpandedSection(expandedSection === 'identity' ? null : 'identity')}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-black/20 flex items-center justify-center">
                    <ArchetypeIcon className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Your Driver Archetype</div>
                    <h2 className="text-xl font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {archetypeInfo.label}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <TrajectoryIcon className={`w-4 h-4 ${trajectoryInfo.color}`} />
                      <span className={`text-sm font-medium ${trajectoryInfo.color}`}>{trajectoryInfo.label}</span>
                    </div>
                    <div className="text-[10px] opacity-50 mt-0.5">Skill Trajectory</div>
                  </div>
                  <ChevronRight className={`w-5 h-5 opacity-40 transition-transform ${expandedSection === 'identity' ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {expandedSection === 'identity' && (
                <div className="px-6 pb-6 border-t border-black/10">
                  <p className="text-sm opacity-80 mt-4 mb-4">{archetypeInfo.description}</p>
                  
                  {data.identity?.archetypeEvidence && (
                    <div className="p-3 bg-black/10 rounded-lg mb-4">
                      <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Evidence</div>
                      <p className="text-xs opacity-70">{data.identity.archetypeEvidence}</p>
                    </div>
                  )}

                  {/* Readiness Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {data.identity?.readyForLongerRaces && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px]">
                        <Clock className="w-3 h-3" />
                        Ready for longer races
                      </div>
                    )}
                    {data.identity?.readyForHigherSplits && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-[10px]">
                        <TrendingUp className="w-3 h-3" />
                        Ready for higher splits
                      </div>
                    )}
                    {data.identity?.readyForNewDiscipline && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-[10px]">
                        <Flag className="w-3 h-3" />
                        Ready for new discipline
                      </div>
                    )}
                  </div>

                  {/* Narrative */}
                  {(data.identity?.currentChapter || data.identity?.nextMilestone) && (
                    <div className="grid grid-cols-2 gap-4">
                      {data.identity.currentChapter && (
                        <div className="p-3 bg-black/10 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Current Chapter</div>
                          <p className="text-sm font-medium">{data.identity.currentChapter}</p>
                        </div>
                      )}
                      {data.identity.nextMilestone && (
                        <div className="p-3 bg-black/10 rounded-lg">
                          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">Next Milestone</div>
                          <p className="text-sm font-medium">{data.identity.nextMilestone}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Engineer Opinions */}
            {data.opinions.length > 0 && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'opinions' ? null : 'opinions')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <div className="text-left">
                      <h3 className="text-sm font-medium text-white">Engineer's Assessment</h3>
                      <p className="text-[10px] text-white/40">{data.opinions.length} active opinion{data.opinions.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${expandedSection === 'opinions' ? 'rotate-90' : ''}`} />
                </button>

                {expandedSection === 'opinions' && (
                  <div className="px-6 pb-6 border-t border-white/[0.06] space-y-3 pt-4">
                    {data.opinions.sort((a, b) => b.priority - a.priority).map(opinion => {
                      const style = SENTIMENT_STYLES[opinion.sentiment] || SENTIMENT_STYLES.neutral;
                      const OpinionIcon = style.icon;
                      const isExpanded = expandedOpinion === opinion.id;
                      return (
                        <div key={opinion.id} className={`${style.bg} border ${style.border} rounded-lg overflow-hidden`}>
                          <button
                            onClick={() => setExpandedOpinion(isExpanded ? null : opinion.id)}
                            className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <OpinionIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] uppercase tracking-wider text-white/40">{opinion.domain}</span>
                                  {opinion.priority >= 8 && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">High Priority</span>
                                  )}
                                  <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ml-auto ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                <p className="text-sm text-white/90">{opinion.summary}</p>
                              </div>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 ml-7 space-y-3">
                              {/* Why - The reasoning */}
                              {opinion.detail && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Why
                                  </div>
                                  <p className="text-xs text-white/70">{opinion.detail}</p>
                                </div>
                              )}
                              
                              {/* How - Evidence summary */}
                              {opinion.evidenceSummary && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    How We Know
                                  </div>
                                  <p className="text-xs text-white/70">{opinion.evidenceSummary}</p>
                                </div>
                              )}
                              
                              {/* When - Created date */}
                              {opinion.createdAt && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    When
                                  </div>
                                  <p className="text-xs text-white/70">
                                    Assessment from {new Date(opinion.createdAt).toLocaleDateString('en-US', { 
                                      month: 'short', day: 'numeric', year: 'numeric' 
                                    })}
                                  </p>
                                </div>
                              )}
                              
                              {/* Confidence */}
                              {opinion.confidence != null && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Confidence
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-white/[0.06] rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-500 rounded-full" 
                                        style={{ width: `${(opinion.confidence || 0) * 100}%` }} 
                                      />
                                    </div>
                                    <span className="text-xs text-white/50">{Math.round((opinion.confidence || 0) * 100)}%</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Action */}
                              {opinion.suggestedAction && (
                                <div className="p-3 bg-black/20 rounded-lg">
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    Suggested Action
                                  </div>
                                  <p className="text-xs text-white/80">{opinion.suggestedAction}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Driver Memory */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'memory' ? null : 'memory')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-white">Learned Tendencies</h3>
                    <p className="text-[10px] text-white/40">
                      {data.memory?.sessionsAnalyzed || 0} sessions • {data.memory?.lapsAnalyzed || 0} laps analyzed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-mono text-white/70">{formatPercent(data.memory?.memoryConfidence || 0)}</div>
                    <div className="text-[10px] text-white/40">Confidence</div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${expandedSection === 'memory' ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {expandedSection === 'memory' && data.memory && (
                <div className="px-6 pb-6 border-t border-white/[0.06] pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {/* Driving Style */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                        <Activity className="w-3 h-3" />
                        Driving Style
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Braking</span>
                          <span className="text-white/80 font-medium">{formatStyle(data.memory.brakingStyle)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Throttle</span>
                          <span className="text-white/80 font-medium">{formatStyle(data.memory.throttleStyle)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Corner Entry</span>
                          <span className="text-white/80 font-medium">{formatStyle(data.memory.cornerEntryStyle)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Overtaking</span>
                          <span className="text-white/80 font-medium">{formatStyle(data.memory.overtakingStyle)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Consistency Metrics */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                        <Target className="w-3 h-3" />
                        Consistency
                      </h4>
                      <div className="space-y-3">
                        <ConfidenceMeter value={data.memory.brakingConsistency} label="Braking" />
                        <ConfidenceMeter value={data.memory.tractionManagement} label="Traction" />
                        <ConfidenceMeter value={data.memory.incidentProneness} label="Clean Racing" />
                      </div>
                    </div>

                    {/* Mental State */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                        <Brain className="w-3 h-3" />
                        Mental State
                      </h4>
                      <div className="space-y-3">
                        <ConfidenceMeter value={data.memory.currentConfidence} label="Confidence" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Trend</span>
                          <span className={`font-medium ${
                            data.memory.confidenceTrend === 'rising' ? 'text-emerald-400' :
                            data.memory.confidenceTrend === 'falling' ? 'text-red-400' :
                            'text-white/60'
                          }`}>
                            {formatStyle(data.memory.confidenceTrend)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Tilt Risk</span>
                          <span className={`font-medium ${
                            (data.memory.postIncidentTiltRisk || 0) > 0.6 ? 'text-red-400' :
                            (data.memory.postIncidentTiltRisk || 0) > 0.3 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {formatPercent(data.memory.postIncidentTiltRisk)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Endurance */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Endurance
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Fatigue Onset</span>
                          <span className="text-white/80 font-medium">
                            {data.memory.fatigueOnsetLap ? `Lap ${data.memory.fatigueOnsetLap}` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Late Race Drop</span>
                          <span className="text-white/80 font-medium">{formatPercent(data.memory.lateRaceDegradation)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Sweet Spot</span>
                          <span className="text-white/80 font-medium">
                            {data.memory.sessionLengthSweetSpot ? `${data.memory.sessionLengthSweetSpot} min` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">Recovery</span>
                          <span className="text-white/80 font-medium">{formatStyle(data.memory.recoverySpeed)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Quality Notice */}
                  <div className="mt-6 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-white/40">
                      <strong className="text-white/50">Memory Confidence: {formatPercent(data.memory.memoryConfidence)}</strong>
                      <p className="mt-1">
                        {data.memory.memoryConfidence < 0.3 
                          ? 'Early patterns are emerging. Complete more sessions for accurate insights.'
                          : data.memory.memoryConfidence < 0.6
                            ? 'Good data foundation. Patterns are becoming reliable.'
                            : data.memory.memoryConfidence < 0.8
                              ? 'Strong confidence in your profile. The AI knows your tendencies well.'
                              : 'High confidence. Your driver profile is well-established.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Driver Improvement Report */}
            {report && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'report' ? null : 'report')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-[#f97316]" />
                    <div className="text-left">
                      <h3 className="text-sm font-medium text-white">Improvement Report</h3>
                      <p className="text-[10px] text-white/40">
                        {report.summary.totalRaces} races analyzed • {report.improvementPlan.length} action items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs px-2 py-1 rounded ${
                      report.recentTrend.direction === 'improving' ? 'bg-emerald-500/20 text-emerald-400' :
                      report.recentTrend.direction === 'declining' ? 'bg-red-500/20 text-red-400' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {report.recentTrend.direction === 'improving' ? '↑ Improving' :
                       report.recentTrend.direction === 'declining' ? '↓ Declining' : '→ Stable'}
                    </div>
                    <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${expandedSection === 'report' ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {expandedSection === 'report' && (
                  <div className="px-6 pb-6 border-t border-white/[0.06] pt-4 space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-white/[0.03] rounded-lg">
                        <div className="text-2xl font-mono text-white">{report.summary.avgIncidentsPerRace}</div>
                        <div className="text-[10px] text-white/40">Avg Incidents/Race</div>
                      </div>
                      <div className="p-3 bg-white/[0.03] rounded-lg">
                        <div className="text-2xl font-mono text-white">{report.summary.cleanRacePercentage}%</div>
                        <div className="text-[10px] text-white/40">Clean Races</div>
                      </div>
                      <div className="p-3 bg-white/[0.03] rounded-lg">
                        <div className="text-2xl font-mono text-white">P{report.summary.avgFinishPosition.toFixed(1)}</div>
                        <div className="text-[10px] text-white/40">Avg Finish</div>
                      </div>
                      <div className="p-3 bg-white/[0.03] rounded-lg">
                        <div className={`text-2xl font-mono ${report.summary.avgPositionsGained >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {report.summary.avgPositionsGained >= 0 ? '+' : ''}{report.summary.avgPositionsGained}
                        </div>
                        <div className="text-[10px] text-white/40">Avg Positions Gained</div>
                      </div>
                    </div>

                    {/* Recent Trend */}
                    <div className={`p-4 rounded-lg border ${
                      report.recentTrend.direction === 'improving' ? 'bg-emerald-500/10 border-emerald-500/30' :
                      report.recentTrend.direction === 'declining' ? 'bg-red-500/10 border-red-500/30' :
                      'bg-white/[0.03] border-white/[0.08]'
                    }`}>
                      <div className="text-xs font-medium text-white/80 mb-1">Recent Trend</div>
                      <p className="text-sm text-white/70">{report.recentTrend.description}</p>
                    </div>

                    {/* Problem Tracks */}
                    {report.problemAreas.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Problem Tracks (Higher Than Average Incidents)
                        </h4>
                        <div className="space-y-2">
                          {report.problemAreas.map((area, i) => (
                            <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white">{area.track}</span>
                                <span className="text-xs text-amber-400">{area.avgIncidentsPerRace} inc/race ({area.races} races)</span>
                              </div>
                              <p className="text-xs text-white/60">{area.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Incident Patterns */}
                    {report.incidentPatterns.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          Patterns Identified
                        </h4>
                        <div className="space-y-3">
                          {report.incidentPatterns.map((pattern, i) => (
                            <div key={i} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-white">{pattern.pattern}</span>
                                <span className="text-xs text-red-400">{pattern.frequency}% of races</span>
                              </div>
                              <p className="text-xs text-white/60 mb-3">{pattern.description}</p>
                              <div className="p-2 bg-black/20 rounded">
                                <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">How to Fix</div>
                                <p className="text-xs text-white/80">{pattern.fix}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {report.strengths.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          Your Strengths
                        </h4>
                        <div className="space-y-2">
                          {report.strengths.map((strength, i) => (
                            <div key={i} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <div className="text-sm font-medium text-emerald-400 mb-1">{strength.area}</div>
                              <p className="text-xs text-white/70">{strength.evidence}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Plan */}
                    {report.improvementPlan.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                          <Target className="w-3 h-3 text-[#f97316]" />
                          Your Improvement Plan
                        </h4>
                        <div className="space-y-4">
                          {report.improvementPlan.map((item, i) => (
                            <div key={i} className="p-4 bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-6 rounded-full bg-[#f97316] text-black text-xs font-bold flex items-center justify-center">
                                  {item.priority}
                                </span>
                                <span className="text-sm font-medium text-white">{item.focus}</span>
                              </div>
                              <div className="space-y-3 ml-8">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Why This Matters</div>
                                  <p className="text-xs text-white/70">{item.why}</p>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">How To Improve</div>
                                  <p className="text-xs text-white/80 whitespace-pre-line">{item.how}</p>
                                </div>
                                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Expected Impact</div>
                                  <p className="text-xs text-white/80">{item.expectedImpact}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {loadingReport && !report && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white/40 mr-2" />
                <span className="text-sm text-white/40">Generating improvement report...</span>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#f97316]" />
                <h3 className="text-xs uppercase tracking-wider text-white/50">How This Works</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white/40">
                <div>
                  <div className="text-white/60 font-medium mb-1">Learning</div>
                  <p>Every session with the relay running teaches the AI about your driving style, tendencies, and mental patterns.</p>
                </div>
                <div>
                  <div className="text-white/60 font-medium mb-1">Aggregation</div>
                  <p>Recent sessions are weighted more heavily. Your profile evolves as you improve, using rolling averages over 20 sessions.</p>
                </div>
                <div>
                  <div className="text-white/60 font-medium mb-1">Personalization</div>
                  <p>Your AI crew uses this profile to give advice tailored to your specific strengths and weaknesses.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
