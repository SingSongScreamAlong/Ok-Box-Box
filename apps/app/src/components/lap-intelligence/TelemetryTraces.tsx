/**
 * TelemetryTraces
 * Stacked speed / throttle / brake charts plotted against lap distance.
 * Compares driver lap vs reference lap side-by-side.
 */

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { LapData } from './types';

interface TelemetryTracesProps {
  driverLap: LapData;
  referenceLap: LapData | null;
  className?: string;
}

function resampleTrace(
  lap: LapData,
  field: 'speed' | 'throttle' | 'brake',
  resolution: number
): number[] {
  const samples = lap.samples;
  if (samples.length === 0) return new Array(resolution + 1).fill(0);

  const values: number[] = [];
  for (let i = 0; i <= resolution; i++) {
    const dist = i / resolution;
    // Find surrounding samples
    let lo = 0;
    let hi = samples.length - 1;
    for (let j = 1; j < samples.length; j++) {
      if (samples[j].distance >= dist) {
        lo = j - 1;
        hi = j;
        break;
      }
    }
    const prev = samples[lo];
    const curr = samples[hi];
    const range = curr.distance - prev.distance || 1;
    const t = (dist - prev.distance) / range;
    values.push(prev[field] + t * (curr[field] - prev[field]));
  }
  return values;
}

const RESOLUTION = 200;

const traceConfigs = [
  {
    key: 'speed' as const,
    label: 'Speed',
    unit: 'mph',
    driverColor: '#06b6d4',
    refColor: '#64748b',
    domain: undefined as [number, number] | undefined,
  },
  {
    key: 'throttle' as const,
    label: 'Throttle',
    unit: '%',
    driverColor: '#22c55e',
    refColor: '#64748b',
    domain: [0, 1] as [number, number],
  },
  {
    key: 'brake' as const,
    label: 'Brake',
    unit: '%',
    driverColor: '#ef4444',
    refColor: '#64748b',
    domain: [0, 1] as [number, number],
  },
];

export function TelemetryTraces({ driverLap, referenceLap, className = '' }: TelemetryTracesProps) {
  const traceData = useMemo(() => {
    const result: Record<string, number>[] = [];
    for (let i = 0; i <= RESOLUTION; i++) {
      result.push({ dist: Math.round((i / RESOLUTION) * 100) });
    }

    for (const cfg of traceConfigs) {
      const driverValues = resampleTrace(driverLap, cfg.key, RESOLUTION);
      const refValues = referenceLap ? resampleTrace(referenceLap, cfg.key, RESOLUTION) : null;
      for (let i = 0; i <= RESOLUTION; i++) {
        const scale = cfg.key === 'throttle' || cfg.key === 'brake' ? 100 : 1;
        result[i][`driver_${cfg.key}`] = Number((driverValues[i] * scale).toFixed(1));
        if (refValues) {
          result[i][`ref_${cfg.key}`] = Number((refValues[i] * scale).toFixed(1));
        }
      }
    }
    return result;
  }, [driverLap, referenceLap]);

  return (
    <div className={`space-y-3 ${className}`}>
      {traceConfigs.map(cfg => {
        const driverKey = `driver_${cfg.key}`;
        const refKey = `ref_${cfg.key}`;
        const isPercent = cfg.key === 'throttle' || cfg.key === 'brake';
        const yDomain = isPercent ? [0, 100] as [number, number] : undefined;

        return (
          <div key={cfg.key}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase text-white/40 tracking-wider font-semibold">{cfg.label}</div>
              <div className="text-[9px] text-white/30">{cfg.unit}</div>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={traceData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="dist"
                    tick={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4,
                      fontSize: 10,
                    }}
                    labelFormatter={(v) => `${v}%`}
                  />
                  {referenceLap && (
                    <Line
                      type="monotone"
                      dataKey={refKey}
                      stroke={cfg.refColor}
                      strokeWidth={1}
                      dot={false}
                      strokeDasharray="4 2"
                      isAnimationActive={false}
                      name="Reference"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey={driverKey}
                    stroke={cfg.driverColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    name="Driver"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
