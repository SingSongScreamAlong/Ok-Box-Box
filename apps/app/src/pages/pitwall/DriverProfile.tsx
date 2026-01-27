import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Activity, Clock, Target, Trophy, CheckCircle2, CircleDot, Users, Calendar, TrendingUp, TrendingDown, Zap, Brain, AlertTriangle, Award, Flame, Shield, Loader2 } from 'lucide-react';

// Types - comprehensive driver development modeling
interface DriverProfile {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  primary_discipline: 'road' | 'oval' | 'dirt_road' | 'dirt_oval';
  timezone: string;
  total_sessions: number;
  total_laps: number;
  total_incidents: number;
}

interface iRacingStats {
  irating: number;
  irating_history: { date: string; value: number }[];
  irating_trend: 'up' | 'down' | 'stable';
  irating_30d_change: number;
  safety_rating: number;
  sr_history: { date: string; value: number }[];
  license_class: 'R' | 'D' | 'C' | 'B' | 'A' | 'Pro';
  license_level: number;
  corners_per_incident: number;
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  laps_led: number;
  time_in_sim_hours: number;
  member_since: string;
  club: string;
  recent_form: ('win' | 'podium' | 'top5' | 'top10' | 'finish' | 'dnf')[];
}

interface DriverTrait {
  key: string;
  label: string;
  category: 'consistency' | 'risk' | 'pace' | 'endurance' | 'racecraft' | 'style';
  confidence: number;
}

interface DriverTarget {
  id: string;
  label: string;
  category: string;
  target_value: number | string;
  current_value: number | string;
  status: 'achieved' | 'in_progress' | 'not_started';
  track?: string;
  created_by: string;
  notes?: string;
  progress_pct?: number;
}

interface SessionMetric {
  id: string;
  session_name?: string;
  track_name?: string;
  total_laps: number;
  best_lap_time_ms: number | null;
  incident_count: number;
  finish_position: number | null;
  start_position: number | null;
  irating_change: number | null;
  date: string;
}

interface AICoachingInsight {
  id: string;
  type: 'strength' | 'improvement' | 'focus' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  track?: string;
  metric?: string;
  suggested_action?: string;
}

interface DevelopmentMilestone {
  id: string;
  title: string;
  achieved_at: string;
  category: 'irating' | 'license' | 'wins' | 'consistency' | 'endurance';
}

// Mock data from legacy
const mockProfiles: Record<string, DriverProfile> = {
  'd1': {
    id: 'd1', user_id: 'u1', display_name: 'Alex Rivera', avatar_url: null,
    bio: 'GT specialist with focus on endurance racing. Multiple 24H race winner.',
    primary_discipline: 'road', timezone: 'America/New_York',
    total_sessions: 42, total_laps: 1847, total_incidents: 33
  },
  'd2': {
    id: 'd2', user_id: 'u2', display_name: 'Jordan Chen', avatar_url: null,
    bio: 'Aggressive racer with strong qualifying pace. Working on race craft consistency.',
    primary_discipline: 'road', timezone: 'America/Los_Angeles',
    total_sessions: 38, total_laps: 1523, total_incidents: 32
  },
  'd3': {
    id: 'd3', user_id: 'u3', display_name: 'Sam Williams', avatar_url: null,
    bio: 'Endurance specialist known for tire management and consistency.',
    primary_discipline: 'road', timezone: 'Europe/London',
    total_sessions: 29, total_laps: 1102, total_incidents: 26
  },
  'd4': {
    id: 'd4', user_id: 'u4', display_name: 'Casey Morgan', avatar_url: null,
    bio: 'New to simracing, rapidly improving with coaching focus.',
    primary_discipline: 'road', timezone: 'America/Chicago',
    total_sessions: 15, total_laps: 624, total_incidents: 20
  }
};

