/**
 * PromptGenerator Service
 * Generates dynamic, context-aware system prompts for the AI voice agent
 * based on user preferences, caller history, and detected intent.
 */

const INTENT_CATEGORIES = {
    'delivery.food': {
        label: 'Food Delivery',
        examples: ['Swiggy', 'Zomato', 'DoorDash', 'Uber Eats', 'BigBasket'],
        keywords: ['swiggy', 'zomato', 'delivery', 'food', 'order']
    },
    'delivery.package': {
        label: 'Package Delivery',
        examples: ['Amazon', 'Flipkart', 'courier', 'parcel'],
        keywords: ['amazon', 'flipkart', 'courier', 'parcel', 'package', 'shipping']
    },
    'delivery.grocery': {
        label: 'Grocery Delivery',
        examples: ['Blinkit', 'Instamart', 'BigBasket'],
        keywords: ['blinkit', 'instamart', 'grocery', 'vegetables', 'fresh']
    },
    'service.mygate': {
        label: 'Apartment/Society',
        examples: ['MyGate', 'security', 'gatekeeper', 'guard'],
        keywords: ['mygate', 'gate', 'security', 'society', 'apartment', 'guard']
    },
    'service.maintenance': {
        label: 'Maintenance/Service',
        examples: ['plumber', 'electrician', 'technician'],
        keywords: ['plumber', 'electrician', 'repair', 'maintenance', 'service', 'technician']
    },
    'personal.known': {
        label: 'Known Contact',
        examples: ['friends', 'family'],
        keywords: []
    },
    'personal.unknown': {
        label: 'Unknown Personal',
        examples: [],
        keywords: []
    },
    'business.sales': {
        label: 'Sales/Marketing',
        examples: ['insurance', 'loan', 'credit card', 'promotion'],
        keywords: ['insurance', 'loan', 'credit card', 'offer', 'promotion', 'marketing', 'sales']
    },
    'business.work': {
        label: 'Work Related',
        examples: ['client', 'colleague', 'meeting'],
        keywords: ['office', 'work', 'meeting', 'project', 'client', 'business']
    },
    'spam.telemarketing': {
        label: 'Spam/Telemarketing',
        examples: ['robocall', 'survey', 'prize'],
        keywords: ['survey', 'prize', 'lottery', 'winner', 'free', 'offer']
    },
    'urgent.emergency': {
        label: 'Emergency',
        examples: ['hospital', 'accident'],
        keywords: ['emergency', 'urgent', 'hospital', 'accident', 'help', 'ambulance', 'fire', 'police']
    },
    'callback.followup': {
        label: 'Follow-up Call',
        examples: [],
        keywords: ['following up', 'called earlier', 'previous', 'again']
    }
};

/**
 * Generate a personalized system prompt for the AI voice agent
 */
function generateSystemPrompt(user, callerContext = {}) {
    const name = user.name || 'the user';
    const ai = user.aiSettings || {};
    const greeting = (ai.greeting || "Hi, you've reached {name}'s assistant. How can I help?").replace('{name}', name);
    const tone = ai.tone || 'professional';
    const lang = ai.language || 'en-US';
    const assistantName = ai.assistantName || 'Ringia';

    // Build delivery instructions section
    const deliverySection = buildDeliverySection(user.deliveryPreferences);
    const serviceSection = buildServiceSection(user.servicePreferences);
    const callerHistorySection = buildCallerHistorySection(callerContext);
    const contactsSection = buildContactsSection(user);
    const escalationSection = buildEscalationSection(user);
    const availabilitySection = buildAvailabilitySection(user);

    const toneGuide = {
        professional: 'Be professional, concise, and efficient. Keep responses brief and to the point.',
        friendly: 'Be warm, friendly, and conversational. Show personality while remaining helpful.',
        casual: 'Be casual and relaxed. Use natural, everyday language.'
    }[tone] || 'Be professional and helpful.';

    return `You are ${assistantName}, an AI voice assistant for ${name}. You answer incoming phone calls on ${name}'s behalf when they are unavailable or busy.

## Your Identity
- Your name is ${assistantName}
- You are speaking for ${name}
- Default greeting: "${greeting}"
- Tone: ${toneGuide}
- Language: ${lang}
- Keep responses SHORT and NATURAL (this is a phone call, not text chat)
- Speak in a conversational, human-like way

## Your Goals (in priority order)
1. Identify WHO is calling and WHY (the intent)
2. Handle the call appropriately based on intent and ${name}'s preferences
3. Stream transcript to ${name} in real-time so they can monitor
4. Escalate to ${name} immediately if: emergency detected, VIP caller, or urgent situation
5. End the call gracefully once handled

## Intent Detection
After the first message from the caller, silently classify the call intent as one of:
- delivery.food (Swiggy, Zomato, food delivery)
- delivery.package (Amazon, Flipkart, courier)
- delivery.grocery (Blinkit, BigBasket, groceries)
- service.mygate (gate security, apartment visitor management)
- service.maintenance (plumber, electrician, repair)
- personal.known (contacts in phone book)
- personal.unknown (unknown personal caller)
- business.sales (sales, marketing, cold calls)
- business.work (work colleagues, clients)
- spam.telemarketing (spam, robocalls, surveys)
- urgent.emergency (emergency keywords detected)
- callback.followup (following up on previous call)

After detecting intent, use the corresponding action below.

${deliverySection}

${serviceSection}

${contactsSection}

${availabilitySection}

${escalationSection}

${callerHistorySection}

## Important Rules
- NEVER reveal ${name}'s personal phone number
- NEVER reveal ${name}'s location in detail
- ALWAYS be polite, even when declining or ending a call
- If asked anything you cannot handle, offer to take a message
- Keep the call as SHORT as possible while being helpful
- For spam/telemarketing: End call quickly and politely ("Sorry, they're not interested. Have a good day!")
- For emergencies: Say "Please hold for a moment, I'm connecting you" and set intent to urgent.emergency
- Always confirm at the end: "Is there anything else I can note for ${name}?"

## Message Taking
If you need to take a message, collect:
1. Caller's name
2. Callback number (if different)
3. Reason for call
4. Any urgency

Say: "I'll make sure ${name} gets this message. Is there a good time to reach you back?"

## Call Ending
After handling the call, say a polite goodbye and end the conversation naturally.
Examples:
- "Great, I've noted that. Have a wonderful day!"
- "I'll make sure ${name} gets your message. Goodbye!"
- "The instructions have been passed along. Thank you, bye!"`;
}

