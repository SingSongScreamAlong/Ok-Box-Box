from pydantic import BaseModel, Field
from typing import List, Optional
from .base import RelayMessage

class Position(BaseModel):
    s: float

class CarTelemetrySnapshot(BaseModel):
    carId: int
    driverId: Optional[str] = None
    speed: float
    gear: int
    pos: Position
    throttle: float
    brake: float
    steering: float
    rpm: Optional[float] = None
    inPit: bool
    lap: int
    classPosition: Optional[int] = None
    position: Optional[int] = None

class TelemetrySnapshot(RelayMessage):
    type: str = 'telemetry' # Relaxed literal for now or strict?
    # Strict literal usage in pydantic can be tricky with some versions, using Field default
    type: str = Field(default='telemetry', pattern='^telemetry$')
    cars: List[CarTelemetrySnapshot]
    sessionTimeMs: Optional[float] = None
