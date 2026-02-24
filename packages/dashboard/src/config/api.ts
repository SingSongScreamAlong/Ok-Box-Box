/**
 * API Configuration
 * 
 * Centralized API URL configuration.
 * Uses VITE_API_URL env var if set, otherwise defaults to DigitalOcean production.
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';
export const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://octopus-app-qsi3i.ondigitalocean.app';
