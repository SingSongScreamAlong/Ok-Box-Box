import unittest
import sys
import os

# Add relay_agent to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../relay_agent')))

from damage_analyzer import DamageAnalyzer, DamageEstimate

class TestDamageAnalyzer(unittest.TestCase):
    
    def setUp(self):
        self.analyzer = DamageAnalyzer()

    def test_lap_delta_calculation(self):
        """Test lap time delta calculation from damage"""
        # 10% aero damage should add ~0.3s
        delta = self.analyzer._calculate_lap_delta(10.0, 0.0)
        self.assertAlmostEqual(delta, 0.3, places=1)
        
        # 10% suspension damage should add ~0.2s
        delta = self.analyzer._calculate_lap_delta(0.0, 10.0)
        self.assertAlmostEqual(delta, 0.2, places=1)
        
        # Combined
        delta = self.analyzer._calculate_lap_delta(10.0, 10.0)
        self.assertAlmostEqual(delta, 0.5, places=1)

    def test_severity_classification(self):
        """Test damage severity classification"""
        # Minor
        severity = self.analyzer._determine_severity(5.0, 3.0)
        self.assertEqual(severity, "MINOR")
        
        # Moderate
        severity = self.analyzer._determine_severity(15.0, 10.0)
        self.assertEqual(severity, "MODERATE")
        
        # Severe
        severity = self.analyzer._determine_severity(25.0, 20.0)
        self.assertEqual(severity, "SEVERE")

    def test_affected_corners(self):
        """Test identification of affected corner types"""
        # High aero damage affects high speed corners
        corners = self.analyzer._identify_affected_corners(10.0, 0.0)
        self.assertIn("high_speed", corners)
        
        # Suspension damage affects all corner types
        corners = self.analyzer._identify_affected_corners(0.0, 10.0)
        self.assertIn("medium_speed", corners)
        self.assertIn("low_speed", corners)

    def test_voice_alert_generation(self):
        """Test natural language alert generation"""
        # Minor damage
        damage = DamageEstimate(
            aero_damage_pct=5.0,
            suspension_damage_pct=3.0,
            estimated_lap_delta=0.2,
            affected_corners=["high_speed"],
            severity="MINOR"
        )
        alert = self.analyzer.generate_voice_alert(damage)
        self.assertIn("Minor damage", alert)
        self.assertIn("0.2", alert)
        
        # Severe damage
        damage.severity = "SEVERE"
        damage.estimated_lap_delta = 1.5
        alert = self.analyzer.generate_voice_alert(damage)
        self.assertIn("Severe", alert)
        self.assertIn("1.5", alert)

if __name__ == '__main__':
    unittest.main()
