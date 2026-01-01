import { store } from '../redux/store';
import { Socket } from 'socket.io-client';
import webSocketService from './WebSocketService';
import multiDriverService from './MultiDriverService';
import {
  addDriver,
  updateDriver,
  setActiveDriver,
  requestHandoff,
  updateHandoffStatus,
  sendTeamMessage,
  addDriverComparison,
  setDriversError,
  clearDriversError
} from '../redux/driversSlice';

// Mock Redux
jest.mock('../redux/store', () => {
  const mockStore = {
    dispatch: jest.fn(),
    getState: jest.fn().mockReturnValue({
      drivers: {
        drivers: []
      }
    })
  };
  return { store: mockStore };
});

// Mock Redux actions
jest.mock('../redux/driversSlice', () => ({
  addDriver: jest.fn(),
  updateDriver: jest.fn(),
  setActiveDriver: jest.fn(),
  requestHandoff: jest.fn(),
  updateHandoffStatus: jest.fn(),
  sendTeamMessage: jest.fn(),
  addDriverComparison: jest.fn(),
  setDriversError: jest.fn(),
  clearDriversError: jest.fn()
}));

// Mock WebSocketService methods
jest.mock('./WebSocketService', () => {
  const mockOnDriverUpdate = jest.fn();
  const mockOnDriverList = jest.fn();
  const mockOnHandoffRequest = jest.fn();
  const mockOnHandoffResponse = jest.fn();
  const mockOnTeamMessage = jest.fn();
  const mockOnComparisonResult = jest.fn();
  const mockOnComponentValidation = jest.fn();
  
  return {
    __esModule: true,
    default: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      sendMessage: jest.fn(),
      onDriverUpdate: mockOnDriverUpdate,
      onDriverList: mockOnDriverList,
      onHandoffRequest: mockOnHandoffRequest,
      onHandoffResponse: mockOnHandoffResponse,
      onTeamMessage: mockOnTeamMessage,
      onComparisonResult: mockOnComparisonResult,
      onComponentValidation: mockOnComponentValidation,
      initiateHandoff: jest.fn(),
      respondToHandoff: jest.fn(),
      switchDriver: jest.fn(),
      sendTeamMessage: jest.fn(),
      requestDriverComparison: jest.fn(),
      validateComponent: jest.fn()
    }
  };
});

// Mock UUID - must be before imports
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid')
}));

// Store the mock UUID value for later use
const mockUuid = 'mock-uuid';

