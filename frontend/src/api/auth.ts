/**
 * Authentication Service
 * API calls for authentication (register, login, logout, refresh)
 */

import { AUTH_ENDPOINTS, API_URL, USER_ENDPOINTS } from '../config/api';
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
    profile_picture?: string;
    oauth_provider?: string;
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

    /**
     * Update user profile
     */
    updateProfile: async (data: Partial<UserResponse>): Promise<UserResponse> => {
        const response = await apiClient.put<UserResponse>(
            USER_ENDPOINTS.ME,
            data
        );
        return response;
    },

    /**
     * Change password (email users only)
     */
    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await apiClient.post(
            USER_ENDPOINTS.CHANGE_PASSWORD,
            { current_password: currentPassword, new_password: newPassword }
        );
    },

    /**
     * Request a password reset code.
     * Returns { message, dev_token? } — dev_token is only present in demo mode.
     */
    forgotPassword: async (email: string): Promise<{ message: string; dev_token?: string }> => {
        const response = await apiClient.post<{ message: string; dev_token?: string }>(
            AUTH_ENDPOINTS.FORGOT_PASSWORD,
            { email },
            false
        );
        return response;
    },

    /**
     * Reset password using the 6-digit code
     */
    resetPassword: async (email: string, token: string, newPassword: string): Promise<void> => {
        await apiClient.post(
            AUTH_ENDPOINTS.RESET_PASSWORD,
            { email, token, new_password: newPassword },
            false
        );
    }
};
