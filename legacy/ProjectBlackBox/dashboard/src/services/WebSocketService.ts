import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { throttle } from 'lodash';
import websocketMessageValidator from '../utils/validation/websocketMessageValidator';
import { TeamMessage, TeamMessageUtils } from '../types/TeamMessage';

// Data interfaces
export interface TelemetryData {
  // Driver identification for multi-driver support
  driverId?: string;
  driverName?: string;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  clutch: number;
  steering: number;
  fuel: {
    level: number;
    usagePerHour: number;
  };
  tires: {
    frontLeft: { temp: number; wear: number; pressure: number };
    frontRight: { temp: number; wear: number; pressure: number };
    rearLeft: { temp: number; wear: number; pressure: number };
    rearRight: { temp: number; wear: number; pressure: number };
  };
  position: { x: number; y: number; z: number };
  lap: number;
  sector: number;
  lapTime: number;
  sectorTime: number;
  bestLapTime: number;
  deltaToBestLap: number;
  bestSectorTimes: number[];
  gForce: { lateral: number; longitudinal: number; vertical: number };
  trackPosition: number;
  racePosition: number;
  gapAhead: number;
  gapBehind: number;
  // Advanced Telemetry (Phase 2)
  flags: number; // Session flags bitmask
  drsStatus: number; // DRS status
  carSettings: {
    brakeBias: number;
    abs: number;
    tractionControl: number;
    tractionControl2: number;
    fuelMixture: number;
  };
  energy: {
    batteryPct: number;
    deployPct: number;
    deployMode: number;
  };
  weather: {
    windSpeed: number;
    windDirection: number;
  };
  timestamp: number;
}

export interface DriverProfile {
  id: string;
  name: string;
  team: string;
  role: 'primary' | 'secondary' | 'reserve';
  status: 'active' | 'standby' | 'offline';
  avatar?: string;
  preferences?: {
    displayUnits: 'metric' | 'imperial';
    telemetryHighlights: string[];
    uiTheme: 'default' | 'high-contrast' | 'custom';
    customColors?: Record<string, string>;
  };
  stats?: {
    totalLaps: number;
    bestLap: number;
    consistencyRating: number;
    lastActive: number; // timestamp
  };
}

export interface SessionInfo {
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

export interface CoachingInsight {
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  title: string;
  description: string;
  impact: string;
  location?: string;
  category?: string;
}

export interface DriverSkillAnalysis {
  strengths: Array<{ skill: string; rating: number }>;
  focusAreas: Array<{ skill: string; rating: number }>;
  overallRating: number;
}

export interface CompetitorData {
  position: number;
  driver: string;
  gap: string;
  lastLap: string;
}

export interface StrategyData {
  pitWindow: string;
  optimalPit: string;
  tireStrategy: string;
  fuelStrategy: string;
  paceTarget: string;
  positionPrediction: string;
  undercutRisk: string;
  tireLife: number;
}

// Multi-driver event interfaces
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
  message: TeamMessage;
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

// Define a proper EventMap type for type safety
type EventMap = {
  'connect': void;
  'disconnect': void;
  'telemetry': TelemetryData;
  'session_info': SessionInfo;
  'coaching': CoachingInsight[];
  'skill_analysis': DriverSkillAnalysis;
  'competitor_data': CompetitorData[];
  'strategy_data': StrategyData;
  'validation_summary': any;
  'request_validation': { component: string };
  'track_position': any;
  'video_data': any;
  'driver_update': DriverUpdateEvent;
  'driver_list': DriverListEvent;
  'handoff_request': HandoffRequestEvent;
  'handoff_response': HandoffResponseEvent;
  'switch_driver': SwitchDriverEvent;
  'team_message': TeamMessageEvent;
  'request_comparison': RequestComparisonEvent;
  'comparison_result': ComparisonResultEvent;
  [key: string]: any;
};

// Define callback type
type EventCallback<T> = (data: T) => void;

// Connection types supported by the service
export enum ConnectionType {
  SOCKET_IO = 'socket_io',
  NATIVE_WEBSOCKET = 'native_websocket'
}

// Main WebSocketService class
/**
 * WebSocketService
 * 
 * A service for managing WebSocket connections to both Socket.IO and native WebSocket servers.
 * Provides typed event handling for telemetry, session info, coaching insights, and other data.
 * Supports multi-driver functionality and validation of incoming/outgoing messages.
 */
class WebSocketService {
  private socket: Socket | null = null;
  private nativeWs: WebSocket | null = null;
  private connectionType: ConnectionType = ConnectionType.SOCKET_IO;
  private isConnected: boolean = false;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // ms

