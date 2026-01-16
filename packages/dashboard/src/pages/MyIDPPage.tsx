/**
 * My IDP Page (Standalone)
 * 
 * Personal development plan page without team context.
 * Uses the authenticated user's profile or demo mode.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import {
    fetchDriverProfile,
    fetchDriverTargets,
    fetchSuggestions,
    fetchAchievements,
    isDemoMode,
    DriverTarget,
    SuggestedTarget,
    DriverProfile,
    Achievement
} from '../services/idp.service';
import {
    ChevronLeft,
    Target,
    CheckCircle2,
    CircleDot,
    XCircle,
    Zap,
    Plus,
    Trophy,
    Star,
    Users,
    Lock,
    AlertCircle
} from 'lucide-react';

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

export default function MyIDPPage() {
    const navigate = useNavigate();
    const { accessToken } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [targets, setTargets] = useState<DriverTarget[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedTarget[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [demoMode, setDemoMode] = useState(false);

    useEffect(() => {
        loadData();
    }, [accessToken]);

    const loadData = async () => {
        setLoading(true);
        setDemoMode(isDemoMode());

        try {
            const [profileData, targetsData, suggestionsData, achievementsData] = await Promise.all([
                fetchDriverProfile(),
                fetchDriverTargets('me'),
                fetchSuggestions('me'),
                fetchAchievements('me')
            ]);

            setProfile(profileData);
            setTargets(targetsData);
            setSuggestions(suggestionsData);
            setAchievements(achievementsData);
        } catch (error) {
            console.error('[MyIDP] Load error:', error);
        }

        setLoading(false);
    };

    const activeTargets = targets.filter(t => t.status === 'in_progress' || t.status === 'not_started');
    const completedTargets = targets.filter(t => t.status === 'achieved');

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-zinc-500">Loading your development plan...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-zinc-400 hover:text-white">
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="font-racing text-xl text-white tracking-wide">My Development Plan</h1>
                            {profile && (
                                <p className="text-sm text-zinc-400">
                                    {profile.display_name} • {profile.irating} iR • {profile.license_class} {profile.safety_rating.toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>
                    <button className="btn bg-racing-blue hover:bg-racing-blue/80 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <Plus size={16} />
                        Add Goal
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                {/* Demo Mode Banner */}
                {demoMode && (
                    <div className="mb-6 p-4 rounded-lg bg-racing-yellow/10 border border-racing-yellow/20 flex items-center gap-3">
                        <AlertCircle size={20} className="text-racing-yellow" />
                        <div className="flex-1">
                            <span className="text-sm text-racing-yellow font-medium">Demo Mode</span>
                            <p className="text-xs text-zinc-400">Sign in to sync your iRacing profile and track real progress</p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-sm text-xs py-1.5 px-3 bg-racing-yellow/20 hover:bg-racing-yellow/30 text-racing-yellow rounded"
                        >
                            Sign In
                        </button>
                    </div>
                )}

                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active Goals</div>
                        <div className="text-2xl font-bold text-racing-yellow font-mono">{activeTargets.length}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Completed</div>
                        <div className="text-2xl font-bold text-racing-green font-mono">{completedTargets.length}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Achievements</div>
                        <div className="text-2xl font-bold text-white font-mono">{achievements.length}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Suggestions</div>
                        <div className="text-2xl font-bold text-racing-blue font-mono">{suggestions.length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Goals */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Active Goals */}
                        <div className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target size={16} className="text-racing-yellow" />
                                    <span className="font-medium text-sm uppercase tracking-wider text-white">Active Goals</span>
                                </div>
                                <span className="text-xs text-zinc-500">{activeTargets.length} in progress</span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {activeTargets.map(target => {
                                    const config = statusConfig[target.status];
                                    const StatusIcon = config.icon;
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
                                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${target.visibility === 'private' ? 'bg-zinc-700 text-zinc-400' : 'bg-racing-blue/10 text-racing-blue'}`}>
                                                                <VisibilityIcon size={10} />
                                                                {target.visibility === 'private' && 'Private'}
                                                            </span>
                                                        </div>
                                                        <div className="font-mono text-sm">
                                                            <span className={config.color}>{target.current_value}</span>
                                                            <span className="text-zinc-600"> / </span>
                                                            <span className="text-zinc-400">{target.target_value}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-zinc-500 mt-1">
                                                        {target.track && <span>{target.track} • </span>}
                                                        {target.deadline && <span>Due {target.deadline}</span>}
                                                    </div>
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
                                {activeTargets.length === 0 && (
                                    <div className="p-8 text-center text-zinc-500">
                                        No active goals — add one to start tracking!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="bg-slate-800/30 rounded-xl border border-racing-blue/20 overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/5 bg-racing-blue/5 flex items-center gap-2">
                                    <Zap size={16} className="text-racing-blue" />
                                    <span className="font-medium text-sm uppercase tracking-wider text-white">Suggested by Ok, Box Box</span>
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
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="btn text-xs py-1.5 px-3 bg-racing-green/20 hover:bg-racing-green/30 text-racing-green rounded">Accept</button>
                                                    <button className="btn text-xs py-1.5 px-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded">Dismiss</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Goals */}
                        <div className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-racing-green" />
                                    <span className="font-medium text-sm uppercase tracking-wider text-white">Completed Goals</span>
                                </div>
                                <span className="text-xs text-zinc-500">{completedTargets.length} achieved</span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {completedTargets.map(target => (
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
                                {completedTargets.length === 0 && (
                                    <div className="p-8 text-center text-zinc-500">No completed goals yet</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Achievements */}
                    <div className="space-y-6">
                        {/* Achievements */}
                        <div className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                                <Trophy size={16} className="text-racing-yellow" />
                                <span className="font-medium text-sm uppercase tracking-wider text-white">Achievements</span>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                {achievements.map(a => (
                                    <div key={a.id} className={`p-3 rounded-lg bg-gradient-to-br ${tierColors[a.tier]} text-center`}>
                                        <div className="text-2xl mb-1">{a.badge}</div>
                                        <div className="text-xs font-medium text-white">{a.name}</div>
                                    </div>
                                ))}
                                {achievements.length === 0 && (
                                    <div className="col-span-2 p-4 text-center text-zinc-500 text-sm">
                                        Complete goals to earn achievements!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                                <Star size={16} className="text-zinc-400" />
                                <span className="font-medium text-sm uppercase tracking-wider text-white">Quick Links</span>
                            </div>
                            <div className="p-4 space-y-2">
                                <Link to="/teams/demo" className="block p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                                    <div className="text-sm text-white">My Team</div>
                                    <div className="text-xs text-zinc-500">View team dashboard</div>
                                </Link>
                                <Link to="/" className="block p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                                    <div className="text-sm text-white">All Surfaces</div>
                                    <div className="text-xs text-zinc-500">Back to home</div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
