/**
 * Conversation Analyzer Service
 * 
 * After a call ends, uses GPT-4.1-mini to:
 * 1. Classify the intent (delivery.food, spam, personal, etc.)
 * 2. Generate a structured summary
 * 3. Analyze sentiment
 * 4. Extract action items
 * 5. Determine if follow-up is needed
 */

const axios = require('axios');
const Call = require('../models/Call');
const notificationService = require('./notificationService');
const socketService = require('./socketService');

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const CHAT_DEPLOYMENT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4.1-mini';
const CHAT_API_VERSION = process.env.AZURE_OPENAI_CHAT_API_VERSION || '2024-08-01-preview';

const INTENT_LABELS = {
    'delivery.food': 'Food Delivery',
    'delivery.package': 'Package Delivery',
    'delivery.grocery': 'Grocery Delivery',
    'service.mygate': 'Apartment/Gate',
    'service.maintenance': 'Maintenance Service',
    'personal.known': 'Known Contact',
    'personal.unknown': 'Unknown Caller',
    'business.sales': 'Sales/Marketing',
    'business.work': 'Work Call',
    'spam.telemarketing': 'Spam/Telemarketing',
    'urgent.emergency': '🚨 Emergency',
    'callback.followup': 'Follow-up Call'
};

/**
 * Main function: analyze a completed call
 */
async function analyzeConversation(callId, transcript, user, preDetectedIntent = null) {
    console.log(`[Analyzer] Starting analysis for call ${callId}`);

    if (!transcript || transcript.length === 0) {
        console.log(`[Analyzer] No transcript for call ${callId}, skipping analysis`);
        return;
    }

    try {
        // Format transcript for analysis
        const transcriptText = transcript
            .map(t => `${t.role.toUpperCase()}: ${t.content}`)
            .join('\n');

        const analysisPrompt = `You are analyzing a phone call that was handled by an AI assistant on behalf of a user. 
    
TRANSCRIPT:
${transcriptText}

Analyze this call and provide a JSON response with the following structure:
{
  "intent": "<one of: delivery.food|delivery.package|delivery.grocery|service.mygate|service.maintenance|personal.known|personal.unknown|business.sales|business.work|spam.telemarketing|urgent.emergency|callback.followup>",
  "intentConfidence": <0.0 to 1.0>,
  "summary": "<2-3 sentence summary of the call>",
  "actionTaken": "<what the AI did/said in response>",
  "sentiment": "<positive|neutral|negative|urgent>",
  "requiresFollowUp": <true|false>,
  "followUpNotes": "<if requiresFollowUp is true, describe what follow-up is needed>",
  "urgentKeywordsDetected": ["<any urgent words found>"],
  "callerName": "<caller's name if mentioned, or null>",
  "callerPurpose": "<why they called, in one sentence>"
}

${preDetectedIntent ? `Hint: The AI previously detected the intent as "${preDetectedIntent}" during the call.` : ''}

Respond with ONLY the JSON object, no markdown or explanation.`;

        const response = await callAzureOpenAI(analysisPrompt);
        const analysis = JSON.parse(response);

        // Update call record with analysis
        const call = await Call.findById(callId);
        if (!call) return;

        call.analysis = {
            intent: analysis.intent || preDetectedIntent,
            intentLabel: INTENT_LABELS[analysis.intent] || INTENT_LABELS[preDetectedIntent] || 'Unknown',
            intentConfidence: analysis.intentConfidence || 0.7,
            summary: analysis.summary,
            actionTaken: analysis.actionTaken,
            sentiment: analysis.sentiment || 'neutral',
            urgentKeywordsDetected: analysis.urgentKeywordsDetected || [],
            requiresFollowUp: analysis.requiresFollowUp || false,
            followUpNotes: analysis.followUpNotes
        };

        // Update caller name if found
        if (analysis.callerName && !call.callerName) {
            call.callerName = analysis.callerName;
        }

        await call.save();
        console.log(`[Analyzer] Analysis complete for call ${callId}: ${analysis.intent}`);

        // Emit analysis result to mobile app
        socketService.emitToUser(user._id.toString(), 'call_analyzed', {
            callId,
            analysis: call.analysis,
            callerName: call.callerName
        });

        // Send push notification with summary
        await notificationService.sendCallSummaryNotification(user, {
            callId,
            callerNumber: call.callerNumber,
            callerName: call.callerName,
            intent: analysis.intent,
            intentLabel: call.analysis.intentLabel,
            summary: analysis.summary,
            requiresFollowUp: analysis.requiresFollowUp,
            duration: call.durationSeconds || 0
        });

    } catch (err) {
        console.error(`[Analyzer] Error analyzing call ${callId}:`, err.message);

        // Even if analysis fails, send a basic notification
        const call = await Call.findById(callId).catch(() => null);
        if (call) {
            await notificationService.sendCallEndedNotification(user, {
                callId,
                callerNumber: call.callerNumber,
                callerName: call.callerName,
                duration: call.durationSeconds || 0
            });
        }
    }
}

/**
 * Call Azure OpenAI Chat Completions API
 */
async function callAzureOpenAI(prompt) {
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${CHAT_DEPLOYMENT}/chat/completions?api-version=${CHAT_API_VERSION}`;

    const response = await axios.post(url, {
        messages: [
            { role: 'system', content: 'You are a precise AI call analyzer. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
    }, {
        headers: {
            'api-key': AZURE_OPENAI_API_KEY,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });

    return response.data.choices[0].message.content;
}

module.exports = { analyzeConversation, INTENT_LABELS };
