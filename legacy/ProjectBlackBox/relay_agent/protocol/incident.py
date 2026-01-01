from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from .base import RelayMessage

class Incident(RelayMessage):
    type: str = Field(default='incident', pattern='^incident$')
    cars: List[int]
    carNames: Optional[List[str]] = None
    driverNames: Optional[List[str]] = None
    lap: int
    corner: int
    cornerName: Optional[str] = None
    trackPosition: float
    severity: Literal['low', 'med', 'high']
    disciplineContext: str
    rawData: Optional[Dict[str, Any]] = None
