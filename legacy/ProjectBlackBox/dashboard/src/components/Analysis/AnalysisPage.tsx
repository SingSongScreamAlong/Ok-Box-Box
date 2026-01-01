import React, { useState } from 'react';
import { TelemetryData } from '../../services/WebSocketService';
import TelemetryAnalysis from './TelemetryAnalysis';
import IncidentAnalysis from './IncidentAnalysis';
import TrainingGoals from '../Training/TrainingGoals';
import './AnalysisPage.css';

interface AnalysisPageProps {
  telemetryData: TelemetryData | null;
  sessionId?: string;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({ telemetryData, sessionId }) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'incidents' | 'laps' | 'comparison' | 'training'>('telemetry');

  return (
    <div className="analysis-page">
      <div className="analysis-tabs">
        <button 
          className={activeTab === 'telemetry' ? 'active' : ''} 
          onClick={() => setActiveTab('telemetry')}
        >
          📈 Telemetry Graphs
        </button>
        <button 
          className={activeTab === 'incidents' ? 'active' : ''} 
          onClick={() => setActiveTab('incidents')}
        >
          ⚠️ Incident Analysis
        </button>
        <button 
          className={activeTab === 'laps' ? 'active' : ''} 
          onClick={() => setActiveTab('laps')}
        >
          🏁 Lap Comparison
        </button>
        <button 
          className={activeTab === 'comparison' ? 'active' : ''} 
          onClick={() => setActiveTab('comparison')}
        >
          👥 Driver Comparison
        </button>
        <button 
          className={activeTab === 'training' ? 'active' : ''} 
          onClick={() => setActiveTab('training')}
        >
          🎯 Training Goals
        </button>
      </div>

      <div className="analysis-content">
        {activeTab === 'telemetry' && (
          <TelemetryAnalysis telemetryData={telemetryData} />
        )}
        
        {activeTab === 'incidents' && (
          <IncidentAnalysis sessionId={sessionId} />
        )}
        
        {activeTab === 'laps' && (
          <div className="lap-comparison">
            <div className="comparison-header">
              <h3>Lap Time Comparison</h3>
              <div className="lap-selectors">
                <select defaultValue="best">
                  <option value="best">Best Lap</option>
                  <option value="last">Last Lap</option>
                  <option value="1">Lap 1</option>
                  <option value="2">Lap 2</option>
                  <option value="3">Lap 3</option>
                </select>
                <span>vs</span>
                <select defaultValue="theoretical">
                  <option value="theoretical">Theoretical Best</option>
                  <option value="reference">Reference Lap</option>
                  <option value="leader">Class Leader</option>
                </select>
              </div>
            </div>
            
            <div className="sector-comparison">
              <div className="sector-card">
                <div className="sector-header">Sector 1</div>
                <div className="sector-times">
                  <div className="time-row">
                    <span className="label">Your Best</span>
                    <span className="time">28.456</span>
                  </div>
                  <div className="time-row">
                    <span className="label">Reference</span>
                    <span className="time">28.123</span>
                  </div>
                  <div className="time-row delta negative">
                    <span className="label">Delta</span>
                    <span className="time">+0.333</span>
                  </div>
                </div>
                <div className="sector-tip">
                  💡 Brake 5m later into Abbey for 0.2s gain
                </div>
              </div>
              
              <div className="sector-card">
                <div className="sector-header">Sector 2</div>
                <div className="sector-times">
                  <div className="time-row">
                    <span className="label">Your Best</span>
                    <span className="time">35.789</span>
                  </div>
                  <div className="time-row">
                    <span className="label">Reference</span>
                    <span className="time">35.654</span>
                  </div>
                  <div className="time-row delta negative">
                    <span className="label">Delta</span>
                    <span className="time">+0.135</span>
                  </div>
                </div>
                <div className="sector-tip">
                  💡 Carry more speed through Maggots-Becketts
                </div>
              </div>
              
              <div className="sector-card best">
                <div className="sector-header">Sector 3</div>
                <div className="sector-times">
                  <div className="time-row">
                    <span className="label">Your Best</span>
                    <span className="time">23.234</span>
                  </div>
                  <div className="time-row">
                    <span className="label">Reference</span>
                    <span className="time">23.345</span>
                  </div>
                  <div className="time-row delta positive">
                    <span className="label">Delta</span>
                    <span className="time">-0.111</span>
                  </div>
                </div>
                <div className="sector-tip">
                  ✅ Great exit from Club corner!
                </div>
              </div>
            </div>

            <div className="theoretical-best">
              <h4>Theoretical Best Lap</h4>
              <div className="theoretical-time">1:27.479</div>
              <div className="theoretical-breakdown">
                <span>S1: 28.456</span>
                <span>S2: 35.789</span>
                <span>S3: 23.234</span>
              </div>
              <div className="potential-gain">
                Potential gain from reference: <strong>-0.357s</strong>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'comparison' && (
          <div className="driver-comparison">
            <div className="comparison-header">
              <h3>Driver Comparison</h3>
              <div className="driver-selectors">
                <select defaultValue="you">
                  <option value="you">YOU</option>
                </select>
                <span>vs</span>
                <select defaultValue="leader">
                  <option value="leader">Class Leader</option>
                  <option value="verstappen">VERSTAPPEN</option>
                  <option value="hamilton">HAMILTON</option>
                </select>
              </div>
            </div>

            <div className="comparison-metrics">
              <div className="metric-row">
                <span className="metric-name">Best Lap</span>
                <div className="metric-bar">
                  <div className="bar-fill you" style={{ width: '95%' }}></div>
                </div>
                <span className="metric-value you">1:28.234</span>
                <div className="metric-bar">
                  <div className="bar-fill other" style={{ width: '100%' }}></div>
                </div>
                <span className="metric-value other">1:27.654</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-name">Top Speed</span>
                <div className="metric-bar">
                  <div className="bar-fill you" style={{ width: '97%' }}></div>
                </div>
                <span className="metric-value you">312 km/h</span>
                <div className="metric-bar">
                  <div className="bar-fill other" style={{ width: '100%' }}></div>
                </div>
                <span className="metric-value other">318 km/h</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-name">Avg Corner Speed</span>
                <div className="metric-bar">
                  <div className="bar-fill you" style={{ width: '92%' }}></div>
                </div>
                <span className="metric-value you">145 km/h</span>
                <div className="metric-bar">
                  <div className="bar-fill other" style={{ width: '100%' }}></div>
                </div>
                <span className="metric-value other">152 km/h</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-name">Consistency</span>
                <div className="metric-bar">
                  <div className="bar-fill you" style={{ width: '88%' }}></div>
                </div>
                <span className="metric-value you">88%</span>
                <div className="metric-bar">
                  <div className="bar-fill other" style={{ width: '95%' }}></div>
                </div>
                <span className="metric-value other">95%</span>
              </div>
              
              <div className="metric-row">
                <span className="metric-name">Tire Management</span>
                <div className="metric-bar">
                  <div className="bar-fill you" style={{ width: '82%' }}></div>
                </div>
                <span className="metric-value you">82%</span>
                <div className="metric-bar">
                  <div className="bar-fill other" style={{ width: '91%' }}></div>
                </div>
                <span className="metric-value other">91%</span>
              </div>
            </div>

            <div className="comparison-insights">
              <h4>📊 Comparison Insights</h4>
              <ul>
                <li>You're losing 0.4s in Sector 2 through the high-speed complex</li>
                <li>Your braking points are 8m earlier on average</li>
                <li>Corner exit speeds are 3-5 km/h slower</li>
                <li>Tire wear rate is 12% higher - consider smoother inputs</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <TrainingGoals />
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
