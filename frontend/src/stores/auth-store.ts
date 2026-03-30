import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.login({ email, password });
          set({
            token: response.access_token,
            user: response.user,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.register({
            email,
            password,
            full_name: fullName,
          });
          set({
            token: response.access_token,
            user: response.user,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Registration failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: () => {
        set({ token: null, user: null, error: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;
        set({ isLoading: true });
        try {
          const user = await api.auth.me();
          set({ user, isLoading: false });
        } catch {
          set({ token: null, user: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
