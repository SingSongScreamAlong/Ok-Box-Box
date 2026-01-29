// =====================================================================
// RCO Incident Detail Component
// Detailed view of selected incident with actions
// =====================================================================

import React from 'react';
import type { RcoIncident } from '../../types/rco';
import './RcoIncidentDetail.css';

interface RcoIncidentDetailProps {
    incident: RcoIncident | null;
    onAcknowledge?: (incidentId: string) => void;
    onMarkForReview?: (incidentId: string) => void;
    onAddTag?: (incidentId: string, tag: string) => void;
    onCreatePenalty?: (incidentId: string) => void;
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

function formatSessionTime(seconds?: number): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSeverityLabel(severity: RcoIncident['severity']): { label: string; className: string } {
    switch (severity) {
        case 'critical': return { label: 'CRITICAL', className: 'severity-critical' };
        case 'warn': return { label: 'WARNING', className: 'severity-warn' };
        case 'info': return { label: 'INFO', className: 'severity-info' };
    }
}

function getTypeLabel(type: RcoIncident['type']): string {
    const labels: Record<string, string> = {
        'contact': 'Contact',
        'off_track': 'Off Track',
        'spin': 'Spin',
        'unsafe_rejoin': 'Unsafe Rejoin',
        'blocking': 'Blocking',
        'speeding': 'Speeding',
        'cutting': 'Track Cutting',
        'other': 'Other',
    };
    return labels[type] || type;
}

export const RcoIncidentDetail: React.FC<RcoIncidentDetailProps> = ({
    incident,
    onAcknowledge,
    onMarkForReview,
    onAddTag,
    onCreatePenalty,
}) => {
    if (!incident) {
        return (
            <div className="rco-incident-detail rco-incident-detail--empty">
                <div className="rco-incident-detail__empty-state">
                    <span className="empty-icon">🔍</span>
                    <span className="empty-text">No incident selected</span>
                    <span className="empty-subtext">Select an incident from the feed or map</span>
                </div>
            </div>
        );
    }

    const severityInfo = getSeverityLabel(incident.severity);

    return (
        <div className="rco-incident-detail">
            <div className="rco-incident-detail__header">
                <div className="header-title">
                    <span className="incident-type-label">{getTypeLabel(incident.type)}</span>
                    <span className={`incident-severity ${severityInfo.className}`}>
                        {severityInfo.label}
                    </span>
                </div>
                <div className="header-id">#{incident.incidentId.slice(-6)}</div>
            </div>

            <div className="rco-incident-detail__content">
                {/* WHO */}
                <div className="detail-section">
                    <div className="section-label">WHO</div>
                    <div className="involved-drivers">
                        {incident.involved.map((driver, idx) => (
                            <div key={idx} className="driver-card">
                                <span className="driver-number">#{driver.carNumber}</span>
                                <span className="driver-name">{driver.driverName}</span>
                                {driver.teamName && (
                                    <span className="driver-team">{driver.teamName}</span>
                                )}
                                {driver.iRating && (
                                    <span className="driver-irating">{driver.iRating} iR</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* WHERE */}
                <div className="detail-section">
                    <div className="section-label">WHERE</div>
                    <div className="location-info">
                        <div className="location-row">
                            {incident.cornerName && (
                                <span className="location-corner">{incident.cornerName}</span>
                            )}
                            {incident.sectorName && (
                                <span className="location-sector">{incident.sectorName}</span>
                            )}
                        </div>
                        <div className="location-row">
                            {incident.lapNumber && (
                                <span className="location-lap">Lap {incident.lapNumber}</span>
                            )}
                            <span className="location-time">{formatTime(incident.timestamp)}</span>
                            {incident.sessionTime && (
                                <span className="location-session">Session: {formatSessionTime(incident.sessionTime)}</span>
                            )}
                        </div>
                        <div className="location-row">
                            <span className="location-pct">
                                Track Position: {Math.round(incident.trackLocation.lapDistPct * 100)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* WHAT */}
                <div className="detail-section">
                    <div className="section-label">WHAT</div>
                    <div className="summary-text">{incident.summary}</div>
                </div>

                {/* WHY (if available) */}
                {incident.explanation && (
                    <div className="detail-section">
                        <div className="section-label">WHY</div>
                        <div className="explanation-text">{incident.explanation}</div>
                    </div>
                )}

                {/* EVIDENCE (if available) */}
                {incident.evidence && (
                    <div className="detail-section">
                        <div className="section-label">EVIDENCE</div>
                        <div className="evidence-links">
                            {incident.evidence.replayTime && (
                                <button className="evidence-btn">
                                    🎬 Replay @ {formatSessionTime(incident.evidence.replayTime)}
                                </button>
                            )}
                            {incident.evidence.link && (
                                <a href={incident.evidence.link} target="_blank" rel="noopener noreferrer" className="evidence-btn">
                                    🔗 View Clip
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ACTIONS */}
            <div className="rco-incident-detail__actions">
                <button 
                    className="action-btn action-btn--primary"
                    onClick={() => onAcknowledge?.(incident.incidentId)}
                    disabled={incident.status !== 'new'}
                >
                    ✓ Acknowledge
                </button>
                <button 
                    className="action-btn action-btn--secondary"
                    onClick={() => onMarkForReview?.(incident.incidentId)}
                >
                    📋 Mark for Review
                </button>
                <button 
                    className="action-btn action-btn--secondary"
                    onClick={() => onAddTag?.(incident.incidentId, 'flagged')}
                >
                    🏷️ Add Tag
                </button>
                <button 
                    className="action-btn action-btn--danger"
                    onClick={() => onCreatePenalty?.(incident.incidentId)}
                >
                    🚩 Create Penalty
                </button>
            </div>
        </div>
    );
};

export default RcoIncidentDetail;
