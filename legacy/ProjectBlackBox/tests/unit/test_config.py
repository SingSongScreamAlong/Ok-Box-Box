"""
Simple unit tests for configuration modules
Tests that don't require external dependencies
"""

import sys
from pathlib import Path
import pytest

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_config_module_exists():
    """Test that config module can be imported"""
    try:
        from relay_agent.config import Config
        assert Config is not None
    except ImportError as e:
        pytest.fail(f"Config module import failed: {e}")

def test_config_properties():
    """Test that config has expected properties"""
    try:
        from relay_agent.config import Config
        config = Config()
        
        # Test properties exist
        assert hasattr(config, 'BACKEND_URL')
        assert hasattr(config, 'SERVER_URL')
        assert hasattr(config, 'NODE_ENV')
        assert hasattr(config, 'is_production')
        
    except Exception as e:
        pytest.fail(f"Config properties test failed: {e}")

def test_environment_defaults():
    """Test that config provides defaults"""
    try:
        from relay_agent.config import Config
        config = Config()
        
        # Should have defaults
        assert config.BACKEND_URL is not None
        assert config.SERVER_URL is not None
        assert config.NODE_ENV in ['development', 'production', 'test']
        
    except Exception as e:
        pytest.fail(f"Environment defaults test failed: {e}")
