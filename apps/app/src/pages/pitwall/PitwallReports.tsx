import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeamData } from '../../hooks/useTeamData';
import { PitwallBackground } from '../../components/PitwallBackground';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

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

export function PitwallReports() {
  const { teamId } = useParams<{ teamId: string }>();
  const { session } = useAuth();
  const { events: teamEvents, loading: eventsLoading } = useTeamData();
  const [selectedDebrief, setSelectedDebrief] = useState<TeamDebrief | null>(null);
  const [loadingDebrief, setLoadingDebrief] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);

  const fetchDebrief = async (eventId: string, eventName: string) => {
    if (!teamId || !session?.access_token) return;
    setLoadingDebrief(true);
    setDebriefError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/teams/${teamId}/events/${eventId}/debrief`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDebrief(data);
      } else if (res.status === 404) {
        setSelectedDebrief(null);
        setDebriefError(`No debrief generated yet for "${eventName}".`);
      } else {
        setSelectedDebrief(null);
        setDebriefError('Failed to load debrief.');
      }
    } catch {
      setSelectedDebrief(null);
      setDebriefError('Network error loading debrief.');
    } finally {
      setLoadingDebrief(false);
    }
  };

  if (eventsLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <span className="text-white/50 text-sm">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      <PitwallBackground />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 
          className="text-xl font-bold tracking-wide uppercase text-white"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Team Reports
        </h1>
        <p className="text-sm mt-1 text-white/50">Event debriefs and analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-1">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <span 
                className="font-medium text-sm uppercase tracking-wider text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Debriefs
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {teamEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto text-white/15 mb-2" size={28} />
                  <div className="text-white/30 text-sm">No events yet</div>
                  <div className="text-white/20 text-xs mt-1">Create events in Schedule to generate reports</div>
                </div>
              ) : (
                teamEvents.map(event => {
                  const isSelected = selectedDebrief?.event_id === event.id;
                  return (
                    <button
                      key={event.id}
                      onClick={() => fetchDebrief(event.id, event.name)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white">
                          {event.name}
                        </div>
                        <div className="text-xs text-white/40">{event.date}</div>
                      </div>
                      <ChevronRight size={14} className={isSelected ? 'text-white/50' : 'text-white/30'} />
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
            <div className="bg-white/[0.03] border border-white/[0.06] rounded p-12 text-center text-white/50">Loading debrief...</div>
          ) : selectedDebrief ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{selectedDebrief.event_name}</div>
                  <div className="text-xs text-white/40">Session Analysis</div>
                </div>
                {selectedDebrief.team_summary && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white/60 border border-white/20">
                    <Sparkles size={10} /> AI Synthesized
                  </span>
                )}
              </div>

              <div className="p-5 space-y-6">
                {/* Team Summary */}
                {selectedDebrief.team_summary && (
                  <div className="p-4 bg-black/20 border border-white/10 rounded">
                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Team Summary</h3>
                    <p className="text-sm text-white/70 mb-4">{selectedDebrief.team_summary.overall_observation}</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] text-white/40 uppercase mb-2">Common Patterns</h4>
                        <ul className="space-y-1">
                          {selectedDebrief.team_summary.common_patterns.map((p, i) => (
                            <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                              <span className="text-[#f97316] mt-0.5">•</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-[10px] text-white/40 uppercase mb-2">Priority Focus</h4>
                        <p className="text-xs text-green-400 font-medium">{selectedDebrief.team_summary.priority_focus}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Driver Summaries */}
                <div>
                  <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Driver Analysis</h3>
                  <div className="space-y-3">
                    {selectedDebrief.driver_summaries.map(d => (
                      <div key={d.driver_profile_id} className="p-4 bg-black/20 border border-white/10 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#f97316] flex items-center justify-center text-[10px] font-bold text-black">
                              {d.display_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="font-medium text-sm text-white">{d.display_name}</span>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30">
                            {d.primary_limiter}
                          </span>
                        </div>
                        <p className="text-xs text-white/60">{d.headline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : debriefError ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded p-12 text-center">
              <Sparkles className="mx-auto text-white/15 mb-2" size={32} />
              <p className="text-white/40 text-sm">{debriefError}</p>
              <p className="text-white/20 text-xs mt-2">Run a session with the relay connected to generate an AI debrief.</p>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded p-12 text-center">
              <FileText className="mx-auto text-white/20 mb-2" size={32} />
              <p className="text-white/40">Select an event to view its debrief</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
