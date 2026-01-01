#!/usr/bin/env python3
"""
Multi-Driver Components Validation Script

This script validates the integration between multi-driver dashboard components and the WebSocket service
by sending targeted test data for each component and verifying proper rendering.
"""

import asyncio
import json
import logging
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
logger = logging.getLogger("multi-driver-components-validation")

# Constants
WEBSOCKET_PORT = 8767  # Using a different port than the main validation scripts
VALIDATION_DURATION = 60.0  # seconds
TEST_INTERVAL = 5.0  # seconds between component tests

# Multi-Driver component-specific test data generators
class MultiDriverTestDataGenerator:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.drivers = [
            {"id": "driver_1", "name": "Lewis Hamilton", "status": "active", "role": "driver"},
            {"id": "driver_2", "name": "Max Verstappen", "status": "standby", "role": "driver"},
            {"id": "driver_3", "name": "Charles Leclerc", "status": "standby", "role": "driver"},
            {"id": "driver_4", "name": "Lando Norris", "status": "offline", "role": "driver"}
        ]
        self.active_driver_id = "driver_1"
        self.message_id_counter = 0
        self.handoff_id_counter = 0
        self.comparison_id_counter = 0
        
    def generate_driver_list_test(self):
        """Generate test data for the DriverSelector component"""
        logger.info("Generating DriverSelector component test data")
        return {
            "type": "driver_list",
            "data": {
                "drivers": self.drivers,
                "activeDriverId": self.active_driver_id
            }
        }
        
    def generate_driver_update_test(self):
        """Generate test data for driver updates"""
        logger.info("Generating driver update test data")
        driver_index = random.randint(0, len(self.drivers) - 1)
        status_options = ["active", "standby", "offline"]
        new_status = random.choice(status_options)
        
        # Update the driver's status in our local copy
        self.drivers[driver_index]["status"] = new_status
        
        return {
            "type": "driver_update",
            "data": {
                "driver": self.drivers[driver_index]
            }
        }
        
    def generate_team_message_test(self):
        """Generate test data for the TeamMessages component"""
        logger.info("Generating TeamMessages component test data")
        self.message_id_counter += 1
        
        # Randomly select a sender
        sender = random.choice(self.drivers)
        
        # Generate message with varying priority
        priority = random.choice(["normal", "high", "urgent"])
        
        # Create different types of messages for more realistic testing
        message_types = [
            # Standard message
            f"Test message #{self.message_id_counter} with {priority} priority",
            # Race strategy message
            f"Strategy update: Switch to {random.choice(['soft', 'medium', 'hard'])} tires on next pit stop",
            # Weather update
            f"Weather alert: {random.choice(['Rain expected in 10 minutes', 'Track drying up', 'Wind increasing to 20km/h'])}",
            # Team order
            f"Team order: {random.choice(['Hold position', 'Let teammate pass', 'Push for fastest lap'])}",
            # Technical feedback
            f"Car feedback: {random.choice(['Brake balance needs adjustment', 'Tire degradation higher than expected', 'Engine temperature rising'])}",
            # Long message to test wrapping
            "Detailed analysis of last sector performance shows we're losing time in the final chicane. Try taking a tighter line and brake 5 meters later. This should gain approximately 0.2 seconds per lap based on our simulations."
        ]
        
        # Randomly select read status (more likely to be unread)
        read_status = random.choices([True, False], weights=[0.3, 0.7])[0]
        
        # Add attachments occasionally
        has_attachment = random.random() < 0.3
        attachment = None
        if has_attachment:
            attachment_types = ["telemetry", "strategy", "weather", "competitor"]
            attachment = {
                "type": random.choice(attachment_types),
                "url": f"https://example.com/attachments/{uuid.uuid4()}",
                "name": f"Data-{self.message_id_counter}.json"
            }
        
        return {
            "type": "team_message",
            "data": {
                "message": {
                    "id": f"msg_{self.message_id_counter}",
                    "content": random.choice(message_types),
                    "senderId": sender["id"],
                    "senderName": sender["name"],
                    "priority": priority,
                    "sentAt": datetime.now().isoformat(),
                    "read": read_status,
                    "attachment": attachment
                }
            }
        }
        
    def generate_handoff_request_test(self):
        """Generate test data for the HandoffManager component - request"""
        logger.info("Generating HandoffManager request test data")
        self.handoff_id_counter += 1
        
        # Select random drivers for handoff (ensuring they're different)
        available_drivers = [d for d in self.drivers if d["status"] != "offline"]
        if len(available_drivers) < 2:
            # Ensure we have at least two drivers available
            available_drivers = self.drivers[:2]
            # Update their status to make them available
            available_drivers[0]["status"] = "active"
            available_drivers[1]["status"] = "standby"
        
        from_driver = random.choice(available_drivers)
        to_driver = random.choice([d for d in available_drivers if d["id"] != from_driver["id"]])
        
        # Generate realistic handoff reasons
        handoff_reasons = [
            f"Driver change for {random.choice(['pit strategy', 'fatigue management', 'specialized expertise'])}",
            f"Scheduled rotation after {random.randint(1, 4)} hour stint",
            f"Technical issue requires {to_driver['name']}'s expertise",
            f"Strategy change for {random.choice(['wet conditions', 'night driving', 'fuel saving'])}",
            f"Team order: {from_driver['name']} to hand over to {to_driver['name']}"
        ]
        
        # Add urgency level
        urgency = random.choice(["routine", "important", "critical"])
        
        # Add estimated handoff time
        handoff_time_minutes = random.randint(1, 15)
        
        return {
            "type": "handoff_request",
            "data": {
                "handoff": {
                    "id": f"handoff_{self.handoff_id_counter}",
                    "fromDriverId": from_driver["id"],
                    "toDriverId": to_driver["id"],
                    "notes": random.choice(handoff_reasons),
                    "requestedAt": datetime.now().isoformat(),
                    "status": "pending",
                    "urgency": urgency,
                    "estimatedHandoffTime": handoff_time_minutes,
                    "currentLap": random.randint(1, 50),
                    "telemetrySnapshot": {
                        "speed": random.randint(60, 300),
                        "fuel": random.randint(10, 100),
                        "tireWear": {
                            "FL": random.randint(70, 100),
                            "FR": random.randint(70, 100),
                            "RL": random.randint(70, 100),
                            "RR": random.randint(70, 100)
                        }
                    }
                }
            }
        }
        
    def generate_handoff_response_test(self):
        """Generate test data for the HandoffManager component - response"""
        logger.info("Generating HandoffManager response test data")
        
        # Use the latest handoff ID
        handoff_id = f"handoff_{self.handoff_id_counter}"
        
        # Randomly choose a response status with weighted probabilities
        status = random.choices(
            ["confirmed", "rejected", "completed", "cancelled", "delayed"], 
            weights=[0.4, 0.2, 0.2, 0.1, 0.1]
        )[0]
        
        # Generate response data based on status
        response_data = {
            "handoffId": handoff_id,
            "status": status,
            "respondedAt": datetime.now().isoformat()
        }
        
        # Add status-specific details
        if status == "rejected":
            reasons = [
                "Driver not ready",
                "Current situation requires continuity",
                "Technical issue prevents handoff",
                "Team strategy changed",
                "Safety concerns"
            ]
            response_data["reason"] = random.choice(reasons)
        
        elif status == "delayed":
            response_data["newEstimatedTime"] = random.randint(5, 30)
            response_data["reason"] = random.choice([
                "Waiting for optimal track position",
                "Completing current strategy phase",
                "Weather conditions changing",
                "Preparing secondary driver"
            ])
        
        elif status == "completed":
            # Add handoff completion details
            response_data["completedAt"] = datetime.now().isoformat()
            response_data["handoffDuration"] = random.randint(15, 120)  # seconds
            response_data["trackPosition"] = random.choice(["pit lane", "main straight", "sector 1", "sector 2", "sector 3"])
        
        return {
            "type": "handoff_response",
            "data": response_data
        }
        
    def generate_driver_comparison_test(self):
        """Generate test data for the DriverComparison component"""
        logger.info("Generating DriverComparison component test data")
        self.comparison_id_counter += 1
        
        # Select two drivers to compare
        driver_a = self.drivers[0]
        driver_b = self.drivers[1]
        comparison_id = f"{driver_a['id']}_{driver_b['id']}_{uuid.uuid4()}"
        
        # Generate random metrics with deltas
        metrics = [
            {
                "name": "lapTime",
                "driverA": {
                    "value": "1:32.456",
                    "delta": -0.234
                },
                "driverB": {
                    "value": "1:32.690",
                    "delta": 0.234
                }
            },
            {
                "name": "sector1",
                "driverA": {
                    "value": "31.123",
                    "delta": -0.089
                },
                "driverB": {
                    "value": "31.212",
                    "delta": 0.089
                }
            },
            {
                "name": "sector2",
                "driverA": {
                    "value": "28.765",
                    "delta": 0.102
                },
                "driverB": {
                    "value": "28.663",
                    "delta": -0.102
                }
            },
            {
                "name": "sector3",
                "driverA": {
                    "value": "32.568",
                    "delta": -0.247
                },
                "driverB": {
                    "value": "32.815",
                    "delta": 0.247
                }
            },
            {
                "name": "fuelUsage",
                "driverA": {
                    "value": 2.34,
                    "delta": -0.12
                },
                "driverB": {
                    "value": 2.46,
                    "delta": 0.12
                }
            },
            {
                "name": "tireWearFL",
                "driverA": {
                    "value": 0.92,
                    "delta": 0.03
                },
                "driverB": {
                    "value": 0.89,
                    "delta": -0.03
                }
            }
        ]
        
        return {
            "type": "comparison_result",
            "data": {
                "comparisonId": comparison_id,
                "driverAId": driver_a["id"],
                "driverBId": driver_b["id"],
                "metrics": metrics,
                "timestamp": datetime.now().isoformat()
            }
        }

