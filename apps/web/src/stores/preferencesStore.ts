// ===========================================
// Store Préférences Utilisateur (Sprint 3)
// ===========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UserPreferences,
  Theme,
  EditorMode,
  EditorWidth,
  DisplayPreferences,
  EditorPreferences,
  SidebarPreferences,
  NotificationPreferences,
} from '@plumenote/types';
import * as preferencesApi from '../services/preferencesApi';

// Valeurs par défaut
const DEFAULT_PREFERENCES: UserPreferences = {
  display: {
    theme: 'system',
    language: 'fr',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    startOfWeek: 'monday',
  },
  editor: {
    defaultMode: 'wysiwyg',
    width: 'medium',
    showLineNumbers: false,
    spellCheck: true,
    autoSave: true,
    autoSaveInterval: 30,
  },
  sidebar: {
    collapsed: false,
    width: 280,
    showFavorites: true,
    showRecent: true,
  },
  notifications: {
    emailDigest: true,
    browserNotifications: false,
    mentionNotifications: true,
  },
};

interface PreferencesState {
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateDisplay: (updates: Partial<DisplayPreferences>) => Promise<void>;
  updateEditor: (updates: Partial<EditorPreferences>) => Promise<void>;
  updateSidebar: (updates: Partial<SidebarPreferences>) => Promise<void>;
  updateNotifications: (updates: Partial<NotificationPreferences>) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setEditorMode: (mode: EditorMode) => Promise<void>;
  setEditorWidth: (width: EditorWidth) => Promise<void>;
  toggleSidebar: () => Promise<void>;
  resetPreferences: () => Promise<void>;
  clearError: () => void;

  // Getters calculés
  getEffectiveTheme: () => 'light' | 'dark';
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      isLoading: false,
      error: null,
      isInitialized: false,

      loadPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.getPreferences();
          set({ preferences, isInitialized: true });
          applyTheme(get().getEffectiveTheme());
        } catch (error) {
          set({ error: 'Erreur lors du chargement des préférences' });
        } finally {
          set({ isLoading: false });
        }
      },

      updatePreferences: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.updatePreferences(updates);
          set({ preferences });
          applyTheme(get().getEffectiveTheme());
        } catch (error) {
          set({ error: 'Erreur lors de la mise à jour des préférences' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateDisplay: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.updateDisplayPreferences(updates);
          set({ preferences });
          applyTheme(get().getEffectiveTheme());
        } catch (error) {
          set({ error: 'Erreur lors de la mise à jour de l\'affichage' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateEditor: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.updateEditorPreferences(updates);
          set({ preferences });
        } catch (error) {
          set({ error: 'Erreur lors de la mise à jour de l\'éditeur' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateSidebar: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.updateSidebarPreferences(updates);
          set({ preferences });
        } catch (error) {
          set({ error: 'Erreur lors de la mise à jour de la sidebar' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateNotifications: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.updateNotificationPreferences(updates);
          set({ preferences });
        } catch (error) {
          set({ error: 'Erreur lors de la mise à jour des notifications' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setTheme: async (theme) => {
        // Application immédiate pour UX fluide
        set((state) => ({
          preferences: {
            ...state.preferences,
            display: { ...state.preferences.display, theme },
          },
        }));
        applyTheme(get().getEffectiveTheme());

        try {
          await preferencesApi.updateTheme(theme);
        } catch (error) {
          set({ error: 'Erreur lors du changement de thème' });
        }
      },

      setEditorMode: async (mode) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            editor: { ...state.preferences.editor, defaultMode: mode },
          },
        }));

        try {
          await preferencesApi.updateEditorPreferences({ defaultMode: mode });
        } catch (error) {
          set({ error: 'Erreur lors du changement de mode éditeur' });
        }
      },

      setEditorWidth: async (width) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            editor: { ...state.preferences.editor, width },
          },
        }));

        try {
          await preferencesApi.updateEditorPreferences({ width });
        } catch (error) {
          set({ error: 'Erreur lors du changement de largeur éditeur' });
        }
      },

      toggleSidebar: async () => {
        const collapsed = !get().preferences.sidebar.collapsed;
        set((state) => ({
          preferences: {
            ...state.preferences,
            sidebar: { ...state.preferences.sidebar, collapsed },
          },
        }));

        try {
          await preferencesApi.updateSidebarPreferences({ collapsed });
        } catch (error) {
          // Silencieux, déjà appliqué localement
        }
      },

      resetPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const preferences = await preferencesApi.resetPreferences();
          set({ preferences });
          applyTheme(get().getEffectiveTheme());
        } catch (error) {
          set({ error: 'Erreur lors de la réinitialisation' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),

      getEffectiveTheme: () => {
        const { theme } = get().preferences.display;
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'plumenote-preferences',
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);

/**
 * Applique le thème au document
 */
function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

/**
 * Écoute les changements de préférence système
 */
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = usePreferencesStore.getState();
    if (store.preferences.display.theme === 'system') {
      applyTheme(store.getEffectiveTheme());
    }
  });
}
