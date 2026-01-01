"""
PitBox Relay Agent - Video Encoder
Captures and streams SCREEN video frames to PitBox Server
"""
import base64
import logging
import time
import threading
import cv2
import numpy as np

try:
    import mss
    MSS_AVAILABLE = True
except ImportError:
    MSS_AVAILABLE = False

import config

logger = logging.getLogger(__name__)

class VideoEncoder:
    """
    Captures SCREEN video and streams compressed frames to dashboard.
    Uses mss for fast screen capture.
    """
    
    def __init__(self, client):
        self.client = client
        self.running = False
        self.thread = None
        self.sct = None
        
        # Stats
        self.frames_sent = 0
        self.start_time = 0
        
        # Settings
        self.width = 854   # 480p widescreen
        self.height = 480
        self.quality = 70  # JPEG quality (lower = smaller files)
        self.fps = 15
        self.monitor_index = 1  # Primary monitor (1-indexed in mss)
        
    def start(self):
        """Start screen capture thread"""
        if self.running:
            return
        
        if not MSS_AVAILABLE:
            logger.error("❌ mss not installed. Run: pip install mss")
            return
            
        logger.info("🎥 Starting Screen Capture...")
        self.running = True
        self.start_time = time.time()
        
        # Start capture thread
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        
    def stop(self):
        """Stop screen capture"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            
        logger.info(f"Screen Capture stopped. Frames sent: {self.frames_sent}")

    def _capture_loop(self):
        """Main capture loop - captures primary monitor"""
        frame_interval = 1.0 / self.fps
        last_frame_time = 0
        
        with mss.mss() as sct:
            # Get monitor info (monitor 1 = primary, 0 = all monitors combined)
            monitor = sct.monitors[self.monitor_index]
            logger.info(f"✅ Capturing monitor {self.monitor_index}: {monitor['width']}x{monitor['height']}")
            
            while self.running:
                # Rate limiting
                now = time.time()
                if now - last_frame_time < frame_interval:
                    time.sleep(0.005)
                    continue
                
                last_frame_time = now
                
                try:
                    # Capture screen
                    screenshot = sct.grab(monitor)
                    
                    # Convert to numpy array (BGRA format)
                    frame = np.array(screenshot)
                    
                    # Convert BGRA to BGR (remove alpha channel)
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
                    
                    # Resize for bandwidth efficiency
                    frame = cv2.resize(frame, (self.width, self.height))
                    
                    # Encode to JPEG
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), self.quality]
                    _, buffer = cv2.imencode('.jpg', frame, encode_param)
                    
                    # Convert to base64 string
                    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                    
                    # Send via client
                    if self.client.send_video_frame(jpg_as_text):
                        self.frames_sent += 1
                        
                except Exception as e:
                    logger.error(f"Screen capture error: {e}")
                    time.sleep(0.5)

