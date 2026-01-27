import { supabase } from './supabase';

export interface Event {
  id: string;
  league_id: string | null;
  name: string;
  description: string | null;
  track_name: string | null;
  scheduled_at: string | null;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Demo events for testing
export const DEMO_EVENTS: Event[] = [
  {
    id: 'e1',
    league_id: 'demo',
    name: 'Daytona 24 Hours',
    description: 'Season opener endurance race',
    track_name: 'Daytona International Speedway',
    scheduled_at: '2026-01-25T14:00:00Z',
    status: 'scheduled',
    created_by: 'demo-owner',
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z'
  },
  {
    id: 'e2',
    league_id: 'demo',
    name: 'Sebring 12 Hours',
    description: 'Round 2 of the championship',
    track_name: 'Sebring International Raceway',
    scheduled_at: '2026-03-15T10:00:00Z',
    status: 'scheduled',
    created_by: 'demo-owner',
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z'
  },
  {
    id: 'e3',
    league_id: 'demo',
    name: 'Spa 6 Hours',
    description: 'European round',
    track_name: 'Circuit de Spa-Francorchamps',
    scheduled_at: '2026-05-10T12:00:00Z',
    status: 'scheduled',
    created_by: 'demo-owner',
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z'
  },
  {
    id: 'e4',
    league_id: 'demo',
    name: 'Pre-Season Test',
    description: 'Official pre-season testing',
    track_name: 'Daytona International Speedway',
    scheduled_at: '2026-01-10T14:00:00Z',
    status: 'completed',
    created_by: 'demo-owner',
    created_at: '2025-11-15T00:00:00Z',
    updated_at: '2026-01-10T20:00:00Z'
  }
];

export interface EventEntry {
  id: string;
  event_id: string;
  user_id: string | null;
  team_id: string | null;
  driver_name: string | null;
  car_number: string | null;
  status: 'registered' | 'confirmed' | 'withdrawn' | 'dns' | 'dnf' | 'finished';
  created_at: string;
}

// Get events for a league
export async function getLeagueEvents(leagueId: string): Promise<Event[]> {
  // Return demo events for demo league
  if (leagueId === 'demo') {
    return DEMO_EVENTS;
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('league_id', leagueId)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data || [];
}

// Get a single event
export async function getEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return data;
}

// Create event
export async function createEvent(
  leagueId: string | null,
  name: string,
  createdBy: string,
  options?: {
    description?: string;
    track_name?: string;
    scheduled_at?: string;
  }
): Promise<{ data: Event | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      league_id: leagueId,
      name,
      created_by: createdBy,
      description: options?.description || null,
      track_name: options?.track_name || null,
      scheduled_at: options?.scheduled_at || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Update event
export async function updateEvent(
  eventId: string,
  updates: {
    name?: string;
    description?: string;
    track_name?: string;
    scheduled_at?: string;
    status?: 'scheduled' | 'live' | 'completed' | 'cancelled';
  }
): Promise<{ data: Event | null; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Delete event
export async function deleteEvent(eventId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Get event entries
export async function getEventEntries(eventId: string): Promise<EventEntry[]> {
  const { data, error } = await supabase
    .from('event_entries')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return data || [];
}

// Register for event
export async function registerForEvent(
  eventId: string,
  userId: string,
  options?: {
    team_id?: string;
    driver_name?: string;
    car_number?: string;
  }
): Promise<{ data: EventEntry | null; error: string | null }> {
  const { data, error } = await supabase
    .from('event_entries')
    .insert({
      event_id: eventId,
      user_id: userId,
      team_id: options?.team_id || null,
      driver_name: options?.driver_name || null,
      car_number: options?.car_number || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering for event:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Withdraw from event
export async function withdrawFromEvent(eventId: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('event_entries')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Get user's entry for an event
export async function getUserEventEntry(eventId: string, userId: string): Promise<EventEntry | null> {
  const { data, error } = await supabase
    .from('event_entries')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}
