#!/usr/bin/env python3
"""
Race Data Analyzer - Analyzes captured race telemetry data
"""

import json
import os
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def load_jsonl(filepath):
    """Load a JSONL file, handling potential encoding issues"""
    events = []
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return events

def analyze_session(log_dir: Path):
    """Analyze a race session from logged data"""
    print(f"\n{'='*60}")
    print(f"RACE ANALYSIS: {log_dir.name}")
    print(f"{'='*60}\n")
    
    # Load stats
    stats_file = log_dir / "stats.json"
    if stats_file.exists():
        with open(stats_file) as f:
            stats = json.load(f)
        
        elapsed_mins = stats['elapsed_seconds'] / 60
        print(f"📊 SESSION OVERVIEW")
        print(f"   Duration: {elapsed_mins:.1f} minutes")
        print(f"   Total Events: {sum(stats['event_counts'].values()):,}")
        print(f"\n   Event Breakdown:")
        for event, count in sorted(stats['event_counts'].items(), key=lambda x: -x[1]):
            print(f"      {event}: {count:,}")
    
    # Load and analyze incidents
    incidents_file = log_dir / "incidents.jsonl"
    if incidents_file.exists():
        incidents = load_jsonl(incidents_file)
        print(f"\n\n⚠️  INCIDENTS ({len(incidents)} total)")
        
        # Group by driver
        driver_incidents = defaultdict(list)
        for inc in incidents:
            data = inc.get('data', inc)
            drivers = data.get('driverNames', ['Unknown'])
            for driver in drivers:
                driver_incidents[driver].append(data)
        
        print(f"\n   By Driver:")
        for driver, incs in sorted(driver_incidents.items(), key=lambda x: -len(x[1])):
            severities = [i.get('severity', 'unknown') for i in incs]
            high = severities.count('high')
            med = severities.count('med')
            low = severities.count('low')
            print(f"      {driver}: {len(incs)} incidents (high:{high}, med:{med}, low:{low})")
        
        # Group by corner
        corner_incidents = defaultdict(int)
        for inc in incidents:
            data = inc.get('data', inc)
            corner = data.get('cornerName', 'Unknown')
            corner_incidents[corner] += 1
        
        print(f"\n   By Corner:")
        for corner, count in sorted(corner_incidents.items(), key=lambda x: -x[1]):
            print(f"      {corner}: {count}")
    
    # Load telemetry for deeper analysis
    telemetry_file = log_dir / "telemetry.jsonl"
    if telemetry_file.exists():
        print(f"\n\n📈 TELEMETRY ANALYSIS")
        
        # Sample telemetry (don't load entire file - too large)
        telemetry_samples = []
        with open(telemetry_file, 'r', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f):
                if i % 100 == 0:  # Sample every 100th entry
                    try:
                        telemetry_samples.append(json.loads(line))
                    except:
                        pass
                if i > 10000:  # Limit samples
                    break
        
        if telemetry_samples:
            # Extract player data
            speeds = []
            rpms = []
            positions = []
            laps = []
            
            for sample in telemetry_samples:
                data = sample.get('data', sample)
                if 'speed' in data:
                    speeds.append(data['speed'])
                if 'rpm' in data:
                    rpms.append(data['rpm'])
                if 'position' in data:
                    positions.append(data['position'])
                if 'lap' in data:
                    laps.append(data['lap'])
            
            if speeds:
                print(f"   Speed: avg={sum(speeds)/len(speeds):.1f} mph, max={max(speeds):.1f} mph")
            if rpms:
                print(f"   RPM: avg={sum(rpms)/len(rpms):.0f}, max={max(rpms):.0f}")
            if positions:
                print(f"   Position: started={positions[0]}, best={min(positions)}, final={positions[-1]}")
            if laps:
                print(f"   Laps: {max(laps)}")
    
    # Load all events for timeline
    all_events_file = log_dir / "all_events.jsonl"
    if all_events_file.exists():
        print(f"\n\n🏁 RACE TIMELINE")
        
        # Get first and last timestamps
        first_ts = None
        last_ts = None
        race_events = []
        
        with open(all_events_file, 'r', encoding='utf-8', errors='ignore') as f:
            for i, line in enumerate(f):
                try:
                    event = json.loads(line)
                    ts = event.get('ts', 0)
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts
                    
                    # Capture important events
                    if event.get('event') in ['incident:new', 'race:event', 'session:active']:
                        race_events.append(event)
                except:
                    pass
                
                if i > 100000:  # Limit scan
                    break
        
        if first_ts and last_ts:
            duration = last_ts - first_ts
            print(f"   Start: {datetime.fromtimestamp(first_ts).strftime('%H:%M:%S')}")
            print(f"   End: {datetime.fromtimestamp(last_ts).strftime('%H:%M:%S')}")
            print(f"   Duration: {duration/60:.1f} minutes")
        
        # Show key events
        if race_events:
            print(f"\n   Key Events:")
            for event in race_events[:20]:  # Show first 20
                ts = event.get('ts', 0)
                event_type = event.get('event', 'unknown')
                data = event.get('data', {})
                
                if event_type == 'incident:new':
                    drivers = data.get('driverNames', ['Unknown'])
                    corner = data.get('cornerName', '?')
                    severity = data.get('severity', '?')
                    elapsed = (ts - first_ts) if first_ts else 0
                    print(f"      +{elapsed:.0f}s: 🚨 {', '.join(drivers)} - {corner} ({severity})")
                elif event_type == 'session:active':
                    track = data.get('trackName', 'Unknown')
                    session_type = data.get('sessionType', 'Unknown')
                    print(f"      +0s: 🏎️ Session started: {track} [{session_type}]")
    
    print(f"\n{'='*60}\n")


def main():
    log_base = Path(__file__).parent / "race_logs"
    
    if not log_base.exists():
        print("No race logs found!")
        return
    
    # Find all session directories
    sessions = sorted([d for d in log_base.iterdir() if d.is_dir()], reverse=True)
    
    if not sessions:
        print("No session data found!")
        return
    
    print(f"\nFound {len(sessions)} race session(s)")
    
    # Analyze all sessions
    for session_dir in sessions:
        analyze_session(session_dir)


if __name__ == "__main__":
    main()
