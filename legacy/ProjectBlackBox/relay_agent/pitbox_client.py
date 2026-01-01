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

from driver_policy import DriverPolicy

logger = logging.getLogger(__name__)


class PitBoxClient:
    """
    Socket.IO client for communicating with PitBox Server
    """
    
    def __init__(self, url: str = None, driver_id: str = None):
        self.url = url or config.CLOUD_URL
        self.driver_id = driver_id # We need to know who we are to filter events
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
        
        # Driver Policy Layer
        self.policy = DriverPolicy() 
        # We will wire up the audio pipeline later in main.py or allow policy to emit callbacks?
        # Better: let policy define what to say, and client emits a local event or callback.
        # Simplified: Client just holds the policy logic for now.
        
        # Set up event handlers
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Set up Socket.IO event handlers"""
        
        @self.sio.event
        def connect():
            self.connected = True
            logger.info(f"✅ Connected to PitBox Server at {self.url}")
        
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
            
        # =========================================================
        # Race Intelligence (Server-Side Spotter)
        # =========================================================
        
        @self.sio.on('overlap_state_changed')
        def on_overlap(data):
            # Check if this involves US
            # Payload: carA, carB, side...
            # We assume the server sends events for ALL cars (simplest broadcast)
            # So we must filter.
            if self._is_involved(data):
                self.policy.handle_event('overlap_state_changed', data)

        @self.sio.on('three_wide_detected')
        def on_three_wide(data):
            if self._is_involved(data, key='cars'):
                self.policy.handle_event('three_wide_detected', data)

        @self.sio.on('offtrack')
        def on_offtrack(data):
            # Maybe relevant even if not us (ahead of us?)
            # For now, just pass to policy, let it decide context logic if implemented
            self.policy.handle_event('offtrack', data)

        @self.sio.on('unsafe_rejoin_risk')
        def on_rejoin(data):
            self.policy.handle_event('unsafe_rejoin_risk', data)
            
        @self.sio.on('local_caution')
        def on_caution(data):
            self.policy.handle_event('local_caution', data)

        @self.sio.on('explanation:generated') # Note server emitted 'explanation:generated'
        def on_explanation(data):
            # Check involvement
            packet = data.get('packet', {})
            cars = packet.get('cars', {})
            p_id = cars.get('primary')
            s_id = cars.get('secondary')
            
            if self.driver_id and (str(p_id) == str(self.driver_id) or str(s_id) == str(self.driver_id)):
                 self.policy.handle_event('explanation_generated', data)

    def _is_involved(self, data: Dict[str, Any], key: str = None) -> bool:
        """Check if our driver_id is in the event data"""
        if not self.driver_id:
            return True # If unknown, maybe process everything? Or nothing? safer to process/log
            
        # Handle 'cars' array (three wide)
        if key == 'cars':
            return self.driver_id in data.get('cars', [])
            
        # Handle 'carA' / 'carB' (overlap)
        return str(data.get('carA')) == str(self.driver_id) or str(data.get('carB')) == str(self.driver_id)
    
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
        """Send telemetry snapshot"""
        try:
            if 'timestamp' not in telemetry:
                 telemetry['timestamp'] = time.time() * 1000
            
            model = TelemetrySnapshot(**telemetry)
            return self.emit('telemetry', model.model_dump())
        except Exception as e:
            # Rate limit this log in production
            logger.error(f"❌ Protocol Violation (Telemetry): {e}")
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
    
    def send_video_frame(self, frame_data: str):
        """
        Send base64 encoded video frame
        Optimize: fire and forget, don't wait for ack to keep latency low
        """
        # We use a specific event for video that the server expects
        if self.connected and self.session_id:
            payload = {
                'sessionId': self.session_id,
                'image': frame_data
            }
            self.sio.emit('video_frame', payload)
            return True
        return False

    def wait(self, seconds: float = 0.1):
        """
        Wait while processing events
        Use this in the main loop to allow receiving events
        """
        self.sio.sleep(seconds)
