// Mock data that simulates what would come from the database/API
import type { 
  Driver, Team, TeamCar, Track, RaceEvent, RacePlan, Stint, RadioChannel,
  RunPlan, DriverStint, StrategyPlan, TeamRoster, RosterMember
} from './types';

export const mockDrivers: Driver[] = [
  {
    id: 'd1',
    name: 'Alex Rivera',
    shortName: 'ALX',
    number: '42',
    color: '#22c55e',
    iRatingRoad: 4250,
    iRatingOval: 3800,
    safetyRating: 4.2,
    avgLapTime: 117000,
    fuelPerLap: 2.8,
    maxStintLaps: 35,
    available: true,
  },
  {
    id: 'd2',
    name: 'Jordan Chen',
    shortName: 'JOR',
    number: '17',
    color: '#3b82f6',
    iRatingRoad: 3950,
    iRatingOval: 4100,
    safetyRating: 3.8,
    avgLapTime: 117500,
    fuelPerLap: 2.9,
    maxStintLaps: 32,
    available: true,
  },
  {
    id: 'd3',
    name: 'Sam Williams',
    shortName: 'SAM',
    number: '88',
    color: '#f97316',
    iRatingRoad: 3600,
    iRatingOval: 3400,
    safetyRating: 3.5,
    avgLapTime: 118000,
    fuelPerLap: 3.0,
    maxStintLaps: 30,
    available: true,
    notes: 'Available after 6 PM EST',
  },
  {
    id: 'd4',
    name: 'Casey Morgan',
    shortName: 'CAS',
    number: '23',
    color: '#a855f7',
    iRatingRoad: 3200,
    iRatingOval: 3100,
    safetyRating: 4.0,
    avgLapTime: 117200,
    fuelPerLap: 2.85,
    maxStintLaps: 33,
    available: false,
    notes: 'Unavailable Jan 28-30',
  },
];

export const mockTeamCars: TeamCar[] = [
  {
    id: 'car1',
    number: '42',
    name: 'Primary',
    class: 'GTP',
    color: '#22c55e',
    assignedDrivers: ['d1', 'd2'],
  },
  {
    id: 'car2',
    number: '43',
    name: 'Secondary',
    class: 'GTP',
    color: '#3b82f6',
    assignedDrivers: ['d3', 'd4'],
  },
];

export const mockTeam: Team = {
  id: 'team-demo',
  name: 'Velocity Racing',
  shortName: 'VEL',
  color: '#22c55e',
  drivers: ['d1', 'd2', 'd3', 'd4'],
  cars: mockTeamCars,
};

export const mockTracks: Track[] = [
  {
    id: '191',
    name: 'Daytona International Speedway',
    shortName: 'Daytona',
    config: '24 Hours of Daytona',
    length: 5.73,
    turns: 12,
    pitLaneTime: 25,
  },
  {
    id: '192',
    name: 'Circuit de Spa-Francorchamps',
    shortName: 'Spa',
    config: 'Grand Prix',
    length: 7.004,
    turns: 19,
    pitLaneTime: 28,
  },
  {
    id: '193',
    name: 'Sebring International Raceway',
    shortName: 'Sebring',
    config: 'Full Course',
    length: 6.02,
    turns: 17,
    pitLaneTime: 30,
  },
];

