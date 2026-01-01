"""
ControlBox Relay Agent - iRacing SDK Reader
Wraps pyirsdk to provide clean access to iRacing data
"""
import logging
from typing import Optional, Dict, List, Any
from dataclasses import dataclass

try:
    import irsdk
except ImportError:
    print("ERROR: pyirsdk not installed. Run: pip install pyirsdk")
    print("NOTE: This only works on Windows with iRacing installed.")
    raise

logger = logging.getLogger(__name__)


@dataclass
class CarData:
    """Telemetry data for a single car"""
    car_id: int
    driver_id: str
    driver_name: str
    car_number: str
    car_name: str
    team_name: str
    irating: int
    safety_rating: float
    class_id: int
    class_name: str
    speed: float
    gear: int
    track_pct: float
    throttle: float
    brake: float
    steering: float
    clutch: float      # Added for controls stream
    rpm: float
    in_pit: bool
    lap: int
    position: int
    class_position: int
    incident_count: int
    last_lap_time: float
    best_lap_time: float
    
    # Strategy Data (Phase 11)
    fuel_level: float = 0.0    # Liters
    fuel_pct: float = 0.0      # % Tank
    tire_wear_fl: float = 1.0  # % Remaining (1.0 = New)
    tire_wear_fr: float = 1.0
    tire_wear_rl: float = 1.0
    tire_wear_rr: float = 1.0
    damage_aero: float = 0.0   # 0-1 (0 = No Damage)
    damage_engine: float = 0.0 # 0-1
    
    # Phase 16: Full SDK Ingestion
    # Tire Temperatures (Celsius) - L/M/R = Left/Middle/Right of tread
    tire_temp_fl_l: float = 0.0
    tire_temp_fl_m: float = 0.0
    tire_temp_fl_r: float = 0.0
    tire_temp_fr_l: float = 0.0
    tire_temp_fr_m: float = 0.0
    tire_temp_fr_r: float = 0.0
    tire_temp_rl_l: float = 0.0
    tire_temp_rl_m: float = 0.0
    tire_temp_rl_r: float = 0.0
    tire_temp_rr_l: float = 0.0
    tire_temp_rr_m: float = 0.0
    tire_temp_rr_r: float = 0.0
    
    # Brake Pressure (bar)
    brake_pressure_fl: float = 0.0
    brake_pressure_fr: float = 0.0
    brake_pressure_rl: float = 0.0
    brake_pressure_rr: float = 0.0
    
    # Engine Health
    oil_temp: float = 0.0      # Celsius
    oil_pressure: float = 0.0  # bar
    water_temp: float = 0.0    # Celsius
    voltage: float = 0.0       # Volts
    fuel_use_per_hour: float = 0.0  # kg/h
    
    # Tire Compound
    tire_compound: int = 0     # 0 = unknown, see iRacing compound IDs
    
    # Engine Warnings (bitfield)
    engine_warnings: int = 0   # irsdk_EngineWarnings flags

    lat: float = 0.0           # Latitude (player car only)
    lon: float = 0.0           # Longitude (player car only)
    alt: float = 0.0           # Altitude (player car only)
    velocity_x: float = 0.0    # X velocity (m/s)
    velocity_y: float = 0.0    # Y velocity (m/s)
    velocity_z: float = 0.0    # Z velocity (m/s)
    yaw: float = 0.0           # Heading angle (radians)
    is_player: bool = False    # Is this the local player?



@dataclass
class SessionData:
    """Session metadata"""
    session_id: str
    track_name: str
    track_config: str
    track_length: float
    session_type: str
    session_name: str
    weather_temp: float
    track_temp: float
    is_multiclass: bool
    max_drivers: int
    cautions_enabled: bool


