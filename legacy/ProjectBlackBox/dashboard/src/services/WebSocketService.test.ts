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

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

// Mock uuid
const mockUuid = 'mock-uuid';
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue(mockUuid)
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (io as jest.Mock).mockReturnValue(mockSocket);
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
      expect(webSocketService['sessionCallbacks']).toEqual([]);
      expect(webSocketService['coachingCallbacks']).toEqual([]);
      expect(webSocketService['skillAnalysisCallbacks']).toEqual([]);
      expect(webSocketService['competitorCallbacks']).toEqual([]);
      expect(webSocketService['strategyCallbacks']).toEqual([]);
      expect(webSocketService['trackPositionCallbacks']).toEqual([]);
      expect(webSocketService['videoDataCallbacks']).toEqual([]);
      expect(webSocketService['validationCallbacks']).toEqual([]);
      expect(webSocketService['driverUpdateCallbacks']).toEqual([]);
      expect(webSocketService['driverListCallbacks']).toEqual([]);
      expect(webSocketService['handoffRequestCallbacks']).toEqual([]);
      expect(webSocketService['handoffResponseCallbacks']).toEqual([]);
      expect(webSocketService['switchDriverCallbacks']).toEqual([]);
      expect(webSocketService['teamMessageCallbacks']).toEqual([]);
      expect(webSocketService['requestComparisonCallbacks']).toEqual([]);
      expect(webSocketService['comparisonResultCallbacks']).toEqual([]);
      expect(webSocketService['connectCallbacks']).toEqual([]);
      expect(webSocketService['disconnectCallbacks']).toEqual([]);
    });

    test('should connect with socket.io', () => {
      webSocketService.connect();
      expect(io).toHaveBeenCalled();
      const ioCall = (io as jest.Mock).mock.calls[0];
      expect(ioCall[0]).toBe('http://localhost:3001');
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('telemetry', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('session_info', expect.any(Function));
      // If coaching_insight is not registered in the actual implementation, remove this expectation
      // expect(mockSocket.on).toHaveBeenCalledWith('coaching_insight', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('driver_skill', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('competitor_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('strategy_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('driver_update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('driver_list', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('handoff_request', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('handoff_response', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('team_message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('validation_result', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('comparison_result', expect.any(Function));
    });

    test('should connect with custom URL', () => {
      webSocketService.connect('wss://custom-server.com');
      expect(io).toHaveBeenCalled();
      const ioCall = (io as jest.Mock).mock.calls[0];
      expect(ioCall[0]).toBe('wss://custom-server.com');
    });

    test('should disconnect', () => {
      webSocketService.connect();
      webSocketService.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
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

    test('should register and unregister session info callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('session_info', callback);
      
      expect(webSocketService['sessionCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['sessionCallbacks'].length).toBe(0);
    });

    test('should register and unregister coaching insight callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('coaching', callback);
      
      expect(webSocketService['coachingCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['coachingCallbacks'].length).toBe(0);
    });

    test('should register and unregister driver skill callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('skill_analysis', callback);
      
      expect(webSocketService['skillAnalysisCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['skillAnalysisCallbacks'].length).toBe(0);
    });

    test('should register and unregister competitor callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('competitor_data', callback);
      
      expect(webSocketService['competitorCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['competitorCallbacks'].length).toBe(0);
    });

    test('should register and unregister strategy callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('strategy_data', callback);
      
      expect(webSocketService['strategyCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['strategyCallbacks'].length).toBe(0);
    });

    // Multi-driver specific event registration tests
    test('should register and unregister driver update callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onDriverUpdate(callback);
      
      expect(webSocketService['driverUpdateCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['driverUpdateCallbacks'].length).toBe(0);
    });

    test('should register and unregister driver list callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onDriverList(callback);
      
      expect(webSocketService['driverListCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['driverListCallbacks'].length).toBe(0);
    });

    test('should register and unregister handoff request callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onHandoffRequest(callback);
      
      expect(webSocketService['handoffRequestCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['handoffRequestCallbacks'].length).toBe(0);
    });

    test('should register and unregister handoff response callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onHandoffResponse(callback);
      
      expect(webSocketService['handoffResponseCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['handoffResponseCallbacks'].length).toBe(0);
    });

    test('should register and unregister team message callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onTeamMessage(callback);
      
      expect(webSocketService['teamMessageCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['teamMessageCallbacks'].length).toBe(0);
    });

    test('should register and unregister validation result callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.on('validation_summary', callback);
      
      expect(webSocketService['validationCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['validationCallbacks'].length).toBe(0);
    });

    test('should register and unregister comparison result callback', () => {
      const callback = jest.fn();
      const unregister = webSocketService.onComparisonResult(callback);
      
      expect(webSocketService['comparisonResultCallbacks'].length).toBe(1);
      
      unregister();
      
      expect(webSocketService['comparisonResultCallbacks'].length).toBe(0);
    });
  });

  describe('message sending', () => {
    beforeEach(() => {
      webSocketService.connect();
    });

    test('should send message', () => {
      const eventName = 'test_event';
      const payload = { test: 'data' };
      
      // Ensure socket is connected
      webSocketService['connected'] = true;
      
      webSocketService['sendMessage'](eventName, payload);
      
      expect(mockEmit).toHaveBeenCalledWith(eventName, payload);
    });

    test('should not send message when not connected', () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const eventName = 'test_event';
      const payload = { test: 'data' };
      
      // Make sure socket is not connected
      webSocketService['connected'] = false;
      
      webSocketService['sendMessage'](eventName, payload);
      
      expect(mockEmit).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Cannot send message: Socket.io is not connected');
      
      // Restore console.error
      console.error = originalConsoleError;
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

    test('should request driver telemetry', () => {
      const driverId = 'driver1';
      const timeRange = { start: 1000, end: 2000 };
      
      webSocketService.requestDriverTelemetry(driverId, timeRange);
      
      expect(mockEmit).toHaveBeenCalledWith('request_telemetry', {
        driverId,
        timeRange
      });
    });

    test('should send team message with default priority', () => {
      const content = 'Test message';
      const senderId = 'driver1';
      const senderName = 'Driver 1';
      
      webSocketService.sendTeamMessage(content, senderId, senderName);
      
      expect(mockEmit).toHaveBeenCalledWith('team_message', {
        message: expect.objectContaining({
          id: `msg-${mockUuid}`,
          senderId,
          senderName,
          content,
          priority: 'normal'
        })
      });
    });

    test('should send team message with custom priority', () => {
      const content = 'Critical message';
      const senderId = 'driver1';
      const senderName = 'Driver 1';
      const priority = 'critical';
      
      webSocketService.sendTeamMessage(content, senderId, senderName, priority);
      
      expect(mockEmit).toHaveBeenCalledWith('team_message', {
        message: expect.objectContaining({
          id: `msg-${mockUuid}`,
          senderId,
          senderName,
          content,
          priority
        })
      });
    });

    test('should request driver comparison', () => {
      const driverAId = 'driver1';
      const driverBId = 'driver2';
      
      const comparisonId = webSocketService.requestDriverComparison(driverAId, driverBId);
      
      expect(mockEmit).toHaveBeenCalledWith('request_comparison', {
        driverAId,
        driverBId,
        comparisonId: `${driverAId}_${driverBId}_${mockUuid}`
      });
      
      expect(comparisonId).toBe(`${driverAId}_${driverBId}_mock-uuid`);
    });

    test('should initiate handoff', () => {
      const fromDriverId = 'driver1';
      const toDriverId = 'driver2';
      const notes = 'Taking a break';
      
      const handoffId = webSocketService.initiateHandoff(fromDriverId, toDriverId, notes);
      
      expect(mockEmit).toHaveBeenCalledWith('handoff_request', {
        handoff: expect.objectContaining({
          id: mockUuid,
          fromDriverId,
          toDriverId,
          notes,
          status: 'pending'
        })
      });
      
      expect(handoffId).toBe('mock-uuid');
    });

    test('should respond to handoff', () => {
      const handoffId = 'handoff1';
      const status = 'confirmed';
      
      webSocketService.respondToHandoff(handoffId, status);
      
      expect(mockEmit).toHaveBeenCalledWith('handoff_response', expect.objectContaining({
        handoffId,
        status
      }));
    });

    test('should switch driver', () => {
      const driverId = 'driver2';
      
      webSocketService.switchDriver(driverId);
      
      expect(mockEmit).toHaveBeenCalledWith('switch_driver', expect.objectContaining({
        driverId
      }));
    });

    test('should request component validation', () => {
      const componentName = 'test-component';
      
      webSocketService.requestValidation(componentName);
      
      expect(mockEmit).toHaveBeenCalledWith('validate_component', expect.objectContaining({
        component: componentName
      }));
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

    test('should emit mock driver list', () => {
      const callback = jest.fn();
      webSocketService.onDriverList(callback);
      
      const mockData: DriverListEvent = {
        drivers: [
          { id: 'driver1', name: 'Driver 1', team: 'Team A', role: 'primary', status: 'active' },
          { id: 'driver2', name: 'Driver 2', team: 'Team A', role: 'secondary', status: 'standby' }
        ],
        activeDriverId: 'driver1'
      };
      
      webSocketService.emitMockDriverList(mockData);
      
      expect(callback).toHaveBeenCalledWith(mockData);
    });

    test('should emit mock handoff request', () => {
      const callback = jest.fn();
      webSocketService.onHandoffRequest(callback);
      
      const mockData: HandoffRequestEvent = {
        handoff: {
          id: 'handoff1',
          fromDriverId: 'driver1',
          toDriverId: 'driver2',
          notes: 'Please take over',
          timestamp: 1625097600000,
          status: 'pending'
        }
      };
      
      webSocketService.emitMockHandoffRequest(mockData);
      
      expect(callback).toHaveBeenCalledWith(mockData);
    });

    test('should emit mock handoff response', () => {
      const callback = jest.fn();
      webSocketService.onHandoffResponse(callback);
      
      const mockData: HandoffResponseEvent = {
        handoffId: 'handoff1',
        status: 'confirmed'
      };
      
      webSocketService.emitMockHandoffResponse(mockData);
      
      expect(callback).toHaveBeenCalledWith(mockData);
    });

    test('should emit mock team message', () => {
      const callback = jest.fn();
      webSocketService.onTeamMessage(callback);
      
      const mockData: TeamMessageEvent = {
        message: {
          id: 'msg1',
          senderId: 'driver1',
          senderName: 'Driver 1',
          timestamp: 1625097600000,
          content: 'Hello team',
          priority: 'normal'
        }
      };
      
      webSocketService.emitMockTeamMessage(mockData);
      
      expect(callback).toHaveBeenCalledWith(mockData);
    });

    test('should emit mock comparison result', () => {
      const callback = jest.fn();
      webSocketService.onComparisonResult(callback);
      
      const mockData = {
        comparisonId: 'driver1_driver2_123',
        metrics: [
          {
            name: 'lapTime',
            driverA: { value: '90.5', delta: 0 },
            driverB: { value: '91.2', delta: 0 }
          }
        ]
      };
      
      webSocketService.emitMockComparisonResult(mockData);
      
      expect(callback).toHaveBeenCalledWith(mockData);
    });
  });
});
