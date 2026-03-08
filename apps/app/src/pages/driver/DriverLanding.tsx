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
 * │  - Unlock Indicators        │  - Licenses              │
 * │  - iRating Trend Sparkline  │                          │
 * ├──────────────────────────────┴──────────────────────────┤
 * │  QUICK STATS (starts, wins, top 5s, poles)              │
 * ├────────────────────────────────────────────────────────-─┤
 * │  CREW INTELLIGENCE PREVIEW (engineer/spotter/analyst)   │
 * ├─────────────────────────────────────────────────────────┤
 * │  RECENT PERFORMANCE (horizontal race cards + streaks)   │
 * ├─────────────────────────────────────────────────────────┤
 * │  NEXT SESSION PROMPT (motivational forward-action)      │
 * └─────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverData } from '../../hooks/useDriverData';
import { Link } from 'react-router-dom';
import { DriverWelcome } from '../../components/DriverWelcome';
import { useFirstTimeExperience } from '../../components/PitwallWelcome';
import {
  WifiOff, Radio, ChevronRight,
  Play, Download, Gauge, Shield,
  Target, ArrowUpRight,
  Lock, Unlock, Bell, MessageSquare, Users,
  Trophy, AlertTriangle, TrendingDown, Zap,
  Wrench, Eye, BarChart3, Award, TrendingUp,
  Flame, Sparkles, Activity, Clock, Info
} from 'lucide-react';
import {
  getLicenseColor,
  fetchPerformanceSnapshot,
  fetchTelemetryMetrics,
  PerformanceSnapshot,
  DriverSessionSummary,
  DriverStatsSnapshot,
  TelemetryMetricsResponse,
} from '../../lib/driverService';
import {
  computePerformanceDirection,
  computeConsistency,
  buildRatingTrend,
  computeTelemetryAwareCrewInsights,
  generateIntelligenceAssessment,
  computeBehavioralIndices,
  type ConsistencyMetrics,
  type CPITier,
  type FocusFlag,
  type RatingTrendPoint,
  type SessionTelemetryMetrics,
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
        <span className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5 flex items-center gap-1 group cursor-help relative">
          CPI
          <Info className="w-2.5 h-2.5 text-white/20 group-hover:text-white/40" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 p-2 bg-black/95 border border-white/20 text-[10px] text-white/70 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center normal-case tracking-normal">
            <strong className="text-white block mb-1">Clean Performance Index</strong>
            Measures consistency, incident discipline, and pace stability across your recent races.
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ label, value, color, insufficientData }: { label: string; value: number; color: string; insufficientData?: boolean }) {
  // Phase 3: Replace hard zero with meaningful labels
  const displayValue = insufficientData ? 'Low sample' : value <= 10 ? 'Low' : value;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/50 uppercase tracking-wider">{label}</span>
        <span className={`text-[11px] font-mono ${insufficientData || value <= 10 ? 'text-white/40 italic' : 'text-white/60'}`}>{displayValue}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${insufficientData ? 15 : Math.max(value, 5)}%`, backgroundColor: insufficientData ? '#666' : color }}
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

// ═════════════════════════════════════════════════════════════════════════════
// DRIVER STATUS LINE — Emotional anchor, one-line summary
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// SINCE LAST SESSION — What changed since driver's last login
// ═════════════════════════════════════════════════════════════════════════════

function SinceLastSessionBlock({ snapshot, sessions }: { snapshot: PerformanceSnapshot | null; sessions: DriverSessionSummary[] }) {
  if (!snapshot || sessions.length < 2) return null;

  const lastSession = sessions[0];
  const recent5 = sessions.slice(0, 5);
  
  // Calculate deltas - use iRatingChange from DriverSessionSummary
  const lastIRDelta = lastSession?.iRatingChange ?? 0;
  const lastIncidents = lastSession?.incidents ?? 0;
  const lastFinish = lastSession?.finishPos ?? 0;
  const avg5Incidents = recent5.length > 0 
    ? recent5.reduce((sum, s) => sum + (s.incidents ?? 0), 0) / recent5.length 
    : 0;
  const avg5Finish = recent5.length > 0
    ? recent5.reduce((sum, s) => sum + (s.finishPos ?? 0), 0) / recent5.length
    : 0;
  const incidentDelta = lastIncidents - avg5Incidents;
  const finishDelta = lastFinish - avg5Finish;
  
  // Format time since last session - use startedAt from DriverSessionSummary
  const lastSessionDate = lastSession?.startedAt ? new Date(lastSession.startedAt) : null;
  const timeSince = lastSessionDate 
    ? formatTimeSince(lastSessionDate) 
    : 'Unknown';

  // Generate interpretation microcopy
  const getInterpretation = (): string => {
    const insights: string[] = [];
    
    // iRating interpretation
    if (lastIRDelta === 0) {
      insights.push('Neutral rating result.');
    } else if (lastIRDelta > 30) {
      insights.push('Strong rating gain.');
    } else if (lastIRDelta < -30) {
      insights.push('Significant rating loss.');
    }
    
    // Finish vs average
    if (finishDelta > 3) {
      insights.push('Below recent average finish.');
    } else if (finishDelta < -3) {
      insights.push('Above recent average finish.');
    }
    
    // Incident control
    if (incidentDelta < -1) {
      insights.push('Incident control improved.');
    } else if (incidentDelta > 1) {
      insights.push('Incident rate elevated.');
    }
    
    if (insights.length === 0) {
      return 'No material performance shift.';
    }
    
    return insights.join(' ');
  };

  const interpretation = getInterpretation();

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/30" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Since Last Session</h2>
        </div>
        <span className="text-[10px] text-white/20">{timeSince}</span>
      </div>
      <div className="px-5 py-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          {/* iRating Change */}
          <div className="text-center">
            <div className={`text-lg font-mono font-bold ${lastIRDelta > 0 ? 'text-emerald-400' : lastIRDelta < 0 ? 'text-red-400' : 'text-white/40'}`}>
              {lastIRDelta > 0 ? '+' : ''}{lastIRDelta}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">iRating</div>
          </div>
          
          {/* Incident Delta */}
          <div className="text-center">
            <div className={`text-lg font-mono font-bold ${incidentDelta < -0.5 ? 'text-emerald-400' : incidentDelta > 0.5 ? 'text-amber-400' : 'text-white/40'}`}>
              {lastIncidents}x
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">
              {incidentDelta < -0.5 ? 'Below avg' : incidentDelta > 0.5 ? 'Above avg' : 'On avg'}
            </div>
          </div>
          
          {/* Position */}
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-white/70">
              P{lastSession?.finishPos ?? '--'}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Finish</div>
          </div>
        </div>
        
        {/* Interpretation Layer */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-[11px] text-white/40 italic">{interpretation}</p>
          <span className="text-[9px] text-white/20">Session analyzed</span>
        </div>
      </div>
    </div>
  );
}

function formatTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}

function DriverStatusLine({ 
  snapshot, 
  sessions, 
  telemetry 
}: { 
  snapshot: PerformanceSnapshot | null; 
  sessions: DriverSessionSummary[];
  telemetry: SessionTelemetryMetrics | null;
}) {
  if (!snapshot || sessions.length < 3) return null;

  const avgIncidents = snapshot.avg_incidents;
  const irDelta = snapshot.irating_delta;
  const incidentThreshold = 3;
  
  // Calculate confidence based on sample size
  const sampleSize = Math.min(sessions.length, 10);
  const baseConfidence = Math.min(95, 50 + (sampleSize * 5));

  // Compute behavioral indices from telemetry (null if no telemetry)
  const behavioral = computeBehavioralIndices(telemetry);
  const hasTelemetry = behavioral.confidence >= 50;

  // Generate telemetry-aware intelligence assessment
  const assessment = generateIntelligenceAssessment(
    avgIncidents,
    snapshot.avg_finish,
    irDelta,
    hasTelemetry ? behavioral : null
  );

  // Use assessment for status message
  const statusMessage = assessment.statusMessage;
  const confidence = hasTelemetry ? assessment.confidence : baseConfidence;
  const modelType = assessment.modelType;

  // Determine icon and color based on problem category
  let statusColor = 'text-white/60';
  let statusIcon: 'warning' | 'positive' | 'stable' = 'stable';

  if (assessment.primaryCategory === 'incident_driven' || assessment.primaryCategory === 'control_driven') {
    statusColor = 'text-amber-400';
    statusIcon = 'warning';
  } else if (assessment.primaryCategory === 'racecraft_driven') {
    statusColor = 'text-yellow-400';
    statusIcon = 'warning';
  } else if (assessment.primaryCategory === 'pace_driven') {
    statusColor = 'text-orange-400';
    statusIcon = 'warning';
  } else if (assessment.primaryCategory === 'balanced' && irDelta > 0) {
    statusColor = 'text-emerald-400';
    statusIcon = 'positive';
  } else {
    statusColor = 'text-blue-400';
    statusIcon = 'stable';
  }

  return (
    <div className="border-x border-b border-white/10 bg-gradient-to-r from-[#0a0a0a]/90 to-[#0a0a0a]/70 px-5 py-6">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/30" style={ORBITRON}>Primary Performance Constraint</span>
      </div>
      {/* Primary: Status Narrative (visually dominant) */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{
          backgroundColor: statusIcon === 'warning' ? 'rgba(251, 191, 36, 0.1)' : statusIcon === 'positive' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${statusIcon === 'warning' ? 'rgba(251, 191, 36, 0.2)' : statusIcon === 'positive' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
        }}>
          {statusIcon === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
          {statusIcon === 'positive' && <TrendingUp className="w-6 h-6 text-emerald-400" />}
          {statusIcon === 'stable' && <Activity className="w-6 h-6 text-blue-400" />}
        </div>
        <div className="flex-1">
          <p className={`text-lg font-semibold leading-snug ${statusColor}`} style={ORBITRON}>{statusMessage}</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[10px] text-white/25">{confidence}% confidence • Last {sampleSize} races</p>
            <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
              modelType === 'telemetry_informed' 
                ? 'bg-cyan-500/10 text-cyan-400/70' 
                : 'bg-white/5 text-white/30'
            }`}>
              {modelType === 'telemetry_informed' ? 'Telemetry' : 'Results'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Secondary: Supporting Metrics (smaller, subdued) */}
      <div className="flex items-center gap-5 pl-9 text-[10px] text-white/25 border-t border-white/[0.04] pt-3">
        <span>Rating Change: <span className={irDelta > 0 ? 'text-emerald-400/60' : irDelta < 0 ? 'text-red-400/60' : 'text-white/35'}>{irDelta > 0 ? '+' : ''}{irDelta}</span></span>
        <span>Avg Incidents: <span className={avgIncidents > incidentThreshold ? 'text-amber-400/60' : 'text-white/35'}>{avgIncidents.toFixed(1)} per race</span></span>
        {hasTelemetry && (
          <span>Behavioral: <span className={behavioral.behavioralStability >= 70 ? 'text-emerald-400/60' : behavioral.behavioralStability >= 50 ? 'text-blue-400/60' : 'text-amber-400/60'}>{behavioral.behavioralStability}%</span></span>
        )}
      </div>
    </div>
  );
}

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
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm px-5 py-4">
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
                  <span className="text-[11px] text-white/40 capitalize">
                    {primaryLicense.discipline === 'sportsCar' ? 'Road' : primaryLicense.discipline === 'dirtOval' ? 'Dirt Oval' : primaryLicense.discipline === 'dirtRoad' ? 'Dirt Road' : primaryLicense.discipline.charAt(0).toUpperCase() + primaryLicense.discipline.slice(1)}
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
              <div className="text-[9px] text-white/30 uppercase tracking-wider cursor-help" title="CPI — Clean Performance Index&#10;&#10;Composite score of incident discipline, finish stability, and race completion across last 10 official races.&#10;&#10;Zones:&#10;• 0–30 = Critical&#10;• 30–60 = Developing&#10;• 60–80 = Stable&#10;• 80+ = Competitive&#10;&#10;6-factor weighted formula:&#10;• Incident Rate (25%)&#10;• Consistency (20%)&#10;• iRating Momentum (20%)&#10;• Clean Race % (15%)&#10;• Completion Rate (10%)&#10;• Field Performance (10%)">CPI</div>
            </div>
          )}
        </div>

        {/* Right: Relay pill + Live CTA */}
        <div className="flex items-center gap-3">
          {/* Relay status - only show if Live or needs action (removed duplicate Connected) */}
          {(isLive || relayStatus === 'disconnected') && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${
              isLive ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'
            }`}>
              {isLive ? (
                <Radio className="w-3 h-3 animate-pulse" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {isLive ? 'Live' : 'Offline'}
            </div>
          )}

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
      <div className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded border border-white/[0.04]">
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
  // Calculate XP within current level
  const thresholds = [0, 300, 800, 1500, 2500, 4000, 6000, 9000, 13000, 18000];
  const currentThreshold = thresholds[driverLevel.level - 1] || 0;
  const nextThreshold = thresholds[driverLevel.level] || currentThreshold + 5000;
  const xpInLevel = driverLevel.xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
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
// iRATING TREND SPARKLINE (pure SVG — no Recharts)
// ═════════════════════════════════════════════════════════════════════════════

function IRatingSparkline({ points }: { points: RatingTrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-white/20" />
          <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>iRating Trend</h3>
          <span className="text-[9px] text-white/20 ml-2">(Primary License)</span>
        </div>
        <div className="p-4">
          <div className="h-16 relative overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 400 60" preserveAspectRatio="none" className="opacity-[0.06]">
              <polyline points="0,45 60,42 120,38 180,35 240,32 300,30 360,28 400,26" fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 4" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[10px] text-white/25">Complete 2 sessions to activate trend</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ratings = points.map(p => p.iRating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 1;
  const delta = ratings[ratings.length - 1] - ratings[0];

  const w = 400;
  const h = 60;
  const pad = 4;
  const pts = ratings.map((r, i) => {
    const x = pad + (i / (ratings.length - 1)) * (w - pad * 2);
    const y = h - pad - ((r - minR) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400/50" />
          <h3 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>iRating Trend</h3>
          <span className="text-[9px] text-white/20 ml-2">Rolling 90-day • Primary License</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-white/40">{ratings[ratings.length - 1]}</span>
          <span className={`text-[10px] font-mono ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-white/30'}`}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {delta > 0 ? '+' : ''}{delta}
          </span>
        </div>
      </div>
      <div className="p-4">
        <svg width="100%" height="60" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`${pad},${h} ${pts} ${w - pad},${h}`} fill="url(#sparkFill)" />
          <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PERFORMANCE ATTRIBUTES COMPACT (max 3 bars - focused)
