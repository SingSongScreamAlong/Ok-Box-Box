/**
 * RatingTrendGraph
 *
 * Displays iRating trend from real session history.
 * No mock data — renders empty state if no trend points exist.
 */

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { RatingTrendPoint } from '../../lib/driverIntelligence';

interface Props {
  points: RatingTrendPoint[];
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function RatingTrendGraph({ points }: Props) {
  if (points.length < 2) {
    return (
      <div className="border border-white/10 bg-white/[0.02]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-white/20" />
          <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            iRating Trend
          </h3>
        </div>
        <div className="p-4">
          {/* Ghosted placeholder line */}
          <div className="h-28 relative overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" className="opacity-[0.06]">
              <polyline
                points="0,70 50,65 100,60 150,55 200,50 250,48 300,45 350,42 400,40"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <line x1="0" y1="95" x2="400" y2="95" stroke="white" strokeWidth="0.5" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-white/40 font-medium">Trend initializing</p>
                <p className="text-[10px] text-white/25 mt-1">Complete 2 sessions to activate trajectory modeling.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chartData = points.map(p => ({
    date: formatDateLabel(p.date),
    iRating: p.iRating,
  }));

  const ratings = points.map(p => p.iRating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const padding = Math.max(50, Math.round((maxR - minR) * 0.15));
  const yMin = Math.floor((minR - padding) / 50) * 50;
  const yMax = Math.ceil((maxR + padding) / 50) * 50;

  const delta = ratings[ratings.length - 1] - ratings[0];

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400/60" />
          <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            iRating Trend
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-white/40'}`}>
            {delta > 0 ? '+' : ''}{delta} over {points.length} sessions
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}
              />
              <Line
                type="monotone"
                dataKey="iRating"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#3b82f6', stroke: '#1e3a5f', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
