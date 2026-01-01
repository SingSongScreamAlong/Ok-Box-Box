import React, { useMemo, useState, useEffect } from 'react';
import { TelemetryData, CompetitorData } from '../../services/WebSocketService';
import { tracks, TrackDefinition } from '../../data/tracks/TrackRegistry';
import { trackAssetService } from '../../services/TrackAssetService';
import './FullTrackView.css';

interface VehiclePosition {
  id: string;
  name: string;
  position: number; // Race position (1st, 2nd, etc.)
  trackPosition: number; // 0-1 position on track
  gap: string;
  isPlayer: boolean;
  inPit: boolean;
  color: string;
}

interface FullTrackViewProps {
  telemetryData: TelemetryData | null;
  competitorData: CompetitorData[] | null;
  trackName?: string;
}

const FullTrackView: React.FC<FullTrackViewProps> = ({ 
  telemetryData, 
  competitorData,
  trackName = 'Silverstone' 
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showSectors, setShowSectors] = useState(true);
  const [showCorners, setShowCorners] = useState(true);

  // Find track definition
  const trackDef: TrackDefinition = useMemo(() => {
    const staticData = trackAssetService.getStaticTrackData(trackName);
    return staticData || tracks['Silverstone'];
  }, [trackName]);

  const viewBoxParts = trackDef.viewBox.split(' ').map(Number);
  const centerX = viewBoxParts[2] / 2;
  const centerY = viewBoxParts[3] / 2;
  const radius = Math.min(centerX, centerY) * 0.6;

  // Generate vehicle positions from competitor data
  const vehicles: VehiclePosition[] = useMemo(() => {
    const baseCompetitors = competitorData || [
      { position: 1, driver: 'VERSTAPPEN', gap: 'LEADER', lastLap: '1:27.654' },
      { position: 2, driver: 'HAMILTON', gap: '+2.576s', lastLap: '1:27.892' },
      { position: 3, driver: 'YOU', gap: '+3.821s', lastLap: '1:28.456' },
      { position: 4, driver: 'LECLERC', gap: '+6.697s', lastLap: '1:28.234' },
      { position: 5, driver: 'NORRIS', gap: '+8.455s', lastLap: '1:28.789' },
      { position: 6, driver: 'SAINZ', gap: '+12.234s', lastLap: '1:28.901' },
      { position: 7, driver: 'RUSSELL', gap: '+15.567s', lastLap: '1:29.012' },
      { position: 8, driver: 'PIASTRI', gap: '+18.890s', lastLap: '1:29.123' },
    ];

    const colors = ['#ffeb3b', '#c0c0c0', '#ff6b35', '#e10600', '#ff8700', '#e10600', '#27f4d2', '#ff8700'];
    
    return baseCompetitors.map((comp, index) => {
      // Simulate track positions based on race position and gaps
      // Leader is at player's track position + offset based on gap
      const playerTrackPos = telemetryData?.trackPosition || 0.5;
      let trackPos = playerTrackPos;
      
      if (comp.driver === 'YOU') {
        trackPos = playerTrackPos;
      } else if (comp.gap === 'LEADER') {
        // Leader is ahead
        const playerPos = baseCompetitors.find(c => c.driver === 'YOU')?.position || 3;
        const gapLaps = (playerPos - 1) * 0.02; // Approximate gap in track position
        trackPos = (playerTrackPos + gapLaps) % 1;
      } else {
        // Calculate position based on gap
        const gapSeconds = parseFloat(comp.gap.replace('+', '').replace('s', '')) || 0;
        const gapAsTrackPos = gapSeconds / 90; // Assume 90 second lap
        trackPos = (playerTrackPos - gapAsTrackPos + 1) % 1;
      }

      return {
        id: `car-${index}`,
        name: comp.driver,
        position: comp.position,
        trackPosition: trackPos,
        gap: comp.gap,
        isPlayer: comp.driver === 'YOU',
        inPit: false,
        color: comp.driver === 'YOU' ? '#00d4ff' : colors[index % colors.length]
      };
    });
  }, [competitorData, telemetryData]);

  // Calculate car position on track
  const getCarCoordinates = (trackPos: number) => {
    const angle = trackPos * Math.PI * 2 - Math.PI / 2;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  };

  // Sector positions (approximate)
  const sectors = [
    { id: 'S1', start: 0, end: 0.33, color: '#ff3b3b' },
    { id: 'S2', start: 0.33, end: 0.66, color: '#ffeb3b' },
    { id: 'S3', start: 0.66, end: 1, color: '#00ff9d' }
  ];

  return (
    <div className="full-track-view">
      {/* Header Controls */}
      <div className="track-controls">
        <div className="track-title">
          <h2>{trackName}</h2>
          <span className="track-length">{trackDef.length}m</span>
        </div>
        <div className="track-toggles">
          <button 
            className={showSectors ? 'active' : ''} 
            onClick={() => setShowSectors(!showSectors)}
          >
            Sectors
          </button>
          <button 
            className={showCorners ? 'active' : ''} 
            onClick={() => setShowCorners(!showCorners)}
          >
            Corners
          </button>
        </div>
      </div>

      <div className="track-content">
        {/* Main Track SVG */}
        <div className="track-svg-container">
          <svg
            width="100%"
            height="100%"
            viewBox={trackDef.viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid background */}
            <pattern id="trackGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#trackGrid)" />

            {/* Track outline (wide) */}
            <path
              d={trackDef.path}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="40"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Sector coloring */}
            {showSectors && sectors.map(sector => (
              <path
                key={sector.id}
                d={trackDef.path}
                fill="none"
                stroke={sector.color}
                strokeWidth="20"
                strokeOpacity="0.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${(sector.end - sector.start) * 1000} 1000`}
                strokeDashoffset={`${-sector.start * 1000}`}
              />
            ))}

            {/* Main track line */}
            <path
              d={trackDef.path}
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeOpacity="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Start/Finish line */}
            <g transform={`translate(${centerX + radius}, ${centerY})`}>
              <rect x="-3" y="-25" width="6" height="50" fill="#fff" opacity="0.8" />
              <text x="15" y="5" fill="#fff" fontSize="20" opacity="0.7">S/F</text>
            </g>

            {/* Corner markers */}
            {showCorners && trackDef.corners.map(corner => (
              <g key={corner.id} transform={`translate(${corner.x}, ${corner.y})`}>
                <circle r="15" fill="rgba(0,0,0,0.5)" stroke="#fff" strokeWidth="1" opacity="0.8" />
                <text
                  y="6"
                  fill="#fff"
                  fontSize="14"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {corner.id}
                </text>
              </g>
            ))}

            {/* Vehicle markers */}
            {vehicles.map(vehicle => {
              const coords = getCarCoordinates(vehicle.trackPosition);
              const isSelected = selectedVehicle === vehicle.id;
              
              return (
                <g 
                  key={vehicle.id} 
                  transform={`translate(${coords.x}, ${coords.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedVehicle(isSelected ? null : vehicle.id)}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle r="25" fill="none" stroke={vehicle.color} strokeWidth="2" opacity="0.5">
                      <animate attributeName="r" values="20;28;20" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  
                  {/* Player pulse effect */}
                  {vehicle.isPlayer && (
                    <circle r="18" fill={vehicle.color} opacity="0.3">
                      <animate attributeName="r" values="15;22;15" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  
                  {/* Car marker */}
                  <circle 
                    r={vehicle.isPlayer ? 12 : 8} 
                    fill={vehicle.color} 
                    stroke="#000" 
                    strokeWidth="2"
                  />
                  
                  {/* Position number */}
                  <text
                    y={vehicle.isPlayer ? 4 : 3}
                    fill={vehicle.isPlayer ? '#000' : '#fff'}
                    fontSize={vehicle.isPlayer ? 12 : 10}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {vehicle.position}
                  </text>

                  {/* Driver name label (on hover/select) */}
                  {(isSelected || vehicle.isPlayer) && (
                    <g transform="translate(0, -25)">
                      <rect 
                        x="-40" y="-12" 
                        width="80" height="20" 
                        rx="4"
                        fill="rgba(0,0,0,0.8)"
                      />
                      <text
                        y="3"
                        fill="#fff"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {vehicle.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side Panel - Vehicle List */}
        <div className="track-sidebar">
          <div className="sidebar-header">
            <h3>Live Positions</h3>
            <span className="lap-info">Lap {telemetryData?.lap || 1}</span>
          </div>
          
          <div className="vehicle-list">
            {vehicles.map(vehicle => (
              <div 
                key={vehicle.id}
                className={`vehicle-item ${vehicle.isPlayer ? 'player' : ''} ${selectedVehicle === vehicle.id ? 'selected' : ''}`}
                onClick={() => setSelectedVehicle(selectedVehicle === vehicle.id ? null : vehicle.id)}
              >
                <div className="vehicle-position" style={{ background: vehicle.color }}>
                  {vehicle.position}
                </div>
                <div className="vehicle-info">
                  <span className="vehicle-name">{vehicle.name}</span>
                  <span className="vehicle-gap">{vehicle.gap}</span>
                </div>
                <div className="vehicle-status">
                  {vehicle.inPit && <span className="pit-badge">PIT</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Sector Times */}
          <div className="sector-times">
            <h4>Sector Times</h4>
            <div className="sector-grid">
              <div className="sector-item s1">
                <span className="sector-label">S1</span>
                <span className="sector-time">28.234</span>
              </div>
              <div className="sector-item s2">
                <span className="sector-label">S2</span>
                <span className="sector-time">31.567</span>
              </div>
              <div className="sector-item s3">
                <span className="sector-label">S3</span>
                <span className="sector-time">28.901</span>
              </div>
            </div>
          </div>

          {/* Track Conditions */}
          <div className="track-conditions">
            <h4>Track Conditions</h4>
            <div className="condition-grid">
              <div className="condition-item">
                <span className="condition-label">Track Temp</span>
                <span className="condition-value">42°C</span>
              </div>
              <div className="condition-item">
                <span className="condition-label">Air Temp</span>
                <span className="condition-value">28°C</span>
              </div>
              <div className="condition-item">
                <span className="condition-label">Grip</span>
                <span className="condition-value good">95%</span>
              </div>
              <div className="condition-item">
                <span className="condition-label">Wind</span>
                <span className="condition-value">12 km/h NW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullTrackView;
