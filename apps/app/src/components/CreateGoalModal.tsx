/**
 * CreateGoalModal Component
 * 
 * Modal for creating new goals manually.
 */

import { useState } from 'react';
import { X, Target, TrendingUp, Shield, Clock, Trophy, Medal, CheckCircle } from 'lucide-react';
import { CreateGoalInput, createGoal, Goal } from '../lib/goalsService';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (goal: Goal) => void;
}

const categories = [
  { value: 'irating', label: 'iRating', icon: TrendingUp, color: 'text-blue-400' },
  { value: 'safety_rating', label: 'Safety Rating', icon: Shield, color: 'text-green-400' },
  { value: 'lap_time', label: 'Lap Time', icon: Clock, color: 'text-purple-400' },
  { value: 'consistency', label: 'Consistency', icon: Target, color: 'text-yellow-400' },
  { value: 'wins', label: 'Wins', icon: Trophy, color: 'text-amber-400' },
  { value: 'podiums', label: 'Podiums', icon: Medal, color: 'text-orange-400' },
  { value: 'clean_races', label: 'Clean Races', icon: CheckCircle, color: 'text-emerald-400' },
  { value: 'custom', label: 'Custom', icon: Target, color: 'text-gray-400' },
] as const;

const disciplines = [
  { value: '', label: 'Any Discipline' },
  { value: 'road', label: 'Road' },
  { value: 'oval', label: 'Oval' },
  { value: 'dirt_road', label: 'Dirt Road' },
  { value: 'dirt_oval', label: 'Dirt Oval' },
];

export function CreateGoalModal({ isOpen, onClose, onCreated }: CreateGoalModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateGoalInput>({
    title: '',
    description: '',
    category: 'custom',
    targetValue: 0,
    currentValue: 0,
    unit: '',
    discipline: '',
    priority: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Please enter a goal title');
      return;
    }

    if (formData.targetValue <= 0) {
      setError('Please enter a valid target value');
      return;
    }

    setLoading(true);
    const goal = await createGoal(formData);
    setLoading(false);

    if (goal) {
      onCreated?.(goal as Goal);
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'custom',
        targetValue: 0,
        currentValue: 0,
        unit: '',
        discipline: '',
        priority: 5,
      });
    } else {
      setError('Failed to create goal. Please try again.');
    }
  };

  const handleCategoryChange = (category: CreateGoalInput['category']) => {
    // Auto-fill some defaults based on category
    const defaults: Partial<CreateGoalInput> = { category };
    
    switch (category) {
      case 'irating':
        defaults.unit = 'iR';
        defaults.title = 'Reach iRating Milestone';
        break;
      case 'safety_rating':
        defaults.unit = 'SR';
        defaults.title = 'Improve Safety Rating';
        break;
      case 'lap_time':
        defaults.unit = 'ms';
        defaults.title = 'Beat Personal Best';
        break;
      case 'wins':
        defaults.unit = 'wins';
        defaults.title = 'Win Races';
        break;
      case 'podiums':
        defaults.unit = 'podiums';
        defaults.title = 'Podium Finishes';
        break;
      case 'clean_races':
        defaults.unit = 'races';
        defaults.title = 'Complete Clean Races';
        break;
      case 'consistency':
        defaults.unit = '%';
        defaults.title = 'Improve Consistency';
        break;
    }

    setFormData(prev => ({ ...prev, ...defaults }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#0d0d0d] border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-medium text-white/90">Create New Goal</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-xs text-white/50 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = formData.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      isSelected 
                        ? 'bg-white/[0.08] border-white/20' 
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto ${cat.color}`} />
                    <span className="text-[10px] text-white/60 mt-1 block">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Goal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Reach 2000 iRating"
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add details about your goal..."
              rows={2}
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>

          {/* Values Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Current Value</label>
              <input
                type="number"
                value={formData.currentValue}
                onChange={e => setFormData(prev => ({ ...prev, currentValue: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Target Value</label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={e => setFormData(prev => ({ ...prev, targetValue: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="iR, SR, etc."
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Discipline & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Discipline</label>
              <select
                value={formData.discipline}
                onChange={e => setFormData(prev => ({ ...prev, discipline: e.target.value }))}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 focus:outline-none focus:border-white/20"
                style={{ colorScheme: 'dark' }}
              >
                {disciplines.map(d => (
                  <option key={d.value} value={d.value} className="bg-[#1a1a1a]">{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Priority (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: Math.min(10, Math.max(1, parseInt(e.target.value) || 5)) }))}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Deadline (optional)</label>
            <input
              type="date"
              value={formData.deadline || ''}
              onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value || undefined }))}
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/90 focus:outline-none focus:border-white/20"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGoalModal;
