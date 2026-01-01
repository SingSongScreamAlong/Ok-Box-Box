import { store } from '../redux/store';
import webSocketService from './WebSocketService';
import multiDriverService from './MultiDriverService';
import {
  addDriver,
  updateDriver,
  setActiveDriver,
  requestHandoff,
  updateHandoffStatus,
  sendTeamMessage,
  addDriverComparison
} from '../redux/driversSlice';

// Mock dependencies
jest.mock('../redux/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn()
  }
}));

jest.mock('./WebSocketService', () => ({
  __esModule: true,
  default: {
    onDriverUpdate: jest.fn(),
    onDriverList: jest.fn(),
    onHandoffRequest: jest.fn(),
    onHandoffResponse: jest.fn(),
    onTeamMessage: jest.fn(),
    onComparisonResult: jest.fn(),
    sendTeamMessage: jest.fn(),
    requestDriverComparison: jest.fn().mockReturnValue('comparison-id'),
    initiateHandoff: jest.fn().mockReturnValue('handoff-id'),
    respondToHandoff: jest.fn(),
    switchDriver: jest.fn()
  }
}));

jest.mock('../redux/driversSlice', () => ({
  addDriver: jest.fn(),
  updateDriver: jest.fn(),
  setActiveDriver: jest.fn(),
  requestHandoff: jest.fn(),
  updateHandoffStatus: jest.fn(),
  sendTeamMessage: jest.fn(),
  addDriverComparison: jest.fn()
}));

