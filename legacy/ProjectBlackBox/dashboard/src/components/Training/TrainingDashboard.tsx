import React, { useState, useEffect } from 'react';
import TrainingService, { TrainingGoal, Badge } from '../../services/TrainingService';
import './TrainingDashboard.css';

interface Skill {
  name: string;
  level: number;
  trend: 'up' | 'down' | 'stable';
  change: string;
}

// Stats & Skills are still mocked for MVP
const skills: Skill[] = [
  { name: 'Braking', level: 78, trend: 'up', change: '+3%' },
  { name: 'Corner Entry', level: 82, trend: 'up', change: '+5%' },
  { name: 'Throttle Control', level: 85, trend: 'stable', change: '0%' },
  { name: 'Tire Management', level: 65, trend: 'up', change: '+8%' },
  { name: 'Fuel Efficiency', level: 71, trend: 'down', change: '-2%' },
  { name: 'Racecraft', level: 74, trend: 'up', change: '+4%' },
];

const TrainingDashboard: React.FC = () => {
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats (Mocked or calculated for now)
  const currentLevel = 12;
  const totalXp = 2450;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedGoals, fetchedBadges] = await Promise.all([
          TrainingService.getGoals(),
          TrainingService.getBadges()
        ]);
        setGoals(fetchedGoals);
        setBadges(fetchedBadges);
      } catch (error) {
        console.error("Failed to load training data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'speed': return '⚡';
      case 'consistency': return '🎯';
      case 'technique': return '🔧';
      case 'racecraft': return '🏎️';
      default: return '📊';
    }
  };

  return (
    <div className="training-page">
      <div className="training-header">
        <h1>🎓 Driver Training</h1>
        <div className="header-stats">
          <div className="header-stat">
            <div className="header-stat-value">Level 12</div>
            <div className="header-stat-label">Driver Level</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">2,450</div>
            <div className="header-stat-label">Total XP</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">4</div>
            <div className="header-stat-label">Active Goals</div>
          </div>
        </div>
      </div>

      <div className="training-content">
        {/* Main Content */}
        <div className="training-main">
          {/* Active Goals */}
          <section>
            <div className="section-header">
              <h2>Active Goals</h2>
              <span className="view-all">View All →</span>
            </div>
            <div className="goals-grid">
              {goals.map((goal) => (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <div className={`goal-icon ${goal.category}`}>
                      {getCategoryIcon(goal.category)}
                    </div>
                    <span className={`goal-priority ${goal.priority}`}>{goal.priority}</span>
                  </div>
                  <div className="goal-title">{goal.title}</div>
                  <div className="goal-description">{goal.description}</div>
                  <div className="goal-progress">
                    <div className="progress-header">
                      <span className="progress-label">Progress</span>
                      <span className="progress-value">{goal.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${goal.category}`}
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="goal-footer">
                    <div className="goal-deadline">
                      <span>⏰</span>
                      <span>{goal.deadline} left</span>
                    </div>
                    <div className="goal-xp">+{goal.xpReward} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section>
            <div className="section-header">
              <h2>Skill Ratings</h2>
              <span className="view-all">Details →</span>
            </div>
            <div className="skills-grid">
              {skills.map((skill) => (
                <div key={skill.name} className="skill-card">
                  <div className="skill-header">
                    <span className="skill-name">{skill.name}</span>
                    <span className="skill-level">{skill.level}</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-fill" style={{ width: `${skill.level}%` }}></div>
                  </div>
                  <div className={`skill-trend ${skill.trend}`}>
                    {skill.trend === 'up' ? '↑' : skill.trend === 'down' ? '↓' : '→'}
                    <span>{skill.change} this week</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="training-sidebar">
          {/* Driver Profile */}
          <div className="sidebar-section">
            <div className="driver-profile">
              <div className="profile-avatar">🏎️</div>
              <div className="profile-name">Driver</div>
              <div className="profile-level">Level 12 • Pro Driver</div>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: '65%' }}></div>
              </div>
              <div className="xp-text">2,450 / 3,000 XP to Level 13</div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="sidebar-section">
            <h3>This Week</h3>
            <div className="weekly-stats">
              <div className="weekly-stat">
                <div className="weekly-stat-value">12</div>
                <div className="weekly-stat-label">Sessions</div>
              </div>
              <div className="weekly-stat">
                <div className="weekly-stat-value">4.2h</div>
                <div className="weekly-stat-label">Track Time</div>
              </div>
              <div className="weekly-stat">
                <div className="weekly-stat-value">156</div>
                <div className="weekly-stat-label">Laps</div>
              </div>
              <div className="weekly-stat">
                <div className="weekly-stat-value">-0.8s</div>
                <div className="weekly-stat-label">Improvement</div>
              </div>
            </div>
          </div>

          {/* Achievements (Badges) */}
          <div className="sidebar-section">
            <h3>Recent Badges</h3>
            <div className="achievements-list">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`achievement-item ${!badge.unlocked ? 'locked' : ''}`}
                >
                  <div className={`achievement-icon ${badge.tier}`}>
                    {badge.icon}
                  </div>
                  <div className="achievement-info">
                    <div className="achievement-name">{badge.name}</div>
                    <div className="achievement-desc">{badge.description}</div>
                  </div>
                </div>
              ))}
              {badges.length === 0 && <div style={{ color: '#666', fontSize: '12px' }}>No badges earned yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingDashboard;
