/**
 * Mock database for development/testing without Postgres
 * Stores data in memory - resets on restart
 */

import { logger } from '../logger.js';

interface MockSession {
  id: string;
  user_id: string;
  session_type: string;
  track_name: string;
  track_config: string;
  started_at: Date;
  ended_at: Date | null;
  metadata: Record<string, unknown>;
}

interface MockTelemetry {
  id: string;
  session_id: string;
  driver_id: number;
  timestamp: number;
  data: Record<string, unknown>;
}

interface MockTimingSnapshot {
  id: string;
  session_id: string;
  timestamp: number;
  entries: unknown[];
}

interface MockUser {
  id: string;
  email: string;
  license_tier: string;
  modules: string[];
  created_at: Date;
}

class MockDatabase {
  private sessions: Map<string, MockSession> = new Map();
  private telemetry: MockTelemetry[] = [];
  private timingSnapshots: MockTimingSnapshot[] = [];
  private users: Map<string, MockUser> = new Map();
  private connected = true;

  constructor() {
    // Create a default demo user
    this.users.set('demo-user', {
      id: 'demo-user',
      email: 'demo@okboxbox.com',
      license_tier: 'FREE',
      modules: ['RACEBOX'],
      created_at: new Date(),
    });
    logger.info('Mock database initialized');
  }

  async ping(): Promise<boolean> {
    return this.connected;
  }

  // Sessions
  async createSession(session: Omit<MockSession, 'id'> & { id?: string }): Promise<MockSession> {
    const id = session.id || crypto.randomUUID();
    const newSession = { ...session, id } as MockSession;
    this.sessions.set(id, newSession);
    logger.debug(`Mock DB: Created session ${id}`);
    return newSession;
  }

  async getSession(id: string): Promise<MockSession | null> {
    return this.sessions.get(id) || null;
  }

  async getSessions(userId: string): Promise<MockSession[]> {
    return Array.from(this.sessions.values())
      .filter(s => s.user_id === userId)
      .sort((a, b) => b.started_at.getTime() - a.started_at.getTime());
  }

  async endSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.ended_at = new Date();
    }
  }

  // Telemetry
  async storeTelemetry(data: Omit<MockTelemetry, 'id'>): Promise<void> {
    this.telemetry.push({ ...data, id: crypto.randomUUID() });
    // Keep only last 10000 entries to prevent memory issues
    if (this.telemetry.length > 10000) {
      this.telemetry = this.telemetry.slice(-5000);
    }
  }

  async storeBulkTelemetry(packets: Omit<MockTelemetry, 'id'>[]): Promise<void> {
    for (const packet of packets) {
      await this.storeTelemetry(packet);
    }
  }

  // Timing
  async storeTimingSnapshot(data: Omit<MockTimingSnapshot, 'id'>): Promise<void> {
    this.timingSnapshots.push({ ...data, id: crypto.randomUUID() });
    // Keep only last 1000 snapshots
    if (this.timingSnapshots.length > 1000) {
      this.timingSnapshots = this.timingSnapshots.slice(-500);
    }
  }

  async getLatestTiming(sessionId: string): Promise<MockTimingSnapshot | null> {
    const snapshots = this.timingSnapshots
      .filter(s => s.session_id === sessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
    return snapshots[0] || null;
  }

  // Users
  async getUser(id: string): Promise<MockUser | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<MockUser | null> {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  async createUser(user: Omit<MockUser, 'id' | 'created_at'>): Promise<MockUser> {
    const id = crypto.randomUUID();
    const newUser = { ...user, id, created_at: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }
}

export const mockDb = new MockDatabase();

// Export compatible interface
export async function ping(): Promise<boolean> {
  return mockDb.ping();
}

export const db = mockDb;
