import React, { useState, useMemo } from 'react';
import './IncidentAnalysis.css';

interface Incident {
  id: string;
  lap: number;
  sector: number;
  type: 'off-track' | 'contact' | 'spin' | 'lockup' | 'oversteer' | 'understeer';
  severity: 'minor' | 'moderate' | 'major';
  timeLost: number;
  corner?: string;
  description: string;
  prevention: string;
  incidentPoints: number;
}

interface IncidentAnalysisProps {
  sessionId?: string;
}

const IncidentAnalysis: React.FC<IncidentAnalysisProps> = ({ sessionId }) => {
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Sample incident data - would come from backend /api/incidents/analyze
  const incidents: Incident[] = useMemo(() => [
    {
      id: '1',
      lap: 3,
      sector: 2,
      type: 'lockup',
      severity: 'minor',
      timeLost: 0.342,
      corner: 'Stowe',
      description: 'Front-left lockup under heavy braking. Flat spot created on tire.',
      prevention: 'Reduce initial brake pressure by 5-10%. Trail brake more gradually into the corner.',
      incidentPoints: 0
    },
    {
      id: '2',
      lap: 7,
      sector: 1,
      type: 'off-track',
      severity: 'moderate',
      timeLost: 1.856,
      corner: 'Copse',
      description: 'Two wheels off track on exit. Lost traction on kerb.',
      prevention: 'Use less kerb on exit. Apply throttle more progressively after apex.',
      incidentPoints: 1
    },
    {
      id: '3',
      lap: 12,
      sector: 3,
      type: 'oversteer',
      severity: 'minor',
      timeLost: 0.523,
      corner: 'Club',
      description: 'Rear stepped out on corner entry. Quick correction saved spin.',
      prevention: 'Reduce entry speed by 3-5 km/h. Brake earlier and release smoothly.',
      incidentPoints: 0
    },
    {
      id: '4',
      lap: 18,
      sector: 2,
      type: 'contact',
      severity: 'major',
      timeLost: 3.245,
      corner: 'Becketts',
      description: 'Light contact with competitor. Front wing damage.',
      prevention: 'Leave more space when overtaking through high-speed corners.',
      incidentPoints: 2
    },
    {
      id: '5',
      lap: 24,
      sector: 1,
      type: 'spin',
      severity: 'major',
      timeLost: 8.432,
      corner: 'Village',
      description: 'Full 360° spin after cold tire lockup. Rejoined safely.',
      prevention: 'Warm tires properly before pushing. Reduce brake pressure on cold tires.',
      incidentPoints: 0
    },
    {
      id: '6',
      lap: 31,
      sector: 3,
      type: 'understeer',
      severity: 'minor',
      timeLost: 0.287,
      corner: 'Luffield',
      description: 'Pushed wide on entry due to understeer.',
      prevention: 'Reduce entry speed. Consider brake bias adjustment +1% forward.',
      incidentPoints: 0
    }
  ], []);

  const filteredIncidents = filterType === 'all' 
    ? incidents 
    : incidents.filter(i => i.type === filterType);

  const summary = useMemo(() => {
    const totalTimeLost = incidents.reduce((sum, i) => sum + i.timeLost, 0);
    const totalPoints = incidents.reduce((sum, i) => sum + i.incidentPoints, 0);
    const byType = incidents.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const bySeverity = incidents.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalTimeLost, totalPoints, byType, bySeverity, total: incidents.length };
  }, [incidents]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'off-track': return '🚧';
      case 'contact': return '💥';
      case 'spin': return '🔄';
      case 'lockup': return '🔒';
      case 'oversteer': return '↩️';
      case 'understeer': return '↪️';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return '#ffeb3b';
      case 'moderate': return '#ff9800';
      case 'major': return '#f44336';
      default: return '#fff';
    }
  };

  const selectedIncidentData = selectedIncident 
    ? incidents.find(i => i.id === selectedIncident) 
    : null;

  return (
    <div className="incident-analysis">
      {/* Summary Cards */}
      <div className="incident-summary">
        <div className="summary-card">
          <span className="summary-value">{summary.total}</span>
          <span className="summary-label">Total Incidents</span>
        </div>
        <div className="summary-card warning">
          <span className="summary-value">{summary.totalTimeLost.toFixed(2)}s</span>
          <span className="summary-label">Time Lost</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{summary.totalPoints}x</span>
          <span className="summary-label">Incident Points</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{summary.bySeverity.major || 0}</span>
          <span className="summary-label">Major Incidents</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="incident-filters">
        <button 
          className={filterType === 'all' ? 'active' : ''} 
          onClick={() => setFilterType('all')}
        >
          All ({summary.total})
        </button>
        {Object.entries(summary.byType).map(([type, count]) => (
          <button 
            key={type}
            className={filterType === type ? 'active' : ''} 
            onClick={() => setFilterType(type)}
          >
            {getTypeIcon(type)} {type} ({count})
          </button>
        ))}
      </div>

      <div className="incident-content">
        {/* Incident List */}
        <div className="incident-list">
          {filteredIncidents.map(incident => (
            <div 
              key={incident.id}
              className={`incident-item ${selectedIncident === incident.id ? 'selected' : ''}`}
              onClick={() => setSelectedIncident(incident.id)}
            >
              <div className="incident-icon">{getTypeIcon(incident.type)}</div>
              <div className="incident-info">
                <div className="incident-header">
                  <span className="incident-type">{incident.type}</span>
                  <span 
                    className="incident-severity"
                    style={{ color: getSeverityColor(incident.severity) }}
                  >
                    {incident.severity}
                  </span>
                </div>
                <div className="incident-location">
                  Lap {incident.lap} • Sector {incident.sector}
                  {incident.corner && ` • ${incident.corner}`}
                </div>
              </div>
              <div className="incident-time">
                <span className="time-lost">-{incident.timeLost.toFixed(3)}s</span>
                {incident.incidentPoints > 0 && (
                  <span className="incident-points">{incident.incidentPoints}x</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Incident Detail */}
        <div className="incident-detail">
          {selectedIncidentData ? (
            <>
              <div className="detail-header">
                <span className="detail-icon">{getTypeIcon(selectedIncidentData.type)}</span>
                <div className="detail-title">
                  <h3>{selectedIncidentData.type.toUpperCase()}</h3>
                  <span className="detail-location">
                    Lap {selectedIncidentData.lap} • {selectedIncidentData.corner || `Sector ${selectedIncidentData.sector}`}
                  </span>
                </div>
                <span 
                  className="detail-severity"
                  style={{ background: getSeverityColor(selectedIncidentData.severity) }}
                >
                  {selectedIncidentData.severity}
                </span>
              </div>

              <div className="detail-stats">
                <div className="stat">
                  <span className="stat-label">Time Lost</span>
                  <span className="stat-value warning">{selectedIncidentData.timeLost.toFixed(3)}s</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Incident Points</span>
                  <span className="stat-value">{selectedIncidentData.incidentPoints}x</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>📋 What Happened</h4>
                <p>{selectedIncidentData.description}</p>
              </div>

              <div className="detail-section prevention">
                <h4>🛡️ Prevention</h4>
                <p>{selectedIncidentData.prevention}</p>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <span className="icon">👆</span>
              <span>Select an incident to view details and prevention tips</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="ai-recommendations">
        <h4>🛡️ Incident Prevention Tips</h4>
        <div className="recommendations-grid">
          <div className="recommendation">
            <span className="rec-icon">🔒</span>
            <div className="rec-content">
              <span className="rec-title">Reduce Lockups</span>
              <span className="rec-text">Lower initial brake pressure by 8% and trail brake more</span>
            </div>
          </div>
          <div className="recommendation">
            <span className="rec-icon">🛞</span>
            <div className="rec-content">
              <span className="rec-title">Tire Temperature</span>
              <span className="rec-text">Cold tires caused 2 incidents. Add 1 warm-up lap</span>
            </div>
          </div>
          <div className="recommendation">
            <span className="rec-icon">⚙️</span>
            <div className="rec-content">
              <span className="rec-title">Setup Suggestion</span>
              <span className="rec-text">Increase rear wing +1 to reduce oversteer tendency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentAnalysis;
