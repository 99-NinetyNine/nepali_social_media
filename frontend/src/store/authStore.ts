import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginResponse } from '@/types';
import { authApi } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await authApi.login(email, password);
          const { user, access, refresh } = response.data as LoginResponse;
          
          set({ 
            user, 
            token: access, 
            refreshToken: refresh, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: any) => {
        try {
          set({ isLoading: true });
          const response = await authApi.register(userData);
          const { user, access, refresh } = response.data as LoginResponse;
          
          set({ 
            user, 
            token: access, 
            refreshToken: refresh, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          refreshToken: null, 
          isLoading: false 
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      updateToken: (token: string) => {
        set({ token });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);