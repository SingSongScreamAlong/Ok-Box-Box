"""
Tests for iRacing SDK Wrapper
"""

import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock irsdk module before import
sys.modules['irsdk'] = MagicMock()

from relay_agent.iracing_sdk_wrapper import iRacingSDKWrapper

class TestiRacingSDKWrapper(unittest.TestCase):
    
    def setUp(self):
        # Reset mock
        self.mock_irsdk = sys.modules['irsdk']
        self.mock_irsdk.reset_mock()
        self.mock_irsdk.IRSDK.return_value = self.mock_irsdk
        self.wrapper = iRacingSDKWrapper()
    
    def test_initialization(self):
        """Test that wrapper initializes correctly"""
        self.assertFalse(self.wrapper.connected)
        self.assertEqual(self.wrapper.telemetry_callbacks, [])
        self.assertEqual(self.wrapper.session_callbacks, [])
    
    def test_connect_success(self):
        """Test successful connection"""
        self.mock_irsdk.startup.return_value = True
        self.mock_irsdk.is_initialized = True
        
        # Mock session info return
        with patch.object(self.wrapper, 'get_session_info') as mock_get_info:
            mock_get_info.return_value = MagicMock()
            
            result = self.wrapper.connect(timeout=1)
            
            self.assertTrue(result)
            self.assertTrue(self.wrapper.connected)
            self.mock_irsdk.startup.assert_called()
    
    def test_connect_failure(self):
        """Test connection failure"""
        self.mock_irsdk.startup.return_value = False
        
        result = self.wrapper.connect(timeout=1)
        
        self.assertFalse(result)
        self.assertFalse(self.wrapper.connected)
    
    def test_check_connection(self):
        """Test connection check"""
        self.wrapper.connected = True
        self.mock_irsdk.is_initialized = True
        self.assertTrue(self.wrapper.check_connection())
        
        self.mock_irsdk.is_initialized = False
        self.assertFalse(self.wrapper.check_connection())
        self.assertFalse(self.wrapper.connected)

if __name__ == '__main__':
    unittest.main()