export const mockEvents: RaceEvent[] = [
  {
    id: 'evt1',
    name: 'Daytona 24 Practice 1',
    trackId: '191',
    type: 'practice',
    status: 'scheduled',
    date: '2026-01-28',
    time: '19:00',
    duration: '2h',
    raceType: 'timed',
    totalTime: 120,
    assignedDrivers: ['d1', 'd2', 'd3'],
    notes: 'Focus on long run pace, tire deg analysis. Alex to open stint.',
  },
  {
    id: 'evt2',
    name: 'Daytona 24 Practice 2',
    trackId: '191',
    type: 'practice',
    status: 'scheduled',
    date: '2026-01-29',
    time: '14:00',
    duration: '2h',
    raceType: 'timed',
    totalTime: 120,
    assignedDrivers: ['d1', 'd4'],
    notes: 'Casey training focus. Baseline setup validation.',
  },
  {
    id: 'evt3',
    name: 'Daytona 24 Qualifying',
    trackId: '191',
    type: 'qualifying',
    status: 'scheduled',
    date: '2026-01-30',
    time: '18:00',
    duration: '30m',
    raceType: 'timed',
    totalTime: 30,
    assignedDrivers: ['d1'],
    notes: 'Alex quali driver. Target: Top 5 starting position.',
  },
  {
    id: 'evt4',
    name: 'Daytona 24 Hours',
    trackId: '191',
    type: 'endurance',
    status: 'confirmed',
    date: '2026-02-01',
    time: '13:30',
    duration: '24h',
    raceType: 'timed',
    totalTime: 1440,
    assignedDrivers: ['d1', 'd2', 'd3', 'd4'],
    notes: 'Full team endurance. Triple stint rotation. Safety car strategy prepared.',
    racePlanId: 'plan-daytona-a',
  },
];

// Stint data for race plans
const daytonaStintsA: Stint[] = [
  { id: 's1', driverId: 'd1', startLap: 1, endLap: 30, laps: 30, fuelLoad: 95, tireCompound: 'medium', estimatedTime: 3510000, notes: 'Opening stint - conservative' },
  { id: 's2', driverId: 'd2', startLap: 31, endLap: 60, laps: 30, fuelLoad: 95, tireCompound: 'medium', estimatedTime: 3525000, notes: 'Build gap if possible' },
  { id: 's3', driverId: 'd3', startLap: 61, endLap: 90, laps: 30, fuelLoad: 95, tireCompound: 'hard', estimatedTime: 3540000, notes: 'Night stint - tire save' },
  { id: 's4', driverId: 'd1', startLap: 91, endLap: 120, laps: 30, fuelLoad: 95, tireCompound: 'medium', estimatedTime: 3510000, notes: 'Final push to finish' },
];

const daytonaStintsB: Stint[] = [
  { id: 's1b', driverId: 'd1', startLap: 1, endLap: 25, laps: 25, fuelLoad: 80, tireCompound: 'soft', estimatedTime: 2875000, notes: 'Fast start - build lead' },
  { id: 's2b', driverId: 'd2', startLap: 26, endLap: 50, laps: 25, fuelLoad: 80, tireCompound: 'soft', estimatedTime: 2937500, notes: 'Maintain pace' },
  { id: 's3b', driverId: 'd3', startLap: 51, endLap: 75, laps: 25, fuelLoad: 80, tireCompound: 'medium', estimatedTime: 2950000, notes: 'Transition stint' },
  { id: 's4b', driverId: 'd1', startLap: 76, endLap: 100, laps: 25, fuelLoad: 80, tireCompound: 'medium', estimatedTime: 2925000, notes: 'Push for position' },
  { id: 's5b', driverId: 'd2', startLap: 101, endLap: 120, laps: 20, fuelLoad: 65, tireCompound: 'soft', estimatedTime: 2350000, notes: 'Sprint finish' },
];

const daytonaStintsC: Stint[] = [
  { id: 's1c', driverId: 'd1', startLap: 1, endLap: 35, laps: 35, fuelLoad: 110, tireCompound: 'hard', estimatedTime: 4095000, notes: 'Extended opening - wait for SC' },
  { id: 's2c', driverId: 'd2', startLap: 36, endLap: 70, laps: 35, fuelLoad: 110, tireCompound: 'hard', estimatedTime: 4112500, notes: 'Long stint - fuel save' },
  { id: 's3c', driverId: 'd3', startLap: 71, endLap: 105, laps: 35, fuelLoad: 110, tireCompound: 'medium', estimatedTime: 4130000, notes: 'Night running' },
  { id: 's4c', driverId: 'd1', startLap: 106, endLap: 120, laps: 15, fuelLoad: 50, tireCompound: 'soft', estimatedTime: 1755000, notes: 'Sprint to end' },
];

