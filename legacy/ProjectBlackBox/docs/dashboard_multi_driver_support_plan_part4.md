# Dashboard Multi-Driver Support Implementation Plan - Part 4: WebSocket Extensions, Testing & Implementation Roadmap

## 7. WebSocketService Extensions

The existing WebSocketService needs to be extended to support multi-driver functionality:

```typescript
// src/services/WebSocketService.ts - Extensions for multi-driver support

// Add these new event types to the existing WebSocketService
export type WebSocketEventType = 
  // Existing event types...
  | 'telemetry_update'
  | 'lap_completed'
  | 'session_info'
  | 'weather_update'
  // New multi-driver event types
  | 'driver_update'
  | 'driver_list'
  | 'handoff_request'
  | 'handoff_response'
  | 'switch_driver'
  | 'team_message'
  | 'request_comparison'
  | 'comparison_result';

// Add these new event data interfaces
export interface DriverUpdateEvent {
  driver: {
    id: string;
    name: string;
    status: 'active' | 'standby' | 'offline';
    [key: string]: any; // Other driver properties
  };
}

export interface DriverListEvent {
  drivers: Array<{
    id: string;
    name: string;
    team: string;
    role: string;
    status: 'active' | 'standby' | 'offline';
    [key: string]: any; // Other driver properties
  }>;
  activeDriverId: string;
}

export interface HandoffRequestEvent {
  handoff: {
    id: string;
    fromDriverId: string;
    toDriverId: string;
    notes: string;
    timestamp: number;
    status: 'pending';
  };
}

export interface HandoffResponseEvent {
  handoffId: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface SwitchDriverEvent {
  driverId: string;
}

export interface TeamMessageEvent {
  message: {
    id: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    content: string;
    priority: 'normal' | 'high' | 'critical';
  };
}

export interface RequestComparisonEvent {
  driverAId: string;
  driverBId: string;
  comparisonId: string;
}

export interface ComparisonResultEvent {
  comparisonId: string;
  metrics: Array<{
    name: string;
    driverA: {
      value: string | number;
      delta: number;
    };
    driverB: {
      value: string | number;
      delta: number;
    };
  }>;
}

// Extend the WebSocketService class with driver-specific methods
class WebSocketService {
  // Existing implementation...
  
  // Add these new methods
  
  /**
   * Send a driver-specific telemetry event
   * @param driverId The ID of the driver
   * @param telemetryData The telemetry data to send
   */
  public sendDriverTelemetry(driverId: string, telemetryData: any): void {
    this.send('telemetry_update', {
      driverId,
      ...telemetryData
    });
  }
  
  /**
   * Request telemetry data for a specific driver
   * @param driverId The ID of the driver
   * @param timeRange Optional time range for historical data
   */
  public requestDriverTelemetry(driverId: string, timeRange?: { start: number; end: number }): void {
    this.send('request_telemetry', {
      driverId,
      timeRange
    });
  }
  
  /**
   * Send a team message
   * @param content The message content
   * @param priority The message priority
   */
  public sendTeamMessage(content: string, priority: 'normal' | 'high' | 'critical' = 'normal'): void {
    const activeDriverId = driverManager.getActiveDriverId();
    const drivers = driverManager.getDrivers();
    
    this.send('team_message', {
      message: {
        id: `msg-${Date.now()}`,
        senderId: activeDriverId,
        senderName: drivers[activeDriverId]?.name || 'Unknown',
        timestamp: Date.now(),
        content,
        priority
      }
    });
  }
}
```

## 8. Testing Strategy

### 8.1 Unit Testing

Unit tests should be created for each new component and service:

```typescript
// tests/services/DriverManager.test.ts
import { driverManager } from '../../src/services/DriverManager';
import { webSocketService } from '../../src/services/WebSocketService';

// Mock WebSocketService
jest.mock('../../src/services/WebSocketService', () => ({
  webSocketService: {
    on: jest.fn(),
    send: jest.fn(),
  }
}));

describe('DriverManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should register WebSocket event listeners on initialization', () => {
    expect(webSocketService.on).toHaveBeenCalledWith('session_info', expect.any(Function));
    expect(webSocketService.on).toHaveBeenCalledWith('driver_update', expect.any(Function));
    expect(webSocketService.on).toHaveBeenCalledWith('handoff_request', expect.any(Function));
    expect(webSocketService.on).toHaveBeenCalledWith('handoff_response', expect.any(Function));
  });
  
  test('should update drivers when session_info event is received', () => {
    // Get the session_info handler
    const sessionInfoHandler = (webSocketService.on as jest.Mock).mock.calls.find(
      call => call[0] === 'session_info'
    )[1];
    
    // Mock session info data
    const mockSessionInfo = {
      drivers: [
        {
          id: 'driver1',
          name: 'Driver 1',
          team: 'Team A',
          role: 'primary',
          status: 'active'
        },
        {
          id: 'driver2',
          name: 'Driver 2',
          team: 'Team A',
          role: 'secondary',
          status: 'standby'
        }
      ],
      activeDriverId: 'driver1'
    };
    
    // Call the handler with mock data
    sessionInfoHandler(mockSessionInfo);
    
    // Check if the driver manager state is updated correctly
    expect(driverManager.getDrivers()).toEqual({
      driver1: mockSessionInfo.drivers[0],
      driver2: mockSessionInfo.drivers[1]
    });
    expect(driverManager.getActiveDriverId()).toBe('driver1');
    expect(driverManager.getDriverStatus()).toEqual({
      driver1: 'active',
      driver2: 'standby'
    });
  });
  
  // Additional tests for other methods and event handlers...
});
```

