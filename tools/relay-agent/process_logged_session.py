#!/usr/bin/env python3
"""
Process Logged Session for IDP
Analyzes logged race data and generates a PostSessionSummary that can be
sent to the server for IDP processing, or outputs a local analysis report.

This tool works offline - it doesn't require an active server connection.
"""
import json
import gzip
import argparse
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Optional
import statistics
from datetime import datetime

def open_jsonl(filepath: Path):
    """Open a JSONL file, handling both compressed and uncompressed formats"""
    if filepath.suffix == '.gz':
        return gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore')
    elif filepath.with_suffix(filepath.suffix + '.gz').exists():
        return gzip.open(filepath.with_suffix(filepath.suffix + '.gz'), 'rt', encoding='utf-8', errors='ignore')
    else:
        return open(filepath, 'r', errors='ignore')

def extract_telemetry(log_dir: Path) -> List[Dict]:
    """Extract player telemetry from telemetry:driver events"""
    # Try compressed first, then uncompressed
    all_events_file = log_dir / "all_events.jsonl.gz"
    if not all_events_file.exists():
        all_events_file = log_dir / "all_events.jsonl"
    
    if not all_events_file.exists():
        print(f"❌ File not found: {all_events_file}")
        return []
    
    samples = []
    
    with open_jsonl(all_events_file) as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get('event') != 'telemetry:driver':
                    continue
                
                cars = evt.get('data', {}).get('cars', [])
                for car in cars:
                    if car.get('isPlayer'):
                        speed = car.get('speed', 0) or 0
                        if speed > 1:
                            samples.append({
                                'ts': evt.get('ts', 0),
                                'speed': speed,
                                'rpm': car.get('rpm', 0) or 0,
                                'throttle': car.get('throttle', 0) or 0,
                                'brake': car.get('brake', 0) or 0,
                                'steering': car.get('steering', 0) or 0,
                                'lap': car.get('lap', 0) or 0,
                                'position': car.get('position', 0) or 0,
                                'trackPct': car.get('trackPct', 0) or 0,
                                'fuelLevel': car.get('fuelLevel', 0) or 0,
                                'lastLapTime': car.get('lastLapTime', 0) or 0,
                            })
                        break
            except:
                pass
    
    return samples

def extract_incidents(log_dir: Path, driver_name: str = "Conrad Weeden") -> List[Dict]:
    """Extract incidents for the driver"""
    # Try compressed first, then uncompressed
    incidents_file = log_dir / "incidents.jsonl.gz"
    if not incidents_file.exists():
        incidents_file = log_dir / "incidents.jsonl"
    
    if not incidents_file.exists():
        return []
    
    incidents = []
    seen = set()
    
    with open_jsonl(incidents_file) as f:
        for line in f:
            try:
                evt = json.loads(line)
                data = evt.get('data', {})
                drivers = data.get('driverNames', [])
                
                if driver_name in drivers:
                    # Deduplicate by timestamp
                    ts = data.get('timestamp', 0)
                    if ts not in seen:
                        seen.add(ts)
                        incidents.append({
                            'ts': ts,
                            'lap': data.get('lap', 0),
                            'corner': data.get('cornerName', 'Unknown'),
                        })
            except:
                pass
    
    return incidents

def get_session_info(log_dir: Path) -> Dict:
    """Get session metadata"""
    # Try compressed first, then uncompressed
    session_file = log_dir / "session.jsonl.gz"
    if not session_file.exists():
        session_file = log_dir / "session.jsonl"
    
    info = {
        'trackName': 'Unknown',
        'sessionType': 'Unknown',
        'sessionId': log_dir.name,
    }
    
    if session_file.exists():
        with open_jsonl(session_file) as f:
            for line in f:
                try:
                    data = json.loads(line).get('data', {})
                    if data.get('trackName'):
                        info['trackName'] = data['trackName']
                    elif data.get('track'):
                        info['trackName'] = data['track']
                    if data.get('sessionType'):
                        info['sessionType'] = data['sessionType']
                    elif data.get('session'):
                        info['sessionType'] = data['session']
                except:
                    pass
    
    return info

