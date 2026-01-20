/**
 * Authentication Utilities
 * Token management and auth helpers
 */

// Token storage keys
const ACCESS_TOKEN_KEY = 'ergodrive_access_token';
const REFRESH_TOKEN_KEY = 'ergodrive_refresh_token';

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
