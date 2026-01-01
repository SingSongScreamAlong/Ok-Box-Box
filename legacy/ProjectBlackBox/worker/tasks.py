from .celery_app import app
from .debrief_generator import DebriefGenerator
import time

@app.task(name='worker.tasks.generate_race_debrief')
def generate_race_debrief(session_id: str, session_data: dict, lap_data: list):
    """
    Generate comprehensive race debrief report.
    """
    print(f"Generating debrief for session {session_id}...")
    
    generator = DebriefGenerator()
    report = generator.generate_debrief(session_id, session_data, lap_data)
    
    # Save to file
    output_path = f"/tmp/debrief_{session_id}.json"
    generator.save_report(report, output_path)
    
    return {
        "status": "completed",
        "session_id": session_id,
        "report_path": output_path,
        "grade": report.overall_grade,
        "consistency": report.consistency_score
    }

@app.task(name='worker.tasks.run_strategy_simulation')
def run_strategy_simulation(race_state: dict):
    """
    Run strategy simulation task.
    """
    print(f"Running strategy simulation...")
    # Would use StrategySimulator here
    time.sleep(2)
    return {"recommendation": "BOX_NOW", "confidence": 0.85}
