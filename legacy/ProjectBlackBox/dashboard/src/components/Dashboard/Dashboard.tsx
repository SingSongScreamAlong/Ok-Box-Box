import React, { useEffect, useState, useCallback } from 'react';
import Header from '../Header/Header';
import { useAuth } from '../../context/AuthContext';
import Telemetry from '../Telemetry/Telemetry';
import TrackMap from '../TrackMap/TrackMap';
import CompetitorPositions from '../CompetitorAnalysis/CompetitorPositions';
import MultiDriverPanel from '../MultiDriver/MultiDriverPanel';
import AnalysisPage from '../Analysis/AnalysisPage';
import TrackPage from '../Track/TrackPage';
import StrategyPage from '../Strategy/StrategyPage';
import AICoaching from '../AICoaching/AICoaching';
import { TimingTower } from '../TimingTower/TimingTower';
import TeamChat from '../TeamChat/TeamChat';
import { NotificationSystem, useNotifications } from '../Notifications/NotificationSystem';
import SettingsPanel, { useSettings } from '../Settings/SettingsPanel';
import SessionBrowser from '../Sessions/SessionBrowser';
import { useKeyboardShortcuts, ShortcutsHelp } from '../../hooks/useKeyboardShortcuts';
import '../../hooks/KeyboardShortcuts.css';
import webSocketService from '../../services/WebSocketService';
import {
  TelemetryData,
  CoachingInsight,
  DriverSkillAnalysis,
  CompetitorData,
  StrategyData,
  SessionInfo
} from '../../services/WebSocketService';

import { BACKEND_URL } from '../../config/environment';
import { DashboardMode } from '../Header/Header';

