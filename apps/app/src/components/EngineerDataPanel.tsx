import { useState, useEffect } from 'react';
import { Flag, Gauge, Wrench, ThermometerSun, Loader2, Zap, Timer, TrendingUp, TrendingDown, Target, Award, AlertTriangle } from 'lucide-react';
import { fetchTrackAnalysis, TrackAnalysisData } from '../lib/driverService';

interface EngineerDataPanelProps {
  track: {
    id: string;
    track: string;
    series: string;
    date: string;
    time: string;
    laps: number;
    weather?: string;
  };
}

export function EngineerDataPanel({ track }: EngineerDataPanelProps) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Engineer Header */}
      <div className="bg-white/[0.03] border border-white/[0.12] rounded p-4 shadow-lg shadow-black/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-3.5 h-3.5 text-[#f97316]" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#f97316]">Engineer's Briefing</span>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {track.track}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
              <span>{track.series}</span>
              {analysis && <span>{analysis.sessions} previous sessions</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">{track.date}</div>
            <div className="text-sm text-white/70 font-medium">{track.time}</div>
          </div>
        </div>
      </div>

      {/* Race Info */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <Flag className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">{track.laps}</div>
          <div className="text-[10px] text-white/30">Laps</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <Timer className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">~{Math.round(track.laps * 1.8)}</div>
          <div className="text-[10px] text-white/30">Minutes</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <ThermometerSun className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">{track.weather || 'Clear'}</div>
          <div className="text-[10px] text-white/30">Conditions</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-3 text-center shadow-md shadow-black/20">
          <Gauge className="w-3.5 h-3.5 text-white/30 mx-auto mb-1" />
          <div className="text-base font-bold text-white/80">{analysis ? `P${analysis.stats.bestFinish}` : '--'}</div>
          <div className="text-[10px] text-white/30">Best Finish</div>
        </div>
      </div>

      {/* Your Track Record - only if we have data */}
      {analysis ? (
        <>
          {/* Performance at this track */}
          <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Gauge className="w-3 h-3 text-[#f97316]" />
              Your Performance Here
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-white/80">P{analysis.stats.avgFinish}</div>
                <div className="text-[10px] text-white/30">Avg Finish</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-white/80">P{analysis.stats.avgPacePercentile}%</div>
                <div className="text-[10px] text-white/30">Avg Pace</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-mono font-bold ${analysis.stats.avgIncidents > 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {analysis.stats.avgIncidents}x
                </div>
                <div className="text-[10px] text-white/30">Avg Incidents</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-mono font-bold ${analysis.stats.totalIRatingChange > 0 ? 'text-emerald-400' : analysis.stats.totalIRatingChange < 0 ? 'text-red-400' : 'text-white/80'}`}>
                  {analysis.stats.totalIRatingChange > 0 ? '+' : ''}{analysis.stats.totalIRatingChange}
                </div>
                <div className="text-[10px] text-white/30">Net iRating</div>
              </div>
            </div>
          </div>

          {/* Strategy Recommendations */}
          <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3 text-[#f97316]" />
              Race Strategy
            </h3>
            <ul className="space-y-2">
              {analysis.strategy.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                  <span className="text-[#f97316]/60 mt-0.5 flex-shrink-0">▸</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>

          {/* Two Column: Improvements + Strengths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Watch Out For
              </h3>
              <ul className="space-y-2">
                {analysis.improvements.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="text-amber-400/50 mt-0.5 flex-shrink-0">▸</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                <Award className="w-3 h-3 text-emerald-400" />
                Lean Into
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

          {/* Recent Results */}
          {analysis.history.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                <Target className="w-3 h-3" />
                Recent Results at {track.track}
              </h3>
              <div className="space-y-1">
                {analysis.history.slice(0, 5).map((session, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40 w-14">{session.date}</span>
                      <span className={`text-xs font-mono ${session.finish < session.started ? 'text-green-400' : session.finish > session.started ? 'text-red-400' : 'text-white/60'}`}>
                        P{session.finish}
                      </span>
                      <span className="text-[10px] text-white/30">from P{session.started}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className={session.incidents > 2 ? 'text-red-400' : 'text-white/40'}>{session.incidents}x</span>
                      <span className={`font-mono ${session.iRatingChange > 0 ? 'text-emerald-400' : session.iRatingChange < 0 ? 'text-red-400' : 'text-white/30'}`}>
                        {session.iRatingChange > 0 ? '+' : ''}{session.iRatingChange} iR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends */}
          {analysis.sessions >= 4 && (
            <div className="bg-white/[0.02] border border-white/[0.10] rounded p-4 shadow-lg shadow-black/20">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
                {analysis.trends.paceImproving ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-white/30" />}
                Trend
              </h3>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-white/40">Pace: </span>
                  <span className={analysis.trends.paceImproving ? 'text-emerald-400' : 'text-white/60'}>
                    P{analysis.trends.recentPace}% {analysis.trends.paceImproving ? '↑' : ''} <span className="text-white/30">(was P{analysis.trends.olderPace}%)</span>
                  </span>
                </div>
                <div>
                  <span className="text-white/40">Incidents: </span>
                  <span className={analysis.trends.incidentsDecreasing ? 'text-emerald-400' : 'text-white/60'}>
                    {analysis.trends.recentIncidents}x {analysis.trends.incidentsDecreasing ? '↓' : ''} <span className="text-white/30">(was {analysis.trends.olderIncidents}x)</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* No track data state */
        <div className="bg-white/[0.02] border border-white/[0.10] rounded p-8 text-center">
          <Wrench className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <h3 className="text-sm text-white/50 mb-1">No Previous Data for This Track</h3>
          <p className="text-xs text-white/30 max-w-sm mx-auto">
            Complete sessions at {track.track} with the relay running to unlock personalized strategy and setup recommendations.
          </p>
          <div className="mt-4 p-3 bg-white/[0.03] rounded text-left">
            <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-2">General Race Prep</h4>
            <ul className="space-y-1.5 text-xs text-white/50">
              <li className="flex items-start gap-2"><span className="text-[#f97316]/50">▸</span>Run 10-15 practice laps to learn the track</li>
              <li className="flex items-start gap-2"><span className="text-[#f97316]/50">▸</span>Focus on clean laps before chasing pace</li>
              <li className="flex items-start gap-2"><span className="text-[#f97316]/50">▸</span>Note braking points and reference markers</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
