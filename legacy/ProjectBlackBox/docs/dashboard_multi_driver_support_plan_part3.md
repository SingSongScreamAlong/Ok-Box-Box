# Dashboard Multi-Driver Support Implementation Plan - Part 3: Data Flow & State Management

## 6. Core Services Implementation

### 6.1 DriverManager Service

The DriverManager service will be the central coordinator for multi-driver functionality:

```typescript
// src/services/DriverManager.ts
import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from './WebSocketService';
import { v4 as uuidv4 } from 'uuid';

export interface DriverProfile {
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
    lastActive: number;
  };
}

interface HandoffRequest {
  id: string;
  fromDriverId: string;
  toDriverId: string;
  notes: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

class DriverManagerService {
  private drivers: Record<string, DriverProfile> = {};
  private activeDriverId: string = '';
  private driverStatus: Record<string, 'active' | 'standby' | 'offline'> = {};
  private handoffRequests: Record<string, HandoffRequest> = {};
  private listeners: Set<() => void> = new Set();
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    webSocketService.on('session_info', this.handleSessionInfo);
    webSocketService.on('driver_update', this.handleDriverUpdate);
    webSocketService.on('handoff_request', this.handleHandoffRequest);
    webSocketService.on('handoff_response', this.handleHandoffResponse);
  }
  
  private handleSessionInfo = (data: any) => {
    if (data && data.drivers) {
      this.drivers = data.drivers.reduce((acc: Record<string, DriverProfile>, driver: DriverProfile) => {
        acc[driver.id] = driver;
        this.driverStatus[driver.id] = driver.status;
        return acc;
      }, {});
      
      this.activeDriverId = data.activeDriverId || '';
      this.notifyListeners();
    }
  };
  
  private handleDriverUpdate = (data: any) => {
    if (data && data.driver) {
      const { id, ...driverData } = data.driver;
      if (this.drivers[id]) {
        this.drivers[id] = { ...this.drivers[id], ...driverData };
        if (driverData.status) {
          this.driverStatus[id] = driverData.status;
        }
        this.notifyListeners();
      }
    }
  };
  
  private handleHandoffRequest = (data: any) => {
    if (data && data.handoff) {
      const { id, ...handoffData } = data.handoff;
      this.handoffRequests[id] = { id, ...handoffData };
      this.notifyListeners();
    }
  };
  
  private handleHandoffResponse = (data: any) => {
    if (data && data.handoffId && data.status) {
      const { handoffId, status } = data;
      
      if (this.handoffRequests[handoffId]) {
        this.handoffRequests[handoffId].status = status;
        
        if (status === 'completed') {
          // Update active driver
          const handoff = this.handoffRequests[handoffId];
          this.activeDriverId = handoff.toDriverId;
          this.driverStatus[handoff.fromDriverId] = 'standby';
          this.driverStatus[handoff.toDriverId] = 'active';
        }
        
        this.notifyListeners();
      }
    }
  };
  
  public getDrivers(): Record<string, DriverProfile> {
    return { ...this.drivers };
  }
  
  public getActiveDriverId(): string {
    return this.activeDriverId;
  }
  
  public getDriverStatus(): Record<string, 'active' | 'standby' | 'offline'> {
    return { ...this.driverStatus };
  }
  
  public switchActiveDriver(driverId: string): void {
    if (this.drivers[driverId] && driverId !== this.activeDriverId) {
      // In a real implementation, this would go through the handoff process
      // For simplicity, we're doing a direct switch here
      webSocketService.send('switch_driver', { driverId });
      
      // Optimistically update local state
      const previousActiveId = this.activeDriverId;
      this.activeDriverId = driverId;
      this.driverStatus[previousActiveId] = 'standby';
      this.driverStatus[driverId] = 'active';
      
      this.notifyListeners();
    }
  }
  
  public initiateHandoff(fromDriverId: string, toDriverId: string, notes: string): string {
    const handoffId = uuidv4();
    const handoff: HandoffRequest = {
      id: handoffId,
      fromDriverId,
      toDriverId,
      notes,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.handoffRequests[handoffId] = handoff;
    webSocketService.send('handoff_request', { handoff });
    
    this.notifyListeners();
    return handoffId;
  }
  
  public confirmHandoff(handoffId: string): void {
    if (this.handoffRequests[handoffId] && this.handoffRequests[handoffId].status === 'pending') {
      webSocketService.send('handoff_response', { handoffId, status: 'confirmed' });
      
      // Optimistically update local state
      this.handoffRequests[handoffId].status = 'confirmed';
      
      // Complete the handoff after a short delay (simulating the handoff process)
      setTimeout(() => {
        const handoff = this.handoffRequests[handoffId];
        this.activeDriverId = handoff.toDriverId;
        this.driverStatus[handoff.fromDriverId] = 'standby';
        this.driverStatus[handoff.toDriverId] = 'active';
        this.handoffRequests[handoffId].status = 'completed';
        
        webSocketService.send('handoff_response', { handoffId, status: 'completed' });
        this.notifyListeners();
      }, 2000);
      
      this.notifyListeners();
    }
  }
  
  public cancelHandoff(handoffId: string): void {
    if (this.handoffRequests[handoffId] && 
        ['pending', 'confirmed'].includes(this.handoffRequests[handoffId].status)) {
      webSocketService.send('handoff_response', { handoffId, status: 'cancelled' });
      
      // Update local state
      this.handoffRequests[handoffId].status = 'cancelled';
      this.notifyListeners();
    }
  }
  
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const driverManager = new DriverManagerService();

// React hook for components
export function useDriverManager() {
  const [drivers, setDrivers] = useState<Record<string, DriverProfile>>(driverManager.getDrivers());
  const [activeDriverId, setActiveDriverId] = useState<string>(driverManager.getActiveDriverId());
  const [driverStatus, setDriverStatus] = useState<Record<string, 'active' | 'standby' | 'offline'>>(
    driverManager.getDriverStatus()
  );
  
  useEffect(() => {
    const handleUpdate = () => {
      setDrivers(driverManager.getDrivers());
      setActiveDriverId(driverManager.getActiveDriverId());
      setDriverStatus(driverManager.getDriverStatus());
    };
    
    const unsubscribe = driverManager.subscribe(handleUpdate);
    return unsubscribe;
  }, []);
  
  const switchActiveDriver = useCallback((driverId: string) => {
    driverManager.switchActiveDriver(driverId);
  }, []);
  
  const initiateHandoff = useCallback((fromDriverId: string, toDriverId: string, notes: string) => {
    return driverManager.initiateHandoff(fromDriverId, toDriverId, notes);
  }, []);
  
  const confirmHandoff = useCallback((handoffId: string) => {
    driverManager.confirmHandoff(handoffId);
  }, []);
  
  const cancelHandoff = useCallback((handoffId: string) => {
    driverManager.cancelHandoff(handoffId);
  }, []);
  
  return {
    drivers,
    activeDriverId,
    driverStatus,
    switchActiveDriver,
    initiateHandoff,
    confirmHandoff,
    cancelHandoff
  };
}
```

