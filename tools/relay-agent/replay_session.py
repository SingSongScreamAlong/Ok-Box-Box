#!/usr/bin/env python3
"""
Replay Session Tool
Replays logged telemetry data through the server to trigger IDP pipeline.
This allows processing historical sessions that were captured without a live server.
"""
import socketio
import json
import gzip
import argparse
import time
from pathlib import Path
from typing import Optional, Generator, Dict, Any

DEFAULT_SERVER_URL = "http://localhost:3001"
LOG_DIR = Path(__file__).parent / "race_logs"

def open_jsonl(filepath: Path):
    """Open a JSONL file, handling both compressed and uncompressed formats"""
    if filepath.suffix == '.gz':
        return gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore')
    else:
        return open(filepath, 'r', errors='ignore')

def get_events_file(log_dir: Path) -> Optional[Path]:
    """Find the all_events file (compressed or uncompressed)"""
    gz_path = log_dir / "all_events.jsonl.gz"
    if gz_path.exists():
        return gz_path
    plain_path = log_dir / "all_events.jsonl"
    if plain_path.exists():
        return plain_path
    return None

def stream_events(log_dir: Path) -> Generator[Dict[str, Any], None, None]:
    """Stream events from log file in timestamp order"""
    events_file = get_events_file(log_dir)
    if not events_file:
        raise FileNotFoundError(f"No all_events.jsonl(.gz) found in {log_dir}")
    
    with open_jsonl(events_file) as f:
        for line in f:
            try:
                evt = json.loads(line)
                yield evt
            except json.JSONDecodeError:
                continue

def get_session_info(log_dir: Path) -> Dict[str, Any]:
    """Get session metadata"""
    session_file = log_dir / "session.jsonl"
    if not session_file.exists():
        session_file = log_dir / "session.jsonl.gz"
    
    info = {
        'sessionId': log_dir.name,
        'trackName': 'Unknown',
        'sessionType': 'Unknown',
    }
    
    if session_file.exists():
        with open_jsonl(session_file) as f:
            for line in f:
                try:
                    data = json.loads(line).get('data', {})
                    if data.get('trackName'):
                        info['trackName'] = data['trackName']
                    if data.get('sessionType'):
                        info['sessionType'] = data['sessionType']
                    if data.get('sessionId'):
                        info['sessionId'] = data['sessionId']
                except:
                    pass
    
    return info

def count_events(log_dir: Path) -> int:
    """Count total events for progress tracking"""
    events_file = get_events_file(log_dir)
    if not events_file:
        return 0
    
    count = 0
    with open_jsonl(events_file) as f:
        for _ in f:
            count += 1
    return count

