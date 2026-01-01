from pydantic import BaseModel, Field
from typing import Literal
from .base import RelayMessage

class RaceEvent(RelayMessage):
    type: str = Field(default='race_event', pattern='^race_event$')
    flagState: Literal['green', 'yellow', 'localYellow', 'caution', 'red', 'restart', 'checkered', 'white']
    lap: int
    timeRemaining: float
    sessionPhase: Literal['pre_race', 'formation', 'racing', 'caution', 'restart', 'finished']
