/**
 * Push Notification Service
 * 
 * Sends push notifications to the mobile app via Firebase Cloud Messaging (FCM).
 * Falls back gracefully if Firebase is not configured.
 */

let admin = null;

function initialize() {
    try {
        const firebaseAdmin = require('firebase-admin');

        // Only initialize if credentials are provided
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
            console.warn('[Notifications] Firebase not configured - push notifications disabled');
            return;
        }

        if (!firebaseAdmin.apps.length) {
            admin = firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    clientId: process.env.FIREBASE_CLIENT_ID
                })
            });
            console.log('[Notifications] Firebase Admin initialized');
        } else {
            admin = firebaseAdmin;
        }
    } catch (err) {
        console.warn('[Notifications] Firebase initialization failed:', err.message);
    }
}

/**
 * Send a push notification to all devices registered for a user
 */
async function sendToUser(user, notification, data = {}) {
    if (!admin || !user.fcmTokens || user.fcmTokens.length === 0) {
        console.log(`[Notifications] No FCM tokens for user ${user._id} - notification skipped`);
        return;
    }

    const invalidTokens = [];

    for (const token of user.fcmTokens) {
        try {
            await admin.messaging().send({
                token,
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: {
                    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                android: {
                    priority: notification.priority === 'high' ? 'high' : 'normal',
                    notification: {
                        icon: 'ic_notification',
                        color: '#6C5CE7',
                        channel_id: 'ringia_calls'
                    }
                },
                apns: {
                    headers: {
                        'apns-priority': notification.priority === 'high' ? '10' : '5'
                    },
                    payload: {
                        aps: {
                            badge: 1,
                            sound: notification.priority === 'high' ? 'urgent.caf' : 'default'
                        }
                    }
                }
            });
        } catch (err) {
            if (err.code === 'messaging/registration-token-not-registered' ||
                err.code === 'messaging/invalid-registration-token') {
                invalidTokens.push(token);
            } else {
                console.error(`[Notifications] Send failed for token:`, err.message);
            }
        }
    }

    // Remove invalid tokens from user record
    if (invalidTokens.length > 0) {
        user.fcmTokens = user.fcmTokens.filter(t => !invalidTokens.includes(t));
        await user.save().catch(console.error);
        console.log(`[Notifications] Removed ${invalidTokens.length} invalid FCM tokens`);
    }
}

/**
 * Notification: Incoming call
 */
async function sendIncomingCallNotification(user, callData) {
    const callerDisplay = callData.callerName || callData.callerNumber || 'Unknown';
    await sendToUser(user, {
        title: '📞 Incoming Call',
        body: `AI is answering a call from ${callerDisplay}`,
        priority: 'high'
    }, {
        type: 'incoming_call',
        callId: callData.callId?.toString() || '',
        callerNumber: callData.callerNumber || '',
        callerName: callData.callerName || ''
    });
}

/**
 * Notification: Call summary after call ends
 */
async function sendCallSummaryNotification(user, callData) {
    const callerDisplay = callData.callerName || callData.callerNumber || 'Unknown';
    const duration = callData.duration ? `${Math.round(callData.duration / 60)}m ${callData.duration % 60}s` : '';
    const followUp = callData.requiresFollowUp ? ' ⚠️ Follow-up needed.' : '';

    await sendToUser(user, {
        title: `${callData.intentLabel || 'Call'} — ${callerDisplay}`,
        body: `${callData.summary || 'Call handled by AI'}${followUp}${duration ? ` (${duration})` : ''}`,
        priority: 'normal'
    }, {
        type: 'call_summary',
        callId: callData.callId?.toString() || '',
        callerNumber: callData.callerNumber || '',
        callerName: callData.callerName || '',
        intent: callData.intent || '',
        intentLabel: callData.intentLabel || '',
        requiresFollowUp: String(callData.requiresFollowUp || false)
    });
}

/**
 * Notification: Urgent/emergency detected
 */
async function sendUrgentCallNotification(user, callData) {
    const callerDisplay = callData.callerName || callData.callerNumber || 'Unknown';
    await sendToUser(user, {
        title: '🚨 URGENT CALL',
        body: `Emergency detected! "${callData.keyword}" — ${callerDisplay} is calling. Tap to take over!`,
        priority: 'high'
    }, {
        type: 'urgent_call',
        callId: callData.callId?.toString() || '',
        callerNumber: callData.callerNumber || '',
        callerName: callData.callerName || '',
        keyword: callData.keyword || ''
    });
}

/**
 * Notification: Simple call ended (fallback if analysis fails)
 */
async function sendCallEndedNotification(user, callData) {
    const callerDisplay = callData.callerName || callData.callerNumber || 'Unknown';
    await sendToUser(user, {
        title: '📱 Call Ended',
        body: `Call from ${callerDisplay} has ended. Tap to view details.`,
        priority: 'normal'
    }, {
        type: 'call_ended',
        callId: callData.callId?.toString() || '',
        callerNumber: callData.callerNumber || ''
    });
}

module.exports = {
    initialize,
    sendToUser,
    sendIncomingCallNotification,
    sendCallSummaryNotification,
    sendUrgentCallNotification,
    sendCallEndedNotification
};
