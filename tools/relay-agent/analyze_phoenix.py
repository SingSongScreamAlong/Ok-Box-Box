#!/usr/bin/env python3
"""Analyze Phoenix Raceway session"""
import json
from pathlib import Path
from collections import defaultdict

LOG_DIR = Path("race_logs/20260303_110231")

def analyze():
    print("\n" + "="*60)
    print("PHOENIX RACEWAY SESSION ANALYSIS")
    print("="*60)
    
    # Load stats
    with open(LOG_DIR / "stats.json") as f:
        stats = json.load(f)
    
    print(f"\n📊 SESSION OVERVIEW")
    print(f"   Duration: {stats['elapsed_seconds']/60:.1f} minutes")
    print(f"   Total Events: {sum(stats['event_counts'].values()):,}")
    print(f"   Telemetry Updates: {stats['event_counts'].get('telemetry:update', 0):,}")
    
    # Load player telemetry
    player_file = LOG_DIR / "player_telemetry.jsonl"
    player_data = []
    with open(player_file) as f:
        for line in f:
            try:
                player_data.append(json.loads(line))
            except:
                pass
    
    print(f"   Player Samples: {len(player_data):,}")
    
    # Filter driving data (speed > 0)
    driving = [d for d in player_data if d.get('speed', 0) > 5]
    
    if driving:
        # Speed is already in mph from telemetry_update
        speeds = [d['speed'] for d in driving]
        rpms = [d['rpm'] for d in driving if d.get('rpm', 0) > 0]
        throttles = [d['throttle'] for d in driving]
        brakes = [d['brake'] for d in driving]
        
        print(f"\n🏎️  SPEED ANALYSIS ({len(driving)} driving samples)")
        print(f"   Max Speed: {max(speeds):.1f} mph")
        print(f"   Avg Speed: {sum(speeds)/len(speeds):.1f} mph")
        
        if rpms:
            print(f"\n⚙️  RPM")
            print(f"   Max RPM: {max(rpms):.0f}")
            print(f"   Avg RPM: {sum(rpms)/len(rpms):.0f}")
        
        print(f"\n🎮 INPUTS")
        print(f"   Avg Throttle: {sum(throttles)/len(throttles):.1f}%")
        print(f"   Max Throttle: {max(throttles):.1f}%")
        print(f"   Avg Brake: {sum(brakes)/len(brakes):.1f}%")
        print(f"   Max Brake: {max(brakes):.1f}%")
    else:
        print("\n   No driving data found (speed > 5)")
        # Show raw samples
        print("\n   Sample data:")
        for d in player_data[:5]:
            print(f"      speed={d.get('speed')}, rpm={d.get('rpm')}, throttle={d.get('throttle')}")
    
    # Analyze from all_events for full car data
    print("\n\n📡 Analyzing full telemetry from all_events...")
    all_events_file = LOG_DIR / "all_events.jsonl"
    
    player_full = []
    with open(all_events_file, 'r', encoding='utf-8', errors='ignore') as f:
        for i, line in enumerate(f):
            if i > 100000:  # Limit scan
                break
            try:
                event = json.loads(line)
                if event.get('event') == 'telemetry:driver':
                    data = event.get('data', {})
                    cars = data.get('cars', [])
                    for car in cars:
                        if car.get('isPlayer'):
                            player_full.append({
                                'ts': event.get('ts'),
                                'speed_ms': car.get('speed', 0),
                                'speed_mph': car.get('speed', 0) * 2.237,
                                'rpm': car.get('rpm', 0),
                                'throttle': car.get('throttle', 0) * 100,
                                'brake': car.get('brake', 0) * 100,
                                'gear': car.get('gear', 0),
                                'lap': car.get('lap', 0),
                                'position': car.get('position', 0),
                                'driver': car.get('driverName', ''),
                                'car': car.get('carName', ''),
                            })
                            break
            except:
                pass
    
    if player_full:
        driver = player_full[0].get('driver', 'Unknown')
        car = player_full[0].get('car', 'Unknown')
        print(f"\n   Driver: {driver}")
        print(f"   Car: {car}")
        print(f"   Full telemetry samples: {len(player_full)}")
        
        driving_full = [d for d in player_full if d['speed_mph'] > 5]
        if driving_full:
            speeds = [d['speed_mph'] for d in driving_full]
            rpms = [d['rpm'] for d in driving_full if d['rpm'] > 0]
            
            print(f"\n🏎️  FULL TELEMETRY ANALYSIS ({len(driving_full)} samples)")
            print(f"   Max Speed: {max(speeds):.1f} mph")
            print(f"   Avg Speed: {sum(speeds)/len(speeds):.1f} mph")
            
            if rpms:
                print(f"   Max RPM: {max(rpms):.0f}")
                print(f"   Avg RPM: {sum(rpms)/len(rpms):.0f}")
            
            # Position tracking
            positions = [d['position'] for d in player_full if d['position'] > 0]
            if positions:
                print(f"\n📍 POSITION")
                print(f"   Starting: P{positions[0]}")
                print(f"   Best: P{min(positions)}")
                print(f"   Final: P{positions[-1]}")
            
            # Laps
            laps = [d['lap'] for d in player_full if d['lap'] >= 0]
            if laps:
                print(f"\n🔄 LAPS: {max(laps)}")
    
    # Incidents
    incidents_file = LOG_DIR / "incidents.jsonl"
    if incidents_file.exists():
        incidents = []
        with open(incidents_file) as f:
            for line in f:
                try:
                    incidents.append(json.loads(line))
                except:
                    pass
        
        print(f"\n⚠️  INCIDENTS ({len(incidents)} total)")
        
        driver_inc = defaultdict(int)
        for inc in incidents:
            data = inc.get('data', inc)
            for d in data.get('driverNames', []):
                driver_inc[d] += 1
        
        print(f"\n   By Driver (top 10):")
        for driver, count in sorted(driver_inc.items(), key=lambda x: -x[1])[:10]:
            marker = " ← YOU" if 'weeden' in driver.lower() else ""
            print(f"      {driver}: {count}{marker}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    analyze()
