/**
 * Fetch Lovely Track Data (Helper)
 * 
 * NOTE: The Lovely Track Data repository does not have a single 'tracks.json' file.
 * It appears to use a folder structure. 
 * 
 * INSTRUCTIONS:
 * 1. Go to https://github.com/Lovely-Sim-Racing/lovely-track-data/tree/main/data
 * 2. Find the JSON file for your specific simulator and track.
 * 3. Copy the "Raw" content of that JSON file.
 * 4. Paste it into a new file named 'src/data/lovely_tracks.json' in the dashboard directory.
 *    (Or ensure the JSON structure matches what TrackRegistry.ts expects: key-value pairs of trackId -> data)
 * 
 * Alternatively, if you find a consolidated JSON file, you can download it here:
 */

const fs = require('fs');
const readline = require('readline');
const https = require('https');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../src/data/lovely_tracks.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("---------------------------------------------------------");
console.log("Lovely Track Data Importer");
console.log("---------------------------------------------------------");
console.log("I couldn't automatically find a master 'tracks.json' file.");
console.log("Please provide the direct raw URL to the JSON file you want to import.");
console.log("Example: https://raw.githubusercontent.com/Lovely-Sim-Racing/lovely-track-data/main/data/iracing/silverstone.json");
console.log("(Press Enter to skip)");

rl.question('URL: ', (url) => {
    if (!url) {
        console.log("Skipping download.");
        rl.close();
        return;
    }

    console.log(`Downloading from ${url}...`);
    https.get(url, (res) => {
        if (res.statusCode !== 200) {
            console.error(`Failed to download: ${res.statusCode} ${res.statusMessage}`);
            rl.close();
            return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                // Validate JSON
                JSON.parse(data);
                fs.writeFileSync(OUTPUT_FILE, data);
                console.log(`✅ Success! Data saved to ${OUTPUT_FILE}`);
                console.log("Restart your dashboard to see changes.");
            } catch (e) {
                console.error("❌ Error: Valid JSON not received.");
            }
            rl.close();
        });
    }).on('error', (err) => {
        console.error(`Error: ${err.message}`);
        rl.close();
    });
});
