#!/usr/bin/env python3
"""
Full Racing Report Generator
Generates comprehensive race reports for all collected sessions
"""
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Tuple

RACE_LOGS_DIR = Path("race_logs")

def load_session_data(session_dir: Path) -> Dict:
    """Load all data for a session"""
    data = {
        'session_info': [],
        'incidents': [],
        'stats': {},
        'telemetry_samples': 0
    }
    
    # Load session info
    session_file = session_dir / "session.jsonl"
    if session_file.exists():
        with open(session_file, 'r', errors='ignore') as f:
            for line in f:
                try:
                    data['session_info'].append(json.loads(line.strip()))
                except:
                    pass
    
    # Load incidents
    incidents_file = session_dir / "incidents.jsonl"
    if incidents_file.exists():
        with open(incidents_file, 'r', errors='ignore') as f:
            for line in f:
                try:
                    data['incidents'].append(json.loads(line.strip()))
                except:
                    pass
    
    # Load stats
    stats_file = session_dir / "stats.json"
    if stats_file.exists():
        with open(stats_file, 'r') as f:
            data['stats'] = json.load(f)
    
    return data

def get_track_name(session_data: Dict) -> str:
    """Extract track name from session data"""
    for info in session_data['session_info']:
        if 'data' in info:
            track = info['data'].get('trackName') or info['data'].get('track')
            if track and track != 'Live Session':
                return track
    return "Unknown Track"

def get_session_type(session_data: Dict) -> str:
    """Extract session type from session data"""
    for info in session_data['session_info']:
        if 'data' in info:
            session_type = info['data'].get('sessionType') or info['data'].get('session')
            if session_type:
                return session_type.title()
    return "Unknown"

def analyze_incidents(incidents: List[Dict], driver_name: str = "Conrad Weeden") -> Dict:
    """Analyze incidents for a driver"""
    # Deduplicate incidents by timestamp
    seen = set()
    unique_incidents = []
    for inc in incidents:
        ts = inc.get('ts', 0)
        drivers = str(inc.get('data', {}).get('driverNames', []))
        key = f"{ts:.0f}_{drivers}"
        if key not in seen:
            seen.add(key)
            unique_incidents.append(inc)
    
    # Filter driver incidents
    driver_incidents = []
    for inc in unique_incidents:
        driver_names = inc.get('data', {}).get('driverNames', [])
        if driver_name in driver_names:
            driver_incidents.append(inc)
    
    # Analyze by corner
    by_corner = defaultdict(int)
    by_lap = defaultdict(int)
    timeline = []
    
    for inc in driver_incidents:
        corner = inc.get('data', {}).get('cornerName', 'Unknown')
        lap = inc.get('data', {}).get('lap', 0)
        ts = inc.get('ts', 0)
        
        by_corner[corner] += 1
        by_lap[lap] += 1
        timeline.append({
            'timestamp': datetime.fromtimestamp(ts).strftime('%H:%M:%S'),
            'lap': lap,
            'corner': corner
        })
    
    # All incidents by driver
    all_drivers = defaultdict(int)
    for inc in unique_incidents:
        for driver in inc.get('data', {}).get('driverNames', []):
            if driver != 'Pace Car':
                all_drivers[driver] += 1
    
    return {
        'total': len(driver_incidents),
        'by_corner': dict(by_corner),
        'by_lap': dict(by_lap),
        'timeline': timeline,
        'all_drivers': dict(sorted(all_drivers.items(), key=lambda x: -x[1])[:10])
    }

