// Hook for accessing team data (drivers, cars, events, race plans)
// Connected to real API - NO DEMO DATA

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  fetchTeam,
  fetchTeamDrivers,
  fetchTeamEvents,
  fetchRacePlans,
  fetchStints,
  fetchTeamRoster,
} from '../lib/teamService';
import {
  type Driver,
  type Team,
  type Track,
  type RaceEvent,
  type RacePlan,
  type Stint,
  type RadioChannel,
  type PlanChange,
  type RunPlan,
  type DriverStint,
  type StrategyPlan,
  type TeamRoster,
} from '../services/mockData';

interface TeamDataContextValue {
  // Team & Drivers
  team: Team | null;
  drivers: Driver[];
  getDriver: (id: string) => Driver | undefined;
  getAvailableDrivers: () => Driver[];
  
  // Tracks
  tracks: Track[];
  getTrack: (id: string) => Track | undefined;
  
  // Events
  events: RaceEvent[];
  getEvent: (id: string) => RaceEvent | undefined;
  getUpcomingEvents: () => RaceEvent[];
  updateEvent: (id: string, updates: Partial<RaceEvent>) => void;
  
  // Race Plans
  racePlans: RacePlan[];
  getRacePlansForEvent: (eventId: string) => RacePlan[];
  getActivePlan: (eventId: string) => RacePlan | undefined;
  setActivePlan: (eventId: string, planId: string) => void;
  updateStint: (planId: string, stintId: string, updates: Partial<Stint>) => void;
  addStint: (planId: string, stint: Omit<Stint, 'id'>) => void;
  removeStint: (planId: string, stintId: string) => void;
  
  // Plan Changes (for driver confirmation)
  pendingChanges: PlanChange[];
  sendPlanToDrivers: (planId: string, driverIds: string[]) => PlanChange;
  confirmChange: (changeId: string, driverId: string) => void;
  
  // Radio Channels
  radioChannels: RadioChannel[];
  toggleChannelActive: (channelId: string) => void;
  setChannelVolume: (channelId: string, volume: number) => void;
  toggleChannelMute: (channelId: string) => void;
  
  // Practice Data
  runPlans: RunPlan[];
  driverStints: DriverStint[];
  updateRunPlan: (id: string, updates: Partial<RunPlan>) => void;
  
  // Strategy Data
  strategyPlan: StrategyPlan | null;
  
  // Roster Data
  roster: TeamRoster | null;
  
  // Loading state
  loading: boolean;
}

const TeamDataContext = createContext<TeamDataContextValue | null>(null);

