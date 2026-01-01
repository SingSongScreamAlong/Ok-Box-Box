# Voice Race Engineer - Complete Guide

Conversational AI race engineer with real-time voice I/O for natural communication during iRacing sessions.

---

## 🎯 Overview

The **Voice Race Engineer** provides a professional race engineer experience where drivers can:

- **Talk naturally** to their engineer during races
- **Ask questions** about gaps, tires, fuel, strategy, pace
- **Receive voice responses** in real-time
- **Get data-driven coaching** based on live telemetry
- **Communicate hands-free** while focusing on driving

Think **F1 team radio** or **IndyCar race engineer** communication - natural, concise, data-backed.

---

## 🎤 How It Works

### Architecture

```
Driver (Microphone)
    ↓
Voice Input (Speech-to-Text via OpenAI Whisper)
    ↓
Natural Language Processing (GPT-4 with race context)
    ↓
Race Engineer Response (Context-aware, data-driven)
    ↓
Voice Output (Text-to-Speech via ElevenLabs)
    ↓
Driver (Speakers/Headset)
```

### Context Awareness

The engineer has **real-time access** to:
- Current lap and sector
- Position and gaps (ahead/behind)
- Tire temperatures (all 4 corners)
- Fuel level
- Lap times (current, last, best)
- Flag status (green, yellow, red)
- Pit status
- Track and session info

---

## 🚀 Quick Start

### Method 1: Real-Time iRacing Integration (Recommended)

```python
# relay_agent/voice_race_engineer.py
import asyncio
from voice_race_engineer import VoiceRaceEngineer

# Initialize
engineer = VoiceRaceEngineer(
    api_key="YOUR_OPENAI_API_KEY",
    elevenlabs_key="YOUR_ELEVENLABS_API_KEY"
)

# Connect to PitBox server
await engineer.connect_to_server("ws://localhost:4000/api/voice/stream?sessionId=SESSION_ID")

# Start listening for driver commands
engineer.start_listening()

# Driver can now speak naturally!
```

### Method 2: API-Based Communication

```bash
# 1. Initialize voice session
curl -X POST http://localhost:4000/api/voice/session/init \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "driverId": "driver-456"
  }'

# Response:
{
  "success": true,
  "sessionId": "session-123",
  "wsUrl": "/api/voice/stream?sessionId=session-123"
}

# 2. Send driver message (text)
curl -X POST http://localhost:4000/api/voice/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "text": "What's my gap to P1?",
    "includeVoice": true
  }'

# Response:
{
  "success": true,
  "driverMessage": "What's my gap to P1?",
  "engineerResponse": "You're 3.2 seconds behind P1, gaining 2 tenths per lap.",
  "audioUrl": "/api/voice/audio/engineer_abc123.mp3",
  "timestamp": 1701234567890
}

# 3. Or upload audio file
curl -X POST http://localhost:4000/api/voice/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "sessionId=session-123" \
  -F "audio=@driver_voice.wav" \
  -F "includeVoice=true"
```

---

## 💬 Example Conversations

### Gap Information

```
Driver: "What's my gap?"
Engineer: "2.3 seconds to P3, you're gaining 2 tenths per lap. Keep this pace."

Driver: "How far ahead is the leader?"
Engineer: "Leader is 8.5 seconds ahead. You're in P4."

Driver: "Am I catching the car in front?"
Engineer: "Yes, you're gaining 0.15 per lap. Gap is now 1.8 seconds."
```

### Tire Management

```
Driver: "How are my tires?"
Engineer: "Fronts are at 92°C, rears at 95°C. You're in the optimal window, keep pushing."

Driver: "Can I push harder?"
Engineer: "Yes, tire temps are good. You have grip."

Driver: "Are my tires overheating?"
Engineer: "Left front is at 105°C, slightly warm. Consider easing off in the fast corners."
```

### Fuel Strategy

```
Driver: "Do I need to save fuel?"
Engineer: "You're good on fuel for 12 more laps. No need to lift and coast."

Driver: "Can I make it to the end?"
Engineer: "Current fuel will last 15 laps. You have 18 to go. Start saving 10% throttle."

Driver: "How much fuel left?"
Engineer: "8.5 liters remaining. That's 10 laps at current consumption."
```

