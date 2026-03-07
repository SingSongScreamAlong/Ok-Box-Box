import { useState, useEffect } from 'react';
import {
  Cloud, CloudRain, CloudSnow, Sun, CloudSun, Wind,
  Droplets, Thermometer, Eye, AlertTriangle
} from 'lucide-react';
import { fetchTrackWeather, type TrackWeather } from '../lib/weatherService';

type WeatherCondition = TrackWeather['current']['condition'];

function getWeatherIcon(condition: WeatherCondition, size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  switch (condition) {
    case 'clear':        return <Sun className={`${sizeClass} text-amber-400`} />;
    case 'partly-cloudy': return <CloudSun className={`${sizeClass} text-amber-300`} />;
    case 'cloudy':       return <Cloud className={`${sizeClass} text-gray-400`} />;
    case 'rain':         return <CloudRain className={`${sizeClass} text-blue-400`} />;
    case 'heavy-rain':   return <CloudRain className={`${sizeClass} text-blue-500`} />;
    case 'snow':         return <CloudSnow className={`${sizeClass} text-blue-200`} />;
  }
}

interface WeatherWidgetProps {
  variant?: 'compact' | 'full' | 'inline';
  trackName?: string;
}

export function WeatherWidget({ variant = 'compact', trackName }: WeatherWidgetProps) {
  const [trackWeather, setTrackWeather] = useState<TrackWeather | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const trackId = trackName
    ? trackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'unknown';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await fetchTrackWeather(trackId);
      if (!cancelled) setTrackWeather(data);
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => { cancelled = true; clearInterval(interval); };
  }, [trackId]);

  const w = trackWeather?.current;
  const forecast = trackWeather?.forecast ?? [];
  const hasRainWarning = (w?.rainChance ?? 0) > 50 || forecast.some(f => f.rainChance > 60);

  if (!w) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 text-white/30 text-xs">
        Loading weather…
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 text-xs">
        {getWeatherIcon(w.condition, 'sm')}
        <span className="text-white">{Math.round(w.temperature)}°F</span>
        <span className="text-white/40">Track: {Math.round(w.trackTemp)}°F</span>
        {hasRainWarning && (
          <span className="flex items-center gap-1 text-blue-400">
            <Droplets className="w-3 h-3" />
            {w.rainChance}%
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
            {getWeatherIcon(w.condition, 'md')}
            <div>
              <p className="text-sm text-white font-medium">{Math.round(w.temperature)}°F</p>
              <p className="text-[10px] text-white/40">Track: {Math.round(w.trackTemp)}°F</p>
            </div>
          </div>
          {hasRainWarning && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-blue-400">
              <Droplets className="w-3 h-3" />
              <span className="text-[10px]">{w.rainChance}%</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <p className="text-white/40">Wind</p>
                <p className="text-white">{Math.round(w.windSpeed)} mph {w.windDirection}</p>
              </div>
              <div>
                <p className="text-white/40">Humidity</p>
                <p className="text-white">{w.humidity}%</p>
              </div>
              <div>
                <p className="text-white/40">Visibility</p>
                <p className="text-white">{w.visibility} mi</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {forecast.slice(0, 4).map((hour, idx) => (
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

      <div className="p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {getWeatherIcon(w.condition, 'lg')}
            <div>
              <p className="text-3xl font-light text-white">{Math.round(w.temperature)}°F</p>
              <p className="text-xs text-white/40 capitalize">{w.condition.replace('-', ' ')}</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <div>
                <p className="text-[10px] text-white/40">Track Temp</p>
                <p className="text-sm text-white">{Math.round(w.trackTemp)}°F</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-white/40">Wind</p>
                <p className="text-sm text-white">{Math.round(w.windSpeed)} mph {w.windDirection}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-white/40">Humidity</p>
                <p className="text-sm text-white">{w.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-[10px] text-white/40">Visibility</p>
                <p className="text-sm text-white">{w.visibility} mi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/[0.02] border-t border-white/[0.06]">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Forecast</p>
        <div className="flex justify-between">
          {forecast.map((hour, idx) => (
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

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-white/40">Rain Probability</span>
          <span className="text-white">{w.rainChance}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              w.rainChance > 60 ? 'bg-blue-500' :
              w.rainChance > 30 ? 'bg-blue-400' : 'bg-blue-300'
            }`}
            style={{ width: `${w.rainChance}%` }}
          />
        </div>
      </div>
    </div>
  );
}
