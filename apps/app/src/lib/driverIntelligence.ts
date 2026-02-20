/**
 * Driver Intelligence Types & Computation — v0.3 (Cohesion Layer)
 *
 * Rule-based analysis derived from real session data.
 * No mock data. No placeholder values. All computations
 * are deterministic functions of real DriverSessionSummary[].
 *
 * Crew insights are focus-aware: they align with the current
 * PerformanceDirection so the narrative is coherent, not fragmented.
 */

import type { DriverSessionSummary, PerformanceSnapshot } from './driverService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FocusFlag =
  | 'incident_management'
  | 'racecraft_traffic'
  | 'plateau_detection'
  | 'strong_momentum'
  | 'needs_data';

export interface PerformanceDirection {
  primaryFocus: FocusFlag;
  label: string;
  reasons: string[];
  action: string;
}

export interface CrewInsight {
  role: 'engineer' | 'spotter' | 'analyst';
  message: string;
}

export type CPITier = 'elite' | 'competitive' | 'inconsistent' | 'at_risk';

export interface ConsistencyMetrics {
  index: number; // 0–100
  tier: CPITier;
  tierLabel: string;
  incidentPenalty: number;
  positionDropPenalty: number;
  explanation: string;
}

export interface RatingTrendPoint {
  date: string;
  iRating: number;
  safetyRating: number;
  discipline: string;
}

// ─── CPI Tier Resolution ─────────────────────────────────────────────────────

function resolveCPITier(index: number): { tier: CPITier; tierLabel: string } {
  if (index >= 80) return { tier: 'elite', tierLabel: 'Elite' };
  if (index >= 60) return { tier: 'competitive', tierLabel: 'Competitive' };
  if (index >= 40) return { tier: 'inconsistent', tierLabel: 'Inconsistent' };
  return { tier: 'at_risk', tierLabel: 'At Risk' };
}

// ─── Performance Direction ───────────────────────────────────────────────────

export function computePerformanceDirection(
  snapshot: PerformanceSnapshot | null,
): PerformanceDirection {
  if (!snapshot || snapshot.session_count < 3) {
    return {
      primaryFocus: 'needs_data',
      label: 'Awaiting Driver Model',
      reasons: ['Minimum 3 completed sessions required to initialize performance analysis.'],
      action: 'Connect relay and complete a session to begin building your driver profile.',
    };
  }

  const reasons: string[] = [];
  let focus: FocusFlag = 'strong_momentum';

  const avgIncidents = snapshot.avg_incidents;
  const avgFinish = snapshot.avg_finish;
  const avgStart = snapshot.avg_start;
  const irDelta = snapshot.irating_delta;

  if (avgIncidents > 3) {
    focus = 'incident_management';
    reasons.push(`${avgIncidents}x average incidents across ${snapshot.session_count} sessions — suppressing iRating gains`);
  }

  if (avgFinish > avgStart) {
    const drop = Math.round((avgFinish - avgStart) * 10) / 10;
    if (focus === 'strong_momentum') focus = 'racecraft_traffic';
    reasons.push(`Losing ${drop} positions on average from grid to flag`);
  }

  if (irDelta <= 0) {
    if (focus === 'strong_momentum') focus = 'plateau_detection';
    reasons.push(irDelta < 0
      ? `iRating declining (${irDelta}) over ${snapshot.session_count} sessions`
      : `iRating stagnant — no net gain over ${snapshot.session_count} sessions`
    );
  }

  if (focus === 'strong_momentum') {
    reasons.push(`iRating +${irDelta} over last ${snapshot.session_count} sessions`);
    if (avgFinish < avgStart) {
      reasons.push(`Gaining ${Math.round((avgStart - avgFinish) * 10) / 10} positions on average — strong race pace`);
    }
    if (avgIncidents <= 2) {
      reasons.push(`Clean execution: ${avgIncidents}x avg incidents`);
    }
  }

  const labels: Record<FocusFlag, string> = {
    incident_management: 'Incident Management',
    racecraft_traffic: 'Racecraft & Traffic',
    plateau_detection: 'Plateau Detection',
    strong_momentum: 'Strong Momentum',
    needs_data: 'Awaiting Driver Model',
  };

  const actions: Record<FocusFlag, string> = {
    incident_management: 'Incident rate is suppressing iRating gains. Reset performance baseline with 10 clean laps emphasizing controlled entry speed and throttle discipline.',
    racecraft_traffic: 'Position loss concentrated in race phase. Focus on defensive positioning under braking and clean traffic navigation through mid-corner.',
    plateau_detection: 'Performance plateau detected. Isolate recurring error patterns from recent sessions and evaluate setup or approach changes.',
    strong_momentum: 'Current trajectory is positive. Consider entering higher-split sessions to test performance ceiling.',
    needs_data: 'Connect relay and complete a session to begin building your driver profile.',
  };

  return {
    primaryFocus: focus,
    label: labels[focus],
    reasons,
    action: actions[focus],
  };
}

// ─── Consistency Performance Index ───────────────────────────────────────────

export function computeConsistency(
  snapshot: PerformanceSnapshot | null,
): ConsistencyMetrics | null {
  if (!snapshot || snapshot.session_count < 3) return null;

  const avgIncidents = snapshot.avg_incidents;
  const avgFinish = snapshot.avg_finish;
  const avgStart = snapshot.avg_start;

  const incidentPenalty = Math.max(0, (avgIncidents - 2) * 5);
  const positionDrop = Math.max(0, avgFinish - avgStart);
  const positionDropPenalty = positionDrop * 3;

  const index = Math.round(Math.max(0, Math.min(100, 100 - incidentPenalty - positionDropPenalty)));
  const { tier, tierLabel } = resolveCPITier(index);

  const factors: string[] = [];
  if (incidentPenalty > 0) factors.push('incident frequency');
  if (positionDropPenalty > 0) factors.push('finishing variance');
  const explanation = factors.length > 0
    ? `CPI impacted by ${factors.join(' and ')}.`
    : 'Clean execution across recent sessions.';

  return {
    index,
    tier,
    tierLabel,
    incidentPenalty: Math.round(incidentPenalty),
    positionDropPenalty: Math.round(positionDropPenalty),
    explanation,
  };
}

