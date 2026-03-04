#!/usr/bin/env python3
"""
Comprehensive Race Data Analysis & Export Tool
- Fixes player telemetry extraction
- Creates lap-by-lap analysis
- Exports to CSV format
"""

import json
import csv
import os
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any, Optional

def load_jsonl_streaming(filepath, max_lines=None):
    """Stream JSONL file line by line to handle large files"""
    count = 0
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                    count += 1
                    if max_lines and count >= max_lines:
                        break
                except json.JSONDecodeError:
                    continue

def find_player_car(cars: List[Dict]) -> Optional[Dict]:
    """Find the player's car from the car list"""
    # First try isPlayer flag
    for car in cars:
        if car.get('isPlayer'):
            return car
    
    # Fallback: look for car with actual telemetry data (speed > 0, rpm > 0)
    # In spectator mode, only the spectated car has real telemetry
    for car in cars:
        if car.get('speed', 0) > 0 or car.get('rpm', 0) > 0:
            return car
    
    return None

def find_driver_car(cars: List[Dict], driver_name: str) -> Optional[Dict]:
    """Find a specific driver's car"""
    for car in cars:
        if car.get('driverName', '').lower() == driver_name.lower():
            return car
    return None

def extract_telemetry_timeseries(log_dir: Path, driver_name: str = None) -> List[Dict]:
    """Extract telemetry time series for a driver"""
    telemetry_file = log_dir / "telemetry.jsonl"
    if not telemetry_file.exists():
        return []
    
    timeseries = []
    for entry in load_jsonl_streaming(telemetry_file):
        data = entry.get('data', entry)
        cars = data.get('cars', [])
        
        if driver_name:
            car = find_driver_car(cars, driver_name)
        else:
            car = find_player_car(cars)
        
        if car:
            timeseries.append({
                'timestamp': entry.get('ts', 0),
                'speed': car.get('speed', 0),
                'rpm': car.get('rpm', 0),
                'gear': car.get('gear', 0),
                'throttle': car.get('throttle', 0),
                'brake': car.get('brake', 0),
                'steering': car.get('steering', 0),
                'lap': car.get('lap', 0),
                'position': car.get('position', 0),
                'classPosition': car.get('classPosition', 0),
                'trackPosition': car.get('pos', {}).get('s', 0),
                'fuelLevel': car.get('fuelLevel', 0),
                'fuelPct': car.get('fuelPct', 0),
                'lastLapTime': car.get('lastLapTime', 0),
                'bestLapTime': car.get('bestLapTime', 0),
                'incidentCount': car.get('incidentCount', 0),
                'inPit': car.get('inPit', False),
                'onPitRoad': car.get('onPitRoad', False),
                'driverName': car.get('driverName', 'Unknown'),
                'carName': car.get('carName', 'Unknown'),
                'carNumber': car.get('carNumber', ''),
            })
    
    return timeseries

