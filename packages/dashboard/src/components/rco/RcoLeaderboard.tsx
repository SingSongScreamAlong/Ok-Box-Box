// =====================================================================
// RCO Leaderboard Component
// Live standings display
// =====================================================================

import React from 'react';
import type { StandingsEntry } from '../../types/rco';
import './RcoLeaderboard.css';

interface RcoLeaderboardProps {
    standings: StandingsEntry[];
    maxVisible?: number;
}

export const RcoLeaderboard: React.FC<RcoLeaderboardProps> = ({
    standings,
    maxVisible = 15,
}) => {
    const visibleStandings = standings.slice(0, maxVisible);

    if (standings.length === 0) {
        return (
            <div className="rco-leaderboard rco-leaderboard--empty">
                <div className="rco-leaderboard__empty-state">
                    <span className="empty-icon">🏁</span>
                    <span className="empty-text">Waiting for standings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rco-leaderboard">
            <div className="rco-leaderboard__header">
                <span className="header-title">Live Standings</span>
                <span className="header-count">{standings.length} cars</span>
            </div>
            <div className="rco-leaderboard__table">
                <div className="leaderboard-row leaderboard-row--header">
                    <span className="col-pos">P</span>
                    <span className="col-num">#</span>
                    <span className="col-driver">Driver</span>
                    <span className="col-gap">Gap</span>
                    <span className="col-last">Last</span>
                </div>
                <div className="leaderboard-body">
                    {visibleStandings.map((entry) => (
                        <div 
                            key={entry.carNumber} 
                            className={`leaderboard-row ${entry.inPit ? 'in-pit' : ''} ${entry.position <= 3 ? 'top-3' : ''}`}
                        >
                            <span className="col-pos">
                                <span className={`position-badge pos-${entry.position}`}>
                                    {entry.position}
                                </span>
                            </span>
                            <span className="col-num">{entry.carNumber}</span>
                            <span className="col-driver">
                                {entry.driverName}
                                {entry.inPit && <span className="pit-indicator">PIT</span>}
                            </span>
                            <span className="col-gap">{entry.gap}</span>
                            <span className="col-last">{entry.lastLap}</span>
                        </div>
                    ))}
                </div>
            </div>
            {standings.length > maxVisible && (
                <div className="rco-leaderboard__more">
                    +{standings.length - maxVisible} more
                </div>
            )}
        </div>
    );
};

export default RcoLeaderboard;
