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

const PYTHON_PORT = 9999;
const LOCAL_WS_URL = `http://127.0.0.1:${PYTHON_PORT}`;

export class PythonBridge {
    private pythonProcess: ChildProcess | null = null;
    private localSocket: Socket | null = null;
    private cloudSocket: Socket | null = null;
    private bootstrap: any = null;
    private connected = false;
    private simRunning = false;
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

        // TODO: In production, spawn the bundled Python executable
        // For now, we'll connect to a separately running Python process
        // this.spawnPython();

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
     * Spawn Python process (for production builds)
     */
    private spawnPython(): void {
        // In production, we'd bundle the Python relay as an executable
        // For development, assume Python is running separately
        const pythonPath = process.platform === 'win32'
            ? path.join(__dirname, '../../python-sdk/dist/relay.exe')
            : path.join(__dirname, '../../python-sdk/relay.py');

        console.log(`Spawning Python: ${pythonPath}`);

        this.pythonProcess = spawn(pythonPath, [], {
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
        });

        this.localSocket.on('disconnect', () => {
            console.log('⚠️ Disconnected from Python SDK');
            this.connected = false;
            this.simRunning = false;
        });

        // Forward telemetry events from Python to cloud
        this.localSocket.on('telemetry', (data: any) => {
            if (this.cloudSocket?.connected) {
                this.cloudSocket.emit('telemetry', data);
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

        this.localSocket.on('connect_error', (err) => {
            // Expected if Python isn't running yet
            // Don't spam logs
        });
    }

    /**
     * Connect to cloud server
     */
    private connectToCloud(): void {
        const cloudUrl = 'https://coral-app-x988a.ondigitalocean.app';

        this.cloudSocket = io(cloudUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            transports: ['websocket']
        });

        this.cloudSocket.on('connect', () => {
            console.log('☁️ Connected to cloud server');

            // Register as relay
            this.cloudSocket?.emit('relay:register', {
                sessionId: 'live' // TODO: Get from Python
            });
        });

        this.cloudSocket.on('disconnect', () => {
            console.log('⚠️ Disconnected from cloud server');
        });

        // Receive viewer count updates from server
        this.cloudSocket.on('relay:viewers', (data: { viewerCount: number; requestControls: boolean }) => {
            this.viewerCount = data.viewerCount;

            // Forward to Python so it can adjust streaming rate
            if (this.localSocket?.connected) {
                this.localSocket.emit('relay:viewers', data);
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
}
