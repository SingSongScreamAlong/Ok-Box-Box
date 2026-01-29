// =====================================================================
// RCO Incident Feed Component
// Scrolling list of incidents with selection
// =====================================================================

import React, { useEffect, useRef } from 'react';
import type { RcoIncident } from '../../types/rco';
import './RcoIncidentFeed.css';

interface RcoIncidentFeedProps {
    incidents: RcoIncident[];
    selectedIncidentId: string | null;
    onSelectIncident: (incidentId: string) => void;
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
    });
}

function getSeverityClass(severity: RcoIncident['severity']): string {
    switch (severity) {
        case 'critical': return 'severity-critical';
        case 'warn': return 'severity-warn';
        case 'info': return 'severity-info';
        default: return 'severity-info';
    }
}

function getStatusBadge(status: RcoIncident['status']): { label: string; className: string } {
    switch (status) {
        case 'new': return { label: 'NEW', className: 'status-new' };
        case 'acknowledged': return { label: 'ACK', className: 'status-ack' };
        case 'under_review': return { label: 'REVIEW', className: 'status-review' };
        case 'closed': return { label: 'CLOSED', className: 'status-closed' };
        default: return { label: status.toUpperCase(), className: '' };
    }
}

function getTypeIcon(type: RcoIncident['type']): string {
    switch (type) {
        case 'contact': return '💥';
        case 'off_track': return '🚧';
        case 'spin': return '🔄';
        case 'unsafe_rejoin': return '⚠️';
        case 'blocking': return '🚫';
        case 'speeding': return '🏎️';
        case 'cutting': return '✂️';
        default: return '❓';
    }
}

export const RcoIncidentFeed: React.FC<RcoIncidentFeedProps> = ({
    incidents,
    selectedIncidentId,
    onSelectIncident,
}) => {
    const selectedRef = useRef<HTMLDivElement>(null);

    // Scroll selected incident into view
    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedIncidentId]);

    if (incidents.length === 0) {
        return (
            <div className="rco-incident-feed rco-incident-feed--empty">
                <div className="rco-incident-feed__empty-state">
                    <span className="empty-icon">📋</span>
                    <span className="empty-text">No incidents detected</span>
                    <span className="empty-subtext">Incidents will appear here as they occur</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rco-incident-feed">
            <div className="rco-incident-feed__header">
                <span className="feed-title">Incident Feed</span>
                <span className="feed-count">{incidents.length} incidents</span>
            </div>
            <div className="rco-incident-feed__list">
                {incidents.map((incident) => {
                    const isSelected = incident.incidentId === selectedIncidentId;
                    const isNew = incident.status === 'new';
                    const statusBadge = getStatusBadge(incident.status);

                    return (
                        <div
                            key={incident.incidentId}
                            ref={isSelected ? selectedRef : null}
                            className={`rco-incident-item ${getSeverityClass(incident.severity)} ${isSelected ? 'selected' : ''} ${isNew ? 'is-new' : ''}`}
                            onClick={() => onSelectIncident(incident.incidentId)}
                        >
                            <div className="incident-item__header">
                                <span className="incident-type">
                                    {getTypeIcon(incident.type)} {incident.type.replace('_', ' ')}
                                </span>
                                <span className={`incident-status ${statusBadge.className}`}>
                                    {statusBadge.label}
                                </span>
                            </div>
                            <div className="incident-item__summary">
                                {incident.summary}
                            </div>
                            <div className="incident-item__meta">
                                <span className="incident-time">{formatTime(incident.timestamp)}</span>
                                {incident.lapNumber && (
                                    <span className="incident-lap">Lap {incident.lapNumber}</span>
                                )}
                                {incident.cornerName && (
                                    <span className="incident-corner">{incident.cornerName}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RcoIncidentFeed;
