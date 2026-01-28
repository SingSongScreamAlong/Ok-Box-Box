// Mock Data Service - Central export point
// This acts as the "API" layer that components consume
// When ready to switch to real data, just change the implementations here

export * from './types';
export * from './data';
export { mockTelemetryService } from './MockTelemetryService';
