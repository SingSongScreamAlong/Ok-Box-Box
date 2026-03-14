"""
OBB Replay Intelligence — Screen Capture & Clip Writer

Rolling buffer captures iRacing at configurable FPS.
On event detection (incident, pass, manual trigger), extracts
pre+post event frames and encodes to MP4 via FFmpeg.

Designed to be wired into the RelayAgent main loop.
"""

import io
import json
import logging
import os
import queue
import subprocess
import tempfile
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional

try:
    import mss
    MSS_AVAILABLE = True
except ImportError:
    MSS_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════
# Configuration
# ═══════════════════════════════════════

@dataclass
class CaptureConfig:
    target_fps: int = 15              # Capture rate (15 is fine for review)
    capture_width: int = 1280         # Downscale target
    capture_height: int = 720
    buffer_seconds: int = 60          # Rolling buffer size
    jpeg_quality: int = 80            # In-memory compression
    pre_event_seconds: int = 10       # Seconds before event to include
    post_event_seconds: int = 10      # Seconds after event to record
    max_clip_seconds: int = 30        # Hard cap on clip duration
    output_dir: str = ''              # Default: ~/Ok-Box-Box/clips/
    video_codec: str = 'libx264'
    video_crf: int = 23               # Quality (lower=better, 18-28 range)
    video_preset: str = 'fast'        # Encoding speed
    max_storage_mb: int = 5000        # 5GB cap
    monitor_index: int = 1            # 1 = primary monitor (mss convention)
    use_cv2: bool = True              # Use cv2 if available (faster encode)


# ═══════════════════════════════════════
# Data Classes
# ═══════════════════════════════════════

@dataclass
class TelemetrySample:
    """Lightweight telemetry snapshot stored alongside each frame."""
    session_time_ms: int = 0
    speed: float = 0          # m/s from iRacing
    rpm: float = 0
    gear: int = 0
    throttle: float = 0       # 0-1
    brake: float = 0          # 0-1
    steering: float = 0       # radians
    fuel_level: float = 0     # liters
    fuel_pct: float = 0       # 0-1
    lap: int = 0
    lap_dist_pct: float = 0   # 0-1
    position: int = 0
    incident_count: int = 0


@dataclass
class BufferedFrame:
    timestamp: float              # wall clock (time.time())
    session_time_ms: int          # iRacing SessionTime at capture moment
    jpeg_bytes: bytes             # JPEG-compressed frame data


@dataclass
class ClipMetadata:
    clip_id: str = ''
    session_id: str = ''
    event_type: str = ''          # incident, pass, mistake, coaching_note, manual
    event_label: str = ''         # Human-readable description
    severity: str = 'minor'       # minor, moderate, major
    session_time_ms: int = 0      # iRacing SessionTime at event moment
    wall_clock_start: float = 0   # Unix timestamp of clip start frame
    wall_clock_end: float = 0     # Unix timestamp of clip end frame
    wall_clock_event: float = 0   # Unix timestamp of the triggering event
    duration_ms: int = 0          # Clip duration
    frame_count: int = 0
    resolution: str = ''          # "1280x720"
    file_path: str = ''           # Absolute path to MP4
    file_size_bytes: int = 0
    tags: list = field(default_factory=list)  # Auto-categorization tags
    telemetry_sync: dict = field(default_factory=lambda: {
        'session_time_ms_at_frame_0': 0,
        'fps': 15
    })


# ═══════════════════════════════════════
# FFmpeg Detection
# ═══════════════════════════════════════

def find_ffmpeg() -> Optional[str]:
    """Locate ffmpeg binary on PATH or common install locations."""
    # Try PATH first
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True, timeout=5
        )
        if result.returncode == 0:
            return 'ffmpeg'
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Common Windows locations
    common_paths = [
        r'C:\ffmpeg\bin\ffmpeg.exe',
        r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        r'C:\ProgramData\chocolatey\bin\ffmpeg.exe',
        os.path.expanduser(r'~\scoop\apps\ffmpeg\current\bin\ffmpeg.exe'),
    ]
    for p in common_paths:
        if os.path.isfile(p):
            return p

    return None


# ═══════════════════════════════════════
# Screen Capture Engine
# ═══════════════════════════════════════

