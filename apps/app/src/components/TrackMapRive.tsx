import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { useEffect } from 'react';

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

// Track SVG paths - these would ideally come from .riv files
// For now, we'll create a fallback SVG component
const TRACK_PATHS: Record<string, { path: string; viewBox: string; sectors: string[] }> = {
  'watkins-glen': {
    viewBox: '0 0 400 300',
    path: 'M 50,150 Q 50,50 150,50 L 250,50 Q 350,50 350,100 L 350,150 Q 350,200 300,200 L 200,200 Q 150,200 150,250 L 150,280 Q 150,290 100,290 L 60,290 Q 50,290 50,250 Z',
    sectors: [
      'M 50,150 Q 50,50 150,50 L 250,50', // S1 - Esses
      'Q 350,50 350,100 L 350,150 Q 350,200 300,200 L 200,200', // S2 - Back straight
      'Q 150,200 150,250 L 150,280 Q 150,290 100,290 L 60,290 Q 50,290 50,250 Z M 50,150', // S3 - Boot
    ],
  },
  'spa': {
    viewBox: '0 0 500 350',
    path: 'M 50,300 L 50,250 Q 50,200 100,180 L 150,160 Q 200,140 200,100 L 200,80 Q 200,50 250,50 L 350,50 Q 400,50 420,100 L 450,200 Q 470,280 400,300 L 200,300 Q 100,300 50,300 Z',
    sectors: [
      'M 50,300 L 50,250 Q 50,200 100,180 L 150,160 Q 200,140 200,100', // S1 - La Source to Eau Rouge
      'L 200,80 Q 200,50 250,50 L 350,50 Q 400,50 420,100 L 450,200', // S2 - Kemmel to Rivage
      'Q 470,280 400,300 L 200,300 Q 100,300 50,300 Z', // S3 - Bus Stop
    ],
  },
  'laguna-seca': {
    viewBox: '0 0 400 300',
    path: 'M 50,200 L 50,100 Q 50,50 100,50 L 200,50 Q 250,50 280,80 L 320,120 Q 350,150 350,200 L 350,250 Q 350,280 300,280 L 100,280 Q 50,280 50,200 Z',
    sectors: [
      'M 50,200 L 50,100 Q 50,50 100,50 L 200,50', // S1 - Andretti Hairpin
      'Q 250,50 280,80 L 320,120 Q 350,150 350,200', // S2 - Corkscrew
      'L 350,250 Q 350,280 300,280 L 100,280 Q 50,280 50,200 Z', // S3 - Rainey Curve
    ],
  },
};

const getSectorColor = (delta: number | undefined) => {
  if (delta === undefined) return '#ffffff20';
  if (delta < -0.1) return '#22c55e'; // Green - faster
  if (delta > 0.1) return '#ef4444'; // Red - slower
  return '#eab308'; // Yellow - neutral
};

// Fallback SVG-based track map (until .riv files are created)
function TrackMapSVG({ 
  trackId, 
  carPosition, 
  currentSector, 
  sectorDeltas,
  highlightDangerZones,
  highlightPassingZones,
  className 
}: TrackMapRiveProps) {
  const trackData = TRACK_PATHS[trackId] || TRACK_PATHS['watkins-glen'];
  
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
      
      {/* Sector highlights */}
      {trackData.sectors.map((sectorPath, i) => (
        <path
          key={i}
          d={sectorPath}
          fill="none"
          stroke={currentSector === i + 1 ? '#f97316' : getSectorColor(sectorDeltas?.[i])}
          strokeWidth={currentSector === i + 1 ? 8 : 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={currentSector === i + 1 ? 1 : 0.6}
          filter={currentSector === i + 1 ? 'url(#glow)' : undefined}
        />
      ))}
      
      {/* Track center line */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke="#ffffff40" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="10,10"
      />
      
      {/* Car position indicator */}
      {carPosition && (
        <g transform={`translate(${carPosition.x * 400}, ${carPosition.y * 300})`}>
          <circle r="8" fill="#f97316" filter="url(#glow)">
            <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite"/>
          </circle>
          <circle r="4" fill="#ffffff"/>
        </g>
      )}
      
      {/* Start/Finish line */}
      <line x1="45" y1="145" x2="55" y2="155" stroke="#ffffff" strokeWidth="3"/>
      
      {/* Sector labels */}
      <text x="150" y="35" fill="#ffffff60" fontSize="10" textAnchor="middle">S1</text>
      <text x="340" y="175" fill="#ffffff60" fontSize="10" textAnchor="middle">S2</text>
      <text x="100" y="270" fill="#ffffff60" fontSize="10" textAnchor="middle">S3</text>
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