const mockIRacingStats: Record<string, iRacingStats> = {
  'd1': { 
    irating: 4856, 
    irating_history: [{ date: '2025-07', value: 3200 }, { date: '2025-08', value: 3450 }, { date: '2025-09', value: 3890 }, { date: '2025-10', value: 4100 }, { date: '2025-11', value: 4520 }, { date: '2025-12', value: 4680 }, { date: '2026-01', value: 4856 }],
    irating_trend: 'up', irating_30d_change: 176,
    safety_rating: 4.67, 
    sr_history: [{ date: '2025-10', value: 4.12 }, { date: '2025-11', value: 4.45 }, { date: '2025-12', value: 4.52 }, { date: '2026-01', value: 4.67 }],
    license_class: 'A', license_level: 4, corners_per_incident: 287, starts: 156, wins: 23, podiums: 67, poles: 12, laps_led: 892, time_in_sim_hours: 423, member_since: '2022-03-15', club: 'New York',
    recent_form: ['podium', 'top5', 'win', 'podium', 'top5']
  },
  'd2': { 
    irating: 5234, 
    irating_history: [{ date: '2025-07', value: 4100 }, { date: '2025-08', value: 4350 }, { date: '2025-09', value: 4800 }, { date: '2025-10', value: 5100 }, { date: '2025-11', value: 5050 }, { date: '2025-12', value: 5180 }, { date: '2026-01', value: 5234 }],
    irating_trend: 'stable', irating_30d_change: 54,
    safety_rating: 3.21, 
    sr_history: [{ date: '2025-10', value: 2.89 }, { date: '2025-11', value: 3.05 }, { date: '2025-12', value: 3.12 }, { date: '2026-01', value: 3.21 }],
    license_class: 'A', license_level: 3, corners_per_incident: 145, starts: 142, wins: 31, podiums: 58, poles: 28, laps_led: 1247, time_in_sim_hours: 387, member_since: '2021-09-22', club: 'California',
    recent_form: ['win', 'dnf', 'win', 'podium', 'top5']
  },
  'd3': { 
    irating: 3876, 
    irating_history: [{ date: '2025-09', value: 2800 }, { date: '2025-10', value: 3100 }, { date: '2025-11', value: 3450 }, { date: '2025-12', value: 3720 }, { date: '2026-01', value: 3876 }],
    irating_trend: 'up', irating_30d_change: 156,
    safety_rating: 4.21, 
    sr_history: [{ date: '2025-10', value: 3.78 }, { date: '2025-11', value: 3.95 }, { date: '2025-12', value: 4.08 }, { date: '2026-01', value: 4.21 }],
    license_class: 'B', license_level: 4, corners_per_incident: 198, starts: 78, wins: 8, podiums: 29, poles: 3, laps_led: 312, time_in_sim_hours: 189, member_since: '2024-06-10', club: 'UK and I',
    recent_form: ['podium', 'top5', 'top5', 'top10', 'podium']
  },
  'd4': { 
    irating: 1842, 
    irating_history: [{ date: '2025-12', value: 1350 }, { date: '2026-01', value: 1842 }],
    irating_trend: 'up', irating_30d_change: 492,
    safety_rating: 2.87, 
    sr_history: [{ date: '2025-12', value: 2.12 }, { date: '2026-01', value: 2.87 }],
    license_class: 'D', license_level: 2, corners_per_incident: 78, starts: 34, wins: 0, podiums: 2, poles: 0, laps_led: 12, time_in_sim_hours: 47, member_since: '2025-11-15', club: 'Illinois',
    recent_form: ['top10', 'finish', 'top5', 'dnf', 'top10']
  }
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

const mockTargets: Record<string, DriverTarget[]> = {
  'd1': [
    { id: 't1', label: 'Spa Lap Time', category: 'lap_time', target_value: '2:17.000', current_value: '2:18.342', status: 'in_progress', track: 'Spa-Francorchamps', created_by: 'Team Manager' },
    { id: 't2', label: 'Consistency < 0.5%', category: 'consistency', target_value: 0.5, current_value: 0.42, status: 'achieved', created_by: 'Self' },
    { id: 't3', label: 'Reach 5000 iR', category: 'irating', target_value: 5000, current_value: 4856, status: 'in_progress', created_by: 'Self' }
  ],
  'd2': [
    { id: 't5', label: 'Safety Rating 4.0+', category: 'safety', target_value: 4.0, current_value: 3.21, status: 'in_progress', created_by: 'Team Manager' },
    { id: 't6', label: 'Maintain 5000+ iR', category: 'irating', target_value: 5000, current_value: 5234, status: 'achieved', created_by: 'Self' }
  ],
  'd3': [
    { id: 't8', label: 'Reach 4000 iR', category: 'irating', target_value: 4000, current_value: 3876, status: 'in_progress', created_by: 'Self' }
  ],
  'd4': [
    { id: 't10', label: 'Reach 2000 iR', category: 'irating', target_value: 2000, current_value: 1842, status: 'in_progress', created_by: 'Team Manager' },
    { id: 't12', label: 'First Podium', category: 'custom', target_value: 'Top 3 Finish', current_value: 'Best: P4', status: 'in_progress', created_by: 'Self' }
  ]
};

const mockSessions: Record<string, SessionMetric[]> = {
  'd1': [
    { id: 's1', session_name: 'Spa Endurance Race', track_name: 'Spa-Francorchamps', total_laps: 45, best_lap_time_ms: 138342, incident_count: 0, finish_position: 3, start_position: 5, irating_change: 47, date: '2026-01-12' },
    { id: 's2', session_name: 'Daytona Practice', track_name: 'Daytona Road Course', total_laps: 28, best_lap_time_ms: 107891, incident_count: 1, finish_position: null, start_position: null, irating_change: null, date: '2026-01-10' },
    { id: 's3', session_name: 'Monza GT3 Sprint', track_name: 'Monza', total_laps: 22, best_lap_time_ms: 108456, incident_count: 0, finish_position: 2, start_position: 4, irating_change: 38, date: '2026-01-08' }
  ],
  'd2': [
    { id: 's4', session_name: 'Spa Endurance Race', track_name: 'Spa-Francorchamps', total_laps: 42, best_lap_time_ms: 137890, incident_count: 2, finish_position: 3, start_position: 2, irating_change: 32, date: '2026-01-12' },
    { id: 's5', session_name: 'Monza Sprint', track_name: 'Monza', total_laps: 18, best_lap_time_ms: 108234, incident_count: 0, finish_position: 1, start_position: 1, irating_change: 65, date: '2026-01-05' }
  ],
  'd3': [
    { id: 's6', session_name: 'Spa Endurance Race', track_name: 'Spa-Francorchamps', total_laps: 48, best_lap_time_ms: 139100, incident_count: 1, finish_position: 3, start_position: 6, irating_change: 28, date: '2026-01-12' }
  ],
  'd4': [
    { id: 's7', session_name: 'Rookie Training', track_name: 'Lime Rock Park', total_laps: 22, best_lap_time_ms: 58920, incident_count: 3, finish_position: 12, start_position: 15, irating_change: 18, date: '2026-01-14' }
  ]
};

// AI Coaching Insights mock data
const mockCoachingInsights: Record<string, AICoachingInsight[]> = {
  'd1': [
    { id: 'ai1', type: 'strength', title: 'Exceptional Consistency', description: 'Your lap time variance of 0.42% is elite-level. This is your competitive advantage in endurance races.', priority: 'medium' },
    { id: 'ai2', type: 'focus', title: 'Qualifying Pace Gap', description: 'Your qualifying pace is 0.3s slower than race pace percentile suggests. Focus on single-lap optimization.', priority: 'high', suggested_action: 'Practice low-fuel qualifying runs with fresh tires' },
    { id: 'ai3', type: 'improvement', title: 'Sector 3 Opportunity', description: 'You consistently lose 0.15s in S3 compared to your theoretical best. Review Bus Stop chicane entry.', priority: 'medium', track: 'Spa-Francorchamps' }
  ],
  'd2': [
    { id: 'ai4', type: 'warning', title: 'Safety Rating Trend', description: 'SR has improved but remains below team standard. 2 more incidents will drop you to B license.', priority: 'high', suggested_action: 'Focus on clean racing over position gains' },
    { id: 'ai5', type: 'strength', title: 'Qualifying Specialist', description: 'Your pole rate of 19.7% is exceptional. Leverage this advantage with clean first laps.', priority: 'medium' }
  ],
  'd3': [
    { id: 'ai6', type: 'strength', title: 'Tire Management', description: 'Your tire degradation rate is 15% better than team average. Ideal for double-stint strategies.', priority: 'medium' },
    { id: 'ai7', type: 'focus', title: 'Approaching A License', description: 'You are 0.79 SR from A license promotion. Maintain current driving style.', priority: 'low' }
  ],
  'd4': [
    { id: 'ai8', type: 'improvement', title: 'Braking Consistency', description: 'Telemetry shows 23% variance in braking points. Focus on consistent reference markers.', priority: 'high', suggested_action: 'Use visual markers for braking zones' },
    { id: 'ai9', type: 'focus', title: 'Rapid Improvement', description: '+492 iRating in 30 days is exceptional progress. Maintain practice frequency.', priority: 'medium' }
  ]
};

// Development Milestones mock data
const mockMilestones: Record<string, DevelopmentMilestone[]> = {
  'd1': [
    { id: 'm1', title: 'Reached 4000 iRating', achieved_at: '2025-10-15', category: 'irating' },
    { id: 'm2', title: 'A License Achieved', achieved_at: '2025-08-22', category: 'license' },
    { id: 'm3', title: '20 Career Wins', achieved_at: '2025-12-01', category: 'wins' }
  ],
  'd2': [
    { id: 'm4', title: 'Reached 5000 iRating', achieved_at: '2025-10-22', category: 'irating' },
    { id: 'm5', title: '30 Career Wins', achieved_at: '2026-01-05', category: 'wins' }
  ],
  'd3': [
    { id: 'm6', title: 'B License Achieved', achieved_at: '2025-11-10', category: 'license' },
    { id: 'm7', title: 'First 24H Finish', achieved_at: '2026-01-12', category: 'endurance' }
  ],
  'd4': [
    { id: 'm8', title: 'First Top 5 Finish', achieved_at: '2026-01-08', category: 'consistency' },
    { id: 'm9', title: 'D License Achieved', achieved_at: '2025-12-20', category: 'license' }
  ]
};

const mockPerformance: Record<string, { pace: number; consistency: number; risk: number; posGained: number }> = {
  'd1': { pace: 78, consistency: 92, risk: 15, posGained: 2.3 },
  'd2': { pace: 85, consistency: 76, risk: 35, posGained: 1.8 },
  'd3': { pace: 72, consistency: 84, risk: 22, posGained: 1.1 },
  'd4': { pace: 58, consistency: 65, risk: 45, posGained: -0.3 }
};

// Team Goals - shared objectives that apply to drivers
interface TeamGoal {
  id: string;
  title: string;
  description: string;
  category: 'championship' | 'event' | 'development' | 'safety';
  target_date?: string;
  status: 'active' | 'achieved' | 'at_risk';
  assigned_drivers: string[]; // driver_ids
  progress_pct?: number;
  created_by: string;
}

const mockTeamGoals: TeamGoal[] = [
  {
    id: 'tg1',
    title: 'Win Daytona 24 Hours',
    description: 'Secure overall victory at the 2026 Daytona 24 Hours endurance race',
    category: 'event',
    target_date: '2026-01-25',
    status: 'active',
    assigned_drivers: ['d1', 'd2', 'd3', 'd4'],
    progress_pct: 65,
    created_by: 'Team Management'
  },
  {
    id: 'tg2',
    title: 'Team Safety Rating > 4.0',
    description: 'All drivers maintain safety rating above 4.0 average',
    category: 'safety',
    status: 'at_risk',
    assigned_drivers: ['d1', 'd2', 'd3', 'd4'],
    progress_pct: 72,
    created_by: 'Team Management'
  },
  {
    id: 'tg3',
    title: 'Rookie Development Program',
    description: 'Casey reaches 2500 iRating and C license by end of Q1',
    category: 'development',
    target_date: '2026-03-31',
    status: 'active',
    assigned_drivers: ['d4'],
    progress_pct: 45,
    created_by: 'Team Principal'
  },
  {
    id: 'tg4',
    title: 'GT3 Championship Top 3',
    description: 'Finish in top 3 of the IMSA GT3 championship standings',
    category: 'championship',
    status: 'active',
    assigned_drivers: ['d1', 'd2'],
    progress_pct: 80,
    created_by: 'Team Management'
  }
];

// License class colors
const licenseColors: Record<string, string> = {
  'R': 'bg-red-600', 'D': 'bg-orange-500', 'C': 'bg-yellow-500', 'B': 'bg-green-500', 'A': 'bg-blue-500', 'Pro': 'bg-black border border-white'
};

// Trait category colors
const traitCategoryColors: Record<string, string> = {
  consistency: 'bg-green-500/20 text-green-400 border-green-500/30',
  risk: 'bg-red-500/20 text-red-400 border-red-500/30',
  pace: 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30',
  endurance: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  racecraft: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
  style: 'bg-white/10 text-white/60 border-white/20'
};

// Format lap time from ms
function formatLapTime(ms: number | null): string {
  if (!ms) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
}

export function DriverProfilePage() {
  const { teamId, driverId } = useParams<{ teamId: string; driverId: string }>();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [iracingStats, setIracingStats] = useState<iRacingStats | null>(null);
  const [traits, setTraits] = useState<DriverTrait[]>([]);
  const [targets, setTargets] = useState<DriverTarget[]>([]);
  const [sessions, setSessions] = useState<SessionMetric[]>([]);
  const [performance, setPerformance] = useState<{ pace: number; consistency: number; risk: number; posGained: number } | null>(null);
  const [coachingInsights, setCoachingInsights] = useState<AICoachingInsight[]>([]);
  const [milestones, setMilestones] = useState<DevelopmentMilestone[]>([]);
  const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'coaching' | 'history'>('overview');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (teamId === 'demo') {
        await new Promise(r => setTimeout(r, 400));
      }
      if (driverId) {
        setProfile(mockProfiles[driverId] || null);
        setIracingStats(mockIRacingStats[driverId] || null);
        setTraits(mockTraits[driverId] || []);
        setTargets(mockTargets[driverId] || []);
        setSessions(mockSessions[driverId] || []);
        setPerformance(mockPerformance[driverId] || null);
        setCoachingInsights(mockCoachingInsights[driverId] || []);
        setMilestones(mockMilestones[driverId] || []);
        // Filter team goals that apply to this driver
        setTeamGoals(mockTeamGoals.filter(g => g.assigned_drivers.includes(driverId)));
      }
      setLoading(false);
    };
    fetchData();
  }, [teamId, driverId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="text-white/50 text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-white/40">Driver not found</p>
        <Link to={`/team/${teamId}/pitwall/roster`} className="text-[#3b82f6] hover:underline mt-2 inline-block">
          ← Back to Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/bg-3.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/95 via-[#0e0e0e]/80 to-[#0e0e0e]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/95" />
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
      {/* Back Link */}
      <Link
        to={`/team/${teamId}/pitwall/roster`}
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white mb-6"
      >
        <ChevronLeft size={16} />
        Back to Roster
      </Link>

      {/* Header Card */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded mb-6">
        <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold text-white/70">
              {profile.display_name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <h1 
                  className="text-2xl font-bold text-white tracking-wide"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {profile.display_name}
                </h1>
                {iracingStats && (
                  <div className={`px-2 py-1 text-xs font-bold text-white ${licenseColors[iracingStats.license_class]}`}>
                    {iracingStats.license_class} {iracingStats.license_level}.{Math.floor(iracingStats.safety_rating * 100) % 100}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/40">
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
                <p className="mt-3 text-white/50 max-w-2xl">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded p-1 w-fit mb-6">
        {(['overview', 'coaching', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'coaching' ? 'AI Coaching' : 'Race History'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* iRating Stats + Performance Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* iRacing Stats Card */}
            {iracingStats && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-400" />
                    <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      iRacing Stats
                    </span>
                  </div>
                  {/* Recent Form */}
                  <div className="flex items-center gap-1">
                    {iracingStats.recent_form.slice(0, 5).map((result, i) => (
                      <span key={i} className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold ${
                        result === 'win' ? 'bg-[#f97316] text-black' :
                        result === 'podium' ? 'bg-green-500 text-black' :
                        result === 'top5' ? 'bg-[#3b82f6] text-white' :
                        result === 'top10' ? 'bg-white/20 text-white' :
                        result === 'dnf' ? 'bg-red-500 text-white' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {result === 'win' ? 'W' : result === 'podium' ? 'P' : result === 'top5' ? '5' : result === 'top10' ? '10' : result === 'dnf' ? 'X' : 'F'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-[#0a0a0a] border border-white/5 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">iRating</span>
                        <span className={`flex items-center gap-1 text-xs font-mono ${iracingStats.irating_30d_change > 0 ? 'text-green-400' : iracingStats.irating_30d_change < 0 ? 'text-red-400' : 'text-white/40'}`}>
                          {iracingStats.irating_trend === 'up' ? <TrendingUp size={12} /> : iracingStats.irating_trend === 'down' ? <TrendingDown size={12} /> : null}
                          {iracingStats.irating_30d_change > 0 ? '+' : ''}{iracingStats.irating_30d_change}
                        </span>
                      </div>
                      <div className="text-3xl font-bold font-mono text-[#3b82f6]">{iracingStats.irating.toLocaleString()}</div>
                      {/* Mini iRating chart */}
                      <div className="flex items-end gap-0.5 h-8 mt-2">
                        {iracingStats.irating_history.slice(-7).map((point, i, arr) => {
                          const max = Math.max(...arr.map(p => p.value));
                          const min = Math.min(...arr.map(p => p.value));
                          const range = max - min || 1;
                          const height = ((point.value - min) / range) * 100;
                          return (
                            <div key={i} className="flex-1 bg-[#3b82f6]/30 hover:bg-[#3b82f6]/50 transition-colors" style={{ height: `${Math.max(height, 10)}%` }} title={`${point.date}: ${point.value}`} />
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 p-4">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Safety Rating</div>
                      <div className="text-3xl font-bold font-mono text-green-400">{iracingStats.safety_rating.toFixed(2)}</div>
                      <div className="text-xs text-white/30 mt-1">{iracingStats.corners_per_incident} C/I</div>
                      {/* Mini SR chart */}
                      <div className="flex items-end gap-0.5 h-6 mt-2">
                        {iracingStats.sr_history.slice(-4).map((point, i, arr) => {
                          const max = Math.max(...arr.map(p => p.value));
                          const min = Math.min(...arr.map(p => p.value));
                          const range = max - min || 1;
                          const height = ((point.value - min) / range) * 100;
                          return (
                            <div key={i} className="flex-1 bg-green-500/30 hover:bg-green-500/50 transition-colors" style={{ height: `${Math.max(height, 10)}%` }} title={`${point.date}: ${point.value}`} />
                          );
                        })}
                      </div>
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
        <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-white/40" />
              <span 
                className="font-medium text-sm uppercase tracking-wider text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Analysis
              </span>
            </div>
            <span className="text-xs text-white/30">by Ok, Box Box</span>
          </div>
          <div className="p-5">
            {performance ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <MetricBar label="Pace" value={performance.pace} color="blue" />
                  <MetricBar label="Consistency" value={performance.consistency} color="green" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MetricBar label="Risk" value={performance.risk} color="red" inverted />
                  <div className="bg-[#0a0a0a] border border-white/5 p-3">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Avg Pos. Gained</div>
                    <div className={`text-xl font-bold font-mono ${performance.posGained > 0 ? 'text-green-400' : performance.posGained < 0 ? 'text-red-400' : 'text-white/40'}`}>
                      {performance.posGained > 0 ? '+' : ''}{performance.posGained.toFixed(1)}
                    </div>
                  </div>
                </div>
                {/* Traits */}
                {traits.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Detected Traits</div>
                    <div className="flex flex-wrap gap-2">
                      {traits.map((trait, i) => (
                        <span key={i} className={`text-[10px] px-2.5 py-1 border uppercase tracking-wider ${traitCategoryColors[trait.category] || traitCategoryColors.style}`}>
                          {trait.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-white/30 text-center py-8">No analysis data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Target Metrics */}
      {targets.length > 0 && (
        <div className="bg-[#0a0a0a] mb-6" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-white/40" />
              <span 
                className="font-medium text-sm uppercase tracking-wider text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Target Metrics
              </span>
            </div>
            <span className="text-xs text-white/40">{targets.filter(t => t.status === 'achieved').length}/{targets.length} achieved</span>
          </div>
          <div className="divide-y divide-white/5">
            {targets.map(target => {
              const isAchieved = target.status === 'achieved';
              const StatusIcon = isAchieved ? CheckCircle2 : CircleDot;
              const statusColor = isAchieved ? 'text-green-400' : 'text-[#f97316]';
              const statusBg = isAchieved ? 'bg-green-500/10' : 'bg-[#f97316]/10';
              
              return (
                <div key={target.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 ${statusBg} flex items-center justify-center`}>
                      <StatusIcon size={16} className={statusColor} />
                    </div>
                    <div>
                      <div className="font-medium text-white">{target.label}</div>
                      <div className="text-xs text-white/40">
                        {target.track && <span>{target.track} • </span>}
                        Set by {target.created_by}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      <span className={statusColor}>{target.current_value}</span>
                      <span className="text-white/20"> / </span>
                      <span className="text-white/40">{target.target_value}</span>
                    </div>
                    <div className={`text-xs capitalize ${statusColor}`}>
                      {target.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Goals Section */}
      {teamGoals.length > 0 && (
        <div className="bg-[#0a0a0a] mb-6" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#3b82f6]" />
              <span 
                className="font-medium text-sm uppercase tracking-wider text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Team Goals
              </span>
            </div>
            <span className="text-xs text-white/40">{teamGoals.filter(g => g.status === 'achieved').length}/{teamGoals.length} achieved</span>
          </div>
          <div className="divide-y divide-white/5">
            {teamGoals.map(goal => {
              const statusColors: Record<string, { text: string; bg: string; border: string }> = {
                active: { text: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/30' },
                achieved: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
                at_risk: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
              };
              const categoryIcons: Record<string, string> = {
                championship: '🏆',
                event: '🏁',
                development: '📈',
                safety: '🛡️'
              };
              const colors = statusColors[goal.status] || statusColors.active;
              
              return (
                <div key={goal.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 ${colors.bg} flex items-center justify-center text-lg`}>
                        {categoryIcons[goal.category] || '🎯'}
                      </div>
                      <div>
                        <div className="font-medium text-white">{goal.title}</div>
                        <div className="text-xs text-white/50 mt-0.5">{goal.description}</div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                          {goal.target_date && (
                            <span className="text-[10px] text-white/30">
                              Target: {new Date(goal.target_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-[10px] text-white/30">
                            By {goal.created_by}
                          </span>
                        </div>
                      </div>
                    </div>
                    {goal.progress_pct !== undefined && (
                      <div className="text-right">
                        <div className={`text-lg font-mono font-bold ${colors.text}`}>{goal.progress_pct}%</div>
                        <div className="w-20 h-1.5 bg-white/10 mt-1">
                          <div 
                            className={`h-full ${goal.status === 'at_risk' ? 'bg-red-500' : goal.status === 'achieved' ? 'bg-green-500' : 'bg-[#3b82f6]'}`}
                            style={{ width: `${goal.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Team Sessions</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{profile.total_sessions}</div>
        </div>
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Team Laps</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{profile.total_laps.toLocaleString()}</div>
        </div>
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Team Incidents</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{profile.total_incidents}</div>
        </div>
        <div className="bg-[#0a0a0a] p-4 text-center" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Inc / 100 Laps</div>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {profile.total_laps > 0 ? ((profile.total_incidents / profile.total_laps) * 100).toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Session History */}
      <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-white/40" />
            <span 
              className="font-medium text-sm uppercase tracking-wider text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Session History
            </span>
          </div>
          <span className="text-xs text-white/40">{sessions.length} recent</span>
        </div>
        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0a0a0a] text-white/50 text-[10px] font-semibold uppercase tracking-widest">
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
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-5 font-medium text-white">{s.session_name || 'Session'}</td>
                    <td className="py-3 px-3 text-white/50">{s.track_name}</td>
                    <td className="py-3 px-3 text-right font-mono text-white/70">{s.total_laps}</td>
                    <td className="py-3 px-3 text-right font-mono text-green-400">{formatLapTime(s.best_lap_time_ms)}</td>
                    <td className="py-3 px-3 text-right font-mono text-white/70">{s.incident_count}</td>
                    <td className="py-3 px-3 text-right font-mono text-white/70">
                      {s.finish_position ? `P${s.finish_position}` : '—'}
                    </td>
                    <td className={`py-3 px-5 text-right font-mono ${s.irating_change && s.irating_change > 0 ? 'text-green-400' : s.irating_change && s.irating_change < 0 ? 'text-red-400' : 'text-white/30'}`}>
                      {s.irating_change != null ? (s.irating_change > 0 ? '+' : '') + s.irating_change : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-white/30">
            No session history available
          </div>
        )}
      </div>
        </>
      )}

      {/* AI Coaching Tab */}
      {activeTab === 'coaching' && (
        <div className="space-y-6">
          {/* AI Coaching Insights */}
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Brain size={16} className="text-white/40" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                AI Coaching Insights
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {coachingInsights.map(insight => {
                const typeConfig = {
                  strength: { icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
                  improvement: { icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
                  focus: { icon: Target, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/30' },
                  warning: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
                };
                const config = typeConfig[insight.type];
                const Icon = config.icon;
                return (
                  <div key={insight.id} className={`p-4 ${config.bg} border-l-2 ${config.border}`}>
                    <div className="flex items-start gap-3">
                      <Icon size={16} className={`${config.color} mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold text-sm ${config.color}`}>{insight.title}</span>
                          <span className={`text-[10px] uppercase px-2 py-0.5 ${config.bg} ${config.color}`}>{insight.priority}</span>
                        </div>
                        <p className="text-sm text-white/60 mb-2">{insight.description}</p>
                        {insight.suggested_action && (
                          <div className="text-xs text-white/40 flex items-center gap-1">
                            <Target size={10} />
                            <span>Action: {insight.suggested_action}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {coachingInsights.length === 0 && (
                <div className="p-8 text-center text-white/30">No coaching insights available</div>
              )}
            </div>
          </div>

          {/* Development Milestones */}
          <div className="border border-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Award size={16} className="text-[#f97316]" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Development Milestones
              </span>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {milestones.map(milestone => {
                  const categoryIcons: Record<string, any> = { irating: TrendingUp, license: Shield, wins: Trophy, consistency: Target, endurance: Flame };
                  const Icon = categoryIcons[milestone.category] || Award;
                  return (
                    <div key={milestone.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-white/5">
                      <div className="w-8 h-8 bg-[#f97316]/20 flex items-center justify-center">
                        <Icon size={14} className="text-[#f97316]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{milestone.title}</div>
                        <div className="text-xs text-white/40">{new Date(milestone.achieved_at).toLocaleDateString()}</div>
                      </div>
                      <CheckCircle2 size={16} className="text-green-400" />
                    </div>
                  );
                })}
                {milestones.length === 0 && (
                  <div className="text-center text-white/30 py-4">No milestones yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Clock size={16} className="text-white/40" />
            <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Full Race History
            </span>
          </div>
          {sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0a0a0a] text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                    <th className="text-left py-3 px-5">Date</th>
                    <th className="text-left py-3 px-3">Session</th>
                    <th className="text-left py-3 px-3">Track</th>
                    <th className="text-right py-3 px-3">Start</th>
                    <th className="text-right py-3 px-3">Finish</th>
                    <th className="text-right py-3 px-3">+/-</th>
                    <th className="text-right py-3 px-3">Best</th>
                    <th className="text-right py-3 px-3">Inc</th>
                    <th className="text-right py-3 px-5">iR Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => {
                    const posChange = s.start_position && s.finish_position ? s.start_position - s.finish_position : null;
                    return (
                      <tr key={s.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-5 text-white/50 text-xs">{s.date}</td>
                        <td className="py-3 px-3 font-medium text-white">{s.session_name || 'Session'}</td>
                        <td className="py-3 px-3 text-white/50">{s.track_name}</td>
                        <td className="py-3 px-3 text-right font-mono text-white/70">{s.start_position ? `P${s.start_position}` : '—'}</td>
                        <td className="py-3 px-3 text-right font-mono text-white/70">{s.finish_position ? `P${s.finish_position}` : '—'}</td>
                        <td className={`py-3 px-3 text-right font-mono ${posChange && posChange > 0 ? 'text-green-400' : posChange && posChange < 0 ? 'text-red-400' : 'text-white/30'}`}>
                          {posChange != null ? (posChange > 0 ? '+' : '') + posChange : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-green-400">{formatLapTime(s.best_lap_time_ms)}</td>
                        <td className="py-3 px-3 text-right font-mono text-white/70">{s.incident_count}x</td>
                        <td className={`py-3 px-5 text-right font-mono ${s.irating_change && s.irating_change > 0 ? 'text-green-400' : s.irating_change && s.irating_change < 0 ? 'text-red-400' : 'text-white/30'}`}>
                          {s.irating_change != null ? (s.irating_change > 0 ? '+' : '') + s.irating_change : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-white/30">No race history available</div>
          )}
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
      <div className={`text-lg font-bold font-mono ${highlight ? 'text-[#f97316]' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-white/40 uppercase">{label}</div>
    </div>
  );
}

// Metric bar component
function MetricBar({ label, value, color, inverted = false }: { label: string; value: number; color: string; inverted?: boolean }) {
  const colorClasses: Record<string, string> = {
    'blue': 'bg-[#3b82f6]',
    'green': 'bg-green-500',
    'red': 'bg-red-500',
    'orange': 'bg-[#f97316]'
  };
  const textColorClasses: Record<string, string> = {
    'blue': 'text-[#3b82f6]',
    'green': 'text-green-400',
    'red': 'text-red-400',
    'orange': 'text-[#f97316]'
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-bold font-mono ${textColorClasses[color]}`}>{value}%</span>
      </div>
      <div className="h-2 bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all ${colorClasses[color]}`}
          style={{ width: `${inverted ? 100 - value : value}%` }}
        />
      </div>
    </div>
  );
}
