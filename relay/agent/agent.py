#!/usr/bin/env python3
"""
Ok, Box Box - Relay Agent
The ONLY component that reads iRacing SDK.
Streams telemetry to backend via Socket.IO.
"""

import os
import sys
import time
import json
import logging
import asyncio
import argparse
import base64
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

import socketio
import requests

# Try to import iRacing SDK
try:
    import irsdk
    IRSDK_AVAILABLE = True
except ImportError:
    IRSDK_AVAILABLE = False
    print("WARNING: pyirsdk not available. Running in mock mode.")

# Try to import window capture
try:
    from window_capture import IRacingWindowCapture, CaptureConfig, FrameData
    WINDOW_CAPTURE_AVAILABLE = True
except ImportError:
    WINDOW_CAPTURE_AVAILABLE = False
    print("WARNING: Window capture not available.")

# Try to import voice playback
try:
    from voice_playback import voice_playback, setup_voice_handlers
    VOICE_PLAYBACK_AVAILABLE = True
except ImportError:
    VOICE_PLAYBACK_AVAILABLE = False
    print("WARNING: Voice playback not available.")

load_dotenv()

# Configuration
API_ENDPOINT = os.getenv('API_ENDPOINT', 'http://localhost:4000')
RELAY_TOKEN = os.getenv('RELAY_TOKEN', '')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
TELEMETRY_RATE = int(os.getenv('TELEMETRY_RATE', '30'))
HEARTBEAT_INTERVAL = int(os.getenv('HEARTBEAT_INTERVAL', '5'))
VIDEO_ENABLED = os.getenv('VIDEO_ENABLED', 'true').lower() == 'true'
VIDEO_FPS = int(os.getenv('VIDEO_FPS', '60'))  # 60 FPS for smooth racing
VIDEO_QUALITY = int(os.getenv('VIDEO_QUALITY', '85'))  # Higher quality
VIDEO_SCALE = float(os.getenv('VIDEO_SCALE', '0.75'))  # 75% resolution for balance

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('relay')


