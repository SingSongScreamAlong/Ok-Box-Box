// Central export for all services
// This makes imports cleaner: import { fetchTeam, fetchLeague } from '@/lib'

// Authentication & Database
export { supabase } from './supabase';

// Driver Services
export * from './driverService';
export * from './driverDevelopment';
export * from './driverProfile';

// Team Services
export * from './teams';

// League Services
export * from './leagues';
export * from './events';
export * from './incidents';
export * from './penalties';
export * from './rulebooks';

// New Services
export * from './telemetryService';
export * from './weatherService';
export * from './stintService';
export * from './broadcastService';
export * from './championshipService';