def extract_flag_periods(log_dir: Path) -> List[Dict]:
    """Extract flag state changes to identify caution periods"""
    # Try compressed first, then uncompressed
    all_events_file = log_dir / "all_events.jsonl.gz"
    if not all_events_file.exists():
        all_events_file = log_dir / "all_events.jsonl"
    flag_periods = []
    
    if not all_events_file.exists():
        return flag_periods
    
    with open_jsonl(all_events_file) as f:
        for line in f:
            try:
                evt = json.loads(line)
                if evt.get('event') == 'race:event':
                    data = evt.get('data', {})
                    # Use event ts (seconds) - same format as telemetry samples
                    flag_periods.append({
                        'ts': evt.get('ts', 0),  # Already in seconds
                        'flag': data.get('flagState', 'green'),
                        'lap': data.get('lap', 0),
                    })
            except:
                pass
    
    return flag_periods

def is_caution_lap(lap_num: int, lap_start_ts: float, lap_end_ts: float, flag_periods: List[Dict]) -> bool:
    """Check if a lap was under caution"""
    for period in flag_periods:
        if period['flag'] == 'caution':
            # Check if caution overlaps with this lap
            if period['ts'] >= lap_start_ts and period['ts'] <= lap_end_ts:
                return True
    return False

def compute_lap_times(samples: List[Dict], flag_periods: List[Dict] = None) -> tuple:
    """
    Compute lap times from telemetry samples.
    Returns (all_lap_times, clean_lap_times) where clean excludes caution/pit laps.
    
    Groups samples by lap number and calculates time spent on each lap.
    """
    if not samples:
        return [], []
    
    # Group samples by lap
    laps_data = {}
    for sample in samples:
        lap = sample.get('lap', 0)
        if lap < 0:
            continue
        
        if lap not in laps_data:
            laps_data[lap] = {
                'first_ts': sample['ts'],
                'last_ts': sample['ts'],
                'had_pit': False,
                'samples': 0,
            }
        
        laps_data[lap]['last_ts'] = sample['ts']
        laps_data[lap]['samples'] += 1
        if sample.get('inPit', False):
            laps_data[lap]['had_pit'] = True
    
    # Calculate lap times (time from start of lap N to start of lap N+1)
    all_lap_times = []
    clean_lap_times = []
    sorted_laps = sorted(laps_data.keys())
    
    for i, lap_num in enumerate(sorted_laps[:-1]):  # Skip last lap (incomplete)
        next_lap = sorted_laps[i + 1]
        
        # Only count consecutive laps
        if next_lap != lap_num + 1:
            continue
        
        lap_time = laps_data[next_lap]['first_ts'] - laps_data[lap_num]['first_ts']
        
        # Sanity check - lap time should be reasonable (20s to 5min)
        if lap_time < 20 or lap_time > 300:
            continue
        
        lap_data = {
            'lap': lap_num,
            'time': lap_time,
            'is_pit_lap': laps_data[lap_num]['had_pit'],
            'is_caution': False,
        }
        
        # Check for caution
        if flag_periods:
            lap_data['is_caution'] = is_caution_lap(
                lap_num, 
                laps_data[lap_num]['first_ts'], 
                laps_data[next_lap]['first_ts'], 
                flag_periods
            )
        
        all_lap_times.append(lap_data)
        
        # Clean lap = not pit lap and not caution
        if not lap_data['is_pit_lap'] and not lap_data['is_caution']:
            clean_lap_times.append(lap_data)
    
    # Filter clean laps - remove outliers (> 2x median) for consistency calc
    if clean_lap_times and len(clean_lap_times) >= 3:
        times = [l['time'] for l in clean_lap_times]
        median_time = statistics.median(times)
        clean_lap_times = [l for l in clean_lap_times if l['time'] < median_time * 2]
    
    return all_lap_times, clean_lap_times

