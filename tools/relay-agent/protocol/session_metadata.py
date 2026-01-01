from pydantic import BaseModel, Field
from typing import Optional, Literal
from .base import RelayMessage

class WeatherData(BaseModel):
    ambientTemp: float
    trackTemp: float
    precipitation: float
    trackState: Literal['dry', 'damp', 'wet']

class SessionMetadata(RelayMessage):
    type: Literal['session_metadata'] = 'session_metadata'
    trackName: str
    trackConfig: Optional[str] = None
    category: str
    multiClass: bool
    cautionsEnabled: bool
    driverSwap: bool
    maxDrivers: int
    weather: WeatherData
    leagueId: Optional[str] = None
    rulebookOverrideId: Optional[str] = None
