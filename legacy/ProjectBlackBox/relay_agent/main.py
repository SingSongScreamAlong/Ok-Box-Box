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
from data_mapper import (
    map_session_metadata,
    map_telemetry_snapshot,
    map_race_event,
    map_race_event,
    map_incident
)
from voice_recognition import VoiceRecognition
from voice_recognition import VoiceRecognition
# from overlay import PTTOverlay (Imported conditionally in __init__)

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
        try:
            from overlay import PTTOverlay
            self.overlay = PTTOverlay()
        except ImportError:
            logger.warning("⚠️ Tkinter not found. Overlay disabled.")
            self.overlay = None
        except Exception as e:
            logger.warning(f"⚠️ Failed to init overlay: {e}")
            self.overlay = None
        
        # MoTeC Exporter
        self.motec_exporter = MoTeCLDExporter()
        self._setup_motec_channels()
        
        # Link Audio to Policy
        # PitBoxClient creates its own Policy, we need to inject the audio pipeline into it
        if hasattr(self.cloud_client, 'policy'):
             # We create a simple wrapper that calls send_proactive_update in a non-blocking way
             # or just passes the instance if thread-safe enough
             self.cloud_client.policy.audio_pipeline = self
    
    def speak(self, text: str):
        """Callback for Policy to speak"""
        # Fire and forget speech
        # In main loop or thread? 
        # audio_pipeline.send_proactive_update is async def...
        # We need a synchronous bridge.
        # For now, we will just print/log. Phase 4B goal is event consumption.
        # Real TTS integration can be Phase 4C polish.
        logger.info(f"🔊 TTS Requested: {text}")

    # ... (rest of class)
        
        self.running = False
        self.session_id: Optional[str] = None
        self.last_flag_state: str = 'green'
        
        # Stats
        self.start_time = 0
        self.telemetry_count = 0
        self.incident_count = 0

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
        if self.overlay:
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
        if self.overlay:
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
            if hasattr(self, 'vr') and self.overlay:
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
                
            finally:
                self.ir_reader.unfreeze_frame()
            
            # Wait for next poll interval
            self.cloud_client.wait(config.POLL_INTERVAL)
    
    def _send_session_metadata(self):
        """Send session metadata to cloud"""
        session = self.ir_reader.get_session_data()
        if not session:
            logger.warning("Could not read session data")
            return
        
        self.session_id = session.session_id
        metadata = map_session_metadata(session, config.RELAY_ID)
        self.discipline_category = metadata['category']

        # UPDATE DRIVER ID for policy filtering
        # Assuming we are the primary driver in the session data or config.RELAY_ID matches?
        # Typically IRacingReader knows the local Driver ID (idx or customer ID).
        # We'll use the one from session data if available.
        if hasattr(session, 'driver_id'):
            self.cloud_client.driver_id = str(session.driver_id)
        
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
        """Send telemetry snapshot"""
        cars = self.ir_reader.get_all_cars()
        
        if not cars:
            return
        
        # Filter for player car to log to MoTeC
        for car in cars:
            if car.is_player:
                self.motec_exporter.add_sample({
                    "Speed": car.speed * 3.6, # m/s to km/h
                    "RPM": car.rpm,
                    "Gear": float(car.gear),
                    "Throttle": car.throttle * 100,
                    "Brake": car.brake * 100,
                    "Steering": car.steering * 100, # Approx %
                    "Lap": float(car.lap)
                })
                break
        
        telemetry = map_telemetry_snapshot(self.session_id, cars)
        self.cloud_client.send_telemetry(telemetry)
        self.telemetry_count += 1
        
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