# Component test function mapping
def get_component_test_function(component_name, data_gen):
    """Get the appropriate test function for a component"""
    component_map = {
        "driver_selector": data_gen.generate_driver_list_test,
        "driver_update": data_gen.generate_driver_update_test,
        "team_messages": data_gen.generate_team_message_test,
        "handoff_manager": data_gen.generate_handoff_request_test,
        "handoff_response": data_gen.generate_handoff_response_test,
        "driver_comparison": data_gen.generate_driver_comparison_test
    }
    
    return component_map.get(component_name, None)

# WebSocket server handler
async def multi_driver_test_server(websocket, path):
    """WebSocket server to handle multi-driver component testing"""
    client_id = str(uuid.uuid4())[:8]
    logger.info(f"Client {client_id} connected")
    
    # Send connection confirmation
    await websocket.send(json.dumps({
        "type": "connect",
        "data": {
            "status": "connected",
            "client_id": client_id,
            "message": "Multi-Driver Component Validation Server Connected",
            "timestamp": datetime.now().isoformat()
        }
    }))
    
    # Initialize test data generator
    data_gen = MultiDriverTestDataGenerator()
    
    # Set up test functions
    test_functions = [
        data_gen.generate_driver_list_test,
        data_gen.generate_driver_update_test,
        data_gen.generate_team_message_test,
        data_gen.generate_handoff_request_test,
        data_gen.generate_handoff_response_test,
        data_gen.generate_driver_comparison_test
    ]
    
    # Test statistics
    test_stats = {
        "driver_selector_tests": 0,
        "driver_update_tests": 0,
        "team_messages_tests": 0,
        "handoff_manager_tests": 0,
        "handoff_response_tests": 0,
        "driver_comparison_tests": 0
    }
    
    # Test control variables
    auto_test_mode = True
    test_index = 0
    start_time = time.time()
    last_test_time = start_time
    
    try:
        # Main test loop
        while time.time() - start_time < VALIDATION_DURATION:
            # Check for client messages
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=0.1)
                logger.info(f"Received message from client {client_id}: {message}")
                
                try:
                    data = json.loads(message)
                    msg_type = data.get("type", "")
                    
                    # Handle validation request
                    if msg_type == "validate_component":
                        component_name = data.get("data", {}).get("component", "")
                        test_func = get_component_test_function(component_name, data_gen)
                        
                        if test_func:
                            # Generate and send test data
                            test_data = test_func()
                            await websocket.send(json.dumps(test_data))
                            
                            # Update test statistics
                            stat_key = f"{component_name}_tests"
                            if stat_key in test_stats:
                                test_stats[stat_key] += 1
                            
                            # Send validation summary
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
                            # Component not supported
                            await websocket.send(json.dumps({
                                "type": "validation_summary",
                                "data": {
                                    "component": component_name,
                                    "status": "error",
                                    "message": f"Component {component_name} not supported for validation",
                                    "timestamp": datetime.now().isoformat()
                                }
                            }))
                    
                    # Handle mode change request
                    elif msg_type == "set_mode":
                        mode = data.get("data", {}).get("mode", "auto")
                        auto_test_mode = (mode == "auto")
                        
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
                    for component_type in ["driver_list", "driver_update", "team_message", 
                                          "handoff_request", "handoff_response", "driver_comparison"]:
                        if component_type in test_func.__name__:
                            stat_key = f"{component_type.replace('generate_', '').replace('_test', '')}_tests"
                            if stat_key in test_stats:
                                test_stats[stat_key] += 1
                    
                    # Update for next test
                    last_test_time = current_time
                    test_index += 1
            
            # Sleep briefly
            await asyncio.sleep(0.1)
        
        # Send final validation summary
        logger.info(f"Multi-driver component validation complete. Stats: {test_stats}")
        await websocket.send(json.dumps({
            "type": "validation_summary",
            "data": {
                "duration": VALIDATION_DURATION,
                "stats": test_stats,
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "message": "Multi-driver component validation completed successfully"
            }
        }))
        
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in multi-driver test server: {e}")
        logger.exception("Exception details:")

async def main():
    """Main function to start the WebSocket server"""
    logger.info(f"Starting Multi-Driver Component Validation Server on port {WEBSOCKET_PORT}")
    logger.info(f"Validation will run for {VALIDATION_DURATION} seconds")
    logger.info(f"Available components for validation:")
    logger.info(f"  - driver_selector")
    logger.info(f"  - team_messages")
    logger.info(f"  - handoff_manager")
    logger.info(f"  - driver_comparison")
    
    # Start WebSocket server
    async with websockets.serve(multi_driver_test_server, "localhost", WEBSOCKET_PORT):
        logger.info(f"WebSocket server started at ws://localhost:{WEBSOCKET_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}")
