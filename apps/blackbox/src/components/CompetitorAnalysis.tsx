import type { CompetitorData, StrategyData } from '../types';
import './CompetitorAnalysis.css';

interface CompetitorAnalysisProps {
  competitorData: CompetitorData[] | null;
  strategyData: StrategyData | null;
}

export default function CompetitorAnalysis({ competitorData, strategyData }: CompetitorAnalysisProps) {
  const competitors = competitorData || [];

  return (
    <div className="panel competitor-panel">
      <div className="panel-header">COMPETITOR ANALYSIS</div>
      <div className="panel-content">
        <div className="competitor-list">
          {competitors.length > 0 ? (
            <>
              <div className="competitor-header">
                <span className="col-pos">POS</span>
                <span className="col-driver">DRIVER</span>
                <span className="col-gap">GAP</span>
                <span className="col-last">LAST</span>
              </div>
              {competitors.map((competitor, index) => (
                <div 
                  key={index} 
                  className={`competitor-row ${competitor.onPitRoad ? 'in-pit' : ''}`}
                >
                  <span className="col-pos">
                    <span className="position-badge">{competitor.position}</span>
                  </span>
                  <span className="col-driver">{competitor.driver}</span>
                  <span className="col-gap mono">{competitor.gap}</span>
                  <span className="col-last mono">{competitor.lastLap}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="competitor-empty">
              <p>Waiting for competitor data...</p>
            </div>
          )}
        </div>

        {strategyData && (
          <div className="strategy-section">
            <div className="strategy-title">RACE STRATEGY</div>
            <div className="strategy-grid">
              <div className="strategy-item">
                <span className="strategy-label">Pit Window</span>
                <span className="strategy-value">{strategyData.pitWindow}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Optimal Pit</span>
                <span className="strategy-value text-cyan">{strategyData.optimalPit}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Tire Strategy</span>
                <span className="strategy-value">{strategyData.tireStrategy}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Fuel Strategy</span>
                <span className="strategy-value">{strategyData.fuelStrategy}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Pace Target</span>
                <span className="strategy-value text-green">{strategyData.paceTarget}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Position Prediction</span>
                <span className="strategy-value">{strategyData.positionPrediction}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Undercut Risk</span>
                <span className="strategy-value text-yellow">{strategyData.undercutRisk}</span>
              </div>
              <div className="strategy-item">
                <span className="strategy-label">Tire Life</span>
                <span className="strategy-value">{strategyData.tireLife}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
