import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
    Calendar,
    Users,
    Clock,
    Plus,
    ChevronDown,
    ChevronUp,
    Flag,
    AlertCircle,
    Edit,
    Trash2,
    UserPlus
} from 'lucide-react';

// Types
interface PlanEvent {
    id: string;
    name: string;
    type: 'practice' | 'qualifying' | 'race' | 'endurance';
    track: string;
    date: string;
    time: string;
    duration: string;
    drivers: string[];
    status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed';
    notes?: string;
}

interface DriverAvailability {
    driver_id: string;
    display_name: string;
    available: boolean;
    notes?: string;
}

// Mock data
const mockEvents: PlanEvent[] = [
    {
        id: 'pe1',
        name: 'Daytona 24 Practice 1',
        type: 'practice',
        track: 'Daytona International Speedway',
        date: '2026-01-18',
        time: '19:00',
        duration: '2h',
        drivers: ['d1', 'd2', 'd3'],
        status: 'scheduled',
        notes: 'Focus on long run pace, tire deg analysis. Alex to open stint.'
    },
    {
        id: 'pe2',
        name: 'Daytona 24 Practice 2',
        type: 'practice',
        track: 'Daytona International Speedway',
        date: '2026-01-19',
        time: '14:00',
        duration: '2h',
        drivers: ['d1', 'd4'],
        status: 'scheduled',
        notes: 'Casey training focus. Baseline setup validation.'
    },
    {
        id: 'pe3',
        name: 'Daytona 24 Qualifying',
        type: 'qualifying',
        track: 'Daytona International Speedway',
        date: '2026-01-20',
        time: '18:00',
        duration: '30m',
        drivers: ['d1'],
        status: 'scheduled',
        notes: 'Alex quali driver. Target: Top 5 starting position.'
    },
    {
        id: 'pe4',
        name: 'Daytona 24 Hours',
        type: 'endurance',
        track: 'Daytona International Speedway',
        date: '2026-01-25',
        time: '13:30',
        duration: '24h',
        drivers: ['d1', 'd2', 'd3', 'd4'],
        status: 'confirmed',
        notes: 'Full team endurance. Triple stint rotation. Safety car strategy prepared.'
    }
];

const mockDrivers: DriverAvailability[] = [
    { driver_id: 'd1', display_name: 'Alex Rivera', available: true },
    { driver_id: 'd2', display_name: 'Jordan Chen', available: true },
    { driver_id: 'd3', display_name: 'Sam Williams', available: true, notes: 'Available after 6 PM' },
    { driver_id: 'd4', display_name: 'Casey Morgan', available: false, notes: 'Unavailable Jan 19' }
];

const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
    practice: { bg: 'bg-racing-blue/10', text: 'text-racing-blue', label: 'Practice' },
    qualifying: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Qualifying' },
    race: { bg: 'bg-racing-green/10', text: 'text-racing-green', label: 'Race' },
    endurance: { bg: 'bg-racing-yellow/10', text: 'text-racing-yellow', label: 'Endurance' }
};

const statusStyles: Record<string, string> = {
    scheduled: 'text-zinc-400',
    confirmed: 'text-racing-green',
    in_progress: 'text-racing-yellow',
    completed: 'text-zinc-600'
};

