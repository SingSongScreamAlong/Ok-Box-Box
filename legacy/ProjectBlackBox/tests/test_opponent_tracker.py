import unittest
from unittest.mock import MagicMock
import sys
import os
import time

# Add relay_agent to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../relay_agent')))

from opponent_tracker import OpponentTracker, OpponentProfile

class MockTelemetry:
    def __init__(self):
        self.car_idx_track_surface = [3] * 64 # 3 = OnTrack
        self.car_idx_lap_dist_pct = [0.0] * 64

class TestOpponentTracker(unittest.TestCase):
    
    def setUp(self):
        self.tracker = OpponentTracker()
        self.session_info = MagicMock()
        self.session_info.driver_id = "0" # Player is car 0
        
        # Mock competitors list
        self.session_info.competitors = [
            {'driver_id': '1', 'driver_name': 'Aggressive Driver'},
            {'driver_id': '2', 'driver_name': 'Safe Driver'}
        ]
        
        # Bypass throttle
        self.tracker.last_check_time = 0

    def test_roster_update(self):
        """Test that opponents are added to the tracker"""
        telemetry = MockTelemetry()
        self.tracker.update(telemetry, self.session_info)
        
        self.assertIn(1, self.tracker.opponents)
        self.assertIn(2, self.tracker.opponents)
        self.assertEqual(self.tracker.opponents[1].driver_name, 'Aggressive Driver')

    def test_mistake_detection(self):
        """Test detection of off-track mistakes"""
        telemetry = MockTelemetry()
        
        # Initialize
        self.tracker.update(telemetry, self.session_info)
        
        # Car 1 goes off track (1)
        telemetry.car_idx_track_surface[1] = 1
        
        # Bypass throttle again
        self.tracker.last_check_time = 0
        
        # Update
        self.tracker.update(telemetry, self.session_info)
        
        # Check profile
        profile = self.tracker.opponents[1]
        self.assertEqual(profile.mistake_count, 1)
        self.assertGreater(profile.aggression_score, 0)

    def test_aggression_alert(self):
        """Test alert generation for aggressive driver nearby"""
        telemetry = MockTelemetry()
        
        # Initialize
        self.tracker.update(telemetry, self.session_info)
        
        # Make Car 1 very aggressive
        profile = self.tracker.opponents[1]
        profile.aggression_score = 8.0 # Above threshold of 7.0
        
        # Move Car 1 close behind player (Player at 0.5, Car 1 at 0.49)
        telemetry.car_idx_lap_dist_pct[0] = 0.5
        telemetry.car_idx_lap_dist_pct[1] = 0.49
        
        # Bypass throttle again
        self.tracker.last_check_time = 0
        
        # Force update (bypass 1s throttle in test by mocking time if needed, 
        # but update() checks dt. Let's sleep slightly or mock time)
        
        # We need to mock time.time() to ensure dt > 1.0
        # But for simplicity, we can just manually call _generate_alert
        
        alert = self.tracker._generate_alert(profile, 0, telemetry)
        self.assertIsNotNone(alert)
        self.assertIn("Careful with Aggressive Driver", alert)

if __name__ == '__main__':
    unittest.main()
