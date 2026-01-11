import { useEffect, useState, useRef, useMemo } from 'react';
import Header from './components/Header';
import Telemetry from './components/Telemetry';
import TrackMap from './components/TrackMap';
import AICoaching from './components/AICoaching';
import CompetitorAnalysis from './components/CompetitorAnalysis';
import EngineerVoice from './components/EngineerVoice';
import VideoPanel from './components/VideoPanel';
import Settings from './components/Settings';
import LapComparison from './components/LapComparison';
import TelemetryGraph from './components/TelemetryGraph';
import StrategyCalculator from './components/StrategyCalculator';
import RaceIntelligencePanel from './components/RaceIntelligencePanel';
import SetupPage from './components/SetupPage';
import ApexChat from './components/ApexChat';
import FuelPanel from './components/FuelPanel';
import WeatherPanel from './components/WeatherPanel';
import PitStrategyPanel from './components/PitStrategyPanel';
import EngineerComms from './components/EngineerComms';
import webSocketService from './services/WebSocketService';
import raceIntelligence, { type RaceIntelligenceState } from './services/RaceIntelligence';
import setupEngine, { type SetupAnalysisState } from './services/SetupEngine';
import type { 
  TelemetryData, 
  SessionInfo, 
  CoachingInsight, 
  DriverSkillAnalysis, 
  CompetitorData, 
  StrategyData 
} from './types';
import './App.css';

