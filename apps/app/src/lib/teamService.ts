/**
 * Team Service
 * 
 * Frontend service for team operations - events, race plans, stints.
 * Connects to /api/v1/teams endpoints with demo fallback.
 */

import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

// =====================================================================
// Types
// =====================================================================

export interface TeamDriver {
  id: string;
  membershipId: string;
  displayName: string;
  role: string;
  joinedAt: string;
  discipline: string;
  irating: { road: number | null; oval: number | null };
  safetyRating: { road: number | null; oval: number | null };
  license: { road: string | null; oval: string | null };
  available?: boolean;
}

export interface TeamEvent {
  id: string;
  name: string;
  seriesName: string | null;
  trackName: string;
  trackConfig: string | null;
  eventDate: string;
  durationMinutes: number | null;
  totalLaps: number | null;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  carClass: string | null;
  weatherType: string | null;
  finishPosition: number | null;
  classPosition: number | null;
  lapsCompleted: number | null;
  totalIncidents: number | null;
}

export interface RacePlan {
  id: string;
  name: string;
  description: string | null;
  eventId: string | null;
  eventName: string | null;
  trackName: string | null;
  isActive: boolean;
  status: 'draft' | 'active' | 'archived';
  totalPitStops: number;
  fuelStrategy: string | null;
  tireStrategy: string | null;
  targetLapTimeMs: number | null;
  fuelPerLap: number | null;
  notes: string | null;
  createdAt: string;
  stints?: Stint[];
}

export interface Stint {
  id: string;
  stintNumber: number;
  driverId: string | null;
  driverName: string | null;
  startLap: number | null;
  endLap: number | null;
  estimatedDurationMinutes: number | null;
  fuelLoad: number | null;
  fuelTargetLaps: number | null;
  tireCompound: string | null;
  tireChange: boolean;
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  actualLaps: number | null;
  actualAvgLapMs: number | null;
  actualBestLapMs: number | null;
  actualIncidents: number | null;
  notes: string | null;
}

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

// NO DEMO DATA - Real racing system only shows real data

// =====================================================================
// Auth Helper
// =====================================================================

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  return {};
}

// =====================================================================
// API Functions
// =====================================================================

/**
 * Fetch team details
 */
export async function fetchTeam(teamId: string): Promise<Team | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Team] No auth token');
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Team] API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error fetching team:', error);
    return null;
  }
}

/**
 * Fetch team drivers
 */
export async function fetchTeamDrivers(teamId: string): Promise<TeamDriver[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Team] No auth token');
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/drivers`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Team] Drivers API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.drivers || [];
  } catch (error) {
    console.error('[Team] Error fetching drivers:', error);
    return [];
  }
}

/**
 * Fetch team events
 */
export async function fetchTeamEvents(teamId: string, status?: string): Promise<TeamEvent[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Team] No auth token');
      return [];
    }

    const params = status ? `?status=${status}` : '';
    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/events${params}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Team] Events API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('[Team] Error fetching events:', error);
    return [];
  }
}

/**
 * Create a team event
 */
export async function createTeamEvent(teamId: string, event: Partial<TeamEvent>): Promise<TeamEvent | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/events`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error creating event:', error);
    return null;
  }
}

/**
 * Fetch race plans for a team
 */
export async function fetchRacePlans(teamId: string, eventId?: string): Promise<RacePlan[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Team] No auth token');
      return [];
    }

    const params = eventId ? `?eventId=${eventId}` : '';
    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans${params}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Team] Race plans API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('[Team] Error fetching race plans:', error);
    return [];
  }
}

/**
 * Create a race plan
 */
export async function createRacePlan(teamId: string, plan: Partial<RacePlan>): Promise<RacePlan | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error creating race plan:', error);
    return null;
  }
}

/**
 * Activate a race plan
 */
export async function activateRacePlan(teamId: string, planId: string): Promise<boolean> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans/${planId}/activate`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    return response.ok;
  } catch (error) {
    console.error('[Team] Error activating plan:', error);
    return false;
  }
}

/**
 * Fetch stints for a race plan
 */
export async function fetchStints(teamId: string, planId: string): Promise<Stint[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      console.log('[Team] No auth token');
      return [];
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans/${planId}/stints`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.log('[Team] Stints API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.stints || [];
  } catch (error) {
    console.error('[Team] Error fetching stints:', error);
    return [];
  }
}