def format_duration(seconds: float) -> str:
    """Format seconds as human readable duration"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    if mins >= 60:
        hours = mins // 60
        mins = mins % 60
        return f"{hours}h {mins}m {secs}s"
    return f"{mins}m {secs}s"

def generate_report(session_id: str, session_data: Dict) -> str:
    """Generate a full race report for a session"""
    track = get_track_name(session_data)
    session_type = get_session_type(session_data)
    stats = session_data['stats']
    incidents = session_data['incidents']
    
    duration = stats.get('elapsed_seconds', 0)
    event_counts = stats.get('event_counts', {})
    
    incident_analysis = analyze_incidents(incidents)
    
    report = []
    
    # Header
    report.append(f"# 🏁 Race Report: {track}")
    report.append("")
    report.append(f"**Session ID:** {session_id}")
    report.append(f"**Session Type:** {session_type}")
    report.append(f"**Duration:** {format_duration(duration)}")
    report.append(f"**Date:** {stats.get('last_update', 'Unknown')[:10]}")
    report.append("")
    
    # Data Collection Summary
    report.append("## 📊 Data Collection Summary")
    report.append("")
    report.append("| Metric | Count |")
    report.append("|--------|-------|")
    report.append(f"| Telemetry Updates | {event_counts.get('telemetry:update', 0):,} |")
    report.append(f"| Driver Telemetry | {event_counts.get('telemetry:driver', 0):,} |")
    report.append(f"| Competitor Data | {event_counts.get('competitor_data', 0):,} |")
    report.append(f"| Baseline Samples | {event_counts.get('telemetry:baseline', 0):,} |")
    report.append(f"| Race Events | {event_counts.get('race:event', 0)} |")
    report.append(f"| Incidents Detected | {event_counts.get('incident:new', 0)} |")
    report.append("")
    
    # Driver Performance
    report.append("## 🏎️ Driver Performance: Conrad Weeden")
    report.append("")
    report.append(f"**Total Incidents:** {incident_analysis['total']}")
    report.append("")
    
    if incident_analysis['timeline']:
        report.append("### Incident Timeline")
        report.append("")
        report.append("| Time | Lap | Location |")
        report.append("|------|-----|----------|")
        for inc in incident_analysis['timeline']:
            report.append(f"| {inc['timestamp']} | {inc['lap']} | {inc['corner']} |")
        report.append("")
    
    if incident_analysis['by_corner']:
        report.append("### Incidents by Corner")
        report.append("")
        report.append("| Corner | Count |")
        report.append("|--------|-------|")
        for corner, count in sorted(incident_analysis['by_corner'].items(), key=lambda x: -x[1]):
            report.append(f"| {corner} | {count} |")
        report.append("")
    
    # Field Analysis
    report.append("## 📈 Field Analysis")
    report.append("")
    report.append("### Top 10 Incident Leaders")
    report.append("")
    report.append("| Driver | Incidents |")
    report.append("|--------|-----------|")
    for driver, count in list(incident_analysis['all_drivers'].items())[:10]:
        marker = " ⭐" if driver == "Conrad Weeden" else ""
        report.append(f"| {driver}{marker} | {count} |")
    report.append("")
    
    # Session Notes
    report.append("## 📝 Session Notes")
    report.append("")
    
    # Determine discipline
    discipline = "oval"
    for inc in incidents[:5]:
        if inc.get('data', {}).get('disciplineContext') == 'road':
            discipline = "road"
            break
    
    if discipline == "oval":
        report.append("- **Track Type:** Oval")
        report.append("- **Car:** NASCAR Craftsman Truck Series")
    else:
        report.append("- **Track Type:** Road Course")
        report.append("- **Car:** Sports Car")
    
    # Recommendations based on incidents
    report.append("")
    report.append("## 💡 Recommendations")
    report.append("")
    
    if incident_analysis['total'] == 0:
        report.append("🟢 **Clean Session!** No incidents recorded. Great job!")
    elif incident_analysis['total'] <= 2:
        report.append("🟢 **Low Incident Count.** Solid, clean racing.")
    elif incident_analysis['total'] <= 4:
        report.append("🟡 **Moderate Incidents.** Review the incident locations for patterns.")
    else:
        report.append("🔴 **High Incident Count.** Consider:")
        report.append("- Being more conservative in traffic")
        report.append("- Leaving more room on restarts")
        report.append("- Reviewing corner entry speeds")
    
    # Check for corner patterns
    if incident_analysis['by_corner']:
        worst_corner = max(incident_analysis['by_corner'].items(), key=lambda x: x[1])
        if worst_corner[1] >= 2:
            report.append(f"")
            report.append(f"⚠️ **Hotspot:** {worst_corner[0]} ({worst_corner[1]} incidents)")
            report.append(f"   - Review your approach and line through this section")
    
    report.append("")
    report.append("---")
    report.append(f"*Report generated by Ok Box Box Telemetry System*")
    
    return "\n".join(report)

def main():
    print("=" * 60)
    print("🏁 Ok Box Box - Full Race Report Generator")
    print("=" * 60)
    print()
    
    # Find all session directories
    sessions = []
    for session_dir in sorted(RACE_LOGS_DIR.iterdir()):
        if session_dir.is_dir() and (session_dir / "stats.json").exists():
            sessions.append(session_dir)
    
    print(f"Found {len(sessions)} sessions to analyze")
    print()
    
    all_reports = []
    
    for session_dir in sessions:
        session_id = session_dir.name
        print(f"Processing session: {session_id}")
        
        session_data = load_session_data(session_dir)
        track = get_track_name(session_data)
        duration = session_data['stats'].get('elapsed_seconds', 0)
        
        # Skip very short sessions (< 30 seconds)
        if duration < 30:
            print(f"  ⏭️ Skipping (too short: {duration:.0f}s)")
            continue
        
        print(f"  📍 Track: {track}")
        print(f"  ⏱️ Duration: {format_duration(duration)}")
        
        report = generate_report(session_id, session_data)
        
        # Save individual report
        report_file = session_dir / "FULL_RACE_REPORT.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"  ✅ Saved: {report_file}")
        
        all_reports.append({
            'session_id': session_id,
            'track': track,
            'duration': duration,
            'report': report
        })
        print()
    
    # Generate combined report
    print("=" * 60)
    print("Generating combined race day report...")
    
    combined = []
    combined.append("# 🏆 Race Day Summary - March 3, 2026")
    combined.append("")
    combined.append("## Sessions Overview")
    combined.append("")
    combined.append("| Session | Track | Duration |")
    combined.append("|---------|-------|----------|")
    for r in all_reports:
        combined.append(f"| {r['session_id']} | {r['track']} | {format_duration(r['duration'])} |")
    combined.append("")
    combined.append("---")
    combined.append("")
    
    for r in all_reports:
        combined.append(r['report'])
        combined.append("")
        combined.append("---")
        combined.append("")
    
    combined_file = RACE_LOGS_DIR / "RACE_DAY_SUMMARY.md"
    with open(combined_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(combined))
    
    print(f"✅ Combined report saved: {combined_file}")
    print()
    print("=" * 60)
    print("🏁 Report generation complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
