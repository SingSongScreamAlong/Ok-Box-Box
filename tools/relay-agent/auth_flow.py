"""
Browser-based OAuth flow for relay authentication.
Opens browser to login, captures token via local callback server.
"""
import http.server
import socketserver
import threading
import webbrowser
import urllib.parse
import logging
import os
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# Local callback server port
CALLBACK_PORT = 19847
CALLBACK_PATH = "/relay-callback"

# Token storage
TOKEN_FILE = Path(__file__).parent / ".relay_token"


class TokenCallbackHandler(http.server.BaseHTTPRequestHandler):
    """HTTP handler to receive OAuth callback with token."""
    
    token = None
    user_id = None
    
    def log_message(self, format, *args):
        # Suppress default HTTP logging
        pass
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == CALLBACK_PATH:
            # Parse query params
            params = urllib.parse.parse_qs(parsed.query)
            
            if 'token' in params:
                TokenCallbackHandler.token = params['token'][0]
                TokenCallbackHandler.user_id = params.get('user_id', [None])[0]
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                
                html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Ok,Box Box Relay - Connected!</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: #0a0a0a; 
                            color: white; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            margin: 0;
                        }
                        .container { text-align: center; }
                        h1 { color: #f97316; font-size: 2rem; margin-bottom: 1rem; }
                        p { color: #888; }
                        .checkmark { font-size: 4rem; margin-bottom: 1rem; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="checkmark">✅</div>
                        <h1>Relay Connected!</h1>
                        <p>You can close this window and return to the relay.</p>
                    </div>
                </body>
                </html>
                """
                self.wfile.write(html.encode())
                
                # Signal to stop server
                threading.Thread(target=self.server.shutdown).start()
            else:
                self.send_response(400)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"Missing token parameter")
        else:
            self.send_response(404)
            self.end_headers()


def save_token(token: str, user_id: str = None):
    """Save token to file for persistence."""
    data = {"token": token}
    if user_id:
        data["user_id"] = user_id
    
    TOKEN_FILE.write_text(json.dumps(data))
    logger.info(f"✅ Token saved to {TOKEN_FILE}")


def load_token() -> tuple[str, str]:
    """Load saved token if exists. Returns (token, user_id) or (None, None)."""
    if TOKEN_FILE.exists():
        try:
            data = json.loads(TOKEN_FILE.read_text())
            return data.get("token"), data.get("user_id")
        except Exception as e:
            logger.warning(f"Failed to load token: {e}")
    return None, None


def clear_token():
    """Clear saved token."""
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()
        logger.info("Token cleared")


def run_auth_flow(base_url: str = "https://app.okboxbox.com") -> tuple[str, str]:
    """
    Run the browser-based auth flow.
    
    1. Start local callback server
    2. Open browser to login page with redirect
    3. Wait for callback with token
    4. Save and return token
    
    Returns (token, user_id) or (None, None) if failed/cancelled.
    """
    # Check for existing token first
    existing_token, existing_user_id = load_token()
    if existing_token:
        logger.info("Using saved authentication token")
        return existing_token, existing_user_id
    
    # Build auth URL with callback
    callback_url = f"http://localhost:{CALLBACK_PORT}{CALLBACK_PATH}"
    auth_url = f"{base_url}/relay-auth?callback={urllib.parse.quote(callback_url)}"
    
    logger.info("=" * 50)
    logger.info("🔐 RELAY AUTHENTICATION REQUIRED")
    logger.info("=" * 50)
    logger.info("")
    logger.info("Opening browser for login...")
    logger.info("If browser doesn't open, visit:")
    logger.info(f"  {auth_url}")
    logger.info("")
    
    # Reset handler state
    TokenCallbackHandler.token = None
    TokenCallbackHandler.user_id = None
    
    # Start callback server
    try:
        with socketserver.TCPServer(("", CALLBACK_PORT), TokenCallbackHandler) as httpd:
            # Open browser
            webbrowser.open(auth_url)
            
            logger.info(f"Waiting for authentication (listening on port {CALLBACK_PORT})...")
            logger.info("Press Ctrl+C to cancel")
            
            # Serve until we get a token or timeout
            httpd.handle_request()  # Handle one request (the callback)
            
            if TokenCallbackHandler.token:
                save_token(TokenCallbackHandler.token, TokenCallbackHandler.user_id)
                logger.info("✅ Authentication successful!")
                return TokenCallbackHandler.token, TokenCallbackHandler.user_id
            else:
                logger.error("❌ Authentication failed - no token received")
                return None, None
                
    except KeyboardInterrupt:
        logger.info("\n⚠️ Authentication cancelled")
        return None, None
    except OSError as e:
        if "Address already in use" in str(e):
            logger.error(f"Port {CALLBACK_PORT} is already in use. Close other applications and try again.")
        else:
            logger.error(f"Failed to start callback server: {e}")
        return None, None


if __name__ == "__main__":
    # Test the auth flow
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    token, user_id = run_auth_flow()
    if token:
        print(f"\nToken: {token[:20]}...")
        print(f"User ID: {user_id}")
    else:
        print("\nNo token obtained")
