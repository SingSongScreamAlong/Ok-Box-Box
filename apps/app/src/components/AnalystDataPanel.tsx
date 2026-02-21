import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Target, Loader2, Zap, Activity, Award, AlertTriangle, Gauge } from 'lucide-react';
import { fetchTrackAnalysis, TrackAnalysisData } from '../lib/driverService';

interface AnalystDataPanelProps {
  track: {
    id: string;
    track: string;
    series: string;
    date: string;
    time: string;
    laps: number;
    weather?: string;
    position?: number;
    started?: number;
    bestLap?: string;
    consistency?: number;
    incidents?: number;
  };
}

export function AnalystDataPanel({ track }: AnalystDataPanelProps) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<TrackAnalysisData | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTrackAnalysis(track.track).then(data => {
      if (mounted) { setAnalysis(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [track.track]);

  const positionChange = track.started && track.position ? track.started - track.position : 0;
  const isImprovement = positionChange > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
      </div>
    );
  }

  // No data state
  if (!analysis) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white/[0.03] border border-white/[0.12] rounded p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#8b5cf6]">Performance Analysis</span>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {track.track}
          </h2>
          <p className="text-xs text-white/40 mt-2">{track.series}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-8 text-center">
          <BarChart3 className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <h3 className="text-sm text-white/50 mb-1">No Session Data for This Track</h3>
          <p className="text-xs text-white/30 max-w-sm mx-auto">Complete sessions at {track.track} with the relay running to unlock real performance analysis.</p>
        </div>
      </div>
    );
  }

  const s = analysis.stats;

  return (
    <div className="space-y-4 p-4">
      {/* Analyst Header */}
      <div className="bg-white/[0.03] border border-white/[0.12] rounded p-4 shadow-lg shadow-black/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#8b5cf6]">Performance Analysis</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
              <span>{analysis.sessions} sessions analyzed</span>
              <span>{track.series}</span>
            </div>
          </div>
          {track.position ? (
            <div className="text-right">
              <div className={`text-2xl font-bold ${isImprovement ? 'text-green-400' : positionChange < 0 ? 'text-red-400' : 'text-white'}`}>
                P{track.position}
              </div>
              <div className="text-xs text-white/40">
                {isImprovement ? `+${positionChange} positions` : positionChange < 0 ? `${positionChange} positions` : 'No change'}
              </div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">P{s.bestFinish}</div>
              <div className="text-xs text-white/40">best finish</div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <Gauge className="w-3.5 h-3.5 text-[#8b5cf6] mx-auto mb-1" />
          <div className="text-base font-mono font-bold text-white/80">P{s.avgPacePercentile}%</div>
          <div className="text-[10px] text-white/30">Avg Pace</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <Activity className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-mono font-bold text-white/80">{(s.avgStdDevMs / 1000).toFixed(2)}s</div>
          <div className="text-[10px] text-white/30">Lap Std Dev</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <AlertTriangle className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className={`text-base font-mono font-bold ${s.avgIncidents > 2 ? 'text-red-400' : 'text-emerald-400'}`}>
            {s.avgIncidents}x
          </div>
          <div className="text-[10px] text-white/30">Avg Incidents</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          {s.avgPositionsGained >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />}
          <div className={`text-base font-mono font-bold ${s.avgPositionsGained >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {s.avgPositionsGained > 0 ? '+' : ''}{s.avgPositionsGained}
          </div>
          <div className="text-[10px] text-white/30">Avg Pos Gained</div>
        </div>
      </div>

      {/* Track Record Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center">
          <div className="text-lg font-mono font-bold text-white/80">P{s.avgFinish}</div>
          <div className="text-[10px] text-white/30">Avg Finish</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center">
          <div className={`text-lg font-mono font-bold ${s.totalIRatingChange > 0 ? 'text-emerald-400' : s.totalIRatingChange < 0 ? 'text-red-400' : 'text-white/80'}`}>
            {s.totalIRatingChange > 0 ? '+' : ''}{s.totalIRatingChange}
          </div>
          <div className="text-[10px] text-white/30">Net iRating</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center">
          <div className="text-lg font-mono font-bold text-emerald-400">{s.cleanRaces}/{analysis.sessions}</div>
          <div className="text-[10px] text-white/30">Clean Races</div>
        </div>
      </div>

      {/* Trends */}
      {analysis.sessions >= 4 && (
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" />
            Performance Trends
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-sm font-bold ${analysis.trends.paceImproving ? 'text-emerald-400' : 'text-white/60'}`}>
                P{analysis.trends.recentPace}%
              </div>
              <div className="text-[10px] text-white/30">Recent Pace</div>
              <div className="text-[9px] text-white/20 mt-0.5">was P{analysis.trends.olderPace}%</div>
            </div>
            <div className="text-center">
              <div className={`text-sm font-bold ${analysis.trends.incidentsDecreasing ? 'text-emerald-400' : 'text-white/60'}`}>
                {analysis.trends.recentIncidents}x
              </div>
              <div className="text-[10px] text-white/30">Recent Inc</div>
              <div className="text-[9px] text-white/20 mt-0.5">was {analysis.trends.olderIncidents}x</div>
            </div>
            <div className="text-center">
              <div className={`text-sm font-bold ${analysis.trends.consistencyImproving ? 'text-emerald-400' : 'text-white/60'}`}>
                {analysis.trends.consistencyImproving ? 'Improving' : 'Stable'}
              </div>
              <div className="text-[10px] text-white/30">Consistency</div>
            </div>
          </div>
        </div>
      )}

      {/* Data-Driven Insights */}
      {analysis.insights.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-[#8b5cf6]" />
            Key Insights
          </h3>
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                <span className="text-[#8b5cf6] mt-0.5 flex-shrink-0">●</span>
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column: Improvements + Strengths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Target className="w-3 h-3 text-red-400" />
            Areas to Improve
          </h3>
          <ul className="space-y-2">
            {analysis.improvements.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-red-400/50 mt-0.5 flex-shrink-0">▸</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Award className="w-3 h-3 text-emerald-400" />
            Your Strengths
          </h3>
          <ul className="space-y-2">
            {analysis.strengths.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-emerald-400/50 mt-0.5 flex-shrink-0">▸</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Session History */}
      {analysis.history.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <BarChart3 className="w-3 h-3" />
            Session History at {track.track}
          </h3>
          <div className="space-y-1">
            {analysis.history.map((session, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-14">{session.date}</span>
                  <span className={`text-xs font-mono ${session.finish < session.started ? 'text-green-400' : session.finish > session.started ? 'text-red-400' : 'text-white/60'}`}>
                    P{session.finish}
                  </span>
                  <span className="text-[10px] text-white/30">from P{session.started}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-white/40">P{session.pacePercentile}%</span>
                  <span className={session.incidents > 2 ? 'text-red-400' : 'text-white/40'}>{session.incidents}x</span>
                  <span className={`font-mono ${session.iRatingChange > 0 ? 'text-emerald-400' : session.iRatingChange < 0 ? 'text-red-400' : 'text-white/30'}`}>
                    {session.iRatingChange > 0 ? '+' : ''}{session.iRatingChange}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/40">{analysis.sessions} total sessions</span>
            <span className="text-white/60">Best: <span className="text-green-400">P{s.bestFinish}</span> | Avg: P{s.avgFinish}</span>
          </div>
        </div>
      )}
    </div>
  );
}
