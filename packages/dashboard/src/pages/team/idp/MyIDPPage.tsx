import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Target,
    Trophy,
    TrendingUp,
    TrendingDown,
    Clock,
    Flag,
    Award,
    ChevronRight,
    Zap,
    Shield,
    AlertTriangle,
    CheckCircle,
    Plus,
    Activity,
    BarChart3,
    Car,
    MapPin,
    Calendar,
    ArrowLeft
} from 'lucide-react';

// ============================================================
// Real iRacing Data for Conrad Weeden (cust_id: 1185150)
// ============================================================
const DRIVER_PROFILE = {
    name: 'Conrad Weeden',
    custId: 1185150,
    memberSince: 'Jan 14, 2025',
    avatar: null,
    licenses: {
        oval: { class: 'B', sr: 3.22, iRating: 1040, color: '#00C853' },
        sportsCar: { class: 'D', sr: 2.52, iRating: 360, color: '#FFA726' },
        formula: { class: 'R', sr: 1.52, iRating: null, color: '#F44336' },
        dirtOval: { class: 'R', sr: 2.50, iRating: null, color: '#F44336' },
        dirtRoad: { class: 'R', sr: 2.56, iRating: null, color: '#F44336' }
    },
    stats: {
        oval: { starts: 286, wins: 13, top5s: 82, poles: 10, avgStart: 8, avgFinish: 10 },
        sportsCar: { starts: 89, wins: 0, top5s: 15, poles: 0, avgStart: 12, avgFinish: 11 },
        formula: { starts: 35, wins: 0, top5s: 10, poles: 1, avgStart: 8, avgFinish: 8 }
    }
};

const RECENT_RACES = [
    { date: 'Jan 15', series: 'Toyota GR86 Cup', track: 'Road Atlanta (Short)', start: 14, finish: 13, incidents: 5, points: 8, category: 'sportsCar' },
    { date: 'Jan 14', series: 'CARS Tour Late Model', track: 'Concord Speedway', start: 12, finish: 6, incidents: 4, points: 36, category: 'oval' },
    { date: 'Jan 14', series: 'Toyota GR86 Cup', track: 'Road Atlanta (Short)', start: 18, finish: 16, incidents: 4, points: 6, category: 'sportsCar' },
    { date: 'Jan 14', series: 'Toyota GR86 Cup', track: 'Road Atlanta (Short)', start: 16, finish: 14, incidents: 7, points: 7, category: 'sportsCar' },
    { date: 'Jan 14', series: 'Toyota GR86 Cup', track: 'Road Atlanta (Short)', start: 9, finish: 9, incidents: 15, points: 25, category: 'sportsCar' }
];

const ACTIVE_GOALS = [
    {
        id: '1',
        label: 'Reach C License (Sports Car)',
        category: 'License',
        current: 2.52,
        target: 3.00,
        deadline: '2025-02-15',
        icon: Shield,
        trend: 'up'
    },
    {
        id: '2',
        label: 'Reduce Incidents per Race',
        category: 'Safety',
        current: 7,
        target: 4,
        deadline: '2025-02-01',
        icon: AlertTriangle,
        trend: 'down'
    },
    {
        id: '3',
        label: 'First Win in GR86 Cup',
        category: 'Performance',
        current: 0,
        target: 1,
        deadline: null,
        icon: Trophy,
        trend: null
    },
    {
        id: '4',
        label: 'Break 1100 iRating (Oval)',
        category: 'Rating',
        current: 1040,
        target: 1100,
        deadline: '2025-03-01',
        icon: TrendingUp,
        trend: 'up'
    }
];

const ACHIEVEMENTS = [
    { id: '1', name: 'Oval Specialist', description: '250+ oval starts', icon: '🏁', date: 'Jan 2025', color: '#FFD700' },
    { id: '2', name: 'Podium Hunter', description: '80+ top-5 finishes', icon: '🥇', date: 'Jan 2025', color: '#C0C0C0' },
    { id: '3', name: 'Multi-Discipline', description: 'Active in 3+ categories', icon: '🏎️', date: 'Jan 2025', color: '#CD7F32' },
    { id: '4', name: 'Fast Learner', description: 'B license in first year', icon: '📈', date: 'Jan 2025', color: '#00C853' }
];

