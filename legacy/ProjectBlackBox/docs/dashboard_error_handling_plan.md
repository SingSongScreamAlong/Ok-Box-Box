# Dashboard Error Handling and Resilience Plan

This document outlines the implementation plan for enhancing error handling and resilience in the PitBox Dashboard, which is the second highest priority improvement identified in the next-phase improvements document.

## Current Error Handling Assessment

Based on our component validation, the dashboard handles standard operations well but may not gracefully manage all error scenarios, particularly:

1. WebSocket disconnections and reconnection attempts
2. Malformed or unexpected data formats
3. Component-level rendering errors
4. Network latency and timeout issues
5. Missing or incomplete data

## Enhancement Goals

1. Implement comprehensive error boundaries around all critical components
2. Add automatic reconnection logic with exponential backoff
3. Create graceful fallback UI states for all error scenarios
4. Add robust data validation before rendering
5. Implement user-friendly error notifications and recovery options

## Implementation Strategy

### 1. WebSocket Connection Resilience

#### 1.1 Implement Robust Reconnection Logic

**Files to modify:**
- `/dashboard/src/services/WebSocketService.ts`

**Implementation details:**
```typescript
// Enhanced WebSocketService.ts with reconnection logic
class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000; // 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  
  constructor(url: string) {
    this.url = url;
  }
  
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket is already connected or connecting');
      return;
    }
    
    this.connectionStatus = 'connecting';
    this.dispatchEvent('connection_status_change', { status: this.connectionStatus });
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen;
      this.socket.onclose = this.handleClose;
      this.socket.onerror = this.handleError;
      this.socket.onmessage = this.handleMessage;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleError(error);
    }
  }
  
  private handleOpen = (): void => {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.connectionStatus = 'connected';
    this.dispatchEvent('connect', {});
    this.dispatchEvent('connection_status_change', { status: this.connectionStatus });
  };
  
  private handleClose = (event: CloseEvent): void => {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.connectionStatus = 'disconnected';
    this.dispatchEvent('disconnect', { code: event.code, reason: event.reason });
    this.dispatchEvent('connection_status_change', { status: this.connectionStatus });
    
    this.attemptReconnect();
  };
  
  private handleError = (error: any): void => {
    console.error('WebSocket error:', error);
    this.dispatchEvent('error', { error });
    
    // Only attempt reconnect if not already connecting
    if (this.connectionStatus !== 'connecting') {
      this.connectionStatus = 'disconnected';
      this.dispatchEvent('connection_status_change', { status: this.connectionStatus });
      this.attemptReconnect();
    }
  };
  
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      this.dispatchEvent('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }
    
    // Exponential backoff with jitter
    const delay = Math.min(
      30000, // Max 30 seconds
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts) * (0.9 + Math.random() * 0.2)
    );
    
    console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds...`);
    this.dispatchEvent('reconnecting', { 
      attempt: this.reconnectAttempts + 1, 
      delay: delay,
      maxAttempts: this.maxReconnectAttempts
    });
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  // Existing event handling methods...
}
```

### 2. Component-Level Error Boundaries

#### 2.1 Create Error Boundary Component

**New files to create:**
- `/dashboard/src/components/common/ErrorBoundary.tsx`

**Implementation details:**
```typescript
// ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to monitoring service (to be implemented)
    this.logErrorToService(error, errorInfo);
  }
  
  private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // TODO: Implement error logging to a monitoring service
    // This could be a custom API endpoint or a third-party service like Sentry
  }
  
  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI if provided, otherwise render default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <h3>Something went wrong</h3>
          <p className="error-message">{this.state.error?.message}</p>
          <button onClick={this.resetErrorBoundary}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### 2.2 Apply Error Boundaries to All Critical Components

**Files to modify:**
- `/dashboard/src/components/Dashboard/Dashboard.tsx`
- All individual panel components

