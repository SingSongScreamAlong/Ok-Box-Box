import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Users, Clock, Plus, ChevronDown, ChevronUp, Flag, AlertCircle, Edit, Trash2, UserPlus } from 'lucide-react';

// Types from legacy
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

// Mock data from legacy
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
  practice: { bg: 'bg-[#3b82f6]/20', text: 'text-[#3b82f6]', label: 'Practice' },
  qualifying: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Qualifying' },
  race: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Race' },
  endurance: { bg: 'bg-[#f97316]/20', text: 'text-[#f97316]', label: 'Endurance' }
};

const statusStyles: Record<string, string> = {
  scheduled: 'text-white/40',
  confirmed: 'text-green-400',
  in_progress: 'text-[#f97316]',
  completed: 'text-white/30'
};

export function PitwallPlanning() {
  const { teamId } = useParams<{ teamId: string }>();
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [drivers, setDrivers] = useState<DriverAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (teamId === 'demo') {
        await new Promise(r => setTimeout(r, 400));
      }
      setEvents(mockEvents);
      setDrivers(mockDrivers);
      setLoading(false);
    };
    fetchData();
  }, [teamId]);

  const toggleEvent = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-white/50">Loading planning...</div>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.status !== 'completed');

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-xl font-bold tracking-wide uppercase text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Planning
          </h1>
          <p className="text-sm mt-1 text-white/50">Event scheduling & driver assignments</p>
        </div>
        <button className="flex items-center gap-2 border border-white/20 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors">
          <Plus size={14} />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List */}
        <div className="lg:col-span-2">
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-white/40" />
                <span 
                  className="font-medium text-sm uppercase tracking-wider text-white"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Upcoming Sessions
                </span>
              </div>
              <span className="text-xs text-white/40">{upcomingEvents.length} scheduled</span>
            </div>
            <div className="divide-y divide-white/5">
              {upcomingEvents.map(event => {
                const type = typeStyles[event.type] || typeStyles.practice;
                const isExpanded = expandedEvent === event.id;
                const assignedDrivers = event.drivers.map(dId =>
                  drivers.find(d => d.driver_id === dId)
                ).filter(Boolean);

                return (
                  <div key={event.id}>
                    {/* Event Header - Clickable */}
                    <div
                      className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleEvent(event.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-white">{event.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider ${type.bg} ${type.text}`}>
                              {type.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-white/40">
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
                                  className="w-6 h-6 bg-white/10 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold text-white/70"
                                  title={driver?.display_name}
                                >
                                  {driver?.display_name.charAt(0)}
                                </div>
                              );
                            })}
                            {event.drivers.length > 3 && (
                              <div className="w-6 h-6 bg-white/5 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-white/50">
                                +{event.drivers.length - 3}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs uppercase ${statusStyles[event.status]}`}>
                            {event.status.replace('_', ' ')}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-white/50" />
                          ) : (
                            <ChevronDown size={16} className="text-white/30" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-[#0a0a0a] border-t border-white/10">
                        <div className="pt-4 space-y-4">
                          {/* Notes */}
                          {event.notes && (
                            <div>
                              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Notes</div>
                              <p className="text-sm text-white/70 bg-white/5 p-3 border border-white/10">
                                {event.notes}
                              </p>
                            </div>
                          )}

                          {/* Assigned Drivers */}
                          <div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Assigned Drivers</div>
                            <div className="flex flex-wrap gap-2">
                              {assignedDrivers.map(driver => (
                                <div
                                  key={driver!.driver_id}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10"
                                >
                                  <div className={`w-2 h-2 rounded-full ${driver!.available ? 'bg-green-400' : 'bg-red-400'}`} />
                                  <span className="text-sm text-white">{driver!.display_name}</span>
                                </div>
                              ))}
                              <button className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-white/20 text-xs text-white/40 hover:border-[#f97316] hover:text-[#f97316] transition-colors">
                                <UserPlus size={12} />
                                Add Driver
                              </button>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <button className="flex items-center gap-1 px-3 py-1.5 border border-white/20 text-xs text-white/50 hover:bg-white/5 transition-colors">
                              <Edit size={12} />
                              Edit Event
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1.5 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={12} />
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
                <div className="p-8 text-center text-white/30">
                  No upcoming events scheduled
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Driver Availability */}
        <div className="border border-white/10">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Users size={16} className="text-[#f97316]" />
            <span 
              className="font-medium text-sm uppercase tracking-wider text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Availability
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {drivers.map(driver => (
              <div key={driver.driver_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${driver.available ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-white">{driver.display_name}</span>
                </div>
                {driver.notes && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
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
