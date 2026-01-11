"""
Voice Playback Module for Relay Agent
Handles receiving and playing engineer voice messages to the driver
"""

import asyncio
import io
import logging
import tempfile
import threading
from typing import Optional, Dict, List
from dataclasses import dataclass, field

logger = logging.getLogger('VoicePlayback')

# Try to import audio libraries
try:
    import sounddevice as sd
    import soundfile as sf
    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False
    logger.warning("sounddevice/soundfile not installed - voice playback disabled")


@dataclass
class VoiceMessage:
    """Represents an incoming voice message"""
    message_id: str
    from_user: str
    timestamp: int
    chunks: List[bytes] = field(default_factory=list)
    duration: int = 0
    is_complete: bool = False


class VoicePlaybackService:
    """Service for receiving and playing engineer voice messages"""
    
    def __init__(self):
        self.active_messages: Dict[str, VoiceMessage] = {}
        self.playback_queue: asyncio.Queue = asyncio.Queue()
        self.is_playing = False
        self.output_device: Optional[int] = None
        self.volume = 1.0
        self._playback_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the voice playback service"""
        if not AUDIO_AVAILABLE:
            logger.warning("Voice playback not available - missing audio libraries")
            return
            
        # Start playback worker
        self._playback_task = asyncio.create_task(self._playback_worker())
        logger.info("Voice playback service started")
        
    async def stop(self):
        """Stop the voice playback service"""
        if self._playback_task:
            self._playback_task.cancel()
            try:
                await self._playback_task
            except asyncio.CancelledError:
                pass
        logger.info("Voice playback service stopped")
        
    def on_voice_start(self, data: dict):
        """Handle engineer:voice:start event"""
        message_id = data.get('messageId')
        from_user = data.get('from', 'Engineer')
        timestamp = data.get('timestamp', 0)
        
        logger.info(f"Voice message starting: {message_id} from {from_user}")
        
        self.active_messages[message_id] = VoiceMessage(
            message_id=message_id,
            from_user=from_user,
            timestamp=timestamp,
        )
        
    def on_voice_chunk(self, data: dict):
        """Handle engineer:voice:chunk event"""
        message_id = data.get('messageId')
        chunk = data.get('chunk')
        
        if message_id not in self.active_messages:
            logger.warning(f"Received chunk for unknown message: {message_id}")
            return
            
        message = self.active_messages[message_id]
        
        # Convert chunk to bytes if needed
        if isinstance(chunk, (bytes, bytearray)):
            message.chunks.append(bytes(chunk))
        elif isinstance(chunk, list):
            message.chunks.append(bytes(chunk))
        else:
            logger.warning(f"Unknown chunk type: {type(chunk)}")
            
    def on_voice_end(self, data: dict):
        """Handle engineer:voice:end event"""
        message_id = data.get('messageId')
        duration = data.get('duration', 0)
        
        if message_id not in self.active_messages:
            logger.warning(f"Received end for unknown message: {message_id}")
            return
            
        message = self.active_messages[message_id]
        message.duration = duration
        message.is_complete = True
        
        logger.info(f"Voice message complete: {message_id}, duration: {duration}ms, chunks: {len(message.chunks)}")
        
        # Queue for playback
        asyncio.create_task(self._queue_for_playback(message))
        
    async def _queue_for_playback(self, message: VoiceMessage):
        """Queue a complete message for playback"""
        await self.playback_queue.put(message)
        
        # Clean up from active messages
        if message.message_id in self.active_messages:
            del self.active_messages[message.message_id]
            
    async def _playback_worker(self):
        """Worker that plays queued voice messages"""
        while True:
            try:
                message = await self.playback_queue.get()
                await self._play_message(message)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Playback error: {e}")
                
    async def _play_message(self, message: VoiceMessage):
        """Play a voice message through speakers"""
        if not AUDIO_AVAILABLE or not message.chunks:
            logger.warning("Cannot play message - no audio support or empty message")
            return
            
        self.is_playing = True
        logger.info(f"Playing voice message from {message.from_user}")
        
        try:
            # Combine all chunks into single audio data
            audio_data = b''.join(message.chunks)
            
            # Write to temp file and play
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as f:
                f.write(audio_data)
                temp_path = f.name
                
            # Try to play the audio
            try:
                data, samplerate = sf.read(temp_path)
                sd.play(data * self.volume, samplerate, device=self.output_device)
                sd.wait()
            except Exception as e:
                logger.error(f"Failed to play audio: {e}")
                # Fallback: just log that we would have played it
                logger.info(f"[VOICE] Engineer says: (audio message, {message.duration}ms)")
                
        except Exception as e:
            logger.error(f"Error processing voice message: {e}")
        finally:
            self.is_playing = False
            
    def set_volume(self, volume: float):
        """Set playback volume (0.0 to 1.0)"""
        self.volume = max(0.0, min(1.0, volume))
        
    def set_output_device(self, device_id: Optional[int]):
        """Set output audio device"""
        self.output_device = device_id
        
    def get_available_devices(self) -> list:
        """Get list of available audio output devices"""
        if not AUDIO_AVAILABLE:
            return []
        try:
            devices = sd.query_devices()
            return [
                {'id': i, 'name': d['name'], 'channels': d['max_output_channels']}
                for i, d in enumerate(devices)
                if d['max_output_channels'] > 0
            ]
        except Exception as e:
            logger.error(f"Failed to query audio devices: {e}")
            return []


# Global instance
voice_playback = VoicePlaybackService()


def setup_voice_handlers(sio):
    """Setup socket event handlers for voice messages"""
    
    @sio.on('engineer:voice:start', namespace='/relay')
    async def on_voice_start(data):
        voice_playback.on_voice_start(data)
        
    @sio.on('engineer:voice:chunk', namespace='/relay')
    async def on_voice_chunk(data):
        voice_playback.on_voice_chunk(data)
        
    @sio.on('engineer:voice:end', namespace='/relay')
    async def on_voice_end(data):
        voice_playback.on_voice_end(data)
        # Send acknowledgment back
        await sio.emit('voice:ack', {
            'messageId': data.get('messageId'),
            'status': 'received'
        }, namespace='/relay')
        
    logger.info("Voice handlers registered")
