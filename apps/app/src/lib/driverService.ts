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
  // TODO: Connect to real API when available
  // For now, return demo data
  return new Promise((resolve) => {
    setTimeout(() => resolve(DEMO_PROFILE), 500);
  });
}

export async function fetchDriverSessions(): Promise<DriverSessionSummary[]> {
  // TODO: Connect to real API when available
  return new Promise((resolve) => {
    setTimeout(() => resolve(DEMO_SESSIONS), 500);
  });
}

export async function fetchDriverStats(): Promise<DriverStatsSnapshot[]> {
  // TODO: Connect to real API when available
  return new Promise((resolve) => {
    setTimeout(() => resolve(DEMO_STATS), 500);
  });
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
