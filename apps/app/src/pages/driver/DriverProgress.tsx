import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, Target, Clock, ArrowLeft,
  ChevronRight, CheckCircle2, Circle, Lightbulb, BookOpen,
  Flame, Zap, MessageSquare, Play, BarChart2
} from 'lucide-react';

interface Skill {
  name: string;
  level: number;
  maxLevel: number;
  progress: number;
  status: 'mastered' | 'learning' | 'next' | 'locked';
  description: string;
}

interface FocusArea {
  id: string;
  title: string;
  description: string;
  insight: string;
  evidence: string;
  progress: number;
  drills: { name: string; completed: boolean }[];
  recentImprovement?: string;
}

interface LearningMoment {
  session: string;
  date: string;
  insight: string;
  improvement: string;
  metric?: { label: string; before: string; after: string };
}

interface Goal {
  id: string;
  title: string;
  target: string;
  current: number;
  max: number;
  deadline?: string;
}

interface DevelopmentData {
  currentPhase: string;
  phaseProgress: number;
  weeklyFocus: string;
  focusAreas: FocusArea[];
  skillTree: {
    category: string;
    skills: Skill[];
  }[];
  learningMoments: LearningMoment[];
  goals: Goal[];
  coachingNotes: string[];
  nextSession: {
    focus: string;
    drills: string[];
    reminder: string;
  };
}

