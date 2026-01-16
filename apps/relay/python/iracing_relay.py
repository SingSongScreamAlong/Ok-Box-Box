#!/usr/bin/env python3
"""
iRacing Telemetry Relay - OPTIMIZED
Reads telemetry from iRacing at 60Hz and serves via Socket.IO.
"""

import asyncio
import logging
import time
from typing import Optional, Any

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

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('status', {'simConnected': connected_to_sim}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

async def check_iracing():
    """Check if iRacing is running and connect to it."""
    global ir, connected_to_sim
    
    if not IRSDK_AVAILABLE:
        return False
    
    if ir is None:
        ir = irsdk.IRSDK()
    
    if not ir.is_connected:
        if ir.startup():
            connected_to_sim = True
            logger.info("Connected to iRacing!")
            await sio.emit('status', {'simConnected': True})
            return True
        else:
            if connected_to_sim:
                connected_to_sim = False
                logger.info("Disconnected from iRacing")
                await sio.emit('status', {'simConnected': False})
            return False
    
    return True

def read_telemetry_sync():
    """Read telemetry from iRacing - synchronous for speed."""
    global last_telemetry
    
    if not ir or not ir.is_connected:
        return None
    
    # Freeze the data for this frame
    ir.freeze_var_buffer_latest()
    
    try:
        # Pre-fetch all values in one go (faster than individual lookups)
        t = time.time()
        
        telemetry = {
            't': t,  # Shorter key names = less bandwidth
            'spd': ir['Speed'] or 0,
            'rpm': ir['RPM'] or 0,
            'gear': ir['Gear'] or 0,
            'thr': ir['Throttle'] or 0,
            'brk': ir['Brake'] or 0,
            'clt': ir['Clutch'] or 0,
            'str': ir['SteeringWheelAngle'] or 0,
            'lap': ir['Lap'] or 0,
            'lpct': ir['LapDistPct'] or 0,
            'pos': ir['PlayerCarPosition'] or 0,
            'fuel': ir['FuelLevel'] or 0,
            'fpct': ir['FuelLevelPct'] or 0,
            'stime': ir['SessionTime'] or 0,
            'ontrk': ir['IsOnTrack'] or False,
        }
        
        # Tire temps - only read every 10th frame (temps don't change fast)
        if last_telemetry is None or int(t * 60) % 6 == 0:
            tire_temps = {}
            for tire in ['LF', 'RF', 'LR', 'RR']:
                for pos in ['L', 'M', 'R']:
                    key = f'{tire}temp{pos}'
                    try:
                        val = ir[key]
                        if val is not None:
                            tire_temps[key] = val
                    except:
                        pass
            if tire_temps:
                telemetry['tires'] = tire_temps
        elif last_telemetry and 'tires' in last_telemetry:
            telemetry['tires'] = last_telemetry['tires']
        
        last_telemetry = telemetry
        return telemetry
        
    except Exception as e:
        logger.error(f"Error reading telemetry: {e}")
        return None

async def telemetry_loop():
    """Main loop that reads and broadcasts telemetry at 60Hz."""
    interval = 1/60  # 60 Hz
    
    while True:
        try:
            start = time.perf_counter()
            
            # Check iRacing connection
            is_connected = await check_iracing()
            
            if is_connected:
                # Sync read is faster than async for this
                telemetry = read_telemetry_sync()
                if telemetry:
                    await sio.emit('telemetry', telemetry)
                
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
