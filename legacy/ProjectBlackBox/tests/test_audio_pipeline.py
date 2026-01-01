"""
Tests for Audio Pipeline
"""

import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
import asyncio

# Add parent directory and relay_agent to path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, 'relay_agent'))

# Mock dependencies
sys.modules['openai'] = MagicMock()
sys.modules['elevenlabs'] = MagicMock()
sys.modules['pynput'] = MagicMock()
sys.modules['pygame'] = MagicMock()
sys.modules['pyaudio'] = MagicMock()
sys.modules['wave'] = MagicMock()
sys.modules['numpy'] = MagicMock()

from relay_agent.audio_pipeline import AudioPipeline

class TestAudioPipeline(unittest.TestCase):
    
    def setUp(self):
        self.openai_key = "test_key"
        self.elevenlabs_key = "test_key"
        
        # Mock internal components
        with patch('relay_agent.audio_pipeline.VoiceRecognition') as mock_vr, \
             patch('relay_agent.audio_pipeline.VoiceSynthesis') as mock_vs, \
             patch('relay_agent.audio_pipeline.VoiceRaceTeamInterface') as mock_team, \
             patch('relay_agent.audio_pipeline.EnhancedRaceEngineer'), \
             patch('relay_agent.audio_pipeline.RaceStrategist'), \
             patch('relay_agent.audio_pipeline.PerformanceCoach'), \
             patch('relay_agent.audio_pipeline.IntelligenceAnalyst'):
            
            self.pipeline = AudioPipeline(self.openai_key, self.elevenlabs_key)
            self.pipeline.synthesis.speak = AsyncMock()
            self.pipeline.team.process_driver_voice_input = MagicMock()
    
    async def async_test(self, coro):
        await coro
    
    def test_retry_success(self):
        """Test retry logic success"""
        async def run_test():
            mock_op = AsyncMock(return_value="success")
            result = await self.pipeline._retry_operation(mock_op)
            self.assertEqual(result, "success")
            self.assertEqual(mock_op.call_count, 1)
        
        asyncio.run(run_test())
    
    def test_retry_failure_then_success(self):
        """Test retry logic failure then success"""
        async def run_test():
            mock_op = AsyncMock(side_effect=[Exception("fail"), Exception("fail"), "success"])
            result = await self.pipeline._retry_operation(mock_op, max_retries=3)
            self.assertEqual(result, "success")
            self.assertEqual(mock_op.call_count, 3)
        
        asyncio.run(run_test())
    
    def test_retry_failure_max(self):
        """Test retry logic max failures"""
        async def run_test():
            mock_op = AsyncMock(side_effect=Exception("fail"))
            with self.assertRaises(Exception):
                await self.pipeline._retry_operation(mock_op, max_retries=3)
            self.assertEqual(mock_op.call_count, 3)
        
        asyncio.run(run_test())

if __name__ == '__main__':
    unittest.main()