### 6.2 ComparisonEngine Service

The ComparisonEngine service will handle the analysis and comparison of telemetry data between drivers:

```typescript
// src/services/ComparisonEngine.ts
import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from './WebSocketService';
import { driverManager } from './DriverManager';

export interface ComparisonMetric {
  name: string;
  driverA: {
    value: string | number;
    delta: number;
  };
  driverB: {
    value: string | number;
    delta: number;
  };
}

class ComparisonEngineService {
  private telemetryCache: Record<string, any[]> = {};
  private comparisonResults: Record<string, ComparisonMetric[]> = {};
  private listeners: Map<string, Set<() => void>> = new Map();
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    webSocketService.on('telemetry', this.handleTelemetry);
    webSocketService.on('comparison_result', this.handleComparisonResult);
  }
  
  private handleTelemetry = (data: any) => {
    if (data && data.driverId) {
      const { driverId } = data;
      
      if (!this.telemetryCache[driverId]) {
        this.telemetryCache[driverId] = [];
      }
      
      // Keep a rolling cache of recent telemetry
      this.telemetryCache[driverId].push(data);
      if (this.telemetryCache[driverId].length > 100) {
        this.telemetryCache[driverId].shift();
      }
    }
  };
  
  private handleComparisonResult = (data: any) => {
    if (data && data.comparisonId && data.metrics) {
      const { comparisonId, metrics } = data;
      this.comparisonResults[comparisonId] = metrics;
      this.notifyListeners(comparisonId);
    }
  };
  
  public getComparison(driverAId: string, driverBId: string): string {
    const comparisonId = `${driverAId}_${driverBId}`;
    
    // Request comparison from server
    webSocketService.send('request_comparison', {
      driverAId,
      driverBId,
      comparisonId
    });
    
    // For demo purposes, generate some sample comparison data
    setTimeout(() => {
      this.generateSampleComparisonData(driverAId, driverBId, comparisonId);
    }, 500);
    
    return comparisonId;
  }
  
  private generateSampleComparisonData(driverAId: string, driverBId: string, comparisonId: string) {
    const metrics: ComparisonMetric[] = [
      {
        name: 'Avg. Speed',
        driverA: { value: '285.4 km/h', delta: 2.3 },
        driverB: { value: '283.1 km/h', delta: -2.3 }
      },
      {
        name: 'Best Lap',
        driverA: { value: '1:32.456', delta: -0.123 },
        driverB: { value: '1:32.579', delta: 0.123 }
      },
      {
        name: 'Consistency',
        driverA: { value: '94%', delta: -2 },
        driverB: { value: '96%', delta: 2 }
      },
      {
        name: 'Fuel Usage',
        driverA: { value: '3.2 kg/lap', delta: 0.2 },
        driverB: { value: '3.0 kg/lap', delta: -0.2 }
      },
      {
        name: 'Tire Wear',
        driverA: { value: '0.8%/lap', delta: 0.1 },
        driverB: { value: '0.7%/lap', delta: -0.1 }
      }
    ];
    
    this.comparisonResults[comparisonId] = metrics;
    this.notifyListeners(comparisonId);
  }
  
  public getComparisonMetrics(comparisonId: string): ComparisonMetric[] {
    return this.comparisonResults[comparisonId] || [];
  }
  
  public subscribe(comparisonId: string, listener: () => void): () => void {
    if (!this.listeners.has(comparisonId)) {
      this.listeners.set(comparisonId, new Set());
    }
    
    this.listeners.get(comparisonId)!.add(listener);
    
    return () => {
      const listeners = this.listeners.get(comparisonId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(comparisonId);
        }
      }
    };
  }
  
  private notifyListeners(comparisonId: string): void {
    const listeners = this.listeners.get(comparisonId);
    if (listeners) {
      listeners.forEach(listener => listener());
    }
  }
}

// Singleton instance
export const comparisonEngine = new ComparisonEngineService();

// React hook for components
export function useComparisonEngine() {
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetric[]>([]);
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);
  
  useEffect(() => {
    if (currentComparisonId) {
      const handleUpdate = () => {
        setComparisonMetrics(comparisonEngine.getComparisonMetrics(currentComparisonId!));
      };
      
      const unsubscribe = comparisonEngine.subscribe(currentComparisonId, handleUpdate);
      handleUpdate(); // Initial load
      
      return unsubscribe;
    }
    return undefined;
  }, [currentComparisonId]);
  
  const getComparison = useCallback((driverAId: string, driverBId: string) => {
    const comparisonId = comparisonEngine.getComparison(driverAId, driverBId);
    setCurrentComparisonId(comparisonId);
  }, []);
  
  return {
    comparisonMetrics,
    getComparison
  };
}
```
