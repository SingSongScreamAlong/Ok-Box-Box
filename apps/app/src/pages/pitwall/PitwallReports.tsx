import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Sparkles, ChevronRight, Loader2, RefreshCw, AlertCircle, Calendar, Users } from 'lucide-react';
import {
  fetchTeamEventsV1,
  fetchTeamDebrief,
  generateTeamDebriefV1,
  type TeamEventV1,
  type TeamDebriefV1,
} from '../../lib/teamService';

export function PitwallReports() {
  const { teamId } = useParams<{ teamId: string }>();
  const [events, setEvents] = useState<TeamEventV1[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<TeamDebriefV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDebrief, setLoadingDebrief] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load event list on mount
  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetchTeamEventsV1(teamId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  // Load debrief when an event is selected
  const handleSelectEvent = async (eventId: string) => {
    if (selectedEventId === eventId) return;
    setSelectedEventId(eventId);
    setDebrief(null);
    setGenerateError(null);
    setLoadingDebrief(true);
    const data = await fetchTeamDebrief(teamId!, eventId);
    setDebrief(data);
    setLoadingDebrief(false);
  };

  // Generate / regenerate debrief via AI
  const handleGenerate = async () => {
    if (!selectedEventId || !teamId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const data = await generateTeamDebriefV1(teamId, selectedEventId);
      setDebrief(data);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const formatEventLabel = (event: TeamEventV1) =>
    event.event_name || `Session ${event.session_id.slice(0, 8)}`;

  const formatEventDate = (event: TeamEventV1) =>
    new Date(event.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (loading) {
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
          {/* Events list */}
          <div className="lg:col-span-1">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                <span
                  className="font-medium text-sm uppercase tracking-wider text-white"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Events
                </span>
                <span className="ml-auto text-[10px] text-white/30">{events.length} total</span>
              </div>

              {events.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="mx-auto text-white/20 mb-2" size={28} />
                  <p className="text-sm text-white/30">No events yet</p>
                  <p className="text-xs text-white/20 mt-1">
                    Create an event from the Events page to get started
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {events.map(event => {
                    const isSelected = selectedEventId === event.id;
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleSelectEvent(event.id)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white truncate">
                            {formatEventLabel(event)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/40">
                              {formatEventDate(event)}
                            </span>
                            {event.event_type && (
                              <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-white/5 text-white/40 border border-white/10 rounded">
                                {event.event_type}
                              </span>
                            )}
                          </div>
                          {event.participating_driver_ids.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-white/30">
                              <Users size={10} />
                              {event.participating_driver_ids.length} drivers
                            </div>
                          )}
                        </div>
                        <ChevronRight
                          size={14}
                          className={isSelected ? 'text-white/50' : 'text-white/20'}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Debrief panel */}
          <div className="lg:col-span-2">
            {!selectedEventId ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded p-12 text-center">
                <FileText className="mx-auto text-white/20 mb-2" size={32} />
                <p className="text-white/40">Select an event to view its debrief</p>
              </div>
            ) : loadingDebrief ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded p-12 text-center text-white/50">
                <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                Loading debrief...
              </div>
            ) : debrief ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded">
                {/* Debrief header */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">
                      {debrief.event_name || (() => { const ev = events.find(e => e.id === selectedEventId); return ev ? formatEventLabel(ev) : 'Unknown Event'; })()}
                    </div>
                    <div className="text-xs text-white/40">Session Analysis</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {debrief.team_summary && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white/60 border border-white/20">
                        <Sparkles size={10} /> AI Synthesized
                      </span>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      title={debrief.team_summary ? 'Regenerate AI synthesis' : 'Generate AI synthesis'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wide font-semibold border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-colors disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      {generating ? 'Generating…' : debrief.team_summary ? 'Regenerate' : 'Generate AI'}
                    </button>
                  </div>
                </div>

                {generateError && (
                  <div className="mx-5 mt-4 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded">
                    <AlertCircle size={14} />
                    {generateError}
                  </div>
                )}

                <div className="p-5 space-y-6">
                  {/* Team synthesis */}
                  {debrief.team_summary ? (
                    <div className="p-4 bg-black/20 border border-white/10 rounded">
                      <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
                        Team Summary
                      </h3>
                      <p className="text-sm text-white/70 mb-4">
                        {debrief.team_summary.overall_observation}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-[10px] text-white/40 uppercase mb-2">Common Patterns</h4>
                          <ul className="space-y-1">
                            {(debrief.team_summary.common_patterns ?? []).map((p, i) => (
                              <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                                <span className="text-[#f97316] mt-0.5">•</span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-[10px] text-white/40 uppercase mb-2">Priority Focus</h4>
                          <p className="text-xs text-green-400 font-medium">
                            {debrief.team_summary.priority_focus}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded text-center">
                      <Sparkles size={20} className="mx-auto text-purple-400/50 mb-2" />
                      <p className="text-sm text-white/40">No AI synthesis yet</p>
                      <p className="text-xs text-white/30 mt-1">
                        Click &ldquo;Generate AI&rdquo; to synthesize a team summary from individual driver debriefs
                      </p>
                    </div>
                  )}

                  {/* Driver summaries */}
                  {debrief.driver_summaries.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                        Driver Analysis
                      </h3>
                      <div className="space-y-3">
                        {debrief.driver_summaries.map(d => (
                          <div
                            key={d.driver_profile_id}
                            className="p-4 bg-black/20 border border-white/10 rounded"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#f97316] flex items-center justify-center text-[10px] font-bold text-black">
                                  {d.display_name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="font-medium text-sm text-white">
                                  {d.display_name}
                                </span>
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
                  ) : (
                    <div className="text-center py-6 text-white/30">
                      <p className="text-sm">No individual driver debriefs found for this event</p>
                      <p className="text-xs mt-1">
                        Drivers need to complete session debriefs before team synthesis is possible
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No debrief exists yet */
              <div className="bg-white/[0.03] border border-white/[0.06] rounded p-12 text-center">
                <FileText className="mx-auto text-white/20 mb-3" size={32} />
                <p className="text-white/50 mb-1">No debrief for this event yet</p>
                <p className="text-white/30 text-sm mb-5">
                  Generate an AI team summary from individual driver session debriefs
                </p>
                {generateError && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-red-400 text-xs">
                    <AlertCircle size={14} />
                    {generateError}
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500/20 border border-purple-500/50 text-purple-400 text-sm font-semibold uppercase tracking-wide hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {generating ? 'Generating…' : 'Generate Team Debrief'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