def compute_post_session_summary(samples: List[Dict], incidents: List[Dict], session_info: Dict, log_dir: Path = None) -> Dict:
    """
    Compute a PostSessionSummary matching the server's expected format.
    This can be sent to the server for IDP processing.
    """
    if not samples:
        return None
    
    # Basic stats
    duration_seconds = samples[-1]['ts'] - samples[0]['ts']
    session_minutes = duration_seconds / 60
    
    # Extract flag periods for caution detection
    flag_periods = extract_flag_periods(log_dir) if log_dir else []
    
    # Lap times (now returns all and clean separately)
    all_lap_times, clean_lap_times = compute_lap_times(samples, flag_periods)
    total_laps = len(all_lap_times)
    
    # Use clean lap times for pace analysis
    lap_times = [l['time'] for l in clean_lap_times] if clean_lap_times else [l['time'] for l in all_lap_times]
    
    if total_laps < 1:
        # Estimate from lap numbers
        laps = set(s['lap'] for s in samples if s['lap'] > 0)
        total_laps = len(laps)
    
    # Consistency (lap time std dev as percentage of mean)
    if lap_times and len(lap_times) >= 2:
        mean_lap = statistics.mean(lap_times)
        std_dev = statistics.stdev(lap_times)
        consistency = max(0, 100 - (std_dev / mean_lap * 100))
    else:
        consistency = 50  # Default
    
    # Pace trend
    if lap_times and len(lap_times) >= 4:
        first_half = statistics.mean(lap_times[:len(lap_times)//2])
        second_half = statistics.mean(lap_times[len(lap_times)//2:])
        if second_half < first_half - 0.5:
            pace_trend = 'improving'
        elif second_half > first_half + 0.5:
            pace_trend = 'degrading'
        else:
            pace_trend = 'stable'
    else:
        pace_trend = 'stable'
    
    # Incident analysis
    incident_count = len(incidents)
    incident_rate = incident_count / max(1, total_laps)
    
    # Check for incident clustering (multiple within 3 laps)
    incident_clustering = False
    incident_laps = sorted([i['lap'] for i in incidents if i['lap'] > 0])
    for i in range(1, len(incident_laps)):
        if incident_laps[i] - incident_laps[i-1] <= 3:
            incident_clustering = True
            break
    
    # Position changes
    positions = [s['position'] for s in samples if s['position'] > 0]
    if positions:
        start_pos = positions[0]
        end_pos = positions[-1]
        positions_gained = start_pos - end_pos
    else:
        positions_gained = 0
    
    # Mental state inference
    if incident_clustering and incident_rate > 0.5:
        mental_fatigue = 'tilted'
    elif incident_rate > 0.3 or pace_trend == 'degrading':
        mental_fatigue = 'fatigued'
    else:
        mental_fatigue = 'focused'
    
    return {
        'totalLaps': total_laps,
        'cleanLaps': len(clean_lap_times),
        'sessionMinutes': round(session_minutes, 1),
        'consistency': round(consistency, 1),
        'paceTrend': pace_trend,
        'incidentRate': round(incident_rate, 3),
        'incidentClustering': incident_clustering,
        'positionsGained': positions_gained,
        'mentalFatigue': mental_fatigue,
        # Additional data for reports
        'lapTimes': lap_times,  # Clean lap times only
        'allLapData': all_lap_times,  # All laps with metadata
        'incidentCount': incident_count,
        'trackName': session_info.get('trackName', 'Unknown'),
        'sessionType': session_info.get('sessionType', 'Unknown'),
    }

def generate_idp_report(summary: Dict, log_dir: Path) -> str:
    """Generate a markdown IDP report"""
    report = []
    
    report.append(f"# 🧠 IDP Analysis Report")
    report.append(f"")
    report.append(f"**Track:** {summary['trackName']}")
    report.append(f"**Session:** {summary['sessionType']}")
    report.append(f"**Duration:** {summary['sessionMinutes']:.1f} minutes")
    report.append(f"**Laps:** {summary['totalLaps']} total, {summary.get('cleanLaps', 0)} clean")
    report.append(f"")
    
    report.append(f"## 📊 Performance Metrics")
    report.append(f"")
    report.append(f"| Metric | Value | Assessment |")
    report.append(f"|--------|-------|------------|")
    
    # Consistency
    cons = summary['consistency']
    cons_grade = '🟢 Excellent' if cons >= 80 else '🟡 Good' if cons >= 60 else '🔴 Needs Work'
    report.append(f"| Consistency | {cons:.1f}% | {cons_grade} |")
    
    # Pace Trend
    pace = summary['paceTrend']
    pace_icon = '📈' if pace == 'improving' else '📉' if pace == 'degrading' else '➡️'
    report.append(f"| Pace Trend | {pace.title()} | {pace_icon} |")
    
    # Incidents
    inc_rate = summary['incidentRate']
    inc_grade = '🟢 Clean' if inc_rate < 0.1 else '🟡 Moderate' if inc_rate < 0.3 else '🔴 High'
    report.append(f"| Incident Rate | {inc_rate:.2f}/lap | {inc_grade} |")
    
    # Positions
    pos = summary['positionsGained']
    pos_str = f"+{pos}" if pos > 0 else str(pos)
    pos_grade = '🟢' if pos > 0 else '🟡' if pos == 0 else '🔴'
    report.append(f"| Positions | {pos_str} | {pos_grade} |")
    
    # Mental State
    mental = summary['mentalFatigue']
    mental_icon = '🧘' if mental == 'focused' else '😓' if mental == 'fatigued' else '😤'
    report.append(f"| Mental State | {mental.title()} | {mental_icon} |")
    
    report.append(f"")
    
    # Lap Times - show all laps with flags for caution/pit
    if summary.get('allLapData'):
        report.append(f"## ⏱️ Lap Times")
        report.append(f"")
        all_laps = summary['allLapData']
        report.append(f"| Lap | Time | Status |")
        report.append(f"|-----|------|--------|")
        for lap_data in all_laps:
            lt = lap_data['time']
            mins = int(lt // 60)
            secs = lt % 60
            status = ""
            if lap_data.get('is_pit_lap'):
                status = "🔧 Pit"
            elif lap_data.get('is_caution'):
                status = "🟡 Caution"
            else:
                status = "🟢 Clean"
            report.append(f"| {lap_data['lap']} | {mins}:{secs:05.2f} | {status} |")
        report.append(f"")
        
        clean_times = summary.get('lapTimes', [])
        if len(clean_times) >= 2:
            report.append(f"**Clean Lap Stats:**")
            report.append(f"- Best: {min(clean_times):.2f}s")
            report.append(f"- Average: {statistics.mean(clean_times):.2f}s")
            report.append(f"- Std Dev: {statistics.stdev(clean_times):.2f}s")
            report.append(f"")
    
    # Recommendations
    report.append(f"## 💡 Recommendations")
    report.append(f"")
    
    if summary['consistency'] < 70:
        report.append(f"- **Consistency:** Focus on hitting your marks every lap. Your lap times vary too much.")
    
    if summary['incidentRate'] > 0.2:
        report.append(f"- **Incidents:** {summary['incidentCount']} incidents in {summary['totalLaps']} laps. Consider more conservative racing.")
    
    if summary['incidentClustering']:
        report.append(f"- **Mental Reset:** Incidents are clustering. Take a breath after contact before pushing again.")
    
    if summary['paceTrend'] == 'degrading':
        report.append(f"- **Pace Management:** Your pace dropped through the session. Work on tire/fuel management.")
    
    if summary['positionsGained'] < 0:
        report.append(f"- **Race Craft:** Lost {abs(summary['positionsGained'])} positions. Review defensive driving.")
    
    if not any([
        summary['consistency'] < 70,
        summary['incidentRate'] > 0.2,
        summary['incidentClustering'],
        summary['paceTrend'] == 'degrading',
        summary['positionsGained'] < 0
    ]):
        report.append(f"🏆 **Great session!** Keep up the good work.")
    
    report.append(f"")
    report.append(f"---")
    report.append(f"*Generated by Ok Box Box IDP System*")
    
    return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description='Process logged session for IDP analysis')
    parser.add_argument('log_dir', nargs='?', help='Path to race log directory')
    parser.add_argument('--driver', '-d', default='Conrad Weeden', help='Driver name')
    parser.add_argument('--output', '-o', help='Output file for report')
    parser.add_argument('--json', '-j', action='store_true', help='Output JSON summary instead of report')
    
    args = parser.parse_args()
    
    logs_dir = Path(__file__).parent / "race_logs"
    
    if not args.log_dir:
        # Use most recent session
        sessions = sorted([d for d in logs_dir.iterdir() if d.is_dir() and (d / "stats.json").exists()])
        if not sessions:
            print("❌ No sessions found")
            return
        log_dir = sessions[-1]
    else:
        log_dir = Path(args.log_dir)
        if not log_dir.exists():
            log_dir = logs_dir / args.log_dir
    
    if not log_dir.exists():
        print(f"❌ Directory not found: {log_dir}")
        return
    
    print(f"Processing: {log_dir}")
    
    # Extract data
    print("Extracting telemetry...")
    samples = extract_telemetry(log_dir)
    print(f"  Found {len(samples)} samples")
    
    print("Extracting incidents...")
    incidents = extract_incidents(log_dir, args.driver)
    print(f"  Found {len(incidents)} incidents")
    
    session_info = get_session_info(log_dir)
    print(f"  Track: {session_info['trackName']}")
    
    # Compute summary
    print("Computing IDP summary...")
    summary = compute_post_session_summary(samples, incidents, session_info, log_dir)
    
    if not summary:
        print("❌ Not enough data to generate summary")
        return
    
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        report = generate_idp_report(summary, log_dir)
        
        if args.output:
            output_file = Path(args.output)
        else:
            output_file = log_dir / "IDP_ANALYSIS.md"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n{report}")
        print(f"\n✅ Report saved to: {output_file}")

if __name__ == "__main__":
    main()
