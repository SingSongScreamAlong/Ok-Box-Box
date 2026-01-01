import React, { useState, useMemo } from 'react';
import './TrainingGoals.css';

interface TrainingGoal {
  id: string;
  title: string;
  description: string;
  type: 'lap_time' | 'consistency' | 'corner' | 'tire_management' | 'fuel_efficiency' | 'racecraft';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  trackId?: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  unit: string;
  deadline?: string;
  rewards: string[];
  tips: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface SkillRating {
  skill: string;
  rating: number;
  trend: 'up' | 'down' | 'stable';
  lastChange: number;
}

const TrainingGoals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'goals' | 'skills' | 'achievements'>('goals');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  // Training goals
  const goals: TrainingGoal[] = useMemo(() => [
    {
      id: '1',
      title: 'Master Copse Corner',
      description: 'Achieve consistent lap times through Copse with optimal braking and exit speed',
      type: 'corner',
      difficulty: 'intermediate',
      trackId: 'silverstone',
      targetValue: 28.5,
      currentValue: 29.2,
      progress: 72,
      unit: 's',
      rewards: ['Corner Master Badge', '+50 XP'],
      tips: ['Brake at the 100m board', 'Trail brake to apex', 'Full throttle before exit kerb']
    },
    {
      id: '2',
      title: 'Lap Time Target',
      description: 'Set a lap time under 1:28.000 at Silverstone',
      type: 'lap_time',
      difficulty: 'advanced',
      trackId: 'silverstone',
      targetValue: 88.0,
      currentValue: 89.234,
      progress: 85,
      unit: 's',
      deadline: '2024-12-15',
      rewards: ['Speed Demon Badge', '+100 XP', 'New Livery Unlock'],
      tips: ['Focus on Sector 2 - biggest time loss', 'Optimize Maggots-Becketts flow', 'Use all track on exits']
    },
    {
      id: '3',
      title: 'Consistency Challenge',
      description: 'Complete 10 consecutive laps within 0.5s of each other',
      type: 'consistency',
      difficulty: 'intermediate',
      targetValue: 10,
      currentValue: 6,
      progress: 60,
      unit: 'laps',
      rewards: ['Consistent Driver Badge', '+75 XP'],
      tips: ['Focus on rhythm over raw speed', 'Maintain tire temperatures', 'Avoid pushing too hard']
    },
    {
      id: '4',
      title: 'Tire Whisperer',
      description: 'Complete a stint with less than 15% tire degradation',
      type: 'tire_management',
      difficulty: 'advanced',
      targetValue: 15,
      currentValue: 18,
      progress: 83,
      unit: '%',
      rewards: ['Tire Whisperer Badge', '+80 XP'],
      tips: ['Smooth steering inputs', 'Avoid wheelspin on exit', 'Manage brake temperatures']
    },
    {
      id: '5',
      title: 'Fuel Efficiency Master',
      description: 'Complete a race using 5% less fuel than target',
      type: 'fuel_efficiency',
      difficulty: 'expert',
      targetValue: 5,
      currentValue: 3.2,
      progress: 64,
      unit: '%',
      rewards: ['Eco Racer Badge', '+120 XP'],
      tips: ['Lift and coast into corners', 'Short shift when safe', 'Use slipstream effectively']
    },
    {
      id: '6',
      title: 'Clean Racer',
      description: 'Complete 5 races with 0 incident points',
      type: 'racecraft',
      difficulty: 'intermediate',
      targetValue: 5,
      currentValue: 3,
      progress: 60,
      unit: 'races',
      rewards: ['Clean Racer Badge', '+90 XP', 'Safety Rating Boost'],
      tips: ['Give space in battles', 'Anticipate other drivers', 'Avoid contact at all costs']
    }
  ], []);

