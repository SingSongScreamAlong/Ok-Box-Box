/**
 * BlackBox Driver App Configuration Update Script
 * 
 * This script updates the Driver App configuration to connect to the DigitalOcean deployment.
 * It enables cloud mode and sets the correct server URL.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the user data directory where the config is stored
const userDataDir = path.join(os.homedir(), 'Library/Application Support/blackbox-driver');
const configPath = path.join(userDataDir, 'config.json');

// DigitalOcean Droplet IP address
const DROPLET_IP = '137.184.151.3';

console.log('BlackBox Driver App Configuration Update');
console.log('--------------------------------------');
console.log(`Looking for config file at: ${configPath}`);

// Check if the config file exists
if (!fs.existsSync(configPath)) {
  console.error(`Error: Configuration file not found at ${configPath}`);
  console.log('Please run the Driver App at least once to generate the initial configuration.');
  process.exit(1);
}

// Read the current configuration
let config;
try {
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
  console.log('Current configuration loaded successfully.');
} catch (err) {
  console.error(`Error reading configuration: ${err.message}`);
  process.exit(1);
}

// Backup the current configuration
const backupPath = `${configPath}.backup-${Date.now()}`;
try {
  fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));
  console.log(`Backup created at: ${backupPath}`);
} catch (err) {
  console.error(`Error creating backup: ${err.message}`);
  process.exit(1);
}

// Update the configuration
const originalCloudEnabled = config.cloudEnabled;
const originalCloudServerUrl = config.cloudServerUrl;

// Update cloud settings
config.cloudEnabled = true;
config.cloudServerUrl = `http://${DROPLET_IP}`;
config.fallbackToLocal = true;

// Save the updated configuration
try {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Configuration updated successfully:');
  console.log(`- Cloud mode: ${originalCloudEnabled} → ${config.cloudEnabled}`);
  console.log(`- Cloud server URL: ${originalCloudServerUrl} → ${config.cloudServerUrl}`);
  console.log(`- Fallback to local: ${config.fallbackToLocal}`);
} catch (err) {
  console.error(`Error saving configuration: ${err.message}`);
  process.exit(1);
}

console.log('\nDriver App is now configured to connect to the DigitalOcean Droplet.');
console.log('Restart the Driver App to apply these changes.');
