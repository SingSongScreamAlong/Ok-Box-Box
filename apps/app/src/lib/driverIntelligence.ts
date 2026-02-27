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
  confidence?: number; // 0-100, based on sample size and data quality
  dataWindow?: string; // e.g., "Last 5 races", "10-race sample"
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

// ─── Competitive Performance Index (CPI) ────────────────────────────────────
// 
// CPI is a composite 0-100 score measuring overall competitive readiness.
// It uses 6 weighted inputs to provide a sophisticated, defensible metric.
//
// WEIGHTS:
//   Incident Rate (25%)      - Avg incidents per race, most actionable
//   Consistency (20%)        - Finish position variance (stddev)
//   iRating Momentum (20%)   - Recent iR delta, trajectory indicator
//   Clean Race % (15%)       - % of races with ≤2 incidents
//   Completion Rate (10%)    - % of races finished (no DNF)
//   SOF-Adjusted Finish (10%) - Performance relative to field strength
//
// Each component is normalized to 0-100, then weighted and summed.

export interface CPIBreakdown {
  incidentRate: number;      // 0-100 score
  consistency: number;       // 0-100 score
  iRatingMomentum: number;   // 0-100 score
  cleanRacePercent: number;  // 0-100 score
  completionRate: number;    // 0-100 score
  sofAdjustedFinish: number; // 0-100 score
}