export const mockRacePlans: RacePlan[] = [
  {
    id: 'plan-daytona-a',
    eventId: 'evt4',
    name: 'Plan A - Standard',
    variant: 'A',
    isActive: true,
    stints: daytonaStintsA,
    totalLaps: 120,
    estimatedTime: 14085000,
    fuelUsed: 380,
    pitStops: 3,
  },
  {
    id: 'plan-daytona-b',
    eventId: 'evt4',
    name: 'Plan B - Aggressive',
    variant: 'B',
    isActive: false,
    stints: daytonaStintsB,
    totalLaps: 120,
    estimatedTime: 14037500,
    fuelUsed: 385,
    pitStops: 4,
  },
  {
    id: 'plan-daytona-c',
    eventId: 'evt4',
    name: 'Plan C - Safety Car',
    variant: 'C',
    isActive: false,
    stints: daytonaStintsC,
    totalLaps: 120,
    estimatedTime: 14092500,
    fuelUsed: 380,
    pitStops: 3,
  },
];

export const mockRadioChannels: RadioChannel[] = [
  // Alex group
  { id: 'alex-driver', name: 'Alex Rivera', shortName: 'ALEX', type: 'driver', driverId: 'd1', volume: 100, muted: false, active: true, speaking: false, color: '#22c55e' },
  { id: 'alex-eng', name: 'Alex Engineer', shortName: 'ENG', type: 'crew', driverId: 'd1', volume: 100, muted: false, active: true, speaking: true, color: '#22c55e' },
  { id: 'alex-spot', name: 'Alex Spotter', shortName: 'SPOT', type: 'crew', driverId: 'd1', volume: 90, muted: false, active: true, speaking: false, color: '#22c55e' },
  // Jordan group
  { id: 'jordan-driver', name: 'Jordan Chen', shortName: 'JORDAN', type: 'driver', driverId: 'd2', volume: 80, muted: false, active: false, speaking: false, color: '#3b82f6' },
  { id: 'jordan-eng', name: 'Jordan Engineer', shortName: 'ENG', type: 'crew', driverId: 'd2', volume: 60, muted: false, active: false, speaking: false, color: '#3b82f6' },
  { id: 'jordan-spot', name: 'Jordan Spotter', shortName: 'SPOT', type: 'crew', driverId: 'd2', volume: 60, muted: false, active: false, speaking: false, color: '#3b82f6' },
  // Sam group
  { id: 'sam-driver', name: 'Sam Williams', shortName: 'SAM', type: 'driver', driverId: 'd3', volume: 80, muted: false, active: false, speaking: false, color: '#f97316' },
  { id: 'sam-eng', name: 'Sam Engineer', shortName: 'ENG', type: 'crew', driverId: 'd3', volume: 60, muted: false, active: false, speaking: false, color: '#f97316' },
  { id: 'sam-spot', name: 'Sam Spotter', shortName: 'SPOT', type: 'crew', driverId: 'd3', volume: 60, muted: false, active: false, speaking: false, color: '#f97316' },
  // Casey group
  { id: 'casey-driver', name: 'Casey Morgan', shortName: 'CASEY', type: 'driver', driverId: 'd4', volume: 80, muted: true, active: false, speaking: false, color: '#a855f7' },
  { id: 'casey-eng', name: 'Casey Engineer', shortName: 'ENG', type: 'crew', driverId: 'd4', volume: 60, muted: true, active: false, speaking: false, color: '#a855f7' },
  { id: 'casey-spot', name: 'Casey Spotter', shortName: 'SPOT', type: 'crew', driverId: 'd4', volume: 60, muted: true, active: false, speaking: false, color: '#a855f7' },
  // Team channels
  { id: 'team-all', name: 'All Team', shortName: 'TEAM', type: 'team', volume: 100, muted: false, active: true, speaking: false },
  { id: 'all-drivers', name: 'All Drivers', shortName: 'ALL DRV', type: 'team', volume: 100, muted: false, active: false, speaking: false },
  { id: 'strategy', name: 'Strategy', shortName: 'STRAT', type: 'team', volume: 50, muted: false, active: false, speaking: false },
  { id: 'pitcrew', name: 'Pit Crew', shortName: 'PIT', type: 'team', volume: 70, muted: false, active: false, speaking: false },
];