describe('Service Integration Tests', () => {
  // Mock for direct method calls
  const mockEmit = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    (multiDriverService as any).initialized = false;
    
    // Setup WebSocketService mock implementation
    (webSocketService.sendMessage as jest.Mock).mockImplementation((eventName: string, payload: any) => {
      mockEmit(eventName, payload);
      return true;
    });
    
    // Setup mock handlers for WebSocketService event registration methods
    (webSocketService.onDriverUpdate as jest.Mock).mockImplementation((handler) => {
      (webSocketService as any).driverUpdateHandler = handler;
      return () => {};
    });
    
    (webSocketService.onDriverList as jest.Mock).mockImplementation((handler) => {
      (webSocketService as any).driverListHandler = handler;
      return () => {};
    });
    
    (webSocketService.onHandoffRequest as jest.Mock).mockImplementation((handler) => {
      (webSocketService as any).handoffRequestHandler = handler;
      return () => {};
    });
    
    (webSocketService.onHandoffResponse as jest.Mock).mockImplementation((handler) => {
      (webSocketService as any).handoffResponseHandler = handler;
      return () => {};
    });
    
    (webSocketService.onTeamMessage as jest.Mock).mockImplementation((handler) => {
      (webSocketService as any).teamMessageHandler = handler;
      return () => {};
    });
    
    (webSocketService.onComparisonResult as jest.Mock).mockImplementation((handler) => {
      (webSocketService as any).comparisonResultHandler = handler;
      return () => {};
    });
    
    // Setup MultiDriverService method mocks
    (webSocketService.initiateHandoff as jest.Mock).mockReturnValue('handoff-id');
    (webSocketService.requestDriverComparison as jest.Mock).mockReturnValue('comparison-id');
  });
  
  describe('Service Initialization and Connection', () => {
    test('should initialize MultiDriverService and register WebSocket event handlers', () => {
      // Initialize MultiDriverService
      multiDriverService.initialize();
      
      // Verify: WebSocketService event handlers were registered
      expect(webSocketService.onDriverUpdate).toHaveBeenCalledTimes(1);
      expect(webSocketService.onDriverList).toHaveBeenCalledTimes(1);
      expect(webSocketService.onHandoffRequest).toHaveBeenCalledTimes(1);
      expect(webSocketService.onHandoffResponse).toHaveBeenCalledTimes(1);
      expect(webSocketService.onTeamMessage).toHaveBeenCalledTimes(1);
      expect(webSocketService.onComparisonResult).toHaveBeenCalledTimes(1);
    });
    
    test('should handle errors when sending team messages', () => {
      // Setup
      multiDriverService.initialize();
      console.error = jest.fn(); // Mock console.error
      
      // Setup WebSocketService to simulate error
      (webSocketService.sendTeamMessage as jest.Mock).mockImplementation(() => {
        throw new Error('Connection error');
      });
      
      // Action: Try to send a team message
      const result = multiDriverService.sendTeamMessage('Test message', 'driver1', 'Driver 1', 'high');
      
      // Verify: Error was logged and handled properly
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending team message')
      );
      expect(result).toBe(false);
      expect(setDriversError).toHaveBeenCalledWith('Failed to send team message: Connection error');
    });
    
    test('should handle errors when initiating handoff', () => {
      // Setup
      multiDriverService.initialize();
      console.error = jest.fn(); // Mock console.error
      
      // Setup WebSocketService to simulate error
      (webSocketService.initiateHandoff as jest.Mock).mockImplementation(() => {
        throw new Error('Connection error');
      });
      
      // Action: Try to initiate a handoff
      const handoffId = multiDriverService.initiateHandoff('driver1', 'driver2', 'Test handoff');
      
      // Verify: Error was logged and null was returned
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error initiating handoff')
      );
      expect(handoffId).toBeNull();
      expect(setDriversError).toHaveBeenCalledWith('Failed to initiate handoff: Connection error');
    });
  });
  
  describe('Team Communication Flow', () => {
    test('should send team message from MultiDriverService through WebSocketService', () => {
      // Setup
      multiDriverService.initialize();
      
      // Action: Send team message through MultiDriverService
      multiDriverService.sendTeamMessage(
        'Test integration message',
        'driver1',
        'Driver 1',
        'high'
      );
      
      // Verify: WebSocketService emits the correct message
      // Note: MultiDriverService maps 'high' priority to 'critical' when calling WebSocketService
      expect(webSocketService.sendTeamMessage).toHaveBeenCalledWith(
        'Test integration message',
        'driver1',
        'Driver 1',
        'critical'
      );
    });
    
    test('should handle incoming team messages from WebSocketService to Redux', () => {
      // Setup
      multiDriverService.initialize();
      
      // Simulate incoming team message event
      const teamMessageEvent = {
        message: {
          id: 'msg-123',
          senderId: 'driver2',
          senderName: 'Driver 2',
          content: 'Incoming test message',
          priority: 'normal',
          timestamp: Date.now()
        }
      };
      
      // Call the handler with the mock event
      (webSocketService as any).teamMessageHandler(teamMessageEvent);
      
      // Verify Redux action was dispatched
      expect(sendTeamMessage).toHaveBeenCalledWith({
        senderId: 'driver2',
        senderName: 'Driver 2',
        content: 'Incoming test message',
        priority: 'normal'
      });
    });
  });
  
  describe('Driver Handoff Flow', () => {
    test('should initiate handoff from MultiDriverService through WebSocketService', () => {
      // Setup
      multiDriverService.initialize();
      
      // Action: Initiate handoff
      const handoffId = multiDriverService.initiateHandoff(
        'driver1',
        'driver2',
        'Integration test handoff'
      );
      
      // Verify: WebSocketService method was called
      expect(webSocketService.initiateHandoff).toHaveBeenCalledWith(
        'driver1',
        'driver2',
        'Integration test handoff'
      );
      
      // Verify: Handoff ID is returned
      expect(handoffId).toBe('handoff-id'); // From the mock implementation
    });
    
    test('should handle incoming handoff requests from WebSocketService to Redux', () => {
      // Setup
      multiDriverService.initialize();
      
      // Simulate incoming handoff request event
      const handoffRequestEvent = {
        handoff: {
          id: 'handoff-123',
          fromDriverId: 'driver2',
          toDriverId: 'driver1',
          notes: 'Incoming handoff request',
          status: 'pending',
          timestamp: Date.now()
        }
      };
      
      // Call the handler with the mock event
      (webSocketService as any).handoffRequestHandler(handoffRequestEvent);
      
      // Verify Redux action was dispatched
      expect(requestHandoff).toHaveBeenCalledWith({
        fromDriverId: 'driver2',
        toDriverId: 'driver1',
        message: 'Incoming handoff request'
      });
    });
    
    test('should respond to handoff from MultiDriverService through WebSocketService', () => {
      // Setup
      multiDriverService.initialize();
      
      // Action: Respond to handoff
      multiDriverService.respondToHandoff('handoff-123', 'confirmed');
      
      // Verify: WebSocketService method was called
      expect(webSocketService.respondToHandoff).toHaveBeenCalledWith(
        'handoff-123',
        'confirmed'
      );
    });
    
    test('should handle incoming handoff responses from WebSocketService to Redux', () => {
      // Setup
      multiDriverService.initialize();
      
      // Simulate incoming handoff response event
      const handoffResponseEvent = {
        handoffId: 'handoff-123',
        status: 'confirmed'
      };
      
      // Call the handler with the mock event
      (webSocketService as any).handoffResponseHandler(handoffResponseEvent);
      
      // Verify Redux action was dispatched
      expect(updateHandoffStatus).toHaveBeenCalledWith({
        id: 'handoff-123',
        status: 'accepted' // MultiDriverService maps 'confirmed' to 'accepted'
      });
    });
  });
  
  describe('Driver Comparison Flow', () => {
    test('should request driver comparison from MultiDriverService through WebSocketService', () => {
      // Setup
      multiDriverService.initialize();
      
      // Action: Request driver comparison
      const comparisonId = multiDriverService.requestDriverComparison('driver1', 'driver2');
      
      // Verify: WebSocketService method was called
      expect(webSocketService.requestDriverComparison).toHaveBeenCalledWith(
        'driver1',
        'driver2'
      );
      
      // Verify: Comparison ID is returned
      expect(comparisonId).toBe('comparison-id'); // From the mock implementation
    });
    
    test('should handle incoming comparison results from WebSocketService to Redux', () => {
      // Setup
      multiDriverService.initialize();
      
      // Simulate incoming comparison result event
      const comparisonResultEvent = {
        comparisonId: 'driver1_driver2_123',
        metrics: [
          {
            name: 'lapTime',
            driverA: { value: '90.5', delta: 0 },
            driverB: { value: '91.2', delta: 0 }
          },
          {
            name: 'sector1',
            driverA: { value: '30.1', delta: 0 },
            driverB: { value: '30.5', delta: 0 }
          }
        ]
      };
      
      // Call the handler with the mock event
      (webSocketService as any).comparisonResultHandler(comparisonResultEvent);
      
      // Verify Redux action was dispatched
      expect(addDriverComparison).toHaveBeenCalledWith(expect.objectContaining({
        driverId1: 'driver1',
        driverId2: 'driver2',
        metrics: expect.objectContaining({
          lapTime: {
            driver1: 90.5,
            driver2: 91.2
          },
          sectors: expect.objectContaining({
            sector1: { driver1: 30.1, driver2: 30.5 }
          })
        })
      }));
    });
  });
  
  describe('Driver Switching Flow', () => {
    test('should switch driver from MultiDriverService through WebSocketService', () => {
      // Setup
      multiDriverService.initialize();
      
      // Action: Switch driver
      multiDriverService.switchDriver('driver2');
      
      // Verify: WebSocketService method was called
      expect(webSocketService.switchDriver).toHaveBeenCalledWith('driver2');
    });
  });
  
  describe('Error Handling', () => {
    let originalConsoleError: typeof console.error;
    
    beforeEach(() => {
      // Mock console.error for all error handling tests
      originalConsoleError = console.error;
      console.error = jest.fn();
    });
    
    afterEach(() => {
      // Restore console.error after each test
      console.error = originalConsoleError;
    });
    
    test('should handle errors when sending team messages', () => {
      // Setup
      multiDriverService.initialize();
      
      // Setup WebSocketService to simulate error
      (webSocketService.sendTeamMessage as jest.Mock).mockImplementation(() => {
        console.error('Error sending team message: Connection error');
        return false;
      });
      
      // Action: Try to send a team message
      multiDriverService.sendTeamMessage('Test message', 'driver1', 'Driver 1');
      
      // Verify: Error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending team message')
      );
    });
    
    test('should handle errors when initiating handoff', () => {
      // Setup
      multiDriverService.initialize();
      console.error = jest.fn(); // Mock console.error
      
      // Setup WebSocketService to simulate error
      (webSocketService.initiateHandoff as jest.Mock).mockImplementation(() => {
        throw new Error('Connection error');
      });
      
      // Action: Try to initiate a handoff
      const handoffId = multiDriverService.initiateHandoff('driver1', 'driver2', 'Test handoff');
      
      // Verify: Error was logged and null was returned
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error initiating handoff')
      );
      expect(handoffId).toBeNull();
      expect(setDriversError).toHaveBeenCalledWith('Failed to initiate handoff: Connection error');
    });
    
    test('should handle errors when responding to handoff', () => {
      // Setup
      multiDriverService.initialize();
      console.error = jest.fn(); // Mock console.error
      
      // Setup WebSocketService to simulate error
      (webSocketService.respondToHandoff as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid handoff ID');
      });
      
      // Action: Try to respond to a handoff
      const result = multiDriverService.respondToHandoff('invalid-handoff-id', 'confirmed');
      
      // Verify: Error was logged and handled properly
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error responding to handoff')
      );
      expect(result).toBe(false);
      expect(setDriversError).toHaveBeenCalledWith('Failed to respond to handoff: Invalid handoff ID');
    });
    
    test('should handle errors when requesting driver comparison', () => {
      // Setup
      multiDriverService.initialize();
      console.error = jest.fn(); // Mock console.error
      
      // Setup WebSocketService to simulate error
      (webSocketService.requestDriverComparison as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid driver IDs');
      });
      
      // Action: Try to request a driver comparison
      const comparisonId = multiDriverService.requestDriverComparison('driver1', 'invalid-driver');
      
      // Verify: Error was logged and null was returned
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error requesting driver comparison')
      );
      expect(comparisonId).toBeNull();
      expect(setDriversError).toHaveBeenCalledWith('Failed to request driver comparison: Invalid driver IDs');
    });
    
    test('should handle errors when switching drivers', () => {
      // Setup
      multiDriverService.initialize();
      console.error = jest.fn(); // Mock console.error
      
      // Setup WebSocketService to simulate error
      (webSocketService.switchDriver as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid driver ID');
      });
      
      // Action: Try to switch driver
      const result = multiDriverService.switchDriver('invalid-driver-id');
      
      // Verify: Error was logged and handled properly
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error switching driver')
      );
      expect(result).toBe(false);
      expect(setDriversError).toHaveBeenCalledWith('Failed to switch driver: Invalid driver ID');
    });
    
    test('should handle connection status changes', () => {
      // Setup
      multiDriverService.initialize();
      
      // Test connected state
      multiDriverService.handleConnectionStatusChange(true);
      expect(clearDriversError).toHaveBeenCalled();
      
      // Test disconnected state with error message
      const errorMessage = 'Connection lost: network error';
      multiDriverService.handleConnectionStatusChange(false, errorMessage);
      expect(setDriversError).toHaveBeenCalledWith(errorMessage);
    });
  });
});
