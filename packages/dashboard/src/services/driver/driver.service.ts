import { getAuthHeader } from '../../stores/auth.store';

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
];

const DEMO_STATS: DriverStatsSnapshot[] = [
    { discipline: 'oval', starts: 286, wins: 13, top5s: 82, poles: 10, avgStart: 8, avgFinish: 10 },
    { discipline: 'sportsCar', starts: 89, wins: 0, top5s: 15, poles: 0, avgStart: 12, avgFinish: 11 },
    { discipline: 'formula', starts: 35, wins: 0, top5s: 10, poles: 1, avgStart: 8, avgFinish: 8 },
];

export async function fetchMyDriverProfile(): Promise<DriverIdentityProfile> {
    const auth = getAuthHeader();
    if (!auth.Authorization) {
        return DEMO_PROFILE;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/me/profile`, {
            headers: {
                ...auth,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return DEMO_PROFILE;
        }

        const data = await response.json();
        const profile = data?.data ?? data;

        return {
            driverId: 'me',
            displayName: profile.display_name ?? profile.displayName ?? DEMO_PROFILE.displayName,
            custId: profile.cust_id ?? profile.custId ?? DEMO_PROFILE.custId,
            memberSince: profile.member_since ?? profile.memberSince ?? DEMO_PROFILE.memberSince,
            primaryDiscipline: profile.primary_discipline ?? profile.primaryDiscipline ?? DEMO_PROFILE.primaryDiscipline,
            timezone: profile.timezone ?? profile.timeZone ?? DEMO_PROFILE.timezone,
            safetyRatingOverall: profile.safety_rating_overall ?? DEMO_PROFILE.safetyRatingOverall,
            iRatingOverall: profile.irating_overall ?? DEMO_PROFILE.iRatingOverall,
            licenses: DEMO_PROFILE.licenses,
        };
    } catch {
        return DEMO_PROFILE;
    }
}

export async function fetchMyDriverSessions(): Promise<DriverSessionSummary[]> {
    const auth = getAuthHeader();
    if (!auth.Authorization) {
        return DEMO_SESSIONS;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/me/sessions?limit=25`, {
            headers: {
                ...auth,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return DEMO_SESSIONS;
        }

        const data = await response.json();
        const sessions = data?.sessions ?? data?.data?.sessions ?? [];

        return sessions.map((s: any) => ({
            sessionId: String(s.session_id ?? s.sessionId ?? ''),
            startedAt: String(s.started_at ?? s.startedAt ?? ''),
            trackName: String(s.track_name ?? s.trackName ?? 'Unknown Track'),
            seriesName: String(s.series_name ?? s.seriesName ?? 'Unknown Series'),
            discipline: (s.discipline ?? 'sportsCar') as DriverDiscipline,
            startPos: s.start_pos ?? s.startPos,
            finishPos: s.finish_pos ?? s.finishPos,
            incidents: s.incidents,
        }));
    } catch {
        return DEMO_SESSIONS;
    }
}

export async function fetchMyDriverStats(): Promise<DriverStatsSnapshot[]> {
    const auth = getAuthHeader();
    if (!auth.Authorization) {
        return DEMO_STATS;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/me/stats`, {
            headers: {
                ...auth,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return DEMO_STATS;
        }

        const data = await response.json();
        const stats = data?.stats ?? data?.data?.stats ?? [];

        return stats.map((row: any) => ({
            discipline: (row.discipline ?? 'sportsCar') as DriverDiscipline,
            starts: Number(row.starts ?? 0),
            wins: Number(row.wins ?? 0),
            top5s: Number(row.top5s ?? 0),
            poles: Number(row.poles ?? 0),
            avgStart: Number(row.avg_start ?? row.avgStart ?? 0),
            avgFinish: Number(row.avg_finish ?? row.avgFinish ?? 0),
        }));
    } catch {
        return DEMO_STATS;
    }
}