// Practice Run Plans
export const mockRunPlans: RunPlan[] = [
  {
    id: 'rp1',
    name: 'Long Run Simulation',
    targetLaps: 30,
    completedLaps: 30,
    targetTime: '1:48.000',
    focus: ['Tire degradation curve', 'Fuel consumption mapping', 'Consistency under load'],
    status: 'completed',
    notes: 'Completed. Tire deg 0.08s/lap on mediums. Fuel 2.78L/lap avg.'
  },
  {
    id: 'rp2',
    name: 'Qualifying Simulation',
    targetLaps: 5,
    completedLaps: 3,
    targetTime: '1:46.500',
    focus: ['Single lap pace', 'Optimal tire prep', 'Track position'],
    status: 'in_progress',
    notes: 'Current best 1:46.892. Gap to target: +0.392s'
  },
  {
    id: 'rp3',
    name: 'Race Start Practice',
    targetLaps: 10,
    completedLaps: 0,
    focus: ['Launch technique', 'Turn 1 positioning', 'First lap survival'],
    status: 'planned'
  },
  {
    id: 'rp4',
    name: 'Traffic Management',
    targetLaps: 15,
    completedLaps: 0,
    focus: ['Multiclass awareness', 'Safe overtaking', 'Defensive positioning'],
    status: 'planned'
  },
];

// Practice Driver Stints
export const mockDriverStints: DriverStint[] = [
  {
    driverId: 'd1',
    driverName: 'Alex Rivera',
    laps: 47,
    bestLap: '1:46.234',
    bestLapMs: 106234,
    avgLap: '1:47.892',
    avgLapMs: 107892,
    consistency: 98.2,
    incidents: 0,
    fuelPerLap: 2.78,
    tireDegPerLap: 0.08,
    sectors: { s1Best: '32.456', s2Best: '41.234', s3Best: '32.544' },
    theoreticalBest: '1:46.012',
    gapToLeader: '-',
    lapHistory: []
  },
  {
    driverId: 'd2',
    driverName: 'Jordan Chen',
    laps: 38,
    bestLap: '1:46.892',
    bestLapMs: 106892,
    avgLap: '1:48.234',
    avgLapMs: 108234,
    consistency: 96.8,
    incidents: 1,
    fuelPerLap: 2.85,
    tireDegPerLap: 0.09,
    sectors: { s1Best: '32.678', s2Best: '41.456', s3Best: '32.758' },
    theoreticalBest: '1:46.456',
    gapToLeader: '+0.658',
    lapHistory: []
  },
  {
    driverId: 'd3',
    driverName: 'Sam Williams',
    laps: 25,
    bestLap: '1:47.456',
    bestLapMs: 107456,
    avgLap: '1:49.012',
    avgLapMs: 109012,
    consistency: 94.5,
    incidents: 2,
    fuelPerLap: 2.92,
    tireDegPerLap: 0.11,
    sectors: { s1Best: '33.012', s2Best: '41.678', s3Best: '32.766' },
    theoreticalBest: '1:47.012',
    gapToLeader: '+1.222',
    lapHistory: []
  },
];

