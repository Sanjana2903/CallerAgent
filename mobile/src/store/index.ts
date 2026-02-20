import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import socketService from '../services/socketService';

interface User {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    twilioNumber?: string;
    userPin?: string;
    aiSettings?: any;
    availability?: { currentStatus: string };
    deliveryPreferences?: any;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phoneNumber?: string) => Promise<void>;
    logout: () => Promise<void>;
    loadFromStorage: () => Promise<void>;
    updateUser: (data: Partial<User>) => Promise<void>;
    updateStatus: (status: 'available' | 'busy' | 'dnd' | 'away') => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { token, user } = response.data;

        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        // Connect Socket.io
        socketService.connect(user._id);

        set({ user, token, isAuthenticated: true });
    },

    register: async (name, email, password, phoneNumber) => {
        const response = await authAPI.register({ name, email, password, phoneNumber });
        const { token, user } = response.data;

        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        socketService.connect(user._id);
        set({ user, token, isAuthenticated: true });
    },

    logout: async () => {
        socketService.disconnect();
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
    },

    loadFromStorage: async () => {
        try {
            const [token, userStr] = await Promise.all([
                AsyncStorage.getItem('auth_token'),
                AsyncStorage.getItem('user')
            ]);

            if (token && userStr) {
                const user = JSON.parse(userStr);
                socketService.connect(user._id);
                set({ user, token, isAuthenticated: true });
            }
        } catch (err) {
            console.error('[Auth] Failed to load from storage:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    updateUser: async (data) => {
        const response = await authAPI.updateMe(data);
        const updatedUser = response.data.user;
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
    },

    updateStatus: async (status) => {
        await authAPI.updateStatus(status);
        set(state => ({
            user: state.user ? {
                ...state.user,
                availability: { ...state.user.availability, currentStatus: status }
            } : null
        }));
    },
}));

// ========================
// Call Store
// ========================
interface CallEntry {
    _id: string;
    callSid: string;
    callerNumber: string;
    callerName?: string;
    status: string;
    createdAt: string;
    durationSeconds?: number;
    analysis?: {
        intent: string;
        intentLabel: string;
        summary?: string;
        sentiment?: string;
        requiresFollowUp?: boolean;
    };
    transcript?: Array<{ role: string; content: string; timestamp: string }>;
}

interface LiveTranscriptEntry {
    role: 'ai' | 'caller' | 'user' | 'system';
    content: string;
    timestamp: Date;
    isPartial?: boolean;
}

interface ActiveCall {
    callId: string;
    callSid: string;
    callerNumber: string;
    callerName?: string;
    status: string;
    startedAt: Date;
    transcript: LiveTranscriptEntry[];
    intent?: string;
    intentLabel?: string;
    isUrgent?: boolean;
}

interface CallStore {
    callHistory: CallEntry[];
    activeCall: ActiveCall | null;
    isLoadingHistory: boolean;

    setActiveCall: (call: ActiveCall | null) => void;
    updateActiveCall: (updates: Partial<ActiveCall>) => void;
    addTranscriptEntry: (entry: LiveTranscriptEntry) => void;
    clearActiveCall: () => void;

    loadHistory: () => Promise<void>;
    refreshHistory: () => Promise<void>;
}

export const useCallStore = create<CallStore>((set, get) => ({
    callHistory: [],
    activeCall: null,
    isLoadingHistory: false,

    setActiveCall: (call) => set({ activeCall: call }),

    updateActiveCall: (updates) => set(state => ({
        activeCall: state.activeCall ? { ...state.activeCall, ...updates } : null
    })),

    addTranscriptEntry: (entry) => set(state => ({
        activeCall: state.activeCall ? {
            ...state.activeCall,
            transcript: [...state.activeCall.transcript, entry]
        } : null
    })),

    clearActiveCall: () => set({ activeCall: null }),

    loadHistory: async () => {
        set({ isLoadingHistory: true });
        try {
            const { callsAPI } = await import('../services/api');
            const response = await callsAPI.getHistory({ limit: 50 });
            set({ callHistory: response.data.calls });
        } catch (err) {
            console.error('[Calls] Load history error:', err);
        } finally {
            set({ isLoadingHistory: false });
        }
    },

    refreshHistory: async () => {
        try {
            const { callsAPI } = await import('../services/api');
            const response = await callsAPI.getHistory({ limit: 50 });
            set({ callHistory: response.data.calls });
        } catch (err) {
            console.error('[Calls] Refresh history error:', err);
        }
    },
}));
