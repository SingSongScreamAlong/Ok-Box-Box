import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
    Wrench,
    Upload,
    Download,
    Search,
    Clock,
    User,
    Filter
} from 'lucide-react';

// Types
interface Setup {
    id: string;
    name: string;
    car: string;
    track: string;
    uploaded_by: string;
    uploaded_by_name: string;
    created_at: string;
    version: number;
    notes?: string;
    downloads: number;
    conditions: 'dry' | 'wet' | 'night';
}

// Mock data
const mockSetups: Setup[] = [
    {
        id: 's1',
        name: 'Daytona Race Setup v3',
        car: 'Porsche 911 GT3 R',
        track: 'Daytona International Speedway',
        uploaded_by: 'd1',
        uploaded_by_name: 'Alex Rivera',
        created_at: '2026-01-14T15:30:00Z',
        version: 3,
        notes: 'Optimized for long runs, stable in traffic',
        downloads: 12,
        conditions: 'dry'
    },
    {
        id: 's2',
        name: 'Daytona Quali Setup',
        car: 'Porsche 911 GT3 R',
        track: 'Daytona International Speedway',
        uploaded_by: 'd2',
        uploaded_by_name: 'Jordan Chen',
        created_at: '2026-01-13T18:00:00Z',
        version: 2,
        notes: 'Low fuel, aggressive camber',
        downloads: 8,
        conditions: 'dry'
    },
    {
        id: 's3',
        name: 'Spa Wet Setup',
        car: 'Porsche 911 GT3 R',
        track: 'Spa-Francorchamps',
        uploaded_by: 'd1',
        uploaded_by_name: 'Alex Rivera',
        created_at: '2026-01-10T12:00:00Z',
        version: 1,
        notes: 'Rain tires, TC boost',
        downloads: 5,
        conditions: 'wet'
    },
    {
        id: 's4',
        name: 'Nordschleife Base',
        car: 'Porsche 911 GT3 R',
        track: 'Nürburgring Nordschleife',
        uploaded_by: 'd3',
        uploaded_by_name: 'Sam Williams',
        created_at: '2026-01-08T09:00:00Z',
        version: 4,
        notes: 'Balanced for the full track',
        downloads: 15,
        conditions: 'dry'
    }
];

const conditionStyles: Record<string, { bg: string; text: string }> = {
    dry: { bg: 'bg-racing-yellow/10', text: 'text-racing-yellow' },
    wet: { bg: 'bg-racing-blue/10', text: 'text-racing-blue' },
    night: { bg: 'bg-purple-500/10', text: 'text-purple-400' }
};

export default function TeamSetups() {
    const { teamId } = useParams<{ teamId: string }>();
    useAuthStore(); // Available for API calls

    const [setups, setSetups] = useState<Setup[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [trackFilter, setTrackFilter] = useState('all');

    useEffect(() => {
        fetchData();
    }, [teamId]);

    const fetchData = async () => {
        setLoading(true);

        if (teamId === 'demo') {
            await new Promise(r => setTimeout(r, 400));
            setSetups(mockSetups);
            setLoading(false);
            return;
        }

        setLoading(false);
    };

    const tracks = [...new Set(setups.map(s => s.track))];

    const filteredSetups = setups.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(filter.toLowerCase()) ||
            s.track.toLowerCase().includes(filter.toLowerCase());
        const matchesTrack = trackFilter === 'all' || s.track === trackFilter;
        return matchesSearch && matchesTrack;
    });

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-500">Loading setups...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-racing text-2xl text-white tracking-wide">Setups</h1>
                    <p className="text-sm text-zinc-500">Team setup library • {setups.length} setups available</p>
                </div>
                <button className="btn btn-primary">
                    <Upload size={16} className="mr-2" />
                    Upload Setup
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input
                        type="text"
                        placeholder="Search setups..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input pl-9 py-2 text-sm"
                    />
                </div>
                <select
                    value={trackFilter}
                    onChange={(e) => setTrackFilter(e.target.value)}
                    className="input py-2 text-sm min-w-[200px]"
                >
                    <option value="all">All Tracks</option>
                    {tracks.map(track => (
                        <option key={track} value={track}>{track}</option>
                    ))}
                </select>
            </div>

            {/* Setup Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSetups.map(setup => {
                    const condition = conditionStyles[setup.conditions] || conditionStyles.dry;
                    return (
                        <div key={setup.id} className="card hover:border-racing-blue/30 transition-colors cursor-pointer group">
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Wrench size={14} className="text-racing-blue" />
                                            <span className="font-medium text-white">{setup.name}</span>
                                        </div>
                                        <div className="text-xs text-zinc-500">{setup.car}</div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded ${condition.bg} ${condition.text}`}>
                                        {setup.conditions}
                                    </span>
                                </div>

                                <div className="text-sm text-zinc-400 mb-3">{setup.track}</div>

                                {setup.notes && (
                                    <p className="text-xs text-zinc-500 mb-3 italic">"{setup.notes}"</p>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <User size={12} />
                                            {setup.uploaded_by_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            v{setup.version}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Download size={12} />
                                            {setup.downloads}
                                        </span>
                                    </div>
                                    <button className="btn btn-secondary text-xs py-1 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Download size={12} className="mr-1" />
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredSetups.length === 0 && (
                <div className="card py-12 text-center">
                    <Filter className="mx-auto mb-2 text-zinc-600" size={24} />
                    <p className="text-zinc-500">No setups found</p>
                </div>
            )}
        </div>
    );
}
