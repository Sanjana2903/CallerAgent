// API base URL — change this to your backend URL or ngrok URL
export const API_BASE_URL = 'https://5bee-2401-4900-889d-eba7-c930-2466-9af-802.ngrok-free.app';
export const SOCKET_URL = 'https://5bee-2401-4900-889d-eba7-c930-2466-9af-802.ngrok-free.app';

// Intent icons and colors for UI
export const INTENT_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    'delivery.food': { label: 'Food Delivery', emoji: '🍕', color: '#FF6B35' },
    'delivery.package': { label: 'Package', emoji: '📦', color: '#4ECDC4' },
    'delivery.grocery': { label: 'Grocery', emoji: '🛒', color: '#45B7D1' },
    'service.mygate': { label: 'Gate/Apartment', emoji: '🔐', color: '#96CEB4' },
    'service.maintenance': { label: 'Maintenance', emoji: '🔧', color: '#FFEAA7' },
    'personal.known': { label: 'Known Contact', emoji: '👤', color: '#DFE6E9' },
    'personal.unknown': { label: 'Unknown Caller', emoji: '❓', color: '#B2BEC3' },
    'business.sales': { label: 'Sales/Marketing', emoji: '📢', color: '#FDCB6E' },
    'business.work': { label: 'Work Call', emoji: '💼', color: '#6C5CE7' },
    'spam.telemarketing': { label: 'Spam', emoji: '🚫', color: '#FF7675' },
    'urgent.emergency': { label: '🚨 Emergency', emoji: '🚨', color: '#D63031' },
    'callback.followup': { label: 'Follow-up', emoji: '🔄', color: '#A29BFE' },
};

export const SENTIMENT_COLORS: Record<string, string> = {
    positive: '#00B894',
    neutral: '#74B9FF',
    negative: '#E17055',
    urgent: '#D63031',
};