**Implementation details:**
```typescript
// Example in Dashboard.tsx
import React from 'react';
import ErrorBoundary from '../common/ErrorBoundary';
import Header from '../Header/Header';
import Telemetry from '../Telemetry/Telemetry';
// Other imports...

const Dashboard: React.FC = () => {
  const handleComponentError = (error: Error, errorInfo: React.ErrorInfo, componentName: string) => {
    console.error(`Error in ${componentName}:`, error, errorInfo);
    // Additional error handling logic
  };
  
  const renderFallbackUI = (componentName: string) => (
    <div className="panel-error">
      <h3>{componentName} is currently unavailable</h3>
      <p>We're working to resolve this issue. Other dashboard components will continue to function.</p>
      <button onClick={() => window.location.reload()}>Reload Dashboard</button>
    </div>
  );
  
  return (
    <div className="dashboard">
      <ErrorBoundary 
        componentName="Header"
        onError={(error, errorInfo) => handleComponentError(error, errorInfo, "Header")}
        fallback={renderFallbackUI("Header")}
      >
        <Header />
      </ErrorBoundary>
      
      <div className="dashboard-grid">
        <ErrorBoundary 
          componentName="Telemetry"
          onError={(error, errorInfo) => handleComponentError(error, errorInfo, "Telemetry")}
          fallback={renderFallbackUI("Telemetry")}
        >
          <Telemetry />
        </ErrorBoundary>
        
        {/* Apply to all other components... */}
      </div>
    </div>
  );
};

export default Dashboard;
```

### 3. Data Validation and Fallbacks

#### 3.1 Implement Data Validation Utilities

**New files to create:**
- `/dashboard/src/utils/dataValidation.ts`

**Implementation details:**
```typescript
// dataValidation.ts
import { TelemetryData, SessionInfo, CoachingInsight } from '../types';

/**
 * Validates telemetry data and returns a sanitized version
 */
export function validateTelemetryData(data: any): TelemetryData | null {
  if (!data) return null;
  
  // Create a valid telemetry object with defaults for missing values
  const validData: TelemetryData = {
    timestamp: data.timestamp || Date.now(),
    lap: typeof data.lap === 'number' ? data.lap : 0,
    position: typeof data.position === 'number' ? data.position : 0,
    speed: typeof data.speed === 'number' ? data.speed : 0,
    rpm: typeof data.rpm === 'number' ? data.rpm : 0,
    gear: typeof data.gear === 'number' ? data.gear : 0,
    throttle: typeof data.throttle === 'number' ? Math.max(0, Math.min(1, data.throttle)) : 0,
    brake: typeof data.brake === 'number' ? Math.max(0, Math.min(1, data.brake)) : 0,
    steering: typeof data.steering === 'number' ? Math.max(-1, Math.min(1, data.steering)) : 0,
    tire_temps: {
      FL: typeof data.tire_temps?.FL === 'number' ? data.tire_temps.FL : 0,
      FR: typeof data.tire_temps?.FR === 'number' ? data.tire_temps.FR : 0,
      RL: typeof data.tire_temps?.RL === 'number' ? data.tire_temps.RL : 0,
      RR: typeof data.tire_temps?.RR === 'number' ? data.tire_temps.RR : 0,
    },
    tire_wear: {
      FL: typeof data.tire_wear?.FL === 'number' ? Math.max(0, Math.min(1, data.tire_wear.FL)) : 1,
      FR: typeof data.tire_wear?.FR === 'number' ? Math.max(0, Math.min(1, data.tire_wear.FR)) : 1,
      RL: typeof data.tire_wear?.RL === 'number' ? Math.max(0, Math.min(1, data.tire_wear.RL)) : 1,
      RR: typeof data.tire_wear?.RR === 'number' ? Math.max(0, Math.min(1, data.tire_wear.RR)) : 1,
    },
    fuel: typeof data.fuel === 'number' ? Math.max(0, data.fuel) : 0,
    sector: typeof data.sector === 'number' ? data.sector : 0,
    corner: typeof data.corner === 'number' ? data.corner : 0,
    track_position: typeof data.track_position === 'number' ? Math.max(0, Math.min(1, data.track_position)) : 0,
  };
  
  return validData;
}

// Similar validation functions for other data types...
```

#### 3.2 Apply Data Validation in Components

**Files to modify:**
- All components that receive data from WebSocketService