### Pace Analysis

```
Driver: "What was my last lap?"
Engineer: "Last lap 1:32.451, that's 3 tenths off your best."

Driver: "Am I faster than the car ahead?"
Engineer: "You're matching their pace. Last lap was identical at 1:32.4."

Driver: "Where am I losing time?"
Engineer: "You're 2 tenths slower in sector 2. Focus on Turn 5 and 6."
```

### Strategy & Pit Stops

```
Driver: "Should I pit?"
Engineer: "Box this lap. We'll undercut P3."

Driver: "How many laps on these tires?"
Engineer: "You've done 15 laps on this set. Fronts are showing wear."

Driver: "What's the strategy?"
Engineer: "Stay out 3 more laps, then pit for mediums. You'll come out P2."
```

### Position & Standing

```
Driver: "What position am I in?"
Engineer: "You're P4, running clean in your stint."

Driver: "How many cars ahead?"
Engineer: "Three cars ahead. P1, P2, and P3 within 8 seconds."

Driver: "Am I on the lead lap?"
Engineer: "Yes, you're on the lead lap in P4."
```

---

## 🎓 Supported Commands

The engineer understands natural racing language:

### Gap & Position Queries
- "What's my gap?"
- "How far to P1?"
- "Distance to car behind?"
- "Am I catching them?"
- "What position am I in?"

### Tire Questions
- "How are my tires?"
- "Tire temperatures?"
- "Can I push?"
- "Are tires overheating?"
- "Tire wear?"

### Fuel Management
- "Do I need to save fuel?"
- "How much fuel left?"
- "Can I make it?"
- "Fuel for how many laps?"
- "Should I lift and coast?"

### Pace & Performance
- "What was my last lap?"
- "Am I faster?"
- "Delta to my best?"
- "Sector times?"
- "Where am I slow?"

### Strategy
- "Should I pit?"
- "When to box?"
- "What's the undercut window?"
- "Stint length?"
- "Tire strategy?"

### General
- "What's the flag?"
- "Track conditions?"
- "Any damage?"
- "How's the car?"

Get full list:
```bash
GET /api/voice/commands
```

---

## 🔧 Setup & Configuration

### 1. Install Python Dependencies

```bash
cd relay_agent
pip install -r requirements.txt
```

Required packages:
- `openai>=1.10.0` - Speech recognition (Whisper) and conversation (GPT-4)
- `PyAudio>=0.2.13` - Microphone input
- `websockets>=11.0.0` - Real-time communication
- `numpy>=1.21.0` - Audio processing

### 2. Install Node Dependencies

```bash
cd server
npm install
```

New packages:
- `multer` - Audio file uploads
- `ws` - WebSocket server
- `@types/multer` - TypeScript types
- `@types/ws` - TypeScript types

### 3. Set Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-...                # Required for speech-to-text and AI
ELEVENLABS_API_KEY=...               # Optional for voice output
```

### 4. Start Server

```bash
cd server
npm run build
npm start
```

Server starts on `http://localhost:4000` with:
- REST API: `/api/voice/*`
- WebSocket: `ws://localhost:4000/api/voice/stream`

---

## 🎮 Integration with iRacing

### Relay Agent Integration

```python
# relay_agent/iracing_relay.py
from voice_race_engineer import VoiceRaceEngineer
import irsdk

# Initialize
ir = irsdk.IRSDK()
engineer = VoiceRaceEngineer()

# Connect to iRacing
ir.startup()

# Start voice session
engineer.start_listening()

# Main telemetry loop
while True:
    # Get telemetry
    telemetry = {
        'session_id': session_id,
        'lap': ir['Lap'],
        'position': ir['Position'],
        'speed': ir['Speed'] * 3.6,
        'fuel': ir['FuelLevel'],
        'tire_temp_lf': ir['LFtempCL'],
        'tire_temp_rf': ir['RFtempCL'],
        'tire_temp_lr': ir['LRtempCL'],
        'tire_temp_rr': ir['RRtempCL'],
        'gap_ahead': ir['GapAhead'],
        'gap_behind': ir['GapBehind'],
        'last_lap_time': ir['LapLastLapTime'],
        'best_lap_time': ir['LapBestLapTime'],
        'flag': get_flag_status(ir['SessionFlags']),
        'in_pit': ir['OnPitRoad']
    }

    # Update engineer context
    engineer.update_context(telemetry)

    # Engineer now has real-time data for responses
    time.sleep(0.1)
```

