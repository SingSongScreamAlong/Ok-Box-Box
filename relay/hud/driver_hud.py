"""
Driver HUD Overlay
Displays engineer voice messages, coaching insights, and race info as an overlay
"""

import asyncio
import logging
import tkinter as tk
from tkinter import ttk
from typing import Optional, Dict, List
from dataclasses import dataclass, field
from datetime import datetime
import threading
import queue

logger = logging.getLogger('DriverHUD')


@dataclass
class HUDMessage:
    """Message to display on the HUD"""
    id: str
    text: str
    type: str  # 'voice', 'coaching', 'strategy', 'warning'
    priority: int  # 1=low, 2=medium, 3=high, 4=critical
    timestamp: datetime = field(default_factory=datetime.now)
    duration: float = 5.0  # seconds to display
    

class DriverHUD:
    """
    Transparent overlay HUD for the driver
    Shows engineer messages, coaching tips, and race info
    """
    
    def __init__(self):
        self.root: Optional[tk.Tk] = None
        self.message_queue: queue.Queue = queue.Queue()
        self.active_messages: List[HUDMessage] = []
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        
        # HUD settings
        self.opacity = 0.85
        self.position = 'top-right'  # top-left, top-right, bottom-left, bottom-right, center
        self.width = 400
        self.max_messages = 3
        
        # Colors by message type
        self.colors = {
            'voice': '#3B82F6',      # Blue
            'coaching': '#10B981',   # Green
            'strategy': '#F59E0B',   # Amber
            'warning': '#EF4444',    # Red
            'info': '#6B7280',       # Gray
        }
        
    def start(self):
        """Start the HUD in a separate thread"""
        if self.is_running:
            return
            
        self.is_running = True
        self._thread = threading.Thread(target=self._run_hud, daemon=True)
        self._thread.start()
        logger.info("Driver HUD started")
        
    def stop(self):
        """Stop the HUD"""
        self.is_running = False
        if self.root:
            self.root.quit()
        logger.info("Driver HUD stopped")
        
    def show_message(self, message: HUDMessage):
        """Queue a message to display"""
        self.message_queue.put(message)
        
    def show_voice_message(self, from_user: str, duration_ms: int):
        """Show that an engineer voice message is playing"""
        msg = HUDMessage(
            id=f"voice_{datetime.now().timestamp()}",
            text=f"🎙️ {from_user} is speaking...",
            type='voice',
            priority=3,
            duration=duration_ms / 1000 + 1,
        )
        self.show_message(msg)
        
    def show_coaching_insight(self, insight: str, priority: int = 2):
        """Show a coaching insight"""
        msg = HUDMessage(
            id=f"coaching_{datetime.now().timestamp()}",
            text=f"💡 {insight}",
            type='coaching',
            priority=priority,
            duration=6.0,
        )
        self.show_message(msg)
        
    def show_strategy_update(self, strategy: str):
        """Show a strategy update"""
        msg = HUDMessage(
            id=f"strategy_{datetime.now().timestamp()}",
            text=f"📊 {strategy}",
            type='strategy',
            priority=2,
            duration=8.0,
        )
        self.show_message(msg)
        
    def show_warning(self, warning: str):
        """Show a warning message"""
        msg = HUDMessage(
            id=f"warning_{datetime.now().timestamp()}",
            text=f"⚠️ {warning}",
            type='warning',
            priority=4,
            duration=10.0,
        )
        self.show_message(msg)
        
    def _run_hud(self):
        """Main HUD loop (runs in separate thread)"""
        try:
            self.root = tk.Tk()
            self.root.title("Driver HUD")
            
            # Make window transparent and always on top
            self.root.attributes('-topmost', True)
            self.root.attributes('-alpha', self.opacity)
            self.root.overrideredirect(True)  # Remove window decorations
            
            # Set window size and position
            screen_width = self.root.winfo_screenwidth()
            screen_height = self.root.winfo_screenheight()
            
            x, y = self._calculate_position(screen_width, screen_height)
            self.root.geometry(f"{self.width}x300+{x}+{y}")
            
            # Dark background
            self.root.configure(bg='#1a1a1a')
            
            # Message container
            self.message_frame = tk.Frame(self.root, bg='#1a1a1a')
            self.message_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
            
            # Start update loop
            self._update_loop()
            
            self.root.mainloop()
        except Exception as e:
            logger.error(f"HUD error: {e}")
        finally:
            self.is_running = False
            
    def _calculate_position(self, screen_width: int, screen_height: int) -> tuple:
        """Calculate window position based on setting"""
        margin = 20
        
        if self.position == 'top-right':
            return (screen_width - self.width - margin, margin)
        elif self.position == 'top-left':
            return (margin, margin)
        elif self.position == 'bottom-right':
            return (screen_width - self.width - margin, screen_height - 320)
        elif self.position == 'bottom-left':
            return (margin, screen_height - 320)
        else:  # center
            return ((screen_width - self.width) // 2, margin)
            
    def _update_loop(self):
        """Update the HUD display"""
        if not self.is_running:
            return
            
        # Process new messages from queue
        while not self.message_queue.empty():
            try:
                msg = self.message_queue.get_nowait()
                self.active_messages.append(msg)
                # Keep only max_messages
                if len(self.active_messages) > self.max_messages:
                    self.active_messages = self.active_messages[-self.max_messages:]
            except queue.Empty:
                break
                
        # Remove expired messages
        now = datetime.now()
        self.active_messages = [
            m for m in self.active_messages
            if (now - m.timestamp).total_seconds() < m.duration
        ]
        
        # Clear and redraw messages
        for widget in self.message_frame.winfo_children():
            widget.destroy()
            
        for msg in self.active_messages:
            self._draw_message(msg)
            
        # Schedule next update
        if self.root:
            self.root.after(100, self._update_loop)
            
    def _draw_message(self, msg: HUDMessage):
        """Draw a single message"""
        color = self.colors.get(msg.type, self.colors['info'])
        
        # Message container
        frame = tk.Frame(
            self.message_frame,
            bg=color,
            padx=2,
            pady=2,
        )
        frame.pack(fill=tk.X, pady=3)
        
        # Inner frame with dark background
        inner = tk.Frame(frame, bg='#2a2a2a', padx=10, pady=8)
        inner.pack(fill=tk.X)
        
        # Message text
        label = tk.Label(
            inner,
            text=msg.text,
            font=('Segoe UI', 11, 'bold'),
            fg='white',
            bg='#2a2a2a',
            wraplength=self.width - 40,
            justify=tk.LEFT,
        )
        label.pack(anchor=tk.W)
        
        # Time remaining indicator
        elapsed = (datetime.now() - msg.timestamp).total_seconds()
        remaining = max(0, msg.duration - elapsed)
        progress = remaining / msg.duration
        
        progress_frame = tk.Frame(inner, bg='#2a2a2a', height=3)
        progress_frame.pack(fill=tk.X, pady=(5, 0))
        
        progress_bar = tk.Frame(
            progress_frame,
            bg=color,
            height=3,
            width=int((self.width - 60) * progress),
        )
        progress_bar.pack(anchor=tk.W)


# Global instance
driver_hud = DriverHUD()


def setup_hud_handlers(sio):
    """Setup socket event handlers for HUD messages"""
    
    @sio.on('engineer:voice:start', namespace='/relay')
    async def on_voice_start(data):
        from_user = data.get('from', 'Engineer')
        driver_hud.show_voice_message(from_user, 5000)
        
    @sio.on('engineer:voice:end', namespace='/relay')
    async def on_voice_end(data):
        duration = data.get('duration', 0)
        from_user = data.get('from', 'Engineer')
        # Update the voice message with actual duration
        driver_hud.show_voice_message(from_user, duration)
        
    @sio.on('coaching:insight', namespace='/relay')
    async def on_coaching_insight(data):
        insight = data.get('message', '')
        priority = data.get('priority', 2)
        if insight:
            driver_hud.show_coaching_insight(insight, priority)
            
    @sio.on('strategy:alert', namespace='/relay')
    async def on_strategy_alert(data):
        strategy = data.get('message', '')
        if strategy:
            driver_hud.show_strategy_update(strategy)
            
    @sio.on('warning', namespace='/relay')
    async def on_warning(data):
        warning = data.get('message', '')
        if warning:
            driver_hud.show_warning(warning)
            
    logger.info("HUD handlers registered")


if __name__ == '__main__':
    # Test the HUD
    logging.basicConfig(level=logging.DEBUG)
    
    hud = DriverHUD()
    hud.start()
    
    import time
    time.sleep(1)
    
    hud.show_voice_message("Race Engineer", 3000)
    time.sleep(2)
    
    hud.show_coaching_insight("Brake 10m later into Turn 3")
    time.sleep(2)
    
    hud.show_strategy_update("Box this lap - switching to Mediums")
    time.sleep(2)
    
    hud.show_warning("Yellow flag in Sector 2")
    
    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        hud.stop()
