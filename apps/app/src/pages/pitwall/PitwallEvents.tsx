import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Plus, Users, Clock } from 'lucide-react';

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
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    setTimeout(() => {
      setEvents(mockEvents);
      setLoading(false);
    }, 300);
  }, [teamId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-white/50">Loading events...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen relative overflow-hidden ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
      {/* Ambient background layer - ultra-slow gradient drift (3 min loop) */}
      <div 
        className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.03]' : 'opacity-[0.02]'}`}
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(255,255,255,0.05) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(255,255,255,0.03) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,0,0,0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(0,0,0,0.1) 0%, transparent 60%)',
          animation: 'ambientDrift 180s ease-in-out infinite alternate',
        }}
      />
      <style>{`
        @keyframes ambientDrift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(1.5%, 0.5%) scale(1.01); }
          100% { transform: translate(-0.5%, 1%) scale(1.005); }
        }
      `}</style>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className={`text-xl font-bold tracking-wide ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`}
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Events
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Team race calendar</p>
        </div>
        <button className="flex items-center gap-2 bg-[#0a0a0a] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#111] transition-colors">
          <Plus size={14} />
          Add Event
        </button>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <div 
            key={event.id}
            className="bg-[#0a0a0a] p-5 hover:bg-[#111] transition-colors"
            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}
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
  );
}
