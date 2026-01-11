#!/usr/bin/env python3
"""
iRacing Window Capture Service
Auto-detects and captures the iRacing window for streaming to team dashboard.
"""

import os
import sys
import time
import asyncio
import logging
import threading
from typing import Optional, Callable, Tuple
from dataclasses import dataclass
from enum import Enum

# Platform-specific imports
if sys.platform == 'win32':
    import ctypes
    from ctypes import wintypes
    import win32gui
    import win32ui
    import win32con
    import win32api
    from PIL import Image
    import numpy as np
    HAS_WIN32 = True
else:
    HAS_WIN32 = False

logger = logging.getLogger('window_capture')


class CaptureMethod(Enum):
    """Available capture methods."""
    BITBLT = 'bitblt'           # Standard GDI capture
    PRINTWINDOW = 'printwindow'  # Works with some overlays
    DXGI = 'dxgi'               # DirectX capture (fastest)


@dataclass
class CaptureConfig:
    """Configuration for window capture."""
    target_fps: int = 30
    quality: int = 85  # JPEG quality
    scale: float = 1.0  # Downscale factor (0.5 = half resolution)
    method: CaptureMethod = CaptureMethod.BITBLT


@dataclass
class FrameData:
    """Captured frame data."""
    data: bytes
    width: int
    height: int
    timestamp: float
    format: str = 'jpeg'