  // Throttling configuration
  public telemetryThrottleMs: number = 100; // Default throttle rate for high-frequency events
  public throttledCallbacks: Record<string, Record<string, any>> = {}; // Store throttled callbacks

  // Callback storage for different event types
  private connectCallbacks: Array<EventCallback<void>> = [];
  private disconnectCallbacks: Array<EventCallback<void>> = [];
  private telemetryCallbacks: Array<EventCallback<TelemetryData>> = [];
  private sessionInfoCallbacks: Array<EventCallback<SessionInfo>> = [];
  private coachingCallbacks: Array<EventCallback<CoachingInsight[]>> = [];
  private skillAnalysisCallbacks: Array<EventCallback<DriverSkillAnalysis>> = [];
  private competitorDataCallbacks: Array<EventCallback<CompetitorData[]>> = [];
  private strategyDataCallbacks: Array<EventCallback<StrategyData>> = [];
  private validationSummaryCallbacks: Array<EventCallback<any>> = [];
  private trackPositionCallbacks: Array<EventCallback<any>> = [];
  private videoDataCallbacks: Array<EventCallback<any>> = [];

  // Multi-driver event callbacks
  private driverUpdateCallbacks: Array<EventCallback<DriverUpdateEvent>> = [];
  private driverListCallbacks: Array<EventCallback<DriverListEvent>> = [];
  private handoffRequestCallbacks: Array<EventCallback<HandoffRequestEvent>> = [];
  private handoffResponseCallbacks: Array<EventCallback<HandoffResponseEvent>> = [];
  private switchDriverCallbacks: Array<EventCallback<SwitchDriverEvent>> = [];
  private teamMessageCallbacks: Array<EventCallback<TeamMessageEvent>> = [];
  private requestComparisonCallbacks: Array<EventCallback<RequestComparisonEvent>> = [];
  private comparisonResultCallbacks: Array<EventCallback<ComparisonResultEvent>> = [];

  // Custom event callbacks
  private customEventCallbacks: Record<string, Array<EventCallback<any>>> = {};

  // Connection methods
  connect(url: string = 'http://localhost:3000', type: ConnectionType = ConnectionType.SOCKET_IO): void {
    this.url = url;
    this.connectionType = type;
    this.reconnectAttempts = 0;

    if (type === ConnectionType.SOCKET_IO) {
      this.connectSocketIO(url);
    } else {
      this.connectNativeWebSocket(url);
    }
  }

  private connectSocketIO(url: string): void {
    console.log(`Connecting to Socket.IO server at ${url}`);

    try {
      this.socket = io(url, {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        transports: ['polling', 'websocket']
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO connected');
        this.isConnected = true;
        this.triggerCallbacks(this.connectCallbacks);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        this.isConnected = false;
        this.triggerCallbacks(this.disconnectCallbacks);
      });

      this.socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
      });

