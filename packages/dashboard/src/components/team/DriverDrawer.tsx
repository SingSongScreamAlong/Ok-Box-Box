import { Link } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { DriverSummaryForTeam } from '../../types/team.types';

interface DriverDrawerProps {
    driver: DriverSummaryForTeam | null;
    teamId: string;
    onClose: () => void;
}

// Mock trait data for demo
const mockTraits: Record<string, string[]> = {
    'd1': ['Consistent', 'Fuel Saver', 'Night Specialist'],
    'd2': ['Aggressive', 'Wet Weather', 'Quick Qualifier'],
    'd3': ['Tire Management', 'Endurance'],
    'd4': ['Rookie', 'Learning']
};

// Mock performance for demo
const mockPerformance: Record<string, { pace: number; consistency: number; risk: number }> = {
    'd1': { pace: 78, consistency: 92, risk: 15 },
    'd2': { pace: 85, consistency: 76, risk: 35 },
    'd3': { pace: 72, consistency: 84, risk: 22 },
    'd4': { pace: 58, consistency: 65, risk: 45 }
};

export function DriverDrawer({ driver, teamId, onClose }: DriverDrawerProps) {
    if (!driver) return null;

    const traits = mockTraits[driver.driver_id] || [];
    const perf = mockPerformance[driver.driver_id] || { pace: 70, consistency: 70, risk: 25 };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-white/10 z-50 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-zinc-300">
                            {driver.display_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <h2 className="font-medium text-white">{driver.display_name}</h2>
                            <p className="text-xs text-zinc-500 capitalize">{driver.role}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-white font-mono">{driver.total_sessions || 0}</div>
                            <div className="text-xs text-zinc-500">Sessions</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-white font-mono">{(driver.total_laps || 0).toLocaleString()}</div>
                            <div className="text-xs text-zinc-500">Laps</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                            <div className={`text-lg font-bold font-mono ${(driver.avg_incident_rate || 0) < 2 ? 'text-racing-green' : (driver.avg_incident_rate || 0) < 3 ? 'text-racing-yellow' : 'text-racing-red'}`}>
                                {driver.avg_incident_rate?.toFixed(1) || '—'}
                            </div>
                            <div className="text-xs text-zinc-500">Avg Inc</div>
                        </div>
                    </div>

                    {/* Performance Indices */}
                    <div>
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Performance</h3>
                        <div className="space-y-3">
                            <PerformanceBar label="Pace" value={perf.pace} color="racing-blue" />
                            <PerformanceBar label="Consistency" value={perf.consistency} color="racing-green" />
                            <PerformanceBar label="Risk" value={perf.risk} color="racing-red" inverted />
                        </div>
                    </div>

                    {/* Traits */}
                    <div>
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Traits</h3>
                        {traits.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {traits.map((trait, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 rounded bg-slate-800 text-zinc-300 border border-slate-700">
                                        {trait}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 italic">No traits detected yet</p>
                        )}
                    </div>

                    {/* Recent Sessions Preview */}
                    <div>
                        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Recent Sessions</h3>
                        <div className="space-y-2">
                            {[
                                { track: 'Spa-Francorchamps', time: '2:18.342', position: 'P3' },
                                { track: 'Daytona Road', time: '1:47.891', position: 'P5' },
                                { track: 'Nordschleife', time: '7:02.445', position: '—' }
                            ].map((session, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <span className="text-sm text-zinc-300">{session.track}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-racing-green">{session.time}</span>
                                        <span className="text-xs text-zinc-500 w-8 text-right">{session.position}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* View Full Profile Link */}
                    <Link
                        to={`/teams/${teamId}/driver/${driver.driver_id}`}
                        className="flex items-center justify-between w-full p-3 bg-racing-blue/10 border border-racing-blue/30 rounded-lg text-racing-blue hover:bg-racing-blue/20 transition-colors"
                    >
                        <span className="text-sm font-medium">View Full Profile</span>
                        <ChevronRight size={16} />
                    </Link>
                </div>
            </div>
        </>
    );
}

// Performance bar component
function PerformanceBar({ label, value, color, inverted = false }: {
    label: string;
    value: number;
    color: string;
    inverted?: boolean;
}) {
    const displayValue = inverted ? 100 - value : value;
    const colorClass = color === 'racing-blue' ? 'bg-racing-blue' : color === 'racing-green' ? 'bg-racing-green' : 'bg-racing-red';

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-20">{label}</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                    style={{ width: `${displayValue}%` }}
                />
            </div>
            <span className="text-xs font-mono text-zinc-300 w-8 text-right">{value}%</span>
        </div>
    );
}
