import { useEffect, useState, useMemo } from 'react';
import type { TelemetryData, CompetitorData } from '../types';
import TrackMapService from '../services/TrackMapService';
import { 
  getTrackByName, 
  generateSVGPath, 
  getTrackCoordinateAtPosition,
  getTurnAtPosition,
  getSectorAtPosition,
  getAllTracks,
  type TrackData,
} from '../data/tracks';
import './TrackMap.css';

interface TrackMapProps {
  telemetryData: TelemetryData | null;
  trackName: string;
  competitors?: CompetitorData[] | null;
  showTurnNumbers?: boolean;
  showSectors?: boolean;
  showPitLane?: boolean;
}

export default function TrackMap({ 
  telemetryData, 
  trackName, 
  competitors,
  showTurnNumbers = true,
  showSectors = true,
  showPitLane = true,
}: TrackMapProps) {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('');

  // Load track data when track name changes
  useEffect(() => {
    if (trackName) {
      const foundTrack = getTrackByName(trackName);
      if (foundTrack) {
        setTrack(foundTrack);
        setSelectedTrack(foundTrack.id);
        TrackMapService.loadTrack(foundTrack.id);
      }
    }
  }, [trackName]);

  // Handle manual track selection
  const handleTrackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const trackId = e.target.value;
    setSelectedTrack(trackId);
    const allTracks = getAllTracks();
    const selected = allTracks.find(t => t.id === trackId);
    if (selected) {
      setTrack(selected);
      TrackMapService.loadTrack(trackId);
    }
  };

  // Generate SVG path for track
  const svgPath = useMemo(() => {
    if (!track) return '';
    return generateSVGPath(track);
  }, [track]);

  // Calculate player position on track
  const playerPos = useMemo(() => {
    if (!track || !telemetryData) return null;
    return getTrackCoordinateAtPosition(track, telemetryData.trackPosition);
  }, [track, telemetryData]);

  // Get current turn info
  const currentTurn = useMemo(() => {
    if (!track || !telemetryData) return null;
    return getTurnAtPosition(track, telemetryData.trackPosition);
  }, [track, telemetryData]);

  // Get current sector
  const currentSector = useMemo(() => {
    if (!track || !telemetryData) return null;
    return getSectorAtPosition(track, telemetryData.trackPosition);
  }, [track, telemetryData]);

  // Calculate competitor positions
  const competitorPositions = useMemo(() => {
    if (!track || !competitors) return [];
    return competitors.map(comp => {
      // Estimate track position from gap (simplified)
      const gap = typeof comp.gap === 'number' ? comp.gap : 0;
      const estimatedPos = ((telemetryData?.trackPosition || 0) + gap / 100) % 1;
      const coords = getTrackCoordinateAtPosition(track, Math.abs(estimatedPos));
      return {
        ...comp,
        x: coords.x,
        y: coords.y,
      };
    });
  }, [track, competitors, telemetryData]);

  // Get turn markers for display
  const turnMarkers = useMemo(() => {
    if (!track || !showTurnNumbers) return [];
    return track.turns.map(turn => {
      const coords = getTrackCoordinateAtPosition(track, turn.marker / 100);
      return {
        ...turn,
        x: coords.x,
        y: coords.y,
      };
    });
  }, [track, showTurnNumbers]);

  // Calculate viewBox
  const viewBox = useMemo(() => {
    if (!track) return '0 0 400 300';
    const padding = 30;
    return `${track.bounds.minX - padding} ${track.bounds.minY - padding} ${track.bounds.maxX - track.bounds.minX + padding * 2} ${track.bounds.maxY - track.bounds.minY + padding * 2}`;
  }, [track]);

  const availableTracks = getAllTracks();

  return (
    <div className="panel track-map-panel">
      <div className="panel-header">
        <span>TRACK MAP</span>
        <select 
          className="track-selector" 
          value={selectedTrack} 
          onChange={handleTrackChange}
        >
          <option value="">Select Track...</option>
          {availableTracks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="panel-content">
        <div className="track-map-container">
          {!track ? (
            <div className="track-map-empty">
              <p>Select a track or start a session</p>
            </div>
          ) : (
            <div className="track-map-display">
              <svg viewBox={viewBox} className="track-svg" preserveAspectRatio="xMidYMid meet">
                {/* Track outline */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="var(--bg-secondary)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Track surface */}
                <path
                  d={svgPath}
                  fill="none"
                  stroke="var(--border-color)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Sector colors on track */}
                {showSectors && track.sectors.map((sector, idx) => {
                  const nextSector = track.sectors[idx + 1];
                  const startPct = sector.marker / 100;
                  const endPct = nextSector ? nextSector.marker / 100 : 1;
                  
                  // Get coordinates for this sector segment
                  const sectorCoords = track.coordinates.filter(
                    c => c.pct / 100 >= startPct && c.pct / 100 < endPct
                  );
                  
                  if (sectorCoords.length < 2) return null;
                  
                  let sectorPath = `M ${sectorCoords[0].x} ${sectorCoords[0].y}`;
                  for (let i = 1; i < sectorCoords.length; i++) {
                    sectorPath += ` L ${sectorCoords[i].x} ${sectorCoords[i].y}`;
                  }
                  
                  return (
                    <path
                      key={sector.name}
                      d={sectorPath}
                      fill="none"
                      stroke={sector.color}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.6"
                    />
                  );
                })}

                {/* Start/Finish line */}
                {track.coordinates[0] && (
                  <line
                    x1={track.coordinates[0].x - 8}
                    y1={track.coordinates[0].y - 8}
                    x2={track.coordinates[0].x + 8}
                    y2={track.coordinates[0].y + 8}
                    stroke="white"
                    strokeWidth="3"
                  />
                )}

                {/* Turn numbers */}
                {showTurnNumbers && turnMarkers.map(turn => (
                  <g key={turn.number} className="turn-marker">
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r="10"
                      fill="var(--bg-primary)"
                      stroke="var(--text-muted)"
                      strokeWidth="1"
                    />
                    <text
                      x={turn.x}
                      y={turn.y + 4}
                      textAnchor="middle"
                      fontSize="8"
                      fill="var(--text-secondary)"
                    >
                      {turn.number}
                    </text>
                  </g>
                ))}

                {/* Pit entry/exit markers */}
                {showPitLane && (
                  <>
                    <g className="pit-marker">
                      {(() => {
                        const pitEntry = getTrackCoordinateAtPosition(track, track.pitEntry / 100);
                        return (
                          <text
                            x={pitEntry.x}
                            y={pitEntry.y - 12}
                            textAnchor="middle"
                            fontSize="8"
                            fill="var(--accent-warning)"
                          >
                            PIT IN
                          </text>
                        );
                      })()}
                    </g>
                    <g className="pit-marker">
                      {(() => {
                        const pitExit = getTrackCoordinateAtPosition(track, track.pitExit / 100);
                        return (
                          <text
                            x={pitExit.x}
                            y={pitExit.y - 12}
                            textAnchor="middle"
                            fontSize="8"
                            fill="var(--accent-success)"
                          >
                            PIT OUT
                          </text>
                        );
                      })()}
                    </g>
                  </>
                )}

                {/* Competitor cars */}
                {competitorPositions.map((comp, idx) => (
                  <circle
                    key={comp.driver || idx}
                    cx={comp.x}
                    cy={comp.y}
                    r="5"
                    fill={comp.position <= 3 ? 'var(--accent-warning)' : 'var(--text-muted)'}
                    className="competitor-dot"
                  />
                ))}

                {/* Player car */}
                {playerPos && (
                  <g className="player-marker">
                    <circle
                      cx={playerPos.x}
                      cy={playerPos.y}
                      r="8"
                      fill="var(--accent-primary)"
                      stroke="white"
                      strokeWidth="2"
                      className="player-dot"
                    />
                    <circle
                      cx={playerPos.x}
                      cy={playerPos.y}
                      r="12"
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="2"
                      opacity="0.5"
                      className="player-pulse"
                    />
                  </g>
                )}
              </svg>

              {/* Track info overlay */}
              <div className="track-info-overlay">
                <div className="track-name">{track.name}</div>
                <div className="track-details">
                  <span className="track-country">{track.country}</span>
                  <span className="track-length">{(track.length / 1000).toFixed(2)} km</span>
                </div>
              </div>

              {/* Current position info */}
              {telemetryData && (
                <div className="position-info">
                  <div className="position-row">
                    <span className="label">Position:</span>
                    <span className="value">{(telemetryData.trackPosition * 100).toFixed(1)}%</span>
                  </div>
                  <div className="position-row">
                    <span className="label">Lap:</span>
                    <span className="value">{telemetryData.lap}</span>
                  </div>
                  {currentTurn && (
                    <div className="position-row turn">
                      <span className="label">Turn:</span>
                      <span className="value">{currentTurn.name || `T${currentTurn.number}`}</span>
                    </div>
                  )}
                  {currentSector && (
                    <div className="position-row sector">
                      <span className="label">Sector:</span>
                      <span className="value" style={{ color: currentSector.color }}>{currentSector.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
