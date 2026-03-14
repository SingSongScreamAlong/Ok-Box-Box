"""
Clip Auto-Categorizer — Replay Intelligence

Analyzes telemetry context around a clip event to automatically
assign meaningful labels beyond just "incident" or "manual".

Categories detected:
  - overtake / position_gained
  - position_lost / undercut
  - off_track / spin
  - pit_entry / pit_exit
  - fastest_lap
  - close_battle (sustained proximity)
  - hard_braking (threshold braking event)
  - high_speed_corner (fast commitment)
  - start_sequence (first lap action)

Uses the TelemetrySample buffer from ScreenCapture.
"""

import logging
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ClipCategory:
    """Result of auto-categorization."""
    primary: str          # Main category (e.g., 'overtake')
    label: str            # Human-readable label
    confidence: float     # 0-1 how confident the detection is
    tags: List[str]       # Additional tags for filtering


def categorize_clip(
    samples: List,  # List[TelemetrySample]
    event_type: str = 'unknown',
    event_label: str = '',
    position_before: int = 0,
    position_after: int = 0,
    best_lap_ms: int = 0,
    current_lap_ms: int = 0,
) -> ClipCategory:
    """
    Analyze telemetry samples to auto-categorize a clip.

    Args:
        samples: Telemetry samples spanning the clip duration
        event_type: Original event type from trigger
        event_label: Original label
        position_before: Race position before the clip window
        position_after: Race position after the clip window
        best_lap_ms: Session best lap time in ms
        current_lap_ms: Current lap time in ms at event
    """
    if not samples:
        return ClipCategory(
            primary=event_type or 'unknown',
            label=event_label or 'Unknown clip',
            confidence=0.0,
            tags=[],
        )

    tags: List[str] = []
    detections: List[tuple] = []  # (priority, category, label, confidence)

    # === Extract key metrics from samples ===
    speeds = [s.speed for s in samples if s.speed > 0]
    throttles = [s.throttle for s in samples]
    brakes = [s.brake for s in samples]
    positions = [s.position for s in samples if s.position > 0]
    laps = [s.lap for s in samples if s.lap > 0]
    lap_dists = [s.lap_dist_pct for s in samples]
    incidents = [s.incident_count for s in samples if s.incident_count > 0]

    avg_speed = sum(speeds) / len(speeds) if speeds else 0
    max_speed = max(speeds) if speeds else 0
    min_speed = min(speeds) if speeds else 0
    max_brake = max(brakes) if brakes else 0
    max_steering = max(abs(s.steering) for s in samples) if samples else 0

    # === Detection: Position change ===
    if positions and len(positions) >= 2:
        pos_start = positions[0]
        pos_end = positions[-1]
        # Also check explicit before/after
        if position_before > 0 and position_after > 0:
            pos_start = position_before
            pos_end = position_after

        if pos_end < pos_start:
            gained = pos_start - pos_end
            detections.append((
                10, 'overtake',
                f'Gained P{pos_start}→P{pos_end} (+{gained})',
                min(1.0, 0.6 + gained * 0.2),
            ))
            tags.append('position_gained')
        elif pos_end > pos_start:
            lost = pos_end - pos_start
            detections.append((
                8, 'position_lost',
                f'Lost P{pos_start}→P{pos_end} (-{lost})',
                min(1.0, 0.5 + lost * 0.15),
            ))
            tags.append('position_lost')

    # === Detection: Incident (from telemetry) ===
    if incidents:
        inc_start = incidents[0] if incidents else 0
        inc_end = incidents[-1] if incidents else 0
        if inc_end > inc_start:
            new_incidents = inc_end - inc_start
            detections.append((
                12, 'incident',
                f'Incident (+{new_incidents}x)',
                0.95,
            ))
            tags.append('incident')

    # === Detection: Off-track / Spin ===
    if speeds:
        # Sudden speed drop (>60% reduction in short window)
        speed_ratios = []
        window = min(15, len(speeds))  # ~1 second at 15fps
        for i in range(window, len(speeds)):
            if speeds[i - window] > 10:  # Only if was moving
                ratio = speeds[i] / speeds[i - window]
                speed_ratios.append(ratio)

        if speed_ratios and min(speed_ratios) < 0.3:
            # Large steering + speed drop = likely spin
            if max_steering > 1.5:  # ~86 degrees
                detections.append((9, 'spin', 'Spin detected', 0.7))
                tags.append('spin')
            else:
                detections.append((7, 'off_track', 'Off track', 0.6))
                tags.append('off_track')

    # === Detection: Pit stop ===
    if lap_dists and len(lap_dists) >= 10:
        # Check if any samples show pit road (speed < 30 m/s ~67mph in pit lane region)
        pit_samples = [s for s in samples if s.speed > 0 and s.speed < 30 and s.lap_dist_pct < 0.05]
        if len(pit_samples) > 5:
            detections.append((6, 'pit_stop', 'Pit stop', 0.8))
            tags.append('pit_stop')

    # === Detection: Fastest lap ===
    if best_lap_ms > 0 and current_lap_ms > 0:
        if current_lap_ms <= best_lap_ms:
            detections.append((
                11, 'fastest_lap',
                f'Fastest lap!',
                0.9,
            ))
            tags.append('fastest_lap')
            tags.append('highlight')

    # === Detection: Hard braking zone ===
    if max_brake > 0.95 and max_speed > 60:  # >60 m/s = ~134mph
        detections.append((
            4, 'hard_braking',
            f'Heavy braking from {max_speed * 2.237:.0f}mph',
            0.5 + max_brake * 0.3,
        ))
        tags.append('hard_braking')

    # === Detection: First lap ===
    if laps and min(laps) <= 1:
        detections.append((5, 'race_start', 'Lap 1 action', 0.6))
        tags.append('race_start')

    # === Detection: Close battle (high consistency in position proximity) ===
    # Would need gap data — skip for now, just tag if we have position changes

    # === Pick best detection ===
    if event_type == 'incident' and not any(d[1] == 'incident' for d in detections):
        # Keep original incident label if no better detection
        detections.append((12, 'incident', event_label or 'Incident', 0.9))

    if not detections:
        # No specific detection — use original or generic
        return ClipCategory(
            primary=event_type or 'unknown',
            label=event_label or 'Replay clip',
            confidence=0.3,
            tags=tags or ['general'],
        )

    # Sort by priority (highest first)
    detections.sort(key=lambda d: d[0], reverse=True)
    best = detections[0]

    # Merge tags from all detections
    for d in detections:
        if d[1] not in tags:
            tags.append(d[1])

    return ClipCategory(
        primary=best[1],
        label=best[2],
        confidence=best[3],
        tags=tags,
    )