// Strategy Plan
export const mockStrategyPlan: StrategyPlan = {
  id: 'strat1',
  eventId: 'evt4',
  eventName: 'Daytona 24 Hours',
  trackName: 'Daytona International Speedway',
  carClass: 'GTP',
  raceDuration: '24h',
  raceType: 'timed',
  totalLaps: 750,
  avgLapTime: 115.2,
  fuelPerLap: 2.8,
  fuelPerLapSave: 2.45,
  tankCapacity: 100,
  pitTimeLoss: 45,
  pitLaneDelta: 38,
  minPitTime: 7,
  mandatoryStops: 0,
  tireSetsAvailable: { soft: 2, medium: 6, hard: 4, wet: 2, inter: 2 },
  stints: [
    { stint: 1, driverId: 'd1', driverName: 'Alex Rivera', startLap: 1, endLap: 35, fuelLoad: 100, tireCompound: 'medium', tireAge: 0, expectedDeg: 0.12, pitInWindow: { earliest: 32, latest: 37 }, fuelSaveMode: false, predictedLapTime: '1:55.2', predictedTotalTime: '1:07:12' },
    { stint: 2, driverId: 'd2', driverName: 'Jordan Chen', startLap: 36, endLap: 70, fuelLoad: 100, tireCompound: 'medium', tireAge: 0, expectedDeg: 0.12, pitInWindow: { earliest: 67, latest: 72 }, fuelSaveMode: false, predictedLapTime: '1:55.4', predictedTotalTime: '1:07:29' },
    { stint: 3, driverId: 'd3', driverName: 'Sam Williams', startLap: 71, endLap: 105, fuelLoad: 100, tireCompound: 'hard', tireAge: 0, expectedDeg: 0.08, pitInWindow: { earliest: 102, latest: 108 }, fuelSaveMode: false, predictedLapTime: '1:56.1', predictedTotalTime: '1:08:08', notes: 'Night transition - track cooling' },
    { stint: 4, driverId: 'd4', driverName: 'Casey Morgan', startLap: 106, endLap: 140, fuelLoad: 100, tireCompound: 'hard', tireAge: 0, expectedDeg: 0.08, pitInWindow: { earliest: 137, latest: 143 }, fuelSaveMode: false, predictedLapTime: '1:56.3', predictedTotalTime: '1:08:20' },
    { stint: 5, driverId: 'd1', driverName: 'Alex Rivera', startLap: 141, endLap: 175, fuelLoad: 100, tireCompound: 'medium', tireAge: 0, expectedDeg: 0.10, pitInWindow: { earliest: 172, latest: 178 }, fuelSaveMode: true, predictedLapTime: '1:56.8', predictedTotalTime: '1:08:48', notes: 'Fuel save for safety car buffer' },
  ],
  pitStops: [
    { lap: 35, duration: 45, fuelAdded: 100, tireChange: true, newCompound: 'medium', driverChange: true, newDriver: 'd2' },
    { lap: 70, duration: 45, fuelAdded: 100, tireChange: true, newCompound: 'hard', driverChange: true, newDriver: 'd3' },
    { lap: 105, duration: 45, fuelAdded: 100, tireChange: true, newCompound: 'hard', driverChange: true, newDriver: 'd4' },
    { lap: 140, duration: 45, fuelAdded: 100, tireChange: true, newCompound: 'medium', driverChange: true, newDriver: 'd1' },
  ],
  weatherForecast: [
    { time: '13:30', condition: 'clear', trackTemp: 32, airTemp: 24, humidity: 65, windSpeed: 12, rainChance: 5 },
    { time: '18:00', condition: 'cloudy', trackTemp: 28, airTemp: 22, humidity: 70, windSpeed: 15, rainChance: 15 },
    { time: '00:00', condition: 'clear', trackTemp: 18, airTemp: 16, humidity: 80, windSpeed: 8, rainChance: 10 },
    { time: '06:00', condition: 'cloudy', trackTemp: 15, airTemp: 14, humidity: 85, windSpeed: 10, rainChance: 25 },
    { time: '12:00', condition: 'clear', trackTemp: 28, airTemp: 22, humidity: 60, windSpeed: 14, rainChance: 5 },
  ],
  tireModels: [
    { compound: 'soft', baseGrip: 100, degPerLap: 0.18, optimalWindow: { start: 1, end: 15 }, cliffLap: 20 },
    { compound: 'medium', baseGrip: 95, degPerLap: 0.12, optimalWindow: { start: 1, end: 30 }, cliffLap: 40 },
    { compound: 'hard', baseGrip: 88, degPerLap: 0.08, optimalWindow: { start: 5, end: 45 }, cliffLap: 55 },
  ],
  optimalStrategy: '4-stop with medium/hard rotation, driver changes every ~35 laps',
  alternativeStrategies: ['3-stop aggressive on softs for track position', '5-stop conservative for safety car lottery'],
  riskAssessment: { level: 'medium', factors: ['Night rain possible', 'High traffic multiclass', 'Driver fatigue management'] }
};

