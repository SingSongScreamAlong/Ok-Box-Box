const net = require('node:net');
const { spawn } = require('node:child_process');

const DEV_PORT = Number(process.env.OKBOXBOX_DESKTOP_DEV_PORT || 5177);
const DEV_HOSTS = ['127.0.0.1', '::1'];

function run(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? 1}`));
    });

    child.on('error', reject);
  });
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function isPortOpen(port) {
  for (const host of DEV_HOSTS) {
    if (await canConnect(port, host)) {
      return true;
    }
  }

  return false;
}

async function main() {
  if (await isPortOpen(DEV_PORT)) {
    throw new Error(`Desktop dev port ${DEV_PORT} is already in use. Stop the stale renderer process and retry.`);
  }

  await run('npm run compile');

  const devCommand = `concurrently --kill-others-on-fail \"vite --strictPort --port ${DEV_PORT}\" \"wait-on http://localhost:${DEV_PORT} && electron .\"`;
  const child = spawn(devCommand, {
    cwd: __dirname,
    env: process.env,
    stdio: 'inherit',
    shell: true,
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
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
