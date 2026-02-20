/**
 * VoiceAgent Service
 * 
 * The core of Ringia — bridges Twilio Media Streams with Azure OpenAI Realtime API.
 * 
 * Flow:
 * Twilio Call → WebSocket (media stream) → VoiceAgent → Azure OpenAI Realtime → Back to Twilio
 *                                                    ↓
 *                                           Socket.io → Mobile App (live transcript)
 */

const WebSocket = require('ws');
const { generateSystemPrompt } = require('./promptGenerator');
const Call = require('../models/Call');
const socketService = require('./socketService');
const notificationService = require('./notificationService');

// Azure OpenAI Realtime constants
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const DEPLOYMENT = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-4o-realtime-preview';
const API_VERSION = process.env.AZURE_OPENAI_REALTIME_API_VERSION || '2024-12-17';

// Audio format constants
const TWILIO_SAMPLE_RATE = 8000;  // Twilio uses 8kHz µ-law
const OPENAI_SAMPLE_RATE = 24000; // Azure OpenAI Realtime uses 24kHz PCM16

class VoiceAgent {
    constructor(callSid, user, callerNumber, callerContext = {}) {
        this.callSid = callSid;
        this.user = user;
        this.callerNumber = callerNumber;
        this.callerContext = callerContext;

        // WebSocket connections
        this.twilioWs = null;       // Twilio media stream WebSocket
        this.openaiWs = null;       // Azure OpenAI Realtime WebSocket
        this.streamSid = null;      // Twilio stream SID

        // Call state
        this.callDb = null;         // MongoDB Call document
        this.transcript = [];       // In-memory transcript
        this.detectedIntent = null;
        this.isEnded = false;
        this.takeoverRequested = false;

        // Partial transcript buffers
        this.currentAiTranscript = '';
        this.currentCallerTranscript = '';
        this.aiItemId = null;
        this.callerItemId = null;

        console.log(`[VoiceAgent] Created for call ${callSid}, user ${user.name}, caller ${callerNumber}`);
    }

    /**
     * Build the Azure OpenAI Realtime WebSocket URL
     */
    getAzureRealtimeUrl() {
        const baseEndpoint = AZURE_OPENAI_ENDPOINT.replace('https://', '').replace('http://', '');
        return `wss://${baseEndpoint}/openai/realtime?api-version=${API_VERSION}&deployment=${DEPLOYMENT}`;
    }

    /**
     * Initialize: Create call record in DB and connect to Azure OpenAI
     */
    async initialize() {
        // Create call record in MongoDB
        this.callDb = new Call({
            callSid: this.callSid,
            userId: this.user._id,
            callerNumber: this.callerNumber,
            callerName: this.findContactName(this.callerNumber),
            callerKnown: this.isKnownContact(this.callerNumber),
            status: 'ringing',
            startedAt: new Date(),
            callerContext: {
                previousCallsCount: this.callerContext.count || 0,
                lastCallDate: this.callerContext.lastCallDate,
                lastCallSummary: this.callerContext.lastCallSummary,
                lastCallIntent: this.callerContext.lastCallIntent
            }
        });
        await this.callDb.save();
        console.log(`[VoiceAgent] Call record created: ${this.callDb._id}`);

        // Connect to Azure OpenAI Realtime
        await this.connectToOpenAI();
    }

