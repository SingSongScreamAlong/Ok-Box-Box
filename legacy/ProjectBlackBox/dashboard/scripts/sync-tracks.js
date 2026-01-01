const fs = require('fs');
const path = require('path');
const { syncTrackAssets } = require('@iracing-data/sync-track-assets');

// Ensure the command is being run from the dashboard root (or adjust paths)
const DASHBOARD_ROOT = path.resolve(__dirname, '..');
const PUBLIC_ASSETS_DIR = path.join(DASHBOARD_ROOT, 'public/assets/tracks');

// Ensure output directory exists
if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
    console.log(`Creating directory: ${PUBLIC_ASSETS_DIR}`);
    fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
}

async function runSync() {
    console.log('Starting iRacing Track Assets Sync...');
    console.log(`Output Directory: ${PUBLIC_ASSETS_DIR}`);

    const username = process.env.IRACING_USERNAME;
    const password = process.env.IRACING_PASSWORD;

    if (!username) {
        console.warn('WARNING: IRACING_USERNAME environment variable not set. Sync might fail if authentication is required.');
    }

    try {
        await syncTrackAssets({
            outputDir: PUBLIC_ASSETS_DIR,
            username: username,
            // We want to write full info so we can look up tracks by name easily later
            writeFullInfo: true,
            // We want SVGs
            includeSVGs: true,
            // Optional: force update
            // force: true,
        });

        console.log('Track assets sync completed successfully!');
    } catch (error) {
        console.error('Failed to sync track assets:', error);
        process.exit(1);
    }
}

runSync();