### Automatic Context Updates

The voice system **automatically receives** telemetry updates via:

```typescript
// POST /api/voice/context/:sessionId
{
  "lap": 15,
  "position": 4,
  "gapAhead": 2.3,
  "tireTempLF": 92,
  "fuel": 12.5,
  // ... all telemetry fields
}
```

The engineer uses this data to provide **accurate, real-time responses**.

---

## 🔊 Voice I/O Options

### Input (Speech-to-Text)

**Option 1: Live Microphone** (Recommended for racing)
```python
engineer = VoiceRaceEngineer()
engineer.start_listening()
# Speak naturally - voice activity detection handles recording
```

**Option 2: Audio File Upload**
```bash
curl -X POST http://localhost:4000/api/voice/message \
  -F "sessionId=session-123" \
  -F "audio=@voice_recording.wav"
```

**Option 3: Text Input** (Testing/Debugging)
```bash
curl -X POST http://localhost:4000/api/voice/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-123", "text": "What's my gap?"}'
```

### Output (Text-to-Speech)

**Option 1: ElevenLabs Voice** (Professional quality)
```python
engineer = VoiceRaceEngineer(elevenlabs_key="YOUR_KEY")
audio = await engineer.generate_voice_response("You're 2.3 seconds behind.")
# Returns audio data ready to play
```

**Option 2: API with Voice**
```bash
curl -X POST http://localhost:4000/api/voice/message \
  -d '{"text": "What's my gap?", "includeVoice": true}'

# Response includes audioUrl:
{
  "engineerResponse": "...",
  "audioUrl": "/api/voice/audio/engineer_abc123.mp3"
}
```

**Option 3: Text Only** (Faster, no audio)
```bash
curl -X POST http://localhost:4000/api/voice/message \
  -d '{"text": "What's my gap?", "includeVoice": false}'
```

---

## 📡 WebSocket Real-Time Communication

For **lowest latency** voice communication:

```javascript
// Client-side JavaScript
const ws = new WebSocket('ws://localhost:4000/api/voice/stream?sessionId=session-123');

ws.onopen = () => {
  console.log('Voice channel open');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'engineer_response') {
    console.log('Engineer:', message.text);
    // Play audio or display text
  }

  if (message.type === 'context_update') {
    console.log('Telemetry updated:', message.data);
  }
};

// Send driver message
ws.send(JSON.stringify({
  type: 'driver_message',
  text: "What's my gap?"
}));
```

---

## 🧠 How the AI Works

### System Prompt (Generated Dynamically)

```
You are a professional race engineer for [Driver Name] at [Track Name].

Current Race Status:
- Lap: 15
- Position: P4
- Gap to car ahead: 2.3s
- Gap to car behind: 1.8s
- Last lap: 1:32.451s
- Best lap: 1:31.987s
- Fuel: 12.5L
- Tire temps: LF=92°C, RF=94°C, LR=96°C, RR=95°C
- Flag: green
- In pit: false

Instructions:
- Provide clear, concise responses (1-2 sentences max)
- Be supportive and professional like a real F1/IndyCar engineer
- Use data to back up your advice
- Respond naturally to questions about gaps, tires, fuel, strategy
- Use racing terminology (delta, stint, deg, undercut, etc.)
- Keep responses brief - driver needs to focus on driving
```

### Response Generation

1. **Driver speaks**: "How are my tires?"
2. **Whisper transcribes**: Text extracted from audio
3. **GPT-4 processes**: Context + history + driver message
4. **Engineer responds**: "Fronts are at 92°C, rears at 95°C. You're in the optimal window, keep pushing."
5. **ElevenLabs synthesizes**: Text → professional voice audio
6. **Driver hears**: Response plays through speakers

### Conversation Memory

The system maintains **conversation history** (last 10 exchanges) for context:

