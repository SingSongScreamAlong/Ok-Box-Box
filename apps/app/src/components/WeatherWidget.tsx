import { useState, useEffect } from 'react';
import {
  Cloud, CloudRain, CloudSnow, Sun, CloudSun, Wind,
  Droplets, Thermometer, Eye, AlertTriangle
} from 'lucide-react';

interface WeatherData {
  condition: 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'heavy-rain' | 'snow';
  temperature: number;
  trackTemp: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  rainChance: number;
  forecast: ForecastHour[];
}

interface ForecastHour {
  time: string;
  condition: WeatherData['condition'];
  temperature: number;
  rainChance: number;
}

// Mock weather data
const mockWeather: WeatherData = {
  condition: 'partly-cloudy',
  temperature: 72,
  trackTemp: 98,
  humidity: 65,
  windSpeed: 12,
  windDirection: 'NE',
  visibility: 10,
  rainChance: 15,
  forecast: [
    { time: 'Now', condition: 'partly-cloudy', temperature: 72, rainChance: 15 },
    { time: '+1h', condition: 'cloudy', temperature: 70, rainChance: 25 },
    { time: '+2h', condition: 'cloudy', temperature: 68, rainChance: 40 },
    { time: '+3h', condition: 'rain', temperature: 66, rainChance: 75 },
    { time: '+4h', condition: 'rain', temperature: 64, rainChance: 80 },
  ]
};

function getWeatherIcon(condition: WeatherData['condition'], size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  
  switch (condition) {
    case 'clear':
      return <Sun className={`${sizeClass} text-amber-400`} />;
    case 'partly-cloudy':
      return <CloudSun className={`${sizeClass} text-amber-300`} />;
    case 'cloudy':
      return <Cloud className={`${sizeClass} text-gray-400`} />;
    case 'rain':
      return <CloudRain className={`${sizeClass} text-blue-400`} />;
    case 'heavy-rain':
      return <CloudRain className={`${sizeClass} text-blue-500`} />;
    case 'snow':
      return <CloudSnow className={`${sizeClass} text-blue-200`} />;
  }
}

interface WeatherWidgetProps {
  variant?: 'compact' | 'full' | 'inline';
  trackName?: string;
}

export function WeatherWidget({ variant = 'compact', trackName }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData>(mockWeather);
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate weather updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWeather(prev => ({
        ...prev,
        temperature: prev.temperature + (Math.random() - 0.5) * 2,
        trackTemp: prev.trackTemp + (Math.random() - 0.5) * 3,
        windSpeed: Math.max(0, prev.windSpeed + (Math.random() - 0.5) * 2),
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const hasRainWarning = weather.rainChance > 50 || weather.forecast.some(f => f.rainChance > 60);

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 text-xs">
        {getWeatherIcon(weather.condition, 'sm')}
        <span className="text-white">{Math.round(weather.temperature)}°F</span>
        <span className="text-white/40">Track: {Math.round(weather.trackTemp)}°F</span>
        {hasRainWarning && (
          <span className="flex items-center gap-1 text-blue-400">
            <Droplets className="w-3 h-3" />
            {weather.rainChance}%
          </span>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 hover:bg-white/[0.05] transition-colors text-left w-full"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.condition, 'md')}
            <div>
              <p className="text-sm text-white font-medium">{Math.round(weather.temperature)}°F</p>
              <p className="text-[10px] text-white/40">Track: {Math.round(weather.trackTemp)}°F</p>
            </div>
          </div>
          {hasRainWarning && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-blue-400">
              <Droplets className="w-3 h-3" />
              <span className="text-[10px]">{weather.rainChance}%</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <p className="text-white/40">Wind</p>
                <p className="text-white">{Math.round(weather.windSpeed)} mph {weather.windDirection}</p>
              </div>
              <div>
                <p className="text-white/40">Humidity</p>
                <p className="text-white">{weather.humidity}%</p>
              </div>
              <div>
                <p className="text-white/40">Visibility</p>
                <p className="text-white">{weather.visibility} mi</p>
              </div>
            </div>

            {/* Mini forecast */}
            <div className="mt-3 flex gap-2">
              {weather.forecast.slice(0, 4).map((hour, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <p className="text-[9px] text-white/30">{hour.time}</p>
                  {getWeatherIcon(hour.condition, 'sm')}
                  <p className="text-[10px] text-white/60">{Math.round(hour.temperature)}°</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </button>
    );
  }

  // Full variant
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm text-white font-medium">Weather Conditions</h3>
            {trackName && <p className="text-[10px] text-white/40">{trackName}</p>}
          </div>
          {hasRainWarning && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">Rain Expected</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Conditions */}
      <div className="p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.condition, 'lg')}
            <div>
              <p className="text-3xl font-light text-white">{Math.round(weather.temperature)}°F</p>
              <p className="text-xs text-white/40 capitalize">{weather.condition.replace('-', ' ')}</p>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <div>
                <p className="text-[10px] text-white/40">Track Temp</p>
                <p className="text-sm text-white">{Math.round(weather.trackTemp)}°F</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-white/40">Wind</p>
                <p className="text-sm text-white">{Math.round(weather.windSpeed)} mph {weather.windDirection}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-white/40">Humidity</p>
                <p className="text-sm text-white">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-[10px] text-white/40">Visibility</p>
                <p className="text-sm text-white">{weather.visibility} mi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.06]">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Forecast</p>
        <div className="flex justify-between">
          {weather.forecast.map((hour, idx) => (
            <div key={idx} className="text-center">
              <p className="text-[10px] text-white/40 mb-1">{hour.time}</p>
              {getWeatherIcon(hour.condition, 'sm')}
              <p className="text-xs text-white mt-1">{Math.round(hour.temperature)}°</p>
              {hour.rainChance > 20 && (
                <p className="text-[9px] text-blue-400 mt-0.5">{hour.rainChance}%</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rain probability bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-white/40">Rain Probability</span>
          <span className="text-white">{weather.rainChance}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              weather.rainChance > 60 ? 'bg-blue-500' : 
              weather.rainChance > 30 ? 'bg-blue-400' : 'bg-blue-300'
            }`}
            style={{ width: `${weather.rainChance}%` }}
          />
        </div>
      </div>
    </div>
  );
}
