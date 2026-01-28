// Hook for accessing team data (drivers, cars, events, race plans)
// This abstracts the data source - currently mock, later real API

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  mockDrivers,
  mockTeam,
  mockTracks,
  mockEvents,
  mockRacePlans,
  mockRadioChannels,
  type Driver,
  type Team,
  type Track,
  type RaceEvent,
  type RacePlan,
  type Stint,
  type RadioChannel,
  type PlanChange,
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

  // Simulate loading data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Load mock data (in production, this would be API calls)
      setTeam(mockTeam);
      setDrivers(mockDrivers);
      setTracks(mockTracks);
      setEvents(mockEvents);
      setRacePlans(mockRacePlans);
      setRadioChannels(mockRadioChannels);
      
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
