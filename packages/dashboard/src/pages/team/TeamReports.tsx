import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { FileText, Sparkles, ChevronRight } from 'lucide-react';

interface TeamDebrief {
    event_id: string;
    event_name: string | null;
    session_id: string;
    driver_summaries: Array<{
        driver_profile_id: string;
        display_name: string;
        headline: string;
        primary_limiter: string;
    }>;
    team_summary: {
        overall_observation: string;
        common_patterns: string[];
        priority_focus: string;
    } | null;
    status: string;
}

// Mock data
const mockEvents = [
    { id: 'evt-1', event_name: 'Daytona 500 Practice', created_at: '2026-01-18T14:00:00Z' },
    { id: 'evt-2', event_name: 'Spa Endurance Race', created_at: '2026-01-12T09:00:00Z' },
    { id: 'evt-3', event_name: 'Nordschleife Time Attack', created_at: '2026-01-10T16:00:00Z' }
];

const mockDebriefs: Record<string, TeamDebrief> = {
    'evt-2': {
        event_id: 'evt-2',
        event_name: 'Spa Endurance Race',
        session_id: 'sess-002',
        driver_summaries: [
            {
                driver_profile_id: 'd1',
                display_name: 'Alex Rivera',
                headline: 'Excellent fuel management saved 2 pit stops. Consistent lap times in the 2:18s throughout.',
                primary_limiter: 'Tire Degradation'
            },
            {
                driver_profile_id: 'd2',
                display_name: 'Jordan Chen',
                headline: 'Strong qualifying pace translated to race. Aggressive but clean overtakes in Eau Rouge.',
                primary_limiter: 'Brake Consistency'
            },
            {
                driver_profile_id: 'd3',
                display_name: 'Sam Williams',
                headline: 'Solid double stint on hard compound. Minor lockups in sector 2 affected pace by 0.3s.',
                primary_limiter: 'Trail Braking'
            }
        ],
        team_summary: {
            overall_observation: 'The team showed exceptional endurance race strategy execution. Driver changeovers were smooth and communication between stints was clear and actionable.',
            common_patterns: [
                'All drivers lost time in the Bus Stop chicane under traffic',
                'Tire management improved significantly from practice',
                'Radio discipline was excellent during safety car periods'
            ],
            priority_focus: 'Focus on Bus Stop chicane entry and late apex technique for the next event.'
        },
        status: 'complete'
    },
    'evt-3': {
        event_id: 'evt-3',
        event_name: 'Nordschleife Time Attack',
        session_id: 'sess-003',
        driver_summaries: [
            {
                driver_profile_id: 'd2',
                display_name: 'Jordan Chen',
                headline: 'Set personal best by 1.2 seconds. Improved Carousel section technique significantly.',
                primary_limiter: 'Jump Landings'
            },
            {
                driver_profile_id: 'd4',
                display_name: 'Casey Morgan',
                headline: 'Good learning session with 15 clean laps. Track knowledge improving steadily.',
                primary_limiter: 'Overall Pace'
            }
        ],
        team_summary: {
            overall_observation: 'Productive time attack session with focus on sector improvements. Both drivers showed measurable progress.',
            common_patterns: [
                'Brundle exit causing understeer on cold tires',
                'Jump landing technique needs refinement',
                'Good consistency in Sector 1'
            ],
            priority_focus: 'Practice jump entries at reduced speed to build confidence.'
        },
        status: 'complete'
    }
};

