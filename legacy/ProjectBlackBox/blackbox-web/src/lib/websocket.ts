/**
 * WebSocket client for BlackBox Cloud
 */

import { io, Socket } from 'socket.io-client';

export interface TelemetryData {
    lap: number;
    speed: number;
    gear: number;
    rpm: number;
    throttle: number;
    brake: number;
    position: { s: number };
    timestamp: number;
}

export interface RadioCall {
    id: string;
    role: string;
    text: string;
    timestamp: number;
}

type Callback<T> = (data: T) => void;

class BlackBoxClient {
    private socket: Socket | null = null;
    private sessionId: string = '';
    private telemetryCallbacks: Callback<TelemetryData>[] = [];
    private radioCallbacks: Callback<RadioCall>[] = [];
    private connectionCallbacks: Callback<boolean>[] = [];

    connect(url: string, sessionId: string) {
        this.sessionId = sessionId;

        this.socket = io(url, {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Connected to BlackBox Cloud');
            this.socket?.emit('join_session', { sessionId, role: 'viewer' });
            this.connectionCallbacks.forEach(cb => cb(true));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from BlackBox Cloud');
            this.connectionCallbacks.forEach(cb => cb(false));
        });

        this.socket.on('telemetry', (data: TelemetryData) => {
            this.telemetryCallbacks.forEach(cb => cb(data));
        });

        this.socket.on('radio_call', (data: RadioCall) => {
            this.radioCallbacks.forEach(cb => cb(data));
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    onTelemetry(callback: Callback<TelemetryData>) {
        this.telemetryCallbacks.push(callback);
    }

    onRadioCall(callback: Callback<RadioCall>) {
        this.radioCallbacks.push(callback);
    }

    onConnection(callback: Callback<boolean>) {
        this.connectionCallbacks.push(callback);
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

export const blackboxClient = new BlackBoxClient();
