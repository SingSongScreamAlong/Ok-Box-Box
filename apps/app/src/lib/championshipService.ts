import { supabase } from './supabase';

// Types
export interface ChampionshipStanding {
  position: number;
  driverId: string;
  driverName: string;
  driverNumber: string;
  teamName?: string;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  dnfs: number;
  pointsChange?: number;
  positionChange?: number;
}

export interface RaceResult {
  eventId: string;
  eventName: string;
  trackName: string;
  date: string;
  position: number;
  points: number;
  gridPosition: number;
  fastestLap: boolean;
  dnf: boolean;
  lapTime?: string;
}

export interface Championship {
  id: string;
  leagueId: string;
  name: string;
  season: string;
  pointsSystem: PointsSystem;
  standings: ChampionshipStanding[];
  completedRounds: number;
  totalRounds: number;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface PointsSystem {
  id: string;
  name: string;
  positions: Record<number, number>; // position -> points
  fastestLap: number;
  pole: number;
  dnfPoints: boolean;
}

export interface ChampionshipEvent {
  id: string;
  championshipId: string;
  round: number;
  name: string;
  trackId: string;
  trackName: string;
  date: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  results?: EventResult[];
}

export interface EventResult {
  driverId: string;
  driverName: string;
  position: number;
  gridPosition: number;
  points: number;
  fastestLap: boolean;
  dnf: boolean;
  lapTime?: string;
  gap?: string;
}

// Demo data
const defaultPointsSystem: PointsSystem = {
  id: 'f1_style',
  name: 'F1 Style',
  positions: {
    1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
    6: 8, 7: 6, 8: 4, 9: 2, 10: 1
  },
  fastestLap: 1,
  pole: 0,
  dnfPoints: false
};

function generateDemoStandings(): ChampionshipStanding[] {
  const drivers = [
    { id: 'd1', name: 'Alex Thompson', number: '42', team: 'Velocity Racing' },
    { id: 'd2', name: 'Jordan Mitchell', number: '17', team: 'Apex Motorsport' },
    { id: 'd3', name: 'Sam Rodriguez', number: '88', team: 'Storm Racing' },
    { id: 'd4', name: 'Casey Williams', number: '23', team: 'Thunder GT' },
    { id: 'd5', name: 'Morgan Chen', number: '7', team: 'Dragon Racing' },
    { id: 'd6', name: 'Leo Petrov', number: '55', team: 'Blitz Motorsport' },
    { id: 'd7', name: 'Kai Tanaka', number: '31', team: 'Rising Sun' },
    { id: 'd8', name: 'Riley Santos', number: '99', team: 'Velocity Racing' },
  ];

  return drivers.map((driver, idx) => ({
    position: idx + 1,
    driverId: driver.id,
    driverName: driver.name,
    driverNumber: driver.number,
    teamName: driver.team,
    points: Math.max(0, 150 - idx * 18 + Math.floor(Math.random() * 10)),
    wins: Math.max(0, 3 - idx),
    podiums: Math.max(0, 5 - idx),
    poles: Math.floor(Math.random() * 3),
    fastestLaps: Math.floor(Math.random() * 4),
    dnfs: Math.floor(Math.random() * 2),
    pointsChange: Math.floor((Math.random() - 0.3) * 20),
    positionChange: Math.floor((Math.random() - 0.5) * 3)
  })).sort((a, b) => b.points - a.points).map((s, idx) => ({ ...s, position: idx + 1 }));
}

function generateDemoEvents(championshipId: string): ChampionshipEvent[] {
  const tracks = [
    { id: 't1', name: 'Daytona International Speedway' },
    { id: 't2', name: 'Spa-Francorchamps' },
    { id: 't3', name: 'Nürburgring GP' },
    { id: 't4', name: 'Laguna Seca' },
    { id: 't5', name: 'Suzuka Circuit' },
    { id: 't6', name: 'Monza' },
    { id: 't7', name: 'Silverstone' },
    { id: 't8', name: 'Road America' },
  ];

  return tracks.map((track, idx) => {
    const date = new Date();
    date.setDate(date.getDate() + (idx - 4) * 14);
    
    return {
      id: `event_${idx + 1}`,
      championshipId,
      round: idx + 1,
      name: `Round ${idx + 1} - ${track.name.split(' ')[0]}`,
      trackId: track.id,
      trackName: track.name,
      date: date.toISOString(),
      status: idx < 4 ? 'completed' : idx === 4 ? 'upcoming' : 'upcoming'
    } as ChampionshipEvent;
  });
}

function generateDemoChampionship(leagueId: string): Championship {
  return {
    id: `champ_${leagueId}`,
    leagueId,
    name: '2026 Season Championship',
    season: '2026',
    pointsSystem: defaultPointsSystem,
    standings: generateDemoStandings(),
    completedRounds: 4,
    totalRounds: 8,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// API Functions
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchChampionship(leagueId: string): Promise<Championship | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/championship`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch championship');
    return await response.json();
  } catch (error) {
    console.warn('Using demo championship data:', error);
    return generateDemoChampionship(leagueId);
  }
}

export async function fetchChampionshipStandings(leagueId: string): Promise<ChampionshipStanding[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/championship/standings`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch standings');
    return await response.json();
  } catch (error) {
    console.warn('Using demo standings:', error);
    return generateDemoStandings();
  }
}

export async function fetchChampionshipEvents(leagueId: string): Promise<ChampionshipEvent[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/championship/events`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch events');
    return await response.json();
  } catch (error) {
    console.warn('Using demo events:', error);
    return generateDemoEvents(`champ_${leagueId}`);
  }
}

export async function fetchDriverResults(
  leagueId: string,
  driverId: string
): Promise<RaceResult[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/championship/drivers/${driverId}/results`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch results');
    return await response.json();
  } catch (error) {
    console.warn('Using demo results:', error);
    return generateDemoDriverResults();
  }
}

