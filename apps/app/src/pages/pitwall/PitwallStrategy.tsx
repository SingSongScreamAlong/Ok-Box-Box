import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Fuel, Cloud, ChevronDown, ChevronUp, AlertTriangle, TrendingDown, Zap, Timer, Flag, Droplets, Sun, RefreshCw } from 'lucide-react';

// Types - comprehensive strategy modeling
interface StintPlan {
  stint: number;
  driver: string;
  driver_name: string;
  start_lap: number;
  end_lap: number;
  fuel_load: number;
  tire_compound: 'soft' | 'medium' | 'hard' | 'wet' | 'inter';
  tire_age: number; // laps on current set
  expected_deg: number; // % grip loss per lap
  pit_in_window: { earliest: number; latest: number };
  fuel_save_mode: boolean;
  notes?: string;
  predicted_lap_time: string;
  predicted_total_time: string;
}

interface PitStop {
  lap: number;
  duration: number; // seconds
  fuel_added: number;
  tire_change: boolean;
  new_compound?: string;
  driver_change: boolean;
  new_driver?: string;
}

interface WeatherForecast {
  time: string;
  condition: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain';
  track_temp: number;
  air_temp: number;
  humidity: number;
  wind_speed: number;
  rain_chance: number;
}

interface TireDegModel {
  compound: string;
  base_grip: number;
  deg_per_lap: number;
  optimal_window: { start: number; end: number };
  cliff_lap: number; // lap where grip falls off dramatically
}

interface StrategyPlan {
  id: string;
  event_name: string;
  track_name: string;
  car_class: string;
  race_duration: string;
  race_type: 'laps' | 'timed' | 'timed_laps';
  total_laps: number;
  avg_lap_time: number; // seconds
  fuel_per_lap: number;
  fuel_per_lap_save: number; // fuel save mode consumption
  tank_capacity: number;
  pit_time_loss: number;
  pit_lane_delta: number; // time lost in pit lane vs track
  min_pit_time: number; // minimum stationary time
  mandatory_stops: number;
  tire_sets_available: { soft: number; medium: number; hard: number; wet: number; inter: number };
  stints: StintPlan[];
  pit_stops: PitStop[];
  weather_forecast: WeatherForecast[];
  tire_models: TireDegModel[];
  optimal_strategy: string;
  alternative_strategies: string[];
  risk_assessment: { level: 'low' | 'medium' | 'high'; factors: string[] };
}

