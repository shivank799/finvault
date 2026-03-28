import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, clearAuth } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,
      error:        null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.login({ email, password });
          const { user, accessToken, refreshToken } = data.data;
          localStorage.setItem('fv_access_token',  accessToken);
          localStorage.setItem('fv_refresh_token', refreshToken);
          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.register({ name, email, password });
          const { user, accessToken, refreshToken } = data.data;
          localStorage.setItem('fv_access_token',  accessToken);
          localStorage.setItem('fv_refresh_token', refreshToken);
          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
          set({ error: msg, isLoading: false });
          return { success: false, message: msg };
        }
      },

      logout: async () => {
        try { await authAPI.logout(); } catch {}
        clearAuth();
        set({ user: null, accessToken: null, refreshToken: null });
      },

      updateUser: (userData) => set({ user: { ...get().user, ...userData } }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fv_auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;
