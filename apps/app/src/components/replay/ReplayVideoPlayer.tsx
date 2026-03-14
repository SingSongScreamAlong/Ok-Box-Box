/**
 * ReplayVideoPlayer — HTML5 video player for replay clips
 *
 * Features:
 * - Play/pause/seek with keyboard shortcuts
 * - Playback speed control (0.25x - 2x)
 * - Exposes currentTime for telemetry sync
 * - Event markers on the video timeline
 * - Fullscreen support
 *
 * Phase: Replay Intelligence
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize2, Minimize2, RotateCcw
} from 'lucide-react';

interface TimelineMarker {
  id: string;
  timeSeconds: number;
  type: 'incident' | 'pass' | 'coaching' | 'manual';
  label: string;
  color?: string;
}

interface ReplayVideoPlayerProps {
  src: string;
  markers?: TimelineMarker[];
  onTimeUpdate?: (timeSeconds: number) => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
  autoPlay?: boolean;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MARKER_COLORS: Record<string, string> = {
  incident: 'bg-red-500',
  pass: 'bg-green-500',
  coaching: 'bg-blue-500',
  manual: 'bg-yellow-500',
};

export function ReplayVideoPlayer({
  src,
  markers = [],
  onTimeUpdate,
  onMarkerClick,
  autoPlay = false,
}: ReplayVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number>(0);

  // ─── Video Events ─────────────────────

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onTimeUpdate?.(video.currentTime);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    if (autoPlay) {
      video.play().catch(() => {});
    }
  }, [autoPlay]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  // ─── Controls ─────────────────────────

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, time));
  }, [duration]);

  const skip = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + delta));
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }, [speed]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const restart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  // ─── Keyboard Shortcuts ───────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, skip, toggleFullscreen, toggleMute]);

  // ─── Auto-hide controls ───────────────

  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // ─── Timeline click ───────────────────

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  }, [duration, seek]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) {
    return (
      <div className="aspect-video bg-black/80 border border-white/10 flex items-center justify-center">
        <p className="text-[11px] text-white/25">No clip selected</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black border border-white/10 group"
      onMouseMove={showControlsBriefly}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        muted={isMuted}
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-2 px-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline bar */}
        <div
          className="h-6 flex items-center cursor-pointer mb-1 group/timeline"
          onClick={handleTimelineClick}
        >
          <div className="w-full h-1.5 bg-white/10 relative group-hover/timeline:h-2.5 transition-all">
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-[#f97316]/80"
              style={{ width: `${progress}%` }}
            />

            {/* Markers */}
            {markers.map(marker => {
              const pct = duration > 0 ? (marker.timeSeconds / duration) * 100 : 0;
              return (
                <button
                  key={marker.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-black/50 ${MARKER_COLORS[marker.type] || 'bg-white'} hover:scale-150 transition-transform z-10`}
                  style={{ left: `${pct}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(marker.timeSeconds);
                    onMarkerClick?.(marker);
                  }}
                  title={marker.label}
                />
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#f97316] shadow-md opacity-0 group-hover/timeline:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Restart */}
            <button onClick={restart} className="p-1.5 text-white/50 hover:text-white transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Skip back */}
            <button onClick={() => skip(-5)} className="p-1.5 text-white/50 hover:text-white transition-colors">
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Play/Pause */}
            <button onClick={togglePlay} className="p-2 text-white hover:text-[#f97316] transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Skip forward */}
            <button onClick={() => skip(5)} className="p-1.5 text-white/50 hover:text-white transition-colors">
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Time display */}
            <span className="text-[10px] font-mono text-white/50 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed */}
            <button
              onClick={cycleSpeed}
              className="px-2 py-0.5 text-[9px] font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
            >
              {speed}x
            </button>

            {/* Volume */}
            <button onClick={toggleMute} className="p-1.5 text-white/50 hover:text-white transition-colors">
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="p-1.5 text-white/50 hover:text-white transition-colors">
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Big play button overlay when paused */}
      {!isPlaying && showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
