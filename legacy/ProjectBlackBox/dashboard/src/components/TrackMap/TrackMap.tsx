import React, { useMemo, useState, useEffect } from 'react';
import { TelemetryData } from '../../services/WebSocketService';
import { tracks, TrackDefinition } from '../../data/tracks/TrackRegistry';
import { trackAssetService } from '../../services/TrackAssetService';

interface TrackMapProps {
  telemetryData: TelemetryData | null;
  trackName?: string;
}

const TrackMap: React.FC<TrackMapProps> = ({ telemetryData, trackName = 'Silverstone' }) => {
  // State for dynamic SVG url
  const [dynamicMapUrl, setDynamicMapUrl] = useState<string | null>(null);

  // Initialize service and try to fetch dynamic map
  useEffect(() => {
    const fetchMap = async () => {
      await trackAssetService.initialize();
      const url = trackAssetService.getTrackMapUrl(trackName);
      if (url) {
        setDynamicMapUrl(url);
      } else {
        setDynamicMapUrl(null);
      }
    };
    fetchMap();
  }, [trackName]);

  // Find track definition from registry as fallback or for metadata
  const trackDef: TrackDefinition = useMemo(() => {
    const staticData = trackAssetService.getStaticTrackData(trackName);
    return staticData || tracks['Silverstone'];
  }, [trackName]);

  // State for session trace (dynamic map improvement)
  const [sessionTrace, setSessionTrace] = useState<{ x: number, y: number }[]>([]);

  // Update session trace with new telemetry data
  useEffect(() => {
    if (telemetryData) {
      // Map telemetry position to SVG coordinates
      // NOTE: This is a placeholder mapping. Real implementation needs proper 
      // coordinate transform from Game World (meters) to SVG ViewBox.
      // We are simulating this by using "normalized" mock data if available, 
      // or just mapping raw if it looks compatible.
      let viewBox = [0, 0, 1000, 1000]; // Default
      if (trackDef && trackDef.viewBox) {
        viewBox = trackDef.viewBox.split(' ').map(Number);
      }

      const width = viewBox[2];
      const height = viewBox[3];

      // HACK: Simulating position for demo since we don't have real GPS stream matching SVG
      // In a real app, 'telemetryData.position' would be used with a scale factor
      const simulatedX = (telemetryData.position?.x || 0) % width;
      const simulatedY = (telemetryData.position?.y || 0) % height;

      setSessionTrace(prev => {
        // Only add point if it moved significantly to save performance
        const last = prev[prev.length - 1];
        if (last && Math.abs(last.x - simulatedX) < 2 && Math.abs(last.y - simulatedY) < 2) {
          return prev;
        }
        // Limit trace size to last 500 points to prevent memory leak
        const newTrace = [...prev, { x: simulatedX, y: simulatedY }];
        if (newTrace.length > 500) return newTrace.slice(-500);
        return newTrace;
      });
    }
  }, [telemetryData, trackDef]);

  // Car Position Calculation - Use trackPosition (0-1) to interpolate along the track path
  // For now, use a simple circular interpolation as fallback
  const trackProgress = telemetryData?.trackPosition || 0;
  const viewBoxParts = trackDef.viewBox.split(' ').map(Number);
  const centerX = viewBoxParts[2] / 2;
  const centerY = viewBoxParts[3] / 2;
  const radius = Math.min(centerX, centerY) * 0.6;
  
  // Calculate position along track (simplified circular path)
  const angle = trackProgress * Math.PI * 2 - Math.PI / 2;
  const carX = telemetryData ? centerX + Math.cos(angle) * radius : centerX;
  const carY = telemetryData ? centerY + Math.sin(angle) * radius : centerY;

  return (
    <div className="panel track-map-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{trackName}</span>
        <span style={{ fontSize: '0.8em', opacity: 0.7 }}>
          Map Source: {dynamicMapUrl ? 'iRacing Data' : (trackDef.name !== 'Silverstone' ? 'Library' : 'Default')}
        </span>
      </div>

      <div className="track-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
        {dynamicMapUrl ? (
          // Dynamic SVG from Asset
          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={dynamicMapUrl} alt={trackName} style={{ maxWidth: '100%', maxHeight: '100%', filter: 'invert(1)' }} />
            {/*  Note: We can't easily overlay live telemetry on an IMG tag cleanly without knowing its internal coordinate system matches our mock.
                      For now, we just show the map if available. If we want telemetry overlay, we'd need to fetch the SVG text and inject it inline.
                  */}
          </div>
        ) : (
          // Fallback to Static SVG
          <svg
            width="100%"
            height="100%"
            viewBox={trackDef.viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible' }}
          >
            {/* Grid background effect */}
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Base Static Track Map */}
            <path
              d={trackDef.path}
              fill="none"
              stroke={trackDef.style.strokeColor}
              strokeWidth="15"
              strokeOpacity="0.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Active Track Line (Brighter) */}
            <path
              d={trackDef.path}
              fill="none"
              stroke={trackDef.style.strokeColor}
              strokeWidth="3"
              strokeOpacity="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 4px rgba(255,255,255,0.3))"
            />

            {/* User-Driven Data Trace (The "Learning" Part) */}
            {sessionTrace.length > 1 && (
              <polyline
                points={sessionTrace.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#00ff9d" // Green for user path
                strokeWidth="2"
                strokeDasharray="4 2"
                opacity="0.8"
              />
            )}

            {/* Corner Markers */}
            {trackDef.corners.map(corner => (
              <g key={corner.id} transform={`translate(${corner.x}, ${corner.y})`}>
                <circle r="4" fill="#fff" opacity="0.5" />
                <text
                  y="-10"
                  fill="#fff"
                  fontSize="24"
                  textAnchor="middle"
                  opacity="0.7"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                >
                  {corner.id}
                </text>
              </g>
            ))}

            {/* Car Marker */}
            {telemetryData && (
              <g transform={`translate(${carX}, ${carY})`}>
                <circle r="12" fill={trackDef.style.strokeColor} fillOpacity="0.3">
                  <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle r="6" fill="#fff" stroke="#000" strokeWidth="2" />
              </g>
            )}
          </svg>
        )}

        {/* Track Info Overlay */}
        <div className="track-info" style={{ pointerEvents: 'none' }}>
          <div className="track-info-item">
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackMap;
