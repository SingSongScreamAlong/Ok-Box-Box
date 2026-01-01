"""
Database Manager
Handles all database operations with connection pooling
"""

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, Session as DBSession
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import List, Dict, Optional, Any
import logging
from datetime import datetime
import uuid

from .models import (
    Base, Session, Telemetry, Lap, CornerPerformance, 
    Incident, SetupChange, Competitor, DriverSkill, CommunitySetup
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Manage all database operations
    Connection pooling, transactions, CRUD operations
    """
    
    def __init__(self, connection_string: str):
        """
        Initialize database connection
        
        Args:
            connection_string: PostgreSQL connection string
                Example: postgresql://user:pass@localhost:5432/pitbox
        """
        self.engine = create_engine(
            connection_string,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,  # Verify connections before using
            echo=False  # Set to True for SQL logging
        )
        
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        
        logger.info("✅ Database connection established")
    
    def create_tables(self):
        """Create all tables if they don't exist"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("✅ Database tables created")
    
    def drop_tables(self):
        """Drop all tables (use with caution!)"""
        Base.metadata.drop_all(bind=self.engine)
        logger.warning("⚠️ All database tables dropped")
    
    @contextmanager
    def get_session(self):
        """
        Get database session with automatic cleanup
        
        Usage:
            with db.get_session() as session:
                session.query(...)
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            session.close()
    
    # ========================================================================
    # SESSION OPERATIONS
    # ========================================================================
    
    def create_session(self, session_data: Dict) -> uuid.UUID:
        """
        Create new racing session
        
        Args:
            session_data: Dict with session details
            
        Returns:
            session_id (UUID)
        """
        with self.get_session() as db:
            session = Session(**session_data)
            db.add(session)
            db.flush()
            return session.session_id
    
    def get_session(self, session_id: uuid.UUID) -> Optional[Dict]:
        """Get session details"""
        with self.get_session() as db:
            session = db.query(Session).filter(Session.session_id == session_id).first()
            if session:
                return {
                    'session_id': str(session.session_id),
                    'driver_id': session.driver_id,
                    'session_type': session.session_type,
                    'track_name': session.track_name,
                    'car_name': session.car_name,
                    'session_start': session.session_start.isoformat(),
                    'total_laps': session.total_laps,
                    'best_lap_time': session.best_lap_time
                }
            return None
    
    def update_session(self, session_id: uuid.UUID, updates: Dict):
        """Update session details"""
        with self.get_session() as db:
            db.query(Session).filter(Session.session_id == session_id).update(updates)
    
    def end_session(self, session_id: uuid.UUID):
        """Mark session as ended"""
        self.update_session(session_id, {
            'session_end': datetime.utcnow()
        })
    
    # ========================================================================
    # TELEMETRY OPERATIONS
    # ========================================================================
    
    def insert_telemetry_batch(self, telemetry_list: List[Dict]):
        """
        Bulk insert telemetry (optimized for high-frequency data)
        
        Args:
            telemetry_list: List of telemetry dicts
        """
        with self.get_session() as db:
            db.bulk_insert_mappings(Telemetry, telemetry_list)
        
        logger.debug(f"Inserted {len(telemetry_list)} telemetry samples")
    
    def get_lap_telemetry(self, session_id: uuid.UUID, lap: int) -> List[Dict]:
        """Get all telemetry for a specific lap"""
        with self.get_session() as db:
            results = db.query(Telemetry).filter(
                Telemetry.session_id == session_id,
                Telemetry.lap == lap
            ).order_by(Telemetry.timestamp).all()
            
            return [self._telemetry_to_dict(t) for t in results]
    
    def get_session_telemetry(self, session_id: uuid.UUID, 
                             start_time: Optional[int] = None,
                             end_time: Optional[int] = None) -> List[Dict]:
        """Get telemetry for entire session or time range"""
        with self.get_session() as db:
            query = db.query(Telemetry).filter(Telemetry.session_id == session_id)
            
            if start_time:
                query = query.filter(Telemetry.timestamp >= start_time)
            if end_time:
                query = query.filter(Telemetry.timestamp <= end_time)
            
            results = query.order_by(Telemetry.timestamp).all()
            return [self._telemetry_to_dict(t) for t in results]
    
    # ========================================================================
    # LAP OPERATIONS
    # ========================================================================
    
    def create_lap(self, lap_data: Dict) -> uuid.UUID:
        """Create lap record"""
        with self.get_session() as db:
            lap = Lap(**lap_data)
            db.add(lap)
            db.flush()
            return lap.lap_id
    
    def get_session_laps(self, session_id: uuid.UUID) -> List[Dict]:
        """Get all laps for a session"""
        with self.get_session() as db:
            laps = db.query(Lap).filter(
                Lap.session_id == session_id
            ).order_by(Lap.lap_number).all()
            
            return [self._lap_to_dict(lap) for lap in laps]
    
    def get_best_lap(self, session_id: uuid.UUID) -> Optional[Dict]:
        """Get best valid lap"""
        with self.get_session() as db:
            lap = db.query(Lap).filter(
                Lap.session_id == session_id,
                Lap.is_valid == True
            ).order_by(Lap.lap_time).first()
            
            return self._lap_to_dict(lap) if lap else None
    
    # ========================================================================
    # CORNER PERFORMANCE OPERATIONS
    # ========================================================================
    
    def store_corner_analysis(self, corner_data_list: List[Dict]):
        """Store corner-by-corner analysis"""
        with self.get_session() as db:
            for corner_data in corner_data_list:
                corner = CornerPerformance(**corner_data)
                db.add(corner)
    
    def get_corner_performance(self, session_id: uuid.UUID, 
                              lap: Optional[int] = None) -> List[Dict]:
        """Get corner performance data"""
        with self.get_session() as db:
            query = db.query(CornerPerformance).filter(
                CornerPerformance.session_id == session_id
            )
            
            if lap is not None:
                query = query.filter(CornerPerformance.lap_number == lap)
            
            results = query.all()
            return [self._corner_to_dict(c) for c in results]
    
    # ========================================================================
    # INCIDENT OPERATIONS
    # ========================================================================
    
    def store_incident(self, incident_data: Dict) -> uuid.UUID:
        """Store incident analysis"""
        with self.get_session() as db:
            incident = Incident(**incident_data)
            db.add(incident)
            db.flush()
            return incident.incident_id
    
    def get_session_incidents(self, session_id: uuid.UUID) -> List[Dict]:
        """Get all incidents for a session"""
        with self.get_session() as db:
            incidents = db.query(Incident).filter(
                Incident.session_id == session_id
            ).order_by(Incident.timestamp).all()
            
            return [self._incident_to_dict(i) for i in incidents]
    
    # ========================================================================
    # SETUP OPERATIONS
    # ========================================================================
    
    def store_setup_change(self, setup_data: Dict) -> uuid.UUID:
        """Store setup change and analysis"""
        with self.get_session() as db:
            setup = SetupChange(**setup_data)
            db.add(setup)
            db.flush()
            return setup.change_id
    
    def get_setup_history(self, session_id: uuid.UUID) -> List[Dict]:
        """Get setup change history"""
        with self.get_session() as db:
            changes = db.query(SetupChange).filter(
                SetupChange.session_id == session_id
            ).order_by(SetupChange.timestamp).all()
            
            return [self._setup_to_dict(s) for s in changes]
    
    # ========================================================================
    # COMPETITOR OPERATIONS
    # ========================================================================
    
    def upsert_competitor_profile(self, profile_data: Dict):
        """Update or insert competitor profile"""
        with self.get_session() as db:
            competitor = db.query(Competitor).filter(
                Competitor.driver_id == profile_data['driver_id']
            ).first()
            
            if competitor:
                # Update existing
                for key, value in profile_data.items():
                    setattr(competitor, key, value)
                competitor.last_updated = datetime.utcnow()
            else:
                # Insert new
                competitor = Competitor(**profile_data)
                db.add(competitor)
    
    def get_competitor_profile(self, driver_id: str) -> Optional[Dict]:
        """Get complete competitor profile"""
        with self.get_session() as db:
            competitor = db.query(Competitor).filter(
                Competitor.driver_id == driver_id
            ).first()
            
            return self._competitor_to_dict(competitor) if competitor else None
    
    # ========================================================================
    # DRIVER SKILL OPERATIONS
    # ========================================================================
    
    def update_driver_skills(self, driver_id: str, skills: List[Dict]):
        """Update driver skill assessments"""
        with self.get_session() as db:
            for skill_data in skills:
                skill_data['driver_id'] = driver_id
                skill = DriverSkill(**skill_data)
                db.add(skill)
    
    def get_driver_skills(self, driver_id: str) -> List[Dict]:
        """Get latest skill assessments"""
        with self.get_session() as db:
            # Get most recent assessment for each skill area
            subquery = db.query(
                DriverSkill.skill_area,
                func.max(DriverSkill.assessment_date).label('max_date')
            ).filter(
                DriverSkill.driver_id == driver_id
            ).group_by(DriverSkill.skill_area).subquery()
            
            skills = db.query(DriverSkill).join(
                subquery,
                (DriverSkill.skill_area == subquery.c.skill_area) &
                (DriverSkill.assessment_date == subquery.c.max_date)
            ).all()
            
            return [self._skill_to_dict(s) for s in skills]
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _telemetry_to_dict(self, t: Telemetry) -> Dict:
        """Convert telemetry ORM object to dict"""
        return {
            'timestamp': t.timestamp,
            'lap': t.lap,
            'speed': t.speed,
            'throttle': t.throttle,
            'brake': t.brake,
            'steering': t.steering,
            'gear': t.gear,
            'rpm': t.rpm,
            'fuel_level': t.fuel_level,
            'lat_accel': t.lat_accel,
            'long_accel': t.long_accel,
            # ... add other fields as needed
        }
    
    def _lap_to_dict(self, lap: Lap) -> Dict:
        """Convert lap ORM object to dict"""
        return {
            'lap_id': str(lap.lap_id),
            'lap_number': lap.lap_number,
            'lap_time': lap.lap_time,
            'is_valid': lap.is_valid,
            'incidents': lap.incidents
        }
    
    def _corner_to_dict(self, corner: CornerPerformance) -> Dict:
        """Convert corner performance to dict"""
        return {
            'corner_number': corner.corner_number,
            'corner_name': corner.corner_name,
            'entry_speed': corner.entry_speed,
            'apex_speed': corner.apex_speed,
            'exit_speed': corner.exit_speed,
            'time_delta': corner.time_delta,
            'rating': corner.rating
        }
    
    def _incident_to_dict(self, incident: Incident) -> Dict:
        """Convert incident to dict"""
        return {
            'incident_id': str(incident.incident_id),
            'incident_type': incident.incident_type,
            'lap_number': incident.lap_number,
            'severity': incident.severity,
            'root_cause': incident.root_cause,
            'prevention_advice': incident.prevention_advice
        }
    
    def _setup_to_dict(self, setup: SetupChange) -> Dict:
        """Convert setup change to dict"""
        return {
            'change_id': str(setup.change_id),
            'component': setup.component,
            'parameter': setup.parameter,
            'old_value': setup.old_value,
            'new_value': setup.new_value,
            'was_improvement': setup.was_improvement,
            'recommendation': setup.recommendation
        }
    
    def _competitor_to_dict(self, comp: Competitor) -> Dict:
        """Convert competitor to dict"""
        return {
            'driver_id': comp.driver_id,
            'driver_name': comp.driver_name,
            'irating': comp.irating,
            'aggressive_rating': comp.aggressive_rating,
            'profile_data': comp.profile_data
        }
    
    def _skill_to_dict(self, skill: DriverSkill) -> Dict:
        """Convert skill to dict"""
        return {
            'skill_area': skill.skill_area,
            'rating': skill.rating,
            'percentile': skill.percentile,
            'priority': skill.priority,
            'target_rating': skill.target_rating
        }


# Example usage
if __name__ == '__main__':
    # Initialize database
    db = DatabaseManager('postgresql://user:pass@localhost:5432/pitbox')
    
    # Create tables
    db.create_tables()
    
    # Create a session
    session_id = db.create_session({
        'driver_id': 'driver123',
        'session_type': 'race',
        'track_name': 'Spa-Francorchamps',
        'car_name': 'Formula 1'
    })
    
    print(f"Created session: {session_id}")
    
    # Store telemetry
    telemetry = [
        {
            'session_id': session_id,
            'timestamp': 1000,
            'lap': 1,
            'speed': 250.0,
            'throttle': 1.0,
            'brake': 0.0
        }
    ]
    db.insert_telemetry_batch(telemetry)
    
    print("Telemetry stored!")