export default function TeamReports() {
    const { teamId } = useParams<{ teamId: string }>();
    const { accessToken } = useAuthStore();
    const [events, setEvents] = useState<any[]>([]);
    const [selectedDebrief, setSelectedDebrief] = useState<TeamDebrief | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingDebrief, setLoadingDebrief] = useState(false);

    useEffect(() => {
        if (teamId) fetchEvents();
    }, [teamId]);

    const fetchEvents = async () => {
        try {
            if (teamId === 'demo') {
                await new Promise(resolve => setTimeout(resolve, 400));
                setEvents(mockEvents);
                setLoading(false);
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/events`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await res.json();
            setEvents(data.events || []);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDebrief = async (eventId: string) => {
        setLoadingDebrief(true);
        try {
            if (teamId === 'demo') {
                await new Promise(resolve => setTimeout(resolve, 500));
                setSelectedDebrief(mockDebriefs[eventId] || null);
                setLoadingDebrief(false);
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/events/${eventId}/debrief`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await res.json();
            setSelectedDebrief(data);
        } catch (err) {
            console.error('Failed to fetch debrief:', err);
        } finally {
            setLoadingDebrief(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-[#0E0E0E]/50">Loading reports...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-sm font-semibold text-[#0E0E0E] uppercase tracking-wider">Team Reports</h1>
                <p className="text-xs text-[#0E0E0E]/50">Event debriefs and analysis</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Events List */}
                <div className="lg:col-span-1">
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-racing-blue" />
                                <span className="font-medium text-sm uppercase tracking-wider">Debriefs</span>
                            </div>
                        </div>
                        <div className="divide-y divide-[#0E0E0E]/10">
                            {events.length === 0 ? (
                                <div className="py-8 text-center text-zinc-500 text-sm">No events</div>
                            ) : (
                                events.map(event => {
                                    const hasDebrief = teamId === 'demo' ? !!mockDebriefs[event.id] : true;
                                    const isSelected = selectedDebrief?.event_id === event.id;
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => fetchDebrief(event.id)}
                                            disabled={!hasDebrief}
                                            className={`w-full text-left px-5 py-3 flex items-center justify-between transition-colors ${isSelected ? 'bg-racing-blue/10' : hasDebrief ? 'hover:bg-white/5' : 'opacity-50'
                                                }`}
                                        >
                                            <div>
                                                <div className={`text-sm font-medium ${isSelected ? 'text-racing-blue' : 'text-[#0E0E0E]'}`}>
                                                    {event.event_name}
                                                </div>
                                                <div className="text-xs text-[#0E0E0E]/50">{new Date(event.created_at).toLocaleDateString()}</div>
                                            </div>
                                            {hasDebrief && <ChevronRight size={14} className={isSelected ? 'text-racing-blue' : 'text-zinc-600'} />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Debrief Display */}
                <div className="lg:col-span-2">
                    {loadingDebrief ? (
                        <div className="card p-12 text-center text-zinc-500">Loading debrief...</div>
                    ) : selectedDebrief ? (
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="font-medium text-[#0E0E0E]">{selectedDebrief.event_name}</div>
                                    <div className="text-xs text-[#0E0E0E]/50">Session Analysis</div>
                                </div>
                                {selectedDebrief.team_summary && (
                                    <span className="badge bg-racing-blue/10 text-racing-blue border border-racing-blue/30">
                                        <Sparkles size={10} className="mr-1" /> AI Synthesized
                                    </span>
                                )}
                            </div>

                            <div className="p-5 space-y-6">
                                {/* Team Summary */}
                                {selectedDebrief.team_summary && (
                                    <div className="p-4 bg-[#0E0E0E]/5 border border-[#0E0E0E]/10">
                                        <h3 className="text-xs font-medium text-racing-blue uppercase tracking-wider mb-3">Team Summary</h3>
                                        <p className="text-sm text-[#0E0E0E]/80 mb-4">{selectedDebrief.team_summary.overall_observation}</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-xs text-[#0E0E0E]/50 uppercase mb-2">Common Patterns</h4>
                                                <ul className="space-y-1">
                                                    {selectedDebrief.team_summary.common_patterns.map((p, i) => (
                                                        <li key={i} className="text-xs text-[#0E0E0E]/70 flex items-start gap-2">
                                                            <span className="text-racing-yellow mt-0.5">•</span>
                                                            {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="text-xs text-[#0E0E0E]/50 uppercase mb-2">Priority Focus</h4>
                                                <p className="text-xs text-racing-green font-medium">{selectedDebrief.team_summary.priority_focus}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Driver Summaries */}
                                <div>
                                    <h3 className="text-xs font-medium text-[#0E0E0E]/50 uppercase tracking-wider mb-3">Driver Analysis</h3>
                                    <div className="space-y-3">
                                        {selectedDebrief.driver_summaries.map(d => (
                                            <div key={d.driver_profile_id} className="p-4 bg-[#0E0E0E]/5 border border-[#0E0E0E]/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-[#0E0E0E] flex items-center justify-center text-xs font-bold text-white">
                                                            {d.display_name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <span className="font-medium text-sm text-[#0E0E0E]">{d.display_name}</span>
                                                    </div>
                                                    <span className="badge bg-racing-yellow/10 text-racing-yellow border border-racing-yellow/30 text-xs">
                                                        {d.primary_limiter}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#0E0E0E]/70">{d.headline}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card p-12 text-center">
                            <FileText className="mx-auto text-zinc-600 mb-2" size={32} />
                            <p className="text-[#0E0E0E]/50">Select an event to view its debrief</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
