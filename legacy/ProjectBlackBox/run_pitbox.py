"""
Main Integration Script - Updated with Settings Manager
Connects all components with in-program configuration
"""

import asyncio
import logging
import os
import sys
import signal
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add paths
sys.path.append('./relay_agent')
sys.path.append('./database')
sys.path.append('./api')

from iracing_sdk_wrapper import iRacingSDKWrapper
from telemetry_streamer import TelemetryStreamer, SessionMonitor
from audio_pipeline import AudioPipeline
from spotter_engine import SpotterEngine
from opponent_tracker import OpponentTracker
from database.manager import DatabaseManager
from settings_manager import SettingsManager

import logging
from logging.handlers import RotatingFileHandler

# Configure logging
log_dir = Path.home() / '.projectpitbox' / 'logs'
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / 'pitbox.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ProjectPitBox:
    """
    Main integration class
    Uses settings manager for all configuration
    """
    
    def __init__(self):
        # Load settings
        self.settings_manager = SettingsManager()
        self.settings = self.settings_manager.settings
        
        # Check if configured
        if not self._is_configured():
            logger.error("❌ ProjectPitBox is not configured!")
            logger.error("Run: python settings_manager.py")
            sys.exit(1)
        
        # Components
        self.sdk = None
        self.streamer = None
        self.monitor = None
        self.audio = None
        self.spotter = None
        self.profiler = None
        self.db = None
        
        self.running = False
        self.current_session_id = None
    
    def _is_configured(self) -> bool:
        """Check if minimum configuration is done"""
        # Check voice API keys
        if not self.settings.voice.openai_api_key:
            logger.error("OpenAI API key not configured")
            return False
        if not self.settings.voice.elevenlabs_api_key:
            logger.error("ElevenLabs API key not configured")
            return False
        
        # Check PTT is configured
        if self.settings.ptt.type == 'joystick' and not self.settings.ptt.joystick_name:
            logger.warning("⚠️ Joystick PTT configured but no device name saved")
        
        return True
    
    async def initialize(self):
        """Initialize all components using settings"""
        logger.info("=" * 70)
        logger.info("🏁 ProjectPitBox - Complete Digital Race Team")
        logger.info("=" * 70)
        
        # Show configuration
        logger.info("\n📋 Configuration:")
        logger.info(f"   PTT: {self.settings.ptt.type}")
        if self.settings.ptt.type == 'keyboard':
            logger.info(f"   Key: {self.settings.ptt.keyboard_key.upper()}")
        else:
            logger.info(f"   Device: {self.settings.ptt.joystick_name}")
            logger.info(f"   Button: {self.settings.ptt.joystick_button}")
        
        # Initialize database
        logger.info("\n📊 Connecting to database...")
        self.db = DatabaseManager(self.settings.database.url)
        self.db.create_tables()
        logger.info("✅ Database connected")
        
        # Initialize iRacing SDK
        logger.info("\n🎮 Connecting to iRacing...")
        self.sdk = iRacingSDKWrapper()
        
        if not self.sdk.connect(timeout=30):
            logger.error("❌ Failed to connect to iRacing")
            logger.error("Make sure iRacing is running and you're in a session")
            return False
        
        logger.info("✅ iRacing connected")
        
        # Create session in database
        session_info = self.sdk.get_session_info()
        if session_info:
            self.current_session_id = self.db.create_session({
                'driver_id': session_info.driver_id,
                'session_type': session_info.session_type,
                'track_name': session_info.track_name,
                'car_name': session_info.car_name,
                'track_temp': 25.0,
                'air_temp': 20.0
            })
            logger.info(f"✅ Session created: {self.current_session_id}")
        
        # Create streamer
        ws_url = f"ws://localhost:8000/ws/telemetry/{self.current_session_id}"
        self.streamer = TelemetryStreamer(self.sdk, ws_url)
        
        # Create session monitor
        self.monitor = SessionMonitor(self.sdk)
        self.monitor.register_callback('lap_complete', self.on_lap_complete)
        
        # Initialize audio pipeline with settings
        logger.info("\n🎙️ Initializing voice interface...")
        self.audio = AudioPipeline(
            self.settings.voice.openai_api_key,
            self.settings.voice.elevenlabs_api_key,
            ptt_type=self.settings.ptt.type,
            ptt_key=self.settings.ptt.keyboard_key,
            joystick_id=self.settings.ptt.joystick_id,
            joystick_button=self.settings.ptt.joystick_button
        )
        await self.audio.start()
        logger.info("✅ Voice interface ready")
        
        # Initialize Spotter
        logger.info("\n👀 Initializing Elite Spotter...")
        self.spotter = SpotterEngine()
        logger.info("✅ Spotter ready")
        
        # Initialize Profiler
        logger.info("\n🧠 Initializing Opponent Profiler...")
        self.profiler = OpponentTracker()
        logger.info("✅ Profiler ready")
        
        logger.info("\n" + "=" * 70)
        logger.info("✅ ProjectPitBox ready!")
        logger.info("=" * 70)
        
        return True
    
    async def on_lap_complete(self, data: dict):
        """Called when lap is completed"""
        lap_number = data['lap']
        logger.info(f"🏁 Lap {lap_number} complete!")
        
        # Get lap telemetry
        lap_telemetry = self.streamer.get_buffered_telemetry(lap=lap_number)
        
        if lap_telemetry:
            # Calculate lap time
            lap_time = lap_telemetry[-1].session_time - lap_telemetry[0].session_time
            
            # Store lap in database
            self.db.create_lap({
                'session_id': self.current_session_id,
                'lap_number': lap_number,
                'lap_time': lap_time,
                'is_valid': True
            })
            
            logger.info(f"✅ Lap {lap_number} stored: {lap_time:.3f}s")
            
            # Voice update
            if self.audio:
                await self.audio.send_proactive_update(
                    f"Lap {lap_number} complete. Time: {lap_time:.1f} seconds.",
                    'engineer'
                )
    
    async def run(self):
        """Main run loop"""
        self.running = True
        
        # Start telemetry streaming
        asyncio.create_task(self.streamer.stream_loop(hz=60))
        
        # Start session monitoring
        asyncio.create_task(self.monitor.monitor_loop())
        
        # Main loop
        try:
            while self.running and self.sdk.is_connected():
                # Get current telemetry
                telemetry = self.sdk.get_telemetry()
                
                if telemetry:
                    # Update audio pipeline context
                    if self.audio:
                        self.audio.update_context({
                            'current_lap': telemetry.lap,
                            'position': 5,
                            'tire_age': telemetry.lap,
                            'fuel_remaining': telemetry.fuel_level
                        })
                        
                    # Run Spotter
                    if self.spotter and self.audio:
                        alerts = self.spotter.update(telemetry, self.sdk.last_session_info)
                        for alert in alerts:
                            logger.info(f"📢 SPOTTER: {alert}")
                            await self.audio.send_proactive_update(alert, 'spotter')
                            
                    # Run Profiler
                    if self.profiler and self.audio:
                        alerts = self.profiler.update(telemetry, self.sdk.last_session_info)
                        for alert in alerts:
                            logger.info(f"🧠 PROFILER: {alert}")
                            await self.audio.send_proactive_update(alert, 'engineer')
                
                await asyncio.sleep(0.05) # Run at ~20Hz for spotter logic
                
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        finally:
            await self.shutdown()
    
    async def shutdown(self):
        """Shutdown all components"""
        logger.info("Shutting down ProjectPitBox...")
        
        self.running = False
        
        if self.streamer:
            self.streamer.stop_streaming()
        
        if self.audio:
            await self.audio.stop()
        
        if self.current_session_id:
            self.db.end_session(self.current_session_id)
        
        if self.sdk:
            self.sdk.disconnect()
        
        logger.info("✅ Shutdown complete")


async def main():
    """Main entry point"""
    # Check if settings exist
    settings_file = Path.home() / '.projectpitbox' / 'settings.json'
    
    if not settings_file.exists():
        print("\n" + "=" * 70)
        print("🏁 Welcome to ProjectPitBox!")
        print("=" * 70)
        print("\nFirst time setup required.")
        print("\nRun: python settings_manager.py")
        print("\nThen run this script again.")
        print("=" * 70)
        return
    
    # Create and initialize
    pitbox = ProjectPitBox()
    
    if not await pitbox.initialize():
        logger.error("Failed to initialize ProjectPitBox")
        return
    
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        pitbox.running = False
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Run
    await pitbox.run()


if __name__ == '__main__':
    asyncio.run(main())
