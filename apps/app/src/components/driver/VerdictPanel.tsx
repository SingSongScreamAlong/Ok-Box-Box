import { 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  ChevronRight,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EngineerVerdict } from '../../services/EngineerCore';

interface VerdictPanelProps {
  verdict: EngineerVerdict;
  trackName: string | null;
  sessionType: string | null;
  onDismiss?: () => void;
}

/**
 * VerdictPanel - Post-Run Engineer Verdict
 * 
 * Purpose: Convert effort into progress
 * 
 * Shows:
 * - One clear verdict (good / salvage / poor / incomplete)
 * - Top 2 performance insights
 * - One actionable change for next run
 * - Emotional framing
 * 
 * Everything else is collapsible/secondary.
 */
export function VerdictPanel({ verdict, trackName, sessionType, onDismiss }: VerdictPanelProps) {
  const getSentimentStyle = (sentiment: EngineerVerdict['sentiment']) => {
    switch (sentiment) {
      case 'positive': return {
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        text: 'text-green-400',
        icon: CheckCircle,
      };
      case 'concern': return {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: AlertTriangle,
      };
      default: return {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: TrendingUp,
      };
    }
  };

  const style = getSentimentStyle(verdict.sentiment);
  const SentimentIcon = style.icon;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Session Complete</div>
        <h2 className="text-lg font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {trackName || 'Session'} Debrief
        </h2>
        {sessionType && (
          <div className="text-xs text-white/40 uppercase mt-1">{sessionType}</div>
        )}
      </div>

      {/* Verdict Summary */}
      <div className={`${style.bg} ${style.border} border rounded p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${style.bg} rounded-full flex items-center justify-center`}>
            <SentimentIcon className={`w-5 h-5 ${style.text}`} />
          </div>
          <div className="flex-1">
            <div className={`text-sm font-semibold ${style.text}`}>{verdict.summary}</div>
            <div className="text-xs text-white/50 mt-1">
              Confidence: {Math.round(verdict.confidence * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Top Insights */}
      {verdict.topInsights.length > 0 && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-purple-400" />
            <div className="text-[10px] uppercase tracking-wider text-purple-400">Key Insights</div>
          </div>
          <div className="space-y-2">
            {verdict.topInsights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Change */}
      {verdict.actionableChange && (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-orange-500/30 rounded p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-orange-400 mb-1">Next Session Focus</div>
              <div className="text-sm text-white/90">{verdict.actionableChange}</div>
            </div>
          </div>
        </div>
      )}

      {/* Emotional Framing */}
      <div className="text-center py-4">
        <div className="text-sm text-white/60 italic">"{verdict.emotionalFraming}"</div>
        <div className="text-[10px] text-orange-400/60 uppercase tracking-wider mt-2">— Your Engineer</div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <Link 
          to="/driver/crew/analyst"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-xs uppercase tracking-wider hover:bg-purple-500/30 transition-colors"
        >
          Deep Dive
          <ChevronRight className="w-3 h-3" />
        </Link>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