### 8.2 Integration Testing

Integration tests should verify that components work together correctly:

```typescript
// tests/integration/MultiDriverIntegration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DriverSelector } from '../../src/components/DriverSelector/DriverSelector';
import { driverManager } from '../../src/services/DriverManager';
import { webSocketService } from '../../src/services/WebSocketService';

// Mock services
jest.mock('../../src/services/WebSocketService');
jest.mock('../../src/services/DriverManager', () => ({
  useDriverManager: () => ({
    drivers: {
      driver1: { id: 'driver1', name: 'Driver 1', role: 'primary', status: 'active' },
      driver2: { id: 'driver2', name: 'Driver 2', role: 'secondary', status: 'standby' }
    },
    activeDriverId: 'driver1',
    driverStatus: { driver1: 'active', driver2: 'standby' },
    switchActiveDriver: jest.fn()
  }),
  driverManager: {
    getDrivers: jest.fn(),
    getActiveDriverId: jest.fn(),
    getDriverStatus: jest.fn(),
    subscribe: jest.fn(() => jest.fn())
  }
}));

describe('Multi-Driver Integration', () => {
  test('DriverSelector should display active driver and allow switching', async () => {
    render(<DriverSelector />);
    
    // Check if active driver is displayed
    expect(screen.getByText('Driver 1')).toBeInTheDocument();
    expect(screen.getByText('primary')).toBeInTheDocument();
    
    // Select another driver
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'driver2' } });
    
    // Check if switchActiveDriver was called
    const { switchActiveDriver } = require('../../src/services/DriverManager').useDriverManager();
    expect(switchActiveDriver).toHaveBeenCalledWith('driver2');
  });
  
  // Additional integration tests...
});
```

### 8.3 End-to-End Testing

End-to-end tests should verify the complete multi-driver workflow:

```typescript
// tests/e2e/MultiDriverWorkflow.test.ts
import { test, expect } from '@playwright/test';

test('Complete driver handoff workflow', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('http://localhost:3000/dashboard');
  
  // Wait for dashboard to load
  await page.waitForSelector('.dashboard-container');
  
  // Open driver handoff dialog
  await page.click('.driver-handoff-button');
  
  // Select target driver
  await page.selectOption('.target-driver-select', 'driver2');
  
  // Add handoff notes
  await page.fill('.handoff-notes', 'Watch out for tire wear in sector 2');
  
  // Initiate handoff
  await page.click('.initiate-handoff-button');
  
  // Verify handoff confirmation screen
  await expect(page.locator('.handoff-confirmation')).toBeVisible();
  await expect(page.locator('.handoff-confirmation')).toContainText('Waiting for Driver 2 to confirm handoff');
  
  // Simulate confirmation (in real E2E test, would use a second browser instance)
  await page.evaluate(() => {
    window.postMessage({ 
      type: 'MOCK_HANDOFF_CONFIRMATION',
      handoffId: document.querySelector('.handoff-id')?.textContent?.replace('Handoff ID: ', '')
    }, '*');
  });
  
  // Verify handoff completion
  await expect(page.locator('.handoff-complete')).toBeVisible();
  await expect(page.locator('.handoff-complete')).toContainText('Handoff Complete');
  
  // Close dialog
  await page.click('.ok-button');
  
  // Verify active driver has changed
  await expect(page.locator('.active-driver .driver-name')).toContainText('Driver 2');
});
```

### 8.4 Test Data Generation

Create a test data generator for multi-driver scenarios:

