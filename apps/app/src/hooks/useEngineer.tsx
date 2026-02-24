import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDriverMemory } from './useDriverMemory';
import { useRelay } from './useRelay';
import { 
  createEngineerCore,
  type EngineerMessage,
  type EngineerVerdict,
  type SessionBriefing
} from '../services/EngineerCore';

/**
 * useEngineer - The complete engineer experience
 * 
 * Combines:
 * - Driver memory (what the engineer knows about you)
 * - Engineer core (personality, judgment, opinions)
 * - Live telemetry (real-time intelligence)
 * 
 * This hook provides everything needed for the engineer to:
 * - Know the driver
 * - Form opinions
 * - Generate contextual messages
 * - Provide briefings and verdicts
 */
export function useEngineer() {
  const { 
    memory, 
    identity, 
    opinions, 
    loading: memoryLoading,
    getEngineerPersonality,
    getEngineerKnowledge
  } = useDriverMemory();
  
  const { status, telemetry, session, engineerUpdates, raceIntelligence } = useRelay();
  
  const [messages, setMessages] = useState<EngineerMessage[]>([]);
  const [lastBriefing, setLastBriefing] = useState<SessionBriefing | null>(null);
  const [lastVerdict, setLastVerdict] = useState<EngineerVerdict | null>(null);
  const prevStatusRef = useRef(status);
  const lastServerUpdateCount = useRef(0);

  // Create the engineer core instance
  const engineer = useMemo(() => {
    const personality = getEngineerPersonality();
    return createEngineerCore(memory, identity, opinions, personality);
  }, [memory, identity, opinions, getEngineerPersonality]);

  // Auto-briefing on session start, auto-verdict on session end
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // Session just started
    if (status === 'in_session' && prev !== 'in_session') {
      if (session.trackName) {
        const briefing = engineer.generateBriefing(
          session.trackName,
          session.sessionType || 'practice'
        );
        setLastBriefing(briefing);

        // Add briefing as an engineer message
        const msg = engineer.generateMessage(
          briefing.primaryFocus,
          'normal',
          'general'
        );
        setMessages(prev => [...prev, msg].slice(-20));
      }
    }

    // Session just ended
    if (prev === 'in_session' && status !== 'in_session') {
      const verdict = engineer.generateVerdict({
        bestLap: telemetry.bestLap,
        avgLap: null,
        incidents: 0,
        position: telemetry.position,
        laps: telemetry.lap || 0,
      });
      setLastVerdict(verdict);
    }
  }, [status, session.trackName, session.sessionType, engineer, telemetry.bestLap, telemetry.position, telemetry.lap]);

  // Process live telemetry for callouts
  useEffect(() => {
    if (status !== 'in_session' && status !== 'connected') return;

    const message = engineer.processLiveTelemetry(telemetry, session);
    if (message && engineer.shouldSpeak(message.urgency)) {
      setMessages(prev => {
        // Don't duplicate recent messages
        const isDuplicate = prev.some(m => 
          m.content === message.content && 
          Date.now() - m.timestamp < 10000
        );
        if (isDuplicate) return prev;
        
        // Keep last 20 messages
        const updated = [...prev, message].slice(-20);
        return updated;
      });
    }
  }, [engineer, status, telemetry, session]);

  // Process accumulated race intelligence for smarter voice callouts
  useEffect(() => {
    if (!raceIntelligence || (status !== 'in_session' && status !== 'connected')) return;

    const message = engineer.processRaceIntelligence(raceIntelligence);
    if (message) {
      setMessages(prev => {
        const isDuplicate = prev.some(m =>
          m.content === message.content &&
          Date.now() - m.timestamp < 30000
        );
        if (isDuplicate) return prev;
        return [...prev, message].slice(-20);
      });
    }
  }, [engineer, status, raceIntelligence]);

  // Merge server-side AI engineer updates into the message stream
  useEffect(() => {
    if (engineerUpdates.length <= lastServerUpdateCount.current) return;
    const newUpdates = engineerUpdates.slice(lastServerUpdateCount.current);
    lastServerUpdateCount.current = engineerUpdates.length;

    const newMessages: EngineerMessage[] = newUpdates.map(u => ({
      id: crypto.randomUUID(),
      content: u.message,
      urgency: u.priority === 'critical' ? 'critical' as const
        : u.priority === 'high' ? 'important' as const
        : u.priority === 'medium' ? 'normal' as const
        : 'low' as const,
      tone: 'advisory' as const,
      domain: u.type === 'traffic' ? 'racecraft' as const : 'general' as const,
      speakable: u.priority === 'critical' || u.priority === 'high',
      timestamp: u.timestamp,
      expiresAt: u.priority === 'critical' ? u.timestamp + 10000 : u.timestamp + 30000,
    }));

    setMessages(prev => [...prev, ...newMessages].slice(-20));
  }, [engineerUpdates]);

  // Generate briefing when session starts
  const generateBriefing = useCallback(() => {
    if (!session.trackName) return null;
    
    const briefing = engineer.generateBriefing(
      session.trackName,
      session.sessionType || 'practice'
    );
    setLastBriefing(briefing);
    return briefing;
  }, [engineer, session.trackName, session.sessionType]);

  // Generate verdict when session ends
  const generateVerdict = useCallback((metrics: {
    bestLap: number | null;
    avgLap: number | null;
    incidents: number;
    position: number | null;
    laps: number;
  }) => {
    const verdict = engineer.generateVerdict(metrics);
    setLastVerdict(verdict);
    return verdict;
  }, [engineer]);

  // Get current active messages (not expired)
  const activeMessages = useMemo(() => {
    const now = Date.now();
    return messages.filter(m => !m.expiresAt || m.expiresAt > now);
  }, [messages]);

  // Get critical messages
  const criticalMessages = useMemo(() => {
    return activeMessages.filter(m => m.urgency === 'critical');
  }, [activeMessages]);

  // Get the engineer's current read on the driver
  const driverAssessment = useMemo(() => {
    return engineer.getDriverAssessment();
  }, [engineer]);

  // Get what the engineer knows (for display)
  const engineerKnowledge = useMemo(() => {
    return getEngineerKnowledge();
  }, [getEngineerKnowledge]);

  // Request silence (e.g., driver wants to focus)
  const requestSilence = useCallback((durationMs: number = 30000) => {
    engineer.requestSilence(durationMs);
  }, [engineer]);

  // Manually add a message (for testing or explicit callouts)
  const addMessage = useCallback((
    content: string,
    urgency: EngineerMessage['urgency'] = 'normal',
    domain: EngineerMessage['domain'] = 'general'
  ) => {
    const message = engineer.generateMessage(content, urgency, domain);
    setMessages(prev => [...prev, message].slice(-20));
    return message;
  }, [engineer]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // State
    loading: memoryLoading,
    isConnected: status === 'connected' || status === 'in_session',
    isInSession: status === 'in_session',
    
    // Memory
    memory,
    identity,
    opinions,
    
    // Engineer outputs
    messages: activeMessages,
    criticalMessages,
    lastBriefing,
    lastVerdict,
    driverAssessment,
    engineerKnowledge,
    
    // Actions
    generateBriefing,
    generateVerdict,
    requestSilence,
    addMessage,
    clearMessages,
    
    // Direct access to engineer for advanced use
    engineer,
  };
}

