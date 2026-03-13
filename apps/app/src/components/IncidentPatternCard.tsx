import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp, Minus, BarChart3 } from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

interface IncidentAnalysis {
  // Overall
  avgIncidents: number;
  totalSessions: number;
  cleanRaces: number;       // 0 incidents
  cleanPct: number;
  highIncidentRaces: number; // 4+ incidents

  // Trend (recent 10 vs older 10)
  recentAvg: number;
  olderAvg: number;
  trend: 'improving' | 'worsening' | 'stable';

  // By session type
  officialAvg: number;
  unofficialAvg: number;
  practiceAvg: number;

  // Worst tracks
  worstTracks: { trackName: string; avgInc: number; sessions: number }[];

  // SR correlation
  avgSrDeltaClean: number;  // avg SR change in clean races
  avgSrDeltaDirty: number;  // avg SR change in high-incident races
  srImpactMessage: string;

  // Incident distribution
  distribution: { bucket: string; count: number; pct: number }[];
}

function analyzeIncidentPatterns(sessions: DriverSessionSummary[]): IncidentAnalysis | null {
  const withInc = sessions.filter(s => s.incidents != null);
  if (withInc.length < 5) return null;

  const totalSessions = withInc.length;
  const avgIncidents = withInc.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / totalSessions;
  const cleanRaces = withInc.filter(s => (s.incidents ?? 0) === 0).length;
  const cleanPct = (cleanRaces / totalSessions) * 100;
  const highIncidentRaces = withInc.filter(s => (s.incidents ?? 0) >= 4).length;

  // Trend: recent 10 vs older 10
  const sorted = [...withInc].sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  const recent = sorted.slice(0, 10);
  const older = sorted.slice(10, 20);
  const recentAvg = recent.length > 0 ? recent.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / recent.length : 0;
  const olderAvg = older.length > 0 ? older.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / older.length : 0;
  const trend: 'improving' | 'worsening' | 'stable' =
    older.length < 3 ? 'stable' :
    recentAvg < olderAvg - 0.3 ? 'improving' :
    recentAvg > olderAvg + 0.3 ? 'worsening' : 'stable';

  // By session type
  const official = withInc.filter(s => s.official === true || s.sessionType === 'official_race');
  const unofficial = withInc.filter(s => s.sessionType === 'unofficial_race');
  const practice = withInc.filter(s => s.sessionType === 'practice' || s.sessionType === 'qualifying');
  const avgOf = (arr: DriverSessionSummary[]) => arr.length > 0 ? arr.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / arr.length : 0;
  const officialAvg = avgOf(official);
  const unofficialAvg = avgOf(unofficial);
  const practiceAvg = avgOf(practice);

  // Worst tracks (min 2 sessions)
  const trackMap = new Map<string, { total: number; count: number }>();
  for (const s of withInc) {
    const t = trackMap.get(s.trackName) || { total: 0, count: 0 };
    t.total += s.incidents ?? 0;
    t.count++;
    trackMap.set(s.trackName, t);
  }
  const worstTracks = [...trackMap.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([trackName, v]) => ({ trackName, avgInc: v.total / v.count, sessions: v.count }))
    .sort((a, b) => b.avgInc - a.avgInc)
    .slice(0, 5);

  // SR correlation
  const cleanSR = withInc.filter(s => (s.incidents ?? 0) === 0 && s.srDelta != null);
  const dirtySR = withInc.filter(s => (s.incidents ?? 0) >= 4 && s.srDelta != null);
  const avgSrDeltaClean = cleanSR.length > 0 ? cleanSR.reduce((sum, s) => sum + (s.srDelta ?? 0), 0) / cleanSR.length : 0;
  const avgSrDeltaDirty = dirtySR.length > 0 ? dirtySR.reduce((sum, s) => sum + (s.srDelta ?? 0), 0) / dirtySR.length : 0;

  let srImpactMessage = '';
  if (cleanSR.length > 0 && dirtySR.length > 0) {
    const diff = avgSrDeltaClean - avgSrDeltaDirty;
    srImpactMessage = `Clean races gain ${avgSrDeltaClean > 0 ? '+' : ''}${avgSrDeltaClean.toFixed(3)} SR vs ${avgSrDeltaDirty > 0 ? '+' : ''}${avgSrDeltaDirty.toFixed(3)} SR in high-incident races (${diff > 0 ? '+' : ''}${diff.toFixed(3)} difference)`;
  }

  // Distribution buckets
  const buckets = [
    { label: '0', min: 0, max: 0 },
    { label: '1-2', min: 1, max: 2 },
    { label: '3-4', min: 3, max: 4 },
    { label: '5-6', min: 5, max: 6 },
    { label: '7+', min: 7, max: 999 },
  ];
  const distribution = buckets.map(b => {
    const count = withInc.filter(s => {
      const inc = s.incidents ?? 0;
      return inc >= b.min && inc <= b.max;
    }).length;
    return { bucket: b.label, count, pct: (count / totalSessions) * 100 };
  });

  return {
    avgIncidents,
    totalSessions,
    cleanRaces,
    cleanPct,
    highIncidentRaces,
    recentAvg,
    olderAvg,
    trend,
    officialAvg,
    unofficialAvg,
    practiceAvg,
    worstTracks,
    avgSrDeltaClean,
    avgSrDeltaDirty,
    srImpactMessage,
    distribution,
  };
}

const ORBITRON: React.CSSProperties = { fontFamily: "'Orbitron', sans-serif" };