function App() {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [coachingInsights, setCoachingInsights] = useState<CoachingInsight[] | null>(null);
  const [skillAnalysis, setSkillAnalysis] = useState<DriverSkillAnalysis | null>(null);
  const [competitorData, setCompetitorData] = useState<CompetitorData[] | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    track: 'Waiting for session...',
    session: '-',
    driver: '-',
    car: '-',
    weather: {
      temperature: 0,
      trackTemperature: 0,
      windSpeed: 0,
      windDirection: '-',
      humidity: 0,
      trackGrip: 0,
    },
    totalLaps: 0,
    sessionTime: 0,
    remainingTime: 0,
  });
  const [connected, setConnected] = useState(false);
  const [relayStatus, setRelayStatus] = useState({ connected: false, iRacingConnected: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('LIVE');
  const [flagStatus, setFlagStatus] = useState<'green' | 'yellow' | 'red' | 'checkered'>('green');
  const [demoMode, setDemoMode] = useState(false);
  const [raceIntelligenceState, setRaceIntelligenceState] = useState<RaceIntelligenceState | null>(null);
  const [setupAnalysis, setSetupAnalysis] = useState<SetupAnalysisState | null>(null);
  const [apexChatOpen, setApexChatOpen] = useState(false);
  
  // Telemetry history for graphs
  const [telemetryHistory, setTelemetryHistory] = useState<Array<{
    timestamp: number;
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    rpm: number;
    steeringAngle: number;
  }>>([]);
  
  // Lap data for lap comparison
  const [lapData, setLapData] = useState<Array<{
    lapNumber: number;
    lapTime: number;
    sector1: number;
    sector2: number;
    sector3: number;
    topSpeed: number;
    avgSpeed: number;
    fuelUsed: number;
    tireWear: number;
    isPersonalBest: boolean;
    isSessionBest: boolean;
  }>>([]);
  
  const lastLapRef = useRef<number>(0);

  useEffect(() => {
    console.log('[BlackBox] App mounted, initializing WebSocket...');
    const wsService = webSocketService;

    const unsubConnect = wsService.on('connect', () => {
      console.log('[BlackBox] WebSocket connected!');
      setConnected(true);
    });

    const unsubDisconnect = wsService.on('disconnect', () => {
      setConnected(false);
    });

    const unsubTelemetry = wsService.on('telemetry', (data) => {
      setTelemetryData(data);
    });

    const unsubSession = wsService.on('session_info', (data) => {
      setSessionInfo(data);
    });

    const unsubCoaching = wsService.on('coaching', (insights) => {
      setCoachingInsights(insights);
    });

    const unsubSkill = wsService.on('skill_analysis', (analysis) => {
      setSkillAnalysis(analysis);
    });

    const unsubCompetitor = wsService.on('competitor_data', (data) => {
      setCompetitorData(data);
    });

    const unsubStrategy = wsService.on('strategy_data', (data) => {
      setStrategyData(data);
    });

    const unsubRelay = wsService.on('relay:status', (status) => {
      setRelayStatus(status);
    });

    wsService.connect();
    
    // Demo: simulate flag changes
    const flagInterval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.95) setFlagStatus('green');
      else setFlagStatus('yellow');
    }, 10000);
    
    return () => {
      clearInterval(flagInterval);
      unsubConnect.unsubscribe();
      unsubDisconnect.unsubscribe();
      unsubTelemetry.unsubscribe();
      unsubSession.unsubscribe();
      unsubCoaching.unsubscribe();
      unsubSkill.unsubscribe();
      unsubCompetitor.unsubscribe();
      unsubStrategy.unsubscribe();
      unsubRelay.unsubscribe();
      wsService.disconnect();
    };
  }, []);
  
  // Update telemetry history when new data arrives
  useEffect(() => {
    if (telemetryData) {
      setTelemetryHistory(prev => {
        const newPoint = {
          timestamp: telemetryData.timestamp,
          speed: telemetryData.speed,
          throttle: telemetryData.throttle * 100,
          brake: telemetryData.brake * 100,
          gear: telemetryData.gear,
          rpm: telemetryData.rpm,
          steeringAngle: telemetryData.steering * 180,
        };
        const updated = [...prev, newPoint];
        // Keep last 300 points
        return updated.slice(-300);
      });
      
      // Track lap completions
      if (telemetryData.lap > lastLapRef.current && lastLapRef.current > 0) {
        // New lap completed
        const newLap = {
          lapNumber: lastLapRef.current,
          lapTime: telemetryData.lapTime,
          sector1: telemetryData.bestSectorTimes?.[0] || telemetryData.lapTime / 3,
          sector2: telemetryData.bestSectorTimes?.[1] || telemetryData.lapTime / 3,
          sector3: telemetryData.bestSectorTimes?.[2] || telemetryData.lapTime / 3,
          topSpeed: telemetryData.speed,
          avgSpeed: telemetryData.speed * 0.7,
          fuelUsed: 2.5,
          tireWear: 1.2,
          isPersonalBest: telemetryData.lapTime <= telemetryData.bestLapTime,
          isSessionBest: false,
        };
        setLapData(prev => [...prev, newLap]);
      }
      lastLapRef.current = telemetryData.lap;
    }
  }, [telemetryData]);

  // Update Race Intelligence
  useEffect(() => {
    if (!telemetryData && !competitorData) return;
    
    const { state, insights } = raceIntelligence.update(
      telemetryData,
      competitorData,
      { totalLaps: sessionInfo.totalLaps, currentLap: telemetryData?.lap || 1, track: sessionInfo.track }
    );
    
    setRaceIntelligenceState(state);
    
    // Merge intelligence insights with coaching insights
    if (insights.length > 0 && coachingInsights) {
      const mergedInsights = [...coachingInsights];
      for (const insight of insights) {
        if (!mergedInsights.find(i => i.title === insight.title)) {
          mergedInsights.push(insight);
        }
      }
      // Keep only top 10 insights by priority
      mergedInsights.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      setCoachingInsights(mergedInsights.slice(0, 10));
    }
  }, [telemetryData, competitorData, sessionInfo]);

  // Update Setup Engine
  useEffect(() => {
    if (!telemetryData) return;
    
    const sessionType = sessionInfo.session.toLowerCase().includes('practice') ? 'practice' 
      : sessionInfo.session.toLowerCase().includes('qual') ? 'qualifying' 
      : 'race';
    
    const analysis = setupEngine.update(telemetryData, sessionType);
    setSetupAnalysis(analysis);
  }, [telemetryData, sessionInfo.session]);
  
  // Helper functions for formatting
  const formatLapTime = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  };
  
  const formatGap = (gap: number | undefined): string => {
    if (gap === undefined || gap === 0) return '-';
    return gap > 0 ? `+${gap.toFixed(1)}s` : `${gap.toFixed(1)}s`;
  };
  
  // Calculate delta to best
  const deltaToBase = useMemo(() => {
    if (!telemetryData) return 0;
    const currentLapTime = telemetryData.lapTime || 0;
    const bestLapTime = telemetryData.bestLapTime || 0;
    if (bestLapTime <= 0 || currentLapTime <= 0) return 0;
    return currentLapTime - bestLapTime;
  }, [telemetryData]);
  
  // Best lap from lap data
  const bestLap = useMemo(() => {
    if (lapData.length === 0) return null;
    return lapData.reduce((best, lap) => 
      lap.lapTime < best.lapTime ? lap : best
    , lapData[0]);
  }, [lapData]);
  
  // Theoretical best
  const theoreticalBest = useMemo(() => {
    if (lapData.length === 0) return null;
    const bestS1 = Math.min(...lapData.map(l => l.sector1));
    const bestS2 = Math.min(...lapData.map(l => l.sector2));
    const bestS3 = Math.min(...lapData.map(l => l.sector3));
    return {
      sector1: bestS1,
      sector2: bestS2,
      sector3: bestS3,
      total: bestS1 + bestS2 + bestS3,
    };
  }, [lapData]);

  // Demo mode data generation
  const demoTimeRef = useRef(0);
  useEffect(() => {
    if (!demoMode) return;
    
    // Set demo session info
    setSessionInfo({
      track: 'Spa-Francorchamps',
      session: 'RACE',
      driver: 'Demo Driver',
      car: 'Formula Vee',
      weather: {
        temperature: 22,
        trackTemperature: 35,
        windSpeed: 12,
        windDirection: 'NW',
        humidity: 45,
        trackGrip: 95,
      },
      totalLaps: 50,
      sessionTime: 3600,
      remainingTime: 2400,
    });
    
    // Generate demo telemetry
    const demoInterval = setInterval(() => {
      demoTimeRef.current += 0.1;
      const t = demoTimeRef.current;
      
      // Simulate a lap around a track
      const lapProgress = (t % 90) / 90; // 90 second lap
      const currentLap = Math.floor(t / 90) + 1;
      
      // Speed varies based on track section
      const baseSpeed = 180;
      const speedVariation = Math.sin(lapProgress * Math.PI * 8) * 60;
      const speed = Math.max(60, baseSpeed + speedVariation);
      
      // Throttle/brake based on speed changes
      const throttle = speed > 150 ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3;
      const brake = speed < 100 ? 0.5 + Math.random() * 0.3 : 0;
      
      // Steering varies with corners
      const steering = Math.sin(lapProgress * Math.PI * 12) * 0.4;
      
      const demoTelemetry: TelemetryData = {
        speed,
        rpm: 6000 + speed * 30 + Math.random() * 500,
        gear: Math.min(6, Math.max(1, Math.floor(speed / 40))),
        throttle,
        brake,
        steering,
        fuel: 80 - currentLap * 2.5,
        fuelPerLap: 2.5,
        tires: {
          frontLeft: { temp: 85 + Math.random() * 10, wear: 15 + currentLap * 0.5, pressure: 26.5 },
          frontRight: { temp: 87 + Math.random() * 10, wear: 14 + currentLap * 0.5, pressure: 26.3 },
          rearLeft: { temp: 82 + Math.random() * 10, wear: 12 + currentLap * 0.4, pressure: 25.8 },
          rearRight: { temp: 84 + Math.random() * 10, wear: 13 + currentLap * 0.4, pressure: 25.6 },
        },
        position: { x: Math.cos(lapProgress * Math.PI * 2) * 500, y: 0, z: Math.sin(lapProgress * Math.PI * 2) * 300 },
        lap: currentLap,
        sector: Math.floor(lapProgress * 3) + 1,
        lapTime: (t % 90),
        sectorTime: (t % 30),
        bestLapTime: 87.5,
        bestSectorTimes: [28.2, 29.1, 30.2],
        gForce: { lateral: steering * 2, longitudinal: (throttle - brake) * 1.5, vertical: 0.1 },
        trackPosition: lapProgress,
        racePosition: 5,
        gapAhead: 2.3 + Math.random() * 0.5,
        gapBehind: 1.8 + Math.random() * 0.3,
        timestamp: Date.now(),
      };
      
      setTelemetryData(demoTelemetry);
    }, 100);
    
    // Generate demo coaching insights
    const coachingInterval = setInterval(() => {
      const insights: CoachingInsight[] = [
        {
          priority: 'high',
          confidence: 85,
          title: 'Braking Point Optimization',
          description: 'You can brake 5m later into Turn 1. Current braking is conservative.',
          impact: 'Potential gain: 0.2s per lap',
          category: 'Braking',
        },
        {
          priority: 'medium',
          confidence: 78,
          title: 'Throttle Application',
          description: 'Smoother throttle out of slow corners will reduce wheelspin.',
          impact: 'Better tire wear and exit speed',
          category: 'Throttle',
        },
      ];
      setCoachingInsights(insights);
      
      setSkillAnalysis({
        overallRating: 76,
        strengths: [
          { skill: 'Consistency', rating: 82 },
          { skill: 'Race Craft', rating: 79 },
        ],
        focusAreas: [
          { skill: 'Braking', rating: 68 },
          { skill: 'Trail Braking', rating: 62 },
        ],
      });
    }, 5000);
    
    // Generate demo competitor data
    setCompetitorData([
      { position: 1, driver: 'M. Verstappen', gap: '-12.4s', lastLap: '1:27.234', bestLap: '1:26.891' },
      { position: 2, driver: 'L. Hamilton', gap: '-8.2s', lastLap: '1:27.456', bestLap: '1:27.012' },
      { position: 3, driver: 'C. Leclerc', gap: '-5.1s', lastLap: '1:27.789', bestLap: '1:27.234' },
      { position: 4, driver: 'L. Norris', gap: '-2.3s', lastLap: '1:27.901', bestLap: '1:27.456' },
      { position: 5, driver: 'Demo Driver', gap: 'LEADER', lastLap: '1:28.123', bestLap: '1:27.500' },
      { position: 6, driver: 'O. Piastri', gap: '+1.8s', lastLap: '1:28.234', bestLap: '1:27.789' },
    ]);
    
    setStrategyData({
      pitWindow: 'Lap 18-25',
      optimalPit: 'Lap 22',
      tireStrategy: 'Medium → Hard',
      fuelStrategy: 'On target',
      paceTarget: '1:27.5',
      positionPrediction: 'P4-P6',
      undercutRisk: 'Medium',
      tireLife: 65,
    });
    
    // Generate demo lap data for LapComparison
    const demoLaps = [];
    for (let i = 1; i <= 5; i++) {
      const baseTime = 87.5 + (Math.random() - 0.3) * 3;
      const s1 = 28.2 + (Math.random() - 0.5) * 1.5;
      const s2 = 29.1 + (Math.random() - 0.5) * 1.5;
      const s3 = baseTime - s1 - s2;
      demoLaps.push({
        lapNumber: i,
        lapTime: baseTime,
        sector1: s1,
        sector2: s2,
        sector3: s3,
        topSpeed: 280 + Math.random() * 20,
        avgSpeed: 180 + Math.random() * 15,
        fuelUsed: 2.3 + Math.random() * 0.4,
        tireWear: 1.0 + Math.random() * 0.5,
        isPersonalBest: i === 3,
        isSessionBest: i === 3,
      });
    }
    setLapData(demoLaps);
    
    return () => {
      clearInterval(demoInterval);
      clearInterval(coachingInterval);
    };
  }, [demoMode]);

  return (
    <div className="blackbox-app">
      <Header 
        connected={connected}
        relayConnected={relayStatus.connected}
        iRacingConnected={relayStatus.iRacingConnected || demoMode}
        sessionInfo={sessionInfo}
        onSettingsClick={() => setSettingsOpen(true)}
        demoMode={demoMode}
        onDemoToggle={() => setDemoMode(!demoMode)}
      />
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="pitbox-dashboard">
        {/* Navigation Tabs */}
        <div className="nav-tabs">
          {['LIVE', 'RACE', 'COMMS', 'TRACK', 'STRATEGY', 'SETUP', 'ANALYSIS'].map(tab => (
            <button 
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* COMMS Tab - Engineer Voice Communications */}
        {activeTab === 'COMMS' && (
          <div className="dashboard-content comms-view">
            <div className="comms-main">
              <EngineerComms driverName={sessionInfo.driver} />
            </div>
            <div className="comms-sidebar">
              <FuelPanel compact />
              <WeatherPanel compact />
              <PitStrategyPanel compact />
            </div>
          </div>
        )}

        {/* APEX Chat Modal */}
        <ApexChat isOpen={apexChatOpen} onClose={() => setApexChatOpen(false)} />

        {/* LIVE Tab - Main Race View */}
        {activeTab === 'LIVE' && (
          <div className="dashboard-content">
            <div className="left-sidebar">
              <Telemetry telemetryData={telemetryData} />
              <EngineerVoice sessionActive={relayStatus.iRacingConnected} />
            </div>
            <div className="center-area">
              <div className="center-top">
                <div className="flag-delta-section">
                  <div className="flag-status">
                    <span className={`flag ${flagStatus}`}>
                      {flagStatus.toUpperCase()} FLAG
                    </span>
                  </div>
                  <div className="delta-display">
                    <div className="delta-label">DELTA TO BEST</div>
                    <div className={`delta-value ${deltaToBase >= 0 ? 'positive' : 'negative'}`}>
                      {deltaToBase >= 0 ? '+' : ''}{deltaToBase.toFixed(2)}
                    </div>
                  </div>
                  <div className="timing-section">
                    <div className="timing-header">TIMING</div>
                    <div className="timing-row">
                      <span className="timing-label">CURRENT LAP</span>
                      <span className="timing-value">{formatLapTime(telemetryData?.lapTime)}</span>
                    </div>
                    <div className="timing-row">
                      <span className="timing-label">BEST LAP</span>
                      <span className="timing-value">{formatLapTime(telemetryData?.bestLapTime)}</span>
                    </div>
                    <div className="timing-row">
                      <span className="timing-label">GAP AHEAD</span>
                      <span className="timing-value">{formatGap(telemetryData?.gapAhead)}</span>
                    </div>
                    <div className="timing-row">
                      <span className="timing-label">GAP BEHIND</span>
                      <span className="timing-value">{formatGap(telemetryData?.gapBehind)}</span>
                    </div>
                    <div className="timing-row">
                      <span className="timing-label">POSITION</span>
                      <span className="timing-value position">P{telemetryData?.racePosition ?? '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="video-section">
                  <VideoPanel 
                    sessionActive={relayStatus.iRacingConnected} 
                    driverName={sessionInfo.driver}
                  />
                </div>
              </div>
              <div className="center-bottom">
                <AICoaching 
                  insights={coachingInsights} 
                  skillAnalysis={skillAnalysis} 
                />
              </div>
            </div>
            <div className="right-sidebar">
              <TrackMap telemetryData={telemetryData} trackName={sessionInfo.track} />
              <CompetitorAnalysis 
                competitorData={competitorData} 
                strategyData={strategyData} 
              />
            </div>
          </div>
        )}

        {/* RACE Tab - Race focused view */}
        {activeTab === 'RACE' && (
          <div className="dashboard-content">
            <div className="left-sidebar">
              <Telemetry telemetryData={telemetryData} />
            </div>
            <div className="center-area">
              <div className="center-top">
                <div className="video-section" style={{ flex: 1 }}>
                  <VideoPanel 
                    sessionActive={relayStatus.iRacingConnected} 
                    driverName={sessionInfo.driver}
                  />
                </div>
              </div>
              <div className="center-bottom">
                <AICoaching 
                  insights={coachingInsights} 
                  skillAnalysis={skillAnalysis} 
                />
              </div>
            </div>
            <div className="right-sidebar">
              <CompetitorAnalysis 
                competitorData={competitorData} 
                strategyData={strategyData} 
              />
            </div>
          </div>
        )}

        {/* TRACK Tab - Track map focused */}
        {activeTab === 'TRACK' && (
          <div className="dashboard-content track-view">
            <div className="track-main">
              <TrackMap telemetryData={telemetryData} trackName={sessionInfo.track} />
            </div>
            <div className="track-sidebar">
              <Telemetry telemetryData={telemetryData} />
              <CompetitorAnalysis 
                competitorData={competitorData} 
                strategyData={strategyData} 
              />
            </div>
          </div>
        )}

        {/* STRATEGY Tab - Strategy focused */}
        {activeTab === 'STRATEGY' && (
          <div className="dashboard-content strategy-view">
            <div className="strategy-main">
              <RaceIntelligencePanel intelligence={raceIntelligenceState} />
              <StrategyCalculator
                currentLap={telemetryData?.lap || 1}
                totalLaps={sessionInfo.totalLaps || 50}
                currentFuel={30}
                fuelPerLap={2.5}
                currentTireWear={telemetryData?.tires?.frontLeft?.wear || 15}
                tireWearPerLap={1.5}
                pitStopTime={25}
                currentPosition={telemetryData?.racePosition || 1}
                gapAhead={telemetryData?.gapAhead || 0}
                gapBehind={telemetryData?.gapBehind || 0}
              />
            </div>
            <div className="strategy-sidebar">
              <AICoaching 
                insights={coachingInsights} 
                skillAnalysis={skillAnalysis} 
              />
              <CompetitorAnalysis 
                competitorData={competitorData} 
                strategyData={strategyData} 
              />
            </div>
          </div>
        )}

        {/* SETUP Tab - Car Setup Analysis */}
        {activeTab === 'SETUP' && (
          <div className="dashboard-content setup-view">
            <SetupPage 
              analysis={setupAnalysis} 
              sessionType={
                sessionInfo.session.toLowerCase().includes('practice') ? 'practice' 
                : sessionInfo.session.toLowerCase().includes('qual') ? 'qualifying' 
                : 'race'
              }
            />
          </div>
        )}

        {/* ANALYSIS Tab - Analysis focused */}
        {activeTab === 'ANALYSIS' && (
          <div className="dashboard-content analysis-view">
            <div className="analysis-main">
              <TelemetryGraph data={telemetryHistory} maxPoints={200} />
              <LapComparison 
                laps={lapData} 
                bestLap={bestLap} 
                theoreticalBest={theoreticalBest} 
              />
              <AICoaching 
                insights={coachingInsights} 
                skillAnalysis={skillAnalysis} 
              />
            </div>
            <div className="analysis-sidebar">
              <Telemetry telemetryData={telemetryData} />
              <TrackMap telemetryData={telemetryData} trackName={sessionInfo.track} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
