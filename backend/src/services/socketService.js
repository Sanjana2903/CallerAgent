/**
 * Socket.io Service
 * 
 * Manages real-time connections to the mobile app.
 * Rooms are organized by userId so each user only receives their own call events.
 * 
 * Events emitted to mobile:
 * - call_started: New call coming in
 * - transcript_delta: Partial transcript chunk (streaming)
 * - transcript_entry: Complete transcript entry
 * - intent_detected: Call intent classified
 * - call_urgent: Urgent/emergency detected
 * - call_ended: Call ended (includes full transcript)
 * - call_status_update: Call status changed
 */

let io = null;
const connectedUsers = new Map(); // userId -> Set of socket IDs

function initialize(socketIoInstance) {
    io = socketIoInstance;

    io.on('connection', (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        // Authenticate and join user room
        socket.on('authenticate', (data) => {
            const { userId, token } = data;
            if (!userId) {
                socket.emit('auth_error', { message: 'userId required' });
                return;
            }

            // Join user-specific room
            socket.join(`user:${userId}`);
            socket.userId = userId;

            // Track connected sockets
            if (!connectedUsers.has(userId)) {
                connectedUsers.set(userId, new Set());
            }
            connectedUsers.get(userId).add(socket.id);

            socket.emit('authenticated', { userId, socketId: socket.id });
            console.log(`[Socket.io] User ${userId} authenticated (socket: ${socket.id})`);
        });

        // Mobile app subscribes to a specific call
        socket.on('subscribe_call', (data) => {
            const { callId } = data;
            if (callId) {
                socket.join(`call:${callId}`);
                console.log(`[Socket.io] Socket ${socket.id} subscribed to call ${callId}`);
            }
        });

        // Unsubscribe from call
        socket.on('unsubscribe_call', (data) => {
            const { callId } = data;
            if (callId) {
                socket.leave(`call:${callId}`);
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId && connectedUsers.has(socket.userId)) {
                connectedUsers.get(socket.userId).delete(socket.id);
                if (connectedUsers.get(socket.userId).size === 0) {
                    connectedUsers.delete(socket.userId);
                }
            }
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[Socket.io] Service initialized');
}

/**
 * Emit an event to all sockets connected for a specific user
 */
function emitToUser(userId, event, data) {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all sockets subscribed to a specific call
 */
function emitToCall(callId, event, data) {
    if (!io) return;
    io.to(`call:${callId}`).emit(event, data);
}

/**
 * Broadcast to all connected clients (admin/debug only)
 */
function broadcast(event, data) {
    if (!io) return;
    io.emit(event, data);
}

/**
 * Check if a user has any connected sockets
 */
function isUserConnected(userId) {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
}

/**
 * Get count of connected users
 */
function getConnectedUsersCount() {
    return connectedUsers.size;
}

module.exports = {
    initialize,
    emitToUser,
    emitToCall,
    broadcast,
    isUserConnected,
    getConnectedUsersCount
};
