const Call = require('../models/Call');
const User = require('../models/User');
const { activeAgents } = require('./voiceController');
const twilioClient = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * GET /api/calls
 * Get paginated call history for the logged-in user
 */
async function getCallHistory(req, res) {
    const { page = 1, limit = 20, intent, status, from, to } = req.query;
    const userId = req.user._id;

    try {
        if (mongoose.connection.readyState !== 1) {
            console.warn('[Calls] Database disconnected. Returning mock history.');
            return res.json({
                calls: [
                    {
                        _id: 'mock1',
                        callerName: 'Mom',
                        callerNumber: '+1 415-9988',
                        status: 'ended',
                        analysis: { intent: 'personal.family', summary: 'Mom called to check on dinner.' },
                        createdAt: new Date().toISOString()
                    },
                    {
                        _id: 'mock2',
                        callerName: 'Amazon Delivery',
                        callerNumber: '+1 800-4455',
                        status: 'ended',
                        analysis: { intent: 'logistics.delivery', summary: 'Package left at the door.' },
                        createdAt: new Date(Date.now() - 3600000).toISOString()
                    }
                ],
                pagination: { total: 2, page: 1, pages: 1, limit: parseInt(limit) }
            });
        }

        const filter = { userId };

        if (intent) filter['analysis.intent'] = intent;
        if (status) filter.status = status;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        const total = await Call.countDocuments(filter);
        const calls = await Call.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-transcript');  // Exclude transcript for list view (it's large)

        res.json({
            calls,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        console.error('[Calls] Get history error:', err);
        res.status(500).json({ error: 'Failed to get call history' });
    }
}

/**
 * GET /api/calls/active
 * Get any currently active calls for the user
 */
async function getActiveCalls(req, res) {
    const userId = req.user._id;

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json({ activeCalls: [] });
        }
        const activeCalls = await Call.find({
            userId,
            status: { $in: ['ringing', 'active', 'takeover_requested', 'takeover_active'] }
        }).select('-transcript');

        res.json({ activeCalls });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get active calls' });
    }
}

/**
 * GET /api/calls/:id
 * Get full call details including transcript
 */
async function getCall(req, res) {
    const { id } = req.params;
    const userId = req.user._id;

    try {
        const call = await Call.findOne({ _id: id, userId });
        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }
        res.json({ call });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get call' });
    }
}

/**
 * POST /api/calls/:id/takeover
 * Handled in voiceController.handleCallTakeover
 * This is a pass-through for route organization
 */

/**
 * POST /api/calls/:id/end
 * Force end an ongoing call
 */
async function endCall(req, res) {
    const { id } = req.params;
    const userId = req.user._id;

    try {
        const call = await Call.findOne({ _id: id, userId });
        if (!call) return res.status(404).json({ error: 'Call not found' });

        // Hangup via Twilio API
        await twilioClient.calls(call.callSid).update({ status: 'completed' });

        // Clean up agent
        const agent = activeAgents.get(call.callSid);
        if (agent) {
            await agent.handleCallEnd();
            activeAgents.delete(call.callSid);
        }

        res.json({ success: true, message: 'Call ended' });
    } catch (err) {
        console.error('[Calls] End call error:', err);
        res.status(500).json({ error: 'Failed to end call' });
    }
}

/**
 * DELETE /api/calls/:id
 * Delete a call record from history
 */
async function deleteCall(req, res) {
    const { id } = req.params;
    const userId = req.user._id;

    try {
        const result = await Call.deleteOne({ _id: id, userId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Call not found' });
        }
        res.json({ message: 'Call deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete call' });
    }
}

/**
 * GET /api/calls/stats
 * Get call statistics for dashboard
 */
async function getCallStats(req, res) {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
        const stats = await Call.aggregate([
            { $match: { userId: userId, createdAt: { $gte: since } } },
            {
                $group: {
                    _id: '$analysis.intent',
                    count: { $sum: 1 },
                    totalDuration: { $sum: '$durationSeconds' }
                }
            }
        ]);

        const totalCalls = await Call.countDocuments({ userId, createdAt: { $gte: since } });
        const handledByAI = await Call.countDocuments({
            userId,
            createdAt: { $gte: since },
            status: 'ended'
        });
        const urgentCalls = await Call.countDocuments({
            userId,
            createdAt: { $gte: since },
            'analysis.intent': 'urgent.emergency'
        });

        res.json({
            totalCalls,
            handledByAI,
            urgentCalls,
            aiHandledRate: totalCalls > 0 ? Math.round((handledByAI / totalCalls) * 100) : 0,
            byIntent: stats
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
}

module.exports = {
    getCallHistory,
    getActiveCalls,
    getCall,
    endCall,
    deleteCall,
    getCallStats
};
