import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlaybackState, Sample, TrackLayout } from './types';

interface Props {
  playback: PlaybackState;
  samplesByDriver?: Record<string, Sample[]>;
}

// Simple placeholder track and samples until wired to backend
const demoTrack: TrackLayout = {
  id: 'demo',
  name: 'Demo Circuit',
  polyline: Array.from({ length: 360 }, (_, i) => {
    const a = (i / 360) * Math.PI * 2;
    const r = 300 + Math.sin(a * 3) * 40;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }),
  scale: 1,
  rotation: 0,
  offset: { x: 0, y: 0 },
};

const colors = ['#4FC3F7', '#FF8A65', '#AED581', '#BA68C8', '#FFD54F'];

const TacviewCanvas: React.FC<Props> = ({ playback, samplesByDriver }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [t, setT] = useState(0);

  const drivers = useMemo(() => 5, []);

  // Resize handler
  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const el = entries[0]?.contentRect;
      if (el) setSize({ w: el.width, h: el.height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Playback clock
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playback.playing) {
        setT(prev => prev + dt * playback.rate);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playback.playing, playback.rate]);

  // Generate simple circular motion samples for demo (used when no real data is provided)
  const demoSamples: Sample[][] = useMemo(() => {
    const arr: Sample[][] = [];
    for (let d = 0; d < drivers; d++) {
      const s: Sample[] = [];
      for (let i = 0; i < 1000; i++) {
        const tt = i / 30; // 30 Hz
        const a = tt * 0.6 + (d * Math.PI * 2) / drivers;
        const r = 300 + Math.sin(tt * 0.9 + d) * 35;
        s.push({
          tsMs: Math.floor(tt * 1000),
          driverId: `D${d + 1}`,
          pos: { x: Math.cos(a) * r, y: Math.sin(a) * r },
          speed: 60 + (Math.sin(tt * 1.5 + d) + 1) * 80,
          heading: a + Math.PI / 2,
          throttle: (Math.sin(tt * 1.2 + d) + 1) / 2,
          brake: (Math.sin(tt * 0.7 + d) + 1) / 2 * 0.2,
        });
      }
      arr.push(s);
    }
    return arr;
  }, [drivers]);

  // Compute current indices per driver based on t (demo path)
  const demoIdx = Math.floor((t * 30) % 1000); // 30Hz

  // Compute bounds from real samples (if provided) to fit view
  const sampleBounds = useMemo(() => {
    if (!samplesByDriver) return null as null | { minX: number; maxX: number; minY: number; maxY: number };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const driverId in samplesByDriver) {
      const arr = samplesByDriver[driverId];
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        const x = s.pos ? s.pos.x : (s as any).x ?? 0;
        const y = s.pos ? s.pos.y : (s as any).y ?? 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
    return { minX, maxX, minY, maxY };
  }, [samplesByDriver]);

  // Fit transform to center and scale
  const { w, h } = size;
  const padding = 40;
  let cx = w / 2;
  let cy = h / 2;
  let s = Math.min((w - padding * 2) / 700, (h - padding * 2) / 700);

  // If we have real data and computed bounds, recompute scale and center
  if (samplesByDriver && sampleBounds) {
    const width = Math.max(1, sampleBounds.maxX - sampleBounds.minX);
    const height = Math.max(1, sampleBounds.maxY - sampleBounds.minY);
    s = Math.min((w - padding * 2) / width, (h - padding * 2) / height);
    const midX = (sampleBounds.minX + sampleBounds.maxX) / 2;
    const midY = (sampleBounds.minY + sampleBounds.maxY) / 2;
    cx = w / 2 - midX * s;
    cy = h / 2 - midY * s;
  }

  const toScreen = (x: number, y: number) => ({ x: cx + x * s, y: cy + y * s });

  const trackPath = useMemo(() => {
    const pts = demoTrack.polyline.map(p => toScreen(p.x, p.y));
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [size.w, size.h]);

  // Helper: given sorted samples, find index at or before tsMs
  const findIndexAtTime = (arr: Sample[], tsMs: number) => {
    let lo = 0, hi = arr.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].tsMs <= tsMs) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  };

  // Get current positions for real data if provided
  const livePositions = useMemo(() => {
    if (!samplesByDriver) return null;
    const ts = playback.tMs;
    const out: { driverId: string; x: number; y: number; heading?: number }[] = [];
    for (const [driverId, arr] of Object.entries(samplesByDriver)) {
      if (!arr.length) continue;
      const i = findIndexAtTime(arr, ts);
      const s = arr[Math.min(i, arr.length - 1)];
      const x = s.pos ? s.pos.x : (s as any).x ?? 0;
      const y = s.pos ? s.pos.y : (s as any).y ?? 0;
      out.push({ driverId, x, y, heading: s.heading });
    }
    return out;
  }, [samplesByDriver, playback.tMs]);

  // removed duplicate bounds computation (fitFromSamples) in favor of sampleBounds used above

  return (
    <div ref={containerRef} className="tacview-canvas">
      <svg width={w} height={h}>
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2a33" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={w} height={h} fill="url(#grid)" />

        {/* Track outline (demo only) */}
        {!samplesByDriver && (
          <>
            <path d={trackPath} fill="none" stroke="#2E7D32" strokeWidth={3} opacity={0.6} />
            <path d={trackPath} fill="none" stroke="#A5D6A7" strokeWidth={1} opacity={0.4} />
          </>
        )}

        {/* Cars */}
        {samplesByDriver && livePositions
          ? (
            livePositions.map((p, idx) => {
              const color = colors[idx % colors.length];
              const sp = toScreen(p.x, p.y);
              const a = p.heading ?? 0;
              const tri = 10;
              const p1 = toScreen(p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 12);
              const p2 = toScreen(p.x + Math.cos(a + 2.5) * tri, p.y + Math.sin(a + 2.5) * tri);
              const p3 = toScreen(p.x + Math.cos(a - 2.5) * tri, p.y + Math.sin(a - 2.5) * tri);
              return (
                <g key={p.driverId}>
                  <circle cx={sp.x} cy={sp.y} r={3} fill={color} />
                  <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={color} opacity={0.9} />
                </g>
              );
            })
          ) : (
            demoSamples.map((samps, d) => {
              const p = samps[demoIdx].pos;
              const sp = toScreen(p.x, p.y);
              const color = colors[d % colors.length];
              const a = samps[demoIdx].heading ?? 0;
              const size = 10;
              const p1 = toScreen(p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 12);
              const p2 = toScreen(p.x + Math.cos(a + 2.5) * size, p.y + Math.sin(a + 2.5) * size);
              const p3 = toScreen(p.x + Math.cos(a - 2.5) * size, p.y + Math.sin(a - 2.5) * size);
              return (
                <g key={d}>
                  <circle cx={sp.x} cy={sp.y} r={3} fill={color} />
                  <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={color} opacity={0.9} />
                </g>
              );
            })
          )}
      </svg>
    </div>
  );
};

export default TacviewCanvas;
