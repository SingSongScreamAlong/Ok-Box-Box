import { supabase } from './supabase';

export interface DriverProfile {
  id: string;
  user_id: string;
  iracing_customer_id: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export async function getDriverProfile(userId: string): Promise<DriverProfile | null> {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - profile doesn't exist
      return null;
    }
    console.error('Error fetching driver profile:', error);
    return null;
  }

  return data;
}

export async function createDriverProfile(
  userId: string,
  displayName: string,
  iRacingCustomerId?: string
): Promise<{ data: DriverProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('driver_profiles')
    .insert({
      user_id: userId,
      display_name: displayName,
      iracing_customer_id: iRacingCustomerId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating driver profile:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateDriverProfile(
  userId: string,
  updates: {
    display_name?: string;
    iracing_customer_id?: string | null;
  }
): Promise<{ data: DriverProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('driver_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating driver profile:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