/**
 * Format an engineer message for display
 */
export function formatEngineerMessage(message: EngineerMessage): {
  text: string;
  className: string;
  icon: 'alert' | 'info' | 'success' | 'warning';
} {
  let className = '';
  let icon: 'alert' | 'info' | 'success' | 'warning' = 'info';

  switch (message.urgency) {
    case 'critical':
      className = 'bg-red-500/20 border-red-500 text-red-400';
      icon = 'alert';
      break;
    case 'important':
      className = 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      icon = 'warning';
      break;
    case 'normal':
      className = 'bg-blue-500/20 border-blue-500 text-blue-400';
      icon = 'info';
      break;
    case 'low':
      className = 'bg-white/10 border-white/20 text-white/60';
      icon = 'info';
      break;
  }

  return {
    text: message.content,
    className,
    icon,
  };
}

/**
 * Get the role color for display
 */
export function getEngineerRoleColor(domain: EngineerMessage['domain']): string {
  switch (domain) {
    case 'pace':
    case 'technique':
      return 'text-orange-400'; // Engineer
    case 'racecraft':
      return 'text-blue-400'; // Spotter
    case 'consistency':
    case 'development':
      return 'text-purple-400'; // Analyst
    case 'mental':
      return 'text-green-400'; // Mental coach
    default:
      return 'text-white/60';
  }
}
