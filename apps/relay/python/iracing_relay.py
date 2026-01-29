#!/usr/bin/env python3
"""
iRacing Telemetry Relay - OPTIMIZED
Reads telemetry from iRacing at 60Hz and serves via Socket.IO.
Sends session_metadata, telemetry (60Hz), and strategy_update (1Hz).
"""

import asyncio
import logging
import time
from typing import Optional, Any, Dict

# Socket.IO server
from aiohttp import web
import socketio

# Try to import iRacing SDK
try:
    import irsdk
    IRSDK_AVAILABLE = True
except ImportError:
    IRSDK_AVAILABLE = False
    print("WARNING: pyirsdk not installed. Install with: pip install pyirsdk")

# Minimal logging in production
logging.basicConfig(level=logging.WARNING, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Socket.IO server - optimized settings
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*',
    ping_timeout=10,
    ping_interval=5,
    max_http_buffer_size=1024 * 100  # 100KB max
)
app = web.Application()
sio.attach(app)

# iRacing SDK instance
ir: Optional[Any] = None
connected_to_sim = False
last_telemetry: Optional[dict] = None
current_session_id: Optional[str] = None
session_metadata_sent = False
last_strategy_time = 0
last_incident_count = 0  # Track incident count changes

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('status', {'simConnected': connected_to_sim}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

async def check_iracing():
    """Check if iRacing is running and connect to it."""
    global ir, connected_to_sim, current_session_id, session_metadata_sent
    
    if not IRSDK_AVAILABLE:
        return False
    
    if ir is None:
        ir = irsdk.IRSDK()
    
    if not ir.is_connected:
        if ir.startup():
            connected_to_sim = True
            session_metadata_sent = False  # Reset for new session
            current_session_id = None
            logger.info("Connected to iRacing!")
            await sio.emit('status', {'simConnected': True})
            return True
        else:
            if connected_to_sim:
                connected_to_sim = False
                session_metadata_sent = False
                current_session_id = None
                logger.info("Disconnected from iRacing")
                await sio.emit('status', {'simConnected': False})
            return False
    
    return True

async def send_session_metadata():
    """Send session metadata once per session."""
    global current_session_id, session_metadata_sent
    
    if not ir or not ir.is_connected or session_metadata_sent:
        return
    
    try:
        # Get session info
        session_info = ir['WeekendInfo']
        if not session_info:
            return
            
        track_name = session_info.get('TrackName', 'Unknown Track')
        session_id = f"live_{int(time.time())}"  # Unique session ID based on timestamp
        
        # Get session type
        session_num = ir['SessionNum'] or 0
        sessions = ir['SessionInfo']['Sessions'] if ir['SessionInfo'] else []
        session_type = 'practice'
        if sessions and len(sessions) > session_num:
            session_type = sessions[session_num].get('SessionType', 'practice').lower()
        
        current_session_id = session_id
        
        metadata = {
            'sessionId': session_id,
            'trackName': track_name,
            'sessionType': session_type,
            'timestamp': time.time()
        }
        
        await sio.emit('session_metadata', metadata)
        session_metadata_sent = True
        logger.info(f"Sent session metadata: {track_name} ({session_type})")
        
    except Exception as e:
        logger.error(f"Error sending session metadata: {e}")

def read_telemetry_sync() -> Optional[Dict]:
    """Read telemetry from iRacing - synchronous for speed.
    Returns data in server-expected format with sessionId and cars array.
    Also includes HUD display data (gear, rpm, fuel).
    """
    global last_telemetry
    
    if not ir or not ir.is_connected or not current_session_id:
        return None
    
    # Freeze the data for this frame
    ir.freeze_var_buffer_latest()
    
    try:
        t = time.time()
        player_car_idx = ir['PlayerCarIdx'] or 0
        
        # Build comprehensive car data for player
        driver_info = ir['DriverInfo']['Drivers'][player_car_idx] if ir['DriverInfo'] else {}
        
        car_data = {
            'carId': player_car_idx,
            'driverId': str(player_car_idx),
            'driverName': driver_info.get('UserName', 'Driver'),
            'carName': driver_info.get('CarScreenName', 'Unknown Car'),
            'carClass': driver_info.get('CarClassShortName', ''),
            'iRating': driver_info.get('IRating', 0),
            'licenseLevel': driver_info.get('LicString', ''),
            
            # Position & Lap
            'position': ir['PlayerCarPosition'] or 0,
            'classPosition': ir['PlayerCarClassPosition'] or 0,
            'lap': ir['Lap'] or 0,
            'lapsCompleted': ir['LapCompleted'] or 0,
            'lapDistPct': ir['LapDistPct'] or 0,
            
            # Speed & Motion
            'speed': ir['Speed'] or 0,  # m/s
            'gear': ir['Gear'] or 0,
            'rpm': ir['RPM'] or 0,
            'throttle': ir['Throttle'] or 0,
            'brake': ir['Brake'] or 0,
            'clutch': ir['Clutch'] or 0,
            'steeringAngle': ir['SteeringWheelAngle'] or 0,
            
            # Lap Times
            'lastLapTime': ir['LapLastLapTime'] or 0,
            'bestLapTime': ir['LapBestLapTime'] or 0,
            'deltaToSessionBest': ir['LapDeltaToSessionBestLap'] or 0,
            'deltaToOptimalLap': ir['LapDeltaToOptimalLap'] or 0,
            
            # Fuel
            'fuelLevel': ir['FuelLevel'] or 0,  # liters
            'fuelPct': ir['FuelLevelPct'] or 0,
            'fuelUsePerHour': ir['FuelUsePerHour'] or 0,
            
            # Tires
            'tireLFwear': ir['LFwearL'] if ir['LFwearL'] else 0,
            'tireRFwear': ir['RFwearL'] if ir['RFwearL'] else 0,
            'tireLRwear': ir['LRwearL'] if ir['LRwearL'] else 0,
            'tireRRwear': ir['RRwearL'] if ir['RRwearL'] else 0,
            
            # Temperatures
            'oilTemp': ir['OilTemp'] or 0,
            'waterTemp': ir['WaterTemp'] or 0,
            
            # Flags & Status
            'onPitRoad': ir['OnPitRoad'] or False,
            'isOnTrack': ir['IsOnTrack'] or False,
            'enterExitReset': ir['EnterExitReset'] or 0,
            'incidentCount': ir['PlayerCarMyIncidentCount'] or 0,
            
            # Session gaps (if available)
            'gapToLeader': ir['PlayerCarTowTime'] or 0,  # Placeholder - need proper gap calc
        }
        
        # Get track and session info
        track_name = 'Unknown Track'
        track_length = 0
        session_type = 'practice'
        session_laps = 0
        session_time_remain = 0
        try:
            session_info = ir['WeekendInfo']
            if session_info:
                track_name = session_info.get('TrackName', 'Unknown Track')
                track_length = session_info.get('TrackLength', '0 km')
            session_num = ir['SessionNum'] or 0
            sessions = ir['SessionInfo']['Sessions'] if ir['SessionInfo'] else []
            if sessions and len(sessions) > session_num:
                session_type = sessions[session_num].get('SessionType', 'practice').lower()
                session_laps = sessions[session_num].get('SessionLaps', 0)
            session_time_remain = ir['SessionTimeRemain'] or 0
        except:
            pass
        
        # Get flags
        session_flags = ir['SessionFlags'] or 0
        flag_status = 'green'
        if session_flags & 0x0001: flag_status = 'checkered'
        elif session_flags & 0x0002: flag_status = 'white'
        elif session_flags & 0x0004: flag_status = 'green'
        elif session_flags & 0x0008: flag_status = 'yellow'
        elif session_flags & 0x0010: flag_status = 'red'
        elif session_flags & 0x0020: flag_status = 'blue'
        elif session_flags & 0x0040: flag_status = 'debris'
        elif session_flags & 0x0080: flag_status = 'crossed'
        elif session_flags & 0x0100: flag_status = 'yellow_waving'
        elif session_flags & 0x0200: flag_status = 'one_to_green'
        elif session_flags & 0x0400: flag_status = 'green_held'
        elif session_flags & 0x0800: flag_status = 'ten_to_go'
        elif session_flags & 0x1000: flag_status = 'five_to_go'
        elif session_flags & 0x4000: flag_status = 'caution'
        elif session_flags & 0x8000: flag_status = 'caution_waving'
        
        # Get weather/track conditions
        track_temp = ir['TrackTemp'] or 0  # Celsius
        air_temp = ir['AirTemp'] or 0
        humidity = ir['RelativeHumidity'] or 0
        wind_speed = ir['WindVel'] or 0
        wind_dir = ir['WindDir'] or 0
        skies = ir['Skies'] or 0  # 0=clear, 1=partly cloudy, 2=mostly cloudy, 3=overcast
        sky_names = ['Clear', 'Partly Cloudy', 'Mostly Cloudy', 'Overcast']
        sky_condition = sky_names[skies] if skies < len(sky_names) else 'Unknown'
        
        # Get all cars on track (not just player)
        all_cars = []
        try:
            drivers = ir['DriverInfo']['Drivers'] if ir['DriverInfo'] else []
            car_positions = ir['CarIdxPosition'] or []
            car_laps = ir['CarIdxLap'] or []
            car_lap_pcts = ir['CarIdxLapDistPct'] or []
            car_on_track = ir['CarIdxOnPitRoad'] or []
            car_class_positions = ir['CarIdxClassPosition'] or []
            car_last_lap_times = ir['CarIdxLastLapTime'] or []
            car_best_lap_times = ir['CarIdxBestLapTime'] or []
            
            for i, driver in enumerate(drivers):
                if i >= len(car_positions) or car_positions[i] <= 0:
                    continue  # Skip cars not in session
                all_cars.append({
                    'carIdx': i,
                    'driverName': driver.get('UserName', f'Car {i}'),
                    'carName': driver.get('CarScreenName', 'Unknown'),
                    'carClass': driver.get('CarClassShortName', ''),
                    'iRating': driver.get('IRating', 0),
                    'position': car_positions[i] if i < len(car_positions) else 0,
                    'classPosition': car_class_positions[i] if i < len(car_class_positions) else 0,
                    'lap': car_laps[i] if i < len(car_laps) else 0,
                    'lapDistPct': car_lap_pcts[i] if i < len(car_lap_pcts) else 0,
                    'onPitRoad': car_on_track[i] if i < len(car_on_track) else False,
                    'lastLapTime': car_last_lap_times[i] if i < len(car_last_lap_times) else 0,
                    'bestLapTime': car_best_lap_times[i] if i < len(car_best_lap_times) else 0,
                    'isPlayer': i == player_car_idx
                })
            # Sort by position
            all_cars.sort(key=lambda x: x['position'])
        except Exception as e:
            logger.error(f"Error getting all cars: {e}")
        
        # Server-expected format (include full track awareness for voice AI)
        telemetry = {
            'sessionId': current_session_id,
            'sessionTimeMs': int((ir['SessionTime'] or 0) * 1000),
            'trackName': track_name,
            'trackLength': track_length,
            'sessionType': session_type,
            'sessionLaps': session_laps,
            'sessionTimeRemain': session_time_remain,
            'flagStatus': flag_status,
            'trackTemp': track_temp,
            'airTemp': air_temp,
            'humidity': humidity,
            'windSpeed': wind_speed,
            'windDir': wind_dir,
            'skyCondition': sky_condition,
            'totalCars': len(all_cars),
            'cars': [car_data],  # Player car detailed data
            'standings': all_cars[:20]  # Top 20 cars for context
        }
        
        last_telemetry = telemetry
        return telemetry
        
    except Exception as e:
        logger.error(f"Error reading telemetry: {e}")
        return None

async def check_incidents():
    """Check for new incidents and emit them."""
    global last_incident_count
    
    if not ir or not ir.is_connected or not current_session_id:
        return
    
    try:
        # iRacing tracks player incident count
        current_incidents = ir['PlayerCarMyIncidentCount'] or 0
        
        if current_incidents > last_incident_count:
            # New incident detected
            incident_delta = current_incidents - last_incident_count
            last_incident_count = current_incidents
            
            player_car_idx = ir['PlayerCarIdx'] or 0
            driver_name = 'Driver'
            if ir['DriverInfo'] and ir['DriverInfo']['Drivers']:
                driver_name = ir['DriverInfo']['Drivers'][player_car_idx].get('UserName', 'Driver')
            
            incident = {
                'sessionId': current_session_id,
                'type': 'contact',  # Could be refined based on incident type
                'severity': 'medium' if incident_delta >= 4 else 'light',
                'lap': ir['Lap'] or 0,
                'trackPosition': ir['LapDistPct'] or 0,
                'cars': [player_car_idx],
                'driverNames': [driver_name],
                'timestamp': time.time()
            }
            
            await sio.emit('incident', incident)
            logger.warning(f"Incident detected: +{incident_delta}x for {driver_name}")
            
    except Exception as e:
        logger.error(f"Error checking incidents: {e}")

def read_strategy_sync() -> Optional[Dict]:
    """Read strategy data (fuel, tires, damage) at 1Hz for pit wall."""
    if not ir or not ir.is_connected or not current_session_id:
        return None
    
    try:
        player_car_idx = ir['PlayerCarIdx'] or 0
        
        # Get tire temps
        tire_temps = {}
        for corner, prefix in [('fl', 'LF'), ('fr', 'RF'), ('rl', 'LR'), ('rr', 'RR')]:
            temps = {}
            for pos, suffix in [('l', 'L'), ('m', 'M'), ('r', 'R')]:
                key = f'{prefix}temp{suffix}'
                try:
                    val = ir[key]
                    temps[pos] = val if val is not None else 0
                except:
                    temps[pos] = 0
            tire_temps[corner] = temps
        
        # Build strategy data
        car_strategy = {
            'carId': player_car_idx,
            'fuel': {
                'level': ir['FuelLevel'] or 0,
                'pct': ir['FuelLevelPct'] or 0,
                'perLap': ir['FuelUsePerHour'] / 3600 if ir['FuelUsePerHour'] else None
            },
            'tires': {
                'fl': 1.0,  # iRacing doesn't expose wear directly, assume fresh
                'fr': 1.0,
                'rl': 1.0,
                'rr': 1.0
            },
            'tireTemps': tire_temps,
            'damage': {
                'aero': 0,  # Would need to parse from session string
                'engine': 0
            },
            'pit': {
                'inLane': ir['OnPitRoad'] or False,
                'stops': 0  # Would need to track
            }
        }
        
        return {
            'sessionId': current_session_id,
            'timestamp': time.time(),
            'cars': [car_strategy]
        }
        
    except Exception as e:
        logger.error(f"Error reading strategy: {e}")
        return None

async def telemetry_loop():
    """Main loop that reads and broadcasts telemetry at 60Hz, strategy at 1Hz."""
    global last_strategy_time
    interval = 1/60  # 60 Hz
    
    while True:
        try:
            start = time.perf_counter()
            
            # Check iRacing connection
            is_connected = await check_iracing()
            
            if is_connected:
                # Send session metadata once
                await send_session_metadata()
                
                # Read and emit telemetry at 60Hz
                telemetry = read_telemetry_sync()
                if telemetry:
                    await sio.emit('telemetry', telemetry)
                
                # Check for incidents
                await check_incidents()
                
                # Read and emit strategy at 1Hz
                now = time.time()
                if now - last_strategy_time >= 1.0:
                    strategy = read_strategy_sync()
                    if strategy:
                        await sio.emit('strategy_update', strategy)
                    last_strategy_time = now
                
                # Precise timing - account for processing time
                elapsed = time.perf_counter() - start
                sleep_time = max(0, interval - elapsed)
                await asyncio.sleep(sleep_time)
            else:
                await asyncio.sleep(2)
                
        except Exception as e:
            logger.error(f"Telemetry loop error: {e}")
            await asyncio.sleep(1)

async def start_background_tasks(app):
    """Start background tasks."""
    app['telemetry_task'] = asyncio.create_task(telemetry_loop())

async def cleanup_background_tasks(app):
    """Cleanup background tasks."""
    app['telemetry_task'].cancel()
    await app['telemetry_task']

def main():
    port = 9999
    logger.info(f"Starting iRacing Relay on port {port}...")
    
    if not IRSDK_AVAILABLE:
        logger.error("pyirsdk not available! Please install it: pip install pyirsdk")
    
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    
    web.run_app(app, host='127.0.0.1', port=port, print=lambda x: logger.info(x))

if __name__ == '__main__':
    main()
