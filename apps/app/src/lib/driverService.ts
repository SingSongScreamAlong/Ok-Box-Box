import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  seriesName: string;
  discipline: DriverDiscipline;
  startPos?: number;
  finishPos?: number;
  incidents?: number;
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

const DEMO_PROFILE: DriverIdentityProfile = {
  driverId: 'me',
  displayName: 'Demo Driver',
  custId: 1185150,
  memberSince: '2025-01-14',
  primaryDiscipline: 'oval',
  timezone: 'America/New_York',
  safetyRatingOverall: 3.22,
  iRatingOverall: 1040,
  licenses: [
    { discipline: 'oval', licenseClass: 'B', safetyRating: 3.22, iRating: 1040 },
    { discipline: 'sportsCar', licenseClass: 'D', safetyRating: 2.52, iRating: 360 },
    { discipline: 'formula', licenseClass: 'R', safetyRating: 1.52, iRating: null },
    { discipline: 'dirtOval', licenseClass: 'R', safetyRating: 2.5, iRating: null },
    { discipline: 'dirtRoad', licenseClass: 'R', safetyRating: 2.56, iRating: null },
  ],
};

const DEMO_SESSIONS: DriverSessionSummary[] = [
  {
    sessionId: 'sess_001',
    startedAt: '2026-01-14T19:22:00Z',
    trackName: 'Road Atlanta (Short)',
    seriesName: 'Toyota GR86 Cup',
    discipline: 'sportsCar',
    startPos: 14,
    finishPos: 13,
    incidents: 5,
  },
  {
    sessionId: 'sess_002',
    startedAt: '2026-01-14T02:05:00Z',
    trackName: 'Concord Speedway',
    seriesName: 'CARS Tour Late Model',
    discipline: 'oval',
    startPos: 12,
    finishPos: 6,
    incidents: 4,
  },
  {
    sessionId: 'sess_003',
    startedAt: '2026-01-13T21:30:00Z',
    trackName: 'Daytona International Speedway',
    seriesName: 'NASCAR Cup Series',
    discipline: 'oval',
    startPos: 8,
    finishPos: 3,
    incidents: 2,
  },
  {
    sessionId: 'sess_004',
    startedAt: '2026-01-12T18:00:00Z',
    trackName: 'Watkins Glen',
    seriesName: 'IMSA Pilot Challenge',
    discipline: 'sportsCar',
    startPos: 6,
    finishPos: 8,
    incidents: 7,
  },
];

const DEMO_STATS: DriverStatsSnapshot[] = [
  { discipline: 'oval', starts: 286, wins: 13, top5s: 82, poles: 10, avgStart: 8, avgFinish: 10 },
  { discipline: 'sportsCar', starts: 89, wins: 0, top5s: 15, poles: 0, avgStart: 12, avgFinish: 11 },
  { discipline: 'formula', starts: 35, wins: 0, top5s: 10, poles: 1, avgStart: 8, avgFinish: 8 },
  { discipline: 'dirtOval', starts: 12, wins: 1, top5s: 4, poles: 0, avgStart: 10, avgFinish: 9 },
  { discipline: 'dirtRoad', starts: 8, wins: 0, top5s: 2, poles: 0, avgStart: 14, avgFinish: 12 },
];

export async function fetchDriverProfile(): Promise<DriverIdentityProfile> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[IDP] No auth token, using demo data');
      return DEMO_PROFILE;
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me`, {
      headers: {
        ...auth,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('[IDP] API error, using demo data');
      return DEMO_PROFILE;
    }

    const data = await response.json();
    
    return {
      driverId: data.id || 'me',
      displayName: data.display_name || DEMO_PROFILE.displayName,
      custId: data.iracing_cust_id || DEMO_PROFILE.custId,
      memberSince: data.member_since || DEMO_PROFILE.memberSince,
      primaryDiscipline: data.primary_discipline || DEMO_PROFILE.primaryDiscipline,
      timezone: data.timezone || DEMO_PROFILE.timezone,
      safetyRatingOverall: data.safety_rating_overall ?? DEMO_PROFILE.safetyRatingOverall,
      iRatingOverall: data.irating_overall ?? DEMO_PROFILE.iRatingOverall,
      licenses: data.licenses || DEMO_PROFILE.licenses,
    };
  } catch (error) {
    console.error('[IDP] Error fetching profile:', error);
    return DEMO_PROFILE;
  }
}

export async function fetchDriverSessions(): Promise<DriverSessionSummary[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return DEMO_SESSIONS;
    }

    // First get the driver profile to get the ID
    const profileResponse = await fetch(`${API_BASE}/api/v1/drivers/me`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!profileResponse.ok) {
      return DEMO_SESSIONS;
    }

    const profile = await profileResponse.json();
    
    const response = await fetch(`${API_BASE}/api/v1/drivers/${profile.id}/sessions?limit=25`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_SESSIONS;
    }

    const data = await response.json();
    const sessions = data.sessions || [];

    return sessions.map((s: any) => ({
      sessionId: String(s.session_id || s.id || ''),
      startedAt: String(s.started_at || s.session_start || ''),
      trackName: String(s.track_name || 'Unknown Track'),
      seriesName: String(s.series_name || 'Unknown Series'),
      discipline: (s.discipline || 'sportsCar') as DriverDiscipline,
      startPos: s.start_pos ?? s.starting_position,
      finishPos: s.finish_pos ?? s.finishing_position,
      incidents: s.incidents ?? s.incident_count,
    }));
  } catch (error) {
    console.error('[IDP] Error fetching sessions:', error);
    return DEMO_SESSIONS;
  }
}

export async function fetchDriverStats(): Promise<DriverStatsSnapshot[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return DEMO_STATS;
    }

    // Get driver profile first
    const profileResponse = await fetch(`${API_BASE}/api/v1/drivers/me`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!profileResponse.ok) {
      return DEMO_STATS;
    }

    const profile = await profileResponse.json();

    // Fetch performance/aggregates data
    const response = await fetch(`${API_BASE}/api/v1/drivers/${profile.id}/performance`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_STATS;
    }

    const data = await response.json();
    
    // Transform aggregates into stats format
    if (data.global) {
      // If we have global data, create a single entry
      return [{
        discipline: (profile.primary_discipline || 'sportsCar') as DriverDiscipline,
        starts: data.global.total_sessions || 0,
        wins: data.global.wins || 0,
        top5s: data.global.top5s || 0,
        poles: data.global.poles || 0,
        avgStart: data.global.avg_start || 0,
        avgFinish: data.global.avg_finish || 0,
      }];
    }

    return DEMO_STATS;
  } catch (error) {
    console.error('[IDP] Error fetching stats:', error);
    return DEMO_STATS;
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
    console.error('[IDP] Error syncing iRacing:', error);
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
