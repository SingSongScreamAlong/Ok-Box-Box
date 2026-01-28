import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Plus, Users, Clock, Loader2 } from 'lucide-react';
import { useTeamData } from '../../hooks/useTeamData';

interface TeamEvent {
  id: string;
  name: string;
  track: string;
  date: string;
  time: string;
  duration: string;
  type: 'practice' | 'qualifying' | 'race' | 'endurance';
  status: 'upcoming' | 'live' | 'completed';
  drivers: number;
}

const mockEvents: TeamEvent[] = [
  {
    id: 'te1',
    name: 'Daytona 24 Hours',
    track: 'Daytona International Speedway',
    date: '2026-01-25',
    time: '13:30',
    duration: '24h',
    type: 'endurance',
    status: 'upcoming',
    drivers: 4
  },
  {
    id: 'te2',
    name: 'Spa 6 Hours',
    track: 'Circuit de Spa-Francorchamps',
    date: '2026-02-15',
    time: '14:00',
    duration: '6h',
    type: 'endurance',
    status: 'upcoming',
    drivers: 3
  },
  {
    id: 'te3',
    name: 'Sebring 12 Hours',
    track: 'Sebring International Raceway',
    date: '2026-03-20',
    time: '10:00',
    duration: '12h',
    type: 'endurance',
    status: 'upcoming',
    drivers: 4
  }
];

const statusStyles: Record<string, string> = {
  upcoming: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
  live: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-white/10 text-white/40 border-white/20'
};

export function PitwallEvents() {
  const { teamId } = useParams<{ teamId: string }>();
  const { events: serviceEvents, tracks, loading: dataLoading } = useTeamData();
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Map service data to local format
  useEffect(() => {
    if (!dataLoading && serviceEvents.length > 0) {
      setEvents(serviceEvents.map(e => {
        const track = tracks.find(t => t.id === e.trackId);
        return {
          id: e.id,
          name: e.name,
          track: track?.name || e.trackId,
          date: e.date,
          time: e.time,
          duration: e.duration,
          type: e.type,
          status: e.status === 'scheduled' || e.status === 'confirmed' ? 'upcoming' : e.status === 'in_progress' ? 'live' : 'completed',
          drivers: e.assignedDrivers.length,
        };
      }));
    }
  }, [dataLoading, serviceEvents, tracks]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  if (dataLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          <span className="text-white/50 text-sm">Loading events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        >
          <source src="/videos/bg-3.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/95 via-[#0e0e0e]/80 to-[#0e0e0e]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/95" />
      </div>

      <div className="relative z-10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-xl font-bold tracking-wide text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Events
          </h1>
          <p className="text-sm mt-1 text-white/50">Team race calendar</p>
        </div>
        <button className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-white/[0.06] transition-colors">
          <Plus size={14} />
          Add Event
        </button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <div 
            key={event.id}
            className="bg-white/[0.03] border border-white/[0.06] rounded p-5 hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold border ${statusStyles[event.status]}`}>
                    {event.status}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white/50 border border-white/20">
                    {event.type}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                <p className="text-sm text-white/40 mt-1">{event.track}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-white">
                  <Calendar size={14} className="text-white/40" />
                  {new Date(event.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
                  <Clock size={12} />
                  {event.time} • {event.duration}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Users size={14} />
                {event.drivers} drivers assigned
              </div>
              <Link 
                to={`/team/${teamId}/pitwall/strategy`}
                className="text-xs text-[#f97316] hover:text-[#f97316]/80 transition-colors"
              >
                View Strategy →
              </Link>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
