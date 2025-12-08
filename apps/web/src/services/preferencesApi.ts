// ===========================================
// API Client Préférences (Sprint 3)
// ===========================================

import { api } from '../lib/api';
import type {
  UserPreferences,
  UpdatePreferencesRequest,
  Theme,
  DisplayPreferences,
  EditorPreferences,
  SidebarPreferences,
  NotificationPreferences,
  OnboardingPreferences,
} from '@plumenote/types';

const BASE_URL = '/preferences';

/**
 * Récupère les préférences de l'utilisateur courant
 */
export async function getPreferences(): Promise<UserPreferences> {
  const response = await api.get<UserPreferences>(BASE_URL);
  return response.data;
}

/**
 * Met à jour toutes les préférences
 */
export async function updatePreferences(
  data: UpdatePreferencesRequest
): Promise<UserPreferences> {
  const response = await api.put<UserPreferences>(BASE_URL, data);
  return response.data;
}

/**
 * Met à jour une section spécifique des préférences
 */
export async function updatePreferenceSection<K extends keyof UserPreferences>(
  section: K,
  data: Partial<UserPreferences[K]>
): Promise<UserPreferences> {
  const response = await api.patch<UserPreferences>(`${BASE_URL}/${section}`, data);
  return response.data;
}

/**
 * Réinitialise les préférences aux valeurs par défaut
 */
export async function resetPreferences(): Promise<UserPreferences> {
  const response = await api.delete<UserPreferences>(BASE_URL);
  return response.data;
}

/**
 * Récupère le thème actuel
 */
export async function getTheme(): Promise<{ theme: Theme }> {
  const response = await api.get<{ theme: Theme }>(`${BASE_URL}/theme`);
  return response.data;
}

/**
 * Met à jour le thème rapidement
 */
export async function updateTheme(theme: Theme): Promise<{ theme: Theme }> {
  const response = await api.put<{ theme: Theme }>(`${BASE_URL}/theme`, { theme });
  return response.data;
}

// Raccourcis pour les sections

export async function updateDisplayPreferences(
  data: Partial<DisplayPreferences>
): Promise<UserPreferences> {
  return updatePreferenceSection('display', data);
}

export async function updateEditorPreferences(
  data: Partial<EditorPreferences>
): Promise<UserPreferences> {
  return updatePreferenceSection('editor', data);
}

export async function updateSidebarPreferences(
  data: Partial<SidebarPreferences>
): Promise<UserPreferences> {
  return updatePreferenceSection('sidebar', data);
}

export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): Promise<UserPreferences> {
  return updatePreferenceSection('notifications', data);
}

export async function updateOnboardingPreferences(
  data: Partial<OnboardingPreferences>
): Promise<UserPreferences> {
  return updatePreferenceSection('onboarding', data);
}
