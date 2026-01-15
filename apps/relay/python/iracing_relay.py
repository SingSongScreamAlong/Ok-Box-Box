#!/usr/bin/env python3
"""
iRacing Telemetry Relay
Reads telemetry from iRacing and serves it via Socket.IO for the Electron app.
"""

import asyncio
import json
import logging
import time
from typing import Optional, Dict, Any

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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Socket.IO server
sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# iRacing SDK instance
ir: Optional[Any] = None
connected_to_sim = False
last_telemetry_time = 0

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

async def read_telemetry():
    """Read telemetry from iRacing and emit it."""
    global last_telemetry_time
    
    if not ir or not ir.is_connected:
        return None
    
    # Freeze the data for this frame
    ir.freeze_var_buffer_latest()
    
    try:
        telemetry = {
            'timestamp': time.time(),
            'speed': ir['Speed'] or 0,
            'rpm': ir['RPM'] or 0,
            'gear': ir['Gear'] or 0,
            'throttle': ir['Throttle'] or 0,
            'brake': ir['Brake'] or 0,
            'clutch': ir['Clutch'] or 0,
            'steeringAngle': ir['SteeringWheelAngle'] or 0,
            'lap': ir['Lap'] or 0,
            'lapDistPct': ir['LapDistPct'] or 0,
            'position': ir['PlayerCarPosition'] or 0,
            'fuel': ir['FuelLevel'] or 0,
            'fuelPct': ir['FuelLevelPct'] or 0,
            'sessionTime': ir['SessionTime'] or 0,
            'isOnTrack': ir['IsOnTrack'] or False,
        }
        
        # Add tire temps if available
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
            telemetry['tireTemps'] = tire_temps
        
        last_telemetry_time = time.time()
        return telemetry
        
    except Exception as e:
        logger.error(f"Error reading telemetry: {e}")
        return None

async def telemetry_loop():
    """Main loop that reads and broadcasts telemetry."""
    logger.info("Starting telemetry loop...")
    
    while True:
        try:
            # Check iRacing connection
            is_connected = await check_iracing()
            
            if is_connected:
                telemetry = await read_telemetry()
                if telemetry:
                    await sio.emit('telemetry', telemetry)
                await asyncio.sleep(1/60)  # 60 Hz
            else:
                await asyncio.sleep(1)  # Check every second when not connected
                
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
