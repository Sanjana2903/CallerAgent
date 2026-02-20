/**
 * Voice (Twilio) Controller
 * 
 * Handles:
 * 1. POST /voice/incoming-call — Twilio webhook when a call arrives
 * 2. WebSocket /voice/media-stream — Twilio media stream (bidirectional audio)
 * 3. POST /voice/call-status — Twilio status callbacks
 * 4. POST /api/calls/:id/takeover — User initiating call takeover
 */

const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const VoiceAgent = require('../services/voiceAgent');
const User = require('../models/User');
const Call = require('../models/Call');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');

// In-memory map of active voice agents: callSid -> VoiceAgent
const activeAgents = new Map();

/**
 * POST /voice/incoming-call
 * 
 * Twilio calls this when an incoming call arrives.
 * We respond with TwiML to start a media stream.
 */
async function handleIncomingCall(req, res) {
    console.log('[Voice] Incoming call webhook received:', {
        CallSid: req.body.CallSid,
        From: req.body.From,
        To: req.body.To
    });

    const { CallSid: callSid, From: callerNumber, To: twilioNumber } = req.body;
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;

    try {
        // Find which user this call belongs to
        const user = await findUserByTwilioNumber(twilioNumber);

        if (!user) {
            console.error('[Voice] No user found for Twilio number:', twilioNumber);
            const twiml = new VoiceResponse();
            twiml.say({ voice: 'Polly.Joanna' }, "I'm sorry, this number is not configured. Goodbye.");
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        // Check if number is blocked
        if (user.blockedNumbers?.includes(callerNumber)) {
            console.log('[Voice] Blocked number:', callerNumber);
            const twiml = new VoiceResponse();
            twiml.reject();
            return res.type('text/xml').send(twiml.toString());
        }

        // Load caller context (previous calls from same number)
        const callerContext = await loadCallerContext(callerNumber, user._id);

        // Create VoiceAgent (will connect to Azure OpenAI)
        const agent = new VoiceAgent(callSid, user, callerNumber, callerContext);
        await agent.initialize();
        activeAgents.set(callSid, agent);

        // Send incoming call notification to user's mobile app
        await notificationService.sendIncomingCallNotification(user, {
            callId: agent.callDb?._id,
            callerNumber,
            callerName: agent.callDb?.callerName
        });

        // Respond with TwiML to connect media stream
        const twiml = new VoiceResponse();
        const conference = twiml.dial();

        // Use a media stream to capture and send audio bidirectionally
        const start = twiml.start();
        start.stream({
            url: `wss://${webhookBaseUrl.replace('https://', '').replace('http://', '')}/voice/media-stream`,
            track: 'both_tracks'
        });

        // Say a brief greeting while connecting
        twiml.pause({ length: 1 });

        res.type('text/xml').send(twiml.toString());
        console.log('[Voice] TwiML response sent for call:', callSid);

    } catch (err) {
        console.error('[Voice] Error handling incoming call:', err);
        const twiml = new VoiceResponse();
        twiml.say('Sorry, an error occurred. Please try again later.');
        twiml.hangup();
        res.type('text/xml').send(twiml.toString());
    }
}

/**
 * WebSocket /voice/media-stream
 * 
 * Twilio connects here to stream bidirectional audio.
 * We pass the WebSocket to the appropriate VoiceAgent.
 */
function handleMediaStream(ws, req) {
    console.log('[Voice] New media stream WebSocket connection');

    let agent = null;

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        // On 'start', we learn the callSid and associate with the agent
        if (msg.event === 'start') {
            const callSid = msg.start.callSid;
            agent = activeAgents.get(callSid);

            if (agent) {
                console.log('[Voice] Media stream associated with agent for call:', callSid);
                agent.handleTwilioWebSocket(ws);
            } else {
                console.error('[Voice] No agent found for callSid:', callSid);
                ws.close();
            }
        }
    });

    ws.on('close', () => {
        console.log('[Voice] Media stream WebSocket closed');
    });
}

/**
 * POST /voice/call-status
 * 
 * Twilio status callback — called when call status changes.
 */
