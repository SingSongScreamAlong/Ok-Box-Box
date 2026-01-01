"""
Settings Manager for Relay Agent
Handles reading and writing configuration to .env file
"""
import os
from pathlib import Path
from typing import Dict, Any

class SettingsManager:
    def __init__(self):
        self.env_path = Path(__file__).parent / '.env'
        self._defaults = {
            'BLACKBOX_SERVER_URL': 'http://localhost:3000',
            'RELAY_ID': 'pitbox-relay-1',
            'PTT_TYPE': 'keyboard', # or 'joystick'
            'PTT_KEY': 'space',
            'JOYSTICK_ID': '0',
            'JOYSTICK_BUTTON': '0',
            'MICROPHONE_INDEX': '0'
        }
        
    def load(self) -> Dict[str, str]:
        """Load settings from .env, falling back to defaults"""
        settings = self._defaults.copy()
        
        if self.env_path.exists():
            with open(self.env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, val = line.split('=', 1)
                        settings[key.strip()] = val.strip()
        
        return settings
    
    def save(self, settings: Dict[str, str]):
        """Save settings to .env"""
        # Read existing to preserve comments? MVP: Just overwrite or append
        # Let's iterate keys and update
        
        current_lines = []
        if self.env_path.exists():
            with open(self.env_path, 'r') as f:
                current_lines = f.readlines()
        
        new_lines = []
        keys_written = set()
        
        for line in current_lines:
            key_match = None
            if '=' in line and not line.strip().startswith('#'):
                key = line.split('=', 1)[0].strip()
                if key in settings:
                    new_lines.append(f"{key}={settings[key]}\n")
                    keys_written.add(key)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        # Append new keys
        for key, val in settings.items():
            if key not in keys_written:
                new_lines.append(f"{key}={val}\n")
                
        with open(self.env_path, 'w') as f:
            f.writelines(new_lines)
            
    def get(self, key: str) -> str:
        return self.load().get(key, self._defaults.get(key, ''))
