// API base URL — change this to your backend URL or ngrok URL
export const API_BASE_URL = 'https://4b73-2401-4900-9386-38a1-29ce-3768-8420-bbf.ngrok-free.app';
export const SOCKET_URL = 'https://4b73-2401-4900-9386-38a1-29ce-3768-8420-bbf.ngrok-free.app';

// Intent icons and colors for UI (Vibrant Palette)
export const INTENT_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    'delivery.food': { label: 'Food Delivery', emoji: '🍕', color: '#FF7675' },
    'delivery.package': { label: 'Package', emoji: '📦', color: '#00CEC9' },
    'delivery.grocery': { label: 'Grocery', emoji: '🛒', color: '#FAB1A0' },
    'service.mygate': { label: 'Gate Access', emoji: '🔐', color: '#55E6C1' },
    'service.maintenance': { label: 'Maintenance', emoji: '🔧', color: '#FDCB6E' },
    'personal.known': { label: 'Known Contact', emoji: '👤', color: '#A29BFE' },
    'personal.unknown': { label: 'Unknown Caller', emoji: '❓', color: '#B2BEC3' },
    'business.sales': { label: 'Sales/Ads', emoji: '📢', color: '#E17055' },
    'business.work': { label: 'Work Call', emoji: '💼', color: '#6C5CE7' },
    'spam.telemarketing': { label: 'Spam Blocked', emoji: '🚫', color: '#FF4757' },
    'urgent.emergency': { label: '🚨 Emergency', emoji: '🚨', color: '#D63031' },
    'callback.followup': { label: 'Follow-up', emoji: '🔄', color: '#74B9FF' },
};

export const SENTIMENT_COLORS: Record<string, string> = {
    positive: '#00B894',
    neutral: '#0984E3',
    negative: '#D63031',
    urgent: '#E84393',
};