    /**
     * Connect to Azure OpenAI Realtime API
     */
    async connectToOpenAI() {
        const url = this.getAzureRealtimeUrl();
        console.log(`[VoiceAgent] Connecting to Azure OpenAI Realtime...`);

        this.openaiWs = new WebSocket(url, {
            headers: {
                'api-key': AZURE_OPENAI_API_KEY,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        this.openaiWs.on('open', () => {
            console.log(`[VoiceAgent] Connected to Azure OpenAI Realtime`);
            this.configureOpenAISession();
        });

        this.openaiWs.on('message', (data) => {
            this.handleOpenAIMessage(JSON.parse(data.toString()));
        });

        this.openaiWs.on('error', (err) => {
            console.error(`[VoiceAgent] Azure OpenAI WebSocket error:`, err.message);
        });

        this.openaiWs.on('close', (code, reason) => {
            console.log(`[VoiceAgent] Azure OpenAI WebSocket closed: ${code} - ${reason}`);
            if (!this.isEnded) {
                this.handleCallEnd();
            }
        });
    }

    /**
     * Configure the Azure OpenAI Realtime session
     */
    configureOpenAISession() {
        const systemPrompt = generateSystemPrompt(this.user, this.callerContext);
        const voice = this.user.aiSettings?.voice || 'shimmer';

        const sessionConfig = {
            type: 'session.update',
            session: {
                turn_detection: { type: 'server_vad' },
                input_audio_format: 'g711_ulaw',
                output_audio_format: 'g711_ulaw',
                voice: voice,
                instructions: systemPrompt,
                modalities: ['text', 'audio'],
                temperature: 0.8,
                input_audio_transcription: {
                    model: 'whisper-1'
                }
            }
        };

        this.openaiWs.send(JSON.stringify(sessionConfig));
        console.log(`[VoiceAgent] Session configured with voice: ${voice}`);
    }

    /**
     * Handle a Twilio WebSocket connection (media stream)
     */
    handleTwilioWebSocket(ws) {
        this.twilioWs = ws;

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            this.handleTwilioMessage(msg);
        });

        ws.on('close', () => {
            console.log(`[VoiceAgent] Twilio WebSocket closed for ${this.callSid}`);
            if (!this.isEnded) {
                this.handleCallEnd();
            }
        });

        ws.on('error', (err) => {
            console.error(`[VoiceAgent] Twilio WebSocket error:`, err.message);
        });
    }

    /**
     * Handle incoming Twilio media stream messages
     */
    handleTwilioMessage(msg) {
        switch (msg.event) {
            case 'connected':
                console.log(`[VoiceAgent] Twilio stream connected`);
                break;

            case 'start':
                this.streamSid = msg.start.streamSid;
                console.log(`[VoiceAgent] Twilio stream started: ${this.streamSid}`);
                // Update call status
                if (this.callDb) {
                    this.callDb.status = 'active';
                    this.callDb.answeredAt = new Date();
                    this.callDb.save().catch(console.error);
                }
                // Emit call_started event to mobile app
                socketService.emitToUser(this.user._id.toString(), 'call_started', {
                    callId: this.callDb?._id,
                    callSid: this.callSid,
                    callerNumber: this.callerNumber,
                    callerName: this.callDb?.callerName
                });
                break;

            case 'media':
                // Forward audio from caller to Azure OpenAI
                if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN && !this.takeoverRequested) {
                    const audioAppend = {
                        type: 'input_audio_buffer.append',
                        audio: msg.media.payload
                    };
                    this.openaiWs.send(JSON.stringify(audioAppend));
                }
                break;

            case 'stop':
                console.log(`[VoiceAgent] Twilio stream stopped`);
                this.handleCallEnd();
                break;

            default:
                break;
        }
    }