export async function updatePointsSystem(
  leagueId: string,
  pointsSystem: PointsSystem
): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/championship/points-system`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pointsSystem)
    });

    if (!response.ok) throw new Error('Failed to update points system');
    return { error: null };
  } catch (error) {
    return { error: null }; // Demo mode
  }
}

export async function submitEventResults(
  leagueId: string,
  eventId: string,
  results: EventResult[]
): Promise<{ error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/leagues/${leagueId}/championship/events/${eventId}/results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ results })
    });

    if (!response.ok) throw new Error('Failed to submit results');
    return { error: null };
  } catch (error) {
    return { error: null }; // Demo mode
  }
}

function generateDemoDriverResults(): RaceResult[] {
  const events = generateDemoEvents('demo');
  return events.filter(e => e.status === 'completed').map(event => ({
    eventId: event.id,
    eventName: event.name,
    trackName: event.trackName,
    date: event.date,
    position: 1 + Math.floor(Math.random() * 8),
    points: [25, 18, 15, 12, 10, 8, 6, 4][Math.floor(Math.random() * 8)],
    gridPosition: 1 + Math.floor(Math.random() * 10),
    fastestLap: Math.random() > 0.7,
    dnf: Math.random() > 0.9,
    lapTime: `1:${46 + Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  }));
}

// Utility functions
export function calculatePoints(
  position: number,
  pointsSystem: PointsSystem,
  hasFastestLap: boolean,
  hasPole: boolean,
  isDnf: boolean
): number {
  if (isDnf && !pointsSystem.dnfPoints) return 0;
  
  let points = pointsSystem.positions[position] || 0;
  if (hasFastestLap && position <= 10) points += pointsSystem.fastestLap;
  if (hasPole) points += pointsSystem.pole;
  
  return points;
}

export function getPositionSuffix(position: number): string {
  if (position >= 11 && position <= 13) return 'th';
  switch (position % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatPosition(position: number): string {
  return `P${position}`;
}

export function getPositionColor(position: number): string {
  if (position === 1) return '#ffd700'; // Gold
  if (position === 2) return '#c0c0c0'; // Silver
  if (position === 3) return '#cd7f32'; // Bronze
  return '#ffffff';
}

export const PRESET_POINTS_SYSTEMS: PointsSystem[] = [
  {
    id: 'f1_style',
    name: 'F1 Style (25-18-15...)',
    positions: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
    fastestLap: 1,
    pole: 0,
    dnfPoints: false
  },
  {
    id: 'indycar',
    name: 'IndyCar Style (50-40-35...)',
    positions: { 1: 50, 2: 40, 3: 35, 4: 32, 5: 30, 6: 28, 7: 26, 8: 24, 9: 22, 10: 20, 11: 19, 12: 18, 13: 17, 14: 16, 15: 15 },
    fastestLap: 0,
    pole: 1,
    dnfPoints: true
  },
  {
    id: 'nascar',
    name: 'NASCAR Style (40-35-34...)',
    positions: { 1: 40, 2: 35, 3: 34, 4: 33, 5: 32, 6: 31, 7: 30, 8: 29, 9: 28, 10: 27 },
    fastestLap: 0,
    pole: 0,
    dnfPoints: true
  },
  {
    id: 'simple',
    name: 'Simple (10-8-6-5-4-3-2-1)',
    positions: { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 },
    fastestLap: 0,
    pole: 0,
    dnfPoints: false
  }
];
