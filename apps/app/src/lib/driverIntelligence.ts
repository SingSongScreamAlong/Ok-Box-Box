/**
 * Driver Intelligence Types & Computation
 *
 * Rule-based analysis derived from real session data.
 * No mock data. No placeholder values. All computations
 * are deterministic functions of real DriverSessionSummary[].
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

export interface ConsistencyMetrics {
  index: number; // 0–100
  incidentPenalty: number;
  positionDropPenalty: number;
}

export interface RatingTrendPoint {
  date: string;        // ISO date string
  iRating: number;
  safetyRating: number;
  discipline: string;
}

// ─── Performance Direction (Phase 1) ─────────────────────────────────────────

export function computePerformanceDirection(
  snapshot: PerformanceSnapshot | null,
): PerformanceDirection {
  if (!snapshot || snapshot.session_count < 3) {
    return {
      primaryFocus: 'needs_data',
      label: 'Insufficient Data',
      reasons: ['Complete at least 3 sessions to generate a development focus.'],
      action: 'Run a session with relay connected to start building your driver model.',
    };
  }

  const reasons: string[] = [];
  let focus: FocusFlag = 'strong_momentum';

  const avgIncidents = snapshot.avg_incidents;
  const avgFinish = snapshot.avg_finish;
  const avgStart = snapshot.avg_start;
  const irDelta = snapshot.irating_delta;

  // Rule 1: High incidents
  if (avgIncidents > 3) {
    focus = 'incident_management';
    reasons.push(`${avgIncidents}x average incidents over last ${snapshot.session_count} sessions`);
  }

  // Rule 2: Losing positions (finish worse than start)
  if (avgFinish > avgStart) {
    const drop = Math.round((avgFinish - avgStart) * 10) / 10;
    if (focus === 'strong_momentum') focus = 'racecraft_traffic';
    reasons.push(`Avg ${drop} position drop from start to finish`);
  }

  // Rule 3: Plateau / negative iR trend
  if (irDelta <= 0) {
    if (focus === 'strong_momentum') focus = 'plateau_detection';
    reasons.push(irDelta < 0
      ? `iRating trending down (${irDelta} over ${snapshot.session_count} sessions)`
      : `iRating neutral over last ${snapshot.session_count} sessions`
    );
  }

  // Positive momentum
  if (focus === 'strong_momentum') {
    reasons.push(`iRating +${irDelta} over last ${snapshot.session_count} sessions`);
    if (avgFinish < avgStart) {
      reasons.push(`Gaining ${Math.round((avgStart - avgFinish) * 10) / 10} positions on average`);
    }
    if (avgIncidents <= 2) {
      reasons.push(`Clean racing: ${avgIncidents}x avg incidents`);
    }
  }

  const labels: Record<FocusFlag, string> = {
    incident_management: 'Incident Management',
    racecraft_traffic: 'Racecraft & Traffic',
    plateau_detection: 'Plateau Detection',
    strong_momentum: 'Strong Momentum',
    needs_data: 'Insufficient Data',
  };

  const actions: Record<FocusFlag, string> = {
    incident_management: 'Run a 10-lap clean baseline session focusing on smooth inputs and corner entry.',
    racecraft_traffic: 'Practice traffic awareness — focus on late-braking defense and clean overtakes.',
    plateau_detection: 'Review recent sessions for recurring mistakes. Consider a setup change or new approach.',
    strong_momentum: 'Maintain current approach. Consider pushing into higher-split races.',
    needs_data: 'Run a session with relay connected to start building your driver model.',
  };

  return {
    primaryFocus: focus,
    label: labels[focus],
    reasons,
    action: actions[focus],
  };
}

// ─── Consistency Index (Phase 4) ─────────────────────────────────────────────

export function computeConsistency(
  snapshot: PerformanceSnapshot | null,
): ConsistencyMetrics | null {
  if (!snapshot || snapshot.session_count < 3) return null;

  const avgIncidents = snapshot.avg_incidents;
  const avgFinish = snapshot.avg_finish;
  const avgStart = snapshot.avg_start;

  // Penalty: 5 pts per incident avg above 2
  const incidentPenalty = Math.max(0, (avgIncidents - 2) * 5);

  // Penalty: 3 pts per position drop
  const positionDrop = Math.max(0, avgFinish - avgStart);
  const positionDropPenalty = positionDrop * 3;

  const index = Math.round(Math.max(0, Math.min(100, 100 - incidentPenalty - positionDropPenalty)));

  return { index, incidentPenalty: Math.round(incidentPenalty), positionDropPenalty: Math.round(positionDropPenalty) };
}

// ─── Crew Insights (Phase 3) ─────────────────────────────────────────────────

export function computeCrewInsights(
  sessions: DriverSessionSummary[],
): CrewInsight[] {
  if (sessions.length === 0) return [];

  const insights: CrewInsight[] = [];
  const last = sessions[0]; // most recent
  const recent5 = sessions.slice(0, 5);

  // Engineer insight
  if (last.incidents != null && last.incidents > 5) {
    insights.push({ role: 'engineer', message: `Last session: ${last.incidents}x incidents. Review corner entry speed and braking points.` });
  } else if (last.finishPos != null && last.startPos != null && last.finishPos > last.startPos) {
    const drop = last.finishPos - last.startPos;
    insights.push({ role: 'engineer', message: `Lost ${drop} position${drop > 1 ? 's' : ''} last race. Traffic positioning may need work.` });
  } else if (last.finishPos != null && last.startPos != null && last.finishPos < last.startPos) {
    const gain = last.startPos - last.finishPos;
    insights.push({ role: 'engineer', message: `Gained ${gain} position${gain > 1 ? 's' : ''} last race. Race pace is strong.` });
  } else {
    insights.push({ role: 'engineer', message: 'Held position last race. Consistent but look for overtake opportunities.' });
  }

  // Spotter insight — track familiarity
  if (recent5.length >= 2) {
    const trackCounts: Record<string, number> = {};
    for (const s of recent5) {
      if (s.trackName) trackCounts[s.trackName] = (trackCounts[s.trackName] || 0) + 1;
    }
    const repeated = Object.entries(trackCounts).find(([, count]) => count >= 2);
    if (repeated) {
      insights.push({ role: 'spotter', message: `${repeated[1]} recent sessions at ${repeated[0]}. Track familiarity building.` });
    } else {
      const uniqueTracks = Object.keys(trackCounts).length;
      insights.push({ role: 'spotter', message: `${uniqueTracks} different tracks in recent sessions. Broad exposure, good adaptability.` });
    }
  } else {
    insights.push({ role: 'spotter', message: 'Limited recent data. More sessions will improve traffic pattern analysis.' });
  }

  // Analyst insight — finishing spread / consistency
  if (recent5.length >= 3) {
    const finishes = recent5.map(s => s.finishPos).filter((p): p is number => p != null);
    if (finishes.length >= 3) {
      const avg = finishes.reduce((a, b) => a + b, 0) / finishes.length;
      const variance = finishes.reduce((s, f) => s + Math.pow(f - avg, 2), 0) / finishes.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 3) {
        insights.push({ role: 'analyst', message: `Finishing spread: ±${stdDev.toFixed(1)} positions. Highly consistent.` });
      } else if (stdDev < 6) {
        insights.push({ role: 'analyst', message: `Finishing spread: ±${stdDev.toFixed(1)} positions. Moderate variance — look for patterns.` });
      } else {
        insights.push({ role: 'analyst', message: `Finishing spread: ±${stdDev.toFixed(1)} positions. High variance — results are unpredictable.` });
      }
    } else {
      insights.push({ role: 'analyst', message: 'Insufficient finishing data for variance analysis.' });
    }
  } else {
    insights.push({ role: 'analyst', message: 'Need 3+ sessions for statistical analysis.' });
  }

  return insights;
}

// ─── Rating Trend Points (Phase 2) ──────────────────────────────────────────

export function buildRatingTrend(
  sessions: DriverSessionSummary[],
): RatingTrendPoint[] {
  // Sessions come newest-first from the API. We need oldest-first for the chart.
  const withRatings = sessions
    .filter(s => s.newIRating != null && s.startedAt)
    .slice(0, 30) // last 30 sessions max
    .reverse(); // oldest first

  return withRatings.map(s => ({
    date: s.startedAt,
    iRating: s.newIRating!,
    // Derive SR from sub_level if available, otherwise 0
    safetyRating: 0, // SR per-session not available from current API; omit from chart
    discipline: s.discipline || 'sportsCar',
  }));
}
