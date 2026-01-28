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

// =====================================================================
// Demo Data
// =====================================================================

const DEMO_TEAM: Team = {
  id: 'demo-team',
  name: 'Demo Racing Team',
  shortName: 'DRT',
  logoUrl: null,
  primaryColor: '#f97316',
  secondaryColor: '#1e1e1e'
};

const DEMO_DRIVERS: TeamDriver[] = [
  { id: 'd1', membershipId: 'm1', displayName: 'Alex Thompson', role: 'driver', joinedAt: '2025-06-01', discipline: 'road', irating: { road: 2450, oval: null }, safetyRating: { road: 3.8, oval: null }, license: { road: 'A', oval: null }, available: true },
  { id: 'd2', membershipId: 'm2', displayName: 'Sarah Chen', role: 'driver', joinedAt: '2025-07-15', discipline: 'road', irating: { road: 2100, oval: 1800 }, safetyRating: { road: 4.2, oval: 3.5 }, license: { road: 'A', oval: 'B' }, available: true },
  { id: 'd3', membershipId: 'm3', displayName: 'Marcus Williams', role: 'driver', joinedAt: '2025-08-01', discipline: 'oval', irating: { road: 1650, oval: 2800 }, safetyRating: { road: 3.2, oval: 4.5 }, license: { road: 'B', oval: 'A' }, available: true },
  { id: 'd4', membershipId: 'm4', displayName: 'Emma Rodriguez', role: 'reserve', joinedAt: '2025-09-10', discipline: 'road', irating: { road: 1900, oval: null }, safetyRating: { road: 3.6, oval: null }, license: { road: 'B', oval: null }, available: false },
];

const DEMO_EVENTS: TeamEvent[] = [
  { id: 'e1', name: 'Daytona 24 Hours', seriesName: 'IMSA Endurance', trackName: 'Daytona International Speedway', trackConfig: 'Road Course', eventDate: '2026-02-01T14:00:00Z', durationMinutes: 1440, totalLaps: null, status: 'upcoming', carClass: 'GT3', weatherType: 'Dynamic', finishPosition: null, classPosition: null, lapsCompleted: null, totalIncidents: null },
  { id: 'e2', name: 'Spa 6 Hours', seriesName: 'IMSA Endurance', trackName: 'Circuit de Spa-Francorchamps', trackConfig: null, eventDate: '2026-02-15T10:00:00Z', durationMinutes: 360, totalLaps: null, status: 'upcoming', carClass: 'GT3', weatherType: 'Clear', finishPosition: null, classPosition: null, lapsCompleted: null, totalIncidents: null },
  { id: 'e3', name: 'Sebring 12 Hours', seriesName: 'IMSA Endurance', trackName: 'Sebring International Raceway', trackConfig: null, eventDate: '2026-01-20T10:00:00Z', durationMinutes: 720, totalLaps: null, status: 'completed', carClass: 'GT3', weatherType: 'Clear', finishPosition: 4, classPosition: 2, lapsCompleted: 312, totalIncidents: 8 },
];

const DEMO_RACE_PLANS: RacePlan[] = [
  { id: 'rp1', name: 'Plan A - Conservative', description: 'Safe fuel strategy with extra margin', eventId: 'e1', eventName: 'Daytona 24 Hours', trackName: 'Daytona International Speedway', isActive: true, status: 'active', totalPitStops: 28, fuelStrategy: 'conservative', tireStrategy: 'multi_stint', targetLapTimeMs: 108500, fuelPerLap: 2.8, notes: 'Primary strategy', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'rp2', name: 'Plan B - Aggressive', description: 'Push pace, shorter stints', eventId: 'e1', eventName: 'Daytona 24 Hours', trackName: 'Daytona International Speedway', isActive: false, status: 'draft', totalPitStops: 32, fuelStrategy: 'aggressive', tireStrategy: 'multi_stint', targetLapTimeMs: 107800, fuelPerLap: 3.1, notes: 'If we need to make up time', createdAt: '2026-01-15T11:00:00Z' },
];

const DEMO_STINTS: Stint[] = [
  { id: 's1', stintNumber: 1, driverId: 'd1', driverName: 'Alex Thompson', startLap: 1, endLap: 32, estimatedDurationMinutes: 58, fuelLoad: 90, fuelTargetLaps: 32, tireCompound: 'Medium', tireChange: false, status: 'planned', actualLaps: null, actualAvgLapMs: null, actualBestLapMs: null, actualIncidents: null, notes: 'Opening stint' },
  { id: 's2', stintNumber: 2, driverId: 'd2', driverName: 'Sarah Chen', startLap: 33, endLap: 64, estimatedDurationMinutes: 56, fuelLoad: 90, fuelTargetLaps: 32, tireCompound: 'Medium', tireChange: true, status: 'planned', actualLaps: null, actualAvgLapMs: null, actualBestLapMs: null, actualIncidents: null, notes: null },
  { id: 's3', stintNumber: 3, driverId: 'd3', driverName: 'Marcus Williams', startLap: 65, endLap: 96, estimatedDurationMinutes: 56, fuelLoad: 90, fuelTargetLaps: 32, tireCompound: 'Medium', tireChange: true, status: 'planned', actualLaps: null, actualAvgLapMs: null, actualBestLapMs: null, actualIncidents: null, notes: null },
];

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
export async function fetchTeam(teamId: string): Promise<Team> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return DEMO_TEAM;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_TEAM;
    }

    return await response.json();
  } catch (error) {
    console.error('[Team] Error fetching team:', error);
    return DEMO_TEAM;
  }
}

/**
 * Fetch team drivers
 */
export async function fetchTeamDrivers(teamId: string): Promise<TeamDriver[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return DEMO_DRIVERS;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/drivers`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_DRIVERS;
    }

    const data = await response.json();
    return data.drivers || DEMO_DRIVERS;
  } catch (error) {
    console.error('[Team] Error fetching drivers:', error);
    return DEMO_DRIVERS;
  }
}

/**
 * Fetch team events
 */
export async function fetchTeamEvents(teamId: string, status?: string): Promise<TeamEvent[]> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return DEMO_EVENTS;
    }

    const params = status ? `?status=${status}` : '';
    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/events${params}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_EVENTS;
    }

    const data = await response.json();
    return data.events || DEMO_EVENTS;
  } catch (error) {
    console.error('[Team] Error fetching events:', error);
    return DEMO_EVENTS;
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
      return DEMO_RACE_PLANS;
    }

    const params = eventId ? `?eventId=${eventId}` : '';
    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans${params}`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_RACE_PLANS;
    }

    const data = await response.json();
    return data.plans || DEMO_RACE_PLANS;
  } catch (error) {
    console.error('[Team] Error fetching race plans:', error);
    return DEMO_RACE_PLANS;
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
      return DEMO_STINTS;
    }

    const response = await fetch(`${API_BASE}/api/v1/teams/${teamId}/race-plans/${planId}/stints`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEMO_STINTS;
    }

    const data = await response.json();
    return data.stints || DEMO_STINTS;
  } catch (error) {
    console.error('[Team] Error fetching stints:', error);
    return DEMO_STINTS;
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
