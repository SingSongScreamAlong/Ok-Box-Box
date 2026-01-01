// =====================================================================
// RaceBox Placeholder (Week 7)
// Stub surface for Week 8-9 overlay work.
// =====================================================================

import './RaceBoxPlaceholder.css';

export function RaceBoxPlaceholder() {
    return (
        <div className="racebox-placeholder">
            <div className="coming-soon">
                <div className="icon">📺</div>
                <h1>RaceBox</h1>
                <p>Broadcast overlays coming soon</p>
                <div className="features">
                    <div className="feature">
                        <span className="bullet">•</span>
                        Live timing overlays
                    </div>
                    <div className="feature">
                        <span className="bullet">•</span>
                        Battle graphics
                    </div>
                    <div className="feature">
                        <span className="bullet">•</span>
                        Incident replays
                    </div>
                    <div className="feature">
                        <span className="bullet">•</span>
                        Driver comparison
                    </div>
                </div>
                <div className="eta">Expected: Week 8-9</div>
            </div>
        </div>
    );
}