def analyze_laps(timeseries: List[Dict]) -> List[Dict]:
    """Analyze lap-by-lap performance"""
    if not timeseries:
        return []
    
    laps = defaultdict(lambda: {
        'lap_number': 0,
        'start_ts': 0,
        'end_ts': 0,
        'lap_time': 0,
        'max_speed': 0,
        'avg_speed': 0,
        'max_rpm': 0,
        'start_position': 0,
        'end_position': 0,
        'positions_gained': 0,
        'incidents': 0,
        'pit_stop': False,
        'samples': 0,
        'speeds': [],
    })
    
    current_lap = -1
    prev_incident_count = 0
    
    for entry in timeseries:
        lap = entry.get('lap', 0)
        if lap < 0:
            continue
        
        if lap != current_lap:
            current_lap = lap
            laps[lap]['lap_number'] = lap
            laps[lap]['start_ts'] = entry['timestamp']
            laps[lap]['start_position'] = entry['position']
            prev_incident_count = entry.get('incidentCount', 0)
        
        laps[lap]['end_ts'] = entry['timestamp']
        laps[lap]['end_position'] = entry['position']
        laps[lap]['samples'] += 1
        
        speed = entry.get('speed', 0)
        if speed > 0:
            laps[lap]['speeds'].append(speed)
            laps[lap]['max_speed'] = max(laps[lap]['max_speed'], speed)
        
        laps[lap]['max_rpm'] = max(laps[lap]['max_rpm'], entry.get('rpm', 0))
        
        if entry.get('inPit') or entry.get('onPitRoad'):
            laps[lap]['pit_stop'] = True
        
        # Track incidents
        inc = entry.get('incidentCount', 0)
        if inc > prev_incident_count:
            laps[lap]['incidents'] += (inc - prev_incident_count)
        prev_incident_count = inc
        
        # Use lastLapTime if available
        if entry.get('lastLapTime', 0) > 0 and lap > 0:
            laps[lap - 1]['lap_time'] = entry['lastLapTime']
    
    # Calculate averages and finalize
    result = []
    for lap_num in sorted(laps.keys()):
        lap_data = laps[lap_num]
        if lap_data['speeds']:
            lap_data['avg_speed'] = sum(lap_data['speeds']) / len(lap_data['speeds'])
        lap_data['positions_gained'] = lap_data['start_position'] - lap_data['end_position']
        del lap_data['speeds']  # Remove raw data
        result.append(lap_data)
    
    return result

def analyze_incidents_detailed(log_dir: Path) -> List[Dict]:
    """Detailed incident analysis with timeline"""
    incidents_file = log_dir / "incidents.jsonl"
    if not incidents_file.exists():
        return []
    
    incidents = []
    for entry in load_jsonl_streaming(incidents_file):
        data = entry.get('data', entry)
        incidents.append({
            'timestamp': entry.get('ts', 0),
            'time_str': datetime.fromtimestamp(entry.get('ts', 0)).strftime('%H:%M:%S'),
            'drivers': ', '.join(data.get('driverNames', ['Unknown'])),
            'cars': ', '.join(data.get('carNames', ['Unknown'])),
            'corner': data.get('cornerName', 'Unknown'),
            'track_position': data.get('trackPosition', 0),
            'severity': data.get('severity', 'unknown'),
            'lap': data.get('lap', 0),
        })
    
    return sorted(incidents, key=lambda x: x['timestamp'])

def get_all_drivers(log_dir: Path) -> List[str]:
    """Get list of all drivers in the session"""
    telemetry_file = log_dir / "telemetry.jsonl"
    if not telemetry_file.exists():
        return []
    
    drivers = set()
    for entry in load_jsonl_streaming(telemetry_file, max_lines=10):
        data = entry.get('data', entry)
        for car in data.get('cars', []):
            name = car.get('driverName')
            if name:
                drivers.add(name)
    
    return sorted(drivers)

