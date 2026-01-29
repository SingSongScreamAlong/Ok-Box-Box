// =====================================================================
// RCO Page (Race Control Observation)
// Live incident monitoring for League tier
// =====================================================================

import { useEffect, useCallback } from 'react';
import {
    RcoLayout,
    RcoTopBar,
    RcoTrackMap,
    RcoIncidentFeed,
    RcoIncidentDetail,
    RcoLeaderboard,
} from '../components/rco';
import { useRcoIncidents } from '../hooks/useRcoIncidents';
import { useRcoRealtime } from '../hooks/useRcoRealtime';
import type { RcoIncident, StandingsEntry } from '../types/rco';

export function RcoPage() {
    const {
        filteredIncidents,
        standings,
        selectedIncident,
        selectedIncidentId,
        autoFollowLatest,
        filters,
        connectionStatus,
        sessionId,
        trackName,
        sessionType,
        selectIncident,
        setAutoFollowLatest,
        setFilters,
        resetFilters,
        addIncident,
        updateIncidentStatus,
        setStandings,
        setConnectionStatus,
        setSessionInfo,
        initDemoMode,
    } = useRcoIncidents();

    // Realtime handlers
    const handleIncident = useCallback((incident: RcoIncident) => {
        addIncident(incident);
    }, [addIncident]);

    const handleStandings = useCallback((newStandings: StandingsEntry[]) => {
        setStandings(newStandings);
    }, [setStandings]);

    const handleSessionActive = useCallback((newSessionId: string, newTrackName: string, newSessionType: string) => {
        setSessionInfo(newSessionId, newTrackName, newSessionType);
        setConnectionStatus('live');
    }, [setSessionInfo, setConnectionStatus]);

    const handleConnectionChange = useCallback((connected: boolean) => {
        if (connected && connectionStatus === 'disconnected') {
            setConnectionStatus('live');
        } else if (!connected && connectionStatus === 'live') {
            setConnectionStatus('disconnected');
        }
    }, [connectionStatus, setConnectionStatus]);

    // Setup realtime connection
    const { joinSession } = useRcoRealtime({
        onIncident: handleIncident,
        onStandings: handleStandings,
        onSessionActive: handleSessionActive,
        onConnectionChange: handleConnectionChange,
    });

    // Join session when we have one
    useEffect(() => {
        if (sessionId && connectionStatus === 'live') {
            joinSession(sessionId);
        }
    }, [sessionId, connectionStatus, joinSession]);

    // Auto-init demo mode if disconnected after 3 seconds
    useEffect(() => {
        if (connectionStatus === 'disconnected') {
            const timer = setTimeout(() => {
                if (connectionStatus === 'disconnected') {
                    initDemoMode();
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [connectionStatus, initDemoMode]);

    // Action handlers
    const handleAcknowledge = useCallback((incidentId: string) => {
        updateIncidentStatus(incidentId, 'acknowledged');
    }, [updateIncidentStatus]);

    const handleMarkForReview = useCallback((incidentId: string) => {
        updateIncidentStatus(incidentId, 'under_review');
    }, [updateIncidentStatus]);

    const handleAddTag = useCallback((incidentId: string, tag: string) => {
        console.log('Add tag:', incidentId, tag);
    }, []);

    const handleCreatePenalty = useCallback((incidentId: string) => {
        console.log('Create penalty for:', incidentId);
    }, []);

    return (
        <RcoLayout
            topBar={
                <RcoTopBar
                    sessionId={sessionId}
                    trackName={trackName}
                    sessionType={sessionType}
                    connectionStatus={connectionStatus}
                    filters={filters}
                    autoFollowLatest={autoFollowLatest}
                    onFilterChange={setFilters}
                    onResetFilters={resetFilters}
                    onAutoFollowChange={setAutoFollowLatest}
                    onInitDemo={initDemoMode}
                />
            }
            trackMap={
                <RcoTrackMap
                    trackName={trackName}
                    incidents={filteredIncidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={selectIncident}
                />
            }
            leaderboard={
                <RcoLeaderboard
                    standings={standings}
                    maxVisible={12}
                />
            }
            incidentDetail={
                <RcoIncidentDetail
                    incident={selectedIncident}
                    onAcknowledge={handleAcknowledge}
                    onMarkForReview={handleMarkForReview}
                    onAddTag={handleAddTag}
                    onCreatePenalty={handleCreatePenalty}
                />
            }
            incidentFeed={
                <RcoIncidentFeed
                    incidents={filteredIncidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={selectIncident}
                />
            }
        />
    );
}

export default RcoPage;
