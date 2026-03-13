import { useState, useEffect, useCallback } from 'react';
import { Target, Zap, Flag, Wrench, FlaskConical, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type SessionIntent = 'practice' | 'quali_sim' | 'race_sim' | 'limit_pushing' | 'testing';

interface IntentOption {
  value: SessionIntent;
  label: string;
  description: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    value: 'practice',
    label: 'Practice',
    description: 'Learning the track, working on consistency',
    icon: Wrench,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    value: 'quali_sim',
    label: 'Quali Sim',
    description: 'Pushing for best single-lap pace',
    icon: Zap,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    value: 'race_sim',
    label: 'Race Sim',
    description: 'Full race conditions, managing tires and fuel',
    icon: Flag,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
  {
    value: 'limit_pushing',
    label: 'Limit Pushing',
    description: 'Exploring the edge — incidents expected',
    icon: Target,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    value: 'testing',
    label: 'Testing',
    description: 'Setup changes, experiments, data collection',
    icon: FlaskConical,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
  },
];

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  return {};
}

const ORBITRON: React.CSSProperties = { fontFamily: "'Orbitron', sans-serif" };

export function SessionIntentPicker() {
  const [currentIntent, setCurrentIntent] = useState<SessionIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current intent
  useEffect(() => {
    async function load() {
      try {
        const auth = await getAuthHeader();
        if (!auth.Authorization) { setLoading(false); return; }
        const res = await fetch(`${API_BASE}/api/v1/drivers/me/session-intent`, {
          headers: { ...auth, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentIntent(data.intent);
        }
      } catch (e) {
        console.error('[Intent] Error loading:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const setIntent = useCallback(async (intent: SessionIntent) => {
    setSaving(true);
    try {
      const auth = await getAuthHeader();
      if (!auth.Authorization) return;
      const res = await fetch(`${API_BASE}/api/v1/drivers/me/session-intent`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      if (res.ok) {
        setCurrentIntent(intent);
      }
    } catch (e) {
      console.error('[Intent] Error saving:', e);
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) return null;

  const activeOption = INTENT_OPTIONS.find(o => o.value === currentIntent);

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Target className="w-4 h-4 text-white/30" />
          <div>
            <h2 className="text-sm uppercase tracking-[0.15em] text-white/60" style={ORBITRON}>Session Intent</h2>
            <p className="text-[9px] text-white/25 mt-0.5">How your next session will be analyzed</p>
          </div>
        </div>
        {activeOption && (
          <span className={`text-[10px] font-mono px-2 py-1 rounded border ${activeOption.bgColor} ${activeOption.color}`}>
            {activeOption.label}
          </span>
        )}
      </div>

      <div className="p-3 grid grid-cols-5 gap-1.5">
        {INTENT_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const isActive = currentIntent === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => setIntent(opt.value)}
              disabled={saving}
              className={`relative p-2.5 rounded border transition-all text-center group ${
                isActive
                  ? `${opt.bgColor} ${opt.color}`
                  : 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]'
              }`}
            >
              {isActive && (
                <CheckCircle className="w-3 h-3 absolute top-1 right-1 opacity-60" />
              )}
              <Icon className={`w-4 h-4 mx-auto mb-1.5 ${isActive ? opt.color : 'text-white/25 group-hover:text-white/40'}`} />
              <div className={`text-[9px] font-semibold uppercase tracking-wider ${isActive ? opt.color : 'text-white/40'}`}>
                {opt.label}
              </div>
              <div className={`text-[7px] mt-0.5 leading-tight ${isActive ? 'text-white/40' : 'text-white/15'}`}>
                {opt.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Interpretation context */}
      {activeOption && (
        <div className="px-5 py-2.5 border-t border-white/[0.04] text-[9px] text-white/25">
          {activeOption.value === 'practice' && 'Focus: consistency metrics. Incidents weighted lower.'}
          {activeOption.value === 'quali_sim' && 'Focus: best lap pace. Consistency weighted lower.'}
          {activeOption.value === 'race_sim' && 'Focus: full race performance. All metrics weighted normally.'}
          {activeOption.value === 'limit_pushing' && 'Focus: pushing limits. Incidents will not count against you.'}
          {activeOption.value === 'testing' && 'Focus: setup data. Performance metrics suppressed.'}
        </div>
      )}
    </div>
  );
}