/**
 * Create a stint
 */
export async function createStint(teamId: string, planId: string, stint: Partial<Stint>): Promise<Stint | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans/${planId}/stints`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(stint),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error creating stint:', error);
    return null;
  }
}

/**
 * Update a stint
 */
export async function updateStint(teamId: string, stintId: string, updates: Partial<Stint>): Promise<boolean> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/stints/${stintId}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    return response.ok;
  } catch (error) {
    console.error('[Team] Error updating stint:', error);
    return false;
  }
}

/**
 * Delete a stint
 */
export async function deleteStint(teamId: string, stintId: string): Promise<boolean> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/stints/${stintId}`, {
      method: 'DELETE',
      headers: auth,
    });

    return response.ok;
  } catch (error) {
    console.error('[Team] Error deleting stint:', error);
    return false;
  }
}

/**
 * Fetch active strategy plan for a team
 */
export async function fetchTeamStrategy(teamId: string): Promise<any | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/strategy?status=active`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const plans = data.data?.plans || [];
    return plans[0] || null;
  } catch (error) {
    console.error('[Team] Error fetching strategy:', error);
    return null;
  }
}

/**
 * Fetch a driver's full profile data for team context
 * Uses existing public/team endpoints: /:id, /:id/performance, /:id/sessions, /:id/traits
 */
export interface TeamDriverProfile {
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    primary_discipline: string;
    total_sessions: number;
    total_laps: number;
    total_incidents: number;
  } | null;
  performance: {
    global: any;
    traits: { key: string; label: string; category: string; confidence: number }[];
  } | null;
  sessions: {
    id: string;
    session_name: string | null;
    track_name: string | null;
    total_laps: number;
    best_lap_time_ms: number | null;
    incident_count: number;
    finish_position: number | null;
    start_position: number | null;
    irating_change: number | null;
    date: string;
  }[];
}

export async function fetchDriverProfileForTeam(driverId: string): Promise<TeamDriverProfile | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return null;

    const headers = { ...auth, 'Content-Type': 'application/json' };

    const [profileRes, perfRes, sessionsRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/drivers/${driverId}`, { headers }),
      fetch(`${API_BASE}/api/v1/drivers/${driverId}/performance`, { headers }),
      fetch(`${API_BASE}/api/v1/drivers/${driverId}/sessions?limit=20`, { headers }),
    ]);

    const profile = profileRes.ok ? await profileRes.json() : null;
    const perf = perfRes.ok ? await perfRes.json() : null;
    const sessData = sessionsRes.ok ? await sessionsRes.json() : null;

    // Map sessions from backend format
    const sessions = (sessData?.sessions || sessData?.results || []).map((s: any) => ({
      id: s.id || s.subsession_id || '',
      session_name: s.session_name || s.series_name || null,
      track_name: s.track_name || null,
      total_laps: s.total_laps || s.laps_complete || 0,
      best_lap_time_ms: s.best_lap_time_ms || null,
      incident_count: s.incident_count ?? s.incidents ?? 0,
      finish_position: s.finish_position ?? s.finish_pos ?? null,
      start_position: s.start_position ?? s.start_pos ?? null,
      irating_change: s.irating_change ?? ((s.newi_rating != null && s.oldi_rating != null) ? (s.newi_rating - s.oldi_rating) : null),
      date: s.date || s.started_at || s.session_start_time || '',
    }));

    return {
      profile: profile ? {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || null,
        primary_discipline: profile.primary_discipline || 'road',
        total_sessions: profile.total_sessions || 0,
        total_laps: profile.total_laps || 0,
        total_incidents: profile.total_incidents || 0,
      } : null,
      performance: perf ? {
        global: perf.global,
        traits: perf.traits || [],
      } : null,
      sessions,
    };
  } catch (error) {
    console.error('[Team] Error fetching driver profile:', error);
    return null;
  }
}