def export_to_csv(log_dir: Path, output_dir: Path = None):
    """Export all race data to CSV files"""
    if output_dir is None:
        output_dir = log_dir / "csv_export"
    output_dir.mkdir(exist_ok=True)
    
    print(f"\n📁 Exporting to: {output_dir}")
    
    # 1. Export incidents
    incidents = analyze_incidents_detailed(log_dir)
    if incidents:
        incidents_csv = output_dir / "incidents.csv"
        with open(incidents_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=incidents[0].keys())
            writer.writeheader()
            writer.writerows(incidents)
        print(f"   ✅ incidents.csv ({len(incidents)} rows)")
    
    # 2. Export standings/positions over time
    telemetry_file = log_dir / "telemetry.jsonl"
    if telemetry_file.exists():
        positions_csv = output_dir / "positions.csv"
        with open(positions_csv, 'w', newline='', encoding='utf-8') as f:
            writer = None
            row_count = 0
            
            for entry in load_jsonl_streaming(telemetry_file, max_lines=500):  # Sample
                data = entry.get('data', entry)
                ts = entry.get('ts', 0)
                
                for car in data.get('cars', []):
                    row = {
                        'timestamp': ts,
                        'driver': car.get('driverName', 'Unknown'),
                        'car_number': car.get('carNumber', ''),
                        'position': car.get('position', 0),
                        'class_position': car.get('classPosition', 0),
                        'lap': car.get('lap', 0),
                        'track_pct': car.get('pos', {}).get('s', 0),
                        'in_pit': car.get('inPit', False),
                        'speed': car.get('speed', 0),
                    }
                    
                    if writer is None:
                        writer = csv.DictWriter(f, fieldnames=row.keys())
                        writer.writeheader()
                    
                    writer.writerow(row)
                    row_count += 1
        
        print(f"   ✅ positions.csv ({row_count} rows)")
    
    # 3. Export lap times for all drivers
    drivers = get_all_drivers(log_dir)
    if drivers:
        laps_csv = output_dir / "lap_times.csv"
        all_laps = []
        
        for driver in drivers[:5]:  # Limit to first 5 drivers for speed
            timeseries = extract_telemetry_timeseries(log_dir, driver)
            laps = analyze_laps(timeseries)
            for lap in laps:
                lap['driver'] = driver
                all_laps.append(lap)
        
        if all_laps:
            with open(laps_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=all_laps[0].keys())
                writer.writeheader()
                writer.writerows(all_laps)
            print(f"   ✅ lap_times.csv ({len(all_laps)} rows)")
    
    # 4. Export session summary
    stats_file = log_dir / "stats.json"
    if stats_file.exists():
        with open(stats_file) as f:
            stats = json.load(f)
        
        summary_csv = output_dir / "session_summary.csv"
        with open(summary_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Metric', 'Value'])
            writer.writerow(['Session ID', stats.get('session_id', '')])
            writer.writerow(['Duration (seconds)', stats.get('elapsed_seconds', 0)])
            writer.writerow(['Duration (minutes)', stats.get('elapsed_seconds', 0) / 60])
            for event, count in stats.get('event_counts', {}).items():
                writer.writerow([f'Events: {event}', count])
        print(f"   ✅ session_summary.csv")
    
    return output_dir

def generate_lap_report(log_dir: Path, driver_name: str = None):
    """Generate detailed lap-by-lap report"""
    print(f"\n{'='*60}")
    print(f"LAP-BY-LAP ANALYSIS")
    print(f"{'='*60}")
    
    if driver_name is None:
        # Try to find player or use first driver with data
        drivers = get_all_drivers(log_dir)
        if drivers:
            # Look for Conrad Weeden or use first driver
            driver_name = next((d for d in drivers if 'weeden' in d.lower()), drivers[0])
    
    print(f"\nDriver: {driver_name}")
    
    timeseries = extract_telemetry_timeseries(log_dir, driver_name)
    if not timeseries:
        print("   No telemetry data found for this driver")
        return
    
    print(f"Telemetry samples: {len(timeseries)}")
    
    laps = analyze_laps(timeseries)
    if not laps:
        print("   No lap data found")
        return
    
    print(f"\n{'Lap':<5} {'Time':<12} {'Pos':<5} {'Δ Pos':<6} {'Max Spd':<10} {'Avg Spd':<10} {'Pit':<5} {'Inc':<5}")
    print("-" * 70)
    
    for lap in laps:
        lap_time = lap['lap_time']
        if lap_time > 0:
            mins = int(lap_time // 60)
            secs = lap_time % 60
            time_str = f"{mins}:{secs:06.3f}" if mins > 0 else f"{secs:.3f}"
        else:
            time_str = "—"
        
        pit = "PIT" if lap['pit_stop'] else ""
        inc = str(lap['incidents']) if lap['incidents'] > 0 else ""
        pos_delta = lap['positions_gained']
        pos_str = f"+{pos_delta}" if pos_delta > 0 else str(pos_delta) if pos_delta < 0 else "—"
        
        print(f"{lap['lap_number']:<5} {time_str:<12} {lap['end_position']:<5} {pos_str:<6} "
              f"{lap['max_speed']:<10.1f} {lap['avg_speed']:<10.1f} {pit:<5} {inc:<5}")
    
    # Summary stats
    valid_laps = [l for l in laps if l['lap_time'] > 0]
    if valid_laps:
        best_lap = min(valid_laps, key=lambda x: x['lap_time'])
        avg_lap = sum(l['lap_time'] for l in valid_laps) / len(valid_laps)
        
        print(f"\n📊 SUMMARY")
        print(f"   Total Laps: {len(laps)}")
        print(f"   Best Lap: {best_lap['lap_number']} ({best_lap['lap_time']:.3f}s)")
        print(f"   Average Lap: {avg_lap:.3f}s")
        print(f"   Total Incidents: {sum(l['incidents'] for l in laps)}")
        print(f"   Pit Stops: {sum(1 for l in laps if l['pit_stop'])}")

def full_analysis(log_dir: Path):
    """Run complete analysis on a session"""
    print(f"\n{'#'*60}")
    print(f"# FULL RACE ANALYSIS: {log_dir.name}")
    print(f"{'#'*60}")
    
    # 1. Session overview
    stats_file = log_dir / "stats.json"
    if stats_file.exists():
        with open(stats_file) as f:
            stats = json.load(f)
        
        print(f"\n📊 SESSION OVERVIEW")
        print(f"   Duration: {stats['elapsed_seconds']/60:.1f} minutes")
        print(f"   Total Events: {sum(stats['event_counts'].values()):,}")
    
    # 2. Driver list
    drivers = get_all_drivers(log_dir)
    print(f"\n👥 DRIVERS ({len(drivers)})")
    for i, driver in enumerate(drivers, 1):
        print(f"   {i:2}. {driver}")
    
    # 3. Incident analysis
    incidents = analyze_incidents_detailed(log_dir)
    print(f"\n⚠️  INCIDENTS ({len(incidents)})")
    
    driver_incidents = defaultdict(int)
    corner_incidents = defaultdict(int)
    for inc in incidents:
        for driver in inc['drivers'].split(', '):
            driver_incidents[driver] += 1
        corner_incidents[inc['corner']] += 1
    
    print(f"\n   By Driver:")
    for driver, count in sorted(driver_incidents.items(), key=lambda x: -x[1])[:10]:
        print(f"      {driver}: {count}")
    
    print(f"\n   By Corner:")
    for corner, count in sorted(corner_incidents.items(), key=lambda x: -x[1]):
        print(f"      {corner}: {count}")
    
    # 4. Lap analysis for key driver
    generate_lap_report(log_dir, "Conrad Weeden")
    
    # 5. Export to CSV
    export_dir = export_to_csv(log_dir)
    
    print(f"\n✅ Analysis complete! CSV files exported to: {export_dir}")

def main():
    log_base = Path(__file__).parent / "race_logs"
    
    if not log_base.exists():
        print("No race logs found!")
        return
    
    sessions = sorted([d for d in log_base.iterdir() if d.is_dir()], reverse=True)
    
    if not sessions:
        print("No session data found!")
        return
    
    print(f"\nFound {len(sessions)} race session(s)")
    
    # Analyze the main session (the one with more data)
    # Sort by file size to find the most complete session
    sessions_with_size = []
    for s in sessions:
        all_events = s / "all_events.jsonl"
        size = all_events.stat().st_size if all_events.exists() else 0
        sessions_with_size.append((s, size))
    
    sessions_with_size.sort(key=lambda x: -x[1])
    
    # Analyze the largest session
    if sessions_with_size:
        full_analysis(sessions_with_size[0][0])

if __name__ == "__main__":
    main()
