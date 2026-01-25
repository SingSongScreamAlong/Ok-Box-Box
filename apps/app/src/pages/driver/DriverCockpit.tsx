import { useRef, useEffect } from 'react';
import { useDriverState } from '../../hooks/useDriverState';
import { BriefingCard } from './states/BriefingCard';
import { LiveCockpit } from './states/LiveCockpit';
import { DebriefCard } from './states/DebriefCard';
import { ProgressView } from './states/ProgressView';
import { SeasonView } from './states/SeasonView';

/**
 * DriverCockpit - The state-aware entry point for the Driver Tier
 * 
 * This component detects the driver's current state in their racing lifecycle
 * and renders the appropriate view automatically. No navigation required.
 * 
 * States:
 * - PRE_SESSION: Briefing card with track notes, weather, setup
 * - IN_CAR: Minimal live cockpit with interrupt-driven alerts
 * - POST_RUN: Debrief card with key moments and insights
 * - BETWEEN_SESSIONS: Progress view with trends and practice suggestions
 * - SEASON_LEVEL: Season summary with rating trajectory
 */
export function DriverCockpit() {
  const { state, sessionMemory, timeSinceLastSession, isLive, confidence } = useDriverState();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  // Render the appropriate view based on driver state
  const renderStateView = () => {
    switch (state) {
      case 'PRE_SESSION':
        return <BriefingCard />;
      case 'IN_CAR':
        return <LiveCockpit />;
      case 'POST_RUN':
        return (
          <DebriefCard 
            sessionMemory={sessionMemory}
            timeSinceSession={timeSinceLastSession}
          />
        );
      case 'BETWEEN_SESSIONS':
        return (
          <ProgressView 
            sessionMemory={sessionMemory}
            timeSinceSession={timeSinceLastSession}
          />
        );
      case 'SEASON_LEVEL':
        return (
          <SeasonView 
            sessionMemory={sessionMemory}
          />
        );
      default:
        return <ProgressView sessionMemory={sessionMemory} timeSinceSession={null} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Subtle video background for non-live states */}
      {!isLive && (
        <>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover opacity-15"
            style={{ zIndex: 0 }}
          >
            <source src="https://okboxbox.com/video/okbb-bg.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90" style={{ zIndex: 1 }} />
        </>
      )}

      {/* State indicator (dev mode) */}
      {import.meta.env.DEV && (
        <div className="fixed top-2 right-2 z-50 bg-black/80 border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wider">
          <span className="text-white/40">State:</span>{' '}
          <span className={`font-semibold ${
            state === 'IN_CAR' ? 'text-green-400' :
            state === 'POST_RUN' ? 'text-orange-400' :
            state === 'PRE_SESSION' ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {state}
          </span>
          <span className="text-white/30 ml-2">({Math.round(confidence * 100)}%)</span>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10">
        {renderStateView()}
      </div>
    </div>
  );
}
