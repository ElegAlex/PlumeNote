// ===========================================
// Schémas Zod - Préférences utilisateur
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { z } from 'zod';

// Thème de l'application
export const themeSchema = z.enum(['light', 'dark', 'system']);

// Mode d'édition par défaut
export const editorModeSchema = z.enum(['wysiwyg', 'markdown', 'split']);

// Largeur de l'éditeur
export const editorWidthSchema = z.enum(['narrow', 'medium', 'wide', 'full']);

// Langue de l'interface
export const languageSchema = z.enum(['fr', 'en']);

// Préférences de l'éditeur
export const editorPreferencesSchema = z.object({
  defaultMode: editorModeSchema.default('wysiwyg'),
  width: editorWidthSchema.default('medium'),
  showLineNumbers: z.boolean().default(false),
  spellCheck: z.boolean().default(true),
  autoSave: z.boolean().default(true),
  autoSaveInterval: z.number().min(5).max(300).default(30), // secondes
});

// Préférences de la sidebar
export const sidebarPreferencesSchema = z.object({
  collapsed: z.boolean().default(false),
  width: z.number().min(200).max(500).default(280),
  showFavorites: z.boolean().default(true),
  showRecent: z.boolean().default(true),
});

// Préférences de notification
export const notificationPreferencesSchema = z.object({
  emailDigest: z.boolean().default(true),
  browserNotifications: z.boolean().default(false),
  mentionNotifications: z.boolean().default(true),
});

// Préférences d'onboarding/tutoriel
export const onboardingPreferencesSchema = z.object({
  tutorialCompleted: z.boolean().default(false),
  tutorialVersion: z.number().default(0),
});

// Préférences d'affichage
export const displayPreferencesSchema = z.object({
  theme: themeSchema.default('system'),
  language: languageSchema.default('fr'),
  dateFormat: z.string().default('dd/MM/yyyy'),
  timeFormat: z.enum(['12h', '24h']).default('24h'),
  startOfWeek: z.enum(['monday', 'sunday']).default('monday'),
});

// Schéma complet des préférences
export const userPreferencesSchema = z.object({
  display: displayPreferencesSchema.default({}),
  editor: editorPreferencesSchema.default({}),
  sidebar: sidebarPreferencesSchema.default({}),
  notifications: notificationPreferencesSchema.default({}),
  onboarding: onboardingPreferencesSchema.default({}),
});

// Schéma pour mise à jour partielle
export const updatePreferencesSchema = z.object({
  display: displayPreferencesSchema.partial().optional(),
  editor: editorPreferencesSchema.partial().optional(),
  sidebar: sidebarPreferencesSchema.partial().optional(),
  notifications: notificationPreferencesSchema.partial().optional(),
  onboarding: onboardingPreferencesSchema.partial().optional(),
});

// Types exportés
export type Theme = z.infer<typeof themeSchema>;
export type EditorMode = z.infer<typeof editorModeSchema>;
export type EditorWidth = z.infer<typeof editorWidthSchema>;
export type Language = z.infer<typeof languageSchema>;
export type EditorPreferences = z.infer<typeof editorPreferencesSchema>;
export type SidebarPreferences = z.infer<typeof sidebarPreferencesSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type OnboardingPreferences = z.infer<typeof onboardingPreferencesSchema>;
export type DisplayPreferences = z.infer<typeof displayPreferencesSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