// Mock data - professional depth
const mockStrategy: StrategyPlan = {
  id: 'strat1',
  event_name: 'Daytona 24 Hours',
  track_name: 'Daytona International Speedway',
  car_class: 'GT3',
  race_duration: '24h',
  race_type: 'timed',
  total_laps: 750,
  avg_lap_time: 115.2,
  fuel_per_lap: 2.8,
  fuel_per_lap_save: 2.45,
  tank_capacity: 100,
  pit_time_loss: 45,
  pit_lane_delta: 38,
  min_pit_time: 7,
  mandatory_stops: 0,
  tire_sets_available: { soft: 2, medium: 6, hard: 4, wet: 2, inter: 2 },
  stints: [
    { stint: 1, driver: 'd1', driver_name: 'Alex Rivera', start_lap: 1, end_lap: 35, fuel_load: 100, tire_compound: 'medium', tire_age: 0, expected_deg: 0.12, pit_in_window: { earliest: 32, latest: 37 }, fuel_save_mode: false, predicted_lap_time: '1:55.2', predicted_total_time: '1:07:12' },
    { stint: 2, driver: 'd2', driver_name: 'Jordan Chen', start_lap: 36, end_lap: 70, fuel_load: 100, tire_compound: 'medium', tire_age: 0, expected_deg: 0.12, pit_in_window: { earliest: 67, latest: 72 }, fuel_save_mode: false, predicted_lap_time: '1:55.4', predicted_total_time: '1:07:29' },
    { stint: 3, driver: 'd3', driver_name: 'Sam Williams', start_lap: 71, end_lap: 105, fuel_load: 100, tire_compound: 'hard', tire_age: 0, expected_deg: 0.08, pit_in_window: { earliest: 102, latest: 108 }, fuel_save_mode: false, predicted_lap_time: '1:56.1', predicted_total_time: '1:08:08', notes: 'Night transition - track cooling' },
    { stint: 4, driver: 'd4', driver_name: 'Casey Morgan', start_lap: 106, end_lap: 140, fuel_load: 100, tire_compound: 'hard', tire_age: 0, expected_deg: 0.08, pit_in_window: { earliest: 137, latest: 143 }, fuel_save_mode: false, predicted_lap_time: '1:56.3', predicted_total_time: '1:08:20' },
    { stint: 5, driver: 'd1', driver_name: 'Alex Rivera', start_lap: 141, end_lap: 175, fuel_load: 100, tire_compound: 'medium', tire_age: 0, expected_deg: 0.10, pit_in_window: { earliest: 172, latest: 178 }, fuel_save_mode: true, predicted_lap_time: '1:56.8', predicted_total_time: '1:08:48', notes: 'Fuel save for safety car buffer' },
  ],
  pit_stops: [
    { lap: 35, duration: 12.4, fuel_added: 100, tire_change: true, new_compound: 'medium', driver_change: true, new_driver: 'Jordan Chen' },
    { lap: 70, duration: 12.1, fuel_added: 100, tire_change: true, new_compound: 'hard', driver_change: true, new_driver: 'Sam Williams' },
    { lap: 105, duration: 11.8, fuel_added: 100, tire_change: true, new_compound: 'hard', driver_change: true, new_driver: 'Casey Morgan' },
    { lap: 140, duration: 12.2, fuel_added: 100, tire_change: true, new_compound: 'medium', driver_change: true, new_driver: 'Alex Rivera' },
  ],
  weather_forecast: [
    { time: '13:30', condition: 'clear', track_temp: 42, air_temp: 28, humidity: 65, wind_speed: 12, rain_chance: 5 },
    { time: '16:00', condition: 'clear', track_temp: 38, air_temp: 26, humidity: 70, wind_speed: 8, rain_chance: 5 },
    { time: '19:00', condition: 'cloudy', track_temp: 28, air_temp: 22, humidity: 78, wind_speed: 6, rain_chance: 15 },
    { time: '22:00', condition: 'clear', track_temp: 22, air_temp: 18, humidity: 82, wind_speed: 4, rain_chance: 10 },
    { time: '01:00', condition: 'clear', track_temp: 18, air_temp: 15, humidity: 88, wind_speed: 3, rain_chance: 5 },
    { time: '04:00', condition: 'cloudy', track_temp: 16, air_temp: 14, humidity: 90, wind_speed: 5, rain_chance: 25 },
    { time: '07:00', condition: 'light_rain', track_temp: 18, air_temp: 16, humidity: 92, wind_speed: 8, rain_chance: 60 },
    { time: '10:00', condition: 'cloudy', track_temp: 24, air_temp: 20, humidity: 75, wind_speed: 10, rain_chance: 20 },
  ],
  tire_models: [
    { compound: 'soft', base_grip: 100, deg_per_lap: 0.18, optimal_window: { start: 1, end: 18 }, cliff_lap: 22 },
    { compound: 'medium', base_grip: 96, deg_per_lap: 0.12, optimal_window: { start: 1, end: 28 }, cliff_lap: 35 },
    { compound: 'hard', base_grip: 92, deg_per_lap: 0.08, optimal_window: { start: 1, end: 38 }, cliff_lap: 48 },
  ],
  optimal_strategy: '4-stop with medium-medium-hard-hard-medium rotation. Fuel save in stint 5 builds 2-lap safety car buffer.',
  alternative_strategies: [
    '5-stop aggressive: All mediums, shorter stints, attack mode',
    '3-stop conservative: Hard-hard-hard-medium, requires fuel save',
    'Weather contingency: Switch to inters at lap ~520 if rain develops'
  ],
  risk_assessment: {
    level: 'medium',
    factors: [
      'Dawn rain probability 60% - may require tire strategy pivot',
      'Night stint driver fatigue - Casey on 4th stint',
      'Fuel margin tight in stint 5 without save mode'
    ]
  }
};

const tireColors: Record<string, string> = {
  soft: 'bg-red-500 text-white',
  medium: 'bg-yellow-500 text-black',
  hard: 'bg-white text-black',
  wet: 'bg-blue-500 text-white',
  inter: 'bg-green-500 text-white'
};

const weatherIcons: Record<string, any> = {
  clear: Sun,
  cloudy: Cloud,
  light_rain: Droplets,
  heavy_rain: Droplets
};

