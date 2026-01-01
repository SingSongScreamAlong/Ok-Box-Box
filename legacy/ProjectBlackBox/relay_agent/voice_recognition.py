"""
PitBox Relay Agent - Voice Recognition / PTT Handler
Handles Push-to-Talk triggers from Keyboard or Joystick/Wheel
"""
import logging
import time

# Optional imports handled gracefully
try:
    import keyboard
except ImportError:
    keyboard = None

try:
    import pygame
except ImportError:
    pygame = None

logger = logging.getLogger(__name__)

class VoiceRecognition:
    """
    Handles PTT state detection
    """
    def __init__(self, ptt_type='keyboard', ptt_key='space', joystick_id=0, joystick_button=0):
        self.ptt_type = ptt_type
        self.ptt_key = ptt_key
        self.joystick_id = joystick_id
        self.joystick_button = joystick_button
        
        self.joystick = None
        self._initialized = False
        
        self.setup()
        
    def setup(self):
        """Initialize input devices"""
        if self.ptt_type == 'joystick':
            if not pygame:
                logger.error("pygame not installed. Cannot use joystick PTT.")
                return
            
            try:
                if not pygame.get_init():
                    pygame.init()
                if not pygame.joystick.get_init():
                    pygame.joystick.init()
                
                count = pygame.joystick.get_count()
                if count > self.joystick_id:
                    self.joystick = pygame.joystick.Joystick(self.joystick_id)
                    self.joystick.init()
                    logger.info(f"✅ Joystick PTT initialized: {self.joystick.get_name()} (Button {self.joystick_button})")
                else:
                    logger.error(f"❌ Joystick ID {self.joystick_id} not found. Found {count} devices.")
            except Exception as e:
                logger.error(f"Failed to init joystick: {e}")
                
        elif self.ptt_type == 'keyboard':
            if not keyboard:
                logger.error("keyboard lib not installed. Cannot use keyboard PTT.")
                return
            logger.info(f"✅ Keyboard PTT initialized: Key '{self.ptt_key}'")
            
        self._initialized = True

    def is_pressed(self) -> bool:
        """Check if PTT button/key is currently pressed"""
        if not self._initialized:
            return False
            
        try:
            if self.ptt_type == 'keyboard' and keyboard:
                return keyboard.is_pressed(self.ptt_key)
                
            elif self.ptt_type == 'joystick' and self.joystick:
                pygame.event.pump() # Process event queue
                return self.joystick.get_button(self.joystick_button)
                
        except Exception:
            return False
            
        return False

    def list_devices(self):
        """List available joystick devices"""
        if not pygame:
            print("pygame not installed")
            return
            
        pygame.init()
        pygame.joystick.init()
        count = pygame.joystick.get_count()
        
        print(f"🎮 Found {count} device(s):")
        for i in range(count):
            try:
                j = pygame.joystick.Joystick(i)
                j.init()
                print(f"\n  Device {i}:")
                print(f"    Name: {j.get_name()}")
                print(f"    Buttons: {j.get_numbuttons()}")
            except:
                print(f"  Device {i}: Error reading")

if __name__ == "__main__":
    # Test script usage
    import sys
    
    if "--list" in sys.argv:
        vr = VoiceRecognition()
        vr.list_devices()
    else:
        print("Testing PTT... (Press configured button)")
        # Default test
        vr = VoiceRecognition(ptt_type='keyboard', ptt_key='space') 
        try:
            while True:
                if vr.is_pressed():
                    print("ON", end='\r')
                else:
                    print("OFF", end='\r')
                time.sleep(0.1)
        except KeyboardInterrupt:
            pass
