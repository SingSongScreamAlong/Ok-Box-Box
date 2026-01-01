# PitBox Dashboard Integration

This document provides comprehensive information about the PitBox Dashboard integration, including its architecture, components, and how to extend it for future development.

## Overview

The PitBox Dashboard is a React-based real-time telemetry visualization interface that connects to the PitBox backend via WebSockets. It provides a modular, customizable interface for displaying telemetry data, AI coaching insights, track maps, competitor analysis, and more.

## Architecture

The dashboard follows a modular component-based architecture:

```
dashboard/
├── src/
│   ├── components/
│   │   ├── AICoaching/
│   │   ├── CompetitorAnalysis/
│   │   ├── Dashboard/
│   │   ├── Header/
│   │   ├── Telemetry/
│   │   ├── TrackMap/
│   │   └── VideoPanel/
│   ├── services/
│   │   └── WebSocketService.ts
│   ├── styles/
│   │   └── dashboard.css
│   ├── App.tsx
│   └── index.tsx
└── public/
```

### Key Components

1. **Dashboard**: Main container component that integrates all panels and manages the WebSocket connection.
2. **Header**: Displays session information, connection status, and basic telemetry.
3. **Telemetry**: Shows detailed real-time telemetry data including speed, RPM, gear, throttle, brake, and tire information.
4. **TrackMap**: Visualizes the track layout with current position and corner information.
5. **AICoaching**: Displays AI-generated coaching insights and recommendations.
6. **VideoPanel**: Provides video feed integration and camera controls.
7. **CompetitorAnalysis**: Shows competitor positions, gaps, and comparative analysis.

## WebSocket Service

The `WebSocketService` is a singleton that manages the WebSocket connection to the PitBox backend. It handles:

- Connection establishment and management
- Event subscription and dispatching
- Data parsing and formatting

### Event Types

The WebSocket service supports the following event types:

1. **connect**: Fired when a connection is established
2. **disconnect**: Fired when the connection is lost
3. **telemetry**: Real-time telemetry data updates
4. **session_info**: Session information updates
5. **coaching**: AI coaching insights and recommendations
6. **skill_analysis**: Driver skill analysis and profiling
7. **competitor_data**: Competitor position and performance data
8. **strategy_data**: Race strategy and pit stop recommendations

### Data Interfaces

```typescript
// Session information
interface SessionInfo {
  track: string;
  session: string;
  driver: string;
  car: string;
  weather: {
    temperature: number;
    trackTemperature: number;
    windSpeed: number;
    windDirection: string;
    humidity: number;
    trackGrip: number;
  };
  totalLaps: number;
  sessionTime: number;
  remainingTime: number;
}

// Telemetry data
interface TelemetryData {
  timestamp: number;
  lap: number;
  position: number;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  steering: number;
  tire_temps: {
    FL: number;
    FR: number;
    RL: number;
    RR: number;
  };
  tire_wear: {
    FL: number;
    FR: number;
    RL: number;
    RR: number;
  };
  fuel: number;
  sector: number;
  corner: number;
  track_position: number;
}

// Coaching insights
interface CoachingInsight {
  id: string;
  timestamp: number;
  corner: number;
  corner_name: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  potential_gain: string;
}

// Driver skill analysis
interface DriverSkillAnalysis {
  timestamp: number;
  driver_id: string;
  overall_rating: number;
  consistency: number;
  aggression: number;
  smoothness: number;
  corner_entry: number;
  corner_exit: number;
  braking: number;
  throttle_control: number;
  tire_management: number;
  fuel_efficiency: number;
  adaptability: number;
  strengths: string[];
  weaknesses: string[];
  improvement_areas: {
    area: string;
    description: string;
  }[];
}

// Competitor data
interface CompetitorData {
  id: string;
  name: string;
  position: number;
  gap: number;
}

// Strategy data
interface StrategyData {
  optimal_strategy: {
    stop: number;
    lap: number;
    tire: string;
    fuel: number;
  }[];
  current_strategy: {
    stop: number;
    lap: number;
    tire: string;
    fuel: number;
  }[];
  pit_window: {
    earliest: number;
    optimal: number;
    latest: number;
  };
  tire_life: {
    current: number;
    estimated_laps_remaining: number;
  };
  fuel_status: {
    current: number;
    target: number;
    delta_per_lap: number;
  };
}
```

## Usage

### Starting the Dashboard

1. Navigate to the dashboard directory:
   ```bash
   cd dashboard
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. The dashboard will be available at http://localhost:3000

### Connecting to the Backend

The dashboard automatically attempts to connect to the WebSocket server at `ws://localhost:8765`. To change this URL, modify the `WEBSOCKET_URL` constant in `WebSocketService.ts`.

## Validation

A validation script is provided to test the dashboard integration:

```bash
python validation/validate_dashboard_integration.py
```

This script:
1. Starts a WebSocket server on port 8765
2. Generates mock telemetry data
3. Sends periodic updates for all supported event types
4. Runs for 30 seconds by default

## Extending the Dashboard

### Adding a New Panel

1. Create a new component directory in `src/components/`
2. Create your component files (TSX and CSS)
3. Subscribe to relevant WebSocket events
4. Add your component to the Dashboard layout in `Dashboard.tsx`

Example:

```typescript
// src/components/NewPanel/NewPanel.tsx
import React, { useState, useEffect } from 'react';
import { webSocketService, TelemetryData } from '../../services/WebSocketService';

const NewPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    // Subscribe to relevant events
    const unsubscribe = webSocketService.on('telemetry', (telemetryData) => {
      // Process data
      setData(telemetryData);
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  return (
    <div className="panel new-panel">
      <div className="panel-header">New Panel</div>
      <div className="panel-content">
        {/* Panel content */}
      </div>
    </div>
  );
};

export default NewPanel;
```

### Adding New Event Types

1. Update the event type definitions in `WebSocketService.ts`
2. Add appropriate handler methods
3. Update the event subscription logic

## Styling

The dashboard uses a custom CSS framework defined in `src/styles/dashboard.css`. Key styling concepts:

1. **Dark Theme**: The dashboard uses a dark theme with accent colors for better visibility in racing environments
2. **Grid Layout**: The dashboard uses a responsive grid layout for panel arrangement
3. **Panel Structure**: Each panel follows a consistent structure with header and content sections
4. **Status Colors**: Consistent color coding for status indicators (good, warning, critical)

## Best Practices

1. **Performance Optimization**: Use React's memoization features (useMemo, useCallback) for computationally intensive operations
2. **Responsive Design**: Ensure components adapt to different screen sizes
3. **Error Handling**: Implement robust error handling for WebSocket disconnections and data parsing errors
4. **Type Safety**: Use TypeScript interfaces for all data structures
5. **Component Isolation**: Keep components modular and focused on specific functionality
6. **State Management**: Use React's useState and useEffect hooks for local state, consider Redux for more complex state management

## Future Enhancements

1. **Customizable Layouts**: Allow users to customize panel layouts and sizes
2. **Additional Visualizations**: Add more data visualization options (charts, graphs)
3. **Mobile Support**: Optimize for tablet and mobile devices
4. **Offline Mode**: Add support for offline replay of telemetry data
5. **Multi-Driver Support**: Enhanced support for multi-driver scenarios
6. **AI Insights Integration**: Deeper integration with the AI coaching and strategy systems