**Implementation details:**
```typescript
// Example in Telemetry.tsx
import React, { useState, useEffect } from 'react';
import { webSocketService } from '../../services/WebSocketService';
import { validateTelemetryData } from '../../utils/dataValidation';
import { TelemetryData } from '../../types';

const Telemetry: React.FC = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleTelemetryUpdate = (data: any) => {
      try {
        const validatedData = validateTelemetryData(data);
        
        if (validatedData) {
          setTelemetryData(validatedData);
          setDataError(null);
        } else {
          setDataError('Invalid telemetry data received');
          console.error('Invalid telemetry data:', data);
        }
      } catch (error) {
        setDataError(`Error processing telemetry data: ${error.message}`);
        console.error('Error processing telemetry data:', error);
      }
    };
    
    const unsubscribe = webSocketService.on('telemetry', handleTelemetryUpdate);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Render with fallback states for errors
  if (dataError) {
    return (
      <div className="telemetry-panel">
        <div className="panel-header">Telemetry</div>
        <div className="panel-content error-state">
          <p className="error-message">{dataError}</p>
          <p>Waiting for valid telemetry data...</p>
        </div>
      </div>
    );
  }
  
  if (!telemetryData) {
    return (
      <div className="telemetry-panel">
        <div className="panel-header">Telemetry</div>
        <div className="panel-content loading-state">
          <p>Waiting for telemetry data...</p>
        </div>
      </div>
    );
  }
  
  // Normal rendering with valid data
  return (
    <div className="telemetry-panel">
      <div className="panel-header">Telemetry</div>
      <div className="panel-content">
        {/* Render telemetry components with validated data */}
      </div>
    </div>
  );
};

export default Telemetry;
```

### 4. User Notification System

#### 4.1 Create Notification Component

**New files to create:**
- `/dashboard/src/components/common/Notification.tsx`
- `/dashboard/src/components/common/NotificationManager.tsx`

**Implementation details:**
```typescript
// Notification.tsx
import React, { useEffect, useState } from 'react';
import './Notification.css';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationProps {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ 
  id, 
  type, 
  message, 
  duration = 5000, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(id), 300); // Allow time for exit animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);
  
  return (
    <div 
      className={`notification notification-${type} ${isVisible ? 'visible' : 'hidden'}`}
      role="alert"
    >
      <div className="notification-content">
        <span className="notification-icon">
          {type === 'info' && 'ℹ️'}
          {type === 'success' && '✅'}
          {type === 'warning' && '⚠️'}
          {type === 'error' && '❌'}
        </span>
        <span className="notification-message">{message}</span>
      </div>
      <button 
        className="notification-close" 
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(id), 300);
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Notification;
```

```typescript
// NotificationManager.tsx
import React, { useState, useCallback } from 'react';
import Notification, { NotificationType } from './Notification';
import './NotificationManager.css';

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const addNotification = useCallback((type: NotificationType, message: string, duration?: number) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setNotifications(prev => [...prev, { id, type, message, duration }]);
    
    return id;
  }, []);
  
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  const NotificationContainer: React.FC = () => (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
  
  return {
    addNotification,
    removeNotification,
    NotificationContainer
  };
};

export default function NotificationManager() {
  const { NotificationContainer } = useNotifications();
  return <NotificationContainer />;
}
```

#### 4.2 Integrate Notification System with WebSocketService

**Files to modify:**
- `/dashboard/src/App.tsx`
- `/dashboard/src/services/WebSocketService.ts`

**Implementation details:**
```typescript
// App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import { useNotifications } from './components/common/NotificationManager';
import { webSocketService } from './services/WebSocketService';
import './App.css';

const App: React.FC = () => {
  const { addNotification, NotificationContainer } = useNotifications();
  
  React.useEffect(() => {
    // Subscribe to WebSocket connection events
    const unsubscribeConnect = webSocketService.on('connect', () => {
      addNotification('success', 'Connected to telemetry server', 3000);
    });
    
    const unsubscribeDisconnect = webSocketService.on('disconnect', () => {
      addNotification('error', 'Disconnected from telemetry server', 0); // No auto-dismiss
    });
    
    const unsubscribeReconnecting = webSocketService.on('reconnecting', (data) => {
      addNotification(
        'warning', 
        `Attempting to reconnect (${data.attempt}/${data.maxAttempts})...`, 
        data.delay
      );
    });
    
    const unsubscribeReconnectFailed = webSocketService.on('reconnect_failed', () => {
      addNotification(
        'error', 
        'Failed to reconnect after multiple attempts. Please check your connection and refresh the page.', 
        0 // No auto-dismiss
      );
    });
    
    const unsubscribeError = webSocketService.on('error', (data) => {
      addNotification('error', `Connection error: ${data.error.message || 'Unknown error'}`, 0);
    });
    
    // Connect to WebSocket server
    webSocketService.connect();
    
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeReconnecting();
      unsubscribeReconnectFailed();
      unsubscribeError();
    };
  }, [addNotification]);
  
  return (
    <Router>
      <div className="app">
        <Switch>
          <Route path="/" exact component={Dashboard} />
          {/* Other routes... */}
        </Switch>
        <NotificationContainer />
      </div>
    </Router>
  );
};

export default App;
```

