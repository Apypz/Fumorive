/**
 * Authentication Service
 * API calls for authentication (register, login, logout, refresh)
 */

import { AUTH_ENDPOINTS } from '../config/api';
import { apiClient } from './client';
import { saveTokens, clearTokens } from '../utils/auth';

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    role?: 'student' | 'researcher' | 'admin';
}

export interface LoginData {
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface UserResponse {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

/**
 * Authentication Service
 */
export const authService = {
    /**
     * Register new user
     */
    register: async (data: RegisterData): Promise<UserResponse> => {
        try {
            const response = await apiClient.post<UserResponse>(
                AUTH_ENDPOINTS.REGISTER,
                data,
                false // Not authenticated
            );
            return response;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    /**
     * Login user
     */
    login: async (data: LoginData): Promise<TokenResponse> => {
        try {
            const response = await apiClient.post<TokenResponse>(
                AUTH_ENDPOINTS.LOGIN,
                data,
                false // Not authenticated
            );

            // Save tokens to localStorage
            saveTokens(response.access_token, response.refresh_token);

            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    /**
     * Logout user
     */
    logout: async (): Promise<void> => {
        try {
            await apiClient.post(AUTH_ENDPOINTS.LOGOUT, undefined, true);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear tokens locally
            clearTokens();
        }
    },

    /**
     * Refresh access token
     * Note: This is automatically handled by apiClient
     * This method is here for manual refresh if needed
     */
    refresh: async (refreshToken: string): Promise<TokenResponse> => {
        try {
            const response = await apiClient.post<TokenResponse>(
                AUTH_ENDPOINTS.REFRESH,
                { refresh_token: refreshToken },
                false // Not authenticated
            );

            saveTokens(response.access_token, response.refresh_token);
            return response;
        } catch (error) {
            console.error('Refresh error:', error);
            clearTokens();
            throw error;
        }
    },
};
