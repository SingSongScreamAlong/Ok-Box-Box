/**
 * DriverSkillProfileCard — Extended archetype with shareable format
 *
 * Builds on the IDP archetype classification to create a rich,
 * visual skill profile card showing driving style, discipline-specific
 * traits, and long-term classification.
 *
 * Phase 5a: Computes from session history
 * TODO Phase 5a+: Server-side extended archetype model, share URL generation
 */

import { useState, useMemo } from 'react';
import {
  User, Shield, Zap, Target, TrendingUp,
  Award, Copy, Check
} from 'lucide-react';
import type { DriverSessionSummary } from '../lib/driverService';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

interface SkillAxis {
  label: string;
  value: number;  // 0-100
  description: string;
}

interface DriverArchetype {
  name: string;
  icon: typeof Shield;
  color: string;
  description: string;
  confidence: number;
}

interface SkillProfileCardProps {
  sessions: DriverSessionSummary[];
  driverName: string;
  iRating?: number;
  safetyRating?: number;
}

function computeSkillProfile(sessions: DriverSessionSummary[]) {
  const races = sessions.filter(s => s.eventType === 'race' || s.sessionType === 'Race');
  const finishes = races.filter(s => s.finishPos != null).map(s => s.finishPos!);
  const incidents = races.filter(s => s.incidents != null).map(s => s.incidents!);
  const posDeltas = races.filter(s => s.posDelta != null).map(s => s.posDelta!);
  const starts = races.filter(s => s.startPos != null).map(s => s.startPos!);
  const irChanges = races.filter(s => s.iRatingChange != null || s.irDelta != null)
    .map(s => (s.iRatingChange ?? s.irDelta ?? 0));

  // Safety (inverse of incident rate)
  const avgIncidents = incidents.length > 0 ? incidents.reduce((a, b) => a + b, 0) / incidents.length : 0;
  const safety = Math.round(Math.max(0, Math.min(100, 100 - avgIncidents * 12)));

  // Consistency (finish position variance)
  let consistency = 50;
  if (finishes.length >= 5) {
    const mean = finishes.reduce((a, b) => a + b, 0) / finishes.length;
    const variance = finishes.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / finishes.length;
    consistency = Math.round(Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 8)));
  }

  // Racecraft (position gained per race)
  const avgPosDelta = posDeltas.length > 0 ? posDeltas.reduce((a, b) => a + b, 0) / posDeltas.length : 0;
  const racecraft = Math.round(Math.max(0, Math.min(100, 50 + avgPosDelta * 10)));

  // Qualifying (start position relative to field)
  const avgStart = starts.length > 0 ? starts.reduce((a, b) => a + b, 0) / starts.length : 10;
  const qualifying = Math.round(Math.max(0, Math.min(100, 100 - (avgStart - 1) * 5)));

  // Pace (iRating trend as proxy)
  const recentIR = irChanges.slice(0, 10);
  const irTrend = recentIR.length > 0 ? recentIR.reduce((a, b) => a + b, 0) : 0;
  const pace = Math.round(Math.max(0, Math.min(100, 50 + irTrend / 20)));

  // Endurance (performance in longer sessions — sessions > 15 laps)
  const longRaces = races.filter(s => (s.lapsComplete ?? 0) > 15);
  const longFinishes = longRaces.filter(s => s.finishPos != null).map(s => s.finishPos!);
  const longAvg = longFinishes.length > 0 ? longFinishes.reduce((a, b) => a + b, 0) / longFinishes.length : 10;
  const endurance = Math.round(Math.max(0, Math.min(100, 100 - (longAvg - 1) * 4)));

  const axes: SkillAxis[] = [
    { label: 'Safety', value: safety, description: `${avgIncidents.toFixed(1)}x avg incidents` },
    { label: 'Consistency', value: consistency, description: `Finish position variance` },
    { label: 'Racecraft', value: racecraft, description: `${avgPosDelta >= 0 ? '+' : ''}${avgPosDelta.toFixed(1)} pos/race avg` },
    { label: 'Qualifying', value: qualifying, description: `P${avgStart.toFixed(1)} avg start` },
    { label: 'Pace', value: pace, description: `${irTrend >= 0 ? '+' : ''}${irTrend} iR recent trend` },
    { label: 'Endurance', value: endurance, description: `Long run performance` },
  ];

  // Archetype determination
  const archetype = determineArchetype(safety, consistency, racecraft, qualifying, pace);

  // Discipline breakdown
  const disciplines = new Map<string, number>();
  for (const s of sessions) {
    disciplines.set(s.discipline, (disciplines.get(s.discipline) || 0) + 1);
  }
  const primaryDiscipline = [...disciplines.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'road';

  // Specialist traits
  const traits: string[] = [];
  if (safety >= 80) traits.push('Clean Racer');
  if (consistency >= 80) traits.push('Metronome');
  if (racecraft >= 75) traits.push('Overtaker');
  if (qualifying >= 75) traits.push('Quick Qualifier');
  if (endurance >= 75) traits.push('Endurance Specialist');
  if (avgIncidents < 1 && races.length >= 10) traits.push('Incident-Free Machine');
  if (posDeltas.filter(d => d > 0).length / posDeltas.length > 0.7 && posDeltas.length >= 5) traits.push('Race Day Driver');

  return { axes, archetype, primaryDiscipline, traits, totalRaces: races.length };
}