```
Driver: "What's my gap?"
Engineer: "2.3 seconds to P3, gaining 2 tenths per lap."

Driver: "Should I push harder?"
Engineer: "Yes, keep this pace. You're catching them."
         ↑ Knows "them" refers to P3 from previous message
```

---

## 🎯 Best Practices

### For Maximum Accuracy

1. **Clear Audio Environment**
   - Minimize background noise
   - Use headset with noise cancellation
   - Position mic close to mouth

2. **Natural Speech**
   - Speak clearly and naturally
   - No need to pause between words
   - Use racing terminology the engineer understands

3. **Context Timing**
   - Ask relevant questions at appropriate times
   - Engineer responses are based on **current** telemetry
   - Real-time data = accurate answers

4. **Keep It Brief**
   - Short questions get fast responses
   - Engineer keeps responses concise (1-2 sentences)
   - Focus on actionable information

### During Racing

**DO:**
- ✅ "Gap?" or "What's my gap?" - Quick, clear
- ✅ "Tires?" or "How are tires?" - Brief
- ✅ "Should I pit?" - Direct strategy question
- ✅ "Fuel check" - Fast info request

**DON'T:**
- ❌ Long, complex questions while driving
- ❌ Asking about data the engineer doesn't have
- ❌ Expecting instant responses (allow 2-3 seconds)

---

## 🔍 API Reference

### Initialize Voice Session
```
POST /api/voice/session/init
Authorization: Bearer {token}

Body:
{
  "sessionId": "string",
  "driverId": "string"
}

Response:
{
  "success": true,
  "sessionId": "string",
  "wsUrl": "string"
}
```

### Send Message
```
POST /api/voice/message
Authorization: Bearer {token}

Body (JSON):
{
  "sessionId": "string",
  "text": "string",
  "includeVoice": boolean (optional)
}

OR Multipart:
{
  "sessionId": "string",
  "audio": file,
  "includeVoice": boolean (optional)
}

Response:
{
  "success": true,
  "driverMessage": "string",
  "engineerResponse": "string",
  "audioUrl": "string | null",
  "timestamp": number
}
```

### Update Context
```
POST /api/voice/context/:sessionId
Authorization: Bearer {token}

Body: {telemetry data}

Response:
{
  "success": true,
  "context": EngineerContext
}
```

### Get Conversation History
```
GET /api/voice/history/:sessionId
Authorization: Bearer {token}

Response:
{
  "sessionId": "string",
  "conversationHistory": ConversationMessage[],
  "context": EngineerContext
}
```

### Get Available Commands
```
GET /api/voice/commands
Authorization: Bearer {token}

Response:
{
  "commands": [
    {
      "category": "Gap Information",
      "examples": ["What's my gap?", "Distance to car ahead?", ...]
    },
    ...
  ]
}
```

### End Session
```
DELETE /api/voice/session/:sessionId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Voice session ended"
}
```

---

## 🧪 Testing

### Interactive Test Mode

```python
# Test voice I/O without iRacing
import asyncio
from voice_race_engineer import VoiceRaceEngineer

async def test():
    engineer = VoiceRaceEngineer()

    # Simulate race context
    engineer.update_context({
        'session_id': 'test-123',
        'driver_name': 'Test Driver',
        'track_name': 'Test Track',
        'lap': 10,
        'position': 3,
        'gap_ahead': 2.5,
        'gap_behind': 1.8,
        'fuel': 15.0,
        'tire_temp_lf': 95,
        'tire_temp_rf': 93,
        'tire_temp_lr': 97,
        'tire_temp_rr': 96,
        'last_lap_time': 92.451,
        'best_lap_time': 91.987
    })

    # Run interactive session
    await engineer.run_interactive_session()

asyncio.run(test())
```

### API Testing

```bash
# 1. Start server
npm start

# 2. Initialize session
curl -X POST http://localhost:4000/api/voice/session/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sessionId": "test-123", "driverId": "driver-1"}'

# 3. Update context
curl -X POST http://localhost:4000/api/voice/context/test-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"lap": 5, "position": 2, "gapAhead": 1.5, "tireTempLF": 95}'

# 4. Send test message
curl -X POST http://localhost:4000/api/voice/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sessionId": "test-123", "text": "What's my gap?"}'

# 5. Check response
# Should return: "1.5 seconds to P1. Keep pushing."
```

