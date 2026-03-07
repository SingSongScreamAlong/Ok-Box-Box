/**
 * DeltaTrace
 * Recharts area chart showing cumulative time delta vs lap distance.
 * Green = gaining on reference, Red = losing to reference.
 */

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import type { DeltaPoint } from './types';

interface DeltaTraceProps {
  data: DeltaPoint[];
  className?: string;
}

export function DeltaTrace({ data, className = '' }: DeltaTraceProps) {
  const chartData = useMemo(() =>
    data.map(p => ({
      dist: Math.round(p.distance * 100),
      delta: Number(p.delta.toFixed(3)),
    })),
  [data]);

  const maxAbs = useMemo(() => {
    const max = Math.max(...chartData.map(d => Math.abs(d.delta)), 0.1);
    return Math.ceil(max * 10) / 10;
  }, [chartData]);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase text-white/40 tracking-wider font-semibold">Delta Trace</div>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="text-green-400">■ Gaining</span>
          <span className="text-red-400">■ Losing</span>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="deltaGain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="deltaLoss" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="dist"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              interval={49}
            />
            <YAxis
              domain={[-maxAbs, maxAbs]}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}s`}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.85)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                fontSize: 11,
              }}
              labelFormatter={(v) => `${v}% distance`}
              formatter={(value) => [
                `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(3)}s`,
                'Delta',
              ]}
            />
            <Area
              type="monotone"
              dataKey="delta"
              stroke="#22c55e"
              fill="url(#deltaGain)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#22c55e' }}
              baseValue={0}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
