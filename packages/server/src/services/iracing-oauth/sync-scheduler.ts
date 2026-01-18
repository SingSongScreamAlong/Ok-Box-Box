// =====================================================================
// iRacing Profile Sync Scheduler
// Background job that periodically syncs all linked iRacing profiles
// =====================================================================

import { getIRacingProfileSyncService } from './profile-sync-service.js';

// =====================================================================
// Configuration
// =====================================================================

// Default: sync every 6 hours (in milliseconds)
const DEFAULT_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Minimum interval: 1 hour (prevent accidental API abuse)
const MIN_SYNC_INTERVAL_MS = 60 * 60 * 1000;

// =====================================================================
// Scheduler
// =====================================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Start the background sync scheduler
 * Runs syncAllUsers at the configured interval
 */
export function startSyncScheduler(intervalMs?: number): void {
    if (schedulerInterval) {
        console.log('[iRacing Scheduler] Already running');
        return;
    }

    const interval = Math.max(intervalMs ?? DEFAULT_SYNC_INTERVAL_MS, MIN_SYNC_INTERVAL_MS);
    const intervalHours = (interval / (60 * 60 * 1000)).toFixed(1);

    console.log(`[iRacing Scheduler] Starting background sync (every ${intervalHours} hours)`);

    // Run immediately on startup, then at interval
    runSyncJob();

    schedulerInterval = setInterval(() => {
        runSyncJob();
    }, interval);
}

/**
 * Stop the background sync scheduler
 */
export function stopSyncScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[iRacing Scheduler] Stopped');
    }
}

/**
 * Check if the scheduler is running
 */
export function isSchedulerRunning(): boolean {
    return schedulerInterval !== null;
}

/**
 * Check if a sync job is currently in progress
 */
export function isSyncInProgress(): boolean {
    return isRunning;
}

/**
 * Run a sync job manually
 * Returns immediately if a sync is already in progress
 */
export async function runSyncJob(): Promise<{ synced: number; failed: number } | null> {
    if (isRunning) {
        console.log('[iRacing Scheduler] Sync already in progress, skipping');
        return null;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        console.log('[iRacing Scheduler] Starting sync job...');

        const syncService = getIRacingProfileSyncService();
        const result = await syncService.syncAllUsers();

        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[iRacing Scheduler] Sync complete in ${durationSec}s: ${result.synced} synced, ${result.failed} failed`);

        return result;
    } catch (error) {
        console.error('[iRacing Scheduler] Sync job failed:', error);
        return null;
    } finally {
        isRunning = false;
    }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
    running: boolean;
    syncInProgress: boolean;
    intervalHours: number;
} {
    return {
        running: isSchedulerRunning(),
        syncInProgress: isSyncInProgress(),
        intervalHours: DEFAULT_SYNC_INTERVAL_MS / (60 * 60 * 1000)
    };
}
