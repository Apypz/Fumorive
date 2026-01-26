import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type LoginData, type RegisterData, type UserResponse } from '../api/auth';
import { parseJWT, getAccessToken, clearTokens } from '../utils/auth';

interface UserState {
    user: UserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (credentials: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<UserResponse>) => void;
    setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    // Login returns tokens (access_token, refresh_token)
                    await authService.login(credentials);

                    // Parse JWT token to get user info
                    const accessToken = getAccessToken();
                    if (!accessToken) {
                        throw new Error('Failed to get access token');
                    }

                    const decodedToken = parseJWT(accessToken);
                    if (!decodedToken) {
                        throw new Error('Failed to decode access token');
                    }

                    // Extract user info from JWT payload
                    const user: UserResponse = {
                        id: decodedToken.user_id || 'unknown',  // user_id from JWT
                        email: decodedToken.email || credentials.email,
                        full_name: decodedToken.full_name || 'User',
                        role: decodedToken.role || 'student',
                        is_active: true,
                        created_at: new Date().toISOString()
                    };

                    set({
                        isAuthenticated: true,
                        isLoading: false,
                        user
                    });
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.response?.data?.detail || 'Login failed'
                    });
                    throw error;
                }
            },

            register: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    await authService.register(data);
                    set({ isLoading: false });
                    // Optional: could auto-login here if desired
                } catch (error: any) {
                    set({
                        isLoading: false,
                        error: error.response?.data?.detail || 'Registration failed'
                    });
                    throw error;
                }
            },

            logout: async () => {
                // No need to hit backend - just clear local state
                // Backend will invalidate token automatically when it expires
                clearTokens();
                set({ user: null, isAuthenticated: false });
                console.log('✅ Logged out successfully');
            },

            updateProfile: (data) => set((state) => ({
                user: state.user ? { ...state.user, ...data } : null
            })),

            setError: (error) => set({ error }),
        }),
        {
            name: 'user-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
