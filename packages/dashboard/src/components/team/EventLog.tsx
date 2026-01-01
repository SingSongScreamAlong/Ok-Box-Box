/**
 * Event Log Pane
 * Bottom bar: Recent events with clickable evidence.
 */

import React from 'react';
import { ClickableEvidence } from '../EvidencePopover';
import type { EventLogEntry } from '../../types/evidence';
import './EventLog.css';

interface EventLogProps {
    events: EventLogEntry[];
    maxVisible?: number;
}

export const EventLog: React.FC<EventLogProps> = ({ events, maxVisible = 5 }) => {
    const visibleEvents = events.slice(0, maxVisible);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            strategy: '📊',
            opponent: '🏎️',
            system: '⚙️',
            warning: '⚠️'
        };
        return icons[category] || '📝';
    };

    return (
        <div className={`event-log ${events.length === 0 ? 'no-data' : ''}`}>
            <div className="log-header">
                <span className="log-title">Event Log</span>
                <span className="event-count">
                    {events.length > 0 ? `${events.length} events` : 'Waiting for events...'}
                </span>
            </div>

            <div className="events-list">
                {events.length === 0 ? (
                    // Show empty placeholder events
                    <>
                        <div className="event-item placeholder">
                            <span className="event-time">--:--:--</span>
                            <span className="event-icon">⚙️</span>
                            <span className="event-message">Session events will appear here</span>
                        </div>
                        <div className="event-item placeholder">
                            <span className="event-time">--:--:--</span>
                            <span className="event-icon">📊</span>
                            <span className="event-message">Strategy updates and alerts</span>
                        </div>
                        <div className="event-item placeholder">
                            <span className="event-time">--:--:--</span>
                            <span className="event-icon">🏎️</span>
                            <span className="event-message">Opponent activity notifications</span>
                        </div>
                    </>
                ) : (
                    visibleEvents.map(event => (
                        <ClickableEvidence
                            key={event.id}
                            evidence={event.evidence}
                            className={`event-item ${event.importance}`}
                        >
                            <span className="event-time">{formatTime(event.timestamp)}</span>
                            <span className="event-icon">{getCategoryIcon(event.category)}</span>
                            <span className="event-message">{event.message}</span>
                        </ClickableEvidence>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventLog;
