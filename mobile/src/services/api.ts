import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Attach JWT token to all requests
api.interceptors.request.use(async (config) => {
    console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('[API] Request Error:', error);
    return Promise.reject(error);
});

// Handle errors
api.interceptors.response.use(
    (response) => {
        console.log(`[API] Response: ${response.status} ${response.config.url}`);
        return response;
    },
    async (error) => {
        console.error(`[API] error: ${error.message}`, error.response?.data || '');
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

// ========================
// Auth API
// ========================
export const authAPI = {
    register: (data: { name: string; email: string; password: string; phoneNumber?: string }) =>
        api.post('/api/auth/register', data),

    login: (data: { email: string; password: string }) =>
        api.post('/api/auth/login', data),

    getMe: () => api.get('/api/auth/me'),

    updateMe: (data: any) => api.put('/api/auth/me', data),

    registerDevice: (fcmToken: string) =>
        api.post('/api/auth/register-device', { fcmToken }),

    syncContacts: (contacts: Array<{ name: string; phoneNumber: string }>) =>
        api.post('/api/auth/sync-contacts', { contacts }),

    updateStatus: (status: 'available' | 'busy' | 'dnd' | 'away') =>
        api.put('/api/auth/status', { status }),
};

// ========================
// Calls API
// ========================
export const callsAPI = {
    getHistory: (params?: { page?: number; limit?: number; intent?: string; status?: string }) =>
        api.get('/api/calls', { params }),

    getActive: () => api.get('/api/calls/active'),

    getStats: (days?: number) => api.get('/api/calls/stats', { params: { days } }),

    getCall: (callId: string) => api.get(`/api/calls/${callId}`),

    takeover: (callId: string) => api.post(`/api/calls/${callId}/takeover`),

    muteAI: (callId: string) => api.post(`/api/calls/${callId}/mute-ai`),

    endCall: (callId: string) => api.post(`/api/calls/${callId}/end`),

    deleteCall: (callId: string) => api.delete(`/api/calls/${callId}`),
};

export default api;
