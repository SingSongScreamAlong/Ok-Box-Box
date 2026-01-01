/**
 * World Snapshot Interface
 * Represents a frozen state of the world at a specific timestamp.
 */
import { CarState } from './kinematics.js';
// import { IntelligenceEvent } from '@controlbox/protocol'; 
export type IntelligenceEvent = any; // Placeholder until protocol export is fixed

// We need a type for the event log in the snapshot if not strictly Protocol.
// For now, let's assume loose typing or re-export from protocol.

export interface WorldSnapshot {
    timestamp: number;
    sessionId: string;
    // Map of Car ID to State (cloned)
    cars: Map<string, CarState>;
    // Events that occurred exactly at this tick
    events: any[];
}

export interface ISnapshotBuffer {
    addSnapshot(snapshot: WorldSnapshot): void;
    getSnapshot(timestamp: number): WorldSnapshot | undefined;
    getRange(start: number, end: number): WorldSnapshot[];
}