/**
 * Fetch team roster (uses existing backend endpoint)
 */
export async function fetchTeamRoster(teamId: string): Promise<any> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/roster`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error fetching roster:', error);
    return null;
  }
}

// =====================================================================
// v1 Team Events (server model: session-linked events)
// =====================================================================

export interface TeamEventV1 {
  id: string;
  team_id: string;
  session_id: string;
  event_name: string | null;
  event_type: 'practice' | 'qualifying' | 'race' | 'endurance' | 'other' | null;
  participating_driver_ids: string[];
  scheduled_at: string | null;
  created_at: string;
}

export interface TeamDebriefV1 {
  event_id: string;
  event_name: string | null;
  session_id: string;
  driver_summaries: Array<{
    driver_profile_id: string;
    display_name: string;
    headline: string;
    primary_limiter: string;
  }>;
  team_summary: {
    overall_observation: string;
    common_patterns: string[];
    priority_focus: string;
  } | null;
  status: 'draft' | 'published';
}

/**
 * Fetch team events via v1 API
 * GET /api/v1/teams/:id/events
 */
export async function fetchTeamEventsV1(teamId: string): Promise<TeamEventV1[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/events`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('[Team] Error fetching v1 events:', error);
    return [];
  }
}

/**
 * Create a team event via v1 API
 * POST /api/v1/teams/:id/events
 */
export async function createTeamEventV1(
  teamId: string,
  body: {
    session_id: string;
    event_name?: string;
    event_type?: TeamEventV1['event_type'];
    participating_driver_ids?: string[];
  }
): Promise<TeamEventV1 | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return null;

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/events`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error creating v1 event:', error);
    throw error;
  }
}

/**
 * Trigger AI generation of a team debrief
 * POST /api/v1/teams/:id/events/:eventId/debrief/generate
 */
export async function generateTeamDebriefV1(
  teamId: string,
  eventId: string
): Promise<TeamDebriefV1 | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return null;

    const response = await fetch(
      `${API_BASE}/api/v1/teams/${teamId}/events/${eventId}/debrief/generate`,
      {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate debrief: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error generating debrief:', error);
    throw error;
  }
}

// =====================================================================
// Practice Sessions
// =====================================================================

export interface PracticeSessionSummary {
  id: string;
  team_id: string;
  event_id: string | null;
  name: string;
  track_name: string | null;
  car_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: 'planned' | 'active' | 'completed';
  created_at: string;
}

export interface PracticeRunPlan {
  id: string;
  practice_session_id: string;
  name: string;
  target_laps: number;
  completed_laps: number;
  target_time: string | null;
  focus_areas: string[];
  status: 'planned' | 'in_progress' | 'completed';
  created_at: string;
}

export interface PracticeDriverStint {
  id: string;
  practice_session_id: string;
  driver_profile_id: string | null;
  driver_name: string;
  laps_completed: number;
  best_lap_time_ms: number | null;
  avg_lap_time_ms: number | null;
  consistency_score: number | null;
  incidents: number;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * List all practice sessions for a team (most recent first)
 * GET /api/teams/:teamId/practice
 */
export async function fetchPracticeSessions(teamId: string): Promise<PracticeSessionSummary[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return [];

    const response = await fetch(`${API_BASE}/api/teams/${teamId}/practice`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.data?.sessions || [];
  } catch (error) {
    console.error('[Team] Error fetching practice sessions:', error);
    return [];
  }
}

/**
 * Fetch a single practice session with its run plans and driver stints
 * GET /api/teams/:teamId/practice/:sessionId
 */
export async function fetchPracticeSession(
  teamId: string,
  sessionId: string
): Promise<{ session: PracticeSessionSummary; run_plans: PracticeRunPlan[]; driver_stints: PracticeDriverStint[] } | null> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) return null;

    const response = await fetch(`${API_BASE}/api/teams/${teamId}/practice/${sessionId}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data ? {
      session: data.data,
      run_plans: data.data.run_plans || [],
      driver_stints: data.data.driver_stints || [],
    } : null;
  } catch (error) {
    console.error('[Team] Error fetching practice session:', error);
    return null;
  }
}
