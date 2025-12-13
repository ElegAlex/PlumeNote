// ===========================================
// Store Auth (Zustand)
// ===========================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@plumenote/types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // true après le premier checkAuth()
  error: string | null;
  _hasHydrated: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post('/auth/login', { username, password });
          const { user, token } = response.data;

          // Stocker le token pour les connexions WebSocket
          if (token) {
            localStorage.setItem('plumenote-token', token);
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch (err: any) {
          const message = err.response?.data?.message || 'Erreur de connexion';
          set({
            error: message,
            isLoading: false,
          });
          throw new Error(message);
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignorer les erreurs de logout
        } finally {
          // Supprimer le token WebSocket
          localStorage.removeItem('plumenote-token');

          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        // Ne pas appeler /auth/me si aucun token n'existe
        const token = localStorage.getItem('plumenote-token');
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
          return;
        }

        set({ isLoading: true });

        try {
          const response = await api.get('/auth/me');
          const { user } = response.data;

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch {
          // Token invalide ou expiré - le supprimer
          localStorage.removeItem('plumenote-token');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Ne pas persister le user - toujours récupérer depuis le serveur
        // Cela évite les problèmes de données obsolètes (ex: role manquant)
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Vérifier l'auth au démarrage
useAuthStore.getState().checkAuth();
