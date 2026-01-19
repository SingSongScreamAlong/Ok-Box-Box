/**
 * Dashboard Environment Configuration
 * 
 * All environment variables should be accessed through this module.
 * React apps use REACT_APP_ prefix for environment variables.
 */

export interface DashboardConfig {
    // Backend Services
    BACKEND_URL: string;
    RELAY_AGENT_URL: string;
    WEBSOCKET_URL: string;

    // Feature Flags
    ENABLE_AI_COACHING: boolean;
    ENABLE_VOICE_SYNTHESIS: boolean;
    ENABLE_3D_VISUALIZATION: boolean;

    // UI Configuration
    THEME: 'light' | 'dark';
    REFRESH_INTERVAL_MS: number;

    // Development
    NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Load environment configuration
 */
function loadDashboardConfig(): DashboardConfig {
    const env = process.env;

    return {
        // Backend Services - Use current origin in production
        BACKEND_URL: env.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:3000'),
        RELAY_AGENT_URL: env.REACT_APP_RELAY_AGENT_URL || 'ws://localhost:8765',
        WEBSOCKET_URL: env.REACT_APP_WEBSOCKET_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'ws://localhost:8765'),

        // Feature Flags
        ENABLE_AI_COACHING: env.REACT_APP_ENABLE_AI_COACHING !== 'false',
        ENABLE_VOICE_SYNTHESIS: env.REACT_APP_ENABLE_VOICE_SYNTHESIS !== 'false',
        ENABLE_3D_VISUALIZATION: env.REACT_APP_ENABLE_3D_VISUALIZATION !== 'false',

        // UI Configuration
        THEME: (env.REACT_APP_THEME as any) || 'dark',
        REFRESH_INTERVAL_MS: parseInt(env.REACT_APP_REFRESH_INTERVAL_MS || '1000', 10),

        // Development
        NODE_ENV: (env.NODE_ENV as any) || 'development'
    };
}

// Export singleton instance
export const dashboardConfig: DashboardConfig = loadDashboardConfig();

// Helper functions
export const isProduction = () => dashboardConfig.NODE_ENV === 'production';
export const isDevelopment = () => dashboardConfig.NODE_ENV === 'development';

// Export individual config values for convenience
export const { BACKEND_URL, WEBSOCKET_URL, RELAY_AGENT_URL } = dashboardConfig;
