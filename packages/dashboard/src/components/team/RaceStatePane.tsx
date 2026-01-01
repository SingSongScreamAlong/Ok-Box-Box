/**
 * Race State Pane
 * Top-left corner: Session type, lap count, flag state, position.
 * Always visible, never scrolls.
 */

import React from 'react';
import type { RaceStateData } from '../../types/evidence';
import './RaceStatePane.css';

interface RaceStatePaneProps {
    data: RaceStateData | null;
}

// Default values for when no data is available
const DEFAULT_RACE_STATE: RaceStateData = {
    flagState: 'green',
    sessionType: 'Waiting for session...',
    currentLap: 0,
    totalLaps: null,
    timeRemaining: null,
    position: 0,
    classPosition: undefined,
    gap: '—'
};

export const RaceStatePane: React.FC<RaceStatePaneProps> = ({ data }) => {
    // Use default values when no data - shows full UI structure
    const d = data ?? DEFAULT_RACE_STATE;

    const getFlagClass = (flag: string) => {
        return `flag-indicator ${flag}`;
    };

    const formatLaps = () => {
        if (d.totalLaps) {
            return `${d.currentLap} / ${d.totalLaps}`;
        }
        return `Lap ${d.currentLap}`;
    };

    const formatTime = () => {
        if (d.timeRemaining === null) return null;
        const mins = Math.floor(d.timeRemaining / 60);
        const secs = Math.floor(d.timeRemaining % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`race-state-pane ${!data ? 'no-data' : ''}`}>
            {/* Flag State */}
            <div className={getFlagClass(d.flagState)}>
                <span className="flag-label">{d.flagState.toUpperCase()}</span>
            </div>

            {/* Session Type */}
            <div className="session-type">{d.sessionType}</div>

            {/* Lap / Time */}
            <div className="race-progress">
                <div className="lap-count">{formatLaps()}</div>
                {formatTime() && (
                    <div className="time-remaining">{formatTime()}</div>
                )}
            </div>

            {/* Position */}
            <div className="position-display">
                <span className="position-label">P</span>
                <span className="position-value">{d.position}</span>
                {d.classPosition && d.classPosition !== d.position && (
                    <span className="class-position">(C{d.classPosition})</span>
                )}
            </div>

            {/* Gap */}
            <div className="gap-display">
                <span className="gap-label">Gap</span>
                <span className="gap-value">{d.gap}</span>
            </div>
        </div>
    );
};

export default RaceStatePane;
