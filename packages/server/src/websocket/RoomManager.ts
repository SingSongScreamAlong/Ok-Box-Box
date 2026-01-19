import { Socket } from 'socket.io';
import type { JoinRoomMessage, LeaveRoomMessage } from '@controlbox/common';
import { activeSessions } from './SessionHandler.js';

export class RoomManager {
    public setup(socket: Socket) {

        // Send any active sessions to the new client immediately
        for (const session of activeSessions.values()) {
            if (Date.now() - session.lastUpdate < 30000) {
                socket.emit('session:active', {
                    sessionId: session.sessionId,
                    trackName: session.trackName,
                    sessionType: session.sessionType
                });
            }
        }

        socket.on('room:join', (data: JoinRoomMessage) => {
            const roomName = `session:${data.sessionId}`;
            socket.join(roomName);

            const session = activeSessions.get(data.sessionId);
            if (session) {
                socket.emit('session:state', {
                    sessionId: data.sessionId,
                    trackName: session.trackName,
                    sessionType: session.sessionType,
                    status: 'active'
                });
                // Send current delay state
                socket.emit('broadcast:delay', { delayMs: session.broadcastDelayMs });
            }
            socket.emit('room:joined', { sessionId: data.sessionId });
        });

        socket.on('room:leave', (data: LeaveRoomMessage) => {
            const roomName = `session:${data.sessionId}`;
            socket.leave(roomName);
        });
    }
}
