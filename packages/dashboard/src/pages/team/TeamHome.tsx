import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Calendar,
    Users,
    Clock,
    Activity,
    ChevronRight,
    Radio
} from 'lucide-react';

// Mock data for demo mode
const mockData = {
    teamName: 'Throttle Works Racing',
    teamId: 'APX-001',
    stats: {
        totalLaps: 5096,
        totalSessions: 124,
        avgIncidentRate: 2.4,
        activeDrivers: 4
    },
    drivers: [
        { name: 'Alex Rivera', role: 'Owner', sessions: 42, laps: 1847, bestLap: '1:32.847' },
        { name: 'Jordan Chen', role: 'Manager', sessions: 38, laps: 1523, bestLap: '1:33.102' },
        { name: 'Sam Williams', role: 'Member', sessions: 29, laps: 1102, bestLap: '1:33.451' },
        { name: 'Casey Morgan', role: 'Member', sessions: 15, laps: 624, bestLap: '1:33.892' }
    ],
    nextEvent: {
        name: 'Daytona 500 Practice',
        date: 'Jan 18, 2026',
        time: '14:00 EST',
        track: 'Daytona International Speedway',
        drivers: 4
    },
    recentActivity: [
        { driver: 'Alex Rivera', action: 'Completed 45-lap stint', time: '2h ago', result: '1:32.847' },
        { driver: 'Jordan Chen', action: 'Joined practice session', time: '3h ago', result: null },
        { driver: 'Sam Williams', action: 'Set personal best', time: '5h ago', result: '-0.2s' },
        { driver: 'Casey Morgan', action: 'Race simulation P3', time: '1d ago', result: 'P3' }
    ]
};

export default function TeamHome() {
    const { teamId } = useParams<{ teamId: string }>();
    const [data] = useState(mockData);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-racing text-2xl text-white tracking-wide">{data.teamName}</h1>
                    <p className="text-sm text-zinc-500 font-mono">{teamId?.toUpperCase() || 'DEMO'}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-racing-green animate-pulse"></span>
                    <span className="text-zinc-400">{data.stats.activeDrivers} Active</span>
                </div>
            </div>

            {/* Stats Row - Clean telemetry style */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-label">Total Laps</div>
                    <div className="stat-value">{data.stats.totalLaps.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Sessions</div>
                    <div className="stat-value">{data.stats.totalSessions}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Avg Incidents</div>
                    <div className="stat-value">{data.stats.avgIncidentRate}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Drivers</div>
                    <div className="stat-value">{data.stats.activeDrivers}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Driver Timing Table */}
                <div className="lg:col-span-2 card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-racing-blue" />
                            <span className="font-medium text-sm uppercase tracking-wider">Driver Summary</span>
                        </div>
                        <Link to="roster" className="text-xs text-racing-blue hover:underline flex items-center gap-1">
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                                    <th className="text-left py-3 px-5">Driver</th>
                                    <th className="text-left py-3 px-3">Role</th>
                                    <th className="text-right py-3 px-3">Sessions</th>
                                    <th className="text-right py-3 px-3">Laps</th>
                                    <th className="text-right py-3 px-5 font-mono">Best Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.drivers.map((driver, i) => (
                                    <tr key={i} className="table-row">
                                        <td className="py-3 px-5 font-medium text-white">{driver.name}</td>
                                        <td className="py-3 px-3 text-zinc-400">{driver.role}</td>
                                        <td className="py-3 px-3 text-right font-mono text-zinc-300">{driver.sessions}</td>
                                        <td className="py-3 px-3 text-right font-mono text-zinc-300">{driver.laps.toLocaleString()}</td>
                                        <td className="py-3 px-5 text-right font-mono text-racing-green">{driver.bestLap}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Next Event & Activity */}
                <div className="space-y-6">
                    {/* Next Event */}
                    <Link to="events" className="card block group">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-racing-blue" />
                                <span className="font-medium text-sm uppercase tracking-wider">Next Event</span>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-racing-blue transition-colors" />
                        </div>
                        <div className="p-5">
                            <div className="text-lg font-semibold text-white mb-1">{data.nextEvent.name}</div>
                            <div className="text-sm text-zinc-400 mb-3">{data.nextEvent.track}</div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {data.nextEvent.date} • {data.nextEvent.time}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users size={12} />
                                    {data.nextEvent.drivers} drivers
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Quick Links */}
                    <div className="card">
                        <div className="card-header">
                            <span className="font-medium text-sm uppercase tracking-wider text-zinc-400">Quick Links</span>
                        </div>
                        <div className="p-2">
                            <Link to="events" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                                <Calendar size={16} className="text-racing-blue" />
                                <span className="text-sm">Events</span>
                            </Link>
                            <Link to="roster" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                                <Users size={16} className="text-racing-blue" />
                                <span className="text-sm">Roster</span>
                            </Link>
                            <Link to="reports" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                                <Activity size={16} className="text-racing-blue" />
                                <span className="text-sm">Reports</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="card mt-6">
                <div className="card-header">
                    <div className="flex items-center gap-2">
                        <Radio size={16} className="text-racing-green" />
                        <span className="font-medium text-sm uppercase tracking-wider">Recent Activity</span>
                    </div>
                    <span className="text-xs text-zinc-600 uppercase tracking-wider">Live</span>
                </div>
                <div className="divide-y divide-white/5">
                    {data.recentActivity.map((activity, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                                    {activity.driver.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div className="text-sm text-white">
                                        <span className="font-medium">{activity.driver}</span>
                                        <span className="text-zinc-400"> • {activity.action}</span>
                                    </div>
                                    <div className="text-xs text-zinc-600">{activity.time}</div>
                                </div>
                            </div>
                            {activity.result && (
                                <span className="font-mono text-sm text-racing-green">{activity.result}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