export function PitwallStrategy() {
  const { teamId } = useParams<{ teamId: string }>();
  const [strategy, setStrategy] = useState<StrategyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStint, setExpandedStint] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'stints' | 'weather' | 'tires'>('stints');

  // Fuel calculator state
  const [fuelCalc, setFuelCalc] = useState({
    raceLaps: 35,
    fuelPerLap: 2.8,
    reserve: 2,
    fuelSaveMode: false
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (teamId === 'demo') {
        await new Promise(r => setTimeout(r, 400));
      }
      setStrategy(mockStrategy);
      setLoading(false);
    };
    fetchData();
  }, [teamId]);

  const calculatedFuel = Math.ceil((fuelCalc.raceLaps * (fuelCalc.fuelSaveMode ? (strategy?.fuel_per_lap_save || fuelCalc.fuelPerLap) : fuelCalc.fuelPerLap)) + fuelCalc.reserve);
  const maxLaps = strategy ? Math.floor(strategy.tank_capacity / strategy.fuel_per_lap) : 0;
  const maxLapsSave = strategy ? Math.floor(strategy.tank_capacity / strategy.fuel_per_lap_save) : 0;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-white/50">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) return null;

  const riskColors = { low: 'text-green-400 bg-green-500/10', medium: 'text-yellow-400 bg-yellow-500/10', high: 'text-red-400 bg-red-500/10' };

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide uppercase text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Race Strategy
          </h1>
          <p className="text-sm mt-1 text-white/50">{strategy.event_name} • {strategy.track_name} • {strategy.car_class}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 font-semibold ${riskColors[strategy.risk_assessment.level]}`}>
            <AlertTriangle size={12} className="inline mr-1" />
            {strategy.risk_assessment.level} risk
          </span>
        </div>
      </div>

      {/* Strategy Summary Bar */}
      <div className="bg-[#0a0a0a] p-4 mb-6" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Optimal Strategy</div>
            <p className="text-sm text-white">{strategy.optimal_strategy}</p>
          </div>
          <div className="flex gap-6 ml-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white font-mono">{strategy.pit_stops.length}</div>
              <div className="text-[10px] text-white/40 uppercase">Stops</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white font-mono">{strategy.race_duration}</div>
              <div className="text-[10px] text-white/40 uppercase">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white font-mono">{strategy.total_laps}</div>
              <div className="text-[10px] text-white/40 uppercase">Est. Laps</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content - 3 cols */}
        <div className="xl:col-span-3 space-y-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-[#0a0a0a] p-1 w-fit" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            {(['stints', 'weather', 'tires'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold transition-colors ${
                  activeTab === tab ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {tab === 'stints' ? 'Stint Plan' : tab === 'weather' ? 'Weather' : 'Tire Strategy'}
              </button>
            ))}
          </div>

          {/* Stints Tab */}
          {activeTab === 'stints' && (
            <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flag size={16} className="text-white/40" />
                  <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Stint Plan
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{strategy.stints.length} stints</span>
                  <span>{strategy.pit_stops.length} pit stops</span>
                </div>
              </div>

              {/* Race Stats Grid */}
              <div className="p-4 border-b border-white/5">
                <div className="grid grid-cols-6 gap-3">
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-lg font-bold text-white font-mono">{maxLaps}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Max Stint</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-lg font-bold text-green-400 font-mono">{maxLapsSave}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Save Mode</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-lg font-bold text-white font-mono">{strategy.fuel_per_lap}L</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Fuel/Lap</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-lg font-bold text-white font-mono">{strategy.pit_time_loss}s</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Pit Loss</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-lg font-bold text-white font-mono">{strategy.pit_lane_delta}s</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Lane Delta</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                    <div className="text-lg font-bold text-white font-mono">{strategy.tank_capacity}L</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Tank</div>
                  </div>
                </div>
              </div>

              {/* Stints List */}
              <div className="divide-y divide-white/5">
                {strategy.stints.map(stint => (
                  <div key={stint.stint}>
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedStint(expandedStint === stint.stint ? null : stint.stint)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-10 h-10 bg-[#f97316] flex items-center justify-center font-mono font-bold text-black">
                          S{stint.stint}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{stint.driver_name}</span>
                            {stint.fuel_save_mode && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 uppercase tracking-wider">Save</span>
                            )}
                          </div>
                          <div className="text-xs text-white/40">
                            Laps {stint.start_lap}–{stint.end_lap} • {stint.end_lap - stint.start_lap + 1} laps • {stint.predicted_total_time}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-white/40">Pit Window</div>
                          <div className="text-sm font-mono text-white">L{stint.pit_in_window.earliest}–{stint.pit_in_window.latest}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 font-bold uppercase ${tireColors[stint.tire_compound]}`}>
                          {stint.tire_compound}
                        </span>
                        <span className="text-sm text-white/50 font-mono w-12 text-right">{stint.fuel_load}L</span>
                        {expandedStint === stint.stint ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                      </div>
                    </div>
                    {expandedStint === stint.stint && (
                      <div className="px-4 pb-4 bg-[#0a0a0a] border-t border-white/10">
                        <div className="grid grid-cols-5 gap-4 pt-4">
                          <div>
                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Predicted Lap</div>
                            <div className="text-white font-mono">{stint.predicted_lap_time}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Fuel Needed</div>
                            <div className="text-white font-mono">{((stint.end_lap - stint.start_lap + 1) * strategy.fuel_per_lap).toFixed(1)}L</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Reserve</div>
                            <div className="text-green-400 font-mono">+{(stint.fuel_load - ((stint.end_lap - stint.start_lap + 1) * strategy.fuel_per_lap)).toFixed(1)}L</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Tire Deg</div>
                            <div className="text-white font-mono">{(stint.expected_deg * 100).toFixed(1)}%/lap</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Tire Age</div>
                            <div className="text-white font-mono">{stint.tire_age} laps</div>
                          </div>
                        </div>
                        {stint.notes && (
                          <div className="mt-3 p-2 bg-white/5 border-l-2 border-[#f97316]">
                            <span className="text-xs text-white/70">{stint.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Tab */}
          {activeTab === 'weather' && (
            <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Cloud size={16} className="text-white/40" />
                <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Weather Forecast
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-8 gap-2">
                  {strategy.weather_forecast.map((w, i) => {
                    const WeatherIcon = weatherIcons[w.condition] || Cloud;
                    const isRainRisk = w.rain_chance >= 30;
                    return (
                      <div key={i} className={`text-center p-3 border ${isRainRisk ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-[#0a0a0a]'}`}>
                        <div className="text-xs text-white/50 mb-2">{w.time}</div>
                        <WeatherIcon size={20} className={`mx-auto mb-2 ${w.condition.includes('rain') ? 'text-blue-400' : 'text-yellow-400'}`} />
                        <div className="text-sm font-mono text-white">{w.track_temp}°</div>
                        <div className="text-[10px] text-white/40">Track</div>
                        <div className={`text-xs font-mono mt-1 ${w.rain_chance >= 50 ? 'text-blue-400' : w.rain_chance >= 20 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {w.rain_chance}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Rain Alert */}
                {strategy.weather_forecast.some(w => w.rain_chance >= 50) && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                    <Droplets size={16} className="text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-blue-400">Rain Alert</div>
                      <div className="text-xs text-white/60">High probability of rain at 07:00. Consider wet tire contingency and adjust pit windows accordingly.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tires Tab */}
          {activeTab === 'tires' && (
            <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <TrendingDown size={16} className="text-white/40" />
                <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Tire Degradation Model
                </span>
              </div>
              <div className="p-4">
                {/* Tire Sets Available */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {Object.entries(strategy.tire_sets_available).map(([compound, count]) => (
                    <div key={compound} className="text-center p-3 bg-[#0a0a0a] border border-white/5">
                      <span className={`inline-block text-[10px] px-2 py-0.5 font-bold uppercase mb-2 ${tireColors[compound]}`}>
                        {compound}
                      </span>
                      <div className="text-xl font-bold text-white font-mono">{count}</div>
                      <div className="text-[10px] text-white/40 uppercase">Sets</div>
                    </div>
                  ))}
                </div>

                {/* Degradation Models */}
                <div className="space-y-4">
                  {strategy.tire_models.map(model => (
                    <div key={model.compound} className="p-4 bg-[#0a0a0a] border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${tireColors[model.compound]}`}>
                          {model.compound}
                        </span>
                        <div className="flex items-center gap-4 text-xs text-white/50">
                          <span>Base Grip: <span className="text-white font-mono">{model.base_grip}%</span></span>
                          <span>Deg: <span className="text-white font-mono">{(model.deg_per_lap * 100).toFixed(1)}%/lap</span></span>
                          <span>Cliff: <span className="text-red-400 font-mono">L{model.cliff_lap}</span></span>
                        </div>
                      </div>
                      {/* Degradation visualization */}
                      <div className="h-8 bg-white/5 relative overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-30"
                          style={{ width: `${(model.cliff_lap / 50) * 100}%` }}
                        />
                        <div 
                          className="absolute inset-y-0 left-0 border-r-2 border-green-400"
                          style={{ width: `${(model.optimal_window.end / 50) * 100}%` }}
                        />
                        <div 
                          className="absolute inset-y-0 border-r-2 border-red-400"
                          style={{ left: `${(model.cliff_lap / 50) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-white/60">
                          <span>Optimal: L1–{model.optimal_window.end}</span>
                          <span>Cliff: L{model.cliff_lap}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <AlertTriangle size={16} className="text-white/40" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Risk Factors
              </span>
            </div>
            <div className="p-4 space-y-2">
              {strategy.risk_assessment.factors.map((factor, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span className="text-white/70">{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Strategies */}
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Zap size={16} className="text-white/40" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Alternative Strategies
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {strategy.alternative_strategies.map((alt, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                  <span className="text-sm text-white/70">{alt}</span>
                  <button className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/20 text-white/50 hover:border-[#f97316] hover:text-[#f97316] transition-colors">
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Column */}
        <div className="space-y-4">
          {/* Fuel Calculator */}
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Fuel size={16} className="text-white/40" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Fuel Calculator
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] text-white/40 mb-1 block uppercase tracking-wider">Stint Laps</label>
                <input
                  type="number"
                  value={fuelCalc.raceLaps}
                  onChange={(e) => setFuelCalc({ ...fuelCalc, raceLaps: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-white text-sm font-mono focus:border-[#f97316] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block uppercase tracking-wider">Fuel/Lap (L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={fuelCalc.fuelPerLap}
                  onChange={(e) => setFuelCalc({ ...fuelCalc, fuelPerLap: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-white text-sm font-mono focus:border-[#f97316] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block uppercase tracking-wider">Reserve (L)</label>
                <input
                  type="number"
                  step="0.5"
                  value={fuelCalc.reserve}
                  onChange={(e) => setFuelCalc({ ...fuelCalc, reserve: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-white text-sm font-mono focus:border-[#f97316] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fuelSave"
                  checked={fuelCalc.fuelSaveMode}
                  onChange={(e) => setFuelCalc({ ...fuelCalc, fuelSaveMode: e.target.checked })}
                  className="w-4 h-4 accent-[#f97316]"
                />
                <label htmlFor="fuelSave" className="text-xs text-white/50">Fuel Save Mode ({strategy.fuel_per_lap_save}L/lap)</label>
              </div>
              <div className="pt-3 border-t border-white/10">
                <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Required Fuel</div>
                <div className="text-3xl font-bold text-white font-mono">{calculatedFuel}L</div>
                <div className="text-xs text-white/40 mt-1">
                  Max {fuelCalc.fuelSaveMode ? maxLapsSave : maxLaps} laps on full tank
                </div>
              </div>
            </div>
          </div>

          {/* Pit Stop Summary */}
          <div className="bg-[#0a0a0a]" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Timer size={16} className="text-white/40" />
              <span className="font-medium text-sm uppercase tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Pit Stops
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {strategy.pit_stops.map((stop, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-white">Lap {stop.lap}</span>
                    <span className="text-xs font-mono text-white/50">{stop.duration.toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    {stop.tire_change && <span className={`px-1.5 py-0.5 ${tireColors[stop.new_compound || 'medium']}`}>{stop.new_compound}</span>}
                    <span>+{stop.fuel_added}L</span>
                    {stop.driver_change && <span className="text-[#f97316]">→ {stop.new_driver}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#0a0a0a] p-4 space-y-2" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}>
            <button className="w-full flex items-center justify-center gap-2 border border-white/20 text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors">
              <RefreshCw size={14} />
              Recalculate Strategy
            </button>
            <button className="w-full flex items-center justify-center gap-2 border border-white/20 text-white/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors">
              Export to Crew Chief
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