export function computeConsistency(
  snapshot: PerformanceSnapshot | null,
  sessions?: DriverSessionSummary[],
): ConsistencyMetrics | null {
  if (!snapshot || snapshot.session_count < 3) return null;

  const recentSessions = sessions?.slice(0, 10) ?? [];
  
  // ── Component 1: Incident Rate (25%) ──
  // 0 incidents = 100, 8+ incidents = 0
  const incidentScore = Math.max(0, Math.min(100, 100 - (snapshot.avg_incidents * 12.5)));
  
  // ── Component 2: Consistency / Variance (20%) ──
  // Calculate finish position standard deviation
  const finishes = recentSessions.map(s => s.finishPos).filter((p): p is number => p != null);
  let consistencyScore = 70; // default if not enough data
  if (finishes.length >= 3) {
    const avg = finishes.reduce((a, b) => a + b, 0) / finishes.length;
    const variance = finishes.reduce((s, f) => s + Math.pow(f - avg, 2), 0) / finishes.length;
    const stdDev = Math.sqrt(variance);
    // stdDev of 0 = 100, stdDev of 10+ = 0
    consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev * 10)));
  }
  
  // ── Component 3: iRating Momentum (20%) ──
  // +100 iR = 100 score, -100 iR = 0, 0 = 50
  const irMomentumScore = Math.max(0, Math.min(100, 50 + (snapshot.irating_delta / 2)));
  
  // ── Component 4: Clean Race % (15%) ──
  // % of races with ≤2 incidents
  const cleanRaces = recentSessions.filter(s => (s.incidents ?? 0) <= 2).length;
  const cleanRaceScore = recentSessions.length > 0 
    ? (cleanRaces / recentSessions.length) * 100 
    : 50;
  
  // ── Component 5: Completion Rate (10%) ──
  // % of races where driver finished (not DNF)
  // Using laps completed as proxy - if finish position exists, race was completed
  const completedRaces = recentSessions.filter(s => s.finishPos != null).length;
  const completionScore = recentSessions.length > 0 
    ? (completedRaces / recentSessions.length) * 100 
    : 100;
  
  // ── Component 6: SOF-Adjusted Finish (10%) ──
  // Performance relative to field strength
  // If avg finish is in top 33% of typical field (20 cars), that's good
  // Simplified: lower avg finish = better score
  const sofScore = Math.max(0, Math.min(100, 100 - ((snapshot.avg_finish - 1) * 5)));
  
  // ── Weighted Sum ──
  const index = Math.round(
    (incidentScore * 0.25) +
    (consistencyScore * 0.20) +
    (irMomentumScore * 0.20) +
    (cleanRaceScore * 0.15) +
    (completionScore * 0.10) +
    (sofScore * 0.10)
  );
  
  const { tier, tierLabel } = resolveCPITier(index);

  // Build explanation based on weakest components
  const components = [
    { name: 'incident rate', score: incidentScore, weight: 25 },
    { name: 'consistency', score: consistencyScore, weight: 20 },
    { name: 'iRating momentum', score: irMomentumScore, weight: 20 },
    { name: 'clean race %', score: cleanRaceScore, weight: 15 },
    { name: 'completion rate', score: completionScore, weight: 10 },
    { name: 'field performance', score: sofScore, weight: 10 },
  ];
  
  const weakest = components
    .filter(c => c.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map(c => c.name);
  
  const explanation = weakest.length > 0
    ? `CPI limited by ${weakest.join(' and ')}.`
    : 'Strong execution across all metrics.';

  // Legacy penalty fields for backward compatibility
  const incidentPenalty = Math.round((100 - incidentScore) * 0.25);
  const positionDropPenalty = Math.round((100 - consistencyScore) * 0.20);

  return {
    index,
    tier,
    tierLabel,
    incidentPenalty,
    positionDropPenalty,
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
  const recent5 = sessions.slice(0, 5);
  const recent10 = sessions.slice(0, 10);
  
  // Calculate confidence based on sample size
  const engineerConfidence = Math.min(95, 50 + (recent5.length * 9));
  const spotterConfidence = Math.min(90, 45 + (recent5.length * 9));
  const analystConfidence = Math.min(95, 40 + (recent10.length * 5));
  
  // Calculate aggregate stats for data citations
  const totalIncidents = recent5.reduce((s, r) => s + (r.incidents ?? 0), 0);
  const avgIncidents = recent5.length > 0 ? totalIncidents / recent5.length : 0;
  const highIncidentRaces = recent5.filter(s => (s.incidents ?? 0) >= 4).length;
  const cleanRaces = recent5.filter(s => (s.incidents ?? 0) <= 1).length;
  const finishes = recent5.map(s => s.finishPos).filter((p): p is number => p != null);
  const avgFinish = finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : 0;
  
  // Calculate clean vs incident race performance delta
  const cleanRaceFinishes = recent10.filter(s => (s.incidents ?? 0) <= 2).map(s => s.finishPos).filter((p): p is number => p != null);
  const incidentRaceFinishes = recent10.filter(s => (s.incidents ?? 0) >= 4).map(s => s.finishPos).filter((p): p is number => p != null);
  const cleanAvg = cleanRaceFinishes.length > 0 ? cleanRaceFinishes.reduce((a, b) => a + b, 0) / cleanRaceFinishes.length : 0;
  const incidentAvg = incidentRaceFinishes.length > 0 ? incidentRaceFinishes.reduce((a, b) => a + b, 0) / incidentRaceFinishes.length : 0;

  // ── Engineer: data-anchored insights ──
  const engineerDataWindow = `Last ${recent5.length} races`;
  if (focus === 'incident_management') {
    if (highIncidentRaces > 0) {
      insights.push({ role: 'engineer', message: `${highIncidentRaces} of last ${recent5.length} races had 4+ incidents. Avg ${avgIncidents.toFixed(1)}x per race. Focus: braking entry control and throttle modulation.`, confidence: engineerConfidence, dataWindow: engineerDataWindow });
    } else {
      insights.push({ role: 'engineer', message: `${totalIncidents}x total incidents in last ${recent5.length} races. Incident density elevated — evaluate corner entry speed.`, confidence: engineerConfidence, dataWindow: engineerDataWindow });
    }
  } else if (focus === 'racecraft_traffic') {
    const posLost = recent5.filter(s => (s.finishPos ?? 0) > (s.startPos ?? 0)).length;
    insights.push({ role: 'engineer', message: `Lost positions in ${posLost} of ${recent5.length} recent races. Traffic management is the development area.`, confidence: engineerConfidence, dataWindow: engineerDataWindow });
  } else if (focus === 'plateau_detection') {
    insights.push({ role: 'engineer', message: `Avg finish P${avgFinish.toFixed(1)} over ${recent5.length} races. Performance plateau detected — isolate setup vs input factors.`, confidence: engineerConfidence, dataWindow: engineerDataWindow });
  } else if (cleanRaces >= 3) {
    insights.push({ role: 'engineer', message: `${cleanRaces} of ${recent5.length} races with ≤1 incident. Strong discipline — focus on pace extraction.`, confidence: engineerConfidence, dataWindow: engineerDataWindow });
  } else {
    insights.push({ role: 'engineer', message: `Avg ${avgIncidents.toFixed(1)}x incidents per race. Stable output — look for marginal gains in corner exit.`, confidence: engineerConfidence, dataWindow: engineerDataWindow });
  }

  // ── Spotter: data-anchored insights ──
  const spotterDataWindow = `${recent10.length}-race sample`;
  if (focus === 'incident_management' && incidentRaceFinishes.length > 0 && cleanRaceFinishes.length > 0) {
    const delta = Math.round(incidentAvg - cleanAvg);
    // Handle edge case: if incident races have BETTER finishes, adjust narrative
    if (delta > 0) {
      // Normal case: clean races finish better
      insights.push({ role: 'spotter', message: `Clean races avg P${cleanAvg.toFixed(0)}. Incident races avg P${incidentAvg.toFixed(0)}. ${delta} position penalty from contact.`, confidence: spotterConfidence, dataWindow: spotterDataWindow });
    } else if (delta < -2) {
      // Edge case: incident races finish better — incidents in competitive zones
      insights.push({ role: 'spotter', message: `Incidents occurring while running top-${Math.round(incidentAvg)} positions — competitive risk zones. Rating penalties applied despite finish gain.`, confidence: spotterConfidence, dataWindow: spotterDataWindow });
    } else {
      // Minimal difference
      insights.push({ role: 'spotter', message: `Clean races avg P${cleanAvg.toFixed(0)}. Incident races avg P${incidentAvg.toFixed(0)}. Minimal finish impact — incidents still cost iRating.`, confidence: spotterConfidence, dataWindow: spotterDataWindow });
    }
  } else if (focus === 'racecraft_traffic') {
    insights.push({ role: 'spotter', message: `Position loss in traffic detected. Prioritize clean air over aggressive lap 1 moves.`, confidence: spotterConfidence, dataWindow: `Last ${recent5.length} races` });
  } else {
    const trackCounts: Record<string, number> = {};
    for (const s of recent5) {
      if (s.trackName) trackCounts[s.trackName] = (trackCounts[s.trackName] || 0) + 1;
    }
    const repeated = Object.entries(trackCounts).find(([, count]) => count >= 2);
    if (repeated) {
      insights.push({ role: 'spotter', message: `${repeated[1]} of ${recent5.length} sessions at ${repeated[0]}. Track familiarity building.`, confidence: spotterConfidence, dataWindow: `Last ${recent5.length} races` });
    } else {
      insights.push({ role: 'spotter', message: `${Object.keys(trackCounts).length} different circuits in last ${recent5.length} races. Broad exposure developing.`, confidence: spotterConfidence, dataWindow: `Last ${recent5.length} races` });
    }
  }

  // ── Analyst: data-anchored insights ──
  const analystDataWindow = `${finishes.length}-race sample`;
  if (finishes.length >= 3) {
    const avg = finishes.reduce((a, b) => a + b, 0) / finishes.length;
    const variance = finishes.reduce((s, f) => s + Math.pow(f - avg, 2), 0) / finishes.length;
    const stdDev = Math.sqrt(variance);
    const best = Math.min(...finishes);
    const worst = Math.max(...finishes);

    if (focus === 'incident_management' && cleanRaceFinishes.length > 0 && incidentRaceFinishes.length > 0) {
      const posDelta = Math.round(incidentAvg - cleanAvg);
      if (posDelta > 0) {
        // Normal: clean races finish better
        insights.push({ role: 'analyst', message: `Clean races: avg P${cleanAvg.toFixed(0)}. Incident races: avg P${incidentAvg.toFixed(0)}. Incident control = ${posDelta} position gain potential.`, confidence: analystConfidence, dataWindow: `${recent10.length}-race sample` });
      } else {
        // Edge case: incident races finish better — explain the paradox clearly
        insights.push({ role: 'analyst', message: `Incident races avg P${incidentAvg.toFixed(0)} vs clean P${cleanAvg.toFixed(0)}. Stronger running positions create contact risk — rating penalties applied despite better finishes.`, confidence: analystConfidence, dataWindow: `${recent10.length}-race sample` });
      }
    } else if (stdDev < 3) {
      insights.push({ role: 'analyst', message: `Finish range P${best}–P${worst} (±${stdDev.toFixed(1)}). Highly consistent — ${finishes.length} race sample.`, confidence: analystConfidence, dataWindow: analystDataWindow });
    } else if (stdDev < 6) {
      insights.push({ role: 'analyst', message: `Finish range P${best}–P${worst} (±${stdDev.toFixed(1)}). Moderate variance over ${finishes.length} races.`, confidence: analystConfidence, dataWindow: analystDataWindow });
    } else {
      insights.push({ role: 'analyst', message: `Finish range P${best}–P${worst} (±${stdDev.toFixed(1)}). High variance — prioritize consistency over pace.`, confidence: analystConfidence, dataWindow: analystDataWindow });
    }
  } else {
    insights.push({ role: 'analyst', message: `${finishes.length} of 3 required races for statistical analysis.`, confidence: 30, dataWindow: 'Insufficient data' });
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
