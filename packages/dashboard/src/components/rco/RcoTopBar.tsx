// =====================================================================
// RCO Top Bar Component
// Session selector, filters, and connection status
// =====================================================================

import React from 'react';
import type { RcoFilters, RcoConnectionStatus, IncidentType, IncidentSeverity } from '../../types/rco';
import './RcoTopBar.css';

interface RcoTopBarProps {
    sessionId: string | null;
    trackName: string;
    sessionType: string;
    connectionStatus: RcoConnectionStatus;
    filters: RcoFilters;
    autoFollowLatest: boolean;
    onFilterChange: (filters: Partial<RcoFilters>) => void;
    onResetFilters: () => void;
    onAutoFollowChange: (enabled: boolean) => void;
    onInitDemo: () => void;
}

function getConnectionBadge(status: RcoConnectionStatus): { label: string; className: string } {
    switch (status) {
        case 'live': return { label: 'LIVE', className: 'status-live' };
        case 'demo': return { label: 'DEMO', className: 'status-demo' };
        case 'disconnected': return { label: 'DISCONNECTED', className: 'status-disconnected' };
    }
}

export const RcoTopBar: React.FC<RcoTopBarProps> = ({
    sessionId,
    trackName,
    sessionType,
    connectionStatus,
    filters,
    autoFollowLatest,
    onFilterChange,
    onResetFilters,
    onAutoFollowChange,
    onInitDemo,
}) => {
    const connectionBadge = getConnectionBadge(connectionStatus);

    return (
        <div className="rco-top-bar">
            <div className="rco-top-bar__left">
                <div className="session-info">
                    <span className="session-track">{trackName}</span>
                    <span className="session-type">{sessionType}</span>
                    {sessionId && (
                        <span className="session-id">#{sessionId.slice(-6)}</span>
                    )}
                </div>
                <span className={`connection-badge ${connectionBadge.className}`}>
                    <span className="badge-dot"></span>
                    {connectionBadge.label}
                </span>
            </div>

            <div className="rco-top-bar__center">
                <div className="filter-group">
                    <label className="filter-label">Severity</label>
                    <select
                        className="filter-select"
                        value={filters.severity}
                        onChange={(e) => onFilterChange({ severity: e.target.value as IncidentSeverity | 'all' })}
                    >
                        <option value="all">All</option>
                        <option value="critical">Critical</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Type</label>
                    <select
                        className="filter-select"
                        value={filters.type}
                        onChange={(e) => onFilterChange({ type: e.target.value as IncidentType | 'all' })}
                    >
                        <option value="all">All</option>
                        <option value="contact">Contact</option>
                        <option value="off_track">Off Track</option>
                        <option value="spin">Spin</option>
                        <option value="unsafe_rejoin">Unsafe Rejoin</option>
                        <option value="blocking">Blocking</option>
                    </select>
                </div>

                <button className="filter-reset" onClick={onResetFilters}>
                    Reset
                </button>
            </div>

            <div className="rco-top-bar__right">
                <label className="auto-follow-toggle">
                    <input
                        type="checkbox"
                        checked={autoFollowLatest}
                        onChange={(e) => onAutoFollowChange(e.target.checked)}
                    />
                    <span className="toggle-label">Auto-follow latest</span>
                </label>

                {connectionStatus === 'disconnected' && (
                    <button className="demo-btn" onClick={onInitDemo}>
                        Launch Demo
                    </button>
                )}
            </div>
        </div>
    );
};

export default RcoTopBar;
