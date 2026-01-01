"""
Database Models
SQLAlchemy ORM models for all database tables
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    ForeignKey, Text, BigInteger, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()


class Session(Base):
    __tablename__ = 'sessions'
    
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(String(255), nullable=False, index=True)
    
    # Session details
    session_type = Column(String(50), nullable=False)
    track_name = Column(String(255), nullable=False, index=True)
    track_config = Column(String(255))
    track_length = Column(Float)
    car_name = Column(String(255), index=True)
    car_class = Column(String(100))
    
    # Weather
    weather_type = Column(String(50))
    skies = Column(String(50))
    track_temp = Column(Float)
    air_temp = Column(Float)
    
    # Timing
    session_start = Column(DateTime, nullable=False, default=datetime.utcnow)
    session_end = Column(DateTime)
    total_laps = Column(Integer, default=0)
    best_lap_time = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    laps = relationship("Lap", back_populates="session", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="session", cascade="all, delete-orphan")
    corner_performance = relationship("CornerPerformance", back_populates="session", cascade="all, delete-orphan")
    setup_changes = relationship("SetupChange", back_populates="session", cascade="all, delete-orphan")


class Telemetry(Base):
    __tablename__ = 'telemetry'
    
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.session_id', ondelete='CASCADE'), primary_key=True)
    timestamp = Column(BigInteger, primary_key=True)
    session_time = Column(Float)
    
    # Lap info
    lap = Column(Integer, index=True)
    lap_dist = Column(Float)
    lap_dist_pct = Column(Float)
    
    # Speed and position
    speed = Column(Float)
    pos_x = Column(Float)
    pos_y = Column(Float)
    pos_z = Column(Float)
    
    # Inputs
    throttle = Column(Float)
    brake = Column(Float)
    clutch = Column(Float)
    steering = Column(Float)
    gear = Column(Integer)
    
    # Engine
    rpm = Column(Integer)
    fuel_level = Column(Float)
    
    # G-forces
    lat_accel = Column(Float)
    long_accel = Column(Float)
    vert_accel = Column(Float)
    
    # Tire temps
    tire_temp_lf = Column(Float)
    tire_temp_rf = Column(Float)
    tire_temp_lr = Column(Float)
    tire_temp_rr = Column(Float)
    
    # Tire wear
    tire_wear_lf = Column(Float)
    tire_wear_rf = Column(Float)
    tire_wear_lr = Column(Float)
    tire_wear_rr = Column(Float)
    
    # Brake temps
    brake_temp_lf = Column(Float)
    brake_temp_rf = Column(Float)
    brake_temp_lr = Column(Float)
    brake_temp_rr = Column(Float)
    
    # Track conditions
    track_temp = Column(Float)
    air_temp = Column(Float)


class Lap(Base):
    __tablename__ = 'laps'
    
    lap_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.session_id', ondelete='CASCADE'), nullable=False, index=True)
    lap_number = Column(Integer, nullable=False)
    
    # Timing
    lap_time = Column(Float)
    sector_1_time = Column(Float)
    sector_2_time = Column(Float)
    sector_3_time = Column(Float)
    
    # Validity
    is_valid = Column(Boolean, default=True)
    incidents = Column(Integer, default=0)
    
    # Fuel and tires
    fuel_used = Column(Float)
    tire_wear = Column(JSONB)
    avg_tire_temp = Column(Float)
    
    # Performance
    avg_speed = Column(Float)
    max_speed = Column(Float)
    avg_throttle = Column(Float)
    avg_brake = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="laps")


class CornerPerformance(Base):
    __tablename__ = 'corner_performance'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.session_id', ondelete='CASCADE'), nullable=False, index=True)
    lap_number = Column(Integer, nullable=False)
    
    # Corner identification
    corner_number = Column(Integer, nullable=False, index=True)
    corner_name = Column(String(100))
    corner_type = Column(String(50))
    
    # Speed analysis
    entry_speed = Column(Float)
    apex_speed = Column(Float)
    exit_speed = Column(Float)
    
    # Deltas vs reference
    entry_speed_delta = Column(Float)
    apex_speed_delta = Column(Float)
    exit_speed_delta = Column(Float)
    
    # Braking
    brake_point_distance = Column(Float)
    brake_point_delta = Column(Float)
    max_brake_pressure = Column(Float)
    
    # Throttle
    throttle_application_point = Column(Float)
    throttle_delta = Column(Float)
    
    # Time
    time_in_corner = Column(Float)
    time_delta = Column(Float)
    
    # Rating
    rating = Column(String(20))
    category = Column(String(50))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="corner_performance")


class Incident(Base):
    __tablename__ = 'incidents'
    
    incident_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.session_id', ondelete='CASCADE'), nullable=False, index=True)
    lap_number = Column(Integer, nullable=False)
    timestamp = Column(BigInteger, nullable=False)
    
    # Incident details
    incident_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20))
    location = Column(String(100))
    
    # Impact
    speed_before = Column(Float)
    speed_after = Column(Float)
    speed_loss = Column(Float)
    time_lost = Column(Float)
    positions_lost = Column(Integer, default=0)
    incident_points = Column(Integer, default=0)
    
    # Analysis
    root_cause = Column(Text)
    contributing_factors = Column(JSONB)
    prevention_advice = Column(Text)
    technique_fix = Column(Text)
    
    # Avoidability
    was_avoidable = Column(Boolean)
    driver_error_pct = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="incidents")


class SetupChange(Base):
    __tablename__ = 'setup_changes'
    
    change_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.session_id', ondelete='CASCADE'), nullable=False, index=True)
    timestamp = Column(BigInteger, nullable=False)
    
    # Change details
    component = Column(String(100), nullable=False, index=True)
    parameter = Column(String(100), nullable=False)
    old_value = Column(Float)
    new_value = Column(Float)
    delta = Column(Float)
    unit = Column(String(20))
    
    # Impact analysis
    laps_before = Column(Integer, default=3)
    laps_after = Column(Integer, default=3)
    lap_time_before = Column(Float)
    lap_time_after = Column(Float)
    lap_time_delta = Column(Float)
    
    # Handling impact
    understeer_delta = Column(Float)
    oversteer_delta = Column(Float)
    consistency_delta = Column(Float)
    
    # Tire impact
    tire_temp_delta = Column(JSONB)
    
    # Assessment
    was_improvement = Column(Boolean)
    confidence = Column(Float)
    recommendation = Column(Text)
    keep_or_revert = Column(String(20))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="setup_changes")


class Competitor(Base):
    __tablename__ = 'competitors'
    
    driver_id = Column(String(255), primary_key=True)
    driver_name = Column(String(255), nullable=False, index=True)
    
    # iRacing stats
    irating = Column(Integer, index=True)
    safety_rating = Column(Float)
    license_level = Column(String(20))
    
    # Performance characteristics
    qualifying_pace = Column(Float)
    race_pace = Column(Float)
    consistency = Column(Float)
    tire_management = Column(Float)
    overtaking_ability = Column(Float)
    defending_ability = Column(Float)
    
    # Behavioral patterns
    aggressive_rating = Column(Float)
    incident_rate = Column(Float)
    typical_strategies = Column(JSONB)
    pit_timing_pattern = Column(String(20))
    
    # Complete profile
    profile_data = Column(JSONB)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow)
    races_analyzed = Column(Integer, default=0)


class DriverSkill(Base):
    __tablename__ = 'driver_skills'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(String(255), nullable=False, index=True)
    
    # Skill assessment
    skill_area = Column(String(100), nullable=False, index=True)
    rating = Column(Float, nullable=False)
    percentile = Column(Float)
    
    # Evidence
    data_points = Column(Integer, default=0)
    confidence = Column(Float)
    
    # Analysis
    strengths = Column(JSONB)
    weaknesses = Column(JSONB)
    specific_issues = Column(JSONB)
    
    # Improvement plan
    priority = Column(String(20))
    target_rating = Column(Float)
    estimated_lap_time_gain = Column(Float)
    training_exercises = Column(JSONB)
    
    # Metadata
    assessment_date = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(Text)


class CommunitySetup(Base):
    __tablename__ = 'community_setups'
    
    setup_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(String(255), nullable=False)
    
    # Setup details
    track_name = Column(String(255), nullable=False, index=True)
    car_name = Column(String(255), nullable=False, index=True)
    setup_name = Column(String(255))
    description = Column(Text)
    setup_data = Column(JSONB, nullable=False)
    
    # Performance
    best_lap_time = Column(Float)
    avg_lap_time = Column(Float)
    
    # Community
    downloads = Column(Integer, default=0, index=True)
    rating = Column(Float, default=0, index=True)
    num_ratings = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