// Team Roster
export const mockRoster: TeamRoster = {
  teamId: 'team-demo',
  teamName: 'Velocity Racing',
  memberCount: 4,
  members: [
    {
      membershipId: '1',
      driverId: 'd1',
      userId: 'u1',
      displayName: 'Alex Rivera',
      role: 'owner',
      accessScope: 'team_deep',
      joinedAt: '2025-06-15T10:00:00Z',
      totalSessions: 42,
      totalLaps: 1847,
      avgIncidentRate: 1.8,
      traits: ['Consistent', 'Fuel Saver', 'Night Specialist'],
      irating: 4856,
      safetyRating: 4.67,
      linkedAccount: {
        okBoxBoxId: 'obb-u1-driver',
        tier: 'driver',
        linkedAt: '2025-06-15T10:00:00Z',
        email: 'alex.rivera@email.com'
      },
      idpSummary: {
        totalGoals: 5,
        achieved: 2,
        inProgress: 3,
        priorityFocus: 'Qualifying Pace'
      }
    },
    {
      membershipId: '2',
      driverId: 'd2',
      userId: 'u2',
      displayName: 'Jordan Chen',
      role: 'team_principal',
      accessScope: 'team_deep',
      joinedAt: '2025-08-22T14:30:00Z',
      totalSessions: 38,
      totalLaps: 1523,
      avgIncidentRate: 2.1,
      traits: ['Aggressive', 'Wet Weather', 'Quick Qualifier'],
      irating: 5234,
      safetyRating: 3.21,
      linkedAccount: {
        okBoxBoxId: 'obb-u2-driver',
        tier: 'driver',
        linkedAt: '2025-08-22T14:30:00Z',
        email: 'jordan.chen@email.com'
      },
      idpSummary: {
        totalGoals: 3,
        achieved: 1,
        inProgress: 2,
        priorityFocus: 'Safety Rating'
      }
    },
    {
      membershipId: '3',
      driverId: 'd3',
      userId: 'u3',
      displayName: 'Sam Williams',
      role: 'driver',
      accessScope: 'driver_only',
      joinedAt: '2025-10-01T09:00:00Z',
      totalSessions: 25,
      totalLaps: 892,
      avgIncidentRate: 3.2,
      traits: ['Learning', 'Traffic Aware', 'Improving'],
      irating: 3456,
      safetyRating: 2.89,
      linkedAccount: {
        okBoxBoxId: 'obb-u3-driver',
        tier: 'driver',
        linkedAt: '2025-10-01T09:00:00Z',
        email: 'sam.williams@email.com'
      },
      idpSummary: {
        totalGoals: 4,
        achieved: 0,
        inProgress: 4,
        priorityFocus: 'Consistency'
      }
    },
    {
      membershipId: '4',
      driverId: 'd4',
      userId: 'u4',
      displayName: 'Casey Morgan',
      role: 'driver',
      accessScope: 'driver_only',
      joinedAt: '2025-11-15T16:00:00Z',
      totalSessions: 12,
      totalLaps: 456,
      avgIncidentRate: 2.8,
      traits: ['Rookie', 'Eager', 'Night Owl'],
      irating: 2890,
      safetyRating: 3.12,
      linkedAccount: null,
      idpSummary: {
        totalGoals: 2,
        achieved: 0,
        inProgress: 2,
        priorityFocus: 'Track Learning'
      }
    }
  ]
};
