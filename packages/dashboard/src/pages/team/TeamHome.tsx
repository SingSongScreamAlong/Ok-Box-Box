import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Calendar,
    Users,
    Clock,
    Activity,
    ChevronRight,
    Radio,
    Target,
    BarChart3,
    FileText
} from 'lucide-react';
import { ObbCard, ObbCardHeader, ObbCardBody } from '../../components/ui/ObbCard';

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
        <div className="p-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div>
                    <h1 className="text-xl font-semibold text-white uppercase tracking-[0.1em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{data.teamName}</h1>
                    <p className="text-xs text-white/40 font-mono mt-1">{teamId?.toUpperCase() || 'DEMO'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-white/60">{data.stats.activeDrivers} DRIVERS ACTIVE</span>
                </div>
            </div>

            {/* Pit Wall Quick Access */}
            <div className="border-l-2 border-[#f97316] pl-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#f97316] flex items-center justify-center">
                            <Radio size={24} className="text-black" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white uppercase tracking-[0.1em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                Pit Wall
                            </h2>
                            <p className="text-xs text-white/50">Race Operations Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="strategy" className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider hover:border-white/40 transition-colors">
                            <Target size={14} className="text-[#f97316]" />
                            Strategy
                        </Link>
                        <Link to="practice" className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider hover:border-white/40 transition-colors">
                            <BarChart3 size={14} className="text-[#3b82f6]" />
                            Practice
                        </Link>
                        <Link to="planning" className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider hover:border-white/40 transition-colors">
                            <Calendar size={14} className="text-purple-400" />
                            Planning
                        </Link>
                        <Link to="reports" className="flex items-center gap-2 px-4 py-2 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider hover:border-white/40 transition-colors">
                            <FileText size={14} className="text-green-400" />
                            Reports
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="border border-white/10 p-4">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Total Laps</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">{data.stats.totalLaps.toLocaleString()}</div>
                </div>
                <div className="border border-white/10 p-4">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Sessions</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">{data.stats.totalSessions}</div>
                </div>
                <div className="border border-white/10 p-4">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg Incidents</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">{data.stats.avgIncidentRate}</div>
                </div>
                <div className="border border-white/10 p-4">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Drivers</div>
                    <div className="text-2xl font-bold text-white font-mono mt-1">{data.stats.activeDrivers}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Driver Timing Table */}
                <ObbCard className="lg:col-span-2">
                    <ObbCardHeader 
                        title="Driver Summary" 
                        rightContent={
                            <Link to="roster" className="text-xs text-white/40 hover:text-white flex items-center gap-1">
                                View All <ChevronRight size={14} />
                            </Link>
                        }
                    />
                    <div className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-white/50 text-[10px] font-semibold uppercase tracking-widest">
                                    <th className="text-left py-3 px-5">Driver</th>
                                    <th className="text-left py-3 px-3">Role</th>
                                    <th className="text-right py-3 px-3">Sessions</th>
                                    <th className="text-right py-3 px-3">Laps</th>
                                    <th className="text-right py-3 px-5 font-mono">Best Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.drivers.map((driver, i) => (
                                    <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-5 font-medium text-white">{driver.name}</td>
                                        <td className="py-3 px-3 text-white/50">{driver.role}</td>
                                        <td className="py-3 px-3 text-right font-mono text-white/70">{driver.sessions}</td>
                                        <td className="py-3 px-3 text-right font-mono text-white/70">{driver.laps.toLocaleString()}</td>
                                        <td className="py-3 px-5 text-right font-mono font-bold text-green-400">{driver.bestLap}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ObbCard>

                {/* Right: Next Event & Activity */}
                <div className="space-y-4">
                    {/* Next Event */}
                    <Link to="events" className="block group">
                        <ObbCard className="hover:border-white/20 transition-colors">
                            <ObbCardHeader 
                                title="Next Event" 
                                rightContent={<ChevronRight size={12} className="text-white/30" />}
                            />
                            <ObbCardBody>
                                <div className="text-sm font-semibold text-white mb-1">{data.nextEvent.name}</div>
                                <div className="text-sm text-white/60 mb-3">{data.nextEvent.track}</div>
                                <div className="flex items-center gap-4 text-xs text-white/40">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {data.nextEvent.date} • {data.nextEvent.time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users size={12} />
                                        {data.nextEvent.drivers} drivers
                                    </span>
                                </div>
                            </ObbCardBody>
                        </ObbCard>
                    </Link>

                    {/* Quick Links */}
                    <ObbCard>
                        <ObbCardHeader title="Navigation" />
                        <div className="p-2">
                            <Link to="events" className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                                <Calendar size={16} className="text-purple-400" />
                                <span className="text-sm">Events</span>
                            </Link>
                            <Link to="roster" className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                                <Users size={16} className="text-green-400" />
                                <span className="text-sm">Roster</span>
                            </Link>
                            <Link to="reports" className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                                <Activity size={16} className="text-[#f97316]" />
                                <span className="text-sm">Reports</span>
                            </Link>
                        </div>
                    </ObbCard>
                </div>
            </div>

            {/* Activity Feed */}
            <ObbCard className="mt-6">
                <ObbCardHeader title="Activity Log" />
                <div className="divide-y divide-white/5">
                    {data.recentActivity.map((activity, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-semibold text-white/70">
                                    {activity.driver.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div className="text-sm text-white">
                                        <span className="font-medium">{activity.driver}</span>
                                        <span className="text-white/50"> • {activity.action}</span>
                                    </div>
                                    <div className="text-xs text-white/30">{activity.time}</div>
                                </div>
                            </div>
                            {activity.result && (
                                <span className="font-mono text-sm font-bold text-green-400">{activity.result}</span>
                            )}
                        </div>
                    ))}
                </div>
            </ObbCard>
        </div>
    );
}
