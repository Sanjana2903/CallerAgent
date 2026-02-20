const mongoose = require('mongoose');

const transcriptEntrySchema = new mongoose.Schema({
    role: { type: String, enum: ['ai', 'caller', 'user', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isPartial: { type: Boolean, default: false }  // true while streaming
}, { _id: false });

const callSchema = new mongoose.Schema({
    // Call Identity
    callSid: { type: String, required: true, unique: true },  // Twilio Call SID
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conferenceRoomName: { type: String },  // For call takeover

    // Caller Info
    callerNumber: { type: String, required: true },
    callerName: { type: String },          // If found in contacts
    callerKnown: { type: Boolean, default: false },

    // Call State
    status: {
        type: String,
        default: 'ringing',
        enum: ['ringing', 'active', 'takeover_requested', 'takeover_active', 'ended', 'failed', 'missed']
    },
    direction: { type: String, default: 'inbound', enum: ['inbound', 'outbound'] },

    // Timing
    startedAt: { type: Date },
    answeredAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number },

    // Live Transcript (built up during call)
    transcript: [transcriptEntrySchema],

    // Post-call Analysis
    analysis: {
        intent: { type: String },              // e.g. 'delivery.food', 'spam.telemarketing'
        intentLabel: { type: String },         // Human-readable label
        intentConfidence: { type: Number },    // 0-1
        summary: { type: String },
        actionTaken: { type: String },         // What the AI did
        sentiment: { type: String, enum: ['positive', 'neutral', 'negative', 'urgent'] },
        urgentKeywordsDetected: [{ type: String }],
        requiresFollowUp: { type: Boolean, default: false },
        followUpNotes: { type: String }
    },

    // Audio Recording
    recordingUrl: { type: String },
    recordingSid: { type: String },

    // Push Notification sent?
    notificationSent: { type: Boolean, default: false },

    // Metadata
    metadata: {
        twilioCallSid: { type: String },
        conferenceSid: { type: String },
        takeoverStartedAt: { type: Date },
        userJoinedAt: { type: Date }
    },

    // Context from previous calls (loaded at call start)
    callerContext: {
        previousCallsCount: { type: Number, default: 0 },
        lastCallDate: { type: Date },
        lastCallSummary: { type: String },
        lastCallIntent: { type: String }
    }
}, {
    timestamps: true
});

// Index for quick lookups
callSchema.index({ userId: 1, createdAt: -1 });
callSchema.index({ callerNumber: 1, userId: 1 });
callSchema.index({ status: 1 });

module.exports = mongoose.model('Call', callSchema);
