import React, { useState, useEffect } from 'react';
import './Analysis.css';

interface CornerData {
    cornerNumber: number;
    entrySpeed: number;
    minSpeed: number;
    exitSpeed: number;
    lateralG: number;
    trackPosition: number;
}

interface CornerAnalysisProps {
    sessionId: string;
    lap?: number;
}

const CornerAnalysis: React.FC<CornerAnalysisProps> = ({ sessionId, lap }) => {
    const [corners, setCorners] = useState<CornerData[]>([]);
    const [lapNumber, setLapNumber] = useState<number>(lap || 0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCorners = async () => {
            try {
                const token = localStorage.getItem('token');
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                let url = `${backendUrl}/api/analysis/corners/${sessionId}`;
                if (lap) url += `?lap=${lap}`;

                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to load corner data');

                const data = await res.json();
                setCorners(data.corners);
                setLapNumber(data.lapNumber);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCorners();
    }, [sessionId, lap]);

    if (loading) return <div className="analysis-loading">Analyzing corners...</div>;
    if (error) return <div className="analysis-error">{error}</div>;
    if (corners.length === 0) return <div className="analysis-error">No corners detected</div>;

    return (
        <div className="corner-analysis">
            <div className="analysis-header">
                <h2>Corner-by-Corner Analysis</h2>
                <span className="lap-badge">Lap {lapNumber}</span>
            </div>

            <div className="corners-table">
                <div className="corner-header">
                    <span>Corner</span>
                    <span>Entry</span>
                    <span>Min Speed</span>
                    <span>Exit</span>
                    <span>Lat G</span>
                </div>
                {corners.map((corner) => (
                    <div key={corner.cornerNumber} className="corner-row">
                        <span className="corner-number">T{corner.cornerNumber}</span>
                        <span>{corner.entrySpeed} km/h</span>
                        <span className="min-speed">{corner.minSpeed} km/h</span>
                        <span>{corner.exitSpeed} km/h</span>
                        <span className={corner.lateralG > 2 ? 'high-g' : ''}>{corner.lateralG}G</span>
                    </div>
                ))}
            </div>

            <div className="corner-summary">
                <div className="summary-stat">
                    <span className="value">{corners.length}</span>
                    <span className="label">Corners</span>
                </div>
                <div className="summary-stat">
                    <span className="value">{Math.min(...corners.map(c => c.minSpeed))} km/h</span>
                    <span className="label">Slowest Corner</span>
                </div>
                <div className="summary-stat">
                    <span className="value">{Math.max(...corners.map(c => c.lateralG))}G</span>
                    <span className="label">Max Lateral G</span>
                </div>
            </div>
        </div>
    );
};

export default CornerAnalysis;