const AI_SUGGESTIONS = [
    {
        id: '1',
        title: 'Focus on Incident Reduction',
        description: 'Your last 5 races averaged 7x incidents. Try running 10% slower to build consistency.',
        priority: 'high',
        basedOn: 'Recent races at Road Atlanta'
    },
    {
        id: '2',
        title: 'Leverage Oval Strength',
        description: 'Your oval iRating is 2.9x higher than sports car. Consider focusing on oval to build confidence.',
        priority: 'medium',
        basedOn: 'License comparison'
    }
];

// ============================================================
// Component
// ============================================================

export default function MyIDPPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'history'>('overview');

    const getLicenseColor = (licenseClass: string) => {
        switch (licenseClass) {
            case 'A': return 'bg-blue-500';
            case 'B': return 'bg-green-500';
            case 'C': return 'bg-yellow-500';
            case 'D': return 'bg-orange-500';
            case 'R': return 'bg-red-500';
            default: return 'bg-zinc-500';
        }
    };

    const getPositionChange = (start: number, finish: number) => {
        const change = start - finish;
        if (change > 0) return { text: `+${change}`, color: 'text-racing-green' };
        if (change < 0) return { text: `${change}`, color: 'text-red-400' };
        return { text: '0', color: 'text-zinc-500' };
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="font-racing text-2xl text-white tracking-wide">{DRIVER_PROFILE.name}</h1>
                        <p className="text-sm text-zinc-500">
                            <span className="font-mono">#{DRIVER_PROFILE.custId}</span>
                            <span className="mx-2">•</span>
                            Member since {DRIVER_PROFILE.memberSince}
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-racing-blue hover:bg-racing-blue/80 text-white rounded-lg transition-colors text-sm font-medium">
                    <Plus size={16} />
                    Add Goal
                </button>
            </div>

            {/* License Cards - iRacing Style */}
            <div className="grid grid-cols-5 gap-3 mb-6">
                {Object.entries(DRIVER_PROFILE.licenses).map(([key, license]) => {
                    const stats = DRIVER_PROFILE.stats[key as keyof typeof DRIVER_PROFILE.stats];
                    return (
                        <div key={key} className="card p-4 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${getLicenseColor(license.class)}`} />
                            <div className="pl-2">
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                                    {key === 'sportsCar' ? 'Sports Car' :
                                        key === 'dirtOval' ? 'Dirt Oval' :
                                            key === 'dirtRoad' ? 'Dirt Road' :
                                                key.charAt(0).toUpperCase() + key.slice(1)}
                                </div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className={`text-2xl font-bold ${getLicenseColor(license.class).replace('bg-', 'text-')}`}>
                                        {license.class}
                                    </span>
                                    <span className="text-lg font-mono text-zinc-300">{license.sr.toFixed(2)}</span>
                                </div>
                                {license.iRating ? (
                                    <div className="text-sm font-mono text-white">{license.iRating} iR</div>
                                ) : (
                                    <div className="text-sm text-zinc-600">No iRating</div>
                                )}
                                {stats && (
                                    <div className="text-xs text-zinc-500 mt-2">{stats.starts} starts</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Recent Races */}
                <div className="lg:col-span-2 card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Flag size={16} className="text-racing-blue" />
                            <span className="font-medium text-sm uppercase tracking-wider">Recent Races</span>
                        </div>
                        <span className="text-xs text-zinc-600">Last 5 official races</span>
                    </div>
                    <div className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                                    <th className="text-left py-3 px-5">Series / Track</th>
                                    <th className="text-center py-3 px-3">Start</th>
                                    <th className="text-center py-3 px-3">Finish</th>
                                    <th className="text-center py-3 px-3">+/-</th>
                                    <th className="text-center py-3 px-3">Inc</th>
                                    <th className="text-right py-3 px-5">Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RECENT_RACES.map((race, i) => {
                                    const change = getPositionChange(race.start, race.finish);
                                    return (
                                        <tr key={i} className="table-row">
                                            <td className="py-3 px-5">
                                                <div className="font-medium text-white">{race.series}</div>
                                                <div className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {race.track}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono text-zinc-400">P{race.start}</td>
                                            <td className={`py-3 px-3 text-center font-mono font-bold ${race.finish <= 3 ? 'text-racing-green' : race.finish <= 10 ? 'text-white' : 'text-zinc-400'}`}>
                                                P{race.finish}
                                            </td>
                                            <td className={`py-3 px-3 text-center font-mono ${change.color}`}>{change.text}</td>
                                            <td className={`py-3 px-3 text-center font-mono ${race.incidents > 8 ? 'text-red-400' : race.incidents > 4 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                                {race.incidents}x
                                            </td>
                                            <td className="py-3 px-5 text-right font-mono text-racing-blue">{race.points}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Stats Summary */}
                <div className="space-y-6">
                    {/* Oval Stats (Primary) */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Car size={16} className="text-green-500" />
                                <span className="font-medium text-sm uppercase tracking-wider">Oval Career</span>
                            </div>
                            <span className={`text-xs font-bold ${getLicenseColor('B').replace('bg-', 'text-')}`}>Class B</span>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-3 gap-4 text-center mb-4">
                                <div>
                                    <div className="text-2xl font-bold text-white">{DRIVER_PROFILE.stats.oval.wins}</div>
                                    <div className="text-xs text-zinc-500">Wins</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-racing-green">{DRIVER_PROFILE.stats.oval.top5s}</div>
                                    <div className="text-xs text-zinc-500">Top 5s</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-racing-blue">{DRIVER_PROFILE.stats.oval.poles}</div>
                                    <div className="text-xs text-zinc-500">Poles</div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                                <span className="text-zinc-500">Avg Start → Finish</span>
                                <span className="font-mono text-white">
                                    P{DRIVER_PROFILE.stats.oval.avgStart} → P{DRIVER_PROFILE.stats.oval.avgFinish}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="card">
                        <div className="card-header">
                            <span className="font-medium text-sm uppercase tracking-wider text-zinc-400">Quick Links</span>
                        </div>
                        <div className="p-2">
                            <Link to="/teams/demo" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                                <Car size={16} className="text-racing-blue" />
                                <span className="text-sm">My Team</span>
                            </Link>
                            <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                                <BarChart3 size={16} className="text-racing-blue" />
                                <span className="text-sm">All Surfaces</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Goals */}
            <div className="card mt-6">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <Target size={16} className="text-racing-green" />
                        <span className="font-medium text-sm uppercase tracking-wider">Development Goals</span>
                    </div>
                    <span className="text-xs text-zinc-600">{ACTIVE_GOALS.length} active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                    {ACTIVE_GOALS.map(goal => {
                        const Icon = goal.icon;
                        const progress = goal.category === 'Safety'
                            ? ((goal.target - goal.current) / (goal.target - 15)) * 100 // Inverted for incidents
                            : (goal.current / goal.target) * 100;
                        return (
                            <div key={goal.id} className="bg-white/5 rounded-lg p-4 border border-white/5 hover:border-racing-blue/30 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-racing-blue/20 flex items-center justify-center">
                                        <Icon size={20} className="text-racing-blue" />
                                    </div>
                                    {goal.trend && (
                                        <div className={`flex items-center gap-1 text-xs ${goal.trend === 'up' ? 'text-racing-green' : 'text-red-400'}`}>
                                            {goal.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm font-medium text-white mb-1">{goal.label}</div>
                                <div className="text-xs text-zinc-500 mb-3">{goal.category}</div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                    <div
                                        className="h-full bg-racing-blue transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400 font-mono">{goal.current}</span>
                                    <span className="text-racing-blue font-mono">{goal.target}</span>
                                </div>
                                {goal.deadline && (
                                    <div className="flex items-center gap-1 text-xs text-zinc-600 mt-2">
                                        <Calendar size={10} />
                                        {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* AI Suggestions & Achievements Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* AI Suggestions */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" />
                            <span className="font-medium text-sm uppercase tracking-wider">AI Coach Suggestions</span>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {AI_SUGGESTIONS.map(suggestion => (
                            <div key={suggestion.id} className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${suggestion.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                    <div className="flex-1">
                                        <div className="font-medium text-white mb-1">{suggestion.title}</div>
                                        <div className="text-sm text-zinc-400 mb-2">{suggestion.description}</div>
                                        <div className="text-xs text-zinc-600 flex items-center gap-1">
                                            <Activity size={10} />
                                            Based on: {suggestion.basedOn}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Achievements */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Award size={16} className="text-yellow-400" />
                            <span className="font-medium text-sm uppercase tracking-wider">Achievements</span>
                        </div>
                        <span className="text-xs text-zinc-600">{ACHIEVEMENTS.length} earned</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-5">
                        {ACHIEVEMENTS.map(achievement => (
                            <div key={achievement.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{achievement.icon}</div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{achievement.name}</div>
                                        <div className="text-xs text-zinc-500">{achievement.description}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
