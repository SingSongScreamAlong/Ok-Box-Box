"""
PitBox PTT Binder
Interactive tool to bind Push-to-Talk keys/buttons by pressing them.
"""
import sys
import os
import time
import json
from pathlib import Path

# Add root dir to path to import settings_manager if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import pygame
    import keyboard
except ImportError:
    print("❌ Critical dependencies missing. Run: pip install -r requirements.txt")
    print("Needs: pygame, keyboard")
    sys.exit(1)

# Manually load/save settings to avoid complex import dependencies if run from subdir
CONFIG_DIR = Path.home() / '.projectpitbox'
CONFIG_FILE = CONFIG_DIR / 'settings.json'

def load_settings():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_settings(data):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✅ Settings saved to {CONFIG_FILE}")

def bind_keyboard():
    print("\n⌨️  BINDING KEYBOARD")
    print("Press ANY key to bind it... (Esc to cancel)")
    
    while True:
        event = keyboard.read_event()
        if event.event_type == keyboard.KEY_DOWN:
            if event.name == 'esc':
                print("Cancelled.")
                return None
            
            print(f"Captured: {event.name}")
            return event.name

def bind_joystick():
    pygame.init()
    pygame.joystick.init()
    
    count = pygame.joystick.get_count()
    if count == 0:
        print("❌ No joysticks/wheels found!")
        return None
        
    print(f"\n🎮 Found {count} device(s).")
    joysticks = [pygame.joystick.Joystick(i) for i in range(count)]
    for j in joysticks:
        j.init()
        print(f"   - {j.get_name()}")
        
    print("\n🔘 BINDING BUTTON")
    print("Press ANY button on ANY device to bind it... (Ctrl+C to cancel)")
    
    try:
        while True:
            pygame.event.pump()
            for i, joystick in enumerate(joysticks):
                for button_idx in range(joystick.get_numbuttons()):
                    if joystick.get_button(button_idx):
                        print(f"Captured: Device {i} ({joystick.get_name()}) Button {button_idx}")
                        return {
                            'type': 'joystick',
                            'joystick_id': i,
                            'joystick_button': button_idx,
                            'joystick_name': joystick.get_name()
                        }
            time.sleep(0.01)
    except KeyboardInterrupt:
        print("\nCancelled.")
        return None
    finally:
        pygame.quit()

def main():
    print("="*60)
    print("🎙️  PitBox PTT Binder")
    print("="*60)
    print("1. Bind Keyboard Key")
    print("2. Bind Joystick/Wheel Button")
    print("0. Exit")
    
    choice = input("\nSelect option: ").strip()
    
    result = None
    settings = load_settings()
    
    # Ensure PTT section exists
    if 'ptt' not in settings:
        settings['ptt'] = {}
        
    if choice == '1':
        key = bind_keyboard()
        if key:
            settings['ptt']['type'] = 'keyboard'
            settings['ptt']['keyboard_key'] = key
            save_settings(settings)
            
    elif choice == '2':
        data = bind_joystick()
        if data:
            settings['ptt']['type'] = 'joystick'
            settings['ptt']['joystick_id'] = data['joystick_id']
            settings['ptt']['joystick_button'] = data['joystick_button']
            settings['ptt']['joystick_name'] = data['joystick_name']
            save_settings(settings)
            
    elif choice == '0':
        pass
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()
