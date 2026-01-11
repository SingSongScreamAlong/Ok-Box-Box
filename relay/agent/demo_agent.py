#!/usr/bin/env python3
"""
Demo Relay Agent for Ok, Box Box
Generates simulated telemetry data for testing without iRacing
"""

import asyncio
import json
import logging
import math
import os
import random
import signal
import sys
import time
import uuid
from datetime import datetime
from typing import Optional

import socketio
from dotenv import load_dotenv

# Import voice playback module
try:
    from voice_playback import setup_voice_handlers, voice_playback
    VOICE_AVAILABLE = True
except ImportError:
    VOICE_AVAILABLE = False

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('DemoRelayAgent')


class DemoDriver:
    """Simulated driver with realistic lap behavior"""
    
    def __init__(self, car_idx: int, name: str, car_number: str, base_lap_time: float):
        self.car_idx = car_idx
        self.name = name
        self.car_number = car_number
        self.base_lap_time = base_lap_time
        self.current_lap = 1
        self.lap_progress = random.random()  # 0-1 track position
        self.last_lap_time = 0.0
        self.best_lap_time = 0.0
        self.position = car_idx + 1
        self.gap_to_leader = 0.0
        self.interval = 0.0
        self.in_pit = False
        self.on_pit_road = False
        self.speed = 0.0
        self.rpm = 0
        self.gear = 0
        self.throttle = 0.0
        self.brake = 0.0
        self.fuel_level = 100.0
        self.lap_start_time = time.time()
        
    def update(self, dt: float):
        """Update driver state"""
        # Progress around track
        lap_time_variation = random.uniform(0.98, 1.02)
        effective_lap_time = self.base_lap_time * lap_time_variation
        
        progress_per_second = 1.0 / effective_lap_time
        self.lap_progress += progress_per_second * dt
        
        # Complete lap
        if self.lap_progress >= 1.0:
            self.lap_progress -= 1.0
            self.current_lap += 1
            self.last_lap_time = time.time() - self.lap_start_time
            if self.best_lap_time == 0 or self.last_lap_time < self.best_lap_time:
                self.best_lap_time = self.last_lap_time
            self.lap_start_time = time.time()
            self.fuel_level = max(0, self.fuel_level - random.uniform(1.5, 2.5))
        
        # Simulate telemetry based on track position
        track_pos = self.lap_progress
        
        # Speed varies by track section (simulate corners)
        corner_factor = 1.0 - 0.3 * abs(math.sin(track_pos * math.pi * 8))
        self.speed = 280 * corner_factor + random.uniform(-5, 5)
        
        # RPM correlates with speed
        self.rpm = int(6000 + (self.speed / 280) * 6000 + random.uniform(-200, 200))
        
        # Gear based on speed
        if self.speed < 80:
            self.gear = 2
        elif self.speed < 120:
            self.gear = 3
        elif self.speed < 160:
            self.gear = 4
        elif self.speed < 200:
            self.gear = 5
        elif self.speed < 240:
            self.gear = 6
        else:
            self.gear = 7
            
        # Throttle/brake based on corner
        if corner_factor < 0.85:
            self.throttle = random.uniform(0.3, 0.7)
            self.brake = random.uniform(0.2, 0.8)
        else:
            self.throttle = random.uniform(0.9, 1.0)
            self.brake = 0.0
            
    def get_telemetry(self) -> dict:
        """Return BlackBox-compatible telemetry data"""
        steering = round(math.sin(self.lap_progress * math.pi * 4) * 0.5, 3)
        return {
            'driverId': str(self.car_idx),
            'driverName': self.name,
            'speed': round(self.speed, 1),
            'rpm': self.rpm,
            'gear': self.gear,
            'throttle': round(self.throttle, 2),
            'brake': round(self.brake, 2),
            'steering': steering,
            'tires': {
                'frontLeft': {'temp': 85 + random.uniform(-5, 5), 'wear': 95, 'pressure': 26.5},
                'frontRight': {'temp': 87 + random.uniform(-5, 5), 'wear': 94, 'pressure': 26.5},
                'rearLeft': {'temp': 82 + random.uniform(-5, 5), 'wear': 96, 'pressure': 25.0},
                'rearRight': {'temp': 84 + random.uniform(-5, 5), 'wear': 95, 'pressure': 25.0},
            },
            'position': {'x': math.cos(self.lap_progress * 2 * math.pi) * 100, 
                        'y': 0, 
                        'z': math.sin(self.lap_progress * 2 * math.pi) * 100},
            'lap': self.current_lap,
            'sector': int(self.lap_progress * 3) + 1,
            'lapTime': round(self.lap_progress * self.base_lap_time, 3),
            'sectorTime': round((self.lap_progress % 0.333) * self.base_lap_time, 3),
            'bestLapTime': round(self.best_lap_time, 3),
            'bestSectorTimes': [round(self.best_lap_time / 3, 3)] * 3,
            'gForce': {
                'lateral': round(steering * 2, 2),
                'longitudinal': round((self.throttle - self.brake) * 1.5, 2),
                'vertical': 1.0
            },
            'trackPosition': round(self.lap_progress, 4),
            'racePosition': self.position,
            'gapAhead': round(self.interval, 3) if self.position > 1 else 0,
            'gapBehind': round(random.uniform(0.5, 3.0), 3),
            'timestamp': int(time.time() * 1000),
        }
        
    def get_timing_entry(self) -> dict:
        # Format lap times as strings
        def format_lap(seconds: float) -> str:
            if seconds <= 0:
                return '-'
            mins = int(seconds // 60)
            secs = seconds % 60
            return f"{mins}:{secs:06.3f}"
        
        def format_gap(seconds: float) -> str:
            if seconds <= 0:
                return '-'
            if seconds > 60:
                return f"+{int(seconds // 60)}LAP"
            return f"+{seconds:.3f}"
        
        return {
            'driverId': str(self.car_idx),
            'driverName': self.name,
            'carNumber': self.car_number,
            'position': self.position,
            'classPosition': self.position,
            'gap': format_gap(self.gap_to_leader) if self.position > 1 else 'LEADER',
            'interval': format_gap(self.interval) if self.position > 1 else '-',
            'lastLap': format_lap(self.last_lap_time),
            'bestLap': format_lap(self.best_lap_time),
            'sector1': '-',
            'sector2': '-',
            'sector3': '-',
            'inPit': self.in_pit,
            'onPitRoad': self.on_pit_road,
            'lastSeen': int(time.time() * 1000),
        }


class DemoRelayAgent:
    """Demo relay agent that simulates a race session"""
    
    def __init__(self):
        self.api_url = os.getenv('RELAY_API_URL', 'http://localhost:4000')
        self.ws_url = os.getenv('RELAY_WS_URL', 'ws://localhost:4000')
        self.token = os.getenv('RELAY_TOKEN', 'demo-token')
        self.telemetry_rate = int(os.getenv('TELEMETRY_RATE_HZ', '30'))
        self.heartbeat_interval = int(os.getenv('HEARTBEAT_INTERVAL_SEC', '5'))
        
        self.sio: Optional[socketio.AsyncClient] = None
        self.running = False
        self.connected = False
        self.session_id: Optional[str] = None
        
        # Demo drivers
        self.drivers = [
            DemoDriver(0, "Max Verstappen", "1", 78.5),
            DemoDriver(1, "Lewis Hamilton", "44", 78.8),
            DemoDriver(2, "Charles Leclerc", "16", 79.0),
            DemoDriver(3, "Lando Norris", "4", 79.1),
            DemoDriver(4, "Carlos Sainz", "55", 79.2),
            DemoDriver(5, "George Russell", "63", 79.3),
            DemoDriver(6, "Oscar Piastri", "81", 79.4),
            DemoDriver(7, "Fernando Alonso", "14", 79.5),
        ]
        
        self.session_info = {
            'sessionId': '',
            'sessionType': 'Race',
            'sessionState': 'Racing',
            'track': {
                'name': 'Spa-Francorchamps',
                'config': 'Grand Prix',
                'length': 7.004,
                'surface': 'Asphalt',
            },
            'weather': {
                'temperature': 22,
                'humidity': 65,
                'windSpeed': 12,
                'windDirection': 180,
                'precipitation': 0,
            },
            'totalLaps': 44,
            'timeRemaining': 3600,
            'driverCount': len(self.drivers),
        }
        
    async def connect(self):
        """Connect to backend Socket.IO"""
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=10,
            reconnection_delay=1,
            reconnection_delay_max=30,
        )
        
        @self.sio.on('connect', namespace='/relay')
        async def on_connect():
            logger.info("Connected to backend /relay namespace")
            self.connected = True
            
        @self.sio.on('disconnect', namespace='/relay')
        async def on_disconnect():
            logger.warning("Disconnected from backend")
            self.connected = False
            
        @self.sio.on('connect_error', namespace='/relay')
        async def on_connect_error(data):
            logger.error(f"Connection error: {data}")
        
        # Setup voice playback handlers
        if VOICE_AVAILABLE:
            setup_voice_handlers(self.sio)
            logger.info("Voice playback handlers registered")
            
        try:
            await self.sio.connect(
                self.ws_url,
                namespaces=['/relay'],
                auth={'token': self.token},
                transports=['websocket'],
            )
            # Wait a moment for the connect callback to fire
            await asyncio.sleep(0.5)
            return self.connected
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
            
    async def start_session(self):
        """Start a demo session"""
        self.session_id = str(uuid.uuid4())
        self.session_info['sessionId'] = self.session_id
        
        driver_entries = [
            {
                'driverId': d.car_idx,
                'driverName': d.name,
                'carNumber': d.car_number,
                'carName': 'Formula 1 Car',
                'carClass': 'F1',
                'iRating': 5000 + random.randint(0, 3000),
                'licenseLevel': 'A 4.99',
                'isSpectator': False,
                'isPaceCar': False,
            }
            for d in self.drivers
        ]
        
        await self.sio.emit('relay:session:start', {
            'sessionId': self.session_id,
            'type': self.session_info['sessionType'],
            'track': self.session_info['track'],
            'weather': self.session_info['weather'],
            'drivers': driver_entries,
        }, namespace='/relay')
        
        logger.info(f"Started demo session: {self.session_id}")
        
    async def send_heartbeat(self):
        """Send periodic heartbeat"""
        while self.running:
            if self.connected:
                await self.sio.emit('relay:heartbeat', {
                    'timestamp': int(time.time() * 1000),
                    'iracingConnected': True,
                    'sessionActive': self.session_id is not None,
                    'sessionId': self.session_id,
                    'telemetryRate': self.telemetry_rate,
                }, namespace='/relay')
            await asyncio.sleep(self.heartbeat_interval)
            
    async def send_telemetry(self):
        """Send telemetry at configured rate"""
        interval = 1.0 / self.telemetry_rate
        last_time = time.time()
        
        while self.running:
            current_time = time.time()
            dt = current_time - last_time
            last_time = current_time
            
            # Update all drivers
            for driver in self.drivers:
                driver.update(dt)
                
            # Calculate positions and gaps
            sorted_drivers = sorted(self.drivers, key=lambda d: (d.current_lap, d.lap_progress), reverse=True)
            leader = sorted_drivers[0]
            prev_driver = None
            
            for i, driver in enumerate(sorted_drivers):
                driver.position = i + 1
                if i == 0:
                    driver.gap_to_leader = 0
                    driver.interval = 0
                else:
                    # Simplified gap calculation
                    lap_diff = leader.current_lap - driver.current_lap
                    progress_diff = leader.lap_progress - driver.lap_progress
                    driver.gap_to_leader = (lap_diff + progress_diff) * driver.base_lap_time
                    
                    if prev_driver:
                        prev_lap_diff = prev_driver.current_lap - driver.current_lap
                        prev_progress_diff = prev_driver.lap_progress - driver.lap_progress
                        driver.interval = (prev_lap_diff + prev_progress_diff) * driver.base_lap_time
                        
                prev_driver = driver
                
            if self.connected and self.session_id:
                # Send bulk telemetry
                telemetry_packets = [d.get_telemetry() for d in self.drivers]
                await self.sio.emit('relay:telemetry:bulk', {
                    'sessionId': self.session_id,
                    'timestamp': int(time.time() * 1000),
                    'packets': telemetry_packets,
                }, namespace='/relay')
                
                # Send timing update every second
                if random.random() < 0.5:  # ~50% of frames at 30Hz = ~15 per second
                    timing_entries = [d.get_timing_entry() for d in sorted_drivers]
                    await self.sio.emit('relay:timing:update', {
                        'sessionId': self.session_id,
                        'timestamp': int(time.time() * 1000),
                        'entries': timing_entries,
                    }, namespace='/relay')
                    logger.debug(f"Sent timing update with {len(timing_entries)} entries")
                    
            await asyncio.sleep(interval)
            
    async def run(self):
        """Main run loop"""
        self.running = True
        
        logger.info("Demo Relay Agent starting...")
        logger.info(f"API URL: {self.api_url}")
        logger.info(f"WS URL: {self.ws_url}")
        
        # Connect to backend
        connected = await self.connect()
        if not connected:
            logger.error("Failed to connect to backend. Is the API server running?")
            logger.info("Starting in offline demo mode - will retry connection...")
            
        # Start session
        if self.connected:
            await self.start_session()
        else:
            self.session_id = str(uuid.uuid4())
            logger.info(f"Offline demo session: {self.session_id}")
            
        # Start background tasks
        tasks = [
            asyncio.create_task(self.send_heartbeat()),
            asyncio.create_task(self.send_telemetry()),
        ]
        
        logger.info("Demo relay agent running. Press Ctrl+C to stop.")
        
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            pass
            
    async def stop(self):
        """Stop the agent"""
        self.running = False
        
        if self.connected and self.session_id:
            await self.sio.emit('session:end', {
                'sessionId': self.session_id,
                'reason': 'Agent stopped',
            }, namespace='/relay')
            
        if self.sio:
            await self.sio.disconnect()
            
        logger.info("Demo relay agent stopped")


async def main():
    agent = DemoRelayAgent()
    
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        asyncio.create_task(agent.stop())
        
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass
            
    try:
        await agent.run()
    except KeyboardInterrupt:
        await agent.stop()


if __name__ == '__main__':
    asyncio.run(main())