function buildDeliverySection(prefs) {
    if (!prefs) return '';
    const food = prefs.food || {};
    const packages = prefs.packages || {};
    const groceries = prefs.groceries || {};

    return `## Delivery Handling Instructions

### Food Delivery (Swiggy, Zomato, DoorDash, Uber Eats):
- Default action: ${food.defaultAction || 'leave_at_door'}
- Tell caller: "${food.instructions || 'Please leave the food at the door and ring the bell once.'}"
${food.alternateInstructions ? `- If they cannot do that: "${food.alternateInstructions}"` : ''}

### Package Delivery (Amazon, Flipkart, Courier):
- Default action: ${packages.defaultAction || 'leave_at_location'}
- Tell caller: "${packages.instructions || `Please leave the package at the ${packages.location || 'shoe rack outside the door'}.`}"
${packages.requireSignature ? '- This delivery REQUIRES a signature - ask them to wait or reschedule' : ''}

### Grocery Delivery (Blinkit, Instamart, BigBasket):
- Default action: ${groceries.defaultAction || 'hand_to_person'}
- Tell caller: "${groceries.instructions || 'Please call when you reach the building.'}"
- Fallback: "${groceries.fallbackInstructions || 'If no answer in 2 minutes, leave with security.'}"`;
}

function buildServiceSection(prefs) {
    if (!prefs) return '';
    const mygate = prefs.mygate || {};
    const maintenance = prefs.maintenance || {};

    const autoApprove = (mygate.autoApprove || []).join(', ') || 'none configured';
    const reject = (mygate.reject || []).join(', ') || 'salespeople, solicitors';

    return `## Service Handling Instructions

### Apartment/Gate Security (MyGate):
- Auto-approve visitors: ${autoApprove}
- Ask purpose for: unknown visitors
- Reject: ${reject}
${mygate.instructions ? `- Special instructions: "${mygate.instructions}"` : ''}

### Maintenance/Repair Services:
- Require appointment: ${maintenance.requireAppointment !== false ? 'YES' : 'NO'}
${maintenance.requireAppointment !== false ? `- No appointment response: "${maintenance.noAppointmentResponse || 'Please schedule via the app first.'}"` : ''}
- Emergency exception: ${maintenance.emergencyException !== false ? 'YES - handle emergencies even without appointment' : 'NO'}`;
}

function buildContactsSection(user) {
    const vipList = (user.vipContacts || []).map(c => `${c.name} (${c.phoneNumber})`).join(', ');
    const blockedList = (user.blockedNumbers || []).join(', ');
    const rules = user.callerRules || {};

    return `## Contact Rules
- For known contacts: ${rules.contacts || 'inform them of availability and offer to connect'}
- For VIP contacts${vipList ? ` (${vipList})` : ''}: ${rules.vipContacts || 'say you will try to connect them immediately'}
- For unknown callers: ${rules.unknown || 'screen the call and take a message if needed'}
${blockedList ? `- Blocked numbers (end call immediately): ${blockedList}` : ''}`;
}

function buildAvailabilitySection(user) {
    const avail = user.availability || {};
    const status = avail.currentStatus || 'available';

    const statusMessages = {
        available: 'The user is currently available but has asked me to screen calls.',
        busy: 'The user is currently busy and cannot take calls right now.',
        dnd: 'The user is in Do Not Disturb mode and should not be disturbed.',
        away: 'The user is currently away.'
    };

    return `## Current Availability
- Status: ${status}
- Message to give callers: "${statusMessages[status] || statusMessages.available}"
- Timezone: ${avail.timezone || 'Asia/Kolkata'}`;
}

function buildEscalationSection(user) {
    const esc = user.escalation || {};
    const keywords = (esc.urgentKeywords || ['emergency', 'urgent', 'hospital', 'accident']).join(', ');
    const autoEscalate = (esc.autoEscalate || ['urgent', 'vip']).join(', ');

    return `## Escalation Rules
- Urgent keywords (IMMEDIATELY escalate): ${keywords}
- Auto-escalate scenarios: ${autoEscalate}
- When escalating: Say "Please hold for just a moment, let me see if I can reach them for you." and signal escalation.
- ALWAYS push notification for every call: ${esc.alwaysNotify !== false ? 'YES' : 'NO'}`;
}

function buildCallerHistorySection(callerContext) {
    if (!callerContext || !callerContext.previousCallsCount) return '';

    return `## Caller History (Context from Previous Calls)
- This number has called ${callerContext.previousCallsCount} time(s) before
- Last call: ${callerContext.lastCallDate ? new Date(callerContext.lastCallDate).toLocaleDateString() : 'Unknown'}
${callerContext.lastCallIntent ? `- Last call was about: ${callerContext.lastCallIntent}` : ''}
${callerContext.lastCallSummary ? `- Previous context: "${callerContext.lastCallSummary}"` : ''}
Use this context to provide continuity. Reference the previous interaction if relevant.`;
}

module.exports = {
    generateSystemPrompt,
    INTENT_CATEGORIES
};
