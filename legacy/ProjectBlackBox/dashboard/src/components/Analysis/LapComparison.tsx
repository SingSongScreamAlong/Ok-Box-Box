import React, { useState, useEffect } from 'react';
import './Analysis.css';

interface LapData {
    lap: number;
    lapTime: number;
    delta: number;
    avgSpeed: number;
    maxSpeed: number;
}

interface ComparisonData {
    pos: number;
    speed: number;
    throttle: number;
    brake: number;
}

interface LapComparisonProps {
    sessionId: string;
}

const LapComparison: React.FC<LapComparisonProps> = ({ sessionId }) => {
    const [laps, setLaps] = useState<LapData[]>([]);
    const [bestLap, setBestLap] = useState<number>(1);
    const [selectedLaps, setSelectedLaps] = useState<[number, number]>([0, 0]);
    const [comparison, setComparison] = useState<{ lap1: ComparisonData[]; lap2: ComparisonData[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchLaps = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/analysis/laps/${sessionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to load lap data');

                const data = await res.json();
                setLaps(data.laps);
                setBestLap(data.bestLap);

                // Select best lap and second best by default
                if (data.laps.length >= 2) {
                    const sorted = [...data.laps].sort((a, b) => a.lapTime - b.lapTime);
                    setSelectedLaps([sorted[0].lap, sorted[1].lap]);
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLaps();
    }, [sessionId, backendUrl, token]);

    const loadComparison = async () => {
        if (selectedLaps[0] === 0 || selectedLaps[1] === 0) return;

        try {
            const res = await fetch(
                `${backendUrl}/api/analysis/compare/${sessionId}?lap1=${selectedLaps[0]}&lap2=${selectedLaps[1]}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!res.ok) throw new Error('Failed to compare laps');

            const data = await res.json();
            setComparison({
                lap1: data.lap1.data,
                lap2: data.lap2.data
            });
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        if (selectedLaps[0] && selectedLaps[1]) {
            loadComparison();
        }
    }, [selectedLaps]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    };

    if (loading) return <div className="analysis-loading">Loading laps...</div>;
    if (error) return <div className="analysis-error">{error}</div>;
    if (laps.length === 0) return <div className="analysis-error">No lap data available</div>;

    return (
        <div className="lap-comparison">
            <div className="analysis-header">
                <h2>Lap Comparison</h2>
            </div>

            <div className="lap-selector">
                <div className="selector-group">
                    <label>Lap 1:</label>
                    <select
                        value={selectedLaps[0]}
                        onChange={(e) => setSelectedLaps([parseInt(e.target.value), selectedLaps[1]])}
                    >
                        <option value={0}>Select lap</option>
                        {laps.map(lap => (
                            <option key={lap.lap} value={lap.lap}>
                                Lap {lap.lap} - {formatTime(lap.lapTime)} {lap.lap === bestLap ? '(BEST)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="vs-label">VS</div>
                <div className="selector-group">
                    <label>Lap 2:</label>
                    <select
                        value={selectedLaps[1]}
                        onChange={(e) => setSelectedLaps([selectedLaps[0], parseInt(e.target.value)])}
                    >
                        <option value={0}>Select lap</option>
                        {laps.map(lap => (
                            <option key={lap.lap} value={lap.lap}>
                                Lap {lap.lap} - {formatTime(lap.lapTime)} {lap.lap === bestLap ? '(BEST)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {comparison && (
                <div className="comparison-chart">
                    <h3>Speed Comparison</h3>
                    <div className="speed-trace">
                        {/* Simple ASCII-style visualization */}
                        <div className="trace-legend">
                            <span className="lap1-legend">■ Lap {selectedLaps[0]}</span>
                            <span className="lap2-legend">■ Lap {selectedLaps[1]}</span>
                        </div>
                        <div className="trace-graph">
                            {comparison.lap1.slice(0, 50).map((point, i) => {
                                const lap2Point = comparison.lap2[i] || { speed: 0 };
                                const delta = point.speed - lap2Point.speed;
                                return (
                                    <div key={i} className="trace-bar" title={`Δ ${delta > 0 ? '+' : ''}${delta} km/h`}>
                                        <div
                                            className={`bar ${delta > 0 ? 'faster' : 'slower'}`}
                                            style={{ height: `${Math.min(Math.abs(delta), 50)}%` }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="trace-labels">
                            <span>Start</span>
                            <span>Track Position</span>
                            <span>Finish</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="lap-details">
                <h3>All Laps</h3>
                <div className="laps-grid">
                    {laps.map(lap => (
                        <div
                            key={lap.lap}
                            className={`lap-card ${lap.lap === bestLap ? 'best' : ''} ${selectedLaps.includes(lap.lap) ? 'selected' : ''}`}
                            onClick={() => {
                                if (!selectedLaps.includes(lap.lap)) {
                                    setSelectedLaps([selectedLaps[1], lap.lap]);
                                }
                            }}
                        >
                            <div className="lap-num">Lap {lap.lap}</div>
                            <div className="lap-time">{formatTime(lap.lapTime)}</div>
                            <div className={`lap-delta ${lap.delta > 0 ? 'positive' : ''}`}>
                                {lap.delta > 0 ? `+${lap.delta.toFixed(3)}` : 'BEST'}
                            </div>
                            <div className="lap-speeds">
                                <span>Avg: {lap.avgSpeed} km/h</span>
                                <span>Max: {lap.maxSpeed} km/h</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LapComparison;
