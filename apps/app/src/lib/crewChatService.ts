/**
 * Crew Chat Service
 * Connects crew chat UI (Engineer, Spotter, Analyst) to the backend AI endpoint.
 */

import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

export type CrewRole = 'engineer' | 'spotter';

export interface ChatMessage {
  role: 'user' | string; // 'user' | 'engineer' | 'spotter' | 'analyst'
  content: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}` };
  }
  return {};
}

/**
 * Send a message to a crew member and get an AI response.
 * 
 * @param message - The user's message
 * @param role - Which crew member to talk to
 * @param history - Previous messages for context
 * @returns The crew member's response text
 */
export async function sendCrewMessage(
  message: string,
  role: CrewRole,
  history: ChatMessage[] = []
): Promise<string> {
  try {
    const auth = await getAuthHeader();
    if (!auth.Authorization) {
      return 'You need to be logged in to chat with your crew.';
    }

    const response = await fetch(`${API_BASE}/api/v1/drivers/me/crew-chat`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, role, history }),
    });

    if (!response.ok) {
      console.error('[CrewChat] API error:', response.status);
      return 'Having trouble connecting right now. Try again in a moment.';
    }

    const data = await response.json();
    return data.response || 'No response received.';
  } catch (error) {
    console.error('[CrewChat] Error:', error instanceof Error ? error.message : error);
    return 'Connection error. Check your network and try again.';
  }
}