export default function TeamPlanning() {
    const { teamId } = useParams<{ teamId: string }>();
    useAuthStore(); // Available for API calls

    const [events, setEvents] = useState<PlanEvent[]>([]);
    const [drivers, setDrivers] = useState<DriverAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [teamId]);

    const fetchData = async () => {
        setLoading(true);

        // Demo mode
        if (teamId === 'demo') {
            await new Promise(r => setTimeout(r, 400));
            setEvents(mockEvents);
            setDrivers(mockDrivers);
            setLoading(false);
            return;
        }

        // Real API would go here
        setLoading(false);
    };

    const toggleEvent = (eventId: string) => {
        setExpandedEvent(expandedEvent === eventId ? null : eventId);
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading planning...</div>
            </div>
        );
    }

    const upcomingEvents = events.filter(e => e.status !== 'completed');

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-racing text-2xl text-white tracking-wide">Planning</h1>
                    <p className="text-sm text-zinc-500">Event scheduling & driver assignments</p>
                </div>
                <button className="btn btn-primary">
                    <Plus size={16} className="mr-2" />
                    Add Event
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Event List */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-racing-blue" />
                                <span className="font-medium text-sm uppercase tracking-wider">Upcoming Sessions</span>
                            </div>
                            <span className="text-xs text-zinc-500">{upcomingEvents.length} scheduled</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {upcomingEvents.map(event => {
                                const type = typeStyles[event.type] || typeStyles.practice;
                                const isExpanded = expandedEvent === event.id;
                                const assignedDrivers = event.drivers.map(dId =>
                                    drivers.find(d => d.driver_id === dId)
                                ).filter(Boolean);

                                return (
                                    <div key={event.id} className="border-b border-white/5 last:border-0">
                                        {/* Event Header - Clickable */}
                                        <div
                                            className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => toggleEvent(event.id)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-medium text-white">{event.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${type.bg} ${type.text}`}>
                                                            {type.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                        <span className="flex items-center gap-1">
                                                            <Flag size={12} />
                                                            {event.track}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {event.date} @ {event.time} ({event.duration})
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex -space-x-2">
                                                        {event.drivers.slice(0, 3).map((dId, i) => {
                                                            const driver = drivers.find(d => d.driver_id === dId);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold"
                                                                    title={driver?.display_name}
                                                                >
                                                                    {driver?.display_name.charAt(0)}
                                                                </div>
                                                            );
                                                        })}
                                                        {event.drivers.length > 3 && (
                                                            <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px]">
                                                                +{event.drivers.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs ${statusStyles[event.status]}`}>
                                                        {event.status.replace('_', ' ')}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUp size={16} className="text-racing-blue" />
                                                    ) : (
                                                        <ChevronDown size={16} className="text-zinc-600" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Detail Panel */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 bg-slate-900/50 border-t border-white/5">
                                                <div className="pt-4 space-y-4">
                                                    {/* Notes */}
                                                    {event.notes && (
                                                        <div>
                                                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Notes</div>
                                                            <p className="text-sm text-zinc-300 bg-slate-800/50 p-3 rounded-lg">
                                                                {event.notes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Assigned Drivers */}
                                                    <div>
                                                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Assigned Drivers</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedDrivers.map(driver => (
                                                                <div
                                                                    key={driver!.driver_id}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg"
                                                                >
                                                                    <div className={`w-2 h-2 rounded-full ${driver!.available ? 'bg-racing-green' : 'bg-racing-red'}`} />
                                                                    <span className="text-sm text-white">{driver!.display_name}</span>
                                                                </div>
                                                            ))}
                                                            <button className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-racing-blue hover:text-racing-blue transition-colors">
                                                                <UserPlus size={12} />
                                                                Add Driver
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                        <button className="btn btn-secondary text-xs py-1.5 px-3">
                                                            <Edit size={12} className="mr-1" />
                                                            Edit Event
                                                        </button>
                                                        <button className="btn btn-secondary text-xs py-1.5 px-3 text-racing-red hover:bg-racing-red/10">
                                                            <Trash2 size={12} className="mr-1" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {upcomingEvents.length === 0 && (
                                <div className="p-8 text-center text-zinc-500">
                                    No upcoming events scheduled
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Driver Availability */}
                <div className="card">
                    <div className="card-header">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-racing-yellow" />
                            <span className="font-medium text-sm uppercase tracking-wider">Availability</span>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {drivers.map(driver => (
                            <div key={driver.driver_id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${driver.available ? 'bg-racing-green' : 'bg-racing-red'}`} />
                                    <span className="text-sm text-white">{driver.display_name}</span>
                                </div>
                                {driver.notes && (
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        {driver.notes}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
