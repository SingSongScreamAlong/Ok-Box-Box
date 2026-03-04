#!/usr/bin/env python3
"""
Generate comprehensive race report for Auto Club Speedway session
"""
import json
import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict

LOG_DIR = Path("race_logs/20260303_095331")
REPORT_FILE = LOG_DIR / "RACE_REPORT.md"

def load_jsonl(filepath, max_lines=None):
    """Load JSONL file"""
    events = []
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for i, line in enumerate(f):
            if max_lines and i >= max_lines:
                break
            try:
                events.append(json.loads(line))
            except:
                pass
    return events

def extract_player_data(all_events_file, max_lines=500000):
    """Extract player telemetry from all_events"""
    player_data = []
    all_drivers = {}
    session_info = None
    
    with open(all_events_file, 'r', encoding='utf-8', errors='ignore') as f:
        for i, line in enumerate(f):
            if i >= max_lines:
                break
            try:
                event = json.loads(line)
                
                # Get session info
                if event.get('event') == 'session:active' and not session_info:
                    session_info = event.get('data', {})
                
                # Get telemetry
                if event.get('event') == 'telemetry:driver':
                    data = event.get('data', {})
                    cars = data.get('cars', [])
                    
                    for car in cars:
                        driver_name = car.get('driverName', '')
                        if driver_name:
                            all_drivers[driver_name] = {
                                'car': car.get('carName', ''),
                                'carNumber': car.get('carNumber', ''),
                                'iRating': car.get('iRating', 0),
                            }
                        
                        if car.get('isPlayer'):
                            player_data.append({
                                'ts': event.get('ts', 0),
                                'speed_ms': car.get('speed', 0),
                                'speed_mph': car.get('speed', 0) * 2.237,
                                'rpm': car.get('rpm', 0),
                                'gear': car.get('gear', 0),
                                'throttle': car.get('throttle', 0) * 100,
                                'brake': car.get('brake', 0) * 100,
                                'steering': car.get('steering', 0),
                                'lap': car.get('lap', 0),
                                'position': car.get('position', 0),
                                'classPosition': car.get('classPosition', 0),
                                'trackPct': car.get('pos', {}).get('s', 0),
                                'fuelLevel': car.get('fuelLevel', 0),
                                'fuelPct': car.get('fuelPct', 0),
                                'lastLapTime': car.get('lastLapTime', 0),
                                'bestLapTime': car.get('bestLapTime', 0),
                                'incidentCount': car.get('incidentCount', 0),
                                'inPit': car.get('inPit', False),
                                'driverName': driver_name,
                                'carName': car.get('carName', ''),
                            })
            except:
                pass
    
    return player_data, all_drivers, session_info

def analyze_laps(player_data):
    """Analyze lap-by-lap performance"""
    laps = defaultdict(lambda: {
        'samples': [],
        'start_ts': None,
        'end_ts': None,
        'lap_time': 0,
    })
    
    for entry in player_data:
        lap = entry.get('lap', -1)
        if lap < 0:
            continue
        
        if laps[lap]['start_ts'] is None:
            laps[lap]['start_ts'] = entry['ts']
        laps[lap]['end_ts'] = entry['ts']
        laps[lap]['samples'].append(entry)
        
        if entry.get('lastLapTime', 0) > 0 and lap > 0:
            laps[lap - 1]['lap_time'] = entry['lastLapTime']
    
    result = []
    for lap_num in sorted(laps.keys()):
        lap_data = laps[lap_num]
        samples = lap_data['samples']
        if not samples:
            continue
        
        speeds = [s['speed_mph'] for s in samples if s['speed_mph'] > 5]
        rpms = [s['rpm'] for s in samples if s['rpm'] > 0]
        throttles = [s['throttle'] for s in samples]
        brakes = [s['brake'] for s in samples]
        positions = [s['position'] for s in samples if s['position'] > 0]
        
        result.append({
            'lap': lap_num,
            'lap_time': lap_data['lap_time'],
            'max_speed': max(speeds) if speeds else 0,
            'avg_speed': sum(speeds)/len(speeds) if speeds else 0,
            'max_rpm': max(rpms) if rpms else 0,
            'avg_rpm': sum(rpms)/len(rpms) if rpms else 0,
            'avg_throttle': sum(throttles)/len(throttles) if throttles else 0,
            'avg_brake': sum(brakes)/len(brakes) if brakes else 0,
            'start_pos': positions[0] if positions else 0,
            'end_pos': positions[-1] if positions else 0,
            'samples': len(samples),
        })
    
    return result

