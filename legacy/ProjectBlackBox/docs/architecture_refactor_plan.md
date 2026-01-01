# PitBox System Architecture Refactor Plan

*Date: July 13, 2025*

This document outlines the comprehensive architectural refactor plan for the PitBox system to support expanded features for sim racing telemetry, strategy, and coaching with a focus on endurance racing, training, and performance analytics.

## 1. System Architecture Overview

```
┌───────────────┐    ┌───────────────────────┐    ┌─────────────────────┐
│  DRIVER APP   │◄───┤                       │◄───┤  ENGINEER DASHBOARD │
│ (Lightweight  │    │                       │    │  (Web UI + Mobile)  │
│  Telemetry    │───►│    BLACKBOX CORE      │───►│                     │
│  Collector)   │    │  (Processing Layer)   │    │                     │
└───────────────┘    │                       │    └─────────────────────┘
                     └───────────────────────┘
                              │    ▲
                              ▼    │
                     ┌───────────────────────┐
                     │    DATA STORAGE       │
                     │  (Time Series + ML    │
                     │   Models + Profiles)  │
                     └───────────────────────┘
```

## 2. Component Gap Analysis & Refactor Requirements

### 2.1 Driver App (New Component)
- **Current State**: Not implemented, need to create from scratch
- **Requirements**:
  - Zero-config installer for iRacing integration
  - Background service with minimal UI
  - Telemetry capture module with sim-specific adapters
  - Optional video capture integration
  - Driver identification system
  - Secure data transmission with compression

### 2.2 PitBox Core (Extend Existing)
- **Current State**: Partial implementation (data ingestion, event detection)
- **Needed Extensions**:
  - Modular sim adapter framework (beyond iRacing)
  - Enhanced ML pipeline for predictive models
  - Incident detection system expansion
  - Driver fatigue modeling system
  - Damage modeling and impact forecasting
  - Pass prediction and drafting detection
  - Training goal generation and tracking

### 2.3 Engineer Dashboard (Extend Existing)
- **Current State**: Basic implementation with telemetry display
- **Needed Extensions**:
  - Real-time track map with opponent positioning
  - Dynamic racing line visualization
  - Mistake heatmaps and sector overlays
  - Camera control panel for broadcast integration
  - Split-view mode for driver/spotter perspectives
  - Enhanced multi-driver UI components
  - Mobile-responsive design for tablet/phone access

### 2.4 Analytics & Reports (New Module)
- **Current State**: Basic data collection, no reporting
- **Requirements**:
  - Post-session report generator
  - Driver performance analytics engine
  - Lap comparison visualization tools
  - Setup impact analysis system
  - Long-term performance trending

### 2.5 Training Module (New Module)
- **Current State**: Not implemented
- **Requirements**:
  - AI-driven training goal generator
  - Progress tracking and notification system
  - Skill badging and gamification framework
  - Integration with driver profiles

### 2.6 Multi-Driver Support (Extend Existing)
- **Current State**: Basic implementation started
  - **Needed Extensions**:
  - Automatic driver detection refinement
  - Stint analysis and breakdown tools
  - Enhanced handoff interface
  - Team communication tools
  - Driver-specific settings and preferences

### 2.7 Team & Monetization Features (New Module)
- **Current State**: Not implemented
- **Requirements**:
  - Sponsor exposure tracking and reporting
  - Public/private statboard generator
  - White-label configuration system
  - Premium data API with authentication

## 3. Data Model Extensions

### 3.1 Extended Telemetry Schema
```typescript
interface ExtendedTelemetryData extends TelemetryData {
  // New fields
  suspension: {
    frontLeft: { height: number; load: number; damper: number };
    frontRight: { height: number; load: number; damper: number };
    rearLeft: { height: number; load: number; damper: number };
    rearRight: { height: number; load: number; damper: number };
  };
  engine: {
    temperature: number;
    oilPressure: number;
    oilTemperature: number;
    waterTemperature: number;
    wear: number;
  };
  damage: {
    aerodynamic: number;
    suspension: number;
    transmission: number;
    engine: number;
  };
  driverInputs: {
    smoothness: number;  // Derived metric for input consistency
    aggression: number;  // Derived metric for input intensity
    precision: number;   // Derived metric for input accuracy
  };
  draftingEffect: number;  // Percentage of drafting benefit/penalty
}
```

### 3.2 Driver Profile Extensions
```typescript
interface ExtendedDriverProfile extends DriverProfile {
  // New fields
  trainingGoals: Array<{
    id: string;
    description: string;
    trackId: string;
    cornerIds: string[];
    metricType: 'braking' | 'throttle' | 'line' | 'consistency';
    targetValue: number;
    currentValue: number;
    progress: number;
    createdAt: number;
    completedAt?: number;
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    category: 'braking' | 'throttle' | 'consistency' | 'fuel' | 'tires';
    earnedAt: number;
  }>;
  fatigueModel: {
    baseline: number;
    currentLevel: number;
    riskThreshold: number;
    recoveryRate: number;
    lastUpdate: number;
  };
  preferredSetups: Record<string, string>; // trackId -> setupId
}
```

