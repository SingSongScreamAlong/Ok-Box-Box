#!/usr/bin/env python3
"""
Strategy Analyzer - Race strategy analysis from captured telemetry
Analyzes: Lap times, fuel consumption, tire degradation, pit windows, 
gap trends, position changes, and opponent modeling
"""
import json
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import statistics

LOG_DIR = Path("race_logs/20260303_110231")

@dataclass
class LapData:
    lap_number: int
    lap_time: float  # seconds
    position: int
    fuel_level: float
    fuel_used: float
    timestamp: float
    is_pit_lap: bool = False
    is_out_lap: bool = False

@dataclass
class StintData:
    stint_number: int
    start_lap: int
    end_lap: int
    laps: List[LapData] = field(default_factory=list)
    avg_pace: float = 0.0
    best_lap: float = 0.0
    fuel_per_lap: float = 0.0
    degradation_slope: float = 0.0  # seconds lost per lap

@dataclass
class GapData:
    lap: int
    gap_ahead: float
    gap_behind: float
    position: int

def load_telemetry_data() -> Tuple[List[dict], List[dict], List[dict]]:
    """Load telemetry, incidents, and standings data"""
    telemetry = []
    incidents = []
    standings = []
    
    # Load player telemetry
    player_file = LOG_DIR / "player_telemetry.jsonl"
    if player_file.exists():
        with open(player_file, 'r', errors='ignore') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    telemetry.append(data)
                except:
                    pass
    
    # Load incidents
    incident_file = LOG_DIR / "incidents.jsonl"
    if incident_file.exists():
        with open(incident_file, 'r', errors='ignore') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    incidents.append(data)
                except:
                    pass
    
    return telemetry, incidents, standings

def extract_lap_data(telemetry: List[dict]) -> List[LapData]:
    """Extract lap-by-lap data from telemetry"""
    laps = []
    last_lap = -1
    lap_start_time = None
    lap_start_fuel = None
    
    for sample in telemetry:
        data = sample.get('data', sample)
        current_lap = data.get('lap', 0)
        
        if current_lap > last_lap and last_lap >= 0:
            # Lap completed
            if lap_start_time and lap_start_fuel is not None:
                lap_time = sample.get('ts', 0) - lap_start_time
                fuel_used = lap_start_fuel - data.get('fuelLevel', 0)
                
                if lap_time > 20 and lap_time < 300:  # Sanity check
                    laps.append(LapData(
                        lap_number=last_lap,
                        lap_time=lap_time,
                        position=data.get('position', 0),
                        fuel_level=data.get('fuelLevel', 0),
                        fuel_used=max(0, fuel_used),
                        timestamp=sample.get('ts', 0),
                        is_pit_lap=data.get('onPitRoad', False)
                    ))
            
            lap_start_time = sample.get('ts', 0)
            lap_start_fuel = data.get('fuelLevel', 0)
        
        last_lap = current_lap
    
    return laps

def calculate_degradation(lap_times: List[float]) -> float:
    """Calculate pace degradation using linear regression"""
    if len(lap_times) < 3:
        return 0.0
    
    n = len(lap_times)
    x = list(range(1, n + 1))
    y = lap_times
    
    x_mean = sum(x) / n
    y_mean = sum(y) / n
    
    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
    
    if denominator == 0:
        return 0.0
    
    return numerator / denominator  # seconds per lap

