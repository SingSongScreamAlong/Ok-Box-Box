import React, { useState, useEffect } from 'react';
import { WeatherService, WeatherConditions, TrackGripState, WeatherStrategy } from '../services/WeatherService';
import './WeatherPanel.css';

interface WeatherPanelProps {
  compact?: boolean;
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ compact = false }) => {
  const [conditions, setConditions] = useState<WeatherConditions | null>(null);
  const [grip, setGrip] = useState<TrackGripState | null>(null);
  const [strategy, setStrategy] = useState<WeatherStrategy | null>(null);

  useEffect(() => {
    const unsub = WeatherService.subscribe(() => {
      setConditions(WeatherService.getConditions());
      setGrip(WeatherService.getGripState());
      setStrategy(WeatherService.getWeatherStrategy());
    });

    // Initial load
    setConditions(WeatherService.getConditions());
    setGrip(WeatherService.getGripState());
    setStrategy(WeatherService.getWeatherStrategy());

    return unsub;
  }, []);

  const getConditionIcon = (condition: WeatherConditions['currentCondition']) => {
    switch (condition) {
      case 'dry': return '☀️';
      case 'damp': return '🌥️';
      case 'wet': return '🌧️';
      case 'storm': return '⛈️';
      default: return '☀️';
    }
  };

  const getGripColor = (gripLevel: number) => {
    if (gripLevel >= 90) return 'var(--accent-success)';
    if (gripLevel >= 70) return 'var(--accent-primary)';
    if (gripLevel >= 50) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  const getEvolutionIcon = (evolution: TrackGripState['evolution']) => {
    switch (evolution) {
      case 'improving': return '↑';
      case 'degrading': return '↓';
      default: return '→';
    }
  };

  if (compact) {
    return (
      <div className="weather-panel-compact">
        <div className="weather-compact-header">
          <span className="weather-icon">{conditions ? getConditionIcon(conditions.currentCondition) : '☀️'}</span>
          <span className="weather-temp">{conditions?.trackTemp || '--'}°C</span>
          <span className="weather-condition">{conditions?.currentCondition || 'dry'}</span>
        </div>
        <div className="weather-compact-grip">
          <span>Grip</span>
          <span style={{ color: getGripColor(grip?.overall || 100) }}>
            {grip?.overall.toFixed(0) || '--'}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-panel">
      <div className="panel-header">
        <span>🌤️ Weather & Track</span>
        {conditions && (
          <span className="condition-badge">
            {getConditionIcon(conditions.currentCondition)} {conditions.currentCondition.toUpperCase()}
          </span>
        )}
      </div>

      <div className="panel-content">
        <div className="weather-grid">
          <div className="weather-stat">
            <div className="stat-icon">🌡️</div>
            <div className="stat-info">
              <div className="stat-label">Air Temp</div>
              <div className="stat-value">{conditions?.airTemp || '--'}°C</div>
            </div>
          </div>
          <div className="weather-stat">
            <div className="stat-icon">🛣️</div>
            <div className="stat-info">
              <div className="stat-label">Track Temp</div>
              <div className="stat-value">{conditions?.trackTemp || '--'}°C</div>
            </div>
          </div>
          <div className="weather-stat">
            <div className="stat-icon">💧</div>
            <div className="stat-info">
              <div className="stat-label">Humidity</div>
              <div className="stat-value">{conditions?.humidity || '--'}%</div>
            </div>
          </div>
          <div className="weather-stat">
            <div className="stat-icon">💨</div>
            <div className="stat-info">
              <div className="stat-label">Wind</div>
              <div className="stat-value">{conditions?.windSpeed || '--'} km/h</div>
            </div>
          </div>
        </div>

        {conditions && conditions.rainProbability > 20 && (
          <div className="rain-warning">
            <span className="rain-icon">🌧️</span>
            <div className="rain-info">
              <div className="rain-label">Rain Probability</div>
              <div className="rain-value">{conditions.rainProbability}%</div>
            </div>
            <div 
              className="rain-bar"
              style={{ 
                background: `linear-gradient(90deg, var(--accent-primary) ${conditions.rainProbability}%, var(--bg-secondary) ${conditions.rainProbability}%)`
              }}
            />
          </div>
        )}

        <div className="grip-section">
          <div className="grip-header">
            <span>Track Grip</span>
            <span className="grip-evolution" style={{ 
              color: grip?.evolution === 'improving' ? 'var(--accent-success)' : 
                     grip?.evolution === 'degrading' ? 'var(--accent-danger)' : 'var(--text-muted)'
            }}>
              {getEvolutionIcon(grip?.evolution || 'stable')} {grip?.evolution || 'stable'}
            </span>
          </div>
          
          <div className="grip-bars">
            <div className="grip-bar-item">
              <span className="grip-label">S1</span>
              <div className="grip-bar">
                <div 
                  className="grip-fill"
                  style={{ 
                    width: `${grip?.sector1 || 0}%`,
                    background: getGripColor(grip?.sector1 || 0)
                  }}
                />
              </div>
              <span className="grip-value">{grip?.sector1.toFixed(0) || '--'}%</span>
            </div>
            <div className="grip-bar-item">
              <span className="grip-label">S2</span>
              <div className="grip-bar">
                <div 
                  className="grip-fill"
                  style={{ 
                    width: `${grip?.sector2 || 0}%`,
                    background: getGripColor(grip?.sector2 || 0)
                  }}
                />
              </div>
              <span className="grip-value">{grip?.sector2.toFixed(0) || '--'}%</span>
            </div>
            <div className="grip-bar-item">
              <span className="grip-label">S3</span>
              <div className="grip-bar">
                <div 
                  className="grip-fill"
                  style={{ 
                    width: `${grip?.sector3 || 0}%`,
                    background: getGripColor(grip?.sector3 || 0)
                  }}
                />
              </div>
              <span className="grip-value">{grip?.sector3.toFixed(0) || '--'}%</span>
            </div>
          </div>

          <div className="grip-details">
            <div className="grip-detail">
              <span>Racing Line</span>
              <span>{grip?.rubberedLine.toFixed(0) || '--'}%</span>
            </div>
            <div className="grip-detail">
              <span>Off-Line</span>
              <span>{grip?.offLineGrip.toFixed(0) || '--'}%</span>
            </div>
          </div>
        </div>

        {strategy && (
          <div className="weather-strategy">
            <div className="strategy-header">Strategy Recommendation</div>
            <div className="strategy-content">
              <div className="tire-rec">
                <span className="tire-label">Tire</span>
                <span className={`tire-compound ${strategy.currentTireRecommendation}`}>
                  {strategy.currentTireRecommendation.toUpperCase()}
                </span>
              </div>
              {strategy.paceAdjustment > 0 && (
                <div className="pace-adjustment">
                  <span>Pace Impact</span>
                  <span className="text-warning">+{strategy.paceAdjustment.toFixed(1)}s</span>
                </div>
              )}
              <div className={`risk-level ${strategy.riskLevel}`}>
                Risk: {strategy.riskLevel.toUpperCase()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherPanel;
