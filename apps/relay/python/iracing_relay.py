#!/usr/bin/env python3
"""
iRacing Telemetry Relay — DUMB PIPE
Reads raw telemetry from iRacing at 60Hz and serves via Socket.IO.
Zero computation. Zero inference. Just reads iRacing shared memory and emits.
All intelligence lives on the server (Digital Ocean).

Emits:
  session_metadata  — once per session
  telemetry         — 60Hz, every raw iRacing var the server needs
  strategy_raw      — 1Hz, raw fuel/tire/engine/brake vars for server inference
  incident          — on incident count change
"""

import asyncio
import logging
import time
from typing import Optional, Any, Dict

from aiohttp import web
import socketio

try:
    import irsdk
    IRSDK_AVAILABLE = True
except ImportError:
    IRSDK_AVAILABLE = False
    print("WARNING: pyirsdk not installed. Install with: pip install pyirsdk")

logging.basicConfig(level=logging.WARNING, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*',
    ping_timeout=10,
    ping_interval=5,
    max_http_buffer_size=1024 * 100
)
app = web.Application()
sio.attach(app)

# iRacing SDK instance — the only state the relay holds
ir: Optional[Any] = None
connected_to_sim = False
current_session_id: Optional[str] = None
session_metadata_sent = False
last_strategy_time = 0
last_incident_count = 0