def analyze_stints(laps: List[LapData]) -> List[StintData]:
    """Analyze stints based on pit stops"""
    stints = []
    current_stint = StintData(stint_number=1, start_lap=1, end_lap=0)
    
    for lap in laps:
        if lap.is_pit_lap and current_stint.laps:
            # End current stint
            current_stint.end_lap = lap.lap_number
            if current_stint.laps:
                times = [l.lap_time for l in current_stint.laps if not l.is_out_lap]
                if times:
                    current_stint.avg_pace = statistics.mean(times)
                    current_stint.best_lap = min(times)
                    current_stint.degradation_slope = calculate_degradation(times)
                
                fuel_used = [l.fuel_used for l in current_stint.laps if l.fuel_used > 0]
                if fuel_used:
                    current_stint.fuel_per_lap = statistics.mean(fuel_used)
            
            stints.append(current_stint)
            current_stint = StintData(
                stint_number=len(stints) + 1,
                start_lap=lap.lap_number + 1,
                end_lap=0
            )
        else:
            current_stint.laps.append(lap)
    
    # Add final stint
    if current_stint.laps:
        current_stint.end_lap = current_stint.laps[-1].lap_number
        times = [l.lap_time for l in current_stint.laps]
        if times:
            current_stint.avg_pace = statistics.mean(times)
            current_stint.best_lap = min(times)
            current_stint.degradation_slope = calculate_degradation(times)
        
        fuel_used = [l.fuel_used for l in current_stint.laps if l.fuel_used > 0]
        if fuel_used:
            current_stint.fuel_per_lap = statistics.mean(fuel_used)
        
        stints.append(current_stint)
    
    return stints

def analyze_position_changes(laps: List[LapData]) -> Dict:
    """Analyze position gains/losses"""
    if not laps:
        return {}
    
    start_pos = laps[0].position
    end_pos = laps[-1].position
    
    positions_gained = start_pos - end_pos  # Lower position = better
    
    # Track position changes per lap
    position_changes = []
    for i in range(1, len(laps)):
        change = laps[i-1].position - laps[i].position
        if change != 0:
            position_changes.append({
                'lap': laps[i].lap_number,
                'change': change,
                'new_position': laps[i].position
            })
    
    return {
        'start_position': start_pos,
        'end_position': end_pos,
        'positions_gained': positions_gained,
        'position_changes': position_changes
    }

def analyze_fuel_strategy(laps: List[LapData], stints: List[StintData]) -> Dict:
    """Analyze fuel consumption and strategy"""
    if not laps:
        return {}
    
    fuel_per_lap_all = [l.fuel_used for l in laps if l.fuel_used > 0]
    
    if not fuel_per_lap_all:
        return {'error': 'No fuel data available'}
    
    avg_fuel_per_lap = statistics.mean(fuel_per_lap_all)
    
    # Estimate fuel needed for race
    total_laps = laps[-1].lap_number if laps else 0
    
    return {
        'avg_fuel_per_lap': avg_fuel_per_lap,
        'total_fuel_used': sum(fuel_per_lap_all),
        'fuel_variance': statistics.stdev(fuel_per_lap_all) if len(fuel_per_lap_all) > 1 else 0,
        'pit_stops': len(stints) - 1,
        'laps_completed': total_laps
    }

