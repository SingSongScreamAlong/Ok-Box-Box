const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function loadRelaySecret() {
  if (process.env.RELAY_SECRET) {
    return process.env.RELAY_SECRET;
  }

  try {
    const relaySettingsPath = path.join(process.env.APPDATA || '', '@okboxbox', 'relay', 'relay-settings.json');
    const relaySettingsRaw = fs.readFileSync(relaySettingsPath, 'utf8');
    const relaySettings = JSON.parse(relaySettingsRaw);
    return typeof relaySettings.relayId === 'string' ? relaySettings.relayId : '';
  } catch {
    return '';
  }
}

const env = {
  ...process.env,
  OKBOXBOX_SERVER_URL: process.env.OKBOXBOX_SERVER_URL || 'https://app.okboxbox.com',
  OKBOXBOX_DISABLE_PTT: process.env.OKBOXBOX_DISABLE_PTT || '1',
  RELAY_SECRET: loadRelaySecret(),
};

const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm run electron:dev']
  : ['run', 'electron:dev'];

const child = spawn(command, args, {
  cwd: __dirname,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
