/**
 * Face Detection API Client
 * Endpoints untuk face recognition dan fatigue detection
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface FaceEventData {
    session_id: string;
    timestamp: string;
    eye_aspect_ratio?: number;
    mouth_aspect_ratio?: number;
    eyes_closed: boolean;
    yawning: boolean;
    blink_count: number;
    blink_rate?: number;
    head_yaw?: number;
    head_pitch?: number;
    head_roll?: number;
    face_fatigue_score?: number;
}

export interface FaceStats {
    session_id: string;
    total_events: number;
    duration_seconds?: number;
    avg_blink_rate?: number;
    total_blinks?: number;
    eyes_closed_count: number;
    eyes_closed_percentage?: number;
    yawn_count: number;
    avg_fatigue_score?: number;
    max_fatigue_score?: number;
    head_movement: {
        avg_yaw?: number;
        avg_pitch?: number;
        avg_roll?: number;
    };
}

export const faceApi = {
    /**
     * Log single face detection event
     */
    logEvent: async (data: FaceEventData) => {
        const response = await axios.post(`${API_BASE_URL}/face/events`, data);
        return response.data;
    },

    /**
     * Get face detection statistics for a session
     */
    getStats: async (sessionId: string): Promise<FaceStats> => {
        const response = await axios.get(`${API_BASE_URL}/face/stats/${sessionId}`);
        return response.data;
    },

    /**
     * Get latest face detection event
     */
    getLatest: async (sessionId: string) => {
        const response = await axios.get(`${API_BASE_URL}/face/realtime/${sessionId}`);
        return response.data;
    }
};


