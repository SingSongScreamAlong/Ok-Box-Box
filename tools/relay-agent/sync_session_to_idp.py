#!/usr/bin/env python3
"""
Sync Logged Session to IDP Pipeline
Sends session_end event to server to trigger IDP processing for historical data
"""
import socketio
import json
import argparse
import time
from pathlib import Path

DEFAULT_SERVER_URL = "http://localhost:3001"

def get_session_info(log_dir: Path) -> dict:
    """Extract session info from logged data"""
    session_file = log_dir / "session.jsonl"
    stats_file = log_dir / "stats.json"
    
    session_info = {
        'sessionId': log_dir.name,
        'trackName': 'Unknown',
        'sessionType': 'Unknown',
    }
    
    # Try to get session info
    if session_file.exists():
        with open(session_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line)
                    if 'data' in data:
                        d = data['data']
                        if d.get('trackName'):
                            session_info['trackName'] = d['trackName']
                        elif d.get('track'):
                            session_info['trackName'] = d['track']
                        if d.get('sessionType'):
                            session_info['sessionType'] = d['sessionType']
                        elif d.get('session'):
                            session_info['sessionType'] = d['session']
                        if d.get('sessionId'):
                            session_info['sessionId'] = d['sessionId']
                except:
                    pass
    
    # Get stats
    if stats_file.exists():
        with open(stats_file, 'r') as f:
            stats = json.load(f)
            session_info['stats'] = stats
    
    return session_info

def sync_session(server_url: str, session_id: str, user_id: str = None):
    """Send session_end event to trigger IDP pipeline"""
    sio = socketio.Client()
    result = {'success': False, 'message': ''}
    
    @sio.event
    def connect():
        print(f"✅ Connected to {server_url}")
    
    @sio.event
    def disconnect():
        print("Disconnected")
    
    @sio.on('ack')
    def on_ack(data):
        if data.get('originalType') == 'session_end':
            result['success'] = data.get('success', False)
            result['message'] = 'Session end acknowledged' if result['success'] else data.get('error', 'Unknown error')
    
    try:
        print(f"Connecting to {server_url}...")
        sio.connect(server_url, transports=['websocket'])
        
        # Send session_end event
        payload = {'sessionId': session_id}
        if user_id:
            payload['userId'] = user_id
        
        print(f"Sending session_end for session {session_id}...")
        sio.emit('session_end', payload)
        
        # Wait for acknowledgment
        time.sleep(2)
        
        sio.disconnect()
        
    except Exception as e:
        result['message'] = str(e)
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Sync logged session to IDP pipeline')
    parser.add_argument('log_dir', nargs='?', help='Path to race log directory')
    parser.add_argument('--server', '-s', default=DEFAULT_SERVER_URL, help='Server URL')
    parser.add_argument('--user-id', '-u', help='User ID for iRacing profile sync')
    parser.add_argument('--list', '-l', action='store_true', help='List available sessions')
    
    args = parser.parse_args()
    
    logs_dir = Path(__file__).parent / "race_logs"
    
    if args.list:
        print("Available sessions:")
        print("="*60)
        for session_dir in sorted(logs_dir.iterdir()):
            if session_dir.is_dir() and (session_dir / "stats.json").exists():
                info = get_session_info(session_dir)
                stats = info.get('stats', {})
                elapsed = stats.get('elapsed_seconds', 0)
                events = sum(stats.get('event_counts', {}).values())
                print(f"\n📁 {session_dir.name}")
                print(f"   Track: {info['trackName']}")
                print(f"   Type: {info['sessionType']}")
                print(f"   Duration: {elapsed/60:.1f} min")
                print(f"   Events: {events:,}")
        return
    
    if not args.log_dir:
        # Use most recent session
        sessions = sorted([d for d in logs_dir.iterdir() if d.is_dir() and (d / "stats.json").exists()])
        if not sessions:
            print("❌ No sessions found in race_logs/")
            return
        log_dir = sessions[-1]
        print(f"Using most recent session: {log_dir.name}")
    else:
        log_dir = Path(args.log_dir)
        if not log_dir.exists():
            # Try as relative to race_logs
            log_dir = logs_dir / args.log_dir
    
    if not log_dir.exists():
        print(f"❌ Session directory not found: {log_dir}")
        return
    
    # Get session info
    info = get_session_info(log_dir)
    print("\n" + "="*60)
    print("SESSION INFO")
    print("="*60)
    print(f"Session ID: {info['sessionId']}")
    print(f"Track: {info['trackName']}")
    print(f"Type: {info['sessionType']}")
    if 'stats' in info:
        stats = info['stats']
        print(f"Duration: {stats.get('elapsed_seconds', 0)/60:.1f} min")
        print(f"Events: {sum(stats.get('event_counts', {}).values()):,}")
    
    print("\n" + "="*60)
    print("SYNCING TO IDP PIPELINE")
    print("="*60)
    
    result = sync_session(args.server, info['sessionId'], args.user_id)
    
    if result['success']:
        print(f"✅ {result['message']}")
        print("\nThe server will now:")
        print("  1. Run PostSessionLearner (update driver_memory)")
        print("  2. Run IDP Pipeline (compute aggregates, derive traits)")
        print("  3. Generate AI debrief")
        if args.user_id:
            print("  4. Sync iRacing profile")
    else:
        print(f"⚠️ Sync may have issues: {result['message']}")
        print("\nNote: The session_end event requires an active session on the server.")
        print("If the session wasn't active, you may need to replay the telemetry first.")

if __name__ == "__main__":
    main()
