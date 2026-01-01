# Dashboard Performance Optimization Plan

This document outlines the implementation plan for optimizing the PitBox Dashboard's performance for real-time data handling, which is the highest priority improvement identified in the next-phase improvements document.

## Current Performance Assessment

Based on our component validation, the dashboard performs well with standard data rates but may experience performance issues with high-frequency telemetry updates, particularly on less powerful devices or when multiple data-intensive components are active simultaneously.

## Optimization Goals

1. Maintain smooth UI updates at 60fps even with telemetry data arriving at 10+ updates per second
2. Reduce CPU usage by at least 30% during high-frequency updates
3. Eliminate any perceptible UI lag during race sessions
4. Support simultaneous rendering of multiple data-intensive components

## Implementation Strategy

### 1. React Component Optimization

#### 1.1 Implement Memoization

**Files to modify:**
- `/dashboard/src/components/Telemetry/Telemetry.tsx`
- `/dashboard/src/components/TrackMap/TrackMap.tsx`
- `/dashboard/src/components/CompetitorAnalysis/CompetitorAnalysis.tsx`

**Implementation details:**
```typescript
// Example implementation for Telemetry.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Existing imports...

const Telemetry: React.FC = () => {
  // Existing state...
  
  // Memoize expensive calculations
  const processedTelemetryData = useMemo(() => {
    if (!telemetryData) return null;
    
    // Process telemetry data (calculations, transformations, etc.)
    return {
      // Processed data...
    };
  }, [telemetryData]);
  
  // Memoize event handlers
  const handleTelemetryUpdate = useCallback((data) => {
    // Handle telemetry update...
  }, [/* dependencies */]);
  
  useEffect(() => {
    const unsubscribe = webSocketService.on('telemetry', handleTelemetryUpdate);
    return () => unsubscribe();
  }, [handleTelemetryUpdate]);
  
  // Render using processedTelemetryData...
};
```

#### 1.2 Implement React.memo for Pure Components

**Files to modify:**
- All child components in the dashboard that receive props but don't have internal state

**Implementation details:**
```typescript
// Example for a gauge component
import React from 'react';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
}

const Gauge: React.FC<GaugeProps> = React.memo(({ value, min, max, label }) => {
  // Render gauge...
});

export default Gauge;
```

### 2. Data Processing Optimization

#### 2.1 Implement Data Throttling

**Files to modify:**
- `/dashboard/src/services/WebSocketService.ts`

**Implementation details:**
```typescript
// Add throttling to WebSocketService.ts
import { throttle } from 'lodash';

class WebSocketService {
  // Existing code...
  
  private handleTelemetryEvent = (data: any) => {
    this.throttledDispatch('telemetry', data);
  }
  
  private throttledDispatch = throttle((eventType: string, data: any) => {
    this.dispatchEvent(eventType, data);
  }, 100); // Throttle to max 10 updates per second
  
  // Existing code...
}
```

#### 2.2 Implement WebWorkers for Heavy Computations

**New files to create:**
- `/dashboard/src/workers/telemetryProcessor.worker.ts`

**Implementation details:**
```typescript
// telemetryProcessor.worker.ts
self.onmessage = (event) => {
  const { telemetryData } = event.data;
  
  // Perform heavy computations
  const processedData = processTelemetryData(telemetryData);
  
  self.postMessage({ processedData });
};

function processTelemetryData(data) {
  // Heavy processing logic...
  return processedData;
}
```

**Files to modify:**
- `/dashboard/src/components/Telemetry/Telemetry.tsx`

```typescript
// In Telemetry.tsx
import React, { useState, useEffect, useRef } from 'react';

const Telemetry: React.FC = () => {
  // Existing state...
  const workerRef = useRef<Worker | null>(null);
  
  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('../../workers/telemetryProcessor.worker.ts', import.meta.url));
    
    // Handle worker messages
    workerRef.current.onmessage = (event) => {
      const { processedData } = event.data;
      // Update state with processed data
      setProcessedTelemetryData(processedData);
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const handleTelemetryUpdate = (data) => {
    // Send data to worker for processing
    workerRef.current?.postMessage({ telemetryData: data });
  };
  
  // Existing code...
};
```

### 3. Rendering Optimization

#### 3.1 Implement Virtualized Lists for Long Data

**Files to modify:**
- `/dashboard/src/components/CompetitorAnalysis/CompetitorAnalysis.tsx`
- `/dashboard/src/components/AICoaching/AICoaching.tsx`