      // Set up event handlers for all supported event types
      this.setupSocketIOEventHandlers();
    } catch (error) {
      console.error('Error connecting to Socket.IO server:', error);
    }
  }

  private connectNativeWebSocket(url: string): void {
    console.log(`Connecting to native WebSocket server at ${url}`);

    try {
      // Ensure the URL uses the WebSocket protocol
      const wsUrl = url.replace(/^http/, 'ws');
      this.nativeWs = new WebSocket(wsUrl);

      this.nativeWs.onopen = () => {
        console.log('Native WebSocket connected');
        this.isConnected = true;
        this.triggerCallbacks(this.connectCallbacks);
      };

      this.nativeWs.onclose = () => {
        console.log('Native WebSocket disconnected');
        this.isConnected = false;
        this.triggerCallbacks(this.disconnectCallbacks);

        // Attempt to reconnect if needed
        this.attemptReconnect();
      };

      this.nativeWs.onerror = (error) => {
        console.error('Native WebSocket error:', error);
      };

      this.nativeWs.onmessage = (event) => {
        this.handleNativeWebSocketMessage(event);
      };
    } catch (error) {
      console.error('Error connecting to native WebSocket server:', error);
    }
  }

  private setupSocketIOEventHandlers(): void {
    if (!this.socket) return;

    // Set up handlers for all event types
    this.socket.on('telemetry_update', (data) => this.handleSocketIOMessage('telemetry', data));
    this.socket.on('session_info', (data) => this.handleSocketIOMessage('session_info', data));
    this.socket.on('coaching', (data) => this.handleSocketIOMessage('coaching', data));
    this.socket.on('skill_analysis', (data) => this.handleSocketIOMessage('skill_analysis', data));
    this.socket.on('competitor_data', (data) => this.handleSocketIOMessage('competitor_data', data));
    this.socket.on('strategy_data', (data) => this.handleSocketIOMessage('strategy_data', data));
    this.socket.on('validation_summary', (data) => this.handleSocketIOMessage('validation_summary', data));
    this.socket.on('track_position', (data) => this.handleSocketIOMessage('track_position', data));
    this.socket.on('video_data', (data) => this.handleSocketIOMessage('video_data', data));

    // Multi-driver events
    this.socket.on('driver_update', (data) => this.handleSocketIOMessage('driver_update', data));
    this.socket.on('driver_list', (data) => this.handleSocketIOMessage('driver_list', data));
    this.socket.on('handoff_request', (data) => this.handleSocketIOMessage('handoff_request', data));
    this.socket.on('handoff_response', (data) => this.handleSocketIOMessage('handoff_response', data));
    this.socket.on('switch_driver', (data) => this.handleSocketIOMessage('switch_driver', data));
    this.socket.on('team_message', (data) => this.handleSocketIOMessage('team_message', data));
    this.socket.on('request_comparison', (data) => this.handleSocketIOMessage('request_comparison', data));
    this.socket.on('comparison_result', (data) => this.handleSocketIOMessage('comparison_result', data));
  }

  private handleSocketIOMessage(eventType: string, data: any): void {
    try {
      // For certain message types (video_data, telemetry, config), bypass strict validation
      // as these may contain binary data or complex structures that don't need validation
      if (['video_data', 'telemetry', 'config'].includes(eventType)) {
        this.triggerEvent(eventType as keyof EventMap, data);
        return;
      }

      // For other messages, validate the data structure
      const validationResult = websocketMessageValidator.validateIncomingMessage(eventType, data);

      if (validationResult[0]) { // success is first element in tuple
        this.triggerEvent(eventType as keyof EventMap, data);
      } else {
        console.warn(`Invalid ${eventType} message:`, validationResult[1]); // error is second element
        console.warn('Message data:', data);
      }
    } catch (error) {
      console.error(`Error handling ${eventType} message:`, error);
      console.error('Message data:', data);
    }
  }

  private handleNativeWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;

      if (!type) {
        console.warn('Received WebSocket message without type:', message);
        return;
      }

      // For certain message types (video_data, telemetry, config), bypass strict validation
      if (['video_data', 'telemetry', 'config'].includes(type)) {
        this.triggerEvent(type as keyof EventMap, data);
        return;
      }

      // For other messages, validate the data structure
      const validationResult = websocketMessageValidator.validateIncomingMessage(type, data);

      if (validationResult[0]) { // success is first element in tuple
        this.triggerEvent(type as keyof EventMap, data);
      } else {
        console.warn(`Invalid ${type} message:`, validationResult[1]); // error is second element
        console.warn('Message data:', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      console.error('Raw message:', event.data);
    }
  }

  // Helper method to trigger callbacks for an event type
  private triggerCallbacks<T>(callbacks: Array<EventCallback<T>>, data?: T): void {
    callbacks.forEach(callback => {
      try {
        callback(data as T);
      } catch (error) {
        console.error('Error in callback:', error);
      }
    });
  }

  // Trigger an event based on its type
  private triggerEvent<K extends keyof EventMap>(eventType: K, data: EventMap[K]): void {
    switch (eventType) {
      case 'telemetry':
        // Use throttled callbacks for telemetry data
        if (this.throttledCallbacks['telemetry']) {
          this.telemetryCallbacks.forEach(callback => {
            const callbackKey = callback.toString();
            const throttledCallback = this.throttledCallbacks['telemetry'][callbackKey];
            if (throttledCallback) {
              throttledCallback(data as TelemetryData);
            } else {
              // Fallback to regular callback if throttled version not found
              callback(data as TelemetryData);
            }
          });
        } else {
          // Fallback to regular callbacks if no throttled callbacks exist
          this.triggerCallbacks(this.telemetryCallbacks, data as TelemetryData);
        }
        break;
      case 'session_info':
        this.triggerCallbacks(this.sessionInfoCallbacks, data as SessionInfo);
        break;
      case 'coaching':
        this.triggerCallbacks(this.coachingCallbacks, data as CoachingInsight[]);
        break;
      case 'skill_analysis':
        this.triggerCallbacks(this.skillAnalysisCallbacks, data as DriverSkillAnalysis);
        break;
      case 'competitor_data':
        // Use throttled callbacks for competitor data
        if (this.throttledCallbacks['competitor_data']) {
          this.competitorDataCallbacks.forEach(callback => {
            const callbackKey = callback.toString();
            const throttledCallback = this.throttledCallbacks['competitor_data'][callbackKey];
            if (throttledCallback) {
              throttledCallback(data as CompetitorData[]);
            } else {
              // Fallback to regular callback if throttled version not found
              callback(data as CompetitorData[]);
            }
          });
        } else {
          // Fallback to regular callbacks if no throttled callbacks exist
          this.triggerCallbacks(this.competitorDataCallbacks, data as CompetitorData[]);
        }
        break;
      case 'strategy_data':
        this.triggerCallbacks(this.strategyDataCallbacks, data as StrategyData);
        break;
      case 'validation_summary':
        this.triggerCallbacks(this.validationSummaryCallbacks, data);
        break;
      case 'track_position':
        this.triggerCallbacks(this.trackPositionCallbacks, data);
        break;
      case 'video_data':
        this.triggerCallbacks(this.videoDataCallbacks, data);
        break;
      case 'driver_update':
        this.triggerCallbacks(this.driverUpdateCallbacks, data as DriverUpdateEvent);
        break;
      case 'driver_list':
        this.triggerCallbacks(this.driverListCallbacks, data as DriverListEvent);
        break;
      case 'handoff_request':
        this.triggerCallbacks(this.handoffRequestCallbacks, data as HandoffRequestEvent);
        break;
      case 'handoff_response':
        this.triggerCallbacks(this.handoffResponseCallbacks, data as HandoffResponseEvent);
        break;
      case 'switch_driver':
        this.triggerCallbacks(this.switchDriverCallbacks, data as SwitchDriverEvent);
        break;
      case 'team_message':
        this.triggerCallbacks(this.teamMessageCallbacks, data as TeamMessageEvent);
        break;
      case 'request_comparison':
        this.triggerCallbacks(this.requestComparisonCallbacks, data as RequestComparisonEvent);
        break;
      case 'comparison_result':
        this.triggerCallbacks(this.comparisonResultCallbacks, data as ComparisonResultEvent);
        break;
      default:
        // Handle custom events
        if (this.customEventCallbacks[eventType as string]) {
          this.triggerCallbacks(this.customEventCallbacks[eventType as string], data);
        }
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.isConnected) return;

      console.log(`Reconnecting to ${this.url}...`);
      this.connect(this.url, this.connectionType);
    }, delay);
  }

  disconnect(): void {
    if (this.connectionType === ConnectionType.SOCKET_IO && this.socket) {
      this.socket.disconnect();
      this.socket = null;
    } else if (this.connectionType === ConnectionType.NATIVE_WEBSOCKET && this.nativeWs) {
      this.nativeWs.close();
      this.nativeWs = null;
    }

    this.isConnected = false;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }

  getUrl(): string {
    return this.url;
  }

  // Generic event registration with proper typing
  on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): { unsubscribe: () => void } {
    // For high-frequency events that need throttling
    // const needsThrottling = event === 'telemetry' || event === 'competitor_data';
    // Throttling is handled in specific event handlers

    switch (event) {
      case 'connect':
        this.connectCallbacks.push(callback as EventCallback<void>);
        return {
          unsubscribe: () => {
            this.connectCallbacks = this.connectCallbacks.filter(cb => cb !== callback as EventCallback<void>);
          }
        };
      case 'disconnect':
        this.disconnectCallbacks.push(callback as EventCallback<void>);
        return {
          unsubscribe: () => {
            this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback as EventCallback<void>);
          }
        };
      case 'telemetry':
        this.telemetryCallbacks.push(callback as EventCallback<TelemetryData>);

        // Create and store throttled version of the callback
        if (!this.throttledCallbacks['telemetry']) {
          this.throttledCallbacks['telemetry'] = {};
        }

        // Use callback's toString as a unique key - ensure it's consistent with test expectations
        const telemetryCallbackKey = callback.toString();
        const telemetryThrottledCallback = throttle(
          callback as EventCallback<TelemetryData>,
          this.telemetryThrottleMs
        );
        this.throttledCallbacks['telemetry'][telemetryCallbackKey] = telemetryThrottledCallback;

        return {
          unsubscribe: () => {
            this.telemetryCallbacks = this.telemetryCallbacks.filter(cb => cb !== callback as EventCallback<TelemetryData>);

            // Clean up throttled callback
            if (this.throttledCallbacks['telemetry']) {
              // Delete all throttled callbacks for this event type
              delete this.throttledCallbacks['telemetry'][telemetryCallbackKey];

              // If this was the last throttled callback, clean up the object
              if (Object.keys(this.throttledCallbacks['telemetry']).length === 0) {
                delete this.throttledCallbacks['telemetry'];
              }
            }
          }
        };
      case 'session_info':
        this.sessionInfoCallbacks.push(callback as EventCallback<SessionInfo>);
        return {
          unsubscribe: () => {
            this.sessionInfoCallbacks = this.sessionInfoCallbacks.filter(cb => cb !== callback as EventCallback<SessionInfo>);
          }
        };
      case 'coaching':
        this.coachingCallbacks.push(callback as EventCallback<CoachingInsight[]>);
        return {
          unsubscribe: () => {
            this.coachingCallbacks = this.coachingCallbacks.filter(cb => cb !== callback as EventCallback<CoachingInsight[]>);
          }
        };
      case 'skill_analysis':
        this.skillAnalysisCallbacks.push(callback as EventCallback<DriverSkillAnalysis>);
        return {
          unsubscribe: () => {
            this.skillAnalysisCallbacks = this.skillAnalysisCallbacks.filter(cb => cb !== callback as EventCallback<DriverSkillAnalysis>);
          }
        };
      case 'competitor_data':
        this.competitorDataCallbacks.push(callback as EventCallback<CompetitorData[]>);

        // Create and store throttled version of the callback
        if (!this.throttledCallbacks['competitor_data']) {
          this.throttledCallbacks['competitor_data'] = {};
        }

        // Use callback's toString as a unique key - ensure it's consistent with test expectations
        const competitorDataCallbackKey = callback.toString();
        const competitorDataThrottledCallback = throttle(
          callback as EventCallback<CompetitorData[]>,
          this.telemetryThrottleMs
        );
        this.throttledCallbacks['competitor_data'][competitorDataCallbackKey] = competitorDataThrottledCallback;

        return {
          unsubscribe: () => {
            this.competitorDataCallbacks = this.competitorDataCallbacks.filter(cb => cb !== callback as EventCallback<CompetitorData[]>);

            // Clean up throttled callback
            if (this.throttledCallbacks['competitor_data']) {
              // Delete all throttled callbacks for this event type
              delete this.throttledCallbacks['competitor_data'][competitorDataCallbackKey];

              // If this was the last throttled callback, clean up the object
              if (Object.keys(this.throttledCallbacks['competitor_data']).length === 0) {
                delete this.throttledCallbacks['competitor_data'];
              }
            }
          }
        };
      case 'strategy_data':
        this.strategyDataCallbacks.push(callback as EventCallback<StrategyData>);
        return {
          unsubscribe: () => {
            this.strategyDataCallbacks = this.strategyDataCallbacks.filter(cb => cb !== callback as EventCallback<StrategyData>);
          }
        };
      case 'validation_summary':
        this.validationSummaryCallbacks.push(callback as EventCallback<any>);
        return {
          unsubscribe: () => {
            this.validationSummaryCallbacks = this.validationSummaryCallbacks.filter(cb => cb !== callback as EventCallback<any>);
          }
        };
      case 'track_position':
        this.trackPositionCallbacks.push(callback as EventCallback<any>);
        return {
          unsubscribe: () => {
            this.trackPositionCallbacks = this.trackPositionCallbacks.filter(cb => cb !== callback as EventCallback<any>);
          }
        };
      case 'video_data':
        this.videoDataCallbacks.push(callback as EventCallback<any>);
        return {
          unsubscribe: () => {
            this.videoDataCallbacks = this.videoDataCallbacks.filter(cb => cb !== callback as EventCallback<any>);
          }
        };
      case 'driver_update':
        this.driverUpdateCallbacks.push(callback as EventCallback<DriverUpdateEvent>);
        return {
          unsubscribe: () => {
            this.driverUpdateCallbacks = this.driverUpdateCallbacks.filter(cb => cb !== callback as EventCallback<DriverUpdateEvent>);
          }
        };
      case 'driver_list':
        this.driverListCallbacks.push(callback as EventCallback<DriverListEvent>);
        return {
          unsubscribe: () => {
            this.driverListCallbacks = this.driverListCallbacks.filter(cb => cb !== callback as EventCallback<DriverListEvent>);
          }
        };
      case 'handoff_request':
        this.handoffRequestCallbacks.push(callback as EventCallback<HandoffRequestEvent>);
        return {
          unsubscribe: () => {
            this.handoffRequestCallbacks = this.handoffRequestCallbacks.filter(cb => cb !== callback as EventCallback<HandoffRequestEvent>);
          }
        };
      case 'handoff_response':
        this.handoffResponseCallbacks.push(callback as EventCallback<HandoffResponseEvent>);
        return {
          unsubscribe: () => {
            this.handoffResponseCallbacks = this.handoffResponseCallbacks.filter(cb => cb !== callback as EventCallback<HandoffResponseEvent>);
          }
        };
      case 'switch_driver':
        this.switchDriverCallbacks.push(callback as EventCallback<SwitchDriverEvent>);
        return {
          unsubscribe: () => {
            this.switchDriverCallbacks = this.switchDriverCallbacks.filter(cb => cb !== callback as EventCallback<SwitchDriverEvent>);
          }
        };
      case 'team_message':
        this.teamMessageCallbacks.push(callback as EventCallback<TeamMessageEvent>);
        return {
          unsubscribe: () => {
            this.teamMessageCallbacks = this.teamMessageCallbacks.filter(cb => cb !== callback as EventCallback<TeamMessageEvent>);
          }
        };
      case 'request_comparison':
        this.requestComparisonCallbacks.push(callback as EventCallback<RequestComparisonEvent>);
        return {
          unsubscribe: () => {
            this.requestComparisonCallbacks = this.requestComparisonCallbacks.filter(cb => cb !== callback as EventCallback<RequestComparisonEvent>);
          }
        };
      case 'comparison_result':
        this.comparisonResultCallbacks.push(callback as EventCallback<ComparisonResultEvent>);
        return {
          unsubscribe: () => {
            this.comparisonResultCallbacks = this.comparisonResultCallbacks.filter(cb => cb !== callback as EventCallback<ComparisonResultEvent>);
          }
        };
      default:
        // Handle custom events
        if (!this.customEventCallbacks[event as string]) {
          this.customEventCallbacks[event as string] = [];
        }
        this.customEventCallbacks[event as string].push(callback);
        return {
          unsubscribe: () => {
            if (this.customEventCallbacks[event as string]) {
              this.customEventCallbacks[event as string] = this.customEventCallbacks[event as string].filter(cb => cb !== callback);
            }
          }
        };
    }
  }

  // Convenience methods for common event types
  onConnect(callback: EventCallback<void>): { unsubscribe: () => void } {
    return this.on('connect', callback);
  }

  onDisconnect(callback: EventCallback<void>): { unsubscribe: () => void } {
    return this.on('disconnect', callback);
  }

  onTelemetry(callback: EventCallback<TelemetryData>): { unsubscribe: () => void } {
    return this.on('telemetry', callback);
  }

  onSessionInfo(callback: EventCallback<SessionInfo>): { unsubscribe: () => void } {
    return this.on('session_info', callback);
  }

  onCoaching(callback: EventCallback<CoachingInsight[]>): { unsubscribe: () => void } {
    return this.on('coaching', callback);
  }

  onSkillAnalysis(callback: EventCallback<DriverSkillAnalysis>): { unsubscribe: () => void } {
    return this.on('skill_analysis', callback);
  }

  onCompetitorData(callback: EventCallback<CompetitorData[]>): { unsubscribe: () => void } {
    return this.on('competitor_data', callback);
  }

  onStrategyData(callback: EventCallback<StrategyData>): { unsubscribe: () => void } {
    return this.on('strategy_data', callback);
  }

  onValidationSummary(callback: EventCallback<any>): { unsubscribe: () => void } {
    return this.on('validation_summary', callback);
  }

  onTrackPosition(callback: EventCallback<any>): { unsubscribe: () => void } {
    return this.on('track_position', callback);
  }

  onVideoData(callback: EventCallback<any>): { unsubscribe: () => void } {
    return this.on('video_data', callback);
  }

  // Multi-driver event handlers
  onDriverUpdate(callback: EventCallback<DriverUpdateEvent>): { unsubscribe: () => void } {
    return this.on('driver_update', callback);
  }

  onDriverList(callback: EventCallback<DriverListEvent>): { unsubscribe: () => void } {
    return this.on('driver_list', callback);
  }

  onHandoffRequest(callback: EventCallback<HandoffRequestEvent>): { unsubscribe: () => void } {
    return this.on('handoff_request', callback);
  }

  onHandoffResponse(callback: EventCallback<HandoffResponseEvent>): { unsubscribe: () => void } {
    return this.on('handoff_response', callback);
  }

  onSwitchDriver(callback: EventCallback<SwitchDriverEvent>): { unsubscribe: () => void } {
    return this.on('switch_driver', callback);
  }

  onTeamMessage(callback: EventCallback<TeamMessageEvent>): { unsubscribe: () => void } {
    return this.on('team_message', callback);
  }

  onRequestComparison(callback: EventCallback<RequestComparisonEvent>): { unsubscribe: () => void } {
    return this.on('request_comparison', callback);
  }

  onComparisonResult(callback: EventCallback<ComparisonResultEvent>): { unsubscribe: () => void } {
    return this.on('comparison_result', callback);
  }

  // Message sending methods

  /**
   * Send a message to the connected WebSocket server
   * @param eventType The type of event to send
   * @param data The data to send
   * @returns True if the message was sent successfully, false otherwise
   */
  sendMessage<K extends keyof EventMap>(eventType: K, data: EventMap[K]): boolean {
    if (!this.isConnected) {
      console.warn('Cannot send message: Not connected to server');
      return false;
    }

    try {
      // Validate outgoing message if it's not a special type
      if (!['video_data', 'telemetry', 'config'].includes(eventType as string)) {
        const validationResult = websocketMessageValidator.validateOutgoingMessage(eventType as string, data);
        if (!validationResult[0]) {
          console.warn(`Invalid outgoing ${eventType} message:`, validationResult[1]);
          console.warn('Message data:', data);
          return false;
        }
      }

      if (this.connectionType === ConnectionType.SOCKET_IO && this.socket) {
        this.socket.emit(eventType as string, data);
        return true;
      } else if (this.connectionType === ConnectionType.NATIVE_WEBSOCKET && this.nativeWs) {
        const message = JSON.stringify({ type: eventType, data });
        this.nativeWs.send(message);
        return true;
      }
    } catch (error) {
      console.error(`Error sending ${eventType} message:`, error);
      console.error('Message data:', data);
    }

    return false;
  }

  /**
   * Request driver list from the server
   * @returns True if the request was sent successfully, false otherwise
   */
  requestDriverList(): boolean {
    return this.sendMessage('request_comparison', { requestType: 'driver_list' } as any);
  }

  /**
   * Request validation for a specific dashboard component
   * @param component Component key to validate (e.g., 'telemetry', 'driver_selector')
   */
  requestValidation(component: string): boolean {
    return this.sendMessage('request_validation', { component });
  }

  /**
   * Request driver comparison data from the server
   * @param driverAId ID of the first driver to compare
   * @param driverBId ID of the second driver to compare
   * @returns True if the request was sent successfully, false otherwise
   */
  requestDriverComparison(driverAId: string, driverBId: string): boolean {
    const comparisonId = uuidv4();
    return this.sendMessage('request_comparison', { driverAId, driverBId, comparisonId } as RequestComparisonEvent);
  }

  /**
   * Send a team message to all connected clients
   * @param content Message content
   * @param priority Message priority
   * @param senderId ID of the sender
   * @param senderName Name of the sender
   * @returns True if the message was sent successfully, false otherwise
   */
  sendTeamMessage(content: string, priority: 'normal' | 'critical' = 'normal', senderId: string = 'system', senderName: string = 'System'): boolean {
    // Create a TeamMessage object using the unified interface
    const teamMessage: TeamMessage = {
      id: uuidv4(),
      senderId,
      senderName,
      content,
      priority: priority === 'critical' ? 'critical' : 'normal',
      read: false,
      timestamp: Date.now()
    };

    // Normalize the timestamp to ensure both formats are populated
    const normalizedMessage = TeamMessageUtils.normalizeTimestamp(teamMessage);

    const message = {
      message: normalizedMessage
    } as TeamMessageEvent;

    return this.sendMessage('team_message', message);
  }

  /**
   * Request a driver handoff
   * @param fromDriverId ID of the current driver
   * @param toDriverId ID of the driver to hand off to
   * @param notes Handoff notes
   * @returns True if the request was sent successfully, false otherwise
   */
  requestHandoff(fromDriverId: string, toDriverId: string, notes: string = ''): boolean {
    const handoffRequest = {
      handoff: {
        id: uuidv4(),
        fromDriverId,
        toDriverId,
        notes,
        timestamp: Date.now(),
        status: 'pending'
      }
    } as HandoffRequestEvent;

    return this.sendMessage('handoff_request', handoffRequest);
  }

  /**
   * Respond to a handoff request
   * @param handoffId ID of the handoff request
   * @param status Status of the handoff response
   * @returns True if the response was sent successfully, false otherwise
   */
  respondToHandoff(handoffId: string, status: 'confirmed' | 'cancelled' | 'completed'): boolean {
    const handoffResponse = {
      handoffId,
      status
    } as HandoffResponseEvent;

    return this.sendMessage('handoff_response', handoffResponse);
  }

  /**
   * Request to switch the active driver
   * @param driverId ID of the driver to switch to
   * @returns True if the request was sent successfully, false otherwise
   */
  switchDriver(driverId: string): boolean {
    return this.sendMessage('switch_driver', { driverId } as SwitchDriverEvent);
  }

  /**
   * Join a specific session room
   * @param sessionId ID of the session to join
   * @returns True if the message was sent successfully
   */
  joinSession(sessionId: string): boolean {
    // The server expects just the string ID for 'join_session' event
    // We cast to any because EventMap doesn't strictly define join_session payload
    return this.sendMessage('join_session', sessionId as any);
  }

  /**
   * Remove a specific event listener callback
   * @param event Event type to remove listener from
   * @param callback Callback function to remove
   */
  off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    switch (event) {
      case 'connect':
        this.connectCallbacks = this.connectCallbacks.filter(cb => cb !== callback as EventCallback<void>);
        break;
      case 'disconnect':
        this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback as EventCallback<void>);
        break;
      case 'telemetry':
        this.telemetryCallbacks = this.telemetryCallbacks.filter(cb => cb !== callback as EventCallback<TelemetryData>);
        break;
      case 'session_info':
        this.sessionInfoCallbacks = this.sessionInfoCallbacks.filter(cb => cb !== callback as EventCallback<SessionInfo>);
        break;
      case 'coaching':
        this.coachingCallbacks = this.coachingCallbacks.filter(cb => cb !== callback as EventCallback<CoachingInsight[]>);
        break;
      case 'skill_analysis':
        this.skillAnalysisCallbacks = this.skillAnalysisCallbacks.filter(cb => cb !== callback as EventCallback<DriverSkillAnalysis>);
        break;
      case 'competitor_data':
        this.competitorDataCallbacks = this.competitorDataCallbacks.filter(cb => cb !== callback as EventCallback<CompetitorData[]>);
        break;
      case 'strategy_data':
        this.strategyDataCallbacks = this.strategyDataCallbacks.filter(cb => cb !== callback as EventCallback<StrategyData>);
        break;
      case 'validation_summary':
        this.validationSummaryCallbacks = this.validationSummaryCallbacks.filter(cb => cb !== callback as EventCallback<any>);
        break;
      case 'track_position':
        this.trackPositionCallbacks = this.trackPositionCallbacks.filter(cb => cb !== callback as EventCallback<any>);
        break;
      case 'video_data':
        this.videoDataCallbacks = this.videoDataCallbacks.filter(cb => cb !== callback as EventCallback<any>);
        break;
      case 'driver_update':
        this.driverUpdateCallbacks = this.driverUpdateCallbacks.filter(cb => cb !== callback as EventCallback<DriverUpdateEvent>);
        break;
      case 'driver_list':
        this.driverListCallbacks = this.driverListCallbacks.filter(cb => cb !== callback as EventCallback<DriverListEvent>);
        break;
      case 'handoff_request':
        this.handoffRequestCallbacks = this.handoffRequestCallbacks.filter(cb => cb !== callback as EventCallback<HandoffRequestEvent>);
        break;
      case 'handoff_response':
        this.handoffResponseCallbacks = this.handoffResponseCallbacks.filter(cb => cb !== callback as EventCallback<HandoffResponseEvent>);
        break;
      case 'switch_driver':
        this.switchDriverCallbacks = this.switchDriverCallbacks.filter(cb => cb !== callback as EventCallback<SwitchDriverEvent>);
        break;
      case 'team_message':
        this.teamMessageCallbacks = this.teamMessageCallbacks.filter(cb => cb !== callback as EventCallback<TeamMessageEvent>);
        break;
      case 'request_comparison':
        this.requestComparisonCallbacks = this.requestComparisonCallbacks.filter(cb => cb !== callback as EventCallback<RequestComparisonEvent>);
        break;
      case 'comparison_result':
        this.comparisonResultCallbacks = this.comparisonResultCallbacks.filter(cb => cb !== callback as EventCallback<ComparisonResultEvent>);
        break;
      default:
        // Handle custom events
        if (this.customEventCallbacks[event as string]) {
          this.customEventCallbacks[event as string] = this.customEventCallbacks[event as string].filter(cb => cb !== callback as EventCallback<any>);
        }
        break;
    }
  }
}

// Export a singleton instance of the WebSocketService
const webSocketService = new WebSocketService();
export default webSocketService;
