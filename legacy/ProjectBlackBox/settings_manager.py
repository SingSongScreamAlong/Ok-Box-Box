"""
ProjectPitBox Settings Manager
In-program configuration for all settings
"""

import json
import os
from typing import Dict, Optional, List
import pygame
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class PTTConfig:
    """Push-to-talk configuration"""
    type: str = 'keyboard'  # 'keyboard' or 'joystick'
    keyboard_key: str = 'f1'
    joystick_id: int = 0
    joystick_button: int = 0
    joystick_name: str = ''


@dataclass
class VoiceConfig:
    """Voice settings"""
    openai_api_key: str = ''
    elevenlabs_api_key: str = ''
    engineer_voice_id: str = 'EXAVITQu4vr4xnSDxMaL'
    strategist_voice_id: str = '21m00Tcm4TlvDq8ikWAM'
    coach_voice_id: str = 'AZnzlk1XvdvUeBnXmlld'
    intel_voice_id: str = 'pNInz6obpgDQGcFmaJgB'
    
    def __post_init__(self):
        """Load API keys from environment if not set"""
        # Check for centralized API keys in environment
        if not self.openai_api_key:
            self.openai_api_key = os.getenv('OPENAI_API_KEY', '')
        if not self.elevenlabs_api_key:
            self.elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY', '')


@dataclass
class DatabaseConfig:
    """Database settings"""
    url: str = 'postgresql://pitbox:pitbox@localhost:5432/pitbox'


@dataclass
class UIConfig:
    """UI preferences"""
    theme: str = 'dark'
    show_telemetry_overlay: bool = True
    show_timing_tower: bool = True
    show_track_map: bool = True


@dataclass
class PitBoxSettings:
    """Complete ProjectPitBox settings"""
    ptt: PTTConfig
    voice: VoiceConfig
    database: DatabaseConfig
    ui: UIConfig
    
    def __init__(self):
        self.ptt = PTTConfig()
        self.voice = VoiceConfig()
        self.database = DatabaseConfig()
        self.ui = UIConfig()


