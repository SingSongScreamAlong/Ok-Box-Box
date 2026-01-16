import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Calendar, Users, LinkIcon, Sparkles, ArrowLeft } from 'lucide-react';
import { DriverCard } from '../../components/team/DriverCard';

interface EventDetail {
    id: string;
    event_name: string | null;
    event_type: string;
    session_id: string;
    participating_driver_ids: string[];
    created_at: string;
}

interface TeamMember {
    membership_id: string;
    driver_profile_id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    access_scope: string | null;
    summary?: any;
}

export default function TeamEventDetail() {
    const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>();
    const { accessToken } = useAuthStore();
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [roster, setRoster] = useState<TeamMember[]>([]);
    const [debrief, setDebrief] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (teamId && eventId) fetchData();
    }, [teamId, eventId]);

    const fetchData = async () => {
        try {
            const [eventRes, rosterRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/events`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/roster`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
            ]);
            const eventsData = await eventRes.json();
            const rosterData = await rosterRes.json();
            const foundEvent = eventsData.events?.find((e: any) => e.id === eventId);
            setEvent(foundEvent || null);
            setRoster(rosterData.members || []);
            if (foundEvent) {
                const debriefRes = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/events/${eventId}/debrief`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                if (debriefRes.ok) setDebrief(await debriefRes.json());
            }
        } catch (err) { console.error('Failed to fetch event:', err); } finally { setLoading(false); }
    };

    const generateDebrief = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams/${teamId}/events/${eventId}/debrief/generate`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (res.ok) setDebrief(await res.json());
        } catch (err) { console.error('Failed to generate debrief:', err); } finally { setGenerating(false); }
    };

    const participants = roster.filter(m => event?.participating_driver_ids.includes(m.driver_profile_id));

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>;
    if (!event) return <div className="p-8 text-center text-slate-400">Event not found</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <Link to={`/teams/${teamId}/events`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={18} /><span>Back to Events</span>
            </Link>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{event.event_name || 'Event'}</h1>
                    <div className="flex items-center gap-4 mt-2 text-slate-400">
                        <span className="flex items-center gap-1"><Calendar size={16} />{new Date(event.created_at).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 bg-slate-800 rounded text-sm">{event.event_type}</span>
                    </div>
                </div>
                <button onClick={generateDebrief} disabled={generating} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-all">
                    {generating ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Generating...</span></> : <><Sparkles size={18} /><span>Generate Debrief</span></>}
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Users size={20} className="text-cyan-400" />Participants ({participants.length})</h2>
                    </div>
                    {participants.length === 0 ? <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl"><p className="text-slate-500">No participants linked</p></div> : <div className="space-y-4">{participants.map(m => <DriverCard key={m.driver_profile_id} member={m as any} />)}</div>}
                </div>
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-slate-400 uppercase mb-3">Linked Session</h3>
                        <div className="flex items-center gap-2 text-sm font-mono text-cyan-400 truncate"><LinkIcon size={14} />{event.session_id}</div>
                    </div>
                    {debrief?.team_summary && (
                        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3"><Sparkles className="text-purple-400" size={16} /><h3 className="text-sm font-medium text-purple-400 uppercase">AI Synthesis</h3></div>
                            <p className="text-white text-sm mb-3">{debrief.team_summary.overall_observation}</p>
                            <div className="text-xs text-slate-500">Priority: {debrief.team_summary.priority_focus}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
