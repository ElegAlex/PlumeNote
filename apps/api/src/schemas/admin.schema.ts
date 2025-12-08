// ===========================================
// Schémas de validation Admin (Sprint 2)
// ===========================================

import { z } from 'zod';

/**
 * Schéma de création d'utilisateur
 */
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Le nom d\'utilisateur doit faire au moins 3 caractères')
    .max(50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  email: z
    .string()
    .email('Email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  displayName: z
    .string()
    .min(1, 'Le nom d\'affichage est requis')
    .max(100, 'Le nom d\'affichage ne peut pas dépasser 100 caractères'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
    .optional(), // Optionnel si mot de passe temporaire généré
  roleId: z
    .string()
    .uuid('ID de rôle invalide'),
  isActive: z
    .boolean()
    .default(true),
  mustChangePassword: z
    .boolean()
    .default(true), // Par défaut, forcer le changement au premier login
});

/**
 * Schéma de mise à jour d'utilisateur (admin)
 */
export const updateUserAdminSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  email: z
    .string()
    .email()
    .max(255)
    .optional(),
  roleId: z
    .string()
    .uuid()
    .optional(),
  isActive: z
    .boolean()
    .optional(),
});

/**
 * Schéma de réinitialisation de mot de passe (admin)
 */
export const resetPasswordSchema = z.object({
  generateTemporary: z
    .boolean()
    .default(true), // Générer un mot de passe temporaire
  newPassword: z
    .string()
    .min(8)
    .max(100)
    .optional(), // Si fourni, utiliser ce mot de passe au lieu de générer
  mustChangePassword: z
    .boolean()
    .default(true), // Forcer le changement au prochain login
});

/**
 * Schéma de filtre pour la liste des utilisateurs
 */
export const userListQuerySchema = z.object({
  search: z.string().optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['displayName', 'lastLoginAt', 'createdAt', 'notesCreated', 'notesModified']).default('displayName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Schéma de filtre pour les logs d'audit
 */
export const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * Types inférés des schémas
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserAdminInput = z.infer<typeof updateUserAdminSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
