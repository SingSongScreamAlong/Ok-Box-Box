import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLeague, getUserLeagueRole, League } from '../lib/leagues';
import { 
  getRulebook, 
  updateRulebook,
  Rulebook, 
  Rule,
  RULE_CATEGORIES,
  SEVERITY_LEVELS,
  PENALTY_TYPES
} from '../lib/rulebooks';
import { 
  ArrowLeft, Book, Plus, Trash2, Edit2, Save, X, 
  ChevronDown, ChevronUp
} from 'lucide-react';

export function LeagueRulebook() {
  const { leagueId, rulebookId } = useParams<{ leagueId: string; rulebookId: string }>();
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [rulebook, setRulebook] = useState<Rulebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (leagueId && rulebookId && user) {
      loadData();
    }
  }, [leagueId, rulebookId, user]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const loadData = async () => {
    if (!leagueId || !rulebookId || !user) return;

    const [leagueData, role, rulebookData] = await Promise.all([
      getLeague(leagueId),
      getUserLeagueRole(leagueId, user.id),
      getRulebook(rulebookId)
    ]);

    if (!leagueData || !role || !['owner', 'admin'].includes(role)) {
      return;
    }

    setLeague(leagueData);
    setRulebook(rulebookData);
    
    // Expand all categories that have rules
    if (rulebookData?.rules) {
      const cats = new Set(rulebookData.rules.map(r => r.category));
      setExpandedCategories(cats);
    }
    
    setLoading(false);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSaveRule = async (rule: Rule) => {
    if (!rulebook) return;

    setSaving(true);
    const existingIndex = rulebook.rules.findIndex(r => r.id === rule.id);
    let updatedRules: Rule[];

    if (existingIndex >= 0) {
      updatedRules = [...rulebook.rules];
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules = [...rulebook.rules, rule];
    }

    const result = await updateRulebook(rulebook.id, { rules: updatedRules });
    
    if (result.data) {
      setRulebook(result.data);
    }
    
    setEditingRule(null);
    setShowAddRule(false);
    setSaving(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!rulebook || !confirm('Are you sure you want to delete this rule?')) return;

    setSaving(true);
    const updatedRules = rulebook.rules.filter(r => r.id !== ruleId);
    const result = await updateRulebook(rulebook.id, { rules: updatedRules });
    
    if (result.data) {
      setRulebook(result.data);
    }
    
    setSaving(false);
  };

  const getRulesByCategory = (category: string) => {
    return rulebook?.rules.filter(r => r.category === category) || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/50">Loading rulebook...</div>
      </div>
    );
  }

  if (!rulebook) return null;

  return (
    <div className="min-h-screen relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/bg-1.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link 
          to={`/league/${leagueId}/settings`} 
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Book size={20} className="text-[#3b82f6]" />
              <h1 
                className="text-xl uppercase tracking-[0.15em] font-semibold text-white"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {rulebook.name}
              </h1>
            </div>
            <p className="text-sm text-white/50">
              {rulebook.description || 'No description'}
              {rulebook.version && <span className="ml-2 text-white/30">v{rulebook.version}</span>}
            </p>
          </div>
          <button
            onClick={() => setShowAddRule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30 rounded text-sm font-medium hover:bg-[#3b82f6]/30 transition-colors"
          >
            <Plus size={16} />
            Add Rule
          </button>
        </div>

        {/* Rules by Category */}
        <div className="space-y-4">
          {RULE_CATEGORIES.map(category => {
            const categoryRules = getRulesByCategory(category.value);
            const isExpanded = expandedCategories.has(category.value);

            return (
              <div 
                key={category.value}
                className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(category.value)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h2 
                      className="text-sm uppercase tracking-[0.12em] font-semibold text-white/80"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {category.label}
                    </h2>
                    <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded">
                      {categoryRules.length} rules
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-white/40" />
                  ) : (
                    <ChevronDown size={16} className="text-white/40" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-white/[0.06]">
                    {categoryRules.length === 0 ? (
                      <div className="p-4 text-center text-sm text-white/30">
                        No rules in this category
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {categoryRules.map(rule => (
                          <div 
                            key={rule.id}
                            className="p-4 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-[#3b82f6]">
                                    {rule.code}
                                  </span>
                                  <span className="text-sm font-medium text-white">
                                    {rule.name}
                                  </span>
                                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                    SEVERITY_LEVELS.find(s => s.value === rule.severity)?.color || ''
                                  }`}>
                                    {rule.severity}
                                  </span>
                                  {!rule.isActive && (
                                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/40 border border-white/20">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-white/50 mb-2">
                                  {rule.description}
                                </p>
                                <p className="text-xs text-white/30">
                                  Default: <span className="text-white/50">{rule.defaultPenalty}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingRule(rule)}
                                  className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 rounded transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add/Edit Rule Modal */}
        {(showAddRule || editingRule) && (
          <RuleEditor
            rule={editingRule}
            onSave={handleSaveRule}
            onCancel={() => {
              setEditingRule(null);
              setShowAddRule(false);
            }}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

interface RuleEditorProps {
  rule: Rule | null;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
  saving: boolean;
}

function RuleEditor({ rule, onSave, onCancel, saving }: RuleEditorProps) {
  const [formData, setFormData] = useState<Rule>(
    rule || {
      id: crypto.randomUUID(),
      code: '',
      name: '',
      description: '',
      category: 'contact',
      severity: 'minor',
      defaultPenalty: 'Warning',
      isActive: true
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#111111] border border-white/[0.12] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 
              className="text-sm uppercase tracking-[0.12em] font-semibold text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {rule ? 'Edit Rule' : 'Add Rule'}
            </h2>
            <button onClick={onCancel} className="text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Rule Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., 1.2.3"
                className="w-full bg-white/[0.03] border border-white/[0.10] rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.10] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              >
                {RULE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
              Rule Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Causing a Collision"
              className="w-full bg-white/[0.03] border border-white/[0.10] rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe when this rule applies..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.10] rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as Rule['severity'] })}
                className="w-full bg-white/[0.03] border border-white/[0.10] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              >
                {SEVERITY_LEVELS.map(sev => (
                  <option key={sev.value} value={sev.value}>{sev.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Default Penalty
              </label>
              <select
                value={formData.defaultPenalty}
                onChange={(e) => setFormData({ ...formData, defaultPenalty: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.10] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              >
                {PENALTY_TYPES.map(pen => (
                  <option key={pen.value} value={pen.label}>{pen.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.03]"
            />
            <label htmlFor="isActive" className="text-sm text-white/70">
              Rule is active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30 rounded text-sm font-medium hover:bg-[#3b82f6]/30 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
