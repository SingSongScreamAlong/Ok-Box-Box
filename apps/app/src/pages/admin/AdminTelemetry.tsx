import { useEffect, useState, useCallback } from 'react';
import { Radio, RefreshCw, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { fetchTelemetryStreams, type TelemetryStream } from '../../lib/adminService';

const REFRESH_MS = 15_000;

export function AdminTelemetry() {
  const [data, setData] = useState<{ activeRunCount: number; streams: TelemetryStream[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const result = await fetchTelemetryStreams();
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const toggle = (runId: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(runId) ? next.delete(runId) : next.add(runId);
      return next;
    });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-[0.2em] text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Telemetry Streams
          </h1>
          {data && (
            <p className="text-xs text-white/30 mt-1">{data.activeRunCount} active run{data.activeRunCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={load} className="p-2 rounded border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading && !data && <div className="text-xs text-white/30 py-8 text-center">Loading telemetry streams...</div>}
      {error && <div className="text-xs text-red-400 py-4">{error}</div>}

      {data?.streams.length === 0 && (
        <div className="text-xs text-white/20 py-12 text-center border border-white/[0.05] rounded flex flex-col items-center gap-2">
          <Radio className="w-6 h-6 text-white/10" />
          No active telemetry runs
        </div>
      )}

      <div className="space-y-3">
        {data?.streams.map(stream => {
          const w = stream.worker;
          const isOpen = expanded.has(stream.runId);
          return (
            <div key={stream.runId} className="bg-white/[0.03] border border-white/[0.07] rounded overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggle(stream.runId)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-all text-left"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${w ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                  <span className="font-mono text-xs text-white/70 truncate">{stream.runId}</span>
                </div>
                {w && (
                  <div className="flex items-center gap-6 text-xs flex-shrink-0">
                    <div className="text-center">
                      <div className="text-[10px] text-white/30">Lap</div>
                      <div className="font-mono text-white/70">{w.currentLap}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-white/30">Ticks</div>
                      <div className="font-mono text-white/70">{w.totalTicks.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-white/30">FPS</div>
                      <div className={`font-mono ${w.avgFps != null && w.avgFps < 20 ? 'text-red-400' : 'text-white/70'}`}>
                        {w.avgFps != null ? w.avgFps.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-white/30">Latency</div>
                      <div className={`font-mono ${w.avgLatency != null && w.avgLatency > 100 ? 'text-yellow-400' : 'text-white/70'}`}>
                        {w.avgLatency != null ? `${w.avgLatency.toFixed(0)}ms` : '—'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-white/30">Age</div>
                      <div className="font-mono text-white/40">{formatAge(w.durationMs)}</div>
                    </div>
                  </div>
                )}
                {!w && <span className="text-[10px] text-white/20">No worker state</span>}
                {isOpen ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />}
              </button>

              {/* Expanded detail */}
              {isOpen && w && (
                <div className="border-t border-white/[0.06] p-4 space-y-5">

                  {/* Behavioral metrics */}
                  <div>
                    <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3 flex items-center gap-1.5">
                      <Activity className="w-3 h-3" /> Behavioral Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(w.smoothedBehavioral || {}).map(([key, val]) => (
                        <MetricBar key={key} label={key} value={Number(val)} />
                      ))}
                    </div>
                  </div>

                  {/* Pillars */}
                  {w.pillars && Object.keys(w.pillars).length > 0 && (
                    <div>
                      <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Pillar Scores</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(w.pillars).map(([key, val]) => (
                          <MetricBar key={key} label={key} value={Number(val)} max={100} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technique counters */}
                  <div>
                    <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-3">Technique Counters</h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      {[
                        { label: 'Brake Onset', value: w.brakeOnsetCount },
                        { label: 'Brake Smooth', value: w.brakeSmoothCount },
                        { label: 'ABS Ticks', value: w.absTicks },
                        { label: 'Trail Brake', value: w.trailBrakeTicks },
                        { label: 'Throttle Onset', value: w.throttleOnsetCount },
                        { label: 'Steer Corr.', value: w.steerCorrectionCount },
                        { label: 'Over-Rotation', value: w.overRotationEvents, warn: true },
                        { label: 'Under-Rotation', value: w.underRotationEvents, warn: true },
                        { label: 'Rotation Samples', value: w.rotationSampleCount },
                      ].map(({ label, value, warn }) => (
                        <div key={label} className="bg-white/[0.02] rounded p-2 border border-white/[0.05]">
                          <div className="text-[10px] text-white/30 mb-0.5">{label}</div>
                          <div className={`font-mono font-bold ${warn && value > 0 ? 'text-yellow-400' : 'text-white/70'}`}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lap times */}
                  {w.lapTimes && w.lapTimes.length > 0 && (
                    <div>
                      <h3 className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Lap Times</h3>
                      <div className="flex flex-wrap gap-2">
                        {w.lapTimes.map((lt, i) => (
                          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs font-mono">
                            <span className="text-white/30">L{i + 1} </span>
                            <span className="text-white/70">{formatLapTime(lt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {w.warnings && w.warnings.length > 0 && (
                    <div>
                      <h3 className="text-[10px] uppercase tracking-wider text-yellow-400/60 mb-2">Active Warnings</h3>
                      <div className="space-y-1">
                        {w.warnings.map((warn, i) => (
                          <div key={i} className="text-xs text-yellow-400/70 bg-yellow-500/5 border border-yellow-500/10 rounded px-3 py-1.5">
                            {warn}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricBar({ label, value, max = 1 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct > 75 ? 'bg-emerald-500' : pct > 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="bg-white/[0.02] rounded p-2 border border-white/[0.05]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/30 uppercase tracking-wider truncate">{label}</span>
        <span className="text-[10px] font-mono text-white/60">{value.toFixed(2)}</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatLapTime(secs: number): string {
  if (!secs || secs <= 0) return '--:--.---';
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(3);
  return m > 0 ? `${m}:${s.padStart(6, '0')}` : s;
}