function determineArchetype(
  safety: number, consistency: number, racecraft: number,
  qualifying: number, pace: number
): DriverArchetype {
  const avg = (safety + consistency + racecraft + qualifying + pace) / 5;
  const confidence = Math.min(100, avg + 10);

  if (safety >= 80 && consistency >= 70) {
    return {
      name: 'The Calculator',
      icon: Shield,
      color: 'text-green-400',
      description: 'Methodical, clean, and consistent. Minimizes risk while maximizing points.',
      confidence,
    };
  }
  if (racecraft >= 75 && pace >= 65) {
    return {
      name: 'The Hunter',
      icon: Zap,
      color: 'text-[#f97316]',
      description: 'Aggressive overtaker with strong race pace. Makes positions where others can\'t.',
      confidence,
    };
  }
  if (qualifying >= 75 && pace >= 70) {
    return {
      name: 'The Qualifier',
      icon: Target,
      color: 'text-purple-400',
      description: 'Excels in single-lap pace. Front-runner who leads from the front.',
      confidence,
    };
  }
  if (consistency >= 75 && safety >= 60) {
    return {
      name: 'The Grinder',
      icon: TrendingUp,
      color: 'text-blue-400',
      description: 'Steady improver with reliable results. Climbs the standings through consistency.',
      confidence,
    };
  }
  return {
    name: 'Developing',
    icon: User,
    color: 'text-white/60',
    description: 'Building racing experience across disciplines. Profile sharpens with more data.',
    confidence: Math.min(50, confidence),
  };
}

export function DriverSkillProfileCard({ sessions, driverName, iRating, safetyRating }: SkillProfileCardProps) {
  const [copied, setCopied] = useState(false);
  const profile = useMemo(() => computeSkillProfile(sessions), [sessions]);
  const ArchetypeIcon = profile.archetype.icon;

  const handleCopyProfile = () => {
    const text = [
      `${driverName} — ${profile.archetype.name}`,
      `iRating: ${iRating ?? '?'} | SR: ${safetyRating ?? '?'}`,
      `Races: ${profile.totalRaces} | Discipline: ${profile.primaryDiscipline}`,
      '',
      ...profile.axes.map(a => `${a.label}: ${a.value}/100`),
      '',
      profile.traits.length > 0 ? `Traits: ${profile.traits.join(', ')}` : '',
      '',
      'Generated by Ok Box Box — okboxbox.com',
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (profile.totalRaces < 3) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/40" style={ORBITRON}>Skill Profile</h2>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="text-[11px] text-white/25">Need 3+ races for skill profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Skill Profile</h2>
        </div>
        <button
          onClick={handleCopyProfile}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-white/10 text-[9px] text-white/30 hover:text-white/60 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      {/* Archetype */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-4">
        <div className={`w-12 h-12 border border-white/10 flex items-center justify-center ${profile.archetype.color}`}>
          <ArchetypeIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className={`text-lg font-bold uppercase tracking-wider ${profile.archetype.color}`} style={ORBITRON}>
            {profile.archetype.name}
          </div>
          <p className="text-[10px] text-white/40 mt-0.5">{profile.archetype.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-white/20">
            <span>{profile.totalRaces} races analyzed</span>
            <span>Primary: {profile.primaryDiscipline}</span>
            <span>Confidence: {profile.archetype.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Skill axes */}
      <div className="px-5 py-4 space-y-3">
        {profile.axes.map(axis => (
          <div key={axis.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/50 uppercase tracking-wider">{axis.label}</span>
              <span className="text-[10px] font-mono text-white/40">{axis.value}</span>
            </div>
            <div className="h-2 bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  axis.value >= 75 ? 'bg-green-500/50' :
                  axis.value >= 50 ? 'bg-blue-500/40' :
                  axis.value >= 30 ? 'bg-yellow-500/40' :
                  'bg-red-500/40'
                }`}
                style={{ width: `${axis.value}%` }}
              />
            </div>
            <div className="text-[8px] text-white/15 mt-0.5">{axis.description}</div>
          </div>
        ))}
      </div>

      {/* Traits */}
      {profile.traits.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <div className="text-[8px] text-white/20 uppercase tracking-wider mb-2">Earned Traits</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.traits.map(trait => (
              <span
                key={trait}
                className="px-2.5 py-1 text-[9px] border border-[#f97316]/20 bg-[#f97316]/5 text-[#f97316]/60"
              >
                <Award className="w-2.5 h-2.5 inline mr-1" />{trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Identity strip */}
      <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-white/15">
        <span>{driverName}</span>
        <div className="flex items-center gap-3">
          {iRating && <span>{iRating} iR</span>}
          {safetyRating && <span>{safetyRating} SR</span>}
        </div>
      </div>
    </div>
  );
}
