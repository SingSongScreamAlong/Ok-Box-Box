import React, { useState, useEffect } from 'react';
import './Team.css';

interface Driver {
    id: string;
    name: string;
    sessionCount: number;
    lastActive: string;
}

interface Comparison {
    driverId: string;
    bestLap: number;
    avgSpeed: number;
    maxSpeed: number;
}

const TeamDashboard: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
    const [comparison, setComparison] = useState<Comparison[]>([]);
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/teams/drivers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setDrivers(data.drivers);
                }
            } catch (error) {
                console.error('Failed to fetch drivers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDrivers();
    }, [backendUrl, token]);

    const toggleDriver = (id: string) => {
        setSelectedDrivers(prev =>
            prev.includes(id)
                ? prev.filter(d => d !== id)
                : [...prev, id]
        );
    };

    const compareDrivers = async () => {
        if (selectedDrivers.length < 2) return;

        try {
            const res = await fetch(
                `${backendUrl}/api/teams/compare?drivers=${selectedDrivers.join(',')}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                setComparison(data.comparisons);
            }
        } catch (error) {
            console.error('Failed to compare drivers:', error);
        }
    };

    useEffect(() => {
        if (selectedDrivers.length >= 2) {
            compareDrivers();
        } else {
            setComparison([]);
        }
    }, [selectedDrivers]);

    const getDriverName = (id: string) => {
        return drivers.find(d => d.id === id)?.name || id.slice(0, 8);
    };

    if (loading) {
        return <div className="team-loading">Loading team data...</div>;
    }

    return (
        <div className="team-dashboard">
            <div className="team-header">
                <h2>Team Dashboard</h2>
                <p>Select 2 or more drivers to compare performance</p>
            </div>

            <div className="drivers-section">
                <h3>Drivers ({drivers.length})</h3>
                <div className="drivers-grid">
                    {drivers.map(driver => (
                        <div
                            key={driver.id}
                            className={`driver-card ${selectedDrivers.includes(driver.id) ? 'selected' : ''}`}
                            onClick={() => toggleDriver(driver.id)}
                        >
                            <div className="driver-avatar">
                                {driver.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="driver-info">
                                <div className="driver-name">{driver.name}</div>
                                <div className="driver-stats">
                                    {driver.sessionCount} sessions
                                </div>
                            </div>
                            {selectedDrivers.includes(driver.id) && (
                                <div className="selected-check">✓</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {comparison.length >= 2 && (
                <div className="comparison-section">
                    <h3>Performance Comparison</h3>
                    <div className="comparison-table">
                        <div className="comparison-header">
                            <span>Driver</span>
                            <span>Best Lap</span>
                            <span>Avg Speed</span>
                            <span>Max Speed</span>
                        </div>
                        {comparison
                            .sort((a, b) => b.avgSpeed - a.avgSpeed)
                            .map((comp, index) => (
                                <div key={comp.driverId} className={`comparison-row ${index === 0 ? 'leader' : ''}`}>
                                    <span className="driver-cell">
                                        {index === 0 && <span className="leader-badge">🥇</span>}
                                        {getDriverName(comp.driverId)}
                                    </span>
                                    <span>Lap {comp.bestLap}</span>
                                    <span>{comp.avgSpeed} km/h</span>
                                    <span>{comp.maxSpeed} km/h</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {drivers.length === 0 && (
                <div className="no-drivers">
                    <p>No driver data available yet.</p>
                    <p>Complete some sessions to see team comparisons.</p>
                </div>
            )}
        </div>
    );
};

export default TeamDashboard;
