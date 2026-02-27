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

export interface SessionUpdate {
    session_name?: string;
    session_status?: 'active' | 'completed' | 'failed';
    settings?: any;
    ended_at?: string;
    duration_seconds?: number;
    avg_fatigue_score?: number;
    max_fatigue_score?: number;
    alert_count?: number;
}

export interface ViolationData {
    type: string;
    points: number;
    timestamp: number;
    description: string;
}

export interface GameSessionData {
    routeName: string;
    totalWaypoints: number;
    reachedCount: number;
    missedCount: number;
    completionTime: number;
    violations: ViolationData[];
    totalViolationPoints: number;
    eegData?: any[];
    gameMetrics?: {
        averageSpeed: number;
        maxSpeed: number;
        collisions: number;
        laneDeviations: number;
        totalDistance: number;
    };
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
    avg_fatigue_score?: number;
    max_fatigue_score?: number;
    alert_count?: number;
    settings?: any;
}

export interface SessionListResponse {
    total: number;
    sessions: SessionResponse[];
    page: number;
    page_size: number;
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
    },

    /**
     * Complete a session with final data
     */
    complete: async (sessionId: string, data?: SessionUpdate): Promise<SessionResponse> => {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please log in first.');
        }
        
        // First update session with final stats if provided
        if (data) {
            await axios.patch(
                `${API_BASE_URL}/sessions/${sessionId}`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
        }
        
        // Then mark as complete
        const response = await axios.post(
            `${API_BASE_URL}/sessions/${sessionId}/complete`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    },

    /**
     * Update a session
     */
    update: async (sessionId: string, data: SessionUpdate): Promise<SessionResponse> => {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please log in first.');
        }
        const response = await axios.patch(
            `${API_BASE_URL}/sessions/${sessionId}`,
            data,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    },

    /**
     * List user's sessions with pagination
     */
    list: async (page: number = 1, pageSize: number = 20, status?: string): Promise<SessionListResponse> => {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please log in first.');
        }
        
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: pageSize.toString(),
        });
        if (status) {
            params.append('status', status);
        }
        
        const response = await axios.get(
            `${API_BASE_URL}/sessions?${params.toString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    },

    /**
     * Delete a session
     */
    delete: async (sessionId: string): Promise<void> => {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please log in first.');
        }
        await axios.delete(
            `${API_BASE_URL}/sessions/${sessionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
    }
};


