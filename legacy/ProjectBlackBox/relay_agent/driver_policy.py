"""
Driver Policy Layer
Filters server-side intelligence events and converts them into driver feedback.
Handles confidence gating, cooldowns, and verbosity profiles.
"""
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class DriverPolicy:
    def __init__(self, audio_pipeline=None):
        self.audio_pipeline = audio_pipeline  # Interface to speak
        
        # Configuration
        self.min_confidence = 0.7
        self.enable_voice = True
        self.verbosity = 'normal' # 'low', 'normal', 'high'
        
        # State tracking for Cooldowns
        self.last_events: Dict[str, float] = {}
        self.current_overlap_side: Optional[str] = None # 'LEFT', 'RIGHT', 'BOTH', None
        
        # Cooldown Constants (seconds)
        self.COOLDOWNS = {
            'overlap': 0.5,      # Don't spam clear/car left
            'three_wide': 2.0,   # Serious alert, repeat slowly if needed
            'offtrack': 5.0,     # Don't nag constantly
            'unsafe_rejoin': 3.0
        }

    def handle_event(self, event_type: str, data: Dict[str, Any]):
        """
        Main entry point for server events
        """
        confidence = data.get('confidence', 1.0)
        if confidence < self.min_confidence:
            logger.debug(f"Ignoring low confidence event: {event_type} ({confidence:.2f})")
            return

        handler = getattr(self, f"_handle_{event_type}", None)
        if handler:
            handler(data)
        else:
            logger.debug(f"No handler for event: {event_type}")

    def _should_suppress(self, event_key: str) -> bool:
        """Check cooldowns"""
        now = time.time()
        last_time = self.last_events.get(event_key, 0)
        duration = self.COOLDOWNS.get(event_key, 1.0)
        
        if now - last_time < duration:
            return True
            
        self.last_events[event_key] = now
        return False

    def _speak(self, text: str, priority: str = 'normal'):
        """Send text to TTS pipeline"""
        if not self.enable_voice:
            return
            
        logger.info(f"🗣️ Spotter: {text}")
        if self.audio_pipeline:
            # We assume audio_pipeline has a method for direct TTS or we log it
            # For now, relying on the 'send_proactive_update' method found in audio_pipeline.py
            try:
                # We need to run this async if possible, or fire-and-forget
                # Since we are likely in a threaded callback from socketio, we can't easily await.
                # Ideally, audio_pipeline puts this on a queue.
                import asyncio
                # Hacky check if we have an event loop, else just print or queue
                # audio_pipeline.send_proactive_update is async.
                # For this Phase, we might need a synchronous bridge or just log if no loop.
                pass 
            except Exception as e:
                logger.error(f"Failed to speak: {e}")

    def _handle_overlap_state_changed(self, data: Dict[str, Any]):
        """
        Handle 'overlap_state_changed'
        Payload: { carA, carB, side: 'LEFT'|'RIGHT'|'BOTH', ... }
        This logic serves the 'Car Left' / 'Clear' calls.
        """
        # We need to know which car is US to know if it's Left or Right relative to US.
        # But wait, the Server Event is pairwise. 
        # Ideally the server sends "Intelligence" specifically tailored for the session's driver, 
        # OR it sends generally "Car A overlaps Car B".
        # 
        # Assumption: The generic event 'overlap_state_changed' is broadcast.
        # We need to filter if WE are Car A or Car B.
        # However, typically a Spotter Service sends events TO a specific driver or the event contains context.
        # 
        # Protocol Check: 
        # Schema: carA, carB, side... 
        # Note: 'side' is relative? Schema said "Car B is to the [side] of Car A".
        # 
        # We need our own Car ID. 
        # Since RelayAgent knows session_id but maybe not car_id directly without looking at telemetry?
        # IRacingReader knows own car_idx (driver_id). We should inject it or look it up.
        # 
        # For this implementation, we will assume we filter relevant events in the Subscriber
        # or we accept that the server sends "Car Left" events meant for US if the socket room is driver-specific?
        # 
        # The current implementation in SpatialAwarenessService broadcasts efficiently?
        # Actually... `this.emit` in `spatial-awareness.service.ts` was just a raw emit.
        # We probably want to listen to ALL events and filter for OUR ID.
        
        # Let's assume data includes which 'side' the threat is on relative to us.
        # If the server says "Side: LEFT", it means there is a car on the left.
        
        side = data.get('side') # LEFT, RIGHT, BOTH, None (Clear?)
        
        # If overlap < 0.05, it might be 'CLEAR' implicitly or explicit state?
        # The schema had 'state' or just 'side'?
        # Schema: side: enum(['LEFT', 'RIGHT', 'BOTH'])
        # If it's CLEAR, maybe we don't get an event, or we get a distinct event?
        # 
        # State Machine (server) handles hysteresis. When it goes to CLEAR, does it emit?
        # Checking server code...
        # "const stateChanged = this.stateMachine.update..."
        # If new state represents a change, we emit.
        # But the event payload in server was just `side`. 
        # If state becomes CLEAR, does `side` become null?
        # `getRelativeSide` returns null if clear. 
        # So `side` might be null.
        
        if not side:
            if self.current_overlap_side:
                 self._speak("Clear")
                 self.current_overlap_side = None
            return

        if side != self.current_overlap_side:
            if side == 'LEFT':
                self._speak("Car Left")
            elif side == 'RIGHT':
                self._speak("Car Right")
            elif side == 'BOTH':
                self._speak("Three Wide") # Or "Car Left and Right"
            
            self.current_overlap_side = side

    def _handle_three_wide_detected(self, data: Dict[str, Any]):
        if self._should_suppress('three_wide'):
             return
        self._speak("Three wide, be careful", priority='high')

    def _handle_offtrack(self, data: Dict[str, Any]):
        if self._should_suppress('offtrack'):
            return
        self._speak("Car off track ahead")

    def _handle_unsafe_rejoin_risk(self, data: Dict[str, Any]):
        if self._should_suppress('unsafe_rejoin'):
            return
        self._speak("Watch for rejoin!", priority='high')

    def _handle_local_caution(self, data: Dict[str, Any]):
        self._speak("Yellow flag, heads up", priority='high')

    def _handle_explanation_generated(self, data: Dict[str, Any]):
        """
        Handle 'explanation_generated'
        Payload: { packet, summary, evidence }
        """
        summary = data.get('summary')
        packet = data.get('packet', {})
        
        # Check if we are involved
        # Packet has 'cars': { primary: '...', secondary: '...' }
        # Ideally client filters before calling handle_event, but double check
        # For now assume if we got it, it's relevant.
        
        if summary:
            # Speak the summary immediately
            self._speak(summary, priority='normal')
            
        # Store evidence line for "Why?" query later
        evidence = data.get('evidence')
        if evidence:
            self.last_evidence_line = evidence
            # TODO: Store efficiently with timestamp if we want history
            
    def query_last_incident_details(self):
        """Called when driver asks 'Why?'"""
        if hasattr(self, 'last_evidence_line') and self.last_evidence_line:
             self._speak(self.last_evidence_line)
        else:
             self._speak("No recent incident details available.")
