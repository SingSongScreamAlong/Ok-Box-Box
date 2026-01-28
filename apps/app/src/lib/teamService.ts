/**
 * Team Service
 * 
 * Frontend service for team operations - events, race plans, stints.
 * Connects to /api/v1/teams endpoints with demo fallback.
 */

import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
