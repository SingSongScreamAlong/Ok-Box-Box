"""
Local Socket.IO Server — Electron Bridge Endpoint

Runs a local Socket.IO server on port 9999 so the Electron bridge
(python-bridge-simple.ts) can connect to it and receive forwarded
events (iracing_status, telemetry, session_metadata, incident, clip_saved).

Also receives commands from Electron (e.g. trigger_clip).

Architecture:
  iRacing → RelayAgent → local_server (port 9999) → Electron Bridge → Cloud
"""

import logging
import os
import threading
from typing import Any, Callable, Dict, Optional

import socketio
from engineio.async_drivers import threading as _threading_driver  # noqa: F401

logger = logging.getLogger(__name__)

DEFAULT_PORT = int(os.environ.get('RELAY_PORT', '9999'))


class LocalServer:
    """
    Local Socket.IO server for Electron bridge communication.

    Usage:
        server = LocalServer(port=9999)
        server.start()

        # Forward events from relay to Electron:
        server.emit('iracing_status', {'connected': True})
        server.emit('telemetry', {...})
        server.emit('clip_saved', {...})

        # Register handler for incoming commands:
        server.on_trigger_clip = lambda data: screen_capture.trigger_clip(...)

        server.stop()
    """

    def __init__(self, port: int = DEFAULT_PORT):
        self.port = port
        self.running = False
        self.thread: Optional[threading.Thread] = None

        # Create Socket.IO server (synchronous mode for threading)
        self.sio = socketio.Server(
            async_mode='threading',
            cors_allowed_origins='*',
            logger=False,
            engineio_logger=False,
        )
        self.app = socketio.WSGIApp(self.sio)

        # Command handlers (set by RelayAgent)
        self.on_trigger_clip: Optional[Callable[[Dict[str, Any]], None]] = None

        # Client tracking
        self.connected_clients: set = set()

        self._setup_handlers()

    def _setup_handlers(self):
        """Register Socket.IO event handlers for incoming commands."""

        @self.sio.event
        def connect(sid, environ):
            self.connected_clients.add(sid)
            logger.info(f"🔌 Electron bridge connected: {sid}")

        @self.sio.event
        def disconnect(sid):
            self.connected_clients.discard(sid)
            logger.info(f"🔌 Electron bridge disconnected: {sid}")

        @self.sio.on('trigger_clip')
        def handle_trigger_clip(sid, data):
            logger.info(f"📹 Manual clip trigger from Electron: {data}")
            if self.on_trigger_clip:
                try:
                    self.on_trigger_clip(data)
                except Exception as e:
                    logger.error(f"trigger_clip handler error: {e}")

    # ─── Lifecycle ───────────────────────────

    def start(self):
        """Start the local server in a background thread."""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(
            target=self._serve, daemon=True, name='LocalServer'
        )
        self.thread.start()
        logger.info(f"🔌 Local Socket.IO server started on port {self.port}")

    def _serve(self):
        """Run the WSGI server."""
        try:
            import eventlet
            eventlet.monkey_patch()
            listener = eventlet.listen(('127.0.0.1', self.port))
            eventlet.wsgi.server(listener, self.app, log_output=False)
        except ImportError:
            # Fallback: use simple_server from engineio
            try:
                from werkzeug.serving import make_server
                server = make_server('127.0.0.1', self.port, self.app)
                server.serve_forever()
            except ImportError:
                # Last resort: use socketio's built-in simple server
                import socketio
                # The threading async_mode uses the standard library
                from wsgiref.simple_server import make_server
                server = make_server('127.0.0.1', self.port, self.app)
                logger.info(f"📡 Using wsgiref simple server on port {self.port}")
                server.serve_forever()

    def stop(self):
        """Stop the server."""
        self.running = False
        # Note: daemon thread will die with the process
        logger.info("🔌 Local server stopped")

    # ─── Event Emission ──────────────────────

    def emit(self, event: str, data: Any):
        """Emit an event to all connected Electron bridge clients."""
        if not self.connected_clients:
            return
        try:
            self.sio.emit(event, data)
        except Exception as e:
            logger.debug(f"Local emit error ({event}): {e}")

    @property
    def has_clients(self) -> bool:
        """Check if any Electron bridge is connected."""
        return len(self.connected_clients) > 0