const Dashboard: React.FC = () => {
  // State for all dashboard data
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [focusMode, setFocusMode] = useState<DashboardMode>('LIVE');
  const [coachingInsights, setCoachingInsights] = useState<CoachingInsight[] | null>(null);
  const [skillAnalysis, setSkillAnalysis] = useState<DriverSkillAnalysis | null>(null);
  const [competitorData, setCompetitorData] = useState<CompetitorData[] | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [showMultiDriverPanel, setShowMultiDriverPanel] = useState<boolean>(false);
  const [showTeamChat, setShowTeamChat] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSessionBrowser, setShowSessionBrowser] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  
  // Hooks for new features
  const { notifications, dismissNotification, notifyFastestLap, notifyPitWindow } = useNotifications();
  const { settings, updateSettings } = useSettings();
  // Create a compatible SessionInfo state that matches the interface
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    track: 'Silverstone',
    session: 'RACE',
    driver: 'PLAYER',
    car: 'Ferrari SF24',
    weather: {
      temperature: 28,
      trackTemperature: 42,
      windSpeed: 12,
      windDirection: 'NW',
      humidity: 65,
      trackGrip: 95
    },
    totalLaps: 52,
    sessionTime: 0,
    remainingTime: 3600
  });


  const [displayInfo, setDisplayInfo] = useState({
    trackName: 'Silverstone',
    sessionType: 'RACE',
    lapCount: 12
  });
  const [connected, setConnected] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { token } = useAuth();

  // Export session data
  const handleExport = async () => {
    if (!sessionId || !token) {
      alert('No active session to export');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/export/csv/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${sessionId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export session data');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting session data');
    }
  };

  // Toggle callbacks for keyboard shortcuts
  const toggleChat = useCallback(() => setShowTeamChat(prev => !prev), []);
  const toggleSettings = useCallback(() => setShowSettings(prev => !prev), []);
  const toggleMultiDriver = useCallback(() => setShowMultiDriverPanel(prev => !prev), []);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onModeChange: setFocusMode,
    onToggleChat: toggleChat,
    onToggleSettings: toggleSettings,
    onExport: handleExport,
    onToggleMultiDriver: toggleMultiDriver,
    enabled: !showSettings && !showSessionBrowser, // Disable when modals are open
  });

  // Initialize WebSocket connection
  useEffect(() => {
    // Create WebSocket service instance
    const wsService = webSocketService;

    const joinLatestSession = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${BACKEND_URL}/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.sessions && data.sessions.length > 0) {
            const latest = data.sessions[0]; // Server sorts by created_at DESC
            console.log(`Joining session: ${latest.id} (${latest.name})`);
            wsService.joinSession(latest.id);
            setSessionId(latest.id); // Store session ID for export
            setSessionInfo(prev => ({
              ...prev,
              session: 'RACE',
              track: latest.track || 'Silverstone',
              driver: latest.name || 'Sim Driver'
            }));
          }
        }
      } catch (err) {
        console.error('Failed to join session:', err);
      }
    };

    const handleConnect = () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
      joinLatestSession();
    };

    const handleDisconnect = () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    };

    // If already connected when mounting
    if (wsService.isConnectedToServer()) {
      setConnected(true);
      joinLatestSession();
    }

    const handleTelemetryUpdate = (data: TelemetryData | TelemetryData[]) => {
      // console.log('Telemetry data received:', data); // Reduced logging
      const latest = Array.isArray(data) ? data[data.length - 1] : data;
      setTelemetryData(latest);
    };

    const handleCoachingUpdate = (insights: CoachingInsight[]) => {
      console.log('Coaching insights received:', insights);
      setCoachingInsights(insights);
    };

    const handleSkillAnalysisUpdate = (analysis: DriverSkillAnalysis) => {
      console.log('Skill analysis received:', analysis);
      setSkillAnalysis(analysis);
    };

    const handleCompetitorUpdate = (data: CompetitorData[]) => {
      console.log('Competitor data received:', data);
      setCompetitorData(data);
    };

    const handleStrategyUpdate = (data: StrategyData) => {
      console.log('Strategy data received:', data);
      setStrategyData(data);
    };

    const handleSessionUpdate = (data: Partial<SessionInfo>) => {
      console.log('Session info received:', data);
      setSessionInfo(prevState => ({
        ...prevState,
        ...data
      }));
    };

    // Subscribe to events
    const unsubscribeConnect = wsService.on('connect', handleConnect).unsubscribe;
    const unsubscribeDisconnect = wsService.on('disconnect', handleDisconnect).unsubscribe;
    const unsubscribeTelemetry = wsService.on('telemetry', handleTelemetryUpdate).unsubscribe;
    const unsubscribeCoaching = wsService.on('coaching', handleCoachingUpdate).unsubscribe;
    const unsubscribeSkillAnalysis = wsService.on('skill_analysis', handleSkillAnalysisUpdate).unsubscribe;
    const unsubscribeCompetitorData = wsService.on('competitor_data', handleCompetitorUpdate).unsubscribe;
    const unsubscribeStrategyData = wsService.on('strategy_data', handleStrategyUpdate).unsubscribe;
    const unsubscribeSessionInfo = wsService.on('session_info', handleSessionUpdate).unsubscribe;

    // Connect to WebSocket server on backend port
    wsService.connect(BACKEND_URL);

    // Clean up
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeTelemetry();
      unsubscribeCoaching();
      unsubscribeSkillAnalysis();
      unsubscribeCompetitorData();
      unsubscribeStrategyData();
      unsubscribeSessionInfo();
      // Do not disconnect service as it might be shared, but here it's fine
      // wsService.disconnect(); 
    };
  }, [token]);

  const renderDashboardContent = () => {
    switch (focusMode) {
      case 'LIVE':
        // LIVE MODE: Live telemetry + video feed + track map + competitor analysis
        return (
          <>
            <div className="dashboard-left" style={{ flex: 1 }}>
              <Telemetry telemetryData={telemetryData} />
            </div>
            <div className="dashboard-center" style={{ flex: 2 }}>
              {/* Video Feed Panel */}
              <div className="video-feed-panel">
                <div className="video-feed-header">
                  <span className="live-indicator">● LIVE</span>
                  <span>iRACING FEED</span>
                </div>
                <div className="video-feed-content">
                  <div className="video-placeholder">
                    <span>Video feed will appear when iRacing is running</span>
                  </div>
                </div>
              </div>
              {/* Race Insights */}
              <div className="race-insights-panel">
                <h3>RACE INSIGHTS</h3>
                <AICoaching insights={coachingInsights} skillAnalysis={skillAnalysis} />
              </div>
            </div>
            <div className="dashboard-right" style={{ flex: 1 }}>
              <div className="track-map-panel">
                <h3>TRACK MAP</h3>
                <TrackMap telemetryData={telemetryData} trackName={sessionInfo.track || 'Unknown Track'} />
              </div>
              <div className="competitor-panel">
                <h3>COMPETITOR ANALYSIS</h3>
                <CompetitorPositions competitorData={competitorData} />
              </div>
            </div>
          </>
        );

      case 'RACE':
        // RACE MODE: Essential live telemetry + coaching + positions
        return (
          <>
            <div className="dashboard-left" style={{ flex: 1 }}>
              <Telemetry telemetryData={telemetryData} />
            </div>
            <div className="dashboard-center" style={{ flex: 1 }}>
              {/* Coaching - actionable insights */}
              <AICoaching insights={coachingInsights} skillAnalysis={skillAnalysis} />
            </div>
            <div className="dashboard-right" style={{ flex: 1 }}>
              {/* Mini-map for quick reference */}
              <div className="mini-map-container">
                <TrackMap telemetryData={telemetryData} trackName={sessionInfo.track || 'Unknown Track'} />
              </div>
              <CompetitorPositions competitorData={competitorData} />
            </div>
          </>
        );

      case 'COMMS':
        // COMMS MODE: Team communications and voice interface
        return (
          <div style={{ gridColumn: '1 / -1', height: '100%' }}>
            <TeamChat onClose={() => setFocusMode('LIVE')} />
          </div>
        );

      case 'SETUP':
        // SETUP MODE: Car setup and configuration
        return (
          <div style={{ gridColumn: '1 / -1', height: '100%', padding: '20px' }}>
            <div className="setup-page">
              <h2>Car Setup</h2>
              <p>Setup configuration coming soon...</p>
              <div className="setup-grid">
                <div className="setup-section">
                  <h3>Suspension</h3>
                  <p>Front/Rear spring rates, dampers, anti-roll bars</p>
                </div>
                <div className="setup-section">
                  <h3>Aero</h3>
                  <p>Wing angles, ride height, rake</p>
                </div>
                <div className="setup-section">
                  <h3>Tires</h3>
                  <p>Pressures, camber, toe</p>
                </div>
                <div className="setup-section">
                  <h3>Differential</h3>
                  <p>Preload, power/coast settings</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'TRACK':
        // TRACK MODE: Full track visualization with all vehicles
        // Corner analysis, insights, track conditions
        return (
          <div style={{ gridColumn: '1 / -1', height: '100%' }}>
            <TrackPage 
              telemetryData={telemetryData}
              competitorData={competitorData}
              trackName={sessionInfo.track || 'Unknown Track'}
            />
          </div>
        );
      
      case 'STRATEGY':
        // STRATEGY MODE: Comprehensive race strategy
        // Driver standings, pit strategy, tire/fuel management
        return (
          <div style={{ gridColumn: '1 / -1', height: '100%' }}>
            <StrategyPage 
              telemetryData={telemetryData}
              competitorData={competitorData}
              strategyData={strategyData}
              totalLaps={sessionInfo.totalLaps || 52}
              currentLap={telemetryData?.lap || 1}
            />
          </div>
        );
      
      case 'ANALYSIS':
        // ANALYSIS MODE: Comprehensive session review
        // Telemetry graphs, incident analysis, lap comparison, driver comparison
        return (
          <div style={{ gridColumn: '1 / -1', height: '100%' }}>
            <AnalysisPage telemetryData={telemetryData} />
          </div>
        );
      
      default:
        // Default to RACE mode
        return (
          <>
            <div className="dashboard-left" style={{ flex: 1 }}>
              <Telemetry telemetryData={telemetryData} />
            </div>
            <div className="dashboard-center" style={{ flex: 1 }}>
              <AICoaching insights={coachingInsights} skillAnalysis={skillAnalysis} />
            </div>
            <div className="dashboard-right" style={{ flex: 1 }}>
              <div className="mini-map-container">
                <TrackMap telemetryData={telemetryData} trackName={sessionInfo.track || 'Unknown Track'} />
              </div>
              <CompetitorPositions competitorData={competitorData} />
            </div>
          </>
        );
    }
  };

  return (
    <div className={`dashboard mode-${focusMode.toLowerCase()}`}>
      <Header
        connected={connected}
        currentMode={focusMode}
        onModeChange={setFocusMode}
        sessionInfo={{
          trackName: sessionInfo.track || 'Unknown Track',
          sessionType: sessionInfo.session || 'Unknown',
          lapCount: displayInfo.lapCount,
          totalLaps: sessionInfo.totalLaps || 0,
          driverName: sessionInfo.driver || 'Unknown Driver',
          carName: sessionInfo.car || 'Unknown Car',
          // Convert weather object to string for Header component
          weather: typeof sessionInfo.weather === 'object' && sessionInfo.weather !== null ?
            `${sessionInfo.weather.temperature}°C, ${sessionInfo.weather.humidity}% Humidity` :
            'Unknown'
        }}
        onMultiDriverClick={() => setShowMultiDriverPanel(!showMultiDriverPanel)}
        onExportClick={handleExport}
        onSettingsClick={() => setShowSettings(true)}
        onHistoryClick={() => setShowSessionBrowser(true)}
        onShortcutsClick={() => setShowShortcutsHelp(true)}
        onChatClick={() => setShowTeamChat(!showTeamChat)}
      />

      <div className="dashboard-grid">
        {renderDashboardContent()}
      </div>

      {showMultiDriverPanel && (
        <div className="multi-driver-overlay">
          <div className="multi-driver-container">
            <div className="multi-driver-header">
              <h2>Multi-Driver Management</h2>
              <button
                className="close-button"
                onClick={() => setShowMultiDriverPanel(false)}
              >
                ×
              </button>
            </div>
            <MultiDriverPanel />
          </div>
        </div>
      )}

      {/* Team Chat Overlay */}
      {showTeamChat && (
        <div className="team-chat-overlay">
          <TeamChat onClose={() => setShowTeamChat(false)} />
        </div>
      )}

      {/* Notifications */}
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={updateSettings}
      />

      {/* Session Browser */}
      <SessionBrowser
        isOpen={showSessionBrowser}
        onClose={() => setShowSessionBrowser(false)}
        onSelectSession={(id) => {
          console.log('Selected session:', id);
          setShowSessionBrowser(false);
        }}
      />

      {/* Shortcuts Help */}
      <ShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
};

export default Dashboard;
