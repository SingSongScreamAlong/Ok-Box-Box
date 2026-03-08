import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Plus, Users, Clock, Loader2, X, AlertCircle } from 'lucide-react';
import { fetchTeamEventsV1, createTeamEventV1, type TeamEventV1 } from '../../lib/teamService';
import { VIDEO_PLAYBACK_RATE } from '../../lib/config';

const EVENT_TYPES: { value: TeamEventV1['event_type']; label: string }[] = [
  { value: 'practice', label: 'Practice' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'race', label: 'Race' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'other', label: 'Other' },
];

const statusStyles: Record<string, string> = {
  upcoming: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
  live: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-white/10 text-white/40 border-white/20',
};

function deriveStatus(event: TeamEventV1): 'upcoming' | 'completed' {
  if (event.scheduled_at) {
    return new Date(event.scheduled_at) > new Date() ? 'upcoming' : 'completed';
  }
  // No scheduled date: session-linked events have already run
  return event.session_id ? 'completed' : 'upcoming';
}

export function PitwallEvents() {
  const { teamId } = useParams<{ teamId: string }>();
  const [events, setEvents] = useState<TeamEventV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetchTeamEventsV1(teamId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = VIDEO_PLAYBACK_RATE;
    }
  }, []);

  const handleEventCreated = (event: TeamEventV1) => {
    setEvents(prev => [event, ...prev]);
    setShowModal(false);
  };

  if (loading) {
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-white/[0.06] transition-colors"
          >
            <Plus size={14} />
            Add Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Calendar className="mx-auto mb-3" size={36} />
            <p className="text-base">No events yet</p>
            <p className="text-sm mt-1">Add your first event to start building the team calendar</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(event => {
              const status = deriveStatus(event);
              const label = event.event_name || `Session ${event.session_id.slice(0, 8)}`;
              return (
                <div
                  key={event.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded p-5 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-semibold border ${statusStyles[status]}`}
                        >
                          {status}
                        </span>
                        {event.event_type && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white/50 border border-white/20">
                            {event.event_type}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white">{label}</h3>
                      <p className="text-xs text-white/40 mt-1 font-mono">
                        Session: {event.session_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Calendar size={13} className="text-white/40" />
                        {new Date(event.created_at).toLocaleDateString()}
                      </div>
                      {event.participating_driver_ids.length > 0 && (
                        <div className="flex items-center gap-1.5 justify-end mt-1 text-white/40 text-xs">
                          <Users size={12} />
                          {event.participating_driver_ids.length} drivers
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <Link
                      to={`/team/${teamId}/pitwall/reports`}
                      className="text-xs text-[#f97316] hover:text-[#f97316]/80 transition-colors"
                    >
                      View Debrief →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <AddEventModal
          teamId={teamId!}
          onCreated={handleEventCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

interface AddEventModalProps {
  teamId: string;
  onCreated: (event: TeamEventV1) => void;
  onClose: () => void;
}

function AddEventModal({ teamId, onCreated, onClose }: AddEventModalProps) {
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<TeamEventV1['event_type']>('race');
  const [sessionId, setSessionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setError('Session ID is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createTeamEventV1(teamId, {
        session_id: sessionId.trim(),
        event_name: eventName.trim() || undefined,
        event_type: eventType || undefined,
      });

      if (created) {
        onCreated(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-[#0d0d0d] border border-white/10 w-full max-w-md mx-4"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-[#f97316]" />
            <h2
              className="text-sm font-bold uppercase tracking-wider text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Add Event
            </h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">
              Event Name
            </label>
            <input
              type="text"
              placeholder="e.g. Spa Endurance Round 3"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-sm text-white focus:border-[#f97316] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">
              Event Type
            </label>
            <select
              value={eventType || ''}
              onChange={e => setEventType(e.target.value as TeamEventV1['event_type'])}
              className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-sm text-white focus:border-[#f97316] focus:outline-none"
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value || ''}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">
              Session ID <span className="text-[#f97316]">*</span>
            </label>
            <input
              type="text"
              placeholder="iRacing subsession ID or internal ID"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              required
              className="w-full bg-[#0a0a0a] border border-white/10 px-4 py-2.5 text-sm text-white font-mono focus:border-[#f97316] focus:outline-none"
            />
            <p className="text-[10px] text-white/30 mt-1">
              The session this event is linked to. Used for debrief generation.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#f97316]/20 border border-[#f97316]/50 text-[#f97316] text-xs font-semibold uppercase tracking-wider hover:bg-[#f97316]/30 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
