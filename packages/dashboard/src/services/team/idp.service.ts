/**
 * IDP API Service
 * 
 * Client for the driver development API endpoints.
 * Falls back to demo data when API unavailable.
 */

import { useAuthStore } from '../../stores/auth.store';

// Types
export interface DriverTarget {
    id: string;
    label: string;
    category: 'lap_time' | 'consistency' | 'safety' | 'irating' | 'custom';
    target_value: number | string;
    current_value: number | string;
    status: 'achieved' | 'in_progress' | 'not_started' | 'failed';
    track?: string;
    deadline?: string;
    created_by: string;
    notes?: string;
    visibility: 'shared' | 'private';
    progress_history?: { date: string; value: string | number }[];
    achieved_at?: string;
}

export interface SuggestedTarget {
    id: string;
    label: string;
    category: DriverTarget['category'];
    target_value: number | string;
    current_value: number | string;
    track?: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
    estimated_timeline?: string;
}

export interface DriverProfile {
    id: string;
    display_name: string;
    irating: number;
    safety_rating: number;
    license_class: string;
    platform_id?: string;
}

export interface Achievement {
    id: string;
    badge: string;
    name: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    earned_at: string;
}

export interface CreateTargetInput {
    label: string;
    category: DriverTarget['category'];
    target_value: number | string;
    current_value?: number | string;
    track?: string;
    deadline?: string;
    notes?: string;
    visibility?: 'shared' | 'private';
}

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '';

// Demo/mock data for fallback
const DEMO_PROFILE: DriverProfile = {
    id: 'demo-driver',
    display_name: 'Demo Driver',
    irating: 2500,
    safety_rating: 3.50,
    license_class: 'B'
};

const DEMO_TARGETS: DriverTarget[] = [
    { id: 't1', label: 'Spa Lap Time', category: 'lap_time', target_value: '2:17.000', current_value: '2:18.342', status: 'in_progress', track: 'Spa-Francorchamps', created_by: 'Self', visibility: 'shared', progress_history: [{ date: '2026-01-08', value: '2:19.102' }, { date: '2026-01-10', value: '2:18.890' }, { date: '2026-01-12', value: '2:18.342' }] },
    { id: 't2', label: 'Consistency < 0.5%', category: 'consistency', target_value: 0.5, current_value: 0.42, status: 'achieved', created_by: 'Self', visibility: 'shared', achieved_at: '2026-01-05' },
    { id: 't3', label: 'Zero Incidents (Race)', category: 'safety', target_value: 0, current_value: 0, status: 'achieved', created_by: 'Self', visibility: 'shared', achieved_at: '2026-01-12' },
    { id: 't4', label: 'Reach 3000 iR', category: 'irating', target_value: 3000, current_value: 2500, status: 'in_progress', deadline: '2026-03-01', created_by: 'Self', visibility: 'shared' },
    { id: 't5', label: 'Work on trail braking', category: 'custom', target_value: 'Improved', current_value: 'Working', status: 'in_progress', created_by: 'Self', visibility: 'private', notes: 'Focus on T1 entries' }
];

const DEMO_SUGGESTIONS: SuggestedTarget[] = [
    { id: 'sug-1', label: 'Monza Lap Time', category: 'lap_time', target_value: '1:48.500', current_value: '1:49.234', track: 'Monza', rationale: "You're 0.8% off the benchmark. Focus on Parabolica exit.", priority: 'medium', estimated_timeline: '1-2 weeks' }
];

const DEMO_ACHIEVEMENTS: Achievement[] = [
    { id: 'a1', badge: '🎯', name: 'Goal Getter', description: 'Completed first target', tier: 'bronze', earned_at: '2025-12-20' },
    { id: 'a2', badge: '✨', name: 'Clean Racer', description: 'Zero incident race', tier: 'bronze', earned_at: '2026-01-12' }
];

/**
 * Fetch driver profile (logged in user or by ID)
 */
