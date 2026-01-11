import { io, Socket } from 'socket.io-client';
import { throttle } from 'lodash';
import type { 
  TelemetryData, 
  SessionInfo, 
  CoachingInsight, 
  DriverSkillAnalysis, 
  CompetitorData, 
  StrategyData 
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type EventCallback<T> = (data: T) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

type EventMap = {
  'connect': void;
  'disconnect': void;
  'telemetry': TelemetryData;
  'session_info': SessionInfo;
  'coaching': CoachingInsight[];
  'skill_analysis': DriverSkillAnalysis;
  'competitor_data': CompetitorData[];
  'strategy_data': StrategyData;
  'relay:status': { connected: boolean; iRacingConnected: boolean };
  'engineer:status': { connected: boolean; name?: string };
  'engineer:message': { text: string; timestamp: number };
  'driver:transcription': { text: string; timestamp: number };
};

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(): void {
    if (this.socket?.connected) {
      console.log('Already connected');
      return;
    }

    const token = localStorage.getItem('okboxbox_token') || 'demo-token';
    const url = `${API_URL}/app`;
    
    console.log(`[WebSocket] Connecting to ${url} with token: ${token}`);

    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('BlackBox connected to backend');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connect', undefined);
    });

    this.socket.on('disconnect', () => {
      console.log('BlackBox disconnected from backend');
      this.connected = false;
      this.emit('disconnect', undefined);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      this.reconnectAttempts++;
    });

    this.socket.on('connected', (data) => {
      console.log('Authenticated:', data);
    });

    // Relay status
    this.socket.on('relay:status', (status) => {
      this.emit('relay:status', status);
    });

    // Session events
    this.socket.on('session:start', (data) => {
      console.log('Session started:', data);
      this.emit('session_info', this.mapSessionData(data));
      // Join the session room
      this.socket?.emit('join:session', data.sessionId);
      this.socket?.emit('subscribe:telemetry');
    });

    this.socket.on('session:end', () => {
      console.log('Session ended');
    });

    // Telemetry events - throttled to 10Hz for UI
    const throttledTelemetry = throttle((data: TelemetryData) => {
      this.emit('telemetry', data);
    }, 100);

    this.socket.on('telemetry:update', (data) => {
      throttledTelemetry(data);
    });

    this.socket.on('telemetry:bulk', (data: { sessionId: string; packets: TelemetryData[] }) => {
      // Process bulk telemetry - emit the first packet for now
      if (data.packets && data.packets.length > 0) {
        throttledTelemetry(data.packets[0]);
      }
    });

    // Timing/competitor data
    this.socket.on('timing:update', (data: { sessionId: string; entries: CompetitorData[] }) => {
      if (data.entries) {
        this.emit('competitor_data', data.entries);
      }
    });

    // AI Coaching events (from backend processing)
    this.socket.on('coaching:insights', (insights: CoachingInsight[]) => {
      this.emit('coaching', insights);
    });

    this.socket.on('coaching:skill_analysis', (analysis: DriverSkillAnalysis) => {
      this.emit('skill_analysis', analysis);
    });

    // Strategy events
    this.socket.on('strategy:update', (strategy: StrategyData) => {
      this.emit('strategy_data', strategy);
    });
  }

  private mapSessionData(data: Record<string, unknown>): SessionInfo {
    return {
      track: (data.track as { name?: string })?.name || String(data.track || 'Unknown'),
      session: String(data.type || data.sessionType || 'Unknown'),
      driver: String(data.driver || 'Player'),
      car: String(data.car || 'Unknown'),
      weather: {
        temperature: 25,
        trackTemperature: 35,
        windSpeed: 10,
        windDirection: 'N',
        humidity: 50,
        trackGrip: 95,
      },
      totalLaps: Number(data.totalLaps) || 0,
      sessionTime: 0,
      remainingTime: Number(data.timeRemaining) || 0,
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    return {
      unsubscribe: () => {
        this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
      },
    };
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  send(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