def safe(val, default=0):
    """Return val if truthy, else default. Handles None from iRacing SDK."""
    return val if val is not None else default


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('status', {'simConnected': connected_to_sim}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")


async def check_iracing():
    """Check if iRacing is running and connect to it."""
    global ir, connected_to_sim, current_session_id, session_metadata_sent, last_incident_count

    if not IRSDK_AVAILABLE:
        return False

    if ir is None:
        ir = irsdk.IRSDK()

    if not ir.is_connected:
        if ir.startup():
            connected_to_sim = True
            session_metadata_sent = False
            current_session_id = None
            last_incident_count = 0
            logger.warning("Connected to iRacing!")
            await sio.emit('iracing_status', {'connected': True})
            return True
        else:
            if connected_to_sim:
                connected_to_sim = False
                session_metadata_sent = False
                current_session_id = None
                logger.warning("Disconnected from iRacing")
                await sio.emit('iracing_status', {'connected': False})
            return False

    return True


async def send_session_metadata():
    """Send session metadata once per session."""
    global current_session_id, session_metadata_sent

    if not ir or not ir.is_connected or session_metadata_sent:
        return

    try:
        session_info = ir['WeekendInfo']
        if not session_info:
            return

        track_name = session_info.get('TrackName', 'Unknown Track')
        track_length = session_info.get('TrackLength', '0 km')
        session_id = f"live_{int(time.time())}"

        session_num = safe(ir['SessionNum'])
        sessions = ir['SessionInfo']['Sessions'] if ir['SessionInfo'] else []
        session_type = 'practice'
        if sessions and len(sessions) > session_num:
            session_type = sessions[session_num].get('SessionType', 'practice').lower()

        # Car metadata from iRacing
        rpm_redline = safe(ir['DriverCarSLBlinkRPM'], 8000)
        fuel_tank_capacity = safe(ir['DriverCarFuelMaxLit'], 20)
        player_car_idx = safe(ir['PlayerCarIdx'])
        driver_info = ir['DriverInfo']['Drivers'][player_car_idx] if ir['DriverInfo'] else {}
        car_name = driver_info.get('CarScreenName', 'Unknown Car')

        current_session_id = session_id

        await sio.emit('session_metadata', {
            'sessionId': session_id,
            'trackName': track_name,
            'trackLength': track_length,
            'sessionType': session_type,
            'carName': car_name,
            'rpmRedline': rpm_redline,
            'fuelTankCapacity': fuel_tank_capacity,
            'timestamp': time.time()
        })
        session_metadata_sent = True
        logger.info(f"Sent session metadata: {track_name} ({session_type})")

    except Exception as e:
        logger.error(f"Error sending session metadata: {e}")


def read_telemetry_raw() -> Optional[Dict]:
    """Read ALL raw iRacing telemetry vars and forward them.
    No computation — just read and pack."""

    if not ir or not ir.is_connected or not current_session_id:
        return None

    ir.freeze_var_buffer_latest()

    try:
        t = time.time()
        player_car_idx = safe(ir['PlayerCarIdx'])
        driver_info = ir['DriverInfo']['Drivers'][player_car_idx] if ir['DriverInfo'] else {}

        # Raw tire wear values (L/M/R per corner — iRacing surface layer)
        tire_wear_raw = {}
        for corner, prefix in [('fl', 'LF'), ('fr', 'RF'), ('rl', 'LR'), ('rr', 'RR')]:
            try:
                tire_wear_raw[corner] = {
                    'l': safe(ir[f'{prefix}wearL']),
                    'm': safe(ir[f'{prefix}wearM']),
                    'r': safe(ir[f'{prefix}wearR']),
                }
            except:
                tire_wear_raw[corner] = {'l': 0, 'm': 0, 'r': 0}

        # Raw tire temps (L/M/R per corner, Celsius)
        tire_temps_raw = {}
        for corner, prefix in [('fl', 'LF'), ('fr', 'RF'), ('rl', 'LR'), ('rr', 'RR')]:
            try:
                tire_temps_raw[corner] = {
                    'l': safe(ir[f'{prefix}tempL']),
                    'm': safe(ir[f'{prefix}tempM']),
                    'r': safe(ir[f'{prefix}tempR']),
                }
            except:
                tire_temps_raw[corner] = {'l': 0, 'm': 0, 'r': 0}

        car_data = {
            'carId': player_car_idx,
            'driverId': str(player_car_idx),
            'driverName': driver_info.get('UserName', 'Driver'),
            'carName': driver_info.get('CarScreenName', 'Unknown Car'),
            'carClass': driver_info.get('CarClassShortName', ''),
            'iRating': driver_info.get('IRating', 0),
            'licenseLevel': driver_info.get('LicString', ''),

            # Position & Lap
            'position': safe(ir['PlayerCarPosition']),
            'classPosition': safe(ir['PlayerCarClassPosition']),
            'lap': safe(ir['Lap']),
            'lapsCompleted': safe(ir['LapCompleted']),
            'lapDistPct': safe(ir['LapDistPct']),

            # Speed & Motion (raw, m/s and radians)
            'speed': safe(ir['Speed']),
            'gear': safe(ir['Gear']),
            'rpm': safe(ir['RPM']),
            'throttle': safe(ir['Throttle']),
            'brake': safe(ir['Brake']),
            'clutch': safe(ir['Clutch']),
            'steeringAngle': safe(ir['SteeringWheelAngle']),

            # Protocol position
            'pos': {'s': safe(ir['LapDistPct'])},
            'inPit': bool(ir['OnPitRoad']),

            # Lap Times (seconds)
            'lastLapTime': safe(ir['LapLastLapTime']),
            'bestLapTime': safe(ir['LapBestLapTime']),
            'deltaToSessionBest': safe(ir['LapDeltaToSessionBestLap']),
            'deltaToOptimalLap': safe(ir['LapDeltaToOptimalLap']),

            # Fuel (raw)
            'fuelLevel': safe(ir['FuelLevel']),
            'fuelPct': safe(ir['FuelLevelPct']),
            'fuelUsePerHour': safe(ir['FuelUsePerHour']),

            # Raw tire data — server will infer wear from this
            'tireWearRaw': tire_wear_raw,
            'tireTempsRaw': tire_temps_raw,

            # Engine (raw)
            'oilTemp': safe(ir['OilTemp']),
            'oilPress': safe(ir['OilPress']),
            'waterTemp': safe(ir['WaterTemp']),
            'voltage': safe(ir['Voltage']),
            'engineWarnings': safe(ir['EngineWarnings']),

            # Brake bias (raw)
            'brakeBias': safe(ir['dcBrakeBias'], 55.0),

            # Status
            'onPitRoad': bool(ir['OnPitRoad']),
            'isOnTrack': bool(ir['IsOnTrack']),
            'enterExitReset': safe(ir['EnterExitReset']),
            'incidentCount': safe(ir['PlayerCarMyIncidentCount']),
        }

        # Session context
        track_name = 'Unknown Track'
        track_length = 0
        session_type = 'practice'
        session_laps = 0
        session_time_remain = 0
        try:
            si = ir['WeekendInfo']
            if si:
                track_name = si.get('TrackName', 'Unknown Track')
                track_length = si.get('TrackLength', '0 km')
            sn = safe(ir['SessionNum'])
            ss = ir['SessionInfo']['Sessions'] if ir['SessionInfo'] else []
            if ss and len(ss) > sn:
                session_type = ss[sn].get('SessionType', 'practice').lower()
                session_laps = ss[sn].get('SessionLaps', 0)
            session_time_remain = safe(ir['SessionTimeRemain'])
        except:
            pass

        # Flags
        session_flags = safe(ir['SessionFlags'])
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

        # Weather (raw Celsius / m/s)
        track_temp = safe(ir['TrackTemp'])
        air_temp = safe(ir['AirTemp'])
        humidity = safe(ir['RelativeHumidity'])
        wind_speed = safe(ir['WindVel'])
        wind_dir = safe(ir['WindDir'])
        skies = safe(ir['Skies'])
        sky_names = ['Clear', 'Partly Cloudy', 'Mostly Cloudy', 'Overcast']
        sky_condition = sky_names[skies] if skies < len(sky_names) else 'Unknown'

        return {
            'type': 'telemetry',
            'schemaVersion': 'v1',
            'sessionId': current_session_id,
            'timestamp': t,
            'sessionTimeMs': int(safe(ir['SessionTime']) * 1000),
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
            'cars': [car_data],
        }

    except Exception as e:
        logger.error(f"Error reading telemetry: {e}")
        return None


def read_standings_raw() -> Optional[Dict]:
    """Read ALL cars on track — no cap. Emitted at 1Hz, not 60Hz."""
    if not ir or not ir.is_connected or not current_session_id:
        return None

    try:
        player_car_idx = safe(ir['PlayerCarIdx'])
        drivers = ir['DriverInfo']['Drivers'] if ir['DriverInfo'] else []
        car_positions = ir['CarIdxPosition'] or []
        car_laps = ir['CarIdxLap'] or []
        car_lap_pcts = ir['CarIdxLapDistPct'] or []
        car_on_pit = ir['CarIdxOnPitRoad'] or []
        car_class_pos = ir['CarIdxClassPosition'] or []
        car_last_laps = ir['CarIdxLastLapTime'] or []
        car_best_laps = ir['CarIdxBestLapTime'] or []
        car_est_times = ir['CarIdxEstTime'] or []
        car_f2_times = ir['CarIdxF2Time'] or []

        all_cars = []
        for i, driver in enumerate(drivers):
            is_player = i == player_car_idx
            if i >= len(car_positions) or (car_positions[i] <= 0 and not is_player):
                continue
            all_cars.append({
                'carIdx': i,
                'driverName': driver.get('UserName', f'Car {i}'),
                'carName': driver.get('CarScreenName', 'Unknown'),
                'carClass': driver.get('CarClassShortName', ''),
                'iRating': driver.get('IRating', 0),
                'position': car_positions[i] if i < len(car_positions) else 0,
                'classPosition': car_class_pos[i] if i < len(car_class_pos) else 0,
                'lap': car_laps[i] if i < len(car_laps) else 0,
                'lapDistPct': car_lap_pcts[i] if i < len(car_lap_pcts) else 0,
                'onPitRoad': car_on_pit[i] if i < len(car_on_pit) else False,
                'lastLapTime': car_last_laps[i] if i < len(car_last_laps) else 0,
                'bestLapTime': car_best_laps[i] if i < len(car_best_laps) else 0,
                'estTime': car_est_times[i] if i < len(car_est_times) else 0,
                'f2Time': car_f2_times[i] if i < len(car_f2_times) else 0,
                'isPlayer': is_player,
            })
        all_cars.sort(key=lambda x: x['position'])

        return {
            'type': 'standings',
            'sessionId': current_session_id,
            'timestamp': time.time(),
            'totalCars': len(all_cars),
            'standings': all_cars,
        }

    except Exception as e:
        logger.error(f"Error reading standings: {e}")
        return None


def read_strategy_raw() -> Optional[Dict]:
    """Read raw strategy-relevant vars at 1Hz. No computation — server does all math."""
    if not ir or not ir.is_connected or not current_session_id:
        return None

    try:
        player_car_idx = safe(ir['PlayerCarIdx'])

        # Raw tire temps (L/M/R per corner)
        tire_temps = {}
        for corner, prefix in [('fl', 'LF'), ('fr', 'RF'), ('rl', 'LR'), ('rr', 'RR')]:
            temps = {}
            for pos, suffix in [('l', 'L'), ('m', 'M'), ('r', 'R')]:
                try:
                    temps[pos] = safe(ir[f'{prefix}temp{suffix}'])
                except:
                    temps[pos] = 0
            tire_temps[corner] = temps

        # Raw tire wear (L/M/R per corner)
        tire_wear = {}
        for corner, prefix in [('fl', 'LF'), ('fr', 'RF'), ('rl', 'LR'), ('rr', 'RR')]:
            try:
                tire_wear[corner] = {
                    'l': safe(ir[f'{prefix}wearL']),
                    'm': safe(ir[f'{prefix}wearM']),
                    'r': safe(ir[f'{prefix}wearR']),
                }
            except:
                tire_wear[corner] = {'l': 0, 'm': 0, 'r': 0}

        # Tire compound
        tire_compound = None
        try:
            tire_compound = ir['PlayerCarTireCompound']
        except:
            pass

        return {
            'type': 'strategy_raw',
            'schemaVersion': 'v1',
            'sessionId': current_session_id,
            'timestamp': time.time(),
            'cars': [{
                'carId': player_car_idx,
                # Raw fuel
                'fuelLevel': safe(ir['FuelLevel']),
                'fuelPct': safe(ir['FuelLevelPct']),
                'fuelUsePerHour': safe(ir['FuelUsePerHour']),
                'bestLapTime': safe(ir['LapBestLapTime']),
                # Raw tires
                'tireTemps': tire_temps,
                'tireWear': tire_wear,
                'tireCompound': tire_compound,
                # Raw engine
                'oilTemp': safe(ir['OilTemp']),
                'oilPress': safe(ir['OilPress']),
                'waterTemp': safe(ir['WaterTemp']),
                'voltage': safe(ir['Voltage']),
                'engineWarnings': safe(ir['EngineWarnings']),
                # Raw brake
                'brake': safe(ir['Brake']),
                'brakeBias': safe(ir['dcBrakeBias'], 55.0),
                # Raw status
                'onPitRoad': bool(ir['OnPitRoad']),
                'lap': safe(ir['Lap']),
                'speed': safe(ir['Speed']),
                'throttle': safe(ir['Throttle']),
                'steeringAngle': safe(ir['SteeringWheelAngle']),
            }],
        }

    except Exception as e:
        logger.error(f"Error reading strategy: {e}")
        return None


async def check_incidents():
    """Detect incident count changes and emit raw event."""
    global last_incident_count

    if not ir or not ir.is_connected or not current_session_id:
        return

    try:
        current_incidents = safe(ir['PlayerCarMyIncidentCount'])

        if current_incidents > last_incident_count:
            incident_delta = current_incidents - last_incident_count
            last_incident_count = current_incidents

            player_car_idx = safe(ir['PlayerCarIdx'])
            driver_name = 'Driver'
            if ir['DriverInfo'] and ir['DriverInfo']['Drivers']:
                driver_name = ir['DriverInfo']['Drivers'][player_car_idx].get('UserName', 'Driver')

            await sio.emit('incident', {
                'sessionId': current_session_id,
                'type': 'contact',
                'severity': 'medium' if incident_delta >= 4 else 'light',
                'lap': safe(ir['Lap']),
                'trackPosition': safe(ir['LapDistPct']),
                'cars': [player_car_idx],
                'driverNames': [driver_name],
                'timestamp': time.time(),
            })
            logger.warning(f"Incident detected: +{incident_delta}x for {driver_name}")

    except Exception as e:
        logger.error(f"Error checking incidents: {e}")


async def telemetry_loop():
    """Main loop: read raw iRacing data and emit. No computation."""
    global last_strategy_time
    interval = 1 / 60  # 60 Hz

    while True:
        try:
            start = time.perf_counter()

            is_connected = await check_iracing()

            if is_connected:
                await send_session_metadata()

                # 60Hz: raw telemetry
                telemetry = read_telemetry_raw()
                if telemetry:
                    await sio.emit('telemetry', telemetry)

                # Incident detection (just count delta)
                await check_incidents()

                # 1Hz: raw strategy vars + full standings (all cars, no cap)
                now = time.time()
                if now - last_strategy_time >= 1.0:
                    strategy = read_strategy_raw()
                    if strategy:
                        await sio.emit('strategy_raw', strategy)
                    standings = read_standings_raw()
                    if standings:
                        await sio.emit('standings', standings)
                    last_strategy_time = now

                elapsed = time.perf_counter() - start
                sleep_time = max(0, interval - elapsed)
                await asyncio.sleep(sleep_time)
            else:
                await asyncio.sleep(2)

        except Exception as e:
            logger.error(f"Telemetry loop error: {e}")
            await asyncio.sleep(1)


async def start_background_tasks(app):
    app['telemetry_task'] = asyncio.create_task(telemetry_loop())

async def cleanup_background_tasks(app):
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
