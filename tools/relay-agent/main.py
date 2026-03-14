#!/usr/bin/env python3
"""
PitBox Relay Agent - Main Entry Point
Connects iRacing to PitBox Server for real-time telemetry and AI coaching

Usage:
    python main.py [--url SERVER_URL]

Environment Variables:
    BLACKBOX_SERVER_URL - PitBox Server WebSocket URL (default: http://localhost:3001)
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
import threading
import io
import wave
import base64
try:
    import pyaudio
except ImportError:
    pyaudio = None

from iracing_reader import IRacingReader
from pitbox_client import PitBoxClient
from video_encoder import VideoEncoder
from screen_capture import ScreenCapture, CaptureConfig
from local_server import LocalServer
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
        self.screen_capture = ScreenCapture(CaptureConfig(
            target_fps=config.CLIP_CAPTURE_FPS,
            capture_width=config.CLIP_CAPTURE_WIDTH,
            capture_height=config.CLIP_CAPTURE_HEIGHT,
            buffer_seconds=config.CLIP_BUFFER_SECONDS,
            jpeg_quality=config.CLIP_JPEG_QUALITY,
            pre_event_seconds=config.CLIP_PRE_EVENT_SECONDS,
            post_event_seconds=config.CLIP_POST_EVENT_SECONDS,
            max_clip_seconds=config.CLIP_MAX_SECONDS,
            output_dir=config.CLIP_OUTPUT_DIR,
            max_storage_mb=config.CLIP_MAX_STORAGE_MB,
        ))
        self.local_server = LocalServer()
        self.local_server.on_trigger_clip = self._handle_trigger_clip
        self.vr = VoiceRecognition(
            ptt_type=config.PTT_TYPE,
            ptt_key=config.PTT_KEY,
            joystick_id=config.JOYSTICK_ID,
            joystick_button=config.JOYSTICK_BUTTON
        )
        self.overlay = PTTOverlay()
        
        # Voice recording
        self.audio = pyaudio.PyAudio() if pyaudio else None
        self.audio_format = pyaudio.paInt16 if pyaudio else 8
        self.audio_channels = 1
        self.audio_rate = 16000
        self.audio_chunk = 1024
        self.audio_frames = []
        self.audio_recording = False
        self.audio_stream = None
        self.ptt_was_pressed = False
        self.voice_thread = None
        
        # MoTeC Exporter
        self.motec_exporter = MoTeCLDExporter()
        self._setup_motec_channels()
        
        self.running = False
        self.session_id: Optional[str] = None
        self.last_flag_state: str = 'green'
        self.last_strategy_raw: float = 0 # Phase 11 (now strategy_raw)
        self.last_standings_emit: float = 0

        # v2: Rate control for multi-stream telemetry
        self.last_baseline_time: float = 0
        self.last_controls_time: float = 0
        self.BASELINE_INTERVAL: float = 1.0 / 4    # 4 Hz
        self.CONTROLS_INTERVAL: float = 1.0 / 15   # 15 Hz
        self.STANDINGS_INTERVAL: float = 1.0       # 1 Hz
        
        # Stats
        self.start_time = 0
        self.telemetry_count = 0
        self.incident_count = 0
        
        # Track shape capture
        self.track_shape_points = {}  # distPct -> {lat, lon, alt}
        self.track_shape_saved = False
        self.discipline_category = 'road'

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
        
        # Start local Socket.IO server for Electron bridge
        self.local_server.start()
        
        # Start Overlay
        self.overlay.start()
        
        print("╔════════════════════════════════════════════════════════════╗")
        print("║         PitBox Relay Agent v1.0.0-rc1                    ║")
        print("║         iRacing → PitBox AI Coaching Bridge              ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print(f"Connecting to: {self.cloud_client.url}")
        
        self.cloud_client.connect()
        self._setup_voice_response_handler()
        
        # Start voice thread (runs independently of iRacing)
        self.voice_thread = threading.Thread(target=self._voice_loop, daemon=True)
        self.voice_thread.start()
        logger.info("🎙️ Voice system ready (PTT active)")
        
        self._main_loop()
    
    def stop(self):
        """Stop the relay agent"""
        self.running = False
        self.video_encoder.stop()
        self.screen_capture.stop()
        self.local_server.stop()
        self.overlay.stop()
        
        # Notify server that session is ending (triggers iRacing profile sync)
        if self.session_id:
            self.cloud_client.send_session_end(user_id=config.USER_ID)
        
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
            # Check PTT for voice recording
            self._check_voice_ptt()
            
            # Update overlay
            if hasattr(self, 'vr') and hasattr(self, 'overlay'):
                self.overlay.set_talking(self.vr.is_pressed())
                
            # Try to connect to iRacing
            if not self.ir_reader.is_connected():
                self.local_server.emit('iracing_status', {'connected': False})
                if self.ir_reader.connect():
                    self.local_server.emit('iracing_status', {'connected': True})
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
                    session_sent = self._send_session_metadata()
                
                # Check flag state changes
                self._check_flag_state()
                
                # Detect and report incidents
                self._check_incidents()
                
                # Send telemetry
                self._send_telemetry()

                # PHASE 11: Strategy Data (Slow Lane - 1Hz)
                now = time.time()
                if self.is_connected and (now - self.last_strategy_raw) > 1.0:
                    session = self.ir_reader.get_session_data()
                    cars = self.ir_reader.get_all_cars()
                    if session and cars:
                        self._send_strategy_raw(session, cars)
                        self.last_strategy_raw = now
                
            finally:
                self.ir_reader.unfreeze_frame()
            
            # Wait for next poll interval
            self.cloud_client.wait(config.POLL_INTERVAL)

    def _send_strategy_raw(self, session, cars):
        """
        Send raw strategy data (fuel, tires, damage) — server does all inference.
        Phase 16: Now includes tire temps, brake pressure, engine health
        """
        if not self.cloud_client.connected:
            return

        strategy_payload = {
            'type': 'strategy_raw',
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
        
        self.cloud_client.emit('strategy_raw', strategy_payload)
    
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

    
    def _send_session_metadata(self) -> bool:
        """Send session metadata to cloud. Returns True on success."""
        session = self.ir_reader.get_session_data()
        if not session:
            logger.warning("No session data available")
            return False
        
        self.session_id = session.session_id
        metadata = map_session_metadata(session, config.RELAY_ID)
        self.discipline_category = metadata['category']
        
        logger.info(f"📋 Session: {session.track_name} [{session.session_type}]")
        logger.info(f"   Category: {self.discipline_category}")
        logger.info(f"   Multi-class: {session.is_multiclass}")
        
        ok = self.cloud_client.send_session_metadata(metadata)
        if not ok:
            logger.warning("⚠️ Failed to send session_metadata, will retry")
            return False
        
        # Forward to Electron bridge
        self.local_server.emit('session_metadata', metadata)
        
        # NOW start video encoder (client has session ID)
        if not self.video_encoder.running:
            self.video_encoder.start()

        # Start screen capture for replay clips
        if not self.screen_capture.running:
            self.screen_capture.session_id = self.session_id or ''
            self.screen_capture.start()

        return True
    
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
            
            # Trigger session_end on checkered flag (triggers iRacing profile sync)
            if flag_state == 'checkered':
                logger.info("🏁 Checkered flag! Triggering session end...")
                self.cloud_client.send_session_end(user_id=config.USER_ID)
            
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
            self.local_server.emit('incident', incident)
            self.incident_count += 1

            # Trigger replay clip on incident
            driver_names = incident_data.get('driver_names', 'Unknown')
            inc_count = incident_data.get('incident_count', 0)
            self.screen_capture.trigger_clip(
                event_type='incident',
                event_label=f'Incident: {driver_names} (+{inc_count}x)',
                severity='major' if inc_count >= 4 else 'moderate' if inc_count >= 2 else 'minor',
                session_time_ms=int((self.ir_reader.get_session_time() or 0) * 1000),
            )
    
    def _handle_trigger_clip(self, data):
        """Handle manual clip trigger from Electron bridge."""
        event_type = data.get('event_type', 'manual')
        event_label = data.get('event_label', 'Manual clip')
        severity = data.get('severity', 'minor')
        session_time = self.ir_reader.get_session_time() if self.ir_reader.is_connected() else 0
        self.screen_capture.trigger_clip(
            event_type=event_type,
            event_label=event_label,
            severity=severity,
            session_time_ms=int((session_time or 0) * 1000),
        )

    def _send_telemetry(self):
        """
        Send telemetry to server.
        
        JSON telemetry + standings are sent for ALL cars (works in spectator mode).
        v2 streams (baseline/controls) only sent when a player car is found.
        """
        cars = self.ir_reader.get_all_cars()
        
        if not cars:
            return
        
        now = time.time()
        
        # === JSON telemetry for ALL cars (server needs this for telemetry:driver) ===
        telemetry = map_telemetry_snapshot(self.session_id, cars)
        for i, car in enumerate(cars):
            telemetry['cars'][i]['driverName'] = car.driver_name
            telemetry['cars'][i]['carName'] = car.car_name
            telemetry['cars'][i]['carNumber'] = car.car_number
            telemetry['cars'][i]['lastLapTime'] = car.last_lap_time
            telemetry['cars'][i]['bestLapTime'] = car.best_lap_time
            telemetry['cars'][i]['incidentCount'] = car.incident_count
            telemetry['cars'][i]['steeringAngle'] = car.steering
            telemetry['cars'][i]['fuelLevel'] = car.fuel_level
            telemetry['cars'][i]['fuelPct'] = car.fuel_pct
            telemetry['cars'][i]['fuelUsePerHour'] = car.fuel_use_per_hour
            telemetry['cars'][i]['onPitRoad'] = car.in_pit
            telemetry['cars'][i]['isOnTrack'] = not car.in_pit
            telemetry['cars'][i]['iRating'] = car.irating
            telemetry['cars'][i]['carIdx'] = car.car_id
            telemetry['cars'][i]['isPlayer'] = car.is_player
        self.cloud_client.emit('telemetry', telemetry)
        self.local_server.emit('telemetry', telemetry)
        self.telemetry_count += 1

        # Update screen capture session context (with player telemetry for clip sidecar)
        session_time = self.ir_reader.get_session_time()
        player_car = next((c for c in cars if c.is_player), None)
        player_telemetry = None
        if player_car:
            player_telemetry = {
                'speed': player_car.speed,
                'rpm': player_car.rpm,
                'gear': player_car.gear,
                'throttle': player_car.throttle,
                'brake': player_car.brake,
                'steering': player_car.steering,
                'fuelLevel': player_car.fuel_level,
                'fuelPct': player_car.fuel_pct,
                'lap': player_car.lap,
                'lapDistPct': player_car.lap_dist_pct if hasattr(player_car, 'lap_dist_pct') else 0,
                'position': player_car.position,
                'incidentCount': player_car.incident_count if hasattr(player_car, 'incident_count') else 0,
            }
        self.screen_capture.update_session_context(
            session_id=self.session_id or '',
            session_time_ms=int((session_time or 0) * 1000),
            telemetry=player_telemetry,
        )

        # Poll for completed clips and emit to cloud
        while not self.screen_capture.pending_clips.empty():
            try:
                from dataclasses import asdict
                clip_meta = self.screen_capture.pending_clips.get_nowait()
                self.cloud_client.emit('clip_saved', asdict(clip_meta))
                self.local_server.emit('clip_saved', asdict(clip_meta))
                logger.info(f'📹 Clip emitted: {clip_meta.clip_id}')
            except Exception:
                break
        
        # === Standings for leaderboard (1Hz) ===
        if now - self.last_standings_emit >= self.STANDINGS_INTERVAL:
            standings = []
            for car in sorted(cars, key=lambda c: c.position if c.position > 0 else 999):
                standings.append({
                    'carIdx': car.car_id,
                    'driverName': car.driver_name,
                    'carNumber': car.car_number,
                    'position': car.position,
                    'classPosition': car.class_position,
                    'lapDistPct': car.track_pct,
                    'lap': car.lap,
                    'lastLapTime': car.last_lap_time,
                    'bestLapTime': car.best_lap_time,
                    'onPitRoad': car.in_pit,
                    'isPlayer': car.is_player,
                    'iRating': car.irating,
                    'gapToLeader': 0,
                })
            self.cloud_client.emit('standings', {
                'sessionId': self.session_id,
                'standings': standings,
                'totalCars': len(standings),
            })
            self.last_standings_emit = now
        
        # === v2 streams + MoTeC (player car only) ===
        player_car = None
        for car in cars:
            if car.is_player:
                player_car = car
                self.motec_exporter.add_sample({
                    "Speed": car.speed * 3.6,
                    "RPM": car.rpm,
                    "Gear": float(car.gear),
                    "Throttle": car.throttle * 100,
                    "Brake": car.brake * 100,
                    "Steering": car.steering * 100,
                    "Lap": float(car.lap)
                })
                break
        
        if player_car:
            car_data = {
                'speed': player_car.speed,
                'gear': player_car.gear,
                'rpm': player_car.rpm,
                'lap': player_car.lap,
                'lapDistPct': player_car.track_pct,
                'position': player_car.position,
                'fuelLevel': player_car.fuel_level,
                'fuelPct': player_car.fuel_pct,
                'sessionFlags': 0,
                'gapAhead': None,
                'gapBehind': None,
                'throttle': player_car.throttle,
                'brake': player_car.brake,
                'clutch': player_car.clutch,
                'steering': player_car.steering,
            }
            
            if (now - self.last_baseline_time) >= self.BASELINE_INTERVAL:
                self.cloud_client.send_baseline_stream(car_data)
                self.last_baseline_time = now
            
            if self.cloud_client.should_send_controls():
                if (now - self.last_controls_time) >= self.CONTROLS_INTERVAL:
                    self.cloud_client.send_controls_stream(car_data)
                    self.last_controls_time = now
            
            # Capture track shape data (lat/lon at each track position)
            self._capture_track_shape_point(player_car)



    def _capture_track_shape_point(self, player_car):
        """Capture lat/lon at current track position for track shape generation"""
        if self.track_shape_saved:
            return
        
        pct = player_car.track_pct
        lat = player_car.lat
        lon = player_car.lon
        
        if pct is None or lat == 0 or lon == 0:
            return
        
        # Round to 0.1% increments (1000 points around track)
        pct_key = round(pct * 1000)
        
        if pct_key not in self.track_shape_points:
            self.track_shape_points[pct_key] = {
                'distPct': pct,
                'lat': lat,
                'lon': lon,
                'alt': player_car.alt
            }
        
        # Check if we have enough coverage (90%+ of track)
        coverage = len(self.track_shape_points) / 10  # percentage
        if coverage >= 90 and not self.track_shape_saved:
            self._save_track_shape()
    
    def _save_track_shape(self):
        """Save captured track shape to file"""
        if len(self.track_shape_points) < 100:
            return
        
        session = self.ir_reader.get_session_data()
        if not session:
            return
        
        track_name = session.track_name
        track_id = session.track_id
        
        # Sort points by distance percentage
        points = sorted(self.track_shape_points.values(), key=lambda p: p['distPct'])
        
        # Convert lat/lon to X/Y (meters from origin)
        import math
        origin_lat = points[0]['lat']
        origin_lon = points[0]['lon']
        
        meters_per_deg_lat = 111320
        meters_per_deg_lon = 111320 * math.cos(math.radians(origin_lat))
        
        shape_points = []
        for p in points:
            x = (p['lon'] - origin_lon) * meters_per_deg_lon
            y = (p['lat'] - origin_lat) * meters_per_deg_lat
            shape_points.append({
                'x': round(x, 2),
                'y': round(y, 2),
                'distPct': p['distPct']
            })
        
        xs = [p['x'] for p in shape_points]
        ys = [p['y'] for p in shape_points]
        
        shape = {
            'name': track_name,
            'trackId': str(track_id),
            'centerline': shape_points,
            'bounds': {
                'xMin': min(xs),
                'xMax': max(xs),
                'yMin': min(ys),
                'yMax': max(ys)
            }
        }
        
        # Save to track_shapes folder
        from pathlib import Path
        output_dir = Path(__file__).parent / 'track_shapes'
        output_dir.mkdir(exist_ok=True)
        
        slug = track_name.lower().replace(' ', '-').replace('/', '-')
        output_file = output_dir / f'{slug}.shape.json'
        
        import json
        with open(output_file, 'w') as f:
            json.dump(shape, f, indent=2)
        
        logger.info(f"📍 Track shape saved: {output_file} ({len(shape_points)} points)")
        self.track_shape_saved = True

    def _voice_loop(self):
        """Dedicated voice loop running in separate thread"""
        logger.info("Voice thread started")
        debug_counter = 0
        while self.running:
            self._check_voice_ptt()
            debug_counter += 1
            # Log every 5 seconds to confirm thread is running
            if debug_counter % 250 == 0:
                is_pressed = self.vr.is_pressed() if hasattr(self, 'vr') else False
                logger.debug(f"Voice thread alive, PTT={is_pressed}")
            time.sleep(0.02)  # 50Hz polling

    def _check_voice_ptt(self):
        """Check PTT state and handle voice recording"""
        if not self.audio or not hasattr(self, 'vr'):
            return
            
        is_pressed = self.vr.is_pressed()
        
        # PTT pressed - start recording
        if is_pressed and not self.ptt_was_pressed:
            logger.info("🎤 Recording started...")
            self.audio_recording = True
            self.audio_frames = []
            try:
                self.audio_stream = self.audio.open(
                    format=self.audio_format,
                    channels=self.audio_channels,
                    rate=self.audio_rate,
                    input=True,
                    frames_per_buffer=self.audio_chunk
                )
            except Exception as e:
                logger.error(f"Failed to open audio stream: {e}")
                self.audio_recording = False
        
        # PTT held - continue recording
        elif is_pressed and self.audio_recording and self.audio_stream:
            try:
                data = self.audio_stream.read(self.audio_chunk, exception_on_overflow=False)
                self.audio_frames.append(data)
            except Exception:
                pass
        
        # PTT released - stop recording and send
        elif not is_pressed and self.ptt_was_pressed and self.audio_recording:
            logger.info("🎤 Recording stopped, processing...")
            self.audio_recording = False
            if self.audio_stream:
                self.audio_stream.stop_stream()
                self.audio_stream.close()
                self.audio_stream = None
            
            # Check minimum length (avoid tiny clicks)
            if len(self.audio_frames) > 10:
                self._send_voice_query()
            else:
                logger.debug("Recording too short, ignored")
            
            self.audio_frames = []
        
        self.ptt_was_pressed = is_pressed

    def _send_voice_query(self):
        """Convert recorded audio to base64 and send to server"""
        if not self.audio_frames:
            return
            
        try:
            # Convert to WAV in memory
            wav_buffer = io.BytesIO()
            wf = wave.open(wav_buffer, 'wb')
            wf.setnchannels(self.audio_channels)
            wf.setsampwidth(self.audio.get_sample_size(self.audio_format))
            wf.setframerate(self.audio_rate)
            wf.writeframes(b''.join(self.audio_frames))
            wf.close()
            wav_buffer.seek(0)
            
            # Encode as base64
            audio_b64 = base64.b64encode(wav_buffer.read()).decode('utf-8')
            
            logger.info(f"🎤 Sending {len(audio_b64)} bytes to server...")
            
            # Send via Socket.IO (same format as Electron relay)
            self.cloud_client.emit('voice:query', {
                'audio': audio_b64,
                'format': 'wav'
            })
            
        except Exception as e:
            logger.error(f"Failed to send voice query: {e}")

    def _setup_voice_response_handler(self):
        """Setup handler for voice responses from server"""
        @self.cloud_client.sio.on('voice:response')
        def on_voice_response(data):
            if not data.get('success'):
                logger.error(f"Voice response error: {data.get('error')}")
                return
            
            if data.get('response'):
                logger.info(f"🎧 Engineer: {data.get('response')}")
            
            if data.get('audioBase64'):
                self._play_audio_response(data.get('audioBase64'))

    def _play_audio_response(self, audio_b64):
        """Play base64 encoded audio response"""
        try:
            import sounddevice as sd
            import soundfile as sf
            
            audio_bytes = base64.b64decode(audio_b64)
            audio_buffer = io.BytesIO(audio_bytes)
            
            data, fs = sf.read(audio_buffer)
            sd.play(data, fs)
            sd.wait()
        except ImportError:
            logger.warning("sounddevice/soundfile not installed, cannot play audio")
        except Exception as e:
            logger.error(f"Playback error: {e}")


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
