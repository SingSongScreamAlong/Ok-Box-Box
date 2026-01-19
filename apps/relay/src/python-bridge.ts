/**
 * Python Bridge
 * 
 * Bridges the Electron shell to the Python iRacing SDK process.
 * Uses local WebSocket for IPC between Electron and Python.
 * 
 * Flow:
 * 1. Electron spawns Python relay subprocess
 * 2. Python opens local WebSocket server on 127.0.0.1:9999
 * 3. Electron connects to receive telemetry events
 * 4. Electron forwards to cloud server via Socket.IO
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { io, Socket } from 'socket.io-client';
import { updateHUDStatus, updateHUDTelemetry } from './hud-window';

const PYTHON_PORT = 9999;
const LOCAL_WS_URL = `http://127.0.0.1:${PYTHON_PORT}`;

export class PythonBridge {
    private pythonProcess: ChildProcess | null = null;
    private localSocket: Socket | null = null;
    private cloudSocket: Socket | null = null;
    private bootstrap: any = null;
    private connected = false;
    private cloudConnected = false;
    private simRunning = false;
    private sending = false;
    private viewerCount = 0;

    /**
     * Set bootstrap data for capability checks
     */
    setBootstrap(bootstrap: any): void {
        this.bootstrap = bootstrap;
    }

    /**
     * Start the Python SDK process
     */
    async start(): Promise<void> {
        console.log('🐍 Starting Python SDK bridge...');

        // Spawn the Python iRacing relay
        this.spawnPython();

        // Wait a moment for Python to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Connect to local Python WebSocket
        this.connectToLocal();

        // Connect to cloud server
        this.connectToCloud();
    }

    /**
     * Stop the bridge
     */
    stop(): void {
        console.log('🛑 Stopping Python bridge...');

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

        this.connected = false;
        this.simRunning = false;
    }

    /**
     * Spawn Python process
     */
    private spawnPython(): void {
        const fs = require('fs');
        const { app } = require('electron');
        
        // Get paths for packaged apps - portable exe extracts to temp folder
        const exePath = app.getPath('exe');
        const exeDir = path.dirname(exePath);
        const resourcesPath = process.resourcesPath || path.join(exeDir, 'resources');
        const appAsarPath = app.getAppPath();  // Points to app.asar or app folder
        const appAsarDir = path.dirname(appAsarPath);  // Parent of app.asar = resources folder
        
        console.log('🔍 Python bridge paths:');
        console.log('   exePath:', exePath);
        console.log('   exeDir:', exeDir);
        console.log('   resourcesPath:', resourcesPath);
        console.log('   appAsarPath:', appAsarPath);
        console.log('   appAsarDir:', appAsarDir);
        console.log('   app.isPackaged:', app.isPackaged);
        
        // Find the Python script - check multiple locations
        const scriptPaths = [
            path.join(appAsarDir, 'python/iracing_relay.py'),  // Next to app.asar in resources
            path.join(resourcesPath, 'python/iracing_relay.py'),  // Packaged: resources folder
            path.join(exeDir, 'resources/python/iracing_relay.py'),  // Portable exe
            path.join(__dirname, '../python/iracing_relay.py'),  // Dev: relative to dist
            path.join(__dirname, '../../python/iracing_relay.py'),  // Alt dev path
        ];

        let pythonScript = '';
        for (const p of scriptPaths) {
            console.log(`   Checking script: ${p}`);
            try {
                if (fs.existsSync(p)) {
                    pythonScript = p;
                    console.log(`   ✅ Found script at: ${p}`);
                    break;
                }
            } catch (e) {
                console.log(`   ❌ Error checking: ${e}`);
            }
        }

        if (!pythonScript) {
            console.error('❌ Could not find Python relay script');
            console.log('Searched paths:', scriptPaths);
            return;
        }

        // Find Python executable - prefer embedded, fall back to system
        const embeddedPythonPaths = [
            path.join(appAsarDir, 'python-embed/python.exe'),  // Next to app.asar in resources
            path.join(resourcesPath, 'python-embed/python.exe'),  // Packaged: resources folder
            path.join(exeDir, 'resources/python-embed/python.exe'),  // Portable exe
            path.join(__dirname, '../../python-embed/python.exe'),  // Dev
            path.join(__dirname, '../python-embed/python.exe'),
        ];

        let pythonExe = 'python';  // Default to system Python
        for (const p of embeddedPythonPaths) {
            console.log(`   Checking python: ${p}`);
            try {
                if (fs.existsSync(p)) {
                    pythonExe = p;
                    console.log(`   ✅ Found Python at: ${p}`);
                    break;
                }
            } catch (e) {
                console.log(`   ❌ Error checking: ${e}`);
            }
        }

        if (pythonExe === 'python') {
            console.log('⚠️ Embedded Python not found, trying system Python');
        }

        console.log(`🐍 Spawning: ${pythonExe} ${pythonScript}`);

        this.pythonProcess = spawn(pythonExe, [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                RELAY_PORT: String(PYTHON_PORT)
            }
        });

        this.pythonProcess.stdout?.on('data', (data) => {
            console.log(`[Python] ${data.toString().trim()}`);
        });

        this.pythonProcess.stderr?.on('data', (data) => {
            console.error(`[Python Error] ${data.toString().trim()}`);
        });

        this.pythonProcess.on('exit', (code) => {
            console.log(`Python process exited with code ${code}`);
            this.simRunning = false;
        });
    }

    /**
     * Connect to local Python WebSocket
     */
    private connectToLocal(): void {
        // Note: The existing Python relay uses Socket.IO, so we use that here
        // If you switch to raw WebSocket, update accordingly
        this.localSocket = io(LOCAL_WS_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            timeout: 5000
        });

        this.localSocket.on('connect', () => {
            console.log('📡 Connected to Python SDK');
            this.connected = true;
            this.updateStatus();
        });

        this.localSocket.on('disconnect', () => {
            console.log('⚠️ Disconnected from Python SDK');
            this.connected = false;
            this.simRunning = false;
            this.sending = false;
            this.updateStatus();
        });

        // Forward telemetry events from Python to cloud AND to HUD
        this.localSocket.on('telemetry', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('telemetry', data);
                this.sending = true;
                this.updateStatus();
            }
            
            // Also send to local HUD display
            if (data.cars && data.cars[0]) {
                const car = data.cars[0];
                updateHUDTelemetry({
                    speed: car.speed || 0,
                    gear: car.gear || 0,
                    rpm: car.rpm || 0,
                    lap: car.lap || 0,
                    position: car.position || 0,
                    fuelPct: car.fuelPct || 0,
                    fuelLaps: car.fuelLaps
                });
            }
        });

        // v2: Baseline stream
        this.localSocket.on('telemetry:baseline', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('telemetry:baseline', data);
            }
        });

        // v2: Controls stream
        this.localSocket.on('telemetry:controls', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('telemetry:controls', data);
            }
        });

        // Forward events
        this.localSocket.on('event', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('event', data);
            }
        });

        // Session metadata
        this.localSocket.on('session_metadata', (data: any) => {
            this.simRunning = true;
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('session_metadata', data);
            }
        });

        // Incident
        this.localSocket.on('incident', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('incident', data);
            }
        });

        // Strategy update (1Hz - fuel, tires, damage for pit wall)
        this.localSocket.on('strategy_update', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('strategy_update', data);
            }
        });

        this.localSocket.on('connect_error', (err) => {
            // Expected if Python isn't running yet
            // Don't spam logs
        });
    }

    /**
     * Connect to cloud server
     */
    private connectToCloud(): void {
        const cloudUrl = 'https://octopus-app-qsi3i.ondigitalocean.app';

        this.cloudSocket = io(cloudUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            transports: ['websocket']
        });

        this.cloudSocket.on('connect', () => {
            console.log('☁️ Connected to cloud server');
            this.cloudConnected = true;
            this.updateStatus();

            // Register as relay
            this.cloudSocket?.emit('relay:register', {
                sessionId: 'live' // TODO: Get from Python
            });

            // Start metrics reporting
            this.startMetricsReporting();

            // Wire up voice engineer to use ElevenLabs via cloud
            import('./voice-engineer.js').then(({ setCloudSocket }) => {
                setCloudSocket(this.cloudSocket);
            }).catch(() => {});
        });

        this.cloudSocket.on('disconnect', () => {
            console.log('⚠️ Disconnected from cloud server');
            this.cloudConnected = false;
            this.updateStatus();
        });

        // Receive viewer count updates from server
        this.cloudSocket.on('relay:viewers', (data: { viewerCount: number; requestControls: boolean }) => {
            this.viewerCount = data.viewerCount;

            // Forward to Python so it can adjust streaming rate
            if (this.localSocket?.connected) {
                this.localSocket.emit('relay:viewers', data);
            }
        });

        // Receive situational awareness updates from server (race engineer intel)
        this.cloudSocket.on('engineer:update', (data: { sessionId: string; updates: any[] }) => {
            if (data.updates && data.updates.length > 0) {
                // Import dynamically to avoid circular deps
                import('./hud-window.js').then(({ showCoachingMessage }) => {
                    for (const update of data.updates) {
                        // Map priority to type for HUD display
                        const type = update.priority === 'critical' ? 'warning' 
                            : update.priority === 'high' ? 'warning'
                            : 'info';
                        
                        showCoachingMessage(update.spokenMessage || update.message, type);
                        
                        // Also speak it via voice engineer
                        import('./voice-engineer.js').then(({ speak, callout }) => {
                            if (update.type === 'caution') {
                                callout('caution', update.spokenMessage || update.message);
                            } else if (update.type === 'opportunity') {
                                callout('clear', update.spokenMessage || update.message);
                            } else {
                                speak(update.spokenMessage || update.message, 
                                    update.priority === 'critical' ? 'high' : 'normal');
                            }
                        }).catch(() => {});
                    }
                }).catch(() => {});
            }
        });
    }

    /**
     * Check if connected to Python SDK
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Check if simulator is running
     */
    isSimRunning(): boolean {
        return this.simRunning;
    }

    /**
     * Get current viewer count
     */
    getViewerCount(): number {
        return this.viewerCount;
    }

    /**
     * Update HUD with current status
     */
    private updateStatus(): void {
        updateHUDStatus({
            cloudConnected: this.cloudConnected,
            simConnected: this.connected,
            sending: this.sending
        });
    }

    /**
     * Start periodic performance metrics reporting
     */
    private startMetricsReporting(): void {
        // Report every 30 seconds
        setInterval(() => {
            if (!this.cloudSocket?.connected) return;

            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();

            this.cloudSocket.emit('relay:metrics', {
                timestamp: Date.now(),
                memory: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                    rss: Math.round(memUsage.rss / 1024 / 1024) // Total memory footprint
                },
                cpu: {
                    user: cpuUsage.user, // microseconds
                    system: cpuUsage.system
                },
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                uptime: Math.round(process.uptime()) // seconds
            });
        }, 30000);
    }
}
