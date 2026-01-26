/**
 * Session API Client
 * Endpoints untuk managing driving sessions
 */

import axios from 'axios';
import { getAccessToken } from '../utils/auth';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface SessionCreate {
    session_name: string;
    device_type?: string;
    calibration_data?: any;
    settings?: any;
}

export interface SessionResponse {
    id: string;
    user_id: string;
    session_name: string;
    device_type?: string;
    session_status: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
}

export const sessionApi = {
    /**
     * Create a new session
     */
    create: async (data: SessionCreate): Promise<SessionResponse> => {
        const token = getAccessToken();
        if (!token) {
            console.error('❌ No access token found in localStorage');
            throw new Error('Not authenticated. Please log in first.');
        }

        // Debug: Show token info
        console.log('✅ Access token found, creating session...');
        console.log('📝 Token (first 50 chars):', token.substring(0, 50) + '...');
        console.log('📝 Session data:', data);

        try {
            const response = await axios.post(`${API_BASE_URL}/sessions`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Session created successfully:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Session creation failed');
            console.error('Error status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            console.error('Error message:', error.message);
            throw error;
        }
    },

    /**
     * Get session by ID
     */
    get: async (sessionId: string): Promise<SessionResponse> => {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please log in first.');
        }
        const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    /**
     * End a session
     */
    end: async (sessionId: string): Promise<SessionResponse> => {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please log in first.');
        }
        const response = await axios.patch(
            `${API_BASE_URL}/sessions/${sessionId}/end`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    }
};


