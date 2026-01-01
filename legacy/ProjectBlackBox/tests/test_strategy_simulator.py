import unittest
from unittest.mock import MagicMock
import sys
import os

# Add relay_agent to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../relay_agent')))

from strategy_simulator import StrategySimulator, StrategyRecommendation

class TestStrategySimulator(unittest.TestCase):
    
    def setUp(self):
        self.simulator = StrategySimulator()

    def test_fuel_critical(self):
        """Test that fuel critical situation triggers immediate pit"""
        race_state = {
            'current_lap': 20,
            'total_laps': 30,
            'fuel_level': 10.0,  # Only 4 laps worth (10 / 2.5)
            'tire_age': 15,
            'current_position': 3
        }
        
        recommendation = self.simulator.analyze_strategy(race_state)
        
        self.assertEqual(recommendation.action, "BOX_NOW")
        self.assertEqual(recommendation.confidence, 1.0)
        self.assertIn("Fuel critical", recommendation.reasoning)

    def test_normal_strategy(self):
        """Test normal strategy recommendation"""
        race_state = {
            'current_lap': 10,
            'total_laps': 30,
            'fuel_level': 60.0,  # Plenty of fuel
            'tire_age': 8,
            'current_position': 5,
            'gap_ahead': 3.0,
            'gap_behind': 2.0
        }
        
        recommendation = self.simulator.analyze_strategy(race_state)
        
        # Should recommend one of the valid strategies
        self.assertIn(recommendation.action, ["BOX_NOW", "BOX_NEXT_LAP", "STAY_OUT"])
        self.assertGreater(recommendation.confidence, 0.0)

    def test_undercut_opportunity(self):
        """Test undercut detection"""
        race_state = {
            'gap_ahead': 20.0,  # Less than pit loss time (25s)
            'tire_age': 15  # Old tires
        }
        
        result = self.simulator.calculate_undercut_opportunity(race_state)
        
        self.assertIsNotNone(result)
        self.assertIn("Undercut", result)

    def test_tire_life_calculation(self):
        """Test tire life percentage calculation"""
        # New tires
        life = self.simulator._calculate_tire_life(0)
        self.assertEqual(life, 100.0)
        
        # Half life
        life = self.simulator._calculate_tire_life(15)
        self.assertEqual(life, 50.0)
        
        # Dead tires
        life = self.simulator._calculate_tire_life(30)
        self.assertEqual(life, 0.0)

if __name__ == '__main__':
    unittest.main()