describe('MultiDriverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the initialized state by accessing private property (for testing)
    (multiDriverService as any).initialized = false;
  });

  describe('initialize', () => {
    test('should set up WebSocket event listeners', () => {
      multiDriverService.initialize();

      // Verify event listeners are registered
      expect(webSocketService.onDriverUpdate).toHaveBeenCalledTimes(1);
      expect(webSocketService.onDriverList).toHaveBeenCalledTimes(1);
      expect(webSocketService.onHandoffRequest).toHaveBeenCalledTimes(1);
      expect(webSocketService.onHandoffResponse).toHaveBeenCalledTimes(1);
      expect(webSocketService.onTeamMessage).toHaveBeenCalledTimes(1);
      expect(webSocketService.onComparisonResult).toHaveBeenCalledTimes(1);
    });

    test('should not set up listeners if already initialized', () => {
      // Initialize once
      multiDriverService.initialize();
      
      // Clear mocks to check if they're called again
      jest.clearAllMocks();
      
      // Initialize again
      multiDriverService.initialize();
      
      // Verify no listeners are registered the second time
      expect(webSocketService.onDriverUpdate).not.toHaveBeenCalled();
      expect(webSocketService.onDriverList).not.toHaveBeenCalled();
      expect(webSocketService.onHandoffRequest).not.toHaveBeenCalled();
      expect(webSocketService.onHandoffResponse).not.toHaveBeenCalled();
      expect(webSocketService.onTeamMessage).not.toHaveBeenCalled();
      expect(webSocketService.onComparisonResult).not.toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      // Initialize the service to register event handlers
      multiDriverService.initialize();
    });

    test('should handle driver update events for existing drivers', () => {
      // Mock store state with existing driver
      (store.getState as jest.Mock).mockReturnValue({
        drivers: {
          drivers: [{ id: 'driver1', name: 'Driver 1', status: 'active' }]
        }
      });

      // Extract the handler function that was registered
      const handleDriverUpdate = (webSocketService.onDriverUpdate as jest.Mock).mock.calls[0][0];
      
      // Create a mock driver update event
      const driverUpdateEvent = {
        driver: {
          id: 'driver1',
          name: 'Driver 1 Updated',
          status: 'inactive',
          location: { lat: 0, lng: 0 }
        }
      };
      
      // Call the handler with the mock event
      handleDriverUpdate(driverUpdateEvent);
      
      // Verify the correct Redux action was dispatched
      expect(updateDriver).toHaveBeenCalledWith({
        id: 'driver1',
        status: 'inactive',
        location: { lat: 0, lng: 0 }
      });
    });

    test('should handle driver update events for new drivers', () => {
      // Mock store state with no existing drivers
      (store.getState as jest.Mock).mockReturnValue({
        drivers: {
          drivers: []
        }
      });

      // Extract the handler function that was registered
      const handleDriverUpdate = (webSocketService.onDriverUpdate as jest.Mock).mock.calls[0][0];
      
      // Create a mock driver update event
      const driverUpdateEvent = {
        driver: {
          id: 'driver2',
          name: 'Driver 2',
          status: 'active',
          location: { lat: 1, lng: 1 }
        }
      };
      
      // Call the handler with the mock event
      handleDriverUpdate(driverUpdateEvent);
      
      // Verify the correct Redux action was dispatched
      expect(addDriver).toHaveBeenCalledWith({
        name: 'Driver 2',
        status: 'active',
        role: 'driver',
        telemetryEnabled: true,
        location: { lat: 1, lng: 1 }
      });
    });

    test('should handle driver list events', () => {
      // Mock store state
      (store.getState as jest.Mock).mockReturnValue({
        drivers: {
          drivers: [{ id: 'driver1', name: 'Driver 1', status: 'active' }]
        }
      });

      // Extract the handler function that was registered
      const handleDriverList = (webSocketService.onDriverList as jest.Mock).mock.calls[0][0];
      
      // Create a mock driver list event
      const driverListEvent = {
        drivers: [
          {
            id: 'driver1',
            name: 'Driver 1 Updated',
            status: 'inactive',
            role: 'lead'
          },
          {
            id: 'driver2',
            name: 'Driver 2',
            status: 'active',
            role: 'support'
          }
        ],
        activeDriverId: 'driver2'
      };
      
      // Call the handler with the mock event
      handleDriverList(driverListEvent);
      
      // Verify the correct Redux actions were dispatched
      expect(updateDriver).toHaveBeenCalledWith({
        id: 'driver1',
        name: 'Driver 1 Updated',
        status: 'inactive',
        role: 'lead'
      });
      
      expect(addDriver).toHaveBeenCalledWith({
        name: 'Driver 2',
        status: 'active',
        role: 'support',
        telemetryEnabled: true
      });
      
      expect(setActiveDriver).toHaveBeenCalledWith('driver2');
    });

    test('should handle handoff request events', () => {
      // Extract the handler function that was registered
      const handleHandoffRequest = (webSocketService.onHandoffRequest as jest.Mock).mock.calls[0][0];
      
      // Create a mock handoff request event
      const handoffRequestEvent = {
        handoff: {
          id: 'handoff1',
          fromDriverId: 'driver1',
          toDriverId: 'driver2',
          notes: 'Please take over',
          timestamp: Date.now(),
          status: 'pending'
        }
      };
      
      // Call the handler with the mock event
      handleHandoffRequest(handoffRequestEvent);
      
      // Verify the correct Redux action was dispatched
      expect(requestHandoff).toHaveBeenCalledWith({
        fromDriverId: 'driver1',
        toDriverId: 'driver2',
        message: 'Please take over'
      });
    });

    test('should handle handoff response events', () => {
      // Extract the handler function that was registered
      const handleHandoffResponse = (webSocketService.onHandoffResponse as jest.Mock).mock.calls[0][0];
      
      // Create mock handoff response events for different statuses
      const confirmedEvent = {
        handoffId: 'handoff1',
        status: 'confirmed'
      };
      
      const cancelledEvent = {
        handoffId: 'handoff2',
        status: 'cancelled'
      };
      
      const completedEvent = {
        handoffId: 'handoff3',
        status: 'completed'
      };
      
      // Call the handler with each mock event
      handleHandoffResponse(confirmedEvent);
      handleHandoffResponse(cancelledEvent);
      handleHandoffResponse(completedEvent);
      
      // Verify the correct Redux actions were dispatched
      expect(updateHandoffStatus).toHaveBeenCalledTimes(3);
      expect(updateHandoffStatus).toHaveBeenNthCalledWith(1, {
        id: 'handoff1',
        status: 'accepted'
      });
      expect(updateHandoffStatus).toHaveBeenNthCalledWith(2, {
        id: 'handoff2',
        status: 'rejected'
      });
      expect(updateHandoffStatus).toHaveBeenNthCalledWith(3, {
        id: 'handoff3',
        status: 'completed'
      });
    });

    test('should handle team message events', () => {
      // Extract the handler function that was registered
      const handleTeamMessage = (webSocketService.onTeamMessage as jest.Mock).mock.calls[0][0];
      
      // Create mock team message events
      const normalMessageEvent = {
        message: {
          id: 'msg1',
          senderId: 'driver1',
          senderName: 'Driver 1',
          content: 'Normal message',
          priority: 'normal',
          timestamp: Date.now()
        }
      };
      
      const criticalMessageEvent = {
        message: {
          id: 'msg2',
          senderId: 'driver2',
          senderName: 'Driver 2',
          content: 'Critical message',
          priority: 'critical',
          timestamp: Date.now()
        }
      };
      
      // Call the handler with each mock event
      handleTeamMessage(normalMessageEvent);
      handleTeamMessage(criticalMessageEvent);
      
      // Verify the correct Redux actions were dispatched
      expect(sendTeamMessage).toHaveBeenCalledTimes(2);
      expect(sendTeamMessage).toHaveBeenNthCalledWith(1, {
        senderId: 'driver1',
        senderName: 'Driver 1',
        content: 'Normal message',
        priority: 'normal'
      });
      expect(sendTeamMessage).toHaveBeenNthCalledWith(2, {
        senderId: 'driver2',
        senderName: 'Driver 2',
        content: 'Critical message',
        priority: 'high'
      });
    });

    test('should handle comparison result events', () => {
      // Extract the handler function that was registered
      const handleComparisonResult = (webSocketService.onComparisonResult as jest.Mock).mock.calls[0][0];
      
      // Create a mock comparison result event
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
          },
          {
            name: 'sector2',
            driverA: { value: '31.2', delta: 0 },
            driverB: { value: '31.0', delta: 0 }
          },
          {
            name: 'sector3',
            driverA: { value: '29.2', delta: 0 },
            driverB: { value: '29.7', delta: 0 }
          },
          {
            name: 'fuelUsage',
            driverA: { value: '2.5', delta: 0 },
            driverB: { value: '2.7', delta: 0 }
          },
          {
            name: 'tireWearFL',
            driverA: { value: '85', delta: 0 },
            driverB: { value: '82', delta: 0 }
          },
          {
            name: 'tireWearFR',
            driverA: { value: '84', delta: 0 },
            driverB: { value: '81', delta: 0 }
          },
          {
            name: 'tireWearRL',
            driverA: { value: '86', delta: 0 },
            driverB: { value: '83', delta: 0 }
          },
          {
            name: 'tireWearRR',
            driverA: { value: '85', delta: 0 },
            driverB: { value: '82', delta: 0 }
          }
        ]
      };
      
      // Call the handler with the mock event
      handleComparisonResult(comparisonResultEvent);
      
      // Verify the correct Redux action was dispatched
      expect(addDriverComparison).toHaveBeenCalledWith({
        driverId1: 'driver1',
        driverId2: 'driver2',
        metrics: {
          lapTime: {
            driver1: 90.5,
            driver2: 91.2
          },
          sectors: {
            sector1: { driver1: 30.1, driver2: 30.5 },
            sector2: { driver1: 31.2, driver2: 31.0 },
            sector3: { driver1: 29.2, driver2: 29.7 }
          },
          fuelUsage: {
            driver1: 2.5,
            driver2: 2.7
          },
          tireWear: {
            driver1: { fl: 85, fr: 84, rl: 86, rr: 85 },
            driver2: { fl: 82, fr: 81, rl: 83, rr: 82 }
          }
        }
      });
    });

    test('should handle invalid comparison IDs', () => {
      // Mock console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // Extract the handler function that was registered
      const handleComparisonResult = (webSocketService.onComparisonResult as jest.Mock).mock.calls[0][0];
      
      // Create a mock comparison result event with invalid ID
      const invalidComparisonEvent = {
        comparisonId: 'invalid-format',
        metrics: []
      };
      
      // Call the handler with the mock event
      handleComparisonResult(invalidComparisonEvent);
      
      // Verify error was logged and no Redux action was dispatched
      expect(console.error).toHaveBeenCalledWith(
        'Invalid comparison ID format:',
        'invalid-format'
      );
      expect(addDriverComparison).not.toHaveBeenCalled();
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('public methods', () => {
    test('should send team message', () => {
      multiDriverService.sendTeamMessage('Test message', 'driver1', 'Driver 1', 'normal');
      
      expect(webSocketService.sendTeamMessage).toHaveBeenCalledWith(
        'Test message',
        'driver1',
        'Driver 1',
        'normal'
      );
    });

    test('should send high priority team message as critical', () => {
      multiDriverService.sendTeamMessage('Urgent message', 'driver1', 'Driver 1', 'high');
      
      expect(webSocketService.sendTeamMessage).toHaveBeenCalledWith(
        'Urgent message',
        'driver1',
        'Driver 1',
        'critical'
      );
    });

    test('should request driver comparison', () => {
      const result = multiDriverService.requestDriverComparison('driver1', 'driver2');
      
      expect(webSocketService.requestDriverComparison).toHaveBeenCalledWith('driver1', 'driver2');
      expect(result).toBe('comparison-id');
    });

    test('should initiate handoff', () => {
      const result = multiDriverService.initiateHandoff('driver1', 'driver2', 'Taking a break');
      
      expect(webSocketService.initiateHandoff).toHaveBeenCalledWith(
        'driver1',
        'driver2',
        'Taking a break'
      );
      expect(result).toBe('handoff-id');
    });

    test('should respond to handoff', () => {
      multiDriverService.respondToHandoff('handoff1', 'confirmed');
      
      expect(webSocketService.respondToHandoff).toHaveBeenCalledWith('handoff1', 'confirmed');
    });

    test('should switch driver', () => {
      multiDriverService.switchDriver('driver2');
      
      expect(webSocketService.switchDriver).toHaveBeenCalledWith('driver2');
    });
  });
});