async function handleCallStatus(req, res) {
    const { CallSid: callSid, CallStatus: status } = req.body;
    console.log('[Voice] Call status update:', callSid, status);

    try {
        const call = await Call.findOne({ callSid });
        if (call) {
            if (status === 'completed' || status === 'no-answer' || status === 'busy' || status === 'failed') {
                // Clean up agent
                const agent = activeAgents.get(callSid);
                if (agent) {
                    await agent.handleCallEnd();
                    activeAgents.delete(callSid);
                }

                call.status = status === 'completed' ? 'ended' : status;
                await call.save();
            }
        }
        res.status(204).send();
    } catch (err) {
        console.error('[Voice] Error handling call status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * POST /api/calls/:id/takeover
 * 
 * User wants to join the ongoing call.
 * Creates a Twilio Conference Bridge and dials user's phone.
 */
async function handleCallTakeover(req, res) {
    const { id: callId } = req.params;
    const userId = req.user._id;

    try {
        const call = await Call.findOne({ _id: callId, userId });
        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.status !== 'active') {
            return res.status(400).json({ error: 'Call is not active', status: call.status });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const agent = activeAgents.get(call.callSid);
        if (!agent) {
            return res.status(400).json({ error: 'No active agent for this call' });
        }

        // Signal agent to prepare for takeover
        agent.requestTakeover();

        // Set up Twilio conference bridge
        const twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        const conferenceName = `ringia-takeover-${call.callSid}`;
        const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;

        // Move the existing call into a conference
        await twilioClient.calls(call.callSid).update({
            twiml: `<Response>
        <Dial>
          <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true">
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>`
        });

        // Dial the user's phone and add to same conference
        if (user.phoneNumber) {
            const outboundCall = await twilioClient.calls.create({
                to: user.phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER,
                twiml: `<Response>
          <Say voice="alice">You are joining a call. Please hold while we connect you.</Say>
          <Dial>
            <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">
              ${conferenceName}
            </Conference>
          </Dial>
        </Response>`,
                statusCallback: `${webhookBaseUrl}/voice/call-status`,
                statusCallbackMethod: 'POST'
            });

            console.log('[Voice] Outbound call to user created:', outboundCall.sid);
        }

        // Update call status
        call.status = 'takeover_active';
        call.conferenceRoomName = conferenceName;
        call.metadata.userJoinedAt = new Date();
        await call.save();

        // Emit event to mobile app
        socketService.emitToUser(userId.toString(), 'call_takeover_active', {
            callId,
            conferenceName,
            message: 'You have joined the call. AI is stepping aside.'
        });

        res.json({
            success: true,
            callId,
            conferenceName,
            message: 'Takeover initiated. You will receive a call shortly.'
        });

    } catch (err) {
        console.error('[Voice] Takeover error:', err);
        res.status(500).json({ error: 'Failed to initiate takeover', details: err.message });
    }
}

/**
 * GET /api/calls/:id/mute-ai
 * 
 * Silently mute the AI during takeover
 */
async function muteAI(req, res) {
    const { id: callId } = req.params;
    const userId = req.user._id;

    try {
        const call = await Call.findOne({ _id: callId, userId });
        if (!call) return res.status(404).json({ error: 'Call not found' });

        const agent = activeAgents.get(call.callSid);
        if (agent) {
            agent.muteAI();
        }

        res.json({ success: true, message: 'AI muted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mute AI' });
    }
}

// ========================
// Helper Functions
// ========================

/**
 * Find user by their assigned Twilio number
 */
async function findUserByTwilioNumber(twilioNumber) {
    return User.findOne({ twilioNumber });
}

/**
 * Load context about previous calls from the same caller
 */
async function loadCallerContext(callerNumber, userId) {
    try {
        const previousCalls = await Call.find({
            callerNumber,
            userId,
            status: 'ended'
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('analysis createdAt');

        if (previousCalls.length === 0) return {};

        const lastCall = previousCalls[0];
        return {
            count: previousCalls.length,
            lastCallDate: lastCall.createdAt,
            lastCallSummary: lastCall.analysis?.summary,
            lastCallIntent: lastCall.analysis?.intent
        };
    } catch (err) {
        console.error('[Voice] Error loading caller context:', err.message);
        return {};
    }
}

module.exports = {
    handleIncomingCall,
    handleMediaStream,
    handleCallStatus,
    handleCallTakeover,
    muteAI,
    activeAgents
};
