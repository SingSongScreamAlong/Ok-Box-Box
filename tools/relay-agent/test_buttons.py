#!/usr/bin/env python3
"""Quick button tester - press any button on your wheel to see its number"""
import pygame
import time

pygame.init()
pygame.joystick.init()

j = pygame.joystick.Joystick(0)
j.init()

print(f"Device: {j.get_name()}")
print(f"Buttons: {j.get_numbuttons()}")
print("\nPress any button on your wheel...")
print("Press Ctrl+C to exit\n")

last_state = [False] * j.get_numbuttons()

try:
    while True:
        pygame.event.pump()
        for i in range(j.get_numbuttons()):
            pressed = j.get_button(i)
            if pressed and not last_state[i]:
                print(f">>> Button {i} PRESSED <<<")
            last_state[i] = pressed
        time.sleep(0.02)
except KeyboardInterrupt:
    print("\nDone")
