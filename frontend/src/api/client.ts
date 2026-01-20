/**
 * API Client with Auto-Refresh
 * Handles HTTP requests with automatic token refresh on 401
 */

import { AUTH_ENDPOINTS } from '../config/api';
import {
    getAccessToken,
    getRefreshToken,
    saveTokens,
    clearTokens,
    isTokenExpired
} from '../utils/auth';

/**
 * Custom fetch with authentication
 * Automatically adds Authorization header and handles token refresh
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    let token = getAccessToken();

    // Check if token is expired before making request
    if (token && isTokenExpired(token)) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            // Redirect to login if refresh failed
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
        }
        token = getAccessToken();
    }

    // Make request with token
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
    });

    // Handle 401 (try refresh)
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
            // Retry original request with new token
            token = getAccessToken();
            response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });
        } else {
            // Refresh failed, redirect to login
            clearTokens();
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
        }
    }

    return response;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        return false;
    }

    try {
        const response = await fetch(AUTH_ENDPOINTS.REFRESH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
            const tokens = await response.json();
            saveTokens(tokens.access_token, tokens.refresh_token);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

/**
 * API Client - Typed request functions
 */
export const apiClient = {
    /**
     * GET request
     */
    get: async <T>(url: string): Promise<T> => {
        const response = await fetchWithAuth(url);

        if (!response.ok) {
            throw new Error(`GET ${url} failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * POST request
     */
    post: async <T>(url: string, data?: any, authenticated = true): Promise<T> => {
        const fetchFn = authenticated ? fetchWithAuth : fetch;

        const response = await fetchFn(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `POST ${url} failed`);
        }

        return response.json();
    },

    /**
     * PATCH request
     */
    patch: async <T>(url: string, data: any): Promise<T> => {
        const response = await fetchWithAuth(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`PATCH ${url} failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * DELETE request
     */
    delete: async <T>(url: string): Promise<T> => {
        const response = await fetchWithAuth(url, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`DELETE ${url} failed: ${response.statusText}`);
        }

        return response.json();
    },
};