---

## 🎬 Complete Workflow Example

```python
"""
Complete iRacing voice engineer integration
"""
import asyncio
import irsdk
from voice_race_engineer import VoiceRaceEngineer
import requests
import time

# Configuration
SERVER_URL = "http://localhost:4000"
JWT_TOKEN = "your-jwt-token"

async def main():
    # 1. Connect to iRacing
    ir = irsdk.IRSDK()
    if not ir.startup():
        print("iRacing not running")
        return

    print("✓ Connected to iRacing")

    # 2. Initialize voice engineer
    engineer = VoiceRaceEngineer()
    print("✓ Voice engineer initialized")

    # 3. Create session on server
    session_id = "live-session-" + str(int(time.time()))
    response = requests.post(
        f"{SERVER_URL}/api/voice/session/init",
        headers={"Authorization": f"Bearer {JWT_TOKEN}"},
        json={
            "sessionId": session_id,
            "driverId": "driver-123"
        }
    )
    print(f"✓ Voice session created: {session_id}")

    # 4. Start voice listening
    engineer.start_listening()
    print("✓ Listening for driver commands...")

    # 5. Main telemetry loop
    try:
        while True:
            # Get telemetry from iRacing
            telemetry = {
                'session_id': session_id,
                'lap': ir['Lap'],
                'position': ir['Position'],
                'gap_ahead': ir['GapAhead'],
                'gap_behind': ir['GapBehind'],
                'speed': ir['Speed'] * 3.6,
                'fuel': ir['FuelLevel'],
                'tire_temp_lf': ir['LFtempCL'],
                'tire_temp_rf': ir['RFtempCL'],
                'tire_temp_lr': ir['LRtempCL'],
                'tire_temp_rr': ir['RRtempCL'],
                'last_lap_time': ir['LapLastLapTime'],
                'best_lap_time': ir['LapBestLapTime'],
                'flag': 'green',  # Parse from ir['SessionFlags']
                'in_pit': ir['OnPitRoad']
            }

            # Update local context
            engineer.update_context(telemetry)

            # Update server context
            requests.post(
                f"{SERVER_URL}/api/voice/context/{session_id}",
                headers={"Authorization": f"Bearer {JWT_TOKEN}"},
                json=telemetry
            )

            # Process any voice messages
            if not engineer.audio_queue.empty():
                audio_file = engineer.audio_queue.get()

                # Transcribe and get response
                text = await engineer.transcribe_audio(audio_file)
                if text:
                    print(f"\n🗣️  Driver: {text}")
                    response = await engineer.process_driver_message(text)
                    print(f"🏁 Engineer: {response}")

                    # Generate and play voice
                    audio = await engineer.generate_voice_response(response)
                    if audio:
                        # Play audio through speakers
                        # (Implementation depends on platform)
                        pass

            await asyncio.sleep(0.1)

    except KeyboardInterrupt:
        print("\n\n⚠️  Session ended")
    finally:
        engineer.stop_listening()
        ir.shutdown()

if __name__ == '__main__':
    asyncio.run(main())
```

---

## 🚀 Result

You now have a **professional voice race engineer** with:

- ✅ **Natural conversation** - Talk like you would to a real engineer
- ✅ **Real-time speech recognition** - OpenAI Whisper transcription
- ✅ **Context-aware AI** - GPT-4 with live telemetry data
- ✅ **Professional voice output** - ElevenLabs text-to-speech
- ✅ **Hands-free operation** - Voice activity detection
- ✅ **Low latency** - WebSocket real-time communication
- ✅ **Racing-specific NLP** - Understands gaps, tires, fuel, strategy
- ✅ **Conversation memory** - Remembers context from previous messages
- ✅ **Production-ready** - Authenticated API, rate limiting, error handling

**Quality:** Professional race engineering standard
**Latency:** ~2-3 seconds (speech → transcription → AI → synthesis)
**Accuracy:** Context-aware responses based on real telemetry
**Experience:** Like talking to a real F1/IndyCar engineer

---

**Created by:** PitBox Voice Race Engineer System
**Version:** 1.0 Production
**Last Updated:** 2025-11-30
