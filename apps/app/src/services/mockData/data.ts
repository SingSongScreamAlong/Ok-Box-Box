// Mock data that simulates what would come from the database/API
import type { Driver, Team, TeamCar, Track, RaceEvent, RacePlan, Stint, RadioChannel } from './types';

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
