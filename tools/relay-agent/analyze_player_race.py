#!/usr/bin/env python3
"""
Analyze player's race telemetry - extracts actual driving data
"""
import json
import csv
from pathlib import Path
from datetime import datetime

LOG_DIR = Path("race_logs/20260303_110231")

def load_player_telemetry():
    """Extract player telemetry from the race log"""
    telemetry_file = LOG_DIR / "telemetry.jsonl"
    
    player_data = []
    
    with open(telemetry_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                entry = json.loads(line)
                data = entry.get('data', {})
                cars = data.get('cars', [])
                
                # Find player car
                for car in cars:
                    if car.get('isPlayer'):
                        # Convert speed from m/s to mph
                        speed_ms = car.get('speed', 0)
                        speed_mph = speed_ms * 2.237
                        
                        player_data.append({
                            'timestamp': entry.get('ts', 0),
                            'speed_mph': speed_mph,
                            'speed_ms': speed_ms,
                            'rpm': car.get('rpm', 0),
                            'gear': car.get('gear', 0),
                            'throttle': car.get('throttle', 0) * 100,  # Convert to %
                            'brake': car.get('brake', 0) * 100,
                            'steering': car.get('steering', 0),
                            'lap': car.get('lap', 0),
                            'position': car.get('position', 0),
                            'class_position': car.get('classPosition', 0),
                            'track_pct': car.get('pos', {}).get('s', 0),
                            'fuel_level': car.get('fuelLevel', 0),
                            'fuel_pct': car.get('fuelPct', 0),
                            'last_lap_time': car.get('lastLapTime', 0),
                            'best_lap_time': car.get('bestLapTime', 0),
                            'incident_count': car.get('incidentCount', 0),
                            'in_pit': car.get('inPit', False),
                            'on_pit_road': car.get('onPitRoad', False),
                            'driver_name': car.get('driverName', ''),
                            'car_name': car.get('carName', ''),
                        })
                        break
            except json.JSONDecodeError:
                continue
    
    return player_data

def analyze_race(player_data):
    """Analyze the player's race performance"""
    if not player_data:
        print("No player data found!")
        return
    
    driver_name = player_data[0].get('driver_name', 'Unknown')
    car_name = player_data[0].get('car_name', 'Unknown')
    
    print(f"\n{'='*60}")
    print(f"RACE ANALYSIS: {driver_name}")
    print(f"Car: {car_name}")
    print(f"{'='*60}")
    
    # Filter to actual driving (speed > 5 mph)
    driving_data = [d for d in player_data if d['speed_mph'] > 5]
    
    if not driving_data:
        print("\nNo driving data found (all samples have speed < 5 mph)")
        print(f"Total samples: {len(player_data)}")
        # Show some samples anyway
        print("\nSample data (first 10 with any RPM):")
        rpm_samples = [d for d in player_data if d['rpm'] > 500][:10]
        for s in rpm_samples:
            print(f"  Speed: {s['speed_mph']:.1f} mph, RPM: {s['rpm']:.0f}, Throttle: {s['throttle']:.0f}%")
        return
    
    # Time analysis
    start_time = player_data[0]['timestamp']
    end_time = player_data[-1]['timestamp']
    duration = end_time - start_time
    
    print(f"\n📊 SESSION OVERVIEW")
    print(f"   Duration: {duration/60:.1f} minutes")
    print(f"   Total samples: {len(player_data)}")
    print(f"   Driving samples: {len(driving_data)}")
    
    # Speed analysis
    speeds = [d['speed_mph'] for d in driving_data]
    print(f"\n🏎️  SPEED ANALYSIS")
    print(f"   Max Speed: {max(speeds):.1f} mph")
    print(f"   Avg Speed: {sum(speeds)/len(speeds):.1f} mph")
    print(f"   Min Speed (driving): {min(speeds):.1f} mph")
    
    # RPM analysis
    rpms = [d['rpm'] for d in driving_data]
    print(f"\n⚙️  RPM ANALYSIS")
    print(f"   Max RPM: {max(rpms):.0f}")
    print(f"   Avg RPM: {sum(rpms)/len(rpms):.0f}")
    
    # Throttle/Brake analysis
    throttles = [d['throttle'] for d in driving_data]
    brakes = [d['brake'] for d in driving_data]
    print(f"\n🎮 INPUT ANALYSIS")
    print(f"   Avg Throttle: {sum(throttles)/len(throttles):.1f}%")
    print(f"   Max Throttle: {max(throttles):.1f}%")
    print(f"   Avg Brake: {sum(brakes)/len(brakes):.1f}%")
    print(f"   Max Brake: {max(brakes):.1f}%")
    
    # Position analysis
    positions = [d['position'] for d in player_data if d['position'] > 0]
    if positions:
        print(f"\n📍 POSITION")
        print(f"   Starting: P{positions[0]}")
        print(f"   Best: P{min(positions)}")
        print(f"   Final: P{positions[-1]}")
    
    # Lap analysis
    laps = set(d['lap'] for d in player_data if d['lap'] >= 0)
    print(f"\n🔄 LAPS")
    print(f"   Laps completed: {max(laps) if laps else 0}")
    
    # Incident analysis
    incidents = [d['incident_count'] for d in player_data]
    if incidents:
        start_inc = incidents[0]
        end_inc = incidents[-1]
        # iRacing incident count is cumulative and includes flags
        # Real incident points are lower bits
        real_start = start_inc & 0xFFFF
        real_end = end_inc & 0xFFFF
        print(f"\n⚠️  INCIDENTS")
        print(f"   Incident points gained: {real_end - real_start}")
    
    return driving_data

def export_to_csv(player_data, output_file):
    """Export player telemetry to CSV"""
    if not player_data:
        return
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=player_data[0].keys())
        writer.writeheader()
        writer.writerows(player_data)
    
    print(f"\n✅ Exported to: {output_file}")

def main():
    print("Loading player telemetry...")
    player_data = load_player_telemetry()
    print(f"Loaded {len(player_data)} samples")
    
    driving_data = analyze_race(player_data)
    
    # Export full telemetry
    csv_dir = LOG_DIR / "csv_export"
    csv_dir.mkdir(exist_ok=True)
    export_to_csv(player_data, csv_dir / "player_telemetry.csv")
    
    # Export driving-only data
    if driving_data:
        export_to_csv(driving_data, csv_dir / "player_driving.csv")

if __name__ == "__main__":
    main()
