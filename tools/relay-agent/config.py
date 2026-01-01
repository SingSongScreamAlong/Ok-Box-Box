"""
PitBox Relay Agent - Configuration
(Based on ControlBox Relay)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root .env
# Monorepo structure: root/tools/relay-agent/config.py -> root/.env is 3 levels up
root_env = Path(__file__).parent.parent.parent / '.env'
local_env = Path(__file__).parent / '.env'

if root_env.exists():
    load_dotenv(root_env)
if local_env.exists():
    load_dotenv(local_env, override=True)

# PitBox Server Connection (local or cloud)
CLOUD_URL = os.getenv('BLACKBOX_SERVER_URL', 'https://octopus-app-qsi3i.ondigitalocean.app')
AI_AGENT_URL = os.getenv('AI_AGENT_URL', 'http://localhost:3001')

# Relay Identification
RELAY_ID = os.getenv('RELAY_ID', 'pitbox-relay-1')
RELAY_VERSION = '1.0.0'

# Telemetry
TELEMETRY_RATE_HZ = int(os.getenv('TELEMETRY_RATE_HZ', '10'))

# PTT Defaults (used by main.py if not using settings_manager directly)
PTT_TYPE = 'keyboard'
PTT_KEY = 'space'
JOYSTICK_ID = 0
JOYSTICK_BUTTON = 0

# Polling Configuration
POLL_RATE_HZ = int(os.getenv('POLL_RATE_HZ', '10'))  # Telemetry updates per second
POLL_INTERVAL = 1.0 / POLL_RATE_HZ

# Incident Detection Thresholds
INCIDENT_THRESHOLD = int(os.getenv('INCIDENT_THRESHOLD', '1'))  # Min incident count change to report
POSITION_JUMP_THRESHOLD = float(os.getenv('POSITION_JUMP_THRESHOLD', '0.05'))  # 5% track position jump

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_TELEMETRY = os.getenv('LOG_TELEMETRY', 'false').lower() == 'true'

# Video Streaming
VIDEO_FPS = int(os.getenv('VIDEO_FPS', '60'))
VIDEO_WIDTH = int(os.getenv('VIDEO_WIDTH', '854'))
VIDEO_HEIGHT = int(os.getenv('VIDEO_HEIGHT', '480'))
VIDEO_QUALITY = int(os.getenv('VIDEO_QUALITY', '70'))

# Session Types
SESSION_TYPES = {
    'Practice': 'practice',
    'Lone Qualify': 'qualifying',
    'Open Qualify': 'qualifying',
    'Qualify': 'qualifying',
    'Race': 'race',
    'Warmup': 'warmup',
    'Time Trial': 'practice'
}

# ========================
# Parallel Operation Configuration (Week 23)
# ========================

# Comma-separated backend URLs (e.g., "wss://gatewayA/relay,wss://gatewayB/relay")
RELAY_BACKENDS = os.getenv('RELAY_BACKENDS', '')

# Backend mode: 'single' (default, primary only) or 'parallel' (fan-out to all)
RELAY_BACKEND_MODE = os.getenv('RELAY_BACKEND_MODE', 'single')

# Primary target index when in single mode (0-indexed)
RELAY_PRIMARY_INDEX = int(os.getenv('RELAY_PRIMARY_INDEX', '0'))

# Connection timeout per target (ms)
RELAY_TARGET_TIMEOUT_MS = int(os.getenv('RELAY_TARGET_TIMEOUT_MS', '1500'))

# Send timeout per frame (ms)
RELAY_SEND_TIMEOUT_MS = int(os.getenv('RELAY_SEND_TIMEOUT_MS', '250'))

# Kill switch: if '1', do not connect to ANY backend (local-only mode)
RELAY_KILL_SWITCH = os.getenv('RELAY_KILL_SWITCH', '0') == '1'

# Per-target enabled flags (comma-separated, e.g., "1,1,0")
RELAY_TARGETS_ENABLED = os.getenv('RELAY_TARGETS_ENABLED', '')

# Parity sample rate: fraction of frames that request ack (0.0 - 1.0)
RELAY_PARITY_SAMPLE_RATE = float(os.getenv('RELAY_PARITY_SAMPLE_RATE', '0.05'))

# Debug server port (local only)
RELAY_DEBUG_PORT = int(os.getenv('RELAY_DEBUG_PORT', '8765'))

# Flag State Mapping (iRacing SessionFlags to PitBox)
FLAG_STATES = {
    'green': 'green',
    'checkered': 'checkered',
    'white': 'white',
    'yellow': 'yellow',
    'yellowWaving': 'yellow',
    'caution': 'caution',
    'cautionWaving': 'caution',
    'red': 'red',
    'blue': 'green',  # Blue flag doesn't change race state
    'debris': 'green',
    'crossed': 'green',
    'black': 'green',
    'disqualify': 'green',
    'repair': 'green',
    'startHidden': 'green',
    'startReady': 'green',
    'startSet': 'green',
    'startGo': 'green',
    'oneLapToGreen': 'restart',
    'greenHeld': 'green',
    'randomWaving': 'localYellow',
    'furled': 'green'
}
