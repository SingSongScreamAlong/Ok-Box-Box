"""
PitBox Relay Agent - Audio Pipeline
Handles Audio Rec -> Whisper Transcribe -> AI Agent -> TTS
"""
import logging
import time
import asyncio
import threading
import io
import requests
import json
import base64

# Audio deps
try:
    import pyaudio
    import wave
import config
except ImportError:
    pyaudio = None

try:
    import sounddevice as sd
    import soundfile as sf
except ImportError:
    pass

try:
    import numpy as np
except ImportError:
    np = None

from voice_recognition import VoiceRecognition
import config

logger = logging.getLogger(__name__)

class AudioPipeline:
    """
    Manages the full audio lifecycle for the driver
    """
    def __init__(self, openai_key, elevenlabs_key, ptt_type='keyboard', ptt_key='space', joystick_id=0, joystick_button=0):
        self.openai_key = openai_key
        self.elevenlabs_key = elevenlabs_key
        
        # PTT Handler
        self.vr = VoiceRecognition(ptt_type, ptt_key, joystick_id, joystick_button)
        
        # Audio settings
        self.format = pyaudio.paInt16 if pyaudio else 8
        self.channels = 1
        self.rate = 16000
        self.chunk = 1024
        
        self.audio = pyaudio.PyAudio() if pyaudio else None
        self.recording = False
        self.frames = []
        
        self.running = False
        self.thread = None
        
        # Context for AI
        self.driver_context = {}
        
        # Endpoint for AI Agent
        self.ai_agent_url = config.AI_AGENT_URL
        
    async def start(self):
        """Start the audio pipeline listener"""
        if not self.audio:
            logger.error("PyAudio not available. Voice features disabled.")
            return

        self.running = True
        self.thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.thread.start()
        logger.info("🎙️ Audio Pipeline started")

    async def stop(self):
        """Stop the audio pipeline"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        if self.audio:
            self.audio.terminate()

    def update_context(self, context_data):
        """Update telemetry context for the next query"""
        self.driver_context = context_data

    def _listen_loop(self):
        """Main loop monitoring PTT"""
        logging.info("Waiting for PTT...")
        
        was_pressed = False
        stream = None
        
        while self.running:
            is_pressed = self.vr.is_pressed()
            
            if is_pressed and not was_pressed:
                # Start recording
                logger.info("🎤 Listening...")
                self.recording = True
                self.frames = []
                try:
                    stream = self.audio.open(format=self.format,
                                           channels=self.channels,
                                           rate=self.rate,
                                           input=True,
                                           frames_per_buffer=self.chunk)
                except Exception as e:
                    logger.error(f"Failed to open audio stream: {e}")
                    self.recording = False
            
            elif is_pressed and self.recording:
                # Continue recording
                if stream:
                    try:
                        data = stream.read(self.chunk, exception_on_overflow=False)
                        self.frames.append(data)
                    except Exception:
                        pass
                        
            elif not is_pressed and was_pressed and self.recording:
                # Stop recording and process
                logger.info("Processing voice command...")
                self.recording = False
                if stream:
                    stream.stop_stream()
                    stream.close()
                    stream = None
                
                # Check minimum length
                if len(self.frames) > 10: # Avoid tiny clicks
                    self._process_recording(self.frames)
                else:
                    logger.debug("Recording too short, ignored")
                
                self.frames = []

            was_pressed = is_pressed
            time.sleep(0.01)

    def _process_recording(self, frames):
        """Handle the recorded audio data"""
        # Save to wav buffer
        wav_buffer = io.BytesIO()
        wf = wave.open(wav_buffer, 'wb')
        wf.setnchannels(self.channels)
        wf.setsampwidth(self.audio.get_sample_size(self.format))
        wf.setframerate(self.rate)
        wf.writeframes(b''.join(frames))
        wf.close()
        wav_buffer.seek(0)
        
        # 1. Transcribe (Whisper)
        text = self._transcribe(wav_buffer)
        if not text:
            return
            
        logger.info(f"🗣️ Driver: {text}")
        
        # 2. Get AI Response
        response_text, audio_b64 = self._query_ai_agent(text)
        
        if response_text:
            logger.info(f"🤖 Engineer: {response_text}")
            
        # 3. Play Audio
        if audio_b64:
            self._play_audio_b64(audio_b64)

    def _transcribe(self, audio_file):
        """Transcribe audio using OpenAI API directly (or via local if preferred)"""
        # For simplicity/speed, using OpenAI API directly here
        # or we could send audio blob to ai_agent if it supported it.
        # Let's use OpenAI API locally for transcription as per run_pitbox structure
        
        if not self.openai_key:
            return None
            
        try:
            files = {
                'file': ('audio.wav', audio_file.read(), 'audio/wav'),
                'model': (None, 'whisper-1')
            }
            headers = {'Authorization': f'Bearer {self.openai_key}'}
            
            resp = requests.post('https://api.openai.com/v1/audio/transcriptions', 
                               headers=headers, 
                               files=files,
                               timeout=10)
            
            if resp.status_code == 200:
                return resp.json().get('text')
            else:
                logger.error(f"Whisper error: {resp.text}")
                return None
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return None

    def _query_ai_agent(self, text):
        """Send text to AI Agent service"""
        try:
            payload = {
                "telemetry": self.driver_context,
                "analysisType": "driverCoach", # Contextual?
                "userMessage": text, # Need to update ai_agent to handle explicit user queries logic
                "includeVoice": True
            }
            
            # Note: ai_agent current implementation focuses on telemetry analysis. 
            # We might need to adjust it or mock the interaction.
            # For now, let's treat this as a "Coaching Request"
            
            resp = requests.post(
                f"{self.ai_agent_url}/coach",
                json=payload,
                headers={"x-api-key": config.RELAY_ID}, # Re-using RELAY_ID as mock key or read from config
                timeout=15
            )
            
            if resp.status_code == 200:
                data = resp.json()
                return data.get('coaching'), data.get('audio') # Expecting base64 audio
            else:
                logger.error(f"AI Agent error: {resp.text}")
                return None, None
                
        except Exception as e:
            logger.error(f"AI Query failed: {e}")
            return None, None

    def _play_audio_b64(self, audio_data):
        """Play base64 encoded audio"""
        try:
            audio_bytes = base64.b64decode(audio_data)
            audio_buffer = io.BytesIO(audio_bytes)
            
            data, fs = sf.read(audio_buffer)
            sd.play(data, fs)
            sd.wait()
        except Exception as e:
            logger.error(f"Playback error: {e}")

    async def send_proactive_update(self, text, role='engineer'):
        """Allow other systems to trigger speech (Spotter/Profiler)"""
        logger.info(f"📢 Proactive ({role}): {text}")
        # We need a way to just generate TTS without analysis
        # For now, just log it. Real implementation would call TTS endpoint.
        pass
