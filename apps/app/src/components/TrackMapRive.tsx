import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useEffect } from 'react';
import { getTrackData, TRACK_DATA, TrackData } from '../data/tracks';

interface TrackMapRiveProps {
  trackId: string;
  carPosition?: { x: number; y: number }; // 0-1 normalized position on track
  currentSector?: number; // 1, 2, 3
  sectorDeltas?: number[]; // [+0.2, -0.1, +0.3] seconds vs best
  highlightPassingZones?: boolean;
  highlightDangerZones?: boolean;
  speed?: number; // 0-300 km/h
  throttle?: number; // 0-100
  brake?: number; // 0-100
  showPitLane?: boolean;
  className?: string;
}

const getSectorColor = (delta: number | undefined) => {
  if (delta === undefined) return '#ffffff20';
  if (delta < -0.1) return '#22c55e'; // Green - faster
  if (delta > 0.1) return '#ef4444'; // Red - slower
  return '#eab308'; // Yellow - neutral
};

// Get track data from accurate database or use default
function getTrackSVGData(trackId: string): { viewBox: string; path: string; corners: TrackData['corners'] } {
  // Try to find track in database
  const track = TRACK_DATA[trackId] || getTrackData(trackId);
  
  if (track) {
    return {
      viewBox: track.svg.viewBox,
      path: track.svg.path,
      corners: track.corners
    };
  }
  
  // Fallback to Watkins Glen if not found
  const fallback = TRACK_DATA['watkins-glen'];
  return {
    viewBox: fallback.svg.viewBox,
    path: fallback.svg.path,
    corners: fallback.corners
  };
}

// Fallback SVG-based track map (until .riv files are created)
function TrackMapSVG({ 
  trackId, 
  carPosition, 
  currentSector, 
  sectorDeltas,
  className 
}: TrackMapRiveProps) {
  const trackData = getTrackSVGData(trackId);
  
  return (
    <svg 
      viewBox={trackData.viewBox} 
      className={`w-full h-full ${className || ''}`}
      style={{ background: 'transparent' }}
    >
      {/* Track outline glow */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      
      {/* Base track */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke="#ffffff10" 
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Main track path with sector coloring */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke={currentSector === 1 ? '#f97316' : currentSector === 2 ? '#3b82f6' : currentSector === 3 ? '#8b5cf6' : '#ffffff60'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={currentSector ? 'url(#glow)' : undefined}
      />
      
      {/* Track center line */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke="#ffffff30" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="8,8"
      />
      
      {/* Corner markers */}
      {trackData.corners.slice(0, 8).map((corner) => {
        // Parse viewBox to scale corner positions
        const vb = trackData.viewBox.split(' ').map(Number);
        const scaleX = vb[2] / 1300; // Normalize to viewBox
        const scaleY = vb[3] / 900;
        const cx = corner.apex.x * scaleX;
        const cy = (corner.apex.y + 800) * scaleY; // Offset for negative Y values
        
        return (
          <g key={corner.number} transform={`translate(${cx}, ${cy})`}>
            <circle 
              r="12" 
              fill={corner.difficulty === 'hard' ? '#ef4444' : corner.difficulty === 'medium' ? '#eab308' : '#22c55e'} 
              fillOpacity="0.3"
              stroke={corner.difficulty === 'hard' ? '#ef4444' : corner.difficulty === 'medium' ? '#eab308' : '#22c55e'}
              strokeWidth="1"
            />
            <text 
              y="4" 
              fill="#ffffff" 
              fontSize="10" 
              textAnchor="middle"
              fontWeight="bold"
            >
              {corner.number}
            </text>
          </g>
        );
      })}
      
      {/* Car position indicator */}
      {carPosition && (
        <g transform={`translate(${carPosition.x * parseFloat(trackData.viewBox.split(' ')[2])}, ${carPosition.y * parseFloat(trackData.viewBox.split(' ')[3])})`}>
          <circle r="10" fill="#f97316" filter="url(#glow)">
            <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite"/>
          </circle>
          <circle r="5" fill="#ffffff"/>
        </g>
      )}
      
      {/* Start/Finish marker */}
      <rect x="95" y="440" width="15" height="4" fill="#ffffff" rx="1"/>
      <rect x="95" y="446" width="15" height="4" fill="#000000" rx="1"/>
    </svg>
  );
}

export function TrackMapRive(props: TrackMapRiveProps) {
  const { trackId, className } = props;
  
  // Try to load Rive file, fall back to SVG
  const { rive, RiveComponent } = useRive({
    src: `/tracks/${trackId}.riv`,
    stateMachines: 'TrackState',
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    autoplay: true,
    onLoadError: () => {
      console.log(`[TrackMap] No .riv file for ${trackId}, using SVG fallback`);
    },
  });

  // State machine inputs for Rive
  const carXInput = useStateMachineInput(rive, 'TrackState', 'carX');
  const carYInput = useStateMachineInput(rive, 'TrackState', 'carY');
  const sectorInput = useStateMachineInput(rive, 'TrackState', 'currentSector');
  const speedInput = useStateMachineInput(rive, 'TrackState', 'speed');

  // Update Rive inputs when props change
  useEffect(() => {
    if (carXInput && props.carPosition) carXInput.value = props.carPosition.x * 100;
    if (carYInput && props.carPosition) carYInput.value = props.carPosition.y * 100;
    if (sectorInput && props.currentSector) sectorInput.value = props.currentSector;
    if (speedInput && props.speed) speedInput.value = props.speed;
  }, [props.carPosition, props.currentSector, props.speed, carXInput, carYInput, sectorInput, speedInput]);

  // If Rive fails to load, use SVG fallback
  if (!rive) {
    return <TrackMapSVG {...props} />;
  }

  return (
    <div className={`relative ${className || ''}`}>
      <RiveComponent />
    </div>
  );
}

// Simple wrapper for when you just need a static track display
export function TrackMapStatic({ trackName, className }: { trackName: string; className?: string }) {
  const trackId = trackName.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');
  return <TrackMapRive trackId={trackId} className={className} />;
}
