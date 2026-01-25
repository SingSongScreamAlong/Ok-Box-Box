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

// F1-style track map with thick colored track, sector colors, and car positions
function TrackMapSVG({ 
  trackId, 
  carPosition, 
  currentSector, 
  className 
}: TrackMapRiveProps) {
  const trackData = getTrackSVGData(trackId);
  const vb = trackData.viewBox.split(' ').map(Number);
  
  // Sector colors matching F1 style
  const sectorColors = {
    1: '#eab308', // Yellow - Sector 1
    2: '#22c55e', // Green - Sector 2  
    3: '#a855f7', // Purple - Sector 3
  };
  
  // Default track color (yellow like F1)
  const trackColor = currentSector ? sectorColors[currentSector as 1|2|3] : '#eab308';
  
  return (
    <svg 
      viewBox={trackData.viewBox} 
      className={`w-full h-full ${className || ''}`}
      style={{ background: 'transparent' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Glow filter for track */}
        <filter id="trackGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Glow for car marker */}
        <filter id="carGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Track shadow/outline */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke="#000000" 
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      
      {/* Main track - thick yellow/colored line like F1 */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke={trackColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#trackGlow)"
      />
      
      {/* Track edge highlights */}
      <path 
        d={trackData.path} 
        fill="none" 
        stroke="#ffffff"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.1"
      />
      
      {/* Corner number markers */}
      {trackData.corners.map((corner) => {
        const cx = corner.apex.x;
        const cy = corner.apex.y;
        
        return (
          <g key={corner.number}>
            {/* Corner marker circle */}
            <circle 
              cx={cx}
              cy={cy}
              r="14" 
              fill="#1a1a2e"
              stroke={corner.difficulty === 'hard' ? '#ef4444' : corner.difficulty === 'medium' ? '#f97316' : '#22c55e'}
              strokeWidth="2"
            />
            {/* Corner number */}
            <text 
              x={cx}
              y={cy + 4}
              fill="#ffffff" 
              fontSize="11" 
              textAnchor="middle"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              {corner.number}
            </text>
          </g>
        );
      })}
      
      {/* Sector labels */}
      <g>
        <text x={vb[2] * 0.25} y={vb[3] * 0.15} fill="#eab308" fontSize="12" fontWeight="bold" opacity="0.7">SECTOR 1</text>
        <text x={vb[2] * 0.7} y={vb[3] * 0.4} fill="#22c55e" fontSize="12" fontWeight="bold" opacity="0.7">SECTOR 2</text>
        <text x={vb[2] * 0.4} y={vb[3] * 0.85} fill="#a855f7" fontSize="12" fontWeight="bold" opacity="0.7">SECTOR 3</text>
      </g>
      
      {/* Start/Finish line */}
      <g transform={`translate(${vb[2] * 0.08}, ${vb[3] * 0.45})`}>
        <rect x="0" y="0" width="20" height="3" fill="#ffffff"/>
        <rect x="0" y="5" width="20" height="3" fill="#000000"/>
        <rect x="0" y="10" width="20" height="3" fill="#ffffff"/>
      </g>
      
      {/* Car position indicator */}
      {carPosition && (
        <g transform={`translate(${carPosition.x * vb[2]}, ${carPosition.y * vb[3]})`}>
          {/* Outer glow */}
          <circle r="12" fill="#00d4ff" opacity="0.3" filter="url(#carGlow)">
            <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          {/* Car dot */}
          <circle r="8" fill="#00d4ff" stroke="#ffffff" strokeWidth="2"/>
          {/* Inner highlight */}
          <circle r="3" fill="#ffffff" opacity="0.8"/>
        </g>
      )}
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
