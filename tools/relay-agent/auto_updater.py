"""
Auto-Updater for Ok, Box Box Relay

Checks for updates on startup and prompts user to download if available.
"""

import requests
import webbrowser
import tkinter as tk
from tkinter import messagebox
from packaging import version
import yaml
import os
import sys

# Update check endpoint
UPDATE_URL = "https://api.okboxbox.com/relay/version"
DOWNLOAD_URL = "https://okboxbox.com/download-relay"

def get_current_version() -> str:
    """Get current version from config or default."""
    try:
        config_path = os.path.join(os.path.dirname(sys.executable), "config.yaml")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                return config.get('version', '1.0.0')
    except Exception:
        pass
    return "1.0.0"

def check_for_updates() -> dict | None:
    """Check if an update is available."""
    try:
        response = requests.get(UPDATE_URL, timeout=5)
        if response.ok:
            data = response.json()
            current = version.parse(get_current_version())
            latest = version.parse(data.get('version', '0.0.0'))
            
            if latest > current:
                return {
                    'version': data.get('version'),
                    'url': data.get('download_url', DOWNLOAD_URL),
                    'notes': data.get('release_notes', '')
                }
    except Exception as e:
        print(f"Update check failed: {e}")
    return None

def prompt_update(update_info: dict) -> bool:
    """Prompt user to download update."""
    root = tk.Tk()
    root.withdraw()  # Hide main window
    
    message = f"""A new version of Ok, Box Box Relay is available!

Current: {get_current_version()}
New: {update_info['version']}

{update_info.get('notes', '')}

Would you like to download the update?"""

    result = messagebox.askyesno(
        "Ok, Box Box Relay - Update Available",
        message
    )
    
    if result:
        webbrowser.open(update_info['url'])
    
    root.destroy()
    return result

def auto_update_check(silent: bool = False):
    """
    Check for updates on startup.
    
    Args:
        silent: If True, only notify if update available
    """
    update = check_for_updates()
    if update:
        prompt_update(update)
    elif not silent:
        print("Ok, Box Box Relay is up to date.")

if __name__ == "__main__":
    auto_update_check()
