#!/usr/bin/env python3
"""List available audio input devices"""

try:
    import pyaudio
    p = pyaudio.PyAudio()
    
    print("\n=== Available Audio Input Devices ===\n")
    
    for i in range(p.get_device_count()):
        info = p.get_device_info_by_index(i)
        if info['maxInputChannels'] > 0:  # Input device
            print(f"  [{i}] {info['name']}")
            print(f"      Channels: {info['maxInputChannels']}, Rate: {int(info['defaultSampleRate'])}Hz")
    
    print("\n  Set MICROPHONE_INDEX in .env to the number in brackets")
    print()
    
    p.terminate()
except ImportError:
    print("PyAudio not installed. Run: pip install pyaudio")
except Exception as e:
    print(f"Error: {e}")
