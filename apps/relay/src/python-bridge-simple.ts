/**
 * Simplified Python Bridge
 * 
 * Autonomous, self-healing telemetry relay:
 * - Spawns embedded Python with pyirsdk
 * - Auto-detects iRacing
 * - Auto-connects to cloud server
 * - Auto-reconnects on failure
 * - Emits status events for UI updates
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { io, Socket } from 'socket.io-client';

const PYTHON_PORT = 9999;
const LOCAL_WS_URL = `http://127.0.0.1:${PYTHON_PORT}`;
const RECONNECT_DELAY = 5000;
const PYTHON_RESTART_DELAY = 3000;

export interface RelayStatus {
    iRacingDetected: boolean;
    serverConnected: boolean;
    sending: boolean;
    lastDataTime: number | null;
    error: string | null;
}

export class PythonBridge extends EventEmitter {
    private pythonProcess: ChildProcess | null = null;
    private localSocket: Socket | null = null;
    private cloudSocket: Socket | null = null;
    private cloudUrl: string;
    private running = false;
    private status: RelayStatus = {
        iRacingDetected: false,
        serverConnected: false,
        sending: false,
        lastDataTime: null,
        error: null
    };

    constructor(cloudUrl: string) {
        super();
        this.cloudUrl = cloudUrl;
    }

    /**
     * Start the autonomous relay
     */
    async start(): Promise<void> {
        if (this.running) return;
        this.running = true;

        console.log('🚀 Starting autonomous Python bridge...');

        // Start Python process
        this.spawnPython();

        // Wait for Python to start
        await this.delay(2000);

        // Connect to local Python socket
        this.connectToLocal();

        // Connect to cloud server
        this.connectToCloud();
    }

    /**
     * Stop the relay
     */
    stop(): void {
        this.running = false;

        if (this.localSocket) {
            this.localSocket.disconnect();
            this.localSocket = null;
        }

        if (this.cloudSocket) {
            this.cloudSocket.disconnect();
            this.cloudSocket = null;
        }

        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }

        this.updateStatus({ serverConnected: false, iRacingDetected: false, sending: false });
    }

    /**
     * Spawn Python process with auto-restart
     */
    private spawnPython(): void {
        const fs = require('fs');
        const { app } = require('electron');

        // Get paths for packaged apps
        const exePath = app.getPath('exe');
        const exeDir = path.dirname(exePath);
        const resourcesPath = process.resourcesPath || path.join(exeDir, 'resources');
        const appAsarPath = app.getAppPath();
        const appAsarDir = path.dirname(appAsarPath);

        console.log('🔍 Python bridge paths:');
        console.log('   resourcesPath:', resourcesPath);
        console.log('   appAsarDir:', appAsarDir);

        // Find Python script
        const scriptPaths = [
            path.join(appAsarDir, 'python/iracing_relay.py'),
            path.join(resourcesPath, 'python/iracing_relay.py'),
            path.join(exeDir, 'resources/python/iracing_relay.py'),
            path.join(__dirname, '../python/iracing_relay.py'),
            path.join(__dirname, '../../python/iracing_relay.py'),
        ];

        let pythonScript = '';
        for (const p of scriptPaths) {
            try {
                if (fs.existsSync(p)) {
                    pythonScript = p;
                    console.log(`   ✅ Found script: ${p}`);
                    break;
                }
            } catch {}
        }

        if (!pythonScript) {
            console.error('❌ Could not find Python relay script');
            this.updateStatus({ error: 'Python script not found' });
            this.scheduleRestart();
            return;
        }

        // Find Python executable
        const pythonPaths = [
            path.join(appAsarDir, 'python-embed/python.exe'),
            path.join(resourcesPath, 'python-embed/python.exe'),
            path.join(exeDir, 'resources/python-embed/python.exe'),
            path.join(__dirname, '../../python-embed/python.exe'),
        ];

        let pythonExe = 'python';
        for (const p of pythonPaths) {
            try {
                if (fs.existsSync(p)) {
                    pythonExe = p;
                    console.log(`   ✅ Found Python: ${p}`);
                    break;
                }
            } catch {}
        }

        console.log(`🐍 Spawning: ${pythonExe} ${pythonScript}`);

        try {
            this.pythonProcess = spawn(pythonExe, [pythonScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, RELAY_PORT: String(PYTHON_PORT) }
            });

            this.pythonProcess.stdout?.on('data', (data) => {
                console.log(`[Python] ${data.toString().trim()}`);
            });

            this.pythonProcess.stderr?.on('data', (data) => {
                console.error(`[Python Error] ${data.toString().trim()}`);
            });

            this.pythonProcess.on('exit', (code) => {
                console.log(`Python exited with code ${code}`);
                this.updateStatus({ iRacingDetected: false, sending: false });
                if (this.running) {
                    this.scheduleRestart();
                }
            });

            this.pythonProcess.on('error', (err) => {
                console.error('Python spawn error:', err);
                this.updateStatus({ error: 'Python failed to start' });
                if (this.running) {
                    this.scheduleRestart();
                }
            });

            this.updateStatus({ error: null });
        } catch (err) {
            console.error('Failed to spawn Python:', err);
            this.updateStatus({ error: 'Failed to start Python' });
            this.scheduleRestart();
        }
    }

    /**
     * Connect to local Python socket with auto-reconnect
     */
    private connectToLocal(): void {
        console.log('🔌 Connecting to local Python socket...');

        this.localSocket = io(LOCAL_WS_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
            timeout: 5000
        });

        this.localSocket.on('connect', () => {
            console.log('✅ Connected to Python relay');
        });

        this.localSocket.on('disconnect', () => {
            console.log('⚠️ Disconnected from Python relay');
            this.updateStatus({ iRacingDetected: false, sending: false });
        });

        // iRacing connection status
        this.localSocket.on('iracing_status', (data: { connected: boolean }) => {
            console.log('iRacing status:', data.connected ? 'connected' : 'disconnected');
            this.updateStatus({ iRacingDetected: data.connected });
        });

        // Telemetry data - forward to cloud
        this.localSocket.on('telemetry', (data: any) => {
            this.updateStatus({ iRacingDetected: true, sending: true, lastDataTime: Date.now() });
            
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('telemetry', data);
            }

            // Reset sending indicator after brief delay
            setTimeout(() => {
                if (Date.now() - (this.status.lastDataTime || 0) > 500) {
                    this.updateStatus({ sending: false });
                }
            }, 200);
        });

        // Session metadata (Python sends as session_metadata)
        this.localSocket.on('session_metadata', (data: any) => {
            console.log('Session metadata received:', data?.trackName);
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('session_metadata', data);
            }
        });

        // Session info (alternative event name)
        this.localSocket.on('session_info', (data: any) => {
            console.log('Session info received');
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('session_info', data);
            }
        });
    }

    /**
     * Connect to cloud server with auto-reconnect
     */
    private connectToCloud(): void {
        console.log(`☁️ Connecting to cloud: ${this.cloudUrl}`);

        this.cloudSocket = io(this.cloudUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: Infinity,
            timeout: 10000,
            transports: ['websocket', 'polling']
        });

        this.cloudSocket.on('connect', () => {
            console.log('✅ Connected to cloud server');
            this.updateStatus({ serverConnected: true, error: null });

            // Identify as relay
            this.cloudSocket?.emit('relay:connect', {
                userId: 'demo-user',
                displayName: 'Demo Driver',
                version: '1.0.0-alpha'
            });
        });

        this.cloudSocket.on('disconnect', (reason) => {
            console.log('⚠️ Disconnected from cloud:', reason);
            this.updateStatus({ serverConnected: false });
        });

        this.cloudSocket.on('connect_error', (err) => {
            console.error('Cloud connection error:', err.message);
            this.updateStatus({ serverConnected: false, error: 'Server unreachable' });
        });

        // Handle server acknowledgments
        this.cloudSocket.on('relay:ack', (data: any) => {
            console.log('Server acknowledged:', data);
        });
    }

    /**
     * Schedule Python restart
     */
    private scheduleRestart(): void {
        if (!this.running) return;

        console.log(`🔄 Restarting Python in ${PYTHON_RESTART_DELAY}ms...`);
        setTimeout(() => {
            if (this.running) {
                this.spawnPython();
            }
        }, PYTHON_RESTART_DELAY);
    }

    /**
     * Update status and emit event
     */
    private updateStatus(update: Partial<RelayStatus>): void {
        this.status = { ...this.status, ...update };
        this.emit('status', this.status);
    }

    /**
     * Helper delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