### 3.3 Session Analytics Schema
```typescript
interface SessionAnalytics {
  sessionId: string;
  trackId: string;
  date: number;
  duration: number;
  stints: Array<{
    driverId: string;
    startTime: number;
    endTime: number;
    laps: number;
    avgLapTime: number;
    bestLapTime: number;
    consistency: number;
    fuelUsed: number;
    fuelEfficiency: number;
    tireWear: {
      frontLeft: number;
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
    incidents: number;
    mistakeHotspots: Array<{
      trackSection: string;
      frequency: number;
      severity: number;
      type: 'braking' | 'throttle' | 'line' | 'spin';
    }>;
  }>;
  overallPerformance: {
    targetAchievement: number;
    paceRelativeToOptimal: number;
    consistencyScore: number;
    fuelEfficiencyScore: number;
    tireManagementScore: number;
    incidentAvoidanceScore: number;
  };
}
```

## 4. New API Endpoints & Event Types

### 4.1 Driver App API
- `/api/v1/telemetry/stream` - WebSocket endpoint for telemetry streaming
- `/api/v1/driver/register` - Register driver in current session
- `/api/v1/video/upload` - Upload driver POV video segments
- `/api/v1/status/update` - Update driver status and system health

### 4.2 New Event Types
```typescript
// New WebSocket event types
enum ExtendedEventType {
  // Existing types...
  
  // New types
  DRIVER_FATIGUE_UPDATE = 'driver_fatigue_update',
  INCIDENT_DETECTED = 'incident_detected',
  TRAINING_GOAL_PROGRESS = 'training_goal_progress',
  BADGE_EARNED = 'badge_earned',
  STRATEGY_RECOMMENDATION = 'strategy_recommendation',
  DRAFTING_OPPORTUNITY = 'drafting_opportunity',
  DAMAGE_ALERT = 'damage_alert',
  SESSION_REPORT_READY = 'session_report_ready',
  VIDEO_SEGMENT_READY = 'video_segment_ready',
  SETUP_IMPACT_ANALYSIS = 'setup_impact_analysis'
}
```

## 5. New Services & Modules

### 5.1 Driver App Services
- `TelemetryCapture` - Sim-specific adapters for data collection
- `VideoCapture` - Optional video recording and streaming
- `DriverIdentification` - Auto-detection of current driver
- `DataCompression` - Optimized data transmission

### 5.2 PitBox Core Extensions
- `PredictiveModeling` - ML-based prediction for tire wear, fuel, etc.
- `IncidentDetection` - Advanced detection of racing incidents
- `DriverFatigueAnalyzer` - Monitoring driver input patterns for fatigue
- `DraftingDetector` - Slipstream and drafting opportunity detection
- `DamageModeling` - Impact and performance degradation prediction
- `TrainingGoalGenerator` - AI-based training recommendation system

### 5.3 Engineer Dashboard Components
- `TrackMapVisualizer` - Real-time track position rendering
- `RacingLineAnalyzer` - Dynamic racing line visualization
- `MistakeHeatmap` - Visual overlay of mistake frequency
- `CameraControlPanel` - Broadcast and spotter view management
- `DriverHandoffInterface` - Enhanced driver swap coordination
- `MobileResponsiveLayout` - Tablet/phone optimized views

### 5.4 Analytics & Reporting
- `SessionReportGenerator` - Automated post-session analysis
- `DriverPerformanceAnalyzer` - Strengths/weaknesses identification
- `LapComparisonTool` - Visual comparison of optimal vs. actual laps
- `SetupImpactAnalyzer` - Performance delta from setup changes

### 5.5 Training Module
- `SkillProgressionTracker` - Long-term improvement monitoring
- `BadgingSystem` - Gamified achievement framework
- `TrainingSessionPlanner` - Structured practice recommendation

### 5.6 Team & Monetization
- `SponsorExposureTracker` - Brand visibility analytics
- `StatboardGenerator` - Public/private performance dashboards
- `WhiteLabelConfig` - Team branding customization
- `PremiumDataAPI` - Authenticated data access for partners

## 6. Implementation Priorities & Roadmap

### Phase 1: Core Architecture Refactor (1-2 weeks)
- Separate codebase into Driver App, PitBox Core, and Engineer Dashboard
- Establish clean API boundaries between components
- Update data models and schemas for expanded features
- Create deployment and development workflows for each component

### Phase 2: Driver App Development (2-3 weeks)
- Create zero-config installer for iRacing
- Implement background telemetry service
- Add driver identification system
- Develop secure data transmission with compression

### Phase 3: PitBox Core Enhancement (3-4 weeks)
- Extend ML pipeline for predictive models
- Implement incident detection system
- Develop driver fatigue modeling
- Add drafting and pass prediction

### Phase 4: Engineer Dashboard Expansion (3-4 weeks)
- Create real-time track map with opponent positioning
- Implement dynamic racing line visualization
- Add mistake heatmaps and sector overlays
- Develop enhanced multi-driver UI components

### Phase 5: Analytics & Training (2-3 weeks)
- Implement post-session report generator
- Create driver performance analytics engine
- Develop training goal generator and progress tracking
- Add badging and gamification framework

### Phase 6: Multi-Driver & Team Features (2-3 weeks)
- Refine automatic driver detection
- Implement stint analysis and breakdown tools
- Enhance handoff interface
- Add team communication tools
- Develop sponsor tracking and reporting

### Phase 7: Mobile & Premium Features (2-3 weeks)
- Create mobile-responsive layouts
- Implement premium data API
- Add white-label configuration
- Develop statboard generator
