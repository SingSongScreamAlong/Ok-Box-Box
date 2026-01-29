// =====================================================================
// useRcoIncidents Hook
// State management for RCO incidents, filtering, and selection
// =====================================================================

import { useState, useCallback, useMemo } from 'react';
import type { 
    RcoIncident, 
    RcoFilters, 
    StandingsEntry, 
    RcoConnectionStatus,
    IncidentType,
    IncidentSeverity,
    InvolvedDriver
} from '../types/rco';
import { DEFAULT_RCO_FILTERS } from '../types/rco';

// Mock data generator for demo mode
function generateMockIncidents(): RcoIncident[] {
    const types: IncidentType[] = ['contact', 'off_track', 'spin', 'unsafe_rejoin', 'blocking'];
    const severities: IncidentSeverity[] = ['info', 'warn', 'critical'];
    const corners = ['Turn 1', 'Turn 3', 'Chicane', 'Turn 7', 'Hairpin', 'Turn 11', 'Final Corner'];
    const drivers: InvolvedDriver[] = [
        { carNumber: '1', driverName: 'Max Verstappen', teamName: 'Red Bull', iRating: 8500 },
        { carNumber: '44', driverName: 'Lewis Hamilton', teamName: 'Mercedes', iRating: 8200 },
        { carNumber: '16', driverName: 'Charles Leclerc', teamName: 'Ferrari', iRating: 7800 },
        { carNumber: '55', driverName: 'Carlos Sainz', teamName: 'Ferrari', iRating: 7600 },
        { carNumber: '63', driverName: 'George Russell', teamName: 'Mercedes', iRating: 7400 },
        { carNumber: '4', driverName: 'Lando Norris', teamName: 'McLaren', iRating: 7200 },
        { carNumber: '81', driverName: 'Oscar Piastri', teamName: 'McLaren', iRating: 6800 },
        { carNumber: '14', driverName: 'Fernando Alonso', teamName: 'Aston Martin', iRating: 7000 },
    ];

    const incidents: RcoIncident[] = [];
    const now = Date.now();

    for (let i = 0; i < 8; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const corner = corners[Math.floor(Math.random() * corners.length)];
        const lapDistPct = Math.random();
        
        const driver1 = drivers[Math.floor(Math.random() * drivers.length)];
        let driver2 = drivers[Math.floor(Math.random() * drivers.length)];
        while (driver2.carNumber === driver1.carNumber) {
            driver2 = drivers[Math.floor(Math.random() * drivers.length)];
        }

        const involved = type === 'contact' ? [driver1, driver2] : [driver1];
        const lap = 5 + Math.floor(Math.random() * 20);

        incidents.push({
            incidentId: `inc-demo-${i}`,
            timestamp: now - (i * 45000) - Math.random() * 30000,
            sessionTime: 1200 + i * 45,
            lapNumber: lap,
            trackLocation: {
                x: 0,
                y: 0,
                lapDistPct,
            },
            cornerName: corner,
            type,
            severity,
            involved,
            summary: generateSummary(type, involved, corner),
            explanation: type === 'contact' ? `${driver1.driverName} made contact with ${driver2?.driverName} at ${corner}. Reviewing for potential penalty.` : undefined,
            status: i === 0 ? 'new' : i < 3 ? 'acknowledged' : 'under_review',
        });
    }

    return incidents.sort((a, b) => b.timestamp - a.timestamp);
}

function generateSummary(type: IncidentType, involved: InvolvedDriver[], corner: string): string {
    const driver1 = involved[0]?.driverName || 'Unknown';
    const driver2 = involved[1]?.driverName;

    switch (type) {
        case 'contact':
            return `Contact between #${involved[0]?.carNumber} ${driver1} and #${involved[1]?.carNumber} ${driver2} at ${corner}`;
        case 'off_track':
            return `#${involved[0]?.carNumber} ${driver1} went off track at ${corner}`;
        case 'spin':
            return `#${involved[0]?.carNumber} ${driver1} spun at ${corner}`;
        case 'unsafe_rejoin':
            return `#${involved[0]?.carNumber} ${driver1} unsafe rejoin at ${corner}`;
        case 'blocking':
            return `#${involved[0]?.carNumber} ${driver1} blocking at ${corner}`;
        default:
            return `Incident involving #${involved[0]?.carNumber} ${driver1} at ${corner}`;
    }
}

function generateMockStandings(): StandingsEntry[] {
    const drivers = [
        { carNumber: '1', driverName: 'Max Verstappen', teamName: 'Red Bull' },
        { carNumber: '44', driverName: 'Lewis Hamilton', teamName: 'Mercedes' },
        { carNumber: '16', driverName: 'Charles Leclerc', teamName: 'Ferrari' },
        { carNumber: '55', driverName: 'Carlos Sainz', teamName: 'Ferrari' },
        { carNumber: '63', driverName: 'George Russell', teamName: 'Mercedes' },
        { carNumber: '4', driverName: 'Lando Norris', teamName: 'McLaren' },
        { carNumber: '81', driverName: 'Oscar Piastri', teamName: 'McLaren' },
        { carNumber: '14', driverName: 'Fernando Alonso', teamName: 'Aston Martin' },
        { carNumber: '18', driverName: 'Lance Stroll', teamName: 'Aston Martin' },
        { carNumber: '10', driverName: 'Pierre Gasly', teamName: 'Alpine' },
    ];

    return drivers.map((d, i) => ({
        position: i + 1,
        carNumber: d.carNumber,
        driverName: d.driverName,
        teamName: d.teamName,
        gap: i === 0 ? 'Leader' : `+${(i * 1.2 + Math.random() * 0.5).toFixed(1)}s`,
        lastLap: `1:${(32 + Math.random() * 2).toFixed(3)}`,
        bestLap: `1:${(31.5 + Math.random() * 1).toFixed(3)}`,
        lapDistPct: Math.random(),
        inPit: Math.random() < 0.1,
    }));
}

