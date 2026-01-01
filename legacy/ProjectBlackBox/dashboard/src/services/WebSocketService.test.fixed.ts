import { io } from 'socket.io-client';
import webSocketService, { 
  ConnectionType, 
  DriverUpdateEvent, 
  DriverListEvent, 
  HandoffRequestEvent, 
  HandoffResponseEvent, 
  TeamMessageEvent, 
  SwitchDriverEvent
} from './WebSocketService';

// Mock socket.io-client
const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

const mockSocket = {
  on: mockOn,
  off: mockOff,
  emit: mockEmit,
  connect: mockConnect,
  disconnect: mockDisconnect,
  connected: true
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset internal state of the singleton
    (webSocketService as any).socket = null;
    (webSocketService as any).nativeWs = null;
    (webSocketService as any).telemetryCallbacks = [];
    (webSocketService as any).sessionCallbacks = [];
    (webSocketService as any).coachingCallbacks = [];
    (webSocketService as any).skillAnalysisCallbacks = [];
    (webSocketService as any).competitorCallbacks = [];
    (webSocketService as any).strategyCallbacks = [];
    (webSocketService as any).trackPositionCallbacks = [];
    (webSocketService as any).videoDataCallbacks = [];
    (webSocketService as any).validationCallbacks = [];
    (webSocketService as any).driverUpdateCallbacks = [];
    (webSocketService as any).driverListCallbacks = [];
    (webSocketService as any).handoffRequestCallbacks = [];
    (webSocketService as any).handoffResponseCallbacks = [];
    (webSocketService as any).switchDriverCallbacks = [];
    (webSocketService as any).teamMessageCallbacks = [];
    (webSocketService as any).requestComparisonCallbacks = [];
    (webSocketService as any).comparisonResultCallbacks = [];
    (webSocketService as any).connectCallbacks = [];
    (webSocketService as any).disconnectCallbacks = [];
  });

  describe('initialization', () => {
    test('should initialize with default values', () => {
      expect(webSocketService['socket']).toBeNull();
      expect(webSocketService['nativeWs']).toBeNull();
      expect(webSocketService['connectionType']).toBe(ConnectionType.SOCKET_IO);
      expect(webSocketService['telemetryCallbacks']).toEqual([]);
    });

    test('should connect with socket.io', () => {
      webSocketService.connect();
      expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.any(Object));
      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    test('should disconnect', () => {
      webSocketService.connect();
      webSocketService.disconnect();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('event registration', () => {
    beforeEach(() => {
      webSocketService.connect();
    });

    test('should register and unregister telemetry callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('telemetry', callback);
      
      expect(webSocketService['telemetryCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['telemetryCallbacks'].length).toBe(0);
    });

    // Multi-driver specific event registration tests
    test('should register and unregister driver update callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onDriverUpdate(callback);
      
      expect(webSocketService['driverUpdateCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['driverUpdateCallbacks'].length).toBe(0);
    });
  });

  describe('multi-driver methods', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
      
      // Reset WebSocketService state
      webSocketService.disconnect();
      
      // Reset the socket to null to ensure clean state
      (webSocketService as any).socket = null;
      
      // Connect to socket
      webSocketService.connect();
      
      // Ensure mockSocket is properly set
      (webSocketService as any).socket = mockSocket;
      (webSocketService as any).connected = true;
      
      // Reset mock call history for emit
      mockEmit.mockClear();
    });

    test('should send driver telemetry', () => {
      const driverId = 'driver1';
      const telemetryData = {
        speed: 100,
        rpm: 5000
      };
      
      webSocketService.sendDriverTelemetry(driverId, telemetryData);
      
      expect(mockEmit).toHaveBeenCalledWith('telemetry', {
        driverId,
        speed: 100,
        rpm: 5000
      });
    });

    test('should send team message with default priority', () => {
      const content = 'Test message';
      const senderId = 'driver1';
      const senderName = 'Driver 1';
      
      webSocketService.sendTeamMessage(content, senderId, senderName);
      
      expect(mockEmit).toHaveBeenCalledWith('team_message', {
        message: {
          id: 'msg-mock-uuid',
          senderId,
          senderName,
          timestamp: expect.any(Number),
          content,
          priority: 'normal'
        }
      });
    });
  });

  describe('mock event emitters', () => {
    test('should emit mock driver update', () => {
      const callback = jest.fn();
      webSocketService.onDriverUpdate(callback);
      
      const mockData: DriverUpdateEvent = {
        driver: {
          id: 'driver1',
          name: 'Driver 1',
          status: 'active'
        }
      };
      
      webSocketService.emitMockDriverUpdate(mockData);
      
      expect(callback).toHaveBeenCalledWith(mockData);
    });
  });
});
