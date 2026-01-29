/**
 * Authentication Utilities
 * Token management and auth helpers
 */

// Token storage keys
const ACCESS_TOKEN_KEY = 'fumorive_access_token';
const REFRESH_TOKEN_KEY = 'fumorive_refresh_token';

/**
 * Save tokens to localStorage
 */
export const saveTokens = (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * Get access token from localStorage
 */
export const getAccessToken = (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Clear all tokens from localStorage
 */
export const clearTokens = (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return !!getAccessToken();
};

/**
 * Parse JWT token to get payload
 */
export const parseJWT = (token: string): any => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
    const payload = parseJWT(token);
    if (!payload || !payload.exp) return true;

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    return now >= expirationTime;
};

/**
 * Get user info from access token
 */
export const getUserFromToken = (): any | null => {
    const token = getAccessToken();
    if (!token) return null;

    return parseJWT(token);
};

/**
 * Sign in with Google OAuth
 * Returns JWT tokens from backend after Firebase authentication
 */
export const signInWithGoogle = async (): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
} | null> => {
    try {
        // Dynamically import Firebase auth functions
        const { signInWithPopup } = await import('firebase/auth');
        const { auth, googleProvider } = await import('../config/firebase');

        // Trigger Google Sign-In popup
        const result = await signInWithPopup(auth, googleProvider);

        // Get Firebase ID token
        const firebaseToken = await result.user.getIdToken();

        // Send Firebase token to backend for verification
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/v1/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firebase_token: firebaseToken,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Google authentication failed');
        }

        const data = await response.json();

        // Save tokens to localStorage
        saveTokens(data.access_token, data.refresh_token);

        return data;
    } catch (error: any) {
        console.error('Google sign-in error:', error);

        // Handle specific Firebase errors
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in cancelled');
        } else if (error.code === 'auth/popup-blocked') {
            throw new Error('Popup blocked. Please allow popups for this site.');
        }

        throw error;
    }
};

/**
 * Sign out from Google (if applicable)
 * Also clears local tokens
 */
export const signOutGoogle = async (): Promise<void> => {
    try {
        const { signOut } = await import('firebase/auth');
        const { auth } = await import('../config/firebase');

        await signOut(auth);
        clearTokens();
    } catch (error) {
        console.error('Sign out error:', error);
        // Clear tokens anyway
        clearTokens();
    }
};

