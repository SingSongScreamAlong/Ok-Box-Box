import { useState } from 'react';
import type { 
  SetupAnalysisState, 
  SetupRecommendation,
  HandlingCharacteristic,
  CornerAnalysis,
  BrakeAnalysis,
  AeroBalance,
  TireSetupAnalysis,
  DifferentialAnalysis,
  GearAnalysis,
} from '../services/SetupEngine';
import './SetupPage.css';

interface SetupPageProps {
  analysis: SetupAnalysisState | null;
  sessionType: 'practice' | 'qualifying' | 'race';
}

export default function SetupPage({ analysis, sessionType }: SetupPageProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'handling' | 'differential' | 'gears' | 'brakes' | 'aero' | 'tires' | 'corners'>('overview');

  if (!analysis || analysis.lapsAnalyzed < 1) {
    return (
      <div className="setup-page">
        <div className="setup-header">
          <h2>Setup Analysis</h2>
          <div className="session-badge">{sessionType.toUpperCase()}</div>
        </div>
        <div className="setup-waiting">
          <div className="waiting-icon">🔧</div>
          <h3>Collecting Data...</h3>
          <p>Complete at least 1 lap to begin setup analysis.</p>
          <p className="hint">The more laps you complete, the more accurate the recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <div className="setup-header">
        <h2>Setup Analysis</h2>
        <div className="header-info">
          <span className="session-badge">{sessionType.toUpperCase()}</span>
          <span className="laps-badge">{analysis.lapsAnalyzed} laps analyzed</span>
          <span className="confidence-badge">
            {analysis.confidence}% confidence
          </span>
        </div>
      </div>

      <div className="setup-nav">
        {(['overview', 'handling', 'differential', 'gears', 'brakes', 'aero', 'tires', 'corners'] as const).map(section => (
          <button
            key={section}
            className={`setup-nav-btn ${activeSection === section ? 'active' : ''}`}
            onClick={() => setActiveSection(section)}
          >
            {section.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="setup-content">
        {activeSection === 'overview' && (
          <OverviewSection analysis={analysis} sessionType={sessionType} />
        )}
        {activeSection === 'handling' && (
          <HandlingSection handling={analysis.overallHandling} corners={analysis.cornerAnalysis} />
        )}
        {activeSection === 'differential' && (
          <DifferentialSection diff={analysis.differentialAnalysis} />
        )}
        {activeSection === 'gears' && (
          <GearsSection gears={analysis.gearAnalysis} />
        )}
        {activeSection === 'brakes' && (
          <BrakeSection brakes={analysis.brakeAnalysis} />
        )}
        {activeSection === 'aero' && (
          <AeroSection aero={analysis.aeroBalance} />
        )}
        {activeSection === 'tires' && (
          <TireSection tires={analysis.tireAnalysis} />
        )}
        {activeSection === 'corners' && (
          <CornerSection corners={analysis.cornerAnalysis} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW SECTION
// ============================================================================

function OverviewSection({ analysis, sessionType }: { analysis: SetupAnalysisState; sessionType: string }) {
  const { overallHandling, recommendations, brakeAnalysis, aeroBalance } = analysis;

  // Filter recommendations by session type
  const relevantRecs = recommendations.filter(r => 
    r.sessionType === 'all' || r.sessionType === sessionType
  );

  const criticalRecs = relevantRecs.filter(r => r.priority === 'critical');
  const highRecs = relevantRecs.filter(r => r.priority === 'high');

  return (
    <div className="overview-section">
      {/* Quick Status Cards */}
      <div className="status-cards">
        <div className={`status-card ${overallHandling?.type || 'neutral'}`}>
          <div className="card-icon">
            {overallHandling?.type === 'understeer' ? '↩️' : 
             overallHandling?.type === 'oversteer' ? '↪️' : '⚖️'}
          </div>
          <div className="card-content">
            <div className="card-label">Handling Balance</div>
            <div className="card-value">
              {overallHandling?.type?.toUpperCase() || 'ANALYZING...'}
            </div>
            <div className="card-sub">
              {overallHandling?.severity || 'N/A'} severity
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon">🛑</div>
          <div className="card-content">
            <div className="card-label">Brake Bias</div>
            <div className="card-value">{brakeAnalysis?.frontBias || '--'}%</div>
            <div className="card-sub">
              {brakeAnalysis?.brakingEfficiency.toFixed(0) || '--'}% efficiency
            </div>
          </div>
        </div>

        <div className={`status-card ${aeroBalance?.currentBalance || ''}`}>
          <div className="card-icon">💨</div>
          <div className="card-content">
            <div className="card-label">Aero Balance</div>
            <div className="card-value">
              {aeroBalance?.currentBalance?.replace('-', ' ').toUpperCase() || 'ANALYZING...'}
            </div>
            <div className="card-sub">
              Stability: {aeroBalance?.highSpeedStability || '--'}%
            </div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">Recommendations</div>
            <div className="card-value">{relevantRecs.length}</div>
            <div className="card-sub">
              {criticalRecs.length} critical, {highRecs.length} high
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalRecs.length > 0 && (
        <div className="critical-alerts">
          <h3>⚠️ Critical Issues</h3>
          {criticalRecs.map(rec => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}

      {/* Top Recommendations */}
      <div className="top-recommendations">
        <h3>Top Recommendations</h3>
        {relevantRecs.slice(0, 5).map(rec => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
        {relevantRecs.length === 0 && (
          <div className="no-recs">
            <p>No setup changes recommended at this time.</p>
            <p className="hint">Continue driving to gather more data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: SetupRecommendation }) {
  return (
    <div className={`recommendation-card priority-${rec.priority}`}>
      <div className="rec-header">
        <span className="rec-category">{rec.category.toUpperCase()}</span>
        <span className="rec-component">{rec.component}</span>
        <span className={`rec-priority ${rec.priority}`}>{rec.priority.toUpperCase()}</span>
      </div>
      <div className="rec-issue">{rec.currentIssue}</div>
      <div className="rec-action">
        <strong>Action:</strong> {rec.recommendation}
      </div>
      <div className="rec-details">
        <span className="rec-adjustment">{rec.adjustment}</span>
        <span className="rec-impact">{rec.impact}</span>
        <span className="rec-confidence">{rec.confidence}% confidence</span>
      </div>
    </div>
  );
}

// ============================================================================
// HANDLING SECTION
// ============================================================================

function HandlingSection({ handling, corners }: { handling: HandlingCharacteristic | null; corners: CornerAnalysis[] }) {
  return (
    <div className="handling-section">
      <div className="handling-overview">
        <h3>Overall Handling Characteristic</h3>
        {handling ? (
          <div className={`handling-display ${handling.type}`}>
            <div className="handling-visual">
              <div className="car-diagram">
                <div className={`car-front ${handling.type === 'understeer' ? 'highlight' : ''}`}>
                  {handling.type === 'understeer' && <span className="arrow">→</span>}
                </div>
                <div className="car-body"></div>
                <div className={`car-rear ${handling.type === 'oversteer' ? 'highlight' : ''}`}>
                  {handling.type === 'oversteer' && <span className="arrow">→</span>}
                </div>
              </div>
            </div>
            <div className="handling-info">
              <div className="handling-type">{handling.type.toUpperCase()}</div>
              <div className="handling-severity">Severity: {handling.severity}</div>
              <div className="handling-phase">Phase: {handling.phase}</div>
              <div className="handling-confidence">Confidence: {handling.confidence}%</div>
            </div>
          </div>
        ) : (
          <div className="no-data">Analyzing handling characteristics...</div>
        )}
      </div>

      <div className="handling-explanation">
        <h4>What This Means</h4>
        {handling?.type === 'understeer' && (
          <div className="explanation-content">
            <p><strong>Understeer</strong> means the front of the car doesn't turn as much as you're asking it to. The car "pushes" wide in corners.</p>
            <h5>Common Causes:</h5>
            <ul>
              <li>Front anti-roll bar too stiff</li>
              <li>Front springs too stiff</li>
              <li>Not enough front downforce</li>
              <li>Front tire pressures too high</li>
              <li>Too much front camber (negative)</li>
            </ul>
          </div>
        )}
        {handling?.type === 'oversteer' && (
          <div className="explanation-content">
            <p><strong>Oversteer</strong> means the rear of the car wants to come around. The car feels "loose" or "twitchy".</p>
            <h5>Common Causes:</h5>
            <ul>
              <li>Rear anti-roll bar too stiff</li>
              <li>Rear springs too stiff</li>
              <li>Not enough rear downforce</li>
              <li>Rear tire pressures too high</li>
              <li>Differential too aggressive</li>
            </ul>
          </div>
        )}
        {handling?.type === 'neutral' && (
          <div className="explanation-content">
            <p><strong>Neutral</strong> handling means the car is well-balanced. Both ends have similar grip levels.</p>
            <p>This is generally the ideal setup - focus on fine-tuning for specific corners.</p>
          </div>
        )}
      </div>

      <div className="corner-handling-summary">
        <h4>Handling by Corner Type</h4>
        <div className="corner-type-grid">
          {['slow', 'medium', 'fast'].map(type => {
            const typeCorners = corners.filter(c => c.cornerType === type);
            const understeerCount = typeCorners.filter(c => c.midHandling?.type === 'understeer').length;
            const oversteerCount = typeCorners.filter(c => c.midHandling?.type === 'oversteer').length;
            
            return (
              <div key={type} className="corner-type-card">
                <div className="type-label">{type.toUpperCase()} CORNERS</div>
                <div className="type-stats">
                  <div className="stat understeer">
                    <span className="stat-value">{understeerCount}</span>
                    <span className="stat-label">Understeer</span>
                  </div>
                  <div className="stat oversteer">
                    <span className="stat-value">{oversteerCount}</span>
                    <span className="stat-label">Oversteer</span>
                  </div>
                  <div className="stat neutral">
                    <span className="stat-value">{typeCorners.length - understeerCount - oversteerCount}</span>
                    <span className="stat-label">Neutral</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BRAKE SECTION
// ============================================================================

function BrakeSection({ brakes }: { brakes: BrakeAnalysis | null }) {
  if (!brakes) {
    return <div className="no-data">Analyzing braking data...</div>;
  }

  return (
    <div className="brake-section">
      <div className="brake-bias-display">
        <h3>Brake Bias Analysis</h3>
        <div className="bias-visual">
          <div className="bias-bar">
            <div className="bias-front" style={{ width: `${brakes.frontBias}%` }}>
              <span>FRONT {brakes.frontBias}%</span>
            </div>
            <div className="bias-rear" style={{ width: `${100 - brakes.frontBias}%` }}>
              <span>REAR {100 - brakes.frontBias}%</span>
            </div>
          </div>
          {brakes.recommendedBias !== brakes.frontBias && (
            <div className="bias-recommendation">
              <span className="rec-arrow">→</span>
              <span>Recommended: {brakes.recommendedBias}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="brake-stats">
        <div className="stat-card">
          <div className="stat-label">Braking Efficiency</div>
          <div className="stat-value">{brakes.brakingEfficiency.toFixed(0)}%</div>
          <div className="stat-bar">
            <div className="bar-fill" style={{ width: `${brakes.brakingEfficiency}%` }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Trail Braking Usage</div>
          <div className="stat-value">{brakes.trailBrakingUsage.toFixed(0)}%</div>
          <div className="stat-bar">
            <div className="bar-fill trail" style={{ width: `${brakes.trailBrakingUsage}%` }}></div>
          </div>
        </div>

        <div className="stat-card lockups">
          <div className="stat-label">Lockup Frequency (per lap)</div>
          <div className="lockup-display">
            <div className="lockup-item front">
              <span className="lockup-label">Front</span>
              <span className="lockup-value">{brakes.lockupFrequency.front.toFixed(1)}</span>
            </div>
            <div className="lockup-item rear">
              <span className="lockup-label">Rear</span>
              <span className="lockup-value">{brakes.lockupFrequency.rear.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="brake-recommendation">
        <h4>Recommendation</h4>
        <p>{brakes.recommendation}</p>
      </div>
    </div>
  );
}

// ============================================================================
// AERO SECTION
// ============================================================================

function AeroSection({ aero }: { aero: AeroBalance | null }) {
  if (!aero) {
    return <div className="no-data">Analyzing aerodynamic balance...</div>;
  }

  return (
    <div className="aero-section">
      <div className="aero-balance-display">
        <h3>Aerodynamic Balance</h3>
        <div className={`balance-indicator ${aero.currentBalance}`}>
          <div className="balance-visual">
            <div className="front-aero">
              <span className="aero-label">FRONT</span>
              <div className={`aero-bar ${aero.currentBalance === 'front-heavy' ? 'heavy' : ''}`}></div>
            </div>
            <div className="car-silhouette">🏎️</div>
            <div className="rear-aero">
              <span className="aero-label">REAR</span>
              <div className={`aero-bar ${aero.currentBalance === 'rear-heavy' ? 'heavy' : ''}`}></div>
            </div>
          </div>
          <div className="balance-status">
            {aero.currentBalance.replace('-', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      <div className="aero-stats">
        <div className="stat-card">
          <div className="stat-label">High-Speed Stability</div>
          <div className="stat-value">{aero.highSpeedStability}%</div>
          <div className="stat-bar">
            <div className="bar-fill stability" style={{ width: `${aero.highSpeedStability}%` }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Low-Speed Rotation</div>
          <div className="stat-value">{aero.lowSpeedRotation}%</div>
          <div className="stat-bar">
            <div className="bar-fill rotation" style={{ width: `${aero.lowSpeedRotation}%` }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Drag Level</div>
          <div className="stat-value">{aero.dragLevel.toUpperCase()}</div>
        </div>
      </div>

      <div className="aero-recommendations">
        <h4>Wing Recommendations</h4>
        <div className="wing-rec front-wing">
          <span className="wing-label">Front Wing:</span>
          <span className="wing-value">{aero.recommendedFrontWing}</span>
        </div>
        <div className="wing-rec rear-wing">
          <span className="wing-label">Rear Wing:</span>
          <span className="wing-value">{aero.recommendedRearWing}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TIRE SECTION
// ============================================================================

function TireSection({ tires }: { tires: TireSetupAnalysis | null }) {
  if (!tires) {
    return <div className="no-data">Analyzing tire data...</div>;
  }

  return (
    <div className="tire-section">
      <h3>Tire Temperature Analysis</h3>
      
      <div className="tire-diagram-setup">
        <TireDisplay label="FL" data={tires.frontLeft} position="front-left" />
        <TireDisplay label="FR" data={tires.frontRight} position="front-right" />
        <div className="car-body-setup"></div>
        <TireDisplay label="RL" data={tires.rearLeft} position="rear-left" />
        <TireDisplay label="RR" data={tires.rearRight} position="rear-right" />
      </div>

      <div className="tire-recommendations">
        <h4>Setup Recommendations</h4>
        
        <div className="rec-group">
          <h5>Camber</h5>
          <div className="rec-item">
            <span className="rec-label">Front:</span>
            <span className="rec-value">{tires.frontCamberRecommendation}</span>
          </div>
          <div className="rec-item">
            <span className="rec-label">Rear:</span>
            <span className="rec-value">{tires.rearCamberRecommendation}</span>
          </div>
        </div>

        <div className="rec-group">
          <h5>Pressure</h5>
          <div className="rec-item">
            <span className="rec-label">Front:</span>
            <span className="rec-value">{tires.frontPressureRecommendation}</span>
          </div>
          <div className="rec-item">
            <span className="rec-label">Rear:</span>
            <span className="rec-value">{tires.rearPressureRecommendation}</span>
          </div>
        </div>

        <div className="rec-group">
          <h5>Toe</h5>
          <div className="rec-item">
            <span className="rec-label">Front:</span>
            <span className="rec-value">{tires.frontToeRecommendation}</span>
          </div>
          <div className="rec-item">
            <span className="rec-label">Rear:</span>
            <span className="rec-value">{tires.rearToeRecommendation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TireDisplay({ label, data, position }: { 
  label: string; 
  data: { innerTemp: number; middleTemp: number; outerTemp: number; avgTemp: number; spread: number };
  position: string;
}) {
  const getTempClass = (temp: number) => {
    if (temp < 70) return 'cold';
    if (temp > 100) return 'hot';
    if (temp > 90) return 'warm';
    return 'optimal';
  };

  return (
    <div className={`tire-display ${position}`}>
      <div className="tire-label">{label}</div>
      <div className="tire-temps">
        <div className={`temp inner ${getTempClass(data.innerTemp)}`}>
          <span className="temp-value">{data.innerTemp.toFixed(0)}°</span>
          <span className="temp-label">IN</span>
        </div>
        <div className={`temp middle ${getTempClass(data.middleTemp)}`}>
          <span className="temp-value">{data.middleTemp.toFixed(0)}°</span>
          <span className="temp-label">MID</span>
        </div>
        <div className={`temp outer ${getTempClass(data.outerTemp)}`}>
          <span className="temp-value">{data.outerTemp.toFixed(0)}°</span>
          <span className="temp-label">OUT</span>
        </div>
      </div>
      <div className="tire-spread">Spread: {data.spread.toFixed(0)}°</div>
    </div>
  );
}

// ============================================================================
// DIFFERENTIAL SECTION
// ============================================================================

function DifferentialSection({ diff }: { diff: DifferentialAnalysis | null }) {
  if (!diff) {
    return <div className="no-data">Analyzing differential behavior...</div>;
  }

  return (
    <div className="differential-section">
      <h3>Differential Analysis</h3>
      
      <div className="diff-stats">
        <div className="diff-stat-card">
          <div className="stat-header">Power-On Behavior</div>
          <div className="stat-visual">
            <div className="behavior-meter">
              <div className="meter-label left">Understeer</div>
              <div className="meter-bar">
                <div 
                  className={`meter-indicator ${diff.rotationOnPower}`}
                  style={{ left: `${50 + (diff.powerOversteer - 50) * 0.8}%` }}
                ></div>
              </div>
              <div className="meter-label right">Oversteer</div>
            </div>
          </div>
          <div className={`rotation-status ${diff.rotationOnPower}`}>
            {diff.rotationOnPower === 'too-much' ? '⚠️ Too Much Rotation' :
             diff.rotationOnPower === 'too-little' ? '⚠️ Not Enough Rotation' :
             '✓ Good Balance'}
          </div>
          <div className="diff-recommendation">{diff.recommendedPower}</div>
        </div>

        <div className="diff-stat-card">
          <div className="stat-header">Coast/Lift-Off Behavior</div>
          <div className="stat-visual">
            <div className="behavior-meter">
              <div className="meter-label left">Stable</div>
              <div className="meter-bar">
                <div 
                  className={`meter-indicator ${diff.rotationOnCoast}`}
                  style={{ left: `${50 + (diff.coastOversteer - 50) * 0.8}%` }}
                ></div>
              </div>
              <div className="meter-label right">Loose</div>
            </div>
          </div>
          <div className={`rotation-status ${diff.rotationOnCoast}`}>
            {diff.rotationOnCoast === 'too-much' ? '⚠️ Snapping Loose' :
             diff.rotationOnCoast === 'too-little' ? '⚠️ Too Stable' :
             '✓ Good Balance'}
          </div>
          <div className="diff-recommendation">{diff.recommendedCoast}</div>
        </div>

        <div className="diff-stat-card traction">
          <div className="stat-header">Traction Rating</div>
          <div className="traction-gauge">
            <div className="gauge-fill" style={{ width: `${diff.tractionRating}%` }}></div>
            <span className="gauge-value">{diff.tractionRating.toFixed(0)}%</span>
          </div>
          <div className="diff-recommendation">{diff.recommendedPreload}</div>
        </div>
      </div>

      <div className="diff-overall-recommendation">
        <h4>Recommendation</h4>
        <p>{diff.recommendation}</p>
      </div>

      <div className="diff-explanation">
        <h4>Understanding Differential Settings</h4>
        <div className="explanation-grid">
          <div className="exp-item">
            <strong>Power Setting</strong>
            <p>Controls how much the diff locks under acceleration. Higher = more rotation but less traction.</p>
          </div>
          <div className="exp-item">
            <strong>Coast Setting</strong>
            <p>Controls diff behavior when lifting throttle. Higher = more rotation on lift-off.</p>
          </div>
          <div className="exp-item">
            <strong>Preload</strong>
            <p>Initial locking force. Higher = more stability but can cause understeer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GEARS SECTION
// ============================================================================

function GearsSection({ gears }: { gears: GearAnalysis | null }) {
  if (!gears || gears.gearData.length === 0) {
    return <div className="no-data">Analyzing gear usage...</div>;
  }

  return (
    <div className="gears-section">
      <h3>Gear Ratio Analysis</h3>
      
      <div className="gear-overview">
        <div className="gear-stat">
          <span className="stat-label">Top Speed Gear</span>
          <span className="stat-value">{gears.topSpeedGear}</span>
        </div>
        <div className="gear-stat">
          <span className="stat-label">Top Speed RPM</span>
          <span className="stat-value">{gears.topSpeedRpm.toFixed(0)}</span>
        </div>
      </div>

      <div className="gear-table">
        <div className="gear-table-header">
          <span>Gear</span>
          <span>Min RPM</span>
          <span>Max RPM</span>
          <span>Avg RPM</span>
          <span>Time %</span>
          <span>Shift Point</span>
          <span>Recommendation</span>
        </div>
        {gears.gearData.map(gear => (
          <div key={gear.gear} className="gear-row">
            <span className="gear-number">{gear.gear}</span>
            <span>{gear.minRpm.toFixed(0)}</span>
            <span>{gear.maxRpm.toFixed(0)}</span>
            <span>{gear.avgRpm.toFixed(0)}</span>
            <span>{gear.timeInGear.toFixed(1)}%</span>
            <span className={gear.currentShiftPoint < gear.optimalShiftPoint - 300 ? 'warning' : ''}>
              {gear.currentShiftPoint.toFixed(0)}
            </span>
            <span className="gear-rec">{gear.recommendation}</span>
          </div>
        ))}
      </div>

      <div className="gear-recommendations">
        <div className="rec-card">
          <h4>Overall</h4>
          <p>{gears.overallRecommendation}</p>
        </div>
        <div className="rec-card">
          <h4>Final Drive</h4>
          <p>{gears.finalDriveRecommendation}</p>
        </div>
      </div>

      <div className="gear-tips">
        <h4>Gear Ratio Tips</h4>
        <ul>
          <li><strong>Hitting rev limiter on straights?</strong> Lengthen final drive or top gear.</li>
          <li><strong>Not reaching redline?</strong> Shorten final drive for better acceleration.</li>
          <li><strong>Large RPM drops between gears?</strong> Adjust individual ratios to close gaps.</li>
          <li><strong>Shifting early?</strong> Most power is near redline - shift later for more speed.</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// CORNER SECTION
// ============================================================================

function CornerSection({ corners }: { corners: CornerAnalysis[] }) {
  if (corners.length === 0) {
    return <div className="no-data">Analyzing corner data...</div>;
  }

  return (
    <div className="corner-section">
      <h3>Corner-by-Corner Analysis</h3>
      
      <div className="corner-list">
        {corners.map(corner => (
          <div key={corner.cornerId} className="corner-card">
            <div className="corner-header">
              <span className="corner-id">Turn {corner.cornerId + 1}</span>
              <span className={`corner-type ${corner.cornerType}`}>{corner.cornerType.toUpperCase()}</span>
              <span className="corner-speed">{corner.avgSpeed.toFixed(0)} km/h avg</span>
            </div>
            
            <div className="corner-phases">
              <PhaseIndicator label="Entry" handling={corner.entryHandling} />
              <PhaseIndicator label="Mid" handling={corner.midHandling} />
              <PhaseIndicator label="Exit" handling={corner.exitHandling} />
            </div>

            <div className="corner-stats">
              <div className="corner-stat">
                <span className="stat-label">Braking</span>
                <span className={`stat-value ${corner.brakingStability}`}>{corner.brakingStability}</span>
              </div>
              <div className="corner-stat">
                <span className="stat-label">Traction</span>
                <span className={`stat-value ${corner.tractionLevel === 'good' ? 'good' : 'poor'}`}>{corner.tractionLevel}</span>
              </div>
              <div className="corner-stat">
                <span className="stat-label">Min Speed</span>
                <span className="stat-value">{corner.minSpeed.toFixed(0)} km/h</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseIndicator({ label, handling }: { label: string; handling: HandlingCharacteristic | null }) {
  return (
    <div className={`phase-indicator ${handling?.type || 'neutral'}`}>
      <span className="phase-label">{label}</span>
      <span className="phase-value">
        {handling?.type === 'understeer' ? 'US' : 
         handling?.type === 'oversteer' ? 'OS' : '—'}
      </span>
    </div>
  );
}
