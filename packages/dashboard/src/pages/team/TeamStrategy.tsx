import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
    Target,
    Fuel,
    Cloud,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

// Types
interface StintPlan {
    stint: number;
    driver: string;
    driver_name: string;
    start_lap: number;
    end_lap: number;
    fuel_load: number;
    tire_compound: 'soft' | 'medium' | 'hard' | 'wet';
    notes?: string;
}

interface StrategyPlan {
    id: string;
    event_name: string;
    race_duration: string;
    total_laps: number;
    fuel_per_lap: number;
    tank_capacity: number;
    pit_time_loss: number;
    stints: StintPlan[];
}

// Mock data
const mockStrategy: StrategyPlan = {
    id: 'strat1',
    event_name: 'Daytona 24 Hours',
    race_duration: '24h',
    total_laps: 750,
    fuel_per_lap: 2.8,
    tank_capacity: 100,
    pit_time_loss: 45,
    stints: [
        { stint: 1, driver: 'd1', driver_name: 'Alex Rivera', start_lap: 1, end_lap: 35, fuel_load: 100, tire_compound: 'medium' },
        { stint: 2, driver: 'd2', driver_name: 'Jordan Chen', start_lap: 36, end_lap: 70, fuel_load: 100, tire_compound: 'medium' },
        { stint: 3, driver: 'd3', driver_name: 'Sam Williams', start_lap: 71, end_lap: 105, fuel_load: 100, tire_compound: 'hard' },
        { stint: 4, driver: 'd4', driver_name: 'Casey Morgan', start_lap: 106, end_lap: 140, fuel_load: 100, tire_compound: 'hard' },
        { stint: 5, driver: 'd1', driver_name: 'Alex Rivera', start_lap: 141, end_lap: 175, fuel_load: 100, tire_compound: 'medium', notes: 'Night stint' },
    ]
};

const tireColors: Record<string, string> = {
    soft: 'bg-racing-red text-white',
    medium: 'bg-racing-yellow text-black',
    hard: 'bg-white text-black',
    wet: 'bg-racing-blue text-white'
};

