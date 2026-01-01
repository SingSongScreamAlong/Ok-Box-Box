/**
 * PythonRelayService - Spawns and manages the Python relay agent
 * This provides iRacing telemetry through the proven Python implementation
 */
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class PythonRelayService extends EventEmitter {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;
    private serverUrl: string = '';
    private pythonPath: string = 'python';
    private relayAgentPath: string = '';

    constructor() {
        super();
        // Find relay agent path relative to app
        const possiblePaths = [
            path.join(app.getAppPath(), 'relay_agent', 'main.py'),
            path.join(app.getAppPath(), '..', 'relay_agent', 'main.py'),
            path.join(path.dirname(app.getAppPath()), 'relay_agent', 'main.py'),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                this.relayAgentPath = p;
                break;
            }
        }

        console.log(`PythonRelayService initialized, relay agent path: ${this.relayAgentPath}`);
    }

    /**
     * Initialize the service with server URL
     */
    public initialize(serverUrl: string): void {
        this.serverUrl = serverUrl;
        console.log(`PythonRelayService configured for server: ${serverUrl}`);
    }

    /**
     * Start the Python relay agent
     */
    public start(): boolean {
        if (this.isRunning) {
            console.log('Python relay agent already running');
            return true;
        }

        if (!this.relayAgentPath || !fs.existsSync(this.relayAgentPath)) {
            console.error(`Relay agent not found at: ${this.relayAgentPath}`);
            this.emit('error', new Error('Relay agent script not found'));
            return false;
        }

        try {
            console.log(`Starting Python relay agent: ${this.relayAgentPath}`);

            // Set environment variables for the relay agent
            const env = {
                ...process.env,
                BLACKBOX_SERVER_URL: this.serverUrl,
                POLL_RATE_HZ: '30',  // 30Hz for good telemetry resolution
                LOG_LEVEL: 'INFO',
                PYTHONIOENCODING: 'utf-8',  // Fix Windows console encoding issues
                PYTHONUTF8: '1'  // Force UTF-8 mode in Python 3.7+
            };

            // Spawn the Python process
            this.process = spawn(this.pythonPath, [this.relayAgentPath], {
                cwd: path.dirname(this.relayAgentPath),
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Handle stdout
            this.process.stdout?.on('data', (data: Buffer) => {
                const output = data.toString().trim();
                if (output) {
                    console.log(`[Relay] ${output}`);
                    this.parseRelayOutput(output);
                }
            });

            // Handle stderr
            this.process.stderr?.on('data', (data: Buffer) => {
                const output = data.toString().trim();
                if (output) {
                    console.error(`[Relay ERR] ${output}`);
                }
            });

            // Handle process exit
            this.process.on('exit', (code: number | null) => {
                console.log(`Python relay agent exited with code: ${code}`);
                this.isRunning = false;
                this.process = null;
                this.emit('stopped', code);
            });

            // Handle process error
            this.process.on('error', (err: Error) => {
                console.error('Failed to start Python relay agent:', err);
                this.isRunning = false;
                this.emit('error', err);
            });

            this.isRunning = true;
            this.emit('started');
            console.log('Python relay agent started successfully');
            return true;
        } catch (err) {
            console.error('Error starting Python relay agent:', err);
            this.emit('error', err);
            return false;
        }
    }

    /**
     * Stop the Python relay agent
     */
    public stop(): void {
        if (!this.process || !this.isRunning) {
            console.log('Python relay agent not running');
            return;
        }

        try {
            console.log('Stopping Python relay agent...');

            // Send SIGTERM to gracefully stop
            this.process.kill('SIGTERM');

            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.process) {
                    console.log('Force killing Python relay agent');
                    this.process.kill('SIGKILL');
                }
            }, 5000);

        } catch (err) {
            console.error('Error stopping Python relay agent:', err);
        }
    }

    /**
     * Parse relay agent output for status updates
     */
    private parseRelayOutput(output: string): void {
        // Look for status indicators in the output
        if (output.includes('Connected to PitBox Server')) {
            this.emit('server_connected');
        } else if (output.includes('Connected to iRacing')) {
            this.emit('sim_connected');
        } else if (output.includes('Session detected')) {
            this.emit('session_started');
        } else if (output.includes('Sending telemetry')) {
            this.emit('telemetry_active');
        }
    }

    /**
     * Check if the service is running
     */
    public isActive(): boolean {
        return this.isRunning;
    }

    /**
     * Get the current status
     */
    public getStatus(): { isRunning: boolean } {
        return { isRunning: this.isRunning };
    }
}
