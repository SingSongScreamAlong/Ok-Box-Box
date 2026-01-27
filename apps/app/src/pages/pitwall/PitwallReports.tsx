import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Sparkles, ChevronRight, Loader2 } from 'lucide-react';

// Types from legacy
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

// Mock data from legacy
const mockEvents = [
  { id: 'evt-1', event_name: 'Daytona 500 Practice', created_at: '2026-01-18T14:00:00Z' },
  { id: 'evt-2', event_name: 'Spa Endurance Race', created_at: '2026-01-12T09:00:00Z' },
  { id: 'evt-3', event_name: 'Nordschleife Time Attack', created_at: '2026-01-10T16:00:00Z' }
];

const mockDebriefs: Record<string, TeamDebrief> = {
  'evt-2': {
    event_id: 'evt-2',
    event_name: 'Spa Endurance Race',
    session_id: 'sess-002',
    driver_summaries: [
      {
        driver_profile_id: 'd1',
        display_name: 'Alex Rivera',
        headline: 'Excellent fuel management saved 2 pit stops. Consistent lap times in the 2:18s throughout.',
        primary_limiter: 'Tire Degradation'
      },
      {
        driver_profile_id: 'd2',
        display_name: 'Jordan Chen',
        headline: 'Strong qualifying pace translated to race. Aggressive but clean overtakes in Eau Rouge.',
        primary_limiter: 'Brake Consistency'
      },
      {
        driver_profile_id: 'd3',
        display_name: 'Sam Williams',
        headline: 'Solid double stint on hard compound. Minor lockups in sector 2 affected pace by 0.3s.',
        primary_limiter: 'Trail Braking'
      }
    ],
    team_summary: {
      overall_observation: 'The team showed exceptional endurance race strategy execution. Driver changeovers were smooth and communication between stints was clear and actionable.',
      common_patterns: [
        'All drivers lost time in the Bus Stop chicane under traffic',
        'Tire management improved significantly from practice',
        'Radio discipline was excellent during safety car periods'
      ],
      priority_focus: 'Focus on Bus Stop chicane entry and late apex technique for the next event.'
    },
    status: 'complete'
  },
  'evt-3': {
    event_id: 'evt-3',
    event_name: 'Nordschleife Time Attack',
    session_id: 'sess-003',
    driver_summaries: [
      {
        driver_profile_id: 'd2',
        display_name: 'Jordan Chen',
        headline: 'Set personal best by 1.2 seconds. Improved Carousel section technique significantly.',
        primary_limiter: 'Jump Landings'
      },
      {
        driver_profile_id: 'd4',
        display_name: 'Casey Morgan',
        headline: 'Good learning session with 15 clean laps. Track knowledge improving steadily.',
        primary_limiter: 'Overall Pace'
      }
    ],
    team_summary: {
      overall_observation: 'Productive time attack session with focus on sector improvements. Both drivers showed measurable progress.',
      common_patterns: [
        'Brundle exit causing understeer on cold tires',
        'Jump landing technique needs refinement',
        'Good consistency in Sector 1'
      ],
      priority_focus: 'Practice jump entries at reduced speed to build confidence.'
    },
    status: 'complete'
  }
};

export function PitwallReports() {
  const { teamId } = useParams<{ teamId: string }>();
  const [events, setEvents] = useState<typeof mockEvents>([]);
  const [selectedDebrief, setSelectedDebrief] = useState<TeamDebrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDebrief, setLoadingDebrief] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      if (teamId === 'demo') {
        await new Promise(r => setTimeout(r, 400));
      }
      setEvents(mockEvents);
      setLoading(false);
    };
    fetchEvents();
  }, [teamId]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const fetchDebrief = async (eventId: string) => {
    setLoadingDebrief(true);
    if (teamId === 'demo') {
      await new Promise(r => setTimeout(r, 500));
    }
    setSelectedDebrief(mockDebriefs[eventId] || null);
    setLoadingDebrief(false);
  };

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
              {events.length === 0 ? (
                <div className="py-8 text-center text-white/30 text-sm">No events</div>
              ) : (
                events.map(event => {
                  const hasDebrief = !!mockDebriefs[event.id];
                  const isSelected = selectedDebrief?.event_id === event.id;
                  return (
                    <button
                      key={event.id}
                      onClick={() => fetchDebrief(event.id)}
                      disabled={!hasDebrief}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-white/5' : hasDebrief ? 'hover:bg-white/5' : 'opacity-50'
                      }`}
                    >
                      <div>
                        <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white'}`}>
                          {event.event_name}
                        </div>
                        <div className="text-xs text-white/40">{new Date(event.created_at).toLocaleDateString()}</div>
                      </div>
                      {hasDebrief && <ChevronRight size={14} className={isSelected ? 'text-white/50' : 'text-white/30'} />}
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
