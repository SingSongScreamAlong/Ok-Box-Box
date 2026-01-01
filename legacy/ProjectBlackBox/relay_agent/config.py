"""
PitBox Relay Agent - Configuration
(Based on ControlBox Relay)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from root .env
root_env = Path(__file__).parent.parent / '.env'
local_env = Path(__file__).parent / '.env'

if root_env.exists():
    load_dotenv(root_env)
if local_env.exists():
    load_dotenv(local_env, override=True)

# PitBox Server Connection (local or cloud)
CLOUD_URL = os.getenv('BLACKBOX_SERVER_URL', 'http://localhost:3000')
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
