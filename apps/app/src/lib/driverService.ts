import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

export type DriverDiscipline = 'oval' | 'sportsCar' | 'formula' | 'dirtOval' | 'dirtRoad';

export interface DriverLicense {
  discipline: DriverDiscipline;
  licenseClass: string;
  safetyRating: number;
  iRating: number | null;
}

export interface DriverIdentityProfile {
  driverId: string;
  displayName: string;
  custId?: number;
  memberSince?: string;
  primaryDiscipline?: DriverDiscipline;
  timezone?: string;
  safetyRatingOverall?: number;
  iRatingOverall?: number;
  licenses: DriverLicense[];
}

export interface DriverSessionSummary {
  sessionId: string;
  startedAt: string;
  trackName: string;
  trackConfig?: string;
  seriesName: string;
  discipline: DriverDiscipline;
  startPos?: number;
  finishPos?: number;
  incidents?: number;
  iRatingChange?: number;
  newIRating?: number;
  oldIRating?: number;
  strengthOfField?: number;
  fieldSize?: number;
  carName?: string;
  lapsComplete?: number;
  lapsLead?: number;
  eventType?: string;
}

export interface DriverStatsSnapshot {
  discipline: DriverDiscipline;
  starts: number;
  wins: number;
  top5s: number;
  poles: number;
  avgStart: number;
  avgFinish: number;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  return {};
}

// NO DEMO DATA - Real racing system only shows real data

export async function fetchDriverProfile(): Promise<DriverIdentityProfile | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[IDP] No auth token');
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me`, {
      headers: {
        ...auth,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('[IDP] API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    return {
      driverId: data.id || '',
      displayName: data.display_name || '',
      custId: data.iracing_cust_id,
      memberSince: data.member_since,
      primaryDiscipline: data.primary_discipline,
      timezone: data.timezone,
      safetyRatingOverall: data.safety_rating_overall,
      iRatingOverall: data.irating_overall,
      licenses: data.licenses || [],
    };
  } catch (error) {
    console.error('[IDP] Error fetching profile:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function fetchDriverSessions(): Promise<DriverSessionSummary[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[IDP] No auth token');
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/sessions?limit=50`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[IDP] Sessions API error:', response.status);
      return [];
    }

    const data = await response.json();
    const sessions = data.sessions || [];

    return sessions.map((s: any) => ({
      sessionId: String(s.session_id || s.id || ''),
      startedAt: String(s.started_at || ''),
      trackName: String(s.track_name || ''),
      trackConfig: s.track_config || undefined,
      seriesName: String(s.series_name || ''),
      discipline: (s.discipline || 'sportsCar') as DriverDiscipline,
      startPos: s.start_pos ?? s.starting_position,
      finishPos: s.finish_pos ?? s.finishing_position,
      incidents: s.incidents ?? s.incident_count,
      iRatingChange: s.irating_change ?? undefined,
      newIRating: s.new_irating ?? undefined,
      oldIRating: s.old_irating ?? undefined,
      strengthOfField: s.strength_of_field ?? undefined,
      fieldSize: s.field_size ?? undefined,
      carName: s.car_name || undefined,
      lapsComplete: s.laps_complete ?? undefined,
      lapsLead: s.laps_lead ?? undefined,
      eventType: s.event_type || undefined,
    }));
  } catch (error) {
    console.error('[IDP] Error fetching sessions:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function fetchDriverStats(): Promise<DriverStatsSnapshot[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[IDP] No auth token');
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/stats`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[IDP] Stats API error:', response.status);
      return [];
    }

    const data = await response.json();
    const disciplines = data.disciplines || [];

    return disciplines.map((d: any) => ({
      discipline: (d.discipline || 'sportsCar') as DriverDiscipline,
      starts: d.starts || 0,
      wins: d.wins || 0,
      top5s: d.top5s || 0,
      poles: d.poles || 0,
      avgStart: d.avgStart || 0,
      avgFinish: d.avgFinish || 0,
    }));
  } catch (error) {
    console.error('[IDP] Error fetching stats:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Performance snapshot from last N sessions
export interface PerformanceSnapshotSession {
  finish_position: number;
  start_position: number;
  incidents: number;
  irating_change: number;
  track_name: string;
  series_name: string;
  car_name: string;
  session_start_time: string;
}

export interface PerformanceSnapshot {
  session_count: number;
  avg_finish: number;
  avg_start: number;
  avg_incidents: number;
  irating_delta: number;
  latest_irating: number | null;
  sessions: PerformanceSnapshotSession[];
}

export interface CrewBrief {
  id: string;
  type: string;
  title: string;
  session_id: string | null;
  content: any;
  created_at: string;
}

export async function fetchPerformanceSnapshot(): Promise<PerformanceSnapshot | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return null;

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/performance-snapshot`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data; // null if insufficient sessions
  } catch (error) {
    console.error('[IDP] Error fetching performance snapshot:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function fetchCrewBrief(): Promise<CrewBrief[] | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return null;

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/crew-brief`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data) return null;
    return data.briefs || null;
  } catch (error) {
    console.error('[IDP] Error fetching crew brief:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function syncIRacingData(): Promise<{ success: boolean; message: string }> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/sync-iracing`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.error || 'Sync failed' };
    }

    const data = await response.json();
    return { success: true, message: data.message || `Synced ${data.synced_races} races` };
  } catch (error) {
    console.error('[IDP] Error syncing iRacing:', error instanceof Error ? error.message : error);
    return { success: false, message: 'Network error' };
  }
}

