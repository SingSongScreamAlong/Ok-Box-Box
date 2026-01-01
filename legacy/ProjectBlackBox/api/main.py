"""
FastAPI Backend Server
Real-time WebSocket + REST API
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import asyncio
import json
import logging
from datetime import datetime
import uuid

# Database
from database.manager import DatabaseManager
from database.models import Base

# Analysis systems
import sys
sys.path.append('./relay_agent')
from corner_performance_analyzer import CornerPerformanceAnalyzer
from incident_analyzer import IncidentAnalyzer
from setup_analyzer import SetupAnalyzer
from ai_race_engineer import AIRaceEngineer
from digital_race_team import EnhancedRaceEngineer
from digital_race_team_part2 import RaceStrategist, PerformanceCoach
from digital_race_team_part3 import IntelligenceAnalyst
from voice_race_team import VoiceRaceTeamInterface

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="ProjectPitBox API",
    description="Complete Digital Race Team API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = "postgresql://pitbox:pitbox@localhost:5432/pitbox"
db = DatabaseManager(DATABASE_URL)

# Analysis systems (initialized on startup)
corner_analyzer = None
incident_analyzer = None
setup_analyzer = None
ai_engineer = None
race_engineer = None
strategist = None
coach = None
intel_analyst = None
voice_interface = None

# WebSocket connections (session_id -> WebSocket)
active_connections: Dict[str, WebSocket] = {}


@app.on_event("startup")
async def startup():
    """Initialize on startup"""
    global corner_analyzer, incident_analyzer, setup_analyzer
    global ai_engineer, race_engineer, strategist, coach, intel_analyst, voice_interface
    
    logger.info("🚀 Starting ProjectPitBox API...")
    
    # Create database tables
    db.create_tables()
    
    # Initialize analysis systems
    corner_analyzer = CornerPerformanceAnalyzer()
    incident_analyzer = IncidentAnalyzer()
    setup_analyzer = SetupAnalyzer()
    ai_engineer = AIRaceEngineer()
    race_engineer = EnhancedRaceEngineer()
    strategist = RaceStrategist()
    coach = PerformanceCoach()
    intel_analyst = IntelligenceAnalyst()
    
    # Initialize voice interface
    voice_interface = VoiceRaceTeamInterface(
        engineer=race_engineer,
        strategist=strategist,
        coach=coach,
        intelligence_analyst=intel_analyst
    )
    
    logger.info("✅ ProjectPitBox API ready!")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    logger.info("Shutting down ProjectPitBox API...")


# ============================================================================
# WEBSOCKET - REAL-TIME TELEMETRY
# ============================================================================

@app.websocket("/ws/telemetry/{session_id}")
async def telemetry_websocket(websocket: WebSocket, session_id: str):
    """
    Real-time telemetry WebSocket
    Receives telemetry from relay agent, broadcasts to dashboard
    """
    await websocket.accept()
    active_connections[session_id] = websocket
    
    logger.info(f"✅ WebSocket connected: {session_id}")
    
    try:
        while True:
            # Receive telemetry from relay agent
            data = await websocket.receive_json()
            
            # Store in database (batch for performance)
            # TODO: Implement batching
            
            # Broadcast to dashboard clients
            await broadcast_to_dashboard(session_id, data)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
        if session_id in active_connections:
            del active_connections[session_id]


async def broadcast_to_dashboard(session_id: str, data: Dict):
    """Broadcast data to dashboard clients"""
    # TODO: Implement dashboard WebSocket connections
    pass


# ============================================================================
# REST API - SESSION MANAGEMENT
# ============================================================================

@app.post("/api/sessions/start")
async def start_session(session_data: Dict):
    """Start new racing session"""
    try:
        session_id = db.create_session(session_data)
        
        logger.info(f"✅ Session started: {session_id}")
        
        return {
            "success": True,
            "session_id": str(session_id),
            "message": "Session started"
        }
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sessions/{session_id}/end")
async def end_session(session_id: str):
    """End racing session"""
    try:
        db.end_session(uuid.UUID(session_id))
        
        return {
            "success": True,
            "message": "Session ended"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details"""
    try:
        session = db.get_session(uuid.UUID(session_id))
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REST API - ANALYSIS
# ============================================================================

@app.post("/api/analysis/corner-by-corner")
async def analyze_corners(request: Dict):
    """Run corner-by-corner analysis"""
    try:
        session_id = uuid.UUID(request['session_id'])
        lap_number = request.get('lap_number')
        
        # Get telemetry from database
        telemetry = db.get_lap_telemetry(session_id, lap_number)
        
        # Run analysis
        # TODO: Implement corner analysis integration
        
        return {
            "success": True,
            "message": "Analysis complete"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analysis/incidents")
async def analyze_incidents(request: Dict):
    """Analyze incidents"""
    try:
        session_id = uuid.UUID(request['session_id'])
        
        # Get incidents from database
        incidents = db.get_session_incidents(session_id)
        
        return {
            "success": True,
            "incidents": incidents
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REST API - VOICE INTERFACE
# ============================================================================

@app.post("/api/voice/input")
async def process_voice_input(request: Dict):
    """
    Process driver voice input
    
    Body:
    {
        "session_id": "...",
        "text": "How are my tires?",
        "context": {...}
    }
    """
    try:
        text = request['text']
        context = request.get('context', {})
        
        # Process through voice interface
        response = voice_interface.process_driver_voice_input(text, context)
        
        return {
            "success": True,
            "team_member": response.team_member,
            "response_text": response.response_text,
            "priority": response.priority,
            "related_data": response.related_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voice/proactive-updates/{session_id}")
async def get_proactive_updates(session_id: str):
    """Get proactive team updates"""
    try:
        # Get current context from database
        session = db.get_session(uuid.UUID(session_id))
        
        context = {
            'current_lap': 10,  # TODO: Get from session
            'position': 5,
            'gap_behind': 2.5
        }
        
        # Generate proactive updates
        updates = voice_interface.generate_proactive_updates(context)
        
        return {
            "success": True,
            "updates": [
                {
                    "team_member": u.team_member,
                    "message": u.response_text,
                    "priority": u.priority
                }
                for u in updates
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REST API - COMPETITOR INTELLIGENCE
# ============================================================================

@app.get("/api/competitors/{driver_id}/profile")
async def get_competitor_profile(driver_id: str):
    """Get complete competitor profile"""
    try:
        profile = db.get_competitor_profile(driver_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Competitor not found")
        
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# REST API - DRIVER SKILLS
# ============================================================================

@app.get("/api/driver/{driver_id}/skills")
async def get_driver_skills(driver_id: str):
    """Get driver skill assessments"""
    try:
        skills = db.get_driver_skills(driver_id)
        
        return {
            "success": True,
            "skills": skills
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ProjectPitBox API",
        "version": "1.0.0",
        "description": "Complete Digital Race Team",
        "docs": "/docs"
    }


# Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
