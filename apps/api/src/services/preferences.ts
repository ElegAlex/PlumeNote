// ===========================================
// Service Préférences Utilisateur
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { prisma } from '@plumenote/database';
import {
  userPreferencesSchema,
  updatePreferencesSchema,
  type UserPreferences,
  type UpdatePreferencesInput,
} from '../schemas/preferences.schema';

/**
 * Valeurs par défaut des préférences
 */
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

/**
 * Récupère les préférences d'un utilisateur
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  // Fusionner avec les valeurs par défaut
  const stored = user.preferences as Partial<UserPreferences> || {};
  return mergePreferences(DEFAULT_PREFERENCES, stored);
}

/**
 * Met à jour les préférences d'un utilisateur
 */
export async function updateUserPreferences(
  userId: string,
  updates: UpdatePreferencesInput
): Promise<UserPreferences> {
  // Valider les updates
  const validated = updatePreferencesSchema.parse(updates);

  // Récupérer les préférences actuelles
  const current = await getUserPreferences(userId);

  // Fusionner les mises à jour
  const merged = mergePreferences(current, validated);

  // Sauvegarder
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: merged },
  });

  return merged;
}

/**
 * Réinitialise les préférences aux valeurs par défaut
 */
export async function resetUserPreferences(userId: string): Promise<UserPreferences> {
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: DEFAULT_PREFERENCES },
  });

  return DEFAULT_PREFERENCES;
}

/**
 * Met à jour une section spécifique des préférences
 */
export async function updatePreferenceSection<K extends keyof UserPreferences>(
  userId: string,
  section: K,
  updates: Partial<UserPreferences[K]>
): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);

  const merged: UserPreferences = {
    ...current,
    [section]: { ...current[section], ...updates },
  };

  await prisma.user.update({
    where: { id: userId },
    data: { preferences: merged },
  });

  return merged;
}

/**
 * Fusionne récursivement deux objets de préférences
 */
function mergePreferences<T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T>
): T {
  const result = { ...defaults };

  for (const key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      const value = overrides[key];
      const defaultValue = defaults[key];

      if (isPlainObject(value) && isPlainObject(defaultValue)) {
        result[key] = mergePreferences(
          defaultValue as Record<string, unknown>,
          value as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (value !== undefined) {
        result[key] = value as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Vérifie si une valeur est un objet simple
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Exporte les constantes pour utilisation externe
 */
export { DEFAULT_PREFERENCES };
