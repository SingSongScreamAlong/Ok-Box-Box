# ProjectPitBox - Push-to-Talk Configuration

## 🎮 Wheel Button Mapping

ProjectPitBox supports mapping push-to-talk to **any button on your racing wheel**.

---

## Quick Setup

### 1. List Available Devices

```bash
cd relay_agent
python voice_recognition.py --list
```

Output:
```
🎮 Found 2 device(s):

  Device 0:
    Name: Logitech G29 Racing Wheel
    Buttons: 24
    Axes: 6

  Device 1:
    Name: Thrustmaster T300RS
    Buttons: 16
    Axes: 3
```

### 2. Test Your Button

```bash
python voice_recognition.py
```

Choose option 2 (Wheel/Joystick), enter device ID and button number.

### 3. Configure in Main Script

Edit `run_pitbox.py`:

```python
# Configure PTT for your wheel
audio = AudioPipeline(
    openai_key,
    elevenlabs_key,
    ptt_type='joystick',      # Use wheel button
    joystick_id=0,            # Your wheel device ID
    joystick_button=5         # Your chosen button
)
```

---

## Common Wheel Mappings

### Logitech G29/G920
- Button 0-15: Wheel buttons
- Button 16-19: Shifter buttons
- **Recommended**: Button 4 or 5 (top wheel buttons)

### Thrustmaster T300/TX
- Button 0-15: Wheel buttons
- **Recommended**: Button 2 or 3 (thumb buttons)

### Fanatec CSL/DD
- Button 0-11: Wheel buttons
- **Recommended**: Button 0 or 1 (paddle shifters when not shifting)

---

## Configuration Options

### Option 1: Keyboard (Fallback)
```python
vr = VoiceRecognition(
    api_key,
    ptt_type='keyboard',
    ptt_key='f1'  # Or 'f2', 'space', etc.
)
```

### Option 2: Wheel Button (Recommended)
```python
vr = VoiceRecognition(
    api_key,
    ptt_type='joystick',
    joystick_id=0,        # Device ID from --list
    joystick_button=5     # Button number
)
```

---

## Usage

1. **Press** your configured wheel button
2. **Talk** while holding
3. **Release** when done
4. Team responds

**Hands never leave the wheel. Zero distraction.**

---

## Troubleshooting

### "No wheel/joystick detected"
- Make sure wheel is plugged in
- Check wheel is recognized by OS
- Try unplugging and replugging

### "Button not responding"
- Run `--list` to verify button count
- Test button in another app first
- Some buttons may be reserved by wheel firmware

### "Wrong button triggering"
- Button numbers start at 0
- Count from 0, not 1
- Use `--list` to verify button count

---

## Best Practices

**Button Selection**:
- Choose a button you can reach without moving hands
- Avoid buttons used for other functions
- Test in practice session first

**Button Position**:
- Thumb buttons are ideal
- Top wheel buttons work well
- Avoid shifter paddles (if you use them)

**Testing**:
- Test in practice before racing
- Verify button doesn't interfere with driving
- Make sure it's comfortable to hold while talking

---

## Advanced: Multiple Buttons

You can configure different buttons for different team members:

```python
# Engineer on button 5
# Strategist on button 6
# etc.
```

(Future feature - currently single PTT button)
