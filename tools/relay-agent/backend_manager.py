"""
BackendManager - Multi-target transport manager for relay agent

Supports:
- Parallel fan-out to multiple gateway targets
- Per-target bounded queues with backpressure
- Kill switch to disable all backends
- Sampled ack requests for parity metrics
- Graceful degradation when targets fail
"""
import logging
import queue
import random
import socketio
import socketio.exceptions
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import config

logger = logging.getLogger(__name__)


class TargetState(Enum):
    """Connection state for a backend target"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    BACKOFF = "backoff"


@dataclass
class TargetStats:
    """Statistics for a single backend target"""
    url: str
    enabled: bool = True
    state: TargetState = TargetState.DISCONNECTED
    sent: int = 0
    failed: int = 0
    acked: int = 0
    dropped: int = 0
    last_connect_attempt_ms: float = 0
    last_send_ok_ms: float = 0
    last_ack_latency_ms: float = 0
    last_error: Optional[str] = None
    queue_size: int = 0
    backoff_until_ms: float = 0


@dataclass
class ParitySnapshot:
    """Parity metrics snapshot"""
    targets: List[TargetStats]
    total_sent: int = 0
    total_acked: int = 0
    total_failed: int = 0
    total_dropped: int = 0
    ack_latency_samples: List[float] = field(default_factory=list)


class BackendTarget:
    """
    Single backend target with its own Socket.IO client and queue
    """
    
    MAX_QUEUE_SIZE = 500
    MAX_BACKOFF_MS = 30000
    
    def __init__(self, url: str, index: int, on_ack: Optional[Callable] = None):
        self.url = url
        self.index = index
        self.enabled = True
        self.on_ack = on_ack
        
        # State
        self.state = TargetState.DISCONNECTED
        self.session_id: Optional[str] = None
        self.backoff_until_ms: float = 0
        self.backoff_count = 0
        
        # Counters
        self.sent = 0
        self.failed = 0
        self.acked = 0
        self.dropped = 0
        self.last_send_ok_ms: float = 0
        self.last_ack_latency_ms: float = 0
        self.last_error: Optional[str] = None
        
        # Queue (bounded)
        self.queue: queue.Queue = queue.Queue(maxsize=self.MAX_QUEUE_SIZE)
        
        # Socket.IO client
        self.sio = socketio.Client(
            reconnection=True,
            reconnection_attempts=5,
            reconnection_delay=1,
            reconnection_delay_max=10,
            logger=False,
            engineio_logger=False
        )
        self._setup_handlers()
        
        # Worker thread
        self.running = False
        self.worker_thread: Optional[threading.Thread] = None
        
        # Ack tracking
        self.pending_acks: Dict[str, float] = {}  # frameId -> sent_at_ms
        self.ack_latencies: List[float] = []  # Recent latencies for p50/p95
        
    def _setup_handlers(self):
        """Set up Socket.IO event handlers"""
        
        @self.sio.event
        def connect():
            self.state = TargetState.CONNECTED
            self.backoff_count = 0
            logger.info(f"✅ [{self.index}] Connected to {self._safe_url()}")
            if self.session_id:
                self.sio.emit('relay:register', {'sessionId': self.session_id})
        
        @self.sio.event
        def disconnect():
            self.state = TargetState.DISCONNECTED
            logger.warning(f"⚠️ [{self.index}] Disconnected from {self._safe_url()}")
        
        @self.sio.event
        def connect_error(error):
            self.state = TargetState.BACKOFF
            self.last_error = str(error)[:100]  # Truncate to avoid secrets
            self._apply_backoff()
            logger.error(f"❌ [{self.index}] Connection error: {self._safe_error()}")
        
        @self.sio.on('relay:ack')
        def on_relay_ack(data):
            frame_id = data.get('frameId')
            if frame_id and frame_id in self.pending_acks:
                sent_at = self.pending_acks.pop(frame_id)
                latency = time.time() * 1000 - sent_at
                self.acked += 1
                self.last_ack_latency_ms = latency
                self.ack_latencies.append(latency)
                # Keep last 100 samples
                if len(self.ack_latencies) > 100:
                    self.ack_latencies.pop(0)
                if self.on_ack:
                    self.on_ack(self.index, frame_id, latency)
        
        @self.sio.on('relay:viewers')
        def on_viewers(data):
            # Propagate viewer count to main manager if needed
            pass
    
    def _safe_url(self) -> str:
        """Return URL without credentials for logging"""
        # Basic sanitization - remove anything after @ in URL
        url = self.url
        if '@' in url:
            parts = url.split('@')
            url = parts[0].split('://')[0] + '://' + parts[-1]
        return url
    
    def _safe_error(self) -> str:
        """Return error without sensitive info"""
        if not self.last_error:
            return "Unknown"
        # Remove potential tokens/secrets
        safe = self.last_error
        for word in ['token', 'key', 'secret', 'password', 'auth']:
            if word.lower() in safe.lower():
                safe = f"[error contains sensitive info]"
                break
        return safe
    
    def _apply_backoff(self):
        """Apply exponential backoff"""
        self.backoff_count += 1
        delay = min(1000 * (2 ** self.backoff_count), self.MAX_BACKOFF_MS)
        self.backoff_until_ms = time.time() * 1000 + delay
        logger.debug(f"[{self.index}] Backoff {delay}ms (attempt {self.backoff_count})")
    
    def start(self):
        """Start the target worker thread"""
        if self.running:
            return
        self.running = True
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
    
    def stop(self):
        """Stop the target"""
        self.running = False
        if self.sio.connected:
            try:
                self.sio.disconnect()
            except:
                pass
    
    def connect(self) -> bool:
        """Connect to the target"""
        if self.state == TargetState.CONNECTED:
            return True
        
        if self.state == TargetState.BACKOFF:
            if time.time() * 1000 < self.backoff_until_ms:
                return False
        
        self.state = TargetState.CONNECTING
        try:
            self.sio.connect(
                self.url,
                transports=['websocket'],
                wait=True,
                wait_timeout=config.RELAY_TARGET_TIMEOUT_MS / 1000
            )
            return self.sio.connected
        except Exception as e:
            self.state = TargetState.BACKOFF
            self.last_error = str(e)[:100]
            self._apply_backoff()
            return False
    
    def enqueue(self, event: str, data: Dict[str, Any]) -> bool:
        """
        Enqueue a frame for sending. Returns False if dropped due to backpressure.
        """
        if not self.enabled:
            return False
        
        try:
            # Non-blocking put
            self.queue.put_nowait((event, data, time.time() * 1000))
            return True
        except queue.Full:
            # Drop oldest to make room
            try:
                self.queue.get_nowait()
                self.dropped += 1
            except queue.Empty:
                pass
            # Try again
            try:
                self.queue.put_nowait((event, data, time.time() * 1000))
                return True
            except queue.Full:
                self.dropped += 1
                return False
    
    def _worker_loop(self):
        """Worker thread that processes the queue"""
        last_throttle_log = 0
        
        while self.running:
            try:
                # Try to connect if needed
                if self.state != TargetState.CONNECTED:
                    if not self.connect():
                        time.sleep(0.5)
                        continue
                
                # Process queue
                try:
                    event, data, queued_at = self.queue.get(timeout=0.1)
                except queue.Empty:
                    continue
                
                # Check staleness
                age_ms = time.time() * 1000 - queued_at
                if age_ms > 2000:  # Drop frames older than 2s
                    self.dropped += 1
                    if time.time() - last_throttle_log > 10:
                        logger.warning(f"[{self.index}] Dropping stale frames (queue lag: {age_ms:.0f}ms)")
                        last_throttle_log = time.time()
                    continue
                
                # Send
                try:
                    self.sio.emit(event, data)
                    self.sent += 1
                    self.last_send_ok_ms = time.time() * 1000
                    
                    # Track ack if requested
                    if data.get('ackRequested') and data.get('frameId'):
                        self.pending_acks[data['frameId']] = time.time() * 1000
                        
                except Exception as e:
                    self.failed += 1
                    self.last_error = str(e)[:100]
                    
            except Exception as e:
                logger.error(f"[{self.index}] Worker error: {e}")
                time.sleep(0.5)
    
    def get_stats(self) -> TargetStats:
        """Get current stats"""
        return TargetStats(
            url=self._safe_url(),
            enabled=self.enabled,
            state=self.state,
            sent=self.sent,
            failed=self.failed,
            acked=self.acked,
            dropped=self.dropped,
            last_connect_attempt_ms=0,
            last_send_ok_ms=self.last_send_ok_ms,
            last_ack_latency_ms=self.last_ack_latency_ms,
            last_error=self._safe_error() if self.last_error else None,
            queue_size=self.queue.qsize(),
            backoff_until_ms=self.backoff_until_ms
        )


class BackendManager:
    """
    Multi-target backend manager with fan-out, kill switch, and parity metrics
    """
    
    def __init__(self):
        self.targets: List[BackendTarget] = []
        self.kill_switch_active = config.RELAY_KILL_SWITCH
        self.mode = config.RELAY_BACKEND_MODE  # 'single' or 'parallel'
        self.primary_index = config.RELAY_PRIMARY_INDEX
        self.sample_rate = config.RELAY_PARITY_SAMPLE_RATE
        
        # Session
        self.session_id: Optional[str] = None
        
        # Ack tracking for parity
        self.frame_counter = 0
        self.total_ack_latencies: List[float] = []
        
        # Parse backends
        self._parse_backends()
        
        logger.info(f"BackendManager initialized: mode={self.mode}, "
                   f"targets={len(self.targets)}, kill_switch={self.kill_switch_active}")
    
    def _parse_backends(self):
        """Parse RELAY_BACKENDS env var"""
        backends_str = config.RELAY_BACKENDS
        
        if not backends_str:
            # Fall back to single CLOUD_URL
            backends_str = config.CLOUD_URL
        
        urls = [u.strip() for u in backends_str.split(',') if u.strip()]
        
        # Parse enabled flags
        enabled_str = config.RELAY_TARGETS_ENABLED
        enabled_flags = []
        if enabled_str:
            enabled_flags = [f.strip() == '1' for f in enabled_str.split(',')]
        
        for i, url in enumerate(urls):
            target = BackendTarget(url, i, on_ack=self._on_target_ack)
            if i < len(enabled_flags):
                target.enabled = enabled_flags[i]
            self.targets.append(target)
    
    def _on_target_ack(self, target_index: int, frame_id: str, latency_ms: float):
        """Callback when a target receives an ack"""
        self.total_ack_latencies.append(latency_ms)
        if len(self.total_ack_latencies) > 1000:
            self.total_ack_latencies.pop(0)
    
    def start(self):
        """Start all target workers"""
        if self.kill_switch_active:
            logger.warning("🛑 KILL SWITCH ACTIVE - No backends will be connected")
            return
        
        for target in self.targets:
            if target.enabled:
                target.start()
    
    def stop(self):
        """Stop all targets"""
        for target in self.targets:
            target.stop()
    
    def set_session_id(self, session_id: str):
        """Set session ID for all targets"""
        self.session_id = session_id
        for target in self.targets:
            target.session_id = session_id
    
    def send(self, event: str, data: Dict[str, Any]) -> bool:
        """
        Send a frame to backends based on mode.
        Returns True if at least one target accepted the frame.
        """
        if self.kill_switch_active:
            return False
        
        # Add ack request to sampled frames
        self.frame_counter += 1
        if self.sample_rate > 0 and random.random() < self.sample_rate:
            data = data.copy()
            data['ackRequested'] = True
            data['frameId'] = f"f{self.frame_counter}-{int(time.time()*1000)}"
        
        success = False
        
        if self.mode == 'parallel':
            # Fan-out to all enabled targets
            for target in self.targets:
                if target.enabled:
                    if target.enqueue(event, data):
                        success = True
        else:
            # Single mode - primary only
            if 0 <= self.primary_index < len(self.targets):
                target = self.targets[self.primary_index]
                if target.enabled:
                    success = target.enqueue(event, data)
        
        return success
    
    def is_connected(self) -> bool:
        """Check if at least one target is connected"""
        if self.kill_switch_active:
            return False
        
        if self.mode == 'parallel':
            return any(t.state == TargetState.CONNECTED for t in self.targets if t.enabled)
        else:
            if 0 <= self.primary_index < len(self.targets):
                target = self.targets[self.primary_index]
                return target.enabled and target.state == TargetState.CONNECTED
            return False
    
    def get_target_stats(self) -> List[TargetStats]:
        """Get stats for all targets"""
        return [t.get_stats() for t in self.targets]
    
    def get_parity_snapshot(self) -> ParitySnapshot:
        """Get parity metrics snapshot"""
        stats = self.get_target_stats()
        return ParitySnapshot(
            targets=stats,
            total_sent=sum(s.sent for s in stats),
            total_acked=sum(s.acked for s in stats),
            total_failed=sum(s.failed for s in stats),
            total_dropped=sum(s.dropped for s in stats),
            ack_latency_samples=self.total_ack_latencies[-100:]
        )
    
    # Convenience methods matching PitBoxClient interface
    
    def emit(self, event: str, data: Dict[str, Any]) -> bool:
        """Emit wrapper for compatibility"""
        return self.send(event, data)
    
    def send_session_metadata(self, metadata: Dict[str, Any]) -> bool:
        """Send session metadata to all targets"""
        session_id = metadata.get('sessionId')
        if session_id:
            self.set_session_id(session_id)
        return self.send('session_metadata', metadata)
    
    def send_telemetry(self, telemetry: Dict[str, Any]) -> bool:
        """Send telemetry"""
        return self.send('telemetry', telemetry)
    
    def send_baseline_stream(self, car_data: Dict[str, Any]) -> bool:
        """Send baseline stream (4 Hz)"""
        if not self.session_id:
            return False
        
        packet = {
            'v': 2,
            'type': 'telemetry:baseline',
            'ts': time.time() * 1000,
            'sessionId': self.session_id,
            'streamType': 'baseline',
            'sampleHz': 4,
            'payload': car_data
        }
        return self.send('telemetry:baseline', packet)
    
    def send_controls_stream(self, car_data: Dict[str, Any]) -> bool:
        """Send controls stream (15 Hz)"""
        if not self.session_id:
            return False
        
        packet = {
            'v': 2,
            'type': 'telemetry:controls',
            'ts': time.time() * 1000,
            'sessionId': self.session_id,
            'streamType': 'controls',
            'sampleHz': 15,
            'payload': car_data
        }
        return self.send('telemetry:controls', packet)
    
    def send_race_event(self, event: Dict[str, Any]) -> bool:
        """Send race event"""
        return self.send('race_event', event)
    
    def send_incident(self, incident: Dict[str, Any]) -> bool:
        """Send incident"""
        return self.send('incident', incident)
    
    def should_send_controls(self) -> bool:
        """Check if any connected target requests controls"""
        # For now, always return True if connected (viewer detection TBD)
        return self.is_connected()
    
    def wait(self, seconds: float = 0.1):
        """Wait for a period (for main loop timing)"""
        time.sleep(seconds)