```typescript
// tests/utils/MultiDriverTestData.ts
import { v4 as uuidv4 } from 'uuid';

export interface TestDriver {
  id: string;
  name: string;
  team: string;
  role: 'primary' | 'secondary' | 'reserve';
  status: 'active' | 'standby' | 'offline';
}

export interface TestTelemetry {
  timestamp: number;
  driverId: string;
  lap: number;
  sector: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  steeringAngle: number;
  // Additional telemetry fields...
}

export class MultiDriverTestDataGenerator {
  private drivers: TestDriver[] = [];
  private telemetryData: Record<string, TestTelemetry[]> = {};
  
  constructor(driverCount: number = 2) {
    this.generateDrivers(driverCount);
    this.generateTelemetryData();
  }
  
  private generateDrivers(count: number): void {
    const roles: ('primary' | 'secondary' | 'reserve')[] = ['primary', 'secondary', 'reserve'];
    
    for (let i = 0; i < count; i++) {
      const driver: TestDriver = {
        id: `driver-${i + 1}`,
        name: `Test Driver ${i + 1}`,
        team: 'Test Team',
        role: roles[i % roles.length],
        status: i === 0 ? 'active' : 'standby'
      };
      
      this.drivers.push(driver);
    }
  }
  
  private generateTelemetryData(): void {
    for (const driver of this.drivers) {
      this.telemetryData[driver.id] = [];
      
      // Generate 10 laps of telemetry data
      for (let lap = 1; lap <= 10; lap++) {
        for (let sector = 1; sector <= 3; sector++) {
          // Generate 20 data points per sector
          for (let i = 0; i < 20; i++) {
            const timestamp = Date.now() - (10 - lap) * 90000 - (3 - sector) * 30000 - (20 - i) * 1000;
            
            const telemetry: TestTelemetry = {
              timestamp,
              driverId: driver.id,
              lap,
              sector,
              speed: 200 + Math.random() * 50,
              throttle: Math.random(),
              brake: Math.random() * 0.5,
              gear: Math.floor(Math.random() * 8),
              rpm: 5000 + Math.random() * 3000,
              steeringAngle: (Math.random() - 0.5) * 90
            };
            
            this.telemetryData[driver.id].push(telemetry);
          }
        }
      }
    }
  }
  
  public getDrivers(): TestDriver[] {
    return [...this.drivers];
  }
  
  public getActiveDriver(): TestDriver {
    return this.drivers.find(driver => driver.status === 'active')!;
  }
  
  public getTelemetryForDriver(driverId: string): TestTelemetry[] {
    return [...(this.telemetryData[driverId] || [])];
  }
  
  public getAllTelemetry(): Record<string, TestTelemetry[]> {
    return { ...this.telemetryData };
  }
  
  public generateHandoffRequest(fromDriverId: string, toDriverId: string): any {
    return {
      handoff: {
        id: uuidv4(),
        fromDriverId,
        toDriverId,
        notes: 'Test handoff request',
        timestamp: Date.now(),
        status: 'pending'
      }
    };
  }
}
```

## 9. Implementation Roadmap

### 9.1 Phase 1: Core Infrastructure (Week 1)

1. **Data Architecture Setup**
   - Extend WebSocketService with multi-driver event types
   - Implement DriverManager service
   - Create driver data models and interfaces
   - Update Redux store for multi-driver state management

2. **Backend Integration**
   - Coordinate with backend team on multi-driver event protocol
   - Implement driver identification in telemetry events
   - Set up driver registration and status tracking

### 9.2 Phase 2: UI Components (Week 2)

1. **Driver Selection UI**
   - Implement DriverSelector component
   - Add driver status indicators
   - Integrate with DriverManager service

2. **Dashboard Adaptations**
   - Update all dashboard panels to be driver-aware
   - Implement driver-specific data filtering
   - Add visual indicators for active driver

### 9.3 Phase 3: Driver Comparison (Week 3)

1. **Comparison Engine**
   - Implement ComparisonEngine service
   - Create delta calculation algorithms
   - Set up historical data comparison

2. **Comparison UI**
   - Build DriverComparison panel
   - Implement split-screen and overlay views
   - Add visual delta indicators

### 9.4 Phase 4: Team Features (Week 4)

1. **Driver Handoff**
   - Implement DriverHandoffDialog component
   - Create handoff protocol and workflow
   - Add notifications and confirmations

2. **Team Communication**
   - Build TeamCommunication panel
   - Implement messaging system
   - Add priority notifications

### 9.5 Phase 5: Testing & Refinement (Week 5)

1. **Comprehensive Testing**
   - Write unit tests for all new components
   - Implement integration tests for multi-driver workflows
   - Create end-to-end tests for complete scenarios

2. **Performance Optimization**
   - Profile and optimize multi-driver data handling
   - Implement efficient data caching strategies
   - Optimize rendering for multiple telemetry streams

3. **Documentation & Training**
   - Update dashboard documentation with multi-driver features
   - Create user guides for team racing scenarios
   - Provide examples of multi-driver workflows

## 10. Conclusion

The multi-driver support implementation will significantly enhance the PitBox platform's capabilities for team racing scenarios. By following this implementation plan, we will create a robust, performant, and user-friendly system that enables seamless driver handoffs, comparative analysis, and team coordination.

Key success metrics for this implementation will include:
- Smooth, lag-free performance when tracking multiple drivers
- Intuitive UI for driver switching and comparison
- Reliable driver handoff process with clear confirmation steps
- Comprehensive team communication features
- Thorough test coverage for all multi-driver scenarios

This implementation aligns with the core project requirements for multi-driver handoff and team racing support, providing a foundation for future enhancements such as AI-powered driver comparisons and predictive team strategy recommendations.
