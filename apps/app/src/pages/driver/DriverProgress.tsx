import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, Target, Clock, ArrowLeft,
  ChevronRight, CheckCircle2, Circle, Lightbulb, BookOpen,
  Flame, Zap, MessageSquare, Play, BarChart2, Loader2, Plus, Sparkles
} from 'lucide-react';
import { 
  fetchDevelopmentData, 
  updateDrillCompletion,
  type DevelopmentData,
  type Skill
} from '../../lib/driverDevelopment';
import { 
  fetchGoals, 
  fetchGoalSuggestions, 
  acceptSuggestion,
  type Goal, 
  type GoalSuggestion 
} from '../../lib/goalsService';
import { GoalCard } from '../../components/GoalCard';
import { CreateGoalModal } from '../../components/CreateGoalModal';

// Mock data removed - all data comes from API

function getSkillStatusColor(status: Skill['status']) {
  switch (status) {
    case 'mastered': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    case 'learning': return 'text-[#f97316] bg-[#f97316]/20 border-[#f97316]/30';
    case 'next': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    default: return 'text-white/20 bg-white/[0.02] border-white/[0.06]';
  }
}

export function DriverProgress() {
  const { user } = useAuth();
  const [data, setData] = useState<DevelopmentData | null>(null); // Demo disabled - start with null
  const [loading, setLoading] = useState(true);
  const [expandedFocus, setExpandedFocus] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'focus' | 'skills' | 'goals' | 'journey'>('focus');
  
  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  // Fetch development data and goals on mount
  useEffect(() => {
    Promise.all([
      fetchDevelopmentData(),
      fetchGoals(),
      fetchGoalSuggestions()
    ]).then(([devData, goalsData, suggestionsData]) => {
      setData(devData);
      setGoals(goalsData);
      setSuggestions(suggestionsData);
      setExpandedFocus(devData.focusAreas[0]?.id || null);
      setLoading(false);
    });
  }, []);

  // Refresh goals
  const refreshGoals = async () => {
    const [goalsData, suggestionsData] = await Promise.all([
      fetchGoals(),
      fetchGoalSuggestions()
    ]);
    setGoals(goalsData);
    setSuggestions(suggestionsData);
  };

  // Accept a suggestion
  const handleAcceptSuggestion = async (suggestion: GoalSuggestion) => {
    setAcceptingId(suggestion.title);
    const result = await acceptSuggestion(suggestion);
    if (result) {
      await refreshGoals();
    }
    setAcceptingId(null);
  };

  // Handle drill completion toggle
  const handleDrillToggle = async (focusAreaId: string, drillName: string, completed: boolean) => {
    // Optimistic update
    setData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.map(fa => 
        fa.id === focusAreaId 
          ? { ...fa, drills: fa.drills.map(d => d.name === drillName ? { ...d, completed } : d) }
          : fa
      )
    }));
    // Sync with server (fire and forget)
    updateDrillCompletion(focusAreaId, drillName, completed);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-[#0e0e0e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
          <span className="text-white/50 text-sm">Loading development data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex relative">
      <div className="absolute inset-0 overflow-hidden">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-70">
          <source src="/videos/bg-2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 w-80 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>Development</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Driver Growth</p>
            </div>
          </div>
        </div>

        {/* Current Phase */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="text-[9px] uppercase tracking-wider text-white/30 mb-2">Current Phase</div>
          <div className="text-lg text-white font-medium" style={{ fontFamily: 'Orbitron, sans-serif' }}>{data.currentPhase}</div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-white/40">Phase Progress</span>
              <span className="text-white/60 font-mono">{data.phaseProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#f97316] to-amber-500 rounded-full" style={{ width: `${data.phaseProgress}%` }} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-1">This Week's Focus</div>
            <div className="text-sm text-[#f97316] flex items-center gap-2">
              <Target className="w-3 h-3" />
              {data.weeklyFocus}
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] uppercase tracking-wider text-white/30 flex items-center gap-2">
              <Flame className="w-3 h-3" />Active Goals
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-1 rounded hover:bg-white/[0.05] text-white/40 hover:text-white/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {goals.filter(g => g.status === 'active').slice(0, 4).map(goal => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/70 truncate flex-1 mr-2">{goal.title}</span>
                  <span className="text-[10px] font-mono text-white/50">{Math.round(goal.progressPct)}%</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${goal.progressPct >= 75 ? 'bg-emerald-500' : goal.progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                    style={{ width: `${goal.progressPct}%` }} 
                  />
                </div>
                {goal.deadline && <p className="text-[9px] text-white/30 mt-1">Due: {new Date(goal.deadline).toLocaleDateString()}</p>}
              </div>
            ))}
            {goals.filter(g => g.status === 'active').length === 0 && (
              <p className="text-[10px] text-white/30 italic">No active goals yet</p>
            )}
          </div>
        </div>

        {/* Next Session Preview */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-[9px] uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
            <Play className="w-3 h-3" />Next Session Plan
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <p className="text-sm text-white/90 mb-2">{data.nextSession.focus}</p>
            <div className="space-y-1.5 mb-3">
              {data.nextSession.drills.map((drill, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[10px] text-white/50">
                  <span className="text-white/30 font-mono">{idx + 1}.</span>
                  {drill}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-amber-400/80 italic">💡 {data.nextSession.reminder}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{driverName}</h1>
              <p className="text-xs text-white/40 mt-1">Your development journey</p>
            </div>
            <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
              {(['focus', 'skills', 'goals', 'journey'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveSection(tab)}
                  className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-medium transition-all ${
                    activeSection === tab ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' : 'text-white/50 hover:text-white/70'
                  }`}
                >{tab === 'focus' ? 'Focus Areas' : tab === 'skills' ? 'Skill Tree' : tab === 'goals' ? 'Goals' : 'Journey'}</button>
              ))}
            </div>
          </div>

          {activeSection === 'focus' && (
            <div className="space-y-4">
              {/* Focus Areas */}
              {data.focusAreas.map(area => (
                <div key={area.id} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFocus(expandedFocus === area.id ? null : area.id)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center">
                        <Target className="w-5 h-5 text-[#f97316]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-white">{area.title}</h3>
                        <p className="text-[11px] text-white/50">{area.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-mono text-white">{area.progress}%</div>
                        <div className="text-[9px] text-white/40">progress</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${expandedFocus === area.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {expandedFocus === area.id && (
                    <div className="px-4 pb-4 border-t border-white/[0.06]">
                      {/* Insight */}
                      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-white/90">{area.insight}</p>
                            <p className="text-[10px] text-white/40 mt-2 flex items-center gap-1">
                              <BarChart2 className="w-3 h-3" />
                              {area.evidence}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Drills */}
                      <div className="mt-4">
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Practice Drills</div>
                        <div className="space-y-2">
                          {area.drills.map((drill, idx) => (
                            <div key={idx} className={`flex items-center gap-3 p-2 rounded ${drill.completed ? 'bg-emerald-500/10' : 'bg-white/[0.02]'}`}>
                              {drill.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-white/20" />
                              )}
                              <span className={`text-xs ${drill.completed ? 'text-white/60' : 'text-white/80'}`}>{drill.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Improvement */}
                      {area.recentImprovement && (
                        <div className="mt-4 flex items-center gap-2 text-emerald-400">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs">{area.recentImprovement}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Coaching Notes */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Coach's Notes</h3>
                </div>
                <div className="space-y-2">
                  {data.coachingNotes.map((note, idx) => (
                    <p key={idx} className="text-xs text-white/60 pl-3 border-l-2 border-white/10">{note}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'skills' && (
            <div className="space-y-6">
              {data.skillTree.map(category => (
                <div key={category.category} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>{category.category}</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {category.skills.map(skill => (
                      <div key={skill.name} className={`p-3 rounded-lg border ${getSkillStatusColor(skill.status)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">{skill.name}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(skill.maxLevel)].map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i < skill.level ? 'bg-current' : 'bg-white/10'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] opacity-60 mb-2">{skill.description}</p>
                        <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                          <div className="h-full bg-current rounded-full opacity-60" style={{ width: `${skill.progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] opacity-50">
                            {skill.status === 'mastered' ? 'Mastered' : skill.status === 'learning' ? 'In Progress' : skill.status === 'next' ? 'Up Next' : 'Locked'}
                          </span>
                          <span className="text-[9px] font-mono opacity-50">{skill.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'goals' && (
            <div className="space-y-6">
              {/* AI Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-purple-500/10 backdrop-blur-xl border border-purple-500/20 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-purple-500/20 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-purple-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>AI Recommended Goals</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {suggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="text-sm text-white/90">{suggestion.title}</h4>
                            <p className="text-xs text-white/50 mt-1">{suggestion.rationale}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
                              <span>{suggestion.currentValue} → {suggestion.targetValue} {suggestion.unit}</span>
                              {suggestion.discipline && <span className="px-1.5 py-0.5 bg-white/[0.05] rounded">{suggestion.discipline}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            disabled={acceptingId === suggestion.title}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                          >
                            {acceptingId === suggestion.title ? 'Adding...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Goals */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Active Goals</h3>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.08] text-white/70 text-xs rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Goal
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {goals.filter(g => g.status === 'active').length === 0 ? (
                    <p className="text-sm text-white/40 text-center py-8">No active goals. Create one or accept an AI suggestion above!</p>
                  ) : (
                    goals.filter(g => g.status === 'active').map(goal => (
                      <GoalCard key={goal.id} goal={goal} onUpdate={refreshGoals} />
                    ))
                  )}
                </div>
              </div>

              {/* Achieved Goals */}
              {goals.filter(g => g.status === 'achieved').length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Achieved</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {goals.filter(g => g.status === 'achieved').map(goal => (
                      <GoalCard key={goal.id} goal={goal} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'journey' && (
            <div className="space-y-4">
              {/* Learning Moments */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Learning Moments</h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {data.learningMoments.map((moment, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/90">{moment.session}</span>
                        <span className="text-[10px] text-white/40">{moment.date}</span>
                      </div>
                      <p className="text-xs text-white/60 mb-2">{moment.insight}</p>
                      <div className="flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-[11px]">{moment.improvement}</span>
                      </div>
                      {moment.metric && (
                        <div className="mt-2 flex items-center gap-4 text-[10px]">
                          <span className="text-white/40">{moment.metric.label}:</span>
                          <span className="text-red-400/60 line-through">{moment.metric.before}</span>
                          <span className="text-white/20">→</span>
                          <span className="text-emerald-400">{moment.metric.after}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Your Journey</h3>
                </div>
                <div className="relative pl-4 border-l border-white/10 space-y-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0e0e0e]" />
                    <div className="text-[10px] text-white/40">This Week</div>
                    <p className="text-xs text-white/70">Working on corner exit patience. Seeing early gains.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-[#f97316] border-2 border-[#0e0e0e]" />
                    <div className="text-[10px] text-white/40">Last Week</div>
                    <p className="text-xs text-white/70">Completed basic trail braking module. Ready for advanced.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-blue-500 border-2 border-[#0e0e0e]" />
                    <div className="text-[10px] text-white/40">2 Weeks Ago</div>
                    <p className="text-xs text-white/70">Started consistency phase. 5 clean races in a row.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-white/20 border-2 border-[#0e0e0e]" />
                    <div className="text-[10px] text-white/40">Month Start</div>
                    <p className="text-xs text-white/70">Completed fundamentals phase. iRating +124.</p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Growth Summary</h3>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-mono text-white">12</div>
                    <div className="text-[9px] text-white/40">Skills Improved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-mono text-emerald-400">+0.4s</div>
                    <div className="text-[9px] text-white/40">Avg Lap Gain</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-mono text-white">8</div>
                    <div className="text-[9px] text-white/40">Drills Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-mono text-[#f97316]">3</div>
                    <div className="text-[9px] text-white/40">Focus Areas</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Goal Modal */}
      <CreateGoalModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onCreated={refreshGoals}
      />
    </div>
  );
}