export async function fetchDriverProfile(driverId?: string): Promise<DriverProfile> {
    const { accessToken } = useAuthStore.getState();

    // Demo mode - no auth
    if (!accessToken) {
        return DEMO_PROFILE;
    }

    try {
        const endpoint = driverId ? `/api/v1/drivers/${driverId}/profile` : '/api/v1/drivers/me';
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            console.warn('[IDP Service] Profile fetch failed, using demo');
            return DEMO_PROFILE;
        }

        return await response.json();
    } catch (error) {
        console.warn('[IDP Service] Profile fetch error, using demo:', error);
        return DEMO_PROFILE;
    }
}

/**
 * Fetch driver targets (goals)
 */
export async function fetchDriverTargets(driverId: string): Promise<DriverTarget[]> {
    const { accessToken } = useAuthStore.getState();

    // Demo mode
    if (!accessToken || driverId === 'demo' || driverId.startsWith('d')) {
        await new Promise(r => setTimeout(r, 200)); // Simulate network
        return DEMO_TARGETS;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/${driverId}/targets`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            return DEMO_TARGETS;
        }

        const data = await response.json();
        return data.targets || [];
    } catch (error) {
        console.warn('[IDP Service] Targets fetch error:', error);
        return DEMO_TARGETS;
    }
}

/**
 * Fetch AI-generated suggestions
 */
export async function fetchSuggestions(driverId: string): Promise<SuggestedTarget[]> {
    const { accessToken } = useAuthStore.getState();

    // Demo mode
    if (!accessToken || driverId === 'demo' || driverId.startsWith('d')) {
        return DEMO_SUGGESTIONS;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/${driverId}/suggestions`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            return DEMO_SUGGESTIONS;
        }

        const data = await response.json();
        return data.suggestions || [];
    } catch (error) {
        console.warn('[IDP Service] Suggestions fetch error:', error);
        return DEMO_SUGGESTIONS;
    }
}

/**
 * Fetch driver achievements
 */
export async function fetchAchievements(driverId: string): Promise<Achievement[]> {
    const { accessToken } = useAuthStore.getState();

    // Demo mode - achievements are in-memory for now
    if (!accessToken || driverId === 'demo' || driverId.startsWith('d')) {
        return DEMO_ACHIEVEMENTS;
    }

    // DEFERRED: Backend API endpoint GET /drivers/:id/achievements does not exist yet.
    // See packages/server/src/api/routes/driver-development.ts
    console.debug('[IDP Service] fetchAchievements DEFERRED - API missing');
    return DEMO_ACHIEVEMENTS;
}

/**
 * Create a new target
 */
export async function createTarget(driverId: string, target: CreateTargetInput): Promise<DriverTarget | null> {
    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
        console.warn('[IDP Service] Cannot create target without auth');
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/${driverId}/targets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(target)
        });

        if (!response.ok) {
            throw new Error(`Create failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[IDP Service] Create target error:', error);
        return null;
    }
}

/**
 * Accept a suggested target
 */
export async function acceptSuggestion(driverId: string, suggestionId: string): Promise<DriverTarget | null> {
    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
        console.warn('[IDP Service] Cannot accept suggestion without auth');
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/${driverId}/suggestions/${suggestionId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Accept failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[IDP Service] Accept suggestion error:', error);
        return null;
    }
}

/**
 * Check if using demo mode
 */
export function isDemoMode(): boolean {
    const { accessToken } = useAuthStore.getState();
    return !accessToken;
}

/**
 * Trigger iRacing data sync
 */
export async function syncIRacingData(): Promise<{ success: boolean; synced_races: number; message: string }> {
    const { accessToken } = useAuthStore.getState();

    if (!accessToken) {
        return { success: false, synced_races: 0, message: 'Not authenticated' };
    }

    try {
        const response = await fetch(`${API_BASE}/api/v1/drivers/me/sync-iracing`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Sync failed');
        }

        return await response.json();
    } catch (error: any) {
        console.error('[IDP Service] Sync error:', error);
        return { success: false, synced_races: 0, message: error.message || 'Failed to sync' };
    }
}