def analyze_pace_consistency(laps: List[LapData]) -> Dict:
    """Analyze lap time consistency"""
    if not laps:
        return {}
    
    times = [l.lap_time for l in laps if l.lap_time > 0 and not l.is_pit_lap]
    
    if len(times) < 2:
        return {'error': 'Not enough lap data'}
    
    avg_pace = statistics.mean(times)
    best_lap = min(times)
    worst_lap = max(times)
    std_dev = statistics.stdev(times)
    
    # Consistency score (lower std_dev = more consistent)
    consistency_score = max(0, 100 - (std_dev / avg_pace * 1000))
    
    # Pace trend (improving/degrading)
    if len(times) >= 5:
        first_half = statistics.mean(times[:len(times)//2])
        second_half = statistics.mean(times[len(times)//2:])
        pace_trend = 'improving' if second_half < first_half else 'degrading'
    else:
        pace_trend = 'insufficient data'
    
    return {
        'avg_pace': avg_pace,
        'best_lap': best_lap,
        'worst_lap': worst_lap,
        'std_dev': std_dev,
        'consistency_score': consistency_score,
        'pace_trend': pace_trend,
        'lap_count': len(times)
    }

def analyze_incidents(incidents: List[dict], driver_name: str = "Conrad Weeden") -> Dict:
    """Analyze incident patterns"""
    driver_incidents = [i for i in incidents if driver_name in str(i.get('data', {}).get('driver_names', []))]
    
    if not driver_incidents:
        return {'total_incidents': 0}
    
    # Group by lap
    incidents_by_lap = defaultdict(int)
    for inc in driver_incidents:
        lap = inc.get('data', {}).get('lap', 0)
        incidents_by_lap[lap] += 1
    
    # Check for clustering (multiple incidents within 3 laps)
    laps_with_incidents = sorted(incidents_by_lap.keys())
    clustering = False
    for i in range(1, len(laps_with_incidents)):
        if laps_with_incidents[i] - laps_with_incidents[i-1] <= 3:
            clustering = True
            break
    
    return {
        'total_incidents': len(driver_incidents),
        'incidents_by_lap': dict(incidents_by_lap),
        'incident_clustering': clustering,
        'incident_rate': len(driver_incidents) / max(1, max(incidents_by_lap.keys())) if incidents_by_lap else 0
    }

def format_time(seconds: float) -> str:
    """Format seconds as MM:SS.mmm"""
    if seconds <= 0:
        return "—"
    mins = int(seconds // 60)
    secs = seconds % 60
    return f"{mins}:{secs:06.3f}" if mins > 0 else f"{secs:.3f}"

def generate_report(laps, stints, incidents, position_data, fuel_data, pace_data, incident_data):
    """Generate markdown strategy report"""
    
    report = []
    report.append("# 🏁 Race Strategy Analysis\n")
    report.append(f"**Track:** Phoenix Raceway")
    report.append(f"**Car:** Toyota Tundra TRD Pro")
    report.append(f"**Laps Completed:** {pace_data.get('lap_count', 0)}\n")
    
    # Overall Summary
    report.append("## 📊 Race Summary\n")
    report.append("| Metric | Value |")
    report.append("|--------|-------|")
    report.append(f"| Best Lap | {format_time(pace_data.get('best_lap', 0))} |")
    report.append(f"| Average Pace | {format_time(pace_data.get('avg_pace', 0))} |")
    report.append(f"| Consistency Score | {pace_data.get('consistency_score', 0):.1f}/100 |")
    report.append(f"| Pace Trend | {pace_data.get('pace_trend', 'N/A')} |")
    report.append(f"| Start Position | P{position_data.get('start_position', 0)} |")
    report.append(f"| Finish Position | P{position_data.get('end_position', 0)} |")
    report.append(f"| Positions Gained | {position_data.get('positions_gained', 0):+d} |")
    report.append(f"| Total Incidents | {incident_data.get('total_incidents', 0)} |")
    report.append("")
    
    # Stint Analysis
    report.append("## 🔄 Stint Analysis\n")
    if stints:
        report.append("| Stint | Laps | Avg Pace | Best Lap | Degradation |")
        report.append("|-------|------|----------|----------|-------------|")
        for stint in stints:
            deg_str = f"+{stint.degradation_slope:.3f}s/lap" if stint.degradation_slope > 0 else f"{stint.degradation_slope:.3f}s/lap"
            report.append(f"| {stint.stint_number} | {stint.start_lap}-{stint.end_lap} | {format_time(stint.avg_pace)} | {format_time(stint.best_lap)} | {deg_str} |")
        report.append("")
    
    # Fuel Analysis
    report.append("## ⛽ Fuel Strategy\n")
    report.append("| Metric | Value |")
    report.append("|--------|-------|")
    report.append(f"| Avg Fuel/Lap | {fuel_data.get('avg_fuel_per_lap', 0):.2f}L |")
    report.append(f"| Total Fuel Used | {fuel_data.get('total_fuel_used', 0):.1f}L |")
    report.append(f"| Fuel Variance | ±{fuel_data.get('fuel_variance', 0):.3f}L |")
    report.append(f"| Pit Stops | {fuel_data.get('pit_stops', 0)} |")
    report.append("")
    
    # Incident Analysis
    report.append("## ⚠️ Incident Analysis\n")
    report.append(f"- **Total Incidents:** {incident_data.get('total_incidents', 0)}")
    report.append(f"- **Incident Rate:** {incident_data.get('incident_rate', 0):.2f} per lap")
    report.append(f"- **Clustering:** {'Yes ⚠️' if incident_data.get('incident_clustering') else 'No ✅'}")
    
    if incident_data.get('incidents_by_lap'):
        report.append("\n**Incidents by Lap:**")
        for lap, count in sorted(incident_data.get('incidents_by_lap', {}).items()):
            report.append(f"- Lap {lap}: {count} incident(s)")
    report.append("")
    
    # Position Changes
    report.append("## 📈 Position Changes\n")
    changes = position_data.get('position_changes', [])
    if changes:
        report.append("| Lap | Change | New Position |")
        report.append("|-----|--------|--------------|")
        for change in changes[:10]:  # Show first 10
            change_str = f"+{change['change']}" if change['change'] > 0 else str(change['change'])
            report.append(f"| {change['lap']} | {change_str} | P{change['new_position']} |")
    else:
        report.append("No significant position changes recorded.")
    report.append("")
    
    # Strategy Recommendations
    report.append("## 💡 Strategy Recommendations\n")
    
    recommendations = []
    
    # Based on consistency
    if pace_data.get('consistency_score', 0) < 70:
        recommendations.append("🔴 **Consistency:** Your lap times vary significantly. Focus on hitting your marks consistently.")
    elif pace_data.get('consistency_score', 0) < 85:
        recommendations.append("🟡 **Consistency:** Room for improvement in lap time consistency.")
    else:
        recommendations.append("🟢 **Consistency:** Excellent lap time consistency!")
    
    # Based on incidents
    if incident_data.get('total_incidents', 0) > 3:
        recommendations.append("🔴 **Incidents:** High incident count. Consider more conservative racing in traffic.")
    
    if incident_data.get('incident_clustering'):
        recommendations.append("🔴 **Mental Reset:** Incidents are clustering - take a breath and reset mentally after contact.")
    
    # Based on pace trend
    if pace_data.get('pace_trend') == 'degrading':
        recommendations.append("🟡 **Pace Management:** Your pace degraded through the race. Consider tire/fuel management.")
    elif pace_data.get('pace_trend') == 'improving':
        recommendations.append("🟢 **Pace:** Great job improving pace through the race!")
    
    # Based on positions
    if position_data.get('positions_gained', 0) < 0:
        recommendations.append(f"🟡 **Positions:** Lost {abs(position_data.get('positions_gained', 0))} positions. Review overtake defense.")
    elif position_data.get('positions_gained', 0) > 3:
        recommendations.append(f"🟢 **Positions:** Excellent race! Gained {position_data.get('positions_gained', 0)} positions.")
    
    for rec in recommendations:
        report.append(rec)
    
    report.append("")
    
    return "\n".join(report)

def main():
    print("Loading telemetry data...")
    telemetry, incidents, _ = load_telemetry_data()
    print(f"Loaded {len(telemetry)} telemetry samples, {len(incidents)} incidents")
    
    print("Extracting lap data...")
    laps = extract_lap_data(telemetry)
    print(f"Extracted {len(laps)} laps")
    
    print("Analyzing stints...")
    stints = analyze_stints(laps)
    print(f"Found {len(stints)} stints")
    
    print("Analyzing position changes...")
    position_data = analyze_position_changes(laps)
    
    print("Analyzing fuel strategy...")
    fuel_data = analyze_fuel_strategy(laps, stints)
    
    print("Analyzing pace consistency...")
    pace_data = analyze_pace_consistency(laps)
    
    print("Analyzing incidents...")
    incident_data = analyze_incidents(incidents)
    
    print("\nGenerating report...")
    report = generate_report(laps, stints, incidents, position_data, fuel_data, pace_data, incident_data)
    
    # Save report
    output_file = LOG_DIR / "STRATEGY_ANALYSIS.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)
    print(f"\n✅ Strategy analysis saved to: {output_file}")

if __name__ == "__main__":
    main()
