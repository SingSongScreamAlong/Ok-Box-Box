"""
Debug Server - Local HTTP debug endpoints for relay agent

Provides:
- GET /debug/targets - Target connection states and counters
- GET /debug/parity - Parity metrics snapshot
- GET /debug/health - Overall health and kill switch status

Binds to 127.0.0.1 only for security.
"""
import json
import logging
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional, Callable

import config

logger = logging.getLogger(__name__)

DEBUG_PORT = int(config.RELAY_DEBUG_PORT) if hasattr(config, 'RELAY_DEBUG_PORT') else 8765


class DebugHandler(BaseHTTPRequestHandler):
    """HTTP request handler for debug endpoints"""
    
    # Class-level reference to data provider
    get_target_stats: Optional[Callable] = None
    get_parity_snapshot: Optional[Callable] = None
    is_kill_switch_active: Optional[Callable] = None
    
    def log_message(self, format, *args):
        """Suppress default HTTP logging"""
        logger.debug(f"Debug request: {args[0]}")
    
    def _send_json(self, data: dict, status: int = 200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str, indent=2).encode())
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            if self.path == '/debug/targets':
                self._handle_targets()
            elif self.path == '/debug/parity':
                self._handle_parity()
            elif self.path == '/debug/health':
                self._handle_health()
            else:
                self._send_json({'error': 'Not found'}, 404)
        except Exception as e:
            logger.error(f"Debug server error: {e}")
            self._send_json({'error': str(e)}, 500)
    
    def _handle_targets(self):
        """GET /debug/targets - Target states and counters"""
        if not self.get_target_stats:
            self._send_json({'error': 'Not initialized'}, 503)
            return
        
        stats = self.get_target_stats()
        targets = []
        for stat in stats:
            targets.append({
                'url': stat.url,
                'enabled': stat.enabled,
                'state': stat.state.value if hasattr(stat.state, 'value') else str(stat.state),
                'counters': {
                    'sent': stat.sent,
                    'failed': stat.failed,
                    'acked': stat.acked,
                    'dropped': stat.dropped
                },
                'queueSize': stat.queue_size,
                'lastSendOkMs': stat.last_send_ok_ms,
                'lastAckLatencyMs': stat.last_ack_latency_ms,
                'lastError': stat.last_error
            })
        
        self._send_json({
            'targets': targets,
            'mode': config.RELAY_BACKEND_MODE,
            'primaryIndex': config.RELAY_PRIMARY_INDEX,
            'killSwitch': config.RELAY_KILL_SWITCH,
            'timestamp': __import__('time').time() * 1000
        })
    
    def _handle_parity(self):
        """GET /debug/parity - Parity metrics snapshot"""
        if not self.get_parity_snapshot:
            self._send_json({'error': 'Not initialized'}, 503)
            return
        
        snapshot = self.get_parity_snapshot()
        
        # Calculate percentiles
        latencies = snapshot.ack_latency_samples
        p50 = sorted(latencies)[len(latencies)//2] if latencies else 0
        p95 = sorted(latencies)[int(len(latencies)*0.95)] if len(latencies) > 20 else 0
        
        per_target = []
        for stat in snapshot.targets:
            per_target.append({
                'url': stat.url,
                'sent': stat.sent,
                'acked': stat.acked,
                'failed': stat.failed,
                'dropped': stat.dropped,
                'ackRate': stat.acked / max(stat.sent, 1)
            })
        
        self._send_json({
            'totalSent': snapshot.total_sent,
            'totalAcked': snapshot.total_acked,
            'totalFailed': snapshot.total_failed,
            'totalDropped': snapshot.total_dropped,
            'ackLatency': {
                'p50': p50,
                'p95': p95,
                'samples': len(latencies)
            },
            'perTarget': per_target,
            'timestamp': __import__('time').time() * 1000
        })
    
    def _handle_health(self):
        """GET /debug/health - Overall health"""
        kill_switch = False
        if self.is_kill_switch_active:
            kill_switch = self.is_kill_switch_active()
        
        status = 'healthy'
        if kill_switch:
            status = 'kill_switch_active'
        
        self._send_json({
            'status': status,
            'killSwitch': kill_switch,
            'mode': config.RELAY_BACKEND_MODE,
            'version': config.RELAY_VERSION,
            'timestamp': __import__('time').time() * 1000
        })


class DebugServer:
    """Debug HTTP server running on background thread"""
    
    def __init__(self, get_target_stats: Callable, get_parity_snapshot: Callable, 
                 is_kill_switch_active: Callable):
        self.port = DEBUG_PORT
        self.server: Optional[HTTPServer] = None
        self.thread: Optional[threading.Thread] = None
        
        # Set class-level callbacks
        DebugHandler.get_target_stats = get_target_stats
        DebugHandler.get_parity_snapshot = get_parity_snapshot
        DebugHandler.is_kill_switch_active = is_kill_switch_active
    
    def start(self):
        """Start the debug server"""
        try:
            self.server = HTTPServer(('127.0.0.1', self.port), DebugHandler)
            self.thread = threading.Thread(target=self._serve, daemon=True)
            self.thread.start()
            logger.info(f"🔧 Debug server started at http://127.0.0.1:{self.port}")
        except Exception as e:
            logger.warning(f"Failed to start debug server: {e}")
    
    def _serve(self):
        """Server loop"""
        if self.server:
            self.server.serve_forever()
    
    def stop(self):
        """Stop the debug server"""
        if self.server:
            self.server.shutdown()
