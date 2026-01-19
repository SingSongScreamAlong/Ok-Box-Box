import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import {
    Target,
    Trophy,
    TrendingUp,
    Zap,
    Clock,
    Flag,
    Award,
    Shield,
    AlertTriangle,
    Plus,
    Activity,
    BarChart3,
    Car,
    MapPin,
    Calendar,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';
import {
    fetchDriverProfile,
    fetchDriverTargets,
    fetchSuggestions,
    fetchAchievements,
    syncIRacingData,
    DriverProfile as IDriverProfile,
    DriverTarget,
    SuggestedTarget,
    Achievement
} from '../../../services/team/idp.service';

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

// ============================================================
// Component
// ============================================================

export default function MyIDPPage() {
    const [profile, setProfile] = useState<any>(DRIVER_PROFILE);
    const [targets, setTargets] = useState<DriverTarget[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedTarget[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Billing State
    const [entitlement, setEntitlement] = useState<'free' | 'pro'>('free'); // Default to free for demo

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [p, t, s, a] = await Promise.all([
                fetchDriverProfile(),
                fetchDriverTargets('me'),
                fetchSuggestions('me'),
                fetchAchievements('me')
            ]);

            // Merge API profile with demo stats (since API doesn't return full stats yet)
            setProfile({
                ...DRIVER_PROFILE,
                ...p,
                licenses: DRIVER_PROFILE.licenses, // Keep demo licenses structure for now
                stats: DRIVER_PROFILE.stats // Keep demo stats for now
            });

            // Demo entitlement logic (randomize or mock)
            setEntitlement('free'); // Can change to 'pro' to test

            // Map API targets to UI format if needed, or stick to type
            setTargets(t);
            setSuggestions(s);
            setAchievements(a);
        } catch (error) {
            console.error('Failed to load IDP data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncIRacingData();
            // Reload data after sync
            await loadData();
        } catch (error) {
            console.error('Sync failed', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Billing Handlers
    const handleUpgrade = async () => {
        try {
            // Fake price ID for dev; in prod this comes from env/config
            const priceId = 'price_1Qfake';
            await import('../../../services/billing.service').then(m => m.billingService.startCheckout(priceId));
        } catch (err) {
            alert('Failed to start checkout. Check console.');
            console.error(err);
        }
    };

    const handleManageSubscription = async () => {
        try {
            await import('../../../services/billing.service').then(m => m.billingService.openCustomerPortal());
        } catch (err) {
            alert('Failed to open portal. Check console.');
            console.error(err);
        }
    };

    // Chart Data
    const radarData = [
        { subject: 'Pace', A: 85, fullMark: 100 },
        { subject: 'Consistency', A: 92, fullMark: 100 },
        { subject: 'Racecraft', A: 78, fullMark: 100 },
        { subject: 'Safety', A: 88, fullMark: 100 },
        { subject: 'Endurance', A: 65, fullMark: 100 },
        { subject: 'Style', A: 70, fullMark: 100 },
    ];

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
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw size={32} className="animate-spin text-racing-blue" />
                        <span className="text-white font-medium">Loading Pilot Data...</span>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="font-racing text-2xl text-white tracking-wide">{profile.name || profile.display_name}</h1>
                        <p className="text-sm text-zinc-500">
                            <span className="font-mono">#{profile.custId || '000000'}</span>
                            <span className="mx-2">•</span>
                            Member since {profile.memberSince || '2025'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm font-medium ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync iRacing'}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-racing-blue hover:bg-racing-blue/80 text-white rounded-lg transition-colors text-sm font-medium">
                        <Plus size={16} />
                        Add Goal
                    </button>
                </div>
            </div>

            {/* License Cards - iRacing Style */}
            <div className="grid grid-cols-5 gap-3 mb-6">
                {profile.licenses && Object.entries(profile.licenses).map(([key, license]: [string, any]) => {
                    const stats = profile.stats?.[key];
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

                    {/* IDP Radar Chart */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-racing-blue" />
                                <span className="font-medium text-sm uppercase tracking-wider">Driver DNA</span>
                            </div>
                        </div>
                        <div className="h-[250px] w-full p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Skills"
                                        dataKey="A"
                                        stroke="#3b82f6"
                                        fill="#3b82f6"
                                        fillOpacity={0.3}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="card bg-gradient-to-br from-zinc-900 to-black border border-racing-blue/20">
                        <div className="card-header border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-racing-blue" />
                                <span className="font-medium text-sm uppercase tracking-wider text-white">Driver Entitlement</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${entitlement === 'pro' ? 'bg-racing-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {entitlement === 'pro' ? 'PRO' : 'FREE'}
                            </span>
                        </div>
                        <div className="p-5">
                            <div className="mb-4">
                                <div className="text-sm text-zinc-400 mb-1">Current Plan</div>
                                <div className="text-xl font-bold text-white">
                                    {entitlement === 'pro' ? 'ControlBox Pro' : 'ControlBox Free'}
                                </div>
                                {entitlement === 'pro' && <div className="text-xs text-zinc-500 mt-1">Renews on Feb 14, 2026</div>}
                            </div>

                            <div className="space-y-2">
                                {entitlement === 'pro' ? (
                                    <button
                                        onClick={handleManageSubscription}
                                        className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        Manage Subscription
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleUpgrade}
                                        className="w-full py-2 px-4 bg-racing-blue hover:bg-racing-blue/80 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        Upgrade to Pro
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

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
                                    <div className="text-2xl font-bold text-white">{profile.stats?.oval?.wins || 0}</div>
                                    <div className="text-xs text-zinc-500">Wins</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-racing-green">{profile.stats?.oval?.top5s || 0}</div>
                                    <div className="text-xs text-zinc-500">Top 5s</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-racing-blue">{profile.stats?.oval?.poles || 0}</div>
                                    <div className="text-xs text-zinc-500">Poles</div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                                <span className="text-zinc-500">Avg Start → Finish</span>
                                <span className="font-mono text-white">
                                    P{profile.stats?.oval?.avgStart || '-'} → P{profile.stats?.oval?.avgFinish || '-'}
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
                    <span className="text-xs text-zinc-600">{targets.length} active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                    {targets.map(goal => {
                        // Map category to icon (fallback to Trophy)
                        let Icon = Trophy;
                        if (goal.category === 'safety') Icon = AlertTriangle;
                        if (goal.category === 'irating') Icon = TrendingUp;
                        if (goal.category === 'lap_time') Icon = Clock;
                        if (goal.category === 'consistency') Icon = Activity;
                        if ((goal.category as string) === 'License') Icon = Shield; // Handle legacy/demo capital case

                        const current = Number(goal.current_value);
                        const target = Number(goal.target_value);

                        const progress = (goal.category as string).toLowerCase() === 'safety'
                            ? ((target - current) / (target - 15)) * 100 // Approximation for safet
                            : (current / target) * 100;
                        return (
                            <div key={goal.id} className="bg-white/5 rounded-lg p-4 border border-white/5 hover:border-racing-blue/30 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-racing-blue/20 flex items-center justify-center">
                                        <Icon size={20} className="text-racing-blue" />
                                    </div>
                                    {/* Trend not in API yet */}
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
                                    <span className="text-zinc-400 font-mono">{goal.current_value}</span>
                                    <span className="text-racing-blue font-mono">{goal.target_value}</span>
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
                        {suggestions.map(suggestion => (
                            <div key={suggestion.id} className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${suggestion.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                    <div className="flex-1">
                                        <div className="font-medium text-white mb-1">{suggestion.label}</div>
                                        <div className="text-sm text-zinc-400 mb-2">{suggestion.rationale}</div>
                                        <div className="text-xs text-zinc-600 flex items-center gap-1">
                                            <Activity size={10} />
                                            Target: {suggestion.target_value} ({suggestion.track})
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
                        <span className="text-xs text-zinc-600">{achievements.length} earned</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-5">
                        {achievements.map(achievement => (
                            <div key={achievement.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{achievement.badge}</div>
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
