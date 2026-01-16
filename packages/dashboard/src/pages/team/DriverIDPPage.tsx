import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { GoalVisibility, GOAL_VISIBILITY_DISPLAY } from '../../types/team-roles';
import {
    ChevronLeft,
    Target,
    TrendingUp,
    MessageSquare,
    CheckCircle2,
    CircleDot,
    XCircle,
    Zap,
    Plus,
    Clock,
    Trophy,
    Star,
    Flag,
    Users,
    Lock
} from 'lucide-react';

// Types - with open culture visibility
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
    visibility: GoalVisibility;  // Shared by default for open team culture
}

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

interface Achievement {
    id: string;
    badge: string;
    name: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    earned_at: string;
}

interface IDPNote {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    type: 'feedback' | 'coaching' | 'general';
}

// Mock data
const mockDriver = {
    id: 'd1',
    display_name: 'Alex Rivera',
    irating: 4856,
    safety_rating: 4.67,
    license_class: 'A'
};

const mockTargets: DriverTarget[] = [
    { id: 't1', label: 'Spa Lap Time', category: 'lap_time', target_value: '2:17.000', current_value: '2:18.342', status: 'in_progress', track: 'Spa-Francorchamps', created_by: 'Team Manager', notes: 'Focus on Eau Rouge exit.', visibility: 'shared', progress_history: [{ date: '2026-01-08', value: '2:19.102' }, { date: '2026-01-10', value: '2:18.890' }, { date: '2026-01-12', value: '2:18.342' }] },
    { id: 't2', label: 'Consistency < 0.5%', category: 'consistency', target_value: 0.5, current_value: 0.42, status: 'achieved', created_by: 'Self', visibility: 'shared', achieved_at: '2026-01-05' },
    { id: 't3', label: 'Zero Incidents (Race)', category: 'safety', target_value: 0, current_value: 0, status: 'achieved', created_by: 'Team Manager', visibility: 'shared', achieved_at: '2026-01-12' },
    { id: 't4', label: 'Reach 5000 iR', category: 'irating', target_value: 5000, current_value: 4856, status: 'in_progress', deadline: '2026-02-28', created_by: 'Self', visibility: 'shared', progress_history: [{ date: '2025-12-01', value: 4520 }, { date: '2025-12-15', value: 4680 }, { date: '2026-01-01', value: 4780 }, { date: '2026-01-15', value: 4856 }] },
    { id: 't5', label: 'Work on braking consistency', category: 'custom', target_value: 'Improved', current_value: 'Working', status: 'in_progress', created_by: 'Self', visibility: 'private', notes: 'Personal focus area - trailing brake into T1' }
];

const mockSuggestions: SuggestedTarget[] = [
    { id: 'sug-1', label: 'Monza Lap Time', category: 'lap_time', target_value: '1:48.500', current_value: '1:49.234', track: 'Monza', rationale: "You're 0.8% off the team benchmark.", priority: 'medium', estimated_timeline: '1-2 weeks' }
];

const mockAchievements: Achievement[] = [
    { id: 'a1', badge: '🎯', name: 'Goal Getter', description: 'Completed first target', tier: 'bronze', earned_at: '2025-12-20' },
    { id: 'a2', badge: '✨', name: 'Clean Racer', description: 'Zero incident race', tier: 'bronze', earned_at: '2026-01-12' },
    { id: 'a3', badge: '🏎️', name: '4K Elite', description: 'Reached 4000 iRating', tier: 'silver', earned_at: '2025-11-15' },
    { id: 'a4', badge: '🎪', name: 'Consistency Master', description: 'Under 0.5% lap variance', tier: 'silver', earned_at: '2026-01-05' }
];

const mockNotes: IDPNote[] = [
    { id: 'n1', author: 'Team Manager', content: 'Great progress on consistency this week. Keep focusing on smooth inputs through high-speed corners.', timestamp: '2026-01-14T10:30:00Z', type: 'coaching' },
    { id: 'n2', author: 'Alex Rivera', content: 'Struggled with Spa T1 braking today. Need to work on trail braking.', timestamp: '2026-01-13T18:45:00Z', type: 'general' },
    { id: 'n3', author: 'Jordan Chen', content: 'Nice stints at Spa! Your tire management was on point.', timestamp: '2026-01-12T20:00:00Z', type: 'feedback' }
];

const mockTimeline = [
    { date: '2026-01-15', event: 'iRating reached 4856 (+76)', type: 'progress' },
    { date: '2026-01-12', event: 'Achieved: Zero Incidents (Race)', type: 'achievement' },
    { date: '2026-01-12', event: 'New PB at Spa: 2:18.342', type: 'milestone' },
    { date: '2026-01-10', event: 'Target accepted: Spa Lap Time', type: 'target' },
    { date: '2026-01-05', event: 'Achieved: Consistency < 0.5%', type: 'achievement' },
    { date: '2025-12-20', event: 'First target completed!', type: 'achievement' }
];