**Implementation details:**
```typescript
// Example for CompetitorAnalysis.tsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';

const CompetitorAnalysis: React.FC = () => {
  // Existing state...
  
  const Row = ({ index, style }) => {
    const competitor = competitors[index];
    return (
      <div style={style} className="competitor-row">
        {/* Competitor data */}
      </div>
    );
  };
  
  return (
    <div className="competitor-analysis">
      <div className="panel-header">Competitor Analysis</div>
      <div className="panel-content">
        <List
          height={400}
          itemCount={competitors.length}
          itemSize={50}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  );
};
```

#### 3.2 Optimize Canvas Rendering for TrackMap

**Files to modify:**
- `/dashboard/src/components/TrackMap/TrackMap.tsx`

**Implementation details:**
```typescript
// In TrackMap.tsx
import React, { useRef, useEffect } from 'react';

const TrackMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousPositions = useRef<any>(null);
  
  // Draw only what changed
  const updateCanvas = (positions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Only redraw what changed
    if (previousPositions.current) {
      // Clear only the areas that changed
      positions.forEach((pos, index) => {
        const prevPos = previousPositions.current[index];
        if (prevPos && (prevPos.x !== pos.x || prevPos.y !== pos.y)) {
          // Clear previous position
          ctx.clearRect(prevPos.x - 10, prevPos.y - 10, 20, 20);
          // Draw new position
          drawPosition(ctx, pos);
        }
      });
    } else {
      // First render, draw everything
      drawFullTrackMap(ctx, positions);
    }
    
    previousPositions.current = [...positions];
  };
  
  // Existing code...
};
```

### 4. Memory Management

#### 4.1 Implement Cleanup for Event Listeners

**Files to modify:**
- All components that subscribe to WebSocket events

**Implementation details:**
```typescript
// Example implementation
useEffect(() => {
  const unsubscribeTelemetry = webSocketService.on('telemetry', handleTelemetryUpdate);
  const unsubscribeSession = webSocketService.on('session_info', handleSessionUpdate);
  
  return () => {
    unsubscribeTelemetry();
    unsubscribeSession();
  };
}, [handleTelemetryUpdate, handleSessionUpdate]);
```

#### 4.2 Implement Object Pooling for Frequently Created Objects

**New files to create:**
- `/dashboard/src/utils/ObjectPool.ts`

**Implementation details:**
```typescript
// ObjectPool.ts
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  
  constructor(factory: () => T, initialSize: number = 10) {
    this.factory = factory;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }
  
  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }
  
  release(obj: T): void {
    this.pool.push(obj);
  }
}
```

## Testing and Validation

### 1. Performance Benchmarking

1. Create a performance benchmark script that:
   - Simulates high-frequency telemetry data (20+ updates per second)
   - Measures frame rate during updates
   - Monitors CPU and memory usage

2. Run benchmarks before and after each optimization to measure improvements

### 2. User Experience Testing

1. Create test scenarios that simulate real racing conditions:
   - High-speed sections with rapid telemetry changes
   - Complex race situations with multiple competitors
   - Extended sessions (1+ hours) to test for memory leaks

2. Collect feedback on perceived performance and responsiveness

## Implementation Timeline

### Week 1: Analysis and Setup
- Perform detailed performance profiling of current dashboard
- Set up benchmarking infrastructure
- Identify specific bottlenecks in each component

### Week 2: React Component Optimization
- Implement memoization for expensive calculations
- Apply React.memo to pure components
- Optimize component rendering cycles

### Week 3: Data Processing Optimization
- Implement data throttling in WebSocketService
- Create WebWorkers for heavy computations
- Optimize data structures for efficient updates

### Week 4: Rendering and Memory Optimization
- Implement virtualized lists for long data
- Optimize canvas rendering for TrackMap
- Implement object pooling and proper cleanup

### Week 5: Testing and Refinement
- Run comprehensive performance benchmarks
- Conduct user experience testing
- Refine optimizations based on test results

## Conclusion

This performance optimization plan addresses the key areas that impact the PitBox Dashboard's responsiveness and efficiency when handling real-time telemetry data. By implementing these optimizations, we expect to achieve significant improvements in rendering performance, CPU usage, and overall user experience, particularly during high-frequency data updates.

The plan follows a systematic approach, targeting React component optimization, data processing, rendering efficiency, and memory management. Each optimization is designed to work together to create a smooth, responsive dashboard experience even under demanding racing conditions.
