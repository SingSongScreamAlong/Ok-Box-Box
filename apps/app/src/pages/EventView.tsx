import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getEvent, getEventEntries, registerForEvent, withdrawFromEvent, getUserEventEntry, Event, EventEntry } from '../lib/events';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { ArrowLeft, Users, Calendar, MapPin, UserPlus, UserMinus } from 'lucide-react';

export function EventView() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [userEntry, setUserEntry] = useState<EventEntry | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (eventId && user) {
      loadEventData();
    }
  }, [eventId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadEventData = async () => {
    if (!eventId || !user) return;

    const eventData = await getEvent(eventId);
    if (!eventData) {
      navigate('/leagues');
      return;
    }

    setEvent(eventData);

    const [eventEntries, entry] = await Promise.all([
      getEventEntries(eventId),
      getUserEventEntry(eventId, user.id)
    ]);

    setEntries(eventEntries);
    setUserEntry(entry);

    if (eventData.league_id) {
      const [leagueData, role] = await Promise.all([
        getLeague(eventData.league_id),
        getUserLeagueRole(eventData.league_id, user.id)
      ]);
      setLeague(leagueData);
      setIsAdmin(role === 'owner' || role === 'admin');
    }

    setLoading(false);
  };

  const handleRegister = async () => {
    if (!eventId || !user) return;
    setRegistering(true);

    const { data, error } = await registerForEvent(eventId, user.id);
    
    if (!error && data) {
      setUserEntry(data);
      setEntries(prev => [...prev, data]);
    }
    setRegistering(false);
  };

  const handleWithdraw = async () => {
    if (!eventId || !user) return;
    
    const confirmed = window.confirm('Are you sure you want to withdraw from this event?');
    if (!confirmed) return;

    setRegistering(true);
    const { error } = await withdrawFromEvent(eventId, user.id);
    
    if (!error) {
      setUserEntry(null);
      setEntries(prev => prev.filter(e => e.user_id !== user.id));
    }
    setRegistering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-90"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        {league && (
          <Link to={`/league/${league.id}`} className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={14} />
            Back to {league.name}
          </Link>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 
                className="text-xl uppercase tracking-[0.15em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {event.name}
              </h1>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold ${
                event.status === 'live' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                event.status === 'completed' ? 'bg-white/10 text-white/40 border border-white/20' :
                event.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30'
              }`}>
                {event.status}
              </span>
            </div>
            {league && (
              <p className="text-sm text-white/50">{league.name}</p>
            )}
          </div>

          {event.status === 'scheduled' && (
            userEntry ? (
              <button 
                onClick={handleWithdraw}
                disabled={registering}
                className="btn btn-outline text-xs flex items-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
              >
                <UserMinus size={14} />
                {registering ? 'Processing...' : 'Withdraw'}
              </button>
            ) : (
              <button 
                onClick={handleRegister}
                disabled={registering}
                className="btn btn-primary text-xs flex items-center gap-2"
              >
                <UserPlus size={14} />
                {registering ? 'Registering...' : 'Register'}
              </button>
            )
          )}
        </div>

        <div className="grid gap-6">
          {/* Event Details */}
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
            <h2 
              className="text-xs uppercase tracking-[0.12em] font-semibold text-[#3b82f6] mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Event Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {event.track_name && (
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/40">Track</p>
                    <p className="text-sm text-white">{event.track_name}</p>
                  </div>
                </div>
              )}
              {event.scheduled_at && (
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/40">Date & Time</p>
                    <p className="text-sm text-white">
                      {new Date(event.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {event.description && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-white/70">{event.description}</p>
              </div>
            )}
          </div>

          {/* Entries */}
          <div className="bg-[--surface]/80 backdrop-blur-sm border border-[--border] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-xs uppercase tracking-[0.12em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Entries
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Users size={14} />
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-white/30">No entries yet</p>
                <p className="text-xs text-white/20 mt-1">Be the first to register!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/30 w-6">{index + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50">
                        {entry.car_number || (entry.user_id?.slice(0, 2).toUpperCase() || '??')}
                      </div>
                      <div>
                        <p className="text-sm text-white">
                          {entry.driver_name || entry.user_id?.slice(0, 8) || 'Unknown'}...
                        </p>
                        <p className="text-[10px] text-white/40">
                          {entry.user_id === user?.id ? 'You' : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold ${
                      entry.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      entry.status === 'withdrawn' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-white/10 text-white/40 border border-white/20'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
