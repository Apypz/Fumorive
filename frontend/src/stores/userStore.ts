import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type LoginData, type RegisterData, type UserResponse } from '../api/auth';

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
                    // Login only returns tokens (access_token, refresh_token) in auth.ts
                    await authService.login(credentials);

                    // Since we don't have a /me endpoint configured yet to get the full profile,
                    // we will create a temporary user object state so the UI updates.
                    // In a real app, you would fetch user details here: const user = await authService.getProfile();
                    const tempUser: UserResponse = {
                        id: 'temp-id',
                        email: credentials.email,
                        full_name: 'User', // Placeholder until we have profile fetch
                        role: 'student',
                        is_active: true,
                        created_at: new Date().toISOString()
                    };

                    set({
                        isAuthenticated: true,
                        isLoading: false,
                        user: tempUser
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
                try {
                    await authService.logout();
                } catch (error) {
                    console.error(error);
                } finally {
                    set({ user: null, isAuthenticated: false });
                }
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
