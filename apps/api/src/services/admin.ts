// ===========================================
// Service Administration (Sprint 2)
// Gestion des utilisateurs et reset password
// ===========================================

import { prisma } from '@plumenote/database';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createAuditLog } from './audit.js';
import type { CreateUserInput, UpdateUserAdminInput, ResetPasswordInput } from '../schemas/admin.schema.js';

const SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 12;

/**
 * Génère un mot de passe temporaire sécurisé
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(TEMP_PASSWORD_LENGTH);
  let password = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * Crée un nouvel utilisateur
 */
export async function createUser(
  input: CreateUserInput,
  adminUserId: string,
  ipAddress?: string
): Promise<{ user: any; temporaryPassword?: string }> {
  // Vérifier que le username et l'email sont uniques
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: input.username },
        { email: input.email },
      ],
    },
  });

  if (existing) {
    const field = existing.username === input.username ? 'username' : 'email';
    throw new Error(`Un utilisateur avec ce ${field} existe déjà`);
  }

  // Vérifier que le rôle existe
  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) {
    throw new Error('Rôle invalide');
  }

  // Générer ou utiliser le mot de passe fourni
  const temporaryPassword = input.password ? undefined : generateTemporaryPassword();
  const passwordToHash = input.password || temporaryPassword!;
  const hashedPassword = await bcrypt.hash(passwordToHash, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      displayName: input.displayName,
      password: hashedPassword,
      roleId: input.roleId,
      isActive: input.isActive,
      mustChangePassword: input.mustChangePassword,
      lastPasswordChange: new Date(),
    },
    include: { role: true },
  });

  // Log d'audit
  await createAuditLog({
    userId: adminUserId,
    action: 'USER_CREATED',
    resourceType: 'USER',
    resourceId: user.id,
    targetName: user.displayName,
    details: {
      username: user.username,
      email: user.email,
      role: role.name,
    },
    ipAddress,
  });

  return {
    user: {
      ...user,
      password: undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    temporaryPassword,
  };
}

/**
 * Met à jour un utilisateur (admin)
 */
export async function updateUserAdmin(
  userId: string,
  input: UpdateUserAdminInput,
  adminUserId: string,
  ipAddress?: string
): Promise<any> {
  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!oldUser) {
    throw new Error('Utilisateur non trouvé');
  }

  // Vérifier l'unicité de l'email si modifié
  if (input.email && input.email !== oldUser.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }
  }

  // Vérifier le rôle si modifié
  if (input.roleId && input.roleId !== oldUser.roleId) {
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) {
      throw new Error('Rôle invalide');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    include: { role: true },
  });

  // Logs d'audit pour les changements importants
  if (input.roleId && input.roleId !== oldUser.roleId) {
    await createAuditLog({
      userId: adminUserId,
      action: 'ROLE_CHANGED',
      resourceType: 'USER',
      resourceId: userId,
      targetName: user.displayName,
      details: {
        oldRole: oldUser.role.name,
        newRole: user.role.name,
      },
      ipAddress,
    });
  }

  if (input.isActive !== undefined && input.isActive !== oldUser.isActive) {
    await createAuditLog({
      userId: adminUserId,
      action: input.isActive ? 'USER_ENABLED' : 'USER_DISABLED',
      resourceType: 'USER',
      resourceId: userId,
      targetName: user.displayName,
      ipAddress,
    });

    // Invalider les sessions si désactivation
    if (!input.isActive) {
      await prisma.session.deleteMany({ where: { userId } });
    }
  }

  return {
    ...user,
    password: undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
  };
}

/**
 * Supprime un utilisateur
 */
export async function deleteUser(
  userId: string,
  adminUserId: string,
  ipAddress?: string
): Promise<void> {
  // Empêcher l'auto-suppression
  if (userId === adminUserId) {
    throw new Error('Vous ne pouvez pas supprimer votre propre compte');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  // Empêcher la suppression du dernier admin
  if (user.role.name === 'admin') {
    const adminCount = await prisma.user.count({
      where: {
        role: { name: 'admin' },
        isActive: true,
      },
    });
    if (adminCount <= 1) {
      throw new Error('Impossible de supprimer le dernier administrateur');
    }
  }

  // Supprimer les sessions
  await prisma.session.deleteMany({ where: { userId } });

  // Supprimer les tokens de reset
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  // Supprimer l'utilisateur (les notes créées restent avec authorId null grâce à onDelete: SetNull)
  await prisma.user.delete({ where: { id: userId } });

  // Log d'audit
  await createAuditLog({
    userId: adminUserId,
    action: 'USER_DELETED',
    resourceType: 'USER',
    resourceId: userId,
    targetName: user.displayName,
    details: {
      username: user.username,
      email: user.email,
      role: user.role.name,
    },
    ipAddress,
  });
}

/**
 * Réinitialise le mot de passe d'un utilisateur
 */
export async function resetUserPassword(
  userId: string,
  input: ResetPasswordInput,
  adminUserId: string,
  ipAddress?: string
): Promise<{ temporaryPassword?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  // Générer ou utiliser le mot de passe fourni
  const temporaryPassword = input.generateTemporary && !input.newPassword
    ? generateTemporaryPassword()
    : undefined;
  const passwordToHash = input.newPassword || temporaryPassword!;

  if (!passwordToHash) {
    throw new Error('Un mot de passe est requis');
  }

  const hashedPassword = await bcrypt.hash(passwordToHash, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      mustChangePassword: input.mustChangePassword,
      lastPasswordChange: new Date(),
    },
  });

  // Invalider toutes les sessions existantes
  await prisma.session.deleteMany({ where: { userId } });

  // Invalider les anciens tokens de reset
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Log d'audit
  await createAuditLog({
    userId: adminUserId,
    action: 'PASSWORD_RESET',
    resourceType: 'USER',
    resourceId: userId,
    targetName: user.displayName,
    details: {
      mustChangePassword: input.mustChangePassword,
      byAdmin: true,
    },
    ipAddress,
  });

  return { temporaryPassword };
}

/**
 * Récupère les statistiques d'un utilisateur
 */
export async function getUserStats(userId: string) {
  const [notesCreated, notesModified, lastActivity] = await Promise.all([
    prisma.note.count({
      where: { authorId: userId, isDeleted: false },
    }),
    prisma.note.count({
      where: { modifiedBy: userId, isDeleted: false },
    }),
    prisma.auditLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, action: true },
    }),
  ]);

  return {
    notesCreated,
    notesModified,
    lastActivity: lastActivity?.createdAt.toISOString() || null,
    lastAction: lastActivity?.action || null,
  };
}
