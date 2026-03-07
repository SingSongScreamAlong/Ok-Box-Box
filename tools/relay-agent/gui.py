#!/usr/bin/env python3
"""
Ok, Box Box Relay - Python GUI
Matches the Electron desktop app design
"""
import sys
import os
import subprocess
import threading
import queue
import time
import customtkinter as ctk
from PIL import Image, ImageTk
import signal

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from settings_manager import SettingsManager

# Colors matching Electron app
COLORS = {
    'bg_dark': '#0a0a0f',
    'bg_card': '#12121a',
    'bg_card_hover': '#1a1a25',
    'accent': '#e63946',
    'accent_hover': '#ff4d5a',
    'success': '#00d26a',
    'warning': '#ffc107',
    'text': '#ffffff',
    'text_muted': '#8b8b9a',
    'border': '#2a2a3a',
}

# Theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class StatusCard(ctk.CTkFrame):
    """Status indicator card matching Electron design"""
    def __init__(self, master, label: str, **kwargs):
        super().__init__(master, fg_color=COLORS['bg_card'], corner_radius=12, **kwargs)
        
        self.grid_columnconfigure(1, weight=1)
        
        # Status dot
        self.dot_frame = ctk.CTkFrame(self, width=12, height=12, corner_radius=6, fg_color=COLORS['text_muted'])
        self.dot_frame.grid(row=0, column=0, padx=(16, 12), pady=16)
        
        # Labels
        label_frame = ctk.CTkFrame(self, fg_color="transparent")
        label_frame.grid(row=0, column=1, sticky="w", pady=16)
        
        self.lbl_title = ctk.CTkLabel(label_frame, text=label.upper(), font=("Segoe UI", 11), text_color=COLORS['text_muted'])
        self.lbl_title.pack(anchor="w")
        
        self.lbl_value = ctk.CTkLabel(label_frame, text="Waiting...", font=("Segoe UI Semibold", 14), text_color=COLORS['text'])
        self.lbl_value.pack(anchor="w")
        
        self._active = False
    
    def set_active(self, active: bool, value: str = None):
        self._active = active
        color = COLORS['success'] if active else COLORS['text_muted']
        self.dot_frame.configure(fg_color=color)
        if value:
            self.lbl_value.configure(text=value)


class MessageBubble(ctk.CTkFrame):
    """Voice message bubble"""
    def __init__(self, master, text: str, msg_type: str = 'received', **kwargs):
        bg = COLORS['bg_card'] if msg_type == 'received' else COLORS['accent']
        super().__init__(master, fg_color=bg, corner_radius=12, **kwargs)
        
        icon = "🎤" if msg_type == 'sent' else "🔊"
        
        self.lbl_icon = ctk.CTkLabel(self, text=icon, font=("Segoe UI", 16))
        self.lbl_icon.pack(side="left", padx=(12, 8), pady=10)
        
        self.lbl_text = ctk.CTkLabel(self, text=text, font=("Segoe UI", 13), text_color=COLORS['text'], wraplength=350, justify="left")
        self.lbl_text.pack(side="left", padx=(0, 12), pady=10, fill="x", expand=True)


