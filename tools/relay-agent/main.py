#!/usr/bin/env python3
"""
PitBox Relay Agent - Main Entry Point
Connects iRacing to PitBox Server for real-time telemetry and AI coaching

Usage:
    python main.py [--url SERVER_URL]

Environment Variables:
    BLACKBOX_SERVER_URL - PitBox Server WebSocket URL (default: http://localhost:3000)
    POLL_RATE_HZ - Telemetry polling rate (default: 10)
    LOG_LEVEL - Logging level (default: INFO)
"""
import argparse
import logging
import signal
import sys
import time
from typing import Optional

import config
from iracing_reader import IRacingReader
from pitbox_client import PitBoxClient
from video_encoder import VideoEncoder
from voice_recognition import VoiceRecognition
from overlay import PTTOverlay
from data_mapper import (
    map_session_metadata,
    map_telemetry_snapshot,
    map_race_event,
    map_incident
)

# ========================
# Logging Setup
# ========================

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


# ========================
# Main Relay Agent
# ========================

import os
from exporters.motec_exporter import MoTeCLDExporter

class RelayAgent:
    """
    Main Relay Agent Class
    Orchestrates reading from iRacing and sending to PitBox Cloud
    
    Protocol v2: Multi-stream telemetry
    - Baseline stream: 4 Hz (always)
    - Controls stream: 15 Hz (when viewers present)
    - Events: Instant (not tick-gated)
    """
    
    def __init__(self, cloud_url: str = None):
        self.ir_reader = IRacingReader()
        self.cloud_client = PitBoxClient(cloud_url)
        self.video_encoder = VideoEncoder(self.cloud_client)
        self.vr = VoiceRecognition(
            ptt_type=config.PTT_TYPE,
            ptt_key=config.PTT_KEY,
            joystick_id=config.JOYSTICK_ID,
            joystick_button=config.JOYSTICK_BUTTON
        )
        self.overlay = PTTOverlay()
        
        # MoTeC Exporter
        self.motec_exporter = MoTeCLDExporter()
        self._setup_motec_channels()
        
        self.running = False
        self.session_id: Optional[str] = None
        self.last_flag_state: str = 'green'
        self.last_strategy_update: float = 0 # Phase 11

        # v2: Rate control for multi-stream telemetry
        self.last_baseline_time: float = 0
        self.last_controls_time: float = 0
        self.BASELINE_INTERVAL: float = 1.0 / 4    # 4 Hz
        self.CONTROLS_INTERVAL: float = 1.0 / 15   # 15 Hz
        
        # Stats
        self.start_time = 0
        self.telemetry_count = 0
        self.incident_count = 0

    @property
    def is_connected(self):
        """Check if connected to cloud"""
        return self.cloud_client.is_connected()
    def _setup_motec_channels(self):
        """Configure MoTeC channels"""
        self.motec_exporter.add_channel("Speed", "km/h")
        self.motec_exporter.add_channel("RPM", "rpm")
        self.motec_exporter.add_channel("Gear", "")
        self.motec_exporter.add_channel("Throttle", "%")
        self.motec_exporter.add_channel("Brake", "%")
        self.motec_exporter.add_channel("Steering", "%") # Or degrees
        self.motec_exporter.add_channel("Lap", "")
        
    def start(self):
        """Start the relay agent"""
        self.running = True
        self.start_time = time.time()
        
        # Video encoder starts later (after session is established)
        # self.video_encoder.start()
        
        # Start Overlay
        self.overlay.start()
        
        print("╔════════════════════════════════════════════════════════════╗")
        print("║         PitBox Relay Agent v1.0.0                        ║")
        print("║         iRacing → PitBox AI Coaching Bridge              ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print(f"Connecting to: {self.cloud_client.url}")
        
        self.cloud_client.connect()
        self._main_loop()
    
    def stop(self):
        """Stop the relay agent"""
        self.running = False
        self.video_encoder.stop()
        self.overlay.stop()
        self.ir_reader.disconnect()
        self.cloud_client.disconnect()
        
        # Export MoTeC Data
        if self.session_id:
            filename = f"pitbox_session_{self.session_id}_{int(time.time())}.ld"
            self.motec_exporter.export(filename)
            print(f"💾 Saved MoTeC telemetry to: {filename}")
        
        # Print stats
        elapsed = time.time() - self.start_time
        print()
        print("═" * 50)
        print(f"Session Stats:")
        print(f"  Runtime: {elapsed:.1f}s")
        print(f"  Telemetry frames sent: {self.telemetry_count}")
        print(f"  Video frames sent: {self.video_encoder.frames_sent}")
        print(f"  Incidents detected: {self.incident_count}")
        print("═" * 50)
    
    def _main_loop(self):
        """Main polling loop"""
        logger.info("Waiting for iRacing...")
        
        session_sent = False
        
        while self.running:
            # Check PTT for Overlay
            if hasattr(self, 'vr') and hasattr(self, 'overlay'):
                self.overlay.set_talking(self.vr.is_pressed())
                
            # Try to connect to iRacing
            if not self.ir_reader.is_connected():
                if self.ir_reader.connect():
                    session_sent = False  # Reset for new connection
                else:
                    # Not connected, wait and retry
                    self.cloud_client.wait(1.0)
                    continue
            
            # Freeze telemetry frame for consistent reads
            self.ir_reader.freeze_frame()
            
            try:
                # Send session metadata on first connect
                if not session_sent:
                    self._send_session_metadata()
                    session_sent = True
                
                # Check flag state changes
                self._check_flag_state()
                
                # Detect and report incidents
                self._check_incidents()
                
                # Send telemetry
                self._send_telemetry()

                # PHASE 11: Strategy Data (Slow Lane - 1Hz)
                now = time.time()
                if self.is_connected and (now - self.last_strategy_update) > 1.0:
                    session = self.ir_reader.get_session_data()
                    cars = self.ir_reader.get_all_cars()
                    if session and cars:
                        self._send_strategy_update(session, cars)
                        self.last_strategy_update = now
                
            finally:
                self.ir_reader.unfreeze_frame()
            
            # Wait for next poll interval
            self.cloud_client.wait(config.POLL_INTERVAL)

    def _send_strategy_update(self, session, cars):
        """
        Send low-frequency strategy data (fuel, tires, damage)
        Phase 16: Now includes tire temps, brake pressure, engine health
        """
        if not self.cloud_client.connected:
            return

        strategy_payload = {
            'type': 'strategy_update',
            'sessionId': session.session_id,
            'timestamp': time.time() * 1000,
            'cars': []
        }

        for car in cars:
            # Track pit stops (Phase 16 fix)
            pit_stops = self._get_pit_stop_count(car.car_id, car.in_pit)
            
            car_strategy = {
                'carId': car.car_id,
                'fuel': {
                    'level': car.fuel_level,
                    'pct': car.fuel_pct,
                    'usePerHour': car.fuel_use_per_hour
                },
                'tires': {
                    'fl': car.tire_wear_fl,
                    'fr': car.tire_wear_fr,
                    'rl': car.tire_wear_rl,
                    'rr': car.tire_wear_rr
                },
                # Phase 16: Tire Temperatures
                'tireTemps': {
                    'fl': {'l': car.tire_temp_fl_l, 'm': car.tire_temp_fl_m, 'r': car.tire_temp_fl_r},
                    'fr': {'l': car.tire_temp_fr_l, 'm': car.tire_temp_fr_m, 'r': car.tire_temp_fr_r},
                    'rl': {'l': car.tire_temp_rl_l, 'm': car.tire_temp_rl_m, 'r': car.tire_temp_rl_r},
                    'rr': {'l': car.tire_temp_rr_l, 'm': car.tire_temp_rr_m, 'r': car.tire_temp_rr_r}
                },
                # Phase 16: Brake Pressure
                'brakePressure': {
                    'fl': car.brake_pressure_fl,
                    'fr': car.brake_pressure_fr,
                    'rl': car.brake_pressure_rl,
                    'rr': car.brake_pressure_rr
                },
                'damage': {
                    'aero': car.damage_aero,
                    'engine': car.damage_engine
                },
                # Phase 16: Engine Health
                'engine': {
                    'oilTemp': car.oil_temp,
                    'oilPressure': car.oil_pressure,
                    'waterTemp': car.water_temp,
                    'voltage': car.voltage,
                    'warnings': car.engine_warnings
                },
                # Phase 16: Tire Compound
                'tireCompound': car.tire_compound,
                'pit': {
                    'inLane': car.in_pit,
                    'stops': pit_stops
                }
            }
            strategy_payload['cars'].append(car_strategy)
        
        self.cloud_client.emit('strategy_update', strategy_payload)
    
    def _get_pit_stop_count(self, car_id: int, in_pit: bool) -> int:
        """
        Track pit stop count by detecting pit entry/exit transitions.
        """
        if not hasattr(self, '_pit_stop_counts'):
            self._pit_stop_counts = {}
        if not hasattr(self, '_was_in_pit'):
            self._was_in_pit = {}
        
        was_in_pit = self._was_in_pit.get(car_id, False)
        
        # Increment count when entering pit (was out, now in)
        if in_pit and not was_in_pit:
            self._pit_stop_counts[car_id] = self._pit_stop_counts.get(car_id, 0) + 1
        
        self._was_in_pit[car_id] = in_pit
        return self._pit_stop_counts.get(car_id, 0)

    
    def _send_session_metadata(self):
        """Send session metadata to cloud"""
        session = self.ir_reader.get_session_data()
        if not session:
            logger.warning("Could not read session data")
            return
        
        self.session_id = session.session_id
        metadata = map_session_metadata(session, config.RELAY_ID)
        self.discipline_category = metadata['category']
        
        logger.info(f"📋 Session: {session.track_name} [{session.session_type}]")
        logger.info(f"   Category: {self.discipline_category}")
        logger.info(f"   Multi-class: {session.is_multiclass}")
        
        self.cloud_client.send_session_metadata(metadata)
        
        # NOW start video encoder (client has session ID)
        if not self.video_encoder.running:
            logger.info("🎥 Starting video encoder...")
            self.video_encoder.start()
    
    def _check_flag_state(self):
        """Check for flag state changes and send race events"""
        flag_state = self.ir_reader.get_flag_state()
        
        if flag_state != self.last_flag_state:
            logger.info(f"🏁 Flag: {self.last_flag_state} → {flag_state}")
            
            event = map_race_event(
                self.session_id,
                flag_state,
                self.ir_reader.get_leader_lap(),
                self.ir_reader.get_session_time()
            )
            self.cloud_client.send_race_event(event)
            self.last_flag_state = flag_state
    
    def _check_incidents(self):
        """Check for and report incidents"""
        incidents = self.ir_reader.detect_incidents()
        
        for incident_data in incidents:
            logger.warning(f"⚠️ Incident detected: {incident_data['driver_names']}")
            
            incident = map_incident(
                self.session_id,
                incident_data,
                self.discipline_category
            )
            self.cloud_client.send_incident(incident)
            self.incident_count += 1
    
    def _send_telemetry(self):
        """
        Send telemetry using v2 multi-stream protocol.
        
        - Baseline: 4 Hz (always)
        - Controls: 15 Hz (when viewers present)
        """
        cars = self.ir_reader.get_all_cars()
        
        if not cars:
            return
        
        now = time.time()
        player_car = None
        
        # Find player car
        for car in cars:
            if car.is_player:
                player_car = car
                # Log to MoTeC
                self.motec_exporter.add_sample({
                    "Speed": car.speed * 3.6, # m/s to km/h
                    "RPM": car.rpm,
                    "Gear": float(car.gear),
                    "Throttle": car.throttle * 100,
                    "Brake": car.brake * 100,
                    "Steering": car.steering * 100,
                    "Lap": float(car.lap)
                })
                break
        
        if not player_car:
            return
        
        # Build car data dict for v2 streams
        car_data = {
            'speed': player_car.speed,
            'gear': player_car.gear,
            'rpm': player_car.rpm,
            'lap': player_car.lap,
            'lapDistPct': player_car.track_pct,
            'position': player_car.position,
            'fuelLevel': player_car.fuel_level,
            'fuelPct': player_car.fuel_pct,
            'sessionFlags': 0,  # TODO: get from session
            'gapAhead': None,   # TODO: calculate
            'gapBehind': None,  # TODO: calculate
            'throttle': player_car.throttle,
            'brake': player_car.brake,
            'clutch': player_car.clutch,
            'steering': player_car.steering,
        }
        
        # v2: Baseline stream (4 Hz always)
        if (now - self.last_baseline_time) >= self.BASELINE_INTERVAL:
            self.cloud_client.send_baseline_stream(car_data)
            self.last_baseline_time = now
            self.telemetry_count += 1
        
        # v2: Controls stream (15 Hz when viewers present)
        if self.cloud_client.should_send_controls():
            if (now - self.last_controls_time) >= self.CONTROLS_INTERVAL:
                self.cloud_client.send_controls_stream(car_data)
                self.last_controls_time = now
        
        # Legacy: Also send old format for backward compatibility
        telemetry = map_telemetry_snapshot(self.session_id, cars)
        self.cloud_client.send_telemetry_binary(telemetry)
        
        if config.LOG_TELEMETRY:
            logger.debug(f"📊 Telemetry: {len(cars)} cars")



# ========================
# Entry Point
# ========================

def main():
    parser = argparse.ArgumentParser(
        description='PitBox Relay Agent - Bridge iRacing to PitBox Server'
    )
    parser.add_argument(
        '--url',
        default=config.CLOUD_URL,
        help=f'PitBox Server URL (default: {config.CLOUD_URL})'
    )
    parser.add_argument(
        '--rate',
        type=int,
        default=config.POLL_RATE_HZ,
        help=f'Telemetry poll rate in Hz (default: {config.POLL_RATE_HZ})'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    if args.rate:
        config.POLL_RATE_HZ = args.rate
        config.POLL_INTERVAL = 1.0 / args.rate
        
    # Check for updates
    try:
        from auto_updater import auto_update_check
        auto_update_check()
    except Exception as e:
        logger.warning(f"Auto-update check failed: {e}")
    
    # Create and start agent
    agent = RelayAgent(args.url)
    
    # Handle signals
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        agent.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start
    agent.start()


if __name__ == '__main__':
    main()
