/**
 * ClipSelector — Lists available replay clips for a session
 *
 * Shows event type, label, timestamp, severity, and duration.
 * Click to load a clip into the video player.
 *
 * Phase: Replay Intelligence
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle, Flag, Target, MessageSquare,
  Clock, Film, Search
} from 'lucide-react';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };

export interface ClipInfo {
  clipId: string;
  sessionId: string;
  eventType: string;
  eventLabel: string;
  severity: string;
  sessionTimeMs: number;
  wallClockEvent: number;
  durationMs: number;
  frameCount: number;
  resolution: string;
  filePath: string;
  fileSizeBytes: number;
  serveUrl?: string;
  telemetrySync: {
    sessionTimeMsAtFrame0: number;
    fps: number;
  };
}

interface ClipSelectorProps {
  clips: ClipInfo[];
  activeClipId?: string;
  onSelectClip: (clip: ClipInfo) => void;
  loading?: boolean;
}

const EVENT_ICONS: Record<string, typeof AlertTriangle> = {
  incident: AlertTriangle,
  pass: Flag,
  coaching: Target,
  coaching_note: Target,
  manual: MessageSquare,
  mistake: AlertTriangle,
};

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  incident: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  pass: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  coaching: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  coaching_note: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  manual: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  mistake: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
};

const SEVERITY_DOTS: Record<string, string> = {
  minor: 'bg-yellow-400',
  moderate: 'bg-orange-400',
  major: 'bg-red-400',
};

function formatSessionTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ClipSelector({
  clips,
  activeClipId,
  onSelectClip,
  loading = false,
}: ClipSelectorProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const eventTypes = useMemo(() => {
    const types = new Set(clips.map(c => c.eventType));
    return ['all', ...Array.from(types)];
  }, [clips]);

  const filteredClips = useMemo(() => {
    let result = clips;
    if (filter !== 'all') {
      result = result.filter(c => c.eventType === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.eventLabel.toLowerCase().includes(q));
    }
    return result.sort((a, b) => a.sessionTimeMs - b.sessionTimeMs);
  }, [clips, filter, search]);

  if (loading) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80 p-4">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-white/20 animate-pulse" />
          <span className="text-[11px] text-white/30">Loading clips...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80 flex flex-col max-h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h3 className="text-[11px] uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>
            Clips
          </h3>
          <span className="text-[9px] text-white/20 ml-1">{filteredClips.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-white/[0.04] flex-shrink-0 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clips..."
            className="w-full bg-white/[0.03] border border-white/[0.06] pl-7 pr-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Type filter */}
        {eventTypes.length > 2 && (
          <div className="flex flex-wrap gap-1">
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-[8px] px-2 py-0.5 border uppercase tracking-wider transition-colors ${
                  filter === type
                    ? 'border-[#f97316]/30 text-[#f97316] bg-[#f97316]/10'
                    : 'border-white/[0.06] text-white/25 hover:text-white/40'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clip list */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
        {filteredClips.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Film className="w-5 h-5 text-white/10 mx-auto mb-2" />
            <p className="text-[10px] text-white/20">
              {clips.length === 0 ? 'No clips recorded yet' : 'No matching clips'}
            </p>
          </div>
        ) : (
          filteredClips.map(clip => {
            const isActive = clip.clipId === activeClipId;
            const colors = EVENT_COLORS[clip.eventType] || EVENT_COLORS.manual;
            const Icon = EVENT_ICONS[clip.eventType] || MessageSquare;
            const severityDot = SEVERITY_DOTS[clip.severity] || SEVERITY_DOTS.minor;

            return (
              <button
                key={clip.clipId}
                onClick={() => onSelectClip(clip)}
                className={`w-full px-3 py-2.5 text-left flex items-start gap-2.5 transition-colors ${
                  isActive
                    ? 'bg-[#f97316]/[0.06] border-l-2 border-l-[#f97316]'
                    : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                }`}
              >
                {/* Event icon */}
                <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center border ${colors.border} ${colors.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                </div>

                {/* Clip info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium truncate ${isActive ? 'text-[#f97316]' : 'text-white/60'}`}>
                      {clip.eventLabel || clip.eventType}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityDot}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[8px] text-white/20">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatSessionTime(clip.sessionTimeMs)}
                    </span>
                    <span>{formatDuration(clip.durationMs)}</span>
                    <span>{formatFileSize(clip.fileSizeBytes)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
