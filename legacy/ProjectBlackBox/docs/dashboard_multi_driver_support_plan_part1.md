# Dashboard Multi-Driver Support Implementation Plan - Part 1: Overview & Architecture

## 1. Introduction

This document outlines the implementation plan for adding multi-driver support to the PitBox Dashboard. Multi-driver support is a core requirement for team racing scenarios, driver handoffs, and comparative analysis between drivers.

## 2. Goals and Requirements

### 2.1 Primary Goals

1. Enable seamless switching between multiple drivers in the same session
2. Provide comparative telemetry views for driver performance analysis
3. Implement a structured driver handoff workflow
4. Support team communication and coordination features
5. Maintain dashboard performance and responsiveness with multi-driver data

### 2.2 Key Requirements

1. **Driver Management**
   - Support for up to 4 drivers in a team session
   - Individual driver profiles with customizable settings
   - Real-time driver status tracking (active, standby, offline)

2. **Data Handling**
   - Segregated telemetry streams for each driver
   - Shared session context across drivers
   - Historical data retention for all drivers
   - Efficient data storage and retrieval

3. **User Interface**
   - Clear visual indication of active driver
   - Easy-to-use driver switching controls
   - Split-screen and overlay options for comparison
   - Consistent styling across driver-specific views

4. **Team Coordination**
   - Structured handoff protocol with confirmations
   - Team messaging and notifications
   - Shared strategy planning tools
   - Role-based access controls (driver, engineer, team principal)

## 3. System Architecture

### 3.1 Multi-Driver Data Architecture

The foundation of multi-driver support will be a revised data architecture that can handle multiple telemetry streams while maintaining performance:

```
┌─────────────────────────────────────┐
│         WebSocket Service           │
└───────────────────┬─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│         Driver Manager              │
├─────────────────────────────────────┤
│ - Driver Registry                   │
│ - Active Driver State               │
│ - Driver Data Routing               │
└───────┬───────────────┬─────────────┘
        │               │
        ▼               ▼
┌───────────────┐ ┌─────────────────┐
│ Driver Store  │ │ Comparison      │
│ (Redux)       │ │ Engine          │
└───────┬───────┘ └────────┬────────┘
        │                  │
        ▼                  ▼
┌─────────────────────────────────────┐
│         Dashboard Components         │
└─────────────────────────────────────┘
```

### 3.2 Key Components

1. **WebSocketService Enhancement**
   - Extended to handle driver-specific event channels
   - Support for driver identification in messages
   - Efficient message routing based on driver ID

2. **DriverManager Service**
   - Central registry of all drivers in the session
   - Management of active driver state
   - Coordination of driver handoffs
   - Data routing between WebSocketService and components

3. **DriverStore (Redux)**
   - State management for driver-specific data
   - Efficient updates and subscriptions
   - Historical data retention
   - Performance optimization for multiple data streams

4. **ComparisonEngine**
   - Processing of multi-driver telemetry for comparison
   - Generation of delta metrics and insights
   - Support for historical and real-time comparisons

## 4. Data Model Extensions

### 4.1 Driver Profile

```typescript
interface DriverProfile {
  id: string;
  name: string;
  team: string;
  role: 'primary' | 'secondary' | 'reserve';
  status: 'active' | 'standby' | 'offline';
  avatar?: string;
  preferences: {
    displayUnits: 'metric' | 'imperial';
    telemetryHighlights: string[];
    uiTheme: 'default' | 'high-contrast' | 'custom';
    customColors?: Record<string, string>;
  };
  stats: {
    totalLaps: number;
    bestLap: number;
    consistencyRating: number;
    lastActive: number; // timestamp
  };
}
```

### 4.2 Session Extension

```typescript
// Extended SessionInfo with multi-driver support
interface SessionInfo {
  // Existing fields...
  track: string;
  session: string;
  car: string;
  weather: WeatherInfo;
  
  // New multi-driver fields
  drivers: DriverProfile[];
  activeDriverId: string;
  teamName: string;
  teamStrategy: {
    plannedHandoffs: {
      lap: number;
      fromDriverId: string;
      toDriverId: string;
      completed: boolean;
    }[];
    notes: string;
  };
}
```

### 4.3 Telemetry Extension

```typescript
// Extended TelemetryData with driver identification
interface TelemetryData {
  // Existing fields...
  timestamp: number;
  lap: number;
  speed: number;
  // ...
  
  // New multi-driver fields
  driverId: string;
  driverName: string;
  stint: {
    number: number;
    startTime: number;
    lapCount: number;
    fuelAtStart: number;
    tiresAtStart: {
      FL: number;
      FR: number;
      RL: number;
      RR: number;
    };
  };
}
```
