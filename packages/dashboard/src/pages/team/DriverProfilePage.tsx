import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
    ChevronLeft,
    Activity,
    Clock,
    Target,
    Zap,
    Trophy,
    CheckCircle2,
    CircleDot,
    XCircle,
    Users,
    Calendar
} from 'lucide-react';
import { DriverProfile, DriverTrait, SessionMetric, PerformanceData } from '../../types/team.types';

// iRacing Profile Data
interface iRacingStats {
    irating: number;
    irating_history: { date: string; value: number }[];
    safety_rating: number;
    license_class: 'R' | 'D' | 'C' | 'B' | 'A' | 'Pro' | 'Pro/WC';
    license_level: number; // 1-4
    corners_per_incident: number;
    starts: number;
    wins: number;
    podiums: number;
    poles: number;
    laps_led: number;
    time_in_sim_hours: number;
    member_since: string;
    club: string;
}

// Target Metrics
interface DriverTarget {
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
    progress_history?: { date: string; value: string | number }[];
    achieved_at?: string;
}

// Auto-generated suggestions from Driver Development Engine
interface SuggestedTarget {
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

// Mock data for demo mode
const mockProfiles: Record<string, DriverProfile> = {
    'd1': {
        id: 'd1',
        user_id: 'u1',
        display_name: 'Alex Rivera',
        avatar_url: null,
        bio: 'GT specialist with focus on endurance racing. Multiple 24H race winner.',
        primary_discipline: 'road',
        timezone: 'America/New_York',
        privacy_level: 'team_only',
        total_sessions: 42,
        total_laps: 1847,
        total_incidents: 33,
        created_at: '2025-06-15T10:00:00Z'
    },
    'd2': {
        id: 'd2',
        user_id: 'u2',
        display_name: 'Jordan Chen',
        avatar_url: null,
        bio: 'Aggressive racer with strong qualifying pace. Working on race craft consistency.',
        primary_discipline: 'road',
        timezone: 'America/Los_Angeles',
        privacy_level: 'team_only',
        total_sessions: 38,
        total_laps: 1523,
        total_incidents: 32,
        created_at: '2025-08-22T14:30:00Z'
    },
    'd3': {
        id: 'd3',
        user_id: 'u3',
        display_name: 'Sam Williams',
        avatar_url: null,
        bio: 'Endurance specialist known for tire management and consistency.',
        primary_discipline: 'road',
        timezone: 'Europe/London',
        privacy_level: 'team_only',
        total_sessions: 29,
        total_laps: 1102,
        total_incidents: 26,
        created_at: '2025-09-10T09:15:00Z'
    },
    'd4': {
        id: 'd4',
        user_id: 'u4',
        display_name: 'Casey Morgan',
        avatar_url: null,
        bio: 'New to simracing, rapidly improving with coaching focus.',
        primary_discipline: 'road',
        timezone: 'America/Chicago',
        privacy_level: 'team_only',
        total_sessions: 15,
        total_laps: 624,
        total_incidents: 20,
        created_at: '2025-12-01T16:45:00Z'
    }
};

const mockIRacingStats: Record<string, iRacingStats> = {
    'd1': {
        irating: 4856,
        irating_history: [
            { date: '2025-07', value: 3200 },
            { date: '2025-08', value: 3450 },
            { date: '2025-09', value: 3890 },
            { date: '2025-10', value: 4100 },
            { date: '2025-11', value: 4520 },
            { date: '2025-12', value: 4680 },
            { date: '2026-01', value: 4856 }
        ],
        safety_rating: 4.67,
        license_class: 'A',
        license_level: 4,
        corners_per_incident: 287,
        starts: 156,
        wins: 23,
        podiums: 67,
        poles: 12,
        laps_led: 892,
        time_in_sim_hours: 423,
        member_since: '2022-03-15',
        club: 'New York'
    },
    'd2': {
        irating: 5234,
        irating_history: [
            { date: '2025-07', value: 4100 },
            { date: '2025-08', value: 4350 },
            { date: '2025-09', value: 4800 },
            { date: '2025-10', value: 5100 },
            { date: '2025-11', value: 5050 },
            { date: '2025-12', value: 5180 },
            { date: '2026-01', value: 5234 }
        ],
        safety_rating: 3.21,
        license_class: 'A',
        license_level: 3,
        corners_per_incident: 145,
        starts: 142,
        wins: 31,
        podiums: 58,
        poles: 28,
        laps_led: 1247,
        time_in_sim_hours: 387,
        member_since: '2021-09-22',
        club: 'California'
    },
    'd3': {
        irating: 3876,
        irating_history: [
            { date: '2025-09', value: 2800 },
            { date: '2025-10', value: 3100 },
            { date: '2025-11', value: 3450 },
            { date: '2025-12', value: 3720 },
            { date: '2026-01', value: 3876 }
        ],
        safety_rating: 4.21,
        license_class: 'B',
        license_level: 4,
        corners_per_incident: 198,
        starts: 78,
        wins: 8,
        podiums: 29,
        poles: 3,
        laps_led: 312,
        time_in_sim_hours: 189,
        member_since: '2024-06-10',
        club: 'UK and I'
    },
    'd4': {
        irating: 1842,
        irating_history: [
            { date: '2025-12', value: 1350 },
            { date: '2026-01', value: 1842 }
        ],
        safety_rating: 2.87,
        license_class: 'D',
        license_level: 2,
        corners_per_incident: 78,
        starts: 34,
        wins: 0,
        podiums: 2,
        poles: 0,
        laps_led: 12,
        time_in_sim_hours: 47,
        member_since: '2025-11-15',
        club: 'Illinois'
    }
};

const mockTargets: Record<string, DriverTarget[]> = {
    'd1': [
        { id: 't1', label: 'Spa Lap Time', category: 'lap_time', target_value: '2:17.000', current_value: '2:18.342', status: 'in_progress', track: 'Spa-Francorchamps', created_by: 'Team Manager', notes: 'Focus on Eau Rouge exit and Bus Stop chicane. Current best is close - need clean air lap.', progress_history: [{ date: '2026-01-08', value: '2:19.102' }, { date: '2026-01-10', value: '2:18.890' }, { date: '2026-01-12', value: '2:18.342' }] },
        { id: 't2', label: 'Consistency < 0.5%', category: 'consistency', target_value: 0.5, current_value: 0.42, status: 'achieved', created_by: 'Self', achieved_at: '2026-01-05', notes: 'Achieved during Spa practice week. Key was smoother inputs through fast corners.' },
        { id: 't3', label: 'Zero Incidents (Race)', category: 'safety', target_value: 0, current_value: 0, status: 'achieved', created_by: 'Team Manager', achieved_at: '2026-01-12', notes: 'Clean race at Spa Endurance - gained 2 positions through patience.' },
        { id: 't4', label: 'Reach 5000 iR', category: 'irating', target_value: 5000, current_value: 4856, status: 'in_progress', deadline: '2026-02-28', created_by: 'Self', notes: 'Need +144 iR. Focus on consistent top-5 finishes rather than risky moves for wins.', progress_history: [{ date: '2025-12-01', value: 4520 }, { date: '2025-12-15', value: 4680 }, { date: '2026-01-01', value: 4780 }, { date: '2026-01-15', value: 4856 }] }
    ],
    'd2': [
        { id: 't5', label: 'Safety Rating 4.0+', category: 'safety', target_value: 4.0, current_value: 3.21, status: 'in_progress', created_by: 'Team Manager', notes: 'Priority target - need to reduce aggressive wheel-to-wheel moves. Consider D-class races for SR farming.', progress_history: [{ date: '2025-12-01', value: 2.89 }, { date: '2026-01-01', value: 3.05 }, { date: '2026-01-15', value: 3.21 }] },
        { id: 't6', label: 'Maintain 5000+ iR', category: 'irating', target_value: 5000, current_value: 5234, status: 'achieved', created_by: 'Self', achieved_at: '2025-10-22' },
        { id: 't7', label: 'Daytona Target Lap', category: 'lap_time', target_value: '1:47.500', current_value: '1:47.891', status: 'in_progress', track: 'Daytona Road', created_by: 'Team Manager', notes: 'Gap is in Turn 1 braking zone and bus stop. Review Alex\'s onboard for reference.' }
    ],
    'd3': [
        { id: 't8', label: 'Reach 4000 iR', category: 'irating', target_value: 4000, current_value: 3876, status: 'in_progress', deadline: '2026-03-01', created_by: 'Self', notes: 'Steady progress - focus on race craft over raw pace.', progress_history: [{ date: '2025-10-01', value: 2800 }, { date: '2025-11-01', value: 3100 }, { date: '2025-12-01', value: 3450 }, { date: '2026-01-01', value: 3720 }, { date: '2026-01-15', value: 3876 }] },
        { id: 't9', label: 'A License', category: 'custom', target_value: 'A 1.00', current_value: 'B 4.21', status: 'in_progress', created_by: 'Team Manager', notes: 'On track - should promote next week if clean racing continues.' }
    ],
    'd4': [
        { id: 't10', label: 'Reach 2000 iR', category: 'irating', target_value: 2000, current_value: 1842, status: 'in_progress', deadline: '2026-02-15', created_by: 'Team Manager' },
        { id: 't11', label: 'C License', category: 'custom', target_value: 'C 1.00', current_value: 'D 2.87', status: 'in_progress', created_by: 'Team Manager' },
        { id: 't12', label: 'First Podium', category: 'custom', target_value: 'Top 3 Finish', current_value: 'Best: P4', status: 'in_progress', created_by: 'Self' },
        { id: 't13', label: 'Complete 50 Races', category: 'custom', target_value: 50, current_value: 34, status: 'in_progress', created_by: 'Self' }
    ]
};

// Auto-generated suggestions from Driver Development Engine
const mockSuggestions: Record<string, SuggestedTarget[]> = {
    'd1': [
        { id: 'sug-1', label: 'Monza Lap Time', category: 'lap_time', target_value: '1:48.500', current_value: '1:49.234', track: 'Monza', rationale: "You're 0.8% off the team benchmark. Focus on Lesmo corners and Parabolica exit.", priority: 'medium', estimated_timeline: '1-2 weeks' }
    ],
    'd2': [
        { id: 'sug-2', label: 'Reduce Incident Rate', category: 'safety', target_value: 1.5, current_value: 2.8, rationale: 'Your incident rate is 2.8 per 100 laps. Aim for under 1.5 to improve SR and race results.', priority: 'high' },
        { id: 'sug-3', label: 'Lap Time Consistency', category: 'consistency', target_value: 0.5, current_value: 0.82, rationale: 'Your lap time variance is 0.82%. Target: below 0.5% for elite-level consistency.', priority: 'medium' }
    ],
    'd3': [
        { id: 'sug-4', label: 'Reach A 4.00 SR', category: 'safety', target_value: 4.0, current_value: 4.21, rationale: 'SR trending up! Keep clean racing to maintain A license.', priority: 'low' }
    ],
    'd4': [
        { id: 'sug-5', label: 'Lap Time Consistency', category: 'consistency', target_value: 1.0, current_value: 2.1, rationale: 'Your lap time variance is 2.1%. Focus on consistent braking points and smooth inputs.', priority: 'high', estimated_timeline: '2-4 weeks' },
        { id: 'sug-6', label: 'Reach 2500 iR', category: 'irating', target_value: 2500, current_value: 1842, rationale: 'At current pace, ~15 races to reach 2500. Focus on consistent finishes.', priority: 'medium', estimated_timeline: '~4 weeks' }
    ]
};

const mockTraits: Record<string, DriverTrait[]> = {
    'd1': [
        { key: 'consistent', label: 'Consistent', category: 'consistency', confidence: 0.92 },
        { key: 'fuel_saver', label: 'Fuel Saver', category: 'style', confidence: 0.85 },
        { key: 'night_specialist', label: 'Night Specialist', category: 'style', confidence: 0.78 }
    ],
    'd2': [
        { key: 'aggressive', label: 'Aggressive', category: 'risk', confidence: 0.88 },
        { key: 'wet_weather', label: 'Wet Weather', category: 'style', confidence: 0.82 },
        { key: 'quick_qualifier', label: 'Quick Qualifier', category: 'pace', confidence: 0.90 }
    ],
    'd3': [
        { key: 'tire_management', label: 'Tire Management', category: 'endurance', confidence: 0.87 },
        { key: 'endurance', label: 'Endurance', category: 'endurance', confidence: 0.84 }
    ],
    'd4': [
        { key: 'rookie', label: 'Rookie', category: 'style', confidence: 0.95 }
    ]
};

const mockPerformance: Record<string, PerformanceData> = {
    'd1': {
        driver_profile_id: 'd1',
        global: {
            session_count: 42,
            lap_count: 1847,
            avg_pace_percentile: 78,
            best_pace_percentile: 94,
            consistency_index: 92,
            risk_index: 15,
            avg_positions_gained: 2.3
        },
        traits: mockTraits['d1'],
        computed_at: '2026-01-15T12:00:00Z'
    },
    'd2': {
        driver_profile_id: 'd2',
        global: {
            session_count: 38,
            lap_count: 1523,
            avg_pace_percentile: 85,
            best_pace_percentile: 97,
            consistency_index: 76,
            risk_index: 35,
            avg_positions_gained: 1.8
        },
        traits: mockTraits['d2'],
        computed_at: '2026-01-15T12:00:00Z'
    },
    'd3': {
        driver_profile_id: 'd3',
        global: {
            session_count: 29,
            lap_count: 1102,
            avg_pace_percentile: 72,
            best_pace_percentile: 88,
            consistency_index: 84,
            risk_index: 22,
            avg_positions_gained: 1.1
        },
        traits: mockTraits['d3'],
        computed_at: '2026-01-15T12:00:00Z'
    },
    'd4': {
        driver_profile_id: 'd4',
        global: {
            session_count: 15,
            lap_count: 624,
            avg_pace_percentile: 58,
            best_pace_percentile: 71,
            consistency_index: 65,
            risk_index: 45,
            avg_positions_gained: -0.3
        },
        traits: mockTraits['d4'],
        computed_at: '2026-01-15T12:00:00Z'
    }
};

const mockSessions: Record<string, SessionMetric[]> = {
    'd1': [
        { id: 's1', session_id: 'sess-001', session_name: 'Spa Endurance Race', track_name: 'Spa-Francorchamps', car_name: 'Porsche 911 GT3 R', total_laps: 45, valid_laps: 44, best_lap_time_ms: 138342, median_lap_time_ms: 139012, incident_count: 0, finish_position: 3, start_position: 5, irating_change: 47, computed_at: '2026-01-12T18:00:00Z' },
        { id: 's2', session_id: 'sess-002', session_name: 'Daytona Practice', track_name: 'Daytona Road Course', car_name: 'Porsche 911 GT3 R', total_laps: 28, valid_laps: 26, best_lap_time_ms: 107891, median_lap_time_ms: 108450, incident_count: 1, finish_position: null, start_position: null, irating_change: null, computed_at: '2026-01-10T14:00:00Z' },
        { id: 's3', session_id: 'sess-003', session_name: 'Nordschleife Time Attack', track_name: 'Nürburgring Nordschleife', car_name: 'Porsche 911 GT3 R', total_laps: 12, valid_laps: 10, best_lap_time_ms: 422445, median_lap_time_ms: 425100, incident_count: 2, finish_position: null, start_position: null, irating_change: null, computed_at: '2026-01-08T16:00:00Z' }
    ],
    'd2': [
        { id: 's4', session_id: 'sess-001', session_name: 'Spa Endurance Race', track_name: 'Spa-Francorchamps', car_name: 'Porsche 911 GT3 R', total_laps: 42, valid_laps: 40, best_lap_time_ms: 137890, median_lap_time_ms: 139200, incident_count: 2, finish_position: 3, start_position: 2, irating_change: 32, computed_at: '2026-01-12T18:00:00Z' },
        { id: 's5', session_id: 'sess-004', session_name: 'Monza Sprint', track_name: 'Autodromo Nazionale Monza', car_name: 'Porsche 911 GT3 R', total_laps: 18, valid_laps: 18, best_lap_time_ms: 108234, median_lap_time_ms: 108890, incident_count: 0, finish_position: 1, start_position: 1, irating_change: 65, computed_at: '2026-01-05T20:00:00Z' }
    ],
    'd3': [
        { id: 's6', session_id: 'sess-001', session_name: 'Spa Endurance Race', track_name: 'Spa-Francorchamps', car_name: 'Porsche 911 GT3 R', total_laps: 48, valid_laps: 47, best_lap_time_ms: 139100, median_lap_time_ms: 139800, incident_count: 1, finish_position: 3, start_position: 6, irating_change: 28, computed_at: '2026-01-12T18:00:00Z' }
    ],
    'd4': [
        { id: 's7', session_id: 'sess-005', session_name: 'Rookie Training', track_name: 'Lime Rock Park', car_name: 'Mazda MX-5', total_laps: 22, valid_laps: 18, best_lap_time_ms: 58920, median_lap_time_ms: 60100, incident_count: 3, finish_position: 12, start_position: 15, irating_change: 18, computed_at: '2026-01-14T17:00:00Z' }
    ]
};

// Format lap time from ms
function formatLapTime(ms: number | null): string {
    if (!ms) return '—';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
}

// License class colors
const licenseColors: Record<string, string> = {
    'R': 'bg-red-600',
    'D': 'bg-orange-500',
    'C': 'bg-yellow-500',
    'B': 'bg-green-500',
    'A': 'bg-blue-500',
    'Pro': 'bg-black border border-white',
    'Pro/WC': 'bg-black border-2 border-yellow-400'
};

// Trait category colors
const traitCategoryColors: Record<string, string> = {
    consistency: 'bg-racing-green/10 text-racing-green border-racing-green/30',
    risk: 'bg-racing-red/10 text-racing-red border-racing-red/30',
    pace: 'bg-racing-blue/10 text-racing-blue border-racing-blue/30',
    endurance: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    racecraft: 'bg-racing-yellow/10 text-racing-yellow border-racing-yellow/30',
    style: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
};

// Target status colors
const targetStatusConfig = {
    achieved: { icon: CheckCircle2, color: 'text-racing-green', bg: 'bg-racing-green/10' },
    in_progress: { icon: CircleDot, color: 'text-racing-yellow', bg: 'bg-racing-yellow/10' },
    not_started: { icon: CircleDot, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
    failed: { icon: XCircle, color: 'text-racing-red', bg: 'bg-racing-red/10' }
};

export default function DriverProfilePage() {
    const { teamId, driverId } = useParams<{ teamId: string; driverId: string }>();
    const { accessToken } = useAuthStore();

    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [iracingStats, setIracingStats] = useState<iRacingStats | null>(null);
    const [targets, setTargets] = useState<DriverTarget[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedTarget[]>([]);
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [sessions, setSessions] = useState<SessionMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

    useEffect(() => {
        if (driverId) fetchData();
    }, [driverId]);

    const fetchData = async () => {
        setLoading(true);

        // Demo mode
        if (teamId === 'demo') {
            await new Promise(r => setTimeout(r, 400));
            setProfile(mockProfiles[driverId!] || null);
            setIracingStats(mockIRacingStats[driverId!] || null);
            setTargets(mockTargets[driverId!] || []);
            setSuggestions(mockSuggestions[driverId!] || []);
            setPerformance(mockPerformance[driverId!] || null);
            setSessions(mockSessions[driverId!] || []);
            setLoading(false);
            return;
        }

        // Real API calls
        try {
            const [profileRes, perfRes, sessionsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/api/v1/drivers/${driverId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/api/v1/drivers/${driverId}/performance`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/api/v1/drivers/${driverId}/sessions?limit=10`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
            ]);

            if (profileRes.ok) setProfile(await profileRes.json());
            if (perfRes.ok) setPerformance(await perfRes.json());
            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                setSessions(data.sessions || []);
            }
        } catch (err) {
            console.error('Failed to fetch driver data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading profile...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6 text-center">
                <p className="text-zinc-400">Driver not found</p>
                <Link to={`/teams/${teamId}/roster`} className="text-racing-blue hover:underline mt-2 inline-block">
                    ← Back to Roster
                </Link>
            </div>
        );
    }

    const perf = performance?.global;
    const traits = performance?.traits || [];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Back Link */}
            <Link
                to={`/teams/${teamId}/roster`}
                className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6"
            >
                <ChevronLeft size={16} />
                Back to Roster
            </Link>

            {/* Header Card */}
            <div className="card mb-6">
                <div className="p-6">
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl font-bold text-zinc-300 shadow-lg">
                            {profile.display_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-4">
                                <h1 className="font-racing text-3xl text-white tracking-wide">{profile.display_name}</h1>
                                {iracingStats && (
                                    <div className={`px-2 py-1 rounded text-xs font-bold text-white ${licenseColors[iracingStats.license_class]}`}>
                                        {iracingStats.license_class} {iracingStats.license_level}.{Math.floor(iracingStats.safety_rating * 100) % 100}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                                <span className="capitalize">{profile.primary_discipline}</span>
                                <span>•</span>
                                <span>{profile.timezone}</span>
                                {iracingStats && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Member since {new Date(iracingStats.member_since).getFullYear()}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Users size={12} />
                                            {iracingStats.club}
                                        </span>
                                    </>
                                )}
                            </div>
                            {profile.bio && (
                                <p className="mt-3 text-zinc-400 max-w-2xl">{profile.bio}</p>
                            )}
                            <Link
                                to={`/teams/${teamId}/driver/${driverId}/idp`}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-racing-blue/20 hover:bg-racing-blue/30 text-racing-blue rounded-lg text-sm font-medium transition-colors"
                            >
                                <Target size={16} />
                                View Development Plan
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* iRacing Stats + Performance Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* iRacing Stats Card */}
                {iracingStats && (
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-racing-yellow" />
                                <span className="font-medium text-sm uppercase tracking-wider">iRacing Stats</span>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">iRating</div>
                                    <div className="text-3xl font-bold font-mono text-racing-blue">{iracingStats.irating.toLocaleString()}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Safety Rating</div>
                                    <div className="text-3xl font-bold font-mono text-racing-green">{iracingStats.safety_rating.toFixed(2)}</div>
                                    <div className="text-xs text-zinc-500 mt-1">{iracingStats.corners_per_incident} C/I</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                <StatMini label="Starts" value={iracingStats.starts} />
                                <StatMini label="Wins" value={iracingStats.wins} highlight />
                                <StatMini label="Podiums" value={iracingStats.podiums} />
                                <StatMini label="Poles" value={iracingStats.poles} />
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/5">
                                <StatMini label="Laps Led" value={iracingStats.laps_led.toLocaleString()} />
                                <StatMini label="Time (hrs)" value={iracingStats.time_in_sim_hours} />
                                <StatMini label="Win Rate" value={`${((iracingStats.wins / iracingStats.starts) * 100).toFixed(1)}%`} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Our Analysis Card */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-racing-blue" />
                            <span className="font-medium text-sm uppercase tracking-wider">Analysis</span>
                        </div>
                        <span className="text-xs text-zinc-500">by Ok, Box Box</span>
                    </div>
                    <div className="p-5">
                        {perf ? (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <MetricBar label="Pace" value={perf.avg_pace_percentile ?? 0} color="racing-blue" />
                                    <MetricBar label="Consistency" value={perf.consistency_index ?? 0} color="racing-green" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <MetricBar label="Risk" value={perf.risk_index ?? 0} color="racing-red" inverted />
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Pos. Gained</div>
                                        <div className={`text-xl font-bold font-mono ${(perf.avg_positions_gained ?? 0) > 0 ? 'text-racing-green' : (perf.avg_positions_gained ?? 0) < 0 ? 'text-racing-red' : 'text-zinc-400'}`}>
                                            {(perf.avg_positions_gained ?? 0) > 0 ? '+' : ''}{(perf.avg_positions_gained ?? 0).toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                                {/* Traits */}
                                {traits.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Detected Traits</div>
                                        <div className="flex flex-wrap gap-2">
                                            {traits.map((trait, i) => (
                                                <span key={i} className={`text-xs px-2.5 py-1 rounded border ${traitCategoryColors[trait.category] || traitCategoryColors.style}`}>
                                                    {trait.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-zinc-500 text-center py-8">No analysis data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Target Metrics */}
            {targets.length > 0 && (
                <div className="card mb-6">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-racing-yellow" />
                            <span className="font-medium text-sm uppercase tracking-wider">Target Metrics</span>
                        </div>
                        <span className="text-xs text-zinc-500">{targets.filter(t => t.status === 'achieved').length}/{targets.length} achieved</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {targets.map(target => {
                            const config = targetStatusConfig[target.status];
                            const StatusIcon = config.icon;
                            const isExpanded = expandedTarget === target.id;
                            return (
                                <div key={target.id}>
                                    <div
                                        className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => setExpandedTarget(isExpanded ? null : target.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                                                <StatusIcon size={16} className={config.color} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{target.label}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {target.track && <span>{target.track} • </span>}
                                                    Set by {target.created_by}
                                                    {target.deadline && <span> • Due {target.deadline}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="font-mono text-sm">
                                                    <span className={config.color}>{target.current_value}</span>
                                                    <span className="text-zinc-600"> / </span>
                                                    <span className="text-zinc-400">{target.target_value}</span>
                                                </div>
                                                <div className={`text-xs capitalize ${config.color}`}>
                                                    {target.status.replace('_', ' ')}
                                                </div>
                                            </div>
                                            <ChevronLeft size={16} className={`text-zinc-500 transition-transform ${isExpanded ? '-rotate-90' : ''}`} />
                                        </div>
                                    </div>
                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-0 ml-12 border-l-2 border-white/10">
                                            {/* Notes */}
                                            {target.notes && (
                                                <div className="mb-3">
                                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Notes</div>
                                                    <p className="text-sm text-zinc-300">{target.notes}</p>
                                                </div>
                                            )}
                                            {/* Progress History */}
                                            {target.progress_history && target.progress_history.length > 0 && (
                                                <div className="mb-3">
                                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Progress</div>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {target.progress_history.map((p, i) => (
                                                            <div key={i} className="bg-slate-800/50 rounded px-2 py-1 text-xs">
                                                                <span className="text-zinc-500">{p.date}:</span>
                                                                <span className="text-white ml-1 font-mono">{p.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Achieved Date */}
                                            {target.achieved_at && (
                                                <div className="mb-3">
                                                    <span className="text-xs text-racing-green">✓ Achieved on {target.achieved_at}</span>
                                                </div>
                                            )}
                                            {/* Actions */}
                                            <div className="flex gap-2 mt-3">
                                                <button className="btn btn-sm text-xs py-1 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded">Edit</button>
                                                <button className="btn btn-sm text-xs py-1 px-3 bg-racing-red/20 hover:bg-racing-red/30 text-racing-red rounded">Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Suggested Targets (Auto-generated by Driver Development Engine) */}
            {suggestions.length > 0 && (
                <div className="card mb-6 border border-racing-blue/20">
                    <div className="card-header bg-racing-blue/5">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-racing-blue" />
                            <span className="font-medium text-sm uppercase tracking-wider">Suggested by Ok, Box Box</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-racing-blue/10 text-racing-blue">New</span>
                        </div>
                        <span className="text-xs text-zinc-500">{suggestions.length} recommendation{suggestions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {suggestions.map(suggestion => {
                            const priorityColors = {
                                high: 'text-racing-red bg-racing-red/10',
                                medium: 'text-racing-yellow bg-racing-yellow/10',
                                low: 'text-racing-green bg-racing-green/10'
                            };
                            return (
                                <div key={suggestion.id} className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{suggestion.label}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[suggestion.priority]}`}>
                                                    {suggestion.priority}
                                                </span>
                                                {suggestion.estimated_timeline && (
                                                    <span className="text-xs text-zinc-500">{suggestion.estimated_timeline}</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-2">{suggestion.rationale}</p>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                {suggestion.track && <span>Track: {suggestion.track}</span>}
                                                <span>Current: <span className="text-zinc-300 font-mono">{suggestion.current_value}</span></span>
                                                <span>Target: <span className="text-racing-green font-mono">{suggestion.target_value}</span></span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    // Accept: convert to active target
                                                    const newTarget: DriverTarget = {
                                                        id: `target-${Date.now()}`,
                                                        label: suggestion.label,
                                                        category: suggestion.category,
                                                        target_value: suggestion.target_value,
                                                        current_value: suggestion.current_value,
                                                        status: 'in_progress',
                                                        track: suggestion.track,
                                                        notes: suggestion.rationale,
                                                        created_by: 'Ok, Box Box'
                                                    };
                                                    setTargets([...targets, newTarget]);
                                                    setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
                                                }}
                                                className="btn btn-sm text-xs py-1.5 px-3 bg-racing-green/20 hover:bg-racing-green/30 text-racing-green rounded font-medium"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}
                                                className="btn btn-sm text-xs py-1.5 px-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Team Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-label">Team Sessions</div>
                    <div className="stat-value">{profile.total_sessions}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Team Laps</div>
                    <div className="stat-value">{profile.total_laps.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Team Incidents</div>
                    <div className="stat-value">{profile.total_incidents}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Inc / 100 Laps</div>
                    <div className="stat-value">
                        {profile.total_laps > 0
                            ? ((profile.total_incidents / profile.total_laps) * 100).toFixed(1)
                            : '—'
                        }
                    </div>
                </div>
            </div>

            {/* Session History */}
            <div className="card">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-racing-blue" />
                        <span className="font-medium text-sm uppercase tracking-wider">Session History</span>
                    </div>
                    <span className="text-xs text-zinc-500">{sessions.length} recent</span>
                </div>
                {sessions.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                                <th className="text-left py-3 px-5">Session</th>
                                <th className="text-left py-3 px-3">Track</th>
                                <th className="text-right py-3 px-3">Laps</th>
                                <th className="text-right py-3 px-3">Best Time</th>
                                <th className="text-right py-3 px-3">Inc</th>
                                <th className="text-right py-3 px-3">Pos</th>
                                <th className="text-right py-3 px-5">iR Δ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(s => (
                                <tr key={s.id} className="table-row">
                                    <td className="py-3 px-5 font-medium text-white">{s.session_name || 'Session'}</td>
                                    <td className="py-3 px-3 text-zinc-400">{s.track_name}</td>
                                    <td className="py-3 px-3 text-right font-mono text-zinc-300">{s.total_laps}</td>
                                    <td className="py-3 px-3 text-right font-mono text-racing-green">{formatLapTime(s.best_lap_time_ms)}</td>
                                    <td className="py-3 px-3 text-right font-mono text-zinc-300">{s.incident_count}</td>
                                    <td className="py-3 px-3 text-right font-mono text-zinc-300">
                                        {s.finish_position ? `P${s.finish_position}` : '—'}
                                    </td>
                                    <td className={`py-3 px-5 text-right font-mono ${s.irating_change && s.irating_change > 0 ? 'text-racing-green' : s.irating_change && s.irating_change < 0 ? 'text-racing-red' : 'text-zinc-400'}`}>
                                        {s.irating_change != null ? (s.irating_change > 0 ? '+' : '') + s.irating_change : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-zinc-500">
                        No session history available
                    </div>
                )}
            </div>
        </div>
    );
}

// Mini stat component
function StatMini({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className="text-center">
            <div className={`text-lg font-bold font-mono ${highlight ? 'text-racing-yellow' : 'text-white'}`}>{value}</div>
            <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
        </div>
    );
}

// Metric bar component
function MetricBar({ label, value, color, inverted = false }: { label: string; value: number; color: string; inverted?: boolean }) {
    const colorClasses: Record<string, string> = {
        'racing-blue': 'bg-racing-blue',
        'racing-green': 'bg-racing-green',
        'racing-red': 'bg-racing-red',
        'racing-yellow': 'bg-racing-yellow'
    };
    const textColorClasses: Record<string, string> = {
        'racing-blue': 'text-racing-blue',
        'racing-green': 'text-racing-green',
        'racing-red': 'text-racing-red',
        'racing-yellow': 'text-racing-yellow'
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
                <span className={`text-sm font-bold font-mono ${textColorClasses[color]}`}>{value}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${colorClasses[color]}`}
                    style={{ width: `${inverted ? 100 - value : value}%` }}
                />
            </div>
        </div>
    );
}
