/**
 * AdaptiveCoachingCard — Crew personality adapts to driver state
 *
 * The engineer/spotter tone and content changes based on:
 * - Fatigue level (session load model)
 * - Confidence (recent results)
 * - Incident history (tilt risk)
 * - Session intent (practice vs race)
 *
 * Phase 5b: Frontend-only personality engine
 * TODO Phase 5b+: Server-side personality persistence, preference learning
 */

import { useMemo } from 'react';
import {
  MessageCircle, Heart, Flame, Shield,
  Brain, Coffee, Zap
} from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

type DriverMood = 'confident' | 'neutral' | 'frustrated' | 'fatigued' | 'tilted';
type CoachingTone = 'encouraging' | 'neutral' | 'calming' | 'direct' | 'motivating';

interface CoachingPersonality {
  tone: CoachingTone;
  mood: DriverMood;
  engineerMessage: string;
  spotterMessage: string;
  icon: typeof Heart;
  color: string;
  suggestion: string;
}

interface AdaptiveCoachingCardProps {
  sessions: DriverSessionSummary[];
  sessionIntent?: 'practice' | 'quali_sim' | 'race_sim' | 'limit_pushing' | 'testing';
  fatigueLevelHigh?: boolean;
  recentIncidents?: number;
}

function inferDriverMood(
  sessions: DriverSessionSummary[],
  fatigueLevelHigh: boolean,
  recentIncidents: number,
): DriverMood {
  const recent5 = sessions.slice(0, 5);
  if (recent5.length === 0) return 'neutral';

  // Check for tilt (multiple high-incident recent sessions)
  const highIncidentCount = recent5.filter(s => (s.incidents ?? 0) > 4).length;
  if (highIncidentCount >= 2 || recentIncidents > 6) return 'tilted';

  // Check for frustration (consistent iRating loss)
  const irChanges = recent5
    .filter(s => s.iRatingChange != null || s.irDelta != null)
    .map(s => (s.iRatingChange ?? s.irDelta ?? 0));
  const netIR = irChanges.reduce((a, b) => a + b, 0);
  if (netIR < -100 && irChanges.length >= 3) return 'frustrated';

  // Check for fatigue
  if (fatigueLevelHigh) return 'fatigued';

  // Check for confidence (positive results)
  const wins = recent5.filter(s => s.finishPos === 1).length;
  const top5s = recent5.filter(s => (s.finishPos ?? 99) <= 5).length;
  if (wins > 0 || (top5s >= 3 && netIR > 50)) return 'confident';

  return 'neutral';
}

function adaptPersonality(
  mood: DriverMood,
  intent?: string,
): CoachingPersonality {
  switch (mood) {
    case 'confident':
      return {
        tone: 'encouraging',
        mood,
        icon: Flame,
        color: 'text-[#f97316]',
        engineerMessage: intent === 'limit_pushing'
          ? "You're in good form. Let's push the envelope — try braking 5 meters later into T1 and see what the data says."
          : "Strong recent results. The car's under you. Focus on execution — the pace is already there.",
        spotterMessage: "Looking sharp out there. Trust your instincts on the overtakes — you've earned the right to be aggressive.",
        suggestion: 'Set ambitious targets this session — you have the momentum.',
      };

    case 'frustrated':
      return {
        tone: 'motivating',
        mood,
        icon: Zap,
        color: 'text-yellow-400',
        engineerMessage: "Rough patch, but the data shows your pace hasn't dropped — the results don't match your driving right now. That usually corrects itself.",
        spotterMessage: "I know it's been tough, but you're still quick. Sometimes the racing gods just aren't with you. Stay patient.",
        suggestion: 'Consider a focused practice session before your next race. Rebuild confidence through clean laps.',
      };

    case 'fatigued':
      return {
        tone: 'calming',
        mood,
        icon: Coffee,
        color: 'text-blue-400',
        engineerMessage: "You've been putting in a lot of seat time. Your late-session pace shows some fatigue patterns. Quality over quantity today.",
        spotterMessage: "Hey, take it easy this session. No need to be a hero — clean laps, bring it home, and we'll debrief.",
        suggestion: 'Shorter session recommended. Focus on quality laps rather than volume.',
      };

    case 'tilted':
      return {
        tone: 'calming',
        mood,
        icon: Shield,
        color: 'text-red-400',
        engineerMessage: "I'm seeing elevated incident clusters in your recent sessions. Let's reset — take 3 slow laps focusing only on braking points. No pushing until the rhythm comes back.",
        spotterMessage: "Real talk — you're overdriving right now. The fast drivers make it look easy because they're smooth. Slow down to go fast.",
        suggestion: 'Switch to practice mode. Work on one corner at a time. No racing until incidents are under control.',
      };

    default:
      return {
        tone: 'neutral',
        mood,
        icon: Brain,
        color: 'text-white/50',
        engineerMessage: intent === 'practice'
          ? "Good baseline session ahead. Let's focus on sector consistency — try to get your S2 times within 0.2s of each other."
          : intent === 'quali_sim'
          ? "Qualifying mode. We need one clean lap. Build up over 2-3 laps, then commit. Don't overdrive the first sector."
          : "Standard session. Focus on clean execution. I'll call out anything interesting in the data.",
        spotterMessage: "Clear track ahead. Run your own race, I'll keep you posted on the gaps.",
        suggestion: 'Run your session plan. The crew is monitoring.',
      };
  }
}

export function AdaptiveCoachingCard({
  sessions,
  sessionIntent,
  fatigueLevelHigh = false,
  recentIncidents = 0,
}: AdaptiveCoachingCardProps) {
  const personality = useMemo(() => {
    const mood = inferDriverMood(sessions, fatigueLevelHigh, recentIncidents);
    return adaptPersonality(mood, sessionIntent);
  }, [sessions, sessionIntent, fatigueLevelHigh, recentIncidents]);

  const Icon = personality.icon;

  if (sessions.length < 2) return null;

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Crew Brief</h2>
        </div>
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${personality.color}`} />
          <span className={`text-[9px] uppercase tracking-wider ${personality.color}`}>{personality.mood}</span>
        </div>
      </div>

      {/* Engineer */}
      <div className="px-5 py-3.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
            <span className="text-[8px] text-[#f97316]">E</span>
          </div>
          <span className="text-[9px] text-white/25 uppercase tracking-wider">Engineer</span>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed italic">"{personality.engineerMessage}"</p>
      </div>

      {/* Spotter */}
      <div className="px-5 py-3.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <span className="text-[8px] text-blue-400">S</span>
          </div>
          <span className="text-[9px] text-white/25 uppercase tracking-wider">Spotter</span>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed italic">"{personality.spotterMessage}"</p>
      </div>

      {/* Suggestion */}
      <div className="px-5 py-3 flex items-center gap-2">
        <span className="text-[8px] text-white/15 uppercase tracking-wider flex-shrink-0">Suggestion:</span>
        <span className="text-[10px] text-white/35">{personality.suggestion}</span>
      </div>
    </div>
  );
}
