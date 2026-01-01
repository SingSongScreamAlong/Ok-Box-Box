"""
Automated Race Debrief Generator
Celery task that generates comprehensive post-session analysis
"""
import logging
from typing import Dict, List
from dataclasses import dataclass, asdict
import json
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class DebriefReport:
    session_id: str
    driver_name: str
    track_name: str
    session_type: str
    
    # Summary stats
    total_laps: int
    best_lap_time: float
    avg_lap_time: float
    consistency_score: float  # 0-100
    
    # Performance
    lap_times: List[float]
    sector_deltas: List[Dict]
    
    # Incidents
    mistakes: List[Dict]
    incident_count: int
    
    # Tire management
    avg_tire_temp: float
    tire_pressure_recommendations: Dict
    
    # Fuel
    avg_fuel_per_lap: float
    
    # Overall grade
    overall_grade: str  # A+, A, B+, etc.
    
    # Timestamp
    generated_at: str

class DebriefGenerator:
    """
    Generates comprehensive race debriefs from session data.
    """
    
    def __init__(self):
        self.consistency_threshold = 0.5  # seconds variance for "consistent"
        
    def generate_debrief(self, session_id: str, session_data: Dict, lap_data: List[Dict]) -> DebriefReport:
        """
        Generate a complete debrief report.
        
        Args:
            session_id: UUID of the session
            session_data: Session metadata (driver, track, etc.)
            lap_data: List of lap records with times and telemetry
        """
        logger.info(f"Generating debrief for session {session_id}")
        
        # Calculate lap statistics
        lap_times = [lap['lap_time'] for lap in lap_data if lap.get('is_valid', True)]
        
        if not lap_times:
            logger.warning("No valid laps found")
            lap_times = [0.0]
        
        best_lap = min(lap_times)
        avg_lap = sum(lap_times) / len(lap_times)
        
        # Calculate consistency
        consistency = self._calculate_consistency(lap_times)
        
        # Identify mistakes
        mistakes = self._identify_mistakes(lap_data)
        
        # Calculate tire recommendations
        tire_recs = self._calculate_tire_recommendations(lap_data)
        
        # Calculate fuel usage
        avg_fuel = self._calculate_avg_fuel(lap_data)
        
        # Determine overall grade
        grade = self._calculate_grade(consistency, len(mistakes), len(lap_times))
        
        report = DebriefReport(
            session_id=session_id,
            driver_name=session_data.get('driver_name', 'Unknown'),
            track_name=session_data.get('track_name', 'Unknown'),
            session_type=session_data.get('session_type', 'Unknown'),
            total_laps=len(lap_times),
            best_lap_time=best_lap,
            avg_lap_time=avg_lap,
            consistency_score=consistency,
            lap_times=lap_times,
            sector_deltas=[],  # Would calculate from telemetry
            mistakes=mistakes,
            incident_count=len(mistakes),
            avg_tire_temp=0.0,  # Would calculate from telemetry
            tire_pressure_recommendations=tire_recs,
            avg_fuel_per_lap=avg_fuel,
            overall_grade=grade,
            generated_at=datetime.now().isoformat()
        )
        
        logger.info(f"Debrief complete: {report.total_laps} laps, Grade: {report.overall_grade}")
        
        return report
    
    def _calculate_consistency(self, lap_times: List[float]) -> float:
        """
        Calculate consistency score (0-100).
        Higher is better.
        """
        if len(lap_times) < 2:
            return 100.0
        
        # Calculate standard deviation
        avg = sum(lap_times) / len(lap_times)
        variance = sum((x - avg) ** 2 for x in lap_times) / len(lap_times)
        std_dev = variance ** 0.5
        
        # Convert to 0-100 scale (lower std_dev = higher score)
        # 0.5s std_dev = 50 points, 0s = 100 points
        score = max(0, 100 - (std_dev / self.consistency_threshold) * 50)
        
        return round(score, 1)
    
    def _identify_mistakes(self, lap_data: List[Dict]) -> List[Dict]:
        """
        Identify mistakes from lap data.
        """
        mistakes = []
        
        for i, lap in enumerate(lap_data):
            # Check for invalid laps
            if not lap.get('is_valid', True):
                mistakes.append({
                    'lap': i + 1,
                    'type': 'invalid_lap',
                    'description': 'Lap invalidated (off-track or incident)'
                })
            
            # Check for incidents
            if lap.get('incidents', 0) > 0:
                mistakes.append({
                    'lap': i + 1,
                    'type': 'incident',
                    'description': f"{lap['incidents']} incident(s)"
                })
        
        return mistakes
    
    def _calculate_tire_recommendations(self, lap_data: List[Dict]) -> Dict:
        """
        Calculate tire pressure recommendations.
        """
        # Placeholder - would analyze tire temps from telemetry
        return {
            'front_left': 'optimal',
            'front_right': 'optimal',
            'rear_left': 'optimal',
            'rear_right': 'optimal'
        }
    
    def _calculate_avg_fuel(self, lap_data: List[Dict]) -> float:
        """
        Calculate average fuel consumption per lap.
        """
        fuel_usage = [lap.get('fuel_used', 2.5) for lap in lap_data if 'fuel_used' in lap]
        
        if not fuel_usage:
            return 2.5  # Default
        
        return sum(fuel_usage) / len(fuel_usage)
    
    def _calculate_grade(self, consistency: float, mistake_count: int, total_laps: int) -> str:
        """
        Calculate overall session grade.
        """
        # Start with consistency
        score = consistency
        
        # Deduct for mistakes
        mistake_penalty = (mistake_count / max(1, total_laps)) * 30
        score -= mistake_penalty
        
        # Convert to letter grade
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "A-"
        elif score >= 80:
            return "B+"
        elif score >= 75:
            return "B"
        elif score >= 70:
            return "B-"
        elif score >= 65:
            return "C+"
        elif score >= 60:
            return "C"
        else:
            return "D"
    
    def save_report(self, report: DebriefReport, output_path: str):
        """
        Save report to JSON file.
        """
        with open(output_path, 'w') as f:
            json.dump(asdict(report), f, indent=2)
        
        logger.info(f"Report saved to {output_path}")