class IRacingWindowCapture:
    """
    Captures the iRacing window and streams frames.
    """
    
    # Known iRacing window class names and titles
    IRACING_WINDOW_CLASSES = [
        'SimWinClass',      # Main iRacing window
        'iRacingSim',       # Alternative class
    ]
    
    IRACING_WINDOW_TITLES = [
        'iRacing.com Simulator',
        'iRacing',
    ]
    
    def __init__(self, config: Optional[CaptureConfig] = None):
        self.config = config or CaptureConfig()
        self.hwnd: Optional[int] = None
        self.window_title: str = ''
        self.window_rect: Tuple[int, int, int, int] = (0, 0, 0, 0)
        self.capturing = False
        self.frame_callback: Optional[Callable[[FrameData], None]] = None
        self._capture_thread: Optional[threading.Thread] = None
        self._last_frame_time = 0.0
        
        if not HAS_WIN32:
            logger.warning("Win32 libraries not available. Window capture disabled.")
    
    def find_iracing_window(self) -> bool:
        """
        Find the iRacing window handle.
        Returns True if found.
        """
        if not HAS_WIN32:
            return False
        
        def enum_callback(hwnd, results):
            if not win32gui.IsWindowVisible(hwnd):
                return True
            
            # Check window class
            try:
                class_name = win32gui.GetClassName(hwnd)
                if class_name in self.IRACING_WINDOW_CLASSES:
                    results.append((hwnd, win32gui.GetWindowText(hwnd), class_name))
                    return True
            except:
                pass
            
            # Check window title
            try:
                title = win32gui.GetWindowText(hwnd)
                for iracing_title in self.IRACING_WINDOW_TITLES:
                    if iracing_title.lower() in title.lower():
                        results.append((hwnd, title, win32gui.GetClassName(hwnd)))
                        return True
            except:
                pass
            
            return True
        
        results = []
        win32gui.EnumWindows(enum_callback, results)
        
        if results:
            self.hwnd, self.window_title, class_name = results[0]
            self._update_window_rect()
            logger.info(f"Found iRacing window: '{self.window_title}' (class: {class_name}, hwnd: {self.hwnd})")
            return True
        
        self.hwnd = None
        return False
    
    def _update_window_rect(self) -> bool:
        """Update the window rectangle."""
        if not self.hwnd or not HAS_WIN32:
            return False
        
        try:
            rect = win32gui.GetWindowRect(self.hwnd)
            self.window_rect = rect
            return True
        except Exception as e:
            logger.error(f"Failed to get window rect: {e}")
            return False
    
    def get_window_size(self) -> Tuple[int, int]:
        """Get the current window size."""
        if not self.window_rect:
            return (0, 0)
        left, top, right, bottom = self.window_rect
        return (right - left, bottom - top)
    
    def capture_frame(self) -> Optional[FrameData]:
        """
        Capture a single frame from the iRacing window.
        Returns FrameData or None if capture failed.
        """
        if not HAS_WIN32 or not self.hwnd:
            return None
        
        try:
            # Update window rect in case it moved/resized
            if not self._update_window_rect():
                return None
            
            left, top, right, bottom = self.window_rect
            width = right - left
            height = bottom - top
            
            if width <= 0 or height <= 0:
                return None
            
            # Apply scaling
            scaled_width = int(width * self.config.scale)
            scaled_height = int(height * self.config.scale)
            
            # Create device contexts
            hwnd_dc = win32gui.GetWindowDC(self.hwnd)
            mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
            save_dc = mfc_dc.CreateCompatibleDC()
            
            # Create bitmap
            bitmap = win32ui.CreateBitmap()
            bitmap.CreateCompatibleBitmap(mfc_dc, width, height)
            save_dc.SelectObject(bitmap)
            
            # Capture using selected method
            if self.config.method == CaptureMethod.PRINTWINDOW:
                # PrintWindow can capture some overlays
                ctypes.windll.user32.PrintWindow(self.hwnd, save_dc.GetSafeHdc(), 2)
            else:
                # BitBlt - standard capture
                save_dc.BitBlt((0, 0), (width, height), mfc_dc, (0, 0), win32con.SRCCOPY)
            
            # Convert to PIL Image
            bmp_info = bitmap.GetInfo()
            bmp_bits = bitmap.GetBitmapBits(True)
            
            img = Image.frombuffer(
                'RGB',
                (bmp_info['bmWidth'], bmp_info['bmHeight']),
                bmp_bits, 'raw', 'BGRX', 0, 1
            )
            
            # Scale if needed - use BILINEAR for speed at high FPS
            if self.config.scale != 1.0:
                img = img.resize((scaled_width, scaled_height), Image.BILINEAR)
            
            # Convert to JPEG bytes with optimized settings for streaming
            import io
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=self.config.quality, optimize=False, subsampling=2)
            jpeg_data = buffer.getvalue()
            
            # Cleanup
            win32gui.DeleteObject(bitmap.GetHandle())
            save_dc.DeleteDC()
            mfc_dc.DeleteDC()
            win32gui.ReleaseDC(self.hwnd, hwnd_dc)
            
            return FrameData(
                data=jpeg_data,
                width=scaled_width,
                height=scaled_height,
                timestamp=time.time(),
                format='jpeg'
            )
            
        except Exception as e:
            logger.error(f"Frame capture failed: {e}")
            return None
    
    def start_capture(self, callback: Callable[[FrameData], None]) -> bool:
        """
        Start continuous capture in a background thread.
        Callback is called with each captured frame.
        """
        if self.capturing:
            logger.warning("Capture already running")
            return False
        
        if not self.find_iracing_window():
            logger.error("iRacing window not found")
            return False
        
        self.frame_callback = callback
        self.capturing = True
        self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._capture_thread.start()
        
        logger.info(f"Started capturing at {self.config.target_fps} FPS")
        return True
    
    def stop_capture(self):
        """Stop the capture thread."""
        self.capturing = False
        if self._capture_thread:
            self._capture_thread.join(timeout=2.0)
            self._capture_thread = None
        logger.info("Capture stopped")
    
    def _capture_loop(self):
        """Background capture loop."""
        frame_interval = 1.0 / self.config.target_fps
        
        while self.capturing:
            loop_start = time.time()
            
            # Check if window still exists
            if not win32gui.IsWindow(self.hwnd):
                logger.warning("iRacing window closed, searching...")
                if not self.find_iracing_window():
                    time.sleep(1.0)
                    continue
            
            # Capture frame
            frame = self.capture_frame()
            if frame and self.frame_callback:
                try:
                    self.frame_callback(frame)
                except Exception as e:
                    logger.error(f"Frame callback error: {e}")
            
            # Maintain target FPS
            elapsed = time.time() - loop_start
            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)
    
    def is_window_available(self) -> bool:
        """Check if the iRacing window is currently available."""
        if not self.hwnd:
            return self.find_iracing_window()
        return HAS_WIN32 and win32gui.IsWindow(self.hwnd)


