import { supabase } from './supabase';

// Types
export interface WeatherConditions {
  condition: 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'heavy-rain' | 'snow';
  temperature: number; // Fahrenheit
  trackTemp: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number; // miles
  pressure: number; // hPa
  rainChance: number; // percentage
  updatedAt: string;
}

export interface WeatherForecast {
  time: string;
  condition: WeatherConditions['condition'];
  temperature: number;
  rainChance: number;
  windSpeed: number;
}

export interface TrackWeather {
  trackId: string;
  trackName: string;
  current: WeatherConditions;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
}

export interface WeatherAlert {
  id: string;
  type: 'rain' | 'storm' | 'heat' | 'cold' | 'wind';
  severity: 'low' | 'medium' | 'high';
  message: string;
  startsAt: string;
  endsAt?: string;
}

// Demo data
function generateDemoWeather(trackId: string): TrackWeather {
  const conditions: WeatherConditions['condition'][] = ['clear', 'partly-cloudy', 'cloudy', 'rain'];
  const currentCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const baseTemp = 65 + Math.random() * 25;
  
  const forecast: WeatherForecast[] = [];
  let forecastCondition = currentCondition;
  
  for (let i = 0; i < 6; i++) {
    // Weather can change over time
    if (Math.random() > 0.7) {
      const idx = conditions.indexOf(forecastCondition);
      forecastCondition = conditions[Math.min(conditions.length - 1, Math.max(0, idx + (Math.random() > 0.5 ? 1 : -1)))];
    }
    
    forecast.push({
      time: i === 0 ? 'Now' : `+${i}h`,
      condition: forecastCondition,
      temperature: baseTemp + (Math.random() - 0.5) * 10 - i * 2,
      rainChance: forecastCondition === 'rain' ? 70 + Math.random() * 25 : 
                  forecastCondition === 'cloudy' ? 30 + Math.random() * 30 : 
                  Math.random() * 20,
      windSpeed: 5 + Math.random() * 15
    });
  }
  
  const alerts: WeatherAlert[] = [];
  if (forecast.some(f => f.rainChance > 60)) {
    alerts.push({
      id: 'alert_rain',
      type: 'rain',
      severity: forecast.some(f => f.rainChance > 80) ? 'high' : 'medium',
      message: 'Rain expected during session. Consider wet tire strategy.',
      startsAt: new Date(Date.now() + 3600000).toISOString()
    });
  }
  
  return {
    trackId,
    trackName: getTrackName(trackId),
    current: {
      condition: currentCondition,
      temperature: Math.round(baseTemp),
      trackTemp: Math.round(baseTemp + 20 + Math.random() * 15),
      humidity: Math.round(40 + Math.random() * 40),
      windSpeed: Math.round(5 + Math.random() * 15),
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      visibility: Math.round(8 + Math.random() * 4),
      pressure: Math.round(1010 + Math.random() * 20),
      rainChance: currentCondition === 'rain' ? 85 : currentCondition === 'cloudy' ? 40 : 10,
      updatedAt: new Date().toISOString()
    },
    forecast,
    alerts
  };
}

function getTrackName(trackId: string): string {
  const tracks: Record<string, string> = {
    'daytona': 'Daytona International Speedway',
    'spa': 'Spa-Francorchamps',
    'nurburgring': 'Nürburgring GP',
    'laguna': 'Laguna Seca',
    'suzuka': 'Suzuka Circuit',
    'monza': 'Autodromo Nazionale Monza',
    'silverstone': 'Silverstone Circuit',
    'lemans': 'Circuit de la Sarthe'
  };
  return tracks[trackId] || trackId;
}

// API Functions
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchTrackWeather(trackId: string): Promise<TrackWeather> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/weather/${trackId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch weather');
    return await response.json();
  } catch (error) {
    console.warn('Using demo weather data:', error);
    return generateDemoWeather(trackId);
  }
}

export async function fetchMultiTrackWeather(trackIds: string[]): Promise<TrackWeather[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/v1/weather?tracks=${trackIds.join(',')}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch weather');
    return await response.json();
  } catch (error) {
    console.warn('Using demo weather data:', error);
    return trackIds.map(id => generateDemoWeather(id));
  }
}

// Real-time weather subscription (for live sessions)
export function subscribeToWeather(
  trackId: string, 
  callback: (weather: WeatherConditions) => void
): () => void {
  // In production, this would connect to a WebSocket for real-time updates
  // For demo, simulate updates every 30 seconds
  const interval = setInterval(() => {
    const weather = generateDemoWeather(trackId);
    callback(weather.current);
  }, 30000);
  
  // Initial call
  const weather = generateDemoWeather(trackId);
  callback(weather.current);
  
  // Return unsubscribe function
  return () => clearInterval(interval);
}

// Utility functions
export function getWeatherIcon(condition: WeatherConditions['condition']): string {
  const icons: Record<WeatherConditions['condition'], string> = {
    'clear': '☀️',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'rain': '🌧️',
    'heavy-rain': '⛈️',
    'snow': '❄️'
  };
  return icons[condition];
}

export function getWeatherDescription(condition: WeatherConditions['condition']): string {
  const descriptions: Record<WeatherConditions['condition'], string> = {
    'clear': 'Clear skies',
    'partly-cloudy': 'Partly cloudy',
    'cloudy': 'Overcast',
    'rain': 'Light rain',
    'heavy-rain': 'Heavy rain',
    'snow': 'Snow'
  };
  return descriptions[condition];
}

export function shouldConsiderWetTires(weather: WeatherConditions): boolean {
  return weather.condition === 'rain' || 
         weather.condition === 'heavy-rain' || 
         weather.rainChance > 70;
}

export function getGripLevel(weather: WeatherConditions): 'optimal' | 'good' | 'reduced' | 'low' {
  if (weather.condition === 'heavy-rain') return 'low';
  if (weather.condition === 'rain') return 'reduced';
  if (weather.trackTemp > 120 || weather.trackTemp < 50) return 'reduced';
  if (weather.humidity > 80) return 'good';
  return 'optimal';
}