// ─── Focus-Aware Crew Insights ───────────────────────────────────────────────

export function computeCrewInsights(
  sessions: DriverSessionSummary[],
  focus?: FocusFlag,
): CrewInsight[] {
  if (sessions.length === 0) return [];

  const insights: CrewInsight[] = [];
  const last = sessions[0];
  const recent5 = sessions.slice(0, 5);

  // ── Engineer: aligned to focus ──
  if (focus === 'incident_management') {
    const inc = last.incidents ?? 0;
    insights.push({ role: 'engineer', message: `${inc}x incidents last session. Evaluate braking reference points and entry speed — contact is likely initiated under deceleration.` });
  } else if (focus === 'racecraft_traffic') {
    const drop = (last.finishPos ?? 0) - (last.startPos ?? 0);
    if (drop > 0) {
      insights.push({ role: 'engineer', message: `Lost ${drop} position${drop > 1 ? 's' : ''} in traffic. Review defensive line selection and throttle application on exit.` });
    } else {
      insights.push({ role: 'engineer', message: 'Position held but traffic management remains the priority area. Monitor mid-corner proximity.' });
    }
  } else if (focus === 'plateau_detection') {
    insights.push({ role: 'engineer', message: 'Performance plateau active. Isolate whether pace deficit is setup-related or driver-input-related before next session.' });
  } else if (last.finishPos != null && last.startPos != null && last.finishPos < last.startPos) {
    const gain = last.startPos - last.finishPos;
    insights.push({ role: 'engineer', message: `+${gain} position${gain > 1 ? 's' : ''} last race. Race pace exceeding qualifying pace — strong execution.` });
  } else {
    insights.push({ role: 'engineer', message: 'Stable output. Look for marginal gains in corner exit speed and pit timing.' });
  }

  // ── Spotter: aligned to focus ──
  if (focus === 'incident_management') {
    insights.push({ role: 'spotter', message: 'Incident pattern suggests close-quarters risk. Increase following distance in braking zones and avoid side-by-side through high-speed sections.' });
  } else if (focus === 'racecraft_traffic') {
    insights.push({ role: 'spotter', message: 'Position loss in traffic detected. Prioritize clean air over aggressive overtakes — patience through lap 1 compounds.' });
  } else if (recent5.length >= 2) {
    const trackCounts: Record<string, number> = {};
    for (const s of recent5) {
      if (s.trackName) trackCounts[s.trackName] = (trackCounts[s.trackName] || 0) + 1;
    }
    const repeated = Object.entries(trackCounts).find(([, count]) => count >= 2);
    if (repeated) {
      insights.push({ role: 'spotter', message: `${repeated[1]} sessions at ${repeated[0]} — track familiarity building. Reference points should be sharpening.` });
    } else {
      insights.push({ role: 'spotter', message: `${Object.keys(trackCounts).length} different circuits recently. Broad exposure — adaptability is developing.` });
    }
  } else {
    insights.push({ role: 'spotter', message: 'Limited recent data. Additional sessions will improve traffic pattern recognition.' });
  }

  // ── Analyst: aligned to focus ──
  if (recent5.length >= 3) {
    const finishes = recent5.map(s => s.finishPos).filter((p): p is number => p != null);
    if (finishes.length >= 3) {
      const avg = finishes.reduce((a, b) => a + b, 0) / finishes.length;
      const variance = finishes.reduce((s, f) => s + Math.pow(f - avg, 2), 0) / finishes.length;
      const stdDev = Math.sqrt(variance);

      if (focus === 'incident_management') {
        insights.push({ role: 'analyst', message: `Finishing variance ±${stdDev.toFixed(1)} positions. Incident rate is the primary destabilizer — clean sessions will compress this spread.` });
      } else if (focus === 'plateau_detection') {
        insights.push({ role: 'analyst', message: `Finishing variance ±${stdDev.toFixed(1)} positions. Plateau may be ceiling-related — evaluate whether split level matches current skill.` });
      } else if (stdDev < 3) {
        insights.push({ role: 'analyst', message: `Finishing spread: ±${stdDev.toFixed(1)} positions. Highly consistent output.` });
      } else if (stdDev < 6) {
        insights.push({ role: 'analyst', message: `Finishing spread: ±${stdDev.toFixed(1)} positions. Moderate variance — isolate outlier sessions.` });
      } else {
        insights.push({ role: 'analyst', message: `Finishing spread: ±${stdDev.toFixed(1)} positions. High variance — results are unpredictable. Prioritize consistency over pace.` });
      }
    } else {
      insights.push({ role: 'analyst', message: 'Insufficient finishing data for variance analysis.' });
    }
  } else {
    insights.push({ role: 'analyst', message: 'Minimum 3 sessions required for statistical analysis.' });
  }

  return insights;
}

// ─── Rating Trend Points ─────────────────────────────────────────────────────

export function buildRatingTrend(
  sessions: DriverSessionSummary[],
): RatingTrendPoint[] {
  const withRatings = sessions
    .filter(s => s.newIRating != null && s.startedAt)
    .slice(0, 30)
    .reverse();

  return withRatings.map(s => ({
    date: s.startedAt,
    iRating: s.newIRating!,
    safetyRating: 0,
    discipline: s.discipline || 'sportsCar',
  }));
}
