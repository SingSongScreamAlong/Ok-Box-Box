import React, { useState, useMemo } from 'react';
import { TelemetryData, CompetitorData } from '../../services/WebSocketService';
import { tracks, TrackDefinition } from '../../data/tracks/TrackRegistry';
import { trackAssetService } from '../../services/TrackAssetService';
import './TrackPage.css';

interface TrackPageProps {
  telemetryData: TelemetryData | null;
  competitorData: CompetitorData[] | null;
  trackName?: string;
}

interface CornerAnalysis {
  id: string;
  name: string;
  type: 'hairpin' | 'chicane' | 'fast' | 'medium' | 'slow';
  optimalSpeed: number;
  brakingPoint: number;
  apexSpeed: number;
  exitSpeed: number;
  gear: number;
  difficulty: 'easy' | 'medium' | 'hard';
  aiTip: string;
}

interface TrackConditions {
  trackTemp: number;
  airTemp: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  trackGrip: number;
  rubberBuildup: number;
  weather: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain';
  forecast: string;
}

const TrackPage: React.FC<TrackPageProps> = ({ 
  telemetryData, 
  competitorData,
  trackName = 'Silverstone' 
}) => {
  const [selectedCorner, setSelectedCorner] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'corners' | 'conditions' | 'ai'>('overview');

  // Track definition
  const trackDef: TrackDefinition = useMemo(() => {
    const staticData = trackAssetService.getStaticTrackData(trackName);
    return staticData || tracks['Silverstone'];
  }, [trackName]);

  const viewBoxParts = trackDef.viewBox.split(' ').map(Number);
  const centerX = viewBoxParts[2] / 2;
  const centerY = viewBoxParts[3] / 2;
  const radius = Math.min(centerX, centerY) * 0.6;

  // Sample corner analysis data
  const cornerAnalysis: CornerAnalysis[] = [
    { id: '1', name: 'Abbey', type: 'fast', optimalSpeed: 245, brakingPoint: 120, apexSpeed: 195, exitSpeed: 230, gear: 5, difficulty: 'medium', aiTip: 'Late apex for better exit onto Wellington Straight' },
    { id: '2', name: 'Farm', type: 'medium', optimalSpeed: 180, brakingPoint: 85, apexSpeed: 145, exitSpeed: 175, gear: 4, difficulty: 'easy', aiTip: 'Standard racing line, focus on smooth throttle application' },
    { id: '3', name: 'Village', type: 'slow', optimalSpeed: 140, brakingPoint: 95, apexSpeed: 85, exitSpeed: 130, gear: 2, difficulty: 'hard', aiTip: 'Tricky off-camber exit, be patient with throttle' },
    { id: '4', name: 'The Loop', type: 'hairpin', optimalSpeed: 95, brakingPoint: 110, apexSpeed: 65, exitSpeed: 95, gear: 2, difficulty: 'hard', aiTip: 'Trail brake deep, rotate car before apex' },
    { id: '5', name: 'Aintree', type: 'fast', optimalSpeed: 220, brakingPoint: 60, apexSpeed: 185, exitSpeed: 210, gear: 5, difficulty: 'medium', aiTip: 'Lift and coast, no braking needed in dry conditions' },
    { id: '6', name: 'Brooklands', type: 'slow', optimalSpeed: 130, brakingPoint: 100, apexSpeed: 75, exitSpeed: 120, gear: 2, difficulty: 'hard', aiTip: 'Heavy braking zone, watch for lockups' },
    { id: '7', name: 'Luffield', type: 'hairpin', optimalSpeed: 110, brakingPoint: 90, apexSpeed: 60, exitSpeed: 105, gear: 2, difficulty: 'medium', aiTip: 'Double apex, prioritize exit speed for Woodcote' },
    { id: '8', name: 'Woodcote', type: 'fast', optimalSpeed: 260, brakingPoint: 40, apexSpeed: 220, exitSpeed: 255, gear: 6, difficulty: 'easy', aiTip: 'Flat out in qualifying, slight lift in race with fuel' },
    { id: '9', name: 'Copse', type: 'fast', optimalSpeed: 280, brakingPoint: 30, apexSpeed: 245, exitSpeed: 275, gear: 7, difficulty: 'hard', aiTip: 'Commitment corner - flat or lift, no in-between' },
    { id: '10', name: 'Maggots', type: 'chicane', optimalSpeed: 265, brakingPoint: 0, apexSpeed: 240, exitSpeed: 260, gear: 6, difficulty: 'hard', aiTip: 'Flow through the complex, minimal steering input' },
    { id: '11', name: 'Becketts', type: 'chicane', optimalSpeed: 230, brakingPoint: 0, apexSpeed: 195, exitSpeed: 225, gear: 5, difficulty: 'hard', aiTip: 'Set up for Hangar Straight, sacrifice entry for exit' },
    { id: '12', name: 'Chapel', type: 'fast', optimalSpeed: 285, brakingPoint: 0, apexSpeed: 265, exitSpeed: 290, gear: 7, difficulty: 'medium', aiTip: 'Full throttle, use all the track on exit' },
    { id: '13', name: 'Stowe', type: 'medium', optimalSpeed: 195, brakingPoint: 130, apexSpeed: 155, exitSpeed: 185, gear: 4, difficulty: 'medium', aiTip: 'Good overtaking spot, late braking possible' },
    { id: '14', name: 'Vale', type: 'slow', optimalSpeed: 125, brakingPoint: 85, apexSpeed: 80, exitSpeed: 115, gear: 2, difficulty: 'easy', aiTip: 'Straightforward corner, set up for Club' },
    { id: '15', name: 'Club', type: 'medium', optimalSpeed: 165, brakingPoint: 70, apexSpeed: 120, exitSpeed: 160, gear: 3, difficulty: 'medium', aiTip: 'Two-part corner, nail the exit for pit straight' },
  ];

  // Track conditions - use weather data from telemetry if available
  const conditions: TrackConditions = {
    trackTemp: 42, // Would come from session info
    airTemp: 28,
    humidity: 65,
    windSpeed: telemetryData?.weather?.windSpeed || 12,
    windDirection: 'NW',
    trackGrip: 95,
    rubberBuildup: 78,
    weather: 'clear',
    forecast: 'Dry conditions expected for next 2 hours'
  };

  // AI Track Insights
  const aiInsights = [
    { type: 'warning', title: 'Tire Degradation Zone', message: 'High track temp causing increased rear tire wear through Maggots-Becketts complex. Consider 2% less rear wing.' },
    { type: 'tip', title: 'Optimal Racing Line', message: 'Current grip levels favor a wider entry into Copse. Move braking reference 5m later.' },
    { type: 'alert', title: 'Track Evolution', message: 'Grip improving in Sector 2. Expect 0.3s faster lap times in next 15 minutes.' },
    { type: 'strategy', title: 'Overtaking Opportunity', message: 'Stowe corner showing high overtake success rate (67%) this session. Target for passes.' },
    { type: 'tip', title: 'Fuel Saving Zone', message: 'Lift-and-coast through Abbey saves 0.15L/lap with only 0.1s time loss.' },
  ];

  // Vehicle positions for map
  const vehicles = useMemo(() => {
    const baseCompetitors = competitorData || [
      { position: 1, driver: 'VERSTAPPEN', gap: 'LEADER', lastLap: '1:27.654' },
      { position: 2, driver: 'HAMILTON', gap: '+2.576s', lastLap: '1:27.892' },
      { position: 3, driver: 'YOU', gap: '+3.821s', lastLap: '1:28.456' },
      { position: 4, driver: 'LECLERC', gap: '+6.697s', lastLap: '1:28.234' },
      { position: 5, driver: 'NORRIS', gap: '+8.455s', lastLap: '1:28.789' },
    ];

    const playerTrackPos = telemetryData?.trackPosition || 0.5;
    
    return baseCompetitors.map((comp, index) => {
      let trackPos = playerTrackPos;
      if (comp.driver === 'YOU') {
        trackPos = playerTrackPos;
      } else if (comp.gap === 'LEADER') {
        trackPos = (playerTrackPos + 0.05) % 1;
      } else {
        const gapSeconds = parseFloat(comp.gap.replace('+', '').replace('s', '')) || 0;
        trackPos = (playerTrackPos - gapSeconds / 90 + 1) % 1;
      }

      return {
        ...comp,
        trackPosition: trackPos,
        isPlayer: comp.driver === 'YOU',
        color: comp.driver === 'YOU' ? '#00d4ff' : ['#ffeb3b', '#c0c0c0', '#ff6b35', '#e10600', '#ff8700'][index % 5]
      };
    });
  }, [competitorData, telemetryData]);

  const getCarCoordinates = (trackPos: number) => {
    const angle = trackPos * Math.PI * 2 - Math.PI / 2;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return '#00ff9d';
      case 'medium': return '#ffeb3b';
      case 'hard': return '#ff3b3b';
      default: return '#fff';
    }
  };

  return (
    <div className="track-page">
      {/* Left Panel - Track Map */}
      <div className="track-map-section">
        <div className="map-header">
          <h2>{trackName}</h2>
          <div className="map-controls">
            <button 
              className={showHeatmap ? 'active' : ''} 
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              Heatmap
            </button>
          </div>
        </div>
        
        <div className="map-container">
          <svg
            viewBox={trackDef.viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="track-svg"
          >
            {/* Grid */}
            <pattern id="mapGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#mapGrid)" />

            {/* Track outline */}
            <path
              d={trackDef.path}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Track line */}
            <path
              d={trackDef.path}
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeOpacity="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Corner markers */}
            {trackDef.corners.map(corner => {
              const analysis = cornerAnalysis.find(c => c.id === corner.id);
              const isSelected = selectedCorner === corner.id;
              
              return (
                <g 
                  key={corner.id} 
                  transform={`translate(${corner.x}, ${corner.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedCorner(isSelected ? null : corner.id)}
                >
                  <circle 
                    r={isSelected ? 20 : 15} 
                    fill={isSelected ? getDifficultyColor(analysis?.difficulty || 'medium') : 'rgba(0,0,0,0.7)'} 
                    stroke={getDifficultyColor(analysis?.difficulty || 'medium')}
                    strokeWidth="2"
                    opacity={isSelected ? 1 : 0.8}
                  />
                  <text
                    y="5"
                    fill="#fff"
                    fontSize="14"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {corner.id}
                  </text>
                </g>
              );
            })}

            {/* Vehicle markers */}
            {vehicles.map((vehicle, i) => {
              const coords = getCarCoordinates(vehicle.trackPosition);
              return (
                <g key={i} transform={`translate(${coords.x}, ${coords.y})`}>
                  {vehicle.isPlayer && (
                    <circle r="18" fill={vehicle.color} opacity="0.3">
                      <animate attributeName="r" values="15;22;15" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r={vehicle.isPlayer ? 10 : 7} fill={vehicle.color} stroke="#000" strokeWidth="2" />
                  <text y={vehicle.isPlayer ? 4 : 3} fill="#000" fontSize={vehicle.isPlayer ? 10 : 8} textAnchor="middle" fontWeight="bold">
                    {vehicle.position}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Track Stats */}
        <div className="track-stats">
          <div className="stat-item">
            <span className="stat-label">Length</span>
            <span className="stat-value">{(trackDef.length / 1000).toFixed(3)} km</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Corners</span>
            <span className="stat-value">{trackDef.corners.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">DRS Zones</span>
            <span className="stat-value">2</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Lap Record</span>
            <span className="stat-value">1:27.097</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Data Tabs */}
      <div className="track-data-section">
        <div className="data-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={activeTab === 'corners' ? 'active' : ''} onClick={() => setActiveTab('corners')}>Corners</button>
          <button className={activeTab === 'conditions' ? 'active' : ''} onClick={() => setActiveTab('conditions')}>Conditions</button>
          <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>Insights</button>
        </div>

        <div className="data-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Selected Corner Detail */}
              {selectedCorner && (
                <div className="corner-detail-card">
                  {(() => {
                    const corner = cornerAnalysis.find(c => c.id === selectedCorner);
                    if (!corner) return null;
                    return (
                      <>
                        <div className="corner-header">
                          <h3>Turn {corner.id}: {corner.name}</h3>
                          <span className={`difficulty-badge ${corner.difficulty}`}>{corner.difficulty.toUpperCase()}</span>
                        </div>
                        <div className="corner-stats">
                          <div className="corner-stat">
                            <span className="label">Type</span>
                            <span className="value">{corner.type}</span>
                          </div>
                          <div className="corner-stat">
                            <span className="label">Entry Speed</span>
                            <span className="value">{corner.optimalSpeed} km/h</span>
                          </div>
                          <div className="corner-stat">
                            <span className="label">Apex Speed</span>
                            <span className="value">{corner.apexSpeed} km/h</span>
                          </div>
                          <div className="corner-stat">
                            <span className="label">Exit Speed</span>
                            <span className="value">{corner.exitSpeed} km/h</span>
                          </div>
                          <div className="corner-stat">
                            <span className="label">Gear</span>
                            <span className="value">{corner.gear}</span>
                          </div>
                          <div className="corner-stat">
                            <span className="label">Braking</span>
                            <span className="value">{corner.brakingPoint}m</span>
                          </div>
                        </div>
                        <div className="ai-tip">
                          <span className="tip-icon">💡</span>
                          <span>{corner.aiTip}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {!selectedCorner && (
                <div className="select-corner-prompt">
                  <span>👆 Click a corner on the map to see detailed analysis</span>
                </div>
              )}

              {/* Quick Conditions */}
              <div className="quick-conditions">
                <h4>Current Conditions</h4>
                <div className="conditions-grid">
                  <div className="condition">
                    <span className="icon">🌡️</span>
                    <span className="label">Track</span>
                    <span className="value">{conditions.trackTemp}°C</span>
                  </div>
                  <div className="condition">
                    <span className="icon">💨</span>
                    <span className="label">Wind</span>
                    <span className="value">{conditions.windSpeed} km/h {conditions.windDirection}</span>
                  </div>
                  <div className="condition">
                    <span className="icon">🛞</span>
                    <span className="label">Grip</span>
                    <span className="value good">{conditions.trackGrip}%</span>
                  </div>
                  <div className="condition">
                    <span className="icon">☀️</span>
                    <span className="label">Weather</span>
                    <span className="value">{conditions.weather}</span>
                  </div>
                </div>
              </div>

              {/* Live Positions */}
              <div className="live-positions">
                <h4>Live Positions</h4>
                <div className="positions-list">
                  {vehicles.map((v, i) => (
                    <div key={i} className={`position-item ${v.isPlayer ? 'player' : ''}`}>
                      <span className="pos" style={{ background: v.color }}>{v.position}</span>
                      <span className="name">{v.driver}</span>
                      <span className="gap">{v.gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'corners' && (
            <div className="corners-tab">
              <div className="corners-list">
                {cornerAnalysis.map(corner => (
                  <div 
                    key={corner.id} 
                    className={`corner-item ${selectedCorner === corner.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCorner(corner.id)}
                  >
                    <div className="corner-num" style={{ borderColor: getDifficultyColor(corner.difficulty) }}>
                      {corner.id}
                    </div>
                    <div className="corner-info">
                      <span className="corner-name">{corner.name}</span>
                      <span className="corner-type">{corner.type} • Gear {corner.gear}</span>
                    </div>
                    <div className="corner-speeds">
                      <span className="speed entry">{corner.optimalSpeed}</span>
                      <span className="arrow">→</span>
                      <span className="speed apex">{corner.apexSpeed}</span>
                      <span className="arrow">→</span>
                      <span className="speed exit">{corner.exitSpeed}</span>
                    </div>
                    <div className={`difficulty ${corner.difficulty}`}>
                      {corner.difficulty}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'conditions' && (
            <div className="conditions-tab">
              <div className="conditions-section">
                <h4>🌡️ Temperature</h4>
                <div className="condition-row">
                  <span>Track Temperature</span>
                  <span className="value">{conditions.trackTemp}°C</span>
                  <div className="bar"><div className="fill" style={{ width: `${conditions.trackTemp}%`, background: conditions.trackTemp > 40 ? '#ff6b35' : '#00d4ff' }}></div></div>
                </div>
                <div className="condition-row">
                  <span>Air Temperature</span>
                  <span className="value">{conditions.airTemp}°C</span>
                  <div className="bar"><div className="fill" style={{ width: `${conditions.airTemp * 2}%` }}></div></div>
                </div>
                <div className="condition-row">
                  <span>Humidity</span>
                  <span className="value">{conditions.humidity}%</span>
                  <div className="bar"><div className="fill" style={{ width: `${conditions.humidity}%` }}></div></div>
                </div>
              </div>

              <div className="conditions-section">
                <h4>💨 Wind</h4>
                <div className="wind-display">
                  <div className="wind-compass">
                    <div className="compass-arrow" style={{ transform: `rotate(${conditions.windDirection === 'N' ? 0 : conditions.windDirection === 'NE' ? 45 : conditions.windDirection === 'E' ? 90 : conditions.windDirection === 'SE' ? 135 : conditions.windDirection === 'S' ? 180 : conditions.windDirection === 'SW' ? 225 : conditions.windDirection === 'W' ? 270 : 315}deg)` }}>↑</div>
                  </div>
                  <div className="wind-info">
                    <span className="wind-speed">{conditions.windSpeed} km/h</span>
                    <span className="wind-dir">From {conditions.windDirection}</span>
                  </div>
                </div>
              </div>

              <div className="conditions-section">
                <h4>🛞 Track Surface</h4>
                <div className="condition-row">
                  <span>Grip Level</span>
                  <span className="value good">{conditions.trackGrip}%</span>
                  <div className="bar"><div className="fill good" style={{ width: `${conditions.trackGrip}%` }}></div></div>
                </div>
                <div className="condition-row">
                  <span>Rubber Buildup</span>
                  <span className="value">{conditions.rubberBuildup}%</span>
                  <div className="bar"><div className="fill" style={{ width: `${conditions.rubberBuildup}%` }}></div></div>
                </div>
              </div>

              <div className="conditions-section">
                <h4>🌤️ Weather Forecast</h4>
                <div className="forecast">
                  <div className="forecast-icon">☀️</div>
                  <div className="forecast-text">{conditions.forecast}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="ai-tab">
              <div className="ai-insights">
                {aiInsights.map((insight, i) => (
                  <div key={i} className={`insight-card ${insight.type}`}>
                    <div className="insight-header">
                      <span className="insight-icon">
                        {insight.type === 'warning' ? '⚠️' : insight.type === 'tip' ? '💡' : insight.type === 'alert' ? '📢' : '🎯'}
                      </span>
                      <span className="insight-title">{insight.title}</span>
                    </div>
                    <p className="insight-message">{insight.message}</p>
                  </div>
                ))}
              </div>

              <div className="ai-summary">
                <h4>📊 Track Summary</h4>
                <p>
                  {trackName} is a high-speed circuit that rewards commitment and precision. 
                  Key areas for time gain are the Maggots-Becketts complex and the exit of Club corner.
                  Current conditions favor aggressive driving with good grip levels.
                  Watch tire temperatures through the fast corners in Sector 2.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackPage;
