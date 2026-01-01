import React, { useState, useEffect } from 'react';
import './Analysis.css';

interface SessionReportData {
    sessionId: string;
    sessionName: string;
    track: string;
    totalLaps: number;
    bestLapTime: number;
    averageLapTime: number;
    consistency: number;
    topSpeed: number;
    averageSpeed: number;
    lapTimes: { lap: number; time: number; delta: number }[];
    recommendations: string[];
}

interface SessionReportProps {
    sessionId: string;
}

const SessionReport: React.FC<SessionReportProps> = ({ sessionId }) => {
    const [report, setReport] = useState<SessionReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const token = localStorage.getItem('token');
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                const res = await fetch(`${backendUrl}/api/reports/${sessionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to load report');

                const data = await res.json();
                setReport(data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [sessionId]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    };

    if (loading) return <div className="analysis-loading">Loading report...</div>;
    if (error) return <div className="analysis-error">{error}</div>;
    if (!report) return <div className="analysis-error">No report data</div>;

    return (
        <div className="session-report">
            <div className="report-header">
                <h2>{report.sessionName}</h2>
                <span className="track-name">{report.track}</span>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{report.totalLaps}</div>
                    <div className="stat-label">Total Laps</div>
                </div>
                <div className="stat-card best">
                    <div className="stat-value">{formatTime(report.bestLapTime)}</div>
                    <div className="stat-label">Best Lap</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{formatTime(report.averageLapTime)}</div>
                    <div className="stat-label">Average Lap</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{report.consistency}%</div>
                    <div className="stat-label">Consistency</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{report.topSpeed} km/h</div>
                    <div className="stat-label">Top Speed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{report.averageSpeed} km/h</div>
                    <div className="stat-label">Avg Speed</div>
                </div>
            </div>

            <div className="lap-times-section">
                <h3>Lap Times</h3>
                <div className="lap-times-table">
                    <div className="lap-header">
                        <span>Lap</span>
                        <span>Time</span>
                        <span>Delta</span>
                    </div>
                    {report.lapTimes.map((lap) => (
                        <div key={lap.lap} className={`lap-row ${lap.delta === 0 ? 'best-lap' : ''}`}>
                            <span>{lap.lap}</span>
                            <span>{formatTime(lap.time)}</span>
                            <span className={lap.delta > 0 ? 'delta-positive' : 'delta-best'}>
                                {lap.delta > 0 ? `+${lap.delta.toFixed(3)}` : 'BEST'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="recommendations-section">
                <h3>Recommendations</h3>
                <ul>
                    {report.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default SessionReport;