### 5. Global Error Handler

#### 5.1 Implement Global Error Handler

**New files to create:**
- `/dashboard/src/utils/errorHandler.ts`

**Implementation details:**
```typescript
// errorHandler.ts
let globalErrorHandler: ((error: Error, info?: any) => void) | null = null;

export function setGlobalErrorHandler(handler: (error: Error, info?: any) => void): void {
  globalErrorHandler = handler;
}

export function handleError(error: Error, info?: any): void {
  console.error('Error caught by global handler:', error, info);
  
  if (globalErrorHandler) {
    try {
      globalErrorHandler(error, info);
    } catch (handlerError) {
      console.error('Error in global error handler:', handlerError);
    }
  }
}

// Set up window error handlers
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    handleError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    // Don't prevent default to allow browser's default error handling
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    handleError(error, { unhandledRejection: true });
  });
}
```

#### 5.2 Integrate Global Error Handler

**Files to modify:**
- `/dashboard/src/index.tsx`

**Implementation details:**
```typescript
// index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { setupGlobalErrorHandlers, setGlobalErrorHandler } from './utils/errorHandler';
import './index.css';

// Set up global error handlers
setupGlobalErrorHandlers();

// Initialize the app
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Set global error handler after App is mounted
// This allows us to use the notification system
setTimeout(() => {
  const appInstance = document.getElementById('root')?.firstChild;
  
  if (appInstance) {
    // Access the notification system through the app's context or a global method
    // This is a simplified example - actual implementation would depend on how notifications are exposed
    const addNotification = (window as any).__addNotification;
    
    if (addNotification) {
      setGlobalErrorHandler((error) => {
        addNotification('error', `Unexpected error: ${error.message}`, 0);
      });
    }
  }
}, 0);
```

## Testing and Validation

### 1. Error Simulation Testing

1. Create a test suite that simulates various error conditions:
   - WebSocket disconnections
   - Malformed data
   - Component rendering errors
   - Network timeouts
   - Server errors

2. Verify that each error is handled gracefully with appropriate user feedback

### 2. Resilience Testing

1. Test the system's ability to recover from errors:
   - Automatic reconnection after disconnection
   - Component recovery after errors
   - Data validation and fallback behavior

2. Measure recovery time and success rate for different error scenarios

## Implementation Timeline

### Week 1: WebSocket Connection Resilience
- Enhance WebSocketService with robust reconnection logic
- Implement connection status tracking and notifications
- Test reconnection behavior with simulated disconnections

### Week 2: Component-Level Error Boundaries
- Create ErrorBoundary component
- Apply error boundaries to all critical components
- Implement fallback UI for component errors

### Week 3: Data Validation and Fallbacks
- Implement data validation utilities
- Apply data validation in all components
- Create fallback states for invalid or missing data

### Week 4: User Notification System
- Create Notification and NotificationManager components
- Integrate notification system with WebSocketService
- Implement user-friendly error messages

### Week 5: Global Error Handler and Testing
- Implement global error handler
- Integrate error handler with notification system
- Conduct comprehensive error simulation and resilience testing

## Conclusion

This error handling and resilience plan addresses key vulnerabilities in the PitBox Dashboard's error management capabilities. By implementing comprehensive error boundaries, robust reconnection logic, data validation, user notifications, and global error handling, we will significantly improve the dashboard's ability to handle and recover from various error conditions.

The plan follows a systematic approach, addressing errors at multiple levels: connection, component, data, user interface, and global. Each enhancement is designed to work together to create a more resilient and user-friendly dashboard experience, even when facing unexpected issues or edge cases.
