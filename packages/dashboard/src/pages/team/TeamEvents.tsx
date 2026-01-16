import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
    Plus,
    Calendar,
    Car,
    ChevronRight,
    X,
    Clock,
    Flag,
    Trophy
} from 'lucide-react';

interface TeamEvent {
    id: string;
    event_name: string;
    event_type: string;
    track?: string;
    session_id: string;
    participating_driver_ids: string[];
    created_at: string;
    status?: 'upcoming' | 'completed' | 'in_progress';
}

// Mock events for demo mode
const mockEvents: TeamEvent[] = [
    {
        id: 'evt-1',
        event_name: 'Daytona 500 Practice',
        event_type: 'practice',
        track: 'Daytona International Speedway',
        session_id: 'sess-001',
        participating_driver_ids: ['d1', 'd2', 'd3', 'd4'],
        created_at: '2026-01-18T14:00:00Z',
        status: 'upcoming'
    },
    {
        id: 'evt-2',
        event_name: 'Spa Endurance Race',
        event_type: 'endurance',
        track: 'Circuit de Spa-Francorchamps',
        session_id: 'sess-002',
        participating_driver_ids: ['d1', 'd2', 'd3'],
        created_at: '2026-01-12T09:00:00Z',
        status: 'completed'
    },
    {
        id: 'evt-3',
        event_name: 'Nordschleife Time Attack',
        event_type: 'qualifying',
        track: 'Nürburgring Nordschleife',
        session_id: 'sess-003',
        participating_driver_ids: ['d2', 'd4'],
        created_at: '2026-01-10T16:00:00Z',
        status: 'completed'
    },
    {
        id: 'evt-4',
        event_name: 'Le Mans Test Day',
        event_type: 'practice',
        track: 'Circuit de la Sarthe',
        session_id: 'sess-004',
        participating_driver_ids: ['d1', 'd2', 'd3', 'd4'],
        created_at: '2026-01-05T08:00:00Z',
        status: 'completed'
    }
];

const typeIcons: Record<string, any> = {
    race: Trophy,
    practice: Car,
    qualifying: Clock,
    endurance: Flag,
    other: Calendar
};

export default function TeamEvents() {
    const { teamId } = useParams<{ teamId: string }>();
    const { accessToken } = useAuthStore();
    const [events, setEvents] = useState<TeamEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

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

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading events...</div>
            </div>
        );
    }

    const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'in_progress');
    const completedEvents = events.filter(e => e.status === 'completed');

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="font-racing text-2xl text-white tracking-wide">Events</h1>
                    <p className="text-sm text-zinc-500">{events.length} events tracked</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                    <Plus size={16} className="mr-2" />
                    Create Event
                </button>
            </div>

            {events.length === 0 ? (
                <div className="card p-12 text-center">
                    <Calendar className="mx-auto text-zinc-600 mb-3" size={40} />
                    <h3 className="text-lg font-medium text-zinc-400">No events yet</h3>
                    <p className="text-sm text-zinc-500 mt-1">Create your first team event</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <div>
                            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-racing-green animate-pulse"></span>
                                Upcoming
                            </h2>
                            <div className="card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                                            <th className="text-left py-3 px-5">Event</th>
                                            <th className="text-left py-3 px-3">Track</th>
                                            <th className="text-left py-3 px-3">Type</th>
                                            <th className="text-right py-3 px-3">Drivers</th>
                                            <th className="text-right py-3 px-5">Date</th>
                                            <th className="py-3 px-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upcomingEvents.map(event => {
                                            const TypeIcon = typeIcons[event.event_type] || typeIcons.other;
                                            return (
                                                <tr key={event.id} className="table-row group">
                                                    <td className="py-3 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <TypeIcon size={16} className="text-racing-blue" />
                                                            <span className="font-medium text-white">{event.event_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-zinc-400">{event.track}</td>
                                                    <td className="py-3 px-3">
                                                        <span className="badge bg-racing-blue/10 text-racing-blue border border-racing-blue/30 capitalize">
                                                            {event.event_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-zinc-300">
                                                        {event.participating_driver_ids.length}
                                                    </td>
                                                    <td className="py-3 px-5 text-right font-mono text-zinc-400">
                                                        {new Date(event.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <Link to={event.id} className="text-zinc-600 group-hover:text-racing-blue">
                                                            <ChevronRight size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Completed Events */}
                    {completedEvents.length > 0 && (
                        <div>
                            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Completed</h2>
                            <div className="card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                                            <th className="text-left py-3 px-5">Event</th>
                                            <th className="text-left py-3 px-3">Track</th>
                                            <th className="text-left py-3 px-3">Type</th>
                                            <th className="text-right py-3 px-3">Drivers</th>
                                            <th className="text-right py-3 px-5">Date</th>
                                            <th className="py-3 px-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {completedEvents.map(event => {
                                            const TypeIcon = typeIcons[event.event_type] || typeIcons.other;
                                            return (
                                                <tr key={event.id} className="table-row group">
                                                    <td className="py-3 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <TypeIcon size={16} className="text-zinc-500" />
                                                            <span className="font-medium text-zinc-300">{event.event_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-zinc-500">{event.track}</td>
                                                    <td className="py-3 px-3">
                                                        <span className="badge bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
                                                            {event.event_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-zinc-500">
                                                        {event.participating_driver_ids.length}
                                                    </td>
                                                    <td className="py-3 px-5 text-right font-mono text-zinc-500">
                                                        {new Date(event.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <Link to={event.id} className="text-zinc-600 group-hover:text-racing-blue">
                                                            <ChevronRight size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showCreateModal && (
                <CreateEventModal
                    teamId={teamId!}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchEvents(); }}
                />
            )}
        </div>
    );
}

function CreateEventModal({ teamId, onClose, onCreated }: { teamId: string; onClose: () => void; onCreated: () => void }) {
    const { accessToken } = useAuthStore();
    const [formData, setFormData] = useState({ event_name: '', event_type: 'race', session_id: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (teamId === 'demo') {
            onCreated();
            return;
        }

        if (!formData.session_id) { setError('Session ID is required'); return; }
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify(formData)
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed'); }
            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-lg">
                <div className="card-header">
                    <span className="font-medium">Create Event</span>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Event Name</label>
                        <input
                            type="text"
                            value={formData.event_name}
                            onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                            placeholder="e.g. Spa 24H Practice"
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Event Type</label>
                        <select
                            value={formData.event_type}
                            onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                            className="input"
                        >
                            <option value="race">Race</option>
                            <option value="practice">Practice</option>
                            <option value="qualifying">Qualifying</option>
                            <option value="endurance">Endurance</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Session ID</label>
                        <input
                            type="text"
                            value={formData.session_id}
                            onChange={e => setFormData({ ...formData, session_id: e.target.value })}
                            placeholder="Session UUID"
                            className="input font-mono text-sm"
                            required={teamId !== 'demo'}
                        />
                    </div>
                    {error && <div className="p-3 bg-racing-red/10 border border-racing-red/30 rounded text-racing-red text-sm">{error}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