const mockData: DevelopmentData = {
  currentPhase: 'Consistency Building',
  phaseProgress: 68,
  weeklyFocus: 'Corner Exit Optimization',
  focusAreas: [
    {
      id: '1',
      title: 'Corner Exit Patience',
      description: 'Waiting for the car to rotate before applying throttle',
      insight: 'You\'re losing 0.2s per lap by getting on throttle too early in slow corners. The rear is stepping out, forcing corrections.',
      evidence: 'Avg throttle application: 15m before apex vs 8m optimal',
      progress: 45,
      drills: [
        { name: 'Lift-coast-rotate drill at T3', completed: true },
        { name: '50% throttle exit practice', completed: true },
        { name: 'Full speed corner exit runs', completed: false },
      ],
      recentImprovement: '+0.08s avg corner exit speed this week'
    },
    {
      id: '2', 
      title: 'Trail Braking Depth',
      description: 'Carrying brake pressure deeper into corners',
      insight: 'Your brake release is too abrupt. Trailing off smoothly will help rotate the car and set up better exits.',
      evidence: 'Brake release point: 22m before apex vs 12m for top drivers',
      progress: 30,
      drills: [
        { name: 'Progressive brake release drill', completed: true },
        { name: 'Trail brake to apex practice', completed: false },
        { name: 'Combined trail + rotation', completed: false },
      ],
    },
    {
      id: '3',
      title: 'Qualifying Pace',
      description: 'Finding the extra tenth on a single lap',
      insight: 'You\'re consistent but leaving time on the table. Your best sectors never come together in one lap.',
      evidence: 'Theoretical best: 1:42.3 vs Actual best: 1:42.8',
      progress: 20,
      drills: [
        { name: 'Sector-by-sector attack runs', completed: false },
        { name: 'Tire prep lap optimization', completed: false },
        { name: 'Mental reset between attempts', completed: false },
      ],
    },
  ],
  skillTree: [
    {
      category: 'Car Control',
      skills: [
        { name: 'Basic Throttle Control', level: 3, maxLevel: 3, progress: 100, status: 'mastered', description: 'Smooth throttle application' },
        { name: 'Trail Braking', level: 2, maxLevel: 3, progress: 60, status: 'learning', description: 'Brake into the corner' },
        { name: 'Weight Transfer', level: 1, maxLevel: 3, progress: 30, status: 'learning', description: 'Use weight to rotate' },
        { name: 'Oversteer Recovery', level: 2, maxLevel: 3, progress: 80, status: 'learning', description: 'Catch and correct slides' },
      ]
    },
    {
      category: 'Race Craft',
      skills: [
        { name: 'Clean Overtaking', level: 2, maxLevel: 3, progress: 70, status: 'learning', description: 'Safe, decisive passes' },
        { name: 'Defensive Lines', level: 2, maxLevel: 3, progress: 100, status: 'mastered', description: 'Protect position legally' },
        { name: 'Tire Management', level: 2, maxLevel: 3, progress: 50, status: 'learning', description: 'Preserve grip over stints' },
        { name: 'Race Starts', level: 1, maxLevel: 3, progress: 40, status: 'learning', description: 'Consistent launches' },
      ]
    },
    {
      category: 'Mental',
      skills: [
        { name: 'Pressure Management', level: 1, maxLevel: 3, progress: 45, status: 'learning', description: 'Perform when it counts' },
        { name: 'Consistency', level: 2, maxLevel: 3, progress: 85, status: 'learning', description: 'Repeatable lap times' },
        { name: 'Adaptability', level: 1, maxLevel: 3, progress: 30, status: 'next', description: 'Adjust to conditions' },
        { name: 'Race Reading', level: 1, maxLevel: 3, progress: 20, status: 'next', description: 'Anticipate situations' },
      ]
    },
  ],
  learningMoments: [
    {
      session: 'Spa Practice',
      date: 'Today',
      insight: 'Discovered I was lifting too early at Eau Rouge. Committed fully and gained 0.3s.',
      improvement: 'Sector 1 time dropped from 38.2 to 37.9',
      metric: { label: 'Eau Rouge Speed', before: '278 km/h', after: '285 km/h' }
    },
    {
      session: 'Monza Race',
      date: 'Yesterday',
      insight: 'Stayed patient in T1 chaos. Avoided 3-car incident by holding back.',
      improvement: 'Clean start, gained 2 positions by lap 3',
    },
    {
      session: 'Silverstone Practice',
      date: '2 days ago',
      insight: 'Trail braking into Copse finally clicked. Car rotated naturally.',
      improvement: 'Corner entry speed up 4 km/h',
      metric: { label: 'Copse Entry', before: '242 km/h', after: '246 km/h' }
    },
  ],
  goals: [
    { id: '1', title: 'Complete trail braking module', target: 'Finish all drills', current: 1, max: 3 },
    { id: '2', title: 'String together 5 clean races', target: '0x incidents', current: 2, max: 5 },
    { id: '3', title: 'Reduce avg corner exit loss', target: 'Under 0.1s/corner', current: 65, max: 100 },
    { id: '4', title: 'Qualify in top 10', target: 'Next 3 races', current: 1, max: 3, deadline: 'Feb 10' },
  ],
  coachingNotes: [
    'Your consistency is your biggest strength. Build on it.',
    'Focus on ONE thing per session. Don\'t try to fix everything.',
    'The exit speed gains will come once trail braking clicks.',
    'You\'re ready to push harder in qualifying. Trust yourself.',
  ],
  nextSession: {
    focus: 'Trail Braking at Monza T1',
    drills: [
      'Progressive brake release: 5 laps at 80%',
      'Trail to apex: 5 laps focusing on rotation',
      'Full speed integration: 5 timed laps',
    ],
    reminder: 'Don\'t chase lap times. Focus on the technique feeling right.',
  }
};

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
  const [data] = useState<DevelopmentData>(mockData);
  const [expandedFocus, setExpandedFocus] = useState<string | null>(data.focusAreas[0]?.id || null);
  const [activeSection, setActiveSection] = useState<'focus' | 'skills' | 'journey'>('focus');

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

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
          <div className="text-[9px] uppercase tracking-wider text-white/30 mb-3 flex items-center gap-2">
            <Flame className="w-3 h-3" />Active Goals
          </div>
          <div className="space-y-3">
            {data.goals.map(goal => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/70">{goal.title}</span>
                  <span className="text-[10px] font-mono text-white/50">{goal.current}/{goal.max}</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(goal.current / goal.max) * 100}%` }} />
                </div>
                {goal.deadline && <p className="text-[9px] text-white/30 mt-1">Due: {goal.deadline}</p>}
              </div>
            ))}
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
              {(['focus', 'skills', 'journey'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveSection(tab)}
                  className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-medium transition-all ${
                    activeSection === tab ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' : 'text-white/50 hover:text-white/70'
                  }`}
                >{tab === 'focus' ? 'Focus Areas' : tab === 'skills' ? 'Skill Tree' : 'Journey'}</button>
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
    </div>
  );
}
