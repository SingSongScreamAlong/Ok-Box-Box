import driversReducer, {
  setDrivers,
  setActiveDriver,
  updateDriver,
  requestHandoff,
  addHandoffRequest,
  updateHandoffStatus,
  sendTeamMessage,
  addTeamMessage,
  markMessageRead,
  markAllMessagesRead,
  addComparison,
  updateComparison,
  removeComparison,
  setLoading,
  setError,
  resetDriversState,
  HandoffRequest,
  DriverComparison
} from './driversSlice';
import { DriverProfile } from '../../services/WebSocketService';
import { TeamMessage, TeamMessageUtils } from '../../types/TeamMessage';

describe('driversSlice', () => {
  // Mock data for testing
  const mockDrivers: DriverProfile[] = [
    {
      id: 'driver1',
      name: 'John Doe',
      team: 'Team Alpha',
      role: 'primary',
      status: 'active',
      stats: {
        totalLaps: 42,
        bestLap: 90.5,
        consistencyRating: 8.7,
        lastActive: Date.now()
      },
      preferences: {
        displayUnits: 'metric',
        telemetryHighlights: ['speed', 'fuelLevel'],
        uiTheme: 'default'
      }
    },
    {
      id: 'driver2',
      name: 'Jane Smith',
      team: 'Team Alpha',
      role: 'secondary',
      status: 'standby',
      stats: {
        totalLaps: 36,
        bestLap: 92.1,
        consistencyRating: 7.9,
        lastActive: Date.now() - 3600000 // 1 hour ago
      },
      preferences: {
        displayUnits: 'imperial',
        telemetryHighlights: ['engineTemp', 'brakePressure'],
        uiTheme: 'high-contrast'
      }
    }
  ];

  const mockHandoffRequest: HandoffRequest = {
    id: 'handoff1',
    fromDriverId: 'driver1',
    toDriverId: 'driver2',
    notes: 'Taking a break, please take over',
    timestamp: Date.now(),
    status: 'pending'
  };

  const mockTeamMessage: TeamMessage = {
    id: 'msg1',
    content: 'Road closure ahead on Highway 101',
    senderId: 'driver1',
    senderName: 'John Doe',
    timestamp: Date.now(),
    priority: 'critical', // Updated to match TeamMessage interface ('normal', 'high', 'critical')  
    read: false
  };

  const mockComparison: DriverComparison = {
    id: 'comp1',
    driverAId: 'driver1',
    driverBId: 'driver2',
    timestamp: Date.now(),
    metrics: [
      {
        name: 'speed',
        driverA: { value: 65, delta: 5 },
        driverB: { value: 0, delta: 0 }
      },
      {
        name: 'fuelLevel',
        driverA: { value: 75, delta: -5 },
        driverB: { value: 90, delta: 0 }
      }
    ]
  };

  describe('initial state', () => {
    test('should return the initial state', () => {
      const initialState = driversReducer(undefined, { type: '' });
      expect(initialState).toEqual({
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      });
    });
  });

  describe('driver actions', () => {
    test('should handle setDrivers', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, setDrivers(mockDrivers));
      
      expect(nextState.drivers).toEqual(mockDrivers);
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBeNull();
    });

    test('should handle setActiveDriver', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, setActiveDriver('driver1'));
      
      expect(nextState.activeDriverId).toEqual('driver1');
    });

    test('should handle updateDriver for existing driver', () => {
      const initialState = {
        drivers: [...mockDrivers],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const updatedDriver: DriverProfile = {
        id: 'driver1',
        name: 'John Doe',
        team: 'Team Alpha',
        role: 'primary',
        status: 'offline',
        stats: {
          totalLaps: 42,
          bestLap: 90.5,
          consistencyRating: 9.0,
          lastActive: Date.now()
        },
        preferences: {
          displayUnits: 'metric',
          telemetryHighlights: ['speed', 'fuelLevel'],
          uiTheme: 'default'
        }
      };
      
      const nextState = driversReducer(initialState, updateDriver(updatedDriver));
      
      expect(nextState.drivers).toHaveLength(2);
      expect(nextState.drivers[0]).toEqual(updatedDriver);
      expect(nextState.drivers[1]).toEqual(mockDrivers[1]);
    });

    test('should handle updateDriver for new driver', () => {
      const initialState = {
        drivers: [...mockDrivers],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const newDriver: DriverProfile = {
        id: 'driver3',
        name: 'Alex Johnson',
        team: 'Team Beta',
        role: 'reserve',
        status: 'active',
        stats: {
          totalLaps: 28,
          bestLap: 93.2,
          consistencyRating: 7.5,
          lastActive: Date.now()
        },
        preferences: {
          displayUnits: 'imperial',
          telemetryHighlights: ['engineTemp', 'brakePressure'],
          uiTheme: 'high-contrast'
        }
      };
      
      const nextState = driversReducer(initialState, updateDriver(newDriver));
      
      expect(nextState.drivers).toHaveLength(3);
      expect(nextState.drivers[2]).toBeDefined();
      if (nextState.drivers[2]) {
        expect(nextState.drivers[2]).toEqual(newDriver);
      }
    });
  });

  describe('handoff actions', () => {
    test('should handle requestHandoff', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, requestHandoff({
        fromDriverId: 'driver1',
        toDriverId: 'driver2',
        notes: 'Taking a break, please take over'
      }));
      
      expect(nextState.loading).toBe(true);
    });

    test('should handle addHandoffRequest', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [],
        loading: true,
        error: null
      };
      
      const nextState = driversReducer(initialState, addHandoffRequest(mockHandoffRequest));
      
      expect(nextState.pendingHandoffs).toHaveLength(1);
      expect(nextState.pendingHandoffs[0]).toEqual(mockHandoffRequest);
      expect(nextState.loading).toBe(false);
    });

    test('should handle updateHandoffStatus for confirmed status', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [mockHandoffRequest],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const nextState = driversReducer(initialState, updateHandoffStatus({
        id: 'handoff1',
        status: 'confirmed'
      }));
      
      expect(nextState.pendingHandoffs).toHaveLength(1);
      expect(nextState.pendingHandoffs[0].status).toBe('confirmed');
    });

    test('should handle updateHandoffStatus for completed status (removes handoff)', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [mockHandoffRequest],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const nextState = driversReducer(initialState, updateHandoffStatus({
        id: 'handoff1',
        status: 'completed'
      }));
      
      expect(nextState.pendingHandoffs).toHaveLength(0);
    });

    test('should handle updateHandoffStatus for cancelled status (removes handoff)', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [mockHandoffRequest],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const nextState = driversReducer(initialState, updateHandoffStatus({
        id: 'handoff1',
        status: 'cancelled'
      }));
      
      expect(nextState.pendingHandoffs).toHaveLength(0);
    });
  });

  describe('team message actions', () => {
    test('should handle sendTeamMessage', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, sendTeamMessage({
        content: 'Road closure ahead on Highway 101',
        senderId: 'driver1',
        senderName: 'John Doe',
        priority: 'critical'
      }));
      
      expect(nextState.loading).toBe(true);
    });

    test('should handle addTeamMessage', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [],
        loading: true,
        error: null
      };
      
      const message: TeamMessage = {
        id: 'msg1',
        content: 'Road closure ahead on Highway 101',
        senderId: 'driver1',
        senderName: 'John Doe',
        timestamp: Date.now(),
        priority: 'critical',
        read: false
      };
      const nextState = driversReducer(initialState, addTeamMessage(message));
      
      expect(nextState.teamMessages).toHaveLength(1);
      expect(nextState.teamMessages[0]).toEqual({
        id: 'msg1',
        content: 'Road closure ahead on Highway 101',
        senderId: 'driver1',
        senderName: 'John Doe',
        timestamp: expect.any(Number),
        priority: 'critical',
        read: false
      });
      expect(nextState.loading).toBe(false);
    });

    test('should handle markMessageRead', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [mockTeamMessage],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const nextState = driversReducer(initialState, markMessageRead('msg1'));
      
      expect(nextState.teamMessages[0]?.read).toBe(true);
    });

    test('should handle markAllMessagesRead', () => {
      const unreadMessage1: TeamMessage = { ...mockTeamMessage, id: 'msg1', read: false };
      const unreadMessage2: TeamMessage = { ...mockTeamMessage, id: 'msg2', read: false };
      
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [unreadMessage1, unreadMessage2],
        activeComparisons: [],
        loading: false,
        error: null
      };
      
      const nextState = driversReducer(initialState, markAllMessagesRead());
      
      expect(nextState.teamMessages[0]?.read).toBe(true);
      expect(nextState.teamMessages[1]?.read).toBe(true);
    });
  });

  describe('comparison actions', () => {
    test('should handle addComparison', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, addComparison(mockComparison));
      
      expect(nextState.activeComparisons).toHaveLength(1);
      expect(nextState.activeComparisons[0]).toEqual(mockComparison);
    });

    test('should handle updateComparison for existing comparison', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [mockComparison],
        loading: false,
        error: null
      };
      
      const updatedComparison: DriverComparison = {
        ...mockComparison,
        metrics: [
          {
            name: 'speed',
            driverA: { value: 70, delta: 10 },
            driverB: { value: 5, delta: 5 }
          }
        ]
      };
      
      const nextState = driversReducer(initialState, updateComparison(updatedComparison));
      
      expect(nextState.activeComparisons).toHaveLength(1);
      expect(nextState.activeComparisons[0]).toEqual(updatedComparison);
    });

    test('should handle updateComparison for new comparison', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [mockComparison],
        loading: false,
        error: null
      };
      
      const newComparison: DriverComparison = {
        ...mockComparison,
        id: 'comp2',
        driverAId: 'driver2',
        driverBId: 'driver3'
      };
      
      const nextState = driversReducer(initialState, updateComparison(newComparison));
      
      expect(nextState.activeComparisons).toHaveLength(2);
      expect(nextState.activeComparisons[1]).toEqual(newComparison);
    });

    test('should handle removeComparison', () => {
      const initialState = {
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [mockComparison],
        loading: false,
        error: null
      };
      
      const nextState = driversReducer(initialState, removeComparison('comp1'));
      
      expect(nextState.activeComparisons).toHaveLength(0);
    });
  });

  describe('loading and error actions', () => {
    test('should handle setLoading', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, setLoading(true));
      
      expect(nextState.loading).toBe(true);
    });

    test('should handle setError', () => {
      const initialState = driversReducer(undefined, { type: '' });
      const nextState = driversReducer(initialState, setError('Failed to connect to server'));
      
      expect(nextState.error).toBe('Failed to connect to server');
      expect(nextState.loading).toBe(false);
    });

    test('should handle resetDriversState', () => {
      const initialState = {
        drivers: mockDrivers,
        activeDriverId: 'driver1',
        pendingHandoffs: [mockHandoffRequest],
        teamMessages: [mockTeamMessage],
        activeComparisons: [mockComparison],
        loading: true,
        error: 'Some error'
      };
      
      const nextState = driversReducer(initialState, resetDriversState());
      
      expect(nextState).toEqual({
        drivers: [],
        activeDriverId: null,
        pendingHandoffs: [],
        teamMessages: [],
        activeComparisons: [],
        loading: false,
        error: null
      });
    });
  });
});
