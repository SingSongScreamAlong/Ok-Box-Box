#!/usr/bin/env python3
"""List available joysticks/wheels and detect button presses"""
import time

try:
    import pygame
    pygame.init()
    pygame.joystick.init()
    
    count = pygame.joystick.get_count()
    if count == 0:
        print("\nNo joysticks/wheels detected!")
        print("Make sure your wheel is connected and recognized by Windows.")
        exit(1)
    
    print(f"\n=== Found {count} Joystick(s)/Wheel(s) ===\n")
    
    joysticks = []
    for i in range(count):
        js = pygame.joystick.Joystick(i)
        js.init()
        joysticks.append(js)
        print(f"  [{i}] {js.get_name()}")
        print(f"      Buttons: {js.get_numbuttons()}, Axes: {js.get_numaxes()}")
    
    print("\n" + "="*50)
    print("Press any button on your wheel to detect it...")
    print("Press Ctrl+C to exit")
    print("="*50 + "\n")
    
    try:
        while True:
            pygame.event.pump()
            for i, js in enumerate(joysticks):
                for btn in range(js.get_numbuttons()):
                    if js.get_button(btn):
                        print(f"  >>> JOYSTICK_ID={i}  JOYSTICK_BUTTON={btn}  ({js.get_name()})")
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n\nDone! Set these values in your .env file:")
        print("  PTT_TYPE=joystick")
        print("  JOYSTICK_ID=<number>")
        print("  JOYSTICK_BUTTON=<number>")
        
except ImportError:
    print("pygame not installed. Run: pip install pygame")
except Exception as e:
    print(f"Error: {e}")
finally:
    try:
        pygame.quit()
    except:
        pass