class IRacingReader:
    """
    Reads data from iRacing via pyirsdk
    """
    
    def __init__(self):
        self.ir = irsdk.IRSDK()
        self.connected = False
        self._last_session_info = None
        self._last_incident_counts: Dict[int, int] = {}
        self._car_info_cache: Dict[int, Dict] = {}
    
    def connect(self) -> bool:
        """
        Attempt to connect to iRacing
        Returns True if connected successfully
        """
        if self.connected and self.ir.is_connected:
            return True
        
        try:
            if self.ir.startup():
                self.connected = True
                logger.info("✅ Connected to iRacing")
                self._update_car_info_cache()
                return True
            else:
                self.connected = False
                return False
        except Exception as e:
            logger.error(f"Failed to connect to iRacing: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from iRacing"""
        if self.ir:
            self.ir.shutdown()
        self.connected = False
        logger.info("Disconnected from iRacing")
    
    def is_connected(self) -> bool:
        """Check if connected and session is active"""
        if not self.connected:
            return False
        if not self.ir.is_connected:
            self.connected = False
            return False
        return True
    
    def _update_car_info_cache(self):
        """Update cached driver/car info from session info"""
        try:
            drivers = self.ir['DriverInfo']['Drivers']
            self._car_info_cache = {d['CarIdx']: d for d in drivers}
        except (KeyError, TypeError):
            pass
    
    def get_session_data(self) -> Optional[SessionData]:
        """Get current session metadata"""
        if not self.is_connected():
            return None
        
        try:
            weekend_info = self.ir['WeekendInfo']
            session_info = self.ir['SessionInfo']
            
            # Get current session
            session_num = self.ir['SessionNum']
            sessions = session_info.get('Sessions', [])
            current_session = sessions[session_num] if session_num < len(sessions) else {}
            
            # Determine if multiclass
            driver_info = self.ir['DriverInfo']
            class_ids = set()
            for driver in driver_info.get('Drivers', []):
                class_ids.add(driver.get('CarClassID', 0))
            is_multiclass = len(class_ids) > 1
            
            return SessionData(
                session_id=f"{weekend_info.get('SubSessionID', 0)}",
                track_name=weekend_info.get('TrackDisplayName', 'Unknown Track'),
                track_config=weekend_info.get('TrackConfigName', ''),
                track_length=float(weekend_info.get('TrackLength', '0 km').split()[0]),
                session_type=current_session.get('SessionType', 'Practice'),
                session_name=current_session.get('SessionName', 'Session'),
                weather_temp=float(weekend_info.get('TrackAirTemp', '20 C').split()[0]),
                track_temp=float(weekend_info.get('TrackSurfaceTemp', '30 C').split()[0]),
                is_multiclass=is_multiclass,
                max_drivers=len(driver_info.get('Drivers', [])),
                cautions_enabled=weekend_info.get('WeekendOptions', {}).get('HasOpenRegistration', False)
            )
        except Exception as e:
            logger.error(f"Error getting session data: {e}")
            return None
    
    def get_all_cars(self) -> List[CarData]:
        """Get telemetry for all cars in session"""
        if not self.is_connected():
            return []
        
        cars = []
        try:
            # Get indexed arrays from telemetry
            positions = self.ir['CarIdxPosition'] or []
            class_positions = self.ir['CarIdxClassPosition'] or []
            laps = self.ir['CarIdxLap'] or []
            lap_pcts = self.ir['CarIdxLapDistPct'] or []
            on_pit = self.ir['CarIdxOnPitRoad'] or []
            last_lap_times = self.ir['CarIdxLastLapTime'] or []
            best_lap_times = self.ir['CarIdxBestLapTime'] or []
            
            # Speed, gear, etc. are only available for player car in standard telemetry
            # For other cars, we estimate from position changes
            player_car_idx = self.ir['PlayerCarIdx']
            player_speed = self.ir['Speed'] or 0
            player_gear = self.ir['Gear'] or 0
            player_throttle = self.ir['Throttle'] or 0
            player_brake = self.ir['Brake'] or 0
            player_steering = self.ir['SteeringWheelAngle'] or 0
            player_clutch = self.ir['Clutch'] or 0
            player_rpm = self.ir['RPM'] or 0
            
            # Coordinate data (player car only for track map)
            player_lat = self.ir['Lat'] or 0
            player_lon = self.ir['Lon'] or 0
            player_alt = self.ir['Alt'] or 0
            player_vel_x = self.ir['VelocityX'] or 0
            player_vel_y = self.ir['VelocityY'] or 0
            player_vel_z = self.ir['VelocityZ'] or 0
            player_yaw = self.ir['Yaw'] or 0
            
            for car_idx, driver_info in self._car_info_cache.items():
                if car_idx >= len(positions) or positions[car_idx] <= 0:
                    continue  # Skip cars not in session
                
                # Get incident count for this car
                incident_count = 0
                try:
                    incident_count = self.ir['CarIdxSessionFlags'][car_idx] if self.ir['CarIdxSessionFlags'] else 0
                except (IndexError, TypeError):
                    pass
                
                # Populate coordinate data for player car only
                is_player = car_idx == player_car_idx
                
                car_data = CarData(
                    car_id=car_idx,
                    driver_id=str(driver_info.get('UserID', car_idx)),
                    driver_name=driver_info.get('UserName', f'Driver {car_idx}'),
                    car_number=driver_info.get('CarNumber', str(car_idx)),
                    car_name=driver_info.get('CarScreenName', 'Unknown Car'),
                    team_name=driver_info.get('TeamName', ''),
                    irating=int(driver_info.get('IRating', 0)),
                    safety_rating=float(driver_info.get('LicString', '0.00').replace('A', '').replace('B', '').replace('C', '').replace('D', '').replace('R', '').replace(' ', '') or 0),
                    class_id=driver_info.get('CarClassID', 0),
                    class_name=driver_info.get('CarClassShortName', ''),
                    speed=player_speed if is_player else 0,
                    gear=player_gear if is_player else 0,
                    track_pct=lap_pcts[car_idx] if car_idx < len(lap_pcts) else 0,
                    throttle=player_throttle if is_player else 0,
                    brake=player_brake if is_player else 0,
                    steering=player_steering if is_player else 0,
                    clutch=player_clutch if is_player else 0,
                    rpm=player_rpm if is_player else 0,
                    in_pit=bool(on_pit[car_idx]) if car_idx < len(on_pit) else False,
                    lap=laps[car_idx] if car_idx < len(laps) else 0,
                    position=positions[car_idx] if car_idx < len(positions) else 0,
                    class_position=class_positions[car_idx] if car_idx < len(class_positions) else 0,
                    incident_count=incident_count,
                    last_lap_time=last_lap_times[car_idx] if car_idx < len(last_lap_times) else 0,
                    best_lap_time=best_lap_times[car_idx] if car_idx < len(best_lap_times) else 0,
                    # Coordinate fields (player car only)
                    lat=player_lat if is_player else 0,
                    lon=player_lon if is_player else 0,
                    alt=player_alt if is_player else 0,
                    velocity_x=player_vel_x if is_player else 0,
                    velocity_y=player_vel_y if is_player else 0,
                    velocity_z=player_vel_z if is_player else 0,
                    yaw=player_yaw if is_player else 0,
                    is_player=is_player,
                    
                    # Strategy Data (Phase 11) - Player Only (mostly)
                    fuel_level=self.ir['FuelLevel'] if is_player else 0.0,
                    fuel_pct=self.ir['FuelLevelPct'] if is_player else 0.0,
                    # Tires: iRacing gives L/M/R wear. Use average per tire.
                    tire_wear_fl=(self.ir['LFwearL'] + self.ir['LFwearM'] + self.ir['LFwearR']) / 3.0 if is_player and self.ir['LFwearL'] else 1.0,
                    tire_wear_fr=(self.ir['RFwearL'] + self.ir['RFwearM'] + self.ir['RFwearR']) / 3.0 if is_player and self.ir['RFwearL'] else 1.0,
                    tire_wear_rl=(self.ir['LRwearL'] + self.ir['LRwearM'] + self.ir['LRwearR']) / 3.0 if is_player and self.ir['LRwearL'] else 1.0,
                    tire_wear_rr=(self.ir['RRwearL'] + self.ir['RRwearM'] + self.ir['RRwearR']) / 3.0 if is_player and self.ir['RRwearL'] else 1.0,
                    
                    # Phase 16: Real Damage from EngineWarnings
                    damage_aero=self._get_aero_damage() if is_player else 0.0,
                    damage_engine=self._get_engine_damage() if is_player else 0.0,
                    
                    # Tire Temperatures
                    tire_temp_fl_l=self.ir['LFtempCL'] or 0.0 if is_player else 0.0,
                    tire_temp_fl_m=self.ir['LFtempCM'] or 0.0 if is_player else 0.0,
                    tire_temp_fl_r=self.ir['LFtempCR'] or 0.0 if is_player else 0.0,
                    tire_temp_fr_l=self.ir['RFtempCL'] or 0.0 if is_player else 0.0,
                    tire_temp_fr_m=self.ir['RFtempCM'] or 0.0 if is_player else 0.0,
                    tire_temp_fr_r=self.ir['RFtempCR'] or 0.0 if is_player else 0.0,
                    tire_temp_rl_l=self.ir['LRtempCL'] or 0.0 if is_player else 0.0,
                    tire_temp_rl_m=self.ir['LRtempCM'] or 0.0 if is_player else 0.0,
                    tire_temp_rl_r=self.ir['LRtempCR'] or 0.0 if is_player else 0.0,
                    tire_temp_rr_l=self.ir['RRtempCL'] or 0.0 if is_player else 0.0,
                    tire_temp_rr_m=self.ir['RRtempCM'] or 0.0 if is_player else 0.0,
                    tire_temp_rr_r=self.ir['RRtempCR'] or 0.0 if is_player else 0.0,
                    
                    # Brake Pressure
                    brake_pressure_fl=self.ir['LFbrakeLinePress'] or 0.0 if is_player else 0.0,
                    brake_pressure_fr=self.ir['RFbrakeLinePress'] or 0.0 if is_player else 0.0,
                    brake_pressure_rl=self.ir['LRbrakeLinePress'] or 0.0 if is_player else 0.0,
                    brake_pressure_rr=self.ir['RRbrakeLinePress'] or 0.0 if is_player else 0.0,
                    
                    # Engine Health
                    oil_temp=self.ir['OilTemp'] or 0.0 if is_player else 0.0,
                    oil_pressure=self.ir['OilPress'] or 0.0 if is_player else 0.0,
                    water_temp=self.ir['WaterTemp'] or 0.0 if is_player else 0.0,
                    voltage=self.ir['Voltage'] or 0.0 if is_player else 0.0,
                    fuel_use_per_hour=self.ir['FuelUsePerHour'] or 0.0 if is_player else 0.0,
                    
                    # Tire Compound
                    tire_compound=self.ir['PlayerTireCompound'] or 0 if is_player else 0,
                    
                    # Engine Warnings
                    engine_warnings=self.ir['EngineWarnings'] or 0 if is_player else 0
                )
                cars.append(car_data)
            
        except Exception as e:
            logger.error(f"Error getting car data: {e}")
        
        return cars
    # =========================================================================
    # Phase 16: Damage Detection from EngineWarnings
    # =========================================================================
    
    # iRacing EngineWarnings bitfield flags
    ENGINE_WARNING_WATER_TEMP = 0x01
    ENGINE_WARNING_FUEL_PRESSURE = 0x02
    ENGINE_WARNING_OIL_PRESSURE = 0x04
    ENGINE_WARNING_ENGINE_STALLED = 0x08
    ENGINE_WARNING_PIT_SPEED_LIMITER = 0x10
    ENGINE_WARNING_REV_LIMITER = 0x20
    ENGINE_WARNING_OIL_TEMP = 0x40
    
    def _get_aero_damage(self) -> float:
        """
        Infer aero damage from available data.
        iRacing doesn't directly expose aero damage, so we use session flags.
        Returns 0.0 (no damage) to 1.0 (severe damage).
        """
        try:
            # Check for meatball flag (mechanical issue)
            session_flags = self.ir['SessionFlags'] or 0
            if session_flags & irsdk.Flags.repair:
                return 1.0  # Required to pit for repairs
            if session_flags & irsdk.Flags.black:
                return 0.5  # Black flagged (possible damage)
            return 0.0
        except Exception:
            return 0.0
    
    def _get_engine_damage(self) -> float:
        """
        Parse EngineWarnings bitfield to detect engine issues.
        Returns 0.0 (healthy) to 1.0 (critical damage).
        """
        try:
            warnings = self.ir['EngineWarnings'] or 0
            damage = 0.0
            
            # Oil pressure warning is serious
            if warnings & self.ENGINE_WARNING_OIL_PRESSURE:
                damage += 0.4
            
            # Water temp warning means overheating
            if warnings & self.ENGINE_WARNING_WATER_TEMP:
                damage += 0.3
            
            # Oil temp warning
            if warnings & self.ENGINE_WARNING_OIL_TEMP:
                damage += 0.2
            
            # Fuel pressure warning
            if warnings & self.ENGINE_WARNING_FUEL_PRESSURE:
                damage += 0.3
            
            # Engine stalled is critical
            if warnings & self.ENGINE_WARNING_ENGINE_STALLED:
                damage = 1.0
            
            return min(damage, 1.0)
        except Exception:
            return 0.0

    def get_flag_state(self) -> str:
        """Get current flag state"""
        if not self.is_connected():
            return 'green'
        
        try:
            flags = self.ir['SessionFlags']
            if flags is None:
                return 'green'
            
            # Check flags in priority order
            if flags & irsdk.Flags.checkered:
                return 'checkered'
            if flags & irsdk.Flags.white:
                return 'white'
            if flags & irsdk.Flags.red:
                return 'red'
            if flags & irsdk.Flags.caution or flags & irsdk.Flags.caution_waving:
                return 'caution'
            if flags & irsdk.Flags.yellow or flags & irsdk.Flags.yellow_waving:
                return 'yellow'
            
            return 'green'
        except Exception as e:
            logger.error(f"Error getting flag state: {e}")
            return 'green'
    
    def get_session_time(self) -> float:
        """Get session time remaining (seconds)"""
        if not self.is_connected():
            return 0
        try:
            return self.ir['SessionTimeRemain'] or 0
        except:
            return 0
    
    def get_leader_lap(self) -> int:
        """Get current lap of race leader"""
        if not self.is_connected():
            return 0
        try:
            laps = self.ir['CarIdxLap'] or []
            return max(laps) if laps else 0
        except:
            return 0
    
    def detect_incidents(self) -> List[Dict[str, Any]]:
        """
        Detect new incidents by monitoring incident count changes
        Returns list of incident events
        """
        incidents = []
        if not self.is_connected():
            return incidents
        
        try:
            cars = self.get_all_cars()
            for car in cars:
                prev_count = self._last_incident_counts.get(car.car_id, 0)
                if car.incident_count > prev_count:
                    # Incident detected!
                    incidents.append({
                        'cars': [car.car_id],
                        'car_names': [car.car_name],
                        'driver_names': [car.driver_name],
                        'lap': car.lap,
                        'track_position': car.track_pct,
                        'severity': 'med',  # Default severity
                        'incident_delta': car.incident_count - prev_count
                    })
                self._last_incident_counts[car.car_id] = car.incident_count
        except Exception as e:
            logger.error(f"Error detecting incidents: {e}")
        
        return incidents
    
    def freeze_frame(self):
        """Freeze telemetry data for consistent reads"""
        if self.is_connected():
            self.ir.freeze_var_buffer_latest()
    
    def unfreeze_frame(self):
        """Unfreeze telemetry data"""
        if self.is_connected():
            self.ir.unfreeze_var_buffer_latest()
