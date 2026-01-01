"""
PitBox Relay Agent - Server Client
Socket.IO client for connecting to PitBox Server
"""
import logging
import time
from typing import Callable, Optional, Dict, Any
import socketio
import socketio.exceptions

import config
from protocol import (
    SessionMetadata, 
    TelemetrySnapshot, 
    Incident, 
    RaceEvent
)

logger = logging.getLogger(__name__)


class PitBoxClient:
    """
    Socket.IO client for communicating with PitBox Server
    
    Protocol v2 Support:
    - Multi-stream telemetry (baseline 4Hz, controls 15Hz)
    - Viewer-aware adaptive streaming
    - Sequence numbers and timestamps on all packets
    """
    
    def __init__(self, url: str = None):
        self.url = url or config.CLOUD_URL
        self.sio = socketio.Client(
            reconnection=True,
            reconnection_attempts=10,
            reconnection_delay=1,
            reconnection_delay_max=30,
            logger=False,
            engineio_logger=False
        )
        self.connected = False
        self.session_id: Optional[str] = None
        
        # v2: Adaptive streaming state
        self.viewer_count = 0
        self.controls_requested = False
        self.baseline_seq = 0
        self.controls_seq = 0
        self.event_seq = 0
        
        # Set up event handlers
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up Socket.IO event handlers"""
        
        @self.sio.event
        def connect():
            self.connected = True
            logger.info(f"✅ Connected to PitBox Server at {self.url}")
            # Register as relay for this session
            if self.session_id:
                self.sio.emit('relay:register', {'sessionId': self.session_id})
        
        @self.sio.event
        def disconnect():
            self.connected = False
            logger.warning("⚠️ Disconnected from PitBox Server")
        
        @self.sio.event
        def connect_error(error):
            logger.error(f"❌ Connection error: {error}")
        
        @self.sio.on('recommendation')
        def on_recommendation(data):
            logger.info(f"📥 RECOMMENDATION: {data.get('action')} - {data.get('details')}")
            logger.info(f"   Confidence: {data.get('confidence', 0) * 100:.0f}%")
        
        @self.sio.on('profile_loaded')
        def on_profile_loaded(data):
            logger.info(f"📖 Profile loaded: {data.get('profileName')} [{data.get('category')}]")
        
        @self.sio.on('ack')
        def on_ack(data):
            logger.debug(f"   ✓ {data.get('originalType')} acknowledged")
        
        @self.sio.on('steward_command')
        def on_steward_command(data):
            logger.info(f"⚡ STEWARD COMMAND: {data.get('command')}")
            logger.info(f"   Reason: {data.get('reason')}")
            # TODO: Implement command execution in iRacing
        
        # v2: Viewer count control message
        @self.sio.on('relay:viewers')
        def on_relay_viewers(data):
            old_count = self.viewer_count
            self.viewer_count = data.get('viewerCount', 0)
            self.controls_requested = data.get('requestControls', False)
            
            if old_count != self.viewer_count:
                logger.info(f"👁️ Viewer count: {self.viewer_count} (controls: {'ON' if self.controls_requested else 'OFF'})")

    
    def connect(self) -> bool:
        """
        Connect to PitBox Cloud
        Returns True if connected successfully
        """
        if self.connected:
            return True
        
        try:
            logger.info(f"🔌 Connecting to PitBox Server at {self.url}...")
            self.sio.connect(
                self.url,
                transports=['websocket'],
                wait=True,
                wait_timeout=10
            )
            return self.connected
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from PitBox Cloud"""
        if self.sio.connected:
            self.sio.disconnect()
        self.connected = False
        logger.info("🔌 Disconnected from PitBox Server")
    
    def is_connected(self) -> bool:
        """Check if connected"""
        return self.connected and self.sio.connected
    
    def emit(self, event: str, data: Dict[str, Any]):
        """
        Emit an event to PitBox Cloud
        """
        if not self.is_connected():
            logger.warning(f"Cannot emit {event}: not connected")
            return False
        
        try:
            self.sio.emit(event, data)
            logger.debug(f"📤 Sent {event}")
            return True
        except Exception as e:
            logger.error(f"Failed to emit {event}: {e}")
            return False
    
    def send_session_metadata(self, metadata: Dict[str, Any]):
        """Send session metadata message"""
        try:
            # Validate with Pydantic
            # If metadata dict is missing fields, this will raise ValidationError
            # We add timestamp/sessionId if missing or let model handle it
            # The model requires sessionId/timestamp, caller should provide or we inject
            if 'timestamp' not in metadata:
                 metadata['timestamp'] = time.time() * 1000
                 
            model = SessionMetadata(**metadata)
            self.session_id = model.sessionId
            
            # Emit the dict representation
            return self.emit('session_metadata', model.model_dump())
        except Exception as e:
            logger.error(f"❌ Protocol Violation (Metadata): {e}")
            return False
    
    def send_telemetry(self, telemetry: Dict[str, Any]):
        """
        Send telemetry snapshot
        Supports strictly binary transmission for high performance
        """
        try:
            if 'timestamp' not in telemetry:
                 telemetry['timestamp'] = time.time() * 1000
            
            # Phase 10: Binary Packing
            # For now, we keep the JSON path as fallback or for debug
            # In a full binary switch, we would call send_binary_telemetry here
            
            model = TelemetrySnapshot(**telemetry)
            return self.emit('telemetry', model.model_dump())
        except Exception as e:
            # Rate limit this log in production
            logger.error(f"❌ Protocol Violation (Telemetry): {e}")
            return False

    def send_telemetry_binary(self, telemetry: Dict[str, Any]):
        """
        Send compressed binary telemetry
        Layout:
        - Timestamp (8 bytes double)
        - CarCount (1 byte)
        - [For Each Car]:
            - ID (2 bytes short)
            - LapDistPct (4 bytes float)
            - Speed (4 bytes float)
            - Lap (2 bytes short)
            - Position (1 byte)
            - Flags (1 byte, Placeholder)
        Total per car: ~14 bytes vs ~200 bytes JSON
        """
        try:
            import struct
            ts = telemetry.get('timestamp', time.time() * 1000)
            cars = telemetry.get('cars', [])
            
            # Header needs to include session ID for routing on server
            # But socket.io sends that in the wrapper or we can send as separate arg
            # Let's pack the payload body
            
            # Pack Header: Timestamp(d) + CarCount(B)
            # < = little endian
            buffer = bytearray()
            buffer.extend(struct.pack('<dB', ts, len(cars)))
            
            for car in cars:
                # Car Struct
                # ID(H), Dist(f), Speed(f), Lap(H), Pos(B), Flags(B)
                c_id = int(car.get('carId', 0))
                # Dist is nested in 'pos' object usually, handle flat or nested
                dist = car.get('pos', {}).get('s', 0.0) if isinstance(car.get('pos'), dict) else 0.0
                speed = float(car.get('speed', 0.0))
                lap = int(car.get('lap', 0))
                pos = int(car.get('position', 0))
                
                buffer.extend(struct.pack('<HffHBx', c_id, dist, speed, lap, pos))
                
            if self.connected and self.session_id:
                # Emit binary event
                self.sio.emit('telemetry_binary', {
                    'sessionId': self.session_id,
                    'payload': bytes(buffer)
                })
                return True
            return False
            
        except Exception as e:
            logger.error(f"❌ Binary Packing Error: {e}")
            return False
    
    def send_race_event(self, event: Dict[str, Any]):
        """Send race event (flag change, etc.)"""
        try:
             if 'timestamp' not in event:
                 event['timestamp'] = time.time() * 1000
                 
             model = RaceEvent(**event)
             return self.emit('race_event', model.model_dump())
        except Exception as e:
            logger.error(f"❌ Protocol Violation (RaceEvent): {e}")
            return False
    
    def send_incident(self, incident: Dict[str, Any]):
        """Send incident report"""
        try:
             if 'timestamp' not in incident:
                 incident['timestamp'] = time.time() * 1000
                 
             model = Incident(**incident)
             return self.emit('incident', model.model_dump())
        except Exception as e:
            logger.error(f"❌ Protocol Violation (Incident): {e}")
            return False
    
    def send_driver_update(self, update: Dict[str, Any]):
        """Send driver join/leave update"""
        return self.emit('driver_update', update)
    
    def send_video_frame(self, frame_data: bytes):
        """
        Send raw binary video frame
        Optimize: fire and forget, don't wait for ack to keep latency low
        """
        # We use a specific event for video that the server expects
        if self.connected and self.session_id:
            payload = {
                'sessionId': self.session_id,
                'image': frame_data # socketio will automatically binary-pack this
            }
            # Note: We rely on the library to handle binary attachments efficiently
            self.sio.emit('video_frame', payload)
            return True
        return False

    # =========================================================================
    # Protocol v2: Multi-Stream Telemetry
    # =========================================================================
    
    def send_baseline_stream(self, car_data: Dict[str, Any]) -> bool:
        """
        Send baseline telemetry stream (4 Hz always-on).
        
        Contains: speed, gear, rpm, lap, position, fuel, gaps
        """
        if not self.connected or not self.session_id:
            return False
        
        self.baseline_seq += 1
        
        packet = {
            'v': 2,
            'type': 'telemetry:baseline',
            'ts': time.time() * 1000,
            'seq': self.baseline_seq,
            'sessionId': self.session_id,
            'streamType': 'baseline',
            'sampleHz': 4,
            'payload': {
                'speed': car_data.get('speed', 0),
                'gear': car_data.get('gear', 0),
                'rpm': car_data.get('rpm', 0),
                'lap': car_data.get('lap', 0),
                'lapDistPct': car_data.get('lapDistPct', 0),
                'position': car_data.get('position', 0),
                'fuelLevel': car_data.get('fuelLevel', 0),
                'fuelPct': car_data.get('fuelPct', 0),
                'sessionFlags': car_data.get('sessionFlags', 0),
                'gapAhead': car_data.get('gapAhead'),
                'gapBehind': car_data.get('gapBehind'),
            }
        }
        
        return self.emit('telemetry:baseline', packet)
    
    def send_controls_stream(self, car_data: Dict[str, Any]) -> bool:
        """
        Send controls telemetry stream (15 Hz when viewers present).
        
        Only call this when self.controls_requested is True.
        Contains: throttle, brake, clutch, steering, rpm, speed
        """
        if not self.connected or not self.session_id:
            return False
        
        if not self.controls_requested:
            return False  # No viewers, don't send
        
        self.controls_seq += 1
        
        packet = {
            'v': 2,
            'type': 'telemetry:controls',
            'ts': time.time() * 1000,
            'seq': self.controls_seq,
            'sessionId': self.session_id,
            'streamType': 'controls',
            'sampleHz': 15,
            'payload': {
                'throttle': car_data.get('throttle', 0),
                'brake': car_data.get('brake', 0),
                'clutch': car_data.get('clutch', 0),
                'steering': car_data.get('steering', 0),
                'rpm': car_data.get('rpm', 0),
                'speed': car_data.get('speed', 0),
                'gear': car_data.get('gear', 0),
            }
        }
        
        return self.emit('telemetry:controls', packet)
    
    def send_event(self, event_type: str, payload: Dict[str, Any]) -> bool:
        """
        Send instant event (not tick-gated).
        
        Event types: incident, offtrack, overlap:enter, overlap:exit,
                     three_wide, pit:enter, pit:exit, flag:change, position:change
        """
        if not self.connected or not self.session_id:
            return False
        
        self.event_seq += 1
        
        # Ensure eventType is in payload
        payload['eventType'] = event_type
        
        packet = {
            'v': 2,
            'type': 'event',
            'ts': time.time() * 1000,
            'seq': self.event_seq,
            'sessionId': self.session_id,
            'streamType': 'event',
            'sampleHz': 0,  # Instant, not sampled
            'payload': payload
        }
        
        return self.emit('event', packet)
    
    def should_send_controls(self) -> bool:
        """Check if controls stream should be active (viewers present)."""
        return self.controls_requested

    def wait(self, seconds: float = 0.1):
        """
        Wait while processing events
        Use this in the main loop to allow receiving events
        """
        self.sio.sleep(seconds)

