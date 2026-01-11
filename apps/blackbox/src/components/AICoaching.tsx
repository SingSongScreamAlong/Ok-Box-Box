import { useEffect, useRef, useState } from 'react';
import type { CoachingInsight, DriverSkillAnalysis } from '../types';
import voiceService from '../services/VoiceService';
import './AICoaching.css';

interface AICoachingProps {
  insights: CoachingInsight[] | null;
  skillAnalysis: DriverSkillAnalysis | null;
}

export default function AICoaching({ insights, skillAnalysis }: AICoachingProps) {
  const displayInsights = insights || [];
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const spokenInsightsRef = useRef<Set<string>>(new Set());

  // Speak critical and high priority insights
  useEffect(() => {
    if (!voiceEnabled || !insights) return;

    insights.forEach(insight => {
      const insightKey = `${insight.title}-${insight.description}`;
      
      // Only speak if not already spoken and is high priority
      if (!spokenInsightsRef.current.has(insightKey) && 
          (insight.priority === 'critical' || insight.priority === 'high')) {
        spokenInsightsRef.current.add(insightKey);
        
        // Format message for speech
        const message = `${insight.title}. ${insight.description}`;
        voiceService.speak(message, insight.priority === 'critical' ? 'high' : 'normal');
      }
    });
  }, [insights, voiceEnabled]);

  const getRatingText = (rating: number): string => {
    if (rating >= 90) return 'Excellent';
    if (rating >= 80) return 'Good';
    if (rating >= 70) return 'Fair';
    if (rating >= 60) return 'Needs Work';
    return 'Poor';
  };

  const getPriorityClass = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'priority-critical';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  };

  return (
    <div className="panel ai-coaching-panel">
      <div className="panel-header">
        AI COACH - ACTIONABLE INSIGHTS
        <button 
          className={`voice-toggle ${voiceEnabled ? 'enabled' : ''}`}
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
        >
          {voiceEnabled ? '🔊' : '🔇'}
        </button>
      </div>
      <div className="panel-content">
        <div className="ai-insights">
          {displayInsights.length > 0 ? (
            displayInsights.map((insight, index) => (
              <div key={index} className={`insight-card ${getPriorityClass(insight.priority)}`}>
                <div className="insight-header">
                  <span className="insight-category">{insight.category || insight.priority}</span>
                  <span className="insight-confidence">{insight.confidence}% confidence</span>
                </div>
                <div className="insight-title">{insight.title}</div>
                <div className="insight-description">{insight.description}</div>
                <div className="insight-impact">{insight.impact}</div>
              </div>
            ))
          ) : (
            <div className="ai-empty">
              <div className="ai-empty-icon">🤖</div>
              <p>AI Coach is analyzing your driving...</p>
              <p className="text-muted">Insights will appear as you drive</p>
            </div>
          )}
        </div>

        {skillAnalysis && (
          <div className="skill-analysis">
            <div className="skill-section-title">DRIVER SKILL ANALYSIS</div>
            
            <div className="skill-overall">
              <span className="skill-overall-label">Overall Rating</span>
              <span className="skill-overall-value">{skillAnalysis.overallRating}%</span>
            </div>

            <div className="skill-group">
              <div className="skill-group-title">Strengths</div>
              {skillAnalysis.strengths.map((strength, index) => (
                <div key={index} className="skill-item strength">
                  <span className="skill-name">{strength.skill}</span>
                  <div className="skill-bar">
                    <div className="skill-fill" style={{ width: `${strength.rating}%` }}></div>
                  </div>
                  <span className="skill-rating">{strength.rating}%</span>
                  <span className="skill-text">{getRatingText(strength.rating)}</span>
                </div>
              ))}
            </div>

            <div className="skill-group">
              <div className="skill-group-title">Focus Areas</div>
              {skillAnalysis.focusAreas.map((area, index) => (
                <div key={index} className="skill-item focus">
                  <span className="skill-name">{area.skill}</span>
                  <div className="skill-bar">
                    <div className="skill-fill" style={{ width: `${area.rating}%` }}></div>
                  </div>
                  <span className="skill-rating">{area.rating}%</span>
                  <span className="skill-text">{getRatingText(area.rating)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