export function IncidentPatternCard({ sessions }: { sessions: DriverSessionSummary[] }) {
  const analysis = useMemo(() => analyzeIncidentPatterns(sessions), [sessions]);
  const [showDetails, setShowDetails] = useState(false);

  if (!analysis) return null;

  const TrendIcon = analysis.trend === 'improving' ? TrendingDown : analysis.trend === 'worsening' ? TrendingUp : Minus;
  const trendColor = analysis.trend === 'improving' ? 'text-green-400' : analysis.trend === 'worsening' ? 'text-red-400' : 'text-white/40';
  const trendLabel = analysis.trend === 'improving' ? 'Improving' : analysis.trend === 'worsening' ? 'Worsening' : 'Stable';

  const maxBarPct = Math.max(...analysis.distribution.map(d => d.pct), 1);

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Incident Patterns</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" /> {trendLabel}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Key metrics row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className={`text-xl font-mono font-bold ${
              analysis.avgIncidents > 4 ? 'text-red-400' :
              analysis.avgIncidents > 2 ? 'text-amber-400' : 'text-green-400'
            }`}>
              {analysis.avgIncidents.toFixed(1)}
            </div>
            <div className="text-[8px] text-white/25 uppercase">Avg/Race</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-mono font-bold text-green-400/70">{analysis.cleanPct.toFixed(0)}%</div>
            <div className="text-[8px] text-white/25 uppercase">Clean Rate</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-mono font-bold text-white/70">{analysis.cleanRaces}</div>
            <div className="text-[8px] text-white/25 uppercase">Clean Races</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-mono font-bold ${analysis.highIncidentRaces > 3 ? 'text-red-400/70' : 'text-white/50'}`}>
              {analysis.highIncidentRaces}
            </div>
            <div className="text-[8px] text-white/25 uppercase">4+ Inc</div>
          </div>
        </div>

        {/* Incident distribution bars */}
        <div className="pt-3 border-t border-white/[0.04]">
          <div className="text-[9px] text-white/25 uppercase mb-2">Distribution</div>
          <div className="flex items-end gap-1 h-12">
            {analysis.distribution.map(d => (
              <div key={d.bucket} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex justify-center">
                  <div
                    className={`w-full max-w-[28px] rounded-t transition-all ${
                      d.bucket === '0' ? 'bg-green-500/60' :
                      d.bucket === '1-2' ? 'bg-green-500/30' :
                      d.bucket === '3-4' ? 'bg-amber-500/40' :
                      d.bucket === '5-6' ? 'bg-red-500/40' : 'bg-red-500/60'
                    }`}
                    style={{ height: `${Math.max(2, (d.pct / maxBarPct) * 48)}px` }}
                  />
                </div>
                <span className="text-[7px] text-white/20">{d.bucket}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend comparison */}
        {analysis.olderAvg > 0 && (
          <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[9px] text-white/25 uppercase">Trend (last 10 vs prior 10)</span>
            <span className={`text-[10px] font-mono ${trendColor}`}>
              {analysis.recentAvg.toFixed(1)} vs {analysis.olderAvg.toFixed(1)} inc/race
            </span>
          </div>
        )}

        {/* SR Impact */}
        {analysis.srImpactMessage && (
          <div className="pt-3 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/40 leading-relaxed">{analysis.srImpactMessage}</p>
          </div>
        )}

        {/* Expand for details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full pt-3 border-t border-white/[0.04] text-[10px] text-white/30 hover:text-white/50 transition-colors flex items-center justify-center gap-1"
        >
          {showDetails ? 'Hide details' : 'Track breakdown & session types'}
          <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>

        {showDetails && (
          <div className="space-y-4">
            {/* Worst tracks */}
            {analysis.worstTracks.length > 0 && (
              <div>
                <div className="text-[9px] text-white/25 uppercase mb-2 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Highest incident tracks
                </div>
                <div className="space-y-1.5">
                  {analysis.worstTracks.map(t => (
                    <div key={t.trackName} className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50 truncate flex-1 mr-2">{t.trackName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${t.avgInc > 4 ? 'bg-red-500' : t.avgInc > 2 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, (t.avgInc / 8) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-mono ${t.avgInc > 4 ? 'text-red-400/60' : 'text-white/30'}`}>
                          {t.avgInc.toFixed(1)}x
                        </span>
                        <span className="text-[8px] text-white/15">{t.sessions}r</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By session type */}
            <div>
              <div className="text-[9px] text-white/25 uppercase mb-2">By session type</div>
              <div className="grid grid-cols-3 gap-3">
                {analysis.officialAvg > 0 && (
                  <div className="text-center p-2 bg-white/[0.02] rounded">
                    <div className="text-sm font-mono font-bold text-white/60">{analysis.officialAvg.toFixed(1)}</div>
                    <div className="text-[8px] text-white/25">Official</div>
                  </div>
                )}
                {analysis.unofficialAvg > 0 && (
                  <div className="text-center p-2 bg-white/[0.02] rounded">
                    <div className="text-sm font-mono font-bold text-white/60">{analysis.unofficialAvg.toFixed(1)}</div>
                    <div className="text-[8px] text-white/25">Unofficial</div>
                  </div>
                )}
                {analysis.practiceAvg > 0 && (
                  <div className="text-center p-2 bg-white/[0.02] rounded">
                    <div className="text-sm font-mono font-bold text-white/60">{analysis.practiceAvg.toFixed(1)}</div>
                    <div className="text-[8px] text-white/25">Practice</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
