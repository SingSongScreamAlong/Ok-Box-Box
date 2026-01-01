import React from 'react';
import { CoachingInsight, DriverSkillAnalysis } from '../../services/WebSocketService';

interface AICoachingProps {
  insights: CoachingInsight[] | null;
  skillAnalysis: DriverSkillAnalysis | null;
}

const AICoaching: React.FC<AICoachingProps> = ({ insights, skillAnalysis }) => {
  // Sample insights for development/testing
  const sampleInsights: CoachingInsight[] = [
    {
      priority: 'critical',
      confidence: 92,
      title: 'Brake Point - Copse Corner (T9)',
      description: 'Braking 8m too early at 145m board. Optimal brake point: 150m board for +3km/h entry speed.',
      impact: 'Potential gain: -0.187s',
      location: 'Copse Corner',
      category: 'Braking'
    },
    {
      priority: 'high',
      confidence: 89,
      title: 'Throttle Application - Village Exit',
      description: 'Apply throttle 15% earlier at apex for better exit speed. Current: 85% at apex, optimal: 90%.',
      impact: 'Potential gain: -0.124s',
      location: 'Village Exit',
      category: 'Throttle'
    },
    {
      priority: 'medium',
      confidence: 84,
      title: 'Brake Balance Optimization',
      description: 'Move brake balance +2% forward (52% → 54%) for better stability into Abbey and Village corners.',
      impact: 'Predicted improvement: High',
      category: 'Setup'
    },
    {
      priority: 'medium',
      confidence: 71,
      title: 'Tire Management',
      description: 'Reduce tire temperature by 3-4°C through smoother inputs. Current avg: 103°C, target: 99°C.',
      impact: 'Lap time consistency: +15%',
      category: 'Strategy'
    },
    {
      priority: 'medium',
      confidence: 82,
      title: 'Stowe Corner Entry',
      description: 'Brake 5m later at 95m board. Current braking at 100m is costing exit speed onto Hangar Straight.',
      impact: 'Potential gain: -0.067s',
      location: 'Stowe Corner',
      category: 'Corner'
    }
  ];

  // Sample skill analysis for development/testing
  const sampleSkillAnalysis: DriverSkillAnalysis = {
    strengths: [
      { skill: 'Racing Line', rating: 91 },
      { skill: 'Corner Entry', rating: 85 },
      { skill: 'Throttle Control', rating: 89 }
    ],
    focusAreas: [
      { skill: 'Braking Consistency', rating: 65 },
      { skill: 'Tire Management', rating: 67 },
      { skill: 'Fuel Efficiency', rating: 71 }
    ],
    overallRating: 87
  };

  // Use provided data or fallback to sample data
  const displayInsights = insights || sampleInsights;
  const displaySkillAnalysis = skillAnalysis || sampleSkillAnalysis;

  return (
    <div className="panel ai-panel">
      <div className="panel-header">COACH - ACTIONABLE INSIGHTS</div>
      <div className="panel-content">
        <div className="ai-suggestions">
          {displayInsights.map((insight, index) => (
            <div key={`insight-${index}`} className={`ai-suggestion ${insight.priority}`}>
              <div className="suggestion-header">
                <div className="suggestion-priority">
                  {insight.category || insight.priority}
                </div>
                <div className="suggestion-confidence">{insight.confidence}% confidence</div>
              </div>
              <div className="suggestion-title">{insight.title}</div>
              <div className="suggestion-description">{insight.description}</div>
              <div className="suggestion-impact">{insight.impact}</div>
            </div>
          ))}

          {/* Driver Skill Analysis */}
          <div style={{ marginTop: '16px' }}>
            <div className="section-title">DRIVER SKILL ANALYSIS</div>
            <div className="ai-suggestions">
              <div className="ai-suggestion">
                <div className="suggestion-header">
                  <div className="suggestion-priority">Strengths</div>
                  <div className="suggestion-confidence">Overall: {displaySkillAnalysis.overallRating}%</div>
                </div>
                <div className="suggestion-description" style={{ marginBottom: '8px' }}>
                  {displaySkillAnalysis.strengths.map((strength, index) => (
                    <React.Fragment key={`strength-${index}`}>
                      • {strength.skill}: {strength.rating}% ({getRatingText(strength.rating)})<br />
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              <div className="ai-suggestion warning">
                <div className="suggestion-header">
                  <div className="suggestion-priority">Focus Areas</div>
                  <div className="suggestion-confidence">
                    Improvement: {calculateImprovementPotential(displaySkillAnalysis.focusAreas)}%
                  </div>
                </div>
                <div className="suggestion-description" style={{ marginBottom: '8px' }}>
                  {displaySkillAnalysis.focusAreas.map((area, index) => (
                    <React.Fragment key={`area-${index}`}>
                      • {area.skill}: {area.rating}% ({getRatingText(area.rating)})<br />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get text rating based on numerical score
const getRatingText = (rating: number): string => {
  if (rating >= 90) return 'Excellent';
  if (rating >= 80) return 'Good';
  if (rating >= 70) return 'Fair';
  if (rating >= 60) return 'Needs Work';
  return 'Poor';
};

// Helper function to calculate improvement potential
const calculateImprovementPotential = (focusAreas: Array<{ skill: string; rating: number }>): number => {
  if (focusAreas.length === 0) return 0;
  
  // Calculate how much room for improvement exists (100 - average rating)
  const avgRating = focusAreas.reduce((sum, area) => sum + area.rating, 0) / focusAreas.length;
  return Math.round((100 - avgRating) / 3); // Divide by 3 to get a reasonable percentage
};

export default AICoaching;