  // Skill ratings
  const skills: SkillRating[] = useMemo(() => [
    { skill: 'Braking', rating: 78, trend: 'up', lastChange: 3 },
    { skill: 'Corner Entry', rating: 82, trend: 'up', lastChange: 2 },
    { skill: 'Apex Speed', rating: 71, trend: 'stable', lastChange: 0 },
    { skill: 'Corner Exit', rating: 85, trend: 'up', lastChange: 4 },
    { skill: 'Throttle Control', rating: 88, trend: 'stable', lastChange: 0 },
    { skill: 'Tire Management', rating: 65, trend: 'down', lastChange: -2 },
    { skill: 'Fuel Efficiency', rating: 72, trend: 'up', lastChange: 1 },
    { skill: 'Racecraft', rating: 76, trend: 'up', lastChange: 5 },
    { skill: 'Consistency', rating: 69, trend: 'down', lastChange: -1 },
    { skill: 'Adaptability', rating: 74, trend: 'stable', lastChange: 0 },
  ], []);

  // Achievements
  const achievements: Achievement[] = useMemo(() => [
    { id: '1', title: 'First Steps', description: 'Complete your first training session', icon: '🏁', earnedAt: Date.now() - 86400000 * 30, rarity: 'common' },
    { id: '2', title: 'Speed Seeker', description: 'Break 300 km/h for the first time', icon: '⚡', earnedAt: Date.now() - 86400000 * 25, rarity: 'common' },
    { id: '3', title: 'Corner Carver', description: 'Master 5 different corners', icon: '↩️', earnedAt: Date.now() - 86400000 * 20, rarity: 'rare' },
    { id: '4', title: 'Podium Finisher', description: 'Finish in the top 3 in a race', icon: '🏆', earnedAt: Date.now() - 86400000 * 15, rarity: 'rare' },
    { id: '5', title: 'Lap Record', description: 'Set a personal best lap time', icon: '⏱️', earnedAt: Date.now() - 86400000 * 10, rarity: 'epic' },
    { id: '6', title: 'Endurance Champion', description: 'Complete a 2-hour race', icon: '🎖️', earnedAt: Date.now() - 86400000 * 5, rarity: 'epic' },
  ], []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#00ff9d';
      case 'intermediate': return '#00d4ff';
      case 'advanced': return '#ff9800';
      case 'expert': return '#ff4444';
      default: return '#888';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#9e9e9e';
      case 'rare': return '#2196f3';
      case 'epic': return '#9c27b0';
      case 'legendary': return '#ff9800';
      default: return '#888';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lap_time': return '⏱️';
      case 'consistency': return '📊';
      case 'corner': return '↩️';
      case 'tire_management': return '🛞';
      case 'fuel_efficiency': return '⛽';
      case 'racecraft': return '🏎️';
      default: return '🎯';
    }
  };

  const selectedGoalData = selectedGoal ? goals.find(g => g.id === selectedGoal) : null;
  const overallRating = Math.round(skills.reduce((sum, s) => sum + s.rating, 0) / skills.length);

  return (
    <div className="training-goals">
      {/* Header Stats */}
      <div className="training-header">
        <div className="header-stat">
          <span className="stat-value">{overallRating}</span>
          <span className="stat-label">Overall Rating</span>
        </div>
        <div className="header-stat">
          <span className="stat-value">{goals.filter(g => g.progress >= 100).length}/{goals.length}</span>
          <span className="stat-label">Goals Complete</span>
        </div>
        <div className="header-stat">
          <span className="stat-value">{achievements.length}</span>
          <span className="stat-label">Achievements</span>
        </div>
        <div className="header-stat">
          <span className="stat-value">2,450</span>
          <span className="stat-label">Total XP</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="training-tabs">
        <button className={activeTab === 'goals' ? 'active' : ''} onClick={() => setActiveTab('goals')}>
          🎯 Goals
        </button>
        <button className={activeTab === 'skills' ? 'active' : ''} onClick={() => setActiveTab('skills')}>
          📈 Skills
        </button>
        <button className={activeTab === 'achievements' ? 'active' : ''} onClick={() => setActiveTab('achievements')}>
          🏆 Achievements
        </button>
      </div>

      {/* Content */}
      <div className="training-content">
        {activeTab === 'goals' && (
          <div className="goals-view">
            <div className="goals-list">
              {goals.map(goal => (
                <div 
                  key={goal.id}
                  className={`goal-card ${selectedGoal === goal.id ? 'selected' : ''} ${goal.progress >= 100 ? 'completed' : ''}`}
                  onClick={() => setSelectedGoal(goal.id)}
                >
                  <div className="goal-icon">{getTypeIcon(goal.type)}</div>
                  <div className="goal-info">
                    <div className="goal-header">
                      <span className="goal-title">{goal.title}</span>
                      <span 
                        className="goal-difficulty"
                        style={{ color: getDifficultyColor(goal.difficulty) }}
                      >
                        {goal.difficulty}
                      </span>
                    </div>
                    <div className="goal-progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="goal-stats">
                      <span className="current">{goal.currentValue}{goal.unit}</span>
                      <span className="target">Target: {goal.targetValue}{goal.unit}</span>
                      <span className="percent">{goal.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="goal-detail">
              {selectedGoalData ? (
                <>
                  <div className="detail-header">
                    <span className="detail-icon">{getTypeIcon(selectedGoalData.type)}</span>
                    <div className="detail-title">
                      <h3>{selectedGoalData.title}</h3>
                      <span 
                        className="difficulty-badge"
                        style={{ background: getDifficultyColor(selectedGoalData.difficulty) }}
                      >
                        {selectedGoalData.difficulty}
                      </span>
                    </div>
                  </div>

                  <p className="detail-description">{selectedGoalData.description}</p>

                  <div className="detail-progress">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span>{selectedGoalData.progress}%</span>
                    </div>
                    <div className="progress-bar-large">
                      <div 
                        className="progress-fill"
                        style={{ width: `${Math.min(selectedGoalData.progress, 100)}%` }}
                      />
                    </div>
                    <div className="progress-values">
                      <span>Current: {selectedGoalData.currentValue}{selectedGoalData.unit}</span>
                      <span>Target: {selectedGoalData.targetValue}{selectedGoalData.unit}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>💡 Tips</h4>
                    <ul>
                      {selectedGoalData.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="detail-section rewards">
                    <h4>🎁 Rewards</h4>
                    <div className="rewards-list">
                      {selectedGoalData.rewards.map((reward, idx) => (
                        <span key={idx} className="reward-badge">{reward}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-selection">
                  <span className="icon">👆</span>
                  <span>Select a goal to view details</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="skills-view">
            <div className="skills-radar">
              <h4>Skill Overview</h4>
              <div className="radar-placeholder">
                <div className="overall-rating">
                  <span className="rating-value">{overallRating}</span>
                  <span className="rating-label">Overall</span>
                </div>
              </div>
            </div>

            <div className="skills-list">
              {skills.map(skill => (
                <div key={skill.skill} className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">{skill.skill}</span>
                    <div className="skill-trend">
                      {skill.trend === 'up' && <span className="trend up">↑ +{skill.lastChange}</span>}
                      {skill.trend === 'down' && <span className="trend down">↓ {skill.lastChange}</span>}
                      {skill.trend === 'stable' && <span className="trend stable">→</span>}
                    </div>
                  </div>
                  <div className="skill-bar">
                    <div 
                      className="skill-fill"
                      style={{ 
                        width: `${skill.rating}%`,
                        background: skill.rating >= 80 ? '#00ff9d' : skill.rating >= 60 ? '#00d4ff' : '#ff6b35'
                      }}
                    />
                  </div>
                  <span className="skill-rating">{skill.rating}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-view">
            {achievements.map(achievement => (
              <div 
                key={achievement.id} 
                className="achievement-card"
                style={{ borderColor: getRarityColor(achievement.rarity) }}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-info">
                  <span className="achievement-title">{achievement.title}</span>
                  <span className="achievement-desc">{achievement.description}</span>
                  <span className="achievement-date">
                    Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                  </span>
                </div>
                <span 
                  className="achievement-rarity"
                  style={{ color: getRarityColor(achievement.rarity) }}
                >
                  {achievement.rarity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingGoals;
