#!/usr/bin/env python3
"""
Race Data Logger - Captures ALL telemetry data from a live race session
Saves to timestamped JSON files for later analysis
"""

import socketio
import json
import gzip
import os
from datetime import datetime
from pathlib import Path
import threading
import time

# Configuration
SERVER_URL = "http://localhost:3001"
LOG_DIR = Path(__file__).parent / "race_logs"

class RaceLogger:
    def __init__(self):
        self.sio = socketio.Client()
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_dir = LOG_DIR / self.session_id
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Data buffers
        self.telemetry_buffer = []
        self.player_telemetry_buffer = []  # Player-specific telemetry for analysis
        self.standings_buffer = []
        self.strategy_buffer = []
        self.incidents_buffer = []
        self.session_info = []
        self.all_events = []  # Raw log of everything
        
        # Stats
        self.event_counts = {}
        self.start_time = time.time()
        self.last_flush = time.time()
        
        self._setup_handlers()
        
    def _setup_handlers(self):
        @self.sio.event
        def connect():
            print(f"✅ Logger connected to {SERVER_URL}")
            print(f"📁 Logging to: {self.log_dir}")
            self.sio.emit('dashboard:join', {'type': 'logger'})
            
        @self.sio.event
        def disconnect():
            print("❌ Logger disconnected")
            self._flush_all()
            
        # Catch ALL events
        @self.sio.on('*')
        def catch_all(event, data):
            self._log_event(event, data)
            
        # Specific handlers for known events
        @self.sio.on('telemetry_update')
        def on_telemetry(data):
            self._log_event('telemetry_update', data)
            # Extract player-specific data for easier analysis
            player_data = {
                'ts': time.time(),
                'speed': data.get('speed', 0),
                'rpm': data.get('rpm', 0),
                'gear': data.get('gear', 0),
                'throttle': data.get('throttle', 0),
                'brake': data.get('brake', 0),
                'lap': data.get('lap', 0),
                'position': data.get('position', 0),
                'trackPosition': data.get('trackPosition', 0),
                'fuel': data.get('fuel', {}).get('level', 0),
                'lastLapTime': data.get('lastLapTime', 0),
                'bestLapTime': data.get('bestLapTime', 0),
            }
            self.player_telemetry_buffer.append(player_data)
            self.telemetry_buffer.append({'ts': time.time(), 'data': data})
            
        @self.sio.on('telemetry:driver')
        def on_telemetry_driver(data):
            self._log_event('telemetry:driver', data)
            self.telemetry_buffer.append({
                'ts': time.time(),
                'event': 'telemetry:driver',
                'data': data
            })
            # Extract player telemetry from telemetry:driver (this has actual data!)
            cars = data.get('cars', [])
            for car in cars:
                if car.get('isPlayer'):
                    speed = car.get('speed', 0) or 0
                    if speed > 1:  # Only log moving samples
                        player_data = {
                            'ts': time.time(),
                            'speed': speed,
                            'speed_mph': speed * 2.237,
                            'rpm': car.get('rpm', 0) or 0,
                            'gear': car.get('gear', 0) or 0,
                            'throttle': car.get('throttle', 0) or 0,
                            'brake': car.get('brake', 0) or 0,
                            'steering': car.get('steering', 0) or 0,
                            'lap': car.get('lap', 0) or 0,
                            'position': car.get('position', 0) or 0,
                            'trackPct': car.get('trackPct', 0) or car.get('lapDistPct', 0) or 0,
                            'fuelLevel': car.get('fuelLevel', 0) or 0,
                            'fuelPct': car.get('fuelPct', 0) or 0,
                            'inPit': car.get('inPit', False),
                            'lastLapTime': car.get('lastLapTime', 0) or 0,
                            'bestLapTime': car.get('bestLapTime', 0) or 0,
                        }
                        self.player_telemetry_buffer.append(player_data)
                    break
            
        @self.sio.on('car:status')
        def on_car_status(data):
            self._log_event('car:status', data)
            self.strategy_buffer.append({
                'ts': time.time(),
                'data': data
            })
            
        @self.sio.on('session:active')
        def on_session_active(data):
            self._log_event('session:active', data)
            self.session_info.append({
                'ts': time.time(),
                'event': 'session:active',
                'data': data
            })
            print(f"📋 Session: {data.get('trackName', 'Unknown')} [{data.get('sessionType', 'Unknown')}]")
            
        @self.sio.on('session_info')
        def on_session_info(data):
            self._log_event('session_info', data)
            self.session_info.append({
                'ts': time.time(),
                'event': 'session_info',
                'data': data
            })
            
        @self.sio.on('standings')
        def on_standings(data):
            self._log_event('standings', data)
            self.standings_buffer.append({
                'ts': time.time(),
                'data': data
            })
            
        @self.sio.on('incident:new')
        def on_incident(data):
            self._log_event('incident:new', data)
            self.incidents_buffer.append({
                'ts': time.time(),
                'data': data
            })
            print(f"⚠️ Incident logged: {data}")
            
        @self.sio.on('engineer:update')
        def on_engineer(data):
            self._log_event('engineer:update', data)
            
        @self.sio.on('race:intelligence')
        def on_intelligence(data):
            self._log_event('race:intelligence', data)
            
        @self.sio.on('spotter:callout')
        def on_spotter(data):
            self._log_event('spotter:callout', data)
            
        @self.sio.on('behavioral:update')
        def on_behavioral(data):
            self._log_event('behavioral:update', data)
            
    def _log_event(self, event: str, data):
        """Log any event to the all_events buffer"""
        self.event_counts[event] = self.event_counts.get(event, 0) + 1
        self.all_events.append({
            'ts': time.time(),
            'event': event,
            'data': data
        })
        
        # Auto-flush every 30 seconds or 1000 events
        if time.time() - self.last_flush > 30 or len(self.all_events) > 1000:
            self._flush_all()
            
    def _write_jsonl_gz(self, filepath: Path, items: list):
        """Write items to a gzip-compressed JSONL file (append mode)"""
        # For gzip append, we need to handle it specially
        # gzip.open with 'ab' mode works for appending
        with gzip.open(filepath, 'at', encoding='utf-8') as f:
            for item in items:
                f.write(json.dumps(item, separators=(',', ':')) + '\n')
    
    def _flush_all(self):
        """Write all buffers to disk (gzip compressed)"""
        self.last_flush = time.time()
        elapsed = time.time() - self.start_time
        
        # Write all events (compressed)
        if self.all_events:
            all_file = self.log_dir / "all_events.jsonl.gz"
            self._write_jsonl_gz(all_file, self.all_events)
            self.all_events = []
            
        # Write telemetry (compressed)
        if self.telemetry_buffer:
            telem_file = self.log_dir / "telemetry.jsonl.gz"
            self._write_jsonl_gz(telem_file, self.telemetry_buffer)
            self.telemetry_buffer = []
        
        # Write player telemetry (compressed)
        if self.player_telemetry_buffer:
            player_file = self.log_dir / "player_telemetry.jsonl.gz"
            self._write_jsonl_gz(player_file, self.player_telemetry_buffer)
            self.player_telemetry_buffer = []
            
        # Write strategy/car status (compressed)
        if self.strategy_buffer:
            strat_file = self.log_dir / "strategy.jsonl.gz"
            self._write_jsonl_gz(strat_file, self.strategy_buffer)
            self.strategy_buffer = []
            
        # Write standings (compressed)
        if self.standings_buffer:
            stand_file = self.log_dir / "standings.jsonl.gz"
            self._write_jsonl_gz(stand_file, self.standings_buffer)
            self.standings_buffer = []
            
        # Write incidents (not compressed - small file, useful to read directly)
        if self.incidents_buffer:
            inc_file = self.log_dir / "incidents.jsonl"
            with open(inc_file, 'a') as f:
                for item in self.incidents_buffer:
                    f.write(json.dumps(item) + '\n')
            self.incidents_buffer = []
            
        # Write session info (not compressed - small file)
        if self.session_info:
            sess_file = self.log_dir / "session.jsonl"
            with open(sess_file, 'a') as f:
                for item in self.session_info:
                    f.write(json.dumps(item) + '\n')
            self.session_info = []
            
        # Write stats summary
        stats = {
            'session_id': self.session_id,
            'elapsed_seconds': elapsed,
            'event_counts': self.event_counts,
            'last_update': datetime.now().isoformat()
        }
        with open(self.log_dir / "stats.json", 'w') as f:
            json.dump(stats, f, indent=2)
            
        total_events = sum(self.event_counts.values())
        print(f"💾 Flushed | {total_events} total events | {elapsed:.0f}s elapsed | Events: {dict(list(self.event_counts.items())[:5])}...")
        
    def connect(self):
        try:
            self.sio.connect(SERVER_URL, transports=['websocket'], auth={'relayId': 'race-logger'})
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
            
    def run(self):
        """Run the logger until interrupted"""
        if not self.connect():
            return
            
        print("\n" + "="*60)
        print("🏁 RACE LOGGER ACTIVE - Press Ctrl+C to stop")
        print("="*60 + "\n")
        
        try:
            while True:
                time.sleep(1)
                # Print status every 10 seconds
                if int(time.time()) % 10 == 0:
                    elapsed = time.time() - self.start_time
                    total = sum(self.event_counts.values())
                    rate = total / elapsed if elapsed > 0 else 0
                    print(f"📊 {total} events | {rate:.1f}/sec | Running {elapsed:.0f}s")
        except KeyboardInterrupt:
            print("\n\n🛑 Stopping logger...")
            self._flush_all()
            self.sio.disconnect()
            
        print(f"\n✅ Race data saved to: {self.log_dir}")
        print(f"   Total events: {sum(self.event_counts.values())}")
        print(f"   Event breakdown: {json.dumps(self.event_counts, indent=2)}")


if __name__ == "__main__":
    logger = RaceLogger()
    logger.run()
