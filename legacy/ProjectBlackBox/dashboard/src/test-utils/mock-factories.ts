import { v4 as uuidv4 } from 'uuid';

/**
 * Mock factories for generating test data for multi-driver components
 * These factories help create consistent, realistic test data for unit and integration tests
 */

// Driver profile mock factory
export const createMockDriver = (overrides = {}) => ({
  id: uuidv4(),
  name: 'Test Driver',
  team: 'Test Team',
  number: 1,
  status: 'active',
  role: 'primary',
  avatarUrl: 'https://example.com/avatar.jpg',
  telemetryConnected: true,
  lastActive: new Date().toISOString(),
  ...overrides
});

// Team message mock factory
export const createMockTeamMessage = (overrides = {}) => ({
  id: uuidv4(),
  content: 'Test message content',
  senderId: uuidv4(),
  senderName: 'Test Sender',
  priority: 'normal',
  sentAt: new Date().toISOString(),
  read: false,
  attachment: null,
  ...overrides
});

// Message attachment mock factory
export const createMockAttachment = (overrides = {}) => ({
  type: 'document',
  url: `https://example.com/attachments/${uuidv4()}`,
  name: 'test-attachment.pdf',
  ...overrides
});

// Handoff request mock factory
export const createMockHandoffRequest = (overrides = {}) => ({
  id: uuidv4(),
  requesterId: uuidv4(),
  requesterName: 'Requesting Driver',
  targetDriverId: uuidv4(),
  targetDriverName: 'Target Driver',
  reason: 'Test handoff reason',
  urgency: 'normal',
  requestedAt: new Date().toISOString(),
  status: 'pending',
  telemetrySnapshot: createMockTelemetrySnapshot(),
  ...overrides
});

// Handoff response mock factory
export const createMockHandoffResponse = (overrides = {}) => ({
  requestId: uuidv4(),
  responderId: uuidv4(),
  responderName: 'Responding Driver',
  response: 'confirmed',
  responseAt: new Date().toISOString(),
  notes: 'Test response notes',
  estimatedHandoffTime: new Date(Date.now() + 60000).toISOString(),
  ...overrides
});

// Telemetry snapshot mock factory
export const createMockTelemetrySnapshot = (overrides = {}) => ({
  driverId: uuidv4(),
  driverName: 'Test Driver',
  speed: 120,
  rpm: 8000,
  gear: 4,
  throttle: 0.8,
  brake: 0,
  clutch: 0,
  steering: 0.05,
  fuel: {
    level: 45,
    usagePerHour: 2.5
  },
  tires: {
    frontLeft: { temp: 85, wear: 0.95, pressure: 26 },
    frontRight: { temp: 82, wear: 0.96, pressure: 26 },
    rearLeft: { temp: 88, wear: 0.94, pressure: 25 },
    rearRight: { temp: 86, wear: 0.95, pressure: 25 }
  },
  position: { x: 0, y: 0, z: 0 },
  lap: 10,
  sector: 2,
  lapTime: 75.5,
  sectorTime: 12.3,
  bestLapTime: 74.2,
  deltaToBestLap: 1.3,
  bestSectorTimes: [12.1, 15.4, 14.8],
  gForce: { lateral: 0.1, longitudinal: 0.2, vertical: 0.98 },
  trackPosition: 0.75,
  racePosition: 3,
  gapAhead: 1.2,
  gapBehind: 0.8,
  flags: 0,
  drsStatus: 0,
  carSettings: {
    brakeBias: 54.5,
    abs: 5,
    tractionControl: 5,
    tractionControl2: 5,
    fuelMixture: 1
  },
  energy: {
    batteryPct: 0.95,
    deployPct: 0.1,
    deployMode: 1
  },
  weather: {
    windSpeed: 2.5,
    windDirection: 0.5
  },
  timestamp: Date.now(),
  ...overrides
});

// Validation result mock factory
export const createMockValidationResult = (overrides = {}) => ({
  componentName: 'test-component',
  status: 'success',
  message: 'Component validated successfully',
  timestamp: new Date().toISOString(),
  details: null,
  ...overrides
});

// Multi-driver validation result mock factory
export const createMockMultiDriverValidationResult = (overrides = {}) => ({
  componentName: 'team_messages',
  status: 'success',
  message: 'Multi-driver component validated successfully',
  timestamp: new Date().toISOString(),
  details: {
    driverCount: 2,
    messageCount: 5,
    handoffStatus: 'none',
    validationDuration: 120
  },
  ...overrides
});

// WebSocket event mock factory
export const createMockWebSocketEvent = (type: string, data: any = {}) => ({
  type,
  data
});

// Redux state mock factories
export const createMockDriversState = (overrides = {}) => ({
  drivers: [
    createMockDriver({ id: 'driver-1', name: 'Driver 1', role: 'primary' }),
    createMockDriver({ id: 'driver-2', name: 'Driver 2', role: 'secondary' })
  ],
  activeDriverId: 'driver-1',
  handoffRequests: [],
  teamMessages: [],
  loading: false,
  error: null,
  ...overrides
});

export const createMockRootState = (overrides = {}) => ({
  drivers: createMockDriversState(),
  // Add other slices as needed
  ...overrides
});
