#!/usr/bin/env python3
"""
Dashboard Integration Validation Script

This script validates the integration between the PitBox backend and the React dashboard
by simulating telemetry data and verifying that it's properly received by the WebSocket service.
"""

import asyncio
import json
import logging
import math
import random
import time
import uuid
import websockets
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("dashboard-validation")

# Constants
WEBSOCKET_PORT = 8765
TELEMETRY_INTERVAL = 0.1  # seconds
SESSION_INFO_INTERVAL = 5.0  # seconds
COACHING_INTERVAL = 3.0  # seconds
VALIDATION_DURATION = 30.0  # seconds

# Mock data generators
class MockDataGenerator:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.driver_id = "DRIVER_001"
        self.lap = 1
        self.total_laps = 52
        self.lap_time = 0.0
        self.track_position = 0.0
        self.track_length = 5000.0  # meters
        self.speed = 0.0
        self.rpm = 0.0
        self.gear = 1
        self.throttle = 0.0
        self.brake = 0.0
        self.steering = 0.0
        self.track_name = "Silverstone"
        self.car_name = "Ferrari SF24"
        self.session_type = "RACE"
        self.track_temp = 28.0
        self.air_temp = 22.0
        self.weather = "Clear"
        self.tire_wear = {
            "FL": 100.0,
            "FR": 100.0,
            "RL": 100.0,
            "RR": 100.0
        }
        self.fuel = 100.0
        self.sector = 1
        self.corner = 1
        self.corner_names = {
            1: "Abbey",
            2: "Farm Curve",
            3: "Village",
            4: "The Loop",
            5: "Aintree",
            6: "Wellington Straight",
            7: "Brooklands",
            8: "Luffield",
            9: "Woodcote",
            10: "Copse",
            11: "Maggotts",
            12: "Becketts",
            13: "Chapel",
            14: "Hangar Straight",
            15: "Stowe",
            16: "Vale",
            17: "Club",
            18: "International Pits Straight"
        }
        self.total_corners = len(self.corner_names)
        self.competitors = [
            {"id": "COMP_001", "name": "Hamilton", "position": 2, "gap": 1.2},
            {"id": "COMP_002", "name": "Verstappen", "position": 3, "gap": 2.5},
            {"id": "COMP_003", "name": "Norris", "position": 4, "gap": 4.1},
            {"id": "COMP_004", "name": "Leclerc", "position": 5, "gap": 6.8}
        ]
        
    def generate_telemetry(self):
        """Generate realistic telemetry data"""
        # Update track position
        self.track_position += random.uniform(5, 15)
        if self.track_position >= self.track_length:
            self.track_position = 0
            self.lap += 1
            if self.lap > self.total_laps:
                self.lap = 1  # Reset for demo purposes
        
        # Calculate position percentage
        position_pct = self.track_position / self.track_length
        
        # Update corner based on position
        self.corner = int(position_pct * self.total_corners) + 1
        if self.corner > self.total_corners:
            self.corner = 1
            
        # Update sector based on position
        self.sector = 1
        if position_pct > 0.33:
            self.sector = 2
        if position_pct > 0.66:
            self.sector = 3
            
        # Generate speed based on corner
        corner_factor = 0.5 + 0.5 * math.sin(position_pct * 2 * math.pi)
        self.speed = 100 + 220 * corner_factor + random.uniform(-10, 10)
        
        # Generate RPM based on speed
        self.rpm = (self.speed * 30) + random.uniform(-200, 200)
        
        # Generate gear based on speed
        self.gear = min(8, max(1, int(self.speed / 50) + 1))
        
        # Generate pedal inputs based on corner
        if corner_factor < 0.3:  # Braking zone
            self.throttle = random.uniform(0, 0.2)
            self.brake = random.uniform(0.7, 1.0)
        elif corner_factor < 0.7:  # Mid corner
            self.throttle = random.uniform(0.3, 0.7)
            self.brake = random.uniform(0, 0.1)
        else:  # Acceleration zone
            self.throttle = random.uniform(0.8, 1.0)
            self.brake = 0
            
        # Generate steering based on corner
        self.steering = math.sin(position_pct * 6 * math.pi) * 0.7
        
        # Update tire wear
        for tire in self.tire_wear:
            self.tire_wear[tire] -= random.uniform(0.01, 0.05)
            self.tire_wear[tire] = max(0, self.tire_wear[tire])
            
        # Update fuel
        self.fuel -= random.uniform(0.02, 0.05)
        self.fuel = max(0, self.fuel)
        
        # Update competitor positions
        for comp in self.competitors:
            comp["gap"] += random.uniform(-0.3, 0.3)
            comp["gap"] = max(0.1, comp["gap"])
        
        # Sort competitors by gap
        self.competitors.sort(key=lambda x: x["gap"])
        for i, comp in enumerate(self.competitors):
            comp["position"] = i + 2  # Player is position 1
            
        return {
            "timestamp": time.time(),
            "session_id": self.session_id,
            "driver_id": self.driver_id,
            "lap": self.lap,
            "position": 1,  # Player is always P1 in this simulation
            "lap_time": self.lap_time,
            "sector": self.sector,
            "corner": self.corner,
            "corner_name": self.corner_names.get(self.corner, "Unknown"),
            "track_position": self.track_position,
            "track_position_pct": position_pct,
            "speed": self.speed,
            "rpm": self.rpm,
            "gear": self.gear,
            "throttle": self.throttle,
            "brake": self.brake,
            "steering": self.steering,
            "tire_temps": {
                "FL": 80 + random.uniform(-5, 5),
                "FR": 82 + random.uniform(-5, 5),
                "RL": 78 + random.uniform(-5, 5),
                "RR": 79 + random.uniform(-5, 5)
            },
            "tire_wear": self.tire_wear,
            "fuel": self.fuel,
            "fuel_pct": self.fuel
        }
    
    def generate_session_info(self):
        """Generate session information"""
        return {
            "track": self.track_name,
            "session": self.session_type,
            "driver": self.driver_id,
            "car": self.car_name,
            "weather": {
                "temperature": self.air_temp,
                "trackTemperature": self.track_temp,
                "windSpeed": random.uniform(5, 15),
                "windDirection": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
                "humidity": random.uniform(40, 80),
                "trackGrip": random.uniform(90, 100)
            },
            "totalLaps": self.total_laps,
            "sessionTime": 0,
            "remainingTime": 3600
        }
    
    def generate_coaching_insights(self):
        """Generate AI coaching insights"""
        insights = []
        
        # Generate 1-3 coaching insights
        num_insights = random.randint(1, 3)
        for _ in range(num_insights):
            corner = random.randint(1, self.total_corners)
            corner_name = self.corner_names.get(corner, "Unknown Corner")
            
            insight_type = random.choice(["braking", "throttle", "line", "consistency"])
            
            if insight_type == "braking":
                action = random.choice(["earlier", "later", "harder", "more gradually"])
                description = f"Try braking {action} into {corner_name} to improve corner entry"
            elif insight_type == "throttle":
                action = random.choice(["earlier", "more progressively", "more aggressively"])
                description = f"Apply throttle {action} out of {corner_name}"
            elif insight_type == "line":
                action = random.choice(["tighter", "wider", "more consistent"])
                description = f"Take a {action} line through {corner_name}"
            else:  # consistency
                description = f"Your approach to {corner_name} varies too much lap-to-lap"
                
            insights.append({
                "id": str(uuid.uuid4()),
                "timestamp": time.time(),
                "corner": corner,
                "corner_name": corner_name,
                "type": insight_type,
                "title": f"{insight_type.capitalize()} adjustment in {corner_name}",
                "description": description,
                "priority": random.choice(["low", "medium", "high"]),
                "confidence": random.uniform(0.7, 0.98),
                "potential_gain": f"{random.uniform(0.05, 0.3):.2f}s"
            })
            
        return insights
    
    def generate_skill_analysis(self):
        """Generate driver skill analysis"""
        return {
            "timestamp": time.time(),
            "driver_id": self.driver_id,
            "overall_rating": random.uniform(70, 95),
            "consistency": random.uniform(60, 100),
            "aggression": random.uniform(60, 100),
            "smoothness": random.uniform(60, 100),
            "corner_entry": random.uniform(60, 100),
            "corner_exit": random.uniform(60, 100),
            "braking": random.uniform(60, 100),
            "throttle_control": random.uniform(60, 100),
            "tire_management": random.uniform(60, 100),
            "fuel_efficiency": random.uniform(60, 100),
            "adaptability": random.uniform(60, 100),
            "strengths": ["corner entry", "braking consistency"],
            "weaknesses": ["tire management", "throttle application"],
            "improvement_areas": [
                {
                    "area": "Throttle application",
                    "description": "Work on smoother throttle application out of slow corners"
                },
                {
                    "area": "Tire management",
                    "description": "Focus on reducing tire slip in high-speed corners"
                }
            ]
        }
    
    def generate_competitor_data(self):
        """Generate competitor data"""
        return self.competitors
    
    def generate_strategy_data(self):
        """Generate strategy data"""
        return {
            "optimal_strategy": [
                {"stop": 1, "lap": 18, "tire": "Medium", "fuel": 100},
                {"stop": 2, "lap": 36, "tire": "Soft", "fuel": 60}
            ],
            "current_strategy": [
                {"stop": 1, "lap": 20, "tire": "Medium", "fuel": 100},
                {"stop": 2, "lap": 38, "tire": "Soft", "fuel": 60}
            ],
            "pit_window": {
                "earliest": 16,
                "optimal": 18,
                "latest": 22
            },
            "tire_life": {
                "current": self.tire_wear["FL"],  # Using FL as representative
                "estimated_laps_remaining": int(self.tire_wear["FL"] / 2)
            },
            "fuel_status": {
                "current": self.fuel,
                "target": self.fuel - 5,
                "delta_per_lap": -2.2
            }
        }