export function TeamDataProvider({ children, teamId }: { children: ReactNode; teamId: string }) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [racePlans, setRacePlans] = useState<RacePlan[]>([]);
  const [radioChannels, setRadioChannels] = useState<RadioChannel[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PlanChange[]>([]);
  const [runPlans, setRunPlans] = useState<RunPlan[]>([]);
  const [driverStints, setDriverStints] = useState<DriverStint[]>([]);
  const [strategyPlan, setStrategyPlan] = useState<StrategyPlan | null>(null);
  const [roster, setRoster] = useState<TeamRoster | null>(null);

  // Load data from real API with demo fallback
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Fetch real data from API
        const [apiTeam, apiDrivers, apiEvents, apiPlans] = await Promise.all([
          fetchTeam(teamId),
          fetchTeamDrivers(teamId),
          fetchTeamEvents(teamId),
          fetchRacePlans(teamId),
        ]);

        // If no team data, leave as null (no demo data)
        if (!apiTeam) {
          console.log('[TeamData] No team data available');
          setLoading(false);
          return;
        }

        // Transform API team to local format
        const transformedTeam: Team = {
          id: apiTeam.id,
          name: apiTeam.name,
          shortName: apiTeam.shortName || apiTeam.name.substring(0, 3).toUpperCase(),
          color: apiTeam.primaryColor || '#f97316',
          drivers: apiDrivers.map(d => d.id),
          cars: [],
        };
        setTeam(transformedTeam);

        // Transform API drivers to local format
        const transformedDrivers: Driver[] = apiDrivers.map(d => ({
          id: d.id,
          name: d.displayName,
          shortName: d.displayName.split(' ').map(n => n[0]).join(''),
          number: '00', // TODO: Get from car assignment
          color: '#f97316',
          iRatingRoad: d.irating?.road || 1350,
          iRatingOval: d.irating?.oval || 1350,
          safetyRating: d.safetyRating?.road || 2.5,
          avgLapTime: 90000, // TODO: Calculate from sessions
          fuelPerLap: 2.5,
          maxStintLaps: 30,
          available: d.available !== false,
          notes: '',
        }));
        setDrivers(transformedDrivers);

        // Transform API events to local format
        const transformedEvents: RaceEvent[] = apiEvents.map(e => ({
          id: e.id,
          name: e.name,
          trackId: e.trackName.toLowerCase().replace(/\s+/g, '-'),
          type: e.durationMinutes && e.durationMinutes > 120 ? 'endurance' : 'race',
          status: e.status === 'upcoming' ? 'scheduled' : e.status === 'in_progress' ? 'in_progress' : 'completed',
          date: new Date(e.eventDate).toLocaleDateString(),
          time: new Date(e.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: e.durationMinutes ? `${Math.floor(e.durationMinutes / 60)}h ${e.durationMinutes % 60}m` : `${e.totalLaps} laps`,
          totalLaps: e.totalLaps || undefined,
          totalTime: e.durationMinutes || undefined,
          raceType: e.durationMinutes ? 'timed' : 'laps',
          assignedDrivers: transformedDrivers.map(d => d.id),
          notes: '',
        }));
        setEvents(transformedEvents);

        // Transform API race plans to local format
        const transformedPlans: RacePlan[] = await Promise.all(
          apiPlans.map(async (p) => {
            const stints = await fetchStints(teamId, p.id);
            return {
              id: p.id,
              eventId: p.eventId || '',
              name: p.name,
              variant: 'A' as const,
              isActive: p.isActive,
              stints: stints.map(s => ({
                id: s.id,
                driverId: s.driverId || '',
                startLap: s.startLap || 0,
                endLap: s.endLap || 0,
                laps: (s.endLap || 0) - (s.startLap || 0),
                fuelLoad: s.fuelLoad || 0,
                tireCompound: (s.tireCompound || 'medium') as 'soft' | 'medium' | 'hard' | 'wet' | 'inter',
                estimatedTime: s.estimatedDurationMinutes ? s.estimatedDurationMinutes * 60000 : 0,
                notes: s.notes || '',
              })),
              totalLaps: p.totalPitStops ? (p.totalPitStops + 1) * 30 : 100,
              estimatedTime: 0,
              fuelUsed: 0,
              pitStops: p.totalPitStops,
            };
          })
        );
        setRacePlans(transformedPlans);

        // Fetch roster from existing backend endpoint
        const apiRoster = await fetchTeamRoster(teamId);
        if (apiRoster) {
          setRoster(apiRoster);
        }
        // No roster fallback - leave as null if no data

        // These remain empty until live session provides data via WebSocket
        // No mock data - real racing system only
        setTracks([]);
        setRadioChannels([]);
        setRunPlans([]);
        setDriverStints([]);
        setStrategyPlan(null);

        console.log('[TeamData] Loaded real data for team:', teamId);
      } catch (error) {
        console.error('[TeamData] Error loading data:', error);
        // No fallback - leave state as empty/null
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [teamId]);

  // Driver helpers
  const getDriver = useCallback((id: string) => {
    return drivers.find(d => d.id === id);
  }, [drivers]);

  const getAvailableDrivers = useCallback(() => {
    return drivers.filter(d => d.available);
  }, [drivers]);

  // Track helpers
  const getTrack = useCallback((id: string) => {
    return tracks.find(t => t.id === id);
  }, [tracks]);

  // Event helpers
  const getEvent = useCallback((id: string) => {
    return events.find(e => e.id === id);
  }, [events]);

  const getUpcomingEvents = useCallback(() => {
    return events.filter(e => e.status !== 'completed');
  }, [events]);

  const updateEvent = useCallback((id: string, updates: Partial<RaceEvent>) => {
    setEvents(prev => prev.map(e => 
      e.id === id ? { ...e, ...updates } : e
    ));
  }, []);

  // Race Plan helpers
  const getRacePlansForEvent = useCallback((eventId: string) => {
    return racePlans.filter(p => p.eventId === eventId);
  }, [racePlans]);

  const getActivePlan = useCallback((eventId: string) => {
    return racePlans.find(p => p.eventId === eventId && p.isActive);
  }, [racePlans]);

  const setActivePlan = useCallback((eventId: string, planId: string) => {
    setRacePlans(prev => prev.map(p => ({
      ...p,
      isActive: p.eventId === eventId ? p.id === planId : p.isActive,
    })));
  }, []);

  const updateStint = useCallback((planId: string, stintId: string, updates: Partial<Stint>) => {
    setRacePlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        stints: plan.stints.map(stint =>
          stint.id === stintId ? { ...stint, ...updates } : stint
        ),
      };
    }));
  }, []);

  const addStint = useCallback((planId: string, stint: Omit<Stint, 'id'>) => {
    const newStint: Stint = {
      ...stint,
      id: `stint-${Date.now()}`,
    };
    setRacePlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        stints: [...plan.stints, newStint],
        pitStops: plan.pitStops + 1,
      };
    }));
  }, []);

  const removeStint = useCallback((planId: string, stintId: string) => {
    setRacePlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        stints: plan.stints.filter(s => s.id !== stintId),
        pitStops: Math.max(0, plan.pitStops - 1),
      };
    }));
  }, []);

  // Plan change/confirmation system
  const sendPlanToDrivers = useCallback((planId: string, driverIds: string[]): PlanChange => {
    const plan = racePlans.find(p => p.id === planId);
    const change: PlanChange = {
      id: `change-${Date.now()}`,
      racePlanId: planId,
      timestamp: new Date(),
      type: 'plan_switch',
      description: `Switched to ${plan?.name || 'new plan'}`,
      sentToDrivers: true,
      confirmedBy: [],
      pendingConfirmation: driverIds,
    };
    setPendingChanges(prev => [change, ...prev]);
    return change;
  }, [racePlans]);

  const confirmChange = useCallback((changeId: string, driverId: string) => {
    setPendingChanges(prev => prev.map(c => {
      if (c.id !== changeId) return c;
      return {
        ...c,
        confirmedBy: [...c.confirmedBy, driverId],
        pendingConfirmation: c.pendingConfirmation.filter(id => id !== driverId),
      };
    }));
  }, []);

  // Radio channel controls
  const toggleChannelActive = useCallback((channelId: string) => {
    setRadioChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, active: !ch.active } : ch
    ));
  }, []);

  const setChannelVolume = useCallback((channelId: string, volume: number) => {
    setRadioChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, volume } : ch
    ));
  }, []);

  const toggleChannelMute = useCallback((channelId: string) => {
    setRadioChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, muted: !ch.muted } : ch
    ));
  }, []);

  // Practice data helpers
  const updateRunPlan = useCallback((id: string, updates: Partial<RunPlan>) => {
    setRunPlans(prev => prev.map(rp =>
      rp.id === id ? { ...rp, ...updates } : rp
    ));
  }, []);

  const value: TeamDataContextValue = {
    team,
    drivers,
    getDriver,
    getAvailableDrivers,
    tracks,
    getTrack,
    events,
    getEvent,
    getUpcomingEvents,
    updateEvent,
    racePlans,
    getRacePlansForEvent,
    getActivePlan,
    setActivePlan,
    updateStint,
    addStint,
    removeStint,
    pendingChanges,
    sendPlanToDrivers,
    confirmChange,
    radioChannels,
    toggleChannelActive,
    setChannelVolume,
    toggleChannelMute,
    runPlans,
    driverStints,
    updateRunPlan,
    strategyPlan,
    roster,
    loading,
  };

  return (
    <TeamDataContext.Provider value={value}>
      {children}
    </TeamDataContext.Provider>
  );
}

export function useTeamData() {
  const context = useContext(TeamDataContext);
  if (!context) {
    throw new Error('useTeamData must be used within a TeamDataProvider');
  }
  return context;
}