export function getDisciplineLabel(discipline: DriverDiscipline): string {
  const labels: Record<DriverDiscipline, string> = {
    oval: 'Oval',
    sportsCar: 'Sports Car',
    formula: 'Formula',
    dirtOval: 'Dirt Oval',
    dirtRoad: 'Dirt Road',
  };
  return labels[discipline] || discipline;
}

export function getLicenseColor(licenseClass: string): string {
  const colors: Record<string, string> = {
    'R': '#dc2626', // Rookie - Red
    'D': '#f97316', // D - Orange
    'C': '#eab308', // C - Yellow
    'B': '#22c55e', // B - Green
    'A': '#3b82f6', // A - Blue
    'Pro': '#000000', // Pro - Black
  };
  return colors[licenseClass] || '#6b7280';
}

// Track-specific data interfaces
export interface TrackSessionHistory {
  sessionId: string;
  date: string;
  series: string;
  position: number;
  started: number;
  bestLap: string;
  avgLap: string;
  incidents: number;
}

export interface TrackPerformanceData {
  trackName: string;
  trackConfig?: string;
  country?: string;
  length?: string;
  turns?: number;
  lapRecord?: string;
  yourBest?: string;
  sessions: number;
  avgFinish: number;
  bestFinish: number;
  history: TrackSessionHistory[];
  sectors?: { name: string; yourBest: string; trackBest: string; delta: number }[];
  notes?: string[];
}

export interface UpcomingRace {
  id: string;
  series: string;
  track: string;
  date: string;
  time: string;
  laps: number;
  weather?: string;
  expectedField?: number;
  registered?: boolean;
}

// Fetch sessions filtered by track
export async function fetchSessionsByTrack(trackName: string): Promise<TrackSessionHistory[]> {
  try {
    const sessions = await fetchDriverSessions();
    
    // Filter sessions by track name (case-insensitive partial match)
    const trackSessions = sessions.filter(s => 
      s.trackName.toLowerCase().includes(trackName.toLowerCase())
    );

    return trackSessions.map(s => ({
      sessionId: s.sessionId,
      date: new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      series: s.seriesName,
      position: s.finishPos || 0,
      started: s.startPos || 0,
      bestLap: '--:--.---', // Would come from detailed session data
      avgLap: '--:--.---',
      incidents: s.incidents || 0,
    }));
  } catch (error) {
    console.error('[IDP] Error fetching track sessions:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Get aggregated performance data for a specific track
export async function fetchTrackPerformance(trackName: string): Promise<TrackPerformanceData> {
  try {
    const history = await fetchSessionsByTrack(trackName);
    
    if (history.length === 0) {
      return {
        trackName,
        sessions: 0,
        avgFinish: 0,
        bestFinish: 0,
        history: [],
      };
    }

    const finishes = history.map(h => h.position).filter(p => p > 0);
    const bestFinish = finishes.length > 0 ? Math.min(...finishes) : 0;
    const avgFinish = finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : 0;

    return {
      trackName,
      sessions: history.length,
      avgFinish: Math.round(avgFinish * 10) / 10,
      bestFinish,
      history: history.slice(0, 5), // Last 5 sessions
    };
  } catch (error) {
    console.error('[IDP] Error fetching track performance:', error instanceof Error ? error.message : error);
    return {
      trackName,
      sessions: 0,
      avgFinish: 0,
      bestFinish: 0,
      history: [],
    };
  }
}

// Fetch upcoming races from registered sessions or schedule
export async function fetchUpcomingRaces(): Promise<UpcomingRace[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/v1/schedule/upcoming`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.races || [];
  } catch (error) {
    console.error('[IDP] Error fetching upcoming races:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Get all unique tracks from session history
export async function fetchTracksFromHistory(): Promise<string[]> {
  try {
    const sessions = await fetchDriverSessions();
    const tracks = [...new Set(sessions.map(s => s.trackName))];
    return tracks.sort();
  } catch (error) {
    console.error('[IDP] Error fetching tracks:', error instanceof Error ? error.message : error);
    return [];
  }
}
