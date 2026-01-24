import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
    Timer,
    Clock,
    CheckCircle
} from 'lucide-react';

// Types
interface RunPlan {
    id: string;
    name: string;
    target_laps: number;
    completed_laps: number;
    target_time?: string;
    focus: string[];
    status: 'planned' | 'in_progress' | 'completed';
}

interface DriverStint {
    driver_id: string;
    driver_name: string;
    laps: number;
    best_lap: string;
    avg_lap: string;
    consistency: number;
    incidents: number;
}

// Mock data
const mockRunPlans: RunPlan[] = [
    {
        id: 'rp1',
        name: 'Long Run Test',
        target_laps: 30,
        completed_laps: 30,
        target_time: '1:48.000',
        focus: ['Tire deg', 'Fuel consumption', 'Consistency'],
        status: 'completed'
    },
    {
        id: 'rp2',
        name: 'Quali Sim',
        target_laps: 3,
        completed_laps: 2,
        target_time: '1:46.500',
        focus: ['Single lap pace', 'Low fuel'],
        status: 'in_progress'
    },
    {
        id: 'rp3',
        name: 'Traffic Practice',
        target_laps: 20,
        completed_laps: 0,
        focus: ['Overtaking', 'Defensive lines'],
        status: 'planned'
    }
];

const mockStints: DriverStint[] = [
    { driver_id: 'd1', driver_name: 'Alex Rivera', laps: 45, best_lap: '1:47.342', avg_lap: '1:48.012', consistency: 94, incidents: 0 },
    { driver_id: 'd2', driver_name: 'Jordan Chen', laps: 38, best_lap: '1:47.156', avg_lap: '1:48.445', consistency: 86, incidents: 1 },
    { driver_id: 'd3', driver_name: 'Sam Williams', laps: 28, best_lap: '1:48.102', avg_lap: '1:48.890', consistency: 91, incidents: 0 },
    { driver_id: 'd4', driver_name: 'Casey Morgan', laps: 15, best_lap: '1:49.234', avg_lap: '1:50.678', consistency: 72, incidents: 2 }
];

const statusStyles: Record<string, { bg: string; text: string; icon: any }> = {
    planned: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', icon: Clock },
    in_progress: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Timer },
    completed: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', icon: CheckCircle }
};

export default function TeamPractice() {
    const { teamId } = useParams<{ teamId: string }>();
    useAuthStore(); // Available for API calls

    const [runPlans, setRunPlans] = useState<RunPlan[]>([]);
    const [stints, setStints] = useState<DriverStint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [teamId]);

    const fetchData = async () => {
        setLoading(true);

        if (teamId === 'demo') {
            await new Promise(r => setTimeout(r, 400));
            setRunPlans(mockRunPlans);
            setStints(mockStints);
            setLoading(false);
            return;
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading practice...</div>
            </div>
        );
    }

    // Find best lap across all drivers
    const bestOverall = stints.reduce((best, s) => {
        const time = s.best_lap;
        return !best || time < best ? time : best;
    }, '');

    return (
        <div className="p-4 max-w-7xl mx-auto">
            {/* Header - Structural white band */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black/20">
                <div>
                    <h1 className="text-sm font-semibold text-[#0E0E0E] uppercase tracking-wider">Practice Session</h1>
                    <p className="text-xs text-[#0E0E0E]/50 mt-0.5">Session analysis & driver comparisons</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Run Plans */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="card-header">
                            <span>Run Plans</span>
                            <button className="btn btn-secondary">
                                Add Plan
                            </button>
                        </div>
                        <div className="divide-y divide-[#0E0E0E]/10">
                            {runPlans.map(plan => {
                                const status = statusStyles[plan.status];
                                const StatusIcon = status.icon;

                                return (
                                    <div key={plan.id} className="p-4 hover:bg-black/5 transition-colors cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <StatusIcon size={16} className={status.text} />
                                                <span className="font-medium text-[#0E0E0E]">{plan.name}</span>
                                            </div>
                                            <span className={`text-[0.6rem] px-2 py-0.5 font-semibold uppercase ${status.bg} ${status.text}`}>
                                                {plan.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 mb-3 text-xs text-[#0E0E0E]/50">
                                            <span>{plan.completed_laps} / {plan.target_laps} laps</span>
                                            {plan.target_time && <span>Target: {plan.target_time}</span>}
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            {plan.focus.map((f, i) => (
                                                <span key={i} className="text-[0.6rem] px-2 py-0.5 bg-[#0E0E0E]/10 border border-[#0E0E0E]/20 text-[#0E0E0E]/70">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Session Summary */}
                <div className="card">
                    <div className="card-header">
                        <span>Session Totals</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="stat-card text-center">
                            <div className="text-xs text-[#0E0E0E]/50 mb-1">Best Overall Lap</div>
                            <div className="text-lg font-bold text-[#0E0E0E] font-mono">{bestOverall}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-[#0E0E0E]">
                            <div className="stat-card">
                                <div className="stat-label">Total Laps</div>
                                <div className="stat-value">
                                    {stints.reduce((sum, s) => sum + s.laps, 0)}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Incidents</div>
                                <div className="stat-value">
                                    {stints.reduce((sum, s) => sum + s.incidents, 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Driver Comparison */}
            <div className="card mt-6">
                <div className="card-header">
                    <span>Driver Stints</span>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#1f2937] border-b-2 border-black text-white text-[0.6rem] font-semibold uppercase tracking-widest">
                            <th className="text-left py-3 px-5">Driver</th>
                            <th className="text-right py-3 px-3">Laps</th>
                            <th className="text-right py-3 px-3">Best Lap</th>
                            <th className="text-right py-3 px-3">Avg Lap</th>
                            <th className="text-right py-3 px-3">Consistency</th>
                            <th className="text-right py-3 px-5">Inc</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stints.map(stint => (
                            <tr key={stint.driver_id} className="table-row">
                                <td className="py-3 px-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-[#0E0E0E] flex items-center justify-center text-[0.6rem] font-semibold text-white">
                                            {stint.driver_name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <span className="font-medium text-[#0E0E0E]">{stint.driver_name}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-[#0E0E0E]">{stint.laps}</td>
                                <td className={`py-3 px-3 text-right font-mono ${stint.best_lap === bestOverall ? 'text-[#0E0E0E] font-bold' : 'text-[#0E0E0E]/70'}`}>
                                    {stint.best_lap}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-[#0E0E0E]/70">{stint.avg_lap}</td>
                                <td className="py-3 px-3 text-right font-mono text-[#0E0E0E]">
                                    {stint.consistency}%
                                </td>
                                <td className="py-3 px-5 text-right font-mono">
                                    {stint.incidents > 0 ? (
                                        <span className="text-racing-red">{stint.incidents}</span>
                                    ) : (
                                        <span className="text-[#0E0E0E]/40">0</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