export default function TeamStrategy() {
    const { teamId } = useParams<{ teamId: string }>();
    useAuthStore(); // Available for API calls

    const [strategy, setStrategy] = useState<StrategyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedStint, setExpandedStint] = useState<number | null>(null);

    // Fuel calculator state
    const [fuelCalc, setFuelCalc] = useState({
        raceLaps: 35,
        fuelPerLap: 2.8,
        reserve: 2
    });

    useEffect(() => {
        fetchData();
    }, [teamId]);

    const fetchData = async () => {
        setLoading(true);

        if (teamId === 'demo') {
            await new Promise(r => setTimeout(r, 400));
            setStrategy(mockStrategy);
            setLoading(false);
            return;
        }

        setLoading(false);
    };

    const calculatedFuel = Math.ceil((fuelCalc.raceLaps * fuelCalc.fuelPerLap) + fuelCalc.reserve);
    const maxLaps = strategy ? Math.floor(strategy.tank_capacity / strategy.fuel_per_lap) : 0;

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-white/50">Loading strategy...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-white uppercase tracking-[0.1em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>Strategy</h1>
                    <p className="text-xs text-white/50">Race strategy & fuel management</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stint Plan */}
                <div className="lg:col-span-2">
                    {strategy && (
                        <div className="border border-white/10">
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target size={16} className="text-[#f97316]" />
                                    <span className="font-medium text-sm text-white uppercase tracking-wider">{strategy.event_name}</span>
                                </div>
                                <span className="text-xs text-white/40">{strategy.stints.length} stints planned</span>
                            </div>

                            <div className="p-4">
                                {/* Race Stats */}
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-3 border border-white/10">
                                        <div className="text-lg font-bold text-white font-mono">{strategy.total_laps}</div>
                                        <div className="text-xs text-white/40">Total Laps</div>
                                    </div>
                                    <div className="text-center p-3 border border-white/10">
                                        <div className="text-lg font-bold text-white font-mono">{strategy.fuel_per_lap}L</div>
                                        <div className="text-xs text-white/40">Fuel/Lap</div>
                                    </div>
                                    <div className="text-center p-3 border border-white/10">
                                        <div className="text-lg font-bold text-white font-mono">{maxLaps}</div>
                                        <div className="text-xs text-white/40">Max Laps/Tank</div>
                                    </div>
                                    <div className="text-center p-3 border border-white/10">
                                        <div className="text-lg font-bold text-white font-mono">{strategy.pit_time_loss}s</div>
                                        <div className="text-xs text-white/40">Pit Loss</div>
                                    </div>
                                </div>

                                {/* Stints */}
                                <div className="space-y-2">
                                    {strategy.stints.map(stint => (
                                        <div
                                            key={stint.stint}
                                            className="border border-white/10 overflow-hidden"
                                        >
                                            <div
                                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                                onClick={() => setExpandedStint(expandedStint === stint.stint ? null : stint.stint)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 h-8 bg-[#f97316] flex items-center justify-center font-mono font-bold text-sm text-black">
                                                        {stint.stint}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{stint.driver_name}</div>
                                                        <div className="text-xs text-white/50">
                                                            Laps {stint.start_lap}–{stint.end_lap} ({stint.end_lap - stint.start_lap + 1} laps)
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${tireColors[stint.tire_compound]}`}>
                                                        {stint.tire_compound.charAt(0).toUpperCase()}
                                                    </span>
                                                    <span className="text-xs text-white/60 font-mono">{stint.fuel_load}L</span>
                                                    {expandedStint === stint.stint ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                                                </div>
                                            </div>
                                            {expandedStint === stint.stint && (
                                                <div className="p-3 pt-0 border-t border-white/10">
                                                    <div className="grid grid-cols-3 gap-4 text-sm pt-3">
                                                        <div>
                                                            <div className="text-xs text-white/40 mb-1">Fuel Calculation</div>
                                                            <div className="text-white/80">
                                                                {(stint.end_lap - stint.start_lap + 1) * strategy.fuel_per_lap}L needed
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-white/40 mb-1">Reserve</div>
                                                            <div className="text-green-400">
                                                                +{(stint.fuel_load - ((stint.end_lap - stint.start_lap + 1) * strategy.fuel_per_lap)).toFixed(1)}L
                                                            </div>
                                                        </div>
                                                        {stint.notes && (
                                                            <div>
                                                                <div className="text-xs text-white/40 mb-1">Notes</div>
                                                                <div className="text-white/70">{stint.notes}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tools */}
                <div className="space-y-6">
                    {/* Fuel Calculator */}
                    <div className="border border-white/10">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <Fuel size={16} className="text-[#f97316]" />
                            <span className="font-medium text-sm text-white uppercase tracking-wider">Fuel Calc</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs text-white/40 mb-1 block">Race Laps</label>
                                <input
                                    type="number"
                                    value={fuelCalc.raceLaps}
                                    onChange={(e) => setFuelCalc({ ...fuelCalc, raceLaps: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm text-white font-mono focus:border-white/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-white/40 mb-1 block">Fuel/Lap (L)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={fuelCalc.fuelPerLap}
                                    onChange={(e) => setFuelCalc({ ...fuelCalc, fuelPerLap: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm text-white font-mono focus:border-white/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-white/40 mb-1 block">Reserve (L)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={fuelCalc.reserve}
                                    onChange={(e) => setFuelCalc({ ...fuelCalc, reserve: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm text-white font-mono focus:border-white/40 focus:outline-none"
                                />
                            </div>
                            <div className="pt-3 border-t border-white/10">
                                <div className="text-xs text-white/40 mb-1">Required Fuel</div>
                                <div className="text-2xl font-bold text-green-400 font-mono">{calculatedFuel}L</div>
                            </div>
                        </div>
                    </div>

                    {/* Weather */}
                    <div className="border border-white/10">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <Cloud size={16} className="text-[#3b82f6]" />
                            <span className="font-medium text-sm text-white uppercase tracking-wider">Conditions</span>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white/60">Track Temp</span>
                                <span className="text-sm font-mono text-white">32°C</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white/60">Air Temp</span>
                                <span className="text-sm font-mono text-white">24°C</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/60">Rain Chance</span>
                                <span className="text-sm font-mono text-green-400">5%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