class SessionReplayer:
    def __init__(self, server_url: str, speed_multiplier: float = 10.0):
        self.server_url = server_url
        self.speed_multiplier = speed_multiplier
        self.sio = socketio.Client()
        self.connected = False
        self.session_id = None
        self.events_sent = 0
        self.ack_received = False
        
        @self.sio.event
        def connect():
            self.connected = True
            print(f"✅ Connected to {server_url}")
        
        @self.sio.event
        def disconnect():
            self.connected = False
            print("❌ Disconnected")
        
        @self.sio.on('ack')
        def on_ack(data):
            self.ack_received = True
            if data.get('originalType') == 'session_end':
                print(f"   Session end acknowledged: {data}")
    
    def connect(self) -> bool:
        try:
            self.sio.connect(self.server_url, transports=['websocket'])
            time.sleep(0.5)  # Wait for connection
            return self.connected
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def disconnect(self):
        if self.connected:
            self.sio.disconnect()
    
    def replay(self, log_dir: Path, user_id: Optional[str] = None) -> bool:
        """
        Replay a session through the server.
        
        Args:
            log_dir: Path to the session log directory
            user_id: Optional user ID for iRacing sync
        
        Returns:
            True if replay completed successfully
        """
        session_info = get_session_info(log_dir)
        self.session_id = session_info['sessionId']
        
        print(f"\n{'='*60}")
        print(f"REPLAYING SESSION")
        print(f"{'='*60}")
        print(f"Session ID: {self.session_id}")
        print(f"Track: {session_info['trackName']}")
        print(f"Type: {session_info['sessionType']}")
        print(f"Speed: {self.speed_multiplier}x")
        
        # Count events for progress
        print("Counting events...", end=" ")
        total_events = count_events(log_dir)
        print(f"{total_events:,} events")
        
        if total_events == 0:
            print("❌ No events to replay")
            return False
        
        # Replay events
        print(f"\nReplaying...")
        
        last_ts = None
        last_progress = 0
        start_time = time.time()
        
        # Event type mapping (logged event names to server event names)
        event_map = {
            'telemetry:driver': 'telemetry',
            'telemetry_update': 'telemetry',
            'incident:new': 'incident',
            'race:event': 'race_event',
            'session:active': 'session_metadata',
            'car:status': 'strategy_raw',
        }
        
        for evt in stream_events(log_dir):
            event_type = evt.get('event', '')
            data = evt.get('data', {})
            ts = evt.get('ts', 0)
            
            # Simulate timing (with speed multiplier)
            if last_ts and self.speed_multiplier < 100:
                delay = (ts - last_ts) / self.speed_multiplier
                if delay > 0 and delay < 1:  # Cap at 1 second
                    time.sleep(delay)
            last_ts = ts
            
            # Map event type and emit
            server_event = event_map.get(event_type)
            if server_event:
                self.sio.emit(server_event, data)
                self.events_sent += 1
            
            # Progress update
            progress = int((self.events_sent / total_events) * 100)
            if progress > last_progress and progress % 10 == 0:
                elapsed = time.time() - start_time
                rate = self.events_sent / elapsed if elapsed > 0 else 0
                print(f"   {progress}% ({self.events_sent:,} events, {rate:.0f}/sec)")
                last_progress = progress
        
        # Send session_end to trigger IDP pipeline
        print(f"\n🏁 Sending session_end...")
        payload = {'sessionId': self.session_id}
        if user_id:
            payload['userId'] = user_id
        
        self.sio.emit('session_end', payload)
        time.sleep(2)  # Wait for processing
        
        elapsed = time.time() - start_time
        print(f"\n{'='*60}")
        print(f"REPLAY COMPLETE")
        print(f"{'='*60}")
        print(f"Events sent: {self.events_sent:,}")
        print(f"Duration: {elapsed:.1f}s")
        print(f"Rate: {self.events_sent/elapsed:.0f} events/sec")
        
        return True

def list_sessions():
    """List available sessions"""
    print("Available sessions:")
    print("="*60)
    
    for session_dir in sorted(LOG_DIR.iterdir()):
        if not session_dir.is_dir():
            continue
        
        stats_file = session_dir / "stats.json"
        if not stats_file.exists():
            continue
        
        info = get_session_info(session_dir)
        
        with open(stats_file, 'r') as f:
            stats = json.load(f)
        
        elapsed = stats.get('elapsed_seconds', 0)
        events = sum(stats.get('event_counts', {}).values())
        
        print(f"\n📁 {session_dir.name}")
        print(f"   Track: {info['trackName']}")
        print(f"   Type: {info['sessionType']}")
        print(f"   Duration: {elapsed/60:.1f} min")
        print(f"   Events: {events:,}")

def main():
    parser = argparse.ArgumentParser(description='Replay logged session through server')
    parser.add_argument('session', nargs='?', help='Session directory name or path')
    parser.add_argument('--server', '-s', default=DEFAULT_SERVER_URL, help='Server URL')
    parser.add_argument('--speed', '-x', type=float, default=100, help='Replay speed multiplier (default: 100x)')
    parser.add_argument('--user-id', '-u', help='User ID for iRacing sync')
    parser.add_argument('--list', '-l', action='store_true', help='List available sessions')
    
    args = parser.parse_args()
    
    if args.list:
        list_sessions()
        return
    
    if not args.session:
        # Use most recent session
        sessions = sorted([d for d in LOG_DIR.iterdir() if d.is_dir() and (d / "stats.json").exists()])
        if not sessions:
            print("❌ No sessions found")
            return
        log_dir = sessions[-1]
        print(f"Using most recent session: {log_dir.name}")
    else:
        log_dir = Path(args.session)
        if not log_dir.exists():
            log_dir = LOG_DIR / args.session
    
    if not log_dir.exists():
        print(f"❌ Session not found: {log_dir}")
        return
    
    # Connect and replay
    replayer = SessionReplayer(args.server, args.speed)
    
    if not replayer.connect():
        print("❌ Could not connect to server")
        print(f"   Make sure the server is running at {args.server}")
        return
    
    try:
        replayer.replay(log_dir, args.user_id)
    finally:
        replayer.disconnect()
    
    print("\n✅ The server should now process this session through the IDP pipeline.")
    print("   Check the server logs for [IDP] and [PostSession] messages.")

if __name__ == "__main__":
    main()
