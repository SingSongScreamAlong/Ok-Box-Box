import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useParams } from 'react-router-dom';
import { FileText, Sparkles, ChevronRight } from 'lucide-react';

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
  const { isDark } = useTheme();

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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-white/50">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-7xl mx-auto min-h-screen relative overflow-hidden ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
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
      {/* Header */}
      <div className="mb-6">
        <h1 
          className={`text-xl font-bold tracking-wide uppercase ${isDark ? 'text-white' : 'text-[#0a0a0a]'}`}
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Team Reports
        </h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>Event debriefs and analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-1">
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Sparkles size={14} className="text-white/40" />
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
            <div className="bg-[#0a0a0a] p-12 text-center text-white/50" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>Loading debrief...</div>
          ) : selectedDebrief ? (
            <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
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
                  <div className="p-4 bg-[#0a0a0a] border border-white/10">
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
                      <div key={d.driver_profile_id} className="p-4 bg-[#0a0a0a] border border-white/10">
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
            <div className="border border-white/10 p-12 text-center">
              <FileText className="mx-auto text-white/20 mb-2" size={32} />
              <p className="text-white/40">Select an event to view its debrief</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
