import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getLeague,
  getUserLeagueRole,
  getLeagueMembers,
  League,
  LeagueMembership,
} from '../lib/leagues';
import { getLeagueEvents, Event } from '../lib/events';
import { getLeagueIncidents, Incident } from '../lib/incidents';
import {
  fetchChampionship,
  fetchChampionshipStandings,
  Championship,
  ChampionshipStanding,
} from '../lib/championshipService';

// Re-export types for convenience
export type { League, LeagueMembership, Event, Incident, Championship, ChampionshipStanding };

// Context value interface
interface LeagueDataContextValue {
  // Loading state
  loading: boolean;
  
  // League info
  league: League | null;
  role: 'owner' | 'admin' | 'steward' | 'member' | null;
  
  // Members
  members: LeagueMembership[];
  
  // Events
  events: Event[];
  
  // Incidents
  incidents: Incident[];
  
  // Championship
  championship: Championship | null;
  standings: ChampionshipStanding[];
  
  // Refresh functions
  refreshLeague: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshIncidents: () => Promise<void>;
  refreshChampionship: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Helpers
  isAdmin: boolean;
  isSteward: boolean;
}

// Create context
const LeagueDataContext = createContext<LeagueDataContextValue | null>(null);

// Provider component
export function LeagueDataProvider({ children }: { children: ReactNode }) {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | 'steward' | 'member' | null>(null);
  const [members, setMembers] = useState<LeagueMembership[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [standings, setStandings] = useState<ChampionshipStanding[]>([]);

  // Refresh functions
  const refreshLeague = async () => {
    if (!leagueId) return;
    const data = await getLeague(leagueId);
    setLeague(data);
  };

  const refreshMembers = async () => {
    if (!leagueId) return;
    const data = await getLeagueMembers(leagueId);
    setMembers(data);
  };

  const refreshEvents = async () => {
    if (!leagueId) return;
    const data = await getLeagueEvents(leagueId);
    setEvents(data);
  };

  const refreshIncidents = async () => {
    if (!leagueId) return;
    const data = await getLeagueIncidents(leagueId);
    setIncidents(data);
  };

  const refreshChampionship = async () => {
    if (!leagueId) return;
    const champData = await fetchChampionship(leagueId);
    setChampionship(champData);
    if (champData) {
      const standingsData = await fetchChampionshipStandings(leagueId);
      setStandings(standingsData);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      refreshLeague(),
      refreshMembers(),
      refreshEvents(),
      refreshIncidents(),
      refreshChampionship(),
    ]);
    setLoading(false);
  };

  // Initial data load
  useEffect(() => {
    async function loadData() {
      if (!leagueId || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [leagueData, userRole, membersData, eventsData, incidentsData] = await Promise.all([
          getLeague(leagueId),
          getUserLeagueRole(leagueId, user.id),
          getLeagueMembers(leagueId),
          getLeagueEvents(leagueId),
          getLeagueIncidents(leagueId),
        ]);

        setLeague(leagueData);
        setRole(userRole);
        setMembers(membersData);
        setEvents(eventsData);
        setIncidents(incidentsData);

        // Load championship data
        const champData = await fetchChampionship(leagueId);
        setChampionship(champData);
        if (champData) {
          const standingsData = await fetchChampionshipStandings(leagueId);
          setStandings(standingsData);
        }
      } catch (error) {
        console.error('[LeagueData] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [leagueId, user]);

  // Computed properties
  const isAdmin = role === 'owner' || role === 'admin';
  const isSteward = role === 'steward' || isAdmin;

  const value: LeagueDataContextValue = {
    loading,
    league,
    role,
    members,
    events,
    incidents,
    championship,
    standings,
    refreshLeague,
    refreshMembers,
    refreshEvents,
    refreshIncidents,
    refreshChampionship,
    refreshAll,
    isAdmin,
    isSteward,
  };

  return (
    <LeagueDataContext.Provider value={value}>
      {children}
    </LeagueDataContext.Provider>
  );
}

// Hook to use league data
export function useLeagueData(): LeagueDataContextValue {
  const context = useContext(LeagueDataContext);
  if (!context) {
    throw new Error('useLeagueData must be used within a LeagueDataProvider');
  }
  return context;
}
