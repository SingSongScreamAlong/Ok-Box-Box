import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverData } from '../../hooks/useDriverData';
import { getLicenseColor } from '../../lib/driverService';
import { 
  TrendingUp, Target, Clock, ArrowLeft,
  ChevronRight, CheckCircle2, Circle, Lightbulb, BookOpen,
  Flame, Zap, MessageSquare, Play, BarChart2, Loader2, Plus, Sparkles,
  Award, Shield, Star, Trophy, Medal, Flag
} from 'lucide-react';
import { 
  fetchDevelopmentData, 
  updateDrillCompletion,
  type DevelopmentData,
  type Skill,
  type JourneyTimelineEntry,
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

function AchievementIcon({ icon, className }: { icon: string; className?: string }) {
  const cn = className || 'w-4 h-4';
  switch (icon) {
    case 'flag': return <Flag className={cn} />;
    case 'trophy': return <Trophy className={cn} />;
    case 'medal': return <Medal className={cn} />;
    case 'star': return <Star className={cn} />;
    case 'shield': return <Shield className={cn} />;
    case 'zap': return <Zap className={cn} />;
    case 'target': return <Target className={cn} />;
    default: return <Award className={cn} />;
  }
}

function getTimelineColor(highlight: string) {
  switch (highlight) {
    case 'perfect-week': return 'bg-emerald-500';
    case 'positive': return 'bg-blue-500';
    case 'milestone': return 'bg-[#f97316]';
    default: return 'bg-white/20';
  }
}

export function DriverProgress() {
  const { user } = useAuth();
  const { profile } = useDriverData();
  const [data, setData] = useState<DevelopmentData | null>(null);
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
      setExpandedFocus(devData?.focusAreas?.[0]?.id || null);
      setLoading(false);
    }).catch(() => {
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
    if (!data) return;
    // Optimistic update
    setData(prev => prev ? ({
      ...prev,
      focusAreas: prev.focusAreas.map(fa => 
        fa.id === focusAreaId 
          ? { ...fa, drills: fa.drills.map(d => d.name === drillName ? { ...d, completed } : d) }
          : fa
      )
    }) : prev);
    // Sync with server (fire and forget)
    updateDrillCompletion(focusAreaId, drillName, completed);
  };

  const hasIRacingData = profile && profile.licenses && profile.licenses.length > 0;

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

  // When no development data exists, show iRacing profile overview
  if (!data || !data.focusAreas || data.focusAreas.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div>
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <Flame className="w-3 h-3" />Back to Operations
          </Link>
          <h1 className="text-xl font-semibold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Driver Development
          </h1>
          <p className="text-xs text-white/40 mt-1">Your growth journey starts here</p>
        </div>

        {/* iRacing Profile Card */}
        {hasIRacingData ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm uppercase tracking-[0.15em] text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>iRacing Profile</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-3xl font-mono font-bold text-blue-400">{profile!.iRatingOverall ?? '—'}</div>
                  <div className="text-[10px] text-blue-400/60 uppercase tracking-wider mt-1">iRating</div>
                </div>
                <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-3xl font-mono font-bold text-green-400">{profile!.safetyRatingOverall?.toFixed(2) ?? '—'}</div>
                  <div className="text-[10px] text-green-400/60 uppercase tracking-wider mt-1">Safety Rating</div>
                </div>
                <div className="text-center p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                  <div className="text-3xl font-mono font-bold text-white/80">{profile!.licenses.length}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Disciplines</div>
                </div>
                <div className="text-center p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                  <div className="text-3xl font-mono font-bold text-white/80">{profile!.custId ?? '—'}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">iRacing ID</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile!.licenses.map((license) => (
                  <div key={license.discipline} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: getLicenseColor(license.licenseClass) }}>
                        {license.licenseClass}
                      </div>
                      <div>
                        <div className="text-sm text-white/80 font-medium">
                          {license.discipline === 'sportsCar' ? 'Road' : license.discipline === 'dirtOval' ? 'Dirt Oval' : license.discipline === 'dirtRoad' ? 'Dirt Road' : 'Oval'}
                        </div>
                        <div className="text-[10px] text-white/40">Class {license.licenseClass} License</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-blue-400">{license.iRating ?? '—'}</div>
                      <div className="text-[10px] text-green-400">SR {license.safetyRating?.toFixed(2) ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-12 text-center">
            <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h2 className="text-lg text-white/60 mb-2">No Development Data Yet</h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              Connect your iRacing account in <Link to="/settings" className="text-blue-400 hover:text-blue-300">Settings</Link> and complete sessions with the relay to unlock personalized development tracking.
            </p>
          </div>
        )}

        {/* Getting Started */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#f97316]" />
            <h3 className="text-sm uppercase tracking-[0.15em] text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Getting Started</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <div className="text-lg font-mono text-[#f97316] mb-2">1</div>
              <h4 className="text-sm text-white/80 mb-1">Connect iRacing</h4>
              <p className="text-xs text-white/40">Link your iRacing account to import your profile and ratings.</p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <div className="text-lg font-mono text-[#f97316] mb-2">2</div>
              <h4 className="text-sm text-white/80 mb-1">Install Relay</h4>
              <p className="text-xs text-white/40">Download the relay app to stream live telemetry during sessions.</p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <div className="text-lg font-mono text-[#f97316] mb-2">3</div>
              <h4 className="text-sm text-white/80 mb-1">Race & Improve</h4>
              <p className="text-xs text-white/40">Complete sessions to unlock AI coaching, skill tracking, and goals.</p>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        {goals.length > 0 && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#f97316]" />
                <h3 className="text-sm uppercase tracking-[0.15em] text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Your Goals</h3>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.08] text-white/70 text-xs rounded transition-colors">
                <Plus className="w-3.5 h-3.5" />New Goal
              </button>
            </div>
            <div className="p-4 space-y-3">
              {goals.map(goal => (
                <GoalCard key={goal.id} goal={goal} onUpdate={refreshGoals} />
              ))}
            </div>
          </div>
        )}

        <CreateGoalModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={refreshGoals} />
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

        {/* Gamification - XP & Level */}
        {data.gamification && (
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f97316] to-amber-600 flex items-center justify-center text-sm font-bold text-white font-mono">
                  {data.gamification.level}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white/90">{data.gamification.levelName}</div>
                  <div className="text-[9px] text-white/40">{data.gamification.xp.toLocaleString()} XP</div>
                </div>
              </div>
              {data.gamification.cleanStreak > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-400">{data.gamification.cleanStreak}</span>
                </div>
              )}
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span className="text-white/30">Level Progress</span>
                <span className="text-white/50 font-mono">{data.gamification.xpInCurrentLevel} / {data.gamification.xpToNextLevel}</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#f97316] to-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (data.gamification.xpInCurrentLevel / data.gamification.xpToNextLevel) * 100)}%` }}
                />
              </div>
            </div>
            {data.gamification.totalAchievements > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] text-white/40">
                <Award className="w-3 h-3 text-amber-400" />
                <span>{data.gamification.totalAchievements} achievement{data.gamification.totalAchievements !== 1 ? 's' : ''} earned</span>
              </div>
            )}
          </div>
        )}

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
                            <button
                              key={idx}
                              onClick={() => handleDrillToggle(area.id, drill.name, !drill.completed)}
                              className={`flex items-center gap-3 p-2 rounded w-full text-left transition-colors hover:bg-white/[0.04] ${drill.completed ? 'bg-emerald-500/10' : 'bg-white/[0.02]'}`}
                            >
                              {drill.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-white/20 shrink-0" />
                              )}
                              <span className={`text-xs ${drill.completed ? 'text-white/60 line-through' : 'text-white/80'}`}>{drill.name}</span>
                            </button>
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
              {/* Achievements */}
              {data.gamification && data.gamification.recentAchievements.length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Achievements</h3>
                    <span className="ml-auto text-[10px] text-white/30 font-mono">{data.gamification.totalAchievements} earned</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {data.gamification.recentAchievements.map((ach) => (
                      <div key={ach.id} className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <AchievementIcon icon={ach.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white/90 truncate">{ach.title}</div>
                          <div className="text-[10px] text-white/40 truncate">{ach.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journey Timeline */}
              {data.journeyTimeline && data.journeyTimeline.length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Your Journey</h3>
                  </div>
                  <div className="relative pl-4 border-l border-white/10 space-y-4">
                    {data.journeyTimeline.map((entry: JourneyTimelineEntry, idx: number) => (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[21px] w-3 h-3 rounded-full ${getTimelineColor(entry.highlight)} border-2 border-[#0e0e0e]`} />
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-white/40">{entry.period}</div>
                          <span className="text-[9px] text-white/20 font-mono">{entry.sessions} session{entry.sessions !== 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-xs text-white/70 mt-0.5">{entry.summary}</p>
                        {entry.iRatingChange !== null && entry.iRatingChange !== 0 && (
                          <div className={`text-[10px] mt-1 font-mono ${entry.iRatingChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            iRating {entry.iRatingChange > 0 ? '+' : ''}{entry.iRatingChange}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Moments */}
              {data.learningMoments.length > 0 && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Recent Sessions</h3>
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
              )}

              {/* Growth Stats */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/70" style={{ fontFamily: 'Orbitron, sans-serif' }}>Growth Summary</h3>
                </div>
                {data.growthStats ? (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white">{data.growthStats.sessionsCompleted}</div>
                      <div className="text-[9px] text-white/40">Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-mono ${data.growthStats.iRatingChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {data.growthStats.iRatingChange >= 0 ? '+' : ''}{data.growthStats.iRatingChange}
                      </div>
                      <div className="text-[9px] text-white/40">iRating Change</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white">{data.growthStats.cleanRaces}</div>
                      <div className="text-[9px] text-white/40">Clean Races</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-mono text-[#f97316]">{data.growthStats.skillsImproved}</div>
                      <div className="text-[9px] text-white/40">Skills Lvl 2+</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white/30">—</div>
                      <div className="text-[9px] text-white/40">Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white/30">—</div>
                      <div className="text-[9px] text-white/40">iRating Change</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white/30">—</div>
                      <div className="text-[9px] text-white/40">Clean Races</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white/30">—</div>
                      <div className="text-[9px] text-white/40">Skills Lvl 2+</div>
                    </div>
                  </div>
                )}

                {/* Performance Radar */}
                {data.growthStats && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3">Performance Profile</div>
                    <div className="space-y-2">
                      {[
                        { label: 'Pace', value: data.growthStats.pacePercentile, color: 'bg-blue-500' },
                        { label: 'Consistency', value: data.growthStats.consistencyIndex, color: 'bg-purple-500' },
                        { label: 'Safety', value: data.growthStats.safetyScore, color: 'bg-emerald-500' },
                      ].map((stat) => (
                        <div key={stat.label} className="flex items-center gap-3">
                          <span className="text-[10px] text-white/50 w-20">{stat.label}</span>
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className={`h-full ${stat.color} rounded-full transition-all duration-700`} style={{ width: `${stat.value}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-white/50 w-8 text-right">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
