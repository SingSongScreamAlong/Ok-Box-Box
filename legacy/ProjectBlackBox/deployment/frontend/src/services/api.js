import axios from 'axios';

// Create axios instance with base URL from environment variable
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || ''
});

// Get latest telemetry data
export const getLatestTelemetry = async () => {
  try {
    const response = await api.get('/telemetry/latest');
    return response.data;
  } catch (error) {
    console.error('Error fetching latest telemetry:', error);
    return null;
  }
};

// Get telemetry data by session ID
export const getSessionTelemetry = async (sessionId) => {
  try {
    const response = await api.get(`/telemetry/session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching telemetry for session ${sessionId}:`, error);
    throw error;
  }
};

// Get telemetry data by driver ID
export const getDriverTelemetry = async (driverId) => {
  try {
    const response = await api.get(`/telemetry/driver/${driverId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching telemetry for driver ${driverId}:`, error);
    throw error;
  }
};

// Get server status
export const getServerStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching server status:', error);
    return { ok: false, error: error.message };
  }
};

export default api;
