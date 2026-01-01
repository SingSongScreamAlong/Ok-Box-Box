from pydantic import BaseModel, Field
from typing import Optional
import time

class RelayMessage(BaseModel):
    type: str
    sessionId: str
    timestamp: float
    schemaVersion: str = Field(default="v1")