def analyze_incidents(incidents_file):
    """Analyze incidents"""
    incidents = load_jsonl(incidents_file)
    
    by_driver = defaultdict(list)
    by_corner = defaultdict(list)
    timeline = []
    
    for inc in incidents:
        data = inc.get('data', inc)
        ts = inc.get('ts', 0)
        drivers = data.get('driverNames', ['Unknown'])
        corner = data.get('cornerName', 'Unknown')
        severity = data.get('severity', 'unknown')
        lap = data.get('lap', 0)
        
        for driver in drivers:
            by_driver[driver].append({
                'ts': ts,
                'corner': corner,
                'severity': severity,
                'lap': lap,
            })
        
        by_corner[corner].append({
            'ts': ts,
            'drivers': drivers,
            'severity': severity,
        })
        
        timeline.append({
            'ts': ts,
            'drivers': drivers,
            'corner': corner,
            'severity': severity,
            'lap': lap,
        })
    
    return {
        'total': len(incidents),
        'by_driver': dict(by_driver),
        'by_corner': dict(by_corner),
        'timeline': sorted(timeline, key=lambda x: x['ts']),
    }

def format_lap_time(seconds):
    """Format lap time as mm:ss.xxx"""
    if seconds <= 0:
        return "—"
    mins = int(seconds // 60)
    secs = seconds % 60
    if mins > 0:
        return f"{mins}:{secs:06.3f}"
    return f"{secs:.3f}"

def generate_report():
    """Generate the full race report"""
    print("Loading data...")
    
    # Load stats
    with open(LOG_DIR / "stats.json") as f:
        stats = json.load(f)
    
    # Extract player data
    player_data, all_drivers, session_info = extract_player_data(LOG_DIR / "all_events.jsonl")
    
    # Analyze laps
    laps = analyze_laps(player_data)
    
    # Analyze incidents
    incidents = analyze_incidents(LOG_DIR / "incidents.jsonl")
    
    # Get player info
    player_name = player_data[0]['driverName'] if player_data else "Unknown"
    player_car = player_data[0]['carName'] if player_data else "Unknown"
    
    # Filter driving data
    driving_data = [d for d in player_data if d['speed_mph'] > 5]
    
    # Calculate stats
    if driving_data:
        speeds = [d['speed_mph'] for d in driving_data]
        rpms = [d['rpm'] for d in driving_data if d['rpm'] > 0]
        throttles = [d['throttle'] for d in driving_data]
        brakes = [d['brake'] for d in driving_data]
        positions = [d['position'] for d in player_data if d['position'] > 0]
    else:
        speeds = rpms = throttles = brakes = positions = []
    
    # Build report
    report = []
    report.append("# 🏁 Race Report: Auto Club Speedway")
    report.append("")
    report.append(f"**Date:** {datetime.now().strftime('%B %d, %Y')}")
    report.append(f"**Session Duration:** {stats['elapsed_seconds']/60:.1f} minutes")
    report.append(f"**Total Events Captured:** {sum(stats['event_counts'].values()):,}")
    report.append("")
    
    # Driver Info
    report.append("## 👤 Driver Information")
    report.append("")
    report.append(f"| Field | Value |")
    report.append(f"|-------|-------|")
    report.append(f"| **Driver** | {player_name} |")
    report.append(f"| **Car** | {player_car} |")
    report.append(f"| **Starting Position** | P{positions[0] if positions else '?'} |")
    report.append(f"| **Final Position** | P{positions[-1] if positions else '?'} |")
    report.append(f"| **Best Position** | P{min(positions) if positions else '?'} |")
    laps_completed = max((d['lap'] for d in player_data if d['lap'] >= 0), default=0)
    report.append(f"| **Laps Completed** | {laps_completed} |")
    report.append("")
    
    # Performance Summary
    report.append("## 🏎️ Performance Summary")
    report.append("")
    report.append("### Speed Analysis")
    report.append("")
    report.append(f"| Metric | Value |")
    report.append(f"|--------|-------|")
    if speeds:
        report.append(f"| **Maximum Speed** | {max(speeds):.1f} mph |")
        report.append(f"| **Average Speed** | {sum(speeds)/len(speeds):.1f} mph |")
        report.append(f"| **Minimum Speed (driving)** | {min(speeds):.1f} mph |")
    report.append("")
    
    report.append("### Engine Performance")
    report.append("")
    report.append(f"| Metric | Value |")
    report.append(f"|--------|-------|")
    if rpms:
        report.append(f"| **Maximum RPM** | {max(rpms):,.0f} |")
        report.append(f"| **Average RPM** | {sum(rpms)/len(rpms):,.0f} |")
    report.append("")
    
    report.append("### Driver Inputs")
    report.append("")
    report.append(f"| Metric | Value |")
    report.append(f"|--------|-------|")
    if throttles:
        report.append(f"| **Average Throttle** | {sum(throttles)/len(throttles):.1f}% |")
        report.append(f"| **Maximum Throttle** | {max(throttles):.1f}% |")
    if brakes:
        report.append(f"| **Average Brake** | {sum(brakes)/len(brakes):.1f}% |")
        report.append(f"| **Maximum Brake** | {max(brakes):.1f}% |")
    report.append("")
    
    # Lap Analysis
    report.append("## 🔄 Lap-by-Lap Analysis")
    report.append("")
    if laps:
        report.append(f"| Lap | Time | Max Speed | Avg Speed | Max RPM | Start Pos | End Pos |")
        report.append(f"|-----|------|-----------|-----------|---------|-----------|---------|")
        for lap in laps:
            report.append(f"| {lap['lap']} | {format_lap_time(lap['lap_time'])} | {lap['max_speed']:.1f} mph | {lap['avg_speed']:.1f} mph | {lap['max_rpm']:,.0f} | P{lap['start_pos']} | P{lap['end_pos']} |")
        report.append("")
        
        # Best lap
        valid_laps = [l for l in laps if l['lap_time'] > 0]
        if valid_laps:
            best = min(valid_laps, key=lambda x: x['lap_time'])
            report.append(f"**Best Lap:** Lap {best['lap']} - {format_lap_time(best['lap_time'])}")
            report.append("")
    
    # Incident Analysis
    report.append("## ⚠️ Incident Analysis")
    report.append("")
    report.append(f"**Total Incidents in Session:** {incidents['total']}")
    report.append("")
    
    # Player incidents
    player_incidents = incidents['by_driver'].get(player_name, [])
    report.append(f"### Your Incidents: {len(player_incidents)}")
    report.append("")
    if player_incidents:
        report.append(f"| Time | Corner | Severity | Lap |")
        report.append(f"|------|--------|----------|-----|")
        for inc in player_incidents[:10]:
            time_str = datetime.fromtimestamp(inc['ts']).strftime('%H:%M:%S')
            report.append(f"| {time_str} | {inc['corner']} | {inc['severity']} | {inc['lap']} |")
        report.append("")
    
    # Incident hotspots
    report.append("### Incident Hotspots")
    report.append("")
    report.append(f"| Corner | Incidents |")
    report.append(f"|--------|-----------|")
    for corner, incs in sorted(incidents['by_corner'].items(), key=lambda x: -len(x[1])):
        report.append(f"| {corner} | {len(incs)} |")
    report.append("")
    
    # Driver incident leaderboard
    report.append("### Incident Leaderboard")
    report.append("")
    report.append(f"| Driver | Incidents |")
    report.append(f"|--------|-----------|")
    for driver, incs in sorted(incidents['by_driver'].items(), key=lambda x: -len(x[1]))[:10]:
        marker = " ⬅️ YOU" if driver == player_name else ""
        report.append(f"| {driver}{marker} | {len(incs)} |")
    report.append("")
    
    # Field Analysis
    report.append("## 👥 Field Analysis")
    report.append("")
    report.append(f"**Total Drivers:** {len(all_drivers)}")
    report.append("")
    report.append(f"| # | Driver | Car | iRating |")
    report.append(f"|---|--------|-----|---------|")
    sorted_drivers = sorted(all_drivers.items(), key=lambda x: -x[1].get('iRating', 0))
    for i, (driver, info) in enumerate(sorted_drivers, 1):
        marker = " ⬅️" if driver == player_name else ""
        report.append(f"| {i} | {driver}{marker} | {info['car']} | {info['iRating']:,} |")
    report.append("")
    
    # Data Summary
    report.append("## 📊 Data Summary")
    report.append("")
    report.append(f"| Event Type | Count |")
    report.append(f"|------------|-------|")
    for event, count in sorted(stats['event_counts'].items(), key=lambda x: -x[1]):
        report.append(f"| {event} | {count:,} |")
    report.append("")
    
    # Telemetry samples
    report.append(f"**Total Telemetry Samples:** {len(player_data):,}")
    report.append(f"**Driving Samples (speed > 5 mph):** {len(driving_data):,}")
    report.append("")
    
    # Footer
    report.append("---")
    report.append(f"*Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
    report.append(f"*Data captured by PitBox Race Logger*")
    
    # Write report
    report_text = "\n".join(report)
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report_text)
    
    print(f"\n✅ Report saved to: {REPORT_FILE}")
    print("\n" + "="*60)
    print(report_text)
    print("="*60)
    
    return report_text

if __name__ == "__main__":
    generate_report()
