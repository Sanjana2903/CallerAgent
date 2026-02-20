import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket: Socket | null = null;

export const socketService = {
    connect: (userId: string) => {
        if (socket?.connected) return socket;

        socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket?.id);
            // Authenticate with userId
            socket?.emit('authenticate', { userId });
        });

        socket.on('authenticated', (data) => {
            console.log('[Socket] Authenticated as user:', data.userId);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });

        return socket;
    },

    disconnect: () => {
        socket?.disconnect();
        socket = null;
    },

    subscribeToCall: (callId: string) => {
        socket?.emit('subscribe_call', { callId });
    },

    unsubscribeFromCall: (callId: string) => {
        socket?.emit('unsubscribe_call', { callId });
    },

    on: (event: string, handler: (...args: any[]) => void) => {
        socket?.on(event, handler);
    },

    off: (event: string, handler?: (...args: any[]) => void) => {
        if (handler) {
            socket?.off(event, handler);
        } else {
            socket?.removeAllListeners(event);
        }
    },

    isConnected: () => socket?.connected || false,

    getSocket: () => socket,
};

export default socketService;
