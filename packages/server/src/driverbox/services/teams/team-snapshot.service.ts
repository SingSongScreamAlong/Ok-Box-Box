/**
 * Team Snapshot Service
 * Handles freezing driver metrics when they leave/are removed from team
 */

import { pool } from '../../../db/client.js';
import { captureDriverSnapshotForEvent } from '../../../contracts/idp.contract.js';

export interface DriverSnapshot {
    id: string;
    team_event_id: string;
    driver_profile_id: string;
    snapshot_json: Record<string, unknown>;
    created_at: Date;
}

export async function preserveDriverSnapshots(teamId: string, driverProfileId: string): Promise<number> {
    const eventsResult = await pool.query(
        `SELECT DISTINCT te.id as team_event_id, te.session_id FROM team_events te LEFT JOIN team_event_participants tep ON te.id = tep.team_event_id WHERE te.team_id = $1 AND (tep.driver_profile_id = $2 OR $2 = ANY(te.participating_driver_ids))`,
        [teamId, driverProfileId]
    );

    let snapshotsCreated = 0;

    for (const event of eventsResult.rows) {
        const existingResult = await pool.query(
            `SELECT id FROM team_event_driver_snapshots WHERE team_event_id = $1 AND driver_profile_id = $2`,
            [event.team_event_id, driverProfileId]
        );

        if (existingResult.rows.length > 0) continue;

        const snapshotData = await captureDriverSnapshotForEvent(driverProfileId, event.session_id);

        await pool.query(
            `INSERT INTO team_event_driver_snapshots (team_event_id, driver_profile_id, snapshot_json) VALUES ($1, $2, $3)`,
            [event.team_event_id, driverProfileId, JSON.stringify(snapshotData)]
        );

        snapshotsCreated++;
    }

    console.log(`[Snapshot] Preserved ${snapshotsCreated} snapshots for driver ${driverProfileId} in team ${teamId}`);
    return snapshotsCreated;
}

export async function getDriverEventSnapshot(teamEventId: string, driverProfileId: string): Promise<DriverSnapshot | null> {
    const result = await pool.query<DriverSnapshot>(`SELECT * FROM team_event_driver_snapshots WHERE team_event_id = $1 AND driver_profile_id = $2`, [teamEventId, driverProfileId]);
    return result.rows[0] || null;
}

export async function getEventSnapshots(teamEventId: string): Promise<DriverSnapshot[]> {
    const result = await pool.query<DriverSnapshot>(`SELECT * FROM team_event_driver_snapshots WHERE team_event_id = $1`, [teamEventId]);
    return result.rows;
}