// ═════════════════════════════════════════════════════════════════════════════

function PerformanceAttributesCompact({ snapshot, sessions }: { snapshot: PerformanceSnapshot; sessions?: DriverSessionSummary[] }) {
  // Calculate all 6 CPI components
  const recentSessions = sessions?.slice(0, 10) ?? [];
  
  // Component 1: Incident Rate (25%)
  const incidentScore = Math.max(0, Math.min(100, Math.round(100 - (snapshot.avg_incidents * 12.5))));
  
  // Component 2: Consistency / Variance (20%)
  const finishes = recentSessions.map(s => s.finishPos).filter((p): p is number => p != null);
  let consistencyScore = -1; // -1 indicates insufficient data
  let consistencyLabel = 'Low sample';
  if (finishes.length >= 3) {
    const avg = finishes.reduce((a, b) => a + b, 0) / finishes.length;
    const variance = finishes.reduce((s, f) => s + Math.pow(f - avg, 2), 0) / finishes.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev * 10))));
    consistencyLabel = consistencyScore < 30 ? 'High variance' : `±${stdDev.toFixed(1)} positions`;
  }
  
  // Component 3: iRating Momentum (20%)
  const momentumScore = Math.max(0, Math.min(100, Math.round(50 + (snapshot.irating_delta / 2))));
  
  // Component 4: Clean Race % (15%)
  const cleanRaces = recentSessions.filter(s => (s.incidents ?? 0) <= 2).length;
  const cleanRaceScore = recentSessions.length > 0 
    ? Math.round((cleanRaces / recentSessions.length) * 100)
    : 50;
  
  // Component 5: Completion Rate (10%)
  const completedRaces = recentSessions.filter(s => s.finishPos != null).length;
  const completionScore = recentSessions.length > 0 
    ? Math.round((completedRaces / recentSessions.length) * 100)
    : 100;
  
  // Component 6: Field Performance (10%)
  const fieldScore = Math.max(0, Math.min(100, Math.round(100 - ((snapshot.avg_finish - 1) * 5))));

  // Build components array with metadata
  // Use consistencyScore of -1 to indicate insufficient data, display as "Low sample"
  const effectiveConsistencyScore = consistencyScore < 0 ? 50 : consistencyScore; // Default to 50 if insufficient
  const components = [
    { name: 'Incident Rate', score: incidentScore, weight: 25, color: '#22c55e', tooltip: `${snapshot.avg_incidents.toFixed(1)}x avg incidents`, hasData: true },
    { name: 'Consistency', score: effectiveConsistencyScore, weight: 20, color: '#3b82f6', tooltip: consistencyLabel, hasData: consistencyScore >= 0 },
    { name: 'iRating Momentum', score: momentumScore, weight: 20, color: '#8b5cf6', tooltip: `${snapshot.irating_delta > 0 ? '+' : ''}${snapshot.irating_delta} iR delta`, hasData: true },
    { name: 'Clean Race %', score: cleanRaceScore, weight: 15, color: '#06b6d4', tooltip: `${cleanRaces}/${recentSessions.length} races with ≤2 inc`, hasData: recentSessions.length > 0 },
    { name: 'Completion', score: completionScore, weight: 10, color: '#f59e0b', tooltip: `${completedRaces}/${recentSessions.length} races finished`, hasData: recentSessions.length > 0 },
    { name: 'Field Performance', score: fieldScore, weight: 10, color: '#ec4899', tooltip: `Avg finish P${snapshot.avg_finish.toFixed(1)}`, hasData: true },
  ];

  // Sort to find weakest and strongest
  const sorted = [...components].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strengths = sorted.filter(c => c.score >= 60).slice(-2).reverse();

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>CPI Breakdown</h2>
          <p className="text-[9px] text-white/20 mt-0.5">Based on last {Math.min(recentSessions.length, 10)} official races</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[9px] text-white/20 uppercase tracking-wider">Analyzed</div>
            <div className="text-xs font-mono text-blue-400">{(recentSessions.reduce((sum, s) => sum + (s.lapsComplete || 0), 0) * 60).toLocaleString()} pts</div>
          </div>
          <Link to="/driver/idp" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
            Full Analysis <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Focus Area - Weakest Component */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-amber-400">Focus Area</span>
          </div>
          <div title={weakest.tooltip}>
            <ProgressBar label={weakest.name} value={weakest.score} color="#f59e0b" insufficientData={!weakest.hasData} />
          </div>
          <p className="text-[10px] text-white/30 mt-1.5">{weakest.tooltip} — limiting CPI by {weakest.weight}%</p>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">Strengths</span>
            </div>
            <div className="space-y-2">
              {strengths.map(s => (
                <div key={s.name} title={s.tooltip}>
                  <ProgressBar label={s.name} value={s.score} color={s.color} insufficientData={!s.hasData} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5-RACE TREND SUMMARY (replaces dense race cards)
// ═════════════════════════════════════════════════════════════════════════════

function FiveRaceTrendSummary({ sessions, loading }: { sessions: DriverSessionSummary[]; loading: boolean }) {
  const recent = sessions.slice(0, 5);
  
  if (loading) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm p-5">
        <div className="h-20 bg-white/[0.03] rounded animate-pulse" />
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Recent Trend</h2>
        </div>
        <div className="p-5 text-center">
          <p className="text-[11px] text-white/25">Complete a session to see your trend.</p>
        </div>
      </div>
    );
  }

  // Calculate aggregates
  const avgFinish = recent.reduce((a, s) => a + (s.finishPos ?? 0), 0) / recent.length;
  const avgIncidents = recent.reduce((a, s) => a + (s.incidents ?? 0), 0) / recent.length;
  const totalIRDelta = recent.reduce((a, s) => a + (s.iRatingChange ?? 0), 0);
  const wins = recent.filter(s => s.finishPos === 1).length;
  const top5s = recent.filter(s => (s.finishPos ?? 99) <= 5).length;

  // Trend analysis - smarter narrative logic
  const isTrendingUp = totalIRDelta > 20;
  const isTrendingDown = totalIRDelta < -20;
  const isSlightlyDown = totalIRDelta < 0 && totalIRDelta >= -20;
  const highIncidents = avgIncidents > 3;
  const cleanRacing = avgIncidents < 1.5;
  
  // Phase 6: Generate contextual narrative — must reflect data precisely
  const getTrendNarrative = () => {
    if (isTrendingUp && cleanRacing) return { icon: TrendingUp, color: 'text-green-400', text: 'Strong momentum with clean execution' };
    if (isTrendingUp && highIncidents) return { icon: TrendingUp, color: 'text-yellow-400', text: 'Positive rating movement despite incident load' };
    if (isTrendingUp) return { icon: TrendingUp, color: 'text-green-400', text: 'Positive trend — maintain discipline' };
    if (isTrendingDown && highIncidents) return { icon: AlertTriangle, color: 'text-red-400', text: 'Rating suppressed by elevated incident load' };
    if (isTrendingDown && cleanRacing) return { icon: TrendingDown, color: 'text-red-400', text: 'Rating decline not incident-driven — pace investigation required' };
    if (isTrendingDown) return { icon: TrendingDown, color: 'text-red-400', text: 'Declining trend — review recent sessions' };
    if (isSlightlyDown && highIncidents) return { icon: AlertTriangle, color: 'text-yellow-400', text: 'Slight decline due to incidents' };
    if (isSlightlyDown && cleanRacing) return { icon: TrendingDown, color: 'text-yellow-400', text: 'Minor decline despite clean racing — investigate pace' };
    if (isSlightlyDown) return { icon: TrendingDown, color: 'text-yellow-400', text: 'Minor decline — stay focused' };
    if (cleanRacing) return { icon: Target, color: 'text-blue-400', text: 'Stable with clean racing' };
    return { icon: Target, color: 'text-white/40', text: 'Holding steady' };
  };
  
  const narrative = getTrendNarrative();
  const NarrativeIcon = narrative.icon;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>
          Last {recent.length} Race{recent.length !== 1 ? 's' : ''}
        </h2>
        <Link to="/driver/history" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
          Full History <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-white" style={ORBITRON}>P{avgFinish.toFixed(1)}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Avg Finish</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${avgIncidents > 3 ? 'text-red-400' : avgIncidents > 1.5 ? 'text-yellow-400' : 'text-green-400'}`} style={ORBITRON}>
              {avgIncidents.toFixed(1)}x
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Avg Inc</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${totalIRDelta > 0 ? 'text-green-400' : totalIRDelta < 0 ? 'text-red-400' : 'text-white/60'}`} style={ORBITRON}>
              {totalIRDelta > 0 ? '+' : ''}{totalIRDelta}
            </div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">iR Delta</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${wins > 0 ? 'text-yellow-400' : 'text-white/30'}`} style={ORBITRON}>{wins}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Wins</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${top5s > 0 ? 'text-orange-400' : 'text-white/30'}`} style={ORBITRON}>{top5s}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Top 5s</div>
          </div>
        </div>
        
        {/* Mini Trend Sparklines */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-4">
          {/* Finish Position Trend */}
          <div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Finish Trend</div>
            <div className="h-8 flex items-end gap-0.5">
              {recent.slice().reverse().map((s, i) => {
                const pos = s.finishPos ?? 20;
                const height = Math.max(10, 100 - (pos * 3));
                return (
                  <div 
                    key={i} 
                    className="flex-1 rounded-t transition-all"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: pos <= 5 ? '#22c55e' : pos <= 10 ? '#3b82f6' : pos <= 15 ? '#eab308' : '#ef4444'
                    }}
                    title={`P${pos}`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Incident Trend */}
          <div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Incident Trend</div>
            <div className="h-8 flex items-end gap-0.5">
              {recent.slice().reverse().map((s, i) => {
                const inc = s.incidents ?? 0;
                const height = Math.min(100, Math.max(10, inc * 15));
                return (
                  <div 
                    key={i} 
                    className="flex-1 rounded-t transition-all"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: inc <= 2 ? '#22c55e' : inc <= 4 ? '#eab308' : '#ef4444'
                    }}
                    title={`${inc}x`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* iRating Change Trend */}
          <div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider mb-2">iRating Change</div>
            <div className="h-8 flex items-end gap-0.5">
              {recent.slice().reverse().map((s, i) => {
                const change = s.iRatingChange ?? 0;
                const isPositive = change >= 0;
                const height = Math.min(100, Math.max(15, Math.abs(change) / 2 + 15));
                return (
                  <div 
                    key={i} 
                    className="flex-1 rounded-t transition-all"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: isPositive ? '#22c55e' : '#ef4444'
                    }}
                    title={`${change > 0 ? '+' : ''}${change}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Trend indicator - now data-aware */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-2">
          <NarrativeIcon className={`w-4 h-4 ${narrative.color}`} />
          <span className={`text-[11px] ${narrative.color}`}>{narrative.text}</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// QUICK STATS ROW (kept for potential future use)
// ═════════════════════════════════════════════════════════════════════════════

function QuickStatsRow({ stats }: { stats: DriverStatsSnapshot[] }) {
  const totalStarts = stats.reduce((a, s) => a + s.starts, 0);
  const totalWins = stats.reduce((a, s) => a + s.wins, 0);
  const totalTop5s = stats.reduce((a, s) => a + s.top5s, 0);
  const totalPoles = stats.reduce((a, s) => a + s.poles, 0);

  if (totalStarts === 0) return null;

  const items = [
    { label: 'Starts', value: totalStarts, icon: Flame, color: 'text-white/60' },
    { label: 'Wins', value: totalWins, icon: Trophy, color: totalWins > 0 ? 'text-yellow-400' : 'text-white/30' },
    { label: 'Top 5s', value: totalTop5s, icon: Award, color: totalTop5s > 0 ? 'text-orange-400' : 'text-white/30' },
    { label: 'Poles', value: totalPoles, icon: Sparkles, color: totalPoles > 0 ? 'text-blue-400' : 'text-white/30' },
  ];

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="grid grid-cols-4 divide-x divide-white/[0.06]">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="py-3 px-4 text-center">
              <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${item.color}`} />
              <div className="text-lg font-bold font-mono text-white" style={ORBITRON}>{item.value}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VALUE SIGNAL STRIP (CFO audit: show depth of analysis)
// ═════════════════════════════════════════════════════════════════════════════

function ValueSignalStrip({ sessions, stats, hasTelemetry }: {
  sessions: DriverSessionSummary[];
  stats: DriverStatsSnapshot[];
  hasTelemetry: boolean;
}) {
  const sessionCount = sessions.length;
  if (sessionCount === 0) return null;

  const totalLaps = sessions.reduce((a, s) => a + (s.lapsComplete ?? 0), 0);
  const totalStarts = stats.reduce((a, s) => a + s.starts, 0);
  // Estimate datapoints: ~60Hz telemetry × ~90s avg lap × laps, or fallback to laps × 5400
  const estimatedDatapoints = totalLaps > 0 ? totalLaps * 5400 : totalStarts * 25 * 5400;
  const behavioralSnapshots = hasTelemetry ? sessionCount * 45 : sessionCount * 6;

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const signals = [
    { value: formatNumber(totalStarts || sessionCount), label: 'Sessions Analyzed' },
    { value: formatNumber(totalLaps || sessionCount * 25), label: 'Laps Tracked' },
    { value: formatNumber(estimatedDatapoints), label: 'Datapoints Processed' },
    { value: formatNumber(behavioralSnapshots), label: 'Behavioral Snapshots' },
  ];

  return (
    <div className="border border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-sm">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-[#f97316]/40" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/25">Your Digital Race Engineer Has Processed</span>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-white/[0.04] border-t border-white/[0.04]">
        {signals.map(s => (
          <div key={s.label} className="py-3 px-3 text-center">
            <div className="text-base font-bold font-mono text-[#f97316]/80" style={ORBITRON}>{s.value}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CREW INTELLIGENCE PREVIEW
// ═════════════════════════════════════════════════════════════════════════════

function CrewPreviewPanel({ sessions, focus, telemetry }: { sessions: DriverSessionSummary[]; focus: FocusFlag; telemetry: SessionTelemetryMetrics | null }) {
  // Use telemetry-aware insights when available, fall back to results-based
  const insights = useMemo(() => computeTelemetryAwareCrewInsights(sessions, focus, telemetry), [sessions, focus, telemetry]);

  const crewRoles = [
    { key: 'engineer' as const, label: 'Engineer', icon: Wrench, color: '#f97316', link: '/driver/crew/engineer' },
    { key: 'spotter' as const, label: 'Spotter', icon: Eye, color: '#3b82f6', link: '/driver/crew/spotter' },
    { key: 'analyst' as const, label: 'Analyst', icon: BarChart3, color: '#8b5cf6', link: '/driver/crew/analyst' },
  ];

  // Phase 5: Dynamic crew status based on focus
  const crewStatus = focus === 'incident_management' || focus === 'racecraft_traffic' 
    ? { label: 'Alert', color: 'bg-amber-500/10 text-amber-400/70' }
    : focus === 'strong_momentum'
    ? { label: 'Stable', color: 'bg-emerald-500/10 text-emerald-400/60' }
    : { label: 'Monitoring', color: 'bg-blue-500/10 text-blue-400/60' };

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Crew Intelligence</h2>
          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${crewStatus.color}`}>{crewStatus.label}</span>
        </div>
        <Link to="/driver/crew" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
          Full Crew <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
        {crewRoles.map(role => {
          const Icon = role.icon;
          const insight = insights.find(i => i.role === role.key);
          return (
            <Link key={role.key} to={role.link} className="p-4 hover:bg-white/[0.03] transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}30` }}>
                  <Icon className="w-3 h-3" style={{ color: role.color }} />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{role.label}</span>
                <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30 ml-auto" />
              </div>
              {insight ? (
                <>
                  <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{insight.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {insight.confidence && (
                      <span className="text-[9px] text-white/20">{insight.confidence}% conf</span>
                    )}
                    {insight.dataWindow && (
                      <span className="text-[9px] text-white/15">• {insight.dataWindow}</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-white/20 italic">Awaiting session data</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LICENSES PANEL (compact)
// ═════════════════════════════════════════════════════════════════════════════

function LicensesCompactPanel({ profile }: { profile: ReturnType<typeof useDriverData>['profile'] }) {
  const licenses = profile?.licenses;
  if (!licenses || licenses.length === 0) return null;

  const DISC_LABELS: Record<string, string> = {
    sportsCar: 'Road', oval: 'Oval', dirtOval: 'Dirt Oval', dirtRoad: 'Dirt Road', formula: 'Formula',
  };

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Licenses</h2>
        <Link to="/driver/idp" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-wider flex items-center gap-1">
          Details <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-3 space-y-1.5">
        {licenses.map(lic => (
          <div key={lic.discipline} className="flex items-center justify-between py-2 px-3 rounded border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: getLicenseColor(lic.licenseClass) }}
              >
                {lic.licenseClass}
              </div>
              <span className="text-[11px] text-white/60">{DISC_LABELS[lic.discipline] || lic.discipline}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-400/40" />
                <span className="text-[10px] font-mono text-green-400/60">{lic.safetyRating?.toFixed(2) ?? '—'}</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-blue-400">{lic.iRating ?? '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXT ACTION BLOCK (mission brief style)
// ═════════════════════════════════════════════════════════════════════════════

function NextActionBlock({ direction, snapshot }: { direction: ReturnType<typeof computePerformanceDirection>; snapshot: PerformanceSnapshot | null }) {
  // Generate actionable next steps based on current focus
  const getActions = () => {
    const actions: string[] = [];
    
    if (direction.primaryFocus === 'incident_management') {
      actions.push('Target sub-3 incident race');
      actions.push('Review braking telemetry');
      if (snapshot && snapshot.avg_incidents > 4) {
        actions.push('Practice 10 clean laps before racing');
      }
    } else if (direction.primaryFocus === 'racecraft_traffic') {
      actions.push('Focus qualifying pace');
      actions.push('Analyze entry delta variance');
      actions.push('Delay overtakes until lap 3+');
    } else if (direction.primaryFocus === 'plateau_detection') {
      actions.push('Isolate setup vs input factors');
      actions.push('Review telemetry from best recent lap');
      actions.push('Consider split level adjustment');
    } else {
      actions.push('Maintain discipline');
      actions.push('Expand consistency sample size');
      if (snapshot && snapshot.avg_finish > 15) {
        actions.push('Target top-half finish');
      }
    }
    
    return actions.slice(0, 3);
  };

  const actions = getActions();

  // Determine primary CTA based on focus
  const primaryCTA = direction.primaryFocus === 'incident_management' 
    ? { label: 'Open Engineer Brief', link: '/driver/crew/engineer' }
    : direction.primaryFocus === 'racecraft_traffic'
    ? { label: 'Open Spotter Brief', link: '/driver/crew/spotter' }
    : { label: 'View Full CPI Analysis', link: '/driver/idp' };

  return (
    <div className="border-2 border-[#f97316]/30 bg-gradient-to-br from-[#f97316]/5 to-transparent backdrop-blur-sm relative overflow-hidden">
      {/* Accent corner */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#f97316]/10 to-transparent" />
      
      <div className="px-5 py-4 border-b border-[#f97316]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center">
            <Target className="w-4 h-4 text-[#f97316]" />
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Your Next Steps</h2>
            <p className="text-[9px] text-white/30">Personalized coaching from your crew</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="space-y-3 mb-5">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-3 group">
              <div className="w-6 h-6 rounded-full bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center text-[10px] font-bold text-[#f97316] flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <span className="text-[13px] text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">{action}</span>
            </div>
          ))}
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/[0.06]">
          <Link 
            to={primaryCTA.link}
            className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-black text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            {primaryCTA.label} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link 
            to="/driver/history"
            className="px-4 py-2 hover:bg-white/[0.04] border border-white/10 text-[11px] uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors flex items-center gap-2"
          >
            Review Last Race <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXT SESSION PROMPT (legacy - kept for reference)
// ═════════════════════════════════════════════════════════════════════════════

function NextSessionPrompt({ sessionCount, driverLevel }: { sessionCount: number; driverLevel: { level: number; title: string; xp: number; xpToNext: number } }) {
  const thresholds = [0, 300, 800, 1500, 2500, 4000, 6000, 9000, 13000, 18000];
  const nextThreshold = thresholds[driverLevel.level] || thresholds[thresholds.length - 1] + 5000;
  const sessionsToNextLevel = Math.max(1, Math.ceil((nextThreshold - driverLevel.xp) / 100));

  // Determine unlock milestones
  let unlockMessage: string | null = null;
  if (sessionCount < 2) unlockMessage = `${2 - sessionCount} more session${2 - sessionCount !== 1 ? 's' : ''} to unlock Trend Modeling`;
  else if (sessionCount < 3) unlockMessage = '1 more session to unlock Crew Intelligence';
  else if (sessionCount < 5) unlockMessage = `${5 - sessionCount} more session${5 - sessionCount !== 1 ? 's' : ''} to unlock Advanced Analysis`;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <ArrowUpRight className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-green-400" style={ORBITRON}>
            Next Session
          </div>
          <div className="mt-1.5 space-y-1">
            <p className="text-[11px] text-white/50">
              <span className="text-white/70 font-medium">+100 XP</span> — {sessionsToNextLevel} session{sessionsToNextLevel !== 1 ? 's' : ''} to Level {driverLevel.level + 1}
            </p>
            {unlockMessage && (
              <p className="text-[11px] text-amber-400/60">
                <Lock className="w-3 h-3 inline mr-1 -mt-0.5" />{unlockMessage}
              </p>
            )}
          </div>
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
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
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

function PerformanceDirectiveCard({ direction, snapshot }: { direction: ReturnType<typeof computePerformanceDirection>; snapshot: PerformanceSnapshot | null }) {
  const [expanded, setExpanded] = useState(false);
  
  if (direction.primaryFocus === 'needs_data') return null;

  const Icon = FOCUS_ICONS[direction.primaryFocus];
  const color = FOCUS_COLORS[direction.primaryFocus];
  const confidence = FOCUS_CONFIDENCE[direction.primaryFocus];
  
  // Border color based on focus type
  const borderColor = direction.primaryFocus === 'incident_management' ? 'border-red-500/30' :
    direction.primaryFocus === 'racecraft_traffic' ? 'border-yellow-500/30' :
    direction.primaryFocus === 'plateau_detection' ? 'border-orange-500/30' :
    'border-green-500/30';

  return (
    <div className={`border ${borderColor} bg-[#0e0e0e]/80 backdrop-blur-sm`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
            direction.primaryFocus === 'incident_management' ? 'bg-red-500/10' :
            direction.primaryFocus === 'racecraft_traffic' ? 'bg-yellow-500/10' :
            direction.primaryFocus === 'plateau_detection' ? 'bg-orange-500/10' :
            'bg-green-500/10'
          }`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-sm font-semibold uppercase tracking-wider ${color}`} style={ORBITRON}>
                {direction.label}
              </span>
              <span className="text-[9px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">
                Confidence: {confidence}
              </span>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed">{direction.action}</p>
          </div>
        </div>
      </div>
      
      {/* Why? expandable section */}
      {direction.reasons.length > 0 && (
        <div className="border-t border-white/[0.06]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-[10px] text-white/30 hover:text-white/50 hover:bg-white/[0.02] transition-colors"
          >
            <span className="uppercase tracking-wider">Why?</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          
          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              {/* Reasons */}
              <div className="space-y-2">
                {direction.reasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                    <p className="text-[11px] text-white/40">{reason}</p>
                  </div>
                ))}
              </div>
              
              {/* Incident Distribution Visual */}
              {snapshot && snapshot.avg_incidents > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="text-[9px] text-white/25 uppercase mb-2">Incident Impact Analysis</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, snapshot.avg_incidents * 15)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-amber-400">{snapshot.avg_incidents.toFixed(1)}x avg</span>
                  </div>
                  <div className="text-[10px] text-white/30">
                    {snapshot.avg_incidents > 4 
                      ? '🔴 High incident rate — focus on controlled driving'
                      : snapshot.avg_incidents > 2 
                      ? '🟡 Moderate incidents — room for improvement'
                      : '🟢 Clean racing — maintain discipline'}
                  </div>
                </div>
              )}
              
              {/* Stats Grid */}
              {snapshot && (
                <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-4 gap-3">
                  <div>
                    <div className="text-[9px] text-white/25 uppercase">Sessions</div>
                    <div className="text-xs font-mono text-white/50">{snapshot.session_count}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/25 uppercase">Avg Incidents</div>
                    <div className={`text-xs font-mono ${snapshot.avg_incidents > 3 ? 'text-red-400' : 'text-white/50'}`}>{snapshot.avg_incidents.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/25 uppercase">Avg Finish</div>
                    <div className="text-xs font-mono text-white/50">P{snapshot.avg_finish.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/25 uppercase">iR Delta</div>
                    <div className={`text-xs font-mono ${snapshot.irating_delta > 0 ? 'text-green-400' : snapshot.irating_delta < 0 ? 'text-red-400' : 'text-white/50'}`}>
                      {snapshot.irating_delta > 0 ? '+' : ''}{snapshot.irating_delta}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Deep dive link */}
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <Link 
                  to="/driver/history" 
                  className="text-[10px] text-blue-400/70 hover:text-blue-400 uppercase tracking-wider flex items-center gap-1"
                >
                  View detailed race-by-race breakdown <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RECENT PERFORMANCE (horizontal race cards)
// ═════════════════════════════════════════════════════════════════════════════

function RaceCard({ session, prevSession }: { session: DriverSessionSummary; prevSession?: DriverSessionSummary }) {
  const delta = (session.finishPos != null && session.startPos != null)
    ? session.startPos - session.finishPos
    : null;
  const laps = session.lapsComplete ?? 0;
  const incidents = session.incidents ?? 0;
  const cleanPct = laps > 0 ? Math.max(0, Math.round(((laps - incidents) / laps) * 100)) : null;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm p-4 min-w-[220px] max-w-[260px] shrink-0 hover:bg-[#0e0e0e]/90 transition-colors">
      {/* Position badge + streak */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className={`text-lg font-bold font-mono ${
            session.finishPos === 1 ? 'text-yellow-400' :
            (session.finishPos ?? 99) <= 3 ? 'text-orange-400' :
            (session.finishPos ?? 99) <= 5 ? 'text-blue-400' :
            'text-white/60'
          }`} style={ORBITRON}>
            {session.finishPos != null ? `P${session.finishPos}` : '—'}
          </div>
          {prevSession && session.iRatingChange != null && prevSession.iRatingChange != null && (
            <div className={`text-[9px] px-1 py-0.5 rounded ${
              session.iRatingChange > prevSession.iRatingChange ? 'bg-green-500/15 text-green-400' :
              session.iRatingChange < prevSession.iRatingChange ? 'bg-red-500/15 text-red-400' :
              'bg-white/5 text-white/30'
            }`}>
              {session.iRatingChange > prevSession.iRatingChange ? '▲' : session.iRatingChange < prevSession.iRatingChange ? '▼' : '—'}
            </div>
          )}
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
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
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
          {recent.map((s, i) => <RaceCard key={s.sessionId} session={s} prevSession={recent[i + 1]} />)}
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
  const { profile, sessions, stats, loading } = useDriverData();
  const displayName = profile?.displayName || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  const isLive = status === 'in_session';

  // First-time user experience
  const { hasSeenWelcome, markAsSeen } = useFirstTimeExperience('driver_landing');

  // Background video
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.6;
  }, []);

  // Performance snapshot
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null | undefined>(undefined);
  
  // Telemetry metrics for behavioral indices
  const [telemetryMetrics, setTelemetryMetrics] = useState<TelemetryMetricsResponse | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const data = await fetchPerformanceSnapshot();
      setSnapshot(data);
    } catch {
      setSnapshot(null);
    }
  }, []);
  
  const loadTelemetryMetrics = useCallback(async () => {
    try {
      const data = await fetchTelemetryMetrics('last_10');
      setTelemetryMetrics(data);
    } catch {
      setTelemetryMetrics(null);
    }
  }, []);

  useEffect(() => { loadSnapshot(); loadTelemetryMetrics(); }, [loadSnapshot, loadTelemetryMetrics]);

  // Derived intelligence
  const direction = useMemo(() => computePerformanceDirection(snapshot ?? null), [snapshot]);
  const consistency = useMemo(() => computeConsistency(snapshot ?? null, sessions), [snapshot, sessions]);
  const trendPoints = useMemo(() => buildRatingTrend(sessions), [sessions]);
  
  // Convert API telemetry response to SessionTelemetryMetrics format
  const sessionTelemetry: SessionTelemetryMetrics | null = useMemo(() => {
    if (!telemetryMetrics?.available || !telemetryMetrics.metrics) return null;
    const m = telemetryMetrics.metrics;
    return {
      sessionId: 'aggregate',
      timestamp: new Date().toISOString(),
      braking: telemetryMetrics.braking ? {
        brakeTimingScore: telemetryMetrics.braking.brakeTimingScore,
        brakePressureSmoothness: telemetryMetrics.braking.brakePressureSmoothness,
        trailBrakingStability: telemetryMetrics.braking.trailBrakingStability,
        entryOvershootScore: telemetryMetrics.braking.entryOvershootScore,
        sampleCorners: telemetryMetrics.braking.sampleCorners,
      } : null,
      throttle: telemetryMetrics.throttle ? {
        throttleModulationScore: telemetryMetrics.throttle.throttleModulationScore,
        exitTractionStability: telemetryMetrics.throttle.exitTractionStability,
        slipThrottleControl: telemetryMetrics.throttle.slipThrottleControl,
        sampleCorners: telemetryMetrics.throttle.sampleCorners,
      } : null,
      steering: telemetryMetrics.steering ? {
        turnInConsistency: telemetryMetrics.steering.turnInConsistency,
        midCornerStability: telemetryMetrics.steering.midCornerStability,
        rotationBalance: telemetryMetrics.steering.rotationBalance,
        sampleCorners: telemetryMetrics.steering.sampleCorners,
      } : null,
      rhythm: telemetryMetrics.rhythm ? {
        lapTimeConsistency: telemetryMetrics.rhythm.lapTimeConsistency,
        sectorConsistency: telemetryMetrics.rhythm.sectorConsistency,
        inputRepeatability: telemetryMetrics.rhythm.inputRepeatability,
        baselineAdherence: telemetryMetrics.rhythm.baselineAdherence,
        sampleLaps: telemetryMetrics.rhythm.sampleLaps,
      } : null,
      source: 'historical',
      telemetryConfidence: m.confidence,
    };
  }, [telemetryMetrics]);

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

        {/* DRIVER STATUS LINE — emotional anchor */}
        {!isTrainingMode && <DriverStatusLine snapshot={snapshot ?? null} sessions={sessions} telemetry={sessionTelemetry} />}

        {/* SINCE LAST SESSION — what changed */}
        {!isTrainingMode && <SinceLastSessionBlock snapshot={snapshot ?? null} sessions={sessions} />}

        {/* TRAINING MODE — consolidated onboarding (replaces all scattered empty states) */}
        {!loading && isTrainingMode && (
          <TrainingModeCard sessionCount={sessionCount} />
        )}

        {/* PERFORMANCE RISK ALERT (hero section) */}
        {!isTrainingMode && direction.primaryFocus !== 'needs_data' && (
          <PerformanceDirectiveCard direction={direction} snapshot={snapshot ?? null} />
        )}

        {/* INTELLIGENCE BRIEF LAYOUT - Focused, single-column flow */}
        
        {/* PERFORMANCE ATTRIBUTES (max 3 bars) */}
        {!isTrainingMode && snapshot && (
          <PerformanceAttributesCompact snapshot={snapshot} sessions={sessions} />
        )}

        {/* CREW INTELLIGENCE PREVIEW */}
        {sessionCount > 0 && (
          <CrewPreviewPanel sessions={sessions} focus={direction.primaryFocus} telemetry={sessionTelemetry} />
        )}

        {/* COMPETITIVE TREND */}
        <FiveRaceTrendSummary sessions={sessions} loading={loading} />

        {/* NEXT ACTION */}
        {!isTrainingMode && direction.primaryFocus !== 'needs_data' && (
          <NextActionBlock direction={direction} snapshot={snapshot ?? null} />
        )}

        {/* LICENSES (compact) */}
        <LicensesCompactPanel profile={profile} />

        {/* iRATING TREND */}
        {!loading && <IRatingSparkline points={trendPoints} />}

        {/* VALUE SIGNALS (CFO audit: show depth of analysis) */}
        {!loading && <ValueSignalStrip sessions={sessions} stats={stats} hasTelemetry={!!telemetryMetrics?.available} />}

        {/* BUILD IDENTIFIER */}
        <div className="fixed bottom-2 right-2 z-50 px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-mono text-white/40">
          v{__APP_VERSION__}.{__GIT_COMMIT__?.slice(0, 7) || 'dev'}
        </div>
      </div>

      {/* First-time user welcome modal */}
      {!hasSeenWelcome && (
        <DriverWelcome displayName={displayName} onComplete={markAsSeen} />
      )}
    </div>
  );
}
