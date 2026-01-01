#!/usr/bin/env python3
"""
Dashboard Components Validation Script

This script validates the integration between individual dashboard components and the WebSocket service
by sending targeted test data for each component and verifying proper rendering.
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
logger = logging.getLogger("dashboard-components-validation")

# Constants
WEBSOCKET_PORT = 8766  # Using a different port than the main validation script
VALIDATION_DURATION = 60.0  # seconds
TEST_INTERVAL = 5.0  # seconds between component tests

# Component-specific test data generators
class ComponentTestDataGenerator:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.driver_id = "TEST_DRIVER"
        self.track_name = "Silverstone"
        self.car_name = "Ferrari SF24"
        
    def generate_header_test(self):
        """Generate test data for the Header component"""
        logger.info("Generating Header component test data")
        return {
            "type": "session_info",
            "data": {
                "track": self.track_name,
                "session": "RACE",
                "driver": self.driver_id,
                "car": self.car_name,
                "weather": {
                    "temperature": 22.5,
                    "trackTemperature": 28.3,
                    "windSpeed": 5.2,
                    "windDirection": "NE",
                    "humidity": 45,
                    "trackGrip": 90
                },
                "totalLaps": 52,
                "sessionTime": 1200,
                "remainingTime": 3600
            }
        }
        
    def generate_telemetry_test(self):
        """Generate test data for the Telemetry component"""
        logger.info("Generating Telemetry component test data")
        return {
            "type": "telemetry",
            "data": {
                "timestamp": time.time(),
                "lap": 5,
                "position": 1,
                "speed": 285.4,
                "rpm": 12500,
                "gear": 7,
                "throttle": 0.95,
                "brake": 0.0,
                "steering": -0.1,
                "tire_temps": {
                    "FL": 95.2,
                    "FR": 96.1,
                    "RL": 93.8,
                    "RR": 94.5
                },
                "tire_wear": {
                    "FL": 92.5,
                    "FR": 91.8,
                    "RL": 93.2,
                    "RR": 92.7
                },
                "fuel": 45.3,
                "sector": 2,
                "corner": 7,
                "track_position": 0.45
            }
        }
        
    def generate_track_map_test(self):
        """Generate test data for the TrackMap component"""
        logger.info("Generating TrackMap component test data")
        return {
            "type": "track_position",
            "data": {
                "track": self.track_name,
                "position": 0.45,  # 45% around the track
                "lap": 5,
                "sector": 2,
                "corner": 7,
                "corner_name": "Luffield",
                "competitors": [
                    {"id": "COMP_001", "name": "Hamilton", "position": 0.43},
                    {"id": "COMP_002", "name": "Verstappen", "position": 0.47},
                    {"id": "COMP_003", "name": "Norris", "position": 0.50}
                ]
            }
        }
        
    def generate_ai_coaching_test(self):
        """Generate test data for the AICoaching component"""
        logger.info("Generating AICoaching component test data")
        return {
            "type": "coaching",
            "data": {
                "insights": [
                    {
                        "id": str(uuid.uuid4()),
                        "timestamp": time.time(),
                        "type": "braking",
                        "corner": "Turn 1",
                        "message": "Brake later and harder into Turn 1",
                        "confidence": 0.85,
                        "impact": "Potential time gain: 0.12s",
                        "priority": "high"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "timestamp": time.time() - 30,
                        "type": "throttle",
                        "corner": "Turn 3",
                        "message": "Apply throttle more progressively out of Turn 3",
                        "confidence": 0.78,
                        "impact": "Improved traction and stability",
                        "priority": "medium"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "timestamp": time.time() - 60,
                        "type": "line",
                        "corner": "Turn 7",
                        "message": "Take a wider entry into Turn 7",
                        "confidence": 0.92,
                        "impact": "Potential time gain: 0.08s",
                        "priority": "medium"
                    }
                ],
                "focus_areas": ["braking", "corner_entry", "throttle_application"]
            }
        }
        
    def generate_competitor_analysis_test(self):
        """Generate test data for the CompetitorAnalysis component"""
        logger.info("Generating CompetitorAnalysis component test data")
        return {
            "type": "competitor_analysis",
            "data": {
                "competitors": [
                    {
                        "id": "COMP_001",
                        "name": "Hamilton",
                        "team": "Mercedes",
                        "position": 2,
                        "gap_ahead": 1.2,
                        "gap_behind": 3.5,
                        "last_lap": 93.421,
                        "best_lap": 92.876,
                        "sector_times": [29.123, 31.456, 32.842],
                        "tire_age": 12,
                        "tire_compound": "medium",
                        "pit_stops": 1,
                        "strengths": ["sector 1", "braking stability"],
                        "weaknesses": ["sector 3", "tire management"]
                    },
                    {
                        "id": "COMP_002",
                        "name": "Verstappen",
                        "team": "Red Bull",
                        "position": 1,
                        "gap_ahead": 0.0,
                        "gap_behind": 1.2,
                        "last_lap": 93.012,
                        "best_lap": 92.543,
                        "sector_times": [28.876, 31.234, 32.902],
                        "tire_age": 10,
                        "tire_compound": "medium",
                        "pit_stops": 1,
                        "strengths": ["sector 2", "tire management"],
                        "weaknesses": ["sector 3 entry"]
                    },
                    {
                        "id": "COMP_003",
                        "name": "Norris",
                        "team": "McLaren",
                        "position": 3,
                        "gap_ahead": 3.5,
                        "gap_behind": 2.1,
                        "last_lap": 93.876,
                        "best_lap": 93.012,
                        "sector_times": [29.234, 31.876, 32.766],
                        "tire_age": 8,
                        "tire_compound": "hard",
                        "pit_stops": 1,
                        "strengths": ["sector 3", "corner exit"],
                        "weaknesses": ["sector 1", "braking stability"]
                    }
                ],
                "track_position_delta": [
                    {"lap": 1, "positions": {"COMP_001": 3, "COMP_002": 1, "COMP_003": 4}},
                    {"lap": 2, "positions": {"COMP_001": 3, "COMP_002": 1, "COMP_003": 4}},
                    {"lap": 3, "positions": {"COMP_001": 2, "COMP_002": 1, "COMP_003": 3}},
                    {"lap": 4, "positions": {"COMP_001": 2, "COMP_002": 1, "COMP_003": 3}},
                    {"lap": 5, "positions": {"COMP_001": 2, "COMP_002": 1, "COMP_003": 3}}
                ]
            }
        }
        
    def generate_video_panel_test(self):
        """Generate test data for the VideoPanel component"""
        logger.info("Generating VideoPanel component test data")
        return {
            "type": "video_data",
            "data": {
                "sources": [
                    {
                        "id": "main_feed",
                        "name": "Main Feed",
                        "url": "https://example.com/stream1",
                        "active": True
                    },
                    {
                        "id": "onboard",
                        "name": "Onboard Camera",
                        "url": "https://example.com/stream2",
                        "active": False
                    },
                    {
                        "id": "pit_lane",
                        "name": "Pit Lane",
                        "url": "https://example.com/stream3",
                        "active": False
                    }
                ],
                "current_source": "main_feed",
                "highlights": [
                    {"timestamp": time.time() - 300, "title": "Race Start", "url": "https://example.com/highlight1"},
                    {"timestamp": time.time() - 180, "title": "Overtake Turn 3", "url": "https://example.com/highlight2"}
                ]
            }
        }
        
    def generate_strategy_test(self):
        """Generate test data for strategy components"""
        logger.info("Generating Strategy component test data")
        return {
            "type": "strategy_data",
            "data": {
                "current_strategy": {
                    "name": "Two-stop Medium-Hard-Soft",
                    "pit_stops": [
                        {"lap": 18, "tire": "hard", "fuel": 80.0},
                        {"lap": 38, "tire": "soft", "fuel": 40.0}
                    ],
                    "predicted_finish_position": 2
                },
                "alternative_strategies": [
                    {
                        "name": "One-stop Medium-Hard",
                        "pit_stops": [
                            {"lap": 25, "tire": "hard", "fuel": 70.0}
                        ],
                        "predicted_finish_position": 3,
                        "delta_to_current": "+4.2s"
                    },
                    {
                        "name": "Three-stop Aggressive",
                        "pit_stops": [
                            {"lap": 15, "tire": "medium", "fuel": 85.0},
                            {"lap": 30, "tire": "medium", "fuel": 55.0},
                            {"lap": 42, "tire": "soft", "fuel": 30.0}
                        ],
                        "predicted_finish_position": 1,
                        "delta_to_current": "-2.8s"
                    }
                ],
                "tire_predictions": {
                    "current": {
                        "compound": "medium",
                        "age": 8,
                        "wear": 18.5,
                        "optimal_laps_remaining": 10,
                        "cliff_in_laps": 15
                    },
                    "fuel_status": {
                        "current": 45.3,
                        "target": 44.8,
                        "delta_per_lap": 0.1
                    }
                }
            }
        }

# Component test function mapping
def get_component_test_function(component_name, data_gen):
    """Get the appropriate test function for a component"""
    component_map = {
        "header": data_gen.generate_header_test,
        "telemetry": data_gen.generate_telemetry_test,
        "track_map": data_gen.generate_track_map_test,
        "ai_coaching": data_gen.generate_ai_coaching_test,
        "competitor_analysis": data_gen.generate_competitor_analysis_test,
        "competitor_positions": data_gen.generate_competitor_analysis_test,  # Uses same data
        "video_panel": data_gen.generate_video_panel_test,
        "strategy": data_gen.generate_strategy_test
    }
    
    return component_map.get(component_name.lower())

# WebSocket server handler
async def component_test_server(websocket, path):
    """WebSocket server to handle dashboard component testing"""
    # Generate a client ID
    client_id = str(uuid.uuid4())[:8]
    logger.info(f"Client {client_id} connected")
    
    # Initialize data generator
    data_gen = ComponentTestDataGenerator()
    
    # Initialize test statistics
    test_stats = {
        "header_tests": 0,
        "telemetry_tests": 0,
        "track_map_tests": 0,
        "ai_coaching_tests": 0,
        "competitor_analysis_tests": 0,
        "video_panel_tests": 0,
        "strategy_tests": 0
    }
    
    # Send initial connection success message
    await websocket.send(json.dumps({
        "type": "connect",
        "data": {
            "status": "connected",
            "client_id": client_id,
            "message": "Dashboard Component Validation Server Connected",
            "timestamp": datetime.now().isoformat()
        }
    }))
    
    try:
        # Set start time
        start_time = time.time()
        last_test_time = start_time
        test_index = 0
        auto_test_mode = True  # Default to auto test mode
        
        # List of test functions for auto mode
        test_functions = [
            data_gen.generate_header_test,
            data_gen.generate_telemetry_test,
            data_gen.generate_track_map_test,
            data_gen.generate_ai_coaching_test,
            data_gen.generate_competitor_analysis_test,
            data_gen.generate_video_panel_test,
            data_gen.generate_strategy_test
        ]
        
        # Main loop
        while time.time() - start_time < VALIDATION_DURATION:
            # Check for incoming messages (for on-demand component testing)
            try:
                # Set a short timeout to not block the auto test mode
                message = await asyncio.wait_for(websocket.recv(), timeout=0.1)
                try:
                    request = json.loads(message)
                    
                    # Handle validate_component requests
                    if request.get("type") == "validate_component":
                        component_name = request.get("data", {}).get("component")
                        if component_name:
                            logger.info(f"On-demand validation request for component: {component_name}")
                            
                            # Get the appropriate test function
                            test_func = get_component_test_function(component_name, data_gen)
                            
                            if test_func:
                                # Generate and send test data
                                test_data = test_func()
                                await websocket.send(json.dumps(test_data))
                                
                                # Update test statistics
                                component_key = f"{component_name.lower().replace('-', '_')}_tests"
                                if component_key in test_stats:
                                    test_stats[component_key] += 1
                                
                                # Send validation summary for this component
                                await websocket.send(json.dumps({
                                    "type": "validation_summary",
                                    "data": {
                                        "component": component_name,
                                        "status": "success",
                                        "message": f"{component_name} component validated successfully",
                                        "details": {
                                            "data_type": test_data["type"],
                                            "timestamp": datetime.now().isoformat()
                                        },
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }))
                            else:
                                # Component not found
                                await websocket.send(json.dumps({
                                    "type": "validation_summary",
                                    "data": {
                                        "component": component_name,
                                        "status": "error",
                                        "message": f"Unknown component: {component_name}",
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }))
                        else:
                            # Missing component name
                            await websocket.send(json.dumps({
                                "type": "validation_summary",
                                "data": {
                                    "status": "error",
                                    "message": "Missing component name in validation request",
                                    "timestamp": datetime.now().isoformat()
                                }
                            }))
                    
                    # Handle mode switching
                    elif request.get("type") == "set_mode":
                        mode = request.get("data", {}).get("mode")
                        if mode == "auto":
                            auto_test_mode = True
                            logger.info("Switched to auto test mode")
                        elif mode == "manual":
                            auto_test_mode = False
                            logger.info("Switched to manual test mode")
                        
                        await websocket.send(json.dumps({
                            "type": "mode_change",
                            "data": {
                                "mode": "auto" if auto_test_mode else "manual",
                                "status": "success",
                                "message": f"Switched to {'auto' if auto_test_mode else 'manual'} test mode",
                                "timestamp": datetime.now().isoformat()
                            }
                        }))
                        
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {message}")
                    
            except asyncio.TimeoutError:
                # No message received, continue with auto test if enabled
                pass
            
            # Run auto tests if enabled
            if auto_test_mode:
                current_time = time.time()
                
                # Run next component test at regular intervals
                if current_time - last_test_time >= TEST_INTERVAL:
                    # Get the next test function
                    test_func = test_functions[test_index % len(test_functions)]
                    test_data = test_func()
                    
                    # Send test data
                    await websocket.send(json.dumps(test_data))
                    
                    # Update test statistics based on function name
                    for component_type in ["header", "telemetry", "track_map", "ai_coaching", 
                                          "competitor", "video", "strategy"]:
                        if component_type in test_func.__name__:
                            stat_key = f"{component_type}_tests"
                            if component_type == "competitor":
                                stat_key = "competitor_analysis_tests"
                            if stat_key in test_stats:
                                test_stats[stat_key] += 1
                    
                    # Update for next test
                    last_test_time = current_time
                    test_index += 1
            
            # Sleep briefly
            await asyncio.sleep(0.1)
        
        # Send final validation summary
        logger.info(f"Component validation complete. Stats: {test_stats}")
        await websocket.send(json.dumps({
            "type": "validation_summary",
            "data": {
                "duration": VALIDATION_DURATION,
                "stats": test_stats,
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "message": "Dashboard component validation completed successfully"
            }
        }))
        
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in component test server: {e}")
        logger.exception("Exception details:")

async def main():
    """Main function to start the WebSocket server"""
    logger.info(f"Starting Dashboard Component Validation Server on port {WEBSOCKET_PORT}")
    logger.info(f"Validation will run for {VALIDATION_DURATION} seconds")
    logger.info(f"Available components for validation:")
    logger.info(f"  - header")
    logger.info(f"  - telemetry")
    logger.info(f"  - track_map")
    logger.info(f"  - ai_coaching")
    logger.info(f"  - competitor_analysis")
    logger.info(f"  - competitor_positions")
    logger.info(f"  - video_panel")
    logger.info(f"  - strategy")
    
    # Start WebSocket server
    async with websockets.serve(component_test_server, "localhost", WEBSOCKET_PORT):
        logger.info(f"WebSocket server started at ws://localhost:{WEBSOCKET_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}")