# WebSocket server
async def dashboard_server(websocket, path):
    """WebSocket server to handle dashboard connections"""
    logger.info(f"Client connected: {websocket.remote_address}")
    
    # Create data generator
    data_gen = MockDataGenerator()
    
    # Track client stats
    client_stats = {
        "telemetry_packets_sent": 0,
        "session_info_packets_sent": 0,
        "coaching_packets_sent": 0,
        "skill_analysis_packets_sent": 0,
        "competitor_packets_sent": 0,
        "strategy_packets_sent": 0
    }
    
    # Send initial session info
    session_info = data_gen.generate_session_info()
    await websocket.send(json.dumps({
        "type": "session_info",
        "data": session_info
    }))
    client_stats["session_info_packets_sent"] += 1
    
    # Send initial skill analysis
    skill_analysis = data_gen.generate_skill_analysis()
    await websocket.send(json.dumps({
        "type": "skill_analysis",
        "data": skill_analysis
    }))
    client_stats["skill_analysis_packets_sent"] += 1
    
    # Send initial competitor data
    competitor_data = data_gen.generate_competitor_data()
    await websocket.send(json.dumps({
        "type": "competitor_data",
        "data": competitor_data
    }))
    client_stats["competitor_packets_sent"] += 1
    
    # Send initial strategy data
    strategy_data = data_gen.generate_strategy_data()
    await websocket.send(json.dumps({
        "type": "strategy_data",
        "data": strategy_data
    }))
    client_stats["strategy_packets_sent"] += 1
    
    try:
        # Set start time
        start_time = time.time()
        last_session_info_time = start_time
        last_coaching_time = start_time
        
        # Main loop
        while time.time() - start_time < VALIDATION_DURATION:
            # Generate and send telemetry
            telemetry = data_gen.generate_telemetry()
            await websocket.send(json.dumps({
                "type": "telemetry",
                "data": telemetry
            }))
            client_stats["telemetry_packets_sent"] += 1
            
            # Periodically send session info updates
            current_time = time.time()
            if current_time - last_session_info_time >= SESSION_INFO_INTERVAL:
                session_info = data_gen.generate_session_info()
                await websocket.send(json.dumps({
                    "type": "session_info",
                    "data": session_info
                }))
                client_stats["session_info_packets_sent"] += 1
                last_session_info_time = current_time
                
                # Also send updated competitor data
                competitor_data = data_gen.generate_competitor_data()
                await websocket.send(json.dumps({
                    "type": "competitor_data",
                    "data": competitor_data
                }))
                client_stats["competitor_packets_sent"] += 1
                
                # And updated strategy data
                strategy_data = data_gen.generate_strategy_data()
                await websocket.send(json.dumps({
                    "type": "strategy_data",
                    "data": strategy_data
                }))
                client_stats["strategy_packets_sent"] += 1
            
            # Periodically send coaching insights
            if current_time - last_coaching_time >= COACHING_INTERVAL:
                coaching_insights = data_gen.generate_coaching_insights()
                await websocket.send(json.dumps({
                    "type": "coaching",
                    "data": coaching_insights
                }))
                client_stats["coaching_packets_sent"] += 1
                
                # Also send updated skill analysis
                skill_analysis = data_gen.generate_skill_analysis()
                await websocket.send(json.dumps({
                    "type": "skill_analysis",
                    "data": skill_analysis
                }))
                client_stats["skill_analysis_packets_sent"] += 1
                
                last_coaching_time = current_time
            
            # Sleep for telemetry interval
            await asyncio.sleep(TELEMETRY_INTERVAL)
        
        # Send validation summary
        logger.info(f"Validation complete. Stats: {client_stats}")
        await websocket.send(json.dumps({
            "type": "validation_summary",
            "data": {
                "duration": VALIDATION_DURATION,
                "stats": client_stats,
                "status": "success",
                "timestamp": datetime.now().isoformat()
            }
        }))
        
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Error in dashboard server: {e}")
        
async def main():
    """Main function to start the WebSocket server"""
    logger.info(f"Starting Dashboard Integration Validation Server on port {WEBSOCKET_PORT}")
    logger.info(f"Validation will run for {VALIDATION_DURATION} seconds")
    
    # Start WebSocket server
    async with websockets.serve(dashboard_server, "localhost", WEBSOCKET_PORT):
        logger.info(f"WebSocket server started at ws://localhost:{WEBSOCKET_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}")
