"""
MoTeC i2 .ld File Structure Definitions
Based on public documentation and reverse engineering of MoTeC LD format.
"""
import struct

# Constants
LD_HEADER_SIZE = 64
LD_CHANNEL_HEADER_SIZE = 124

# Channel types
DATATYPE_SHORT = 0
DATATYPE_FLOAT = 3
DATATYPE_LONG = 5

class LDHeader:
    """Main file header"""
    def __init__(self):
        self.magic = 64  # Fixed magic number
        self.version = 0
        self.driver = ""
        self.vehicle = ""
        self.venue = ""
        self.date = ""
        self.time = ""
        self.comments = ""
        self.event_session = ""  # Run short comment
        
    def pack(self):
        # Implementation of header packing logic
        # For simplicity, we return a bytes object of correct size
        # Real implementation requires mapping fields to specific offsets
        # But for this MVP, we will use a simpler approach in the main exporter
        pass

class LDChannelHeader:
    """Channel definition header"""
    def __init__(self):
        self.name = ""
        self.unit = ""
        self.freq = 0
        self.dec = 0  # Decimal places
        self.scale = 1.0
        self.offset = 0.0
        self.datatype = DATATYPE_FLOAT
