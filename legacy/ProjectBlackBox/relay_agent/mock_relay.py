#!/usr/bin/env python3
"""
Mock Relay Agent for testing PitBox Server integration
Generates synthetic telemetry data.
"""
import time
import math
import logging
from pitbox_client import PitBoxClient

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

def main():
    client = PitBoxClient(url="http://localhost:3001", driver_id="mock-driver-1")
    
    logger.info("Connecting to server...")
    if not client.connect():
        logger.error("Failed to connect")
        return

    logger.info("Connected. Sending session metadata...")
    
    # Send Session Metadata
    client.send_session_metadata({
        "sessionId": "mock-session-123",
        "trackName": "Silverstone Grand Prix",
        "trackConfig": "Grand Prix",
        "category": "Road",
        "multiClass": False,
        "cautionsEnabled": False,
        "driverSwap": False,
        "maxDrivers": 20,
        "weather": {
            "ambientTemp": 20.0,
            "trackTemp": 25.0,
            "precipitation": 0.0,
            "trackState": "dry"
        }
    })
    
    logger.info("Starting telemetry loop...")
    
    lap = 1
    lap_dist_pct = 0.0
    speed = 0.0
    
    try:
        while True:
            # Simulate car movement
            speed = 280.0 * (0.5 + 0.5 * math.sin(time.time())) # km/h
            lap_dist_pct += (speed / 3600.0) / 5.891 * 0.1 # approx increment for 10hz
            if lap_dist_pct >= 1.0:
                lap_dist_pct -= 1.0
                lap += 1
                logger.info(f"Lap {lap} completed!")

            # Telemetry Payload
            telemetry = {
                "sessionId": "mock-session-123",
                "sessionTimeMs": time.time() * 1000,
                "cars": [
                    {
                        "carId": 1,
                        "driverId": "mock-driver-1",
                        "driverName": "Mock Driver",
                        "carNumber": "1",
                        "position": 1,
                        "lap": lap,
                        "pos": {"s": lap_dist_pct},
                        "speed": speed,
                        "gear": 4,
                        "rpm": 12000,
                        "throttle": 1.0,
                        "brake": 0.0,
                        "steering": 0.0,
                        "inPit": False
                    },
                    # Add an opponent
                    {
                        "carId": 2,
                        "driverId": "mock-driver-2",
                        "driverName": "Opponent Bot",
                        "carNumber": "2",
                        "position": 2,
                        "lap": lap,
                        "pos": {"s": (lap_dist_pct - 0.05) % 1.0},
                        "speed": speed * 0.98,
                        "gear": 4,
                        "rpm": 11000,
                        "throttle": 0.9,
                        "brake": 0.0,
                        "steering": 0.0,
                        "inPit": False
                    }
                ]
            }
            
            client.send_telemetry(telemetry)
            
            # 10Hz
            client.wait(0.1)
            
    except KeyboardInterrupt:
        logger.info("Stopping mock relay...")
        client.disconnect()

if __name__ == "__main__":
    main()
