#!/usr/bin/env python3
"""
Extract Player Telemetry from Race Logs
Properly extracts from telemetry:driver events (not telemetry_update)
"""
import json
import gzip
from pathlib import Path
from typing import List, Dict, Optional
import argparse

def open_jsonl(filepath: Path):
    """Open a JSONL file, handling both compressed and uncompressed formats"""
    if filepath.suffix == '.gz':
        return gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore')
    else:
        return open(filepath, 'r', errors='ignore')

def extract_player_telemetry(log_dir: Path, driver_name: Optional[str] = None) -> List[Dict]:
    """
    Extract player telemetry from telemetry:driver events.
    
    Args:
        log_dir: Path to the race log directory
        driver_name: Optional driver name filter (defaults to isPlayer=True)
    
    Returns:
        List of telemetry samples with movement data
    """
    # Try compressed first, then uncompressed
    all_events_file = log_dir / "all_events.jsonl.gz"
    if not all_events_file.exists():
        all_events_file = log_dir / "all_events.jsonl"
    
    if not all_events_file.exists():
        print(f"❌ File not found: {all_events_file}")
        return []
    
    samples = []
    total_events = 0
    skipped_stationary = 0
    
    with open_jsonl(all_events_file) as f:
        for line in f:
            try:
                evt = json.loads(line)
                
                # Only process telemetry:driver events
                if evt.get('event') != 'telemetry:driver':
                    continue
                
                total_events += 1
                data = evt.get('data', {})
                cars = data.get('cars', [])
                
                for car in cars:
                    # Filter by driver name or isPlayer flag
                    is_target = False
                    if driver_name:
                        is_target = car.get('driverName') == driver_name
                    else:
                        is_target = car.get('isPlayer', False)
                    
                    if not is_target:
                        continue
                    
                    speed = car.get('speed', 0) or 0
                    
                    # Skip stationary samples (speed < 1 m/s)
                    if speed < 1:
                        skipped_stationary += 1
                        continue
                    
                    sample = {
                        'ts': evt.get('ts', 0),
                        'speed': speed,
                        'speed_mph': speed * 2.237,  # m/s to mph
                        'rpm': car.get('rpm', 0) or 0,
                        'gear': car.get('gear', 0) or 0,
                        'throttle': car.get('throttle', 0) or 0,
                        'brake': car.get('brake', 0) or 0,
                        'steering': car.get('steering', 0) or 0,
                        'lap': car.get('lap', 0) or 0,
                        'position': car.get('position', 0) or 0,
                        'classPosition': car.get('classPosition', 0) or 0,
                        'trackPct': car.get('trackPct', 0) or car.get('lapDistPct', 0) or 0,
                        'fuelLevel': car.get('fuelLevel', 0) or 0,
                        'fuelPct': car.get('fuelPct', 0) or 0,
                        'inPit': car.get('inPit', False),
                        'driverName': car.get('driverName', ''),
                        'lastLapTime': car.get('lastLapTime', 0) or 0,
                        'bestLapTime': car.get('bestLapTime', 0) or 0,
                    }
                    samples.append(sample)
                    break  # Only one player per event
                    
            except json.JSONDecodeError:
                continue
            except Exception as e:
                continue
    
    print(f"Processed {total_events} telemetry:driver events")
    print(f"Skipped {skipped_stationary} stationary samples")
    print(f"Extracted {len(samples)} moving samples")
    
    return samples

def save_extracted_telemetry(samples: List[Dict], output_file: Path):
    """Save extracted telemetry to JSONL file"""
    with open(output_file, 'w', encoding='utf-8') as f:
        for sample in samples:
            f.write(json.dumps(sample) + '\n')
    print(f"✅ Saved to: {output_file}")

def analyze_extracted_data(samples: List[Dict]):
    """Print summary statistics of extracted data"""
    if not samples:
        print("No data to analyze")
        return
    
    speeds = [s['speed_mph'] for s in samples]
    rpms = [s['rpm'] for s in samples if s['rpm'] > 0]
    throttles = [s['throttle'] for s in samples]
    brakes = [s['brake'] for s in samples]
    fuels = [s['fuelLevel'] for s in samples if s['fuelLevel'] > 0]
    laps = set(s['lap'] for s in samples if s['lap'] > 0)
    
    print("\n" + "="*50)
    print("EXTRACTED TELEMETRY SUMMARY")
    print("="*50)
    print(f"Total samples: {len(samples)}")
    print(f"Duration: {(samples[-1]['ts'] - samples[0]['ts']):.1f} seconds")
    print(f"Laps covered: {sorted(laps) if laps else 'None'}")
    print(f"\nSpeed (mph):")
    print(f"  Min: {min(speeds):.1f}")
    print(f"  Max: {max(speeds):.1f}")
    print(f"  Avg: {sum(speeds)/len(speeds):.1f}")
    
    if rpms:
        print(f"\nRPM:")
        print(f"  Min: {min(rpms):.0f}")
        print(f"  Max: {max(rpms):.0f}")
        print(f"  Avg: {sum(rpms)/len(rpms):.0f}")
    
    print(f"\nThrottle:")
    print(f"  Avg: {sum(throttles)/len(throttles)*100:.1f}%")
    print(f"  Full throttle samples: {len([t for t in throttles if t > 0.95])}")
    
    print(f"\nBrake:")
    print(f"  Avg: {sum(brakes)/len(brakes)*100:.1f}%")
    print(f"  Heavy braking samples: {len([b for b in brakes if b > 0.5])}")
    
    if fuels:
        print(f"\nFuel:")
        print(f"  Start: {fuels[0]:.2f}L")
        print(f"  End: {fuels[-1]:.2f}L")
        print(f"  Used: {fuels[0] - fuels[-1]:.2f}L")

def main():
    parser = argparse.ArgumentParser(description='Extract player telemetry from race logs')
    parser.add_argument('log_dir', nargs='?', default='race_logs/20260303_110231',
                        help='Path to race log directory')
    parser.add_argument('--driver', '-d', help='Driver name to extract (default: isPlayer=True)')
    parser.add_argument('--output', '-o', help='Output file path')
    
    args = parser.parse_args()
    log_dir = Path(args.log_dir)
    
    print(f"Extracting telemetry from: {log_dir}")
    
    samples = extract_player_telemetry(log_dir, args.driver)
    
    if samples:
        analyze_extracted_data(samples)
        
        # Save to file
        output_file = Path(args.output) if args.output else log_dir / "player_telemetry_extracted.jsonl"
        save_extracted_telemetry(samples, output_file)

if __name__ == "__main__":
    main()
