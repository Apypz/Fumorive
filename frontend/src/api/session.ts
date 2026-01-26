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
        const response = await axios.post(`${API_BASE_URL}/sessions`, data, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    /**
     * Get session by ID
     */
    get: async (sessionId: string): Promise<SessionResponse> => {
        const token = getAccessToken();
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