    /**
     * Handle incoming Azure OpenAI Realtime messages
     */
    handleOpenAIMessage(msg) {
        switch (msg.type) {
            // Audio delta — send AI's audio back to Twilio
            case 'response.audio.delta':
                if (msg.delta && this.twilioWs && this.twilioWs.readyState === WebSocket.OPEN && !this.takeoverRequested) {
                    const twilioAudio = {
                        event: 'media',
                        streamSid: this.streamSid,
                        media: { payload: msg.delta }
                    };
                    this.twilioWs.send(JSON.stringify(twilioAudio));
                }
                break;

            // AI text transcript (partial)
            case 'response.audio_transcript.delta':
                this.currentAiTranscript += msg.delta || '';
                // Stream partial transcript to mobile app
                socketService.emitToUser(this.user._id.toString(), 'transcript_delta', {
                    callId: this.callDb?._id,
                    role: 'ai',
                    content: msg.delta,
                    partial: true
                });
                break;

            // AI text transcript (complete)
            case 'response.audio_transcript.done':
                const aiText = msg.transcript || this.currentAiTranscript;
                this.currentAiTranscript = '';
                if (aiText) {
                    this.addTranscript('ai', aiText);
                }
                break;

            // Caller's speech transcript (partial)
            case 'conversation.item.input_audio_transcription.delta':
                this.currentCallerTranscript += msg.delta || '';
                socketService.emitToUser(this.user._id.toString(), 'transcript_delta', {
                    callId: this.callDb?._id,
                    role: 'caller',
                    content: msg.delta,
                    partial: true
                });
                break;

            // Caller's speech transcript (complete)
            case 'conversation.item.input_audio_transcription.completed':
                const callerText = msg.transcript || this.currentCallerTranscript;
                this.currentCallerTranscript = '';
                if (callerText) {
                    this.addTranscript('caller', callerText);
                    // Check for urgent keywords
                    this.checkForUrgency(callerText);
                }
                break;

            // Response started
            case 'response.created':
                console.log(`[VoiceAgent] AI response created`);
                break;

            // Response complete
            case 'response.done':
                console.log(`[VoiceAgent] AI response done`);
                break;

            // Input audio buffer committed
            case 'input_audio_buffer.committed':
                break;

            // Session updated
            case 'session.updated':
                console.log(`[VoiceAgent] Session updated successfully`);
                break;

            // Error
            case 'error':
                console.error(`[VoiceAgent] Azure OpenAI error:`, msg.error);
                break;

            default:
                break;
        }
    }

    /**
     * Add a transcript entry and emit to mobile app
     */
    addTranscript(role, content) {
        const entry = { role, content, timestamp: new Date() };
        this.transcript.push(entry);

        // Emit complete transcript entry to mobile app
        socketService.emitToUser(this.user._id.toString(), 'transcript_entry', {
            callId: this.callDb?._id,
            callSid: this.callSid,
            role,
            content,
            timestamp: entry.timestamp,
            totalEntries: this.transcript.length
        });

        // Detect intent from transcript
        this.detectIntent(content, role);

        // Save transcript to DB periodically
        if (this.callDb && this.transcript.length % 5 === 0) {
            this.saveTranscriptToDB();
        }
    }

    /**
     * Detect call intent from transcript
     */
    detectIntent(content, role) {
        if (role !== 'caller' || this.detectedIntent) return;

        const lowerContent = content.toLowerCase();
        const { INTENT_CATEGORIES } = require('./promptGenerator');

        for (const [intent, config] of Object.entries(INTENT_CATEGORIES)) {
            for (const keyword of config.keywords) {
                if (lowerContent.includes(keyword)) {
                    this.detectedIntent = intent;
                    console.log(`[VoiceAgent] Intent detected: ${intent}`);

                    // Emit intent to mobile app
                    socketService.emitToUser(this.user._id.toString(), 'intent_detected', {
                        callId: this.callDb?._id,
                        intent,
                        intentLabel: config.label,
                        confidence: 0.8
                    });
                    return;
                }
            }
        }
    }

    /**
     * Check for urgent keywords in caller speech
     */
    checkForUrgency(content) {
        const urgentKeywords = this.user.escalation?.urgentKeywords || ['emergency', 'urgent', 'hospital', 'accident', 'help'];
        const lowerContent = content.toLowerCase();

        for (const keyword of urgentKeywords) {
            if (lowerContent.includes(keyword.toLowerCase())) {
                console.log(`[VoiceAgent] URGENT keyword detected: ${keyword}`);

                // Override intent to emergency
                this.detectedIntent = 'urgent.emergency';

                // Immediately notify user
                socketService.emitToUser(this.user._id.toString(), 'call_urgent', {
                    callId: this.callDb?._id,
                    callSid: this.callSid,
                    keyword,
                    message: `Urgent: ${keyword} detected in call!`
                });

                // Send push notification immediately
                notificationService.sendUrgentCallNotification(this.user, {
                    callId: this.callDb?._id,
                    callerNumber: this.callerNumber,
                    callerName: this.callDb?.callerName,
                    keyword
                });
                break;
            }
        }
    }