// Status config
const statusConfig = {
    achieved: { icon: CheckCircle2, color: 'text-racing-green', bg: 'bg-racing-green/10' },
    in_progress: { icon: CircleDot, color: 'text-racing-yellow', bg: 'bg-racing-yellow/10' },
    not_started: { icon: CircleDot, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
    failed: { icon: XCircle, color: 'text-racing-red', bg: 'bg-racing-red/10' }
};

const tierColors = {
    bronze: 'from-orange-700 to-orange-900',
    silver: 'from-slate-400 to-slate-600',
    gold: 'from-yellow-500 to-yellow-700',
    platinum: 'from-cyan-300 to-cyan-500'
};

export default function DriverIDPPage() {
    const { teamId, driverId } = useParams<{ teamId: string; driverId: string }>();
    useAuthStore(); // Auth store available for API calls
    const [loading, setLoading] = useState(true);
    const [targets, setTargets] = useState<DriverTarget[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedTarget[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [notes, setNotes] = useState<IDPNote[]>([]);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        loadData();
    }, [driverId]);

    const loadData = async () => {
        setLoading(true);
        // Demo mode
        if (teamId === 'demo') {
            await new Promise(r => setTimeout(r, 300));
            setTargets(mockTargets);
            setSuggestions(mockSuggestions);
            setAchievements(mockAchievements);
            setNotes(mockNotes);
        }
        setLoading(false);
    };

    // Check if viewing own IDP vs teammate's
    // In production, compare against authenticated user's driver ID
    const currentUserDriverId = 'd1';  // Mock: Alex Rivera is logged in
    const isOwnIDP = driverId === currentUserDriverId;

    // For teammate view, filter private goals and coaching-type timeline items
    const visibleTargets = isOwnIDP
        ? targets
        : targets.filter(t => t.visibility !== 'private');
    const visibleActiveTargets = visibleTargets.filter(t => t.status === 'in_progress' || t.status === 'not_started');
    const visibleCompletedTargets = visibleTargets.filter(t => t.status === 'achieved');

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading IDP...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Teammate view banner - supportive context */}
            {!isOwnIDP && (
                <div className="mb-4 p-3 rounded-lg bg-racing-blue/10 border border-racing-blue/20 flex items-center gap-3">
                    <Users size={18} className="text-racing-blue" />
                    <div>
                        <span className="text-sm text-racing-blue font-medium">Viewing teammate's development journey</span>
                        <p className="text-xs text-zinc-400">Celebrate their progress and support their growth!</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link
                        to={`/teams/${teamId}/driver/${driverId}`}
                        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-2"
                    >
                        <ChevronLeft size={16} />
                        Back to Profile
                    </Link>
                    <h1 className="font-racing text-3xl text-white tracking-wide">
                        {isOwnIDP ? 'Individual Development Plan' : `${mockDriver.display_name}'s Development`}
                    </h1>
                    <p className="text-zinc-400 mt-1">{mockDriver.display_name} • {mockDriver.irating} iR • {mockDriver.license_class} {mockDriver.safety_rating.toFixed(2)}</p>
                </div>
                {/* Add Goal only on own IDP */}
                {isOwnIDP && (
                    <button className="btn bg-racing-blue hover:bg-racing-blue/80 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Plus size={16} />
                        Add Goal
                    </button>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-label">Active Goals</div>
                    <div className="stat-value text-racing-yellow">{visibleActiveTargets.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Completed</div>
                    <div className="stat-value text-racing-green">{visibleCompletedTargets.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Achievements</div>
                    <div className="stat-value">{achievements.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Suggestions</div>
                    <div className="stat-value text-racing-blue">{suggestions.length}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Goals */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Goals */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Target size={16} className="text-racing-yellow" />
                                <span className="font-medium text-sm uppercase tracking-wider">Active Goals</span>
                            </div>
                            <span className="text-xs text-zinc-500">{visibleActiveTargets.length} in progress</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {visibleActiveTargets.map(target => {
                                const config = statusConfig[target.status];
                                const StatusIcon = config.icon;
                                const visibilityDisplay = GOAL_VISIBILITY_DISPLAY[target.visibility];
                                const VisibilityIcon = target.visibility === 'private' ? Lock : Users;
                                return (
                                    <div key={target.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                <StatusIcon size={16} className={config.color} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-white">{target.label}</span>
                                                        {/* Visibility badge */}
                                                        <button
                                                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${visibilityDisplay.color} hover:opacity-80 transition-opacity`}
                                                            title={target.visibility === 'private' ? 'Only you can see this' : 'Visible to team'}
                                                        >
                                                            <VisibilityIcon size={10} />
                                                            {target.visibility === 'private' && <span>Private</span>}
                                                        </button>
                                                    </div>
                                                    <div className="font-mono text-sm">
                                                        <span className={config.color}>{target.current_value}</span>
                                                        <span className="text-zinc-600"> / </span>
                                                        <span className="text-zinc-400">{target.target_value}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-1">
                                                    {target.track && <span>{target.track} • </span>}
                                                    Set by {target.created_by}
                                                    {target.deadline && <span> • Due {target.deadline}</span>}
                                                </div>
                                                {/* Progress bar for numeric targets */}
                                                {typeof target.current_value === 'number' && typeof target.target_value === 'number' && (
                                                    <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-racing-yellow rounded-full transition-all"
                                                            style={{ width: `${Math.min((target.current_value / target.target_value) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {visibleActiveTargets.length === 0 && (
                                <div className="p-8 text-center text-zinc-500">No active goals</div>
                            )}
                        </div>
                    </div>

                    {/* Suggestions from Ok, Box Box */}
                    {suggestions.length > 0 && (
                        <div className="card border border-racing-blue/20">
                            <div className="card-header bg-racing-blue/5">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-racing-blue" />
                                    <span className="font-medium text-sm uppercase tracking-wider">Suggested by Ok, Box Box</span>
                                </div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {suggestions.map(s => (
                                    <div key={s.id} className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-medium text-white">{s.label}</div>
                                                <p className="text-sm text-zinc-400 mt-1">{s.rationale}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                                    {s.track && <span>{s.track}</span>}
                                                    <span>Target: <span className="text-racing-green font-mono">{s.target_value}</span></span>
                                                    {s.estimated_timeline && <span>~{s.estimated_timeline}</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="btn btn-sm text-xs py-1.5 px-3 bg-racing-green/20 hover:bg-racing-green/30 text-racing-green rounded">Accept</button>
                                                <button className="btn btn-sm text-xs py-1.5 px-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded">Dismiss</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Goals */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-racing-green" />
                                <span className="font-medium text-sm uppercase tracking-wider">Completed Goals</span>
                            </div>
                            <span className="text-xs text-zinc-500">{visibleCompletedTargets.length} achieved</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {visibleCompletedTargets.map(target => (
                                <div key={target.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 size={16} className="text-racing-green" />
                                        <span className="text-white">{target.label}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {target.achieved_at && `Achieved ${target.achieved_at}`}
                                    </div>
                                </div>
                            ))}
                            {visibleCompletedTargets.length === 0 && (
                                <div className="p-8 text-center text-zinc-500">No completed goals yet</div>
                            )}
                        </div>
                    </div>

                    {/* Notes & Coaching - Only visible on own IDP (supportive privacy) */}
                    {isOwnIDP && (
                        <div className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={16} className="text-racing-blue" />
                                    <span className="font-medium text-sm uppercase tracking-wider">Notes & Coaching</span>
                                </div>
                                <span className="text-xs text-zinc-500">Private to you</span>
                            </div>
                            <div className="p-4 border-b border-white/5">
                                <textarea
                                    className="w-full bg-slate-800 rounded-lg p-3 text-sm text-white placeholder-zinc-500 resize-none"
                                    rows={2}
                                    placeholder="Add a note or coaching comment..."
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                />
                                <div className="flex justify-end mt-2">
                                    <button className="btn btn-sm text-xs py-1.5 px-3 bg-racing-blue hover:bg-racing-blue/80 text-white rounded">Add Note</button>
                                </div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {notes.map(note => (
                                    <div key={note.id} className="p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-white">{note.author}</span>
                                            <span className="text-xs text-zinc-500">{new Date(note.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-zinc-400">{note.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Timeline & Achievements */}
                <div className="space-y-6">
                    {/* Achievements */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-racing-yellow" />
                                <span className="font-medium text-sm uppercase tracking-wider">Achievements</span>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {achievements.map(a => (
                                <div key={a.id} className={`p-3 rounded-lg bg-gradient-to-br ${tierColors[a.tier]} text-center`}>
                                    <div className="text-2xl mb-1">{a.badge}</div>
                                    <div className="text-xs font-medium text-white">{a.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-zinc-400" />
                                <span className="font-medium text-sm uppercase tracking-wider">Activity</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="space-y-4">
                                {mockTimeline.map((item, i) => {
                                    const typeIcons = {
                                        achievement: <Star size={14} className="text-racing-yellow" />,
                                        progress: <TrendingUp size={14} className="text-racing-green" />,
                                        milestone: <Flag size={14} className="text-racing-blue" />,
                                        target: <Target size={14} className="text-zinc-400" />
                                    };
                                    return (
                                        <div key={i} className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {typeIcons[item.type as keyof typeof typeIcons]}
                                            </div>
                                            <div>
                                                <div className="text-sm text-white">{item.event}</div>
                                                <div className="text-xs text-zinc-500">{item.date}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