class OkBoxBoxRelay(ctk.CTk):
    """Main application window matching Electron design"""
    
    def __init__(self):
        super().__init__()
        
        self.title("Ok, Box Box")
        self.geometry("480x640")
        self.configure(fg_color=COLORS['bg_dark'])
        self.resizable(False, False)
        
        # State
        self.settings = SettingsManager()
        self.agent_process = None
        self.log_queue = queue.Queue()
        self.messages = []
        self.is_recording = False
        self.iracing_connected = False
        self.server_connected = False
        self.current_mode = "waiting"
        
        # Build UI
        self._build_header()
        self._build_status_cards()
        self._build_status_summary()
        self._build_recording_indicator()
        self._build_messages_panel()
        self._build_controls()
        self._build_settings_panel()
        
        # Start update loop
        self._update_ui()
        
        # Auto-start agent
        self.after(500, self.start_agent)
    
    def _build_header(self):
        """Header with logo and controls"""
        header = ctk.CTkFrame(self, fg_color="transparent", height=60)
        header.pack(fill="x", padx=20, pady=(16, 0))
        header.pack_propagate(False)
        
        # Logo text
        logo = ctk.CTkLabel(header, text="Ok, Box Box", font=("Segoe UI Black", 22), text_color=COLORS['accent'])
        logo.pack(side="left")
        
        # Settings button
        self.btn_settings = ctk.CTkButton(
            header, text="⚙", width=40, height=40, 
            font=("Segoe UI", 18), fg_color="transparent",
            hover_color=COLORS['bg_card'], command=self._toggle_settings
        )
        self.btn_settings.pack(side="right")
        
        # Tier badge
        tier = ctk.CTkLabel(header, text="RELAY", font=("Segoe UI Bold", 10), 
                           fg_color=COLORS['accent'], corner_radius=4, padx=8, pady=2)
        tier.pack(side="right", padx=8)
    
    def _build_status_cards(self):
        """Status cards for Relay and iRacing"""
        cards_frame = ctk.CTkFrame(self, fg_color="transparent")
        cards_frame.pack(fill="x", padx=20, pady=16)
        cards_frame.grid_columnconfigure((0, 1), weight=1)
        
        self.card_relay = StatusCard(cards_frame, "Relay")
        self.card_relay.grid(row=0, column=0, sticky="ew", padx=(0, 8))
        
        self.card_iracing = StatusCard(cards_frame, "iRacing")
        self.card_iracing.grid(row=0, column=1, sticky="ew", padx=(8, 0))
    
    def _build_status_summary(self):
        """Status summary bar"""
        self.summary_frame = ctk.CTkFrame(self, fg_color=COLORS['bg_card'], corner_radius=8, height=40)
        self.summary_frame.pack(fill="x", padx=20, pady=(0, 8))
        self.summary_frame.pack_propagate(False)
        
        self.lbl_summary = ctk.CTkLabel(self.summary_frame, text="Starting relay...", 
                                        font=("Segoe UI", 12), text_color=COLORS['text_muted'])
        self.lbl_summary.pack(expand=True)
    
    def _build_recording_indicator(self):
        """Recording indicator bar"""
        self.recording_frame = ctk.CTkFrame(self, fg_color=COLORS['accent'], corner_radius=8, height=40)
        self.recording_frame.pack_propagate(False)
        
        self.lbl_recording = ctk.CTkLabel(self.recording_frame, text="🎤 LISTENING...", 
                                          font=("Segoe UI Bold", 12), text_color=COLORS['text'])
        self.lbl_recording.pack(expand=True)
        
        # Hidden by default
        self.recording_frame.pack_forget()
    
    def _build_messages_panel(self):
        """Voice messages panel"""
        self.messages_frame = ctk.CTkScrollableFrame(self, fg_color="transparent", height=280)
        self.messages_frame.pack(fill="both", expand=True, padx=20, pady=8)
        
        # Hint
        self.hint_frame = ctk.CTkFrame(self.messages_frame, fg_color=COLORS['bg_card'], corner_radius=12)
        self.hint_frame.pack(fill="x", pady=20)
        
        hint_content = ctk.CTkFrame(self.hint_frame, fg_color="transparent")
        hint_content.pack(pady=20)
        
        ctk.CTkLabel(hint_content, text="🎤", font=("Segoe UI", 32)).pack()
        ctk.CTkLabel(hint_content, text="Hold wheel button to talk", 
                    font=("Segoe UI", 13), text_color=COLORS['text_muted']).pack(pady=(8, 0))
    
    def _build_controls(self):
        """Bottom control buttons"""
        controls = ctk.CTkFrame(self, fg_color="transparent", height=60)
        controls.pack(fill="x", padx=20, pady=(8, 16))
        
        self.btn_start = ctk.CTkButton(
            controls, text="START", font=("Segoe UI Bold", 14),
            fg_color=COLORS['success'], hover_color="#00b359",
            height=44, command=self.start_agent
        )
        self.btn_start.pack(side="left", expand=True, fill="x", padx=(0, 8))
        
        self.btn_stop = ctk.CTkButton(
            controls, text="STOP", font=("Segoe UI Bold", 14),
            fg_color=COLORS['accent'], hover_color=COLORS['accent_hover'],
            height=44, command=self.stop_agent
        )
        self.btn_stop.pack(side="right", expand=True, fill="x", padx=(8, 0))
    
    def _build_settings_panel(self):
        """Settings overlay panel"""
        self.settings_panel = ctk.CTkFrame(self, fg_color=COLORS['bg_dark'])
        
        # Header
        header = ctk.CTkFrame(self.settings_panel, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=16)
        
        ctk.CTkLabel(header, text="Settings", font=("Segoe UI Bold", 20)).pack(side="left")
        
        btn_close = ctk.CTkButton(header, text="✕", width=40, height=40,
                                  font=("Segoe UI", 18), fg_color="transparent",
                                  hover_color=COLORS['bg_card'], command=self._toggle_settings)
        btn_close.pack(side="right")
        
        # Settings content
        content = ctk.CTkScrollableFrame(self.settings_panel, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=20)
        
        current = self.settings.load()
        self.setting_entries = {}
        
        # PTT Type
        self._add_setting_row(content, "PTT Type", "PTT_TYPE", current.get("PTT_TYPE", "joystick"), 
                             options=["joystick", "keyboard"])
        
        # Joystick settings
        self._add_setting_row(content, "Joystick ID", "JOYSTICK_ID", current.get("JOYSTICK_ID", "0"))
        self._add_setting_row(content, "Joystick Button", "JOYSTICK_BUTTON", current.get("JOYSTICK_BUTTON", "9"))
        
        # Keyboard settings
        self._add_setting_row(content, "PTT Key", "PTT_KEY", current.get("PTT_KEY", "space"))
        
        # Server
        self._add_setting_row(content, "Server URL", "BLACKBOX_SERVER_URL", 
                             current.get("BLACKBOX_SERVER_URL", "https://octopus-app-qsi3i.ondigitalocean.app"))
        
        # Save button
        btn_save = ctk.CTkButton(content, text="Save Settings", font=("Segoe UI Bold", 14),
                                fg_color=COLORS['accent'], hover_color=COLORS['accent_hover'],
                                height=44, command=self._save_settings)
        btn_save.pack(fill="x", pady=20)
        
        # Hidden by default
        self.settings_visible = False
    
    def _add_setting_row(self, parent, label: str, key: str, value: str, options: list = None):
        """Add a setting row"""
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.pack(fill="x", pady=8)
        
        ctk.CTkLabel(frame, text=label.upper(), font=("Segoe UI", 11), 
                    text_color=COLORS['text_muted']).pack(anchor="w")
        
        if options:
            var = ctk.StringVar(value=value)
            widget = ctk.CTkOptionMenu(frame, values=options, variable=var,
                                       fg_color=COLORS['bg_card'], button_color=COLORS['bg_card'])
            widget.pack(fill="x", pady=(4, 0))
            self.setting_entries[key] = var
        else:
            entry = ctk.CTkEntry(frame, fg_color=COLORS['bg_card'], border_color=COLORS['border'])
            entry.insert(0, value)
            entry.pack(fill="x", pady=(4, 0))
            self.setting_entries[key] = entry
    
    def _toggle_settings(self):
        """Toggle settings panel visibility"""
        if self.settings_visible:
            self.settings_panel.place_forget()
        else:
            self.settings_panel.place(x=0, y=0, relwidth=1, relheight=1)
        self.settings_visible = not self.settings_visible
    
    def _save_settings(self):
        """Save settings"""
        new_settings = {}
        for key, widget in self.setting_entries.items():
            if isinstance(widget, ctk.StringVar):
                new_settings[key] = widget.get()
            else:
                new_settings[key] = widget.get()
        
        self.settings.save(new_settings)
        self._toggle_settings()
        self.add_message("Settings saved. Restart relay to apply.", "received")
    
    def add_message(self, text: str, msg_type: str = 'received'):
        """Add a message to the panel"""
        # Hide hint
        self.hint_frame.pack_forget()
        
        # Add message
        msg = MessageBubble(self.messages_frame, text, msg_type)
        msg.pack(fill="x", pady=4, anchor="e" if msg_type == 'sent' else "w")
        self.messages.append(msg)
        
        # Keep only last 20 messages
        while len(self.messages) > 20:
            old = self.messages.pop(0)
            old.destroy()
    
    def set_recording(self, recording: bool):
        """Set recording state"""
        self.is_recording = recording
        if recording:
            self.recording_frame.pack(fill="x", padx=20, pady=(0, 8), before=self.messages_frame)
        else:
            self.recording_frame.pack_forget()
    
    def start_agent(self):
        """Start the relay agent"""
        if self.agent_process and self.agent_process.poll() is None:
            return
        
        try:
            cmd = [sys.executable, "-u", "main.py"]
            cwd = os.path.dirname(os.path.abspath(__file__))
            
            self.agent_process = subprocess.Popen(
                cmd, cwd=cwd,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
            )
            
            self.lbl_summary.configure(text="Relay starting...", text_color=COLORS['warning'])
            threading.Thread(target=self._read_output, daemon=True).start()
            
        except Exception as e:
            self.lbl_summary.configure(text=f"Error: {e}", text_color=COLORS['accent'])
    
    def stop_agent(self):
        """Stop the relay agent"""
        if self.agent_process and self.agent_process.poll() is None:
            if sys.platform == 'win32':
                self.agent_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.agent_process.terminate()
            
            try:
                self.agent_process.wait(timeout=3)
            except:
                self.agent_process.kill()
            
            self.agent_process = None
            self.card_relay.set_active(False, "Offline")
            self.card_iracing.set_active(False, "Waiting...")
            self.lbl_summary.configure(text="Relay stopped", text_color=COLORS['text_muted'])
    
    def _read_output(self):
        """Read agent output in background thread"""
        while self.agent_process and self.agent_process.poll() is None:
            line = self.agent_process.stdout.readline()
            if line:
                self.log_queue.put(line.strip())
        
        self.log_queue.put("__STOPPED__")
    
    def _update_ui(self):
        """Process log queue and update UI"""
        try:
            while True:
                line = self.log_queue.get_nowait()
                self._process_log_line(line)
        except queue.Empty:
            pass
        
        self.after(100, self._update_ui)
    
    def _process_log_line(self, line: str):
        """Process a log line and update UI accordingly"""
        if line == "__STOPPED__":
            self.card_relay.set_active(False, "Offline")
            self.card_iracing.set_active(False, "Waiting...")
            self.lbl_summary.configure(text="Relay stopped", text_color=COLORS['text_muted'])
            return
        
        # Parse log line for status updates
        if "Connected to PitBox Server" in line or "Connected to Ok,Box Box" in line:
            self.server_connected = True
            self.card_relay.set_active(True, "Online")
        
        if "Connected to iRacing" in line:
            self.iracing_connected = True
            self.card_iracing.set_active(True, "Live")
        
        if "Waiting for iRacing" in line:
            self.iracing_connected = False
            self.card_iracing.set_active(False, "Waiting...")
        
        if "DRIVING" in line:
            self.current_mode = "driving"
            self.lbl_summary.configure(text="🏎️ Driving — streaming to okboxbox.com", text_color=COLORS['success'])
        
        if "Recording started" in line:
            self.set_recording(True)
        
        if "Recording stopped" in line:
            self.set_recording(False)
        
        if "HID PTT: PRESSED" in line:
            self.set_recording(True)
        
        if "HID PTT: RELEASED" in line:
            self.set_recording(False)
        
        if "Engineer:" in line:
            # Extract engineer response
            try:
                msg = line.split("Engineer:")[1].strip()
                self.add_message(msg, "received")
            except:
                pass
        
        if "Voice response error" in line:
            self.add_message("Voice processing failed - check server config", "received")
    
    def on_closing(self):
        """Handle window close"""
        self.stop_agent()
        self.destroy()


if __name__ == "__main__":
    app = OkBoxBoxRelay()
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