class ScreenCapture:
    """
    Rolling buffer screen capture with event-triggered clip saving.

    Usage:
        capture = ScreenCapture(CaptureConfig())
        capture.start()

        # From telemetry loop:
        capture.update_session_context(session_id, session_time_ms)

        # On incident detection:
        capture.trigger_clip('incident', 'Contact at T1', severity='moderate')

        # Poll for completed clips:
        while not capture.pending_clips.empty():
            meta = capture.pending_clips.get_nowait()
            # forward to Electron / cloud

        capture.stop()
    """

    def __init__(self, config: Optional[CaptureConfig] = None):
        self.config = config or CaptureConfig()
        self.buffer: Deque[BufferedFrame] = deque(
            maxlen=self.config.buffer_seconds * self.config.target_fps
        )
        self.running = False
        self.capture_thread: Optional[threading.Thread] = None
        self.encode_threads: List[threading.Thread] = []
        self.pending_clips: queue.Queue[ClipMetadata] = queue.Queue()

        # Session context (updated from telemetry loop)
        self.session_time_ms: int = 0
        self.session_id: str = ''
        self.session_active: bool = False  # Only buffer when session is active

        # Post-event continuation recording
        self._post_event_until: float = 0  # wall clock time to stop post-event capture
        self._post_event_frames: List[BufferedFrame] = []
        self._post_event_meta: Optional[dict] = None

        # Telemetry snapshot buffer (mirrors frame buffer timing)
        self._telemetry_buffer: Deque[TelemetrySample] = deque(
            maxlen=self.config.buffer_seconds * self.config.target_fps
        )
        self._current_telemetry: Optional[TelemetrySample] = None
        self._post_event_telemetry: List[TelemetrySample] = []

        # FFmpeg
        self._ffmpeg_path = find_ffmpeg()

        # Output directory
        if not self.config.output_dir:
            self.config.output_dir = str(
                Path.home() / 'Ok-Box-Box' / 'clips'
            )
        os.makedirs(self.config.output_dir, exist_ok=True)

        # Stats
        self.frames_captured: int = 0
        self.clips_saved: int = 0
        self._last_stats_log: float = 0

    # ─── Lifecycle ───────────────────────────

    def start(self):
        """Start the capture thread."""
        if self.running:
            return

        if not MSS_AVAILABLE:
            logger.error("❌ mss not installed — screen capture disabled")
            return

        if not self._ffmpeg_path and not CV2_AVAILABLE:
            logger.error("❌ Neither FFmpeg nor cv2 found — clip encoding disabled")
            logger.error("   Install FFmpeg: choco install ffmpeg  OR  pip install opencv-python")
            return

        self.running = True
        self.capture_thread = threading.Thread(
            target=self._capture_loop, daemon=True, name='ScreenCapture'
        )
        self.capture_thread.start()
        logger.info(
            f"🎥 Screen Capture started: {self.config.capture_width}x{self.config.capture_height} "
            f"@ {self.config.target_fps}fps, {self.config.buffer_seconds}s buffer"
        )
        if self._ffmpeg_path:
            logger.info(f"   FFmpeg: {self._ffmpeg_path}")
        elif CV2_AVAILABLE:
            logger.info("   Encoder: OpenCV VideoWriter")

    def stop(self):
        """Stop capture, flush any pending clips."""
        self.running = False
        if self.capture_thread:
            self.capture_thread.join(timeout=3.0)
            self.capture_thread = None

        # Wait for pending encodes
        for t in self.encode_threads:
            t.join(timeout=10.0)
        self.encode_threads = [t for t in self.encode_threads if t.is_alive()]

        logger.info(
            f"🎥 Screen Capture stopped. "
            f"Frames: {self.frames_captured}, Clips: {self.clips_saved}"
        )

    # ─── Session Context ─────────────────────

    def update_session_context(self, session_id: str, session_time_ms: int,
                               telemetry: Optional[Dict[str, Any]] = None):
        """Called from telemetry loop to keep session time in sync."""
        self.session_id = session_id
        self.session_time_ms = session_time_ms
        self.session_active = session_time_ms > 0

        # Store current telemetry snapshot for frame tagging
        if telemetry:
            self._current_telemetry = TelemetrySample(
                session_time_ms=session_time_ms,
                speed=float(telemetry.get('speed', 0)),
                rpm=float(telemetry.get('rpm', 0)),
                gear=int(telemetry.get('gear', 0)),
                throttle=float(telemetry.get('throttle', 0)),
                brake=float(telemetry.get('brake', 0)),
                steering=float(telemetry.get('steering', 0)),
                fuel_level=float(telemetry.get('fuelLevel', telemetry.get('fuel_level', 0))),
                fuel_pct=float(telemetry.get('fuelPct', telemetry.get('fuel_pct', 0))),
                lap=int(telemetry.get('lap', 0)),
                lap_dist_pct=float(telemetry.get('lapDistPct', telemetry.get('lap_dist_pct', 0))),
                position=int(telemetry.get('position', 0)),
                incident_count=int(telemetry.get('incidentCount', telemetry.get('incident_count', 0))),
            )

    # ─── Clip Triggering ─────────────────────

    def trigger_clip(
        self,
        event_type: str,
        event_label: str,
        severity: str = 'minor',
        session_time_ms: int = 0,
    ):
        """
        Trigger a clip save. Extracts pre_event_seconds from buffer,
        then records post_event_seconds more, then encodes.
        """
        if not self.running:
            logger.warning("Cannot trigger clip — capture not running")
            return

        event_session_time = session_time_ms or self.session_time_ms
        event_wall_clock = time.time()

        # Extract pre-event frames from buffer
        cutoff = event_wall_clock - self.config.pre_event_seconds
        pre_frames = [f for f in self.buffer if f.timestamp >= cutoff]

        if not pre_frames:
            logger.warning("No buffered frames for clip — buffer may be empty")
            return

        logger.info(
            f"📹 Clip triggered: [{event_type}] {event_label} "
            f"({len(pre_frames)} pre-frames, recording {self.config.post_event_seconds}s more)"
        )

        # Extract matching pre-event telemetry samples
        pre_telemetry = list(self._telemetry_buffer)[-len(pre_frames):]

        # Store context for post-event continuation
        self._post_event_until = event_wall_clock + self.config.post_event_seconds
        self._post_event_frames = list(pre_frames)
        self._post_event_telemetry = list(pre_telemetry)
        self._post_event_meta = {
            'event_type': event_type,
            'event_label': event_label,
            'severity': severity,
            'event_session_time': event_session_time,
            'event_wall_clock': event_wall_clock,
        }

    # ─── Capture Loop ────────────────────────

    def _capture_loop(self):
        """
        Background thread: grabs screen at target_fps,
        resizes, JPEG-compresses, pushes to ring buffer.
        """
        interval = 1.0 / self.config.target_fps
        w, h = self.config.capture_width, self.config.capture_height

        with mss.mss() as sct:
            monitor = sct.monitors[self.config.monitor_index]
            logger.info(
                f"📺 Capturing monitor {self.config.monitor_index}: "
                f"{monitor['width']}x{monitor['height']}"
            )

            while self.running:
                loop_start = time.perf_counter()

                # Only capture when session is active (iRacing rendering)
                if not self.session_active:
                    time.sleep(0.25)
                    continue

                try:
                    # Grab screen
                    screenshot = sct.grab(monitor)

                    # Encode to JPEG (using cv2 if available, else PIL)
                    jpeg_bytes = self._compress_frame(screenshot, w, h)
                    if not jpeg_bytes:
                        continue

                    frame = BufferedFrame(
                        timestamp=time.time(),
                        session_time_ms=self.session_time_ms,
                        jpeg_bytes=jpeg_bytes,
                    )

                    # Push to ring buffer
                    self.buffer.append(frame)
                    self.frames_captured += 1

                    # Push matching telemetry sample
                    if self._current_telemetry:
                        self._telemetry_buffer.append(self._current_telemetry)
                    else:
                        self._telemetry_buffer.append(TelemetrySample(
                            session_time_ms=self.session_time_ms
                        ))

                    # If we're in post-event recording, also capture for clip
                    if self._post_event_meta and time.time() <= self._post_event_until:
                        self._post_event_frames.append(frame)
                        if self._current_telemetry:
                            self._post_event_telemetry.append(self._current_telemetry)
                        else:
                            self._post_event_telemetry.append(TelemetrySample(
                                session_time_ms=self.session_time_ms
                            ))
                    elif self._post_event_meta and time.time() > self._post_event_until:
                        # Post-event recording finished — encode clip
                        self._finalize_clip()

                    # Periodic stats
                    now = time.time()
                    if now - self._last_stats_log > 60:
                        buf_secs = len(self.buffer) / max(1, self.config.target_fps)
                        buf_mb = sum(len(f.jpeg_bytes) for f in self.buffer) / (1024 * 1024)
                        logger.debug(
                            f"📊 Buffer: {len(self.buffer)} frames "
                            f"({buf_secs:.0f}s, {buf_mb:.1f}MB), "
                            f"Total: {self.frames_captured} frames"
                        )
                        self._last_stats_log = now

                except Exception as e:
                    logger.error(f"Capture error: {e}")
                    time.sleep(0.5)

                # Sleep to maintain target fps
                elapsed = time.perf_counter() - loop_start
                sleep_time = interval - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)

    def _compress_frame(self, screenshot, w: int, h: int) -> Optional[bytes]:
        """Compress a screen grab to JPEG bytes, resizing to target resolution."""
        if CV2_AVAILABLE and self.config.use_cv2:
            frame = np.array(screenshot)
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
            frame = cv2.resize(frame, (w, h))
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), self.config.jpeg_quality]
            ok, buffer = cv2.imencode('.jpg', frame, encode_param)
            return buffer.tobytes() if ok else None

        if PIL_AVAILABLE:
            img = Image.frombytes('RGB', screenshot.size, screenshot.bgra, 'raw', 'BGRX')
            img = img.resize((w, h), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=self.config.jpeg_quality)
            return buf.getvalue()

        return None

    # ─── Clip Finalization ───────────────────

    def _finalize_clip(self):
        """Package collected frames and encode in background thread."""
        frames = self._post_event_frames
        telemetry_samples = self._post_event_telemetry
        meta_ctx = self._post_event_meta

        # Clear state
        self._post_event_frames = []
        self._post_event_telemetry = []
        self._post_event_meta = None
        self._post_event_until = 0

        if not frames or not meta_ctx:
            return

        # Enforce max clip length
        max_frames = self.config.max_clip_seconds * self.config.target_fps
        if len(frames) > max_frames:
            frames = frames[-max_frames:]
            telemetry_samples = telemetry_samples[-max_frames:]

        # Auto-categorize from telemetry context
        try:
            from clip_categorizer import categorize_clip
            category = categorize_clip(
                samples=telemetry_samples,
                event_type=meta_ctx['event_type'],
                event_label=meta_ctx['event_label'],
            )
            enriched_type = category.primary
            enriched_label = category.label
            enriched_tags = category.tags
            logger.info(f"🏷️ Auto-categorized: {enriched_type} — {enriched_label} (tags: {enriched_tags})")
        except Exception as e:
            logger.debug(f"Auto-categorization skipped: {e}")
            enriched_type = meta_ctx['event_type']
            enriched_label = meta_ctx['event_label']
            enriched_tags = []

        # Build metadata
        clip_id = str(uuid.uuid4())[:12]
        metadata = ClipMetadata(
            clip_id=clip_id,
            session_id=self.session_id,
            event_type=enriched_type,
            event_label=enriched_label,
            severity=meta_ctx['severity'],
            session_time_ms=meta_ctx['event_session_time'],
            wall_clock_start=frames[0].timestamp,
            wall_clock_end=frames[-1].timestamp,
            wall_clock_event=meta_ctx['event_wall_clock'],
            duration_ms=int((frames[-1].timestamp - frames[0].timestamp) * 1000),
            frame_count=len(frames),
            resolution=f"{self.config.capture_width}x{self.config.capture_height}",
            tags=enriched_tags,
            telemetry_sync={
                'session_time_ms_at_frame_0': frames[0].session_time_ms,
                'fps': self.config.target_fps,
            },
        )

        logger.info(
            f"📼 Encoding clip {clip_id}: {len(frames)} frames, "
            f"{metadata.duration_ms / 1000:.1f}s"
        )

        # Encode in background thread
        t = threading.Thread(
            target=self._encode_clip,
            args=(list(frames), metadata, list(telemetry_samples)),
            daemon=True,
            name=f'ClipEncode-{clip_id}',
        )
        t.start()
        self.encode_threads.append(t)

        # Clean up finished threads
        self.encode_threads = [t for t in self.encode_threads if t.is_alive()]

    def _encode_clip(self, frames: List[BufferedFrame], metadata: ClipMetadata,
                     telemetry_samples: Optional[List[TelemetrySample]] = None):
        """
        Encode frames to MP4. Tries cv2 VideoWriter first,
        falls back to FFmpeg subprocess (JPEG → MP4).
        Also writes a telemetry JSON sidecar for browser playback sync.
        """
        output_path = os.path.join(
            self.config.output_dir,
            f'{metadata.clip_id}.mp4'
        )
        meta_path = output_path.replace('.mp4', '.json')

        try:
            success = False

            # Method 1: cv2 VideoWriter (fast, no subprocess)
            if CV2_AVAILABLE and self.config.use_cv2:
                success = self._encode_with_cv2(frames, output_path)

            # Method 2: FFmpeg subprocess (better quality, browser-compatible)
            if not success and self._ffmpeg_path:
                success = self._encode_with_ffmpeg(frames, output_path)

            if not success:
                logger.error(f"❌ Failed to encode clip {metadata.clip_id}")
                return

            # Update metadata with file info
            metadata.file_path = os.path.abspath(output_path)
            metadata.file_size_bytes = os.path.getsize(output_path)

            # Write JSON sidecar (clip metadata)
            with open(meta_path, 'w') as f:
                json.dump(asdict(metadata), f, indent=2)

            # Generate thumbnail from mid-clip frame
            try:
                mid_idx = len(frames) // 2
                thumb_path = output_path.replace('.mp4', '_thumb.jpg')
                thumb_frame = frames[mid_idx]
                if CV2_AVAILABLE:
                    import numpy as np
                    img = cv2.imdecode(np.frombuffer(thumb_frame.jpeg_data, np.uint8), cv2.IMREAD_COLOR)
                    if img is not None:
                        # Resize to 320px wide
                        h, w = img.shape[:2]
                        scale = 320 / w
                        thumb = cv2.resize(img, (320, int(h * scale)))
                        cv2.imwrite(thumb_path, thumb, [cv2.IMWRITE_JPEG_QUALITY, 75])
                        logger.info(f"   🖼️ Thumbnail saved: {thumb_path}")
                else:
                    # Fallback: save raw JPEG mid-frame as thumbnail
                    with open(thumb_path, 'wb') as tf:
                        tf.write(thumb_frame.jpeg_data)
                    logger.info(f"   🖼️ Thumbnail saved (raw): {thumb_path}")
            except Exception as e:
                logger.debug(f"Thumbnail generation failed: {e}")

            # Write telemetry sidecar for browser sync
            if telemetry_samples:
                telemetry_path = output_path.replace('.mp4', '_telemetry.json')
                # Downsample: keep 1 sample per ~66ms (15fps) for efficiency
                samples_out = []
                fps = self.config.target_fps
                for i, sample in enumerate(telemetry_samples):
                    # Compute video time offset in seconds
                    video_time_s = i / fps
                    samples_out.append({
                        't': round(video_time_s, 3),
                        'st': sample.session_time_ms,
                        'spd': round(sample.speed, 1),
                        'rpm': round(sample.rpm),
                        'gear': sample.gear,
                        'thr': round(sample.throttle, 3),
                        'brk': round(sample.brake, 3),
                        'str': round(sample.steering, 3),
                        'fuel': round(sample.fuel_level, 2),
                        'fuelPct': round(sample.fuel_pct, 3),
                        'lap': sample.lap,
                        'dist': round(sample.lap_dist_pct, 4),
                        'pos': sample.position,
                        'inc': sample.incident_count,
                    })
                with open(telemetry_path, 'w') as f:
                    json.dump(samples_out, f)
                logger.info(f"   📊 Telemetry sidecar: {len(samples_out)} samples")

            # Enqueue for Electron/cloud
            self.pending_clips.put_nowait(metadata)
            self.clips_saved += 1

            size_mb = metadata.file_size_bytes / (1024 * 1024)
            logger.info(
                f"✅ Clip saved: {metadata.clip_id}.mp4 "
                f"({size_mb:.1f}MB, {metadata.duration_ms / 1000:.1f}s)"
            )

            # Enforce storage quota
            self._enforce_storage_quota()

        except Exception as e:
            logger.error(f"❌ Clip encode error ({metadata.clip_id}): {e}")

    def _encode_with_cv2(
        self, frames: List[BufferedFrame], output_path: str
    ) -> bool:
        """Encode using cv2.VideoWriter (fast but may not produce browser-friendly MP4)."""
        try:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(
                output_path, fourcc, self.config.target_fps,
                (self.config.capture_width, self.config.capture_height)
            )
            if not writer.isOpened():
                return False

            for frame in frames:
                nparr = np.frombuffer(frame.jpeg_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    writer.write(img)

            writer.release()
            return os.path.isfile(output_path) and os.path.getsize(output_path) > 0
        except Exception as e:
            logger.warning(f"cv2 encode failed: {e}")
            return False

    def _encode_with_ffmpeg(
        self, frames: List[BufferedFrame], output_path: str
    ) -> bool:
        """Encode using FFmpeg subprocess (better quality, browser-compatible)."""
        try:
            with tempfile.TemporaryDirectory(prefix='obb_clip_') as tmpdir:
                # Write numbered frames
                for i, frame in enumerate(frames):
                    frame_path = os.path.join(tmpdir, f'frame_{i:06d}.jpg')
                    with open(frame_path, 'wb') as f:
                        f.write(frame.jpeg_bytes)

                # Encode with FFmpeg
                cmd = [
                    self._ffmpeg_path, '-y',
                    '-framerate', str(self.config.target_fps),
                    '-i', os.path.join(tmpdir, 'frame_%06d.jpg'),
                    '-c:v', self.config.video_codec,
                    '-crf', str(self.config.video_crf),
                    '-preset', self.config.video_preset,
                    '-pix_fmt', 'yuv420p',       # Browser compatibility
                    '-movflags', '+faststart',    # Streaming-friendly
                    output_path,
                ]

                result = subprocess.run(
                    cmd, capture_output=True, timeout=60
                )

                if result.returncode != 0:
                    stderr = result.stderr.decode('utf-8', errors='replace')[:500]
                    logger.warning(f"FFmpeg stderr: {stderr}")
                    return False

                return os.path.isfile(output_path) and os.path.getsize(output_path) > 0

        except subprocess.TimeoutExpired:
            logger.error("FFmpeg encoding timed out (>60s)")
            return False
        except Exception as e:
            logger.warning(f"FFmpeg encode failed: {e}")
            return False

    # ─── Storage Management ──────────────────

    def _enforce_storage_quota(self):
        """Delete oldest clips if total storage exceeds quota."""
        clip_dir = self.config.output_dir
        if not os.path.isdir(clip_dir):
            return

        # Gather all clip files
        clips = []
        for f in os.listdir(clip_dir):
            if f.endswith('.mp4'):
                fp = os.path.join(clip_dir, f)
                clips.append((fp, os.path.getmtime(fp), os.path.getsize(fp)))

        total_mb = sum(c[2] for c in clips) / (1024 * 1024)

        if total_mb <= self.config.max_storage_mb:
            return

        # Sort oldest first, delete until under quota
        clips.sort(key=lambda c: c[1])
        while total_mb > self.config.max_storage_mb * 0.8 and clips:
            fp, _, size = clips.pop(0)
            try:
                os.remove(fp)
                # Also remove JSON sidecar
                json_path = fp.replace('.mp4', '.json')
                if os.path.isfile(json_path):
                    os.remove(json_path)
                total_mb -= size / (1024 * 1024)
                logger.info(f"🗑️ Deleted old clip: {os.path.basename(fp)}")
            except OSError as e:
                logger.warning(f"Failed to delete clip: {e}")

    # ─── Utility ─────────────────────────────

    def get_buffer_stats(self) -> dict:
        """Return current buffer statistics."""
        buf_frames = len(self.buffer)
        buf_mb = sum(len(f.jpeg_bytes) for f in self.buffer) / (1024 * 1024) if buf_frames else 0
        return {
            'frames': buf_frames,
            'seconds': buf_frames / max(1, self.config.target_fps),
            'memory_mb': round(buf_mb, 1),
            'clips_saved': self.clips_saved,
            'total_frames_captured': self.frames_captured,
            'recording_active': self._post_event_meta is not None,
        }