class VideoStreamServer:
    """
    WebSocket server for streaming captured frames to team dashboard.
    Integrates with the relay agent's Socket.IO connection.
    """
    
    def __init__(self, capture: IRacingWindowCapture):
        self.capture = capture
        self.sio = None  # Will be set by relay agent
        self.streaming = False
        self.frame_count = 0
        self.start_time = 0.0
    
    def set_socket(self, sio):
        """Set the Socket.IO client from relay agent."""
        self.sio = sio
    
    async def start_streaming(self) -> bool:
        """Start streaming frames via Socket.IO."""
        if not self.sio:
            logger.error("Socket.IO not configured")
            return False
        
        if self.streaming:
            return True
        
        def on_frame(frame: FrameData):
            self.frame_count += 1
            
            # Emit frame via Socket.IO
            if self.sio and self.sio.connected:
                import base64
                asyncio.run_coroutine_threadsafe(
                    self.sio.emit('relay:video:frame', {
                        'data': base64.b64encode(frame.data).decode('utf-8'),
                        'width': frame.width,
                        'height': frame.height,
                        'timestamp': frame.timestamp,
                        'format': frame.format,
                        'frameNumber': self.frame_count,
                    }),
                    asyncio.get_event_loop()
                )
        
        if self.capture.start_capture(on_frame):
            self.streaming = True
            self.start_time = time.time()
            self.frame_count = 0
            logger.info("Video streaming started")
            return True
        
        return False
    
    def stop_streaming(self):
        """Stop streaming."""
        self.capture.stop_capture()
        self.streaming = False
        
        if self.frame_count > 0:
            duration = time.time() - self.start_time
            avg_fps = self.frame_count / duration if duration > 0 else 0
            logger.info(f"Video streaming stopped. {self.frame_count} frames, avg {avg_fps:.1f} FPS")
    
    def get_stats(self) -> dict:
        """Get streaming statistics."""
        duration = time.time() - self.start_time if self.streaming else 0
        return {
            'streaming': self.streaming,
            'frameCount': self.frame_count,
            'duration': duration,
            'avgFps': self.frame_count / duration if duration > 0 else 0,
            'windowAvailable': self.capture.is_window_available(),
            'windowSize': self.capture.get_window_size(),
        }


# Singleton instance
_capture_instance: Optional[IRacingWindowCapture] = None
_stream_server: Optional[VideoStreamServer] = None


def get_capture() -> IRacingWindowCapture:
    """Get the singleton capture instance."""
    global _capture_instance
    if _capture_instance is None:
        _capture_instance = IRacingWindowCapture()
    return _capture_instance


def get_stream_server() -> VideoStreamServer:
    """Get the singleton stream server instance."""
    global _stream_server
    if _stream_server is None:
        _stream_server = VideoStreamServer(get_capture())
    return _stream_server


# CLI for testing
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    capture = IRacingWindowCapture(CaptureConfig(
        target_fps=15,
        quality=75,
        scale=0.5,
    ))
    
    if capture.find_iracing_window():
        print(f"Found: {capture.window_title}")
        print(f"Size: {capture.get_window_size()}")
        
        # Test single frame capture
        frame = capture.capture_frame()
        if frame:
            print(f"Captured frame: {frame.width}x{frame.height}, {len(frame.data)} bytes")
            
            # Save test frame
            with open('test_frame.jpg', 'wb') as f:
                f.write(frame.data)
            print("Saved test_frame.jpg")
    else:
        print("iRacing window not found. Is iRacing running?")
