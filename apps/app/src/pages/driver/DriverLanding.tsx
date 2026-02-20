/**
 * DriverLanding — Driver Career Dashboard v1.0
 *
 * ZERO-MOCK ENFORCEMENT:
 * Every value displayed comes from a real API response or is hidden behind
 * an explicit empty-state. No hard-coded sample data.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────┐
 * │  DRIVER IDENTITY STRIP (name, license, iR, CPI, relay) │
 * ├──────────────────────────────┬──────────────────────────┤
 * │  CAREER PROGRESSION (left)  │  RACING NETWORK (right)  │
 * │  - CPI Ring                 │  - Notifications         │
 * │  - Progress Bars            │  - Messages              │
 * │  - Driver Level + XP        │  - Invites               │
 * │  - Unlock Indicators        │                          │
 * ├──────────────────────────────┴──────────────────────────┤
 * │  RECENT PERFORMANCE (horizontal race cards)             │
 * └─────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverData } from '../../hooks/useDriverData';
import { Link } from 'react-router-dom';
import {
  Wifi, WifiOff, Radio, ChevronRight,
  Play, Download, Gauge, Shield,
  Target, ArrowUpRight, ArrowDownRight, Minus,
  Lock, Unlock, Bell, MessageSquare, Users,
  Trophy, AlertTriangle, TrendingDown, Zap
} from 'lucide-react';
import {
  getLicenseColor,
  fetchPerformanceSnapshot,
  PerformanceSnapshot,
  DriverSessionSummary,
} from '../../lib/driverService';
import {
  computePerformanceDirection,
  computeConsistency,
  type ConsistencyMetrics,
  type CPITier,
  type FocusFlag,
} from '../../lib/driverIntelligence';

// ─── Constants ───────────────────────────────────────────────────────────────

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

const CPI_TIER_STYLES: Record<CPITier, { stroke: string; text: string; bg: string }> = {
  elite:        { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10' },
  competitive:  { stroke: '#3b82f6', text: 'text-blue-400',  bg: 'bg-blue-500/10' },
  inconsistent: { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  at_risk:      { stroke: '#ef4444', text: 'text-red-400',   bg: 'bg-red-500/10' },
};

const FOCUS_ICONS: Record<FocusFlag, typeof Target> = {
  incident_management: AlertTriangle,
  racecraft_traffic: Zap,
  plateau_detection: TrendingDown,
  strong_momentum: ArrowUpRight,
  needs_data: Target,
};

const FOCUS_COLORS: Record<FocusFlag, string> = {
  incident_management: 'text-red-400',
  racecraft_traffic: 'text-yellow-400',
  plateau_detection: 'text-orange-400',
  strong_momentum: 'text-green-400',
  needs_data: 'text-white/30',
};

const FOCUS_CONFIDENCE: Record<FocusFlag, string> = {
  incident_management: 'High',
  racecraft_traffic: 'Moderate',
  plateau_detection: 'Moderate',
  strong_momentum: 'High',
  needs_data: '—',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDriverLevel(sessionCount: number): { level: number; xp: number; xpToNext: number; title: string } {
  // XP: 100 per session. Levels: 1=0, 2=300, 3=800, 4=1500, 5=2500, 6=4000, 7=6000, 8=9000, 9=13000, 10=18000
  const thresholds = [0, 300, 800, 1500, 2500, 4000, 6000, 9000, 13000, 18000];
  const titles = ['Rookie', 'Cadet', 'Prospect', 'Contender', 'Competitor', 'Veteran', 'Expert', 'Elite', 'Master', 'Legend'];
  const xp = sessionCount * 100;
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) { level = i + 1; break; }
  }
  const currentThreshold = thresholds[level - 1] || 0;
  const nextThreshold = thresholds[level] || thresholds[thresholds.length - 1] + 5000;
  return {
    level,
    xp,
    xpToNext: nextThreshold - currentThreshold,
    title: titles[Math.min(level - 1, titles.length - 1)],
  };
}

function computeProgressBars(snapshot: PerformanceSnapshot | null) {
  if (!snapshot) return null;
  // Consistency: inverse of finish position variance (lower avg finish = better)
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (snapshot.avg_finish - 1) * 4)));
  // Incident Discipline: inverse of incidents (lower = better)
  const incidentScore = Math.max(0, Math.min(100, Math.round(100 - (snapshot.avg_incidents) * 12)));
  // Pace Stability: how close avg finish is to avg start (smaller gap = better)
  const gap = Math.abs(snapshot.avg_finish - snapshot.avg_start);
  const paceScore = Math.max(0, Math.min(100, Math.round(100 - gap * 10)));
  return { consistencyScore, incidentScore, paceScore };
}

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ─── CPI Ring (reusable) ─────────────────────────────────────────────────────

function CPIRing({ value, tier, size = 120 }: { value: number; tier: CPITier; size?: number }) {
  const style = CPI_TIER_STYLES[tier];
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={style.stroke} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${style.text}`} style={ORBITRON}>
          {value}
        </span>
        <span className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">CPI</span>
      </div>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/50 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-mono text-white/60">{value}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Unlock Indicator ────────────────────────────────────────────────────────

function UnlockIndicator({ label, unlocked, requirement }: { label: string; unlocked: boolean; requirement: string }) {
  return (
    <div className={`flex items-center gap-2.5 py-2 px-3 rounded border ${
      unlocked ? 'border-white/10 bg-white/[0.03]' : 'border-white/[0.04] bg-white/[0.01]'
    }`}>
      {unlocked ? (
        <Unlock className="w-3.5 h-3.5 text-green-400 shrink-0" />
      ) : (
        <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
      )}
      <div className="min-w-0">
        <span className={`text-[11px] font-medium ${unlocked ? 'text-white/70' : 'text-white/30'}`}>{label}</span>
        {!unlocked && <p className="text-[9px] text-white/20 mt-0.5">{requirement}</p>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DRIVER IDENTITY STRIP
// ═════════════════════════════════════════════════════════════════════════════

function DriverIdentityStrip({ displayName, profile, consistency, relayStatus, isLive }: {
  displayName: string;
  profile: ReturnType<typeof useDriverData>['profile'];
  consistency: ConsistencyMetrics | null;
  relayStatus: string;
  isLive: boolean;
}) {
  const primaryLicense = profile?.licenses?.[0];
  const iRating = primaryLicense?.iRating;

  return (
    <div className="border border-white/10 bg-white/[0.02] px-5 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Name + License */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider" style={ORBITRON}>
              {displayName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {primaryLicense && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: getLicenseColor(primaryLicense.licenseClass) }}
                  >
                    {primaryLicense.licenseClass}
                  </div>
                  <span className="text-[11px] text-white/40">
                    {primaryLicense.discipline === 'sportsCar' ? 'Road' : primaryLicense.discipline}
                  </span>
                </div>
              )}
              {primaryLicense && (
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-400/50" />
                  <span className="text-[11px] font-mono text-green-400/60">{primaryLicense.safetyRating?.toFixed(2) ?? '—'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Key metrics */}
        <div className="flex items-center gap-6">
          {iRating != null && (
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-blue-400" style={ORBITRON}>{iRating}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">iRating</div>
            </div>
          )}
          {consistency && (
            <div className="text-center">
              <div className={`text-lg font-bold font-mono ${CPI_TIER_STYLES[consistency.tier].text}`} style={ORBITRON}>
                {consistency.index}
              </div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">CPI</div>
            </div>
          )}
        </div>

        {/* Right: Relay pill + Live CTA */}
        <div className="flex items-center gap-3">
          {/* Relay status pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${
            isLive ? 'bg-green-500/20 text-green-400' :
            relayStatus === 'connected' ? 'bg-blue-500/15 text-blue-400' :
            relayStatus === 'connecting' ? 'bg-yellow-500/15 text-yellow-400' :
            'bg-white/5 text-white/30'
          }`}>
            {isLive ? (
              <Radio className="w-3 h-3 animate-pulse" />
            ) : relayStatus === 'connected' ? (
              <Wifi className="w-3 h-3" />
            ) : relayStatus === 'connecting' ? (
              <Wifi className="w-3 h-3 animate-pulse" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {isLive ? 'Live' : relayStatus === 'connected' ? 'Connected' : relayStatus === 'connecting' ? 'Connecting' : 'Offline'}
          </div>

          {isLive && (
            <Link
              to="/driver/cockpit"
              className="px-3 py-1.5 bg-green-500 text-black font-bold text-[11px] uppercase tracking-wider hover:bg-green-400 flex items-center gap-1.5 rounded"
            >
              <Play className="w-3.5 h-3.5" /> Cockpit
            </Link>
          )}
          {relayStatus === 'disconnected' && (
            <Link
              to="/download"
              className="px-3 py-1.5 border border-white/15 text-white/40 text-[11px] uppercase tracking-wider hover:bg-white/5 hover:text-white/60 flex items-center gap-1.5 rounded"
            >
              <Download className="w-3.5 h-3.5" /> Relay
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRAINING MODE (Onboarding — consolidated)
// ═════════════════════════════════════════════════════════════════════════════

function TrainingModeCard({ sessionCount }: { sessionCount: number }) {
  const sessionsNeeded = 3;
  const progress = Math.min(sessionCount, sessionsNeeded);
  const pct = Math.round((progress / sessionsNeeded) * 100);

  return (
    <div className="border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
          <Target className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400" style={ORBITRON}>Training Mode</h3>
          <p className="text-[10px] text-white/30">Complete {sessionsNeeded} sessions to activate full analysis</p>
        </div>
      </div>

      {/* Session progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-white/50">Sessions Completed</span>
          <span className="text-[11px] font-mono text-amber-400">{progress} / {sessionsNeeded}</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* XP accumulation */}
      <div className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded border border-white/[0.04]">
        <span className="text-[11px] text-white/40">XP Earned</span>
        <span className="text-[11px] font-mono text-white/60">{sessionCount * 100} XP</span>
      </div>

      {/* Locked modules preview */}
      <div className="mt-4 space-y-1.5">
        <UnlockIndicator label="Crew Intelligence" unlocked={false} requirement={`${sessionsNeeded - progress} more session${sessionsNeeded - progress !== 1 ? 's' : ''}`} />
        <UnlockIndicator label="Trend Modeling" unlocked={false} requirement="2 sessions required" />
        <UnlockIndicator label="Advanced Analysis" unlocked={false} requirement="5 sessions required" />
      </div>

      {sessionCount === 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <Link
            to="/driver/cockpit"
            className="flex items-center justify-center gap-2 py-2 bg-amber-500/15 border border-amber-500/20 rounded text-amber-400 text-xs font-semibold uppercase tracking-wider hover:bg-amber-500/25"
          >
            <Gauge className="w-3.5 h-3.5" /> Start First Session
          </Link>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CAREER PROGRESSION MODULE
// ═════════════════════════════════════════════════════════════════════════════

function CareerProgressionPanel({ consistency, snapshot, sessionCount }: {
  consistency: ConsistencyMetrics | null;
  snapshot: PerformanceSnapshot | null;
  sessionCount: number;
}) {
  const driverLevel = computeDriverLevel(sessionCount);
  const bars = computeProgressBars(snapshot);
  const xpProgress = driverLevel.xpToNext > 0
    ? Math.round(((driverLevel.xp - (driverLevel.level > 1 ? driverLevel.xp - (driverLevel.xp % driverLevel.xpToNext || driverLevel.xpToNext) : 0)) / driverLevel.xpToNext) * 100)
    : 100;
  // Recalculate XP within current level properly
  const thresholds = [0, 300, 800, 1500, 2500, 4000, 6000, 9000, 13000, 18000];
  const currentThreshold = thresholds[driverLevel.level - 1] || 0;
  const nextThreshold = thresholds[driverLevel.level] || currentThreshold + 5000;
  const xpInLevel = driverLevel.xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>
          Driver Development
        </h2>
      </div>

      <div className="p-5 space-y-6">
        {/* CPI Ring + Tier */}
        <div className="flex items-center gap-5">
          {consistency ? (
            <>
              <CPIRing value={consistency.index} tier={consistency.tier} size={110} />
              <div className="flex-1">
                <div className={`text-sm font-semibold uppercase tracking-wider ${CPI_TIER_STYLES[consistency.tier].text}`} style={ORBITRON}>
                  {consistency.tierLabel}
                </div>
                <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{consistency.explanation}</p>
              </div>
            </>
          ) : (
            <>
              <CPIRing value={0} tier="at_risk" size={110} />
              <div className="flex-1">
                <div className="text-sm font-semibold uppercase tracking-wider text-white/20" style={ORBITRON}>
                  Unranked
                </div>
                <p className="text-[11px] text-white/25 mt-1">Complete 3 sessions to calculate CPI</p>
              </div>
            </>
          )}
        </div>

        {/* Progress Bars */}
        {bars ? (
          <div className="space-y-3">
            <ProgressBar label="Consistency" value={bars.consistencyScore} color="#3b82f6" />
            <ProgressBar label="Incident Discipline" value={bars.incidentScore} color="#22c55e" />
            <ProgressBar label="Pace Stability" value={bars.paceScore} color="#a855f7" />
          </div>
        ) : (
          <div className="space-y-3">
            <ProgressBar label="Consistency" value={0} color="#3b82f6" />
            <ProgressBar label="Incident Discipline" value={0} color="#22c55e" />
            <ProgressBar label="Pace Stability" value={0} color="#a855f7" />
          </div>
        )}

        {/* Driver Level + XP */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-white/60 uppercase tracking-wider">
                Level {driverLevel.level} — {driverLevel.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/30">{driverLevel.xp} XP</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-white/20">Lvl {driverLevel.level}</span>
            <span className="text-[9px] text-white/20">{xpInLevel} / {xpNeeded} XP</span>
            <span className="text-[9px] text-white/20">Lvl {driverLevel.level + 1}</span>
          </div>
        </div>

        {/* Unlock Indicators */}
        <div className="space-y-1.5">
          <UnlockIndicator label="Crew Intelligence" unlocked={sessionCount >= 3} requirement="3 sessions required" />
          <UnlockIndicator label="Trend Modeling" unlocked={sessionCount >= 2} requirement="2 sessions required" />
          <UnlockIndicator label="Advanced Analysis" unlocked={sessionCount >= 5} requirement="5 sessions required" />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RACING NETWORK MODULE
// ═════════════════════════════════════════════════════════════════════════════

function RacingNetworkPanel() {
  // Real data would come from a notifications/messages API.
  // For now, show structured empty states (no fake data).
  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>
          Racing Network
        </h2>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {/* Notifications */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] text-white/50 uppercase tracking-wider">Notifications</span>
            </div>
            <span className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-full">0</span>
          </div>
          <p className="text-[11px] text-white/25 italic">No new notifications</p>
        </div>

        {/* Messages */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] text-white/50 uppercase tracking-wider">Messages</span>
            </div>
            <span className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-full">0</span>
          </div>
          <p className="text-[11px] text-white/25 italic">No active messages</p>
        </div>

        {/* Invites */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] text-white/50 uppercase tracking-wider">Invites</span>
            </div>
            <span className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-full">0</span>
          </div>
          <p className="text-[11px] text-white/25 italic">No pending invites</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <Link to="/driver/cockpit" className="py-2 text-center text-[10px] text-white/40 uppercase tracking-wider border border-white/[0.06] rounded hover:bg-white/[0.03] hover:text-white/60">
            Cockpit
          </Link>
          <Link to="/driver/progress" className="py-2 text-center text-[10px] text-white/40 uppercase tracking-wider border border-white/[0.06] rounded hover:bg-white/[0.03] hover:text-white/60">
            Progress
          </Link>
          <Link to="/driver/history" className="py-2 text-center text-[10px] text-white/40 uppercase tracking-wider border border-white/[0.06] rounded hover:bg-white/[0.03] hover:text-white/60">
            History
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PERFORMANCE DIRECTIVE (compact card)
// ═════════════════════════════════════════════════════════════════════════════

function PerformanceDirectiveCard({ direction }: { direction: ReturnType<typeof computePerformanceDirection> }) {
  if (direction.primaryFocus === 'needs_data') return null;

  const Icon = FOCUS_ICONS[direction.primaryFocus];
  const color = FOCUS_COLORS[direction.primaryFocus];
  const confidence = FOCUS_CONFIDENCE[direction.primaryFocus];

  return (
    <div className="border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold uppercase tracking-wider ${color}`} style={ORBITRON}>
              {direction.label}
            </span>
            <span className="text-[9px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">
              Confidence: {confidence}
            </span>
          </div>
          <p className="text-[11px] text-white/40 mt-1.5 leading-relaxed line-clamp-2">{direction.action}</p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RECENT PERFORMANCE (horizontal race cards)
// ═════════════════════════════════════════════════════════════════════════════

function RaceCard({ session }: { session: DriverSessionSummary }) {
  const delta = (session.finishPos != null && session.startPos != null)
    ? session.startPos - session.finishPos
    : null;
  const laps = session.lapsComplete ?? 0;
  const incidents = session.incidents ?? 0;
  const cleanPct = laps > 0 ? Math.max(0, Math.round(((laps - incidents) / laps) * 100)) : null;

  return (
    <div className="border border-white/10 bg-white/[0.02] p-4 min-w-[220px] max-w-[260px] shrink-0 hover:bg-white/[0.04] transition-colors">
      {/* Position badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`text-lg font-bold font-mono ${
          session.finishPos === 1 ? 'text-yellow-400' :
          (session.finishPos ?? 99) <= 3 ? 'text-orange-400' :
          (session.finishPos ?? 99) <= 5 ? 'text-blue-400' :
          'text-white/60'
        }`} style={ORBITRON}>
          {session.finishPos != null ? `P${session.finishPos}` : '—'}
        </div>
        <span className="text-[10px] text-white/25">{formatRelativeDate(session.startedAt)}</span>
      </div>

      {/* Track */}
      <p className="text-xs text-white/70 font-medium truncate mb-3">{session.trackName || 'Unknown'}</p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {/* Start → Finish delta */}
        {delta != null && (
          <div>
            <span className="text-[9px] text-white/25 uppercase">Pos Delta</span>
            <div className={`text-xs font-mono ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-white/40'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </div>
          </div>
        )}

        {/* Incidents */}
        <div>
          <span className="text-[9px] text-white/25 uppercase">Incidents</span>
          <div className={`text-xs font-mono ${incidents > 4 ? 'text-red-400' : incidents > 2 ? 'text-yellow-400' : 'text-white/50'}`}>
            {incidents}x
          </div>
        </div>

        {/* iRating delta */}
        {session.iRatingChange != null && (
          <div>
            <span className="text-[9px] text-white/25 uppercase">iR</span>
            <div className={`text-xs font-mono ${
              session.iRatingChange > 0 ? 'text-green-400' : session.iRatingChange < 0 ? 'text-red-400' : 'text-white/40'
            }`}>
              {session.iRatingChange > 0 ? '+' : ''}{session.iRatingChange}
            </div>
          </div>
        )}

        {/* Clean laps % */}
        {cleanPct != null && (
          <div>
            <span className="text-[9px] text-white/25 uppercase">Clean</span>
            <div className={`text-xs font-mono ${cleanPct >= 90 ? 'text-green-400' : cleanPct >= 70 ? 'text-white/50' : 'text-red-400'}`}>
              {cleanPct}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentPerformanceStrip({ sessions, loading }: { sessions: DriverSessionSummary[]; loading: boolean }) {
  const recent = sessions.slice(0, 8);

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>
          Recent Performance
        </h2>
        {recent.length > 0 && (
          <Link to="/driver/history" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
            Full History <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {loading && (
        <div className="p-4 flex gap-3 overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="min-w-[220px] h-[140px] bg-white/[0.03] rounded animate-pulse" />
          ))}
        </div>
      )}

      {!loading && recent.length > 0 && (
        <div className="p-4 flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
          {recent.map(s => <RaceCard key={s.sessionId} session={s} />)}
        </div>
      )}

      {!loading && recent.length === 0 && (
        <div className="p-6 text-center">
          <p className="text-[11px] text-white/25">Race data will appear here after your first session.</p>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export function DriverLanding() {
  const { user } = useAuth();
  const { status } = useRelay();
  const { profile, sessions, loading } = useDriverData();
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const isLive = status === 'in_session';

  // Background video
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.6;
  }, []);

  // Performance snapshot
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null | undefined>(undefined);
  const [snapshotError, setSnapshotError] = useState(false);

  const loadSnapshot = useCallback(async () => {
    setSnapshotError(false);
    try {
      const data = await fetchPerformanceSnapshot();
      setSnapshot(data);
    } catch {
      setSnapshotError(true);
    }
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  // Derived intelligence
  const direction = useMemo(() => computePerformanceDirection(snapshot ?? null), [snapshot]);
  const consistency = useMemo(() => computeConsistency(snapshot ?? null), [snapshot]);

  const sessionCount = sessions.length;
  const isTrainingMode = sessionCount < 3;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/bg-2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-5 pb-8">
      {/* DRIVER IDENTITY STRIP */}
      <DriverIdentityStrip
        displayName={displayName}
        profile={profile}
        consistency={consistency}
        relayStatus={status}
        isLive={isLive}
      />

      {/* TRAINING MODE — consolidated onboarding (replaces all scattered empty states) */}
      {!loading && isTrainingMode && (
        <TrainingModeCard sessionCount={sessionCount} />
      )}

      {/* PERFORMANCE DIRECTIVE (compact — not dominant) */}
      {!isTrainingMode && direction.primaryFocus !== 'needs_data' && (
        <PerformanceDirectiveCard direction={direction} />
      )}

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT: Career Progression (3/5 width) */}
        <div className="lg:col-span-3">
          <CareerProgressionPanel
            consistency={consistency}
            snapshot={snapshot ?? null}
            sessionCount={sessionCount}
          />
        </div>

        {/* RIGHT: Racing Network (2/5 width) */}
        <div className="lg:col-span-2">
          <RacingNetworkPanel />
        </div>
      </div>

      {/* BOTTOM: Recent Performance (horizontal race cards) */}
      <RecentPerformanceStrip sessions={sessions} loading={loading} />
      </div>
    </div>
  );
}