class RelayAgent:
    """
    Relay Agent - bridges iRacing SDK to Ok, Box Box backend.
    """
    
    def __init__(self, token: str, api_endpoint: str):
        self.token = token
        self.api_endpoint = api_endpoint
        self.ws_endpoint = api_endpoint.replace('http', 'ws')
        
        # Socket.IO client
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=0,  # Infinite
            reconnection_delay=1,
            reconnection_delay_max=30,
        )
        
        # iRacing SDK
        self.ir: Optional[Any] = None
        self.ir_connected = False
        
        # Window capture for video streaming
        self.window_capture: Optional[Any] = None
        self.video_streaming = False
        self.video_frame_count = 0
        
        # State
        self.running = False
        self.current_session_id: Optional[str] = None
        self.last_session_info: Optional[Dict] = None
        
        # Setup socket handlers
        self._setup_socket_handlers()
        
        # Initialize window capture if available
        if WINDOW_CAPTURE_AVAILABLE and VIDEO_ENABLED:
            self._init_window_capture()
    
    def _init_window_capture(self):
        """Initialize the iRacing window capture."""
        try:
            config = CaptureConfig(
                target_fps=VIDEO_FPS,
                quality=VIDEO_QUALITY,
                scale=VIDEO_SCALE,
            )
            self.window_capture = IRacingWindowCapture(config)
            logger.info(f"Window capture initialized (FPS: {VIDEO_FPS}, Quality: {VIDEO_QUALITY}, Scale: {VIDEO_SCALE})")
        except Exception as e:
            logger.error(f"Failed to initialize window capture: {e}")
            self.window_capture = None
    
    def _on_video_frame(self, frame: FrameData):
        """Callback for captured video frames."""
        if not self.sio.connected or not self.video_streaming:
            return
        
        self.video_frame_count += 1
        
        # Send frame via Socket.IO (base64 encoded)
        try:
            frame_data = {
                'data': base64.b64encode(frame.data).decode('utf-8'),
                'width': frame.width,
                'height': frame.height,
                'timestamp': frame.timestamp,
                'format': frame.format,
                'frameNumber': self.video_frame_count,
            }
            # Use asyncio to emit from sync callback
            asyncio.run_coroutine_threadsafe(
                self.sio.emit('relay:video:frame', frame_data),
                asyncio.get_event_loop()
            )
        except Exception as e:
            logger.debug(f"Failed to send video frame: {e}")
    
    async def start_video_streaming(self):
        """Start streaming the iRacing window."""
        if not self.window_capture:
            logger.warning("Window capture not available")
            return False
        
        if self.video_streaming:
            return True
        
        if self.window_capture.start_capture(self._on_video_frame):
            self.video_streaming = True
            self.video_frame_count = 0
            logger.info("Video streaming started")
            
            # Notify backend that video is available
            await self.sio.emit('relay:video:start', {
                'width': self.window_capture.get_window_size()[0],
                'height': self.window_capture.get_window_size()[1],
                'fps': VIDEO_FPS,
                'timestamp': int(time.time() * 1000),
            })
            return True
        
        return False
    
    def stop_video_streaming(self):
        """Stop video streaming."""
        if self.window_capture and self.video_streaming:
            self.window_capture.stop_capture()
            self.video_streaming = False
            logger.info(f"Video streaming stopped. Total frames: {self.video_frame_count}")
    
    def _setup_socket_handlers(self):
        @self.sio.event
        async def connect():
            logger.info("Connected to backend")
            # Auto-start video if iRacing window is available
            if self.window_capture and self.window_capture.is_window_available():
                await self.start_video_streaming()
        
        @self.sio.event
        async def disconnect():
            logger.warning("Disconnected from backend")
            self.stop_video_streaming()
        
        @self.sio.event
        async def connect_error(data):
            logger.error(f"Connection error: {data}")
        
        @self.sio.on('video:request_start')
        async def on_video_request_start(data):
            """Team dashboard requested video stream."""
            logger.info("Video stream requested by team")
            await self.start_video_streaming()
        
        @self.sio.on('video:request_stop')
        async def on_video_request_stop(data):
            """Team dashboard requested to stop video."""
            logger.info("Video stop requested by team")
            self.stop_video_streaming()
    
    async def connect(self):
        """Connect to backend Socket.IO server."""
        try:
            await self.sio.connect(
                f"{self.ws_endpoint}/relay",
                auth={'token': self.token},
                transports=['websocket']
            )
            logger.info("Socket.IO connected")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from backend."""
        if self.sio.connected:
            await self.sio.disconnect()
    
    def init_iracing(self) -> bool:
        """Initialize iRacing SDK connection."""
        if not IRSDK_AVAILABLE:
            logger.warning("iRacing SDK not available")
            return False
        
        try:
            self.ir = irsdk.IRSDK()
            return True
        except Exception as e:
            logger.error(f"Failed to init iRacing SDK: {e}")
            return False
    
    def check_iracing_connection(self) -> bool:
        """Check if iRacing is running and connected."""
        if not self.ir:
            return False
        
        try:
            if self.ir.startup():
                if not self.ir_connected:
                    logger.info("iRacing connected")
                    self.ir_connected = True
                return True
            else:
                if self.ir_connected:
                    logger.info("iRacing disconnected")
                    self.ir_connected = False
                return False
        except Exception as e:
            logger.error(f"iRacing connection check failed: {e}")
            self.ir_connected = False
            return False
    
    async def send_heartbeat(self):
        """Send heartbeat to backend."""
        heartbeat = {
            'relayId': f"relay_{os.getenv('MACHINE_ID', 'unknown')}",
            'userId': '',  # Set by backend from token
            'version': '0.1.0',
            'iRacingConnected': self.ir_connected,
            'sessionId': self.current_session_id,
            'timestamp': int(time.time() * 1000),
        }
        
        try:
            await self.sio.emit('relay:heartbeat', heartbeat)
            logger.debug("Heartbeat sent")
        except Exception as e:
            logger.error(f"Failed to send heartbeat: {e}")
    
    async def send_session_start(self, session_info: Dict):
        """Send session start event."""
        try:
            await self.sio.emit('relay:session:start', session_info)
            logger.info(f"Session start sent: {session_info.get('sessionId')}")
        except Exception as e:
            logger.error(f"Failed to send session start: {e}")
    
    async def send_session_end(self):
        """Send session end event."""
        if not self.current_session_id:
            return
        
        try:
            await self.sio.emit('relay:session:end', {
                'sessionId': self.current_session_id,
                'timestamp': int(time.time() * 1000),
            })
            logger.info(f"Session end sent: {self.current_session_id}")
        except Exception as e:
            logger.error(f"Failed to send session end: {e}")
    
    async def send_telemetry_bulk(self, packets: List[Dict]):
        """Send bulk telemetry for all drivers."""
        try:
            await self.sio.emit('relay:telemetry:bulk', packets)
            logger.debug(f"Bulk telemetry sent: {len(packets)} drivers")
        except Exception as e:
            logger.error(f"Failed to send telemetry: {e}")
    
    def extract_session_info(self) -> Optional[Dict]:
        """Extract session metadata from iRacing."""
        if not self.ir or not self.ir_connected:
            return None
        
        try:
            weekend_info = self.ir['WeekendInfo']
            session_info = self.ir['SessionInfo']
            
            # Get current session
            session_num = self.ir['SessionNum']
            current_session = session_info['Sessions'][session_num] if session_num < len(session_info['Sessions']) else None
            
            session_type = 'UNKNOWN'
            if current_session:
                session_name = current_session.get('SessionName', '').upper()
                if 'RACE' in session_name:
                    session_type = 'RACE'
                elif 'QUAL' in session_name:
                    session_type = 'QUALIFYING'
                elif 'PRACTICE' in session_name:
                    session_type = 'PRACTICE'
                elif 'WARMUP' in session_name:
                    session_type = 'WARMUP'
            
            # Build session ID from subsession
            subsession_id = self.ir['SessionUniqueID'] or int(time.time())
            session_id = f"session_{subsession_id}_{session_num}"
            
            # Extract drivers
            drivers = []
            driver_info = self.ir['DriverInfo']
            if driver_info and 'Drivers' in driver_info:
                for d in driver_info['Drivers']:
                    if d.get('CarIdx', -1) >= 0:
                        drivers.append({
                            'driverId': str(d.get('UserID', d.get('CarIdx'))),
                            'driverName': d.get('UserName', 'Unknown'),
                            'carNumber': d.get('CarNumber', ''),
                            'carName': d.get('CarScreenName', ''),
                            'carClass': d.get('CarClassShortName', ''),
                            'iRating': d.get('IRating', 0),
                            'licenseLevel': d.get('LicString', ''),
                            'teamName': d.get('TeamName', None),
                        })
            
            return {
                'sessionId': session_id,
                'subsessionId': subsession_id,
                'type': session_type,
                'track': {
                    'id': weekend_info.get('TrackID', 0),
                    'name': weekend_info.get('TrackDisplayName', 'Unknown'),
                    'configName': weekend_info.get('TrackConfigName', ''),
                    'lengthKm': float(weekend_info.get('TrackLength', '0 km').replace(' km', '')),
                    'city': weekend_info.get('TrackCity', ''),
                    'country': weekend_info.get('TrackCountry', ''),
                },
                'weather': {
                    'temperature': self.ir['AirTemp'] or 20,
                    'trackTemperature': self.ir['TrackTemp'] or 30,
                    'humidity': self.ir['RelativeHumidity'] or 50,
                    'windSpeed': self.ir['WindVel'] or 0,
                    'windDirection': self.ir['WindDir'] or 0,
                    'skies': weekend_info.get('TrackSkies', 'Clear'),
                },
                'totalLaps': current_session.get('SessionLaps', 0) if current_session else 0,
                'isRaceSession': session_type == 'RACE',
                'drivers': drivers,
                'timestamp': int(time.time() * 1000),
            }
        except Exception as e:
            logger.error(f"Failed to extract session info: {e}")
            return None
    
    def extract_telemetry(self) -> List[Dict]:
        """Extract telemetry for all drivers."""
        if not self.ir or not self.ir_connected:
            return []
        
        packets = []
        
        try:
            driver_info = self.ir['DriverInfo']
            if not driver_info or 'Drivers' not in driver_info:
                return []
            
            for driver in driver_info['Drivers']:
                car_idx = driver.get('CarIdx', -1)
                if car_idx < 0:
                    continue
                
                # Get car-specific data
                try:
                    packet = {
                        'sessionId': self.current_session_id,
                        'driverId': str(driver.get('UserID', car_idx)),
                        'driverName': driver.get('UserName', 'Unknown'),
                        'carNumber': driver.get('CarNumber', ''),
                        'timestamp': int(time.time() * 1000),
                        
                        # Timing
                        'lap': self.ir['CarIdxLap'][car_idx] if self.ir['CarIdxLap'] else 0,
                        'sector': 0,  # Would need track sector detection
                        'lapTime': int((self.ir['CarIdxLastLapTime'][car_idx] or 0) * 1000) if self.ir['CarIdxLastLapTime'] else 0,
                        'lastLapTime': int((self.ir['CarIdxLastLapTime'][car_idx] or 0) * 1000) if self.ir['CarIdxLastLapTime'] else 0,
                        'bestLapTime': int((self.ir['CarIdxBestLapTime'][car_idx] or 0) * 1000) if self.ir['CarIdxBestLapTime'] else 0,
                        'sectorTimes': [],
                        'bestSectorTimes': [],
                        
                        # Position
                        'racePosition': self.ir['CarIdxPosition'][car_idx] if self.ir['CarIdxPosition'] else 0,
                        'classPosition': self.ir['CarIdxClassPosition'][car_idx] if self.ir['CarIdxClassPosition'] else 0,
                        'trackPosition': self.ir['CarIdxLapDistPct'][car_idx] if self.ir['CarIdxLapDistPct'] else 0,
                        'gapAhead': 0,  # Would need calculation
                        'gapBehind': 0,
                        
                        # Car state (only available for player car)
                        'speed': 0,
                        'rpm': 0,
                        'gear': 0,
                        'throttle': 0,
                        'brake': 0,
                        'clutch': 0,
                        'steering': 0,
                        
                        # Tires (placeholder)
                        'tires': {
                            'frontLeft': {'temp': 80, 'wear': 100, 'pressure': 26},
                            'frontRight': {'temp': 80, 'wear': 100, 'pressure': 26},
                            'rearLeft': {'temp': 80, 'wear': 100, 'pressure': 26},
                            'rearRight': {'temp': 80, 'wear': 100, 'pressure': 26},
                        },
                        
                        # Fuel
                        'fuelLevel': 0,
                        'fuelPerLap': 0,
                        'fuelLapsRemaining': 0,
                        
                        # Flags
                        'onPitRoad': bool(self.ir['CarIdxOnPitRoad'][car_idx]) if self.ir['CarIdxOnPitRoad'] else False,
                        'inPitStall': False,
                        'onTrack': self.ir['CarIdxTrackSurface'][car_idx] == 3 if self.ir['CarIdxTrackSurface'] else False,
                    }
                    
                    # Add player-specific data if this is the player
                    if car_idx == self.ir['PlayerCarIdx']:
                        packet['speed'] = (self.ir['Speed'] or 0) * 3.6  # m/s to km/h
                        packet['rpm'] = self.ir['RPM'] or 0
                        packet['gear'] = self.ir['Gear'] or 0
                        packet['throttle'] = (self.ir['Throttle'] or 0) * 100
                        packet['brake'] = (self.ir['Brake'] or 0) * 100
                        packet['clutch'] = (self.ir['Clutch'] or 0) * 100
                        packet['steering'] = self.ir['SteeringWheelAngle'] or 0
                        packet['fuelLevel'] = self.ir['FuelLevel'] or 0
                    
                    packets.append(packet)
                except Exception as e:
                    logger.debug(f"Failed to extract telemetry for car {car_idx}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Failed to extract telemetry: {e}")
        
        return packets
    
    async def run(self):
        """Main run loop."""
        self.running = True
        
        # Initialize iRacing
        self.init_iracing()
        
        # Connect to backend
        if not await self.connect():
            logger.error("Failed to connect to backend")
            return
        
        logger.info("Relay agent started")
        
        last_heartbeat = 0
        last_telemetry = 0
        telemetry_interval = 1.0 / TELEMETRY_RATE
        
        try:
            while self.running:
                now = time.time()
                
                # Check iRacing connection
                ir_connected = self.check_iracing_connection()
                
                # Send heartbeat
                if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                    await self.send_heartbeat()
                    last_heartbeat = now
                
                if ir_connected:
                    # Check for session changes
                    session_info = self.extract_session_info()
                    if session_info:
                        new_session_id = session_info['sessionId']
                        
                        if new_session_id != self.current_session_id:
                            # Session changed
                            if self.current_session_id:
                                await self.send_session_end()
                            
                            self.current_session_id = new_session_id
                            self.last_session_info = session_info
                            await self.send_session_start(session_info)
                    
                    # Send telemetry at configured rate
                    if now - last_telemetry >= telemetry_interval:
                        packets = self.extract_telemetry()
                        if packets:
                            await self.send_telemetry_bulk(packets)
                        last_telemetry = now
                else:
                    # iRacing not connected
                    if self.current_session_id:
                        await self.send_session_end()
                        self.current_session_id = None
                        self.last_session_info = None
                
                # Small sleep to prevent CPU spin
                await asyncio.sleep(0.01)
                
        except asyncio.CancelledError:
            logger.info("Relay agent cancelled")
        except Exception as e:
            logger.error(f"Relay agent error: {e}")
        finally:
            self.running = False
            if self.current_session_id:
                await self.send_session_end()
            await self.disconnect()
            if self.ir:
                self.ir.shutdown()
            logger.info("Relay agent stopped")
    
    def stop(self):
        """Signal the agent to stop."""
        self.running = False


async def main():
    parser = argparse.ArgumentParser(description='Ok, Box Box Relay Agent')
    parser.add_argument('--token', help='Relay token (or set RELAY_TOKEN env)')
    parser.add_argument('--api', help='API endpoint (or set API_ENDPOINT env)')
    args = parser.parse_args()
    
    token = args.token or RELAY_TOKEN
    api = args.api or API_ENDPOINT
    
    if not token:
        logger.error("No relay token provided. Set RELAY_TOKEN or use --token")
        sys.exit(1)
    
    agent = RelayAgent(token, api)
    
    # Start voice playback service if available
    if VOICE_PLAYBACK_AVAILABLE:
        await voice_playback.start()
        setup_voice_handlers(agent.sio)
        logger.info("Voice playback enabled")
    
    try:
        await agent.run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        agent.stop()
    finally:
        # Stop voice playback
        if VOICE_PLAYBACK_AVAILABLE:
            await voice_playback.stop()


if __name__ == '__main__':
    asyncio.run(main())