    /**
     * Handle call takeover — user wants to join the call
     */
    requestTakeover() {
        if (this.takeoverRequested) return;
        this.takeoverRequested = true;
        console.log(`[VoiceAgent] Takeover requested for call ${this.callSid}`);

        // Tell AI to do graceful handoff
        const handoffMessage = {
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: '[SYSTEM]: The user wants to take over this call now. Please say: "One moment, let me connect you with them now." Then go silent.'
                }]
            }
        };

        if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
            this.openaiWs.send(JSON.stringify(handoffMessage));
            this.openaiWs.send(JSON.stringify({ type: 'response.create' }));
        }

        // Update call status
        if (this.callDb) {
            this.callDb.status = 'takeover_requested';
            this.callDb.metadata.takeoverStartedAt = new Date();
            this.callDb.save().catch(console.error);
        }
    }

    /**
     * Mute/unmute AI (after takeover)
     */
    muteAI() {
        this.takeoverRequested = true;
        if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
            this.openaiWs.close();
        }
        console.log(`[VoiceAgent] AI muted for call ${this.callSid}`);
    }

    /**
     * Save transcript to MongoDB
     */
    async saveTranscriptToDB() {
        if (!this.callDb) return;
        try {
            this.callDb.transcript = this.transcript.map(t => ({
                role: t.role,
                content: t.content,
                timestamp: t.timestamp
            }));
            await this.callDb.save();
        } catch (err) {
            console.error(`[VoiceAgent] Error saving transcript:`, err.message);
        }
    }

    /**
     * Handle call end — cleanup and trigger analysis
     */
    async handleCallEnd() {
        if (this.isEnded) return;
        this.isEnded = true;
        console.log(`[VoiceAgent] Call ended: ${this.callSid}`);

        // Close OpenAI connection
        if (this.openaiWs && this.openaiWs.readyState === WebSocket.OPEN) {
            this.openaiWs.close();
        }

        // Update call record
        if (this.callDb) {
            this.callDb.status = this.takeoverRequested ? 'ended' : 'ended';
            this.callDb.endedAt = new Date();
            this.callDb.durationSeconds = this.callDb.answeredAt
                ? Math.round((Date.now() - this.callDb.answeredAt.getTime()) / 1000)
                : 0;
            this.callDb.transcript = this.transcript.map(t => ({
                role: t.role,
                content: t.content,
                timestamp: t.timestamp
            }));
            await this.callDb.save();
        }

        // Emit call ended to mobile app
        socketService.emitToUser(this.user._id.toString(), 'call_ended', {
            callId: this.callDb?._id,
            callSid: this.callSid,
            duration: this.callDb?.durationSeconds,
            transcript: this.transcript
        });

        // Trigger post-call analysis
        if (this.callDb && this.transcript.length > 0) {
            const { analyzeConversation } = require('./conversationAnalyzer');
            analyzeConversation(this.callDb._id, this.transcript, this.user, this.detectedIntent)
                .catch(err => console.error('[VoiceAgent] Analysis error:', err.message));
        } else if (this.callDb) {
            // Send basic notification even if no transcript
            notificationService.sendCallEndedNotification(this.user, {
                callId: this.callDb._id,
                callerNumber: this.callerNumber,
                callerName: this.callDb.callerName,
                duration: this.callDb.durationSeconds || 0
            });
        }
    }

    /**
     * Check if a phone number belongs to a known VIP contact
     */
    isKnownContact(phoneNumber) {
        const allContacts = [...(this.user.contacts || []), ...(this.user.vipContacts || [])];
        return allContacts.some(c => c.phoneNumber === phoneNumber || c.phoneNumber === phoneNumber.replace('+', ''));
    }

    /**
     * Find contact name by phone number
     */
    findContactName(phoneNumber) {
        const allContacts = [...(this.user.contacts || []), ...(this.user.vipContacts || [])];
        const contact = allContacts.find(c => c.phoneNumber === phoneNumber || c.phoneNumber === phoneNumber.replace('+', ''));
        return contact?.name || null;
    }
}

module.exports = VoiceAgent;