export interface UseRcoIncidentsReturn {
    incidents: RcoIncident[];
    filteredIncidents: RcoIncident[];
    standings: StandingsEntry[];
    selectedIncident: RcoIncident | null;
    selectedIncidentId: string | null;
    autoFollowLatest: boolean;
    filters: RcoFilters;
    connectionStatus: RcoConnectionStatus;
    sessionId: string | null;
    trackName: string;
    sessionType: string;
    
    // Actions
    selectIncident: (incidentId: string | null) => void;
    setAutoFollowLatest: (enabled: boolean) => void;
    setFilters: (filters: Partial<RcoFilters>) => void;
    resetFilters: () => void;
    addIncident: (incident: RcoIncident) => void;
    updateIncidentStatus: (incidentId: string, status: RcoIncident['status']) => void;
    setStandings: (standings: StandingsEntry[]) => void;
    setConnectionStatus: (status: RcoConnectionStatus) => void;
    setSessionInfo: (sessionId: string, trackName: string, sessionType: string) => void;
    initDemoMode: () => void;
}

export function useRcoIncidents(): UseRcoIncidentsReturn {
    const [incidents, setIncidents] = useState<RcoIncident[]>([]);
    const [standings, setStandings] = useState<StandingsEntry[]>([]);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    const [autoFollowLatest, setAutoFollowLatest] = useState(true);
    const [filters, setFiltersState] = useState<RcoFilters>(DEFAULT_RCO_FILTERS);
    const [connectionStatus, setConnectionStatus] = useState<RcoConnectionStatus>('disconnected');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [trackName, setTrackName] = useState('Unknown Track');
    const [sessionType, setSessionType] = useState('Race');

    // Filter incidents
    const filteredIncidents = useMemo(() => {
        return incidents.filter(inc => {
            if (filters.severity !== 'all' && inc.severity !== filters.severity) return false;
            if (filters.type !== 'all' && inc.type !== filters.type) return false;
            if (filters.driver !== 'all') {
                const hasDriver = inc.involved.some(d => d.driverName === filters.driver);
                if (!hasDriver) return false;
            }
            if (filters.team !== 'all') {
                const hasTeam = inc.involved.some(d => d.teamName === filters.team);
                if (!hasTeam) return false;
            }
            if (filters.carClass !== 'all') {
                const hasClass = inc.involved.some(d => d.carClass === filters.carClass);
                if (!hasClass) return false;
            }
            return true;
        });
    }, [incidents, filters]);

    // Get selected incident
    const selectedIncident = useMemo(() => {
        if (!selectedIncidentId) return null;
        return incidents.find(inc => inc.incidentId === selectedIncidentId) || null;
    }, [incidents, selectedIncidentId]);

    // Actions
    const selectIncident = useCallback((incidentId: string | null) => {
        setSelectedIncidentId(incidentId);
    }, []);

    const setFilters = useCallback((newFilters: Partial<RcoFilters>) => {
        setFiltersState(prev => ({ ...prev, ...newFilters }));
    }, []);

    const resetFilters = useCallback(() => {
        setFiltersState(DEFAULT_RCO_FILTERS);
    }, []);

    const addIncident = useCallback((incident: RcoIncident) => {
        setIncidents(prev => {
            // Dedupe by incidentId
            if (prev.some(inc => inc.incidentId === incident.incidentId)) {
                return prev;
            }
            const updated = [incident, ...prev];
            return updated.sort((a, b) => b.timestamp - a.timestamp);
        });

        // Auto-select if auto-follow is enabled
        if (autoFollowLatest) {
            setSelectedIncidentId(incident.incidentId);
        }
    }, [autoFollowLatest]);

    const updateIncidentStatus = useCallback((incidentId: string, status: RcoIncident['status']) => {
        setIncidents(prev => prev.map(inc => 
            inc.incidentId === incidentId ? { ...inc, status } : inc
        ));
    }, []);

    const setSessionInfo = useCallback((newSessionId: string, newTrackName: string, newSessionType: string) => {
        setSessionId(newSessionId);
        setTrackName(newTrackName);
        setSessionType(newSessionType);
    }, []);

    const initDemoMode = useCallback(() => {
        setConnectionStatus('demo');
        setSessionId('demo-session');
        setTrackName('Spa-Francorchamps');
        setSessionType('Race');
        setIncidents(generateMockIncidents());
        setStandings(generateMockStandings());
        
        // Select the latest incident
        const mockIncidents = generateMockIncidents();
        if (mockIncidents.length > 0) {
            setSelectedIncidentId(mockIncidents[0].incidentId);
        }
    }, []);

    return {
        incidents,
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
    };
}
