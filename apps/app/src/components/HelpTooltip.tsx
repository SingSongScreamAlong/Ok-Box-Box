import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ title, content, position = 'top' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white/30 hover:text-white/60 transition-colors"
        aria-label="Help"
      >
        <HelpCircle size={14} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute z-50 w-64 ${positionClasses[position]}`}>
            <div className="bg-[#1a1a1a] border border-white/20 shadow-xl">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">{title}</span>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                  <X size={12} />
                </button>
              </div>
              <div className="p-3 text-xs text-white/60 leading-relaxed">
                {content}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface FeatureHighlightProps {
  children: React.ReactNode;
  label: string;
  description: string;
  isNew?: boolean;
}

export function FeatureHighlight({ children, label, description, isNew = false }: FeatureHighlightProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative group">
      {isNew && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#f97316] rounded-full animate-pulse z-10" />
      )}
      <div
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {children}
      </div>
      {showTip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 pointer-events-none">
          <div className="bg-[#1a1a1a] border border-white/20 p-2 shadow-xl">
            <div className="text-[10px] font-semibold text-[#f97316] uppercase tracking-wider mb-1">{label}</div>
            <div className="text-[10px] text-white/50 leading-relaxed">{description}</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WelcomeBannerProps {
  title: string;
  subtitle: string;
  features: { icon: React.ReactNode; label: string; description: string }[];
  onDismiss: () => void;
}

export function WelcomeBanner({ title, subtitle, features, onDismiss }: WelcomeBannerProps) {
  return (
    <div className="bg-gradient-to-r from-[#f97316]/10 via-[#111] to-[#3b82f6]/10 border border-white/10 mb-6">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 
              className="text-lg font-bold text-white tracking-wide"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {title}
            </h2>
            <p className="text-sm text-white/50 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/30 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white/5 border border-white/5">
              <div className="text-[#f97316]">{feature.icon}</div>
              <div>
                <div className="text-xs font-semibold text-white">{feature.label}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{feature.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface QuickStatProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  help?: string;
}

export function QuickStat({ label, value, subtext, trend, help }: QuickStatProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-white/40'
  };

  return (
    <div className="bg-[#111] border border-white/10 p-4 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
        {help && <HelpTooltip title={label} content={help} />}
      </div>
      <div className={`text-xl font-bold font-mono ${trend ? trendColors[trend] : 'text-white'}`}>
        {value}
      </div>
      {subtext && (
        <div className="text-[10px] text-white/30 mt-1">{subtext}</div>
      )}
    </div>
  );
}

interface ProTipProps {
  tip: string;
  action?: { label: string; onClick: () => void };
}

export function ProTip({ tip, action }: ProTipProps) {
  return (
    <div className="bg-[#f97316]/5 border border-[#f97316]/20 p-3 flex items-center gap-3">
      <div className="text-[10px] font-bold text-[#f97316] uppercase tracking-wider whitespace-nowrap">Pro Tip</div>
      <div className="text-xs text-white/60 flex-1">{tip}</div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[10px] text-[#f97316] hover:text-[#f97316]/80 uppercase tracking-wider whitespace-nowrap"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
