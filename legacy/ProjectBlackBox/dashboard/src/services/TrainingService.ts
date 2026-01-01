import BackendClient from './BackendClient';

// Types
export interface TrainingGoal {
    id: string;
    driverId: string;
    title: string;
    description: string;
    category: 'speed' | 'consistency' | 'technique' | 'racecraft';
    priority: 'high' | 'medium' | 'low';
    difficulty?: string;
    progress: number;
    targetValue: number;
    currentValue: number;
    deadline?: string; // Derived or stored
    xpReward: number;  // derived or stored
    metrics: any;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    unlocked: boolean;
    earnedAt?: string;
}

const API_BASE = '/api/training'; // Served via main backend routes

class TrainingService {

    // Since BackendClient handles the base URL, we might need to extend it or just use fetch directly
    // if BackendClient is too specific to sessions. 
    // Looking at BackendClient, it takes baseUrl.
    // We can assume the auth token is handled by a global interceptor or needed here.
    // For this MVP, we will use fetch and assume auth header is needed or cookies.

    private getHeaders() {
        const token = localStorage.getItem('token'); // Assuming JWT auth
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    async getGoals(): Promise<TrainingGoal[]> {
        try {
            // We need the backend URL. We can stick to BackendClient's logic or env var
            const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/training/goals`, {
                headers: this.getHeaders()
            });

            if (!res.ok) throw new Error(`Failed to fetch goals: ${res.status}`);
            const data = await res.json();

            // Map backend format to UI format if needed
            return data.goals.map((g: any) => ({
                id: g.id,
                driverId: g.driverId,
                title: g.title,
                description: g.description,
                category: g.type, // type -> category
                priority: 'medium', // Default for now
                progress: parseFloat(g.progress) * 100, // 0.5 -> 50%
                targetValue: g.targetValue,
                currentValue: g.currentValue,
                xpReward: 100, // placeholder
                metrics: g.metrics
            }));
        } catch (e) {
            console.error("Error fetching goals", e);
            return [];
        }
    }

    async getBadges(): Promise<Badge[]> {
        try {
            const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/training/badges`, {
                headers: this.getHeaders()
            });

            if (!res.ok) throw new Error(`Failed to fetch badges: ${res.status}`);
            const data = await res.json();

            return data.badges.map((b: any) => ({
                id: b.id,
                name: b.name,
                description: b.description,
                icon: b.icon,
                tier: b.tier,
                unlocked: !!b.earned_at,
                earnedAt: b.earned_at
            }));
        } catch (e) {
            console.error("Error fetching badges", e);
            return [];
        }
    }
}

export default new TrainingService();