class SettingsManager:
    """
    Manage all ProjectPitBox settings
    Loads from file, provides UI for configuration, saves changes
    """
    
    def __init__(self, config_file: str = None):
        if config_file is None:
            # Default to user's home directory
            config_dir = Path.home() / '.projectpitbox'
            config_dir.mkdir(exist_ok=True)
            self.config_file = config_dir / 'settings.json'
        else:
            self.config_file = Path(config_file)
        
        self.settings = PitBoxSettings()
        self.load()
    
    def load(self):
        """Load settings from file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    data = json.load(f)
                
                # Load each section
                if 'ptt' in data:
                    self.settings.ptt = PTTConfig(**data['ptt'])
                if 'voice' in data:
                    self.settings.voice = VoiceConfig(**data['voice'])
                else:
                    # Ensure environment variables are checked even if no saved config
                    self.settings.voice.__post_init__()
                if 'database' in data:
                    self.settings.database = DatabaseConfig(**data['database'])
                if 'ui' in data:
                    self.settings.ui = UIConfig(**data['ui'])
                
                print(f"✅ Settings loaded from {self.config_file}")
            except Exception as e:
                print(f"⚠️ Error loading settings: {e}")
                print("Using default settings")
        else:
            print("No settings file found, using defaults")
    
    def save(self):
        """Save settings to file"""
        try:
            data = {
                'ptt': asdict(self.settings.ptt),
                'voice': asdict(self.settings.voice),
                'database': asdict(self.settings.database),
                'ui': asdict(self.settings.ui)
            }
            
            with open(self.config_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Settings saved to {self.config_file}")
        except Exception as e:
            print(f"❌ Error saving settings: {e}")
    
    def detect_wheels(self) -> List[Dict]:
        """Detect all connected wheels/joysticks"""
        pygame.init()
        pygame.joystick.init()
        
        wheels = []
        count = pygame.joystick.get_count()
        
        for i in range(count):
            joystick = pygame.joystick.Joystick(i)
            joystick.init()
            
            wheels.append({
                'id': i,
                'name': joystick.get_name(),
                'buttons': joystick.get_numbuttons(),
                'axes': joystick.get_numaxes()
            })
            
            joystick.quit()
        
        pygame.quit()
        return wheels
    
    def configure_ptt_interactive(self):
        """Interactive PTT configuration"""
        print("\n" + "=" * 70)
        print("PUSH-TO-TALK CONFIGURATION")
        print("=" * 70)
        
        print("\nOptions:")
        print("1. Keyboard key")
        print("2. Wheel/Joystick button")
        
        choice = input("\nSelect (1 or 2): ").strip()
        
        if choice == '2':
            # Detect wheels
            wheels = self.detect_wheels()
            
            if not wheels:
                print("\n❌ No wheels/joysticks detected!")
                print("Falling back to keyboard")
                choice = '1'
            else:
                print(f"\n🎮 Found {len(wheels)} device(s):")
                for wheel in wheels:
                    print(f"\n  [{wheel['id']}] {wheel['name']}")
                    print(f"      Buttons: {wheel['buttons']}")
                    print(f"      Axes: {wheel['axes']}")
                
                device_id = int(input("\nSelect device ID: "))
                
                if 0 <= device_id < len(wheels):
                    wheel = wheels[device_id]
                    print(f"\nSelected: {wheel['name']}")
                    print(f"Available buttons: 0-{wheel['buttons']-1}")
                    
                    button = int(input("Select button number: "))
                    
                    if 0 <= button < wheel['buttons']:
                        self.settings.ptt.type = 'joystick'
                        self.settings.ptt.joystick_id = device_id
                        self.settings.ptt.joystick_button = button
                        self.settings.ptt.joystick_name = wheel['name']
                        
                        print(f"\n✅ PTT configured: {wheel['name']} button {button}")
                    else:
                        print(f"\n❌ Invalid button number")
                        return
                else:
                    print(f"\n❌ Invalid device ID")
                    return
        
        if choice == '1':
            # Keyboard configuration
            print("\nCommon keys: f1, f2, f3, space, ctrl, alt")
            key = input("Enter key name (default: f1): ").strip().lower() or 'f1'
            
            self.settings.ptt.type = 'keyboard'
            self.settings.ptt.keyboard_key = key
            
            print(f"\n✅ PTT configured: Keyboard key '{key.upper()}'")
        
        self.save()
    
    def configure_voice_interactive(self):
        """Interactive voice API configuration"""
        print("\n" + "=" * 70)
        print("VOICE API CONFIGURATION")
        print("=" * 70)
        
        print("\nYou need:")
        print("1. OpenAI API key (for speech-to-text)")
        print("2. ElevenLabs API key (for text-to-speech)")
        
        print("\n" + "-" * 70)
        
        # OpenAI
        current_openai = self.settings.voice.openai_api_key
        if current_openai:
            print(f"\nCurrent OpenAI key: {current_openai[:10]}...{current_openai[-4:]}")
            change = input("Change? (y/n): ").strip().lower()
            if change == 'y':
                key = input("Enter new OpenAI API key: ").strip()
                if key:
                    self.settings.voice.openai_api_key = key
        else:
            key = input("\nEnter OpenAI API key: ").strip()
            if key:
                self.settings.voice.openai_api_key = key
        
        # ElevenLabs
        current_elevenlabs = self.settings.voice.elevenlabs_api_key
        if current_elevenlabs:
            print(f"\nCurrent ElevenLabs key: {current_elevenlabs[:10]}...{current_elevenlabs[-4:]}")
            change = input("Change? (y/n): ").strip().lower()
            if change == 'y':
                key = input("Enter new ElevenLabs API key: ").strip()
                if key:
                    self.settings.voice.elevenlabs_api_key = key
        else:
            key = input("\nEnter ElevenLabs API key: ").strip()
            if key:
                self.settings.voice.elevenlabs_api_key = key
        
        print("\n✅ Voice API keys configured")
        self.save()
    
    def configure_database_interactive(self):
        """Interactive database configuration"""
        print("\n" + "=" * 70)
        print("DATABASE CONFIGURATION")
        print("=" * 70)
        
        print(f"\nCurrent: {self.settings.database.url}")
        
        change = input("\nChange database URL? (y/n): ").strip().lower()
        if change == 'y':
            url = input("Enter PostgreSQL URL: ").strip()
            if url:
                self.settings.database.url = url
                print("\n✅ Database URL updated")
                self.save()
    
    def show_current_settings(self):
        """Display current settings"""
        print("\n" + "=" * 70)
        print("CURRENT SETTINGS")
        print("=" * 70)
        
        print("\n📻 Push-to-Talk:")
        if self.settings.ptt.type == 'keyboard':
            print(f"   Type: Keyboard")
            print(f"   Key: {self.settings.ptt.keyboard_key.upper()}")
        else:
            print(f"   Type: Wheel/Joystick")
            print(f"   Device: {self.settings.ptt.joystick_name or f'ID {self.settings.ptt.joystick_id}'}")
            print(f"   Button: {self.settings.ptt.joystick_button}")
        
        print("\n🎙️ Voice:")
        print(f"   OpenAI: {'✅ Configured' if self.settings.voice.openai_api_key else '❌ Not set'}")
        print(f"   ElevenLabs: {'✅ Configured' if self.settings.voice.elevenlabs_api_key else '❌ Not set'}")
        
        print("\n📊 Database:")
        print(f"   URL: {self.settings.database.url}")
        
        print("\n🎨 UI:")
        print(f"   Theme: {self.settings.ui.theme}")
        print(f"   Telemetry overlay: {'On' if self.settings.ui.show_telemetry_overlay else 'Off'}")
    
    def run_setup_wizard(self):
        """Run complete setup wizard"""
        print("\n" + "=" * 70)
        print("🏁 ProjectPitBox - Setup Wizard")
        print("=" * 70)
        
        print("\nWelcome! Let's configure ProjectPitBox.")
        
        # PTT
        print("\n1️⃣ Push-to-Talk Configuration")
        self.configure_ptt_interactive()
        
        # Voice
        print("\n2️⃣ Voice API Configuration")
        self.configure_voice_interactive()
        
        # Database (optional)
        print("\n3️⃣ Database Configuration")
        use_default = input("Use default database settings? (y/n): ").strip().lower()
        if use_default != 'y':
            self.configure_database_interactive()
        
        print("\n" + "=" * 70)
        print("✅ Setup complete!")
        print("=" * 70)
        
        self.show_current_settings()
        
        print(f"\n💾 Settings saved to: {self.config_file}")
        print("\nYou can now run: python run_pitbox.py")


def main():
    """Main settings interface"""
    settings = SettingsManager()
    
    while True:
        print("\n" + "=" * 70)
        print("ProjectPitBox - Settings")
        print("=" * 70)
        
        print("\n1. Run setup wizard")
        print("2. Configure push-to-talk")
        print("3. Configure voice APIs")
        print("4. Configure database")
        print("5. Show current settings")
        print("6. Test wheel detection")
        print("0. Exit")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == '1':
            settings.run_setup_wizard()
        elif choice == '2':
            settings.configure_ptt_interactive()
        elif choice == '3':
            settings.configure_voice_interactive()
        elif choice == '4':
            settings.configure_database_interactive()
        elif choice == '5':
            settings.show_current_settings()
        elif choice == '6':
            wheels = settings.detect_wheels()
            print(f"\n🎮 Found {len(wheels)} device(s):")
            for wheel in wheels:
                print(f"\n  [{wheel['id']}] {wheel['name']}")
                print(f"      Buttons: {wheel['buttons']}")
        elif choice == '0':
            print("\nExiting...")
            break
        else:
            print("\n❌ Invalid option")


if __name__ == '__main__':
    main()
