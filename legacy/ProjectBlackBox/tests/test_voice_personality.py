import unittest
import sys
import os

# Add relay_agent to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../relay_agent')))

from voice_personality import PersonalityManager, VoicePersonality

class TestVoicePersonality(unittest.TestCase):
    
    def setUp(self):
        self.manager = PersonalityManager()

    def test_default_personality(self):
        """Test default personality is set correctly"""
        personality = self.manager.get_personality()
        self.assertEqual(personality.name, "Calm F1 Engineer")

    def test_personality_switching(self):
        """Test switching between personalities"""
        # Switch to NASCAR spotter
        success = self.manager.set_personality("nascar_spotter")
        self.assertTrue(success)
        
        personality = self.manager.get_personality()
        self.assertEqual(personality.name, "NASCAR Spotter")
        self.assertEqual(personality.emotional_tone, "energetic")

    def test_invalid_personality(self):
        """Test handling of invalid personality ID"""
        success = self.manager.set_personality("invalid_id")
        self.assertFalse(success)
        
        # Should fall back to default
        personality = self.manager.get_personality("invalid_id")
        self.assertEqual(personality.name, "Calm F1 Engineer")

    def test_list_personalities(self):
        """Test listing all available personalities"""
        personalities = self.manager.list_personalities()
        
        self.assertIn("calm_f1_engineer", personalities)
        self.assertIn("nascar_spotter", personalities)
        self.assertIn("rally_codriver", personalities)
        self.assertEqual(len(personalities), 6)

    def test_detail_level_filtering(self):
        """Test detail level filtering"""
        # Minimal detail (NASCAR spotter)
        self.manager.set_personality("nascar_spotter")
        self.assertFalse(self.manager.should_include_detail("technical"))
        self.assertTrue(self.manager.should_include_detail("critical"))
        
        # Verbose detail (Rally co-driver)
        self.manager.set_personality("rally_codriver")
        self.assertTrue(self.manager.should_include_detail("technical"))
        self.assertTrue(self.manager.should_include_detail("contextual"))

    def test_system_prompt_retrieval(self):
        """Test system prompt retrieval"""
        prompt = self.manager.get_system_prompt("military_tactical")
        self.assertIn("military", prompt.lower())
        self.assertIn("concise", prompt.lower())

if __name__ == '__main__':
    unittest.main()
