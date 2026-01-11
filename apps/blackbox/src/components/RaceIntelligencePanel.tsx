import { useState } from 'react';
import type { 
  RaceIntelligenceState, 
  TireAnalysis, 
  CompetitorStrategy, 
  StrategyRecommendation,
  IncidentData 
} from '../services/RaceIntelligence';
import './RaceIntelligencePanel.css';

interface RaceIntelligencePanelProps {
  intelligence: RaceIntelligenceState | null;
}

export default function RaceIntelligencePanel({ intelligence }: RaceIntelligencePanelProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'tires' | 'competitors' | 'strategy' | 'incidents'>('overview');

  if (!intelligence) {
    return (
      <div className="panel race-intelligence-panel">
        <div className="panel-header">RACE INTELLIGENCE</div>
        <div className="panel-content">
          <div className="no-data">Waiting for race data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel race-intelligence-panel">
      <div className="panel-header">
        RACE INTELLIGENCE
        <div className="intel-tabs">
          {(['overview', 'tires', 'competitors', 'strategy', 'incidents'] as const).map(tab => (
            <button
              key={tab}
              className={`intel-tab ${activeSection === tab ? 'active' : ''}`}
              onClick={() => setActiveSection(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-content">
        {activeSection === 'overview' && <OverviewSection intelligence={intelligence} />}
        {activeSection === 'tires' && <TireSection analysis={intelligence.tireAnalysis} />}
        {activeSection === 'competitors' && <CompetitorSection strategies={intelligence.competitorStrategies} />}
        {activeSection === 'strategy' && <StrategySection recommendations={intelligence.strategyRecommendations} />}
        {activeSection === 'incidents' && <IncidentSection incidents={intelligence.incidents} />}
      </div>
    </div>
  );
}

function OverviewSection({ intelligence }: { intelligence: RaceIntelligenceState }) {
  const { tireAnalysis, fuelAnalysis, competitorStrategies, incidents } = intelligence;
  
  const highThreats = competitorStrategies.filter(c => c.threatLevel === 'high').length;
  const activeIncidents = incidents.length;

  return (
    <div className="overview-section">
      <div className="overview-grid">
        <div className={`overview-card ${tireAnalysis?.pitUrgency === 'immediate' ? 'critical' : tireAnalysis?.pitUrgency === 'next-lap' ? 'warning' : ''}`}>
          <div className="card-icon">🛞</div>
          <div className="card-content">
            <div className="card-label">Tire Status</div>
            <div className="card-value">{tireAnalysis?.avgWear.toFixed(0) || '--'}%</div>
            <div className="card-sub">{tireAnalysis?.estimatedLapsRemaining || '--'} laps left</div>
          </div>
        </div>

        <div className={`overview-card ${fuelAnalysis?.savingRequired ? 'warning' : ''}`}>
          <div className="card-icon">⛽</div>
          <div className="card-content">
            <div className="card-label">Fuel Status</div>
            <div className="card-value">{fuelAnalysis?.currentFuel.toFixed(0) || '--'}L</div>
            <div className="card-sub">{fuelAnalysis?.lapsRemaining || '--'} laps range</div>
          </div>
        </div>

        <div className={`overview-card ${highThreats > 0 ? 'warning' : ''}`}>
          <div className="card-icon">🏎️</div>
          <div className="card-content">
            <div className="card-label">Threats</div>
            <div className="card-value">{highThreats}</div>
            <div className="card-sub">cars within 2s</div>
          </div>
        </div>

        <div className={`overview-card ${activeIncidents > 0 ? 'critical' : ''}`}>
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <div className="card-label">Incidents</div>
            <div className="card-value">{activeIncidents}</div>
            <div className="card-sub">active alerts</div>
          </div>
        </div>
      </div>

      <div className="quick-insights">
        <h4>Quick Analysis</h4>
        {tireAnalysis && (
          <div className={`insight-item ${tireAnalysis.pitUrgency !== 'none' ? 'highlight' : ''}`}>
            <span className="insight-icon">🛞</span>
            <span>{tireAnalysis.recommendation}</span>
          </div>
        )}
        {fuelAnalysis && (
          <div className={`insight-item ${fuelAnalysis.savingRequired ? 'highlight' : ''}`}>
            <span className="insight-icon">⛽</span>
            <span>{fuelAnalysis.recommendation}</span>
          </div>
        )}
        {competitorStrategies.filter(c => c.threatLevel === 'high').slice(0, 1).map(threat => (
          <div key={threat.driver} className="insight-item highlight">
            <span className="insight-icon">🏎️</span>
            <span>{threat.driver}: {threat.strategyPrediction}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TireSection({ analysis }: { analysis: TireAnalysis | null }) {
  if (!analysis) {
    return <div className="no-data">No tire data available</div>;
  }

  return (
    <div className="tire-section">
      <div className="tire-diagram">
        <div className="tire-car">
          <div className={`tire front-left ${getTireClass(analysis.frontLeftWear)}`}>
            <span className="tire-wear">{analysis.frontLeftWear.toFixed(0)}%</span>
            <span className="tire-label">FL</span>
          </div>
          <div className={`tire front-right ${getTireClass(analysis.frontRightWear)}`}>
            <span className="tire-wear">{analysis.frontRightWear.toFixed(0)}%</span>
            <span className="tire-label">FR</span>
          </div>
          <div className="car-body"></div>
          <div className={`tire rear-left ${getTireClass(analysis.rearLeftWear)}`}>
            <span className="tire-wear">{analysis.rearLeftWear.toFixed(0)}%</span>
            <span className="tire-label">RL</span>
          </div>
          <div className={`tire rear-right ${getTireClass(analysis.rearRightWear)}`}>
            <span className="tire-wear">{analysis.rearRightWear.toFixed(0)}%</span>
            <span className="tire-label">RR</span>
          </div>
        </div>
      </div>

      <div className="tire-stats">
        <div className="stat-row">
          <span className="stat-label">Compound</span>
          <span className="stat-value">{analysis.compound}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg Wear</span>
          <span className={`stat-value ${analysis.avgWear > 70 ? 'danger' : analysis.avgWear > 50 ? 'warning' : ''}`}>
            {analysis.avgWear.toFixed(1)}%
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Wear Rate</span>
          <span className="stat-value">{analysis.wearRate.toFixed(2)}% / lap</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Laps Remaining</span>
          <span className={`stat-value ${analysis.estimatedLapsRemaining < 5 ? 'danger' : ''}`}>
            ~{analysis.estimatedLapsRemaining}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Temperature</span>
          <span className={`stat-value ${analysis.temperatureStatus}`}>{analysis.temperatureStatus.toUpperCase()}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Pressure</span>
          <span className="stat-value">{analysis.pressureStatus.toUpperCase()}</span>
        </div>
      </div>

      <div className={`tire-recommendation ${analysis.pitUrgency}`}>
        <strong>Recommendation:</strong> {analysis.recommendation}
      </div>
    </div>
  );
}

function getTireClass(wear: number): string {
  if (wear > 80) return 'critical';
  if (wear > 60) return 'worn';
  if (wear > 40) return 'used';
  return 'fresh';
}

function CompetitorSection({ strategies }: { strategies: CompetitorStrategy[] }) {
  if (strategies.length === 0) {
    return <div className="no-data">No competitor data available</div>;
  }

  return (
    <div className="competitor-section">
      <div className="competitor-list">
        {strategies.map(comp => (
          <div key={comp.driver} className={`competitor-card threat-${comp.threatLevel}`}>
            <div className="comp-header">
              <span className="comp-position">P{comp.position}</span>
              <span className="comp-name">{comp.driver}</span>
              <span className={`threat-badge ${comp.threatLevel}`}>{comp.threatLevel.toUpperCase()}</span>
            </div>
            <div className="comp-stats">
              <div className="comp-stat">
                <span className="label">Tire Age</span>
                <span className="value">{comp.tireAge} laps</span>
              </div>
              <div className="comp-stat">
                <span className="label">Est. Wear</span>
                <span className="value">{comp.estimatedTireWear.toFixed(0)}%</span>
              </div>
              <div className="comp-stat">
                <span className="label">Pace</span>
                <span className={`value ${comp.paceTrend}`}>{comp.paceTrend}</span>
              </div>
              <div className="comp-stat">
                <span className="label">Pit Stops</span>
                <span className="value">{comp.pitStops}</span>
              </div>
            </div>
            {comp.predictedPitWindow && (
              <div className="pit-prediction">
                Expected pit: Lap {comp.predictedPitWindow.earliest}-{comp.predictedPitWindow.latest}
              </div>
            )}
            <div className="strategy-prediction">{comp.strategyPrediction}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategySection({ recommendations }: { recommendations: StrategyRecommendation[] }) {
  if (recommendations.length === 0) {
    return <div className="no-data">No strategy recommendations available</div>;
  }

  return (
    <div className="strategy-section">
      {recommendations.map(strat => (
        <div key={strat.id} className={`strategy-card ${strat.isRecommended ? 'recommended' : ''} ${strat.riskLevel}`}>
          <div className="strat-header">
            <span className="strat-name">{strat.name}</span>
            {strat.isRecommended && <span className="recommended-badge">RECOMMENDED</span>}
            <span className={`risk-badge ${strat.riskLevel}`}>{strat.riskLevel}</span>
          </div>
          <p className="strat-desc">{strat.description}</p>
          
          <div className="strat-details">
            <div className="detail">
              <span className="label">Pit Laps</span>
              <span className="value">{strat.pitLaps.length > 0 ? strat.pitLaps.join(', ') : 'None'}</span>
            </div>
            <div className="detail">
              <span className="label">Tires</span>
              <span className="value">{strat.tireCompounds.join(' → ')}</span>
            </div>
            <div className="detail">
              <span className="label">Est. Finish</span>
              <span className="value">P{strat.estimatedFinishPosition}</span>
            </div>
            <div className="detail">
              <span className="label">Confidence</span>
              <span className="value">{strat.confidence}%</span>
            </div>
          </div>

          <div className="pros-cons">
            <div className="pros">
              <strong>Pros:</strong>
              <ul>{strat.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
            <div className="cons">
              <strong>Cons:</strong>
              <ul>{strat.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentSection({ incidents }: { incidents: IncidentData[] }) {
  if (incidents.length === 0) {
    return (
      <div className="incident-section">
        <div className="no-incidents">
          <span className="check-icon">✓</span>
          <span>No active incidents</span>
        </div>
      </div>
    );
  }

  return (
    <div className="incident-section">
      {incidents.map(incident => (
        <div key={incident.id} className={`incident-card ${incident.severity}`}>
          <div className="incident-header">
            <span className="incident-type">{incident.type.toUpperCase().replace('-', ' ')}</span>
            <span className={`severity-badge ${incident.severity}`}>{incident.severity}</span>
          </div>
          <p className="incident-message">{incident.message}</p>
          <div className="incident-details">
            {incident.distanceAhead && (
              <span className="distance ahead">{incident.distanceAhead.toFixed(0)}m AHEAD</span>
            )}
            {incident.distanceBehind && (
              <span className="distance behind">{incident.distanceBehind.toFixed(0)}m BEHIND</span>
            )}
            <span className="affected">Affected: {incident.affectedDrivers.join(', ')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
